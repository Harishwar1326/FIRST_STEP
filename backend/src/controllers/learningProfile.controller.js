import { learningProfileService } from '../services/learningProfile.service.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';

export const learningProfileController = {
  /**
   * GET /api/v1/learning-profile
   * Returns complete dynamic, ML-powered learning profile for the authenticated student.
   */
  getProfile: asyncHandler(async (req, res) => {
    const userId = String(req.user?.id || req.user?._id || '');
    if (!userId) {
      throw new AppError('User authentication required', 401);
    }

    const profile = await learningProfileService.getStudentLearningProfile(userId);
    res.status(200).json({
      status: 'success',
      data: { profile },
      message: 'Learning profile retrieved successfully'
    });
  }),
};

export default learningProfileController;
