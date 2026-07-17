import { api } from './api'

export const programmingLearningService = {
  getSubjects: async () => {
    const response = await api.get('/programming-learning/subjects')
    return response.data
  },

  getLesson: async (lessonId) => {
    const response = await api.get(`/programming-learning/lesson/${lessonId}`)
    return response.data
  },

  trackLesson: async (lessonId, metrics) => {
    const response = await api.post(`/programming-learning/lesson/${lessonId}/track`, metrics)
    return response.data
  },

  submitQuiz: async (lessonId, answers) => {
    const response = await api.post(`/programming-learning/lesson/${lessonId}/quiz`, { answers })
    return response.data
  },

  saveNotes: async (lessonId, editableContent) => {
    const response = await api.post(`/programming-learning/lesson/${lessonId}/notes`, { editableContent })
    return response.data
  },

  saveDrawing: async (lessonId, payload) => {
    const response = await api.post(`/programming-learning/lesson/${lessonId}/drawing`, payload)
    return response.data
  },

  getRecommendations: async () => {
    const response = await api.get('/programming-learning/recommendations')
    return response.data
  },
}
