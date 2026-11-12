import test from 'node:test';
import assert from 'node:assert/strict';
import { loginSchema, registerSchema, validate } from '../src/utils/validators.js';

test('registration normalizes account fields and cannot set an elevated role', () => {
  const parsed = registerSchema.parse({
    name: '  Student Name  ',
    email: '  STUDENT@EXAMPLE.COM  ',
    password: 'long-enough-password',
    role: 'admin',
  });
  assert.deepEqual(parsed, {
    name: 'Student Name',
    email: 'student@example.com',
    password: 'long-enough-password',
  });
});

test('login email is normalized and registration enforces password length bounds', () => {
  assert.equal(loginSchema.parse({ email: ' USER@EXAMPLE.COM ', password: 'secret' }).email, 'user@example.com');
  assert.equal(registerSchema.safeParse({ name: 'Student', email: 'a@b.com', password: '1234567' }).success, false);
  assert.equal(registerSchema.safeParse({ name: 'Student', email: 'a@b.com', password: '🙂'.repeat(19) }).success, false);
});

test('validate middleware assigns the normalized schema result to the request', () => {
  const req = { body: { email: ' USER@EXAMPLE.COM ', password: 'secret', ignored: true } };
  let nextCalled = false;
  validate(loginSchema)(req, {}, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.deepEqual(req.body, { email: 'user@example.com', password: 'secret' });
});
