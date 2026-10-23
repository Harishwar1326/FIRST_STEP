import { academyRepository } from "../repositories/academy.repository.js";
import { aiServiceClient } from "../utils/aiServiceClient.js";
import { studyTechniqueEngineService } from "./studyTechniqueEngine.service.js";
import { callGroqJson } from "../utils/groqClient.js";
import { LEARNING_TECHNIQUES } from "../data/learningTechniques.data.js";

const TECHNIQUE_IDS = LEARNING_TECHNIQUES.map((t) => t.id).join(", ");
const TECHNIQUE_CHOICES = LEARNING_TECHNIQUES.map(
  (t) => `- ${t.id} (${t.name}): ${t.tagline}`,
).join("\n");

const aiEvaluateSituation = async (situationInputs) => {
  const systemPrompt = [
    "You are FirstStep Learning Academy's study strategy recommender.",
    "Given a student's situation (8 fields below), select a single best study technique from the catalog below.",
    "Produce ONLY valid JSON with exactly this shape and no markdown fences:",
    "{",
    "  primaryTechniqueId: string,      // must be one of the technique id values in the list",
    "  primaryMatchScore: number,       // integer 50..98, higher = better fit",
    "  whyReason: string,               // 1-2 sentences, specific to the given inputs. No generic fluff.",
    "  secondaryTechniqueIds: string[], // exactly 3 other technique ids ordered by fit",
    "  scheduleBlockMinutes: number,    // single block length recommendation: 15, 20, 25, 45, or 50",
    "  schedule: { time: string, title: string, activity: string }[] // 3..6 steps, time labels must match the input timeWindow",
    "}",
    'The schedule must be personalized to the situation and never use placeholders like "your topic". Substitute the actual subject.',
    'Each schedule activity must be a concrete, actionable step tied to the chosen primary technique. No "rest / hydrate" fluff unless the window is over 90 minutes.',
    "whyReason must explicitly reference at least 3 of: timeWindow, goal, subject, difficulty, interestLevel, preparationLevel, confidenceLevel, mainProblem.",
    "",
    `Available techniques (use ONLY the exact ids listed here: ${TECHNIQUE_IDS}):`,
    TECHNIQUE_CHOICES,
  ].join("\n");
  return callGroqJson({
    systemPrompt,
    userPayload: situationInputs,
    maxTokens: 700,
    temperature: 0.35,
  });
};

const buildFallbackResult = (userId, situationInputs) =>
  studyTechniqueEngineService.evaluateSituation(userId, situationInputs);

const hydrateTechnique = (id, fallbackScore) => {
  const base = LEARNING_TECHNIQUES.find((t) => t.id === id);
  if (!base) return null;
  return {
    id,
    name: base.name,
    score: fallbackScore ?? base.matchHint ?? 70,
    tagline: base.tagline,
    category: base.category,
    description: base.description,
    bestUsedWhen: base.bestUsedWhen,
    notIdealWhen: base.notIdealWhen,
    steps: base.steps,
    recommendedDuration: base.recommendedDuration,
    example: base.example,
    commonMistakes: base.commonMistakes,
    activities: base.activities,
  };
};

const TYPICAL_SECONDARY_SCORES = [78, 72, 66];

