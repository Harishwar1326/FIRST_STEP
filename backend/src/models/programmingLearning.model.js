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
    completed: { type: Boolean, default: false },
    lastWatchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

lessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true })

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
export const QuizResult = mongoose.model('QuizResult', quizResultSchema)
export const SmartLessonNote = mongoose.model('SmartLessonNote', smartNoteSchema)
export const LessonDrawing = mongoose.model('LessonDrawing', drawingSchema)
export const LessonFlashcard = mongoose.model('LessonFlashcard', lessonFlashcardSchema)
