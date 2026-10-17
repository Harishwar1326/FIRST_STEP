import express from 'express';
import { thinkingController } from '../controllers/thinking.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/india-challenges', thinkingController.getIndiaThinkingChallenges);
router.post('/india-challenges/:id/answer', thinkingController.submitIndiaThinkingAnswer);
router.post('/nearby', thinkingController.createThinkingLabNearby);
router.get('/nearby', thinkingController.getThinkingLabNearby);
router.post('/challenge/:id/answer', thinkingController.submitThinkingLabAnswer);

router.use(authMiddleware);

router.get('/feed', thinkingController.getThinkingLabFeed);
router.get('/careers', thinkingController.getThinkingLabCareers);
router.get('/challenge', thinkingController.getThinkingLabChallenge);
router.get('/knowledge/:id', thinkingController.getThinkingLabKnowledge);
router.get('/progress', thinkingController.getThinkingLabProgress);

router.get('/daily', thinkingController.getDailyChallenge);
router.post('/submit', thinkingController.submitAnswer);
router.get('/score', thinkingController.getThinkingScore);
router.get('/history', thinkingController.getHistory);

export default router;
