import api from './api';

export const noteService = {
  async getAllNotes({
    page = 1,
    size = 10,
    sortField = 'id',
    direction = 'DESC',
  } = {}) {
    const response = await api.get('/notes', {
      params: {
        page,
        size,
        sortField,
        direction,
      },
    });

    return response.data;
  },

  async getNoteById(noteId) {
    const response = await api.get(`/notes/${noteId}`);
    return response.data;
  },

  async createNote(noteData) {
    const response = await api.post('/notes', noteData);
    return response.data;
  },

  async updateNote(noteId, noteData) {
    const response = await api.put(`/notes/${noteId}`, noteData);
    return response.data;
  },

  async deleteNote(noteId) {
    await api.delete(`/notes/${noteId}`);
  },

  async getRoomNotes(roomCode) {
    const response = await api.get(`/notes/room/${roomCode}`);
    return response.data;
  },
};

export default noteService;
