import express from 'express';
import { forestController } from '../controllers/forest.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/graph', forestController.getKnowledgeGraph);
router.get('/concept/:conceptId', forestController.getConceptDetails);
router.get('/path', forestController.getLearningPath);
router.post('/gaps', forestController.detectGaps);

export default router;
