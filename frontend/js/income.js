/**
 * Income Management CRUD Logic
 */

let currentIncome = [];
let currentPage = 1;
let currentFilters = {
  search: '',
  source: 'All',
  startDate: '',
  endDate: '',
};

async function initIncome() {
  Auth.requireAuth();
  UI.initLayout('income');

  // Set default date to today in form
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('income_date');
  if (dateInput) dateInput.value = today;

  setupEventListeners();
  await loadIncome();
}

function setupEventListeners() {
  const searchInput = document.getElementById('search-income');
  if (searchInput) {
    let timeout = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        currentFilters.search = e.target.value;
        currentPage = 1;
        loadIncome();
      }, 300);
    });
  }

  const sourceFilter = document.getElementById('filter-source');
  if (sourceFilter) {
    sourceFilter.addEventListener('change', (e) => {
      currentFilters.source = e.target.value;
      currentPage = 1;
      loadIncome();
    });
  }

  const form = document.getElementById('income-form');
  if (form) {
    form.addEventListener('submit', handleIncomeSubmit);
  }
}

async function loadIncome() {
  const tbody = document.getElementById('income-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px;"><div class="spinner"></div> Loading income records...</td></tr>`;

  try {
    const params = {
      page: currentPage,
      limit: 10,
      search: currentFilters.search,
      source: currentFilters.source,
      startDate: currentFilters.startDate,
      endDate: currentFilters.endDate,
    };

    const res = await API.get('/income', params);
    if (res.success && res.data) {
      currentIncome = res.data.income;
      const { pagination } = res.data;

      const totalAmountEl = document.getElementById('total-income-amount');
      if (totalAmountEl) totalAmountEl.textContent = UI.formatCurrency(pagination.totalAmount);

      if (currentIncome.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6">
              <div class="empty-state">
                <div class="empty-state-icon">💵</div>
                <h3>No income records found</h3>
                <p>Record your salary, freelance earnings, or investment returns.</p>
                <button class="btn btn-primary btn-sm" onclick="openAddIncomeModal()">+ Add New Income</button>
              </div>
            </td>
          </tr>
        `;
        renderIncomePagination(pagination);
        return;
      }

      tbody.innerHTML = currentIncome.map(inc => `
        <tr>
          <td>${UI.formatDate(inc.income_date)}</td>
          <td><strong>${inc.description || inc.source}</strong></td>
          <td><span class="badge-category" style="background: var(--success-bg); color: var(--success); border-color: var(--success-border);">${inc.source}</span></td>
          <td class="amount-income">+${UI.formatCurrency(inc.amount)}</td>
          <td>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-icon" title="Edit" onclick="openEditIncomeModal(${inc.id})">✏️</button>
              <button class="btn btn-secondary btn-icon" title="Delete" style="color: var(--danger);" onclick="confirmDeleteIncome(${inc.id})">🗑️</button>
            </div>
          </td>
        </tr>
      `).join('');

      renderIncomePagination(pagination);
    }
  } catch (err) {
    UI.toast('Failed to load income records', 'error');
  }
}

function renderIncomePagination(pagination) {
  const container = document.getElementById('pagination-container');
  if (!container) return;

  if (pagination.totalRecords === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="pagination-info">
      Showing ${(pagination.currentPage - 1) * pagination.limit + 1} - ${Math.min(pagination.currentPage * pagination.limit, pagination.totalRecords)} of ${pagination.totalRecords} records
    </div>
    <div class="pagination-buttons">
      <button class="btn btn-secondary btn-sm" ${pagination.currentPage === 1 ? 'disabled' : ''} onclick="changeIncomePage(${pagination.currentPage - 1})">
        ← Prev
      </button>
      <span style="align-self: center; font-size: 13px; font-weight: 600; padding: 0 8px;">
        Page ${pagination.currentPage} of ${pagination.totalPages}
      </span>
      <button class="btn btn-secondary btn-sm" ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''} onclick="changeIncomePage(${pagination.currentPage + 1})">
        Next →
      </button>
    </div>
  `;
}

function changeIncomePage(page) {
  currentPage = page;
  loadIncome();
}

function openAddIncomeModal() {
  document.getElementById('income-modal-title').textContent = 'Add Income Record';
  document.getElementById('income-form').reset();
  document.getElementById('income_id').value = '';
  document.getElementById('income_date').value = new Date().toISOString().split('T')[0];
  UI.openModal('income-modal');
}

function openEditIncomeModal(id) {
  const inc = currentIncome.find(i => i.id === id);
  if (!inc) return;

  document.getElementById('income-modal-title').textContent = 'Edit Income Record';
  document.getElementById('income_id').value = inc.id;
  document.getElementById('amount').value = inc.amount;
  document.getElementById('source').value = inc.source;
  document.getElementById('description').value = inc.description || '';
  document.getElementById('income_date').value = inc.income_date.split('T')[0];

  UI.openModal('income-modal');
}

async function handleIncomeSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('income_id').value;
  const payload = {
    amount: document.getElementById('amount').value,
    source: document.getElementById('source').value,
    description: document.getElementById('description').value,
    income_date: document.getElementById('income_date').value,
  };

  try {
    if (id) {
      await API.put(`/income/${id}`, payload);
      UI.toast('Income updated successfully', 'success');
    } else {
      await API.post('/income', payload);
      UI.toast('Income recorded successfully', 'success');
    }

    UI.closeModal('income-modal');
    await loadIncome();
  } catch (err) {
    UI.toast(err.message || 'Failed to save income', 'error');
  }
}

function confirmDeleteIncome(id) {
  UI.confirm({
    title: 'Delete Income Record',
    message: 'Are you sure you want to remove this income entry?',
    confirmText: 'Delete Income',
    onConfirm: async () => {
      try {
        await API.delete(`/income/${id}`);
        UI.toast('Income record deleted', 'success');
        await loadIncome();
      } catch (err) {
        UI.toast('Failed to delete income', 'error');
      }
    },
  });
}

window.initIncome = initIncome;
window.openAddIncomeModal = openAddIncomeModal;
window.openEditIncomeModal = openEditIncomeModal;
window.confirmDeleteIncome = confirmDeleteIncome;
window.changeIncomePage = changeIncomePage;
