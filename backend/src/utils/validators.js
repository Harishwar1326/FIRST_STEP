import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(255, 'Name is too long'),
  email: z.string().trim().email('Invalid email address').max(254, 'Email address is too long').transform((value) => value.toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters').refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be 72 UTF-8 bytes or fewer'),
})

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(254, 'Email address is too long').transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Password is required'),
})

export const noteUploadSchema = z.object({
  title: z.string().trim().max(255).optional(),
  subject: z.string().trim().max(100).optional(),
  folder: z.string().trim().max(100).optional(),
  tags: z.union([
    z.string().max(2000),
    z.array(z.string().trim().min(1).max(64)).max(100),
  ]).optional(),
})

export const flashcardReviewSchema = z.object({
  cardId: z.string(),
  rating: z.number().min(0).max(5),
})

export const situationSchema = z.object({
  timeAvailable: z.string().trim().max(255).optional(),
  goal: z.string().trim().max(255).optional(),
  subject: z.string().trim().max(120).optional(),
  customSubject: z.string().trim().max(120).optional(),
  difficulty: z.string().trim().max(100).optional(),
  interestLevel: z.string().trim().max(100).optional(),
  preparationLevel: z.string().trim().max(100).optional(),
  confidenceLevel: z.string().trim().max(100).optional(),
  mainProblem: z.string().trim().max(500).optional(),
}).strict()

export const challengeSubmissionSchema = z.object({
  challengeId: z.string(),
  answer: z.string().min(10, 'Answer must be at least 10 characters'),
})

export const indiaChallengeAnswerSchema = z.object({
  answer: z.string().trim().min(10, 'Answer must be at least 10 characters').max(5000),
})

export const thinkingLabAnswerSchema = z.object({
  answer: z.string().trim().min(10).max(5000),
  challengeType: z.enum(['why', 'what_if', 'decision_making', 'problem_solving', 'comparison', 'cause_effect', 'prediction', 'creative']).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  question: z.string().trim().max(2000).optional(),
  topic: z.string().trim().max(255).optional(),
  timeSpentSeconds: z.number().int().min(0).max(86400).optional(),
  hintUsage: z.number().int().min(0).max(100).optional(),
}).strict()

export const nearbyDiscoverySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  studentProfile: z.object({
    name: z.string().trim().max(255).optional(),
    learningLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  }).strict().optional(),
}).strict()

export const adminLessonSchema = z.object({
  title: z.string().trim().min(1).max(255),
  class: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(120),
  chapter: z.string().trim().min(1).max(255),
  content: z.string().trim().min(1).max(200000),
  videoUrl: z.string().trim().max(2048).optional(),
  order: z.number().min(0).max(1000000),
  estimatedStudyTime: z.number().min(1).max(1440),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  isPublished: z.boolean(),
  subjectSlug: z.string().trim().max(255).optional(),
  slug: z.string().trim().max(255).optional(),
  concepts: z.array(z.string().trim().min(1).max(255)).max(100).optional(),
  prerequisites: z.array(z.string().trim().min(1).max(255)).max(100).optional(),
}).strict()

export const notificationReadSchema = z.object({
  notificationIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(100).default([]),
}).strict()

export const adminLessonIdParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Lesson ID must be a valid MongoDB ObjectId'),
}).strict()

export const adminStudentIdParamsSchema = z.object({
  id: z.coerce.number().int().min(1).max(2147483647),
}).strict()

export const techniqueSessionSchema = z.object({
  techniqueId: z.string().trim().min(1).max(100),
  techniqueName: z.string().trim().max(255).optional(),
  subject: z.string().trim().max(120).optional(),
  topic: z.string().trim().max(255).optional(),
  durationMinutes: z.number().min(1).max(1440).optional(),
  activityType: z.enum(['5min', '15min', '30min', 'custom']).optional(),
  feedbackScore: z.number().min(1).max(5).optional(),
  notesCreated: z.string().max(20000).optional(),
  quizScoreBefore: z.number().min(0).max(100).optional(),
  quizScoreAfter: z.number().min(0).max(100).optional(),
}).strict()

