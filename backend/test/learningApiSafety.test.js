import test from 'node:test'
import assert from 'node:assert/strict'
import { Lesson } from '../src/models/lesson.model.js'
import { getPassedQuizIds, learningService } from '../src/services/learning.service.js'
import aiServiceClient from '../src/utils/aiServiceClient.js'
import {
  learningProfileUpdateSchema,
  learningQuizSubmissionSchema,
  learningTaskSubmissionSchema,
} from '../src/utils/validators.js'

test('student lesson queries exclude unpublished drafts', async () => {
  const originalFind = Lesson.find
  let query
  Lesson.find = (filter) => {
    query = filter
    return { sort: async () => [] }
  }
  try {
    await learningService.getLessons({ class: 'Class 10', subject: 'Mathematics' })
    assert.deepEqual(query, {
      isPublished: { $ne: false },
      class: 'Class 10',
      subject: 'Mathematics',
    })
  } finally {
    Lesson.find = originalFind
  }
})

test('lesson details treat unpublished lessons as not found', async () => {
  const originalFindOne = Lesson.findOne
  let query
  Lesson.findOne = async (filter) => {
    query = filter
    return null
  }
  try {
    await assert.rejects(learningService.getLessonById('64b000000000000000000001'), (error) => error.statusCode === 404)
    assert.deepEqual(query, { _id: '64b000000000000000000001', isPublished: { $ne: false } })
  } finally {
    Lesson.findOne = originalFindOne
  }
})

test('learning profile updates reject account identity and server-derived score fields', () => {
  assert.equal(learningProfileUpdateSchema.safeParse({ userId: 'another-student' }).success, false)
  assert.equal(learningProfileUpdateSchema.safeParse({ masteryScore: 100 }).success, false)
  assert.equal(learningProfileUpdateSchema.safeParse({ confidenceLevel: 4 }).success, true)
})

test('legacy learning quiz and task endpoints accept only bounded payloads', () => {
  assert.equal(learningQuizSubmissionSchema.safeParse({ lessonId: '64b000000000000000000001', answers: ['a', 'b'] }).success, true)
  assert.equal(learningQuizSubmissionSchema.safeParse({ lessonId: 'x', answers: [42] }).success, false)
  assert.equal(learningTaskSubmissionSchema.safeParse({ lessonId: '64b000000000000000000001', taskData: { confidenceLevel: 4 } }).success, true)
  assert.equal(learningTaskSubmissionSchema.safeParse({ lessonId: 'x', taskData: { confidenceLevel: 9 } }).success, false)
})

test('only passing quiz attempts count toward lesson prerequisite completion', () => {
  const passed = getPassedQuizIds([
    { quizId: 'quiz-zero', score: 0, totalQuestions: 5 },
    { quizId: 'quiz-low', score: 3, totalQuestions: 5 },
    { quizId: 'quiz-pass', score: 4, totalQuestions: 5 },
    { quizId: 'quiz-empty', score: 0, totalQuestions: 0 },
  ])
  assert.deepEqual(passed, ['quiz-pass'])
})

test('AI prediction outage persists activity without inventing a mastery increase', async () => {
  const originalPost = aiServiceClient.post
  const originalConsoleError = console.error
  let saves = 0
  const profile = {
    masteryScore: 61,
    challengePerformance: 20,
    sessionDuration: 1200,
    revisionFrequency: 1,
    readingSpeed: 150,
    drawingActivity: 0,
    learningStyle: 'Mixed',
    manualNotes: [],
    confidenceLevel: 3,
    async save() { saves += 1 },
  }
  aiServiceClient.post = async () => { throw new Error('service unavailable') }
  console.error = () => {}
  try {
    const synced = await learningService.syncProfilePredictions('student-1', profile, 40)
    assert.equal(synced, false)
    assert.equal(profile.masteryScore, 61)
    assert.equal(saves, 1)
  } finally {
    aiServiceClient.post = originalPost
    console.error = originalConsoleError
  }
})
