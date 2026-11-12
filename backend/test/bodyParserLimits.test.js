import test from 'node:test'
import assert from 'node:assert/strict'
import app from '../src/app.js'

test('Express accepts normal API JSON and rejects JSON above the parser limit', async (t) => {
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())))

  const address = server.address()
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1/body-limit-audit-probe`
  const small = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })
  // The normal-sized body reaches the app's authentication gate; this confirms
  // parsing succeeded without invoking a real authenticated endpoint.
  assert.equal(small.status, 401)

  const oversized = JSON.stringify({ content: 'x'.repeat(12 * 1024 * 1024 + 1) })
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: oversized,
  })
  assert.equal(response.status, 413)
})
