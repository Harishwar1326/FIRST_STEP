import mongoose from 'mongoose'
import { KnowledgeGraph } from '../models/forest.model.js'
import { LearningPath } from '../models/forest.model.js'

export const forestRepository = {
  async createGraph(graphData) {
    const graph = new KnowledgeGraph(graphData)
    await graph.save()
    return graph
  },

  async findGraphByUserId(userId) {
    return KnowledgeGraph.findOne({ userId })
  },

  async findConceptById(conceptId) {
    return KnowledgeGraph.findOne(
      { 'nodes.id': conceptId },
      { 'nodes.$': 1 }
    ).then((graph) => graph?.nodes[0])
  },

  async updateGraph(userId, graphData) {
    return KnowledgeGraph.findOneAndUpdate(
      { userId },
      graphData,
      { new: true, upsert: true }
    )
  },

  async createLearningPath(pathData) {
    const path = new LearningPath(pathData)
    await path.save()
    return path
  },

  async findLearningPathByUserId(userId) {
    return LearningPath.findOne({ userId })
  },

  async updateLearningPath(userId, pathData) {
    return LearningPath.findOneAndUpdate(
      { userId },
      pathData,
      { new: true, upsert: true }
    )
  },

  async updateGaps(userId, gaps) {
    return KnowledgeGraph.findOneAndUpdate(
      { userId },
      { gaps },
      { new: true }
    )
  },
}
