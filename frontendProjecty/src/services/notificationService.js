import api from './api';

export const notificationService = {
  async getAllNotifications({
    page = 1,
    size = 20,
    sortField = 'id',
    direction = 'DESC',
  } = {}) {
    const response = await api.get('/notifications', {
      params: { page, size, sortField, direction },
    });
    return response.data;
  },

  async getUnreadCount() {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  async markRead(notificationId) {
    await api.put(`/notifications/${notificationId}/read`);
  },

  async markAllRead() {
    await api.put('/notifications/read-all');
  },
};

export default notificationService;
