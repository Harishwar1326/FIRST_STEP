import { Lesson } from '../models/lesson.model.js';
import { Quiz } from '../models/quiz.model.js';
import { Task } from '../models/task.model.js';
import { LearningProfile } from '../models/learningProfile.model.js';
import { Revision } from '../models/revision.model.js';
import { Recommendation } from '../models/recommendation.model.js';
import { Analytics } from '../models/analytics.model.js';
import { LessonProgress } from '../models/programmingLearning.model.js';
import { aiServiceClient } from '../utils/aiServiceClient.js';
import mongoose from 'mongoose';

const getPublishedLesson = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error('Invalid lesson ID');
    error.statusCode = 400;
    throw error;
  }
  const lesson = await Lesson.findOne({ _id: id, isPublished: { $ne: false } });
  if (!lesson) {
    const error = new Error('Lesson not found');
    error.statusCode = 404;
    throw error;
  }
  return lesson;
};

export const getPassedQuizIds = (quizScores = []) => quizScores
  .filter((result) => Number(result.totalQuestions) > 0 && Number(result.score) / Number(result.totalQuestions) >= 0.7)
  .map((result) => result.quizId);

export const learningService = {
  // Get all lessons, optionally filtered by class and subject
  async getLessons(filters = {}) {
    const query = { isPublished: { $ne: false } };
    if (filters.class) query.class = filters.class;
    if (filters.subject) query.subject = filters.subject;
    if (filters.chapter) query.chapter = filters.chapter;

    return await Lesson.find(query).sort({ order: 1 });
  },

  // Get single lesson details, including associated quizzes and tasks
  async getLessonById(id) {
    const lesson = await getPublishedLesson(id);

    const quiz = await Quiz.findOne({ lessonId: id });
    const tasks = await Task.find({ lessonId: id });

    return {
      lesson,
      quiz: quiz || null,
      tasks: tasks || [],
    };
  },

  // Initialize or fetch the learning profile for a user
  async getOrCreateProfile(userId) {
    let profile = await LearningProfile.findOne({ userId });
    if (!profile) {
      profile = new LearningProfile({
        userId,
        weakConcepts: [],
        correctConcepts: [],
        wrongConcepts: [],
      });
      await profile.save();
    }
    return profile;
  },

  // Submit Quiz responses and trigger learning profile updates
  async submitQuiz(userId, lessonId, answers) {
    const lesson = await getPublishedLesson(lessonId);

    const quiz = await Quiz.findOne({ lessonId });
    if (!quiz) throw new Error('Quiz not found for this lesson');

    // 1. Evaluate answers and count scores
    let correctCount = 0;
    const totalQuestions = quiz.questions.length;
    const correctConceptsSet = new Set();
    const wrongConceptsSet = new Set();

    quiz.questions.forEach((q, idx) => {
      const userAnswer = answers[idx]; // answer submitted
      if (userAnswer && userAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
        correctCount++;
        correctConceptsSet.add(q.concept);
      } else {
        wrongConceptsSet.add(q.concept);
      }
    });

    const scorePct = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

    // 2. Fetch/update student profile
    const profile = await this.getOrCreateProfile(userId);

    // Save quiz score
    profile.quizScores.push({
      quizId: quiz._id,
      score: correctCount,
      totalQuestions,
    });

    // Update mistake counts and concept lists
    wrongConceptsSet.forEach((concept) => {
      // Add to wrong concepts list if not present
      if (!profile.wrongConcepts.includes(concept)) {
        profile.wrongConcepts.push(concept);
      }
      // Remove from correct concepts
      profile.correctConcepts = profile.correctConcepts.filter((c) => c !== concept);

      // Increment mistake patterns count
      const existingPattern = profile.mistakePatterns.find((p) => p.concept === concept);
      if (existingPattern) {
        existingPattern.count++;
        existingPattern.lastOccurred = new Date();
      } else {
        profile.mistakePatterns.push({ concept, count: 1 });
      }

      // Add to weak concepts
      if (!profile.weakConcepts.includes(concept)) {
        profile.weakConcepts.push(concept);
      }
    });

    correctConceptsSet.forEach((concept) => {
      if (!profile.correctConcepts.includes(concept)) {
        profile.correctConcepts.push(concept);
      }
      // Clean from wrong & weak concepts if performance is solid
      profile.wrongConcepts = profile.wrongConcepts.filter((c) => c !== concept);
      profile.weakConcepts = profile.weakConcepts.filter((c) => c !== concept);
    });

    // Update streak (dummy check or increment)
    profile.studyStreak = (profile.studyStreak || 0) + 1;

    // 3. Log Analytics Event
    const log = new Analytics({
      userId,
      activityType: 'submit_quiz',
      lessonId,
      score: scorePct,
      metadata: {
        correctCount,
        totalQuestions,
        correctConcepts: Array.from(correctConceptsSet),
        wrongConcepts: Array.from(wrongConceptsSet),
      },
    });
    await log.save();

    // 4. Update Spaced Repetition Revision Schedule (SM-2 based)
    await this.updateRevisionSchedule(userId, lessonId, scorePct);

    // 5. Query Python FastAPI Service for profile prediction updates
    await this.syncProfilePredictions(userId, profile, scorePct);

    // 6. Generate new recommendations and custom material caches
    const generatedKit = await this.regenerateRecommendations(userId, profile, lesson);

    return {
      scorePct,
      correctCount,
      totalQuestions,
      newMastery: profile.masteryScore,
      newStyle: profile.learningStyle,
      newDifficulty: profile.difficulty,
      generatedKit,
    };
  },

  // Submit active learning tasks (Feynman teaching challenge or practice)
  async submitTask(userId, lessonId, taskData) {
    await getPublishedLesson(lessonId);
    const { taskId, duration, readingSpeed, notesText, drawingStrokes, confidenceLevel } = taskData;

    const profile = await this.getOrCreateProfile(userId);

    // Update observed, self-reported behavioral data
    if (readingSpeed) profile.readingSpeed = Math.round((profile.readingSpeed + readingSpeed) / 2);
    if (notesText) {
      profile.manualNotes.push({
        lessonId,
        noteContent: notesText,
      });
    }
    if (drawingStrokes) profile.drawingActivity += drawingStrokes;
    if (confidenceLevel) profile.confidenceLevel = confidenceLevel;
    if (duration) profile.sessionDuration = Math.round((profile.sessionDuration + duration) / 2);

    // Log Analytics Event
    const log = new Analytics({
      userId,
      activityType: 'submit_task',
      lessonId,
      duration,
      metadata: {
        taskId,
        drawingStrokes,
        notesLength: notesText ? notesText.length : 0,
        confidenceLevel,
      },
    });
    await log.save();

    // Sync AI models and update profile
    await profile.save();

    return {
      success: true,
      newMastery: profile.masteryScore,
      newStyle: profile.learningStyle,
    };
  },

  // Local utility to schedule reviews using SM-2
  async updateRevisionSchedule(userId, lessonId, quizAccuracyPct) {
    const rating = Math.round((quizAccuracyPct / 100) * 5); // scale 0-100 to 0-5 rating
    let schedule = await Revision.findOne({ userId, lessonId });

    if (!schedule) {
      schedule = new Revision({ userId, lessonId });
    }

    let { interval, repetitions, easeFactor } = schedule;

    if (rating >= 3) {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions++;
      easeFactor = easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
      easeFactor = Math.max(1.3, easeFactor);
    } else {
      repetitions = 0;
      interval = 1;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + interval);

    schedule.interval = interval;
    schedule.repetitions = repetitions;
    schedule.easeFactor = easeFactor;
    schedule.dueDate = dueDate;
    schedule.lastReviewed = new Date();

    await schedule.save();
  },

  // Calls FastAPI to run Scikit-Learn models on student stats
  async syncProfilePredictions(userId, profile, recentQuizScore) {
    try {
      // Build features from persisted student evidence using the same units as
      // the training dataset. Never substitute a fabricated task score or
      // default study duration for missing observations.
      const [lessonRows, revisionRows] = await Promise.all([
        LessonProgress.find({ userId: String(userId) }).select('completed watchPercentage timeSpent lastWatchedAt updatedAt').lean(),
        Revision.find({ userId: String(userId) }).select('lastReviewed updatedAt').lean(),
      ]);
      const quizRows = Array.isArray(profile.quizScores) ? profile.quizScores : [];
      const quizPercents = quizRows
        .filter((row) => Number(row.totalQuestions) > 0)
        .map((row) => (Number(row.score) / Number(row.totalQuestions)) * 100);
      if (!quizPercents.length && Number.isFinite(Number(recentQuizScore))) quizPercents.push(Number(recentQuizScore));
      const averageQuizScore = quizPercents.length
        ? quizPercents.reduce((sum, value) => sum + value, 0) / quizPercents.length
        : 0;
      const activeDays = new Set([
        ...lessonRows.map((row) => row.lastWatchedAt || row.updatedAt),
        ...revisionRows.map((row) => row.lastReviewed || row.updatedAt),
        ...quizRows.map((row) => row.timestamp),
      ].filter(Boolean).map((date) => new Date(date).toISOString().slice(0, 10)));
      const features = {
        quizScore: averageQuizScore,
        quizAccuracy: averageQuizScore / 100,
        lessonCompletionRate: lessonRows.length
          ? lessonRows.filter((row) => row.completed || Number(row.watchPercentage) >= 90).length / lessonRows.length
          : 0,
        studyTime: lessonRows.length
          ? lessonRows.reduce((sum, row) => sum + (Number(row.timeSpent) || 0), 0) / lessonRows.length / 60
          : 0,
        revisionCount: revisionRows.length,
        daysActive: activeDays.size,
        averageWatchPercentage: lessonRows.length
          ? lessonRows.reduce((sum, row) => sum + (Number(row.watchPercentage) || 0), 0) / lessonRows.length / 100
          : 0,
        pauseFrequency: 0,
        videoWatchRate: lessonRows.length ? 1 : 0,
        averageAnswerTime: 0,
        confidenceLevel: Number(profile.confidenceLevel) || 0,
      };

      const response = await aiServiceClient.post('/learning/predict-profile', features);
      
      profile.masteryScore = response.data.masteryScore;
      profile.retentionProbability = response.data.retentionProbability;
      // The ML service no longer guesses a learning style from telemetry;
      // preserve the student's explicit preference if one was recorded.
      profile.learningStyle = response.data.learningStyle || profile.learningStyle || 'Mixed';
      profile.difficulty = ({ Beginner: 'Easy', Intermediate: 'Medium', Advanced: 'Advanced' })[response.data.difficulty] || profile.difficulty || 'Medium';
      profile.predictionSource = response.data.predictionSource || 'unknown';
      profile.predictionTrainingData = response.data.trainingData || 'unknown';
      profile.difficultySource = response.data.difficultySource || 'unknown';

      await profile.save();
    } catch (error) {
      console.error('Error syncing predictions from Python AI Service:', error.message);
      // Keep the submitted learning activity, but never fabricate a mastery gain
      // when the prediction service is unavailable.
      await profile.save();
      return false;
    }
    return true;
  },

  // Regenerate recommendations and cache them in DB
  async regenerateRecommendations(userId, profile, currentLesson) {
    try {
      const masteryLevel = ({ Easy: 'Beginner', Medium: 'Intermediate', Advanced: 'Advanced' })[profile.difficulty] || profile.difficulty || 'Intermediate';
      const recentQuiz = Array.isArray(profile.quizScores) ? profile.quizScores[profile.quizScores.length - 1] : null;
      const response = await aiServiceClient.post('/learning/generate-content', {
        type: 'notes',
        lessonTitle: currentLesson.title,
        lessonContent: currentLesson.content,
        masteryLevel,
        studentEvidence: {
          recentQuizScore: recentQuiz?.totalQuestions > 0 ? Math.round((recentQuiz.score / recentQuiz.totalQuestions) * 100) : null,
          weakConcepts: (profile.weakConcepts || []).slice(0, 5),
          modelDifficulty: masteryLevel,
          modelScoreStatus: profile.predictionTrainingData || 'synthetic',
        },
      });

      const cardsResponse = await aiServiceClient.post('/learning/generate-content', {
        type: 'flashcards',
        weakConcepts: profile.weakConcepts.length > 0 ? profile.weakConcepts : [currentLesson.chapter],
      });

      const videos = currentLesson.videoUrl
        ? [{ title: currentLesson.title, url: currentLesson.videoUrl, concept: currentLesson.chapter }]
        : [];

      const notes = [
        {
          title: `AI Personalized study guide - ${currentLesson.title}`,
          content: response.data.notes || 'No notes generated.',
          level: masteryLevel,
        },
      ];

      const flashcards = cardsResponse.data.flashcards || [];

      // Save/overwrite recommendations
      let recs = await Recommendation.findOne({ userId });
      if (!recs) {
        recs = new Recommendation({ userId });
      }

      recs.videos = videos;
      recs.notes = notes;
      recs.flashcards = flashcards;
      recs.challenges = [
        { title: `Exam Readiness: ${currentLesson.title}`, description: 'Solve 5 numerical problems from this chapter.', difficulty: profile.difficulty || 'Intermediate' }
      ];

      await recs.save();
      return recs;
    } catch (error) {
      console.error('Error generating AI recommendation content:', error.message);
      // Fallback
      return null;
    }
  },

  // Evaluates the dynamic unlock path for Class & Subject
  async getLearningPath(userId, className, subject) {
    // 1. Fetch lessons
    const lessons = await Lesson.find({ class: className, subject, isPublished: { $ne: false } }).sort({ order: 1 });
    const profile = await this.getOrCreateProfile(userId);

    // 2. Map lessons and evaluate prerequisites
    // We unlock a lesson if all its prerequisites (by title matching) have mastery score >= 70% or are completed.
    // If the student has studied the prerequisite and has high profile mastery, we unlock it.
    // Otherwise, we mark it locked and indicate the weak prerequisite to revisit.
    const resolvedPath = [];

    // Let's create a map of lesson completion / mastery
    // For simplicity, we can assume a prerequisite is completed if the lesson's concept is in "correctConcepts"
    // or if the student has a high overall mastery score and has registered a quiz score for it.
    // A lesson counts as completed for prerequisite unlocking after a passing
    // quiz score; merely submitting an unanswered/failed quiz is insufficient.
    const passedQuizIds = getPassedQuizIds(profile.quizScores);
    const lessonsWithQuiz = await Quiz.find({ _id: { $in: passedQuizIds } });
    const completedTitles = new Set();
    lessonsWithQuiz.forEach(q => {
      completedTitles.add(q.lessonId.toString());
    });

    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      const reqs = lesson.prerequisites || [];
      let unlocked = true;
      let reasonLocked = '';
      const missingPrereqs = [];

      // Check prerequisites
      for (const reqTitle of reqs) {
        const prereqLesson = await Lesson.findOne({ title: reqTitle, isPublished: { $ne: false } });
        if (prereqLesson) {
          const prereqIdStr = prereqLesson._id.toString();
          const isPrereqCompleted = completedTitles.has(prereqIdStr);
          
          // Also check if prereq concept is in weakConcepts
          const hasWeakPrereqConcept = profile.weakConcepts.includes(prereqLesson.title) || profile.weakConcepts.includes(prereqLesson.chapter);

          if (!isPrereqCompleted || hasWeakPrereqConcept) {
            unlocked = false;
            missingPrereqs.push(reqTitle);
          }
        }
      }

      if (!unlocked) {
        reasonLocked = `You need to review or complete ${missingPrereqs.join(', ')} first!`;
      }

      // Check if this lesson has been studied but contains weak concepts
      const isWeak = profile.weakConcepts.includes(lesson.title) || profile.weakConcepts.includes(lesson.chapter);

      resolvedPath.push({
        id: lesson._id,
        title: lesson.title,
        chapter: lesson.chapter,
        difficulty: lesson.difficulty,
        estimatedStudyTime: lesson.estimatedStudyTime,
        unlocked,
        recommendRevisit: isWeak,
        reasonLocked,
        order: lesson.order,
      });
    }

    return {
      class: className,
      subject,
      currentMastery: profile.masteryScore,
      learningStyle: profile.learningStyle,
      path: resolvedPath,
    };
  },

  // Returns cache of recommended assets
  async getRecommendations(userId) {
    const recs = await Recommendation.findOne({ userId });
    if (!recs) {
      return {
        videos: [],
        notes: [],
        flashcards: [],
        challenges: [],
        revision: [],
      };
    }
    return recs;
  },

  // Compiles overall student analytical dashboard parameters
  async getAnalytics(userId) {
    const profile = await this.getOrCreateProfile(userId);
    const logs = await Analytics.find({ userId }).sort({ createdAt: -1 }).limit(20);

    const studyTimeHistory = [];
    const quizAccuracyHistory = [];

    profile.quizScores.forEach((qs) => {
      const acc = qs.totalQuestions > 0 ? (qs.score / qs.totalQuestions) * 100 : 0;
      quizAccuracyHistory.push({
        date: qs.timestamp,
        accuracy: acc,
      });
    });

    return {
      masteryScore: profile.masteryScore,
      retentionProbability: profile.retentionProbability,
      learningStyle: profile.learningStyle,
      difficulty: profile.difficulty,
      weakConcepts: profile.weakConcepts,
      correctConcepts: profile.correctConcepts,
      wrongConcepts: profile.wrongConcepts,
      studyStreak: profile.studyStreak,
      readingSpeed: profile.readingSpeed,
      attentionDuration: profile.attentionDuration,
      sessionDuration: profile.sessionDuration,
      drawingActivity: profile.drawingActivity,
      manualNotesCount: profile.manualNotes.length,
      recentActivityLogs: logs.map(l => ({
        activityType: l.activityType,
        score: l.score,
        duration: l.duration,
        timestamp: l.createdAt,
      })),
      quizAccuracyHistory,
    };
  },
};
