import express from 'express';
import { learningController } from '../controllers/learning.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Allow public seed trigger (or auth-protected if preferred, let's allow it so the test scripts can trigger it easily)
router.post('/lessons/import', learningController.importLessons);

// All other routes require authentication
router.use(authMiddleware);

router.get('/lessons', learningController.getLessons);
router.get('/lesson/:id', learningController.getLessonById);

router.post('/quiz/submit', learningController.submitQuiz);
router.post('/task/submit', learningController.submitTask);

router.post('/learning/update', learningController.updateLearningProfile);
router.get('/learning/profile', learningController.getLearningProfile);
router.get('/learning/path', learningController.getLearningPath);

router.get('/recommendations', learningController.getRecommendations);
router.get('/analytics', learningController.getAnalytics);

export default router;
