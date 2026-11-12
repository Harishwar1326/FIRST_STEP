import {
  StudentLearningSituation,
  TechniqueRecommendation,
  TechniqueSession,
  StudentTechniquePerformance,
  TechniqueFeedback,
} from "../models/academy.model.js";
import mongoose from "mongoose";
import LearningProfile from "../models/learningProfile.model.js";
import { LEARNING_TECHNIQUES } from "../data/learningTechniques.data.js";

const ownerId = (userId) => String(userId ?? "");
const ownerQuery = (userId) => {
  const id = ownerId(userId);
  const values = [id];
  if (mongoose.Types.ObjectId.isValid(id)) values.push(new mongoose.Types.ObjectId(id));
  return { userId: { $in: values } };
};

export const observedQuizMetrics = (quizScoreBefore, quizScoreAfter) => {
  const before = Number(quizScoreBefore)
  const after = Number(quizScoreAfter)
  const hasBefore = quizScoreBefore !== undefined && quizScoreBefore !== null && Number.isFinite(before) && before >= 0 && before <= 100
  const hasAfter = quizScoreAfter !== undefined && quizScoreAfter !== null && Number.isFinite(after) && after >= 0 && after <= 100
  const metrics = {}
  if (hasBefore) metrics.avgQuizScoreBefore = before
  if (hasAfter) metrics.avgQuizScoreAfter = after
  if (hasBefore && hasAfter && before > 0) {
    metrics.retentionImprovement = Math.round(((after - before) / before) * 100)
  }
  return metrics
}

