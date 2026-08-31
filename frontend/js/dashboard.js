/**
 * Dashboard Logic & Live Metrics
 */

let expenseChartInstance = null;

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

async function initDashboard() {
  Auth.requireAuth();
  UI.initLayout('dashboard');

  await ensureChart();

  await Promise.allSettled([
    loadSummaryMetrics(),
    loadExpenseChart(),
    loadAIInsights(),
    loadRecentTransactions(),
  ]);
}

async function loadSummaryMetrics() {
  try {
    const res = await API.get('/analytics/summary');
    if (res.success && res.data) {
      const data = res.data;
      const incEl = document.getElementById('metric-income');
      const expEl = document.getElementById('metric-expenses');
      const balEl = document.getElementById('metric-balance');
      const savEl = document.getElementById('metric-savings');
      const srtEl = document.getElementById('metric-savings-rate');
      const bdgEl = document.getElementById('metric-budget');
      const bduEl = document.getElementById('metric-budget-used');

      if (incEl) incEl.textContent = UI.formatCurrency(data.totalIncome || 0);
      if (expEl) expEl.textContent = UI.formatCurrency(data.totalExpenses || 0);
      if (balEl) balEl.textContent = UI.formatCurrency(data.balance || 0);
      if (savEl) savEl.textContent = UI.formatCurrency(data.savings || 0);
      if (srtEl) srtEl.textContent = `${data.savingsRate || 0}%`;
      if (bdgEl) bdgEl.textContent = UI.formatCurrency(data.monthlyBudget || 0);
      if (bduEl) bduEl.textContent = `${UI.formatCurrency(data.budgetUsed || 0)} (${data.budgetPercentage || 0}%)`;
    }
  } catch (err) {
    console.error('Failed to load financial summary:', err);
  }
}

async function loadExpenseChart() {
  try {
    const ChartLib = await ensureChart();
    const res = await API.get('/analytics/categories');
    if (res.success && res.data) {
      const categories = res.data.categories || [];
      const ctx = document.getElementById('expenseDoughnutChart');
      const chartBox = document.getElementById('chart-container');
      if (!ctx || !chartBox) return;

      if (categories.length === 0) {
        chartBox.innerHTML = `
          <div class="empty-state" style="padding: 30px;">
            <div class="empty-state-icon">📊</div>
            <h3>No expenses recorded yet</h3>
            <p>Add your first expense to see your category spending breakdown.</p>
            <a href="/expenses.html" class="btn btn-primary btn-sm">+ Add Expense</a>
          </div>
        `;
        return;
      }

      if (!ChartLib) {
        // Simple HTML Bar Fallback if Chart.js is not loaded
        chartBox.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 8px; width: 100%; padding: 12px; height: 260px; overflow-y: auto;">
            ${categories.map(c => `
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
                  <span><strong>${c.category}</strong></span>
                  <span>${UI.formatCurrency(c.total)} (${c.percentage}%)</span>
                </div>
                <div style="height: 6px; background: #e2ded9; border-radius: 3px; overflow: hidden;">
                  <div style="width: ${c.percentage}%; height: 100%; background: #1a1a1a;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        `;
        return;
      }

      const labels = categories.map(c => c.category);
      const values = categories.map(c => c.total);
      const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
        '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#64748b'
      ];

      if (expenseChartInstance) {
        expenseChartInstance.destroy();
      }

      expenseChartInstance = new ChartLib(ctx, {
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
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                font: { size: 12 },
              },
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ₹${ctx.parsed.toLocaleString()}`,
              },
            },
          },
        },
      });
    }
  } catch (err) {
    console.error('Error loading expense chart:', err);
  }
}

async function loadAIInsights() {
  const container = document.getElementById('ai-insights-container');
  if (!container) return;

  try {
    const res = await API.get('/ai/insights');
    if (res.success && res.data) {
      const { activeInsights, summary } = res.data;

      if (!activeInsights || activeInsights.length === 0) {
        container.innerHTML = `
          <div class="ai-insight-item info">
            <div class="insight-icon">🤖</div>
            <div class="insight-content">
              <h4>AI Financial Engine Active</h4>
              <p>${summary || 'Track your daily expenses to receive automated anomaly detection and budget tips.'}</p>
            </div>
          </div>
        `;
        return;
      }

      container.innerHTML = activeInsights.map(ins => {
        let icon = '💡';
        if (ins.type === 'Overspending' || ins.severity === 'warning') icon = '⚠️';
        if (ins.type === 'Positive Trend' || ins.severity === 'positive') icon = '📈';
        if (ins.type === 'Budget Alert') icon = '🎯';

        return `
          <div class="ai-insight-item ${ins.severity || 'info'}">
            <div class="insight-icon">${icon}</div>
            <div class="insight-content">
              <h4>${ins.title || ins.type}</h4>
              <p>${ins.message}</p>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    container.innerHTML = `
      <div class="ai-insight-item info">
        <div class="insight-icon">✨</div>
        <div class="insight-content">
          <h4>Smart Insights Ready</h4>
          <p>Add additional records to generate predictive spending analyses and budget optimization.</p>
        </div>
      </div>
    `;
  }
}

async function loadRecentTransactions() {
  const tbody = document.getElementById('recent-transactions-tbody');
  if (!tbody) return;

  try {
    const res = await API.get('/transactions', { limit: 5 });
    if (res.success && res.data) {
      const { transactions } = res.data;

      if (!transactions || transactions.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="empty-state" style="padding: 24px;">No recent transactions recorded.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = transactions.map(t => `
        <tr>
          <td>${UI.formatDate(t.date)}</td>
          <td>
            <span class="badge-category" style="background: ${t.type === 'Income' ? 'var(--success-bg)' : 'var(--primary-light)'}; color: ${t.type === 'Income' ? 'var(--success)' : 'var(--primary)'};">
              ${t.type}
            </span>
          </td>
          <td><strong>${t.description}</strong></td>
          <td><span class="badge-category">${t.category}</span></td>
          <td class="${t.type === 'Income' ? 'amount-income' : 'amount-expense'}">
            ${t.type === 'Income' ? '+' : '-'}${UI.formatCurrency(t.amount)}
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading recent transactions:', err);
  }
}

window.initDashboard = initDashboard;
