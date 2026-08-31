/**
 * Expense Management CRUD & AI Categorization Logic
 */

let currentExpenses = [];
let currentPage = 1;
let currentFilters = {
  search: '',
  category: 'All',
  payment_method: 'All',
  startDate: '',
  endDate: '',
};

async function initExpenses() {
  Auth.requireAuth();
  UI.initLayout('expenses');

  // Set default date to today in form
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('expense_date');
  if (dateInput) dateInput.value = today;

  setupEventListeners();
  await loadExpenses();
}

function setupEventListeners() {
  // Search input with debounce
  const searchInput = document.getElementById('search-expense');
  if (searchInput) {
    let timeout = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        currentFilters.search = e.target.value;
        currentPage = 1;
        loadExpenses();
      }, 300);
    });
  }

  // Category filter
  const categoryFilter = document.getElementById('filter-category');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      currentFilters.category = e.target.value;
      currentPage = 1;
      loadExpenses();
    });
  }

  // Payment method filter
  const paymentFilter = document.getElementById('filter-payment');
  if (paymentFilter) {
    paymentFilter.addEventListener('change', (e) => {
      currentFilters.payment_method = e.target.value;
      currentPage = 1;
      loadExpenses();
    });
  }

  // Expense form submission (Add or Edit)
  const form = document.getElementById('expense-form');
  if (form) {
    form.addEventListener('submit', handleExpenseSubmit);
  }
}

