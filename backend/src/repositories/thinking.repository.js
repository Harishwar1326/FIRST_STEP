import mongoose from 'mongoose'
import { Challenge } from '../models/thinking.model.js'
import { Submission } from '../models/thinking.model.js'
import { ThinkingSkills } from '../models/thinking.model.js'

export const thinkingRepository = {
  async createChallenge(challengeData) {
    const challenge = new Challenge(challengeData)
    await challenge.save()
    return challenge
  },

  async findChallengeById(challengeId) {
    return Challenge.findById(challengeId)
  },

  async findTodayChallenge(userId) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return Challenge.findOne({
      userId,
      createdAt: { $gte: today },
    })
  },

  async markChallengeCompleted(challengeId) {
    return Challenge.findByIdAndUpdate(
      challengeId,
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
}
