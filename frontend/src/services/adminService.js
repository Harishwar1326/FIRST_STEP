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

  getLessons: async (params = {}) => {
    const response = await api.get('/admin/lessons', { params })
    return response.data
  },

  createLesson: async (payload) => {
    const response = await api.post('/admin/lessons', payload)
    return response.data
  },

  updateLesson: async (lessonId, payload) => {
    const response = await api.put(`/admin/lessons/${lessonId}`, payload)
    return response.data
  },

  deleteLesson: async (lessonId) => {
    const response = await api.delete(`/admin/lessons/${lessonId}`)
    return response.data
  },

  getNotifications: async () => {
    const response = await api.get('/admin/notifications')
    return response.data
  },

  markNotificationsRead: async (notificationIds = []) => {
    const response = await api.patch('/admin/notifications/mark-read', { notificationIds })
    return response.data
  },

  getActivities: async () => {
    const response = await api.get('/admin/activities')
    return response.data
  },
}

export default adminService
