import express from 'express';
import authRoutes from './auth.routes.js';
import notesRoutes from './notes.routes.js';
import twinRoutes from './twin.routes.js';
import academyRoutes from './academy.routes.js';
import thinkingRoutes from './thinking.routes.js';
import forestRoutes from './forest.routes.js';
import learningRoutes from './learning.routes.js';
import programmingLearningRoutes from './programmingLearning.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/notes', notesRoutes);
router.use('/twin', twinRoutes);
router.use('/academy', academyRoutes);
router.use('/thinking', thinkingRoutes);
router.use('/forest', forestRoutes);
router.use('/programming-learning', programmingLearningRoutes);
router.use('/', learningRoutes);

export default router;
