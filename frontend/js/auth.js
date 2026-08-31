/**
 * Authentication Helper Functions
 */

const Auth = {
  isAuthenticated() {
    return !!API.getToken();
  },

  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '/login.html';
    }
  },

  redirectIfAuthenticated() {
    if (this.isAuthenticated()) {
      window.location.href = '/dashboard.html';
    }
  },

  async login(email, password) {
    const res = await API.post('/auth/login', { email, password });
    if (res.success && res.data) {
      API.setToken(res.data.token);
      API.setUser(res.data.user);
      return res.data;
    }
    throw new Error(res.message || 'Login failed');
  },

  async register(name, email, password) {
    const res = await API.post('/auth/register', { name, email, password });
    if (res.success && res.data) {
      API.setToken(res.data.token);
      API.setUser(res.data.user);
      return res.data;
    }
    throw new Error(res.message || 'Registration failed');
  },

  logout() {
    API.clearAuth();
    window.location.href = '/login.html';
  },

  checkPasswordStrength(password) {
    if (!password) return { score: 0, text: 'Empty', color: '#e2e8f0', width: '0%' };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) {
      return { score, text: 'Weak', color: '#ef4444', width: '33%' };
    } else if (score <= 4) {
      return { score, text: 'Moderate', color: '#f59e0b', width: '66%' };
    } else {
      return { score, text: 'Strong', color: '#10b981', width: '100%' };
    }
  },
};

window.Auth = Auth;
