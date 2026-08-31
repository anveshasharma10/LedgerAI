/**
 * Ledger AI — Admin Transactions Controller
 */

let currentPage = 1;
let totalPages = 1;
let searchTimeout = null;
let initializedFilters = false;

document.addEventListener('DOMContentLoaded', () => {
  AdminUI.init('transactions');
  loadTransactions(1);
});

function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadTransactions(1);
  }, 300);
}

function resetFilters() {
  document.getElementById('search-input').value = '';
  document.getElementById('type-filter').value = 'all';
  document.getElementById('category-filter').value = 'all';
  document.getElementById('user-filter').value = '';
  document.getElementById('start-date-filter').value = '';
  document.getElementById('end-date-filter').value = '';
  loadTransactions(1);
}

async function loadTransactions(page = 1) {
  currentPage = page;
  const search = document.getElementById('search-input')?.value || '';
  const type = document.getElementById('type-filter')?.value || 'all';
  const category = document.getElementById('category-filter')?.value || 'all';
  const userId = document.getElementById('user-filter')?.value || '';
  const startDate = document.getElementById('start-date-filter')?.value || '';
  const endDate = document.getElementById('end-date-filter')?.value || '';

  const tbody = document.getElementById('tx-table-tbody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 28px; color: var(--admin-text-muted);">
          Loading transactions...
        </td>
      </tr>
    `;
  }

  try {
    const queryParams = new URLSearchParams({
      page: String(page),
      limit: '15',
      search,
      type,
      category,
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
    });

    const res = await API.get(`/admin/transactions?${queryParams.toString()}`);
    if (!res.success || !res.data) {
      AdminUI.toast('Failed to load transactions', 'error');
      return;
    }

    const { transactions, availableCategories, usersList, pagination } = res.data;
    totalPages = pagination.totalPages;

    document.getElementById('tx-count-display').textContent = `Total: ${pagination.totalCount} entries`;
    document.getElementById('pagination-info').textContent = `Page ${pagination.currentPage} of ${pagination.totalPages || 1}`;

    document.getElementById('btn-prev-page').disabled = pagination.currentPage <= 1;
    document.getElementById('btn-next-page').disabled = pagination.currentPage >= pagination.totalPages;

    // Populate category & user filters if not initialized
    if (!initializedFilters) {
      if (availableCategories) {
        const catSelect = document.getElementById('category-filter');
        availableCategories.forEach((cat) => {
          const opt = document.createElement('option');
          opt.value = cat;
          opt.textContent = cat;
          catSelect.appendChild(opt);
        });
      }

      if (usersList) {
        const userSelect = document.getElementById('user-filter');
        usersList.forEach((u) => {
          const opt = document.createElement('option');
          opt.value = u.id;
          opt.textContent = `${u.name} (${u.email})`;
          userSelect.appendChild(opt);
        });
      }
      initializedFilters = true;
    }

    renderTransactions(transactions);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    AdminUI.toast('Failed to communicate with transactions monitoring API', 'error');
  }
}

function renderTransactions(transactions) {
  const tbody = document.getElementById('tx-table-tbody');
  if (!tbody) return;

  if (transactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 36px; color: var(--admin-text-muted);">
          No transactions found matching your criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = transactions
    .map((tx) => {
      const isIncome = tx.type === 'Income';
      const badgeClass = isIncome ? 'badge-income' : 'badge-expense';
      const amtColor = isIncome ? 'var(--admin-success)' : 'var(--admin-danger)';
      const amtSign = isIncome ? '+' : '-';

      return `
        <tr>
          <td style="font-size: 12.5px; color: var(--admin-text-muted); font-family: monospace;">${AdminUI.formatDate(tx.date)}</td>
          <td>
            <div style="font-weight: 600; color: var(--admin-text-main);">${AdminUI.escapeHTML(tx.userName)}</div>
            <div style="font-size: 11px; color: var(--admin-text-muted);">${AdminUI.escapeHTML(tx.userEmail)}</div>
          </td>
          <td><span class="admin-badge ${badgeClass}">${tx.type}</span></td>
          <td style="font-weight: 500;">${AdminUI.escapeHTML(tx.category)}</td>
          <td style="font-size: 13px;">
            ${AdminUI.escapeHTML(tx.description)}
            ${tx.notes ? `<div style="font-size: 11px; color: var(--admin-text-muted); font-style: italic;">${AdminUI.escapeHTML(tx.notes)}</div>` : ''}
          </td>
          <td style="font-size: 12.5px; color: var(--admin-text-muted);">${AdminUI.escapeHTML(tx.payment_method || '-')}</td>
          <td style="text-align: right; font-weight: 700; color: ${amtColor}; font-family: monospace; font-size: 14px;">
            ${amtSign}${AdminUI.formatCurrency(tx.amount)}
          </td>
        </tr>
      `;
    })
    .join('');
}

function prevPage() {
  if (currentPage > 1) {
    loadTransactions(currentPage - 1);
  }
}

function nextPage() {
  if (currentPage < totalPages) {
    loadTransactions(currentPage + 1);
  }
}

window.loadTransactions = loadTransactions;
window.debounceSearch = debounceSearch;
window.resetFilters = resetFilters;
window.prevPage = prevPage;
window.nextPage = nextPage;
