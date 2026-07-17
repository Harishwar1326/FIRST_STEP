import { programmingLearningService } from '../services/programmingLearning.service.js'

const getUserId = (req) => String(req.user?.id || req.user?._id || 'demo-user')

export const programmingLearningController = {
  seed: async (req, res, next) => {
    try {
      res.status(200).json(await programmingLearningService.seed())
    } catch (error) {
      next(error)
    }
  },

  subjects: async (req, res, next) => {
    try {
      res.status(200).json(await programmingLearningService.listSubjects(getUserId(req)))
    } catch (error) {
      next(error)
    }
  },

  lesson: async (req, res, next) => {
    try {
      res.status(200).json(await programmingLearningService.getLesson(getUserId(req), req.params.id))
    } catch (error) {
      next(error)
    }
  },

  track: async (req, res, next) => {
    try {
      res.status(200).json(await programmingLearningService.trackLesson(getUserId(req), req.params.id, req.body))
    } catch (error) {
      next(error)
    }
  },

  submitQuiz: async (req, res, next) => {
    try {
      res.status(200).json(await programmingLearningService.submitQuiz(getUserId(req), req.params.id, req.body.answers || []))
    } catch (error) {
      next(error)
    }
  },

  saveNotes: async (req, res, next) => {
    try {
      res.status(200).json(await programmingLearningService.saveNotes(getUserId(req), req.params.id, req.body.editableContent || ''))
    } catch (error) {
      next(error)
    }
  },

  saveDrawing: async (req, res, next) => {
    try {
      res.status(201).json(await programmingLearningService.saveDrawing(getUserId(req), req.params.id, req.body))
    } catch (error) {
      next(error)
    }
  },

  recommendations: async (req, res, next) => {
    try {
      res.status(200).json(await programmingLearningService.getRecommendations(getUserId(req)))
    } catch (error) {
      next(error)
    }
  },
}
