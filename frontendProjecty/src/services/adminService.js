import api from './api';

export const adminService = {
  async getUsers({ page = 1, size = 50 } = {}) {
    const response = await api.get('/admin/users', { params: { page, size, sortField: 'createdAt', direction: 'DESC' } });
    return response.data;
  },

  async getStats() {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  async deleteUser(userId) {
    await api.delete(`/admin/users/${userId}`);
  },
};

export default adminService;
