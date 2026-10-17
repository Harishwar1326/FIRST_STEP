import express from 'express';
import { learningProfileController } from '../controllers/learningProfile.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Protected endpoint: student must be authenticated
router.use(authMiddleware);

// GET /api/v1/learning-profile
router.get('/', learningProfileController.getProfile);

export default router;