export const techniqueFeedbackSchema = z.object({
  techniqueId: z.string().trim().min(1).max(100),
  sessionId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  usefulnessRating: z.enum(['Not useful', 'Slightly useful', 'Useful', 'Very useful', 'Extremely useful']),
  wouldUseAgain: z.enum(['Yes', 'Maybe', 'No']),
}).strict()

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
  responses: z.record(z.unknown()),
})

export const learningQuizSubmissionSchema = z.object({
  lessonId: z.string().min(1).max(64),
  answers: z.array(z.string().max(2000)).max(100),
})

export const learningTaskSubmissionSchema = z.object({
  lessonId: z.string().min(1).max(64),
  taskData: z.object({
    taskId: z.string().max(100).optional(),
    duration: z.number().min(0).max(86400).optional(),
    readingSpeed: z.number().min(0).max(2000).optional(),
    notesText: z.string().max(20000).optional(),
    drawingStrokes: z.number().int().min(0).max(100000).optional(),
    confidenceLevel: z.number().min(1).max(5).optional(),
  }).refine((data) => Object.keys(data).length > 0, 'At least one task activity field is required'),
})

export const learningProfileUpdateSchema = z.object({
  readingSpeed: z.number().min(0).max(2000).optional(),
  confidenceLevel: z.number().min(1).max(5).optional(),
  sessionDuration: z.number().min(0).max(86400).optional(),
  drawingActivity: z.number().int().min(0).max(100000).optional(),
  attentionDuration: z.number().min(0).max(86400).optional(),
  revisionFrequency: z.number().int().min(0).max(100000).optional(),
  learningTime: z.number().min(0).max(1000000).optional(),
  skippedTopics: z.array(z.string().trim().min(1).max(255)).max(200).optional(),
  difficultyRatings: z.record(z.number().min(1).max(5)).optional(),
  flashcardPerformance: z.record(z.number().min(1).max(5)).optional(),
  mindMapUsage: z.number().int().min(0).max(100000).optional(),
}).strict().refine((data) => Object.keys(data).length > 0, 'At least one learning activity field is required')

export const twinProgressSchema = z.object({
  studySession: z.object({
    subject: z.string().trim().min(1).max(120),
    duration: z.number().min(1).max(1440),
    confidence: z.number().min(0).max(100),
  }).optional(),
  mistake: z.object({
    concept: z.string().trim().min(1).max(255),
    frequency: z.number().int().min(1).max(100000),
  }).optional(),
}).strict().refine((data) => Boolean(data.studySession || data.mistake), 'A study session or mistake is required')

export const programmingQuizSubmissionSchema = z.object({
  quizSessionId: z.string().uuid().optional(),
  answers: z.array(z.object({
    id: z.string().min(1).max(64),
    answer: z.string().max(2000),
  })).max(20),
}).superRefine(({ answers }, context) => {
  const ids = new Set()
  answers.forEach(({ id }, index) => {
    if (ids.has(id)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['answers', index, 'id'], message: 'Each question can only have one answer' })
    }
    ids.add(id)
  })
})

export const programmingNotesSchema = z.object({
  editableContent: z.string().max(50000),
}).strict()

export const noteMetadataSchema = z.object({
  title: z.string().trim().max(255).optional(),
  subject: z.string().trim().max(100).optional(),
  folder: z.string().trim().max(100).optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(100).optional(),
  isFavorite: z.boolean().optional(),
  isBookmarked: z.boolean().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, 'At least one note metadata field is required')

const boundedNotesAnalysis = z.record(z.unknown()).superRefine((value, context) => {
  if (JSON.stringify(value).length > 30000) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Analysis context is too large' })
  }
})

export const notesBlindSpotsSchema = z.object({
  analysis: boundedNotesAnalysis.nullable().optional(),
}).strict()

