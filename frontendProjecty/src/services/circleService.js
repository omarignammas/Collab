import api from './api';

export const circleService = {
  async getMyCircles() {
    const response = await api.get('/circles');
    return response.data;
  },

  async createCircle(payload) {
    const response = await api.post('/circles', payload);
    return response.data;
  },

  async updateCircle(circleId, payload) {
    const response = await api.put(`/circles/${circleId}`, payload);
    return response.data;
  },

  async inviteMembers(circleId, userIds) {
    const response = await api.post(`/circles/${circleId}/members`, { userIds });
    return response.data;
  },

  async removeMember(circleId, userId) {
    const response = await api.delete(`/circles/${circleId}/members/${userId}`);
    return response.data;
  },

  async deleteCircle(circleId) {
    await api.delete(`/circles/${circleId}`);
  },

  async acceptInvitation(circleId) {
    const response = await api.post(`/circles/${circleId}/accept`);
    return response.data;
  },

  async declineInvitation(circleId) {
    await api.post(`/circles/${circleId}/decline`);
  },
};

export default circleService;
