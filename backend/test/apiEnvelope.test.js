import test from 'node:test'
import assert from 'node:assert/strict'
import { unwrapApiResponse } from '../../frontend/src/utils/unwrapApiResponse.js'

test('API envelopes resolve to their payload', () => {
  const payload = { recommendedTechnique: { name: 'Active Recall', score: 92 } }
  assert.equal(
    unwrapApiResponse({ status: 'success', data: payload, message: 'ok' }),
    payload,
  )
})

test('legacy responses without an API envelope remain unchanged', () => {
  const payload = [{ id: 'lesson-1' }]
  assert.equal(unwrapApiResponse(payload), payload)
  assert.equal(unwrapApiResponse({ status: 'success', message: 'healthy' }).message, 'healthy')
})
