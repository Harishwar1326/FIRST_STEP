import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { indiaChallengeAnswerSchema, challengeSubmissionSchema, nearbyDiscoverySchema, thinkingLabAnswerSchema } from '../src/utils/validators.js';
import { thinkingService } from '../src/services/thinking.service.js';
import { thinkingRepository } from '../src/repositories/thinking.repository.js';

const here = dirname(fileURLToPath(import.meta.url));
const routes = readFileSync(resolve(here, '../src/routes/thinking.routes.js'), 'utf8');

test('Thinking Lab routes all require an authenticated student', () => {
  const authIndex = routes.indexOf('router.use(authMiddleware)');
  assert.notEqual(authIndex, -1, 'thinking router must install auth middleware');

  for (const match of routes.matchAll(/router\.(?:get|post|put|patch|delete)\(/g)) {
    assert.ok(authIndex < match.index, `route at offset ${match.index} must follow authentication`);
  }
});

test('India challenge answer contract matches the frontend URL and body payload', () => {
  assert.match(routes, /\/india-challenges\/:id\/answer', validate\(indiaChallengeAnswerSchema\)/);
  assert.equal(indiaChallengeAnswerSchema.safeParse({ answer: 'A considered response.' }).success, true);
  assert.equal(indiaChallengeAnswerSchema.safeParse({ answer: 'short' }).success, false);
  assert.equal(challengeSubmissionSchema.safeParse({ challengeId: 'id', answer: 'A considered response.' }).success, true);
});

test('Thinking progress has a neutral empty state and does not hide repository failures', async () => {
  const originalProfile = thinkingRepository.findStudentThinkingProfile;
  const originalAttempts = thinkingRepository.findChallengeAttemptsByStudent;
  try {
    thinkingRepository.findStudentThinkingProfile = async () => null;
    thinkingRepository.findChallengeAttemptsByStudent = async () => [];
    const progress = await thinkingService.getProgress({ id: 'student-1' });
    assert.deepEqual(progress.skillAverages, {
      criticalThinking: 0,
      problemSolving: 0,
      creativity: 0,
      evidenceReasoning: 0,
      decisionMaking: 0,
      curiosity: 0,
    });
    assert.deepEqual(progress.weakReasoningAreas, []);

    thinkingRepository.findStudentThinkingProfile = async () => { throw new Error('database unavailable'); };
    await assert.rejects(thinkingService.getProgress({ id: 'student-1' }), /database unavailable/);
  } finally {
    thinkingRepository.findStudentThinkingProfile = originalProfile;
    thinkingRepository.findChallengeAttemptsByStudent = originalAttempts;
  }
});

test('Thinking Lab write contracts are bounded and match the page payloads', () => {
  assert.equal(nearbyDiscoverySchema.safeParse({
    latitude: 17.38,
    longitude: 78.48,
    studentProfile: { name: 'Student', learningLevel: 'beginner' },
  }).success, true);
  assert.equal(nearbyDiscoverySchema.safeParse({ latitude: 91, longitude: 0 }).success, false);
  assert.equal(nearbyDiscoverySchema.safeParse({ latitude: 0, longitude: 0, userId: 'other' }).success, false);
  assert.equal(thinkingLabAnswerSchema.safeParse({
    answer: 'A sufficiently detailed response.',
    challengeType: 'creative',
    difficulty: 'beginner',
    question: 'What could help?',
    topic: 'Local environment',
    timeSpentSeconds: 30,
  }).success, true);
  assert.equal(thinkingLabAnswerSchema.safeParse({ answer: 'A sufficiently detailed response.', timeSpentSeconds: 1e8 }).success, false);
  assert.equal(thinkingLabAnswerSchema.safeParse({ answer: 'A sufficiently detailed response.', userId: 'other' }).success, false);

  const nearbyRoute = routes.match(/router\.post\('\/nearby', ([^,]+),/);
  const answerRoute = routes.match(/router\.post\('\/challenge\/:id\/answer', ([^,]+),/);
  assert.equal(nearbyRoute?.[1], 'validate(nearbyDiscoverySchema)');
  assert.equal(answerRoute?.[1], 'validate(thinkingLabAnswerSchema)');
});
