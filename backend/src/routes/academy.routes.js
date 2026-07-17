import express from 'express';
import { academyController } from '../controllers/academy.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/plan', academyController.getStudyPlan);
router.get('/today', academyController.getTodayTasks);
router.get('/flashcards', academyController.getFlashcards);
router.post('/flashcards/review', academyController.submitFlashcardReview);
router.get('/streak', academyController.getStreak);
router.post('/streak/update', academyController.updateStreak);
router.post('/technique/recommend', academyController.getTechniqueRecommendation);

export default router;
