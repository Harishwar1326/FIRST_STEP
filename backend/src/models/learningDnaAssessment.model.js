import mongoose from 'mongoose'

const learningDnaAssessmentSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    responses: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    features: {
      studyHours: { type: Number, default: 0 },
      consistency: { type: Number, default: 0 },
      confidence: { type: Number, default: 0 },
      knowledgeLevel: { type: Number, default: 0 },
      motivation: { type: Number, default: 0 },
      studyAvailability: { type: Number, default: 0 },
      problemSolving: { type: Number, default: 0 },
      academicPerformance: { type: Number, default: 0 },
    },
    capabilityProfile: {
      programming: { type: Number, default: 0 },
      problemSolving: { type: Number, default: 0 },
      consistency: { type: Number, default: 0 },
      confidence: { type: Number, default: 0 },
      academicPerformance: { type: Number, default: 0 },
    },
    assessmentScore: {
      type: Number,
      default: 0,
    },
    insights: {
      strengths: [String],
      areasToImprove: [String],
      learningPreference: String,
      studyAvailability: String,
      currentCapability: String,
      primaryGoal: String,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

export const LearningDnaAssessment = mongoose.model('LearningDnaAssessment', learningDnaAssessmentSchema)
export default LearningDnaAssessment
