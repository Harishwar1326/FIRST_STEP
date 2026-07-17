import mongoose from 'mongoose';

const learningProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    // Predicted Metrics from ML
    masteryScore: {
      type: Number,
      default: 50, // 0 - 100
    },
    retentionProbability: {
      type: Number,
      default: 0.8, // 0.0 - 1.0
    },
    learningStyle: {
      type: String,
      enum: ['Visual', 'Text', 'Practice-Oriented', 'Mixed'],
      default: 'Mixed',
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Advanced'],
      default: 'Medium',
    },

    // Concept Trackers
    weakConcepts: [
      {
        type: String,
      },
    ],
    correctConcepts: [
      {
        type: String,
      },
    ],
    wrongConcepts: [
      {
        type: String,
      },
    ],

    // Behavioral Metrics Collected
    learningTime: {
      type: Number, // total learning time in minutes
      default: 0,
    },
    readingSpeed: {
      type: Number, // words per minute (WPM)
      default: 150,
    },
    quizScores: [
      {
        quizId: mongoose.Schema.Types.ObjectId,
        score: Number,
        totalQuestions: Number,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    mistakePatterns: [
      {
        concept: String,
        count: { type: Number, default: 1 },
        lastOccurred: { type: Date, default: Date.now },
      },
    ],
    revisionFrequency: {
      type: Number, // number of times user revised topics
      default: 0,
    },
    attentionDuration: {
      type: Number, // average focused attention duration in seconds
      default: 1200, // 20 minutes default
    },
    skippedTopics: [
      {
        type: String,
      },
    ],
    confidenceLevel: {
      type: Number, // average subjective confidence level (1-5)
      default: 3,
    },
    difficultyRatings: {
      type: Map,
      of: Number, // lessonId string -> rating (1-5)
      default: {},
    },
    flashcardPerformance: {
      type: Map,
      of: Number, // cardId string -> rating (1-5)
      default: {},
    },
    mindMapUsage: {
      type: Number, // count of mind maps generated/interacted
      default: 0,
    },
    sessionDuration: {
      type: Number, // average study session duration in seconds
      default: 1800, // 30 minutes
    },
    challengePerformance: {
      type: Number, // average challenge success rate (0-100)
      default: 0,
    },
    manualNotes: [
      {
        lessonId: mongoose.Schema.Types.ObjectId,
        noteContent: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    drawingActivity: {
      type: Number, // number of canvas sketch strokes completed
      default: 0,
    },
    studyStreak: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const LearningProfile = mongoose.model('LearningProfile', learningProfileSchema);
export default LearningProfile;
