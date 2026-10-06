import { api } from './api'

export const learningAssessmentService = {
  getQuestions: async () => {
    const response = await api.get('/learning-assessment/questions')
    return response.data
  },

  getMyAssessment: async () => {
    const response = await api.get('/learning-assessment/me')
    return response.data
  },

  submitAssessment: async (responses) => {
    const response = await api.post('/learning-assessment/submit', { responses })
    return response.data
  },
}

export default learningAssessmentService
