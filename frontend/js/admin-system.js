/**
 * Ledger AI — Admin System Health Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  AdminUI.init('system');
  loadSystemHealth();
});

async function loadSystemHealth() {
  try {
    const res = await API.get('/admin/system-health');
    if (!res.success || !res.data) {
      AdminUI.toast('Failed to load system diagnostics', 'error');
      return;
    }

    const { services, uptime, nodeVersion, environment, memory, databaseTables } = res.data;

    // 1. Uptime
    document.getElementById('val-uptime').textContent = uptime.formatted;

    // 2. Services indicators
    const aiIndicator = document.getElementById('status-ai');
    if (aiIndicator) {
      if (services.aiService.status === 'Online') {
        aiIndicator.className = 'status-indicator status-online';
        aiIndicator.innerHTML = '<span class="status-dot"></span> Online';
      } else {
        aiIndicator.className = 'status-indicator status-warning';
        aiIndicator.innerHTML = '<span class="status-dot"></span> Ready';
      }
    }

    // 3. Runtime diagnostics
    document.getElementById('diag-env').textContent = environment.toUpperCase();
    document.getElementById('diag-node-ver').textContent = nodeVersion;
    document.getElementById('diag-heap-used').textContent = `${memory.heapUsedMb} MB`;
    document.getElementById('diag-heap-total').textContent = `${memory.heapTotalMb} MB`;
    document.getElementById('diag-rss').textContent = `${memory.rssMb} MB`;

    // 4. Database tables count
    document.getElementById('tbl-users').textContent = `${databaseTables.users} records`;
    document.getElementById('tbl-expenses').textContent = `${databaseTables.expenses} records`;
    document.getElementById('tbl-income').textContent = `${databaseTables.income} records`;
    document.getElementById('tbl-budgets').textContent = `${databaseTables.budgets} records`;
    document.getElementById('tbl-ai').textContent = `${databaseTables.ai_insights} records`;
    document.getElementById('tbl-audit').textContent = `${databaseTables.audit_logs} records`;

    AdminUI.toast('System diagnostics refreshed!', 'success');
  } catch (err) {
    console.error('System health error:', err);
    AdminUI.toast('Failed to communicate with system health API', 'error');
  }
}

window.loadSystemHealth = loadSystemHealth;
