import mongoose from 'mongoose'
import {
  Challenge,
  ChallengeAttempt,
  KnowledgeItem,
  LocationItem,
  StudentThinkingProfile,
  Submission,
  ThinkingChallenge,
  ThinkingSkills,
} from '../models/thinking.model.js'

export const thinkingRepository = {
  async createChallenge(challengeData) {
    const challenge = new Challenge(challengeData)
    await challenge.save()
    return challenge
  },

  async findChallengeById(challengeId, userId) {
    return Challenge.findOne({ _id: challengeId, userId })
  },

  async findTodayChallenge(userId) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return Challenge.findOne({
      userId,
      createdAt: { $gte: today },
    })
  },

  async markChallengeCompleted(challengeId, userId) {
    return Challenge.findOneAndUpdate(
      { _id: challengeId, userId },
      { completed: true },
      { new: true }
    )
  },

  async createSubmission(submissionData) {
    const submission = new Submission(submissionData)
    await submission.save()
    return submission
  },

  async findSubmissionsByUserId(userId) {
    return Submission.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
  },

  async findThinkingSkills(userId) {
    return ThinkingSkills.findOne({ userId })
  },

  async updateThinkingSkills(userId, skillsData) {
    return ThinkingSkills.findOneAndUpdate(
      { userId },
      {
        $inc: {
          criticalThinking: skillsData.criticalThinking || 0,
          problemSolving: skillsData.problemSolving || 0,
          creativity: skillsData.creativity || 0,
          logicalReasoning: skillsData.logicalReasoning || 0,
        },
        $set: {
          overallScore: skillsData.overallScore,
          'trends.criticalThinking': skillsData.trends?.criticalThinking,
          'trends.problemSolving': skillsData.trends?.problemSolving,
          'trends.creativity': skillsData.trends?.creativity,
          'trends.logicalReasoning': skillsData.trends?.logicalReasoning,
        },
      },
      { new: true, upsert: true }
    )
  },

  async createKnowledgeItem(itemData) {
    const item = new KnowledgeItem(itemData)
    await item.save()
    return item
  },

  async findKnowledgeItems({ category, awarenessLevel, limit = 12 } = {}) {
    const query = {}
    if (category && category !== 'all') query.category = category
    if (awarenessLevel && awarenessLevel !== 'all') query.awarenessLevel = awarenessLevel

    return KnowledgeItem.find(query)
      .sort({ relevanceScore: -1, publishedAt: -1, createdAt: -1 })
      .limit(limit)
  },

  async findKnowledgeItemById(id) {
    return KnowledgeItem.findById(id)
  },

  async createThinkingChallenge(challengeData) {
    const challenge = new ThinkingChallenge(challengeData)
    await challenge.save()
    return challenge
  },

  async findThinkingChallengeById(id, userId) {
    return ThinkingChallenge.findOne({ _id: id, userId })
  },

  async findChallengeForKnowledgeItem(knowledgeItemId) {
    return ThinkingChallenge.findOne({ knowledgeItemId }).sort({ createdAt: -1 })
  },

  async createChallengeAttempt(attemptData) {
    const attempt = new ChallengeAttempt(attemptData)
    await attempt.save()
    return attempt
  },

  async findChallengeAttemptsByStudent(studentId, limit = 20) {
    return ChallengeAttempt.find({ studentId })
      .sort({ createdAt: -1 })
      .limit(limit)
  },

  async upsertLocationItems(items) {
    const saved = []
    for (const item of items) {
      const result = await LocationItem.findOneAndUpdate(
        {
          name: item.name,
          district: item.district,
          state: item.state,
        },
        item,
        { new: true, upsert: true }
      )
      saved.push(result)
    }
    return saved
  },

  async findLocationItems({ district, state, limit = 8 } = {}) {
    const query = {}
    if (district) query.district = district
    if (state) query.state = state

    return LocationItem.find(query)
      .sort({ distanceKm: 1, createdAt: -1 })
      .limit(limit)
  },

  async findStudentThinkingProfile(studentId) {
    return StudentThinkingProfile.findOne({ studentId })
  },

  async updateStudentThinkingProfile(studentId, updateData) {
    return StudentThinkingProfile.findOneAndUpdate(
      { studentId },
      updateData,
      { new: true, upsert: true }
    )
  },
}
