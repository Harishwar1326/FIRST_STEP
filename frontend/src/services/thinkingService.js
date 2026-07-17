import { api } from './api'

export const thinkingService = {
  getDailyChallenge: async () => {
    const response = await api.get('/thinking/daily')
    return response.data
  },

  submitAnswer: async (challengeId, answer) => {
    const response = await api.post('/thinking/submit', { challengeId, answer })
    return response.data
  },

  getThinkingScore: async () => {
    const response = await api.get('/thinking/score')
    return response.data
  },

  getHistory: async () => {
    const response = await api.get('/thinking/history')
    return response.data
  },
}
