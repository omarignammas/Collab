import api from './api';

export const waitlistService = {
  async joinWaitlist(email) {
    const response = await api.post('/waitlist', { email });
    return response.data;
  },
};

export default waitlistService;