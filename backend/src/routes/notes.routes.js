import express from "express";
import multer from "multer";
import { notesController } from "../controllers/notes.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validate, noteUploadSchema, noteMetadataSchema, whiteboardSnapshotSchema, createWhiteboardSchema, notesBlindSpotsSchema, notesQuestionSchema, notesRevisionSchema, notesQuestionsSchema } from '../utils/validators.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Notes and AI-derived content are private to the owning account.
router.use(authMiddleware);

// AI note endpoints require the same authenticated owner as note CRUD.
router.post("/ai/evolution", notesController.knowledgeEvolution);
router.get("/ai/evolution", notesController.knowledgeEvolution);

// Semantic search is scoped to the authenticated owner.
router.get("/search/semantic", notesController.semanticSearch);
router.post("/search/semantic", notesController.semanticSearch);

router.post("/:id/ai/analyze", notesController.analyzeNote);
router.post("/:id/ai/learning", notesController.notesToLearning);
router.post("/:id/ai/blindspots", validate(notesBlindSpotsSchema), notesController.detectBlindSpots);
router.post("/:id/ai/explain", validate(notesQuestionSchema), notesController.explainNote);
router.post("/:id/ai/drawing", notesController.explainDrawing);
router.post("/:id/ai/revision", validate(notesRevisionSchema), notesController.personalizedRevision);

router.get("/", notesController.getNotes);
router.get("/library/meta", notesController.getLibraryMeta);
router.get("/whiteboards", notesController.getWhiteboards);
router.post("/whiteboards", validate(createWhiteboardSchema), notesController.createWhiteboard);
router.get("/whiteboards/:id", notesController.getWhiteboard);
router.put("/whiteboards/:id", validate(whiteboardSnapshotSchema), notesController.saveWhiteboard);
router.post("/upload", upload.single("file"), validate(noteUploadSchema), notesController.uploadDocument);
router.get("/:id", notesController.getNoteById);
router.patch("/:id", validate(noteMetadataSchema), notesController.updateNoteMetadata);
router.delete("/:id", notesController.deleteNote);
router.post("/:id/flashcards", notesController.generateFlashcards);
router.post("/:id/mindmap", notesController.generateMindMap);
router.post("/:id/questions", validate(notesQuestionsSchema), notesController.generateQuestions);

// Chroma reindex endpoints (auth-only)
router.post("/reindex/all", notesController.reindexAll);
router.post("/:id/reindex", notesController.reindexNote);

export default router;
