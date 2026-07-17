import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema(
  {
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
    },
    questions: [
      {
        questionText: {
          type: String,
          required: true,
        },
        options: [
          {
            type: String,
            required: true,
          },
        ],
        correctAnswer: {
          type: String,
          required: true,
        },
        explanation: {
          type: String,
          default: '',
        },
        concept: {
          type: String,
          required: true, // For knowledge tracing (e.g. "Newton's First Law")
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;
