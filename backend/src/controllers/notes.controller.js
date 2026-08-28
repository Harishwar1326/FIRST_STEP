import { notesService } from '../services/notes.service.js'

export const notesController = {
  uploadDocument: async (req, res, next) => {
    try {
      const userId = req.user.id
      const file = req.file
      const result = await notesService.uploadDocument(userId, file, req.body)
      res.status(201).json(result)
    } catch (error) {
      next(error)
    }
  },

  getNotes: async (req, res, next) => {
    try {
      const userId = req.user.id
      const notes = await notesService.getNotesByUserId(userId, req.query)
      res.status(200).json({ notes })
    } catch (error) {
      next(error)
    }
  },

  getLibraryMeta: async (req, res, next) => {
    try {
      const userId = req.user.id
      const meta = await notesService.getLibraryMeta(userId)
      res.status(200).json(meta)
    } catch (error) {
      next(error)
    }
  },

  getWhiteboards: async (req, res, next) => {
    try {
      const userId = req.user.id
      const result = await notesService.getWhiteboards(userId)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  createWhiteboard: async (req, res, next) => {
    try {
      const userId = req.user.id
      const result = await notesService.createWhiteboard(userId, req.body)
      res.status(201).json(result)
    } catch (error) {
      next(error)
    }
  },

  getWhiteboard: async (req, res, next) => {
    try {
      const userId = req.user.id
      const result = await notesService.getWhiteboard(req.params.id, userId)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  saveWhiteboard: async (req, res, next) => {
    try {
      const userId = req.user.id
      const result = await notesService.saveWhiteboard(req.params.id, userId, req.body)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  getNoteById: async (req, res, next) => {
    try {
      const { id } = req.params
      const userId = req.user.id
      const note = await notesService.getNoteById(id, userId)
      res.status(200).json(note)
    } catch (error) {
      next(error)
    }
  },

  updateNoteMetadata: async (req, res, next) => {
    try {
      const { id } = req.params
      const userId = req.user.id
      const note = await notesService.updateNoteMetadata(id, userId, req.body)
      res.status(200).json(note)
    } catch (error) {
      next(error)
    }
  },

  deleteNote: async (req, res, next) => {
    try {
      const { id } = req.params
      const userId = req.user.id
      const result = await notesService.deleteNote(id, userId)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  generateFlashcards: async (req, res, next) => {
    try {
      const { id } = req.params
      const userId = req.user.id
      const result = await notesService.generateFlashcards(id, userId)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  generateMindMap: async (req, res, next) => {
    try {
      const { id } = req.params
      const userId = req.user.id
      const result = await notesService.generateMindMap(id, userId)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  generateQuestions: async (req, res, next) => {
    try {
      const { id } = req.params
      const { bloomLevel } = req.body
      const userId = req.user.id
      const result = await notesService.generateQuestions(id, userId, bloomLevel)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },
}
