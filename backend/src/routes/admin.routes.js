import express from 'express'
import { adminController } from '../controllers/admin.controller.js'
import { authMiddleware, requireAdmin } from '../middlewares/auth.middleware.js'

const router = express.Router()

router.use(authMiddleware, requireAdmin)

router.get('/summary', adminController.summary)
router.get('/students', adminController.students)
router.get('/students/:id', adminController.studentAnalytics)

router.get('/lessons', adminController.listLessons)
router.post('/lessons', adminController.createLesson)
router.put('/lessons/:id', adminController.updateLesson)
router.delete('/lessons/:id', adminController.deleteLesson)

// Notification and Student Activity Log Routes
router.get('/notifications', adminController.getNotifications)
router.patch('/notifications/mark-read', adminController.markNotificationsRead)
router.get('/activities', adminController.getActivities)

export default router
