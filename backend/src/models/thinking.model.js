import mongoose from 'mongoose'

const challengeSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['case-study', 'scenario', 'logic-puzzle', 'design-thinking', 'reflection'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    bloomLevel: {
      type: String,
      enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'],
      required: true,
    },
    timeLimit: String,
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    points: {
      type: Number,
      default: 100,
    },
    expectedAnswer: String,
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge',
      required: true,
    },
    challengeTitle: String,
    answer: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    feedback: String,
    reasoning: String,
  },
  {
    timestamps: true,
  }
)

const thinkingSkillsSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    overallScore: {
      type: Number,
      default: 0,
    },
    criticalThinking: {
      type: Number,
      default: 0,
    },
    problemSolving: {
      type: Number,
      default: 0,
    },
    creativity: {
      type: Number,
      default: 0,
    },
    logicalReasoning: {
      type: Number,
      default: 0,
    },
    trends: {
      criticalThinking: String,
      problemSolving: String,
      creativity: String,
      logicalReasoning: String,
    },
  },
  {
    timestamps: true,
  }
)

const knowledgeSourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sourceUrl: { type: String, required: true },
    sourceType: {
      type: String,
      enum: ['official', 'news', 'rss', 'open-data', 'local-directory', 'education'],
      default: 'open-data',
    },
    reliability: {
      type: String,
      enum: ['high', 'medium', 'needs-verification'],
      default: 'medium',
    },
  },
  { timestamps: true }
)

const knowledgeItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    summary: { type: String, required: true },
    whatIsHappening: String,
    whyCare: String,
    category: {
      type: String,
      enum: ['near_me', 'science_technology', 'careers', 'india', 'world', 'agriculture', 'environment', 'government'],
      default: 'near_me',
    },
    awarenessLevel: {
      type: String,
      enum: ['near_me', 'india', 'world'],
      default: 'near_me',
    },
    location: {
      state: String,
      district: String,
      displayName: String,
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    explanations: {
      beginner: String,
      intermediate: String,
      advanced: String,
    },
    source: knowledgeSourceSchema,
    publishedAt: Date,
    relevanceScore: { type: Number, default: 0 },
    tags: [String],
    verificationNotes: String,
  },
  { timestamps: true }
)

const thinkingChallengeSchema = new mongoose.Schema(
  {
    knowledgeItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeItem',
    },
    challengeType: {
      type: String,
      enum: ['why', 'what_if', 'decision_making', 'problem_solving', 'comparison', 'cause_effect', 'prediction', 'creative'],
      required: true,
    },
    question: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    expectedSkills: [String],
    hints: [String],
  },
  { timestamps: true }
)

const challengeAttemptSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true },
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ThinkingChallenge',
    },
    knowledgeItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeItem',
    },
    answer: { type: String, required: true },
    challengeType: String,
    difficulty: String,
    timeSpentSeconds: Number,
    hintUsage: { type: Number, default: 0 },
    completion: { type: Boolean, default: true },
    scores: {
      understanding: Number,
      reasoning: Number,
      evidence: Number,
      creativity: Number,
      problemSolving: Number,
      clarity: Number,
      overall: Number,
    },
    feedback: String,
    nextChallengeType: String,
  },
  { timestamps: true }
)

const locationItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['education', 'school', 'college', 'hospital', 'library', 'industry', 'research', 'university', 'museum', 'government', 'skill_center', 'agriculture', 'environment'],
      default: 'education',
    },
    distanceKm: Number,
    district: String,
    state: String,
    learningOpportunity: String,
    challengePrompt: String,
    source: knowledgeSourceSchema,
  },
  { timestamps: true }
)

const studentThinkingProfileSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true },
    topicsExplored: [String],
    questionsAttempted: { type: Number, default: 0 },
    challengeTypeCounts: {
      why: { type: Number, default: 0 },
      what_if: { type: Number, default: 0 },
      decision_making: { type: Number, default: 0 },
      problem_solving: { type: Number, default: 0 },
      comparison: { type: Number, default: 0 },
      cause_effect: { type: Number, default: 0 },
      prediction: { type: Number, default: 0 },
      creative: { type: Number, default: 0 },
    },
    skillAverages: {
      criticalThinking: { type: Number, default: 45 },
      problemSolving: { type: Number, default: 48 },
      creativity: { type: Number, default: 52 },
      evidenceReasoning: { type: Number, default: 38 },
      decisionMaking: { type: Number, default: 44 },
      curiosity: { type: Number, default: 58 },
    },
    weakReasoningAreas: [String],
    preferredDifficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    lastActivityAt: Date,
  },
  { timestamps: true }
)

export const Challenge = mongoose.model('Challenge', challengeSchema)
export const Submission = mongoose.model('Submission', submissionSchema)
export const ThinkingSkills = mongoose.model('ThinkingSkills', thinkingSkillsSchema)
export const KnowledgeItem = mongoose.model('KnowledgeItem', knowledgeItemSchema)
export const ThinkingChallenge = mongoose.model('ThinkingChallenge', thinkingChallengeSchema)
export const ChallengeAttempt = mongoose.model('ChallengeAttempt', challengeAttemptSchema)
export const LocationItem = mongoose.model('LocationItem', locationItemSchema)
export const StudentThinkingProfile = mongoose.model('StudentThinkingProfile', studentThinkingProfileSchema)
