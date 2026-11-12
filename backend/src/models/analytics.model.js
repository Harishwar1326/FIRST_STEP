import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    activityType: {
      type: String,
      enum: [
        'study_lesson', 'submit_quiz', 'submit_task', 'upload_notes', 'drawing_canvas', 'ask_question', 'revision',
        'smart_notes_analysis', 'smart_notes_notes-to-learning', 'smart_notes_blind-spot-detection',
        'smart_notes_explain-drawing', 'smart_notes_personalized-revision',
      ],
      required: true,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
    },
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    score: {
      type: Number, // e.g., quiz score percentage
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

analyticsSchema.index({ userId: 1, createdAt: -1 });

export const Analytics = mongoose.model('Analytics', analyticsSchema);
export default Analytics;
