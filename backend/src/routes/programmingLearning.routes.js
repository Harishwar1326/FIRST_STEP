import express from 'express'
import { programmingLearningController } from '../controllers/programmingLearning.controller.js'
import { authMiddleware, requireAdmin } from '../middlewares/auth.middleware.js'
import { programmingQuizSubmissionSchema, programmingNotesSchema, validate } from '../utils/validators.js'

const router = express.Router()

router.use(authMiddleware)

router.post('/seed', requireAdmin, programmingLearningController.seed)
router.get('/subjects', programmingLearningController.subjects)
router.get('/dashboard', programmingLearningController.dashboard)
router.get('/lesson/:id', programmingLearningController.lesson)
router.post('/lesson/:id/track', programmingLearningController.track)
router.post('/lesson/:id/events', programmingLearningController.videoEvent)
router.post('/lesson/:id/quiz', validate(programmingQuizSubmissionSchema), programmingLearningController.submitQuiz)
router.post('/lesson/:id/notes', validate(programmingNotesSchema), programmingLearningController.saveNotes)
router.get('/recommendations', programmingLearningController.recommendations)

export default router
