import express from 'express';
import { thinkingController } from '../controllers/thinking.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/daily', thinkingController.getDailyChallenge);
router.post('/submit', thinkingController.submitAnswer);
router.get('/score', thinkingController.getThinkingScore);
router.get('/history', thinkingController.getHistory);

export default router;
