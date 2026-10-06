import { academyService } from '../services/academy.service.js'

export const academyController = {
  getStudyPlan: async (req, res, next) => {
    try {
      const userId = req.user.id
      const plan = await academyService.getStudyPlan(userId)
      res.status(200).json(plan)
    } catch (error) {
      next(error)
    }
  },

  getTodayTasks: async (req, res, next) => {
    try {
      const userId = req.user.id
      const tasks = await academyService.getTodayTasks(userId)
      res.status(200).json(tasks)
    } catch (error) {
      next(error)
    }
  },

  getFlashcards: async (req, res, next) => {
    try {
      const userId = req.user.id
      const flashcards = await academyService.getFlashcards(userId)
      res.status(200).json(flashcards)
    } catch (error) {
      next(error)
    }
  },

  submitFlashcardReview: async (req, res, next) => {
    try {
      const userId = req.user.id
      const { cardId, rating } = req.body
      const result = await academyService.submitFlashcardReview(userId, cardId, rating)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  getStreak: async (req, res, next) => {
    try {
      const userId = req.user.id
      const streak = await academyService.getStreak(userId)
      res.status(200).json(streak)
    } catch (error) {
      next(error)
    }
  },

  updateStreak: async (req, res, next) => {
    try {
      const userId = req.user.id
      const result = await academyService.updateStreak(userId)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  getTechniqueRecommendation: async (req, res, next) => {
    try {
      const userId = req.params.studentId || req.user.id
      const subject = req.query.subject || req.body?.subject
      const result = await academyService.getTechniqueRecommendation(userId, subject)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  getStudentProfile: async (req, res, next) => {
    try {
      const userId = req.params.studentId || req.user.id
      const result = await academyService.getStudentProfile(userId)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  getAllTechniques: async (req, res, next) => {
    try {
      const result = academyService.getTechniquesCatalog()
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  getTechniqueById: async (req, res, next) => {
    try {
      const { techniqueId } = req.params
      const result = academyService.getTechniqueById(techniqueId)
      if (!result) return res.status(404).json({ message: 'Technique not found' })
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  recordTechniqueSession: async (req, res, next) => {
    try {
      const userId = req.user.id
      const sessionData = req.body
      const result = await academyService.recordTechniqueSession(userId, sessionData)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  getProgress: async (req, res, next) => {
    try {
      const userId = req.params.studentId || req.user.id
      const result = await academyService.getStudentTechniqueProgress(userId)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  evaluateSituation: async (req, res, next) => {
    try {
      const userId = req.user.id
      const situationInputs = req.body
      const result = await academyService.evaluateSituation(userId, situationInputs)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  submitFeedback: async (req, res, next) => {
    try {
      const userId = req.user.id
      const feedbackData = req.body
      const result = await academyService.saveTechniqueFeedback(userId, feedbackData)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  recordActivity: async (req, res, next) => {
    try {
      res.status(200).json({ success: true, message: 'Activity signal logged successfully' })
    } catch (error) {
      next(error)
    }
  },
}


