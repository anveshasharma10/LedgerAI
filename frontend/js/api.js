/**
 * Centralized API Communication Service
 */

const API_BASE = '/api';

const API = {
  getToken() {
    return localStorage.getItem('ai_expense_token');
  },

  setToken(token) {
    localStorage.setItem('ai_expense_token', token);
  },

  setUser(user) {
    localStorage.setItem('ai_expense_user', JSON.stringify(user));
  },

  getUser() {
    const u = localStorage.getItem('ai_expense_user');
    return u ? JSON.parse(u) : null;
  },

  clearAuth() {
    localStorage.removeItem('ai_expense_token');
    localStorage.removeItem('ai_expense_user');
  },

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        this.clearAuth();
        if (!window.location.pathname.includes('login') && !window.location.pathname.includes('register') && window.location.pathname !== '/' && !window.location.pathname.endsWith('index.html')) {
          window.location.href = '/login.html';
        }
        throw new Error('Session expired. Please log in again.');
      }

      // Check for file download (CSV / text)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/csv')) {
        return response.blob();
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url, { method: 'GET' });
  },

  post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  },
};

window.API = API;
