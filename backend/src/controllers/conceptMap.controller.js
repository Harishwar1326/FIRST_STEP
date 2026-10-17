import { conceptMapService } from "../services/conceptMap.service.js";

export const conceptMapController = {
  generate: async (req, res, next) => {
    try {
      const concept = req.body?.concept;
      const graph = await conceptMapService.generate(concept);
      res.status(200).json(graph);
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(503).json({
        message: "Unable to build the concept map right now. Please try again.",
      });
    }
  },
};
