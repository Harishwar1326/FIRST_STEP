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

export const assessmentSubmissionSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.string(),
  })),
})

export const noteMetadataSchema = z.object({
  title: z.string().optional(),
  subject: z.string().optional(),
  folder: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isFavorite: z.boolean().optional(),
  isBookmarked: z.boolean().optional(),
})

export const whiteboardSnapshotSchema = z.object({
  snapshot: z.any(),
})

export const lessonGenerationSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  difficulty: z.string().optional(),
  subject: z.string().optional(),
})

export const missionGenerationSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  difficulty: z.string().optional(),
})

export const predictionGenerationSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  difficulty: z.string().optional(),
  concept: z.string().optional(),
})

export const predictionSubmissionSchema = z.object({
  activityId: z.string(),
  topic: z.string(),
  predictionAnswer: z.string().min(1, 'Prediction answer is required'),
  isCorrect: z.boolean().optional(),
  correctReasoning: z.string().optional(),
})

export const teachBackSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  userExplanation: z.string().min(10, 'Explanation is too short'),
  lesson: z.string().optional(),
  activityId: z.string().optional(),
})

export const misconceptionSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  wrongAnswer: z.string(),
  correctAnswer: z.string(),
  question: z.string(),
  activityId: z.string().optional(),
})

export const whatIfSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  difficulty: z.string().optional(),
  seedPrompt: z.string().optional(),
  activityId: z.string().optional(),
})

export const stageCompletionSchema = z.object({
  activityId: z.string(),
  stage: z.string(),
  topic: z.string().optional(),
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
        errors: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        })),
      })
    }
  }
}
