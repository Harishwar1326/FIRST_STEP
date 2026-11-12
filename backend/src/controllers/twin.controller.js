import { twinService } from "../services/twin.service.js";
import { asyncHandler } from "../utils/errorHandler.js";

export const twinController = {
  getSnapshot: asyncHandler(async (req, res) => {
    const user = req.user;
    const snapshot = await twinService.getSnapshot(user.id, user.name);
    res.status(200).json({ status: 'success', data: snapshot, message: 'Learning Twin snapshot retrieved successfully' });
  }),

  getProfile: asyncHandler(async (req, res) => {
    const user = req.user;
    const profile = await twinService.getProfile(user.id, user.name);
    res.status(200).json({
      status: 'success',
      data: profile,
      message: 'Learning twin profile retrieved successfully'
    });
  }),

  getAnalytics: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const analytics = await twinService.getAnalytics(userId);
    res.status(200).json({
      status: 'success',
      data: analytics,
      message: 'Twin analytics retrieved successfully'
    });
  }),

  getRecommendations: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const recommendations = await twinService.getRecommendations(userId);
    res.status(200).json({
      status: 'success',
      data: recommendations,
      message: 'Twin recommendations retrieved successfully'
    });
  }),

  updateProgress: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const progressData = req.body;
    const result = await twinService.updateProgress(userId, progressData);
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Twin progress updated successfully'
    });
  }),
};
