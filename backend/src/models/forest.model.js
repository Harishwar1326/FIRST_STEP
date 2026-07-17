import mongoose from 'mongoose'

const knowledgeGraphSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    nodes: [{
      id: String,
      name: String,
      category: String,
      mastery: Number,
      connections: Number,
      difficulty: String,
    }],
    edges: [{
      source: String,
      target: String,
      type: String,
      strength: Number,
    }],
    gaps: [{
      concept: String,
      reason: String,
      priority: String,
    }],
  },
  {
    timestamps: true,
  }
)

const learningPathSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    steps: [{
      order: Number,
      concept: String,
      status: String,
      prerequisites: [String],
    }],
    currentStep: {
      type: Number,
      default: 1,
    },
    progress: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

export const KnowledgeGraph = mongoose.model('KnowledgeGraph', knowledgeGraphSchema)
export const LearningPath = mongoose.model('LearningPath', learningPathSchema)
