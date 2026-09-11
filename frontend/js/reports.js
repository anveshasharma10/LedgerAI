/**
 * Financial Reports & Statement Logic
 * Generates Auditable Monthly, Annual, and Category Financial Statements
 */

let activeReportTab = 'monthly';
let monthlyDoughnutChart = null;
let yearlyBarChart = null;
let categoryAllChart = null;

async function ensureChartLib() {
  if (typeof window.Chart !== 'undefined') return window.Chart;
  return new Promise((resolve) => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (typeof window.Chart !== 'undefined') {
        clearInterval(interval);
        resolve(window.Chart);
      } else if (attempts > 20) {
        clearInterval(interval);
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => resolve(window.Chart);
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
      }
    }, 100);
  });
}

async function initReports() {
  Auth.requireAuth();
  UI.initLayout('reports');

  setupReportControls();
  await ensureChartLib();
  await generateReport();
}

function setupReportControls() {
  const now = new Date();
  const monthSelect = document.getElementById('report-month-select');
  const yearSelect = document.getElementById('report-year-select');

  if (monthSelect) {
    monthSelect.value = String(now.getMonth() + 1);
    monthSelect.addEventListener('change', generateReport);
  }

  if (yearSelect) {
    const curYear = now.getFullYear();
    yearSelect.innerHTML = `
      <option value="${curYear - 1}">${curYear - 1}</option>
      <option value="${curYear}" selected>${curYear}</option>
      <option value="${curYear + 1}">${curYear + 1}</option>
    `;
    yearSelect.addEventListener('change', generateReport);
  }
}

