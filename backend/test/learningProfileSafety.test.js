import test from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { buildEmptyLearningProfile, learningProfileService } from '../src/services/learningProfile.service.js'

test('a learner with no assessment or activity receives no invented profile scores', () => {
  const profile = buildEmptyLearningProfile()
  assert.equal(profile.hasProfileData, false)
  assert.equal(profile.hasAssessment, false)
  assert.equal(profile.overallScore, undefined)
  assert.equal(profile.skills, undefined)
})

test('learning profile fails clearly when Mongo is disconnected', async (t) => {
  if (mongoose.connection.readyState === 1) {
    t.skip('requires Mongo to be disconnected')
    return
  }

  await assert.rejects(
    learningProfileService.getStudentLearningProfile('student-profile-audit'),
    (error) => error.statusCode === 503 && /database is disconnected/i.test(error.message),
  )
})
