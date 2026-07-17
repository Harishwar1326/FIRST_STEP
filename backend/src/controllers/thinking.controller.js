import { thinkingService } from '../services/thinking.service.js'

export const thinkingController = {
  getDailyChallenge: async (req, res, next) => {
    try {
      const userId = req.user.id
      const challenge = await thinkingService.getDailyChallenge(userId)
      res.status(200).json(challenge)
    } catch (error) {
      next(error)
    }
  },

  submitAnswer: async (req, res, next) => {
    try {
      const userId = req.user.id
      const { challengeId, answer } = req.body
      const result = await thinkingService.submitAnswer(userId, challengeId, answer)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  getThinkingScore: async (req, res, next) => {
    try {
      const userId = req.user.id
      const score = await thinkingService.getThinkingScore(userId)
      res.status(200).json(score)
    } catch (error) {
      next(error)
    }
  },

  getHistory: async (req, res, next) => {
    try {
      const userId = req.user.id
      const history = await thinkingService.getHistory(userId)
      res.status(200).json(history)
    } catch (error) {
      next(error)
    }
  },
}
