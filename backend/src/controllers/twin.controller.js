import { twinService } from "../services/twin.service.js";

const defaultGuestUser = {
  id: "guest-learning-twin",
  email: "guest@example.com",
  name: "Guest Student",
  role: "student",
};

const asTwinUser = (user) => (user && user.id ? user : defaultGuestUser);

export const twinController = {
  getProfile: async (req, res, next) => {
    try {
      const user = asTwinUser(req.user);
      const profile = await twinService.getProfile(user.id, user.name);
      res.status(200).json(profile);
    } catch (error) {
      next(error);
    }
  },

  getAnalytics: async (req, res, next) => {
    try {
      const userId = asTwinUser(req.user).id;
      const analytics = await twinService.getAnalytics(userId);
      res.status(200).json(analytics);
    } catch (error) {
      next(error);
    }
  },

  getRecommendations: async (req, res, next) => {
    try {
      const userId = asTwinUser(req.user).id;
      const recommendations = await twinService.getRecommendations(userId);
      res.status(200).json(recommendations);
    } catch (error) {
      next(error);
    }
  },

  updateProgress: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const progressData = req.body;
      const result = await twinService.updateProgress(userId, progressData);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
};
