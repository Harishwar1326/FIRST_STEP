import { Lesson } from '../models/lesson.model.js';
import { Quiz } from '../models/quiz.model.js';
import { Task } from '../models/task.model.js';
import { LearningProfile } from '../models/learningProfile.model.js';
import { Revision } from '../models/revision.model.js';
import { Recommendation } from '../models/recommendation.model.js';
import { Analytics } from '../models/analytics.model.js';
import { aiServiceClient } from '../utils/aiServiceClient.js';

export const learningService = {
  // Get all lessons, optionally filtered by class and subject
  async getLessons(filters = {}) {
    const query = {};
    if (filters.class) query.class = filters.class;
    if (filters.subject) query.subject = filters.subject;
    if (filters.chapter) query.chapter = filters.chapter;

    return await Lesson.find(query).sort({ order: 1 });
  },

  // Get single lesson details, including associated quizzes and tasks
  async getLessonById(id) {
    const lesson = await Lesson.findById(id);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

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
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new Error('Lesson not found');

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
    const { taskId, duration, readingSpeed, notesText, drawingStrokes, confidenceLevel } = taskData;

    const profile = await this.getOrCreateProfile(userId);

    // Update behavioral data
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

    profile.challengePerformance = Math.min(100, (profile.challengePerformance || 0) + 10);

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
    await this.syncProfilePredictions(userId, profile, 80); // Assume base task completion is equivalent to 80% accuracy
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
      // Calculate features
      const features = {
        quizScore: recentQuizScore,
        taskCompletion: profile.challengePerformance / 100 || 0.8,
        studyTime: Math.round(profile.sessionDuration / 60) || 20,
        revisionCount: profile.revisionFrequency || 1,
        daysSinceLastRevision: 2.0, // default days representation
        readingSpeed: profile.readingSpeed || 150,
        drawingActivity: profile.drawingActivity || 0,
        videoDurationRatio: profile.learningStyle === 'Visual' ? 0.8 : 0.3,
        notesLength: profile.manualNotes.length > 0 ? profile.manualNotes[profile.manualNotes.length - 1].noteContent.length : 100,
        confidenceLevel: profile.confidenceLevel || 3,
      };

      const response = await aiServiceClient.post('/learning/predict-profile', features);
      
      profile.masteryScore = response.data.masteryScore;
      profile.retentionProbability = response.data.retentionProbability;
      profile.learningStyle = response.data.learningStyle;
      profile.difficulty = response.data.difficulty;

      await profile.save();
    } catch (error) {
      console.error('Error syncing predictions from Python AI Service:', error.message);
      // Fail-soft: apply default increments if AI service is down
      profile.masteryScore = Math.min(100, (profile.masteryScore || 50) + 2);
      await profile.save();
    }
  },

  // Regenerate recommendations and cache them in DB
  async regenerateRecommendations(userId, profile, currentLesson) {
    try {
      const response = await aiServiceClient.post('/learning/generate-content', {
        type: 'notes',
        lessonTitle: currentLesson.title,
        lessonContent: currentLesson.content,
        masteryLevel: profile.difficulty || 'Intermediate',
      });

      const cardsResponse = await aiServiceClient.post('/learning/generate-content', {
        type: 'flashcards',
        weakConcepts: profile.weakConcepts.length > 0 ? profile.weakConcepts : [currentLesson.chapter],
      });

      const mockVideos = [
        { title: `Mastering ${currentLesson.chapter} - Visual Concept Video`, url: currentLesson.videoUrl || 'https://www.youtube.com/embed/grnP3mDuRIA', duration: '8 min', concept: currentLesson.chapter },
        { title: `Practical demonstration of ${currentLesson.title}`, url: currentLesson.videoUrl || 'https://www.youtube.com/embed/grnP3mDuRIA', duration: '12 min', concept: currentLesson.title }
      ];

      const notes = [
        {
          title: `AI Personalized study guide - ${currentLesson.title}`,
          content: response.data.notes || 'No notes generated.',
          level: profile.difficulty || 'Intermediate',
        },
      ];

      const flashcards = cardsResponse.data.flashcards || [];

      // Save/overwrite recommendations
      let recs = await Recommendation.findOne({ userId });
      if (!recs) {
        recs = new Recommendation({ userId });
      }

      recs.videos = mockVideos;
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
    const lessons = await Lesson.find({ class: className, subject }).sort({ order: 1 });
    const profile = await this.getOrCreateProfile(userId);

    // 2. Map lessons and evaluate prerequisites
    // We unlock a lesson if all its prerequisites (by title matching) have mastery score >= 70% or are completed.
    // If the student has studied the prerequisite and has high profile mastery, we unlock it.
    // Otherwise, we mark it locked and indicate the weak prerequisite to revisit.
    const resolvedPath = [];

    // Let's create a map of lesson completion / mastery
    // For simplicity, we can assume a prerequisite is completed if the lesson's concept is in "correctConcepts"
    // or if the student has a high overall mastery score and has registered a quiz score for it.
    const completedLessonTitles = new Set();
    
    // Check which lessons have quiz scores registered in user profile
    profile.quizScores.forEach((qs) => {
      // Find the lesson associated with this score
      // For this demo, let's assume if the student score is >= 1, they completed it
      completedLessonTitles.add(qs.quizId); // we'll map actual titles below
    });

    // Let's check lesson titles where student scored well
    // We can also trace by concepts
    const lessonsWithQuiz = await Quiz.find({ _id: { $in: profile.quizScores.map(q => q.quizId) } });
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
        const prereqLesson = await Lesson.findOne({ title: reqTitle });
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
