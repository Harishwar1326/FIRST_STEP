import mongoose from 'mongoose'

const learningTwinSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    learningStyle: {
      type: String,
      enum: ['visual', 'auditory', 'kinesthetic', 'reading'],
      default: 'visual',
    },
    attentionPattern: {
      type: String,
      enum: ['focused', 'distributed', 'alternating'],
      default: 'focused',
    },
    knowledgeScore: {
      type: Number,
      default: 0,
    },
    skillProgress: {
      totalSessions: {
        type: Number,
        default: 0,
      },
      totalTime: {
        type: Number,
        default: 0,
      },
      averageAccuracy: {
        type: Number,
        default: 0,
      },
    },
    strengths: [{
      subject: String,
      score: Number,
      trend: String,
    }],
    weaknesses: [{
      subject: String,
      score: Number,
      trend: String,
    }],
    studySessions: [{
      date: Date,
      duration: Number,
      subject: String,
      accuracy: Number,
    }],
    mistakes: [{
      concept: String,
      frequency: Number,
      lastOccurrence: Date,
    }],
    weakTopics: [{
      topic: String,
      severity: String,
    }],
  },
  {
    timestamps: true,
  }
)

export const LearningTwin = mongoose.model('LearningTwin', learningTwinSchema)
