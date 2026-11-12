import test from 'node:test';
import assert from 'node:assert/strict';
import { userSqlRepository } from '../src/repositories/user.repository.sql.js';

const ensureAdmin = userSqlRepository.ensureAdmin;

test('admin bootstrap preserves an existing administrator without resetting credentials', async () => {
  const existing = { id: 4, role: 'admin', name: 'Existing Admin' };
  let createCalled = false;
  const repository = {
    async findByEmail() { return existing; },
    async create() { createCalled = true; },
  };
  const result = await ensureAdmin.call(repository, { name: 'Configured Name', email: 'admin@example.com', password: 'new-password' });
  assert.equal(result, existing);
  assert.equal(createCalled, false);
  assert.equal(existing.name, 'Existing Admin');
});

test('admin bootstrap does not promote an existing student account', async () => {
  let createCalled = false;
  const repository = {
    async findByEmail() { return { id: 8, role: 'student' }; },
    async create() { createCalled = true; },
  };
  const result = await ensureAdmin.call(repository, { name: 'Admin', email: 'student@example.com', password: 'long-password' });
  assert.equal(result, null);
  assert.equal(createCalled, false);
});

test('admin bootstrap creates an admin only when the configured email is absent', async () => {
  const created = { id: 10, role: 'admin' };
  let creationArgs;
  const repository = {
    async findByEmail() { return undefined; },
    async create(args) { creationArgs = args; return created; },
  };
  const result = await ensureAdmin.call(repository, { name: 'Admin', email: 'ADMIN@example.com', password: 'long-password' });
  assert.equal(result, created);
  assert.deepEqual(creationArgs, { name: 'Admin', email: 'ADMIN@example.com', password: 'long-password', role: 'admin' });
});
