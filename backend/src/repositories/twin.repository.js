import { LearningTwin } from "../models/twin.model.js";
import { LearningDnaAssessment } from "../models/learningDnaAssessment.model.js";
import Lesson from "../models/lesson.model.js";
import { LearningAcademyActivity } from "../models/learningAcademyActivity.model.js";
import { LessonProgress, QuizResult, SmartLessonNote, VideoActivityEvent } from "../models/programmingLearning.model.js";
import { Revision } from "../models/revision.model.js";
import { Analytics } from "../models/analytics.model.js";
import { Submission, ThinkingSkills } from "../models/thinking.model.js";
import { Note } from "../models/note.model.js";
import { Task } from "../models/task.model.js";
import { LearningProfile } from "../models/learningProfile.model.js";

export const twinRepository = {
  async create(twinData) {
    const twin = new LearningTwin(twinData);
    await twin.save();
    return twin;
  },

  async findByUserId(userId) {
    return LearningTwin.findOne({ userId: String(userId) });
  },

  async getLearningEvidence(userId) {
    const ownerId = String(userId);
    const ownerVariants = [ownerId];
    if (/^\d+$/.test(ownerId)) ownerVariants.push(Number(ownerId));
    const ownerQuery = { userId: { $in: ownerVariants } };

    const [twin, assessment, learningModelProfile, lessons, lessonProgress, videoEvents, quizResults, quizSummaryRows, academyActivities, thinkingSkills, thinkingSubmissions, revisions, revisionDueCount, analytics, notes, noteCount, smartNotes, smartNoteCount, taskSummaryRows, taskSubmissionSummaryRows, revisionEventCount] = await Promise.all([
      LearningTwin.findOne({ userId: ownerId }).lean(),
      LearningDnaAssessment.findOne({ userId: ownerId }).lean(),
      LearningProfile.findOne({ userId: ownerId }).lean(),
      Lesson.find({ class: 'Programming MVP', isPublished: { $ne: false } }).sort({ subject: 1, order: 1 }).lean(),
      LessonProgress.find({ userId: ownerId }).sort({ lastWatchedAt: -1 }).lean(),
      VideoActivityEvent.find({ userId: ownerId }).sort({ createdAt: -1 }).limit(100).populate('lessonId', 'title subject').lean(),
      QuizResult.find({ userId: ownerId }).sort({ createdAt: -1 }).limit(200).lean(),
      QuizResult.aggregate([{ $match: { userId: ownerId } }, { $group: { _id: null, attempts: { $sum: 1 }, averageScore: { $avg: '$score' } } }]),
      LearningAcademyActivity.find(ownerQuery).sort({ updatedAt: -1 }).limit(100).lean(),
      ThinkingSkills.findOne({ userId: ownerId }).lean(),
      Submission.find({ userId: ownerId }).sort({ createdAt: -1 }).limit(100).lean(),
      Revision.find({ ...ownerQuery, dueDate: { $lte: new Date() } }).sort({ dueDate: 1 }).limit(100).lean(),
      Revision.countDocuments({ ...ownerQuery, dueDate: { $lte: new Date() } }),
      Analytics.find(ownerQuery).sort({ createdAt: -1 }).limit(100).lean(),
      Note.find({ userId: ownerId }).select('title subject updatedAt createdAt').sort({ updatedAt: -1 }).limit(20).lean(),
      Note.countDocuments({ userId: ownerId }),
      SmartLessonNote.find({ userId: ownerId }).select('title lessonId updatedAt createdAt').sort({ updatedAt: -1 }).limit(20).lean(),
      SmartLessonNote.countDocuments({ userId: ownerId }),
      Task.aggregate([
        { $lookup: { from: 'lessons', localField: 'lessonId', foreignField: '_id', as: 'lesson' } },
        { $unwind: '$lesson' },
        { $match: { 'lesson.class': 'Programming MVP', 'lesson.isPublished': { $ne: false } } },
        { $project: { _id: 1, lessonId: 1, title: 1, type: 1, lessonTitle: '$lesson.title', subject: '$lesson.subject', subjectSlug: '$lesson.subjectSlug' } },
      ]),
      Analytics.aggregate([
        { $match: { ...ownerQuery, activityType: 'submit_task' } },
        { $lookup: { from: 'lessons', localField: 'lessonId', foreignField: '_id', as: 'lesson' } },
        { $unwind: '$lesson' },
        { $match: { 'lesson.class': 'Programming MVP', 'lesson.isPublished': { $ne: false } } },
        { $group: {
          _id: null,
          submissions: { $sum: 1 },
          linkedSubmissions: { $sum: { $cond: [{ $and: [{ $ne: ['$metadata.taskId', null] }, { $ne: ['$metadata.taskId', ''] }] }, 1, 0] } },
          taskIds: { $addToSet: '$metadata.taskId' },
        } },
      ]),
      Analytics.countDocuments({ ...ownerQuery, activityType: 'revision' }),
    ]);

    return {
      twin, assessment, learningModelProfile, lessons, lessonProgress, videoEvents, quizResults,
      quizSummary: quizSummaryRows[0] || { attempts: 0, averageScore: null },
      academyActivities, thinkingSkills, thinkingSubmissions, revisions, revisionDueCount,
      analytics, notes, noteCount, smartNotes, smartNoteCount,
      taskDefinitions: taskSummaryRows,
      taskSubmissions: taskSubmissionSummaryRows[0] || { submissions: 0, linkedSubmissions: 0, taskIds: [] },
      revisionEventCount,
    };
  },

  async updateProgress(userId, progressData) {
    const update = {};
    if (progressData.studySession) {
      update.$push = {
        ...(update.$push || {}),
        studySessions: { ...progressData.studySession, source: 'self-reported', date: new Date() },
      };
      update.$inc = {
        ...(update.$inc || {}),
        "skillProgress.totalSessions": 1,
        "skillProgress.totalTime":
          Number(progressData.studySession.duration) || 0,
      };
    }
    if (progressData.mistake) {
      update.$push = {
        ...(update.$push || {}),
        mistakes: { ...progressData.mistake, lastOccurrence: new Date() },
      };
    }
    if (!Object.keys(update).length) return this.findByUserId(userId);
    return LearningTwin.findOneAndUpdate({ userId: String(userId) }, update, {
      new: true,
      upsert: true,
    });
  },

  async update(userId, updateData) {
    return LearningTwin.findOneAndUpdate(
      { userId: String(userId) },
      updateData,
      {
        new: true,
        upsert: true,
      },
    );
  },
};
