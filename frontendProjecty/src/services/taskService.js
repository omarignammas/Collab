import api from './api';

export const taskService = {
  async getAllTasks({
    courseId,
    page = 1,
    size = 10,
    sortField = 'id',
    direction = 'ASC',
  } = {}) {
    const response = await api.get('/tasks', {
      params: {
        courseId,
        page,
        size,
        sortField,
        direction,
      },
    });
    return response.data;
  },

  async getTaskById(taskId) {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
  },

  async createTask(taskData) {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },

  async updateTask(taskId, taskData) {
    const response = await api.put(`/tasks/${taskId}`, taskData);
    return response.data;
  },

  async markTaskCompleted(taskId) {
    const response = await api.put(`/tasks/${taskId}/complete`);
    return response.data;
  },

  async updateTaskStatus(taskId, status) {
    const response = await api.put(`/tasks/${taskId}/status`, { status });
    return response.data;
  },

  async deleteTask(taskId) {
    await api.delete(`/tasks/${taskId}`);
  },
};

export default taskService;
