import { learningAssessmentService } from '../services/learningAssessment.service.js'

const getUserId = (req) => String(req.user?.id || req.user?._id || '')

export const learningAssessmentController = {
  questions: async (req, res, next) => {
    try {
      res.status(200).json(learningAssessmentService.getQuestions())
    } catch (error) {
      next(error)
    }
  },

  me: async (req, res, next) => {
    try {
      res.status(200).json(await learningAssessmentService.getAssessmentForUser(getUserId(req)))
    } catch (error) {
      next(error)
    }
  },

  submit: async (req, res, next) => {
    try {
      const assessment = await learningAssessmentService.submitAssessment(getUserId(req), req.body.responses || {})
      res.status(200).json({ completed: true, assessment })
    } catch (error) {
      next(error)
    }
  },
}
