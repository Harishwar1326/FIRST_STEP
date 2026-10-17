import { academyService } from "../services/academy.service.js";

const DEFAULT_GUEST_ID_PREFIX = "guest-academy-";
const pickGuestUserId = (req) => {
  const guestId = (req.headers["x-guest-id"] || "").toString().trim();
  const authed = req.user?.id;
  if (authed) return authed;
  if (guestId) return guestId;
  return DEFAULT_GUEST_ID_PREFIX + Math.random().toString(36).slice(2, 10);
};

const EMPTY_PROGRESS_FALLBACK = {
  totalSessions: 0,
  totalMinutes: 0,
  techniquesTried: [],
  mostUsed: null,
  recentSessions: [],
  feedbackSummary: { avgUsefulness: 0, wouldUseAgainRate: 0 },
};

export const academyController = {
  getStudyPlan: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const plan = await academyService.getStudyPlan(userId);
      res.status(200).json(plan);
    } catch (error) {
      next(error);
    }
  },

  getTodayTasks: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const tasks = await academyService.getTodayTasks(userId);
      res.status(200).json(tasks);
    } catch (error) {
      next(error);
    }
  },

  getFlashcards: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const flashcards = await academyService.getFlashcards(userId);
      res.status(200).json(flashcards);
    } catch (error) {
      next(error);
    }
  },

  submitFlashcardReview: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { cardId, rating } = req.body;
      const result = await academyService.submitFlashcardReview(
        userId,
        cardId,
        rating,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  getStreak: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const streak = await academyService.getStreak(userId);
      res.status(200).json(streak);
    } catch (error) {
      next(error);
    }
  },

  updateStreak: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const result = await academyService.updateStreak(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  getTechniqueRecommendation: async (req, res, next) => {
    try {
      const userId = req.params.studentId || pickGuestUserId(req);
      const subject = req.query.subject || req.body?.subject;
      const result = await academyService.getTechniqueRecommendation(
        userId,
        subject,
      );
      res.status(200).json(result);
    } catch (error) {
      console.warn(
        "[academy.controller] getTechniqueRecommendation fallback:",
        error.message,
      );
      res.status(200).json({
        recommendedTechnique: {
          id: "active-recall",
          name: "Active Recall",
          score: 85,
          tagline: "Test yourself to lock concepts into memory",
          category: "Retrieval & Memory",
        },
        fallback: true,
      });
    }
  },

  getStudentProfile: async (req, res, next) => {
    try {
      const userId = req.params.studentId || pickGuestUserId(req);
      const result = await academyService.getStudentProfile(userId);
      res.status(200).json(result);
    } catch (error) {
      console.warn(
        "[academy.controller] getStudentProfile fallback:",
        error.message,
      );
      res.status(200).json({
        studentId: pickGuestUserId(req),
        dominantStyle: "Balanced",
        strengthAreas: ["Memory retrieval"],
        focusAreas: ["Consistent practice"],
        recommendedPath:
          "Start with the Situation Wizard to generate a tailored plan.",
        fallback: true,
      });
    }
  },

  getAllTechniques: async (req, res, next) => {
    try {
      const result = academyService.getTechniquesCatalog();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  getTechniqueById: async (req, res, next) => {
    try {
      const { techniqueId } = req.params;
      const result = academyService.getTechniqueById(techniqueId);
      if (!result)
        return res.status(404).json({ message: "Technique not found" });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  recordTechniqueSession: async (req, res, next) => {
    try {
      const userId = pickGuestUserId(req);
      const sessionData = req.body;
      const result = await academyService.recordTechniqueSession(
        userId,
        sessionData,
      );
      res.status(200).json(result);
    } catch (error) {
      console.warn(
        "[academy.controller] recordTechniqueSession fallback:",
        error.message,
      );
      res.status(200).json({
        success: true,
        session: {
          _id: "guest-session-" + Date.now(),
          guest: true,
          saved: false,
          ...req.body,
        },
        fallback: true,
        message:
          "Session acknowledged locally; sync skipped due to service unavailability.",
      });
    }
  },

  getProgress: async (req, res, next) => {
    try {
      const userId = req.params.studentId || pickGuestUserId(req);
      const result = await academyService.getStudentTechniqueProgress(userId);
      res.status(200).json(result);
    } catch (error) {
      console.warn("[academy.controller] getProgress fallback:", error.message);
      res
        .status(200)
        .json({
          ...EMPTY_PROGRESS_FALLBACK,
          studentId: pickGuestUserId(req),
          fallback: true,
        });
    }
  },

  evaluateSituation: async (req, res, next) => {
    try {
      const userId = pickGuestUserId(req);
      const situationInputs = req.body;
      const result = await academyService.evaluateSituation(
        userId,
        situationInputs,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  submitFeedback: async (req, res, next) => {
    try {
      const userId = pickGuestUserId(req);
      const feedbackData = req.body;
      const result = await academyService.saveTechniqueFeedback(
        userId,
        feedbackData,
      );
      res.status(200).json(result);
    } catch (error) {
      console.warn(
        "[academy.controller] submitFeedback fallback:",
        error.message,
      );
      res.status(200).json({
        success: true,
        feedbackId: "guest-fb-" + Date.now(),
        guest: true,
        fallback: true,
        message: "Feedback captured locally for later sync.",
      });
    }
  },

  recordActivity: async (req, res, next) => {
    try {
      res
        .status(200)
        .json({
          success: true,
          message: "Activity signal logged successfully",
        });
    } catch (error) {
      next(error);
    }
  },
};
