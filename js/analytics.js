/* 
  Baig Tiles & Granite CRM - Business Analytics & Charts Module (analytics.js)
  Calculates weekly & monthly revenue, top products, top customers, and draws lightweight HTML5 canvas bar charts.
*/

class AnalyticsManager {
  constructor() {
    this.bills = [];
    this.products = [];
  }

  async loadAnalytics() {
    this.bills = await window.dbManager.getBills();
    this.products = await window.dbManager.getProducts();

    const finalizedBills = this.bills.filter(b => b.status === 'finalized');

    // Calculate Summary Stats
    const totalRevenue = finalizedBills.reduce((sum, b) => sum + (b.total || 0), 0);
    const totalDues = finalizedBills.reduce((sum, b) => sum + (b.balanceDue || 0), 0);
    
    // Weekly Sales (last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklyBills = finalizedBills.filter(b => new Date(b.date || b.createdAt) >= sevenDaysAgo);
    const weeklyRevenue = weeklyBills.reduce((sum, b) => sum + (b.total || 0), 0);

    // Monthly Sales (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthlyBills = finalizedBills.filter(b => new Date(b.date || b.createdAt) >= thirtyDaysAgo);
    const monthlyRevenue = monthlyBills.reduce((sum, b) => sum + (b.total || 0), 0);

    // Update UI Stats
    document.getElementById('statTotalRevenue').textContent = `₹${totalRevenue.toLocaleString('en-IN')}`;
    document.getElementById('statWeeklySales').textContent = `₹${weeklyRevenue.toLocaleString('en-IN')}`;
    document.getElementById('statMonthlySales').textContent = `₹${monthlyRevenue.toLocaleString('en-IN')}`;
    document.getElementById('statTotalBills').textContent = finalizedBills.length;

    // Render Charts
    this.drawSalesChart(finalizedBills);
    this.renderTopProducts(finalizedBills);
  }

  drawSalesChart(bills) {
    const canvas = document.getElementById('salesChartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Resize for high DPI
    const width = canvas.parentElement.clientWidth || 600;
    const height = 240;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    if (bills.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No finalized sales data available for chart rendering.', width / 2, height / 2);
      return;
    }

    // Aggregate revenue by date
    const salesByDate = {};
    bills.forEach(b => {
      const d = b.date || 'Unknown';
      salesByDate[d] = (salesByDate[d] || 0) + (b.total || 0);
    });

    const dates = Object.keys(salesByDate).sort();
    const values = dates.map(d => salesByDate[d]);
    const maxValue = Math.max(...values, 1000);

    const paddingLeft = 60;
    const paddingBottom = 40;
    const paddingTop = 20;
    const paddingRight = 20;
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = paddingTop + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      const val = Math.round(maxValue - (maxValue / 4) * i);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`₹${val.toLocaleString('en-IN')}`, paddingLeft - 8, y + 4);
    }

    // Bar chart
    const barWidth = Math.max(16, Math.min(40, (chartWidth / dates.length) - 12));
    const step = chartWidth / dates.length;

    dates.forEach((d, idx) => {
      const val = salesByDate[d];
      const barHeight = (val / maxValue) * chartHeight;
      const x = paddingLeft + idx * step + (step - barWidth) / 2;
      const y = height - paddingBottom - barHeight;

      // Bar fill
      ctx.fillStyle = '#0a2540';
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
      ctx.fill();

      // Date Label
      ctx.fillStyle = '#0f172a';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      const shortDate = d.length > 5 ? d.substring(5) : d;
      ctx.fillText(shortDate, x + barWidth / 2, height - paddingBottom + 16);
    });
  }

  renderTopProducts(bills) {
    const container = document.getElementById('topProductsList');
    if (!container) return;

    const productSales = {};
    bills.forEach(b => {
      (b.items || []).forEach(item => {
        const key = item.particulars;
        if (!productSales[key]) {
          productSales[key] = { boxes: 0, revenue: 0 };
        }
        productSales[key].boxes += parseInt(item.boxes || 0, 10);
        productSales[key].revenue += (item.amount || 0);
      });
    });

    const sorted = Object.keys(productSales)
      .map(key => ({ name: key, ...productSales[key] }))
      .sort((a, b) => b.boxes - a.boxes)
      .slice(0, 5);

    if (sorted.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted);">No sales recorded yet.</p>`;
      return;
    }

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Boxes Sold</th>
            <th>Total Sales Value (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(p => `
            <tr>
              <td><strong>${p.name}</strong></td>
              <td>${p.boxes} boxes</td>
              <td><strong>₹${p.revenue.toLocaleString('en-IN')}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}

window.analyticsManager = new AnalyticsManager();
