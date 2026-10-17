import express from "express";
import { academyController } from "../controllers/academy.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public / guest-accessible routes. Strategy Plan Wizard + Results must work
// for unauthenticated users; writes are keyed by x-guest-id header (persisted
// in localStorage as academy_guest_id) and reconciled to the real user after
// login. Auth-only endpoints live below router.use(authMiddleware).
router.post("/situation", academyController.evaluateSituation);
router.post("/technique/recommend", academyController.evaluateSituation);
router.get("/techniques", academyController.getAllTechniques);
router.get("/techniques/:techniqueId", academyController.getTechniqueById);

// Learning Academy - Adaptive Study Technique Engine Routes (guest accessible)
router.get("/profile/:studentId?", academyController.getStudentProfile);
router.get(
  "/recommendation/:studentId?",
  academyController.getTechniqueRecommendation,
);
router.post("/feedback", academyController.submitFeedback);
router.post("/activity", academyController.recordActivity);
router.post("/technique-session", academyController.recordTechniqueSession);
router.get("/progress/:studentId?", academyController.getProgress);

router.use(authMiddleware);

// Authenticated-only routes: user-specific plans, streaks, flashcards
router.get("/plan", academyController.getStudyPlan);
router.get("/today", academyController.getTodayTasks);
router.get("/flashcards", academyController.getFlashcards);
router.post("/flashcards/review", academyController.submitFlashcardReview);
router.get("/streak", academyController.getStreak);
router.post("/streak/update", academyController.updateStreak);

export default router;
