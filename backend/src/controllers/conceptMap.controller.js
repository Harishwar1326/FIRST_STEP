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

  explainEntity: asyncHandler(async (req, res) => {
    const details = await conceptMapService.explainEntity({
      concept: req.body?.concept,
      entity: req.body?.entity,
      type: req.body?.type,
      definition: req.body?.definition,
      connectedEntities: req.body?.connectedEntities,
    });
    res.status(200).json({ status: "success", data: details });
  }),
};
