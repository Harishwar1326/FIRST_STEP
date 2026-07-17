import mongoose from 'mongoose'
import { LearningTwin } from '../models/twin.model.js'

export const twinRepository = {
  async create(twinData) {
    const twin = new LearningTwin(twinData)
    await twin.save()
    return twin
  },

  async findByUserId(userId) {
    return LearningTwin.findOne({ userId })
  },

  async updateProgress(userId, progressData) {
    return LearningTwin.findOneAndUpdate(
      { userId },
      {
        $push: {
          studySessions: progressData.studySession || {},
          mistakes: progressData.mistake || {},
        },
        $inc: {
          'skillProgress.totalSessions': 1,
        },
      },
      { new: true, upsert: true }
    )
  },

  async update(userId, updateData) {
    return LearningTwin.findOneAndUpdate({ userId }, updateData, {
      new: true,
      upsert: true,
    })
  },
}
