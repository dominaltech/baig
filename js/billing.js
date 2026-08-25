/* 
  Baig Tiles & Granite CRM - Core Billing Engine (billing.js)
  Handles estimate bill and GST Tax Invoice creation, multi-row items, live calculations, custom product auto-inventory addition,
  draft vs finalized status, stock validation, and pixel-faithful preview/printing for both Estimate and GST Tax Invoices.
*/

// --- Utility: Indian Currency Number to Words Converter with Paisa Precision ---
function numberToWords(num) {
  if (num === null || num === undefined || isNaN(num) || num === 0) return 'Zero Rupees Only';

  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
  }

  const roundedFixed = Number(num).toFixed(2);
  const parts = roundedFixed.split('.');
  const rupees = parseInt(parts[0], 10);
  const paise = parseInt(parts[1], 10);

  let result = '';
  if (rupees > 0) {
    result += inWords(rupees) + ' Rupees';
  }

  if (paise > 0) {
    if (result) result += ' and ';
    result += inWords(paise) + ' Paise';
  }

  return result ? `${result} Only` : 'Zero Rupees Only';
}

class BillingManager {
  constructor() {
    this.currentBillId = null;
    this.billType = 'gst'; // Default to GST mode
    this.lineItems = [];
    this.products = [];
    this.customers = [];
    this.bills = [];
  }

  async initBillingForm() {
    this.products = await window.dbManager.getProducts();
    this.customers = await window.dbManager.getCustomers();
    this.bills = await window.dbManager.getBills();

    this.populateCustomerDropdown();

    // Reset Form
    this.currentBillId = null;
    document.getElementById('customerSelect').value = '';
    document.getElementById('customerNameInput').value = '';
    document.getElementById('customerPhoneInput').value = '';
    document.getElementById('customerAddressInput').value = '';
    const gstinEl = document.getElementById('customerGstinInput');
    if (gstinEl) gstinEl.value = '';

    // Date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('billDateInput').value = today;

    // Bill Number
    const lastNo = await window.dbManager.getSetting('lastBillNo') || 941;
    document.getElementById('billNumberDisplay').textContent = `No. ${lastNo + 1}`;

    // Previous Dues, Cash Advance, Round Off Reset
    document.getElementById('previousDuesInput').value = '0';
    document.getElementById('roundOffInput').value = '0';
    document.getElementById('advancePaidInput').value = '0';
    
    const cgstIn = document.getElementById('cgstPercentInput');
    const sgstIn = document.getElementById('sgstPercentInput');
    if (cgstIn) cgstIn.value = '9';
    if (sgstIn) sgstIn.value = '9';

    // Reset Line Items to clean blank state (No hardcoded items!)
    this.lineItems = [
      { tilesNo: '', particulars: '', hsnCode: '6907', boxes: 0, rate: 0, amount: 0 }
    ];

    this.setBillType(this.billType);
  }

  setBillType(type) {
    this.billType = type;

    const estimateBtn = document.getElementById('billTypeEstimateBtn');
    const gstBtn = document.getElementById('billTypeGstBtn');
    const gstinGroup = document.getElementById('gstinFieldGroup');
    const gstTaxRows = document.getElementById('gstTaxCalculationRows');
    const titleEl = document.getElementById('billingFormTitle');
    const subtotalLabel = document.getElementById('subtotalLabelText');

    if (type === 'gst') {
      if (estimateBtn) estimateBtn.classList.remove('active');
      if (gstBtn) gstBtn.classList.add('active');
      if (gstinGroup) gstinGroup.style.display = 'block';
      if (gstTaxRows) gstTaxRows.style.display = 'block';
      if (titleEl) titleEl.textContent = 'Create GST Tax Invoice';
      if (subtotalLabel) subtotalLabel.textContent = 'Taxable Value / Subtotal:';
    } else {
      if (estimateBtn) estimateBtn.classList.add('active');
      if (gstBtn) gstBtn.classList.remove('active');
      if (gstinGroup) gstinGroup.style.display = 'none';
      if (gstTaxRows) gstTaxRows.style.display = 'none';
      if (titleEl) titleEl.textContent = 'Create Estimate Bill';
      if (subtotalLabel) subtotalLabel.textContent = 'Subtotal:';
    }

    this.renderTableHeader();
    this.renderLineItemsTable();
    this.calculateTotals();
  }