export const academyService = {
  async getStudyPlan(userId) {
    let plan = await academyRepository.findStudyPlanByUserId(userId);

    if (!plan) {
      // Generate initial study plan using AI service
      const aiResponse = await aiServiceClient.post("/academy/plan/generate", {
        userId,
      });

      plan = await academyRepository.createStudyPlan({
        userId,
        ...aiResponse.data,
      });
    }

    return {
      planId: plan._id,
      weeklyGoals: plan.weeklyGoals || [],
      dailyTasks: plan.dailyTasks || [],
      techniques: plan.techniques || ["spaced-repetition", "active-recall"],
      estimatedCompletion: plan.estimatedCompletion,
    };
  },

  async getTodayTasks(userId) {
    const tasks = await academyRepository.findTodayTasks(userId);
    return {
      tasks: tasks.map((task) => ({
        id: task._id,
        task: task.title,
        technique: task.technique,
        duration: task.duration,
        completed: task.completed,
        priority: task.priority,
      })),
    };
  },

  async getFlashcards(userId) {
    const flashcards = await academyRepository.findDueFlashcards(userId);
    return {
      flashcards: flashcards.map((card) => ({
        id: card._id,
        front: card.front,
        back: card.back,
        difficulty: card.difficulty,
        nextReview: card.nextReview,
      })),
      dueCount: flashcards.length,
    };
  },

  async submitFlashcardReview(userId, cardId, rating) {
    // Update flashcard with new rating
    const updatedCard = await academyRepository.updateFlashcardReview(
      cardId,
      userId,
      rating,
    );

    // Send review data to AI service for spaced repetition algorithm
    await aiServiceClient.post("/academy/flashcard/review", {
      userId,
      cardId,
      rating,
    });

    return {
      success: true,
      nextReview: updatedCard.nextReview,
      message: "Flashcard reviewed successfully",
    };
  },

  async getStreak(userId) {
    const streakData = await academyRepository.findStreakByUserId(userId);

    return {
      currentStreak: streakData?.currentStreak || 0,
      longestStreak: streakData?.longestStreak || 0,
      lastStudyDate: streakData?.lastStudyDate,
      streakHistory: streakData?.history || [],
    };
  },

  async updateStreak(userId) {
    // Update streak in database
    const streak = await academyRepository.updateStreak(userId);

    // Also update in AI service for analytics
    await aiServiceClient.post("/academy/streak/update", {
      userId,
    });

    return streak;
  },

  async getTechniqueRecommendation(userId, subject) {
    try {
      const response = await aiServiceClient.post(
        "/academy/technique/recommend",
        {
          userId,
          subject,
        },
      );
      if (response.data && response.data.recommendedTechnique) {
        return response.data;
      }
    } catch (err) {
      console.warn(
        "AI service technique recommend fallback to local engine:",
        err.message,
      );
    }

    return await studyTechniqueEngineService.generateRecommendation(userId);
  },

  async evaluateSituation(userId, situationInputs) {
    const {
      timeAvailable = "1–3 hours",
      goal = "Preparing for an upcoming exam",
      subject = "General",
      difficulty = "Moderate",
      interestLevel = "Interested",
      preparationLevel = "Some topics",
      confidenceLevel = "Moderate",
      mainProblem = "I understand but forget later",
    } = situationInputs;

    const normalizedInputs = {
      timeWindow: timeAvailable,
      timeAvailable,
      goal,
      subject,
      difficulty,
      interestLevel,
      preparationLevel,
      confidenceLevel,
      mainProblem,
    };

    let situationDoc = null;
    try {
      situationDoc = await import("../models/academy.model.js").then((m) =>
        m.StudentLearningSituation.create({
          userId,
          timeAvailable,
          goal,
          subject,
          difficulty,
          interestLevel,
          preparationLevel,
          confidenceLevel,
          mainProblem,
        }),
      );
    } catch (err) {
      console.warn("Situation log save notice:", err.message);
    }

    let aiResult = null;
    try {
      aiResult = await aiEvaluateSituation(normalizedInputs);
    } catch (err) {
      console.warn(
        "Groq situation evaluate fallback to rule engine:",
        err.message,
      );
    }

    if (
      aiResult &&
      typeof aiResult === "object" &&
      typeof aiResult.primaryTechniqueId === "string"
    ) {
      const primary = hydrateTechnique(
        aiResult.primaryTechniqueId,
        aiResult.primaryMatchScore,
      );
      if (primary) {
        const secondary = (
          Array.isArray(aiResult.secondaryTechniqueIds)
            ? aiResult.secondaryTechniqueIds
            : []
        )
          .map((id, i) =>
            hydrateTechnique(id, TYPICAL_SECONDARY_SCORES[i] || 70),
          )
          .filter(Boolean)
          .slice(0, 3);

        const schedule = Array.isArray(aiResult.schedule)
          ? aiResult.schedule
          : [];
        const blockMinutes = Number(aiResult.scheduleBlockMinutes) || 25;

        try {
          const { TechniqueRecommendation } =
            await import("../models/academy.model.js");
          await TechniqueRecommendation.create({
            userId,
            primaryTechnique: primary.name,
            primaryScore: primary.score,
            reason: aiResult.whyReason || "",
            secondaryTechniques: secondary.map((s) => ({
              name: s.name,
              score: s.score,
              reason: s.tagline,
            })),
            recommendedAction: {
              subject,
              topic: `${subject} Core Module`,
              duration: blockMinutes,
              activity: `Execute ${primary.name} following the personalized schedule.`,
            },
          });
        } catch (err) {
          console.warn("Recommendation record save notice:", err.message);
        }

        return {
          studentId: userId,
          situationId: situationDoc?._id || null,
          situationInputs: normalizedInputs,
          recommendedTechnique: primary,
          whyReason: aiResult.whyReason || "",
          secondaryTechniques: secondary,
          scheduleBlockMinutes: blockMinutes,
          timeAllocatedPlan: schedule.length ? schedule : null,
          aiGenerated: true,
        };
      }
    }

    const fallback = await buildFallbackResult(userId, situationInputs);
    return {
      ...fallback,
      aiGenerated: false,
      situationInputs: normalizedInputs,
    };
  },

  async saveTechniqueFeedback(userId, feedbackData) {
    return await studyTechniqueEngineService.saveTechniqueFeedback(
      userId,
      feedbackData,
    );
  },

  async getStudentProfile(userId) {
    return await studyTechniqueEngineService.calculateStudentProfile(userId);
  },

  getTechniquesCatalog() {
    return studyTechniqueEngineService.getTechniquesCatalog();
  },

  getTechniqueById(techniqueId) {
    return studyTechniqueEngineService.getTechniqueById(techniqueId);
  },

  async recordTechniqueSession(userId, sessionData) {
    return await studyTechniqueEngineService.recordTechniqueSession(
      userId,
      sessionData,
    );
  },

  async getStudentTechniqueProgress(userId) {
    return await studyTechniqueEngineService.getStudentTechniqueProgress(
      userId,
    );
  },
};
