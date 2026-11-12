import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { situationSchema, techniqueFeedbackSchema, techniqueSessionSchema } from '../src/utils/validators.js'
import { observedQuizMetrics } from '../src/services/studyTechniqueEngine.service.js'

const here = dirname(fileURLToPath(import.meta.url))
const routes = readFileSync(resolve(here, '../src/routes/academy.routes.js'), 'utf8')

test('Academy session and feedback schemas match the page payloads', () => {
  assert.equal(situationSchema.safeParse({
    timeAvailable: '1-3 hours',
    goal: 'Preparing for an upcoming exam',
    subject: 'Custom Subject',
    customSubject: 'Biology',
    difficulty: 'Difficult',
    interestLevel: 'Interested',
    preparationLevel: 'Some topics',
    confidenceLevel: 'Low',
    mainProblem: 'I cannot remember what I study',
  }).success, true)
  assert.equal(situationSchema.safeParse({ subject: 'Biology', userId: 'another-user' }).success, false)
  assert.equal(techniqueSessionSchema.safeParse({
    techniqueId: 'active-recall',
    techniqueName: 'Active Recall',
    subject: 'Biology',
    topic: 'Biology Practice',
    durationMinutes: 25,
    activityType: '15min',
    notesCreated: 'Recall notes',
  }).success, true)
  assert.equal(techniqueFeedbackSchema.safeParse({
    techniqueId: 'active-recall',
    usefulnessRating: 'Very useful',
    wouldUseAgain: 'Yes',
  }).success, true)
  assert.equal(techniqueFeedbackSchema.safeParse({
    techniqueId: 'active-recall',
    usefulnessRating: 'Very useful',
    wouldUseAgain: 'Yes',
    performanceAfter: 80,
  }).success, false)
  assert.match(routes, /router\.post\("\/technique-session", validate\(techniqueSessionSchema\)/)
  assert.match(routes, /router\.post\("\/feedback", validate\(techniqueFeedbackSchema\)/)
  assert.match(routes, /router\.post\("\/situation", validate\(situationSchema\)/)
  assert.match(routes, /router\.post\("\/technique\/recommend", validate\(situationSchema\)/)
})

test('Academy performance metrics include only observed quiz measurements', () => {
  assert.deepEqual(observedQuizMetrics(undefined, undefined), {})
  assert.deepEqual(observedQuizMetrics(0, 70), { avgQuizScoreBefore: 0, avgQuizScoreAfter: 70 })
  assert.deepEqual(observedQuizMetrics(50, 75), {
    avgQuizScoreBefore: 50,
    avgQuizScoreAfter: 75,
    retentionImprovement: 50,
  })
  assert.deepEqual(observedQuizMetrics(50, 101), { avgQuizScoreBefore: 50 })
})