export const notesQuestionSchema = z.object({
  question: z.string().trim().min(1).max(2000),
}).strict()

export const notesRevisionSchema = z.object({
  minutes: z.number().int().min(1).max(120).optional(),
  analysis: boundedNotesAnalysis.nullable().optional(),
}).strict()

export const notesQuestionsSchema = z.object({
  bloomLevel: z.enum(['all', 'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']).optional(),
}).strict()

export const whiteboardSnapshotSchema = z.object({
  snapshot: z.union([
    z.record(z.unknown()).superRefine((value, context) => {
      if (Buffer.byteLength(JSON.stringify(value), 'utf8') > 8 * 1024 * 1024) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Whiteboard snapshot exceeds 8 MiB' })
      }
    }),
    z.null(),
  ]),
}).strict()

export const createWhiteboardSchema = z.object({
  title: z.string().trim().max(120).optional(),
}).strict()

export const lessonGenerationSchema = z.object({
  topic: z.string().trim().min(1, 'Topic is required').max(255),
  difficulty: z.enum(['beginner', 'medium', 'hard']).optional(),
  subject: z.string().trim().max(120).optional(),
}).strict()

export const missionGenerationSchema = z.object({
  topic: z.string().trim().min(1, 'Topic is required').max(255),
  difficulty: z.enum(['beginner', 'medium', 'hard']).optional(),
}).strict()

export const predictionGenerationSchema = z.object({
  topic: z.string().trim().min(1, 'Topic is required').max(255),
  difficulty: z.enum(['beginner', 'medium', 'hard']).optional(),
  concept: z.string().trim().max(500).optional(),
}).strict()

export const predictionSubmissionSchema = z.object({
  activityId: z.string().trim().min(1).max(64).nullable().optional(),
  topic: z.string().trim().min(1).max(255),
  predictionAnswer: z.string().trim().min(1, 'Prediction answer is required').max(5000),
  isCorrect: z.boolean().optional(),
  correctReasoning: z.string().max(5000).optional(),
  sessionId: z.string().max(64).optional(),
  guestId: z.string().max(64).optional(),
}).strict()

const boundedLessonContext = z.union([
  z.string().max(20000),
  z.record(z.unknown()).superRefine((value, context) => {
    if (JSON.stringify(value).length > 40000) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Lesson context is too large' })
    }
  }),
])

export const teachBackSchema = z.object({
  topic: z.string().trim().min(1, 'Topic is required').max(255),
  userExplanation: z.string().trim().min(10, 'Explanation is too short').max(10000),
  lesson: boundedLessonContext.nullable().optional(),
  activityId: z.string().max(64).nullable().optional(),
}).strict()

export const misconceptionSchema = z.object({
  topic: z.string().trim().min(1, 'Topic is required').max(255),
  wrongAnswer: z.string().max(5000),
  correctAnswer: z.string().max(5000),
  question: z.string().max(2000),
  activityId: z.string().max(64).nullable().optional(),
}).strict()

export const whatIfSchema = z.object({
  topic: z.string().trim().min(1, 'Topic is required').max(255),
  difficulty: z.enum(['beginner', 'medium', 'hard']).optional(),
  seedPrompt: z.string().max(2000).optional(),
  activityId: z.string().max(64).nullable().optional(),
}).strict()

export const stageCompletionSchema = z.object({
  activityId: z.string().trim().min(1).max(64),
  stage: z.enum(['explored', 'predicted', 'learned', 'experimented', 'explained', 'improved']),
  topic: z.string().trim().max(255).optional(),
}).strict()

export const resolveMisconceptionSchema = z.object({
  activityId: z.string().trim().min(1).max(64),
}).strict()

export const validate = (schema) => {
  return function validateRequest(req, res, next) {
    try {
      req.body = schema.parse(req.body)
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

export const validateParams = (schema) => {
  return function validateRouteParams(req, res, next) {
    try {
      req.params = schema.parse(req.params)
      next()
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      })
    }
  }
}
