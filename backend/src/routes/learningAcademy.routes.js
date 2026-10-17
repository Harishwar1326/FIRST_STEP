import express from 'express';
import { learningAcademyController } from '../controllers/learningAcademy.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Helpers: read operations can be performed by guests so the interactive UX
// always works. Writes that associate data with an authenticated account still
// go through authMiddleware below if they happen to overlap, but the heavy
// AI-backed experiences (generate lesson, missions, predict, teach-back, etc.)
// are intentionally accessible to guests — activity is tracked by their
// sessionId/guestId pair, and persisted to the real profile once they log in.

router.post('/generate-lesson', learningAcademyController.generateLesson);
router.post('/generate-mission', learningAcademyController.generateMission);
router.post('/generate-prediction', learningAcademyController.generatePrediction);
router.post('/submit-prediction', learningAcademyController.submitPrediction);
router.post('/evaluate-teach-back', learningAcademyController.evaluateTeachBack);
router.post('/fix-misconception', learningAcademyController.fixMisconception);
router.post('/resolve-misconception', learningAcademyController.resolveMisconceptionFixed);
router.post('/generate-what-if', learningAcademyController.generateWhatIf);
router.post('/mark-stage', learningAcademyController.markStageCompleted);

router.use(authMiddleware);

router.get('/activity', learningAcademyController.getRecentActivity);

export default router;
