import test from 'node:test'
import assert from 'node:assert/strict'
import Lesson from '../src/models/lesson.model.js'
import { LessonProgress, VideoActivityEvent } from '../src/models/programmingLearning.model.js'
import { requireAdmin } from '../src/middlewares/auth.middleware.js'

test('video activity events require student, lesson, video, session, and idempotency identifiers', () => {
  const schema = VideoActivityEvent.schema
  for (const field of ['userId', 'lessonId', 'videoId', 'sessionId', 'eventId', 'type']) {
    assert.equal(schema.path(field).isRequired, true, `${field} is required`)
  }
  const uniqueIndex = schema.indexes().find(([fields, options]) => fields.userId === 1 && fields.eventId === 1 && options.unique)
  assert.ok(uniqueIndex, 'events have a unique per-student event ID index')
  assert.deepEqual(schema.path('type').enumValues, [
    'play', 'pause', 'resume', 'replay', 'seek', 'watch', 'speed', 'complete',
    'lesson_enter', 'lesson_exit', 'buffer', 'error',
  ])
})

test('lesson progress separates observed watch time, unique coverage, and resume position', () => {
  for (const field of ['observedWatchTime', 'timeSpent', 'watchedSegments', 'currentPosition', 'watchPercentage']) {
    assert.ok(LessonProgress.schema.path(field), `${field} is persisted`)
  }
})

test('lessons retain their video ID and default to published for existing curriculum behavior', () => {
  const lesson = new Lesson({ class: 'Programming MVP', subject: 'Java', chapter: 'Basics', title: 'Hello', content: 'Start', videoId: 'abc123' })
  assert.equal(lesson.videoId, 'abc123')
  assert.equal(lesson.isPublished, true)
})

test('admin analytics middleware rejects students and permits administrators', () => {
  const response = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } }
  let nextCalled = false
  requireAdmin({ user: { role: 'student' } }, response, () => { nextCalled = true })
  assert.equal(response.statusCode, 403)
  assert.equal(nextCalled, false)

  requireAdmin({ user: { role: 'admin' } }, response, () => { nextCalled = true })
  assert.equal(nextCalled, true)
})
