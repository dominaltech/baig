/* 
  Baig Tiles & Granite CRM - Customer Database Module (customers.js)
  Searchable customer directory, ledger history, and pending khata tracking.
*/

class CustomerManager {
  constructor() {
    this.customers = [];
    this.bills = [];
    this.searchQuery = '';
  }

  async loadCustomers() {
    this.customers = await window.dbManager.getCustomers();
    this.bills = await window.dbManager.getBills();
    this.renderCustomerTable();
  }

  searchCustomers(query) {
    this.searchQuery = (query || '').trim().toLowerCase();
    const searchIn = document.getElementById('customerSearchInput');
    if (searchIn && searchIn.value !== (query || '')) {
      searchIn.value = query || '';
    }
    this.renderCustomerTable();
  }

  clearSearch() {
    this.searchQuery = '';
    const searchIn = document.getElementById('customerSearchInput');
    if (searchIn) searchIn.value = '';
    this.renderCustomerTable();
  }

  renderCustomerTable() {
    const tableBody = document.getElementById('customersTableBody');
    if (!tableBody) return;

    let list = this.customers.map(c => {
      const custBills = this.bills.filter(b => b.customerId === c.id || (c.phone && c.phone.trim() !== '' && b.customerPhone === c.phone));
      const totalPurchased = custBills.reduce((sum, b) => sum + (b.total || 0), 0);
      const totalOwed = custBills.reduce((sum, b) => sum + (b.balanceDue || 0), 0);
      const latestBillDate = custBills.length > 0
        ? custBills.reduce((latest, b) => {
            const d = b.date || b.createdAt;
            return (!latest || new Date(d) > new Date(latest)) ? d : latest;
          }, '')
        : (c.createdAt || '');

      return {
        customer: c,
        bills: custBills,
        totalPurchased,
        totalOwed,
        latestBillDate
      };
    });

    // 1. Filter by Search Query (Name, Phone, Address / City, GSTIN)
    if (this.searchQuery) {
      const q = this.searchQuery;
      list = list.filter(item => {
        const c = item.customer;
        return (c.name && c.name.toLowerCase().includes(q)) ||
               (c.phone && c.phone.toLowerCase().includes(q)) ||
               (c.address && c.address.toLowerCase().includes(q)) ||
               (c.gstin && c.gstin.toLowerCase().includes(q));
      });
    }

    // 2. Default Sort: Latest registered customer / newest purchase first (Descending order)
    list.sort((a, b) => {
      const timeB = new Date(b.latestBillDate || b.customer.createdAt || 0).getTime() || 0;
      const timeA = new Date(a.latestBillDate || a.customer.createdAt || 0).getTime() || 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.customer.id || 0) - (a.customer.id || 0);
    });

    // Update Stats Summary Header
    const statsEl = document.getElementById('customerStatsSummary');
    if (statsEl) {
      const sumPurchased = list.reduce((sum, item) => sum + item.totalPurchased, 0);
      const sumDues = list.reduce((sum, item) => sum + item.totalOwed, 0);
      statsEl.innerHTML = `
        <span class="badge badge-finalized" style="font-size: 0.75rem;">${list.length} Customers</span>
        <span style="font-size: 0.85rem;">Total Purchases: <strong>₹${sumPurchased.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></span>
        <span style="font-size: 0.85rem;">Total Dues: <strong style="color: var(--danger);">₹${sumDues.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></span>
      `;
    }

    if (list.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
            No customers found matching "${this.searchQuery}". Click <strong>Clear</strong> to view all.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = list.map((item, idx) => {
      const c = item.customer;
      const custBills = item.bills;
      const totalPurchased = item.totalPurchased;
      const totalOwed = item.totalOwed;

      return `
        <tr>
          <td style="text-align: center; vertical-align: middle; width: 65px;">
            <span style="font-size: 1.3rem; font-weight: 800; color: var(--accent-blue); line-height: 1;">${idx + 1}</span>
          </td>
          <td>
            <strong style="font-size: 0.95rem;">${c.name}</strong>
            ${c.gstin ? `<br><small style="color: var(--text-muted); font-size: 0.75rem;">GSTIN: ${c.gstin}</small>` : ''}
          </td>
          <td><strong style="font-size: 0.92rem;">${c.phone || 'N/A'}</strong></td>
          <td>${c.address || 'Solapur'}</td>
          <td>₹${totalPurchased.toLocaleString('en-IN')} (${custBills.length} bills)</td>
          <td>
            <strong style="color: ${totalOwed > 0 ? 'var(--danger)' : 'var(--success)'}; font-size: 1.05rem;">
              ₹${totalOwed.toLocaleString('en-IN')}
            </strong>
          </td>
          <td>
            <button class="btn btn-sm btn-outline-primary" onclick="window.customerManager.openCustomerHistoryModal(${c.id})">
              <svg class="svg-icon" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              History
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  openCustomerHistoryModal(customerId) {
    const customer = this.customers.find(c => c.id === customerId);
    if (!customer) return;

    const custBills = this.bills.filter(b => b.customerId === customerId || (customer.phone && customer.phone.trim() !== '' && b.customerPhone === customer.phone));
    custBills.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    document.getElementById('historyCustomerName').textContent = customer.name;
    document.getElementById('historyCustomerMeta').textContent = `Phone: ${customer.phone || 'N/A'} • Address: ${customer.address || 'N/A'}${customer.gstin ? ` • GSTIN: ${customer.gstin}` : ''}`;

    const historyContainer = document.getElementById('customerHistoryList');
    if (custBills.length === 0) {
      historyContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No purchase bills recorded for this customer yet.</p>`;
    } else {
      historyContainer.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Bill No.</th>
              <th>Date</th>
              <th>Total (₹)</th>
              <th>Paid (₹)</th>
              <th>Balance Due (₹)</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${custBills.map(b => `
              <tr>
                <td><strong>No. ${b.billNo || 'Draft'}</strong></td>
                <td>${b.date}</td>
                <td>₹${(b.total || 0).toLocaleString('en-IN')}</td>
                <td>₹${(b.paidAmount || 0).toLocaleString('en-IN')}</td>
                <td><strong style="color: ${b.balanceDue > 0 ? 'var(--danger)' : 'var(--success)'};">₹${(b.balanceDue || 0).toLocaleString('en-IN')}</strong></td>
                <td>
                  <span class="badge ${b.status === 'finalized' ? (b.balanceDue > 0 ? 'badge-partial' : 'badge-paid') : 'badge-draft'}">
                    ${b.status === 'finalized' ? (b.balanceDue > 0 ? 'PARTIAL' : 'PAID') : 'DRAFT'}
                  </span>
                </td>
                <td>
                  <button class="btn btn-sm btn-secondary" onclick="window.billingManager.viewBillPreview(${b.id})">
                    View
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    window.appRouter.openModal('customerHistoryModal');
  }
}

window.customerManager = new CustomerManager();
