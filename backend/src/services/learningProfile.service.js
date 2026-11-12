import mongoose from 'mongoose';
import { LearningDnaAssessment } from '../models/learningDnaAssessment.model.js';
import { LearningProfile } from '../models/learningProfile.model.js';
import { QuizResult, LessonProgress, SmartLessonNote } from '../models/programmingLearning.model.js';
import { ThinkingSkills, Submission } from '../models/thinking.model.js';
import { LearningAcademyActivity } from '../models/learningAcademyActivity.model.js';
import { Revision } from '../models/revision.model.js';
import { Analytics } from '../models/analytics.model.js';
import { Note } from '../models/note.model.js';
import { AppError } from '../utils/errorHandler.js';

const isDbReady = () => mongoose.connection.readyState === 1;

export const buildEmptyLearningProfile = () => ({
  hasProfileData: false,
  hasAssessment: false,
  isDeveloping: true,
  statusMessage: 'Complete the Learning DNA assessment to create your profile.',
});

const clamp = (val, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(Number(val) || 0)));

const averageObserved = (rows, field) => {
  const values = rows
    .filter((row) => row?.[field] !== null && row?.[field] !== undefined && row?.[field] !== '')
    .map((row) => Number(row?.[field]))
    .filter((value) => Number.isFinite(value));
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
};

const blendObserved = (baseline, observed, observedWeight) => {
  if (baseline === null || baseline === undefined) return observed;
  if (observed === null || observed === undefined) return baseline;
  return Math.round(baseline * (1 - observedWeight) + observed * observedWeight);
};

