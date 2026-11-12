import { programmingLearningService } from '../services/programmingLearning.service.js'
import { asyncHandler } from '../utils/errorHandler.js'

const getUserId = (req) => String(req.user?.id || req.user?._id || '')

export const programmingLearningController = {
  seed: asyncHandler(async (req, res) => {
    const result = await programmingLearningService.seed()
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Programming curriculum seeded successfully'
    })
  }),

  subjects: asyncHandler(async (req, res) => {
    const result = await programmingLearningService.listSubjects(getUserId(req))
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Programming subjects retrieved successfully'
    })
  }),

  lesson: asyncHandler(async (req, res) => {
    const result = await programmingLearningService.getLesson(getUserId(req), req.params.id)
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Programming lesson retrieved successfully'
    })
  }),

  track: asyncHandler(async (req, res) => {
    if (!getUserId(req)) return res.status(401).json({ status: 'error', message: 'Authenticated student is required' })
    const result = await programmingLearningService.trackLesson(getUserId(req), req.params.id, req.body)
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Lesson progress tracked successfully'
    })
  }),

  videoEvent: asyncHandler(async (req, res) => {
    if (!getUserId(req)) return res.status(401).json({ status: 'error', message: 'Authenticated student is required' })
    const result = await programmingLearningService.recordVideoEvent(getUserId(req), req.params.id, req.body)
    res.status(202).json({ status: 'success', data: result, message: 'Video activity event recorded' })
  }),

  dashboard: asyncHandler(async (req, res) => {
    const result = await programmingLearningService.getDashboardAnalytics(getUserId(req))
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Programming dashboard analytics retrieved successfully'
    })
  }),

  submitQuiz: asyncHandler(async (req, res) => {
    const result = await programmingLearningService.submitQuiz(
      getUserId(req), req.params.id, req.body.answers || [], req.body.quizSessionId || null,
    )
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Programming quiz submitted successfully'
    })
  }),

  saveNotes: asyncHandler(async (req, res) => {
    const result = await programmingLearningService.saveNotes(getUserId(req), req.params.id, req.body.editableContent || '')
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Programming notes saved successfully'
    })
  }),

  recommendations: asyncHandler(async (req, res) => {
    const result = await programmingLearningService.getRecommendations(getUserId(req))
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Programming recommendations retrieved successfully'
    })
  }),
}
