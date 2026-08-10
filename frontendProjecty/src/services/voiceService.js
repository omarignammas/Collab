import api from './api';

export const voiceService = {
  async transcribe(audioBlob, filename = 'recording.webm') {
    const formData = new FormData();
    formData.append('file', audioBlob, filename);

    const response = await api.post('/voice/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async synthesize(text) {
    const response = await api.post('/assistant/speech', { text }, { responseType: 'blob' });
    return response.data;
  },
};

export default voiceService;
