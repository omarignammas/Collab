import api from './api';

export const courseSummaryService = {
  async uploadSummary({ file, courseId, title }) {
    const formData = new FormData();
    formData.append('file', file);
    if (courseId) formData.append('courseId', courseId);
    if (title) formData.append('title', title);

    const response = await api.post('/course-summaries', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async createResearchReport({ topic, title, courseId }) {
    const response = await api.post('/course-summaries/research', {
      topic,
      title: title || null,
      courseId: courseId || null,
    });
    return response.data;
  },

  async getAllSummaries({
    page = 1,
    size = 20,
    sortField = 'id',
    direction = 'DESC',
  } = {}) {
    const response = await api.get('/course-summaries', {
      params: { page, size, sortField, direction },
    });
    return response.data;
  },

  async getSummaryById(summaryId) {
    const response = await api.get(`/course-summaries/${summaryId}`);
    return response.data;
  },

  async deleteSummary(summaryId) {
    await api.delete(`/course-summaries/${summaryId}`);
  },

  async retry(summaryId) {
    await api.post(`/course-summaries/${summaryId}/retry`);
  },

  async cancel(summaryId) {
    await api.post(`/course-summaries/${summaryId}/cancel`);
  },

  async shareSummary(summaryId, userId) {
    await api.post(`/course-summaries/${summaryId}/share`, { userId });
  },

  async unshareSummary(summaryId, userId) {
    await api.delete(`/course-summaries/${summaryId}/share/${userId}`);
  },

  async listShares(summaryId) {
    const response = await api.get(`/course-summaries/${summaryId}/shares`);
    return response.data;
  },
};

export default courseSummaryService;
