import { Lesson } from '../models/lesson.model.js';
import { Quiz } from '../models/quiz.model.js';
import { Task } from '../models/task.model.js';

const lessonsData = [
  // CLASS 10 MATHEMATICS
  {
    class: 'Class 10',
    subject: 'Mathematics',
    chapter: 'Algebra Foundations',
    title: 'Algebra Basics',
    content: 'Algebra is a branch of mathematics dealing with symbols and the rules for manipulating those symbols. In its simplest form, algebra involves solving equations where letters represent unknown numbers. These letters are called variables.',
    difficulty: 'Beginner',
    estimatedStudyTime: 10,
    prerequisites: [],
    order: 1,
    videoUrl: 'https://www.youtube.com/embed/grnP3mDuRIA',
  },
  {
    class: 'Class 10',
    subject: 'Mathematics',
    chapter: 'Linear Equations',
    title: 'Linear Equations in Two Variables',
    content: 'An equation of the form ax + by + c = 0, where a, b and c are real numbers, and a and b are not both zero, is called a linear equation in two variables. A pair of linear equations expresses relationships between two changing quantities.',
    difficulty: 'Intermediate',
    estimatedStudyTime: 15,
    prerequisites: ['Algebra Basics'],
    order: 2,
    videoUrl: 'https://www.youtube.com/embed/kET00m4pQ3E',
  },
  {
    class: 'Class 10',
    subject: 'Mathematics',
    chapter: 'Quadratic Equations',
    title: 'Quadratic Equations and Roots',
    content: 'A quadratic equation is a polynomial equation of degree 2, standard form ax^2 + bx + c = 0, where x represents a variable, and a, b, and c represent known numbers, with a not equal to 0. Finding roots means finding the values of x that satisfy the equation.',
    difficulty: 'Intermediate',
    estimatedStudyTime: 20,
    prerequisites: ['Linear Equations in Two Variables'],
    order: 3,
    videoUrl: 'https://www.youtube.com/embed/i7idZ66eC7Y',
  },
  {
    class: 'Class 10',
    subject: 'Mathematics',
    chapter: 'Graphs of Equations',
    title: 'Graphs of Quadratic Functions',
    content: 'The graph of a quadratic function y = ax^2 + bx + c is a parabola. If a > 0, the parabola opens upwards. If a < 0, the parabola opens downwards. The vertex is the highest or lowest point on the parabola.',
    difficulty: 'Advanced',
    estimatedStudyTime: 25,
    prerequisites: ['Quadratic Equations and Roots'],
    order: 4,
    videoUrl: 'https://www.youtube.com/embed/Hq2up_1LH5E',
  },

  // CLASS 10 SCIENCE
  {
    class: 'Class 10',
    subject: 'Science',
    chapter: 'Chemical Substances',
    title: 'Chemical Reactions and Equations',
    content: 'A chemical reaction is a process that leads to the chemical transformation of one set of chemical substances to another. Chemical equations use chemical symbols and formulas to represent the reactants and products in a chemical reaction.',
    difficulty: 'Beginner',
    estimatedStudyTime: 15,
    prerequisites: [],
    order: 1,
    videoUrl: 'https://www.youtube.com/embed/eMS5TzDsfmU',
  },
  {
    class: 'Class 10',
    subject: 'Science',
    chapter: 'Acids, Bases and Salts',
    title: 'Acids, Bases and pH Scale',
    content: 'Acids are chemical substances characterized by a sour taste, turning blue litmus red. Bases are bitter, turning red litmus blue. The pH scale (0 to 14) measures how acidic or basic a substance is, with 7 being neutral.',
    difficulty: 'Intermediate',
    estimatedStudyTime: 15,
    prerequisites: ['Chemical Reactions and Equations'],
    order: 2,
    videoUrl: 'https://www.youtube.com/embed/z1H35Jp6w3Y',
  },
  {
    class: 'Class 10',
    subject: 'Science',
    chapter: 'Life Processes',
    title: 'Nutrition and Respiration',
    content: 'Life processes are basic functions performed by living organisms to maintain life on earth. Nutrition is the intake of food and its utilization. Respiration is the process of releasing energy from food at the cellular level.',
    difficulty: 'Intermediate',
    estimatedStudyTime: 20,
    prerequisites: [],
    order: 3,
    videoUrl: 'https://www.youtube.com/embed/u772Zt3lOEs',
  },
];

