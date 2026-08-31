/**
 * Budget Management & AI Recommendation Logic
 */

let currentBudgets = [];
let aiRecommendationsCache = null;

async function initBudgets() {
  Auth.requireAuth();
  UI.initLayout('budgets');

  // Populate month/year dropdowns
  setupMonthYearSelect();
  setupEventListeners();
  await loadBudgets();
}

function setupMonthYearSelect() {
  const now = new Date();
  const monthSelect = document.getElementById('budget-month-select');
  const yearSelect = document.getElementById('budget-year-select');

  if (monthSelect) {
    monthSelect.value = String(now.getMonth() + 1);
    monthSelect.addEventListener('change', loadBudgets);
  }

  if (yearSelect) {
    const curYear = now.getFullYear();
    yearSelect.innerHTML = `
      <option value="${curYear - 1}">${curYear - 1}</option>
      <option value="${curYear}" selected>${curYear}</option>
      <option value="${curYear + 1}">${curYear + 1}</option>
    `;
    yearSelect.addEventListener('change', loadBudgets);
  }
}

function setupEventListeners() {
  const form = document.getElementById('budget-form');
  if (form) {
    form.addEventListener('submit', handleBudgetSubmit);
  }
}

async function loadBudgets() {
  const container = document.getElementById('budgets-grid-container');
  if (!container) return;

  const month = document.getElementById('budget-month-select')?.value || (new Date().getMonth() + 1);
  const year = document.getElementById('budget-year-select')?.value || new Date().getFullYear();

  container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><div class="spinner"></div> Calculating budget metrics...</div>`;

  try {
    const res = await API.get('/budgets', { month, year });
    if (res.success && res.data) {
      const { budgets, totalBudget, totalSpent, totalRemaining, overallUsage } = res.data;
      currentBudgets = budgets;

      // Update overview header metrics
      document.getElementById('total-budget-amount').textContent = UI.formatCurrency(totalBudget);
      document.getElementById('total-spent-amount').textContent = UI.formatCurrency(totalSpent);
      document.getElementById('total-remaining-amount').textContent = UI.formatCurrency(totalRemaining);
      document.getElementById('overall-usage-percentage').textContent = `${overallUsage}%`;

      if (budgets.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1/-1;">
            <div class="empty-state">
              <div class="empty-state-icon">🎯</div>
              <h3>No budgets defined for this period</h3>
              <p>Create category budgets or let AI generate smart budget recommendations for you.</p>
              <div style="display: flex; gap: 12px; justify-content: center;">
                <button class="btn btn-primary btn-sm" onclick="openAddBudgetModal()">+ Create Budget</button>
                <button class="btn btn-ai btn-sm" onclick="openAIRecommendationsModal()">✨ AI Budget Plan</button>
              </div>
            </div>
          </div>
        `;
        return;
      }

      container.innerHTML = budgets.map(b => {
        let statusClass = 'status-normal';
        let progressBg = '#10b981';

        if (b.usage >= 100) {
          statusClass = 'status-exceeded';
          progressBg = '#ef4444';
        } else if (b.usage >= 90) {
          statusClass = 'status-critical';
          progressBg = '#ea580c';
        } else if (b.usage >= 75) {
          statusClass = 'status-warning';
          progressBg = '#f59e0b';
        }

        const barWidth = Math.min(b.usage, 100);

        return `
          <div class="budget-card">
            <div class="budget-top">
              <span class="budget-category-name">${b.category}</span>
              <span class="status-pill ${statusClass}">${b.status}</span>
            </div>

            <div class="budget-stats-row">
              <span>Spent: <strong>${UI.formatCurrency(b.spent)}</strong></span>
              <span>Limit: <strong>${UI.formatCurrency(b.amount)}</strong></span>
            </div>

            <div class="budget-progress-track">
              <div class="budget-progress-bar" style="width: ${barWidth}%; background-color: ${progressBg};"></div>
            </div>

            <div class="budget-bottom">
              <div style="font-size: 13px; color: ${b.remaining < 0 ? 'var(--danger)' : 'var(--text-muted)'};">
                ${b.remaining < 0 ? 'Exceeded by ' : 'Remaining: '}
                <strong>${UI.formatCurrency(Math.abs(b.remaining))}</strong> (${b.usage}%)
              </div>
              <div class="budget-actions">
                <button class="btn btn-secondary btn-icon" title="Edit" onclick="openEditBudgetModal(${b.id})">✏️</button>
                <button class="btn btn-secondary btn-icon" title="Delete" style="color: var(--danger);" onclick="confirmDeleteBudget(${b.id})">🗑️</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    UI.toast('Failed to load budgets', 'error');
  }
}

function openAddBudgetModal() {
  document.getElementById('budget-modal-title').textContent = 'Create Category Budget';
  document.getElementById('budget-form').reset();
  document.getElementById('budget_id').value = '';

  const month = document.getElementById('budget-month-select')?.value || (new Date().getMonth() + 1);
  const year = document.getElementById('budget-year-select')?.value || new Date().getFullYear();

  document.getElementById('budget_month').value = month;
  document.getElementById('budget_year').value = year;

  UI.openModal('budget-modal');
}

function openEditBudgetModal(id) {
  const b = currentBudgets.find(item => item.id === id);
  if (!b) return;

  document.getElementById('budget-modal-title').textContent = 'Edit Budget';
  document.getElementById('budget_id').value = b.id;
  document.getElementById('budget_category').value = b.category;
  document.getElementById('budget_amount').value = b.amount;
  document.getElementById('budget_month').value = b.month;
  document.getElementById('budget_year').value = b.year;

  UI.openModal('budget-modal');
}

async function handleBudgetSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('budget_id').value;
  const payload = {
    category: document.getElementById('budget_category').value,
    amount: document.getElementById('budget_amount').value,
    month: document.getElementById('budget_month').value,
    year: document.getElementById('budget_year').value,
  };

  try {
    if (id) {
      await API.put(`/budgets/${id}`, payload);
      UI.toast('Budget updated successfully', 'success');
    } else {
      await API.post('/budgets', payload);
      UI.toast('Budget created successfully', 'success');
    }

    UI.closeModal('budget-modal');
    await loadBudgets();
  } catch (err) {
    UI.toast(err.message || 'Failed to save budget', 'error');
  }
}

function confirmDeleteBudget(id) {
  UI.confirm({
    title: 'Delete Budget',
    message: 'Are you sure you want to delete this budget?',
    confirmText: 'Delete Budget',
    onConfirm: async () => {
      try {
        await API.delete(`/budgets/${id}`);
        UI.toast('Budget removed', 'success');
        await loadBudgets();
      } catch (err) {
        UI.toast('Failed to delete budget', 'error');
      }
    },
  });
}

/**
 * ✨ AI Budget Recommendation Modal
 */
async function openAIRecommendationsModal() {
  const modalBody = document.getElementById('ai-recommendation-modal-body');
  if (!modalBody) return;

  UI.openModal('ai-recommendation-modal');
  modalBody.innerHTML = `
    <div style="text-align: center; padding: 36px;">
      <div class="spinner" style="width: 32px; height: 32px; color: var(--accent);"></div>
      <h4 style="margin-top: 16px; font-size: 16px;">Analyzing Your Financial Data with Gemini AI...</h4>
      <p style="font-size: 13px; color: var(--text-muted); margin-top: 6px;">
        Evaluating income, 50/30/20 rule, and historical spending patterns.
      </p>
    </div>
  `;

  try {
    const res = await API.post('/ai/budget-recommendation');
    if (res.success && res.data) {
      aiRecommendationsCache = res.data;
      renderAIRecommendations(res.data);
    }
  } catch (err) {
    modalBody.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Failed to generate AI recommendations</h3>
        <p>${err.message || 'Please try again later'}</p>
        <button class="btn btn-secondary btn-sm" onclick="openAIRecommendationsModal()">Retry</button>
      </div>
    `;
  }
}

