import test from 'node:test'
import assert from 'node:assert/strict'
import { extractReadableText, normalizeSemanticSearchRequest } from '../src/services/notes.service.js'
import { noteUploadSchema } from '../src/utils/validators.js'
import { escapeNoteSearch } from '../src/repositories/notes.repository.js'
import { buildNotesAnalyticsRecord } from '../src/services/notes.ai.service.js'
import { Analytics } from '../src/models/analytics.model.js'

test('offline notes parser extracts readable plain text', () => {
  assert.equal(extractReadableText(Buffer.from('A readable study note about café.'), 'text/plain'), 'A readable study note about café.')
})

test('offline notes parser does not mark binary documents as readable text', () => {
  const binaryPdfLikeBytes = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.from([0, 255, 17, 4, 0, 128]).map((byte) => byte)])
  assert.throws(
    () => extractReadableText(binaryPdfLikeBytes, 'application/pdf'),
    (error) => error.statusCode === 503 && /Local processing supports readable text/.test(error.message),
  )
  assert.throws(
    () => extractReadableText(binaryPdfLikeBytes, 'text/plain'),
    (error) => error.statusCode === 503,
  )
})

test('notes upload validation preserves folder and tag metadata sent by the page', () => {
  const metadata = { subject: 'Biology', folder: 'Revision', tags: 'cells, exam prep' }
  assert.deepEqual(noteUploadSchema.parse(metadata), metadata)
})

test('notes library search treats regex metacharacters literally and bounds input size', () => {
  assert.equal(escapeNoteSearch('.*(a|b)'), '\\.\\*\\(a\\|b\\)')
  assert.equal(escapeNoteSearch('x'.repeat(500)).length, 200)
})

test('semantic search clamps query size, result count, filters, and ranking parameters', () => {
  const safe = normalizeSemanticSearchRequest(' q '.repeat(300), {
    limit: 10000,
    subject: 's'.repeat(200),
    folder: 'f'.repeat(200),
    denseWeight: 3,
    sparseWeight: -2,
    rrfK: 10000,
  })
  assert.equal(safe.query.length, 500)
  assert.equal(safe.limit, 50)
  assert.equal(safe.where.subject.length, 120)
  assert.equal(safe.where.folder.length, 100)
  assert.equal(safe.denseWeight, 1)
  assert.equal(safe.sparseWeight, 0)
  assert.equal(safe.rrfK, 200)
})

test('Smart Notes feature use does not invent Learning Twin or assessment scores', () => {
  const record = buildNotesAnalyticsRecord('student-1', {
    mode: 'analysis',
    subject: 'Biology',
    understanding: 92,
  })
  assert.equal(record.activityType, 'smart_notes_analysis')
  assert.equal(Object.hasOwn(record, 'score'), false)
  assert.ok(Analytics.schema.path('activityType').enumValues.includes(record.activityType))
  assert.equal(buildNotesAnalyticsRecord('guest-1', { mode: 'analysis' }), null)
  assert.equal(buildNotesAnalyticsRecord('student-1', { mode: 'unknown' }), null)
  const measured = buildNotesAnalyticsRecord('student-1', { mode: 'analysis', assessmentScore: 76 })
  assert.equal(measured.score, 76)
})