async function loadExpenses() {
  const tbody = document.getElementById('expenses-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px;"><div class="spinner"></div> Loading expenses...</td></tr>`;

  try {
    const params = {
      page: currentPage,
      limit: 10,
      search: currentFilters.search,
      category: currentFilters.category,
      payment_method: currentFilters.payment_method,
      startDate: currentFilters.startDate,
      endDate: currentFilters.endDate,
    };

    const res = await API.get('/expenses', params);
    if (res.success && res.data) {
      currentExpenses = res.data.expenses;
      const { pagination } = res.data;

      // Update total counter
      const totalAmountEl = document.getElementById('total-expenses-amount');
      if (totalAmountEl) totalAmountEl.textContent = UI.formatCurrency(pagination.totalAmount);

      if (currentExpenses.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7">
              <div class="empty-state">
                <div class="empty-state-icon">💸</div>
                <h3>No expenses found</h3>
                <p>Start recording your daily expenses or clear your search filters.</p>
                <button class="btn btn-primary btn-sm" onclick="openAddExpenseModal()">+ Add New Expense</button>
              </div>
            </td>
          </tr>
        `;
        renderPagination(pagination);
        return;
      }

      tbody.innerHTML = currentExpenses.map(exp => `
        <tr>
          <td>${UI.formatDate(exp.expense_date)}</td>
          <td><strong>${exp.description}</strong></td>
          <td><span class="badge-category">${exp.category}</span></td>
          <td><span style="font-size: 13px; color: var(--text-muted);">${exp.payment_method}</span></td>
          <td class="amount-expense">${UI.formatCurrency(exp.amount)}</td>
          <td><span style="font-size: 12px; color: var(--text-sub);">${exp.notes || '-'}</span></td>
          <td>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-icon" title="Edit" onclick="openEditExpenseModal(${exp.id})">✏️</button>
              <button class="btn btn-secondary btn-icon" title="Delete" style="color: var(--danger);" onclick="confirmDeleteExpense(${exp.id})">🗑️</button>
            </div>
          </td>
        </tr>
      `).join('');

      renderPagination(pagination);
    }
  } catch (err) {
    UI.toast('Failed to load expenses', 'error');
  }
}

function renderPagination(pagination) {
  const container = document.getElementById('pagination-container');
  if (!container) return;

  if (pagination.totalRecords === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="pagination-info">
      Showing ${(pagination.currentPage - 1) * pagination.limit + 1} - ${Math.min(pagination.currentPage * pagination.limit, pagination.totalRecords)} of ${pagination.totalRecords} expenses
    </div>
    <div class="pagination-buttons">
      <button class="btn btn-secondary btn-sm" ${pagination.currentPage === 1 ? 'disabled' : ''} onclick="changePage(${pagination.currentPage - 1})">
        ← Prev
      </button>
      <span style="align-self: center; font-size: 13px; font-weight: 600; padding: 0 8px;">
        Page ${pagination.currentPage} of ${pagination.totalPages}
      </span>
      <button class="btn btn-secondary btn-sm" ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''} onclick="changePage(${pagination.currentPage + 1})">
        Next →
      </button>
    </div>
  `;
}

function changePage(page) {
  currentPage = page;
  loadExpenses();
}

function openAddExpenseModal() {
  document.getElementById('expense-modal-title').textContent = 'Add New Expense';
  document.getElementById('expense-form').reset();
  document.getElementById('expense_id').value = '';
  document.getElementById('expense_date').value = new Date().toISOString().split('T')[0];
  document.getElementById('ai-categorize-result-box').style.display = 'none';
  UI.openModal('expense-modal');
}

function openEditExpenseModal(id) {
  const exp = currentExpenses.find(e => e.id === id);
  if (!exp) return;

  document.getElementById('expense-modal-title').textContent = 'Edit Expense';
  document.getElementById('expense_id').value = exp.id;
  document.getElementById('amount').value = exp.amount;
  document.getElementById('category').value = exp.category;
  document.getElementById('description').value = exp.description;
  document.getElementById('expense_date').value = exp.expense_date.split('T')[0];
  document.getElementById('payment_method').value = exp.payment_method;
  document.getElementById('notes').value = exp.notes || '';
  document.getElementById('ai-categorize-result-box').style.display = 'none';

  UI.openModal('expense-modal');
}

async function handleExpenseSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('expense_id').value;
  const payload = {
    amount: document.getElementById('amount').value,
    category: document.getElementById('category').value,
    description: document.getElementById('description').value,
    expense_date: document.getElementById('expense_date').value,
    payment_method: document.getElementById('payment_method').value,
    notes: document.getElementById('notes').value,
  };

  try {
    if (id) {
      // UPDATE
      await API.put(`/expenses/${id}`, payload);
      UI.toast('Expense updated successfully', 'success');
    } else {
      // CREATE
      await API.post('/expenses', payload);
      UI.toast('Expense added successfully', 'success');
    }

    UI.closeModal('expense-modal');
    await loadExpenses();
  } catch (err) {
    UI.toast(err.message || 'Failed to save expense', 'error');
  }
}

function confirmDeleteExpense(id) {
  UI.confirm({
    title: 'Delete Expense',
    message: 'Are you sure you want to delete this expense record? This action cannot be undone.',
    confirmText: 'Delete Expense',
    onConfirm: async () => {
      try {
        await API.delete(`/expenses/${id}`);
        UI.toast('Expense deleted', 'success');
        await loadExpenses();
      } catch (err) {
        UI.toast('Failed to delete expense', 'error');
      }
    },
  });
}

/**
 * ✨ AI Categorize helper
 */
async function triggerAICategorize() {
  const desc = document.getElementById('description').value;
  const notes = document.getElementById('notes').value;

  if (!desc || !desc.trim()) {
    UI.toast('Please enter a description first (e.g. "Ordered pizza and burger")', 'warning');
    document.getElementById('description').focus();
    return;
  }

  const btn = document.getElementById('btn-ai-categorize');
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width: 14px; height: 14px;"></div> Thinking...`;

  try {
    const res = await API.post('/ai/categorize-expense', { description: desc, notes });
    if (res.success && res.data) {
      const { category, explanation } = res.data;
      document.getElementById('category').value = category;

      const resultBox = document.getElementById('ai-categorize-result-box');
      const resultText = document.getElementById('ai-categorize-explanation');
      if (resultBox && resultText) {
        resultBox.style.display = 'flex';
        resultText.textContent = `Auto-categorized as "${category}" (${explanation})`;
      }

      UI.toast(`✨ Categorized as ${category}`, 'success');
    }
  } catch (err) {
    UI.toast('AI Categorization failed, please choose manually', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `✨ Categorize with AI`;
  }
}

window.initExpenses = initExpenses;
window.openAddExpenseModal = openAddExpenseModal;
window.openEditExpenseModal = openEditExpenseModal;
window.confirmDeleteExpense = confirmDeleteExpense;
window.triggerAICategorize = triggerAICategorize;
window.changePage = changePage;
