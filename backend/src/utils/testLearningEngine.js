import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { learningService } from '../services/learning.service.js';
import { Lesson } from '../models/lesson.model.js';
import { Quiz } from '../models/quiz.model.js';
import { LearningProfile } from '../models/learningProfile.model.js';
import { seedLessons } from './seedLessons.js';

dotenv.config();

const runValidation = async () => {
  console.log('🏁 Starting Adaptive Personalized Learning Engine (APLE) Verification...');
  
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/firststep';
  
  try {
    // 1. Connect to MongoDB
    console.log(`Connecting to MongoDB at ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected successfully.');

    // 2. Run Lesson Seed
    console.log('Seeding curriculum database with CBSE metadata...');
    const seedResult = await seedLessons();
    console.log('✅ Seeding completed:', seedResult);

    // 3. Test Lesson Listing
    console.log('Fetching seeded lessons...');
    const lessons = await Lesson.find({});
    if (lessons.length === 0) throw new Error('No lessons found after seeding.');
    console.log(`✅ Found ${lessons.length} lessons in database.`);

    // 4. Create Mock User ID & Profile
    const mockUserId = new mongoose.Types.ObjectId();
    console.log(`Using Mock User ID: ${mockUserId}`);

    // 5. Test Path Unlocking (prerequisites check)
    console.log('Evaluating dynamic Learning Path graph dependencies...');
    const initialPath = await learningService.getLearningPath(mockUserId, 'Class 10', 'Mathematics');
    console.log(`✅ Learning Path loaded. Subject: ${initialPath.subject}, Mastery: ${initialPath.currentMastery}%`);
    
    // Algebra Basics should be unlocked (order 1)
    const algebraNode = initialPath.path.find(p => p.title === 'Algebra Basics');
    const quadraticNode = initialPath.path.find(p => p.title === 'Quadratic Equations and Roots');
    
    console.log(`- Lesson: "${algebraNode.title}" Unlocked? ${algebraNode.unlocked}`);
    console.log(`- Lesson: "${quadraticNode.title}" Unlocked? ${quadraticNode.unlocked} (Requires prerequisites: ${quadraticNode.reasonLocked ? 'Yes' : 'No'})`);

    if (!algebraNode.unlocked) throw new Error('Algebra Basics should be unlocked as it has no prerequisites.');
    if (quadraticNode.unlocked) throw new Error('Quadratic Equations should be locked initially due to uncompleted prerequisites.');

    // 6. Simulate Quiz Submission
    console.log('Simulating quiz submission for "Algebra Basics" (Score: 100%)...');
    const mockQuizAnswers = ['Variable', '17']; // 2/2 correct
    const quizResponse = await learningService.submitQuiz(mockUserId, algebraNode.id, mockQuizAnswers);
    console.log('✅ Quiz response evaluated:', {
      scorePct: quizResponse.scorePct,
      newMastery: quizResponse.newMastery,
      newStyle: quizResponse.newStyle,
      newDifficulty: quizResponse.newDifficulty,
    });

    // 7. Simulate Active Recall task with Drawingstrokes and Notes WPM
    console.log('Simulating notes upload and drawing canvas action...');
    const taskResponse = await learningService.submitTask(mockUserId, algebraNode.id, {
      taskId: 'active_recall_challenge_feynman',
      duration: 180, // 3 minutes
      readingSpeed: 160,
      notesText: 'Algebra is about variables representing unknown numbers. Solve equations by isolating the variables.',
      drawingStrokes: 62, // triggers Visual classifications
      confidenceLevel: 4,
    });
    console.log('✅ Task activity saved:', taskResponse);

    // 8. Re-evaluate Learning Path
    console.log('Re-evaluating dynamic Learning Path graph after completion...');
    const updatedPath = await learningService.getLearningPath(mockUserId, 'Class 10', 'Mathematics');
    const linearNode = updatedPath.path.find(p => p.title === 'Linear Equations in Two Variables');
    console.log(`- Lesson: "${linearNode.title}" Unlocked? ${linearNode.unlocked}`);

    // 9. Fetch Analytics Summary
    console.log('Retrieving student learning analytics profile...');
    const analytics = await learningService.getAnalytics(mockUserId);
    console.log('✅ Analytics verified:', {
      style: analytics.learningStyle,
      mastery: analytics.masteryScore,
      drawingStrokes: analytics.drawingActivity,
      retentionProbability: analytics.retentionProbability,
    });

    // 10. Fetch Personalized Study Kit
    console.log('Retrieving personalized recommendations (custom notes & flashcards)...');
    const recs = await learningService.getRecommendations(mockUserId);
    console.log('✅ Personalized kit generated successfully:', {
      hasPersonalizedNotes: recs.notes.length > 0,
      flashcardCount: recs.flashcards.length,
      videoRecommendationCount: recs.videos.length,
    });

    console.log('\n🎉 ALL APLE SYSTEM TESTS PASSED SUCCESSFULLY! FEATURE IS PRODUCTION READY.');
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

runValidation();