  renderTableHeader() {
    const headerRow = document.getElementById('billTableHeaderRow');
    if (!headerRow) return;

    if (this.billType === 'gst') {
      headerRow.innerHTML = `
        <th style="width: 14%;">Size / Particulars</th>
        <th style="width: 36%;">Product Name</th>
        <th style="width: 12%;">HSN Code</th>
        <th style="width: 10%;">Boxes</th>
        <th style="width: 12%;">Rate (₹)</th>
        <th style="width: 10%;">Amount (₹)</th>
        <th style="width: 6%;">Action</th>
      `;
    } else {
      headerRow.innerHTML = `
        <th style="width: 14%;" data-i18n="colTilesNo">Tiles No.</th>
        <th style="width: 44%;" data-i18n="colParticulars">Particulars</th>
        <th style="width: 12%;" data-i18n="colBoxes">Boxes</th>
        <th style="width: 12%;" data-i18n="colRate">Rate (₹)</th>
        <th style="width: 12%;" data-i18n="colAmount">Amount (₹)</th>
        <th style="width: 6%;">Action</th>
      `;
    }
  }

  populateCustomerDropdown() {
    const custSelect = document.getElementById('customerSelect');
    if (!custSelect) return;

    custSelect.innerHTML = `<option value="">${window.i18n.t('selectCustomer')}</option>` +
      this.customers.map(c => `<option value="${c.id}">${c.name} (${c.phone || 'No Phone'})</option>`).join('');
  }

  onCustomerSelectChange(customerId) {
    if (!customerId) return;
    const c = this.customers.find(item => item.id === parseInt(customerId, 10));
    if (!c) return;

    document.getElementById('customerNameInput').value = c.name;
    document.getElementById('customerPhoneInput').value = c.phone || '';
    document.getElementById('customerAddressInput').value = c.address || '';
    const gstinEl = document.getElementById('customerGstinInput');
    if (gstinEl) gstinEl.value = c.gstin || '';

    // Auto-lookup previous outstanding dues for this customer across past bills
    const custBills = this.bills.filter(b => b.customerId === c.id || b.customerPhone === c.phone);
    const totalDues = custBills.reduce((sum, b) => sum + (b.balanceDue || 0), 0);
    document.getElementById('previousDuesInput').value = totalDues;

    this.calculateTotals();
  }

  renderLineItemsTable() {
    const container = document.getElementById('billLineItemsBody');
    if (!container) return;

    const isGst = this.billType === 'gst';

    container.innerHTML = this.lineItems.map((item, idx) => `
      <tr>
        <td>
          <input type="text" class="form-control" value="${item.tilesNo || ''}" 
                 placeholder="e.g. 800 x 600 mm"
                 oninput="window.billingManager.updateLineItem(${idx}, 'tilesNo', this.value)">
        </td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <select class="form-control" style="font-weight: 600;" onchange="window.billingManager.onProductSelectChange(${idx}, this.value)">
              <option value="">${window.i18n.t('selectProduct')}</option>
              <option value="__CUSTOM__" ${item.isCustom ? 'selected' : ''} style="font-weight: 800; color: #0a2540; background-color: #eff6ff;">
                ⚡ + Add New Custom Product
              </option>
              ${this.products.map(p => `
                <option value="${p.id}" ${!item.isCustom && p.name.toLowerCase() === (item.particulars || '').toLowerCase() ? 'selected' : ''}>
                  ${p.name} [${p.size || 'N/A'}] - ₹${p.rate}/box (Stock: ${p.stock})
                </option>
              `).join('')}
            </select>
            
            ${item.isCustom ? `
              <div style="display: flex; gap: 4px; margin-top: 4px;">
                <input type="text" id="line-custom-${idx}" class="form-control" 
                       style="border-color: var(--accent-blue);" 
                       value="${item.particulars || ''}" 
                       placeholder="Enter product name..."
                       oninput="window.billingManager.updateLineItem(${idx}, 'particulars', this.value)"
                       onkeydown="if(event.key === 'Enter'){ event.preventDefault(); window.billingManager.saveCustomProductToStock(${idx}); }">
                <button type="button" class="btn btn-sm btn-success" 
                        onclick="window.billingManager.saveCustomProductToStock(${idx})" 
                        title="Save as new product to inventory stock">
                  Save to Stock
                </button>
              </div>
            ` : ''}
          </div>
        </td>

        ${isGst ? `
          <td>
            <input type="text" class="form-control" value="${item.hsnCode || '6907'}" 
                   placeholder="6907"
                   oninput="window.billingManager.updateLineItem(${idx}, 'hsnCode', this.value)">
          </td>
        ` : ''}

        <td>
          <input type="number" id="line-boxes-${idx}" class="form-control" min="0" value="${item.boxes !== undefined && item.boxes !== null && item.boxes !== 0 ? item.boxes : ''}" 
                 placeholder="0"
                 oninput="window.billingManager.updateLineItem(${idx}, 'boxes', this.value)">
        </td>
        <td>
          <input type="number" id="line-rate-${idx}" class="form-control" min="0" step="0.01" value="${item.rate !== undefined && item.rate !== null && item.rate !== 0 ? item.rate : ''}" 
                 placeholder="0"
                 oninput="window.billingManager.updateLineItem(${idx}, 'rate', this.value)">
        </td>
        <td>
          <strong id="line-amount-${idx}" style="color: var(--accent-blue);">₹${(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
        </td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="window.billingManager.removeLineItem(${idx})">
            <svg class="svg-icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </td>
      </tr>
    `).join('');
  }

