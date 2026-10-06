import mongoose from 'mongoose'
import { LEARNING_ASSESSMENT_QUESTIONS, QUESTION_GROUPS } from '../data/learningAssessmentQuestions.js'
import { LearningDnaAssessment } from '../models/learningDnaAssessment.model.js'

const isDbReady = () => mongoose.connection.readyState === 1

const KNOWLEDGE_QUESTION_IDS = ['knowledgeJava', 'knowledgePython', 'knowledgeC']

const mapProgrammingLevel = (value) => {
  const map = { Beginner: 0.25, Basic: 0.5, Intermediate: 0.75, Advanced: 1 }
  return map[value] ?? 0.25
}

const mapStudyHours = (value) => {
  const map = { 'Less than 1': 0.25, '1–2': 0.5, '2–4': 0.75, '4+': 1 }
  return map[value] ?? 0.25
}

const mapConsistency = (value) => {
  const map = { Rarely: 0.25, Sometimes: 0.5, Usually: 0.75, 'Very consistent': 1 }
  return map[value] ?? 0.25
}

const mapConfidence = (value) => {
  const map = { 'Very low': 0.2, Low: 0.4, Medium: 0.6, High: 0.8, 'Very high': 1 }
  return map[value] ?? 0.5
}

const mapMotivation = (goal) => {
  const map = {
    'Board/college exams': 0.7,
    Placements: 0.85,
    'Software development': 0.9,
    'AI/ML': 0.95,
    'Competitive programming': 0.88,
    Other: 0.6,
  }
  return map[goal] ?? 0.6
}

const normalizeMarks = (value) => {
  const marks = Number(value)
  if (!Number.isFinite(marks)) return 0
  return Math.max(0, Math.min(1, marks / 100))
}

const learningPreferenceLabel = (value) => {
  const map = {
    Videos: 'Video-first learning',
    Reading: 'Reading and notes',
    'Practice problems': 'Practice-heavy learning',
    Projects: 'Project-based learning',
    Combination: 'Practice + Projects',
  }
  return map[value] || value || 'Mixed learning'
}

const validateResponses = (responses = {}) => {
  const errors = []

  LEARNING_ASSESSMENT_QUESTIONS.forEach((question) => {
    const value = responses[question.id]
    if (!question.required) return

    if (question.type === 'multi') {
      if (!Array.isArray(value) || !value.length) {
        errors.push(`${question.label} is required.`)
      }
      return
    }

    if (question.type === 'number') {
      const number = Number(value)
      if (!Number.isFinite(number) || number < question.min || number > question.max) {
        errors.push(`${question.label} must be between ${question.min} and ${question.max}.`)
      }
      return
    }

    if (!String(value || '').trim()) {
      errors.push(`${question.label} is required.`)
      return
    }

    if (question.type === 'single' && question.options && !question.options.includes(value)) {
      errors.push(`Invalid option selected for ${question.id}.`)
    }
  })

  if (errors.length) {
    const error = new Error(errors[0])
    error.statusCode = 400
    error.details = errors
    throw error
  }
}

const scoreKnowledgeQuestions = (responses = {}) => {
  let correct = 0
  KNOWLEDGE_QUESTION_IDS.forEach((id) => {
    const question = LEARNING_ASSESSMENT_QUESTIONS.find((item) => item.id === id)
    if (question && responses[id] === question.correctAnswer) {
      correct += 1
    }
  })
  return {
    correct,
    total: KNOWLEDGE_QUESTION_IDS.length,
    score: Math.round((correct / KNOWLEDGE_QUESTION_IDS.length) * 100),
  }
}

const buildFeatures = (responses = {}, knowledgeNorm = 0) => {
  const programmingLevelNorm = mapProgrammingLevel(responses.programmingLevel)
  const studyHoursNorm = mapStudyHours(responses.studyHoursPerDay)
  const consistencyNorm = mapConsistency(responses.studyConsistency)
  const confidenceNorm = mapConfidence(responses.problemSolvingConfidence)
  const academicPerformanceNorm = normalizeMarks(responses.averageMarks)
  const motivationNorm = mapMotivation(responses.primaryGoal)

  const knowledgeLevel = (programmingLevelNorm * 0.55) + (knowledgeNorm * 0.45)
  const problemSolving = (confidenceNorm * 0.45) + (knowledgeNorm * 0.55)
  const consistency = (consistencyNorm * 0.65) + (studyHoursNorm * 0.35)
  const studyAvailability = studyHoursNorm

  return {
    studyHours: studyHoursNorm,
    consistency: consistencyNorm,
    confidence: confidenceNorm,
    knowledgeLevel,
    motivation: motivationNorm,
    studyAvailability,
    problemSolving,
    academicPerformance: academicPerformanceNorm,
  }
}

