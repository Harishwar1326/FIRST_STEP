import { thinkingRepository } from '../repositories/thinking.repository.js'
import { aiServiceClient } from '../utils/aiServiceClient.js'

export const thinkingService = {
  async getDailyChallenge(userId) {
    // Check if there's already a challenge for today
    const todayChallenge = await thinkingRepository.findTodayChallenge(userId)

    if (todayChallenge) {
      return {
        id: todayChallenge._id,
        type: todayChallenge.type,
        title: todayChallenge.title,
        description: todayChallenge.description,
        bloomLevel: todayChallenge.bloomLevel,
        timeLimit: todayChallenge.timeLimit,
        difficulty: todayChallenge.difficulty,
        points: todayChallenge.points,
        completed: todayChallenge.completed,
      }
    }

    // Generate new challenge using AI service
    const aiResponse = await aiServiceClient.post('/thinking/challenge/generate', {
      userId,
    })

    const challenge = await thinkingRepository.createChallenge({
      userId,
      ...aiResponse.data,
    })

    return {
      id: challenge._id,
      type: challenge.type,
      title: challenge.title,
      description: challenge.description,
      bloomLevel: challenge.bloomLevel,
      timeLimit: challenge.timeLimit,
      difficulty: challenge.difficulty,
      points: challenge.points,
      completed: false,
    }
  },

  async submitAnswer(userId, challengeId, answer) {
    // Get challenge
    const challenge = await thinkingRepository.findChallengeById(challengeId)
    if (!challenge) {
      throw new Error('Challenge not found')
    }

    // Evaluate answer using AI service
    const aiResponse = await aiServiceClient.post('/thinking/answer/evaluate', {
      challengeId,
      answer,
      expectedAnswer: challenge.expectedAnswer,
    })

    // Save submission
    const submission = await thinkingRepository.createSubmission({
      userId,
      challengeId,
      answer,
      score: aiResponse.data.score,
      feedback: aiResponse.data.feedback,
      reasoning: aiResponse.data.reasoning,
    })

    // Update challenge as completed
    await thinkingRepository.markChallengeCompleted(challengeId)

    // Update thinking skills
    await thinkingRepository.updateThinkingSkills(userId, aiResponse.data.skills)

    return {
      submissionId: submission._id,
      score: aiResponse.data.score,
      feedback: aiResponse.data.feedback,
      reasoning: aiResponse.data.reasoning,
      skillsUpdated: aiResponse.data.skills,
      pointsEarned: challenge.points * (aiResponse.data.score / 100),
    }
  },

  async getThinkingScore(userId) {
    const skills = await thinkingRepository.findThinkingSkills(userId)

    return {
      overallScore: skills?.overallScore || 0,
      criticalThinking: skills?.criticalThinking || 0,
      problemSolving: skills?.problemSolving || 0,
      creativity: skills?.creativity || 0,
      logicalReasoning: skills?.logicalReasoning || 0,
      trends: skills?.trends || {},
    }
  },

  async getHistory(userId) {
    const submissions = await thinkingRepository.findSubmissionsByUserId(userId)

    return {
      submissions: submissions.map((sub) => ({
        id: sub._id,
        date: sub.createdAt,
        challenge: sub.challengeTitle,
        score: sub.score,
        status: sub.score >= 70 ? 'completed' : 'needs-improvement',
      })),
      totalSubmissions: submissions.length,
      averageScore:
        submissions.length > 0
          ? submissions.reduce((acc, s) => acc + s.score, 0) / submissions.length
          : 0,
    }
  },
}
