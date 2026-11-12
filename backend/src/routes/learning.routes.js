import express from 'express';
import { learningController } from '../controllers/learning.controller.js';
import { authMiddleware, requireAdmin } from '../middlewares/auth.middleware.js';
import { validate, learningQuizSubmissionSchema, learningTaskSubmissionSchema, learningProfileUpdateSchema } from '../utils/validators.js';

const router = express.Router();

// Curriculum seeding is restricted to administrators.
router.post('/lessons/import', authMiddleware, requireAdmin, learningController.importLessons);

// All other routes require authentication
router.use(authMiddleware);

router.get('/lessons', learningController.getLessons);
router.get('/lesson/:id', learningController.getLessonById);

router.post('/quiz/submit', validate(learningQuizSubmissionSchema), learningController.submitQuiz);
router.post('/task/submit', validate(learningTaskSubmissionSchema), learningController.submitTask);

router.post('/learning/update', validate(learningProfileUpdateSchema), learningController.updateLearningProfile);
router.get('/learning/profile', learningController.getLearningProfile);
router.get('/learning/path', learningController.getLearningPath);

router.get('/recommendations', learningController.getRecommendations);
router.get('/analytics', learningController.getAnalytics);

export default router;
