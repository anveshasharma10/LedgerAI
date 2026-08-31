/**
 * Ledger AI — Admin Common Shell & Utilities
 */

const AdminUI = {
  activePage: '',

  init(pageName) {
    this.activePage = pageName;
    if (!this.checkAdminAuth()) {
      return;
    }
    this.renderSidebar();
    this.renderHeader();
  },

  checkAdminAuth() {
    const token = typeof API !== 'undefined' && API.getToken ? API.getToken() : (localStorage.getItem('ai_expense_token') || localStorage.getItem('token'));
    const user = typeof API !== 'undefined' && API.getUser ? API.getUser() : this.getUser();

    if (!token || !user || !user.email) {
      window.location.href = '/login.html';
      return false;
    }

    if (user.role !== 'admin') {
      this.toast('Access forbidden. Administrator privileges required.', 'error');
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 500);
      return false;
    }

    return true;
  },

  renderSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    if (!sidebar) return;

    const navItems = [
      { id: 'dashboard', label: 'Dashboard', icon: '📊', url: '/admin.html' },
      { id: 'users', label: 'Users', icon: '👥', url: '/admin-users.html' },
      { id: 'transactions', label: 'Transactions', icon: '💳', url: '/admin-transactions.html' },
      { id: 'analytics', label: 'Analytics', icon: '📈', url: '/admin-analytics.html' },
      { id: 'reports', label: 'Reports', icon: '📄', url: '/admin-reports.html' },
      { id: 'system', label: 'System Health', icon: '⚡', url: '/admin-system.html' },
      { id: 'audit', label: 'Audit Logs', icon: '🛡️', url: '/admin-audit.html' },
    ];

    sidebar.innerHTML = `
      <div class="admin-brand">
        <div class="admin-brand-icon">L</div>
        <div>
          <h2 class="admin-brand-title">Ledger AI</h2>
          <div class="admin-brand-subtitle">Admin Panel</div>
        </div>
      </div>

      <ul class="admin-nav">
        ${navItems
          .map(
            (item) => `
          <li class="admin-nav-item">
            <a href="${item.url}" class="admin-nav-link ${this.activePage === item.id ? 'active' : ''}">
              <span class="icon">${item.icon}</span>
              <span>${item.label}</span>
            </a>
          </li>
        `
          )
          .join('')}
      </ul>

      <div class="admin-sidebar-footer">
        <button type="button" class="btn-admin-logout" id="btn-admin-signout" onclick="AdminUI.logout()">
          <span>🚪</span>
          <span>Sign Out Admin</span>
        </button>
      </div>
    `;
  },

  renderHeader() {
    const header = document.getElementById('admin-header');
    if (!header) return;

    const user = this.getUser();
    const pageTitles = {
      dashboard: 'Admin Dashboard',
      users: 'User Management',
      transactions: 'Transaction Monitoring',
      analytics: 'Platform Analytics',
      reports: 'Platform Reports & Exports',
      system: 'System Health & Diagnostics',
      audit: 'Security & Audit Logs',
    };

    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px;">
        <button class="btn-admin-secondary" id="admin-sidebar-toggle" style="display: none; padding: 6px 10px;" onclick="AdminUI.toggleSidebar()">☰</button>
        <h1 class="admin-header-title">${pageTitles[this.activePage] || 'Admin Console'}</h1>
      </div>

      <div style="display: flex; align-items: center; gap: 16px;">
        <span class="admin-header-badge">👑 System Admin</span>
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: #4F46E5; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px;">
            ${user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: 13px; font-weight: 600; color: var(--admin-text-main);">${user?.name || 'Administrator'}</span>
            <span style="font-size: 11px; color: var(--admin-text-muted);">${user?.email || ''}</span>
          </div>
        </div>
      </div>
    `;
  },

  getUser() {
    try {
      if (typeof API !== 'undefined' && API.getUser) {
        const u = API.getUser();
        if (u) return u;
      }
      const raw = localStorage.getItem('ai_expense_user') || localStorage.getItem('user');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  logout() {
    try {
      if (typeof API !== 'undefined' && API.clearAuth) {
        API.clearAuth();
      }
      localStorage.removeItem('ai_expense_token');
      localStorage.removeItem('ai_expense_user');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.clear();
    } catch (e) {
      console.error('Error during logout:', e);
    }
    window.location.href = '/login.html';
  },

  toggleSidebar() {
    const sb = document.getElementById('admin-sidebar');
    if (sb) sb.classList.toggle('show');
  },

  formatCurrency(num) {
    const val = parseFloat(num) || 0;
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  },

  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  toast(msg, type = 'info') {
    let container = document.getElementById('admin-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'admin-toast-container';
      container.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 8px;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bg = type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#3B82F6';
    toast.style.cssText = `background: ${bg}; color: white; padding: 12px 18px; border-radius: 6px; font-size: 13px; font-weight: 500; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transition: opacity 0.3s;`;
    toast.textContent = msg;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('show');
  },

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  },
};

window.AdminUI = AdminUI;
