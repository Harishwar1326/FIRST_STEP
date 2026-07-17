import { api } from './api'

export const twinService = {
  getProfile: async () => {
    const response = await api.get('/twin/profile')
    return response.data
  },

  getAnalytics: async () => {
    const response = await api.get('/twin/analytics')
    return response.data
  },

  getRecommendations: async () => {
    const response = await api.get('/twin/recommendations')
    return response.data
  },

  updateProgress: async (data) => {
    const response = await api.put('/twin/progress', data)
    return response.data
  },
}
