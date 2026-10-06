import { academyRepository } from '../repositories/academy.repository.js'
import { aiServiceClient } from '../utils/aiServiceClient.js'
import { studyTechniqueEngineService } from './studyTechniqueEngine.service.js'

export const academyService = {
  async getStudyPlan(userId) {
    let plan = await academyRepository.findStudyPlanByUserId(userId)

    if (!plan) {
      // Generate initial study plan using AI service
      const aiResponse = await aiServiceClient.post('/academy/plan/generate', {
        userId,
      })

      plan = await academyRepository.createStudyPlan({
        userId,
        ...aiResponse.data,
      })
    }

    return {
      planId: plan._id,
      weeklyGoals: plan.weeklyGoals || [],
      dailyTasks: plan.dailyTasks || [],
      techniques: plan.techniques || ['spaced-repetition', 'active-recall'],
      estimatedCompletion: plan.estimatedCompletion
    }
  },

  async getTodayTasks(userId) {
    const tasks = await academyRepository.findTodayTasks(userId)
    return {
      tasks: tasks.map((task) => ({
        id: task._id,
        task: task.title,
        technique: task.technique,
        duration: task.duration,
        completed: task.completed,
        priority: task.priority,
      })),
    }
  },

  async getFlashcards(userId) {
    const flashcards = await academyRepository.findDueFlashcards(userId)
    return {
      flashcards: flashcards.map((card) => ({
        id: card._id,
        front: card.front,
        back: card.back,
        difficulty: card.difficulty,
        nextReview: card.nextReview,
      })),
      dueCount: flashcards.length,
    }
  },

  async submitFlashcardReview(userId, cardId, rating) {
    // Update flashcard with new rating
    const updatedCard = await academyRepository.updateFlashcardReview(
      cardId,
      rating
    )

    // Send review data to AI service for spaced repetition algorithm
    await aiServiceClient.post('/academy/flashcard/review', {
      userId,
      cardId,
      rating,
    })

    return {
      success: true,
      nextReview: updatedCard.nextReview,
      message: 'Flashcard reviewed successfully',
    }
  },

  async getStreak(userId) {
    const streakData = await academyRepository.findStreakByUserId(userId)

    return {
      currentStreak: streakData?.currentStreak || 0,
      longestStreak: streakData?.longestStreak || 0,
      lastStudyDate: streakData?.lastStudyDate,
      streakHistory: streakData?.history || [],
    }
  },

  async updateStreak(userId) {
    // Update streak in database
    const streak = await academyRepository.updateStreak(userId)

    // Also update in AI service for analytics
    await aiServiceClient.post('/academy/streak/update', {
      userId,
    })

    return streak
  },

  async getTechniqueRecommendation(userId, subject) {
    try {
      const response = await aiServiceClient.post('/academy/technique/recommend', {
        userId,
        subject,
      })
      if (response.data && response.data.recommendedTechnique) {
        return response.data
      }
    } catch (err) {
      console.warn('AI service technique recommend fallback to local engine:', err.message)
    }

    return await studyTechniqueEngineService.generateRecommendation(userId)
  },

  async evaluateSituation(userId, situationInputs) {
    return await studyTechniqueEngineService.evaluateSituation(userId, situationInputs)
  },

  async saveTechniqueFeedback(userId, feedbackData) {
    return await studyTechniqueEngineService.saveTechniqueFeedback(userId, feedbackData)
  },

  async getStudentProfile(userId) {
    return await studyTechniqueEngineService.calculateStudentProfile(userId)
  },

  getTechniquesCatalog() {
    return studyTechniqueEngineService.getTechniquesCatalog()
  },

  getTechniqueById(techniqueId) {
    return studyTechniqueEngineService.getTechniqueById(techniqueId)
  },

  async recordTechniqueSession(userId, sessionData) {
    return await studyTechniqueEngineService.recordTechniqueSession(userId, sessionData)
  },

  async getStudentTechniqueProgress(userId) {
    return await studyTechniqueEngineService.getStudentTechniqueProgress(userId)
  }
}


