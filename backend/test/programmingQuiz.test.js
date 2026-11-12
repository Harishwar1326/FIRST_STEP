import test from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import Lesson from '../src/models/lesson.model.js'
import { QuizResult, SmartLessonNote } from '../src/models/programmingLearning.model.js'
import { gradeMultipleChoiceQuiz, programmingLearningService } from '../src/services/programmingLearning.service.js'
import { programmingNotesSchema, programmingQuizSubmissionSchema } from '../src/utils/validators.js'

test('programming quiz scores only objectively graded multiple-choice answers', () => {
  const quiz = [
    { id: 'mcq-1', type: 'mcq', concept: 'loops', correctAnswer: 'for' },
    { id: 'short-1', type: 'short', concept: 'loops' },
  ]
  const result = gradeMultipleChoiceQuiz(quiz, [
    { id: 'mcq-1', answer: 'for' },
    { id: 'short-1', answer: 'x'.repeat(200) },
  ])

  assert.deepEqual(result, {
    correctCount: 1,
    totalQuestions: 1,
    score: 100,
    weakConcepts: [],
  })
})

test('programming quiz submission rejects oversized answers and duplicate question IDs', () => {
  assert.equal(programmingQuizSubmissionSchema.safeParse({ answers: [{ id: 'q1', answer: 'x'.repeat(2001) }] }).success, false)
  assert.equal(programmingQuizSubmissionSchema.safeParse({ answers: [{ id: 'q1', answer: 'a' }, { id: 'q1', answer: 'b' }] }).success, false)
})

test('programming lesson notes accept bounded page content and reject extra fields', () => {
  assert.equal(programmingNotesSchema.safeParse({ editableContent: 'My lesson notes.' }).success, true)
  assert.equal(programmingNotesSchema.safeParse({ editableContent: 'x'.repeat(50001) }).success, false)
  assert.equal(programmingNotesSchema.safeParse({ editableContent: '', userId: 'another-student' }).success, false)
})

test('unknown lesson IDs in offline catalog return a not-found error instead of a server error', async (t) => {
  if (mongoose.connection.readyState === 1) return t.skip('requires the disconnected-database fallback')
  await assert.rejects(
    programmingLearningService.getLesson('student-1', 'not-a-catalog-lesson'),
    (error) => error.statusCode === 404 && error.message === 'Lesson not found',
  )
})

test('saving generated Programming Learning notes creates a user-owned record', async () => {
  const originalFindOne = Lesson.findOne
  const originalFindOneAndUpdate = SmartLessonNote.findOneAndUpdate
  let query
  let update
  let options
  const savedNote = { editableContent: 'My edits', saved: true }
  Lesson.findOne = () => ({ lean: async () => ({ _id: '64b000000000000000000001' }) })
  SmartLessonNote.findOneAndUpdate = async (...args) => {
    [query, update, options] = args
    return savedNote
  }
  try {
    const result = await programmingLearningService.saveNotes('student-7', '64b000000000000000000001', 'My edits')
    assert.equal(result.notes, savedNote)
    assert.deepEqual(query, { userId: 'student-7', lessonId: '64b000000000000000000001' })
    assert.deepEqual(update, { $set: { editableContent: 'My edits', saved: true } })
    assert.equal(options.upsert, true)
    assert.equal(options.runValidators, true)
  } finally {
    Lesson.findOne = originalFindOne
    SmartLessonNote.findOneAndUpdate = originalFindOneAndUpdate
  }
})

test('Programming Learning notes cannot be saved to a missing or unpublished lesson', async () => {
  const originalFindOne = Lesson.findOne
  const originalFindOneAndUpdate = SmartLessonNote.findOneAndUpdate
  let writes = 0
  Lesson.findOne = () => ({ lean: async () => null })
  SmartLessonNote.findOneAndUpdate = async () => { writes += 1 }
  try {
    await assert.rejects(
      programmingLearningService.saveNotes('student-7', '64b000000000000000000001', 'My edits'),
      (error) => error.statusCode === 404,
    )
    assert.equal(writes, 0)
  } finally {
    Lesson.findOne = originalFindOne
    SmartLessonNote.findOneAndUpdate = originalFindOneAndUpdate
  }
})

test('Programming Learning progress and quiz routes reject unpublished lessons', async () => {
  const originalFindOne = Lesson.findOne
  const originalCreate = QuizResult.create
  let writes = 0
  let lessonQuery
  Lesson.findOne = (filter) => {
    lessonQuery = filter
    return { lean: async () => null }
  }
  QuizResult.create = async () => { writes += 1 }
  try {
    await assert.rejects(
      programmingLearningService.trackLesson('student-7', '64b000000000000000000001'),
      (error) => error.statusCode === 404,
    )
    assert.deepEqual(lessonQuery, { _id: '64b000000000000000000001', isPublished: { $ne: false } })

    await assert.rejects(
      programmingLearningService.submitQuiz('student-7', '64b000000000000000000001', []),
      (error) => error.statusCode === 404,
    )
    assert.deepEqual(lessonQuery, { _id: '64b000000000000000000001', isPublished: { $ne: false } })
    assert.equal(writes, 0)
  } finally {
    Lesson.findOne = originalFindOne
    QuizResult.create = originalCreate
  }
})
