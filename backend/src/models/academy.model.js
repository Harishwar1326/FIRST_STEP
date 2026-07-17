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

export const StudyPlan = mongoose.model('StudyPlan', studyPlanSchema)
export const Flashcard = mongoose.model('Flashcard', flashcardSchema)
export const StudyStreak = mongoose.model('StudyStreak', studyStreakSchema)
