import api from './api';

export const friendService = {
  async getFriends({
    page = 1,
    size = 100,
    sortField = 'id',
    direction = 'ASC',
  } = {}) {
    const response = await api.get('/friends', {
      params: { page, size, sortField, direction },
    });
    return response.data;
  },

  async removeFriend(userId) {
    await api.delete(`/friends/${userId}`);
  },

  async sendRequest(email) {
    const response = await api.post('/friends/requests', { email });
    return response.data;
  },

  async searchUsers(query) {
    const response = await api.get('/friends/search', { params: { q: query } });
    return response.data;
  },

  async getIncomingRequests() {
    const response = await api.get('/friends/requests/incoming');
    return response.data;
  },

  async getOutgoingRequests() {
    const response = await api.get('/friends/requests/outgoing');
    return response.data;
  },

  async acceptRequest(requestId) {
    const response = await api.post(`/friends/requests/${requestId}/accept`);
    return response.data;
  },

  async declineRequest(requestId) {
    await api.post(`/friends/requests/${requestId}/decline`);
  },
};

export default friendService;
