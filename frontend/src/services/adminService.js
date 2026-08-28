import { api } from './api'

export const adminService = {
  getSummary: async () => {
    const response = await api.get('/admin/summary')
    return response.data
  },

  getStudents: async (params = {}) => {
    const response = await api.get('/admin/students', { params })
    return response.data
  },

  getStudent: async (studentId) => {
    const response = await api.get(`/admin/students/${studentId}`)
    return response.data
  },

}
