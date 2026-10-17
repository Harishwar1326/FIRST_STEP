import { notesService } from "../services/notes.service.js";
import { notesAIService } from "../services/notes.ai.service.js";
import { notesRepository } from "../repositories/notes.repository.js";

const resolveUserId = (req) => {
  const guest = (req.headers["x-guest-id"] || "").toString().trim();
  return (
    req.user?.id ||
    guest ||
    `guest-notes-${Math.random().toString(36).slice(2, 10)}`
  );
};

const fetchNoteSafe = async (id, userId) => {
  let note = await notesRepository.findById(id, userId);
  if (note) return note;
  let wb = await notesRepository.findWhiteboardById(id, userId);
  if (wb) return { ...wb, content: wb.tldrawSnapshot ? "" : wb.content };
  return null;
};

export const notesController = {
  uploadDocument: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const file = req.file;
      const result = await notesService.uploadDocument(userId, file, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  getNotes: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const notes = await notesService.getNotesByUserId(userId, req.query);
      res.status(200).json({ notes });
    } catch (error) {
      next(error);
    }
  },

  getLibraryMeta: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const meta = await notesService.getLibraryMeta(userId);
      res.status(200).json(meta);
    } catch (error) {
      next(error);
    }
  },

  getWhiteboards: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const result = await notesService.getWhiteboards(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  createWhiteboard: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const result = await notesService.createWhiteboard(userId, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  getWhiteboard: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const result = await notesService.getWhiteboard(req.params.id, userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  saveWhiteboard: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const result = await notesService.saveWhiteboard(
        req.params.id,
        userId,
        req.body,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  getNoteById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const note = await notesService.getNoteById(id, userId);
      res.status(200).json(note);
    } catch (error) {
      next(error);
    }
  },

  updateNoteMetadata: async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const note = await notesService.updateNoteMetadata(id, userId, req.body);
      res.status(200).json(note);
    } catch (error) {
      next(error);
    }
  },

  deleteNote: async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const result = await notesService.deleteNote(id, userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  generateFlashcards: async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const result = await notesService.generateFlashcards(id, userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  generateMindMap: async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const result = await notesService.generateMindMap(id, userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  generateQuestions: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { bloomLevel } = req.body;
      const userId = req.user.id;
      const result = await notesService.generateQuestions(
        id,
        userId,
        bloomLevel,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  analyzeNote: async (req, res, next) => {
    try {
      const userId = resolveUserId(req);
      const note = await fetchNoteSafe(req.params.id, req.user?.id || userId);
      if (!note) return res.status(404).json({ message: "Note not found" });
      const result = await notesAIService.analyzeNotes(userId, note, {
        snapshot: note.tldrawSnapshot || null,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  notesToLearning: async (req, res, next) => {
    try {
      const userId = resolveUserId(req);
      const note = await fetchNoteSafe(req.params.id, req.user?.id || userId);
      if (!note) return res.status(404).json({ message: "Note not found" });
      const result = await notesAIService.notesToLearning(userId, note, {
        snapshot: note.tldrawSnapshot || null,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  detectBlindSpots: async (req, res, next) => {
    try {
      const userId = resolveUserId(req);
      const note = await fetchNoteSafe(req.params.id, req.user?.id || userId);
      if (!note) return res.status(404).json({ message: "Note not found" });
      const result = await notesAIService.detectBlindSpots(
        userId,
        note,
        req.body?.analysis || null,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  explainNote: async (req, res, next) => {
    try {
      const userId = resolveUserId(req);
      const note = await fetchNoteSafe(req.params.id, req.user?.id || userId);
      if (!note) return res.status(404).json({ message: "Note not found" });
      const { question } = req.body || {};
      if (!question || !String(question).trim()) {
        return res.status(400).json({ message: "A question is required." });
      }
      const result = await notesAIService.explainNotesQa(
        userId,
        note,
        String(question).trim(),
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  explainDrawing: async (req, res, next) => {
    try {
      const userId = resolveUserId(req);
      const note = await fetchNoteSafe(req.params.id, req.user?.id || userId);
      if (!note)
        return res.status(404).json({ message: "Whiteboard not found" });
      const result = await notesAIService.explainDrawing(userId, note);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  personalizedRevision: async (req, res, next) => {
    try {
      const userId = resolveUserId(req);
      const note = await fetchNoteSafe(req.params.id, req.user?.id || userId);
      if (!note) return res.status(404).json({ message: "Note not found" });
      const minutes = Number(req.body?.minutes) || 10;
      const safeMinutes = [5, 10, 20].includes(minutes) ? minutes : 10;
      const result = await notesAIService.personalizedRevision(
        userId,
        note,
        safeMinutes,
        req.body?.analysis || null,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  knowledgeEvolution: async (req, res, next) => {
    try {
      const userId =
        req.user?.id ||
        (req.headers["x-guest-id"] || "").toString().trim() ||
        `guest-notes-${Math.random().toString(36).slice(2, 10)}`;
      const subject =
        (req.query.subject || req.body?.subject || "").toString().trim() ||
        null;
      const result = await notesAIService.knowledgeEvolution(userId, subject);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  semanticSearch: async (req, res, next) => {
    try {
      const userId = resolveUserId(req);
      const query = (req.query.query || req.body?.query || "")
        .toString()
        .trim();
      const options = {
        limit: req.query.limit || req.body?.limit,
        subject: req.query.subject || req.body?.subject,
        folder: req.query.folder || req.body?.folder,
        groupByNote:
          req.query.groupByNote !== undefined
            ? req.query.groupByNote !== "false"
            : req.body?.groupByNote !== false,
        denseWeight: req.query.denseWeight || req.body?.denseWeight,
        sparseWeight: req.query.sparseWeight || req.body?.sparseWeight,
        rrfK: req.query.rrfK || req.body?.rrfK,
      };
      const result = await notesService.semanticSearch(userId, query, options);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  reindexNote: async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const result = await notesService.reindexNote(userId, id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  reindexAll: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const result = await notesService.reindexAllForUser(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
};
