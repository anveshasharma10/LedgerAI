/**
 * Common UI Components, Navigation, Toasts, and Modals
 */

const UI = {
  // Format Indian Currency
  formatCurrency(num) {
    const val = parseFloat(num) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  },

  // Format Date
  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  },

  // Toast Notifications
  toast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  // Modal Controllers
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('show');
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show');
    }
  },

  // Confirmation Dialog
  confirm({ title, message, confirmText = 'Delete', onConfirm }) {
    let confirmModal = document.getElementById('confirm-modal');
    if (!confirmModal) {
      confirmModal = document.createElement('div');
      confirmModal.id = 'confirm-modal';
      confirmModal.className = 'modal-backdrop';
      confirmModal.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title" id="confirm-modal-title">Confirm Action</h3>
            <button class="modal-close-btn" onclick="UI.closeModal('confirm-modal')">&times;</button>
          </div>
          <div class="modal-body">
            <p id="confirm-modal-msg" style="font-size: 14px; color: var(--text-muted);">Are you sure?</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" onclick="UI.closeModal('confirm-modal')">Cancel</button>
            <button class="btn btn-danger btn-sm" id="confirm-modal-btn">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmModal);
    }

    document.getElementById('confirm-modal-title').textContent = title || 'Confirm';
    document.getElementById('confirm-modal-msg').textContent = message || 'Are you sure you want to proceed?';
    
    const confirmBtn = document.getElementById('confirm-modal-btn');
    confirmBtn.textContent = confirmText;
    confirmBtn.onclick = async () => {
      UI.closeModal('confirm-modal');
      if (onConfirm) await onConfirm();
    };

    UI.openModal('confirm-modal');
  },

  // Initialize Layout (Sidebar & Top Header)
  initLayout(activePageName) {
    const user = API.getUser() || { name: 'User', email: '' };

    // 1. Render Sidebar
    const sidebarContainer = document.getElementById('app-sidebar');
    if (sidebarContainer) {
      sidebarContainer.innerHTML = `
        <div class="sidebar-header">
          <div class="logo-icon" style="background: #FFFFFF; color: #0F172A; font-size: 16px; font-weight: 800; border-radius: 6px;">◆</div>
          <div class="logo-text">
            <span class="logo-title" style="font-family: var(--font-sans); font-size: 16px; font-weight: 800; letter-spacing: -0.02em; text-transform: none; color: #FFFFFF;">LedgerAI</span>
            <span class="logo-subtitle" style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: #94A3B8;">Financial Suite</span>
          </div>
        </div>

        <ul class="sidebar-menu">
          <li class="menu-item">
            <a href="/dashboard.html" class="menu-link ${activePageName === 'dashboard' ? 'active' : ''}">
              <span class="menu-icon">🏠</span>
              <span>Dashboard</span>
            </a>
          </li>
          <li class="menu-item">
            <a href="/expenses.html" class="menu-link ${activePageName === 'expenses' ? 'active' : ''}">
              <span class="menu-icon">💸</span>
              <span>Expenses</span>
            </a>
          </li>
          <li class="menu-item">
            <a href="/income.html" class="menu-link ${activePageName === 'income' ? 'active' : ''}">
              <span class="menu-icon">💵</span>
              <span>Income</span>
            </a>
          </li>
          <li class="menu-item">
            <a href="/budgets.html" class="menu-link ${activePageName === 'budgets' ? 'active' : ''}">
              <span class="menu-icon">🎯</span>
              <span>Budgets</span>
            </a>
          </li>
          <li class="menu-item">
            <a href="/transactions.html" class="menu-link ${activePageName === 'transactions' ? 'active' : ''}">
              <span class="menu-icon">💳</span>
              <span>Transactions</span>
            </a>
          </li>
          <li class="menu-item">
            <a href="/analytics.html" class="menu-link ${activePageName === 'analytics' ? 'active' : ''}">
              <span class="menu-icon">📊</span>
              <span>Analytics</span>
            </a>
          </li>
          <li class="menu-item">
            <a href="/ai-assistant.html" class="menu-link ${activePageName === 'ai-assistant' ? 'active' : ''}">
              <span class="menu-icon">🤖</span>
              <span>AI Assistant</span>
            </a>
          </li>
          <li class="menu-item">
            <a href="/reports.html" class="menu-link ${activePageName === 'reports' ? 'active' : ''}">
              <span class="menu-icon">📄</span>
              <span>Reports</span>
            </a>
          </li>
          <li class="menu-item">
            <a href="/profile.html" class="menu-link ${activePageName === 'profile' ? 'active' : ''}">
              <span class="menu-icon">⚙️</span>
              <span>Profile</span>
            </a>
          </li>
          ${user.role === 'admin' ? `
          <li class="menu-item" style="border-top: 1px solid rgba(255,255,255,0.08); margin-top: 8px; padding-top: 8px;">
            <a href="/admin.html" class="menu-link ${activePageName === 'admin' ? 'active' : ''}" style="color: #FBBF24; font-weight: 700;">
              <span class="menu-icon">👑</span>
              <span>Admin Panel</span>
            </a>
          </li>
          ` : ''}
        </ul>

        <div class="sidebar-footer">
          <button class="btn btn-secondary btn-sm" style="width: 100%; border-color: rgba(255,255,255,0.15); color: #cbd5e1; background: transparent;" onclick="Auth.logout()">
            🚪 Logout
          </button>
        </div>
      `;
    }

    // 2. Render Top Header
    const headerContainer = document.getElementById('top-header');
    if (headerContainer) {
      headerContainer.innerHTML = `
        <div class="header-left">
          <button class="menu-toggle-btn" id="sidebar-toggle-btn" onclick="UI.toggleSidebar()">☰</button>
          <h2 class="page-heading" id="page-title">${this.getPageTitle(activePageName)}</h2>
        </div>

        <div class="header-right">
          <!-- Notification Bell -->
          <div class="notif-wrapper">
            <button class="icon-btn" id="notif-btn" onclick="UI.toggleNotifDropdown()">
              🔔
              <span class="badge" id="notif-badge" style="display: none;">0</span>
            </button>

            <div class="notif-dropdown" id="notif-dropdown">
              <div class="notif-header">
                <h4>Notifications</h4>
                <button class="notif-mark-all" onclick="UI.markAllNotificationsRead()">Mark all as read</button>
              </div>
              <div class="notif-list" id="notif-list">
                <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">
                  Loading notifications...
                </div>
              </div>
            </div>
          </div>

          <!-- User Profile Chip -->
          <a href="/profile.html" class="user-chip">
            <div class="avatar" style="${user.role === 'admin' ? 'background: #F59E0B; color: #1E1B4B;' : ''}">
              ${user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-start; line-height: 1.1;">
              <span class="user-name">${user.name || 'User'}</span>
              ${user.role === 'admin' ? '<span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #D97706; letter-spacing: 0.05em;">ADMIN</span>' : ''}
            </div>
          </a>
        </div>
      `;

      // Load live notifications
      this.loadNotifications();
    }

    // Close notifications when clicked outside
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('notif-dropdown');
      const btn = document.getElementById('notif-btn');
      if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.remove('show');
      }
    });
  },

  getPageTitle(name) {
    const titles = {
      dashboard: 'Dashboard Overview',
      expenses: 'Expense Management',
      income: 'Income Tracking',
      budgets: 'Monthly Budgets',
      transactions: 'All Transactions',
      analytics: 'Financial Analytics & Charts',
      'ai-assistant': 'AI Financial Assistant',
      reports: 'Financial Reports & Exports',
      profile: 'User Profile & Settings',
      admin: 'System Administration & Platform Controls',
    };
    return titles[name] || 'AI Expense Manager';
  },

  toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.toggle('show');
  },

  toggleNotifDropdown() {
    const dropdown = document.getElementById('notif-dropdown');
    if (dropdown) dropdown.classList.toggle('show');
  },

  async loadNotifications() {
    try {
      const res = await API.get('/notifications');
      if (res.success && res.data) {
        const { notifications, unreadCount } = res.data;
        const badge = document.getElementById('notif-badge');
        const list = document.getElementById('notif-list');

        if (badge) {
          if (unreadCount > 0) {
            badge.style.display = 'flex';
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
          } else {
            badge.style.display = 'none';
          }
        }

        if (list) {
          if (notifications.length === 0) {
            list.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">No notifications yet.</div>`;
            return;
          }

          list.innerHTML = notifications.map(n => `
            <div class="notif-item ${!n.is_read ? 'unread' : ''}" onclick="UI.markNotificationRead(${n.id})">
              <div class="notif-title">${n.title}</div>
              <div class="notif-msg">${n.message}</div>
              <div class="notif-time">${UI.formatDate(n.created_at)}</div>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      console.warn('Notification fetch error:', err);
    }
  },

  async markNotificationRead(id) {
    try {
      await API.put(`/notifications/${id}/read`);
      this.loadNotifications();
    } catch (err) {
      console.error(err);
    }
  },

  async markAllNotificationsRead() {
    try {
      await API.put('/notifications/read-all');
      this.toast('All notifications marked as read', 'success');
      this.loadNotifications();
    } catch (err) {
      this.toast('Failed to mark notifications', 'error');
    }
  },

  async seedDemoData() {
    this.confirm({
      title: '⚡ Generate Dynamic Financial Demo',
      message: 'Populate 35+ realistic, multi-category expenses (Food, Shopping, Bills, Transport, Health, Entertainment, Education, Rent) and multi-month incomes, budgets & AI insights?',
      confirmText: 'Generate Demo Data',
      onConfirm: async () => {
        try {
          UI.toast('Generating dynamic financial dataset...', 'info');
          const res = await API.post('/expenses/seed-demo', { clearExisting: true });
          if (res.success) {
            UI.toast(res.message, 'success');
            setTimeout(() => {
              window.location.reload();
            }, 800);
          }
        } catch (err) {
          UI.toast(err.message || 'Failed to generate demo dataset', 'error');
        }
      },
    });
  },
};

window.UI = UI;
