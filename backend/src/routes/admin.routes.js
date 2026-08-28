import express from 'express'
import { adminController } from '../controllers/admin.controller.js'
import { authMiddleware, requireAdmin } from '../middlewares/auth.middleware.js'

const router = express.Router()

router.use(authMiddleware, requireAdmin)

router.get('/summary', adminController.summary)
router.get('/students', adminController.students)
router.get('/students/:id', adminController.studentAnalytics)

export default router
