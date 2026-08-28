import express from 'express'
import { programmingLearningController } from '../controllers/programmingLearning.controller.js'
import { authMiddleware } from '../middlewares/auth.middleware.js'

const router = express.Router()

router.use(authMiddleware)

router.post('/seed', programmingLearningController.seed)
router.get('/subjects', programmingLearningController.subjects)
router.get('/dashboard', programmingLearningController.dashboard)
router.get('/lesson/:id', programmingLearningController.lesson)
router.post('/lesson/:id/track', programmingLearningController.track)
router.post('/lesson/:id/quiz', programmingLearningController.submitQuiz)
router.post('/lesson/:id/notes', programmingLearningController.saveNotes)
router.post('/lesson/:id/drawing', programmingLearningController.saveDrawing)
router.get('/recommendations', programmingLearningController.recommendations)

export default router
