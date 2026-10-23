import { notesService } from "../services/notes.service.js";
import { notesAIService } from "../services/notes.ai.service.js";
import { notesRepository } from "../repositories/notes.repository.js";
import { asyncHandler, AppError } from "../utils/errorHandler.js";

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
  uploadDocument: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const file = req.file;
    const result = await notesService.uploadDocument(userId, file, req.body);
    res.status(201).json({
      status: 'success',
      data: result,
      message: 'Document uploaded and processed successfully'
    });
  }),

  getNotes: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const notes = await notesService.getNotesByUserId(userId, req.query);
    res.status(200).json({
      status: 'success',
      data: { notes },
      message: 'Notes retrieved successfully'
    });
  }),

  getLibraryMeta: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const meta = await notesService.getLibraryMeta(userId);
    res.status(200).json({
      status: 'success',
      data: meta,
      message: 'Library metadata retrieved'
    });
  }),

  getWhiteboards: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await notesService.getWhiteboards(userId);
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Whiteboards retrieved'
    });
  }),

  createWhiteboard: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await notesService.createWhiteboard(userId, req.body);
    res.status(201).json({
      status: 'success',
      data: result,
      message: 'Whiteboard created successfully'
    });
  }),

  getWhiteboard: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await notesService.getWhiteboard(req.params.id, userId);
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Whiteboard retrieved successfully'
    });
  }),

  saveWhiteboard: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await notesService.saveWhiteboard(
      req.params.id,
      userId,
      req.body,
    );
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Whiteboard saved successfully'
    });
  }),

  getNoteById: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const note = await notesService.getNoteById(id, userId);
    res.status(200).json({
      status: 'success',
      data: note,
      message: 'Note retrieved successfully'
    });
  }),

  updateNoteMetadata: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const note = await notesService.updateNoteMetadata(id, userId, req.body);
    res.status(200).json({
      status: 'success',
      data: note,
      message: 'Note metadata updated successfully'
    });
  }),

  deleteNote: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await notesService.deleteNote(id, userId);
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Note deleted successfully'
    });
  }),

  generateFlashcards: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await notesService.generateFlashcards(id, userId);
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Flashcards generated successfully'
    });
  }),

  generateMindMap: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await notesService.generateMindMap(id, userId);
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Mind map generated successfully'
    });
  }),

  generateQuestions: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { bloomLevel } = req.body;
    const userId = req.user.id;
    const result = await notesService.generateQuestions(
      id,
      userId,
      bloomLevel,
    );
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Questions generated successfully'
    });
  }),

  analyzeNote: asyncHandler(async (req, res) => {
    const userId = resolveUserId(req);
    const note = await fetchNoteSafe(req.params.id, req.user?.id || userId);
    if (!note) throw new AppError("Note not found", 404);
    const result = await notesAIService.analyzeNotes(userId, note, {
      snapshot: note.tldrawSnapshot || null,
    });
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Note analysis completed'
    });
  }),

  notesToLearning: asyncHandler(async (req, res) => {
    const userId = resolveUserId(req);
    const note = await fetchNoteSafe(req.params.id, req.user?.id || userId);
    if (!note) throw new AppError("Note not found", 404);
    const result = await notesAIService.notesToLearning(userId, note, {
      snapshot: note.tldrawSnapshot || null,
    });
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Learning path generated from note'
    });
  }),

  detectBlindSpots: asyncHandler(async (req, res) => {
    const userId = resolveUserId(req);
    const note = await fetchNoteSafe(req.params.id, req.user?.id || userId);
    if (!note) throw new AppError("Note not found", 404);
    const result = await notesAIService.detectBlindSpots(
      userId,
      note,
      req.body?.analysis || null,
    );
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Blind spots detected'
    });
  }),

  explainNote: asyncHandler(async (req, res) => {
    const userId = resolveUserId(req);
    const note = await fetchNoteSafe(req.params.id, req.user?.id || userId);
    if (!note) throw new AppError("Note not found", 404);
    const { question } = req.body || {};
    if (!question || !String(question).trim()) {
      throw new AppError("A question is required.", 400);
    }
    const result = await notesAIService.explainNotesQa(
      userId,
      note,
      String(question).trim(),
    );
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Note explanation generated'
    });
  }),

  explainDrawing: asyncHandler(async (req, res) => {
    const userId = resolveUserId(req);
    const note = await fetchNoteSafe(req.params.id, req.user?.id || userId);
    if (!note) throw new AppError("Whiteboard not found", 404);
    const result = await notesAIService.explainDrawing(userId, note);
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Drawing explanation generated'
    });
  }),

  personalizedRevision: asyncHandler(async (req, res) => {
    const userId = resolveUserId(req);
    const note = await fetchNoteSafe(req.params.id, req.user?.id || userId);
    if (!note) throw new AppError("Note not found", 404);
    const minutes = Number(req.body?.minutes) || 10;
    const safeMinutes = [5, 10, 20].includes(minutes) ? minutes : 10;
    const result = await notesAIService.personalizedRevision(
      userId,
      note,
      safeMinutes,
      req.body?.analysis || null,
    );
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Personalized revision plan generated'
    });
  }),

  knowledgeEvolution: asyncHandler(async (req, res) => {
    const userId =
      req.user?.id ||
      (req.headers["x-guest-id"] || "").toString().trim() ||
      `guest-notes-${Math.random().toString(36).slice(2, 10)}`;
    const subject =
      (req.query.subject || req.body?.subject || "").toString().trim() ||
      null;
    const result = await notesAIService.knowledgeEvolution(userId, subject);
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Knowledge evolution analysis completed'
    });
  }),

  semanticSearch: asyncHandler(async (req, res) => {
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
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Semantic search completed'
    });
  }),

  reindexNote: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await notesService.reindexNote(userId, id);
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Note reindexed successfully'
    });
  }),

  reindexAll: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await notesService.reindexAllForUser(userId);
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'All notes reindexed successfully'
    });
  }),
};
 {
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
