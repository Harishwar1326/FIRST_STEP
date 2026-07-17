import mongoose from 'mongoose'

const challengeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['case-study', 'scenario', 'logic-puzzle', 'design-thinking', 'reflection'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    bloomLevel: {
      type: String,
      enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'],
      required: true,
    },
    timeLimit: String,
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    points: {
      type: Number,
      default: 100,
    },
    expectedAnswer: String,
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge',
      required: true,
    },
    challengeTitle: String,
    answer: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    feedback: String,
    reasoning: String,
  },
  {
    timestamps: true,
  }
)

const thinkingSkillsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    overallScore: {
      type: Number,
      default: 0,
    },
    criticalThinking: {
      type: Number,
      default: 0,
    },
    problemSolving: {
      type: Number,
      default: 0,
    },
    creativity: {
      type: Number,
      default: 0,
    },
    logicalReasoning: {
      type: Number,
      default: 0,
    },
    trends: {
      criticalThinking: String,
      problemSolving: String,
      creativity: String,
      logicalReasoning: String,
    },
  },
  {
    timestamps: true,
  }
)

export const Challenge = mongoose.model('Challenge', challengeSchema)
export const Submission = mongoose.model('Submission', submissionSchema)
export const ThinkingSkills = mongoose.model('ThinkingSkills', thinkingSkillsSchema)