const quizzesData = [
  {
    lessonTitle: 'Algebra Basics',
    questions: [
      {
        questionText: 'In the expression 3x + 5, what is "x"?',
        options: ['Coefficient', 'Constant', 'Variable', 'Exponent'],
        correctAnswer: 'Variable',
        explanation: 'In algebra, letters like x, y, z are variables that represent unknown quantities.',
        concept: 'Algebra Basics',
      },
      {
        questionText: 'Solve for x: x - 7 = 10',
        options: ['3', '17', '10', '7'],
        correctAnswer: '17',
        explanation: 'Add 7 to both sides: x = 10 + 7 = 17.',
        concept: 'Algebra Basics',
      },
    ],
  },
  {
    lessonTitle: 'Linear Equations in Two Variables',
    questions: [
      {
        questionText: 'Which of the following is a linear equation in two variables?',
        options: ['2x + 3 = 0', 'y = x^2 + 4', '4x - 5y = 12', 'xy = 5'],
        correctAnswer: '4x - 5y = 12',
        explanation: 'A linear equation in two variables is of the form ax + by + c = 0, where a and b are not zero.',
        concept: 'Linear Equations',
      },
      {
        questionText: 'If x = 2 and y = 1 satisfy 2x + ky = 7, find the value of k.',
        options: ['1', '3', '5', '7'],
        correctAnswer: '3',
        explanation: 'Substitute x=2, y=1: 2(2) + k(1) = 7 => 4 + k = 7 => k = 3.',
        concept: 'Linear Equations',
      },
    ],
  },
  {
    lessonTitle: 'Quadratic Equations and Roots',
    questions: [
      {
        questionText: 'What is the standard form of a quadratic equation?',
        options: ['ax + b = 0', 'ax^2 + bx + c = 0', 'ax^3 + bx^2 + cx + d = 0', 'y = mx + c'],
        correctAnswer: 'ax^2 + bx + c = 0',
        explanation: 'A quadratic equation is of degree 2, represented as ax^2 + bx + c = 0 where a is not 0.',
        concept: 'Quadratic Equations',
      },
    ],
  },
  {
    lessonTitle: 'Chemical Reactions and Equations',
    questions: [
      {
        questionText: 'What are the starting substances in a chemical reaction called?',
        options: ['Reactants', 'Products', 'Catalysts', 'Elements'],
        correctAnswer: 'Reactants',
        explanation: 'Reactants are the starting substances that undergo chemical transformation in a reaction.',
        concept: 'Chemical Reactions',
      },
    ],
  },
];

const tasksData = [
  {
    lessonTitle: 'Algebra Basics',
    title: 'Teaching Challenge: Explain to a Friend',
    description: 'Using the Feynman technique, explain the concept of a variable to an imaginary student who has never studied algebra. Write down your explanation in under 3 sentences.',
    type: 'feynman',
  },
  {
    lessonTitle: 'Linear Equations in Two Variables',
    title: 'Plotting Intersection Sprint',
    description: 'Find where the two lines 2x + y = 5 and x - y = 1 meet. Check if your coordinates satisfy both equations.',
    type: 'active-recall',
  },
  {
    lessonTitle: 'Chemical Reactions and Equations',
    title: 'Rusting Iron Analysis',
    description: 'Explain the chemical reaction of rusting iron in terms of reactants, products, and color changes.',
    type: 'challenge',
  },
];

export const seedLessons = async () => {
  try {
    // 1. Clear existing curriculum
    await Lesson.deleteMany({});
    await Quiz.deleteMany({});
    await Task.deleteMany({});

    console.log('Cleared existing lessons, quizzes, and tasks.');

    // 2. Insert Lessons
    const insertedLessons = await Lesson.insertMany(lessonsData);
    console.log(`Successfully seeded ${insertedLessons.length} lessons.`);

    // Map title to ObjectId for relations
    const lessonMap = {};
    insertedLessons.forEach((l) => {
      lessonMap[l.title] = l._id;
    });

    // 3. Insert Quizzes
    const quizzesToInsert = [];
    quizzesData.forEach((qData) => {
      const lessonId = lessonMap[qData.lessonTitle];
      if (lessonId) {
        quizzesToInsert.push({
          lessonId,
          questions: qData.questions,
        });
      }
    });
    const seededQuizzes = await Quiz.insertMany(quizzesToInsert);
    console.log(`Successfully seeded ${seededQuizzes.length} quizzes.`);

    // 4. Insert Tasks
    const tasksToInsert = [];
    tasksData.forEach((tData) => {
      const lessonId = lessonMap[tData.lessonTitle];
      if (lessonId) {
        tasksToInsert.push({
          lessonId,
          title: tData.title,
          description: tData.description,
          type: tData.type,
        });
      }
    });
    const seededTasks = await Task.insertMany(tasksToInsert);
    console.log(`Successfully seeded ${seededTasks.length} tasks.`);

    return {
      success: true,
      lessonsCount: insertedLessons.length,
      quizzesCount: seededQuizzes.length,
      tasksCount: seededTasks.length,
    };
  } catch (error) {
    console.error('Error seeding lessons database:', error);
    throw error;
  }
};
