import api from './api';

export const courseMemberService = {
  async listMembers(courseId) {
    const response = await api.get(`/courses/${courseId}/members`);
    return response.data;
  },

  async inviteMember(courseId, userId) {
    await api.post(`/courses/${courseId}/members`, { userId });
  },

  async acceptInvite(courseId) {
    await api.post(`/courses/${courseId}/members/accept`);
  },

  async removeMember(courseId, userId) {
    await api.delete(`/courses/${courseId}/members/${userId}`);
  },

  async getMemberProgress(courseId, userId) {
    const response = await api.get(`/courses/${courseId}/members/${userId}/progress`);
    return response.data;
  },

  async getTeamTasks(courseId, { page = 1, size = 100, sortField = 'id', direction = 'ASC' } = {}) {
    const response = await api.get(`/courses/${courseId}/tasks`, {
      params: { page, size, sortField, direction },
    });
    return response.data;
  },
};

export default courseMemberService;
