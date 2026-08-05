import api from './api';

export const quizService = {
  async requestQuizGeneration(summaryId, difficulty, referenceFile) {
    const formData = new FormData();
    formData.append('difficulty', difficulty);
    if (referenceFile) formData.append('referenceFile', referenceFile);

    const response = await api.post(`/course-summaries/${summaryId}/quizzes`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async getQuizzesForSummary(summaryId) {
    const response = await api.get(`/course-summaries/${summaryId}/quizzes`);
    return response.data;
  },

  async getAllQuizzes({
    page = 1,
    size = 20,
    sortField = 'id',
    direction = 'DESC',
  } = {}) {
    const response = await api.get('/quizzes', {
      params: { page, size, sortField, direction },
    });
    return response.data;
  },

  async getQuizById(quizId) {
    const response = await api.get(`/quizzes/${quizId}`);
    return response.data;
  },

  async deleteQuiz(quizId) {
    await api.delete(`/quizzes/${quizId}`);
  },

  async cancel(quizId) {
    await api.post(`/quizzes/${quizId}/cancel`);
  },

  async submitAttempt(quizId, answers) {
    const response = await api.post(`/quizzes/${quizId}/attempts`, { answers });
    return response.data;
  },

  async getMyLatestAttempt(quizId) {
    const response = await api.get(`/quizzes/${quizId}/attempts/latest`);
    return response.data;
  },

  async shareQuiz(quizId, userId) {
    await api.post(`/quizzes/${quizId}/share`, { userId });
  },

  async unshareQuiz(quizId, userId) {
    await api.delete(`/quizzes/${quizId}/share/${userId}`);
  },

  async listShares(quizId) {
    const response = await api.get(`/quizzes/${quizId}/shares`);
    return response.data;
  },
};

export default quizService;
