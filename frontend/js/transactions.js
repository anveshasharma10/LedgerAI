/**
 * Unified Transactions History Ledger Logic
 */

let currentPage = 1;
let currentFilters = {
  search: '',
  type: 'All',
  category: 'All',
  startDate: '',
  endDate: '',
  minAmount: '',
  maxAmount: '',
  sortBy: 'date',
  sortOrder: 'desc',
};

async function initTransactions() {
  Auth.requireAuth();
  UI.initLayout('transactions');

  setupEventListeners();
  await loadTransactions();
}

function setupEventListeners() {
  // Search
  const searchInput = document.getElementById('search-transaction');
  if (searchInput) {
    let timeout = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        currentFilters.search = e.target.value;
        currentPage = 1;
        loadTransactions();
      }, 300);
    });
  }

  // Type filter
  const typeFilter = document.getElementById('filter-type');
  if (typeFilter) {
    typeFilter.addEventListener('change', (e) => {
      currentFilters.type = e.target.value;
      currentPage = 1;
      loadTransactions();
    });
  }

  // Category filter
  const categoryFilter = document.getElementById('filter-category');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      currentFilters.category = e.target.value;
      currentPage = 1;
      loadTransactions();
    });
  }

  // Start Date
  const startDateInput = document.getElementById('filter-start-date');
  if (startDateInput) {
    startDateInput.addEventListener('change', (e) => {
      currentFilters.startDate = e.target.value;
      currentPage = 1;
      loadTransactions();
    });
  }

  // End Date
  const endDateInput = document.getElementById('filter-end-date');
  if (endDateInput) {
    endDateInput.addEventListener('change', (e) => {
      currentFilters.endDate = e.target.value;
      currentPage = 1;
      loadTransactions();
    });
  }

  // Sort By
  const sortBySelect = document.getElementById('filter-sort-by');
  if (sortBySelect) {
    sortBySelect.addEventListener('change', (e) => {
      currentFilters.sortBy = e.target.value;
      loadTransactions();
    });
  }

  // Sort Order
  const sortOrderSelect = document.getElementById('filter-sort-order');
  if (sortOrderSelect) {
    sortOrderSelect.addEventListener('change', (e) => {
      currentFilters.sortOrder = e.target.value;
      loadTransactions();
    });
  }

  // Reset Button
  const resetBtn = document.getElementById('btn-reset-filters');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      currentFilters = {
        search: '',
        type: 'All',
        category: 'All',
        startDate: '',
        endDate: '',
        minAmount: '',
        maxAmount: '',
        sortBy: 'date',
        sortOrder: 'desc',
      };
      if (searchInput) searchInput.value = '';
      if (typeFilter) typeFilter.value = 'All';
      if (categoryFilter) categoryFilter.value = 'All';
      if (startDateInput) startDateInput.value = '';
      if (endDateInput) endDateInput.value = '';
      if (sortBySelect) sortBySelect.value = 'date';
      if (sortOrderSelect) sortOrderSelect.value = 'desc';
      currentPage = 1;
      loadTransactions();
    });
  }
}

async function loadTransactions() {
  const tbody = document.getElementById('transactions-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px;"><div class="spinner"></div> Loading transactions ledger...</td></tr>`;

  try {
    const params = {
      page: currentPage,
      limit: 10,
      search: currentFilters.search,
      type: currentFilters.type,
      category: currentFilters.category,
      startDate: currentFilters.startDate,
      endDate: currentFilters.endDate,
      minAmount: currentFilters.minAmount,
      maxAmount: currentFilters.maxAmount,
      sortBy: currentFilters.sortBy,
      sortOrder: currentFilters.sortOrder,
    };

    const res = await API.get('/transactions', params);
    if (res.success && res.data) {
      const { transactions, pagination } = res.data;

      // Update Ledger Summary cards
      document.getElementById('total-ledger-income').textContent = UI.formatCurrency(pagination.totalIncome);
      document.getElementById('total-ledger-expenses').textContent = UI.formatCurrency(pagination.totalExpenses);
      document.getElementById('total-ledger-net').textContent = UI.formatCurrency(pagination.netBalance);

      if (transactions.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6">
              <div class="empty-state">
                <div class="empty-state-icon">💳</div>
                <h3>No transactions match your search</h3>
                <p>Try resetting filters or record new income or expenses.</p>
              </div>
            </td>
          </tr>
        `;
        renderTransactionPagination(pagination);
        return;
      }

      tbody.innerHTML = transactions.map(t => {
        const isIncome = t.type === 'Income';
        return `
          <tr>
            <td>${UI.formatDate(t.date)}</td>
            <td>
              <span class="badge-category" style="background: ${isIncome ? 'var(--success-bg)' : 'var(--primary-light)'}; color: ${isIncome ? 'var(--success)' : 'var(--primary)'}; border-color: ${isIncome ? 'var(--success-border)' : 'var(--primary-border)'};">
                ${t.type}
              </span>
            </td>
            <td><strong>${t.description || '-'}</strong></td>
            <td><span class="badge-category">${t.category}</span></td>
            <td><span style="font-size: 13px; color: var(--text-muted);">${t.payment_method || '-'}</span></td>
            <td class="${isIncome ? 'amount-income' : 'amount-expense'}">
              ${isIncome ? '+' : '-'}${UI.formatCurrency(t.amount)}
            </td>
          </tr>
        `;
      }).join('');

      renderTransactionPagination(pagination);
    }
  } catch (err) {
    UI.toast('Failed to load transactions ledger', 'error');
  }
}

function renderTransactionPagination(pagination) {
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
      <button class="btn btn-secondary btn-sm" ${pagination.currentPage === 1 ? 'disabled' : ''} onclick="changeTxPage(${pagination.currentPage - 1})">
        ← Prev
      </button>
      <span style="align-self: center; font-size: 13px; font-weight: 600; padding: 0 8px;">
        Page ${pagination.currentPage} of ${pagination.totalPages}
      </span>
      <button class="btn btn-secondary btn-sm" ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''} onclick="changeTxPage(${pagination.currentPage + 1})">
        Next →
      </button>
    </div>
  `;
}

function changeTxPage(page) {
  currentPage = page;
  loadTransactions();
}

async function exportTransactionsCSV() {
  try {
    UI.toast('Preparing CSV export...', 'info');
    const blob = await API.get('/reports/export/csv');
    
    // Trigger download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `transactions_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

    UI.toast('CSV exported successfully!', 'success');
  } catch (err) {
    UI.toast('Failed to export CSV', 'error');
  }
}

window.initTransactions = initTransactions;
window.changeTxPage = changeTxPage;
window.exportTransactionsCSV = exportTransactionsCSV;
