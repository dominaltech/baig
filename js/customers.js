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

  renderCustomerTable() {
    const tableBody = document.getElementById('customersTableBody');
    if (!tableBody) return;

    let filtered = this.customers;
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) || 
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
            No customers found in database.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filtered.map((c, idx) => {
      const custBills = this.bills.filter(b => b.customerId === c.id || b.customerPhone === c.phone);
      const totalPurchased = custBills.reduce((sum, b) => sum + (b.total || 0), 0);
      const totalOwed = custBills.reduce((sum, b) => sum + (b.balanceDue || 0), 0);

      return `
        <tr>
          <td><strong>${idx + 1}</strong></td>
          <td>
            <strong>${c.name}</strong>
          </td>
          <td><strong>${c.phone || 'N/A'}</strong></td>
          <td>${c.address || 'Solapur'}</td>
          <td>₹${totalPurchased.toLocaleString('en-IN')} (${custBills.length} bills)</td>
          <td>
            <strong style="color: ${totalOwed > 0 ? 'var(--danger)' : 'var(--success)'};">
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

  searchCustomers(query) {
    this.searchQuery = query;
    this.renderCustomerTable();
  }

  openCustomerHistoryModal(customerId) {
    const customer = this.customers.find(c => c.id === customerId);
    if (!customer) return;

    const custBills = this.bills.filter(b => b.customerId === customerId || b.customerPhone === customer.phone);

    document.getElementById('historyCustomerName').textContent = customer.name;
    document.getElementById('historyCustomerMeta').textContent = `Phone: ${customer.phone || 'N/A'} • Address: ${customer.address || 'N/A'}`;

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
