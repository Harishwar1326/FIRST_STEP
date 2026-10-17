import { learningProfileService } from '../services/learningProfile.service.js';

export const learningProfileController = {
  /**
   * GET /api/v1/learning-profile
   * Returns complete dynamic, ML-powered learning profile for the authenticated student.
   */
  getProfile: async (req, res, next) => {
    try {
      const userId = String(req.user?.id || req.user?._id || '');
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'User authentication required',
        });
      }

      const profile = await learningProfileService.getStudentLearningProfile(userId);
      res.status(200).json(profile);
    } catch (error) {
      next(error);
    }
  },
};

export default learningProfileController;
