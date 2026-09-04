/* 
  Baig Tiles & Granite CRM - Core Billing Engine (billing.js)
  Handles estimate bill and GST Tax Invoice creation, multi-row items, live calculations, custom product auto-inventory addition,
  draft vs finalized status, stock validation, and pixel-faithful preview/printing for both Estimate and GST Tax Invoices.
*/

// --- Utility: Indian Currency Number to Words Converter with Paisa Precision ---
function numberToWords(num) {
  if (num === null || num === undefined || isNaN(num) || num <= 0) return 'Zero Rupees Only';

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
    this.currentBillNo = null;
    this.currentBillStatus = 'draft';
    this.currentBillCreatedAt = null;
    this.billType = 'estimate'; // Default to Estimate mode
    this.lineItems = [];
    this.products = [];
    this.customers = [];
    this.bills = [];
    this.customerSuggestions = [];
    this.activeCustomerIdx = -1;
  }

  async initBillingForm() {
    this.products = await window.dbManager.getProducts();
    this.customers = await window.dbManager.getCustomers();
    this.bills = await window.dbManager.getBills();

    // Reset Form
    this.currentBillId = null;
    this.currentBillNo = null;
    this.currentBillStatus = 'draft';
    this.currentBillCreatedAt = null;
    this.customerSuggestions = [];
    this.activeCustomerIdx = -1;
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

    if (window.i18n && typeof window.i18n.applyTranslations === 'function') {
      window.i18n.applyTranslations();
    }
  }

  // --- CUSTOMER AUTOCOMPLETE SEARCH WITH KEYBOARD ARROW NAVIGATION ---
  onCustomerNameInput(value) {
    const listEl = document.getElementById('customerAutocompleteList');
    if (!listEl) return;

    const q = (value || '').trim().toLowerCase();
    const sortedCustomers = [...this.customers].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    let matches = [];
    if (!q) {
      matches = sortedCustomers.slice(0, 8);
    } else {
      matches = sortedCustomers.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) || 
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.gstin && c.gstin.toLowerCase().includes(q))
      ).slice(0, 8);
    }

    this.customerSuggestions = matches;
    this.activeCustomerIdx = matches.length > 0 ? 0 : -1;

    if (matches.length === 0) {
      listEl.style.display = 'none';
      return;
    }

    listEl.innerHTML = matches.map((c, idx) => `
      <div class="autocomplete-item ${idx === this.activeCustomerIdx ? 'selected' : ''}" 
           id="cust-sugg-item-${idx}" 
           onmouseenter="window.billingManager.setActiveCustomerSuggestion(${idx})"
           onmousedown="window.billingManager.selectCustomerSuggestion(${c.id})">
        <div>
          <div class="autocomplete-item-title">${c.name}</div>
          <div class="autocomplete-item-sub"><svg class="svg-icon" style="width:11px;height:11px;vertical-align:-1px;margin-right:2px;" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>${c.phone || 'No Phone'} • 📍 ${c.address || 'Solapur'}</div>
        </div>
        ${c.gstin ? `<span class="autocomplete-item-badge">GST: ${c.gstin}</span>` : ''}
      </div>
    `).join('');

    listEl.style.display = 'block';
  }

  onCustomerKeyDown(event) {
    const listEl = document.getElementById('customerAutocompleteList');
    const isListVisible = listEl && listEl.style.display !== 'none';

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isListVisible) {
        this.onCustomerNameInput(document.getElementById('customerNameInput').value);
        return;
      }
      if (this.customerSuggestions.length > 0) {
        this.activeCustomerIdx = (this.activeCustomerIdx + 1) % this.customerSuggestions.length;
        this.updateCustomerSuggestionHighlight();
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (isListVisible && this.customerSuggestions.length > 0) {
        this.activeCustomerIdx = (this.activeCustomerIdx - 1 + this.customerSuggestions.length) % this.customerSuggestions.length;
        this.updateCustomerSuggestionHighlight();
      }
    } else if (event.key === 'Enter') {
      if (isListVisible && this.activeCustomerIdx >= 0 && this.activeCustomerIdx < this.customerSuggestions.length) {
        event.preventDefault();
        const selected = this.customerSuggestions[this.activeCustomerIdx];
        this.selectCustomerSuggestion(selected.id);
        const phoneIn = document.getElementById('customerPhoneInput');
        if (phoneIn) phoneIn.focus();
      }
    } else if (event.key === 'Tab') {
      if (isListVisible && this.activeCustomerIdx >= 0 && this.activeCustomerIdx < this.customerSuggestions.length) {
        const selected = this.customerSuggestions[this.activeCustomerIdx];
        this.selectCustomerSuggestion(selected.id);
      }
    } else if (event.key === 'Escape') {
      if (listEl) listEl.style.display = 'none';
      this.activeCustomerIdx = -1;
    }
  }

  setActiveCustomerSuggestion(idx) {
    this.activeCustomerIdx = idx;
    this.updateCustomerSuggestionHighlight();
  }

  updateCustomerSuggestionHighlight() {
    const listEl = document.getElementById('customerAutocompleteList');
    if (!listEl) return;
    const items = listEl.querySelectorAll('.autocomplete-item');
    items.forEach((el, idx) => {
      if (idx === this.activeCustomerIdx) {
        el.classList.add('selected');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('selected');
      }
    });
  }

  onCustomerBlur() {
    setTimeout(() => {
      const listEl = document.getElementById('customerAutocompleteList');
      if (listEl) listEl.style.display = 'none';
    }, 220);
  }

  selectCustomerSuggestion(customerId) {
    const c = this.customers.find(item => item.id === parseInt(customerId, 10));
    if (!c) return;

    document.getElementById('customerNameInput').value = c.name;
    document.getElementById('customerPhoneInput').value = c.phone || '';
    document.getElementById('customerAddressInput').value = c.address || '';
    const gstinEl = document.getElementById('customerGstinInput');
    if (gstinEl) gstinEl.value = c.gstin || '';

    // Auto-lookup previous outstanding dues for this customer across past bills
    const custBills = this.bills.filter(b => b.customerId === c.id || (c.phone && c.phone.trim() !== '' && b.customerPhone === c.phone));
    const totalDues = custBills.reduce((sum, b) => sum + (b.balanceDue || 0), 0);
    document.getElementById('previousDuesInput').value = totalDues;

    const listEl = document.getElementById('customerAutocompleteList');
    if (listEl) listEl.style.display = 'none';
    this.activeCustomerIdx = -1;

    this.calculateTotals();
  }

  // --- LINE ITEMS TABLE WITH TYPE-AHEAD SEARCH AUTOCOMPLETE ---
  renderLineItemsTable() {
    const container = document.getElementById('billLineItemsBody');
    if (!container) return;

    const isGst = this.billType === 'gst';

    container.innerHTML = this.lineItems.map((item, idx) => `
      <tr>
        <td>
          <input type="text" class="form-control" value="${item.tilesNo || ''}" 
                 placeholder="e.g. 2x4 / 800x600"
                 oninput="window.billingManager.updateLineItem(${idx}, 'tilesNo', this.value)">
        </td>
        <td style="position: relative;">
          <div style="position: relative;">
            <input type="text" id="line-particulars-${idx}" class="form-control" 
                   style="font-weight: 600;" 
                   value="${item.particulars || ''}" 
                   placeholder="Type product name or size..." 
                   autocomplete="off"
                   onkeydown="window.billingManager.onProductKeyDown(event, ${idx})"
                   oninput="window.billingManager.onProductInput(${idx}, this.value)"
                   onfocus="window.billingManager.onProductInput(${idx}, this.value)"
                   onblur="window.billingManager.onProductBlur(${idx})">
            <div id="productAutocompleteList-${idx}" class="autocomplete-dropdown" style="display: none;"></div>
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
          <input type="number" id="line-boxes-${idx}" class="form-control" min="0" value="${item.boxes !== undefined && item.boxes !== null ? item.boxes : 1}" 
                 placeholder="0"
                 oninput="window.billingManager.updateLineItem(${idx}, 'boxes', this.value)">
        </td>
        <td>
          <input type="number" id="line-rate-${idx}" class="form-control" min="0" step="0.01" value="${item.rate !== undefined && item.rate !== null ? item.rate : 0}" 
                 placeholder="0"
                 oninput="window.billingManager.updateLineItem(${idx}, 'rate', this.value)">
        </td>
        <td>
          <strong id="line-amount-${idx}" style="color: var(--accent-blue);">₹${(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
        </td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="window.billingManager.removeLineItem(${idx})" title="Remove item">
            <svg class="svg-icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </td>
      </tr>
    `).join('');
  }

  onProductInput(index, query) {
    const listEl = document.getElementById(`productAutocompleteList-${index}`);
    if (!listEl) return;

    const q = (query || '').trim().toLowerCase();
    const sortedProducts = [...this.products].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    let matches = [];
    if (!q) {
      matches = sortedProducts.slice(0, 10);
    } else {
      matches = sortedProducts.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) || 
        (p.size && p.size.toLowerCase().includes(q)) ||
        (p.hsnCode && p.hsnCode.toLowerCase().includes(q))
      ).slice(0, 12);
    }

    this.currentProductMatches = matches;
    this.activeProductIdx = matches.length > 0 ? 0 : -1;

    let html = '';
    if (matches.length > 0) {
      html += matches.map((p, pIdx) => `
        <div class="autocomplete-item ${pIdx === this.activeProductIdx ? 'selected' : ''}" 
             id="prod-sugg-${index}-${pIdx}"
             onmouseenter="window.billingManager.setActiveProductSuggestion(${index}, ${pIdx})"
             onmousedown="window.billingManager.selectProductSuggestion(${index}, ${p.id})">
          <div>
            <div class="autocomplete-item-title">${p.name} <span class="autocomplete-item-badge" style="margin-left: 6px;">${p.size || 'N/A'}</span></div>
            <div class="autocomplete-item-sub">Rate: <strong>₹${p.rate}</strong> • Stock: <span style="color: ${p.stock > 10 ? 'var(--success)' : 'var(--danger)'}; font-weight: 700;">${p.stock} boxes</span></div>
          </div>
          <span style="font-weight: 800; color: var(--accent-blue);">₹${p.rate}</span>
        </div>
      `).join('');
    }

    // Option 1: Open popup to add as permanent product to Stock with all parameters
    const safeQuery = query ? query.replace(/'/g, "\\'").replace(/"/g, '&quot;') : '';
    html += `
      <div class="autocomplete-item" style="background-color: #f0fdf4; border-top: 1.5px dashed #86efac;" onmousedown="window.inventoryManager.openAddModal('${safeQuery}', ${index})">
        <div>
          <div style="font-weight: 800; color: #15803d; display: flex; align-items: center; gap: 6px;">
            <svg class="svg-icon" style="width: 15px; height: 15px; stroke: #15803d;" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            <span>+ Add ${query ? `"${query}"` : 'New Product'} to Stock (Full Details Popup)</span>
          </div>
          <div class="autocomplete-item-sub" style="color: #166534;">Set stock boxes, category size, rate, and HSN in Stock panel</div>
        </div>
        <span class="autocomplete-item-badge" style="background-color: #22c55e; color: #ffffff; font-weight: 800;">+ Stock Popup</span>
      </div>
    `;

    // Option 2: Allow quick custom product entry option
    if (q) {
      html += `
        <div class="autocomplete-item" style="background-color: #f8fafc; border-top: 1px dashed #cbd5e1;" onmousedown="window.billingManager.selectCustomProductEntry(${index}, '${safeQuery}')">
          <div style="font-weight: 700; color: var(--accent-blue);">
            + Use as one-time custom item: "${query}"
          </div>
          <span class="autocomplete-item-badge">One-time</span>
        </div>
      `;
    }

    listEl.innerHTML = html;
    listEl.style.display = 'block';

    // Update item particulars directly if typing custom
    this.lineItems[index].particulars = query;
  }

  onProductKeyDown(event, index) {
    const listEl = document.getElementById(`productAutocompleteList-${index}`);
    const isListVisible = listEl && listEl.style.display !== 'none';

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isListVisible) {
        this.onProductInput(index, this.lineItems[index].particulars || '');
        return;
      }
      if (this.currentProductMatches && this.currentProductMatches.length > 0) {
        this.activeProductIdx = (this.activeProductIdx + 1) % this.currentProductMatches.length;
        this.updateProductSuggestionHighlight(index);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (isListVisible && this.currentProductMatches && this.currentProductMatches.length > 0) {
        this.activeProductIdx = (this.activeProductIdx - 1 + this.currentProductMatches.length) % this.currentProductMatches.length;
        this.updateProductSuggestionHighlight(index);
      }
    } else if (event.key === 'Enter') {
      if (isListVisible && this.currentProductMatches && this.activeProductIdx >= 0 && this.activeProductIdx < this.currentProductMatches.length) {
        event.preventDefault();
        const selected = this.currentProductMatches[this.activeProductIdx];
        this.selectProductSuggestion(index, selected.id);
      }
    } else if (event.key === 'Escape') {
      if (listEl) listEl.style.display = 'none';
    }
  }

  setActiveProductSuggestion(lineIdx, pIdx) {
    this.activeProductIdx = pIdx;
    this.updateProductSuggestionHighlight(lineIdx);
  }

  updateProductSuggestionHighlight(lineIdx) {
    const listEl = document.getElementById(`productAutocompleteList-${lineIdx}`);
    if (!listEl) return;
    const items = listEl.querySelectorAll('.autocomplete-item');
    items.forEach((el, idx) => {
      if (idx === this.activeProductIdx) {
        el.classList.add('selected');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('selected');
      }
    });
  }

  onProductBlur(index) {
    setTimeout(() => {
      const listEl = document.getElementById(`productAutocompleteList-${index}`);
      if (listEl) listEl.style.display = 'none';
    }, 250);
  }

  selectProductSuggestion(index, productId) {
    const listEl = document.getElementById(`productAutocompleteList-${index}`);
    if (listEl) listEl.style.display = 'none';

    const prod = this.products.find(p => p.id === parseInt(productId, 10));
    if (!prod) return;

    this.lineItems[index].isCustom = false;
    this.lineItems[index].particulars = prod.name;
    this.lineItems[index].tilesNo = prod.size || '2x4';
    this.lineItems[index].hsnCode = prod.hsnCode || '6907';
    this.lineItems[index].rate = prod.rate;
    if (!this.lineItems[index].boxes || this.lineItems[index].boxes === 0) {
      this.lineItems[index].boxes = 1;
    }
    this.lineItems[index].amount = this.lineItems[index].boxes * prod.rate;

    // Auto-add new line item row if selecting on the last row
    if (index === this.lineItems.length - 1) {
      this.lineItems.push({ tilesNo: '', particulars: '', hsnCode: '6907', boxes: 0, rate: 0, amount: 0 });
    }

    this.renderLineItemsTable();
    this.calculateTotals();

    // Focus the boxes input of the selected item for ultra-fast data entry
    setTimeout(() => {
      const boxInput = document.getElementById(`line-boxes-${index}`);
      if (boxInput) {
        boxInput.focus();
        boxInput.select();
      }
    }, 60);
  }

  async onProductAddedFromModal(product, index) {
    this.products = await window.dbManager.getProducts();

    if (index !== null && index !== undefined && this.lineItems[index]) {
      this.lineItems[index].isCustom = false;
      this.lineItems[index].particulars = product.name;
      this.lineItems[index].tilesNo = product.size || '2x4';
      this.lineItems[index].hsnCode = product.hsnCode || '6907';
      this.lineItems[index].rate = product.rate;
      if (!this.lineItems[index].boxes || this.lineItems[index].boxes === 0) {
        this.lineItems[index].boxes = 1;
      }
      this.lineItems[index].amount = this.lineItems[index].boxes * product.rate;

      // Auto-add new line item row if selecting on the last row
      if (index === this.lineItems.length - 1) {
        this.lineItems.push({ tilesNo: '', particulars: '', hsnCode: '6907', boxes: 0, rate: 0, amount: 0 });
      }

      this.renderLineItemsTable();
      this.calculateTotals();

      // Focus the boxes input of the newly added item
      setTimeout(() => {
        const boxInput = document.getElementById(`line-boxes-${index}`);
        if (boxInput) {
          boxInput.focus();
          boxInput.select();
        }
      }, 80);
    }
  }

  selectCustomProductEntry(index, customName) {
    const listEl = document.getElementById(`productAutocompleteList-${index}`);
    if (listEl) listEl.style.display = 'none';

    this.lineItems[index].isCustom = true;
    this.lineItems[index].particulars = customName;
    if (!this.lineItems[index].boxes || this.lineItems[index].boxes === 0) {
      this.lineItems[index].boxes = 1;
    }

    if (index === this.lineItems.length - 1) {
      this.lineItems.push({ tilesNo: '', particulars: '', hsnCode: '6907', boxes: 0, rate: 0, amount: 0 });
    }

    this.renderLineItemsTable();
    this.calculateTotals();

    setTimeout(() => {
      const rateInput = document.getElementById(`line-rate-${index}`);
      if (rateInput) {
        rateInput.focus();
        rateInput.select();
      }
    }, 60);
  }

  addLineItem() {
    this.lineItems.push({ tilesNo: '', particulars: '', hsnCode: '6907', boxes: 0, rate: 0, amount: 0 });
    this.renderLineItemsTable();
    this.calculateTotals();
  }

  removeLineItem(index) {
    this.lineItems.splice(index, 1);
    if (this.lineItems.length === 0) {
      this.lineItems.push({ tilesNo: '', particulars: '', hsnCode: '6907', boxes: 0, rate: 0, amount: 0 });
    }
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
    if (grandTotalEl) grandTotalEl.textContent = `₹${(this.billType === 'gst' ? billNetTotal : grandTotalWithDues).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (balanceDueEl) balanceDueEl.textContent = `₹${balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  async autoSaveCustomProducts() {
    for (const item of this.lineItems) {
      const itemName = (item.particulars || '').trim();
      if (itemName) {
        const existing = this.products.find(p => (p.name || '').trim().toLowerCase() === itemName.toLowerCase());
        if (!existing) {
          console.log(`Auto-saving new custom product to inventory: ${itemName}`);
          const newProduct = {
            name: itemName,
            size: item.tilesNo || '2x4',
            hsnCode: item.hsnCode || '6907',
            rate: parseFloat(item.rate) || 0,
            stock: 50,
            minStockAlert: 10
          };
          const savedId = await window.dbManager.saveProduct(newProduct);
          newProduct.id = savedId;
          this.products.push(newProduct);
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
          const prod = this.products.find(p => (p.name || '').trim().toLowerCase() === item.particulars.trim().toLowerCase());
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
      createdAt: this.currentBillCreatedAt || new Date().toISOString()
    };

    if (this.currentBillId) {
      bill.id = this.currentBillId;
      if (this.currentBillNo) {
        bill.billNo = this.currentBillNo;
      }
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
        billNo: this.currentBillNo || (lastNo + 1),
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
    const rawItems = billData.items || [];
    const minRows = rawItems.length <= 4 ? 5 : Math.max(rawItems.length + 1, 7);
    const paddedItems = [...rawItems];
    while (paddedItems.length < minRows) {
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
          <div class="bill-gst-subtitle">Near MIDC New Police Station, Akkalkot Road, MIDC, Solapur.</div>
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
            <div><strong>Address :</strong> Akkalkot Road, Solapur.</div>
          </div>
          <div class="gst-tax-breakdown">
            <div class="gst-tax-row">
              <span>Taxable Value of goods and Service</span>
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
    const rawItems = billData.items || [];
    const minRows = rawItems.length <= 4 ? 5 : Math.max(rawItems.length + 1, 7);
    const paddedItems = [...rawItems];
    while (paddedItems.length < minRows) {
      paddedItems.push({ tilesNo: '', particulars: '', boxes: '', rate: '', amount: '' });
    }

    const subtotal = (billData.items || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const roundOff = Number(billData.roundOff || 0);
    const previousDues = Number(billData.previousDues || 0);
    const total = subtotal + previousDues + roundOff;
    const paidAmount = Number(billData.paidAmount || 0);
    const balanceDue = Number(billData.balanceDue !== undefined ? billData.balanceDue : Math.max(0, total - paidAmount));

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
              ${previousDues ? `
                <div class="summary-line-row">
                  <span>मागील (Dues):</span>
                  <strong>₹${previousDues.toLocaleString('en-IN')}</strong>
                </div>
              ` : ''}
              <div class="summary-line-row grand-total">
                <span>Total:</span>
                <strong>₹${total.toLocaleString('en-IN')}</strong>
              </div>
              ${paidAmount ? `
                <div class="summary-line-row">
                  <span>Adv / Cash:</span>
                  <strong>₹${paidAmount.toLocaleString('en-IN')}</strong>
                </div>
              ` : ''}
              ${balanceDue ? `
                <div class="summary-line-row" style="color: #c8102e;">
                  <span>बाकी (Due):</span>
                  <strong>₹${balanceDue.toLocaleString('en-IN')}</strong>
                </div>
              ` : ''}
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  // --- EDIT EXISTING BILL FROM HISTORY ---
  async editBill(billId) {
    const bill = await window.dbManager.getBillById(parseInt(billId, 10));
    if (!bill) {
      alert('Bill not found!');
      return;
    }

    this.currentBillId = bill.id;
    this.currentBillNo = bill.billNo || null;
    this.currentBillStatus = bill.status || 'draft';
    this.currentBillCreatedAt = bill.createdAt || new Date().toISOString();
    await window.appRouter.switchView('billing');

    const titleEl = document.getElementById('billingFormTitle');
    if (titleEl) titleEl.textContent = `Edit Bill (No. ${bill.billNo || bill.id})`;

    document.getElementById('customerNameInput').value = bill.customerName || '';
    document.getElementById('customerPhoneInput').value = bill.customerPhone || '';
    document.getElementById('customerAddressInput').value = bill.customerAddress || '';
    const gstinEl = document.getElementById('customerGstinInput');
    if (gstinEl) gstinEl.value = bill.customerGstin || '';

    document.getElementById('billDateInput').value = bill.date || new Date().toISOString().split('T')[0];
    document.getElementById('billNumberDisplay').textContent = `No. ${bill.billNo || bill.id}`;

    document.getElementById('previousDuesInput').value = bill.previousDues || 0;
    document.getElementById('roundOffInput').value = bill.roundOff || 0;
    document.getElementById('advancePaidInput').value = bill.paidAmount || 0;

    const cgstIn = document.getElementById('cgstPercentInput');
    const sgstIn = document.getElementById('sgstPercentInput');
    if (cgstIn) cgstIn.value = bill.cgstPercent !== undefined ? bill.cgstPercent : 9;
    if (sgstIn) sgstIn.value = bill.sgstPercent !== undefined ? bill.sgstPercent : 9;

    this.lineItems = bill.items && bill.items.length > 0
      ? JSON.parse(JSON.stringify(bill.items))
      : [{ tilesNo: '', particulars: '', hsnCode: '6907', boxes: 0, rate: 0, amount: 0 }];

    // Auto-append empty row at the end if last item has particulars
    if (this.lineItems.length > 0 && this.lineItems[this.lineItems.length - 1].particulars) {
      this.lineItems.push({ tilesNo: '', particulars: '', hsnCode: '6907', boxes: 0, rate: 0, amount: 0 });
    }

    this.setBillType(bill.billType || 'estimate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- RETURNS & EXCHANGES MANAGEMENT (माल परतावा) ---
  async openReturnModal(billId = null) {
    const bills = await window.dbManager.getBills();
    const finalizedBills = bills.filter(b => b.status === 'finalized');

    const selectEl = document.getElementById('returnBillSelect');
    if (!selectEl) return;

    selectEl.innerHTML = '<option value="">-- Select Bill to Return / Exchange Items --</option>' +
      finalizedBills.map(b => `<option value="${b.id}">No. ${b.billNo || b.id} - ${b.customerName} (₹${(b.total || 0).toLocaleString('en-IN')})</option>`).join('');

    // Reset return UI
    document.getElementById('returnBillDetailsCard').style.display = 'none';
    document.getElementById('returnItemsSection').style.display = 'none';
    document.getElementById('btnSubmitReturn').disabled = true;
    document.getElementById('returnTotalRefundDisplay').value = '₹0';
    this.currentReturnBill = null;
    this.currentReturnItems = [];

    if (billId) {
      selectEl.value = billId;
      await this.onReturnBillSelectChange(billId);
    }

    window.appRouter.openModal('returnItemModal');
  }

  async onReturnBillSelectChange(billId) {
    if (!billId) {
      document.getElementById('returnBillDetailsCard').style.display = 'none';
      document.getElementById('returnItemsSection').style.display = 'none';
      document.getElementById('btnSubmitReturn').disabled = true;
      this.currentReturnBill = null;
      return;
    }

    const bill = await window.dbManager.getBillById(parseInt(billId, 10));
    if (!bill) return;

    this.currentReturnBill = bill;

    document.getElementById('retCustomerName').innerHTML = `<strong>Customer:</strong> ${bill.customerName} (${bill.customerPhone || 'No Phone'})`;
    document.getElementById('retBillDate').innerHTML = `<strong>Invoice Date:</strong> ${bill.date}`;
    document.getElementById('retBillTotal').textContent = `₹${(bill.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('retBillBalance').textContent = `₹${(bill.balanceDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    document.getElementById('returnBillDetailsCard').style.display = 'block';
    document.getElementById('returnItemsSection').style.display = 'block';

    const tableBody = document.getElementById('returnItemsTableBody');
    this.currentReturnItems = (bill.items || []).map(item => ({
      particulars: item.particulars || item.tilesNo || 'Item',
      soldBoxes: parseInt(item.boxes || 0, 10),
      rate: parseFloat(item.rate || 0),
      returnBoxes: 0,
      refundAmount: 0
    }));

    tableBody.innerHTML = this.currentReturnItems.map((item, idx) => `
      <tr>
        <td><strong>${item.particulars}</strong></td>
        <td style="text-align: center;">${item.soldBoxes} Boxes</td>
        <td style="text-align: right;">₹${item.rate.toFixed(2)}</td>
        <td>
          <input type="number" class="form-control" style="width: 90px; text-align: center;" 
                 min="0" max="${item.soldBoxes}" value="0" 
                 oninput="window.billingManager.updateReturnRow(${idx}, this.value)">
        </td>
        <td style="text-align: right;">
          <strong id="ret-row-amt-${idx}" style="color: var(--accent-blue);">₹0.00</strong>
        </td>
      </tr>
    `).join('');

    this.updateReturnRefundTotal();
  }

  updateReturnRow(index, value) {
    const item = this.currentReturnItems[index];
    if (!item) return;

    let boxes = parseInt(value, 10) || 0;
    if (boxes < 0) boxes = 0;
    if (boxes > item.soldBoxes) {
      boxes = item.soldBoxes;
      alert(`Cannot return more than the sold quantity (${item.soldBoxes} boxes).`);
    }

    item.returnBoxes = boxes;
    item.refundAmount = boxes * item.rate;

    const rowAmtEl = document.getElementById(`ret-row-amt-${index}`);
    if (rowAmtEl) {
      rowAmtEl.textContent = `₹${item.refundAmount.toFixed(2)}`;
    }

    this.updateReturnRefundTotal();
  }

  updateReturnRefundTotal() {
    const totalRefund = this.currentReturnItems.reduce((sum, i) => sum + (i.refundAmount || 0), 0);
    const totalBoxes = this.currentReturnItems.reduce((sum, i) => sum + (i.returnBoxes || 0), 0);

    const displayEl = document.getElementById('returnTotalRefundDisplay');
    if (displayEl) {
      displayEl.value = `₹${totalRefund.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    const submitBtn = document.getElementById('btnSubmitReturn');
    if (submitBtn) {
      submitBtn.disabled = totalBoxes <= 0;
    }
  }

  async submitReturn() {
    if (!this.currentReturnBill) return;

    const returnedItems = this.currentReturnItems.filter(i => i.returnBoxes > 0);
    if (returnedItems.length === 0) {
      alert('Please specify at least one item and quantity to return.');
      return;
    }

    const totalRefund = returnedItems.reduce((sum, i) => sum + i.refundAmount, 0);
    const reason = document.getElementById('returnReasonSelect').value;

    // 1. Restock products into Inventory
    for (const item of returnedItems) {
      await window.dbManager.restockProduct(item.particulars, item.returnBoxes);
    }

    // 2. Log Return Record
    const returnRecord = {
      billId: this.currentReturnBill.id,
      billNo: this.currentReturnBill.billNo,
      customerName: this.currentReturnBill.customerName,
      customerPhone: this.currentReturnBill.customerPhone,
      date: new Date().toISOString(),
      items: returnedItems,
      totalRefundAmount: totalRefund,
      reason: reason
    };
    await window.dbManager.saveReturn(returnRecord);

    // 3. Adjust Customer Bill Total & Khata Balance
    this.currentReturnBill.balanceDue = Math.max(0, (this.currentReturnBill.balanceDue || 0) - totalRefund);
    this.currentReturnBill.total = Math.max(0, (this.currentReturnBill.total || 0) - totalRefund);
    await window.dbManager.saveBill(this.currentReturnBill);

    window.appRouter.closeModal('returnItemModal');
    alert(`✓ Return processed successfully!\n• Restocked into Inventory: ${returnedItems.map(i => `${i.returnBoxes} boxes of ${i.particulars}`).join(', ')}\n• Khata / Dues adjusted: ₹${totalRefund.toLocaleString('en-IN')}`);

    // Refresh UI
    await window.appRouter.loadBillsList();
    if (window.appRouter.currentView === 'inventory') {
      await window.inventoryManager.loadProducts();
    }
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

// Prevent mouse wheel / scroll from altering number input values when selected or hovered
document.addEventListener('wheel', (e) => {
  if (document.activeElement && document.activeElement.type === 'number') {
    document.activeElement.blur();
  }
}, { passive: true });

// Global click and keydown listener to close autocomplete dropdowns
document.addEventListener('click', (e) => {
  if (!e.target.closest('.form-group') && !e.target.closest('td') && !e.target.closest('.autocomplete-dropdown')) {
    document.querySelectorAll('.autocomplete-dropdown').forEach(el => el.style.display = 'none');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.autocomplete-dropdown').forEach(el => el.style.display = 'none');
  }
});
