import mongoose from 'mongoose'

const subjectSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: String,
    color: String,
  },
  { timestamps: true },
)

const lessonProgressSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    subjectSlug: { type: String, required: true, index: true },
    watchPercentage: { type: Number, default: 0 },
    pauseCount: { type: Number, default: 0 },
    replayCount: { type: Number, default: 0 },
    playbackSpeed: { type: Number, default: 1 },
    timeSpent: { type: Number, default: 0 },
    observedWatchTime: { type: Number, default: 0 },
    watchedSegments: {
      type: [
        {
          start: Number,
          end: Number,
          _id: false,
        },
      ],
      default: [],
    },
    videoDuration: { type: Number, default: 0 },
    currentPosition: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    lastWatchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

lessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true })

const videoActivityEventSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    subjectSlug: { type: String, required: true },
    videoId: { type: String, required: true },
    sessionId: { type: String, required: true },
    eventId: { type: String, required: true },
    type: {
      type: String,
      enum: ['play', 'pause', 'resume', 'replay', 'seek', 'watch', 'speed', 'complete', 'lesson_enter', 'lesson_exit', 'buffer', 'error'],
      required: true,
    },
    position: { type: Number, min: 0, default: 0 },
    duration: { type: Number, min: 0, default: 0 },
    watchSeconds: { type: Number, min: 0, max: 30, default: 0 },
    segmentStart: { type: Number, min: 0 },
    segmentEnd: { type: Number, min: 0 },
    playbackSpeed: { type: Number, min: 0.25, max: 2 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

videoActivityEventSchema.index({ userId: 1, eventId: 1 }, { unique: true })
videoActivityEventSchema.index({ lessonId: 1, createdAt: -1 })
videoActivityEventSchema.index({ userId: 1, lessonId: 1, createdAt: -1 })

const quizResultSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, default: 8 },
    correctCount: { type: Number, default: 0 },
    weakConcepts: [String],
    answers: Array,
    feedback: String,
  },
  { timestamps: true },
)

const programmingQuizSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    questions: { type: [mongoose.Schema.Types.Mixed], required: true },
    source: { type: String, enum: ['ollama', 'adaptive-fallback'], default: 'adaptive-fallback' },
    adaptation: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['active', 'submitted'], default: 'active', index: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
)

programmingQuizSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
programmingQuizSessionSchema.index({ userId: 1, lessonId: 1, status: 1, createdAt: -1 })

const smartNoteSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    level: { type: String, enum: ['beginner', 'standard', 'advanced'], default: 'standard' },
    title: String,
    summary: String,
    keyConcepts: [String],
    definitions: [String],
    revisionNotes: [String],
    commonMistakes: [String],
    codingTips: [String],
    mindMap: [{ parent: String, child: String }],
    mcqs: Array,
    flashcards: Array,
    editableContent: String,
    saved: { type: Boolean, default: false },
  },
  { timestamps: true },
)

smartNoteSchema.index({ userId: 1, lessonId: 1 }, { unique: true })

const drawingSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    title: String,
    dataUrl: String,
    notes: String,
  },
  { timestamps: true },
)

const lessonFlashcardSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    front: String,
    back: String,
    concept: String,
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    bookmarked: { type: Boolean, default: false },
    reviewLater: { type: Boolean, default: false },
  },
  { timestamps: true },
)

export const ProgrammingSubject = mongoose.model('ProgrammingSubject', subjectSchema)
export const LessonProgress = mongoose.model('LessonProgress', lessonProgressSchema)
export const VideoActivityEvent = mongoose.model('VideoActivityEvent', videoActivityEventSchema)
export const QuizResult = mongoose.model('QuizResult', quizResultSchema)
export const ProgrammingQuizSession = mongoose.model('ProgrammingQuizSession', programmingQuizSessionSchema)
export const SmartLessonNote = mongoose.model('SmartLessonNote', smartNoteSchema)
export const LessonDrawing = mongoose.model('LessonDrawing', drawingSchema)
export const LessonFlashcard = mongoose.model('LessonFlashcard', lessonFlashcardSchema)
