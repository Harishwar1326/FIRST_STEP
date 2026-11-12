import { LearningProfile } from "../models/learningProfile.model.js";
import { learningProfileService } from "./learningProfile.service.js";

const toFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeDifficulty = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["easy", "beginner"].includes(normalized)) return "beginner";
  if (["advanced", "highly advanced"].includes(normalized)) return "advanced";
  if (["medium", "intermediate", "standard"].includes(normalized)) return "standard";
  return null;
};

const readSavedProfile = async (userId) => LearningProfile.findOne({ userId: String(userId) })
  .select("masteryScore retentionProbability difficulty predictionSource predictionTrainingData difficultySource weakConcepts quizScores updatedAt")
  .lean();

export const modelPersonalizationService = {
  async getStudentGuidance(userId, { refresh = false } = {}) {
    if (!userId) return null;
    let profile = null;
    try {
      profile = await readSavedProfile(userId);
    } catch (error) {
      console.warn("Could not read saved model-based student guidance:", error.code || error.statusCode || error.message);
      return null;
    }
    if (refresh || !profile) {
      try {
        await learningProfileService.getStudentLearningProfile(String(userId));
        profile = await readSavedProfile(userId);
      } catch (error) {
        console.warn("Could not refresh model-based student guidance:", error.code || error.statusCode || error.message);
      }
    }
    if (!profile?.predictionSource) return null;
    return {
      difficultyBand: normalizeDifficulty(profile.difficulty),
      masteryEstimate: toFiniteNumber(profile.masteryScore),
      retentionEstimate: toFiniteNumber(profile.retentionProbability),
      source: profile.predictionSource,
      trainingData: profile.predictionTrainingData || "unknown",
      difficultySource: profile.difficultySource || "unknown",
      experimental: profile.predictionTrainingData === "synthetic",
      weakConcepts: Array.isArray(profile.weakConcepts) ? profile.weakConcepts.slice(0, 8) : [],
      recentQuizCount: Array.isArray(profile.quizScores) ? profile.quizScores.length : 0,
    };
  },
};

export default modelPersonalizationService;
