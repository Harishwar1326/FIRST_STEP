import { conceptMapService } from "../services/conceptMap.service.js";
import { asyncHandler } from "../utils/errorHandler.js";

export const conceptMapController = {
  generate: asyncHandler(async (req, res) => {
    const concept = req.body?.concept;
    const graph = await conceptMapService.generate(concept);
    res.status(200).json({
      status: 'success',
      data: graph,
      message: 'Concept map generated successfully'
    });
  }),
};
