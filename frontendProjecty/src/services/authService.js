import api from './api';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    const { token, ...user } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    return response.data;
  },

  async register(userData) {
    const response = await api.post('/auth/register', userData);
    const { token, ...user } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  updateStoredUser(partialUser) {
    const current = authService.getCurrentUser() || {};
    const merged = { ...current, ...partialUser };
    localStorage.setItem('user', JSON.stringify(merged));
    return merged;
  },

  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getToken() {
    return localStorage.getItem('token');
  },

  isAuthenticated() {
    return !!this.getToken();
  },
};

export default authService;