import express from 'express'
import { adminController } from '../controllers/admin.controller.js'
import { authMiddleware, requireAdmin } from '../middlewares/auth.middleware.js'
import {
  validate,
  validateParams,
  adminLessonSchema,
  adminLessonIdParamsSchema,
  adminStudentIdParamsSchema,
  notificationReadSchema,
} from '../utils/validators.js'

const router = express.Router()

router.use(authMiddleware, requireAdmin)

router.get('/summary', adminController.summary)
router.get('/video-analytics', adminController.videoAnalytics)
router.get('/students', adminController.students)
router.get('/students/:id', validateParams(adminStudentIdParamsSchema), adminController.studentAnalytics)

router.get('/lessons', adminController.listLessons)
router.post('/lessons', validate(adminLessonSchema), adminController.createLesson)
router.put('/lessons/:id', validateParams(adminLessonIdParamsSchema), validate(adminLessonSchema), adminController.updateLesson)
router.delete('/lessons/:id', validateParams(adminLessonIdParamsSchema), adminController.deleteLesson)

// Notification and Student Activity Log Routes
router.get('/notifications', adminController.getNotifications)
router.patch('/notifications/mark-read', validate(notificationReadSchema), adminController.markNotificationsRead)
router.get('/activities', adminController.getActivities)

export default router
