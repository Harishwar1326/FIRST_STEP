import { adminService } from '../services/admin.service.js'
import { activityService } from '../services/activity.service.js'

export const adminController = {
  summary: async (req, res, next) => {
    try {
      res.status(200).json(await adminService.getDashboardSummary())
    } catch (error) {
      next(error)
    }
  },

  students: async (req, res, next) => {
    try {
      res.status(200).json(await adminService.listStudents(req.query))
    } catch (error) {
      next(error)
    }
  },

  studentAnalytics: async (req, res, next) => {
    try {
      res.status(200).json(await adminService.getStudentAnalytics(req.params.id))
    } catch (error) {
      next(error)
    }
  },

  listLessons: async (req, res, next) => {
    try {
      res.status(200).json(await adminService.listLessons(req.query))
    } catch (error) {
      next(error)
    }
  },

  createLesson: async (req, res, next) => {
    try {
      res.status(201).json(await adminService.createLesson(req.body))
    } catch (error) {
      next(error)
    }
  },

  updateLesson: async (req, res, next) => {
    try {
      res.status(200).json(await adminService.updateLesson(req.params.id, req.body))
    } catch (error) {
      next(error)
    }
  },

  deleteLesson: async (req, res, next) => {
    try {
      res.status(200).json(await adminService.deleteLesson(req.params.id))
    } catch (error) {
      next(error)
    }
  },

  getNotifications: async (req, res, next) => {
    try {
      const limit = Number(req.query.limit) || 20
      res.status(200).json(await activityService.getAdminNotifications(limit))
    } catch (error) {
      next(error)
    }
  },

  markNotificationsRead: async (req, res, next) => {
    try {
      const { notificationIds } = req.body || {}
      res.status(200).json(await activityService.markNotificationsRead(notificationIds))
    } catch (error) {
      next(error)
    }
  },

  getActivities: async (req, res, next) => {
    try {
      const limit = Number(req.query.limit) || 25
      res.status(200).json(await activityService.getRecentActivities(limit))
    } catch (error) {
      next(error)
    }
  },
}

export default adminController
