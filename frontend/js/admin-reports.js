/**
 * Ledger AI — Admin Reports Controller
 */

let currentReportType = 'financial';
let currentReportData = null;

document.addEventListener('DOMContentLoaded', () => {
  AdminUI.init('reports');
  loadSelectedReport();
});

function switchReportType() {
  currentReportType = document.getElementById('report-type-select').value;
  loadSelectedReport();
}

async function loadSelectedReport() {
  const container = document.getElementById('report-dynamic-content');
  const title = document.getElementById('report-title');
  const subtitle = document.getElementById('report-subtitle');

  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--admin-text-muted);">
        Fetching and preparing report dataset...
      </div>
    `;
  }

  try {
    const res = await API.get(`/admin/reports?type=${currentReportType}`);
    if (!res.success || !res.data) {
      AdminUI.toast('Failed to load report', 'error');
      return;
    }

    currentReportData = res.data;

    if (currentReportType === 'financial') {
      title.textContent = 'Platform Financial & Category Allocation Report';
      subtitle.textContent = `Generated on ${new Date().toLocaleString('en-IN')}`;
      renderFinancialReport(res.data);
    } else if (currentReportType === 'users') {
      title.textContent = 'User Accounts & Balance Summary Report';
      subtitle.textContent = `Generated on ${new Date().toLocaleString('en-IN')}`;
      renderUsersReport(res.data);
    } else if (currentReportType === 'activity') {
      title.textContent = 'Global Platform Activity & Audit Transaction Log';
      subtitle.textContent = `Generated on ${new Date().toLocaleString('en-IN')}`;
      renderActivityReport(res.data);
    }
  } catch (err) {
    console.error('Report loading error:', err);
    AdminUI.toast('Failed to generate report dataset', 'error');
  }
}

function renderFinancialReport(data) {
  const container = document.getElementById('report-dynamic-content');
  const { summary, categoryBreakdown } = data;

  container.innerHTML = `
    <!-- Top Summary Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
      <div style="background: #F8FAFC; border: 1px solid var(--admin-border); border-radius: 8px; padding: 16px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--admin-text-muted);">GROSS INFLOW</div>
        <div style="font-size: 20px; font-weight: 800; color: var(--admin-success); margin-top: 4px;">
          ${AdminUI.formatCurrency(summary.totalIncome)}
        </div>
      </div>
      <div style="background: #F8FAFC; border: 1px solid var(--admin-border); border-radius: 8px; padding: 16px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--admin-text-muted);">GROSS OUTFLOW</div>
        <div style="font-size: 20px; font-weight: 800; color: var(--admin-danger); margin-top: 4px;">
          ${AdminUI.formatCurrency(summary.totalExpenses)}
        </div>
      </div>
      <div style="background: #F8FAFC; border: 1px solid var(--admin-border); border-radius: 8px; padding: 16px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--admin-text-muted);">NET SYSTEM BALANCE</div>
        <div style="font-size: 20px; font-weight: 800; color: var(--admin-primary); margin-top: 4px;">
          ${AdminUI.formatCurrency(summary.netBalance)}
        </div>
      </div>
      <div style="background: #F8FAFC; border: 1px solid var(--admin-border); border-radius: 8px; padding: 16px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--admin-text-muted);">TOTAL TRANSACTIONS</div>
        <div style="font-size: 20px; font-weight: 800; color: var(--admin-text-main); margin-top: 4px;">
          ${summary.totalTransactions}
        </div>
      </div>
    </div>

    <!-- Category Allocation Table -->
    <h4 style="font-size: 14px; font-weight: 700; margin: 0 0 12px 0;">Outflow Category Breakdown</h4>
    <div style="overflow-x: auto;">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Expense Category</th>
            <th>Entries Count</th>
            <th style="text-align: right;">Total Amount</th>
            <th style="text-align: right;">% of Outflow</th>
          </tr>
        </thead>
        <tbody>
          ${
            categoryBreakdown.length === 0
              ? `<tr><td colspan="4" style="text-align: center; padding: 20px;">No categories recorded yet</td></tr>`
              : categoryBreakdown
                  .map((c) => {
                    const pct = summary.totalExpenses > 0 ? ((c.total / summary.totalExpenses) * 100).toFixed(1) : 0;
                    return `
                  <tr>
                    <td style="font-weight: 600;">${AdminUI.escapeHTML(c.category)}</td>
                    <td>${c.count} entries</td>
                    <td style="text-align: right; font-weight: 700; color: var(--admin-danger); font-family: monospace;">
                      ${AdminUI.formatCurrency(c.total)}
                    </td>
                    <td style="text-align: right; font-weight: 600; color: var(--admin-text-muted);">${pct}%</td>
                  </tr>
                `;
                  })
                  .join('')
          }
        </tbody>
      </table>
    </div>
  `;
}

function renderUsersReport(data) {
  const container = document.getElementById('report-dynamic-content');
  const { summary, rows } = data;

  container.innerHTML = `
    <div style="margin-bottom: 16px; display: flex; gap: 16px; font-size: 13px; color: var(--admin-text-muted);">
      <div><strong>Total Accounts:</strong> ${summary.totalUsers}</div>
      <div><strong>Active:</strong> <span style="color: var(--admin-success); font-weight: 700;">${summary.activeUsers}</span></div>
      <div><strong>Inactive:</strong> <span style="color: var(--admin-danger); font-weight: 700;">${summary.inactiveUsers}</span></div>
    </div>

    <div style="overflow-x: auto;">
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th style="text-align: right;">Total Income</th>
            <th style="text-align: right;">Total Expenses</th>
            <th style="text-align: right;">Tx Count</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (u) => `
            <tr>
              <td style="font-weight: 700; color: var(--admin-text-muted);">#${u.id}</td>
              <td style="font-weight: 600;">${AdminUI.escapeHTML(u.name)}</td>
              <td style="font-family: monospace;">${AdminUI.escapeHTML(u.email)}</td>
              <td><span class="admin-badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}">${u.role}</span></td>
              <td><span class="admin-badge ${u.is_active === 'Active' ? 'badge-active' : 'badge-inactive'}">${u.is_active}</span></td>
              <td style="text-align: right; color: var(--admin-success); font-family: monospace; font-weight: 600;">
                ${AdminUI.formatCurrency(u.total_income)}
              </td>
              <td style="text-align: right; color: var(--admin-danger); font-family: monospace; font-weight: 600;">
                ${AdminUI.formatCurrency(u.total_expenses)}
              </td>
              <td style="text-align: right; font-weight: 700;">${u.transaction_count}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderActivityReport(data) {
  const container = document.getElementById('report-dynamic-content');
  const { totalCount, rows } = data;

  container.innerHTML = `
    <div style="margin-bottom: 16px; font-size: 13px; color: var(--admin-text-muted);">
      <strong>Total Logged Actions:</strong> ${totalCount} entries
    </div>

    <div style="overflow-x: auto; max-height: 500px; overflow-y: auto;">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>User</th>
            <th>Type</th>
            <th>Category</th>
            <th>Description</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `
            <tr>
              <td style="font-size: 12px; color: var(--admin-text-muted);">${r.date}</td>
              <td>
                <div style="font-weight: 600;">${AdminUI.escapeHTML(r.user)}</div>
                <div style="font-size: 11px; color: var(--admin-text-muted);">${AdminUI.escapeHTML(r.email)}</div>
              </td>
              <td><span class="admin-badge ${r.type === 'Income' ? 'badge-income' : 'badge-expense'}">${r.type}</span></td>
              <td>${AdminUI.escapeHTML(r.category)}</td>
              <td>${AdminUI.escapeHTML(r.description)}</td>
              <td style="text-align: right; font-weight: 700; color: ${r.type === 'Income' ? 'var(--admin-success)' : 'var(--admin-danger)'}; font-family: monospace;">
                ${AdminUI.formatCurrency(r.amount)}
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function exportCSV() {
  if (!currentReportData) {
    AdminUI.toast('No report data ready to export', 'error');
    return;
  }

  let csvContent = 'data:text/csv;charset=utf-8,';
  let filename = `ledgerai_report_${currentReportType}_${Date.now()}.csv`;

  if (currentReportType === 'financial') {
    csvContent += 'Category,Transaction Count,Total Amount\n';
    currentReportData.categoryBreakdown.forEach((c) => {
      csvContent += `"${c.category}",${c.count},${c.total}\n`;
    });
    csvContent += `\n"Gross Inflow",,"${currentReportData.summary.totalIncome}"\n`;
    csvContent += `"Gross Outflow",,"${currentReportData.summary.totalExpenses}"\n`;
    csvContent += `"Net Balance",,"${currentReportData.summary.netBalance}"\n`;
  } else if (currentReportType === 'users') {
    csvContent += 'ID,Name,Email,Role,Status,Total Income,Total Expenses,Tx Count\n';
    currentReportData.rows.forEach((u) => {
      csvContent += `${u.id},"${u.name}","${u.email}",${u.role},${u.is_active},${u.total_income},${u.total_expenses},${u.transaction_count}\n`;
    });
  } else if (currentReportType === 'activity') {
    csvContent += 'Date,User,Email,Type,Category,Description,Amount\n';
    currentReportData.rows.forEach((r) => {
      csvContent += `"${r.date}","${r.user}","${r.email}","${r.type}","${r.category}","${r.description.replace(/"/g, '""')}",${r.amount}\n`;
    });
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  AdminUI.toast('Report downloaded as CSV!', 'success');
}

window.switchReportType = switchReportType;
window.loadSelectedReport = loadSelectedReport;
window.exportCSV = exportCSV;
