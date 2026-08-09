/* 
  Baig Tiles & Granite CRM - Core Billing Engine (billing.js)
  Handles estimate bill creation, multi-row items, live calculations, custom product auto-inventory addition,
  draft vs finalized status, stock validation, and pixel-faithful preview/printing matching Image 1 & Image 2.
*/

class BillingManager {
  constructor() {
    this.currentBillId = null;
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
    document.getElementById('billingFormTitle').textContent = window.i18n.t('createEstimateTitle');
    document.getElementById('customerSelect').value = '';
    document.getElementById('customerNameInput').value = '';
    document.getElementById('customerPhoneInput').value = '';
    document.getElementById('customerAddressInput').value = '';

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

    // Initial Line Items (Start with 3 default rows)
    this.lineItems = [
      { tilesNo: '2x4', particulars: '', boxes: 0, rate: 0, amount: 0 },
      { tilesNo: '12x18', particulars: '', boxes: 0, rate: 0, amount: 0 },
      { tilesNo: '16x16', particulars: '', boxes: 0, rate: 0, amount: 0 }
    ];

    this.renderLineItemsTable();
    this.calculateTotals();
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

    // Auto-lookup previous outstanding dues for this customer across past bills
    const custBills = this.bills.filter(b => b.customerId === c.id || b.customerPhone === c.phone);
    const totalDues = custBills.reduce((sum, b) => sum + (b.balanceDue || 0), 0);
    document.getElementById('previousDuesInput').value = totalDues;

    this.calculateTotals();
  }

