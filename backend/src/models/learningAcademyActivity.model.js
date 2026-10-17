import mongoose from 'mongoose'

const learningAcademyActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
      index: true,
    },
    guestId: {
      type: String,
      required: false,
      index: true,
    },
    sessionId: {
      type: String,
      required: false,
      index: true,
    },
    topic: { type: String, required: true, index: true },
    subject: { type: String },
    difficulty: {
      type: String,
      enum: ['beginner', 'easy', 'medium', 'hard', 'expert'],
      default: 'medium',
    },
    attempts: { type: Number, default: 0 },
    predictionAccuracy: { type: Number, min: 0, max: 100 },
    understanding: { type: Number, min: 0, max: 100 },
    misconception: { type: String },
    misconceptionFixed: { type: Boolean, default: false },
    teachBackScore: { type: Number, min: 0, max: 100 },
    teachBackMisconceptions: [{ type: String }],
    completion: { type: Number, min: 0, max: 100, default: 0 },
    stages: {
      explored: { type: Boolean, default: false },
      predicted: { type: Boolean, default: false },
      learned: { type: Boolean, default: false },
      experimented: { type: Boolean, default: false },
      explained: { type: Boolean, default: false },
      improved: { type: Boolean, default: false },
    },
    lastMode: {
      type: String,
      enum: ['ai-learning', 'mission', 'predict', 'teach-back', 'misconception', 'what-if', 'legacy-lesson'],
    },
    missionId: { type: String },
    meta: { type: Object, default: () => ({}) },
  },
  {
    timestamps: true,
  }
)

learningAcademyActivitySchema.index({ userId: 1, topic: 1, updatedAt: -1 })
learningAcademyActivitySchema.index({ createdAt: -1 })

export const LearningAcademyActivity = mongoose.model(
  'LearningAcademyActivity',
  learningAcademyActivitySchema
)

export default LearningAcademyActivity
