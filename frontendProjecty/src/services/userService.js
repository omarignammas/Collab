import api from './api';

export const userService = {
  async getCurrentUser() {
    const response = await api.get('/users/me');
    return response.data;
  },

  async updateProfile({ firstName, lastName, email }) {
    const response = await api.put('/users/me', { firstName, lastName, email });
    return response.data;
  },

  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default userService;
