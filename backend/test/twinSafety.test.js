import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTwinSnapshot, deriveAnalytics, twinService } from '../src/services/twin.service.js'
import { twinProgressSchema } from '../src/utils/validators.js'
import twinRoutes from '../src/routes/twin.routes.js'

test('an empty Learning Twin reports no personal focus or retention data', () => {
  const analytics = deriveAnalytics(null)
  assert.equal(analytics.averageQuizScore, null)
  assert.equal(analytics.observedWatchSeconds, 0)
  assert.deepEqual(analytics.studySessions, [])
})

const emptyEvidence = () => ({
  twin: null,
  assessment: null,
  lessons: [],
  lessonProgress: [],
  quizResults: [],
  academyActivities: [],
  thinkingSkills: null,
  thinkingSubmissions: [],
  revisions: [],
  analytics: [],
  notes: [],
  smartNotes: [],
})

test('new students receive no invented score or recommendation', () => {
  const evidence = emptyEvidence()
  evidence.lessons = [{ _id: 'lesson-1', subject: 'Python', subjectSlug: 'python', title: 'First lesson', prerequisites: [] }]
  const snapshot = buildTwinSnapshot(evidence, { userId: 'student-1', name: 'New Student' })
  assert.equal(snapshot.profile.hasEvidence, false)
  assert.equal(snapshot.profile.knowledgeScore, null)
  assert.equal(snapshot.analytics.averageQuizScore, null)
  assert.deepEqual(snapshot.recommendations.items, [])
})

test('Twin aggregates persisted lesson and quiz evidence into a linked weak-topic recommendation', () => {
  const evidence = emptyEvidence()
  evidence.lessons = [
    { _id: 'lesson-1', subject: 'Python', subjectSlug: 'python', title: 'Loops', concepts: ['for loop'], prerequisites: [] },
    { _id: 'lesson-2', subject: 'Python', subjectSlug: 'python', title: 'Functions', concepts: ['functions'], prerequisites: ['Loops'] },
  ]
  evidence.taskDefinitions = [
    { _id: 'task-1', lessonId: 'lesson-1', title: 'Trace one loop' },
    { _id: 'task-2', lessonId: 'lesson-1', title: 'Write a loop example' },
  ]
  evidence.taskSubmissions = { submissions: 2, linkedSubmissions: 1, taskIds: ['task-1'] }
  evidence.lessonProgress = [{ lessonId: 'lesson-1', watchPercentage: 45, observedWatchTime: 210, timeSpent: 180, currentPosition: 210, lastWatchedAt: new Date() }]
  evidence.quizResults = [{ _id: 'quiz-1', lessonId: 'lesson-1', score: 40, correctCount: 2, totalQuestions: 5, weakConcepts: ['for loop'], createdAt: new Date() }]

  const snapshot = buildTwinSnapshot(evidence, { userId: 'student-1' })
  assert.equal(snapshot.profile.lessonsStarted, 1)
  assert.equal(snapshot.profile.subjects[0].progressPercent, 23)
  assert.equal(snapshot.analytics.observedWatchSeconds, 210)
  assert.equal(snapshot.analytics.averageQuizScore, 40)
  assert.deepEqual(snapshot.profile.taskProgress, { available: 2, completed: 1, pending: 1, submissions: 2, unlinkedSubmissions: 1 })
  assert.equal(snapshot.profile.subjects[0].tasksPending, 1)
  assert.equal(snapshot.recommendations.items[0].type, 'practice')
  assert.equal(snapshot.recommendations.items[0].lessonId, 'lesson-1')
  assert.match(snapshot.recommendations.items[0].href, /lesson-1/)
})

test('Learning Twin uses a saved model difficulty to select an available curriculum lesson', () => {
  const evidence = emptyEvidence()
  evidence.assessment = { completedAt: new Date(), assessmentScore: 62, insights: {} }
  evidence.lessons = [
    { _id: 'easy-lesson', subject: 'Python', subjectSlug: 'python', title: 'Variables', difficulty: 'Beginner', prerequisites: [] },
    { _id: 'advanced-lesson', subject: 'Python', subjectSlug: 'python', title: 'Decorators', difficulty: 'Advanced', prerequisites: [] },
  ]
  evidence.learningModelProfile = {
    masteryScore: 78,
    retentionProbability: 0.72,
    difficulty: 'Advanced',
    predictionSource: 'synthetic_baseline_model',
    predictionTrainingData: 'synthetic',
    difficultySource: 'transparent_policy',
  }

  const snapshot = buildTwinSnapshot(evidence, { userId: 'student-1' })
  assert.equal(snapshot.profile.modelGuidance.recommendedDifficulty, 'Advanced')
  assert.equal(snapshot.recommendations.items[0].lessonId, 'advanced-lesson')
  assert.equal(snapshot.recommendations.modelDifficulty, 'Advanced')
  assert.equal(snapshot.recommendations.modelPredictionSource, 'synthetic_experimental')
  assert.match(snapshot.recommendations.items[0].reason, /synthetic/)
})

test('Learning Twin reports a database outage as unavailable instead of a false empty profile', async () => {
  await assert.rejects(twinService.getSnapshot('student-1'), (error) => error.statusCode === 503)
})

test('Learning Twin progress accepts bounded study data and rejects invalid metrics', () => {
  assert.equal(twinProgressSchema.safeParse({
    studySession: { subject: 'Biology', duration: 25, confidence: 85 },
  }).success, true)
  assert.equal(twinProgressSchema.safeParse({
    studySession: { subject: 'Biology', duration: -25, confidence: 140 },
  }).success, false)
  assert.equal(twinProgressSchema.safeParse({
    studySession: { subject: 'Biology', duration: 25, accuracy: 85 },
  }).success, false)
  assert.equal(twinProgressSchema.safeParse({}).success, false)
  assert.equal(twinProgressSchema.safeParse({ userId: 'another-student' }).success, false)
})

test('Learning Twin progress route authenticates and validates before updating', () => {
  const route = twinRoutes.stack.find((layer) => layer.route?.path === '/progress' && layer.route.methods.put)
  assert.ok(route)
  assert.ok(twinRoutes.stack.some((layer) => layer.handle.name === 'protect'))
  assert.ok(route.route.stack.some((layer) => layer.handle.name === 'validateRequest'))
  const snapshotRoute = twinRoutes.stack.find((layer) => layer.route?.path === '/snapshot' && layer.route.methods.get)
  assert.ok(snapshotRoute)
})
