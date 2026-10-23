import { learningAssessmentService } from '../services/learningAssessment.service.js'
import { asyncHandler } from '../utils/errorHandler.js'

const getUserId = (req) => String(req.user?.id || req.user?._id || '')

export const learningAssessmentController = {
  questions: asyncHandler(async (req, res) => {
    const questions = learningAssessmentService.getQuestions()
    res.status(200).json({
      status: 'success',
      data: questions,
      message: 'Assessment questions retrieved successfully'
    })
  }),

  me: asyncHandler(async (req, res) => {
    const assessment = await learningAssessmentService.getAssessmentForUser(getUserId(req))
    res.status(200).json({
      status: 'success',
      data: assessment,
      message: 'User assessment retrieved successfully'
    })
  }),

  submit: asyncHandler(async (req, res) => {
    const assessment = await learningAssessmentService.submitAssessment(getUserId(req), req.body.responses || {})
    res.status(200).json({
      status: 'success',
      data: { completed: true, assessment },
      message: 'Assessment submitted successfully'
    })
  }),
}
