import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { normalizeAdminActivityLimit } from '../src/services/activity.service.js'
import { normalizeStudentListOptions } from '../src/repositories/user.repository.sql.js'
import {
  adminLessonIdParamsSchema,
  adminLessonSchema,
  adminStudentIdParamsSchema,
  notificationReadSchema,
} from '../src/utils/validators.js'

const here = dirname(fileURLToPath(import.meta.url))
const routes = readFileSync(resolve(here, '../src/routes/admin.routes.js'), 'utf8')

const lessonFormPayload = {
  title: 'Introduction to C',
  class: 'Programming MVP',
  subject: 'C Programming',
  chapter: 'Getting Started',
  content: 'A short lesson body.',
  videoUrl: '',
  order: 1,
  estimatedStudyTime: 20,
  difficulty: 'Intermediate',
  isPublished: true,
}

test('Admin lesson schema accepts the content form payload and rejects unsafe values', () => {
  assert.equal(adminLessonSchema.safeParse(lessonFormPayload).success, true)
  assert.equal(adminLessonSchema.safeParse({ ...lessonFormPayload, content: 'x'.repeat(200001) }).success, false)
  assert.equal(adminLessonSchema.safeParse({ ...lessonFormPayload, order: -1 }).success, false)
  assert.equal(adminLessonSchema.safeParse({ ...lessonFormPayload, userId: 'another-user' }).success, false)
})

test('Admin writes validate lesson changes and notification IDs', () => {
  assert.match(routes, /router\.post\('\/lessons', validate\(adminLessonSchema\)/)
  assert.match(routes, /router\.put\('\/lessons\/:id', validateParams\(adminLessonIdParamsSchema\), validate\(adminLessonSchema\)/)
  assert.match(routes, /router\.patch\('\/notifications\/mark-read', validate\(notificationReadSchema\)/)
  assert.equal(notificationReadSchema.safeParse({ notificationIds: [] }).success, true)
  assert.equal(notificationReadSchema.safeParse({ notificationIds: ['invalid'] }).success, false)
  assert.equal(notificationReadSchema.safeParse({ notificationIds: ['a'.repeat(24)] }).success, true)
})

test('Admin resource IDs match their MongoDB and SQL identifier formats', () => {
  assert.equal(adminLessonIdParamsSchema.safeParse({ id: '64b000000000000000000001' }).success, true)
  assert.equal(adminLessonIdParamsSchema.safeParse({ id: 'invalid' }).success, false)
  assert.equal(adminStudentIdParamsSchema.safeParse({ id: '42' }).success, true)
  assert.equal(adminStudentIdParamsSchema.safeParse({ id: '0' }).success, false)
  assert.equal(adminStudentIdParamsSchema.safeParse({ id: '2147483648' }).success, false)
  assert.match(routes, /router\.get\('\/students\/:id', validateParams\(adminStudentIdParamsSchema\)/)
  assert.match(routes, /router\.put\('\/lessons\/:id', validateParams\(adminLessonIdParamsSchema\)/)
  assert.match(routes, /router\.delete\('\/lessons\/:id', validateParams\(adminLessonIdParamsSchema\)/)
})

test('Admin list query limits and student search are bounded', () => {
  assert.equal(normalizeAdminActivityLimit('5000', 20), 100)
  assert.equal(normalizeAdminActivityLimit('-5', 20), 1)
  assert.equal(normalizeAdminActivityLimit('invalid', 25), 25)
  assert.deepEqual(normalizeStudentListOptions({ search: 'x'.repeat(150), limit: -10, offset: 200000 }), {
    search: 'x'.repeat(100),
    limit: 1,
    offset: 100000,
  })
  assert.deepEqual(normalizeStudentListOptions({ limit: 'invalid', offset: '-4' }), {
    search: '',
    limit: 25,
    offset: 0,
  })
})
