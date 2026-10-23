import { learningAcademyService } from '../services/learningAcademy.service.js';
import { asyncHandler } from '../utils/errorHandler.js';

const defaultGuestUser = {
  id: 'guest-learning-academy',
  email: 'guest@example.com',
  name: 'Guest Student',
  role: 'student',
}

const asAcademyUser = (user) => user && user.id ? user : defaultGuestUser

const pickGuestHeaders = (req) => ({
  guestId: req.headers['x-guest-id']
    ? String(req.headers['x-guest-id']).slice(0, 64)
    : undefined,
  sessionId: req.headers['x-session-id']
    ? String(req.headers['x-session-id']).slice(0, 64)
    : undefined,
})

export const learningAcademyController = {
  generateLesson: asyncHandler(async (req, res) => {
    const { topic, difficulty, subject } = req.body || {};
    const user = asAcademyUser(req.user);
    const { guestId, sessionId } = pickGuestHeaders(req);
    const result = await learningAcademyService.generateLesson({
      user, topic, difficulty, subject, guestId, sessionId,
    });
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Lesson generated successfully'
    });
  }),

  generateMission: asyncHandler(async (req, res) => {
    const { topic, difficulty } = req.body || {};
    const user = asAcademyUser(req.user);
    const { guestId, sessionId } = pickGuestHeaders(req);
    const result = await learningAcademyService.generateMission({
      user, topic, difficulty, guestId, sessionId,
    });
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Mission generated successfully'
    });
  }),

  generatePrediction: asyncHandler(async (req, res) => {
    const { topic, difficulty, concept } = req.body || {};
    const user = asAcademyUser(req.user);
    const { guestId, sessionId } = pickGuestHeaders(req);
    const result = await learningAcademyService.generatePrediction({
      user, topic, difficulty, concept, guestId, sessionId,
    });
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Prediction generated successfully'
    });
  }),

  submitPrediction: asyncHandler(async (req, res) => {
    const { activityId, topic, predictionAnswer, isCorrect, correctReasoning } = req.body || {};
    const user = asAcademyUser(req.user);
    const { guestId, sessionId } = pickGuestHeaders(req);
    const result = await learningAcademyService.submitPrediction({
      user,
      activityId,
      sessionId,
      guestId,
      topic,
      predictionAnswer,
      isCorrect: Boolean(isCorrect),
      correctReasoning,
    });
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Prediction submitted successfully'
    });
  }),

  evaluateTeachBack: asyncHandler(async (req, res) => {
    const { topic, userExplanation, lesson, activityId } = req.body || {};
    const user = asAcademyUser(req.user);
    const { guestId, sessionId } = pickGuestHeaders(req);
    const result = await learningAcademyService.evaluateTeachBack({
      user, topic, userExplanation, lesson, activityId, sessionId, guestId,
    });
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Teach-back evaluated successfully'
    });
  }),

  fixMisconception: asyncHandler(async (req, res) => {
    const { topic, wrongAnswer, correctAnswer, question, activityId } = req.body || {};
    const user = asAcademyUser(req.user);
    const { guestId, sessionId } = pickGuestHeaders(req);
    const result = await learningAcademyService.fixMisconception({
      user, topic, wrongAnswer, correctAnswer, question, activityId, sessionId, guestId,
    });
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Misconception fix generated successfully'
    });
  }),

  resolveMisconceptionFixed: asyncHandler(async (req, res) => {
    const user = asAcademyUser(req.user);
    const { activityId } = req.body || {};
    const result = await learningAcademyService.resolveMisconceptionFixed({ user, activityId });
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Misconception resolved successfully'
    });
  }),

  generateWhatIf: asyncHandler(async (req, res) => {
    const { topic, difficulty, seedPrompt, activityId } = req.body || {};
    const user = asAcademyUser(req.user);
    const { guestId, sessionId } = pickGuestHeaders(req);
    const result = await learningAcademyService.generateWhatIf({
      user, topic, difficulty, seedPrompt, activityId, sessionId, guestId,
    });
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'What-if scenario generated successfully'
    });
  }),

  markStageCompleted: asyncHandler(async (req, res) => {
    const user = asAcademyUser(req.user);
    const { activityId, stage, sessionId: sessionIdBody, guestId: guestIdBody, topic } = req.body || {};
    const headers = pickGuestHeaders(req);
    const result = await learningAcademyService.markStageCompleted({
      user,
      activityId,
      stage,
      sessionId: sessionIdBody || headers.sessionId,
      guestId: guestIdBody || headers.guestId,
      topic,
    });
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Stage completed successfully'
    });
  }),

  getRecentActivity: asyncHandler(async (req, res) => {
    const user = req.user; // only for real users since route is after authMiddleware
    const limit = Math.min(50, Number(req.query.limit) || 10);
    const data = await learningAcademyService.getRecentActivity({ user, limit });
    res.status(200).json({
      status: 'success',
      data: { items: data },
      message: 'Recent activity retrieved successfully'
    });
  }),
};

export default learningAcademyController;
