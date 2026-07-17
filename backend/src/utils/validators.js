import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const noteUploadSchema = z.object({
  title: z.string().optional(),
  subject: z.string().optional(),
})

export const flashcardReviewSchema = z.object({
  cardId: z.string(),
  rating: z.number().min(0).max(5),
})

export const challengeSubmissionSchema = z.object({
  challengeId: z.string(),
  answer: z.string().min(10, 'Answer must be at least 10 characters'),
})

export const progressUpdateSchema = z.object({
  studySession: z.object({
    date: z.date().optional(),
    duration: z.number(),
    subject: z.string(),
    accuracy: z.number(),
  }).optional(),
  mistake: z.object({
    concept: z.string(),
    frequency: z.number(),
  }).optional(),
})

export const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body)
      next()
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: error.errors,
      })
    }
  }
}
