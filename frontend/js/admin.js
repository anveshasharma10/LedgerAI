/**
 * Ledger AI — Admin Dashboard Controller
 */

let chartUserGrowth = null;
let chartIncomeVsExpenses = null;
let chartCategories = null;
let chartMonthlyTx = null;

document.addEventListener('DOMContentLoaded', () => {
  AdminUI.init('dashboard');
  loadDashboard();
});

async function loadDashboard() {
  try {
    const res = await API.get('/admin/dashboard');
    if (!res.success || !res.data) {
      AdminUI.toast('Failed to load admin overview', 'error');
      return;
    }

    const { cards, charts, recentActivity } = res.data;

    // 1. Populate KPI cards
    document.getElementById('card-total-users').textContent = cards.totalUsers;
    document.getElementById('card-active-users').textContent = cards.activeUsers;
    document.getElementById('card-inactive-users').textContent = cards.inactiveUsers;
    document.getElementById('card-total-tx').textContent = cards.totalTransactions;
    document.getElementById('card-total-income').textContent = AdminUI.formatCurrency(cards.totalIncome);
    document.getElementById('card-total-expenses').textContent = AdminUI.formatCurrency(cards.totalExpenses);

    // 2. Render Chart.js charts
    renderCharts(charts);

    // 3. Render Recent Activity Table
    renderRecentActivity(recentActivity);
  } catch (err) {
    console.error('Failed to load dashboard:', err);
    AdminUI.toast('Error connecting to admin APIs', 'error');
  }
}

function renderCharts(charts) {
  const months = charts.monthsData.map((m) => m.month);
  const userCounts = charts.monthsData.map((m) => m.users);
  const incomes = charts.monthsData.map((m) => m.income);
  const expenses = charts.monthsData.map((m) => m.expenses);
  const transactions = charts.monthsData.map((m) => m.transactions);

  // Chart 1: User Growth
  const ctxUser = document.getElementById('chart-user-growth');
  if (ctxUser) {
    if (chartUserGrowth) chartUserGrowth.destroy();
    chartUserGrowth = new Chart(ctxUser, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'New Registrations',
            data: userCounts,
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

  // Chart 2: Income vs Expenses
  const ctxIncExp = document.getElementById('chart-income-vs-expenses');
  if (ctxIncExp) {
    if (chartIncomeVsExpenses) chartIncomeVsExpenses.destroy();
    chartIncomeVsExpenses = new Chart(ctxIncExp, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Income',
            data: incomes,
            backgroundColor: '#10B981',
            borderRadius: 4,
          },
          {
            label: 'Expenses',
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

  // Chart 3: Expense Categories (Doughnut)
  const ctxCat = document.getElementById('chart-categories');
  if (ctxCat) {
    if (chartCategories) chartCategories.destroy();
    const catLabels = charts.categoryDistribution.map((c) => c.category);
    const catData = charts.categoryDistribution.map((c) => c.total);
    const catColors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6', '#EC4899', '#64748B'];

    chartCategories = new Chart(ctxCat, {
      type: 'doughnut',
      data: {
        labels: catLabels.length > 0 ? catLabels : ['No Expenses Yet'],
        datasets: [
          {
            data: catData.length > 0 ? catData : [1],
            backgroundColor: catLabels.length > 0 ? catColors.slice(0, catLabels.length) : ['#E2E8F0'],
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

  // Chart 4: Monthly Transactions Activity
  const ctxMonthlyTx = document.getElementById('chart-monthly-tx');
  if (ctxMonthlyTx) {
    if (chartMonthlyTx) chartMonthlyTx.destroy();
    chartMonthlyTx = new Chart(ctxMonthlyTx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Transactions Count',
            data: transactions,
            backgroundColor: '#F59E0B',
            borderRadius: 4,
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
}

function renderRecentActivity(activityList) {
  const tbody = document.getElementById('dashboard-recent-activity-tbody');
  if (!tbody) return;

  if (!activityList || activityList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 24px; color: var(--admin-text-muted);">
          No recent activity recorded yet in the database.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = activityList
    .map((item) => {
      const isIncome = item.type === 'Income';
      const badgeClass = isIncome ? 'badge-income' : 'badge-expense';
      const amtColor = isIncome ? 'var(--admin-success)' : 'var(--admin-danger)';
      const amtSign = isIncome ? '+' : '-';

      return `
        <tr>
          <td>
            <div style="font-weight: 600; color: var(--admin-text-main);">${AdminUI.escapeHTML(item.userName)}</div>
            <div style="font-size: 11px; color: var(--admin-text-muted);">${AdminUI.escapeHTML(item.userEmail)}</div>
          </td>
          <td style="font-weight: 500;">${AdminUI.escapeHTML(item.activity)}</td>
          <td><span class="admin-badge ${badgeClass}">${item.type}</span></td>
          <td style="font-weight: 700; color: ${amtColor}; font-family: monospace; font-size: 13.5px;">
            ${amtSign}${AdminUI.formatCurrency(item.amount)}
          </td>
          <td style="font-size: 12px; color: var(--admin-text-muted);">${AdminUI.formatDate(item.date)}</td>
        </tr>
      `;
    })
    .join('');
}

window.loadDashboard = loadDashboard;