const buildCapabilityProfile = (features = {}, programmingLevel = 'Beginner') => ({
  programming: Math.round(((features.knowledgeLevel * 0.55) + (mapProgrammingLevel(programmingLevel) * 0.45)) * 100),
  problemSolving: Math.round(features.problemSolving * 100),
  consistency: Math.round(features.consistency * 100),
  confidence: Math.round(features.confidence * 100),
  academicPerformance: Math.round(features.academicPerformance * 100),
})

const buildInsights = (responses = {}, capabilityProfile = {}, features = {}) => {
  const strengths = []
  const areasToImprove = []

  if (capabilityProfile.programming >= 60) strengths.push('Strong programming interest and foundation')
  if (capabilityProfile.academicPerformance >= 70) strengths.push('Good academic performance')
  if (capabilityProfile.confidence >= 65) strengths.push('Healthy confidence with new problems')
  if (Array.isArray(responses.interestAreas) && responses.interestAreas.includes('Programming')) {
    strengths.push('Clear interest in programming')
  }

  if (capabilityProfile.problemSolving < 55) areasToImprove.push('Problem solving')
  if (capabilityProfile.consistency < 55) areasToImprove.push('Study consistency')
  if (capabilityProfile.confidence < 50) areasToImprove.push('Confidence with unfamiliar tasks')
  if (capabilityProfile.programming < 50) areasToImprove.push('Programming fundamentals')

  if (!strengths.length) strengths.push('Motivation to personalize your learning path')
  if (!areasToImprove.length) areasToImprove.push('Keep building steady daily habits')

  return {
    strengths,
    areasToImprove,
    learningPreference: learningPreferenceLabel(responses.learningPreference),
    studyAvailability: responses.studyHoursPerDay || 'Not specified',
    currentCapability: responses.programmingLevel || 'Beginner',
    primaryGoal: responses.primaryGoal || 'Other',
  }
}

const sanitizeQuestionForClient = (question) => ({
  id: question.id,
  group: question.group,
  label: question.label,
  type: question.type,
  required: question.required,
  options: question.options,
  min: question.min,
  max: question.max,
})

const formatAssessment = (doc) => {
  if (!doc) return null
  const assessment = doc.toObject ? doc.toObject() : doc
  return {
    id: assessment._id,
    userId: assessment.userId,
    responses: assessment.responses,
    features: assessment.features,
    capabilityProfile: assessment.capabilityProfile,
    assessmentScore: assessment.assessmentScore,
    insights: assessment.insights,
    completedAt: assessment.completedAt,
    createdAt: assessment.createdAt,
    updatedAt: assessment.updatedAt,
  }
}

export const learningAssessmentService = {
  getQuestions() {
    return {
      groups: QUESTION_GROUPS,
      questions: LEARNING_ASSESSMENT_QUESTIONS.map(sanitizeQuestionForClient),
    }
  },

  async getAssessmentForUser(userId) {
    if (!isDbReady()) {
      return { completed: false, assessment: null }
    }

    const assessment = await LearningDnaAssessment.findOne({ userId: String(userId) })
    return {
      completed: Boolean(assessment?.completedAt),
      assessment: formatAssessment(assessment),
    }
  },

  async submitAssessment(userId, responses = {}) {
    if (!isDbReady()) {
      const error = new Error('Assessment database is unavailable')
      error.statusCode = 503
      throw error
    }

    validateResponses(responses)

    const knowledge = scoreKnowledgeQuestions(responses)
    const knowledgeNorm = knowledge.total ? knowledge.correct / knowledge.total : 0
    const features = buildFeatures(responses, knowledgeNorm)
    const capabilityProfile = buildCapabilityProfile(features, responses.programmingLevel)

    const insights = buildInsights(responses, capabilityProfile, features)

    const payload = {
      userId: String(userId),
      responses,
      features,
      capabilityProfile,
      assessmentScore: knowledge.score,
      insights,
      completedAt: new Date(),
    }

    const assessment = await LearningDnaAssessment.findOneAndUpdate(
      { userId: String(userId) },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    return formatAssessment(assessment)
  },
}
