import express from 'express';
import multer from 'multer';
import { notesController } from '../controllers/notes.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

router.get('/', notesController.getNotes);
router.get('/library/meta', notesController.getLibraryMeta);
router.post('/upload', upload.single('file'), notesController.uploadDocument);
router.get('/:id', notesController.getNoteById);
router.patch('/:id', notesController.updateNoteMetadata);
router.delete('/:id', notesController.deleteNote);
router.post('/:id/flashcards', notesController.generateFlashcards);
router.post('/:id/mindmap', notesController.generateMindMap);
router.post('/:id/questions', notesController.generateQuestions);

export default router;
