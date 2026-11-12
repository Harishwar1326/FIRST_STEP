import express from 'express';
import { twinController } from '../controllers/twin.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validate, twinProgressSchema } from '../utils/validators.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/snapshot', twinController.getSnapshot);
router.get('/profile', twinController.getProfile);
router.get('/analytics', twinController.getAnalytics);
router.get('/recommendations', twinController.getRecommendations);

router.put('/progress', validate(twinProgressSchema), twinController.updateProgress);

export default router;
