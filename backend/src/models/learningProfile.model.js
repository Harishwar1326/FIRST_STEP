import mongoose from 'mongoose';

const learningProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    // Legacy-compatible observed assessment score; unvalidated model estimates stay unset.
    masteryScore: {
      type: Number,
      default: null, // populated only after evidence-backed prediction
    },
    retentionProbability: {
      type: Number,
      default: null, // populated only after evidence-backed prediction
    },
    learningStyle: {
      type: String,
      // Persist explicit student-selected assessment preference only. Behavioral
      // telemetry is not a valid basis for diagnosing a fixed learning style.
      enum: [
        'Visual', 'Text', 'Practice-Oriented', 'Mixed',
        'Video-first learning', 'Reading and notes', 'Practice-heavy learning',
        'Project-based learning', 'Practice + Projects', 'Mixed learning',
      ],
      default: 'Mixed',
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Advanced'],
      default: null,
    },
    predictionSource: { type: String, default: null },
    predictionTrainingData: { type: String, default: null },
    difficultySource: { type: String, default: null },

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
      default: null,
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
      default: null,
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
