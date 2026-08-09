/* 
  Baig Tiles & Granite CRM - Inventory Management Module (inventory.js)
  Full CRUD for products, stock boxes counter, category filters, and low-stock alerts.
*/

class InventoryManager {
  constructor() {
    this.products = [];
    this.currentCategory = 'all';
    this.searchQuery = '';
  }

  async loadProducts() {
    this.products = await window.dbManager.getProducts();
    this.renderInventoryTable();
    this.updateLowStockAlertsCount();
  }

  renderInventoryTable() {
    const tableBody = document.getElementById('inventoryTableBody');
    if (!tableBody) return;

    let filtered = this.products;

    // Filter by Category
    if (this.currentCategory !== 'all') {
      filtered = filtered.filter(p => p.size === this.currentCategory);
    }

    // Filter by Search Query
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.size && p.size.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
            No products found in inventory. Click <strong>+ Add Product</strong> to add one.
          </td>
        </tr>
      `;
      return;
    }

    const isOwner = window.appRouter ? window.appRouter.userRole === 'owner' : true;

    tableBody.innerHTML = filtered.map((p, idx) => {
      const isLowStock = p.stock <= (p.minStockAlert || 10);
      return `
        <tr>
          <td><strong>${idx + 1}</strong></td>
          <td>
            <strong>${p.name}</strong>
            ${isLowStock ? `<span class="badge badge-lowstock" style="margin-left: 8px;">${window.i18n.t('lowStockTag')}</span>` : ''}
          </td>
          <td><span class="badge badge-partial">${p.size || 'N/A'}</span></td>
          <td><strong>₹${p.rate}</strong></td>
          <td>
            <strong style="color: ${isLowStock ? 'var(--danger)' : 'var(--text-main)'};">
              ${p.stock} boxes
            </strong>
          </td>
          <td>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-sm btn-outline-primary" onclick="window.inventoryManager.openEditModal(${p.id})">
                <svg class="svg-icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Edit
              </button>
              ${isOwner ? `
                <button class="btn btn-sm btn-danger" onclick="window.inventoryManager.deleteProduct(${p.id})">
                  <svg class="svg-icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  updateLowStockAlertsCount() {
    const lowStockItems = this.products.filter(p => p.stock <= (p.minStockAlert || 10));
    const alertBadge = document.getElementById('lowStockBadgeCount');
    if (alertBadge) {
      if (lowStockItems.length > 0) {
        alertBadge.textContent = `${lowStockItems.length} Low Stock Alert${lowStockItems.length > 1 ? 's' : ''}`;
        alertBadge.style.display = 'inline-block';
      } else {
        alertBadge.style.display = 'none';
      }
    }
  }

  filterByCategory(category) {
    this.currentCategory = category;
    this.renderInventoryTable();
  }

  searchProducts(query) {
    this.searchQuery = query;
    this.renderInventoryTable();
  }

  openAddModal() {
    document.getElementById('productFormModalTitle').textContent = window.i18n.t('addProduct');
    document.getElementById('productIdInput').value = '';
    document.getElementById('productNameInput').value = '';
    document.getElementById('productSizeInput').value = '2x4';
    document.getElementById('productRateInput').value = '';
    document.getElementById('productStockInput').value = '';
    document.getElementById('productMinAlertInput').value = '15';

    window.appRouter.openModal('productFormModal');
  }

  openEditModal(id) {
    const p = this.products.find(item => item.id === id);
    if (!p) return;

    document.getElementById('productFormModalTitle').textContent = 'Edit Product';
    document.getElementById('productIdInput').value = p.id;
    document.getElementById('productNameInput').value = p.name;
    document.getElementById('productSizeInput').value = p.size || '2x4';
    document.getElementById('productRateInput').value = p.rate;
    document.getElementById('productStockInput').value = p.stock;
    document.getElementById('productMinAlertInput').value = p.minStockAlert || 15;

    window.appRouter.openModal('productFormModal');
  }

  async saveProductFromModal() {
    const id = document.getElementById('productIdInput').value;
    const name = document.getElementById('productNameInput').value.trim();
    const size = document.getElementById('productSizeInput').value.trim();
    const rate = parseFloat(document.getElementById('productRateInput').value) || 0;
    const stock = parseInt(document.getElementById('productStockInput').value, 10) || 0;
    const minStockAlert = parseInt(document.getElementById('productMinAlertInput').value, 10) || 10;

    if (!name) {
      alert('Please enter product name.');
      return;
    }

    const product = {
      name,
      size,
      rate,
      stock,
      minStockAlert
    };

    if (id) {
      product.id = parseInt(id, 10);
    }

    await window.dbManager.saveProduct(product);
    window.appRouter.closeModal('productFormModal');
    await this.loadProducts();
  }

  async deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product from inventory?')) {
      await window.dbManager.deleteProduct(id);
      await this.loadProducts();
    }
  }
}

window.inventoryManager = new InventoryManager();
