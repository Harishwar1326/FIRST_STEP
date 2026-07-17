import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema(
  {
    class: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    subjectSlug: {
      type: String,
      trim: true,
      index: true,
    },
    chapter: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate',
    },
    estimatedStudyTime: {
      type: Number, // in minutes
      default: 15,
    },
    prerequisites: [
      {
        type: String, // Lesson titles
      },
    ],
    order: {
      type: Number,
      default: 0,
    },
    videoUrl: {
      type: String,
      default: '',
    },
    slug: {
      type: String,
      trim: true,
      index: true,
    },
    concepts: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

lessonSchema.index({ class: 1, subject: 1, chapter: 1 });

export const Lesson = mongoose.model('Lesson', lessonSchema);
export default Lesson;