const calculateDayKey = (dateVal) => {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const buildStrengths = ({ overallScore, objectiveQuestionCount, thinkingSubmissionsCount, avgThinkingScore }) => {
  const strengths = [];

  if (thinkingSubmissionsCount >= 3 && avgThinkingScore !== null && avgThinkingScore >= 75) {
    strengths.push('Strong average score across Thinking Lab submissions');
  }
  if (objectiveQuestionCount >= 10 && overallScore !== null && overallScore >= 80) {
    strengths.push('Strong results across at least 10 scored questions');
  }

  return strengths;
};

const buildAreasToImprove = (skills) => {
  const areas = [];

  const candidates = [
    { text: 'Improve study consistency', score: skills.consistency, threshold: 70 },
    { text: 'Practice more problem-solving activities', score: skills.problemSolving, threshold: 70 },
    { text: 'Strengthen programming fundamentals', score: skills.programming, threshold: 70 },
    { text: 'Build confidence with complex tasks', score: skills.confidence, threshold: 65 },
    { text: 'Reinforce academic core concepts', score: skills.academicPerformance, threshold: 70 },
  ];

  // Sort ascending: weakest areas first
  const weakList = candidates
    .filter((c) => c.score !== null && c.score !== undefined && c.score < c.threshold)
    .sort((a, b) => a.score - b.score);

  if (weakList.length) {
    weakList.slice(0, 3).forEach((item) => areas.push(item.text));
  }

  return areas;
};

export const learningProfileService = {
  /**
   * Main Dynamic Profile Generator
   * GET /api/v1/learning-profile
   */
  async getStudentLearningProfile(userId) {
    const uidStr = String(userId);
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;

    if (!isDbReady()) {
      throw new AppError('Learning profile data is temporarily unavailable because the database is disconnected.', 503);
    }

    // 1. Fetch Assessment Data
    const assessment = await LearningDnaAssessment.findOne({ userId: uidStr }).lean();
    const hasAssessment = Boolean(assessment && assessment.completedAt);
    const baseProfile = assessment?.capabilityProfile || {};

    const baseProgramming = hasAssessment ? (baseProfile.programming ?? null) : null;
    const baseProblemSolving = hasAssessment ? (baseProfile.problemSolving ?? null) : null;
    const baseConsistency = hasAssessment ? (baseProfile.consistency ?? null) : null;
    const baseConfidence = hasAssessment ? (baseProfile.confidence ?? null) : null;
    const baseAcademic = hasAssessment ? (baseProfile.academicPerformance ?? null) : null;
    const assessmentKnowledgeScore = hasAssessment ? (assessment.assessmentScore ?? null) : null;

    // 2. Fetch All Activity Records in Parallel
    const [
      quizResults,
      lessonProgress,
      thinkingSkills,
      challengeSubmissions,
      academyActivities,
      revisions,
      analyticsLogs,
      smartNotes,
      generalNotes,
      existingProfile,
    ] = await Promise.all([
      QuizResult.find({ userId: uidStr }).sort({ createdAt: -1 }).lean(),
      LessonProgress.find({ userId: uidStr }).lean(),
      ThinkingSkills.findOne({ userId: uidStr }).lean(),
      Submission.find({ userId: uidStr }).lean(),
      LearningAcademyActivity.find(userObjectId ? { $or: [{ userId: uidStr }, { userId: userObjectId }] } : { userId: uidStr }).lean(),
      Revision.find(userObjectId ? { $or: [{ userId: uidStr }, { userId: userObjectId }] } : { userId: uidStr }).lean(),
      Analytics.find(userObjectId ? { $or: [{ userId: uidStr }, { userId: userObjectId }] } : { userId: uidStr }).lean(),
      SmartLessonNote.find({ userId: uidStr }).lean(),
      Note.find({ userId: uidStr }).lean(),
      LearningProfile.findOne({ userId: uidStr }).lean(),
    ]);

    // 3. Activity Aggregations
    // A. Unique Active Days
    const activeDayKeys = new Set();
    lessonProgress.forEach((p) => {
      const k = calculateDayKey(p.lastWatchedAt || p.updatedAt);
      if (k) activeDayKeys.add(k);
    });
    quizResults.forEach((q) => {
      const k = calculateDayKey(q.createdAt);
      if (k) activeDayKeys.add(k);
    });
    challengeSubmissions.forEach((c) => {
      const k = calculateDayKey(c.createdAt);
      if (k) activeDayKeys.add(k);
    });
    academyActivities.forEach((a) => {
      const k = calculateDayKey(a.updatedAt || a.createdAt);
      if (k) activeDayKeys.add(k);
    });
    revisions.forEach((r) => {
      const k = calculateDayKey(r.lastReviewed);
      if (k) activeDayKeys.add(k);
    });
    analyticsLogs.forEach((l) => {
      const k = calculateDayKey(l.createdAt);
      if (k) activeDayKeys.add(k);
    });
    generalNotes.forEach((n) => {
      const k = calculateDayKey(n.updatedAt || n.createdAt);
      if (k) activeDayKeys.add(k);
    });
    smartNotes.forEach((note) => {
      const k = calculateDayKey(note.updatedAt || note.createdAt);
      if (k) activeDayKeys.add(k);
    });
    const daysActive = activeDayKeys.size;

    // B. Quizzes
    const quizCount = quizResults.length;
    const scoredQuizzes = quizResults.filter((quiz) =>
      Number.isFinite(Number(quiz.score)) && Number(quiz.score) >= 0 && Number(quiz.score) <= 100 &&
      Number.isFinite(Number(quiz.totalQuestions)) && Number(quiz.totalQuestions) > 0,
    );
    const totalQuizQuestions = scoredQuizzes.reduce((sum, quiz) => sum + Number(quiz.totalQuestions), 0);
    const weightedQuizPoints = scoredQuizzes.reduce(
      (sum, quiz) => {
        const total = Number(quiz.totalQuestions);
        const scorePoints = (Number(quiz.score) / 100) * total;
        const correctCount = Number(quiz.correctCount);
        const hasValidCorrectCount = Number.isInteger(correctCount) && correctCount >= 0 && correctCount <= total;
        const points = hasValidCorrectCount && (correctCount > 0 || Number(quiz.score) === 0)
          ? correctCount
          : scorePoints;
        return sum + points;
      },
      0,
    );
    const avgQuizScore = totalQuizQuestions > 0
      ? Math.round((weightedQuizPoints / totalQuizQuestions) * 100)
      : null;

    // C. Lessons & Video Telemetry
    const lessonsAttempted = lessonProgress.length;
    const totalTimeSpentSeconds = lessonProgress.reduce((sum, p) => sum + (p.timeSpent || 0), 0);
    const avgSessionTimeMinutes = lessonsAttempted > 0
      ? Math.round((totalTimeSpentSeconds / lessonsAttempted) / 60)
      : 0;

    // D. Thinking Lab & Problem Solving
    const thinkingSubmissionsCount = challengeSubmissions.length;
    const avgThinkingScore = averageObserved(challengeSubmissions, 'score');
    const thinkingProblemSolving = thinkingSkills?.problemSolving !== null && thinkingSkills?.problemSolving !== undefined &&
      Number.isFinite(Number(thinkingSkills.problemSolving))
      ? Number(thinkingSkills.problemSolving)
      : null;

    // E. Learning Academy
    const academyCount = academyActivities.length;

    // F. Revisions & Spaced Repetition
    // Count current scheduled revision records once. Adding the cached profile
    // value here caused every profile read to count the same revisions again.
    const revisionCount = revisions.filter((revision) => revision.lastReviewed || Number(revision.repetitions) > 0).length;

    // Total activities
    const totalPlatformActivities =
      quizCount +
      lessonsAttempted +
      thinkingSubmissionsCount +
      academyCount +
      revisions.length +
      smartNotes.length +
      generalNotes.length;

    // 4. Handle Case: Completely New Student (no assessment & no activity)
    if (!hasAssessment && totalPlatformActivities === 0) {
      return buildEmptyLearningProfile();
    }

    // 5. Evidence-backed skill values. Lesson completion measures engagement,
    // not demonstrated mastery, so it does not count as a programming score.
    const programmingWeight = Math.min(0.9, totalQuizQuestions * 0.03);
    const finalProgramming = blendObserved(baseProgramming, avgQuizScore, programmingWeight);

    const liveProblemSolving = avgThinkingScore ?? thinkingProblemSolving;
    const problemWeight = Math.min(0.9, thinkingSubmissionsCount * 0.25 + (thinkingSkills ? 0.3 : 0));
    const finalProblemSolving = blendObserved(baseProblemSolving, liveProblemSolving, problemWeight);

    const activeDayScore = daysActive > 0 ? Math.min(100, Math.round((daysActive / 10) * 100)) : null;
    const studyEventCount = lessonsAttempted + quizCount + academyCount + thinkingSubmissionsCount;
    const sessionFrequencyScore = studyEventCount > 0 ? Math.min(100, studyEventCount * 15) : null;
    const revisionActivityScore = revisionCount > 0 ? Math.min(100, revisionCount * 20) : null;
    const consistencySignals = [
      { value: activeDayScore, weight: 0.55 },
      { value: sessionFrequencyScore, weight: 0.30 },
      { value: revisionActivityScore, weight: 0.15 },
    ].filter((signal) => signal.value !== null);
    const liveConsistency = consistencySignals.length
      ? Math.round(consistencySignals.reduce((sum, signal) => sum + signal.value * signal.weight, 0) /
        consistencySignals.reduce((sum, signal) => sum + signal.weight, 0))
      : null;
    const consistencyWeight = Math.min(0.9, 0.2 + totalPlatformActivities * 0.08 + daysActive * 0.04);
    const finalConsistency = blendObserved(baseConsistency, liveConsistency, consistencyWeight);

    const recordedConfidence = Number(existingProfile?.confidenceLevel);
    const liveConfidence = Number.isFinite(recordedConfidence) && recordedConfidence >= 1 && recordedConfidence <= 5
      ? recordedConfidence * 20
      : null;
    const finalConfidence = blendObserved(baseConfidence, liveConfidence, 0.5);

    const finalAcademic = blendObserved(baseAcademic, avgQuizScore, Math.min(0.9, totalQuizQuestions * 0.03));

    const skills = Object.fromEntries(Object.entries({
      programming: finalProgramming,
      problemSolving: finalProblemSolving,
      consistency: finalConsistency,
      confidence: finalConfidence,
      academicPerformance: finalAcademic,
    }).map(([key, value]) => [key, value === null || value === undefined ? null : clamp(value)]));

    // 6. Overall score uses only scored knowledge checks and programming quizzes.
    const knowledgeCheckCount = hasAssessment && assessmentKnowledgeScore !== null && assessmentKnowledgeScore !== undefined ? 3 : 0;
    const observedQuestionCount = totalQuizQuestions + knowledgeCheckCount;
    const observedCorrectCount = weightedQuizPoints +
      (assessmentKnowledgeScore === null ? 0 : (assessmentKnowledgeScore / 100) * knowledgeCheckCount);
    const overallScore = observedQuestionCount > 0
      ? clamp((observedCorrectCount / observedQuestionCount) * 100)
      : null;
    const currentCapability = assessment?.responses?.programmingLevel || 'Not provided';

    // 7. Learning preference is a direct assessment answer, never inferred from clicks.
    const learningPreference = assessment?.insights?.learningPreference || 'Not provided';

    // 8. Dynamic Strengths & Areas to Improve; no predicted retention score is
    // presented as measured evidence.
    const strengths = buildStrengths({
      overallScore,
      objectiveQuestionCount: observedQuestionCount,
      thinkingSubmissionsCount,
      avgThinkingScore,
    });
    const areasToImprove = buildAreasToImprove(skills);

    // 8. Study Availability & Primary Goal from explicit assessment answers
    const studyAvailability = assessment?.responses?.studyHoursPerDay || assessment?.insights?.studyAvailability || 'Not provided';
    const primaryGoal = assessment?.responses?.primaryGoal || assessment?.insights?.primaryGoal || 'Not provided';

    // 9. Sync observed profile data; clear prior synthetic estimates.
    await this._syncProfileRecord(uidStr, {
      masteryScore: overallScore,
      retentionProbability: null,
      learningStyle: assessment?.insights?.learningPreference || null,
      difficulty: null,
      predictionSource: overallScore === null ? null : 'observed_assessment_results',
      predictionTrainingData: 'observed',
      difficultySource: null,
      sessionDuration: lessonsAttempted > 0 ? avgSessionTimeMinutes * 60 : null,
      revisionFrequency: revisionCount,
      daysActive,
    });

    const isDeveloping = observedQuestionCount < 10;
    const statusMessage = observedQuestionCount === 0
      ? 'No scored quiz results are available yet. Complete a knowledge check or quiz to create an observed score.'
      : isDeveloping
        ? `Your profile is still developing. The score currently uses ${observedQuestionCount} scored question${observedQuestionCount === 1 ? '' : 's'}; complete more quizzes for a steadier result.`
        : `The overall score uses ${observedQuestionCount} scored questions. Other indicators are based on your assessment answers and recorded learning activity.`;

    return {
      hasProfileData: hasAssessment || totalPlatformActivities > 0,
      hasAssessment,
      overallScore,
      skills,
      strengths,
      areasToImprove,
      learningStyle: learningPreference,
      studyAvailability,
      currentCapability,
      primaryGoal,
      // Supplemental fields for full UI and backward compatibility
      capabilityProfile: skills,
      insights: {
        strengths,
        areasToImprove,
        learningPreference,
        studyAvailability,
        currentCapability,
        primaryGoal,
      },
      assessmentScore: assessmentKnowledgeScore,
      objectiveQuestionCount: observedQuestionCount,
      scoredQuizCount: scoredQuizzes.length,
      retentionProbability: null,
      difficulty: null,
      predictionSource: overallScore === null ? null : 'observed_assessment_results',
      predictionTrainingData: 'observed',
      difficultySource: null,
      isDeveloping,
      statusMessage,
    };
  },

  async _syncProfileRecord(userId, updates = {}) {
    try {
      await LearningProfile.findOneAndUpdate(
        { userId: String(userId) },
        {
          $set: {
            masteryScore: updates.masteryScore,
            retentionProbability: updates.retentionProbability,
            ...(Object.hasOwn(updates, 'learningStyle') ? { learningStyle: updates.learningStyle } : {}),
            ...(Object.hasOwn(updates, 'difficulty') ? { difficulty: updates.difficulty } : {}),
            predictionSource: updates.predictionSource,
            predictionTrainingData: updates.predictionTrainingData,
            difficultySource: updates.difficultySource,
            sessionDuration: updates.sessionDuration,
            revisionFrequency: updates.revisionFrequency,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (err) {
      console.error('Error updating LearningProfile document:', err.message);
    }
  },

};

export default learningProfileService;
