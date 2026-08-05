import api from './api';

export const termService = {
  async getAllTerms({
    page = 1,
    size = 10,
    sortField = 'id',
    direction = 'ASC',
  } = {}) {
    const response = await api.get('/terms', {
      params: {
        page,
        size,
        sortField,
        direction,
      },
    });

    return response.data;
  },

  async getTermById(termId) {
    const response = await api.get(`/terms/${termId}`);
    return response.data;
  },

  async createTerm(termData) {
    const response = await api.post('/terms', termData);
    return response.data;
  },

  async updateTerm(termId, termData) {
    const response = await api.put(`/terms/${termId}`, termData);
    return response.data;
  },

  async deleteTerm(termId) {
    await api.delete(`/terms/${termId}`);
  },
};

export default termService;
