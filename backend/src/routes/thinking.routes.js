import express from 'express';
import { thinkingController } from '../controllers/thinking.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validate, challengeSubmissionSchema, indiaChallengeAnswerSchema, thinkingLabAnswerSchema, nearbyDiscoverySchema } from '../utils/validators.js';

const router = express.Router();

// Thinking Lab is a protected student feature; writes and progress are
// always associated with the authenticated account.
router.use(authMiddleware);

router.get('/india-challenges', thinkingController.getIndiaThinkingChallenges);
router.post('/india-challenges/:id/answer', validate(indiaChallengeAnswerSchema), thinkingController.submitIndiaThinkingAnswer);
router.post('/nearby', validate(nearbyDiscoverySchema), thinkingController.createThinkingLabNearby);
router.get('/nearby', thinkingController.getThinkingLabNearby);
router.post('/challenge/:id/answer', validate(thinkingLabAnswerSchema), thinkingController.submitThinkingLabAnswer);

router.get('/feed', thinkingController.getThinkingLabFeed);
router.get('/careers', thinkingController.getThinkingLabCareers);
router.get('/challenge', thinkingController.getThinkingLabChallenge);
router.get('/knowledge/:id', thinkingController.getThinkingLabKnowledge);
router.get('/progress', thinkingController.getThinkingLabProgress);

router.get('/daily', thinkingController.getDailyChallenge);
router.post('/submit', validate(challengeSubmissionSchema), thinkingController.submitAnswer);
router.get('/score', thinkingController.getThinkingScore);
router.get('/history', thinkingController.getHistory);

export default router;
