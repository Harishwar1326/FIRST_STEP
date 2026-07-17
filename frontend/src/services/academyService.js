import { api } from './api'

export const academyService = {
  getStudyPlan: async () => {
    const response = await api.get('/academy/plan')
    return response.data
  },

  getTodayTasks: async () => {
    const response = await api.get('/academy/today')
    return response.data
  },

  getFlashcards: async () => {
    const response = await api.get('/academy/flashcards')
    return response.data
  },

  submitFlashcardReview: async (cardId, rating) => {
    const response = await api.post('/academy/flashcards/review', { cardId, rating })
    return response.data
  },

  getStreak: async () => {
    const response = await api.get('/academy/streak')
    return response.data
  },

  updateStreak: async () => {
    const response = await api.post('/academy/streak/update')
    return response.data
  },

  getTechniqueRecommendation: async (subject) => {
    const response = await api.post('/academy/technique/recommend', { subject })
    return response.data
  },
}
