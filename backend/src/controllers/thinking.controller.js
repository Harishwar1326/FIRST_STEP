import { thinkingService } from '../services/thinking.service.js'

const defaultGuestUser = {
  id: 'guest-thinking-lab',
  email: 'guest@example.com',
  name: 'Guest Student',
  role: 'student',
}

const asThinkingUser = (user) => user && user.id ? user : defaultGuestUser

export const thinkingController = {
  getThinkingLabFeed: async (req, res, next) => {
    try {
      const feed = await thinkingService.getFeed(req.user, req.query)
      res.status(200).json({ items: feed })
    } catch (error) {
      next(error)
    }
  },

  getThinkingLabCareers: async (req, res, next) => {
    try {
      const careers = await thinkingService.getFeed(req.user, {
        ...req.query,
        category: 'careers',
      })
      res.status(200).json({ items: careers })
    } catch (error) {
      next(error)
    }
  },

  getIndiaThinkingChallenges: async (req, res, next) => {
    try {
      const challenges = thinkingService.getIndiaThinkingChallenges()
      res.status(200).json({ challenges })
    } catch (error) {
      next(error)
    }
  },

  submitIndiaThinkingAnswer: async (req, res, next) => {
    try {
      const evaluation = await thinkingService.evaluateIndiaThinkingAnswer(asThinkingUser(req.user), req.params.id, req.body)
      res.status(200).json({ evaluation })
    } catch (error) {
      next(error)
    }
  },

  getThinkingLabNearby: async (req, res, next) => {
    try {
      const nearby = await thinkingService.getNearby(asThinkingUser(req.user), req.query)
      res.status(200).json({ items: nearby })
    } catch (error) {
      next(error)
    }
  },

  createThinkingLabNearby: async (req, res, next) => {
    try {
      const nearby = await thinkingService.getNearbyKnowledgeCards(asThinkingUser(req.user), req.body)
      res.status(200).json(nearby)
    } catch (error) {
      next(error)
    }
  },

  getThinkingLabChallenge: async (req, res, next) => {
    try {
      const challenge = await thinkingService.getChallenge(req.user, req.query)
      res.status(200).json(challenge)
    } catch (error) {
      next(error)
    }
  },

  getThinkingLabKnowledge: async (req, res, next) => {
    try {
      const knowledge = await thinkingService.getKnowledge(req.user, req.params.id, req.query)
      res.status(200).json(knowledge)
    } catch (error) {
      next(error)
    }
  },

  submitThinkingLabAnswer: async (req, res, next) => {
    try {
      const result = await thinkingService.submitThinkingLabAnswer(asThinkingUser(req.user), req.params.id, req.body)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  getThinkingLabProgress: async (req, res, next) => {
    try {
      const progress = await thinkingService.getProgress(req.user)
      res.status(200).json(progress)
    } catch (error) {
      next(error)
    }
  },

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
