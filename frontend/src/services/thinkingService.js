import { api } from './api'

export const thinkingService = {
  getFeed: async (params = {}) => {
    const response = await api.get('/thinking-lab/feed', { params })
    return response.data
  },

  getNearby: async (params = {}) => {
    const response = await api.get('/thinking-lab/nearby', { params })
    return response.data
  },

  discoverNearby: async ({ latitude, longitude, studentProfile } = {}) => {
    const response = await api.post('/thinking-lab/nearby', {
      latitude,
      longitude,
      studentProfile,
    })
    return response.data
  },

  getIndiaChallenges: async () => {
    const response = await api.get('/thinking-lab/india-challenges')
    return response.data
  },

  submitIndiaChallengeAnswer: async (challengeId, answer) => {
    const response = await api.post(`/thinking-lab/india-challenges/${challengeId}/answer`, { answer })
    return response.data
  },

  getPersonalizedChallenge: async (params = {}) => {
    const response = await api.get('/thinking-lab/challenge', { params })
    return response.data
  },

  getKnowledgeItem: async (id, params = {}) => {
    const response = await api.get(`/thinking-lab/knowledge/${id}`, { params })
    return response.data
  },

  submitThinkingLabAnswer: async (challengeId, payload) => {
    const response = await api.post(`/thinking-lab/challenge/${challengeId}/answer`, payload)
    return response.data
  },

  getProgress: async () => {
    const response = await api.get('/thinking-lab/progress')
    return response.data
  },

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
