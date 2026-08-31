/**
 * Ledger AI — Admin Audit Logs Controller
 */

let currentPage = 1;
let totalPages = 1;
let searchTimeout = null;
let initializedActions = false;

document.addEventListener('DOMContentLoaded', () => {
  AdminUI.init('audit');
  loadAuditLogs(1);
});

function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadAuditLogs(1);
  }, 300);
}

async function loadAuditLogs(page = 1) {
  currentPage = page;
  const search = document.getElementById('search-input')?.value || '';
  const action = document.getElementById('action-filter')?.value || 'all';

  const tbody = document.getElementById('audit-table-tbody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 28px; color: var(--admin-text-muted);">
          Loading audit trail...
        </td>
      </tr>
    `;
  }

  try {
    const queryParams = new URLSearchParams({
      page: String(page),
      limit: '15',
      search,
      action,
    });

    const res = await API.get(`/admin/audit-logs?${queryParams.toString()}`);
    if (!res.success || !res.data) {
      AdminUI.toast('Failed to load audit logs', 'error');
      return;
    }

    const { logs, availableActions, pagination } = res.data;
    totalPages = pagination.totalPages;

    document.getElementById('logs-count-display').textContent = `Total: ${pagination.totalCount} audit entries`;
    document.getElementById('pagination-info').textContent = `Page ${pagination.currentPage} of ${pagination.totalPages || 1}`;

    document.getElementById('btn-prev-page').disabled = pagination.currentPage <= 1;
    document.getElementById('btn-next-page').disabled = pagination.currentPage >= pagination.totalPages;

    if (!initializedActions && availableActions) {
      const actionSelect = document.getElementById('action-filter');
      availableActions.forEach((act) => {
        const opt = document.createElement('option');
        opt.value = act;
        opt.textContent = act;
        actionSelect.appendChild(opt);
      });
      initializedActions = true;
    }

    renderAuditTable(logs);
  } catch (err) {
    console.error('Audit logs error:', err);
    AdminUI.toast('Failed to communicate with audit logs API', 'error');
  }
}

function renderAuditTable(logs) {
  const tbody = document.getElementById('audit-table-tbody');
  if (!tbody) return;

  if (logs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 36px; color: var(--admin-text-muted);">
          No audit logs recorded yet.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = logs
    .map((log) => {
      let actionBadge = `<span class="admin-badge badge-user">${log.action}</span>`;
      if (log.action === 'ADMIN_LOGIN') {
        actionBadge = `<span class="admin-badge badge-admin">🔑 ${log.action}</span>`;
      } else if (log.action === 'USER_ACTIVATED') {
        actionBadge = `<span class="admin-badge badge-active">✅ ${log.action}</span>`;
      } else if (log.action === 'USER_DEACTIVATED') {
        actionBadge = `<span class="admin-badge badge-inactive">⛔ ${log.action}</span>`;
      } else if (log.action === 'USER_ROLE_CHANGED') {
        actionBadge = `<span class="admin-badge badge-admin">👑 ${log.action}</span>`;
      }

      return `
        <tr>
          <td style="font-size: 12px; color: var(--admin-text-muted); font-family: monospace;">${AdminUI.formatDateTime(log.created_at)}</td>
          <td style="font-weight: 600; color: var(--admin-text-main);">${AdminUI.escapeHTML(log.admin_name)}</td>
          <td>${actionBadge}</td>
          <td style="font-weight: 500;">${AdminUI.escapeHTML(log.target || '-')}</td>
          <td style="font-size: 13px; color: var(--admin-text-main);">${AdminUI.escapeHTML(log.details || '-')}</td>
          <td style="font-family: monospace; font-size: 12px; color: var(--admin-text-muted);">${AdminUI.escapeHTML(log.ip_address || '127.0.0.1')}</td>
        </tr>
      `;
    })
    .join('');
}

function prevPage() {
  if (currentPage > 1) {
    loadAuditLogs(currentPage - 1);
  }
}

function nextPage() {
  if (currentPage < totalPages) {
    loadAuditLogs(currentPage + 1);
  }
}

window.loadAuditLogs = loadAuditLogs;
window.debounceSearch = debounceSearch;
window.prevPage = prevPage;
window.nextPage = nextPage;
