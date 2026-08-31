/**
 * Advanced Financial Analytics with Chart.js
 */

let categoryDoughnutChart = null;
let monthlyIncomeExpenseBarChart = null;
let expenseLineChart = null;
let savingsTrendChart = null;

async function ensureChart() {
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

async function initAnalytics() {
  Auth.requireAuth();
  UI.initLayout('analytics');

  await ensureChart();

  await Promise.allSettled([
    loadAnalyticsSummary(),
    loadCategoryDoughnut(),
    loadMonthlyBarChart(),
    loadExpenseLineChart(),
    loadSavingsTrendChart(),
  ]);
}

async function loadAnalyticsSummary() {
  try {
    const res = await API.get('/analytics/summary');
    if (res.success && res.data) {
      const { totalIncome, totalExpenses, balance, savingsRate, momComparison } = res.data;
      const incEl = document.getElementById('an-income');
      const expEl = document.getElementById('an-expenses');
      const balEl = document.getElementById('an-balance');
      const savEl = document.getElementById('an-savings-rate');

      if (incEl) incEl.textContent = UI.formatCurrency(totalIncome || 0);
      if (expEl) expEl.textContent = UI.formatCurrency(totalExpenses || 0);
      if (balEl) balEl.textContent = UI.formatCurrency(balance || 0);
      if (savEl) savEl.textContent = `${savingsRate || 0}%`;

      // MoM Comparison text
      const momEl = document.getElementById('mom-comparison-text');
      if (momEl) {
        if (momComparison && momComparison.expenseChangePercent !== undefined) {
          const change = momComparison.expenseChangePercent;
          const isUp = change > 0;
          momEl.innerHTML = `
            Month-over-Month Expense: <strong style="color: ${isUp ? 'var(--danger)' : 'var(--success)'};">${isUp ? '▲ +' : '▼ '}${change}%</strong> vs last month (${UI.formatCurrency(momComparison.lastMonthExpense || 0)})
          `;
        } else {
          momEl.textContent = 'Month-over-Month Comparison: Baseline spending established';
        }
      }
    }
  } catch (err) {
    console.error('Analytics summary err:', err);
  }
}

async function loadCategoryDoughnut() {
  try {
    const ChartLib = await ensureChart();
    const res = await API.get('/analytics/categories');
    if (res.success && res.data) {
      const categories = res.data.categories || [];
      const ctx = document.getElementById('analyticsCategoryChart');
      if (!ctx) return;

      if (!ChartLib) {
        ctx.parentElement.innerHTML = renderCategoryListFallback(categories);
        return;
      }

      if (categories.length === 0) {
        ctx.parentElement.innerHTML = `<div class="empty-state" style="padding: 20px;"><p>No category expenses recorded yet.</p></div>`;
        return;
      }

      const labels = categories.map(c => c.category);
      const values = categories.map(c => c.total);
      const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#7c3aed', '#06b6d4', '#ec4899', '#84cc16', '#64748b'];

      if (categoryDoughnutChart) categoryDoughnutChart.destroy();

      categoryDoughnutChart = new ChartLib(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: colors.slice(0, labels.length),
            borderWidth: 2,
            borderColor: '#ffffff',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { boxWidth: 12, font: { size: 12 } } },
            tooltip: {
              callbacks: {
                label: (c) => ` ${c.label}: ${UI.formatCurrency(c.parsed)} (${((c.parsed / values.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%)`
              }
            }
          },
        },
      });
    }
  } catch (err) {
    console.error('loadCategoryDoughnut error:', err);
  }
}

async function loadMonthlyBarChart() {
  try {
    const ChartLib = await ensureChart();
    const res = await API.get('/analytics/monthly');
    if (res.success && res.data) {
      const monthly = res.data || [];
      const ctx = document.getElementById('analyticsMonthlyBarChart');
      if (!ctx) return;

      if (!ChartLib) return;

      const labels = monthly.map(m => m.monthName || m.month);
      const incomeData = monthly.map(m => m.income || 0);
      const expenseData = monthly.map(m => m.expense || 0);

      if (monthlyIncomeExpenseBarChart) monthlyIncomeExpenseBarChart.destroy();

      monthlyIncomeExpenseBarChart = new ChartLib(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Income',
              data: incomeData,
              backgroundColor: '#10b981',
              borderRadius: 4,
            },
            {
              label: 'Expense',
              data: expenseData,
              backgroundColor: '#ef4444',
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (val) => `₹${val.toLocaleString()}`,
              },
            },
          },
        },
      });
    }
  } catch (err) {
    console.error('loadMonthlyBarChart error:', err);
  }
}

async function loadExpenseLineChart() {
  try {
    const ChartLib = await ensureChart();
    const res = await API.get('/analytics/monthly');
    if (res.success && res.data) {
      const monthly = res.data || [];
      const ctx = document.getElementById('analyticsExpenseLineChart');
      if (!ctx) return;

      if (!ChartLib) return;

      const labels = monthly.map(m => m.monthName || m.month);
      const expenseData = monthly.map(m => m.expense || 0);

      if (expenseLineChart) expenseLineChart.destroy();

      expenseLineChart = new ChartLib(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Monthly Expenses',
            data: expenseData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            fill: true,
            tension: 0.3,
            borderWidth: 3,
            pointBackgroundColor: '#ef4444',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: (val) => `₹${val.toLocaleString()}` },
            },
          },
        },
      });
    }
  } catch (err) {
    console.error('loadExpenseLineChart error:', err);
  }
}

async function loadSavingsTrendChart() {
  try {
    const ChartLib = await ensureChart();
    const res = await API.get('/analytics/savings');
    if (res.success && res.data) {
      const trendList = res.data.savingsTrend || res.data.monthlySavings || [];
      const ctx = document.getElementById('analyticsSavingsTrendChart');
      if (!ctx) return;

      if (!ChartLib) return;

      const labels = trendList.map(m => m.monthName || m.month);
      const savingsData = trendList.map(m => m.savings || 0);

      if (savingsTrendChart) savingsTrendChart.destroy();

      savingsTrendChart = new ChartLib(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Net Savings',
            data: savingsData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            fill: true,
            tension: 0.3,
            borderWidth: 3,
            pointBackgroundColor: '#10b981',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              ticks: { callback: (val) => `₹${val.toLocaleString()}` },
            },
          },
        },
      });
    }
  } catch (err) {
    console.error('loadSavingsTrendChart error:', err);
  }
}

function renderCategoryListFallback(categories) {
  return `
    <div style="display: flex; flex-direction: column; gap: 10px; padding: 10px; height: 100%; overflow-y: auto;">
      ${categories.map(c => `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span><strong>${c.category}</strong> (${c.percentage}%)</span>
          <span style="font-weight: 700;">${UI.formatCurrency(c.total)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

window.initAnalytics = initAnalytics;
