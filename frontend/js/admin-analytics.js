/**
 * Ledger AI — Admin Analytics Controller
 */

let chartAnnualFlow = null;
let chartUserGrowthTrend = null;
let chartPaymentMethods = null;

document.addEventListener('DOMContentLoaded', () => {
  AdminUI.init('analytics');
  loadAnalytics();
});

async function loadAnalytics() {
  try {
    const res = await API.get('/admin/analytics');
    if (!res.success || !res.data) {
      AdminUI.toast('Failed to load analytics', 'error');
      return;
    }

    const { summary, categoryStats, paymentMethods, monthlyTrends } = res.data;

    // 1. KPI Cards
    document.getElementById('kpi-total-users').textContent = summary.totalUsers;
    document.getElementById('kpi-active-users').textContent = `${summary.activeUsers} Active Accounts`;
    document.getElementById('kpi-gross-income').textContent = AdminUI.formatCurrency(summary.totalIncome);
    document.getElementById('kpi-gross-expenses').textContent = AdminUI.formatCurrency(summary.totalExpenses);
    document.getElementById('kpi-net-surplus').textContent = AdminUI.formatCurrency(summary.netFlow);
    document.getElementById('kpi-total-tx').textContent = `${summary.totalTransactions} transactions recorded`;

    // 2. Charts
    renderAnnualFlow(monthlyTrends);
    renderUserGrowthTrend(monthlyTrends);
    renderPaymentMethods(paymentMethods);

    // 3. Category Table
    renderCategoryTable(categoryStats);
  } catch (err) {
    console.error('Failed to load analytics:', err);
    AdminUI.toast('Failed to communicate with analytics API', 'error');
  }
}

function renderAnnualFlow(monthlyTrends) {
  const ctx = document.getElementById('chart-annual-flow');
  if (!ctx) return;

  const labels = monthlyTrends.map((m) => m.month);
  const incomes = monthlyTrends.map((m) => m.income);
  const expenses = monthlyTrends.map((m) => m.expenses);

  if (chartAnnualFlow) chartAnnualFlow.destroy();
  chartAnnualFlow = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Total Platform Inflow (Income)',
          data: incomes,
          backgroundColor: '#10B981',
          borderRadius: 4,
        },
        {
          label: 'Total Platform Outflow (Expenses)',
          data: expenses,
          backgroundColor: '#EF4444',
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ₹${Number(ctx.raw).toLocaleString('en-IN')}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => '₹' + Number(val).toLocaleString('en-IN'),
          },
        },
      },
    },
  });
}

function renderUserGrowthTrend(monthlyTrends) {
  const ctx = document.getElementById('chart-user-growth-trend');
  if (!ctx) return;

  const labels = monthlyTrends.map((m) => m.month);
  const cumulative = monthlyTrends.map((m) => m.cumulativeUsers);

  if (chartUserGrowthTrend) chartUserGrowthTrend.destroy();
  chartUserGrowthTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Cumulative User Accounts',
          data: cumulative,
          borderColor: '#4F46E5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  });
}

function renderPaymentMethods(paymentMethods) {
  const ctx = document.getElementById('chart-payment-methods');
  if (!ctx) return;

  const labels = paymentMethods.map((p) => p.method);
  const data = paymentMethods.map((p) => p.total);
  const colors = ['#4F46E5', '#10B981', '#F59E0B', '#06B6D4', '#8B5CF6', '#EC4899', '#64748B'];

  if (chartPaymentMethods) chartPaymentMethods.destroy();
  chartPaymentMethods = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [
        {
          data: data.length > 0 ? data : [1],
          backgroundColor: labels.length > 0 ? colors.slice(0, labels.length) : ['#E2E8F0'],
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ₹${Number(ctx.raw).toLocaleString('en-IN')}`,
          },
        },
      },
    },
  });
}

function renderCategoryTable(categoryStats) {
  const tbody = document.getElementById('category-stats-tbody');
  if (!tbody) return;

  if (!categoryStats || categoryStats.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 24px; color: var(--admin-text-muted);">
          No expense categories recorded yet.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = categoryStats
    .map((c) => {
      const avg = c.count > 0 ? c.total / c.count : 0;
      return `
        <tr>
          <td style="font-weight: 600; color: var(--admin-text-main);">${AdminUI.escapeHTML(c.category)}</td>
          <td style="font-family: monospace; font-size: 13px;">${c.count} transactions</td>
          <td style="font-weight: 700; color: var(--admin-danger); font-family: monospace; font-size: 14px;">
            ${AdminUI.formatCurrency(c.total)}
          </td>
          <td style="color: var(--admin-text-muted); font-family: monospace;">${AdminUI.formatCurrency(avg)}</td>
        </tr>
      `;
    })
    .join('');
}

window.loadAnalytics = loadAnalytics;
