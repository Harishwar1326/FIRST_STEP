import { learningService } from '../services/learning.service.js';
import { learningProfileService } from '../services/learningProfile.service.js';
import { seedLessons } from '../utils/seedLessons.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';

export const learningController = {
  // GET /lessons
  getLessons: asyncHandler(async (req, res) => {
    const { class: className, subject, chapter } = req.query;
    const lessons = await learningService.getLessons({ class: className, subject, chapter });
    res.status(200).json({
      status: 'success',
      data: lessons,
      message: 'Lessons retrieved successfully'
    });
  }),

  // GET /lesson/:id
  getLessonById: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const details = await learningService.getLessonById(id);
    res.status(200).json({
      status: 'success',
      data: details,
      message: 'Lesson details retrieved successfully'
    });
  }),

  // POST /lessons/import
  importLessons: asyncHandler(async (req, res) => {
    const status = await seedLessons();
    res.status(200).json({
      status: 'success',
      data: { status },
      message: 'Curriculum seeded successfully'
    });
  }),

  // POST /quiz/submit
  submitQuiz: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { lessonId, answers } = req.body;
    if (!lessonId || !answers) {
      throw new AppError('lessonId and answers are required', 400);
    }

    const result = await learningService.submitQuiz(userId, lessonId, answers);
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Quiz submitted successfully'
    });
  }),

  // POST /task/submit
  submitTask: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { lessonId, taskData } = req.body;
    if (!lessonId || !taskData) {
      throw new AppError('lessonId and taskData are required', 400);
    }

    const result = await learningService.submitTask(userId, lessonId, taskData);
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Task submitted successfully'
    });
  }),

  // POST /learning/update
  updateLearningProfile: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const profile = await learningService.getOrCreateProfile(userId);

    // The route schema accepts only user-supplied activity fields. Identity and
    // model-derived mastery fields stay under server control.
    Object.assign(profile, req.body);

    // Persist the activity fields only. A profile update is not a quiz result
    // and must not be passed to the prediction model as one.
    await profile.save();
    res.status(200).json({
      status: 'success',
      data: { profile },
      message: 'Profile updated and synchronized successfully'
    });
  }),

  // GET /learning/profile
  getLearningProfile: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const profile = await learningProfileService.getStudentLearningProfile(userId);
    res.status(200).json({
      status: 'success',
      data: { profile },
      message: 'Learning profile retrieved successfully'
    });
  }),

  // GET /learning/path
  getLearningPath: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { class: className, subject } = req.query;

    if (!className || !subject) {
      throw new AppError('class and subject query parameters are required', 400);
    }

    const path = await learningService.getLearningPath(userId, className, subject);
    res.status(200).json({
      status: 'success',
      data: path,
      message: 'Learning path retrieved successfully'
    });
  }),

  // GET /recommendations
  getRecommendations: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const recs = await learningService.getRecommendations(userId);
    res.status(200).json({
      status: 'success',
      data: recs,
      message: 'Recommendations retrieved successfully'
    });
  }),

  // GET /analytics
  getAnalytics: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const analytics = await learningService.getAnalytics(userId);
    res.status(200).json({
      status: 'success',
      data: analytics,
      message: 'Learning analytics retrieved successfully'
    });
  }),
};
