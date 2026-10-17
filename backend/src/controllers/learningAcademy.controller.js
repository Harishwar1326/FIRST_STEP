import { learningAcademyService } from '../services/learningAcademy.service.js';

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

const ok = (res, payload, status = 200) => res.status(status).json(payload)

export const learningAcademyController = {
  generateLesson: async (req, res, next) => {
    try {
      const { topic, difficulty, subject } = req.body || {};
      const user = asAcademyUser(req.user);
      const { guestId, sessionId } = pickGuestHeaders(req);
      const result = await learningAcademyService.generateLesson({
        user, topic, difficulty, subject, guestId, sessionId,
      });
      ok(res, result);
    } catch (error) {
      next(error);
    }
  },

  generateMission: async (req, res, next) => {
    try {
      const { topic, difficulty } = req.body || {};
      const user = asAcademyUser(req.user);
      const { guestId, sessionId } = pickGuestHeaders(req);
      const result = await learningAcademyService.generateMission({
        user, topic, difficulty, guestId, sessionId,
      });
      ok(res, result);
    } catch (error) {
      next(error);
    }
  },

  generatePrediction: async (req, res, next) => {
    try {
      const { topic, difficulty, concept } = req.body || {};
      const user = asAcademyUser(req.user);
      const { guestId, sessionId } = pickGuestHeaders(req);
      const result = await learningAcademyService.generatePrediction({
        user, topic, difficulty, concept, guestId, sessionId,
      });
      ok(res, result);
    } catch (error) {
      next(error);
    }
  },

  submitPrediction: async (req, res, next) => {
    try {
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
      ok(res, result);
    } catch (error) {
      next(error);
    }
  },

  evaluateTeachBack: async (req, res, next) => {
    try {
      const { topic, userExplanation, lesson, activityId } = req.body || {};
      const user = asAcademyUser(req.user);
      const { guestId, sessionId } = pickGuestHeaders(req);
      const result = await learningAcademyService.evaluateTeachBack({
        user, topic, userExplanation, lesson, activityId, sessionId, guestId,
      });
      ok(res, result);
    } catch (error) {
      next(error);
    }
  },

  fixMisconception: async (req, res, next) => {
    try {
      const { topic, wrongAnswer, correctAnswer, question, activityId } = req.body || {};
      const user = asAcademyUser(req.user);
      const { guestId, sessionId } = pickGuestHeaders(req);
      const result = await learningAcademyService.fixMisconception({
        user, topic, wrongAnswer, correctAnswer, question, activityId, sessionId, guestId,
      });
      ok(res, result);
    } catch (error) {
      next(error);
    }
  },

  resolveMisconceptionFixed: async (req, res, next) => {
    try {
      const user = asAcademyUser(req.user);
      const { activityId } = req.body || {};
      const result = await learningAcademyService.resolveMisconceptionFixed({ user, activityId });
      ok(res, result);
    } catch (error) {
      next(error);
    }
  },

  generateWhatIf: async (req, res, next) => {
    try {
      const { topic, difficulty, seedPrompt, activityId } = req.body || {};
      const user = asAcademyUser(req.user);
      const { guestId, sessionId } = pickGuestHeaders(req);
      const result = await learningAcademyService.generateWhatIf({
        user, topic, difficulty, seedPrompt, activityId, sessionId, guestId,
      });
      ok(res, result);
    } catch (error) {
      next(error);
    }
  },

  markStageCompleted: async (req, res, next) => {
    try {
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
      ok(res, result);
    } catch (error) {
      next(error);
    }
  },

  getRecentActivity: async (req, res, next) => {
    try {
      const user = req.user; // only for real users since route is after authMiddleware
      const limit = Math.min(50, Number(req.query.limit) || 10);
      const data = await learningAcademyService.getRecentActivity({ user, limit });
      ok(res, { items: data });
    } catch (error) {
      next(error);
    }
  },
};

export default learningAcademyController;
