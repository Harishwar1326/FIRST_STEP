import { api } from './api'
import { unwrapApiResponse } from '../utils/unwrapApiResponse'

export const notesService = {
  uploadDocument: async (formData) => {
    const response = await api.post('/notes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return unwrapApiResponse(response.data)
  },

  getNotes: async () => {
    const response = await api.get('/notes')
    return unwrapApiResponse(response.data)
  },

  getLibraryMeta: async () => {
    const response = await api.get('/notes/library/meta')
    return unwrapApiResponse(response.data)
  },

  searchNotes: async (filters = {}) => {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
    )
    const response = await api.get('/notes', { params })
    return unwrapApiResponse(response.data)
  },

  getNoteById: async (id) => {
    const response = await api.get(`/notes/${id}`)
    return unwrapApiResponse(response.data)
  },

  getWhiteboards: async () => {
    const response = await api.get('/notes/whiteboards')
    return unwrapApiResponse(response.data)
  },

  createWhiteboard: async (title) => {
    const response = await api.post('/notes/whiteboards', { title })
    return unwrapApiResponse(response.data)
  },

  getWhiteboard: async (id) => {
    const response = await api.get(`/notes/whiteboards/${id}`)
    return unwrapApiResponse(response.data)
  },

  saveWhiteboard: async (id, snapshot) => {
    const response = await api.put(`/notes/whiteboards/${id}`, { snapshot })
    return unwrapApiResponse(response.data)
  },

  updateNote: async (id, metadata) => {
    const response = await api.patch(`/notes/${id}`, metadata)
    return unwrapApiResponse(response.data)
  },

  deleteNote: async (id) => {
    const response = await api.delete(`/notes/${id}`)
    return unwrapApiResponse(response.data)
  },

  generateFlashcards: async (noteId) => {
    const response = await api.post(`/notes/${noteId}/flashcards`)
    return unwrapApiResponse(response.data)
  },

  generateMindMap: async (noteId) => {
    const response = await api.post(`/notes/${noteId}/mindmap`)
    return unwrapApiResponse(response.data)
  },

  generateQuestions: async (noteId, bloomLevel) => {
    const response = await api.post(`/notes/${noteId}/questions`, { bloomLevel })
    return unwrapApiResponse(response.data)
  },

  semanticSearch: async (query, options = {}) => {
    const params = Object.fromEntries(
      Object.entries({ query, ...options }).filter(([, value]) => value !== undefined && value !== null && value !== '')
    )
    const response = await api.get('/notes/search/semantic', { params })
    return unwrapApiResponse(response.data)
  },

  semanticSearchPost: async (query, options = {}) => {
    const response = await api.post('/notes/search/semantic', { query, ...options })
    return unwrapApiResponse(response.data)
  },

  reindexNote: async (noteId) => {
    const response = await api.post(`/notes/${noteId}/reindex`)
    return unwrapApiResponse(response.data)
  },

  reindexAllNotes: async () => {
    const response = await api.post('/notes/reindex/all')
    return unwrapApiResponse(response.data)
  },
}
