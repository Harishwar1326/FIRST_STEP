import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createWhiteboardSchema, noteMetadataSchema, notesBlindSpotsSchema, notesQuestionSchema, notesQuestionsSchema, notesRevisionSchema, whiteboardSnapshotSchema } from '../src/utils/validators.js';

const here = dirname(fileURLToPath(import.meta.url));
const routes = readFileSync(resolve(here, '../src/routes/notes.routes.js'), 'utf8');

test('every Notes route is behind account authentication', () => {
  const authIndex = routes.indexOf('router.use(authMiddleware)');
  assert.notEqual(authIndex, -1, 'notes router must install auth middleware');

  const routeRegistration = /router\.(?:get|post|put|patch|delete)\(/g;
  for (const match of routes.matchAll(routeRegistration)) {
    assert.ok(authIndex < match.index, `route at offset ${match.index} must follow authentication`);
  }
});

test('Notes AI inputs are bounded and the page routes validate their payloads', () => {
  assert.equal(notesQuestionSchema.safeParse({ question: 'Explain this concept.' }).success, true);
  assert.equal(notesQuestionSchema.safeParse({ question: 'x'.repeat(2001) }).success, false);
  assert.equal(notesBlindSpotsSchema.safeParse({ analysis: { keyConcepts: [] } }).success, true);
  assert.equal(notesBlindSpotsSchema.safeParse({ analysis: { data: 'x'.repeat(30001) } }).success, false);
  assert.equal(notesRevisionSchema.safeParse({ minutes: 10, analysis: null }).success, true);
  assert.equal(notesRevisionSchema.safeParse({ minutes: 1000 }).success, false);
  assert.equal(notesQuestionsSchema.safeParse({ bloomLevel: 'all' }).success, true);
  assert.equal(notesQuestionsSchema.safeParse({ bloomLevel: 'arbitrary' }).success, false);
  assert.match(routes, /router\.post\("\/:id\/ai\/blindspots", validate\(notesBlindSpotsSchema\)/);
  assert.match(routes, /router\.post\("\/:id\/ai\/explain", validate\(notesQuestionSchema\)/);
  assert.match(routes, /router\.post\("\/:id\/ai\/revision", validate\(notesRevisionSchema\)/);
  assert.match(routes, /router\.post\("\/:id\/questions", validate\(notesQuestionsSchema\)/);
});

test('note metadata updates are strict and bounded', () => {
  assert.equal(noteMetadataSchema.safeParse({
    title: 'Cell Biology', subject: 'Biology', folder: 'Revision', tags: ['cells', 'exam prep'], isFavorite: true,
  }).success, true);
  assert.equal(noteMetadataSchema.safeParse({ title: 'x'.repeat(256) }).success, false);
  assert.equal(noteMetadataSchema.safeParse({ tags: [''] }).success, false);
  assert.equal(noteMetadataSchema.safeParse({ isFavorite: true, userId: 'another-user' }).success, false);
  assert.match(routes, /router\.patch\("\/:id", validate\(noteMetadataSchema\)/);
});

test('whiteboard create and snapshot payloads are strict and bounded', () => {
  assert.equal(createWhiteboardSchema.safeParse({ title: 'My notebook' }).success, true);
  assert.equal(createWhiteboardSchema.safeParse({ title: 'x'.repeat(121) }).success, false);
  assert.equal(createWhiteboardSchema.safeParse({ title: 'My notebook', userId: 'another-user' }).success, false);
  assert.equal(whiteboardSnapshotSchema.safeParse({ snapshot: { document: { store: {} }, session: {} } }).success, true);
  assert.equal(whiteboardSnapshotSchema.safeParse({ snapshot: null }).success, true);
  assert.equal(whiteboardSnapshotSchema.safeParse({ snapshot: { content: 'x'.repeat(8 * 1024 * 1024 + 1) } }).success, false);
  assert.equal(whiteboardSnapshotSchema.safeParse({ snapshot: { content: 'é'.repeat(4 * 1024 * 1024) } }).success, false);
  assert.match(routes, /router\.post\("\/whiteboards", validate\(createWhiteboardSchema\)/);
  assert.match(routes, /router\.put\("\/whiteboards\/:id", validate\(whiteboardSnapshotSchema\)/);
});
