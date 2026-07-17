import mongoose from 'mongoose'
import { StudyPlan } from '../models/academy.model.js'
import { Flashcard } from '../models/academy.model.js'
import { StudyStreak } from '../models/academy.model.js'

export const academyRepository = {
  async createStudyPlan(planData) {
    const plan = new StudyPlan(planData)
    await plan.save()
    return plan
  },

  async findStudyPlanByUserId(userId) {
    return StudyPlan.findOne({ userId })
  },

  async findTodayTasks(userId) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return StudyPlan.aggregate([
      { $match: { userId } },
      { $unwind: '$dailyTasks' },
      { $match: { 'dailyTasks.date': { $gte: today } } },
      { $replaceRoot: { newRoot: '$dailyTasks' } },
    ])
  },

  async createFlashcard(flashcardData) {
    const flashcard = new Flashcard(flashcardData)
    await flashcard.save()
    return flashcard
  },

  async findDueFlashcards(userId) {
    const now = new Date()
    return Flashcard.find({
      userId,
      nextReview: { $lte: now },
    }).sort({ nextReview: 1 })
  },

  async updateFlashcardReview(cardId, rating) {
    // Calculate next review date based on spaced repetition algorithm
    const card = await Flashcard.findById(cardId)
    if (!card) throw new Error('Flashcard not found')

    const intervals = [1, 3, 7, 14, 30, 90] // days
    const currentIntervalIndex = card.intervalIndex || 0

    let nextInterval
    if (rating >= 3) {
      // Correct answer - increase interval
      nextInterval = intervals[Math.min(currentIntervalIndex + 1, intervals.length - 1)]
    } else {
      // Incorrect answer - reset interval
      nextInterval = intervals[0]
    }

    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + nextInterval)

    return Flashcard.findByIdAndUpdate(
      cardId,
      {
        lastReview: new Date(),
        nextReview,
        intervalIndex: rating >= 3 ? currentIntervalIndex + 1 : 0,
        rating,
      },
      { new: true }
    )
  },

  async createStreak(streakData) {
    const streak = new StudyStreak(streakData)
    await streak.save()
    return streak
  },

  async findStreakByUserId(userId) {
    return StudyStreak.findOne({ userId })
  },

  async updateStreak(userId) {
    const streak = await StudyStreak.findOne({ userId })
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (!streak) {
      return StudyStreak.create({
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastStudyDate: today,
        history: [{ date: today, streak: 1 }],
      })
    }

    const lastStudy = new Date(streak.lastStudyDate)
    lastStudy.setHours(0, 0, 0, 0)
    const diffDays = Math.floor((today - lastStudy) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      // Already studied today
      return streak
    } else if (diffDays === 1) {
      // Consecutive day
      streak.currentStreak += 1
      streak.longestStreak = Math.max(streak.currentStreak, streak.longestStreak)
    } else {
      // Streak broken
      streak.currentStreak = 1
    }

    streak.lastStudyDate = today
    streak.history.push({ date: today, streak: streak.currentStreak })
    await streak.save()

    return streak
  },
}
