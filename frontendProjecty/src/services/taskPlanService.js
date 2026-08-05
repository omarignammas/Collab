import api from './api';

export const taskPlanService = {
  async requestPlan(courseId, { file, targetDate, additionalContext }) {
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (targetDate) formData.append('targetDate', targetDate);
    if (additionalContext) formData.append('additionalContext', additionalContext);

    const response = await api.post(`/courses/${courseId}/task-plans`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async getPlan(courseId, planId) {
    const response = await api.get(`/courses/${courseId}/task-plans/${planId}`);
    return response.data;
  },

  async cancelPlan(courseId, planId) {
    await api.post(`/courses/${courseId}/task-plans/${planId}/cancel`);
  },

  async confirmPlan(courseId, planId, tasks) {
    const response = await api.post(`/courses/${courseId}/task-plans/${planId}/confirm`, { tasks });
    return response.data;
  },
};

export default taskPlanService;
