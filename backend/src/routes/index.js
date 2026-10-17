import express from "express";
import authRoutes from "./auth.routes.js";
import notesRoutes from "./notes.routes.js";
import twinRoutes from "./twin.routes.js";
import academyRoutes from "./academy.routes.js";
import thinkingRoutes from "./thinking.routes.js";
import forestRoutes from "./forest.routes.js";
import learningRoutes from "./learning.routes.js";
import learningAcademyRoutes from "./learningAcademy.routes.js";
import programmingLearningRoutes from "./programmingLearning.routes.js";
import adminRoutes from "./admin.routes.js";
import learningAssessmentRoutes from "./learningAssessment.routes.js";
import conceptMapRoutes from "./conceptMap.routes.js";
import learningProfileRoutes from "./learningProfile.routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/notes", notesRoutes);
router.use("/twin", twinRoutes);
router.use("/academy", academyRoutes);
router.use("/thinking", thinkingRoutes);
router.use("/thinking-lab", thinkingRoutes);
router.use("/forest", forestRoutes);
router.use("/programming-learning", programmingLearningRoutes);
router.use("/admin", adminRoutes);
router.use("/learning-assessment", learningAssessmentRoutes);
router.use("/learning-profile", learningProfileRoutes);
router.use("/concept-map", conceptMapRoutes);
router.use("/learning/ai", learningAcademyRoutes);
router.use("/academy-ai", learningAcademyRoutes);
router.use("/", learningRoutes);

export default router;