export const studyTechniqueEngineService = {
  getTechniquesCatalog() {
    return LEARNING_TECHNIQUES;
  },

  getTechniqueById(techniqueId) {
    return LEARNING_TECHNIQUES.find((t) => t.id === techniqueId) || null;
  },

  /**
   * Evaluate situation inputs and calculate situation-based recommendation
   */
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

    // Save situation log for dataset
    let situationDoc = null;
    try {
      situationDoc = await StudentLearningSituation.create({
        userId: ownerId(userId),
        timeAvailable,
        goal,
        subject,
        difficulty,
        interestLevel,
        preparationLevel,
        confidenceLevel,
        mainProblem,
      });
    } catch (err) {
      console.warn("Situation log save notice:", err.message);
    }

    // Base score for all 12 techniques
    const scores = {
      "active-recall": 60,
      "spaced-repetition": 60,
      "retrieval-practice": 55,
      "practice-testing": 50,
      "feynman-technique": 50,
      interleaving: 45,
      pomodoro: 45,
      "concept-mapping": 40,
      blurting: 40,
      sq3r: 35,
      "teach-back": 35,
      "exam-simulation": 40,
    };

    // Situation Rule Engine Adjustments
    const isExamUrgent =
      ["Exam tomorrow", "Exam in a few days"].includes(goal) ||
      ["Less than 1 hour", "1–3 hours"].includes(timeAvailable) ||
      mainProblem === "I have very little time" ||
      mainProblem === "I need to revise quickly";
    const isProblemSolvingNeeded =
      goal === "Improving problem-solving" ||
      mainProblem === "I understand theory but cannot solve problems";
    const isConceptConfusion =
      goal === "Understanding a new topic" ||
      difficulty === "Very Difficult" ||
      mainProblem === "I get confused between concepts";
    const isFocusLow =
      ["Not Interested", "Not Very Interested"].includes(interestLevel) ||
      mainProblem === "I cannot concentrate" ||
      confidenceLevel === "Very Low";
    const isLongTermGoal =
      [
        "Learning for long-term knowledge",
        "Preparing for an upcoming exam",
      ].includes(goal) &&
      ["1 week", "More than 1 week"].includes(timeAvailable);
    const isLost = mainProblem === "I don't know where to start";
    const isInterview = goal === "Preparing for an interview";

    if (isExamUrgent) {
      scores["active-recall"] += 35;
      scores["blurting"] += 30;
      scores["practice-testing"] += 25;
      scores["exam-simulation"] += 25;
      scores["spaced-repetition"] -= 35;
      scores["sq3r"] -= 20;
    }

    if (isLongTermGoal) {
      scores["spaced-repetition"] += 40;
      scores["active-recall"] += 25;
      scores["retrieval-practice"] += 20;
    }

    if (isProblemSolvingNeeded) {
      scores["practice-testing"] += 35;
      scores["interleaving"] += 35;
      scores["retrieval-practice"] += 25;
    }

    if (isConceptConfusion) {
      scores["feynman-technique"] += 40;
      scores["concept-mapping"] += 35;
      scores["teach-back"] += 30;
    }

    if (isFocusLow) {
      scores["pomodoro"] += 45;
      scores["active-recall"] += 20;
    }

    if (isLost) {
      scores["sq3r"] += 40;
      scores["pomodoro"] += 30;
    }

    if (isInterview) {
      scores["teach-back"] += 40;
      scores["active-recall"] += 30;
      scores["interleaving"] += 20;
    }

    // Rank techniques
    const rankedList = Object.keys(scores)
      .map((id) => {
        const cat = LEARNING_TECHNIQUES.find((t) => t.id === id) || {};
        const finalScore = Math.min(98, Math.max(30, scores[id]));
        return {
          id,
          name: cat.name || id,
          score: finalScore,
          tagline: cat.tagline,
          category: cat.category,
          description: cat.description,
          bestUsedWhen: cat.bestUsedWhen,
          notIdealWhen: cat.notIdealWhen,
          steps: cat.steps,
          recommendedDuration: cat.recommendedDuration,
          example: cat.example,
          commonMistakes: cat.commonMistakes,
          activities: cat.activities,
        };
      })
      .sort((a, b) => b.score - a.score);

    const primary = rankedList[0];
    const secondary = rankedList.slice(1, 4);

    // Generate Custom Explainability Reason
    let whyReason = `Based on your situation (${subject}, Goal: ${goal}, Available Time: ${timeAvailable}, Confidence: ${confidenceLevel}), ${primary.name} is recommended because it matches your immediate study objective.`;
    if (isExamUrgent) {
      whyReason = `You have limited time (${timeAvailable}) before your ${goal.toLowerCase()} in ${subject}. Passive rereading is ineffective right now; ${primary.name} allows you to quickly retrieve what you know and test your memory under pressure.`;
    } else if (isLongTermGoal) {
      whyReason = `You have ${timeAvailable} to prepare for ${subject}. Because your goal is long-term retention, ${primary.name} systematically locks concepts into memory at expanding intervals.`;
    } else if (isConceptConfusion) {
      whyReason = `You rated ${subject} as ${difficulty} and stated that you get confused between concepts. ${primary.name} forces you to simplify complex ideas and visually map relationships, exposing hidden gaps.`;
    } else if (isProblemSolvingNeeded) {
      whyReason = `Understanding theory is different from problem-solving. ${primary.name} bridges the gap between passive reading and active problem execution under exam conditions.`;
    } else if (isFocusLow) {
      whyReason = `Because your concentration or interest is low, long continuous study blocks cause burnout. ${primary.name} breaks study time into structured intervals to maintain focus without fatigue.`;
    }

    // Generate "Why NOT this technique?" explanations
    const whyNotExplanations = [];
    if (primary.id !== "spaced-repetition") {
      whyNotExplanations.push({
        techniqueName: "Spaced Repetition",
        reason: `Spaced Repetition is excellent for long-term retention over weeks, but given your current timeline (${timeAvailable} / ${goal}), your immediate priority is rapid retrieval testing rather than long-interval scheduling.`,
      });
    }
    if (primary.id !== "feynman-technique" && isExamUrgent) {
      whyNotExplanations.push({
        techniqueName: "Feynman Technique",
        reason: `The Feynman Technique is superior for deep initial concept building, but with an urgent exam deadline (${goal}), rapid testing and blurting takes precedence.`,
      });
    }
    if (primary.id !== "pomodoro" && !isFocusLow) {
      whyNotExplanations.push({
        techniqueName: "Pomodoro Focus Sessions",
        reason: `Pomodoro is ideal when focus is interrupted or procrastination is high. Since your focus level is stable, continuous active practice is more time-efficient.`,
      });
    }

    // Generate Personalized Time-Allocated Schedule based on available time & subject
    const timeAllocatedPlan = this._generateTimeAllocatedPlan(
      timeAvailable,
      subject,
      primary.name,
    );

    // Persist recommendation record
    try {
      await TechniqueRecommendation.create({
        userId: ownerId(userId),
        primaryTechnique: primary.name,
        primaryScore: primary.score,
        reason: whyReason,
        secondaryTechniques: secondary.map((s) => ({
          name: s.name,
          score: s.score,
          reason: s.tagline,
        })),
        recommendedAction: {
          subject,
          topic: `${subject} Core Module`,
          duration: 25,
          activity: `Execute ${primary.name} following the step-by-step instructions.`,
        },
      });
    } catch (err) {
      console.warn("Recommendation record save notice:", err.message);
    }

    return {
      studentId: userId,
      situationId: situationDoc?._id || null,
      situationInputs,
      recommendedTechnique: primary,
      whyReason,
      secondaryTechniques: secondary,
      whyNotExplanations,
      timeAllocatedPlan,
      allScores: rankedList,
    };
  },

  /**
   * Build time-allocated schedule based on time available
   */
  _generateTimeAllocatedPlan(timeAvailable, subject, techniqueName) {
    if (timeAvailable === "Less than 1 hour") {
      return [
        {
          time: "0:00 – 0:15",
          title: `${techniqueName} – Key Formulas`,
          activity: `Read section for 5 mins, close notes, execute ${techniqueName} for 10 mins.`,
        },
        {
          time: "0:15 – 0:20",
          title: "Rest Break",
          activity: "Step away from screens and stretch.",
        },
        {
          time: "0:20 – 0:35",
          title: "Diagnostic Quizzing",
          activity:
            "Attempt 5 practice questions without checking answer keys.",
        },
        {
          time: "0:35 – 0:45",
          title: "Error Correction",
          activity: "Review missed questions in red ink and re-test.",
        },
      ];
    }

    if (timeAvailable === "3–6 hours") {
      return [
        {
          time: "0:00 – 0:50",
          title: `Module 1: ${techniqueName} Sprint`,
          activity: `Study core ${subject} concepts and complete blind recall.`,
        },
        {
          time: "0:50 – 1:00",
          title: "Rest Break",
          activity: "Hydrate and stretch.",
        },
        {
          time: "1:00 – 1:50",
          title: `Module 2: Practice Testing`,
          activity: "Attempt 10 diagnostic problems under test conditions.",
        },
        {
          time: "1:50 – 2:00",
          title: "Rest Break",
          activity: "Short walk or relaxation.",
        },
        {
          time: "2:00 – 2:50",
          title: `Module 3: Error Gap Review`,
          activity: "Review weak concepts and execute secondary technique.",
        },
        {
          time: "2:50 – 3:00",
          title: "Final Assessment Wrap-Up",
          activity: "Take a mini 10-question final progress quiz.",
        },
      ];
    }

    if (timeAvailable === "1 week" || timeAvailable === "More than 1 week") {
      return [
        {
          time: "Day 1",
          title: `Initial Learning & ${techniqueName}`,
          activity: `Learn core ${subject} topics and complete baseline recall.`,
        },
        {
          time: "Day 2",
          title: "First Interval Review (24 Hours)",
          activity: "Review yesterday's recall sheet and test weak items.",
        },
        {
          time: "Day 3",
          title: "Diagnostic Quizzing",
          activity: "Solve 10 mixed-topic practice problems.",
        },
        {
          time: "Day 4",
          title: "Concept Explanation Sprint",
          activity: "Explain trickiest topics out loud without references.",
        },
        {
          time: "Day 5",
          title: "Second Interval Review (72 Hours)",
          activity: "Complete spaced repetition flashcards for ${subject}.",
        },
        {
          time: "Day 6",
          title: "Interleaved Practice Set",
          activity: "Solve randomized mixed problem cards.",
        },
        {
          time: "Day 7",
          title: "Full Exam Simulation",
          activity: "Take a timed 45-minute mock exam.",
        },
      ];
    }

    // Default 3-Hour Plan
    return [
      {
        time: "0:00 – 0:40",
        title: `${techniqueName} – Block 1`,
        activity: `Study main ${subject} topic for 20 mins, then execute ${techniqueName}.`,
      },
      {
        time: "0:40 – 0:50",
        title: "Rest Break",
        activity: "Step away from study area.",
      },
      {
        time: "0:50 – 1:30",
        title: `${techniqueName} – Block 2`,
        activity: `Apply technique to secondary ${subject} sub-topic.`,
      },
      {
        time: "1:30 – 1:40",
        title: "Rest Break",
        activity: "Hydrate and stretch.",
      },
      {
        time: "1:40 – 2:20",
        title: "Practice Testing & Diagnostics",
        activity: "Solve 8 practice problems without peeking at answers.",
      },
      { time: "2:20 – 2:30", title: "Rest Break", activity: "Rest eyes." },
      {
        time: "2:30 – 3:00",
        title: "Mini Exam Simulation",
        activity: "Complete a 15-minute timed quiz under silent conditions.",
      },
    ];
  },

  /**
   * Calculate a quick student profile summary from their activity history
   */
  async calculateStudentProfile(userId) {
    try {
      const performances = await StudentTechniquePerformance.find(ownerQuery(userId)).limit(12);
      const sessions = await TechniqueSession.find(ownerQuery(userId)).limit(30);
      const feedbacks = await TechniqueFeedback.find(ownerQuery(userId)).limit(20);

      const totalMinutes = sessions.reduce(
        (sum, s) => sum + (s.durationMinutes || 0),
        0,
      );
      const strengthAreas = [];
      const focusAreas = [];

      if (performances.length === 0) {
        return {
          studentId: userId,
          dominantStyle: "Exploring",
          strengthAreas: ["New learner – building baseline"],
          focusAreas: [
            "Complete the Situation Wizard to generate your first tailored plan",
          ],
          recommendedPath:
            "Start with the Situation Wizard, run the strategy, and log your first practice session.",
          totalSessions: 0,
          totalMinutes: 0,
        };
      }

      performances.forEach((p) => {
        if (p.avgQuizScoreAfter >= 80) {
          const cat = LEARNING_TECHNIQUES.find((t) => t.id === p.techniqueId);
          strengthAreas.push(cat ? cat.name : p.techniqueId);
        } else if (p.avgQuizScoreAfter < 65) {
          const cat = LEARNING_TECHNIQUES.find((t) => t.id === p.techniqueId);
          focusAreas.push(cat ? cat.name : p.techniqueId);
        }
      });

      const topPerf = [...performances].sort(
        (a, b) => b.sessionCount - a.sessionCount,
      )[0];
      const topCat = topPerf
        ? LEARNING_TECHNIQUES.find((t) => t.id === topPerf.techniqueId)
        : null;

      const avgUsefulness = feedbacks.length
        ? Math.round(
            feedbacks.reduce(
              (sum, f) =>
                sum +
                ({
                  "Very useful": 5,
                  Useful: 4,
                  Neutral: 3,
                  "Not very useful": 2,
                  "Not useful": 1,
                }[f.usefulnessRating] || 3),
              0,
            ) / feedbacks.length,
          )
        : 0;

      return {
        studentId: userId,
        dominantStyle: topCat?.category || "Balanced",
        strengthAreas: strengthAreas.length
          ? strengthAreas
          : ["Consistent session logging"],
        focusAreas: focusAreas.length
          ? focusAreas
          : ["Try interleaving different techniques"],
        recommendedPath: `Your go-to technique is ${topCat?.name || "Active Recall"}. Next try pairing it with a secondary technique for weak subjects.`,
        totalSessions: sessions.length,
        totalMinutes,
        avgFeedbackUsefulness: avgUsefulness,
      };
    } catch (err) {
      console.warn("calculateStudentProfile fallback:", err.message);
      return {
        studentId: userId,
        dominantStyle: "Balanced",
        strengthAreas: ["Memory retrieval"],
        focusAreas: ["Consistent practice"],
        recommendedPath:
          "Start with the Situation Wizard to generate a tailored plan.",
        totalSessions: 0,
        totalMinutes: 0,
      };
    }
  },

  /**
   * Save student post-session feedback for future ML training dataset
   */
  async saveTechniqueFeedback(userId, feedbackData) {
    const {
      techniqueId,
      sessionId,
      usefulnessRating,
      wouldUseAgain,
      performanceBefore,
      performanceAfter,
    } = feedbackData;
    try {
      const feedback = await TechniqueFeedback.create({
        userId: ownerId(userId),
        techniqueId,
        sessionId,
        usefulnessRating,
        wouldUseAgain,
        performanceBefore,
        performanceAfter,
      });
      return {
        success: true,
        feedback,
        message:
          "Feedback recorded! Your data will help optimize future recommendations.",
      };
    } catch (err) {
      console.warn("saveTechniqueFeedback DB notice:", err.message);
      return {
        success: true,
        feedback: {
          _id: "fb-fallback-" + Date.now(),
          userId,
          techniqueId,
          usefulnessRating,
          wouldUseAgain,
          guest: true,
        },
        message: "Feedback captured locally.",
        fallback: true,
      };
    }
  },

  /**
   * Record technique practice session
   */
  async recordTechniqueSession(userId, sessionData) {
    const {
      techniqueId,
      subject,
      topic,
      durationMinutes,
      activityType,
      feedbackScore,
      notesCreated,
      quizScoreBefore,
      quizScoreAfter,
    } = sessionData;
    const catalog = LEARNING_TECHNIQUES.find((t) => t.id === techniqueId);
    const resolvedName = catalog
      ? catalog.name
      : (techniqueId || "technique").toString();

    try {
      const session = await TechniqueSession.create({
        userId: ownerId(userId),
        techniqueId,
        techniqueName: resolvedName,
        subject: subject || "General",
        topic: topic || "Lesson Module",
        durationMinutes: durationMinutes || 15,
        activityType: activityType || "15min",
        feedbackScore,
        notesCreated,
        quizScoreBefore,
        quizScoreAfter,
      });

      let perf;
      try {
        perf = await StudentTechniquePerformance.findOne({
          ...ownerQuery(userId),
          techniqueId,
        });
        if (!perf) {
          perf = new StudentTechniquePerformance({
            userId: ownerId(userId),
            techniqueId,
            sessionCount: 1,
            totalTimeSpentMinutes: durationMinutes || 15,
            lastUsedAt: new Date(),
            ...observedQuizMetrics(quizScoreBefore, quizScoreAfter),
          });
        } else {
          const previousSessionCount = Math.max(1, perf.sessionCount || 1)
          perf.sessionCount += 1;
          perf.totalTimeSpentMinutes += durationMinutes || 15;
          const metrics = observedQuizMetrics(quizScoreBefore, quizScoreAfter)
          if (metrics.avgQuizScoreBefore !== undefined) {
            perf.avgQuizScoreBefore = perf.avgQuizScoreBefore === undefined
              ? metrics.avgQuizScoreBefore
              : Math.round(((perf.avgQuizScoreBefore * previousSessionCount) + metrics.avgQuizScoreBefore) / (previousSessionCount + 1))
          }
          if (metrics.avgQuizScoreAfter !== undefined) {
            perf.avgQuizScoreAfter = perf.avgQuizScoreAfter === undefined
              ? metrics.avgQuizScoreAfter
              : Math.round(((perf.avgQuizScoreAfter * previousSessionCount) + metrics.avgQuizScoreAfter) / (previousSessionCount + 1))
          }
          if (metrics.retentionImprovement !== undefined) {
            perf.retentionImprovement = perf.retentionImprovement === undefined
              ? metrics.retentionImprovement
              : Math.round(((perf.retentionImprovement * previousSessionCount) + metrics.retentionImprovement) / (previousSessionCount + 1))
          }
          perf.lastUsedAt = new Date();
        }
        await perf.save();
      } catch (perfErr) {
        console.warn("Performance tracking notice:", perfErr.message);
        perf = null;
      }

      return {
        session,
        performance: perf,
        message: `Technique session for ${resolvedName} recorded successfully!`,
      };
    } catch (err) {
      console.warn("recordTechniqueSession DB notice:", err.message);
      return {
        session: {
          _id: "session-fallback-" + Date.now(),
          userId,
          techniqueId,
          techniqueName: resolvedName,
          subject: subject || "General",
          durationMinutes: durationMinutes || 15,
          guest: true,
          createdAt: new Date(),
        },
        performance: null,
        fallback: true,
        message: `Session for ${resolvedName} acknowledged locally.`,
      };
    }
  },

  /**
   * Get student's technique progress and performance history
   * Normalized shape matches the frontend UI expectations.
   */
  async getStudentTechniqueProgress(userId) {
    try {
      const sessions = await TechniqueSession.find(ownerQuery(userId))
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
      const performances = await StudentTechniquePerformance.find(ownerQuery(userId)).lean();
      const recommendations = await TechniqueRecommendation.find(ownerQuery(userId))
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
      const feedbacks = await TechniqueFeedback.find(ownerQuery(userId))
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      const totalSessions = sessions.length;
      const totalMinutes = sessions.reduce(
        (sum, s) => sum + (s.durationMinutes || 0),
        0,
      );

      const techniquesTried = [
        ...new Set([
          ...sessions.map((s) => s.techniqueName || s.techniqueId),
          ...performances.map((p) => {
            const cat = LEARNING_TECHNIQUES.find((t) => t.id === p.techniqueId);
            return cat?.name || p.techniqueId;
          }),
        ]),
      ].filter(Boolean);

      const mostUsed =
        performances.sort(
          (a, b) => (b.sessionCount || 0) - (a.sessionCount || 0),
        )[0] || null;
      const mostUsedCat = mostUsed
        ? LEARNING_TECHNIQUES.find((t) => t.id === mostUsed.techniqueId)
        : null;

      const usefulnessMap = {
        "Very useful": 5,
        Useful: 4,
        Neutral: 3,
        "Not very useful": 2,
        "Not useful": 1,
      };
      const fbScores = feedbacks.map(
        (f) => usefulnessMap[f.usefulnessRating] || 3,
      );
      const avgUsefulness = fbScores.length
        ? Math.round(
            (fbScores.reduce((a, b) => a + b, 0) / fbScores.length) * 10,
          ) / 10
        : 0;
      const wouldUseAgainCount = feedbacks.filter(
        (f) => f.wouldUseAgain === "Yes",
      ).length;
      const wouldUseAgainRate = feedbacks.length
        ? Math.round((wouldUseAgainCount / feedbacks.length) * 100)
        : 0;

      const recentSessionsNormalized = sessions.map((s) => ({
        _id: s._id,
        techniqueId: s.techniqueId,
        techniqueName: s.techniqueName,
        subject: s.subject,
        topic: s.topic,
        durationMinutes: s.durationMinutes,
        createdAt: s.createdAt,
        notesCreated: s.notesCreated,
      }));

      const performancesNormalized = performances.map((p) => {
        const cat = LEARNING_TECHNIQUES.find((t) => t.id === p.techniqueId);
        return {
          techniqueId: p.techniqueId,
          name: cat?.name || p.techniqueId,
          sessionCount: p.sessionCount,
          totalTimeSpentMinutes: p.totalTimeSpentMinutes,
          avgQuizScoreAfter: p.avgQuizScoreAfter,
          retentionImprovement: p.retentionImprovement,
          lastUsedAt: p.lastUsedAt,
        };
      });

      const feedbacksNormalized = feedbacks.map((f) => ({
        _id: f._id,
        techniqueId: f.techniqueId,
        sessionId: f.sessionId,
        usefulnessRating: f.usefulnessRating,
        wouldUseAgain: f.wouldUseAgain,
        performanceBefore: f.performanceBefore,
        performanceAfter: f.performanceAfter,
        createdAt: f.createdAt,
      }));

      return {
        totalSessions,
        totalTechniqueSessions: totalSessions,
        totalMinutes,
        techniquesTried,
        mostUsed: mostUsed
          ? {
              techniqueId: mostUsed.techniqueId,
              name: mostUsedCat?.name || mostUsed.techniqueId,
              sessionCount: mostUsed.sessionCount || 0,
              totalTimeSpentMinutes: mostUsed.totalTimeSpentMinutes || 0,
              category: mostUsedCat?.category,
            }
          : null,
        recentSessions: recentSessionsNormalized,
        feedbacks: feedbacksNormalized,
        feedbackSummary: {
          avgUsefulness,
          wouldUseAgainRate,
          totalFeedbacks: feedbacks.length,
        },
        performances: performancesNormalized,
        recommendationHistory: recommendations,
      };
    } catch (err) {
      console.warn("getStudentTechniqueProgress fallback:", err.message);
      return {
        studentId: userId,
        totalSessions: 0,
        totalTechniqueSessions: 0,
        totalMinutes: 0,
        techniquesTried: [],
        mostUsed: null,
        recentSessions: [],
        feedbacks: [],
        feedbackSummary: {
          avgUsefulness: 0,
          wouldUseAgainRate: 0,
          totalFeedbacks: 0,
        },
        performances: [],
        recommendationHistory: [],
        fallback: true,
      };
    }
  },
};
