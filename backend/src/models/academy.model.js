import mongoose from 'mongoose'

const studyPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    weeklyGoals: [{
      subject: String,
      topics: [String],
      targetHours: Number,
    }],
    dailyTasks: [{
      title: String,
      technique: String,
      duration: String,
      completed: Boolean,
      priority: String,
      date: Date,
    }],
    techniques: [{
      type: String,
      enabled: Boolean,
    }],
    estimatedCompletion: Date,
  },
  {
    timestamps: true,
  }
)

const flashcardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    noteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
    },
    front: {
      type: String,
      required: true,
    },
    back: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    intervalIndex: {
      type: Number,
      default: 0,
    },
    lastReview: Date,
    nextReview: {
      type: Date,
      default: Date.now,
    },
    rating: Number,
    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

const studyStreakSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastStudyDate: Date,
    history: [{
      date: Date,
      streak: Number,
    }],
  },
  {
    timestamps: true,
  }
)

const techniqueRecommendationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    primaryTechnique: {
      type: String,
      required: true,
    },
    primaryScore: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    secondaryTechniques: [
      {
        name: String,
        score: Number,
        reason: String,
      },
    ],
    profileSnapshot: {
      recall: Number,
      retention: Number,
      consistency: Number,
      focus: Number,
      practice: Number,
      understanding: Number,
      speed: Number,
      revision: Number,
      accuracy: Number,
      engagement: Number,
    },
    sevenDayPlan: [
      {
        day: Number,
        title: String,
        activity: String,
        duration: String,
      },
    ],
    recommendedAction: {
      subject: String,
      topic: String,
      duration: Number,
      activity: String,
    },
  },
  {
    timestamps: true,
  }
)

const techniqueSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    techniqueId: {
      type: String,
      required: true,
    },
    techniqueName: {
      type: String,
      required: true,
    },
    subject: String,
    topic: String,
    durationMinutes: Number,
    activityType: {
      type: String,
      enum: ['5min', '15min', '30min', 'custom'],
      default: '15min',
    },
    feedbackScore: Number, // 1 to 5
    notesCreated: String,
    quizScoreBefore: Number,
    quizScoreAfter: Number,
  },
  {
    timestamps: true,
  }
)

const studentTechniquePerformanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    techniqueId: {
      type: String,
      required: true,
    },
    sessionCount: {
      type: Number,
      default: 1,
    },
    totalTimeSpentMinutes: {
      type: Number,
      default: 0,
    },
    avgQuizScoreBefore: Number,
    avgQuizScoreAfter: Number,
    retentionImprovement: Number, // percentage gain
    lastUsedAt: Date,
  },
  {
    timestamps: true,
  }
)

const studentLearningSituationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timeAvailable: String,
    goal: String,
    subject: String,
    difficulty: String,
    interestLevel: String,
    preparationLevel: String,
    confidenceLevel: String,
    mainProblem: String,
  },
  {
    timestamps: true,
  }
)

const techniqueFeedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    techniqueId: String,
    sessionId: mongoose.Schema.Types.ObjectId,
    usefulnessRating: String, // 'Not useful', 'Slightly useful', 'Useful', 'Very useful', 'Extremely useful'
    wouldUseAgain: String, // 'Yes', 'Maybe', 'No'
    performanceBefore: Number,
    performanceAfter: Number,
  },
  {
    timestamps: true,
  }
)

export const StudyPlan = mongoose.model('StudyPlan', studyPlanSchema)
export const Flashcard = mongoose.model('Flashcard', flashcardSchema)
export const StudyStreak = mongoose.model('StudyStreak', studyStreakSchema)
export const TechniqueRecommendation = mongoose.model('TechniqueRecommendation', techniqueRecommendationSchema)
export const TechniqueSession = mongoose.model('TechniqueSession', techniqueSessionSchema)
export const StudentTechniquePerformance = mongoose.model('StudentTechniquePerformance', studentTechniquePerformanceSchema)
export const StudentLearningSituation = mongoose.model('StudentLearningSituation', studentLearningSituationSchema)
export const TechniqueFeedback = mongoose.model('TechniqueFeedback', techniqueFeedbackSchema)


