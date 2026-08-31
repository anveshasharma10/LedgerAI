/**
 * User Profile & Account Settings Logic
 */

async function initProfile() {
  Auth.requireAuth();
  UI.initLayout('profile');

  setupProfileForms();
  await loadProfileData();
}

async function loadProfileData() {
  try {
    const res = await API.get('/auth/profile');
    if (res.success && res.data) {
      const user = res.data.user || res.data;
      const stats = res.data.stats || {
        expensesCount: 0,
        incomeCount: 0,
        budgetsCount: 0,
        totalExpenses: 0,
        totalIncome: 0,
        balance: 0,
      };

      // Update form fields
      const nameInput = document.getElementById('profile-name-input');
      const emailInput = document.getElementById('profile-email-input');
      if (nameInput) nameInput.value = user.name || '';
      if (emailInput) emailInput.value = user.email || '';

      // Update summary card
      const nameEl = document.getElementById('profile-card-name');
      const emailEl = document.getElementById('profile-card-email');
      const avatarEl = document.getElementById('profile-card-avatar');
      const badgeEl = document.getElementById('profile-card-badge');

      if (nameEl) nameEl.textContent = user.name || 'User';
      if (emailEl) emailEl.textContent = user.email || '';
      if (avatarEl) avatarEl.textContent = (user.name || 'U').charAt(0).toUpperCase();

      if (badgeEl) {
        if (user.email === 'demo@example.com') {
          badgeEl.textContent = 'Active Demo Account';
          badgeEl.style.background = 'rgba(16, 185, 129, 0.1)';
          badgeEl.style.color = '#059669';
        } else {
          badgeEl.textContent = 'Standard Verified Account';
          badgeEl.style.background = 'rgba(37, 99, 235, 0.1)';
          badgeEl.style.color = '#2563eb';
        }
      }

      // Stats
      const expCountEl = document.getElementById('stat-expenses-count');
      const incCountEl = document.getElementById('stat-income-count');
      const bdgCountEl = document.getElementById('stat-budgets-count');
      const totIncEl = document.getElementById('stat-total-income');
      const totExpEl = document.getElementById('stat-total-expenses');
      const netBalEl = document.getElementById('stat-net-balance');
      const joinEl = document.getElementById('stat-joined-date');

      if (expCountEl) expCountEl.textContent = stats.expensesCount || 0;
      if (incCountEl) incCountEl.textContent = stats.incomeCount || 0;
      if (bdgCountEl) bdgCountEl.textContent = stats.budgetsCount || 0;
      if (totIncEl) totIncEl.textContent = UI.formatCurrency(stats.totalIncome || 0);
      if (totExpEl) totExpEl.textContent = UI.formatCurrency(stats.totalExpenses || 0);
      if (netBalEl) {
        const net = stats.balance !== undefined ? stats.balance : ((stats.totalIncome || 0) - (stats.totalExpenses || 0));
        netBalEl.textContent = UI.formatCurrency(net);
        netBalEl.style.color = net >= 0 ? 'var(--text-main)' : 'var(--danger)';
      }
      if (joinEl) joinEl.textContent = user.created_at ? UI.formatDate(user.created_at) : 'Active';
    }
  } catch (err) {
    console.error('loadProfileData error:', err);
    UI.toast('Failed to load profile data', 'error');
  }
}

function setupProfileForms() {
  // Update Profile Form
  const profileForm = document.getElementById('edit-profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('profile-name-input').value;
      const email = document.getElementById('profile-email-input').value;

      try {
        const res = await API.put('/auth/profile', { name, email });
        if (res.success && res.data) {
          API.setUser(res.data);
          UI.toast('Profile updated successfully', 'success');
          await loadProfileData();
          UI.initLayout('profile');
        }
      } catch (err) {
        UI.toast(err.message || 'Failed to update profile', 'error');
      }
    });
  }

  // Change Password Form
  const passForm = document.getElementById('change-password-form');
  if (passForm) {
    passForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('current-password-input').value;
      const newPassword = document.getElementById('new-password-input').value;
      const confirmPassword = document.getElementById('confirm-password-input').value;

      if (newPassword !== confirmPassword) {
        UI.toast('New passwords do not match', 'warning');
        return;
      }

      try {
        await API.put('/auth/change-password', { currentPassword, newPassword });
        UI.toast('Password changed successfully', 'success');
        passForm.reset();
      } catch (err) {
        UI.toast(err.message || 'Failed to change password', 'error');
      }
    });
  }
}

window.initProfile = initProfile;
