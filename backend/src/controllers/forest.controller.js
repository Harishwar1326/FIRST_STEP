import { forestService } from "../services/forest.service.js";

export const forestController = {
  getKnowledgeGraph: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const graph = await forestService.getKnowledgeGraph(userId);
      res.status(200).json(graph);
    } catch (error) {
      next(error);
    }
  },

  getConceptDetails: async (req, res, next) => {
    try {
      const { conceptId } = req.params;
      const userId = req.user.id;
      const details = await forestService.getConceptDetails(conceptId, userId);
      res.status(200).json(details);
    } catch (error) {
      next(error);
    }
  },

  getLearningPath: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const path = await forestService.getLearningPath(userId);
      res.status(200).json(path);
    } catch (error) {
      next(error);
    }
  },

  detectGaps: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const gaps = await forestService.detectGaps(userId);
      res.status(200).json(gaps);
    } catch (error) {
      next(error);
    }
  },

  getConceptMap: async (req, res, next) => {
    try {
      const concept = req.body?.concept || req.query?.concept || "";
      const map = await forestService.getConceptMap(req.user.id, concept);
      res.status(200).json(map);
    } catch (error) {
      next(error);
    }
  },
};
