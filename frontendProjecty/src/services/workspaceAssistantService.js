import api from './api';

export const workspaceAssistantService = {
  async chat(message, history = []) {
    const response = await api.post('/assistant/chat', {
      message,
      history: history.map((entry) => ({ role: entry.role, content: entry.text })),
    });
    return response.data;
  },

  async speak(text) {
    const response = await api.post('/assistant/speech', { text }, { responseType: 'blob' });
    return response.data;
  },
};

export default workspaceAssistantService;
