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

// Learning Academy - Adaptive Study Technique Engine Routes
router.get('/profile/:studentId?', academyController.getStudentProfile);
router.get('/recommendation/:studentId?', academyController.getTechniqueRecommendation);
router.get('/techniques', academyController.getAllTechniques);
router.get('/techniques/:techniqueId', academyController.getTechniqueById);
router.post('/technique/recommend', academyController.evaluateSituation);
router.post('/situation', academyController.evaluateSituation);
router.post('/feedback', academyController.submitFeedback);
router.post('/activity', academyController.recordActivity);
router.post('/technique-session', academyController.recordTechniqueSession);
router.get('/progress/:studentId?', academyController.getProgress);


export default router;


