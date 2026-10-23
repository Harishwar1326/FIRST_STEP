import express from 'express'
import { learningAssessmentController } from '../controllers/learningAssessment.controller.js'
import { authMiddleware } from '../middlewares/auth.middleware.js'
import { validate, assessmentSubmissionSchema } from '../utils/validators.js'

const router = express.Router()

// Public question schema route
router.get('/questions', learningAssessmentController.questions)

// Auth-protected endpoints
router.use(authMiddleware)

router.get('/me', learningAssessmentController.me)
router.post('/submit', validate(assessmentSubmissionSchema), learningAssessmentController.submit)

export default router
