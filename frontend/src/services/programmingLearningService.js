import { api } from './api'

const lessonPath = (lessonId, action = '') => {
  const id = String(lessonId || '').trim()
  if (!id) throw new Error('Select a lesson before requesting lesson data.')
  return `/programming-learning/lesson/${encodeURIComponent(id)}${action}`
}

export const programmingLearningService = {
  getSubjects: async () => {
    const response = await api.get('/programming-learning/subjects')
    return response.data
  },

  getDashboard: async () => {
    const response = await api.get('/programming-learning/dashboard')
    return response.data
  },

  getLesson: async (lessonId) => {
    const response = await api.get(lessonPath(lessonId))
    return response.data
  },

  trackLesson: async (lessonId, metrics) => {
    const response = await api.post(lessonPath(lessonId, '/track'), metrics)
    return response.data
  },

  recordVideoEvent: async (lessonId, event) => {
    const response = await api.post(lessonPath(lessonId, '/events'), event)
    return response.data
  },

  submitQuiz: async (lessonId, answers, quizSessionId) => {
    const response = await api.post(lessonPath(lessonId, '/quiz'), { answers, quizSessionId })
    return response.data
  },

  saveNotes: async (lessonId, editableContent) => {
    const response = await api.post(lessonPath(lessonId, '/notes'), { editableContent })
    return response.data
  },

  getRecommendations: async () => {
    const response = await api.get('/programming-learning/recommendations')
    return response.data
  },
}
