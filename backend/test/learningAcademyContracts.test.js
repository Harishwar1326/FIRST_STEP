import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  lessonGenerationSchema,
  predictionSubmissionSchema,
  resolveMisconceptionSchema,
  stageCompletionSchema,
  teachBackSchema,
  whatIfSchema,
} from '../src/utils/validators.js'

const here = dirname(fileURLToPath(import.meta.url))
const routes = readFileSync(resolve(here, '../src/routes/learningAcademy.routes.js'), 'utf8')

test('Learning Academy AI contracts accept page payloads and bound text/context', () => {
  assert.equal(lessonGenerationSchema.safeParse({ topic: 'Loops', difficulty: 'medium', subject: 'Programming' }).success, true)
  assert.equal(lessonGenerationSchema.safeParse({ topic: 'x'.repeat(256) }).success, false)
  assert.equal(predictionSubmissionSchema.safeParse({
    activityId: null,
    topic: 'Loops',
    predictionAnswer: 'The output will change.',
    isCorrect: true,
    correctReasoning: 'The condition changes.',
    sessionId: 'sess-example',
    guestId: 'guest-example',
  }).success, true)

  const lesson = {
    topic: 'Loops',
    explanation: 'A loop repeats an operation.',
    example: { steps: ['Initialize', 'Check', 'Update'] },
  }
  assert.equal(teachBackSchema.safeParse({
    topic: 'Loops',
    userExplanation: 'A loop repeats a set of instructions until a condition changes.',
    lesson,
    activityId: null,
  }).success, true)
  assert.equal(teachBackSchema.safeParse({
    topic: 'Loops',
    userExplanation: 'A loop repeats a set of instructions until a condition changes.',
    lesson: { oversized: 'x'.repeat(40001) },
  }).success, false)
  assert.equal(whatIfSchema.safeParse({ topic: 'Loops', difficulty: 'hard', activityId: null }).success, true)
  assert.equal(stageCompletionSchema.safeParse({ activityId: 'abc', stage: 'improved' }).success, true)
  assert.equal(stageCompletionSchema.safeParse({ activityId: 'abc', stage: 'not-a-stage' }).success, false)
  assert.equal(resolveMisconceptionSchema.safeParse({ activityId: 'abc' }).success, true)
  assert.equal(resolveMisconceptionSchema.safeParse({ activityId: 'abc', userId: 'other' }).success, false)
})

test('Learning Academy resolve-misconception mutation validates its body', () => {
  assert.match(routes, /router\.post\('\/resolve-misconception', validate\(resolveMisconceptionSchema\)/)
})
