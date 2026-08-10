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

  async acceptInvitation(circleId) {
    const response = await api.post(`/circles/${circleId}/accept`);
    return response.data;
  },

  async declineInvitation(circleId) {
    await api.post(`/circles/${circleId}/decline`);
  },
};

export default circleService;
