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

  async approveUser(userId) {
    const response = await api.patch(`/admin/users/${userId}/approve`);
    return response.data;
  },

  async suspendUser(userId) {
    const response = await api.patch(`/admin/users/${userId}/suspend`);
    return response.data;
  },

  async reactivateUser(userId) {
    const response = await api.patch(`/admin/users/${userId}/reactivate`);
    return response.data;
  },

  async deleteUser(userId) {
    await api.delete(`/admin/users/${userId}`);
  },

  async getWaitlist({ page = 1, size = 50 } = {}) {
    const response = await api.get('/admin/waitlist', { params: { page, size, sortField: 'createdAt', direction: 'DESC' } });
    return response.data;
  },
};

export default adminService;
