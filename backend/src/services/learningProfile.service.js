import mongoose from 'mongoose';
import { LearningDnaAssessment } from '../models/learningDnaAssessment.model.js';
import { LearningProfile } from '../models/learningProfile.model.js';
import { QuizResult, LessonProgress, SmartLessonNote } from '../models/programmingLearning.model.js';
import { ThinkingSkills, Submission } from '../models/thinking.model.js';
import { LearningAcademyActivity } from '../models/learningAcademyActivity.model.js';
import { Revision } from '../models/revision.model.js';
import { Analytics } from '../models/analytics.model.js';
import { Note } from '../models/note.model.js';
import { predictLearningProfile } from '../utils/mlLearningEngine.js';

const isDbReady = () => mongoose.connection.readyState === 1;

const clamp = (val, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(Number(val) || 0)));

const calculateDayKey = (dateVal) => {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const getCapabilityLabel = (mastery) => {
  const m = Number(mastery) || 0;
  if (m >= 86) return 'Highly Advanced';
  if (m >= 71) return 'Advanced';
  if (m >= 41) return 'Intermediate';
  return 'Beginner';
};

const buildStrengths = (skills, retentionProbability, overallScore) => {
  const strengths = [];

  if (skills.programming >= 75) strengths.push('Strong programming foundation');
  if (skills.problemSolving >= 75) strengths.push('Good problem-solving ability');
  if (skills.consistency >= 75) strengths.push('Consistent learning habit');
  if (skills.confidence >= 75) strengths.push('High learning confidence');
  if (skills.academicPerformance >= 75) strengths.push('Good academic performance');
  if (retentionProbability >= 0.70) strengths.push('Strong concept retention');
  if (overallScore >= 80) strengths.push('High overall subject mastery');

  // If none meet >= 75, highlight top scoring domains (>= 60)
  if (!strengths.length) {
    const candidates = [
      { name: 'Active programming practice', score: skills.programming },
      { name: 'Emerging problem-solving agility', score: skills.problemSolving },
      { name: 'Regular study rhythm', score: skills.consistency },
      { name: 'Receptive learning mindset', score: skills.confidence },
      { name: 'Solid academic foundation', score: skills.academicPerformance },
    ]
      .filter((c) => c.score >= 55)
      .sort((a, b) => b.score - a.score);

    if (candidates.length) {
      candidates.slice(0, 2).forEach((c) => strengths.push(c.name));
    } else {
      strengths.push('Active learner building foundational capabilities');
    }
  }

  return strengths;
};

const buildAreasToImprove = (skills, retentionScore) => {
  const areas = [];

  const candidates = [
    { text: 'Improve study consistency', score: skills.consistency, threshold: 70 },
    { text: 'Improve revision and retention', score: retentionScore, threshold: 65 },
    { text: 'Practice more problem-solving activities', score: skills.problemSolving, threshold: 70 },
    { text: 'Strengthen programming fundamentals', score: skills.programming, threshold: 70 },
    { text: 'Build confidence with complex tasks', score: skills.confidence, threshold: 65 },
    { text: 'Reinforce academic core concepts', score: skills.academicPerformance, threshold: 70 },
  ];

  // Sort ascending: weakest areas first
  const weakList = candidates
    .filter((c) => c.score < c.threshold)
    .sort((a, b) => a.score - b.score);

  if (weakList.length) {
    weakList.slice(0, 3).forEach((item) => areas.push(item.text));
  } else {
    areas.push('Tackle advanced real-world project challenges');
    areas.push('Prepare for competitive benchmarks and timed assessments');
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
      return this._getFallbackProfile();
    }

    // 1. Fetch Assessment Data
    const assessment = await LearningDnaAssessment.findOne({ userId: uidStr }).lean();
    const hasAssessment = Boolean(assessment && assessment.completedAt);
    const baseProfile = assessment?.capabilityProfile || {};

    const baseProgramming = baseProfile.programming ?? 50;
    const baseProblemSolving = baseProfile.problemSolving ?? 50;
    const baseConsistency = baseProfile.consistency ?? 50;
    const baseConfidence = baseProfile.confidence ?? 50;
    const baseAcademic = baseProfile.academicPerformance ?? 50;
    const assessmentKnowledgeScore = assessment?.assessmentScore ?? 0;

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
      const k = calculateDayKey(r.lastReviewed || r.updatedAt);
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
    const daysActive = Math.max(activeDayKeys.size, (existingProfile?.studyStreak ? 1 : 0));

    // B. Quizzes
    const quizCount = quizResults.length;
    const avgQuizScore = quizCount
      ? Math.round(quizResults.reduce((sum, q) => sum + (q.score || 0), 0) / quizCount)
      : null;
    const totalQuizCorrect = quizResults.reduce((sum, q) => sum + (q.correctCount || 0), 0);
    const totalQuizQuestions = quizResults.reduce((sum, q) => sum + (q.totalQuestions || 8), 0);
    const quizAccuracyRatio = totalQuizQuestions > 0 ? (totalQuizCorrect / totalQuizQuestions) : (avgQuizScore ? avgQuizScore / 100 : 0.7);

    // C. Lessons & Video Telemetry
    const lessonsAttempted = lessonProgress.length;
    const lessonsCompleted = lessonProgress.filter((p) => p.completed || (p.watchPercentage || 0) >= 80).length;
    const lessonCompletionRate = lessonsAttempted > 0 ? (lessonsCompleted / lessonsAttempted) : null;
    const avgWatchPercentage = lessonsAttempted > 0
      ? Math.round(lessonProgress.reduce((sum, p) => sum + (p.watchPercentage || 0), 0) / lessonsAttempted)
      : null;
    const totalPauses = lessonProgress.reduce((sum, p) => sum + (p.pauseCount || 0), 0);
    const avgPauseFrequency = lessonsAttempted > 0 ? (totalPauses / lessonsAttempted) : 1.0;
    const totalTimeSpentSeconds = lessonProgress.reduce((sum, p) => sum + (p.timeSpent || 0), 0);
    const avgSessionTimeMinutes = lessonsAttempted > 0
      ? Math.max(10, Math.round((totalTimeSpentSeconds / lessonsAttempted) / 60))
      : (existingProfile?.sessionDuration ? Math.round(existingProfile.sessionDuration / 60) : 25);

    // D. Thinking Lab & Problem Solving
    const thinkingSubmissionsCount = challengeSubmissions.length;
    const avgThinkingScore = thinkingSubmissionsCount
      ? Math.round(challengeSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / thinkingSubmissionsCount)
      : null;
    const thinkingProblemSolving = thinkingSkills?.problemSolving || null;

    // E. Learning Academy
    const academyCount = academyActivities.length;
    const avgAcademyUnderstanding = academyCount
      ? Math.round(academyActivities.reduce((sum, a) => sum + (a.understanding || 0), 0) / academyCount)
      : null;
    const avgTeachBackScore = academyCount
      ? Math.round(academyActivities.reduce((sum, a) => sum + (a.teachBackScore || 0), 0) / academyCount)
      : null;

    // F. Revisions & Spaced Repetition
    const revisionCount = revisions.length + (existingProfile?.revisionFrequency || 0);

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
      return {
        overallScore: 50,
        skills: {
          programming: 50,
          problemSolving: 50,
          consistency: 50,
          confidence: 50,
          academicPerformance: 50,
        },
        strengths: ['Eager learner ready to build foundation'],
        areasToImprove: ['Complete initial learning assessment', 'Explore interactive lessons and quizzes'],
        learningStyle: 'Learning style is still being analyzed',
        studyAvailability: '1-2',
        currentCapability: 'Beginner',
        primaryGoal: 'Skill development',
        isDeveloping: true,
        statusMessage: 'Learning profile is still developing.',
      };
    }

    // 5. Dynamic Skill Calculations (Blended with Assessment Baseline)
    const baseWeightRamp = Math.min(0.85, totalPlatformActivities * 0.12);

    // 1. Programming
    let liveProgramming = baseProgramming;
    if (avgQuizScore !== null && lessonCompletionRate !== null) {
      liveProgramming = Math.round(avgQuizScore * 0.65 + (lessonCompletionRate * 100) * 0.35);
    } else if (avgQuizScore !== null) {
      liveProgramming = avgQuizScore;
    } else if (lessonCompletionRate !== null) {
      liveProgramming = Math.round((lessonCompletionRate * 100));
    }
    const progWeight = Math.min(0.9, (quizCount * 0.25) + (lessonsAttempted * 0.15));
    const finalProgramming = clamp((1 - progWeight) * baseProgramming + progWeight * liveProgramming);

    // 2. Problem Solving
    let liveProblemSolving = baseProblemSolving;
    if (avgThinkingScore !== null && thinkingProblemSolving !== null) {
      liveProblemSolving = Math.round(avgThinkingScore * 0.5 + thinkingProblemSolving * 0.5);
    } else if (avgThinkingScore !== null) {
      liveProblemSolving = avgThinkingScore;
    } else if (thinkingProblemSolving !== null) {
      liveProblemSolving = thinkingProblemSolving;
    } else if (avgAcademyUnderstanding !== null) {
      liveProblemSolving = avgAcademyUnderstanding;
    }
    const probWeight = Math.min(0.9, (thinkingSubmissionsCount * 0.25) + ((thinkingSkills ? 1 : 0) * 0.3) + (academyCount * 0.1));
    const finalProblemSolving = clamp((1 - probWeight) * baseProblemSolving + probWeight * liveProblemSolving);

    // 3. Consistency
    const daysScore = Math.min(100, Math.round((daysActive / 10) * 100));
    const streakVal = existingProfile?.studyStreak || (daysActive > 1 ? 2 : 1);
    const streakScore = Math.min(100, streakVal * 20);
    const sessionFreqScore = Math.min(100, (lessonsAttempted + quizCount + academyCount) * 15);
    const revisionScore = Math.min(100, revisionCount * 20);
    const liveConsistency = Math.round(
      daysScore * 0.35 +
      streakScore * 0.30 +
      sessionFreqScore * 0.20 +
      revisionScore * 0.15
    );
    const consWeight = Math.min(0.9, 0.2 + (totalPlatformActivities * 0.08) + (daysActive * 0.04));
    const finalConsistency = clamp((1 - consWeight) * baseConsistency + consWeight * liveConsistency);

    // 4. Confidence
    const quizConfidence = avgQuizScore ? Math.round(avgQuizScore * 0.85 + 10) : baseConfidence;
    const subjectiveConfidence = existingProfile?.confidenceLevel ? existingProfile.confidenceLevel * 20 : baseConfidence;
    const liveConfidence = Math.round(quizConfidence * 0.6 + subjectiveConfidence * 0.4);
    const confWeight = Math.min(0.85, (quizCount * 0.2) + (thinkingSubmissionsCount * 0.2));
    const finalConfidence = clamp((1 - confWeight) * baseConfidence + confWeight * liveConfidence);

    // 5. Academic Performance
    let liveAcademic = baseAcademic;
    if (avgQuizScore !== null && avgTeachBackScore !== null) {
      liveAcademic = Math.round(avgQuizScore * 0.65 + avgTeachBackScore * 0.35);
    } else if (avgQuizScore !== null) {
      liveAcademic = avgQuizScore;
    } else if (avgTeachBackScore !== null) {
      liveAcademic = avgTeachBackScore;
    }
    const acadWeight = Math.min(0.9, (quizCount * 0.2) + (academyCount * 0.15));
    const finalAcademic = clamp((1 - acadWeight) * baseAcademic + acadWeight * liveAcademic);

    const skills = {
      programming: finalProgramming,
      problemSolving: finalProblemSolving,
      consistency: finalConsistency,
      confidence: finalConfidence,
      academicPerformance: finalAcademic,
    };

    // 6. Run ML Models Inference with Exact Feature Ordering
    const mlInput = {
      quizScore: avgQuizScore || assessmentKnowledgeScore || finalAcademic || 75.0,
      taskCompletion: lessonCompletionRate !== null ? lessonCompletionRate : 0.8,
      studyTime: avgSessionTimeMinutes || 25.0,
      revisionCount: Math.min(7, revisionCount || 1),
      daysActive: Math.max(1, daysActive),
      averageWatchPercentage: avgWatchPercentage !== null ? (avgWatchPercentage / 100.0) : 0.6,
      pauseFrequency: avgPauseFrequency || 1.5,
      videoWatchRate: lessonsAttempted > 0 ? Math.min(1.0, lessonsAttempted / 5) : 0.5,
      averageAnswerTime: 28.0,
      confidenceLevel: (finalConfidence / 100.0) * 5.0,
    };

    const mlResult = await predictLearningProfile(mlInput);

    // 7. Overall Mastery & Capability
    const overallScore = clamp(mlResult.masteryScore || (
      finalProgramming * 0.25 +
      finalProblemSolving * 0.25 +
      finalConsistency * 0.20 +
      finalConfidence * 0.15 +
      finalAcademic * 0.15
    ));
    const currentCapability = getCapabilityLabel(overallScore);

    // 8. Learning Style:
    // If student has insufficient video watch and quiz activity, show "Learning style is still being analyzed"
    const hasEnoughStyleActivity = (lessonsAttempted > 0 && avgWatchPercentage !== null) || quizCount > 0;
    const learningStyle = hasEnoughStyleActivity
      ? (mlResult.learningStyle || 'Visual')
      : 'Learning style is still being analyzed';

    // 9. Retention Probability
    const retentionProb = Number(mlResult.retentionProbability ?? 0.7);
    const retentionScore100 = clamp(retentionProb * 100);

    // 10. Dynamic Strengths & Areas to Improve
    const strengths = buildStrengths(skills, retentionProb, overallScore);
    const areasToImprove = buildAreasToImprove(skills, retentionScore100);

    // 11. Study Availability & Primary Goal from Assessment
    const studyAvailability = assessment?.responses?.studyHoursPerDay || assessment?.insights?.studyAvailability || '1-2';
    const primaryGoal = assessment?.responses?.primaryGoal || assessment?.insights?.primaryGoal || 'Board/college exams';

    // 12. Sync Persistent LearningProfile in MongoDB
    await this._syncProfileRecord(uidStr, {
      masteryScore: overallScore,
      retentionProbability: retentionProb,
      learningStyle: hasEnoughStyleActivity ? (mlResult.learningStyle || 'Visual') : 'Mixed',
      difficulty: mlResult.difficulty || 'Intermediate',
      sessionDuration: avgSessionTimeMinutes * 60,
      revisionFrequency: revisionCount,
      daysActive,
    });

    const isDeveloping = totalPlatformActivities < 3;
    const statusMessage = isDeveloping
      ? 'Learning profile is still developing. Ongoing activity continues to refine your profile.'
      : 'Learning profile is actively updated based on your platform activity and ML predictions.';

    return {
      overallScore,
      skills,
      strengths,
      areasToImprove,
      learningStyle,
      studyAvailability,
      currentCapability,
      primaryGoal,
      // Supplemental fields for full UI and backward compatibility
      capabilityProfile: skills,
      insights: {
        strengths,
        areasToImprove,
        learningPreference: learningStyle,
        studyAvailability,
        currentCapability,
        primaryGoal,
      },
      assessmentScore: assessmentKnowledgeScore || overallScore,
      retentionProbability: retentionProb,
      difficulty: mlResult.difficulty || 'Intermediate',
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
            ...(updates.learningStyle ? { learningStyle: updates.learningStyle } : {}),
            ...(updates.difficulty ? { difficulty: updates.difficulty } : {}),
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

  _getFallbackProfile() {
    return {
      overallScore: 50,
      skills: {
        programming: 50,
        problemSolving: 50,
        consistency: 50,
        confidence: 50,
        academicPerformance: 50,
      },
      strengths: ['Building core foundational capabilities'],
      areasToImprove: ['Complete study sessions to refine your profile'],
      learningStyle: 'Learning style is still being analyzed',
      studyAvailability: '1-2',
      currentCapability: 'Beginner',
      primaryGoal: 'Skill development',
      isDeveloping: true,
      statusMessage: 'Learning profile is still developing.',
    };
  },
};

export default learningProfileService;
