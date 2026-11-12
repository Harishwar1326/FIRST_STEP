import test from 'node:test'
import assert from 'node:assert/strict'
import { assessmentSubmissionSchema } from '../src/utils/validators.js'
import { validateResponses } from '../src/services/learningAssessment.service.js'

test('assessment submission accepts the responses object sent by the frontend', () => {
  const body = { responses: { favoriteSubject: 'Computer Science', interestAreas: ['Programming'], averageMarks: '85' } }
  assert.deepEqual(assessmentSubmissionSchema.parse(body), body)
})

test('assessment submission rejects the obsolete answers-array contract', () => {
  assert.equal(assessmentSubmissionSchema.safeParse({ answers: [{ questionId: 'q1', answer: 'a' }] }).success, false)
  assert.equal(assessmentSubmissionSchema.safeParse({ responses: [] }).success, false)
})

test('assessment validation rejects an empty required numeric response', () => {
  const responses = {
    favoriteSubject: 'Computer Science',
    interestAreas: ['Programming'],
    programmingLevel: 'Beginner',
    knowledgeJava: 'true',
    knowledgePython: '3',
    knowledgeC: 'int x;',
    averageMarks: '',
    learningPreference: 'Videos',
    problemSolvingConfidence: 'Medium',
    studyHoursPerDay: 'Less than 1',
    studyConsistency: 'Rarely',
    primaryGoal: 'Other',
  }
  assert.throws(() => validateResponses(responses), /required/)
})

test('assessment validation rejects values outside configured multi-select options', () => {
  const responses = {
    favoriteSubject: 'Computer Science',
    interestAreas: ['Injected option'],
    programmingLevel: 'Beginner',
    knowledgeJava: 'true',
    knowledgePython: '3',
    knowledgeC: 'int x;',
    averageMarks: '75',
    learningPreference: 'Videos',
    problemSolvingConfidence: 'Medium',
    studyHoursPerDay: 'Less than 1',
    studyConsistency: 'Rarely',
    primaryGoal: 'Other',
  }
  assert.throws(() => validateResponses(responses), /Invalid options/)
})
