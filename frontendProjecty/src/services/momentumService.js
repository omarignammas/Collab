import api from './api';

export const momentumService = {
  async getMomentum() {
    const response = await api.get('/momentum');
    return response.data;
  },

  async getTodayBrief() {
    const response = await api.get('/momentum/today');
    return response.data;
  },
};

export default momentumService;
