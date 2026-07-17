import mongoose from 'mongoose';

const recommendationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    videos: [
      {
        title: String,
        url: String,
        duration: String,
        concept: String,
      },
    ],
    notes: [
      {
        title: String,
        content: String,
        level: String, // Beginner, Intermediate, Advanced
      },
    ],
    flashcards: [
      {
        front: String,
        back: String,
        concept: String,
      },
    ],
    practiceQuestions: [
      {
        questionText: String,
        options: [String],
        correctAnswer: String,
        explanation: String,
        concept: String,
      },
    ],
    challenges: [
      {
        title: String,
        description: String,
        difficulty: String,
      },
    ],
    revision: [
      {
        lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
        title: String,
        dueDate: Date,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Recommendation = mongoose.model('Recommendation', recommendationSchema);
export default Recommendation;
