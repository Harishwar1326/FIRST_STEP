import { api } from './api'

export const forestService = {
  getKnowledgeGraph: async () => {
    const response = await api.get('/forest/graph')
    return response.data
  },

  getConceptDetails: async (conceptId) => {
    const response = await api.get(`/forest/concept/${conceptId}`)
    return response.data
  },

  getLearningPath: async () => {
    const response = await api.get('/forest/path')
    return response.data
  },

  detectGaps: async () => {
    const response = await api.post('/forest/gaps')
    return response.data
  },
}
