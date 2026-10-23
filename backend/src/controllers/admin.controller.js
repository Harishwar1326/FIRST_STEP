import { adminService } from '../services/admin.service.js'
import { activityService } from '../services/activity.service.js'
import { asyncHandler } from '../utils/errorHandler.js'

export const adminController = {
  summary: asyncHandler(async (req, res) => {
    const summary = await adminService.getDashboardSummary()
    res.status(200).json({
      status: 'success',
      data: summary,
      message: 'Dashboard summary retrieved successfully'
    })
  }),

  students: asyncHandler(async (req, res) => {
    const students = await adminService.listStudents(req.query)
    res.status(200).json({
      status: 'success',
      data: students,
      message: 'Students list retrieved successfully'
    })
  }),

  studentAnalytics: asyncHandler(async (req, res) => {
    const analytics = await adminService.getStudentAnalytics(req.params.id)
    res.status(200).json({
      status: 'success',
      data: analytics,
      message: 'Student analytics retrieved successfully'
    })
  }),

  listLessons: asyncHandler(async (req, res) => {
    const lessons = await adminService.listLessons(req.query)
    res.status(200).json({
      status: 'success',
      data: lessons,
      message: 'Lessons list retrieved successfully'
    })
  }),

  createLesson: asyncHandler(async (req, res) => {
    const lesson = await adminService.createLesson(req.body)
    res.status(201).json({
      status: 'success',
      data: lesson,
      message: 'Lesson created successfully'
    })
  }),

  updateLesson: asyncHandler(async (req, res) => {
    const lesson = await adminService.updateLesson(req.params.id, req.body)
    res.status(200).json({
      status: 'success',
      data: lesson,
      message: 'Lesson updated successfully'
    })
  }),

  deleteLesson: asyncHandler(async (req, res) => {
    const result = await adminService.deleteLesson(req.params.id)
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Lesson deleted successfully'
    })
  }),

  getNotifications: asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit) || 20
    const notifications = await activityService.getAdminNotifications(limit)
    res.status(200).json({
      status: 'success',
      data: notifications,
      message: 'Admin notifications retrieved successfully'
    })
  }),

  markNotificationsRead: asyncHandler(async (req, res) => {
    const { notificationIds } = req.body || {}
    const result = await activityService.markNotificationsRead(notificationIds)
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Notifications marked as read successfully'
    })
  }),

  getActivities: asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit) || 25
    const activities = await activityService.getRecentActivities(limit)
    res.status(200).json({
      status: 'success',
      data: activities,
      message: 'Recent activities retrieved successfully'
    })
  }),
}

export default adminController
