import { api } from './api'

export const learningProfileService = {
  getLearningProfile: async () => {
    const response = await api.get('/learning-profile')
    return response.data
  },
}

export default learningProfileService
