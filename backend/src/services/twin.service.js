import { twinRepository } from '../repositories/twin.repository.js'
import { aiServiceClient } from '../utils/aiServiceClient.js'

export const twinService = {
  async getProfile(userId) {
    let twin = await twinRepository.findByUserId(userId)

    if (!twin) {
      // Initialize twin if it doesn't exist
      const aiResponse = await aiServiceClient.post('/twin/initialize', {
        userId,
      })
      twin = await twinRepository.create({
        userId,
        ...aiResponse.data,
      })
    }

    return {
      learningStyle: twin.learningStyle || 'Visual',
      attentionPattern: twin.attentionPattern || 'Focused',
      knowledgeScore: twin.knowledgeScore || 0,
      skillProgress: twin.skillProgress || {},
      strengths: twin.strengths || [],
      weaknesses: twin.weaknesses || [],
    }
  },

  async getAnalytics(userId) {
    const twin = await twinRepository.findByUserId(userId)
    if (!twin) {
      throw new Error('Learning Twin not found')
    }

    // Get fresh analytics from AI service
    const aiResponse = await aiServiceClient.get(`/twin/analytics/${userId}`)

    return {
      learningSpeed: aiResponse.data.learningSpeed || 1.0,
      memoryRetention: aiResponse.data.memoryRetention || 0.7,
      progressRate: aiResponse.data.progressRate || '+5%',
      focusScore: aiResponse.data.focusScore || 75,
      studySessions: aiResponse.data.studySessions || [],
      mistakes: aiResponse.data.mistakes || [],
      weakTopics: aiResponse.data.weakTopics || [],
    }
  },

  async getRecommendations(userId) {
    const twin = await twinRepository.findByUserId(userId)
    if (!twin) {
      throw new Error('Learning Twin not found')
    }

    // Get personalized recommendations from AI service
    const aiResponse = await aiServiceClient.get(`/twin/recommendations/${userId}`)

    return {
      focusAreas: aiResponse.data.focusAreas || [],
      practiceTopics: aiResponse.data.practiceTopics || [],
      reviewMaterials: aiResponse.data.reviewMaterials || [],
      suggestedPace: aiResponse.data.suggestedPace || 'normal',
    }
  },

  async updateProgress(userId, progressData) {
    // Update local twin data
    await twinRepository.updateProgress(userId, progressData)

    // Send progress update to AI service for learning
    await aiServiceClient.post('/twin/progress', {
      userId,
      ...progressData,
    })

    return {
      success: true,
      message: 'Progress updated successfully',
    }
  },
}
