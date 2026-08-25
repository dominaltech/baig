// PWA Install Prompt Listener
window.deferredPwaPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPwaPrompt = e;
  console.log('PWA beforeinstallprompt event captured!');
});

class AppRouter {
  constructor() {
    this.currentView = 'billing';
    this.userRole = 'owner'; // 'owner' or 'staff'
  }

  async init() {
    // 1. Init Database
    await window.dbManager.init();

    // 2. Init i18n Translation Engine
    await window.i18n.init();

    // 3. Load Saved User Role
    const savedRole = await window.dbManager.getSetting('userRole');
    if (savedRole) {
      this.userRole = savedRole;
    }
    this.applyRoleRestrictions();

    // 4. Initial View Render
    await this.switchView('billing');

    // 5. Setup Search Bar Listener
    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.handleGlobalSearch(e.target.value));
    }
  }

  async triggerPwaInstall() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    if (isStandalone) {
      alert('✓ App is already installed and running on your device!');
      return;
    }

    if (window.deferredPwaPrompt) {
      window.deferredPwaPrompt.prompt();
      const choice = await window.deferredPwaPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        alert('✓ Thank you for installing Baig Tiles & Granite CRM!');
      }
      window.deferredPwaPrompt = null;
    } else {
      alert('App is ready or already installed!\n\nTo install manually on Mobile or PC:\n• Chrome/Edge PC: Click the install button in address bar.\n• Android/iOS: Tap browser menu (⋮) -> "Add to Home Screen" or "Install App".');
    }
  }

  async switchView(viewName) {
    this.currentView = viewName;

    // Update Nav Link Active States
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.getAttribute('data-view') === viewName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update Content Views
    document.querySelectorAll('.view-section').forEach(section => {
      section.classList.remove('active');
    });

    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Trigger View Loaders
    switch (viewName) {
      case 'billing':
        await window.billingManager.initBillingForm();
        break;
      case 'bills':
        await this.loadBillsList();
        break;
      case 'inventory':
        await window.inventoryManager.loadProducts();
        break;
      case 'customers':
        await window.customerManager.loadCustomers();
        break;
      case 'dues':
        await window.duesManager.loadDues();
        break;
      case 'analytics':
        await window.analyticsManager.loadAnalytics();
        break;
      case 'settings':
        // Settings view static setup
        break;
    }
  }

  // --- ROLE TOGGLE (OWNER VS STAFF) ---
  async setRole(role) {
    this.userRole = role;
    await window.dbManager.setSetting('userRole', role);
    this.applyRoleRestrictions();
  }

  applyRoleRestrictions() {
    const isOwner = this.userRole === 'owner';

    // Toggle Role Button UI
    document.getElementById('roleOwnerBtn').classList.toggle('active', isOwner);
    document.getElementById('roleStaffBtn').classList.toggle('active', !isOwner);

    // Hide / Show Analytics Nav Link for Staff
    const analyticsNav = document.getElementById('navAnalyticsLink');
    if (analyticsNav) {
      analyticsNav.style.display = isOwner ? 'flex' : 'none';
    }

    // Re-render current view to apply role restrictions
    if (this.currentView === 'analytics' && !isOwner) {
      this.switchView('billing');
    } else {
      this.switchView(this.currentView);
    }
  }

  // --- LANGUAGE TOGGLE ---
  onLanguageChange(lang) {
    window.i18n.setLanguage(lang);
    this.switchView(this.currentView);
  }

  // --- MODALS SYSTEM ---
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  }

  // --- BILLS LIST VIEW ---
  async loadBillsList() {
    const tableBody = document.getElementById('billsListTableBody');
    if (!tableBody) return;

    const bills = await window.dbManager.getBills();
    bills.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (bills.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
            No bills created yet. Click <strong>New Bill</strong> to issue your first estimate.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = bills.map(b => `
      <tr>
        <td>
          <strong>No. ${b.billNo || 'Draft'}</strong><br>
          <span class="badge ${b.billType === 'gst' ? 'badge-finalized' : 'badge-partial'}" style="font-size: 0.65rem;">
            ${b.billType === 'gst' ? 'GST INVOICE' : 'ESTIMATE'}
          </span>
        </td>
        <td>
          <strong>${b.customerName}</strong><br>
          <small style="color: var(--text-muted);">${b.customerPhone || 'N/A'}</small>
        </td>
        <td>${b.date}</td>
        <td>${(b.items || []).length} items</td>
        <td><strong>₹${(b.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
        <td>
          <span class="badge ${b.status === 'finalized' ? (b.balanceDue > 0 ? 'badge-partial' : 'badge-paid') : 'badge-draft'}">
            ${b.status === 'finalized' ? (b.balanceDue > 0 ? 'FINALIZED (DUE)' : 'FINALIZED (PAID)') : 'DRAFT'}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-sm btn-outline-primary" onclick="window.billingManager.viewBillPreview(${b.id})">
              Preview / Print
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // --- GLOBAL SEARCH ---
  async handleGlobalSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) return;

    if (this.currentView === 'inventory') {
      window.inventoryManager.searchProducts(q);
    } else if (this.currentView === 'customers') {
      window.customerManager.searchCustomers(q);
    } else if (this.currentView === 'bills') {
      const tableBody = document.getElementById('billsListTableBody');
      const bills = await window.dbManager.getBills();
      const filtered = bills.filter(b => 
        (b.customerName && b.customerName.toLowerCase().includes(q)) ||
        (b.customerPhone && b.customerPhone.toLowerCase().includes(q)) ||
        (b.billNo && b.billNo.toString().includes(q)) ||
        (b.date && b.date.includes(q))
      );

      tableBody.innerHTML = filtered.map(b => `
        <tr>
          <td><strong>No. ${b.billNo || 'Draft'}</strong></td>
          <td><strong>${b.customerName}</strong></td>
          <td>${b.date}</td>
          <td>${(b.items || []).length} items</td>
          <td><strong>₹${(b.total || 0).toLocaleString('en-IN')}</strong></td>
          <td><span class="badge ${b.status === 'finalized' ? 'badge-paid' : 'badge-draft'}">${b.status}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-primary" onclick="window.billingManager.viewBillPreview(${b.id})">
              Preview
            </button>
          </td>
        </tr>
      `).join('');
    }
  }

  // --- CSV EXPORT GENERATOR ---
  async exportDataCSV(period = 'monthly') {
    const bills = await window.dbManager.getBills();
    const finalized = bills.filter(b => b.status === 'finalized');

    let csvContent = "data:text/csv;charset=utf-8,Bill No,Customer Name,Phone,Date,Subtotal,Previous Dues,Total,Paid Amount,Balance Due\n";

    finalized.forEach(b => {
      const row = [
        b.billNo,
        `"${b.customerName}"`,
        `"${b.customerPhone || ''}"`,
        b.date,
        b.subtotal,
        b.previousDues || 0,
        b.total,
        b.paidAmount,
        b.balanceDue
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Baig_Tiles_${period}_Sales_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- RESET DATA ---
  async resetAllData() {
    if (confirm('Warning: This will clear all current bills and customers and reset to initial seed data. Continue?')) {
      await window.dbManager.clearAllData();
      alert('Data reset successfully to initial state!');
      window.location.reload();
    }
  }
}

// Global App Router Singleton
window.appRouter = new AppRouter();

document.addEventListener('DOMContentLoaded', () => {
  window.appRouter.init();
});
