import api from './api';

export const youtubeService = {
  async importPlaylist({ playlistUrl, termId }) {
    const response = await api.post('/courses/import/youtube', { playlistUrl, termId });
    return response.data;
  },

  async resyncPlaylist(courseId) {
    const response = await api.post(`/courses/${courseId}/resync-youtube`);
    return response.data;
  },
};

export default youtubeService;
