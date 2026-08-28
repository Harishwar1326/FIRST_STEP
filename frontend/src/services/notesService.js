import { api } from './api'

export const notesService = {
  uploadDocument: async (formData) => {
    const response = await api.post('/notes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  getNotes: async () => {
    const response = await api.get('/notes')
    return response.data
  },

  getLibraryMeta: async () => {
    const response = await api.get('/notes/library/meta')
    return response.data
  },

  searchNotes: async (filters = {}) => {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
    )
    const response = await api.get('/notes', { params })
    return response.data
  },

  getNoteById: async (id) => {
    const response = await api.get(`/notes/${id}`)
    return response.data
  },

  getWhiteboards: async () => {
    const response = await api.get('/notes/whiteboards')
    return response.data
  },

  createWhiteboard: async (title) => {
    const response = await api.post('/notes/whiteboards', { title })
    return response.data
  },

  getWhiteboard: async (id) => {
    const response = await api.get(`/notes/whiteboards/${id}`)
    return response.data
  },

  saveWhiteboard: async (id, snapshot) => {
    const response = await api.put(`/notes/whiteboards/${id}`, { snapshot })
    return response.data
  },

  updateNote: async (id, metadata) => {
    const response = await api.patch(`/notes/${id}`, metadata)
    return response.data
  },

  deleteNote: async (id) => {
    const response = await api.delete(`/notes/${id}`)
    return response.data
  },

  generateFlashcards: async (noteId) => {
    const response = await api.post(`/notes/${noteId}/flashcards`)
    return response.data
  },

  generateMindMap: async (noteId) => {
    const response = await api.post(`/notes/${noteId}/mindmap`)
    return response.data
  },

  generateQuestions: async (noteId, bloomLevel) => {
    const response = await api.post(`/notes/${noteId}/questions`, { bloomLevel })
    return response.data
  },
}