function switchReportTab(tab) {
  activeReportTab = tab;
  document.querySelectorAll('.report-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  const monthSelect = document.getElementById('report-month-select');
  const yearSelect = document.getElementById('report-year-select');
  if (monthSelect) monthSelect.style.display = tab === 'category' ? 'none' : 'inline-block';
  if (yearSelect) yearSelect.style.display = tab === 'category' ? 'none' : 'inline-block';

  generateReport();
}

function exportCSV() {
  const token = Auth.getToken();
  if (!token) {
    UI.toast('Please log in to export accounting records', 'warning');
    return;
  }
  UI.toast('Exporting financial CSV statement...', 'info');
  window.location.href = `/api/reports/export/csv?token=${encodeURIComponent(token)}`;
}

async function generateReport() {
  const container = document.getElementById('report-content-container');
  if (!container) return;

  const month = document.getElementById('report-month-select')?.value || (new Date().getMonth() + 1);
  const year = document.getElementById('report-year-select')?.value || new Date().getFullYear();

  container.innerHTML = `<div style="text-align: center; padding: 40px;"><div class="spinner"></div> Generating financial statement...</div>`;

  try {
    if (activeReportTab === 'monthly') {
      const res = await API.get('/reports/monthly', { month, year });
      if (res.success && res.data) {
        renderMonthlyReport(res.data);
      } else {
        throw new Error(res.message || 'Unable to retrieve monthly statement');
      }
    } else if (activeReportTab === 'yearly') {
      const res = await API.get('/reports/yearly', { year });
      if (res.success && res.data) {
        renderYearlyReport(res.data);
      } else {
        throw new Error(res.message || 'Unable to retrieve yearly statement');
      }
    } else if (activeReportTab === 'category') {
      const res = await API.get('/reports/category');
      if (res.success && res.data) {
        renderCategoryReport(res.data);
      } else {
        throw new Error(res.message || 'Unable to retrieve category breakdown');
      }
    }
  } catch (err) {
    console.error('Report Generation Error:', err);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Failed to generate report</h3>
        <p>${err.message || 'Please verify your records and try again.'}</p>
        <button class="btn btn-primary btn-sm" onclick="generateReport()">🔄 Retry</button>
      </div>
    `;
  }
}

async function renderMonthlyReport(data) {
  const container = document.getElementById('report-content-container');
  const period = data.period || { monthName: 'Current Month', year: new Date().getFullYear() };
  const summary = data.summary || { totalIncome: 0, totalExpenses: 0, balance: 0, netSavings: 0, savingsRate: 0 };
  const categoryBreakdown = data.categoryBreakdown || data.categories || [];
  const topExpenses = data.topExpenses || (data.expensesList ? data.expensesList.slice(0, 6) : []);

  const netVal = summary.netSavings !== undefined ? summary.netSavings : (summary.balance || 0);

  container.innerHTML = `
    <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 12px;">
      <div>
        <h3 style="font-size: 22px; font-weight: 700; font-family: var(--font-serif); margin-bottom: 4px;">
          Statement of Cash Flows — ${period.monthName || 'Period'} ${period.year}
        </h3>
        <span style="font-size: 12px; color: var(--text-muted);">Audited financial summary generated on ${new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary btn-sm" onclick="exportCSV()">📥 Export CSV</button>
        <button class="btn btn-secondary btn-sm" onclick="window.print()">🖨️ Print Statement</button>
      </div>
    </div>

    <!-- Summary Box -->
    <div class="report-summary-box">
      <div class="report-stat-card">
        <div class="label">Total Inflow</div>
        <div class="val" style="color: var(--success);">${UI.formatCurrency(summary.totalIncome || 0)}</div>
      </div>
      <div class="report-stat-card">
        <div class="label">Total Outflow</div>
        <div class="val" style="color: var(--danger);">${UI.formatCurrency(summary.totalExpenses || 0)}</div>
      </div>
      <div class="report-stat-card">
        <div class="label">Net Surplus</div>
        <div class="val" style="color: ${netVal >= 0 ? 'var(--primary)' : 'var(--danger)'};">
          ${UI.formatCurrency(netVal)}
        </div>
      </div>
      <div class="report-stat-card">
        <div class="label">Savings Rate</div>
        <div class="val" style="color: ${summary.savingsRate > 20 ? 'var(--success)' : 'inherit'};">${summary.savingsRate || 0}%</div>
      </div>
    </div>

    <!-- Category Spending Section -->
    <div style="margin-bottom: 28px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <h4 style="font-size: 16px; font-weight: 700;">Category Spending Distribution</h4>
        <span style="font-size: 12px; color: var(--text-muted);">${categoryBreakdown.length} active categories</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; align-items: center;">
        ${categoryBreakdown.length > 0 ? `
          <div style="height: 220px; position: relative; display: flex; align-items: center; justify-content: center;">
            <canvas id="monthlyReportCanvas"></canvas>
          </div>
        ` : ''}

        <div class="table-responsive" style="margin-bottom: 0;">
          <table class="table" style="margin-bottom: 0;">
            <thead>
              <tr>
                <th>Category</th>
                <th>Total Amount</th>
                <th>Share</th>
                <th>Records</th>
              </tr>
            </thead>
            <tbody>
              ${categoryBreakdown.length === 0 ? '<tr><td colspan="4" class="empty-state" style="padding: 20px;">No category expenditures in this month.</td></tr>' : categoryBreakdown.map(c => `
                <tr>
                  <td><strong>${c.category}</strong></td>
                  <td style="font-weight: 600;">${UI.formatCurrency(c.total || c.amount || 0)}</td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div style="flex: 1; height: 6px; background: #e2ded9; border-radius: 3px; max-width: 80px; overflow: hidden;">
                        <div style="width: ${c.percentage || 0}%; height: 100%; background: var(--primary);"></div>
                      </div>
                      <span style="font-size: 12px; font-weight: 600;">${c.percentage || 0}%</span>
                    </div>
                  </td>
                  <td>${c.count || 1}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Top Major Expenditures -->
    <h4 style="font-size: 16px; margin-bottom: 14px; font-weight: 700;">Top Major Outflows</h4>
    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Payment Method</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${topExpenses.length === 0 ? '<tr><td colspan="5" class="empty-state" style="padding: 20px;">No expense records found for this period.</td></tr>' : topExpenses.map(e => `
            <tr>
              <td>${UI.formatDate(e.expense_date)}</td>
              <td><strong>${e.description}</strong></td>
              <td><span class="badge-category">${e.category}</span></td>
              <td>${e.payment_method || 'N/A'}</td>
              <td class="amount-expense" style="font-weight: 700;">${UI.formatCurrency(e.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Render Monthly Doughnut Chart
  if (categoryBreakdown.length > 0) {
    const ChartLib = await ensureChartLib();
    const canvas = document.getElementById('monthlyReportCanvas');
    if (ChartLib && canvas) {
      if (monthlyDoughnutChart) monthlyDoughnutChart.destroy();
      const palette = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#64748b'];
      monthlyDoughnutChart = new ChartLib(canvas, {
        type: 'doughnut',
        data: {
          labels: categoryBreakdown.map(c => c.category),
          datasets: [{
            data: categoryBreakdown.map(c => c.total || c.amount || 0),
            backgroundColor: palette.slice(0, categoryBreakdown.length),
            borderWidth: 2,
            borderColor: '#ffffff',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { boxWidth: 10, font: { size: 11 } }
            },
          },
          cutout: '68%',
        },
      });
    }
  }
}

async function renderYearlyReport(data) {
  const container = document.getElementById('report-content-container');
  const year = data.year || new Date().getFullYear();
  const annualSummary = data.annualSummary || data.summary || { totalIncome: 0, totalExpenses: 0, netSavings: 0, avgMonthlySavings: 0 };
  const monthlyBreakdown = data.monthlyBreakdown || [];

  const annualNet = annualSummary.netSavings !== undefined ? annualSummary.netSavings : (annualSummary.savings || 0);

  container.innerHTML = `
    <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 12px;">
      <div>
        <h3 style="font-size: 22px; font-weight: 700; font-family: var(--font-serif); margin-bottom: 4px;">
          Annual Financial Performance — ${year}
        </h3>
        <span style="font-size: 12px; color: var(--text-muted);">Comprehensive fiscal aggregation and monthly variance ledger</span>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary btn-sm" onclick="exportCSV()">📥 Export CSV</button>
        <button class="btn btn-secondary btn-sm" onclick="window.print()">🖨️ Print Statement</button>
      </div>
    </div>

    <div class="report-summary-box">
      <div class="report-stat-card">
        <div class="label">Annual Gross Inflow</div>
        <div class="val" style="color: var(--success);">${UI.formatCurrency(annualSummary.totalIncome || 0)}</div>
      </div>
      <div class="report-stat-card">
        <div class="label">Annual Total Outflow</div>
        <div class="val" style="color: var(--danger);">${UI.formatCurrency(annualSummary.totalExpenses || 0)}</div>
      </div>
      <div class="report-stat-card">
        <div class="label">Annual Net Surplus</div>
        <div class="val" style="color: ${annualNet >= 0 ? 'var(--primary)' : 'var(--danger)'};">
          ${UI.formatCurrency(annualNet)}
        </div>
      </div>
      <div class="report-stat-card">
        <div class="label">Avg Monthly Savings</div>
        <div class="val">${UI.formatCurrency(annualSummary.avgMonthlySavings || 0)}</div>
      </div>
    </div>

    <!-- Annual Bar Chart -->
    <div style="margin-bottom: 28px;">
      <h4 style="font-size: 16px; margin-bottom: 14px; font-weight: 700;">Monthly Inflow vs Outflow Comparison</h4>
      <div style="height: 260px; position: relative; background: #faf9f6; border: 1px solid var(--border); border-radius: 8px; padding: 12px;">
        <canvas id="yearlyReportCanvas"></canvas>
      </div>
    </div>

    <h4 style="font-size: 16px; margin-bottom: 14px; font-weight: 700;">Monthly Ledger Breakdown</h4>
    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Month</th>
            <th>Inflow (Income)</th>
            <th>Outflow (Expenses)</th>
            <th>Net Surplus</th>
            <th>Savings Rate</th>
          </tr>
        </thead>
        <tbody>
          ${monthlyBreakdown.map(m => `
            <tr>
              <td><strong>${m.monthName || m.month}</strong></td>
              <td style="color: var(--success); font-weight: 600;">${UI.formatCurrency(m.income || 0)}</td>
              <td style="color: var(--danger); font-weight: 600;">${UI.formatCurrency(m.expense || 0)}</td>
              <td style="color: ${(m.savings || 0) >= 0 ? 'var(--primary)' : 'var(--danger)'}; font-weight: 700;">
                ${UI.formatCurrency(m.savings || 0)}
              </td>
              <td style="font-weight: 600;">${m.savingsRate || 0}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Render Yearly Bar Chart
  if (monthlyBreakdown.length > 0) {
    const ChartLib = await ensureChartLib();
    const canvas = document.getElementById('yearlyReportCanvas');
    if (ChartLib && canvas) {
      if (yearlyBarChart) yearlyBarChart.destroy();
      yearlyBarChart = new ChartLib(canvas, {
        type: 'bar',
        data: {
          labels: monthlyBreakdown.map(m => m.monthName || m.month),
          datasets: [
            {
              label: 'Income',
              data: monthlyBreakdown.map(m => m.income || 0),
              backgroundColor: '#10b981',
              borderRadius: 4,
            },
            {
              label: 'Expenses',
              data: monthlyBreakdown.map(m => m.expense || 0),
              backgroundColor: '#ef4444',
              borderRadius: 4,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 12 } } },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ${UI.formatCurrency(ctx.raw || 0)}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (val) => UI.formatCurrency(val),
              }
            }
          }
        }
      });
    }
  }
}

async function renderCategoryReport(data) {
  const container = document.getElementById('report-content-container');
  const summary = data.summary || { totalExpenses: data.totalExpenses || 0 };
  const categories = data.categories || [];

  container.innerHTML = `
    <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 12px;">
      <div>
        <h3 style="font-size: 22px; font-weight: 700; font-family: var(--font-serif); margin-bottom: 4px;">
          All-Time Category Spending Analysis
        </h3>
        <span style="font-size: 12px; color: var(--text-muted);">Cumulative Expenses: <strong>${UI.formatCurrency(summary.totalExpenses || 0)}</strong> across ${categories.length} categories</span>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary btn-sm" onclick="exportCSV()">📥 Export CSV</button>
        <button class="btn btn-secondary btn-sm" onclick="window.print()">🖨️ Print Statement</button>
      </div>
    </div>

    <!-- Category Visual Chart -->
    ${categories.length > 0 ? `
      <div style="margin-bottom: 28px;">
        <div style="height: 240px; position: relative; background: #faf9f6; border: 1px solid var(--border); border-radius: 8px; padding: 12px;">
          <canvas id="categoryReportCanvas"></canvas>
        </div>
      </div>
    ` : ''}

    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Total Spent</th>
            <th>Share of Total</th>
            <th>Avg Per Record</th>
            <th>Total Records</th>
          </tr>
        </thead>
        <tbody>
          ${categories.length === 0 ? '<tr><td colspan="5" class="empty-state" style="padding: 20px;">No expenses recorded yet.</td></tr>' : categories.map(c => `
            <tr>
              <td><strong>${c.category}</strong></td>
              <td style="font-weight: 700;">${UI.formatCurrency(c.total || 0)}</td>
              <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="flex: 1; height: 6px; background: #e2ded9; border-radius: 3px; max-width: 100px; overflow: hidden;">
                    <div style="width: ${c.percentage || 0}%; height: 100%; background: var(--primary);"></div>
                  </div>
                  <span style="font-size: 12px; font-weight: 600;">${c.percentage || 0}%</span>
                </div>
              </td>
              <td>${UI.formatCurrency(c.avgPerItem || 0)}</td>
              <td>${c.count || 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  if (categories.length > 0) {
    const ChartLib = await ensureChartLib();
    const canvas = document.getElementById('categoryReportCanvas');
    if (ChartLib && canvas) {
      if (categoryAllChart) categoryAllChart.destroy();
      const palette = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#64748b'];
      categoryAllChart = new ChartLib(canvas, {
        type: 'bar',
        data: {
          labels: categories.map(c => c.category),
          datasets: [{
            label: 'Total Spent',
            data: categories.map(c => c.total || 0),
            backgroundColor: palette.slice(0, categories.length),
            borderRadius: 4,
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` Spent: ${UI.formatCurrency(ctx.raw || 0)}`
              }
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: {
                callback: (val) => UI.formatCurrency(val),
              }
            }
          }
        }
      });
    }
  }
}

window.initReports = initReports;
window.switchReportTab = switchReportTab;
window.generateReport = generateReport;
window.exportCSV = exportCSV;
