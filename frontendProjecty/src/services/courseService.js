import api from './api';

export const courseService = {
  async getAllCourses({
    page = 1,
    size = 10,
    sortField = 'id',
    direction = 'ASC',
  } = {}) {
    const response = await api.get('/courses', {
      params: {
        page,
        size,
        sortField,
        direction,
      },
    });

    return response.data;
  },

  async getCourseById(courseId) {
    const response = await api.get(`/courses/${courseId}`);
    return response.data;
  },

  async createCourse(courseData) {
    const response = await api.post('/courses', courseData);
    return response.data;
  },

  async updateCourse(courseId, courseData) {
    const response = await api.put(`/courses/${courseId}`, courseData);
    return response.data;
  },

  async deleteCourse(courseId) {
    await api.delete(`/courses/${courseId}`);
  },

  async getCourseProgress(courseId) {
    const response = await api.get(`/courses/${courseId}/progress`);
    return response.data;
  },
};

export default courseService;
