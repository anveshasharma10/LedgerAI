/**
 * Ledger AI — Admin User Management Controller
 */

let currentPage = 1;
let totalPages = 1;
let searchTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
  AdminUI.init('users');
  loadUsers(1);
});

function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadUsers(1);
  }, 300);
}

async function loadUsers(page = 1) {
  currentPage = page;
  const search = document.getElementById('search-input')?.value || '';
  const status = document.getElementById('status-filter')?.value || 'all';
  const role = document.getElementById('role-filter')?.value || 'all';

  const tbody = document.getElementById('users-table-tbody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 28px; color: var(--admin-text-muted);">
          Loading users...
        </td>
      </tr>
    `;
  }

  try {
    const queryParams = new URLSearchParams({
      page: String(page),
      limit: '10',
      search,
      status,
      role,
    });

    const res = await API.get(`/admin/users?${queryParams.toString()}`);
    if (!res.success || !res.data) {
      AdminUI.toast('Failed to load users list', 'error');
      return;
    }

    const { users, pagination } = res.data;
    totalPages = pagination.totalPages;

    document.getElementById('user-count-display').textContent = `Total: ${pagination.totalCount} users`;
    document.getElementById('pagination-info').textContent = `Page ${pagination.currentPage} of ${pagination.totalPages || 1}`;

    document.getElementById('btn-prev-page').disabled = pagination.currentPage <= 1;
    document.getElementById('btn-next-page').disabled = pagination.currentPage >= pagination.totalPages;

    renderUsersTable(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    AdminUI.toast('Failed to communicate with user management API', 'error');
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-table-tbody');
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 36px; color: var(--admin-text-muted);">
          No users match the search & filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  const currentUser = AdminUI.getUser();

  tbody.innerHTML = users
    .map((u) => {
      const isSelf = currentUser && currentUser.id === u.id;
      const roleBadge = u.role === 'admin'
        ? `<span class="admin-badge badge-admin">👑 Admin</span>`
        : `<span class="admin-badge badge-user">User</span>`;

      const statusBadge = u.is_active
        ? `<span class="admin-badge badge-active">Active</span>`
        : `<span class="admin-badge badge-inactive">Deactivated</span>`;

      return `
        <tr>
          <td style="font-weight: 700; color: var(--admin-text-muted);">#${u.id}</td>
          <td>
            <div style="font-weight: 600; color: var(--admin-text-main);">
              ${AdminUI.escapeHTML(u.name)}
              ${isSelf ? '<span style="font-size: 11px; color: var(--admin-primary); margin-left: 4px;">(You)</span>' : ''}
            </div>
          </td>
          <td style="font-family: monospace; font-size: 13px;">${AdminUI.escapeHTML(u.email)}</td>
          <td>${roleBadge}</td>
          <td>${statusBadge}</td>
          <td style="font-size: 12.5px; color: var(--admin-text-muted);">${AdminUI.formatDate(u.created_at)}</td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 8px; justify-content: flex-end;">
              <button class="btn-admin-secondary" style="font-size: 12px; padding: 4px 10px;" onclick="viewUserDetails(${u.id})">
                👁️ View
              </button>
              ${
                !isSelf
                  ? `
                <button 
                  class="${u.is_active ? 'btn-admin-danger' : 'btn-admin-secondary'}" 
                  style="font-size: 12px; padding: 4px 10px;"
                  onclick="toggleAccountStatus(${u.id}, ${!u.is_active}, '${AdminUI.escapeHTML(u.name)}')"
                >
                  ${u.is_active ? 'Deactivate' : 'Activate'}
                </button>
              `
                  : ''
              }
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

async function viewUserDetails(userId) {
  try {
    const res = await API.get(`/admin/users/${userId}`);
    if (!res.success || !res.data) {
      AdminUI.toast('Failed to fetch user details', 'error');
      return;
    }

    const { profile, financialSummary, recentActivity } = res.data;

    document.getElementById('modal-user-name').textContent = profile.name;
    document.getElementById('modal-user-email').textContent = `${profile.email} • Registered ${AdminUI.formatDate(profile.created_at)}`;
    document.getElementById('modal-user-avatar').textContent = profile.name ? profile.name.charAt(0).toUpperCase() : 'U';

    const roleBadge = document.getElementById('modal-badge-role');
    roleBadge.className = profile.role === 'admin' ? 'admin-badge badge-admin' : 'admin-badge badge-user';
    roleBadge.textContent = profile.role === 'admin' ? '👑 Admin' : 'User';

    const statusBadge = document.getElementById('modal-badge-status');
    statusBadge.className = profile.is_active ? 'admin-badge badge-active' : 'admin-badge badge-inactive';
    statusBadge.textContent = profile.is_active ? 'Active' : 'Deactivated';

    document.getElementById('modal-stat-income').textContent = AdminUI.formatCurrency(financialSummary.totalIncome);
    document.getElementById('modal-stat-expenses').textContent = AdminUI.formatCurrency(financialSummary.totalExpenses);
    document.getElementById('modal-stat-balance').textContent = AdminUI.formatCurrency(financialSummary.balance);
    document.getElementById('modal-stat-tx').textContent = financialSummary.totalTransactions;
    document.getElementById('modal-stat-budgets').textContent = financialSummary.totalBudgets;

    const txTbody = document.getElementById('modal-user-tx-tbody');
    if (!recentActivity || recentActivity.length === 0) {
      txTbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 20px; color: var(--admin-text-muted);">
            No transactions found for this user.
          </td>
        </tr>
      `;
    } else {
      txTbody.innerHTML = recentActivity
        .map((tx) => {
          const isIncome = tx.type === 'Income';
          const amtColor = isIncome ? 'var(--admin-success)' : 'var(--admin-danger)';
          const amtSign = isIncome ? '+' : '-';
          return `
            <tr>
              <td style="font-size: 12px; color: var(--admin-text-muted);">${tx.date}</td>
              <td><span class="admin-badge ${isIncome ? 'badge-income' : 'badge-expense'}">${tx.type}</span></td>
              <td style="font-weight: 500;">${AdminUI.escapeHTML(tx.category)}</td>
              <td style="font-size: 13px;">${AdminUI.escapeHTML(tx.description)}</td>
              <td style="text-align: right; font-weight: 700; color: ${amtColor}; font-family: monospace;">
                ${amtSign}${AdminUI.formatCurrency(tx.amount)}
              </td>
            </tr>
          `;
        })
        .join('');
    }

    AdminUI.openModal('modal-user-details');
  } catch (err) {
    console.error('Error fetching user details:', err);
    AdminUI.toast('Failed to load user details', 'error');
  }
}

function toggleAccountStatus(userId, newActiveStatus, userName) {
  const actionName = newActiveStatus ? 'Activate' : 'Deactivate';
  const titleEl = document.getElementById('confirm-status-title');
  const msgEl = document.getElementById('confirm-status-msg');
  const btnEl = document.getElementById('btn-confirm-status-action');

  if (titleEl) titleEl.textContent = `${actionName} User Account`;
  if (msgEl) {
    msgEl.innerHTML = newActiveStatus
      ? `Are you sure you want to <strong>reactivate</strong> account access for <strong>${AdminUI.escapeHTML(userName)}</strong>?`
      : `<strong>Warning:</strong> Are you sure you want to <strong>deactivate</strong> account <strong>${AdminUI.escapeHTML(userName)}</strong>? The user will immediately lose access to sign in.`;
  }

  if (btnEl) {
    btnEl.className = newActiveStatus ? 'btn-admin-primary' : 'btn-admin-danger';
    btnEl.textContent = `${actionName} Account`;
    btnEl.onclick = async () => {
      AdminUI.closeModal('modal-confirm-status');
      try {
        const res = await API.put(`/admin/users/${userId}/status`, { is_active: newActiveStatus });
        if (res.success) {
          AdminUI.toast(res.message || `User successfully ${actionName.toLowerCase()}d!`, 'success');
          loadUsers(currentPage);
        }
      } catch (err) {
        AdminUI.toast(err.message || `Failed to ${actionName.toLowerCase()} account`, 'error');
      }
    };
  }

  AdminUI.openModal('modal-confirm-status');
}

function prevPage() {
  if (currentPage > 1) {
    loadUsers(currentPage - 1);
  }
}

function nextPage() {
  if (currentPage < totalPages) {
    loadUsers(currentPage + 1);
  }
}

window.loadUsers = loadUsers;
window.debounceSearch = debounceSearch;
window.viewUserDetails = viewUserDetails;
window.toggleAccountStatus = toggleAccountStatus;
window.prevPage = prevPage;
window.nextPage = nextPage;
