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
      const userId = req.user.id
      const { subject } = req.body
      const result = await academyService.getTechniqueRecommendation(userId, subject)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },
}
