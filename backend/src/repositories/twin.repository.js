import mongoose from "mongoose";
import { LearningTwin } from "../models/twin.model.js";

export const twinRepository = {
  async create(twinData) {
    const twin = new LearningTwin(twinData);
    await twin.save();
    return twin;
  },

  async findByUserId(userId) {
    return LearningTwin.findOne({ userId: String(userId) });
  },

  async updateProgress(userId, progressData) {
    const update = {};
    if (progressData.studySession) {
      update.$push = {
        ...(update.$push || {}),
        studySessions: progressData.studySession,
      };
      update.$inc = {
        ...(update.$inc || {}),
        "skillProgress.totalSessions": 1,
        "skillProgress.totalTime":
          Number(progressData.studySession.duration) || 0,
      };
    }
    if (progressData.mistake) {
      update.$push = {
        ...(update.$push || {}),
        mistakes: progressData.mistake,
      };
    }
    if (!Object.keys(update).length) return this.findByUserId(userId);
    return LearningTwin.findOneAndUpdate({ userId: String(userId) }, update, {
      new: true,
      upsert: true,
    });
  },

  async update(userId, updateData) {
    return LearningTwin.findOneAndUpdate(
      { userId: String(userId) },
      updateData,
      {
        new: true,
        upsert: true,
      },
    );
  },
};
