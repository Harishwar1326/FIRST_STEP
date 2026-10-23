import express from 'express';
import { learningAcademyController } from '../controllers/learningAcademy.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validate, lessonGenerationSchema, missionGenerationSchema, predictionGenerationSchema, predictionSubmissionSchema, teachBackSchema, misconceptionSchema, whatIfSchema, stageCompletionSchema } from '../utils/validators.js';

const router = express.Router();

// Helpers: read operations can be performed by guests so the interactive UX
// always works. Writes that associate data with an authenticated account still
// go through authMiddleware below if they happen to overlap, but the heavy
// AI-backed experiences (generate lesson, missions, predict, teach-back, etc.)
// are intentionally accessible to guests — activity is tracked by their
// sessionId/guestId pair, and persisted to the real profile once they log in.

router.post('/generate-lesson', validate(lessonGenerationSchema), learningAcademyController.generateLesson);
router.post('/generate-mission', validate(missionGenerationSchema), learningAcademyController.generateMission);
router.post('/generate-prediction', validate(predictionGenerationSchema), learningAcademyController.generatePrediction);
router.post('/submit-prediction', validate(predictionSubmissionSchema), learningAcademyController.submitPrediction);
router.post('/evaluate-teach-back', validate(teachBackSchema), learningAcademyController.evaluateTeachBack);
router.post('/fix-misconception', validate(misconceptionSchema), learningAcademyController.fixMisconception);
router.post('/resolve-misconception', learningAcademyController.resolveMisconceptionFixed);
router.post('/generate-what-if', validate(whatIfSchema), learningAcademyController.generateWhatIf);
router.post('/mark-stage', validate(stageCompletionSchema), learningAcademyController.markStageCompleted);

router.use(authMiddleware);

router.get('/activity', learningAcademyController.getRecentActivity);

export default router;
