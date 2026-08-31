/**
 * Financial Reports & Statement Logic
 */

let activeReportTab = 'monthly';

async function initReports() {
  Auth.requireAuth();
  UI.initLayout('reports');

  setupReportControls();
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

  // Toggle month/year select visibility for category breakdown if needed
  const monthSelect = document.getElementById('report-month-select');
  const yearSelect = document.getElementById('report-year-select');
  if (monthSelect) monthSelect.style.display = tab === 'category' ? 'none' : 'inline-block';
  if (yearSelect) yearSelect.style.display = tab === 'category' ? 'none' : 'inline-block';

  generateReport();
}

async function generateReport() {
  const container = document.getElementById('report-content-container');
  if (!container) return;

  const month = document.getElementById('report-month-select')?.value || (new Date().getMonth() + 1);
  const year = document.getElementById('report-year-select')?.value || new Date().getFullYear();

  container.innerHTML = `<div style="text-align: center; padding: 40px;"><div class="spinner"></div> Generating financial report...</div>`;

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

function renderMonthlyReport(data) {
  const container = document.getElementById('report-content-container');
  const period = data.period || { monthName: 'Current Month', year: new Date().getFullYear() };
  const summary = data.summary || { totalIncome: 0, totalExpenses: 0, balance: 0, netSavings: 0, savingsRate: 0 };
  const categoryBreakdown = data.categoryBreakdown || data.categories || [];
  const topExpenses = data.topExpenses || (data.expensesList ? data.expensesList.slice(0, 5) : []);

  container.innerHTML = `
    <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 12px;">
      <div>
        <h3 style="font-size: 20px; font-weight: 700; font-family: var(--font-serif);">Statement of Cash Flows — ${period.monthName || 'Period'} ${period.year}</h3>
        <span style="font-size: 12px; color: var(--text-muted);">Generated on ${new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
      </div>
      <div style="display: flex; gap: 8px;">
        <a href="/api/reports/export/csv" class="btn btn-secondary btn-sm" download>📥 Export CSV</a>
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
        <div class="val" style="color: ${(summary.netSavings || summary.balance || 0) >= 0 ? 'var(--primary)' : 'var(--danger)'};">
          ${UI.formatCurrency(summary.netSavings !== undefined ? summary.netSavings : (summary.balance || 0))}
        </div>
      </div>
      <div class="report-stat-card">
        <div class="label">Savings Rate</div>
        <div class="val">${summary.savingsRate || 0}%</div>
      </div>
    </div>

    <!-- Category Breakdown Table -->
    <h4 style="font-size: 15px; margin-bottom: 12px; font-weight: 700;">Category Spending Distribution</h4>
    <div class="table-responsive" style="margin-bottom: 28px;">
      <table class="table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Total Amount</th>
            <th>Percentage</th>
            <th>Item Count</th>
          </tr>
        </thead>
        <tbody>
          ${categoryBreakdown.length === 0 ? '<tr><td colspan="4" class="empty-state" style="padding: 20px;">No category expenditures in this month.</td></tr>' : categoryBreakdown.map(c => `
            <tr>
              <td><strong>${c.category}</strong></td>
              <td style="font-weight: 600;">${UI.formatCurrency(c.total || c.amount || 0)}</td>
              <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="flex: 1; height: 6px; background: #e2ded9; border-radius: 3px; max-width: 100px; overflow: hidden;">
                    <div style="width: ${c.percentage || 0}%; height: 100%; background: var(--primary);"></div>
                  </div>
                  <span>${c.percentage || 0}%</span>
                </div>
              </td>
              <td>${c.count || 1} records</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Top Major Expenditures -->
    <h4 style="font-size: 15px; margin-bottom: 12px; font-weight: 700;">Top Major Outflows</h4>
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
              <td class="amount-expense">${UI.formatCurrency(e.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderYearlyReport(data) {
  const container = document.getElementById('report-content-container');
  const year = data.year || new Date().getFullYear();
  const annualSummary = data.annualSummary || data.summary || { totalIncome: 0, totalExpenses: 0, netSavings: 0, avgMonthlySavings: 0 };
  const monthlyBreakdown = data.monthlyBreakdown || [];

  container.innerHTML = `
    <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 12px;">
      <div>
        <h3 style="font-size: 20px; font-weight: 700; font-family: var(--font-serif);">Annual Financial Performance — ${year}</h3>
        <span style="font-size: 12px; color: var(--text-muted);">Annual fiscal aggregation statement</span>
      </div>
      <div style="display: flex; gap: 8px;">
        <a href="/api/reports/export/csv" class="btn btn-secondary btn-sm" download>📥 Export CSV</a>
        <button class="btn btn-secondary btn-sm" onclick="window.print()">🖨️ Print Statement</button>
      </div>
    </div>

    <div class="report-summary-box">
      <div class="report-stat-card">
        <div class="label">Annual Gross Inflow</div>
        <div class="val" style="color: var(--success);">${UI.formatCurrency(annualSummary.totalIncome || 0)}</div>
      </div>
      <div class="report-stat-card">
        <div class="label">Annual Total Expenses</div>
        <div class="val" style="color: var(--danger);">${UI.formatCurrency(annualSummary.totalExpenses || 0)}</div>
      </div>
      <div class="report-stat-card">
        <div class="label">Annual Net Surplus</div>
        <div class="val" style="color: ${(annualSummary.netSavings || annualSummary.savings || 0) >= 0 ? 'var(--primary)' : 'var(--danger)'};">
          ${UI.formatCurrency(annualSummary.netSavings !== undefined ? annualSummary.netSavings : (annualSummary.savings || 0))}
        </div>
      </div>
      <div class="report-stat-card">
        <div class="label">Avg Monthly Savings</div>
        <div class="val">${UI.formatCurrency(annualSummary.avgMonthlySavings || 0)}</div>
      </div>
    </div>

    <h4 style="font-size: 15px; margin-bottom: 12px; font-weight: 700;">Monthly Inflow vs Outflow Ledger</h4>
    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Month</th>
            <th>Income</th>
            <th>Expenses</th>
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
              <td>${m.savingsRate || 0}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderCategoryReport(data) {
  const container = document.getElementById('report-content-container');
  const summary = data.summary || { totalExpenses: data.totalExpenses || 0 };
  const categories = data.categories || [];

  container.innerHTML = `
    <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 12px;">
      <div>
        <h3 style="font-size: 20px; font-weight: 700; font-family: var(--font-serif);">All-Time Category Spending Analysis</h3>
        <span style="font-size: 12px; color: var(--text-muted);">Cumulative Expenses: <strong>${UI.formatCurrency(summary.totalExpenses || 0)}</strong> across ${categories.length} categories</span>
      </div>
      <div style="display: flex; gap: 8px;">
        <a href="/api/reports/export/csv" class="btn btn-secondary btn-sm" download>📥 Export CSV</a>
        <button class="btn btn-secondary btn-sm" onclick="window.print()">🖨️ Print Statement</button>
      </div>
    </div>

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
                  <span>${c.percentage || 0}%</span>
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
}

window.initReports = initReports;
window.switchReportTab = switchReportTab;
window.generateReport = generateReport;
