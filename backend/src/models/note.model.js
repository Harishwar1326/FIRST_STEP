import mongoose from 'mongoose'

const noteSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      default: 'General',
      trim: true,
    },
    folder: {
      type: String,
      default: 'Inbox',
      trim: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    isFavorite: {
      type: Boolean,
      default: false,
    },
    isBookmarked: {
      type: Boolean,
      default: false,
    },
    lastOpenedAt: {
      type: Date,
    },
    activity: [{
      type: {
        type: String,
        enum: ['uploaded', 'processed', 'renamed', 'moved', 'tagged', 'opened', 'favorited', 'bookmarked', 'failed', 'deleted'],
        required: true,
      },
      label: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    originalName: {
      type: String,
    },
    fileName: {
      type: String,
    },
    filePath: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
    },
    size: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['processing', 'processed', 'failed'],
      default: 'processing',
    },
    content: {
      type: String,
    },
    summary: {
      type: String,
    },
    keywords: [{
      type: String,
    }],
    concepts: [{
      type: String,
    }],
    relationships: [{
      source: String,
      target: String,
      type: String,
    }],
    difficulty: {
      type: Number,
      min: 1,
      max: 10,
    },
    estimatedStudyTime: {
      type: Number, // in minutes
    },
    aiResults: {
      revisionNotes: String,
      chapterNotes: String,
      keyConcepts: [String],
      glossary: [{
        term: String,
        definition: String,
      }],
      definitions: [String],
      formulaSheet: [String],
      quickRevisionSheet: String,
      flashcards: [{
        front: String,
        back: String,
        difficulty: String,
      }],
      mindMap: {
        nodes: Array,
        edges: Array,
      },
      questions: [{
        question: String,
        answer: String,
        bloomLevel: String,
        difficulty: String,
      }],
    },
  },
  {
    timestamps: true,
  }
)

noteSchema.index({
  title: 'text',
  subject: 'text',
  folder: 'text',
  tags: 'text',
  content: 'text',
  summary: 'text',
  keywords: 'text',
  concepts: 'text',
})

export const Note = mongoose.model('Note', noteSchema)
