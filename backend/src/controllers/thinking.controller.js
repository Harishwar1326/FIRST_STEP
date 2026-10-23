import { thinkingService } from '../services/thinking.service.js'
import { asyncHandler } from '../utils/errorHandler.js'

const defaultGuestUser = {
  id: 'guest-thinking-lab',
  email: 'guest@example.com',
  name: 'Guest Student',
  role: 'student',
}

const asThinkingUser = (user) => user && user.id ? user : defaultGuestUser

export const thinkingController = {
  getThinkingLabFeed: asyncHandler(async (req, res) => {
    const feed = await thinkingService.getFeed(req.user, req.query)
    res.status(200).json({
      status: 'success',
      data: { items: feed },
      message: 'Thinking lab feed retrieved successfully'
    })
  }),

  getThinkingLabCareers: asyncHandler(async (req, res) => {
    const careers = await thinkingService.getFeed(req.user, {
      ...req.query,
      category: 'careers',
    })
    res.status(200).json({
      status: 'success',
      data: { items: careers },
      message: 'Career thinking feed retrieved successfully'
    })
  }),

  getIndiaThinkingChallenges: asyncHandler(async (req, res) => {
    const challenges = thinkingService.getIndiaThinkingChallenges()
    res.status(200).json({
      status: 'success',
      data: { challenges },
      message: 'India thinking challenges retrieved successfully'
    })
  }),

  submitIndiaThinkingAnswer: asyncHandler(async (req, res) => {
    const evaluation = await thinkingService.evaluateIndiaThinkingAnswer(
      asThinkingUser(req.user),
      req.params.id,
      req.body
    )
    res.status(200).json({
      status: 'success',
      data: { evaluation },
      message: 'India thinking answer submitted and evaluated successfully'
    })
  }),

  getThinkingLabNearby: asyncHandler(async (req, res) => {
    const nearby = await thinkingService.getNearby(asThinkingUser(req.user), req.query)
    res.status(200).json({
      status: 'success',
      data: { items: nearby },
      message: 'Nearby thinking cards retrieved successfully'
    })
  }),

  createThinkingLabNearby: asyncHandler(async (req, res) => {
    const nearby = await thinkingService.getNearbyKnowledgeCards(
      asThinkingUser(req.user),
      req.body
    )
    res.status(200).json({
      status: 'success',
      data: nearby,
      message: 'Knowledge card created successfully'
    })
  }),

  getThinkingLabChallenge: asyncHandler(async (req, res) => {
    const challenge = await thinkingService.getChallenge(req.user, req.query)
    res.status(200).json({
      status: 'success',
      data: challenge,
      message: 'Thinking challenge retrieved successfully'
    })
  }),

  getThinkingLabKnowledge: asyncHandler(async (req, res) => {
    const knowledge = await thinkingService.getKnowledge(req.user, req.params.id, req.query)
    res.status(200).json({
      status: 'success',
      data: knowledge,
      message: 'Thinking knowledge retrieved successfully'
    })
  }),

  submitThinkingLabAnswer: asyncHandler(async (req, res) => {
    const result = await thinkingService.submitThinkingLabAnswer(
      asThinkingUser(req.user),
      req.params.id,
      req.body
    )
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Thinking lab answer submitted successfully'
    })
  }),

  getThinkingLabProgress: asyncHandler(async (req, res) => {
    const progress = await thinkingService.getProgress(req.user)
    res.status(200).json({
      status: 'success',
      data: progress,
      message: 'Thinking progress retrieved successfully'
    })
  }),

  getDailyChallenge: asyncHandler(async (req, res) => {
    const userId = req.user.id
    const challenge = await thinkingService.getDailyChallenge(userId)
    res.status(200).json({
      status: 'success',
      data: challenge,
      message: 'Daily challenge retrieved successfully'
    })
  }),

  submitAnswer: asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { challengeId, answer } = req.body
    const result = await thinkingService.submitAnswer(userId, challengeId, answer)
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Answer submitted successfully'
    })
  }),

  getThinkingScore: asyncHandler(async (req, res) => {
    const userId = req.user.id
    const score = await thinkingService.getThinkingScore(userId)
    res.status(200).json({
      status: 'success',
      data: score,
      message: 'Thinking score retrieved successfully'
    })
  }),

  getHistory: asyncHandler(async (req, res) => {
    const userId = req.user.id
    const history = await thinkingService.getHistory(userId)
    res.status(200).json({
      status: 'success',
      data: history,
      message: 'Thinking history retrieved successfully'
    })
  }),
}
