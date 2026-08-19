import api from './api';

export const profileService = {
  async getMyProfile() {
    const response = await api.get('/profile/me');
    return response.data;
  },

  async getProfile(userId) {
    const response = await api.get(`/profile/${userId}`);
    return response.data;
  },

  async updateMission({ mission, openToChat }) {
    const response = await api.put('/profile/me', { mission, openToChat });
    return response.data;
  },
};

export default profileService;
