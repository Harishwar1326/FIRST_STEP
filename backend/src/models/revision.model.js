import mongoose from 'mongoose';

const revisionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastReviewed: {
      type: Date,
    },
    interval: {
      type: Number, // interval in days
      default: 1,
    },
    repetitions: {
      type: Number,
      default: 0,
    },
    easeFactor: {
      type: Number,
      default: 2.5,
    },
  },
  {
    timestamps: true,
  }
);

revisionSchema.index({ userId: 1, dueDate: 1 });
revisionSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

export const Revision = mongoose.model('Revision', revisionSchema);
export default Revision;
