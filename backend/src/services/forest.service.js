import { forestRepository } from '../repositories/forest.repository.js'
import { aiServiceClient } from '../utils/aiServiceClient.js'

export const forestService = {
  async getKnowledgeGraph(userId) {
    let graph = await forestRepository.findGraphByUserId(userId)

    if (!graph) {
      // Generate initial knowledge graph using AI service
      const aiResponse = await aiServiceClient.post('/forest/graph/generate', {
        userId,
      })

      graph = await forestRepository.createGraph({
        userId,
        nodes: aiResponse.data.nodes || [],
        edges: aiResponse.data.edges || [],
      })
    }

    return {
      graphId: graph._id,
      nodes: graph.nodes,
      edges: graph.edges,
      lastUpdated: graph.updatedAt,
    }
  },

  async getConceptDetails(conceptId, userId) {
    // Get detailed analysis from AI service
    const aiResponse = await aiServiceClient.post('/forest/concept/details', {
      userId,
      conceptId,
    })

    return aiResponse.data
  },

  async getLearningPath(userId) {
    const path = await forestRepository.findLearningPathByUserId(userId)

    if (!path) {
      // Generate learning path using AI service
      const aiResponse = await aiServiceClient.post('/forest/path/generate', {
        userId,
      })

      const newPath = await forestRepository.createLearningPath({
        userId,
        steps: aiResponse.data.steps || [],
      })

      return {
        pathId: newPath._id,
        steps: newPath.steps,
        estimatedDuration: aiResponse.data.estimatedDuration,
      }
    }

    return {
      pathId: path._id,
      steps: path.steps,
      currentStep: path.currentStep,
      progress: path.progress || 0,
    }
  },

  async detectGaps(userId) {
    // Detect learning gaps using AI service
    const aiResponse = await aiServiceClient.post('/forest/gaps/detect', {
      userId,
    })

    // Save detected gaps
    await forestRepository.updateGaps(userId, aiResponse.data.gaps)

    return {
      gaps: aiResponse.data.gaps || [],
      criticalGaps: aiResponse.data.criticalGaps || [],
      suggestedActions: aiResponse.data.suggestedActions || [],
    }
  },
}