  addLineItem() {
    this.lineItems.push({ tilesNo: '', particulars: '', hsnCode: '6907', boxes: 0, rate: 0, amount: 0 });
    this.renderLineItemsTable();
    this.calculateTotals();
  }

  removeLineItem(index) {
    this.lineItems.splice(index, 1);
    this.renderLineItemsTable();
    this.calculateTotals();
  }

  onProductSelectChange(index, value) {
    if (value === '__CUSTOM__') {
      this.lineItems[index].isCustom = true;
      this.lineItems[index].particulars = '';
      this.lineItems[index].rate = 0;
      this.lineItems[index].amount = 0;
    } else if (value) {
      const prod = this.products.find(p => p.id === parseInt(value, 10));
      if (prod) {
        this.lineItems[index].isCustom = false;
        this.lineItems[index].particulars = prod.name;
        this.lineItems[index].tilesNo = prod.size || '2x4';
        this.lineItems[index].hsnCode = prod.hsnCode || '6907';
        this.lineItems[index].rate = prod.rate;
        if (!this.lineItems[index].boxes) {
          this.lineItems[index].boxes = 1;
        }
        this.lineItems[index].amount = (this.lineItems[index].boxes || 0) * prod.rate;
      }
    } else {
      this.lineItems[index].isCustom = false;
      this.lineItems[index].particulars = '';
      this.lineItems[index].rate = 0;
      this.lineItems[index].amount = 0;
    }

    this.renderLineItemsTable();
    this.calculateTotals();
  }

  async saveCustomProductToStock(index) {
    const item = this.lineItems[index];
    if (!item) return;

    const name = (item.particulars || '').trim();
    const rate = parseFloat(item.rate) || 0;

    if (!name) {
      alert('Please enter a product name for the new custom product.');
      return;
    }

    if (rate <= 0) {
      alert('Price / Rate setting is compulsory! Please enter a valid rate (₹) for the new product.');
      return;
    }

    const newProduct = {
      name: name,
      size: item.tilesNo || '2x4',
      hsnCode: item.hsnCode || '6907',
      rate: rate,
      stock: 100,
      minStockAlert: 10
    };

    await window.dbManager.saveProduct(newProduct);
    this.products = await window.dbManager.getProducts();

    item.isCustom = false;
    item.particulars = name;

    alert(`✓ Product "${name}" saved to Inventory Stock successfully!`);
    
    this.renderLineItemsTable();
    this.calculateTotals();
  }

