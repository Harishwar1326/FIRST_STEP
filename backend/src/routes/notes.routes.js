import express from "express";
import multer from "multer";
import { notesController } from "../controllers/notes.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// AI endpoints – note: guest-accessible (use x-guest-id header) before the blanket auth middleware; they still respect userId checks via fetchNoteSafe that works with req.user for private notes)
router.post("/ai/evolution", notesController.knowledgeEvolution);
router.get("/ai/evolution", notesController.knowledgeEvolution);

// Chroma Cloud hybrid semantic search – guest-accessible (searches only the caller's own shard)
router.get("/search/semantic", notesController.semanticSearch);
router.post("/search/semantic", notesController.semanticSearch);

router.post("/:id/ai/analyze", notesController.analyzeNote);
router.post("/:id/ai/learning", notesController.notesToLearning);
router.post("/:id/ai/blindspots", notesController.detectBlindSpots);
router.post("/:id/ai/explain", notesController.explainNote);
router.post("/:id/ai/drawing", notesController.explainDrawing);
router.post("/:id/ai/revision", notesController.personalizedRevision);

router.use(authMiddleware);

router.get("/", notesController.getNotes);
router.get("/library/meta", notesController.getLibraryMeta);
router.get("/whiteboards", notesController.getWhiteboards);
router.post("/whiteboards", notesController.createWhiteboard);
router.get("/whiteboards/:id", notesController.getWhiteboard);
router.put("/whiteboards/:id", notesController.saveWhiteboard);
router.post("/upload", upload.single("file"), notesController.uploadDocument);
router.get("/:id", notesController.getNoteById);
router.patch("/:id", notesController.updateNoteMetadata);
router.delete("/:id", notesController.deleteNote);
router.post("/:id/flashcards", notesController.generateFlashcards);
router.post("/:id/mindmap", notesController.generateMindMap);
router.post("/:id/questions", notesController.generateQuestions);

// Chroma reindex endpoints (auth-only)
router.post("/:id/reindex", notesController.reindexNote);
router.post("/reindex/all", notesController.reindexAll);

export default router;
