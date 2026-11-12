import test from 'node:test';
import assert from 'node:assert/strict';
import aiServiceClient from '../src/utils/aiServiceClient.js';

const requestInterceptor = aiServiceClient.interceptors.request.handlers[0].fulfilled;

test('AI client attaches the configured service key to internal requests', async () => {
  const previousKey = process.env.AI_SERVICE_KEY;
  process.env.AI_SERVICE_KEY = 'test-service-key';
  try {
    const config = await requestInterceptor({ headers: {} });
    assert.equal(config.headers['x-ai-service-key'], 'test-service-key');
  } finally {
    if (previousKey === undefined) delete process.env.AI_SERVICE_KEY;
    else process.env.AI_SERVICE_KEY = previousKey;
  }
});

test('AI client refuses to send an unkeyed internal request', async () => {
  const previousKey = process.env.AI_SERVICE_KEY;
  delete process.env.AI_SERVICE_KEY;
  try {
    await assert.rejects(
      requestInterceptor({ headers: {} }),
      /AI_SERVICE_KEY is required/,
    );
  } finally {
    if (previousKey !== undefined) process.env.AI_SERVICE_KEY = previousKey;
  }
});