  updateLineItem(index, field, value) {
    const item = this.lineItems[index];
    if (!item) return;

    if (field === 'boxes' || field === 'rate') {
      item[field] = parseFloat(value) || 0;
      item.amount = (item.boxes || 0) * (item.rate || 0);
    } else {
      item[field] = value;
    }

    const amountEl = document.getElementById(`line-amount-${index}`);
    if (amountEl) {
      amountEl.textContent = `₹${(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    this.calculateTotals();
  }

  calculateTotals() {
    const subtotal = this.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const previousDues = parseFloat(document.getElementById('previousDuesInput').value) || 0;
    const roundOff = parseFloat(document.getElementById('roundOffInput').value) || 0;
    const advancePaid = parseFloat(document.getElementById('advancePaidInput').value) || 0;

    let cgstAmount = 0;
    let sgstAmount = 0;
    let cgstPercent = 9;
    let sgstPercent = 9;

    if (this.billType === 'gst') {
      const cgstIn = document.getElementById('cgstPercentInput');
      const sgstIn = document.getElementById('sgstPercentInput');
      cgstPercent = cgstIn ? (parseFloat(cgstIn.value) || 0) : 9;
      sgstPercent = sgstIn ? (parseFloat(sgstIn.value) || 0) : 9;

      cgstAmount = subtotal * (cgstPercent / 100);
      sgstAmount = subtotal * (sgstPercent / 100);

      const cgstEl = document.getElementById('calcCgstAmount');
      const sgstEl = document.getElementById('calcSgstAmount');
      if (cgstEl) cgstEl.textContent = `₹${cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (sgstEl) sgstEl.textContent = `₹${sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Invoice Net Total = Taxable Value + CGST + SGST + RoundOff
    const billNetTotal = this.billType === 'gst' ? (subtotal + cgstAmount + sgstAmount + roundOff) : (subtotal + roundOff);
    const grandTotalWithDues = billNetTotal + previousDues;
    const balanceDue = Math.max(0, grandTotalWithDues - advancePaid);

    const subtotalEl = document.getElementById('calcSubtotal');
    const grandTotalEl = document.getElementById('calcGrandTotal');
    const balanceDueEl = document.getElementById('calcBalanceDue');

    if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (grandTotalEl) grandTotalEl.textContent = `₹${billNetTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (balanceDueEl) balanceDueEl.textContent = `₹${balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  async autoSaveCustomProducts() {
    for (const item of this.lineItems) {
      if (item.particulars && item.particulars.trim()) {
        const existing = this.products.find(p => p.name.toLowerCase() === item.particulars.toLowerCase());
        if (!existing) {
          console.log(`Auto-saving new custom product to inventory: ${item.particulars}`);
          await window.dbManager.saveProduct({
            name: item.particulars,
            size: item.tilesNo || '2x4',
            hsnCode: item.hsnCode || '6907',
            rate: item.rate || 0,
            stock: 50,
            minStockAlert: 10
          });
        }
      }
    }
    this.products = await window.dbManager.getProducts();
  }

  async saveBill(status = 'draft') {
    const name = document.getElementById('customerNameInput').value.trim();
    const phone = document.getElementById('customerPhoneInput').value.trim();
    const address = document.getElementById('customerAddressInput').value.trim();
    const gstin = document.getElementById('customerGstinInput') ? document.getElementById('customerGstinInput').value.trim() : '';
    const date = document.getElementById('billDateInput').value;

    if (!name) {
      alert('Please enter customer name.');
      return;
    }

    const validItems = this.lineItems.filter(i => (i.particulars && i.particulars.trim()) || (i.boxes > 0 && i.rate > 0));
    if (validItems.length === 0) {
      alert('Please add at least one line item with particulars, boxes, and rate.');
      return;
    }

    for (const item of validItems) {
      if (!item.rate || item.rate <= 0) {
        alert(`Price / Rate setting is compulsory! Please enter a valid rate (₹) for "${item.particulars || 'item'}".`);
        return;
      }
    }

    if (status === 'finalized') {
      const lowStockWarnings = [];
      validItems.forEach(item => {
        if (item.particulars) {
          const prod = this.products.find(p => p.name.toLowerCase() === item.particulars.toLowerCase());
          if (prod && prod.stock < item.boxes) {
            lowStockWarnings.push(`${item.particulars}: requested ${item.boxes} boxes, but current stock is only ${prod.stock} boxes.`);
          }
        }
      });

      if (lowStockWarnings.length > 0) {
        const proceed = confirm(`Stock Alert Warning:\n${lowStockWarnings.join('\n')}\n\nDo you want to finalize anyway? Stock will be reduced to 0.`);
        if (!proceed) return;
      }
    }

    await this.autoSaveCustomProducts();

    const subtotal = validItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const previousDues = parseFloat(document.getElementById('previousDuesInput').value) || 0;
    const roundOff = parseFloat(document.getElementById('roundOffInput').value) || 0;
    const advancePaid = parseFloat(document.getElementById('advancePaidInput').value) || 0;

    let cgstPercent = 9;
    let sgstPercent = 9;
    let cgstAmount = 0;
    let sgstAmount = 0;

    if (this.billType === 'gst') {
      const cgstIn = document.getElementById('cgstPercentInput');
      const sgstIn = document.getElementById('sgstPercentInput');
      cgstPercent = cgstIn ? (parseFloat(cgstIn.value) || 0) : 9;
      sgstPercent = sgstIn ? (parseFloat(sgstIn.value) || 0) : 9;
      cgstAmount = subtotal * (cgstPercent / 100);
      sgstAmount = subtotal * (sgstPercent / 100);
    }

    // Invoice Total for GST Tax Invoice is Taxable Value + CGST + SGST + RoundOff (Previous Dues NOT added into invoice total!)
    const total = this.billType === 'gst' ? (subtotal + cgstAmount + sgstAmount + roundOff) : (subtotal + roundOff);
    const balanceDue = Math.max(0, total + previousDues - advancePaid);

    const bill = {
      billType: this.billType,
      customerName: name,
      customerPhone: phone,
      customerAddress: address,
      customerGstin: gstin || '',
      date,
      items: validItems,
      subtotal,
      cgstPercent,
      sgstPercent,
      cgstAmount,
      sgstAmount,
      previousDues,
      roundOff,
      total,
      paidAmount: advancePaid,
      balanceDue,
      status,
      createdAt: new Date().toISOString()
    };

    if (this.currentBillId) {
      bill.id = this.currentBillId;
    }

    const savedId = await window.dbManager.saveBill(bill);

    if (status === 'finalized') {
      // Direct open modal & trigger print dialog without blocking alert popup
      await this.viewBillPreview(savedId, true);
    } else {
      alert('Bill draft saved successfully!');
    }

    await this.initBillingForm();
  }

  // --- PIXEL-FAITHFUL PREVIEW MODAL GENERATOR (ESTIMATE & GST TAX INVOICE) ---
  async viewBillPreview(billId = null, autoPrint = false) {
    let billData = null;

    if (billId) {
      billData = await window.dbManager.getBillById(billId);
    } else {
      const validItems = this.lineItems.filter(i => (i.particulars && i.particulars.trim()) || (i.boxes > 0 && i.rate > 0));
      const subtotal = validItems.reduce((sum, item) => sum + (item.amount || 0), 0);
      const previousDues = parseFloat(document.getElementById('previousDuesInput').value) || 0;
      const roundOff = parseFloat(document.getElementById('roundOffInput').value) || 0;
      const advancePaid = parseFloat(document.getElementById('advancePaidInput').value) || 0;
      
      const cgstIn = document.getElementById('cgstPercentInput');
      const sgstIn = document.getElementById('sgstPercentInput');
      const cgstPercent = cgstIn ? (parseFloat(cgstIn.value) || 0) : 9;
      const sgstPercent = sgstIn ? (parseFloat(sgstIn.value) || 0) : 9;

      let cgstAmount = 0;
      let sgstAmount = 0;
      if (this.billType === 'gst') {
        cgstAmount = subtotal * (cgstPercent / 100);
        sgstAmount = subtotal * (sgstPercent / 100);
      }

      // Invoice Total = Subtotal + CGST + SGST + RoundOff
      const total = this.billType === 'gst' ? (subtotal + cgstAmount + sgstAmount + roundOff) : (subtotal + roundOff);
      const balanceDue = Math.max(0, total + previousDues - advancePaid);
      const lastNo = await window.dbManager.getSetting('lastBillNo') || 941;

      billData = {
        billType: this.billType,
        billNo: lastNo + 1,
        customerName: document.getElementById('customerNameInput').value || '',
        customerAddress: document.getElementById('customerAddressInput').value || '',
        customerPhone: document.getElementById('customerPhoneInput').value || '',
        customerGstin: (document.getElementById('customerGstinInput') && document.getElementById('customerGstinInput').value) || '',
        date: document.getElementById('billDateInput').value || new Date().toISOString().split('T')[0],
        items: validItems,
        subtotal,
        cgstPercent,
        sgstPercent,
        cgstAmount,
        sgstAmount,
        previousDues,
        roundOff,
        total,
        paidAmount: advancePaid,
        balanceDue
      };
    }

    const previewContainer = document.getElementById('printableBillEstimateModalContent');
    if (!previewContainer) return;

    if (billData.billType === 'gst') {
      this.renderGstTaxInvoicePreview(previewContainer, billData);
    } else {
      this.renderEstimateBillPreview(previewContainer, billData);
    }

    this.currentPreviewBillNo = billData.billNo;
    window.appRouter.openModal('billPreviewModal');

    // Auto-trigger browser print dialog if requested
    if (autoPrint) {
      setTimeout(() => {
        this.triggerPrint();
      }, 350);
    }
  }

  // --- GST TAX INVOICE PREVIEW REPLICA (EXACT MATCHING USER FORMAT) ---
  renderGstTaxInvoicePreview(container, billData) {
    const paddedItems = [...(billData.items || [])];
    while (paddedItems.length < 10) {
      paddedItems.push({ tilesNo: '', particulars: '', hsnCode: '', boxes: '', rate: '', amount: '' });
    }

    // Dynamic Calculation of Subtotal, Tax and Invoice Total (DO NOT INCLUDE PREVIOUS DUES IN GST TAX INVOICE TOTAL!)
    const subtotal = (billData.items || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const cgstPercent = Number(billData.cgstPercent !== undefined ? billData.cgstPercent : 9);
    const sgstPercent = Number(billData.sgstPercent !== undefined ? billData.sgstPercent : 9);
    const cgstAmount = subtotal * (cgstPercent / 100);
    const sgstAmount = subtotal * (sgstPercent / 100);
    const roundOff = Number(billData.roundOff || 0);

    // Invoice Total for GST Tax Invoice is Taxable Value + CGST + SGST + RoundOff
    const invoiceTotal = subtotal + cgstAmount + sgstAmount + roundOff;
    const totalInWords = numberToWords(invoiceTotal);

    container.innerHTML = `
      <div class="bill-gst-container">
        <!-- Top Strip -->
        <div class="bill-gst-top-strip">
          <div><span class="tax-invoice-capsule">Tax Invoice</span> &nbsp; <span style="font-weight: 700;">Cash-Credit Memo</span></div>
          <div style="font-weight: 800; color: #742220; font-size: 0.9rem;">Awes Anis Baig : 8080767512</div>
        </div>

        <!-- Main Header -->
        <div class="bill-gst-header-main">
          <div class="bill-gst-title">BAIG TRADERS</div>
          <div class="bill-gst-subtitle">Near MIDC New Polic Station, Akkalkot Road, MIDC, Solapur.</div>
        </div>

        <!-- Meta Details Box -->
        <div class="bill-gst-meta-box">
          <div class="gst-meta-left">
            <div class="gst-meta-line"><strong>To :</strong> ${billData.customerName || ''}</div>
            <div class="gst-meta-line"><strong>Address :</strong> ${billData.customerAddress || ''}</div>
            <div class="gst-meta-line"><strong>GSTIN :</strong> ${billData.customerGstin || ''}</div>
          </div>
          <div class="gst-meta-right">
            <div class="gst-meta-line"><strong>GSTIN :</strong> 27EXMPB6588R1ZB</div>
            <div class="gst-meta-line"><strong>PAN No. :</strong> EXMPB6588R</div>
            <div class="gst-meta-line"><strong>Tax Invoice No.</strong> &nbsp;<strong style="color: #c8102e; font-size: 1.1rem;">${billData.billNo || ''}</strong></div>
            <div class="gst-meta-line"><strong>Tax Invoice Date</strong> &nbsp;${billData.date || ''}</div>
          </div>
        </div>

        <!-- Items Table Grid -->
        <table class="bill-gst-table">
          <thead>
            <tr>
              <th style="width: 7%;">Sr. No.</th>
              <th style="width: 43%;">Particulars</th>
              <th style="width: 12%;">HSN Code</th>
              <th style="width: 10%;">Boxes</th>
              <th style="width: 13%;">Rate</th>
              <th style="width: 15%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${paddedItems.map((item, idx) => {
              const hasItem = item.particulars || item.boxes > 0 || item.rate > 0;
              const displayName = item.tilesNo && item.particulars && !item.particulars.includes(item.tilesNo)
                ? `${item.tilesNo} (${item.particulars})`
                : (item.particulars || item.tilesNo || '');

              return `
                <tr>
                  <td style="text-align: center;">${hasItem ? (idx + 1) : ''}</td>
                  <td>${displayName}</td>
                  <td style="text-align: center;">${item.hsnCode || (hasItem ? '6907' : '')}</td>
                  <td style="text-align: center;">${item.boxes || ''}</td>
                  <td style="text-align: right;">${item.rate ? Number(item.rate).toFixed(2) : ''}</td>
                  <td style="text-align: right;">${item.amount ? Number(item.amount).toFixed(2) : ''}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- Bottom Grid: Bank Details & Tax Calculations -->
        <div class="bill-gst-bottom-grid">
          <div class="gst-bank-details">
            <div style="font-weight: 800; color: #742220; margin-bottom: 4px;">Bank Name : HDFC BANK</div>
            <div><strong>Account No. :</strong> 50200059363621</div>
            <div><strong>IFSC Code :</strong> HDFC0009343</div>
            <div><strong>Adress :</strong> Akkalkot Road, Solapur.</div>
          </div>
          <div class="gst-tax-breakdown">
            <div class="gst-tax-row">
              <span>Taxabil Value of goods and Service</span>
              <strong>${subtotal.toFixed(2)}</strong>
            </div>
            <div class="gst-tax-row">
              <span>Add : CGST @ ${cgstPercent} %</span>
              <strong>${cgstAmount.toFixed(2)}</strong>
            </div>
            <div class="gst-tax-row">
              <span>Add : SGST @ ${sgstPercent} %</span>
              <strong>${sgstAmount.toFixed(2)}</strong>
            </div>
            <div class="gst-tax-row total-row">
              <span>Total</span>
              <strong>${invoiceTotal.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="bill-gst-footer">
          <div class="gst-words-line">
            Total Rupees in Words : <span style="text-decoration: underline; font-weight: 800;">${totalInWords}</span>
          </div>

          <div class="gst-signatures-row">
            <div>Customer Sign.</div>
            <div style="text-align: right;">
              <div style="height: 35px;"></div>
              <div>For . Baig Traders</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --- ESTIMATE BILL PREVIEW REPLICA ---
  renderEstimateBillPreview(container, billData) {
    const paddedItems = [...(billData.items || [])];
    while (paddedItems.length < 12) {
      paddedItems.push({ tilesNo: '', particulars: '', boxes: '', rate: '', amount: '' });
    }

    const subtotal = (billData.items || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const roundOff = Number(billData.roundOff || 0);
    const total = subtotal + roundOff;

    container.innerHTML = `
      <div class="bill-estimate-container">
        <!-- Red Header Band -->
        <div class="bill-estimate-header">
          <div class="header-top-row">
            <div class="header-estimate-label">ESTIMATE</div>
            <div class="header-main-brand">
              <div class="header-logo-circle">BT</div>
              <div class="header-english-title">BAIG TILES & GRANITE</div>
              <div class="header-marathi-title">बेग टाईल्स अॅन्ड ग्रेनाईट</div>
              <div class="header-tagline-pill">सर्व प्रकारचे ग्रेनाईट, मार्बल्स अॅन्ड सिरेमिक्स</div>
              <div class="header-address-line">अक्कलकोट रोड, ई.आर.टी. चौक, स्पीड शोरुम जवळ, एम.आय.डी.सी., सोलापूर-४३००६.</div>
            </div>
            <div class="header-contact-box">
              <div class="contact-name">बीलाल बेग</div>
              <div class="contact-phones">
                📞 9423391203<br>
                📞 8080767512
              </div>
              <div class="payment-icons-row">
                <span class="pay-badge gpay">G</span>
                <span class="pay-badge phonepe">पे</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sub-header Meta Data -->
        <div class="bill-estimate-meta">
          <div class="meta-row">
            <div class="meta-field" style="flex: 2;">
              <span class="meta-label">To,</span>
              <span class="meta-value-line">${billData.customerName || ''}</span>
            </div>
            <div class="meta-field">
              <span class="meta-label">Date :</span>
              <span class="meta-value-line" style="min-width: 100px;">${billData.date || ''}</span>
            </div>
          </div>
          <div class="meta-row">
            <div class="meta-field" style="flex: 1;">
              <span class="meta-label">Address</span>
              <span class="meta-value-line">${billData.customerAddress || ''}</span>
            </div>
            <div class="meta-field">
              <span class="meta-label">Mob. No.</span>
              <span class="meta-value-line" style="min-width: 120px;">${billData.customerPhone || ''}</span>
            </div>
            <div class="meta-field">
              <span class="meta-label">No.</span>
              <span class="bill-number-display">${billData.billNo || 'Draft'}</span>
            </div>
          </div>
        </div>

        <!-- Printable Item Grid Table -->
        <table class="bill-estimate-table">
          <thead>
            <tr>
              <th class="col-tiles-no">Tiles No.</th>
              <th class="col-particulars">Particulars</th>
              <th class="col-boxes">Boxes</th>
              <th class="col-rate">Rate</th>
              <th class="col-amount-rs">
                Amount
                <div class="subhead-split"><span>Rs.</span><span>Ps.</span></div>
              </th>
            </tr>
          </thead>
          <tbody>
            ${paddedItems.map(item => `
              <tr>
                <td class="col-tiles-no">${item.tilesNo || ''}</td>
                <td class="col-particulars">${item.particulars || ''}</td>
                <td class="col-boxes">${item.boxes || ''}</td>
                <td class="col-rate">${item.rate ? item.rate : ''}</td>
                <td class="col-amount-rs">${item.amount ? Number(item.amount).toLocaleString('en-IN') : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Footer Totals & Signature -->
        <table class="bill-estimate-footer">
          <tr>
            <td class="footer-notes-col">
              <div style="font-size: 0.75rem; color: #475569;">
                • Goods once sold will not be taken back or exchanged.<br>
                • Subject to Solapur Jurisdiction.
              </div>
              <div class="signature-box">
                Signature
              </div>
            </td>
            <td class="footer-totals-col">
              <div class="summary-line-row">
                <span>Subtotal:</span>
                <strong>₹${subtotal.toLocaleString('en-IN')}</strong>
              </div>
              ${billData.previousDues ? `
                <div class="summary-line-row">
                  <span>मागील (Dues):</span>
                  <strong>₹${billData.previousDues.toLocaleString('en-IN')}</strong>
                </div>
              ` : ''}
              <div class="summary-line-row grand-total">
                <span>Total:</span>
                <strong>₹${total.toLocaleString('en-IN')}</strong>
              </div>
              ${billData.paidAmount ? `
                <div class="summary-line-row">
                  <span>Adv / Cash:</span>
                  <strong>₹${billData.paidAmount.toLocaleString('en-IN')}</strong>
                </div>
              ` : ''}
              ${billData.balanceDue ? `
                <div class="summary-line-row" style="color: #c8102e;">
                  <span>बाकी (Due):</span>
                  <strong>₹${billData.balanceDue.toLocaleString('en-IN')}</strong>
                </div>
              ` : ''}
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  triggerPrint() {
    window.print();
  }

  async downloadBillImage() {
    const el = document.querySelector('#printableBillEstimateModalContent .bill-gst-container, #printableBillEstimateModalContent .bill-estimate-container');
    if (!el) return;

    const billNo = this.currentPreviewBillNo || 'Bill';

    if (window.html2canvas) {
      try {
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        const link = document.createElement('a');
        link.download = `Baig_Traders_Bill_${billNo}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        return;
      } catch (err) {
        console.error('html2canvas error:', err);
      }
    }

    alert('Downloading image... If prompt appears, allow popup to save image.');
  }

  async downloadBillPDF() {
    const el = document.querySelector('#printableBillEstimateModalContent .bill-gst-container, #printableBillEstimateModalContent .bill-estimate-container');
    if (!el) return;

    const billNo = this.currentPreviewBillNo || 'Bill';

    if (window.jspdf && window.html2canvas) {
      try {
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Baig_Traders_Bill_${billNo}.pdf`);
        return;
      } catch (err) {
        console.error('jsPDF export error:', err);
      }
    }

    window.print();
  }
}

window.billingManager = new BillingManager();
