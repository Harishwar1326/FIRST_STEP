import 'dotenv/config';
import mongoose from 'mongoose';
import axios from 'axios';
import { learningProfileService } from '../services/learningProfile.service.js';
import { LearningDnaAssessment } from '../models/learningDnaAssessment.model.js';
import { QuizResult, LessonProgress } from '../models/programmingLearning.model.js';
import { ThinkingSkills, Submission } from '../models/thinking.model.js';
import { Revision } from '../models/revision.model.js';
import { Analytics } from '../models/analytics.model.js';
import jwt from 'jsonwebtoken';
import Lesson from '../models/lesson.model.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/firststep';
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';

const generateMockToken = (userId, name = 'Test Student') => {
  return jwt.sign(
    { id: String(userId), name, email: `student_${userId}@test.com`, role: 'student' },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
};

const runTest = async () => {
  console.log('='.repeat(70));
  console.log('  FIRSTSTEP DYNAMIC LEARNING PROFILE VERIFICATION TEST');
  console.log('='.repeat(70));

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB.');

  const studentAId = new mongoose.Types.ObjectId().toString();
  const studentBId = new mongoose.Types.ObjectId().toString();
  const tokenB = generateMockToken(studentBId, 'Active Student');

  // Find or create a mock lesson
  let lesson = await Lesson.findOne({});
  if (!lesson) {
    lesson = await Lesson.create({
      title: 'Python Fundamentals',
      subject: 'Programming in Python',
      class: 'Class 11',
      chapter: 'Introduction to Python',
      content: 'Variables, loops, and functions',
      order: 1,
    });
  }

  // ---------------------------------------------------------
  // STUDENT 1: Low Activity / Baseline State
  // ---------------------------------------------------------
  console.log('\n--- 1. Setting up Student 1 (Baseline State) ---');
  await LearningDnaAssessment.create({
    userId: studentAId,
    completedAt: new Date(),
    assessmentScore: 45,
    responses: {
      programmingLevel: 'Beginner',
      studyHoursPerDay: 'Less than 1',
      studyConsistency: 'Rarely',
      problemSolvingConfidence: 'Low',
      averageMarks: 52,
      primaryGoal: 'Board/college exams',
      learningPreference: 'Videos',
    },
    capabilityProfile: {
      programming: 45,
      problemSolving: 48,
      consistency: 38,
      confidence: 42,
      academicPerformance: 52,
    },
    insights: {
      strengths: ['Initial diagnostic completed'],
      areasToImprove: ['Study consistency', 'Programming fundamentals'],
      learningPreference: 'Video-first learning',
      studyAvailability: 'Less than 1',
      currentCapability: 'Beginner',
      primaryGoal: 'Board/college exams',
    },
  });

  const profileA = await learningProfileService.getStudentLearningProfile(studentAId);
  console.log('Student 1 Profile Result:');
  console.log('  Overall Score      :', profileA.overallScore);
  console.log('  Current Capability :', profileA.currentCapability);
  console.log('  Learning Style     :', profileA.learningStyle);
  console.log('  Skills             :', profileA.skills);
  console.log('  Strengths          :', profileA.strengths);
  console.log('  Areas to Improve   :', profileA.areasToImprove);

  // ---------------------------------------------------------
  // STUDENT 2: Active High-Performer State
  // ---------------------------------------------------------
  console.log('\n--- 2. Setting up Student 2 (High Performance Activity State) ---');
  await LearningDnaAssessment.create({
    userId: studentBId,
    completedAt: new Date(),
    assessmentScore: 60,
    responses: {
      programmingLevel: 'Intermediate',
      studyHoursPerDay: '2–4',
      studyConsistency: 'Usually',
      problemSolvingConfidence: 'High',
      averageMarks: 78,
      primaryGoal: 'Software development',
      learningPreference: 'Practice problems',
    },
    capabilityProfile: {
      programming: 60,
      problemSolving: 62,
      consistency: 60,
      confidence: 65,
      academicPerformance: 75,
    },
    insights: {
      strengths: ['Good foundational knowledge'],
      areasToImprove: ['Practice more problem-solving activities'],
      learningPreference: 'Practice-heavy learning',
      studyAvailability: '2–4',
      currentCapability: 'Intermediate',
      primaryGoal: 'Software development',
    },
  });

  // Log active quizzes with high scores
  const lessonId1 = new mongoose.Types.ObjectId();
  const lessonId2 = new mongoose.Types.ObjectId();
  const lessonId3 = new mongoose.Types.ObjectId();

  await QuizResult.create([
    { userId: studentBId, lessonId: lessonId1, score: 92, totalQuestions: 10, correctCount: 9 },
    { userId: studentBId, lessonId: lessonId2, score: 96, totalQuestions: 10, correctCount: 10 },
    { userId: studentBId, lessonId: lessonId3, score: 88, totalQuestions: 10, correctCount: 9 },
  ]);

  // Log lesson watch progress with high completion & video watch time
  const pastDate1 = new Date(Date.now() - 3 * 24 * 3600 * 1000);
  const pastDate2 = new Date(Date.now() - 2 * 24 * 3600 * 1000);
  const pastDate3 = new Date(Date.now() - 1 * 24 * 3600 * 1000);

  await LessonProgress.create([
    {
      userId: studentBId,
      lessonId: lessonId1,
      subjectSlug: 'python',
      watchPercentage: 95,
      pauseCount: 1,
      replayCount: 0,
      timeSpent: 1800,
      completed: true,
      lastWatchedAt: pastDate1,
    },
    {
      userId: studentBId,
      lessonId: lessonId2,
      subjectSlug: 'python',
      watchPercentage: 90,
      pauseCount: 2,
      replayCount: 1,
      timeSpent: 2100,
      completed: true,
      lastWatchedAt: pastDate2,
    },
    {
      userId: studentBId,
      lessonId: lessonId3,
      subjectSlug: 'python',
      watchPercentage: 100,
      pauseCount: 0,
      replayCount: 0,
      timeSpent: 1500,
      completed: true,
      lastWatchedAt: pastDate3,
    },
  ]);

  // Log Thinking Lab challenge submissions
  await Submission.create([
    { userId: studentBId, challengeId: new mongoose.Types.ObjectId(), challengeTitle: 'Urban Water Allocation', answer: 'Designed an algorithmic flow prioritizing hospital zones.', score: 88 },
    { userId: studentBId, challengeId: new mongoose.Types.ObjectId(), challengeTitle: 'Solar Microgrid Optimization', answer: 'Calculated peak load shifting battery cycle.', score: 92 },
  ]);

  await ThinkingSkills.create({
    userId: studentBId,
    overallScore: 90,
    criticalThinking: 88,
    problemSolving: 92,
    creativity: 85,
    logicalReasoning: 94,
  });

  // Log Spaced Repetition revisions
  await Revision.create([
    { userId: studentBId, lessonId: lessonId1, repetitions: 4, interval: 6, easeFactor: 2.5, lastReviewed: new Date() },
    { userId: studentBId, lessonId: lessonId2, repetitions: 3, interval: 4, easeFactor: 2.4, lastReviewed: pastDate2 },
  ]);

  // Log active study sessions
  await Analytics.create([
    { userId: studentBId, activityType: 'study_lesson', score: 90, duration: 45, createdAt: pastDate1 },
    { userId: studentBId, activityType: 'study_lesson', score: 95, duration: 55, createdAt: pastDate2 },
    { userId: studentBId, activityType: 'study_lesson', score: 92, duration: 60, createdAt: pastDate3 },
  ]);

  const profileB = await learningProfileService.getStudentLearningProfile(studentBId);
  console.log('Student 2 Profile Result:');
  console.log('  Overall Score      :', profileB.overallScore);
  console.log('  Current Capability :', profileB.currentCapability);
  console.log('  Learning Style     :', profileB.learningStyle);
  console.log('  Skills             :', profileB.skills);
  console.log('  Strengths          :', profileB.strengths);
  console.log('  Areas to Improve   :', profileB.areasToImprove);

  // ---------------------------------------------------------
  // 3. COMPARISON & DYNAMIC CHANGE VERIFICATION
  // ---------------------------------------------------------
  console.log('\n--- 3. Verifying Dynamic Changes Between States ---');
  console.log(`Programming Score:      Student 1 (${profileA.skills.programming}%)  vs  Student 2 (${profileB.skills.programming}%) -> Diff: +${profileB.skills.programming - profileA.skills.programming}%`);
  console.log(`Problem Solving Score:  Student 1 (${profileA.skills.problemSolving}%)  vs  Student 2 (${profileB.skills.problemSolving}%) -> Diff: +${profileB.skills.problemSolving - profileA.skills.problemSolving}%`);
  console.log(`Consistency Score:      Student 1 (${profileA.skills.consistency}%)  vs  Student 2 (${profileB.skills.consistency}%) -> Diff: +${profileB.skills.consistency - profileA.skills.consistency}%`);
  console.log(`Overall Mastery Score:  Student 1 (${profileA.overallScore}%)  vs  Student 2 (${profileB.overallScore}%) -> Diff: +${profileB.overallScore - profileA.overallScore}%`);
  console.log(`Capability Transition:  Student 1 ("${profileA.currentCapability}")  ->  Student 2 ("${profileB.currentCapability}")`);
  console.log(`Learning Style Prediction: Student 2 predicted as "${profileB.learningStyle}"`);

  if (profileB.skills.programming <= profileA.skills.programming) {
    throw new Error('Expected Student 2 programming score to be higher than Student 1');
  }
  if (profileB.skills.problemSolving <= profileA.skills.problemSolving) {
    throw new Error('Expected Student 2 problem solving score to be higher than Student 1');
  }
  if (profileB.overallScore <= profileA.overallScore) {
    throw new Error('Expected Student 2 overall score to be higher than Student 1');
  }

  // ---------------------------------------------------------
  // 4. HTTP API TEST: GET /api/v1/learning-profile
  // ---------------------------------------------------------
  console.log('\n--- 4. Testing Live HTTP Endpoint: GET /api/v1/learning-profile ---');
  const httpResponse = await axios.get('http://localhost:5000/api/v1/learning-profile', {
    headers: { Authorization: `Bearer ${tokenB}` },
  });

  console.log('HTTP Status:', httpResponse.status);
  console.log('HTTP Payload received:');
  console.log(JSON.stringify(httpResponse.data, null, 2));

  if (!httpResponse.data.skills || typeof httpResponse.data.overallScore !== 'number') {
    throw new Error('HTTP response missing skills or overallScore');
  }

  // Clean up mock data
  await Promise.all([
    LearningDnaAssessment.deleteMany({ userId: { $in: [studentAId, studentBId] } }),
    QuizResult.deleteMany({ userId: { $in: [studentAId, studentBId] } }),
    LessonProgress.deleteMany({ userId: { $in: [studentAId, studentBId] } }),
    ThinkingSkills.deleteMany({ userId: { $in: [studentAId, studentBId] } }),
    Submission.deleteMany({ userId: { $in: [studentAId, studentBId] } }),
    Revision.deleteMany({ userId: { $in: [studentAId, studentBId] } }),
    Analytics.deleteMany({ userId: { $in: [studentAId, studentBId] } }),
  ]);
  console.log('\n🧹 Cleaned up mock test data.');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
  await mongoose.disconnect();
  process.exit(0);
};

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
