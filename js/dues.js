/* 
  Baig Tiles & Granite CRM - Pending Dues & Khata Tracker (dues.js)
  Tracks outstanding customer balances, offers payment collection, and status updates.
*/

class DuesManager {
  constructor() {
    this.bills = [];
    this.customers = [];
    this.selectedBillId = null;
  }

  async loadDues() {
    this.bills = await window.dbManager.getBills();
    this.customers = await window.dbManager.getCustomers();
    this.renderDuesTable();
  }

  renderDuesTable() {
    const tableBody = document.getElementById('duesTableBody');
    const totalDuesStat = document.getElementById('totalPendingDuesStat');
    if (!tableBody) return;

    // Filter finalized bills with balanceDue > 0
    const pendingBills = this.bills.filter(b => b.status === 'finalized' && b.balanceDue > 0);

    const totalOutstanding = pendingBills.reduce((sum, b) => sum + b.balanceDue, 0);
    if (totalDuesStat) {
      totalDuesStat.textContent = `₹${totalOutstanding.toLocaleString('en-IN')}`;
    }

    if (pendingBills.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--success); padding: 2rem; font-weight: 600;">
            ✓ All accounts clear! No pending customer dues outstanding.
          </td>
        </tr>
      `;
      return;
    }

    // Sort by largest balance due first
    pendingBills.sort((a, b) => b.balanceDue - a.balanceDue);

    tableBody.innerHTML = pendingBills.map((b, idx) => `
      <tr>
        <td><strong>${idx + 1}</strong></td>
        <td><strong>No. ${b.billNo}</strong></td>
        <td>
          <strong>${b.customerName}</strong><br>
          <small style="color: var(--text-muted);">${b.customerPhone || 'N/A'}</small>
        </td>
        <td>${b.date}</td>
        <td>₹${(b.total || 0).toLocaleString('en-IN')}</td>
        <td>₹${(b.paidAmount || 0).toLocaleString('en-IN')}</td>
        <td>
          <strong style="color: var(--danger); font-size: 1rem;">
            ₹${(b.balanceDue || 0).toLocaleString('en-IN')}
          </strong>
        </td>
        <td>
          <button class="btn btn-sm btn-success" onclick="window.duesManager.openPaymentModal(${b.id})">
            <svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            ${window.i18n.t('receivePayment')}
          </button>
        </td>
      </tr>
    `).join('');
  }

  openPaymentModal(billId) {
    const bill = this.bills.find(b => b.id === billId);
    if (!bill) return;

    this.selectedBillId = billId;
    document.getElementById('payCustomerName').textContent = bill.customerName;
    document.getElementById('payBillNo').textContent = `Bill No. ${bill.billNo}`;
    document.getElementById('payCurrentBalance').textContent = `₹${bill.balanceDue.toLocaleString('en-IN')}`;
    document.getElementById('paymentAmountInput').value = bill.balanceDue;

    window.appRouter.openModal('receivePaymentModal');
  }

  async submitPayment() {
    if (!this.selectedBillId) return;

    const amountInput = document.getElementById('paymentAmountInput');
    const amount = parseFloat(amountInput.value) || 0;

    if (amount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    await window.dbManager.recordPayment(this.selectedBillId, amount);
    window.appRouter.closeModal('receivePaymentModal');
    this.selectedBillId = null;
    await this.loadDues();
  }
}

window.duesManager = new DuesManager();