function renderAIRecommendations(data) {
  const modalBody = document.getElementById('ai-recommendation-modal-body');
  if (!modalBody) return;

  const { budgetSplit503020, recommendedBudgets, strategySummary, savingsGoalRecommendation } = data;

  modalBody.innerHTML = `
    <div style="margin-bottom: 20px; padding: 14px; background: var(--accent-light); border-radius: var(--radius-md); border: 1px solid #ddd6fe;">
      <h4 style="font-size: 14px; color: #4c1d95; margin-bottom: 4px;">🧠 AI Strategy Overview</h4>
      <p style="font-size: 13px; color: #5b21b6; line-height: 1.5;">${strategySummary}</p>
    </div>

    <!-- 50/30/20 Rule Breakdown -->
    <h4 style="font-size: 14px; margin-bottom: 10px;">Classic 50/30/20 Split</h4>
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px;">
      <div style="padding: 10px; background: var(--bg-main); border: 1px solid var(--border); border-radius: var(--radius-sm); text-align: center;">
        <div style="font-size: 11px; color: var(--text-muted); font-weight: 600;">NEEDS (50%)</div>
        <div style="font-size: 14px; font-weight: 700; color: var(--primary);">${UI.formatCurrency(budgetSplit503020?.needs?.amount || 0)}</div>
      </div>
      <div style="padding: 10px; background: var(--bg-main); border: 1px solid var(--border); border-radius: var(--radius-sm); text-align: center;">
        <div style="font-size: 11px; color: var(--text-muted); font-weight: 600;">WANTS (30%)</div>
        <div style="font-size: 14px; font-weight: 700; color: #d97706;">${UI.formatCurrency(budgetSplit503020?.wants?.amount || 0)}</div>
      </div>
      <div style="padding: 10px; background: var(--bg-main); border: 1px solid var(--border); border-radius: var(--radius-sm); text-align: center;">
        <div style="font-size: 11px; color: var(--text-muted); font-weight: 600;">SAVINGS (20%)</div>
        <div style="font-size: 14px; font-weight: 700; color: var(--success);">${UI.formatCurrency(budgetSplit503020?.savings?.amount || 0)}</div>
      </div>
    </div>

    <!-- Recommended Category Allocations -->
    <h4 style="font-size: 14px; margin-bottom: 10px;">Recommended Category Allocations</h4>
    <div style="max-height: 220px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-md); margin-bottom: 20px;">
      <table class="table" style="font-size: 13px;">
        <thead>
          <tr>
            <th>Category</th>
            <th>Proposed Budget</th>
            <th>Reasoning</th>
          </tr>
        </thead>
        <tbody>
          ${recommendedBudgets.map(b => `
            <tr>
              <td><strong>${b.category}</strong></td>
              <td style="color: var(--primary); font-weight: 700;">${UI.formatCurrency(b.recommendedAmount)}</td>
              <td style="color: var(--text-muted); font-size: 12px;">${b.rationale}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div style="padding: 12px; background: var(--success-bg); border: 1px solid var(--success-border); border-radius: var(--radius-md); font-size: 13px; color: #065f46; margin-bottom: 16px;">
      💰 <strong>Target Monthly Savings:</strong> ${UI.formatCurrency(savingsGoalRecommendation?.targetMonthlySavings || 0)}
    </div>
  `;
}

async function applyAIBudgets() {
  if (!aiRecommendationsCache || !aiRecommendationsCache.recommendedBudgets) {
    UI.toast('No recommendations to apply', 'warning');
    return;
  }

  const month = parseInt(document.getElementById('budget-month-select')?.value || (new Date().getMonth() + 1), 10);
  const year = parseInt(document.getElementById('budget-year-select')?.value || new Date().getFullYear(), 10);

  const btn = document.getElementById('btn-apply-ai-budgets');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner" style="width: 14px; height: 14px;"></div> Applying...`;
  }

  try {
    let appliedCount = 0;
    for (const item of aiRecommendationsCache.recommendedBudgets) {
      try {
        await API.post('/budgets', {
          category: item.category,
          amount: item.recommendedAmount,
          month,
          year,
        });
        appliedCount++;
      } catch (e) {
        // If already exists, update existing
        const match = currentBudgets.find(b => b.category === item.category);
        if (match) {
          await API.put(`/budgets/${match.id}`, {
            amount: item.recommendedAmount,
            category: item.category,
            month,
            year,
          });
          appliedCount++;
        }
      }
    }

    UI.toast(`✨ Applied ${appliedCount} AI budget recommendations!`, 'success');
    UI.closeModal('ai-recommendation-modal');
    await loadBudgets();
  } catch (err) {
    UI.toast('Failed to apply budgets', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `⚡ Apply All Recommendations`;
    }
  }
}

window.initBudgets = initBudgets;
window.openAddBudgetModal = openAddBudgetModal;
window.openEditBudgetModal = openEditBudgetModal;
window.confirmDeleteBudget = confirmDeleteBudget;
window.openAIRecommendationsModal = openAIRecommendationsModal;
window.applyAIBudgets = applyAIBudgets;