  renderLineItemsTable() {
    const container = document.getElementById('billLineItemsBody');
    if (!container) return;

    container.innerHTML = this.lineItems.map((item, idx) => `
      <tr>
        <td>
          <input type="text" class="form-control" value="${item.tilesNo || ''}" 
                 placeholder="e.g. 2x4, 12x18"
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
        <td>
          <input type="number" id="line-boxes-${idx}" class="form-control" min="0" value="${item.boxes !== undefined && item.boxes !== null ? item.boxes : ''}" 
                 placeholder="0"
                 oninput="window.billingManager.updateLineItem(${idx}, 'boxes', this.value)">
        </td>
        <td>
          <input type="number" id="line-rate-${idx}" class="form-control" min="0" value="${item.rate !== undefined && item.rate !== null ? item.rate : ''}" 
                 placeholder="0"
                 oninput="window.billingManager.updateLineItem(${idx}, 'rate', this.value)">
        </td>
        <td>
          <strong id="line-amount-${idx}" style="color: var(--accent-blue);">₹${(item.amount || 0).toLocaleString('en-IN')}</strong>
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
    this.lineItems.push({ tilesNo: '2x4', particulars: '', boxes: 0, rate: 0, amount: 0 });
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
        this.lineItems[index].rate = prod.rate;
        // Default to 1 box if 0
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

  // --- SAVE CUSTOM PRODUCT TO INVENTORY STOCK IMMEDIATELY ---
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
      rate: rate,
      stock: 100, // Starting default stock
      minStockAlert: 10
    };

    // Save to IndexedDB
    await window.dbManager.saveProduct(newProduct);
    
    // Refresh products list
    this.products = await window.dbManager.getProducts();

    // Mark as regular saved product
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
      amountEl.textContent = `₹${(item.amount || 0).toLocaleString('en-IN')}`;
    }

    this.calculateTotals();
  }

  calculateTotals() {
    const subtotal = this.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const previousDues = parseFloat(document.getElementById('previousDuesInput').value) || 0;
    const roundOff = parseFloat(document.getElementById('roundOffInput').value) || 0;
    const advancePaid = parseFloat(document.getElementById('advancePaidInput').value) || 0;

    const total = subtotal + previousDues + roundOff;
    const balanceDue = Math.max(0, total - advancePaid);

    const subtotalEl = document.getElementById('calcSubtotal');
    const grandTotalEl = document.getElementById('calcGrandTotal');
    const balanceDueEl = document.getElementById('calcBalanceDue');

    if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
    if (grandTotalEl) grandTotalEl.textContent = `₹${total.toLocaleString('en-IN')}`;
    if (balanceDueEl) balanceDueEl.textContent = `₹${balanceDue.toLocaleString('en-IN')}`;
  }

  // --- SAVE CUSTOM PRODUCTS TO INVENTORY AUTOMATICALLY ---
  async autoSaveCustomProducts() {
    for (const item of this.lineItems) {
      if (item.particulars && item.particulars.trim()) {
        const existing = this.products.find(p => p.name.toLowerCase() === item.particulars.toLowerCase());
        if (!existing) {
          console.log(`Auto-saving new custom product to inventory: ${item.particulars}`);
          await window.dbManager.saveProduct({
            name: item.particulars,
            size: item.tilesNo || '2x4',
            rate: item.rate || 0,
            stock: 50, // Initial stock context
            minStockAlert: 10
          });
        }
      }
    }
    this.products = await window.dbManager.getProducts();
  }

  // --- SAVE DRAFT & FINALIZE BILL ---
  async saveBill(status = 'draft') {
    const name = document.getElementById('customerNameInput').value.trim();
    const phone = document.getElementById('customerPhoneInput').value.trim();
    const address = document.getElementById('customerAddressInput').value.trim();
    const date = document.getElementById('billDateInput').value;

    if (!name) {
      alert('Please enter customer name.');
      return;
    }

    const validItems = this.lineItems.filter(i => i.particulars && i.particulars.trim());
    if (validItems.length === 0) {
      alert('Please add at least one line item with particulars.');
      return;
    }

    // Compulsory rate/price validation for all products
    for (const item of validItems) {
      if (!item.rate || item.rate <= 0) {
        alert(`Price / Rate setting is compulsory! Please enter a valid rate (₹) for "${item.particulars}".`);
        return;
      }
    }

    // Check inventory stock warning if finalizing
    if (status === 'finalized') {
      const lowStockWarnings = [];
      validItems.forEach(item => {
        const prod = this.products.find(p => p.name.toLowerCase() === item.particulars.toLowerCase());
        if (prod && prod.stock < item.boxes) {
          lowStockWarnings.push(`${item.particulars}: requested ${item.boxes} boxes, but current stock is only ${prod.stock} boxes.`);
        }
      });

      if (lowStockWarnings.length > 0) {
        const proceed = confirm(`Stock Alert Warning:\n${lowStockWarnings.join('\n')}\n\nDo you want to finalize anyway? Stock will be reduced to 0.`);
        if (!proceed) return;
      }
    }

    // Auto-save custom products to inventory
    await this.autoSaveCustomProducts();

    const subtotal = validItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const previousDues = parseFloat(document.getElementById('previousDuesInput').value) || 0;
    const roundOff = parseFloat(document.getElementById('roundOffInput').value) || 0;
    const advancePaid = parseFloat(document.getElementById('advancePaidInput').value) || 0;
    const total = subtotal + previousDues + roundOff;
    const balanceDue = Math.max(0, total - advancePaid);

    const bill = {
      customerName: name,
      customerPhone: phone,
      customerAddress: address,
      date,
      items: validItems,
      subtotal,
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
    alert(`Bill ${status === 'finalized' ? 'finalized and generated' : 'saved as draft'} successfully!`);

    if (status === 'finalized') {
      this.viewBillPreview(savedId);
    }

    await this.initBillingForm();
  }

  // --- PIXEL-FAITHFUL ESTIMATE BILL PREVIEW MODAL GENERATOR ---
  async viewBillPreview(billId = null) {
    let billData = null;

    if (billId) {
      billData = await window.dbManager.getBillById(billId);
    } else {
      // Build live preview object from form state
      const validItems = this.lineItems.filter(i => i.particulars && i.particulars.trim());
      const subtotal = validItems.reduce((sum, item) => sum + (item.amount || 0), 0);
      const previousDues = parseFloat(document.getElementById('previousDuesInput').value) || 0;
      const roundOff = parseFloat(document.getElementById('roundOffInput').value) || 0;
      const advancePaid = parseFloat(document.getElementById('advancePaidInput').value) || 0;
      const total = subtotal + previousDues + roundOff;
      const balanceDue = Math.max(0, total - advancePaid);
      const lastNo = await window.dbManager.getSetting('lastBillNo') || 941;

      billData = {
        billNo: lastNo + 1,
        customerName: document.getElementById('customerNameInput').value || 'Customer Name',
        customerAddress: document.getElementById('customerAddressInput').value || 'Solapur',
        customerPhone: document.getElementById('customerPhoneInput').value || '',
        date: document.getElementById('billDateInput').value || new Date().toISOString().split('T')[0],
        items: validItems.length > 0 ? validItems : [
          { tilesNo: '2x4:', particulars: 'COSMOS NERO GL', boxes: 6, rate: 45, amount: 4320 },
          { tilesNo: '12x18:', particulars: 'P. White', boxes: 3, rate: 250, amount: 750 }
        ],
        subtotal,
        previousDues,
        total,
        paidAmount: advancePaid,
        balanceDue
      };
    }

    const previewContainer = document.getElementById('printableBillEstimateModalContent');
    if (!previewContainer) return;

    // Pad table with empty rows to match exact height of original paper bill (minimum 12 rows)
    const paddedItems = [...billData.items];
    while (paddedItems.length < 12) {
      paddedItems.push({ tilesNo: '', particulars: '', boxes: '', rate: '', amount: '' });
    }

    previewContainer.innerHTML = `
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
                <td class="col-amount-rs">${item.amount ? item.amount.toLocaleString('en-IN') : ''}</td>
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
                <strong>₹${(billData.subtotal || 0).toLocaleString('en-IN')}</strong>
              </div>
              ${billData.previousDues ? `
                <div class="summary-line-row">
                  <span>मागील (Dues):</span>
                  <strong>₹${billData.previousDues.toLocaleString('en-IN')}</strong>
                </div>
              ` : ''}
              <div class="summary-line-row grand-total">
                <span>Total:</span>
                <strong>₹${(billData.total || 0).toLocaleString('en-IN')}</strong>
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

    this.currentPreviewBillNo = billData.billNo;
    window.appRouter.openModal('billPreviewModal');
  }

  triggerPrint() {
    window.print();
  }

  async downloadBillImage() {
    const el = document.querySelector('#printableBillEstimateModalContent .bill-estimate-container');
    if (!el) return;

    const billNo = this.currentPreviewBillNo || 'Estimate';

    if (window.html2canvas) {
      try {
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        const link = document.createElement('a');
        link.download = `Baig_Tiles_Estimate_${billNo}.png`;
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
    const el = document.querySelector('#printableBillEstimateModalContent .bill-estimate-container');
    if (!el) return;

    const billNo = this.currentPreviewBillNo || 'Estimate';

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
        pdf.save(`Baig_Tiles_Estimate_${billNo}.pdf`);
        return;
      } catch (err) {
        console.error('jsPDF export error:', err);
      }
    }

    // Fallback trigger browser print (Save as PDF)
    window.print();
  }
}

window.billingManager = new BillingManager();
