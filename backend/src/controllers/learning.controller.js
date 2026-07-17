import { learningService } from '../services/learning.service.js';
import { seedLessons } from '../utils/seedLessons.js';

export const learningController = {
  // GET /lessons
  getLessons: async (req, res, next) => {
    try {
      const { class: className, subject, chapter } = req.query;
      const lessons = await learningService.getLessons({ class: className, subject, chapter });
      res.status(200).json(lessons);
    } catch (error) {
      next(error);
    }
  },

  // GET /lesson/:id
  getLessonById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const details = await learningService.getLessonById(id);
      res.status(200).json(details);
    } catch (error) {
      next(error);
    }
  },

  // POST /lessons/import
  importLessons: async (req, res, next) => {
    try {
      const status = await seedLessons();
      res.status(200).json({
        message: 'Curriculum seeded successfully',
        status,
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /quiz/submit
  submitQuiz: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { lessonId, answers } = req.body;
      if (!lessonId || !answers) {
        return res.status(400).json({ message: 'lessonId and answers are required' });
      }

      const result = await learningService.submitQuiz(userId, lessonId, answers);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  // POST /task/submit
  submitTask: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { lessonId, taskData } = req.body;
      if (!lessonId || !taskData) {
        return res.status(400).json({ message: 'lessonId and taskData are required' });
      }

      const result = await learningService.submitTask(userId, lessonId, taskData);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  // POST /learning/update
  updateLearningProfile: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const profile = await learningService.getOrCreateProfile(userId);
      
      // Update fields if provided
      const fields = req.body;
      Object.keys(fields).forEach((key) => {
        if (profile[key] !== undefined) {
          profile[key] = fields[key];
        }
      });

      await learningService.syncProfilePredictions(userId, profile, profile.masteryScore);
      res.status(200).json({
        message: 'Profile updated and synchronized successfully',
        profile,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /learning/profile
  getLearningProfile: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const profile = await learningService.getOrCreateProfile(userId);
      res.status(200).json(profile);
    } catch (error) {
      next(error);
    }
  },

  // GET /learning/path
  getLearningPath: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { class: className, subject } = req.query;
      
      if (!className || !subject) {
        return res.status(400).json({ message: 'class and subject query parameters are required' });
      }

      const path = await learningService.getLearningPath(userId, className, subject);
      res.status(200).json(path);
    } catch (error) {
      next(error);
    }
  },

  // GET /recommendations
  getRecommendations: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const recs = await learningService.getRecommendations(userId);
      res.status(200).json(recs);
    } catch (error) {
      next(error);
    }
  },

  // GET /analytics
  getAnalytics: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const analytics = await learningService.getAnalytics(userId);
      res.status(200).json(analytics);
    } catch (error) {
      next(error);
    }
  },
};
