import mongoose from 'mongoose'
import { randomUUID } from 'node:crypto'
import Lesson from '../models/lesson.model.js'
import {
  LessonFlashcard,
  LessonDrawing,
  LessonProgress,
  ProgrammingQuizSession,
  ProgrammingSubject,
  QuizResult,
  SmartLessonNote,
  VideoActivityEvent,
} from '../models/programmingLearning.model.js'
import { buildLessonSeed, programmingSubjects } from '../data/programmingSubjects.js'
import { modelPersonalizationService } from './modelPersonalization.service.js'
import { callOllamaJson } from '../utils/ollamaClient.js'

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0))
const normalizeLessonDifficulty = (value) => {
  const difficulty = String(value || '').toLowerCase()
  if (['beginner', 'easy'].includes(difficulty)) return 'beginner'
  if (['advanced', 'hard', 'expert'].includes(difficulty)) return 'advanced'
  if (['medium', 'standard', 'intermediate'].includes(difficulty)) return 'standard'
  return null
}

const isDbReady = () => mongoose.connection.readyState === 1
const getVideoId = (url = '') => String(url).match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([^?&/]+)/)?.[1] || ''

const dayKey = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

const collectActivityDayKeys = (progress = [], quizResults = []) => {
  const days = new Set()
  progress.forEach((item) => {
    const key = dayKey(item.lastWatchedAt || item.updatedAt)
    if (key) days.add(key)
  })
  quizResults.forEach((item) => {
    const key = dayKey(item.createdAt)
    if (key) days.add(key)
  })
  return days
}

const calculateLearningStreak = (progress = [], quizResults = []) => {
  const activityDays = collectActivityDayKeys(progress, quizResults)
  if (!activityDays.size) return 0

  const oneDayMs = 24 * 60 * 60 * 1000
  const todayKey = dayKey(new Date())
  let cursor = activityDays.has(todayKey) ? todayKey : todayKey - oneDayMs
  if (!activityDays.has(cursor)) return 0

  let streak = 0
  while (activityDays.has(cursor)) {
    streak += 1
    cursor -= oneDayMs
  }
  return streak
}

const summarizeQuizPerformance = (results = [], lessonTitleById = new Map()) => {
  if (!results.length) {
    return {
      averageScore: 0,
      bestScore: 0,
      quizzesCompleted: 0,
      recent: [],
    }
  }

  const scores = results.map((item) => Number(item.score) || 0)
  const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
  const bestScore = Math.max(...scores)

  const recent = results
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6)
    .map((item, index) => ({
      id: String(item._id),
      label: `Quiz ${results.length - index}`,
      lessonTitle: lessonTitleById.get(String(item.lessonId)) || 'Lesson quiz',
      score: Number(item.score) || 0,
      correctCount: Number(item.correctCount) || 0,
      totalQuestions: Number(item.totalQuestions) || 0,
      createdAt: item.createdAt,
    }))

  return {
    averageScore,
    bestScore,
    quizzesCompleted: results.length,
    recent,
  }
}

const buildSubjectProgress = (subjects = [], lessons = [], progressByLesson = new Map()) =>
  subjects.map((subject) => {
    const subjectLessons = lessons.filter((lesson) => lesson.subjectSlug === subject.slug)
    const totalLessons = subjectLessons.length
    if (!totalLessons) {
      return {
        slug: subject.slug,
        title: subject.title,
        progressPercent: 0,
        lessonsCompleted: 0,
        lessonsTotal: 0,
      }
    }

    let progressSum = 0
    let lessonsCompleted = 0
    subjectLessons.forEach((lesson) => {
      const lessonProgress = progressByLesson.get(String(lesson._id))
      if (lessonProgress?.completed) {
        lessonsCompleted += 1
        progressSum += 100
      } else if (lessonProgress) {
        progressSum += lessonProgress.watchPercentage || 0
      }
    })

    return {
      slug: subject.slug,
      title: subject.title,
      progressPercent: Math.round(progressSum / totalLessons),
      lessonsCompleted,
      lessonsTotal: totalLessons,
    }
  })

const buildRecentLearningActivity = (progress = [], quizResults = [], lessonTitleById = new Map()) => {
  const events = []

  progress.forEach((item) => {
    const lessonId = String(item.lessonId?._id || item.lessonId)
    const lessonTitle = item.lessonId?.title || lessonTitleById.get(lessonId) || 'Lesson'
    const subject = item.lessonId?.subject || item.subjectSlug || 'Programming'
    const timestamp = item.lastWatchedAt || item.updatedAt

    if (item.completed) {
      events.push({
        id: `completed-${item._id}`,
        type: 'completed',
        label: `Completed ${lessonTitle}`,
        subject,
        timestamp,
      })
    } else if ((item.watchPercentage || 0) > 0) {
      events.push({
        id: `watched-${item._id}`,
        type: item.watchPercentage >= 90 ? 'watched' : 'started',
        label: item.watchPercentage >= 90 ? `Watched ${lessonTitle}` : `Started ${lessonTitle}`,
        subject,
        timestamp,
      })
    }
  })

  quizResults.forEach((item) => {
    const lessonTitle = lessonTitleById.get(String(item.lessonId)) || 'Lesson'
    const total = Number(item.totalQuestions) || 0
    const correct = Number(item.correctCount) || 0
    const scoreLabel = total ? `${correct}/${total}` : `${Number(item.score) || 0}%`
    events.push({
      id: `quiz-${item._id}`,
      type: 'quiz',
      label: `Quiz completed — ${scoreLabel}`,
      subject: lessonTitle,
      timestamp: item.createdAt,
    })
  })

  return events
    .filter((event) => event.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10)
}

const buildContinueLearning = (progress = [], recommendedLesson = null) => {
  const inProgress = progress
    .filter((item) => !item.completed && (item.watchPercentage || 0) > 0)
    .sort((a, b) => new Date(b.lastWatchedAt) - new Date(a.lastWatchedAt))[0]

  if (inProgress) {
    const lesson = inProgress.lessonId
    const lessonId = String(lesson?._id || inProgress.lessonId)
    return {
      lessonId,
      title: lesson?.title || 'Lesson',
      subject: lesson?.subject || inProgress.subjectSlug || 'Programming',
      watchPercentage: inProgress.watchPercentage || 0,
      completed: false,
    }
  }

  if (recommendedLesson) {
    const lessonId = String(recommendedLesson._id || recommendedLesson.id)
    return {
      lessonId,
      title: recommendedLesson.title || 'Lesson',
      subject: recommendedLesson.subject || recommendedLesson.subjectTitle || 'Programming',
      watchPercentage: recommendedLesson.progress?.watchPercentage || 0,
      completed: false,
    }
  }

  return null
}

const normalizeSegments = (segments = [], duration = 0) =>
  segments
    .map((segment) => ({
      start: clamp(segment.start, 0, duration || 100000),
      end: clamp(segment.end, 0, duration || 100000),
    }))
    .filter((segment) => segment.end - segment.start >= 0.75)
    .sort((a, b) => a.start - b.start)

const mergeSegments = (segments = [], duration = 0) => {
  const sorted = normalizeSegments(segments, duration)
  const merged = []

  sorted.forEach((segment) => {
    const previous = merged[merged.length - 1]
    if (!previous || segment.start > previous.end + 0.5) {
      merged.push({ ...segment })
      return
    }
    previous.end = Math.max(previous.end, segment.end)
  })

  return merged
}

const sumSegments = (segments = []) =>
  Math.round(segments.reduce((sum, segment) => sum + Math.max(0, segment.end - segment.start), 0))

const buildQuizAdaptation = (quizHistory = [], modelGuidance = null) => {
  const attempts = quizHistory.length
  const recentHistory = quizHistory.slice(0, 5)
  const averageScore = recentHistory.length
    ? Math.round(recentHistory.reduce((sum, result) => sum + (Number(result.score) || 0), 0) / recentHistory.length)
    : null
  const scoreLevel = averageScore === null ? 'foundation' : averageScore < 50 ? 'beginner' : averageScore >= 85 ? 'advanced' : 'standard'
  const strongObservedSignal = averageScore !== null && (averageScore < 50 || averageScore >= 85)
  const level = strongObservedSignal ? scoreLevel : modelGuidance?.difficultyBand || scoreLevel
  const focusCounts = new Map()
  recentHistory.forEach((result) => {
    ;(result.weakConcepts || []).forEach((concept) => focusCounts.set(concept, (focusCounts.get(concept) || 0) + 1))
  })
  const focusConcepts = [...focusCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([concept]) => concept)

  return {
    level,
    averageScore,
    attempts,
    focusConcepts,
    questionCount: level === 'beginner' || level === 'foundation' ? 3 : level === 'advanced' ? 6 : 5,
    message: attempts
      ? strongObservedSignal && level === 'beginner'
        ? 'Your recent quiz results call for a shorter foundation check and extra practice on missed concepts.'
        : strongObservedSignal && level === 'advanced'
          ? 'Your recent quiz results are strong, so this set adds deeper application and challenge questions.'
          : modelGuidance?.difficultyBand
            ? `This set uses your ${modelGuidance.difficultyBand} model-guided level together with your recent quiz results.`
            : 'This set mixes concept checks with practical application based on your recent scores.'
      : modelGuidance?.difficultyBand
        ? `Your saved ability profile sets the starting level to ${modelGuidance.difficultyBand}; quiz results will refine it.`
        : 'This first set starts with a foundation check. Future quizzes will adapt to your results.',
    abilityGuidance: modelGuidance ? {
      difficulty: modelGuidance.difficultyBand,
      masteryEstimate: modelGuidance.masteryEstimate,
      retentionEstimate: modelGuidance.retentionEstimate,
      source: modelGuidance.source,
      trainingData: modelGuidance.trainingData,
      experimental: modelGuidance.experimental,
    } : null,
  }
}

const makeQuiz = (lesson, adaptation = buildQuizAdaptation()) => {
  const concepts = lesson.concepts?.length ? lesson.concepts : [lesson.title, lesson.chapter, lesson.subject]
  const lessonContext = String(lesson.content || lesson.summary || lesson.title).trim().replace(/\s+/g, ' ')
  const orderedConcepts = [
    ...adaptation.focusConcepts.filter((concept) => concepts.includes(concept)),
    ...concepts.filter((concept) => !adaptation.focusConcepts.includes(concept)),
  ]
  const level = adaptation.level === 'foundation' ? 'beginner' : adaptation.level
  const questionCount = Math.min(adaptation.questionCount, level === 'advanced' ? orderedConcepts.length * 2 : orderedConcepts.length)
  const focusConcept = adaptation.focusConcepts[0] || concepts[0]
  const nextConcept = adaptation.focusConcepts[1] || concepts[1] || focusConcept
  const openQuestionVariant = adaptation.attempts % 3
  const mcqs = Array.from({ length: questionCount }, (_, index) => {
    const concept = orderedConcepts[index % orderedConcepts.length]
    const challenge = level === 'advanced' && index >= orderedConcepts.length
    const beginnerTemplates = [
      {
        question: `In ${lesson.title}, what is the best way to begin understanding ${concept}?`,
        answer: `Learn what ${concept} is for, then follow one small example.`,
        distractors: ['Memorize its name without checking its purpose.', 'Skip it because another tool can always replace it.', `Assume ${concept} works the same in every program.`],
      },
      {
        question: `Which statement best describes ${concept} in this lesson?`,
        answer: `${concept} is a core idea used in ${lesson.title}.`,
        distractors: ['It is unrelated to the lesson topic.', 'It only matters after a program is deployed.', 'It removes the need to understand program behavior.'],
      },
      {
        question: `You are reviewing ${lessonContext.slice(0, 100)}. What should you do first with ${concept}?`,
        answer: 'Connect the term to its purpose and a concrete example.',
        distractors: ['Memorize a definition without an example.', 'Skip the steps and guess the final output.', 'Study an unrelated advanced feature first.'],
      },
    ]
    const standardTemplates = [
      {
        question: `You use ${concept} in ${lesson.subject}. Which check best confirms your understanding?`,
        answer: `Apply ${concept} in a small example and trace each step.`,
        distractors: ['Memorize the term without trying it.', 'Guess the result without tracing the program.', 'Change several parts at once and skip testing.'],
      },
      {
        question: `For the lesson idea “${lessonContext.slice(0, 95)}”, how should ${concept} be practiced?`,
        answer: 'Use a small input, predict the result, then compare it with the program output.',
        distractors: ['Only reread the description and avoid running examples.', 'Test one case and assume every other case behaves identically.', 'Rewrite the whole program before checking the concept.'],
      },
      {
        question: `A classmate is unsure whether they used ${concept} correctly. What is the most useful next step?`,
        answer: 'Walk through a small example and explain why each step produces its result.',
        distractors: ['Rename variables and assume the issue is fixed.', 'Skip the test because the code looks familiar.', 'Add more features before checking the current behavior.'],
      },
    ]
    const advancedTemplates = [
      {
        question: `A program using ${concept} fails on an unusual input. What is the strongest debugging approach?`,
        answer: `Reproduce the case, trace ${concept}, and test a targeted fix.`,
        distractors: ['Ignore the case because typical inputs work.', 'Change several unrelated parts and retest once.', 'Assume the first output is correct without checking it.'],
      },
      {
        question: `Which test gives the strongest evidence that ${concept} works reliably?`,
        answer: 'Check a normal case, a boundary case, and an unexpected input.',
        distractors: ['Run the same easy case several times only.', 'Check the variable names without executing the program.', 'Test only after adding unrelated features.'],
      },
      {
        question: `When reviewing ${concept} in ${lesson.title}, which change is safest to evaluate first?`,
        answer: 'Make one focused change, then compare expected and actual behavior.',
        distractors: ['Rewrite multiple sections before running the code.', 'Remove edge-case checks to make the code shorter.', 'Trust the output without comparing it with an expected result.'],
      },
    ]
    const templates = challenge ? advancedTemplates : level === 'beginner' ? beginnerTemplates : level === 'advanced' ? advancedTemplates : standardTemplates
    const template = templates[(adaptation.attempts + index) % templates.length]
    const correctAnswer = template.answer
    const distractors = template.distractors
    const options = [...distractors]
    options.splice((adaptation.attempts + index) % 4, 0, correctAnswer)
    return {
      id: `mcq-${index + 1}`,
      type: 'mcq',
      concept,
      difficulty: challenge ? 'challenge' : level,
      question: template.question,
      options,
      correctAnswer,
    }
  })

  return [
    ...mcqs,
    {
      id: 'short-1',
      type: 'short',
      concept: focusConcept,
      question: level === 'beginner'
        ? `Explain ${focusConcept} in your own words and give one small example.`
        : level === 'advanced'
          ? `Explain how ${focusConcept} behaves on an edge case and how you would verify the result.`
          : openQuestionVariant === 0
            ? `Explain how ${focusConcept} works in ${lesson.title}, step by step.`
            : openQuestionVariant === 1
              ? `Give one realistic example of ${focusConcept} and explain why the result is correct.`
              : `What would you check first if your use of ${focusConcept} produced an unexpected result?`,
    },
    {
      id: 'short-2',
      type: 'short',
      concept: nextConcept,
      question: adaptation.focusConcepts.length
        ? `You recently missed a question about ${nextConcept}. Explain the idea again and identify what you would change in your first answer.`
        : `Describe one common mistake with ${nextConcept} and a test that would help catch it.`,
    },
    {
      id: 'code-1',
      type: 'coding',
      concept: concepts[2] || focusConcept,
      question: level === 'advanced'
        ? `Write a small ${lesson.subject.split(' ')[0]} example using ${concepts[2] || focusConcept}, then include one boundary test and explain its expected result.`
        : level === 'beginner'
          ? `Write a tiny ${lesson.subject.split(' ')[0]} example that uses ${focusConcept}. Add a comment explaining each step.`
          : `Write a small ${lesson.subject.split(' ')[0]} example using ${concepts[2] || focusConcept} and show its expected output.`,
    },
  ]
}

const cleanQuizText = (value, maxLength = 500) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''

const generateOllamaQuiz = async (lesson, adaptation, previousQuestions = []) => {
  const concepts = lesson.concepts?.length ? lesson.concepts : [lesson.title, lesson.chapter, lesson.subject]
  const mcqCount = Math.max(3, Math.min(6, adaptation.questionCount || 5))
  const ability = adaptation.abilityGuidance
  const prompt = [
    'Create a fresh programming lesson quiz for a student. Use ONLY the supplied lesson details and concepts.',
    `Difficulty: ${adaptation.level}. Generate exactly ${mcqCount} multiple-choice questions, 2 short-answer prompts, and 1 coding prompt.`,
    `Use this level: beginner questions check core meaning and guided examples; standard questions require application and tracing; advanced questions require debugging, edge cases, and justification.`,
    'Prioritize the supplied weak concepts. Vary question styles and wording. Do not repeat a question with only the concept name changed.',
    'Avoid reusing any previous question text supplied in the learner context.',
    'Every MCQ must have exactly 4 distinct options and one unambiguous correctIndex from 0 to 3.',
    'Return JSON only with shape: {"mcqs":[{"concept":"...","question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}],"shortQuestions":[{"concept":"...","question":"..."},{"concept":"...","question":"..."}],"codingQuestion":{"concept":"...","question":"..."}}',
  ].join('\n')
  const generated = await callOllamaJson({
    systemPrompt: prompt,
    userPayload: {
      lesson: {
        title: cleanQuizText(lesson.title, 180),
        subject: cleanQuizText(lesson.subject, 100),
        chapter: cleanQuizText(lesson.chapter, 120),
        content: cleanQuizText(lesson.content, 5000),
        concepts: concepts.map((concept) => cleanQuizText(concept, 100)).filter(Boolean),
      },
      learner: {
        difficulty: adaptation.level,
        attemptNumber: adaptation.attempts + 1,
        recentAverage: adaptation.averageScore,
        weakConcepts: adaptation.focusConcepts,
        masteryEstimate: ability?.masteryEstimate,
        retentionEstimate: ability?.retentionEstimate,
      },
      previousQuestions,
    },
    maxTokens: 1400,
    temperature: 0.65,
    timeoutMs: 60000,
  })

  if (!Array.isArray(generated?.mcqs) || generated.mcqs.length < mcqCount) {
    throw new Error('Ollama returned too few quiz questions.')
  }

  const normalizeConcept = (value, index) => {
    const requested = cleanQuizText(value, 100).toLowerCase()
    return concepts.find((concept) => String(concept).toLowerCase() === requested) || concepts[index % concepts.length]
  }
  const mcqs = generated.mcqs.slice(0, mcqCount).map((item, index) => {
    const options = Array.isArray(item?.options) ? item.options.map((option) => cleanQuizText(option, 240)) : []
    const correctIndex = Number(item?.correctIndex)
    if (!cleanQuizText(item?.question) || options.length !== 4 || new Set(options.map((option) => option.toLowerCase())).size !== 4 ||
      options.some((option) => !option) || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) return null
    return {
      id: `mcq-${index + 1}`,
      type: 'mcq',
      concept: normalizeConcept(item.concept, index),
      difficulty: adaptation.level,
      question: cleanQuizText(item.question),
      options,
      correctAnswer: options[correctIndex],
      explanation: cleanQuizText(item.explanation, 400),
    }
  })
  if (mcqs.some((item) => !item)) throw new Error('Ollama returned an invalid multiple-choice question.')

  const fallback = makeQuiz(lesson, adaptation)
  const fallbackOpen = fallback.filter((item) => item.type !== 'mcq')
  const shortQuestions = Array.isArray(generated.shortQuestions) ? generated.shortQuestions.slice(0, 2) : []
  const normalizedShort = shortQuestions.length === 2 && shortQuestions.every((item) => cleanQuizText(item?.question))
    ? shortQuestions.map((item, index) => ({
        id: `short-${index + 1}`,
        type: 'short',
        concept: normalizeConcept(item.concept, index),
        question: cleanQuizText(item.question),
      }))
    : fallbackOpen.filter((item) => item.type === 'short')
  const coding = cleanQuizText(generated.codingQuestion?.question)
    ? {
        id: 'code-1',
        type: 'coding',
        concept: normalizeConcept(generated.codingQuestion.concept, 2),
        question: cleanQuizText(generated.codingQuestion.question),
      }
    : fallbackOpen.find((item) => item.type === 'coding')

  return [...mcqs, ...normalizedShort, coding]
}

const publicQuiz = (questions = []) => questions.map(({ correctAnswer, ...question }) => question)

const getOrCreateQuizSession = async (userId, lesson, adaptation) => {
  const active = await ProgrammingQuizSession.findOne({
    userId: String(userId), lessonId: lesson._id, status: 'active', expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 }).lean()
  if (active) return active

  let source = 'ollama'
  let questions
  try {
    const previousSessions = await ProgrammingQuizSession.find({
      userId: String(userId), lessonId: lesson._id, status: 'submitted',
    }).sort({ createdAt: -1 }).limit(2).select('questions').lean()
    const previousQuestions = previousSessions.flatMap((session) => (session.questions || [])
      .filter((question) => question.type === 'mcq')
      .map((question) => cleanQuizText(question.question, 240)))
    questions = await generateOllamaQuiz(lesson, adaptation, previousQuestions)
  } catch (error) {
    source = 'adaptive-fallback'
    console.warn('[Programming Quiz] Ollama generation unavailable; using adaptive fallback:', error.code || error.message)
    questions = makeQuiz(lesson, adaptation)
  }

  const session = await ProgrammingQuizSession.create({
    sessionId: randomUUID(),
    userId: String(userId),
    lessonId: lesson._id,
    questions,
    source,
    adaptation: { ...adaptation, source },
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
  })
  return session.toObject()
}

export const gradeMultipleChoiceQuiz = (quiz = [], answers = []) => {
  const mcqs = quiz.filter((item) => item.type === 'mcq')
  const answerMap = new Map(answers.map((answer) => [answer.id, answer.answer]))
  const correctCount = mcqs.filter((question) => answerMap.get(question.id) === question.correctAnswer).length
  return {
    correctCount,
    totalQuestions: mcqs.length,
    score: mcqs.length ? Math.round((correctCount / mcqs.length) * 100) : 0,
    weakConcepts: mcqs
      .filter((question) => answerMap.get(question.id) !== question.correctAnswer)
      .map((question) => question.concept),
  }
}

const getLevel = ({ score = 0, watchPercentage = 0, replayCount = 0 }) => {
  if (score < 50 || watchPercentage < 60 || replayCount > 3) return 'beginner'
  if (score > 90 && watchPercentage > 85) return 'advanced'
  return 'standard'
}

const generateNote = (lesson, level, weakConcepts = []) => {
  const concepts = lesson.concepts?.length ? lesson.concepts : [lesson.title]
  const tone =
    level === 'beginner'
      ? 'simple English with step-by-step examples'
      : level === 'advanced'
        ? 'concise explanations, best practices, and interview thinking'
        : 'balanced explanation with practice guidance'

  return {
    level,
    title: `${lesson.title} Smart Notes`,
    summary: `${lesson.title} teaches ${lesson.content}. These notes use ${tone}.`,
    keyConcepts: concepts,
    definitions: concepts.map((concept) => `${concept}: a key idea used to solve ${lesson.title.toLowerCase()} problems.`),
    revisionNotes: (weakConcepts.length ? weakConcepts : concepts).map((concept) => `Revise ${concept} with one traced example and one self-written program.`),
    commonMistakes: concepts.slice(0, 4).map((concept) => `Do not memorize ${concept}; trace how it changes program behavior.`),
    codingTips: [
      'Run a small example before solving the full problem.',
      'Name variables clearly and test edge cases.',
      level === 'advanced' ? 'Compare time complexity and memory use.' : 'Write comments for the confusing line only.',
    ],
    mindMap: concepts.map((concept) => ({ parent: lesson.title, child: concept })),
    mcqs: makeQuiz(lesson).filter((item) => item.type === 'mcq').slice(0, 5),
    flashcards: concepts.map((concept) => ({
      front: `What is ${concept}?`,
      back: `${concept} is important in ${lesson.title} because it changes how the program is written or understood.`,
      concept,
      bookmarked: false,
    })),
    editableContent: `# ${lesson.title}\n\n${lesson.content}\n\nFocus concepts: ${concepts.join(', ')}.\n\nNext action: solve one small practice example.`,
  }
}

const buildDecision = ({ lesson, progress, quizResult, modelGuidance = null }) => {
  const watchPercentage = progress?.watchPercentage || 0
  const replayCount = progress?.replayCount || 0
  const score = quizResult?.score ?? null
  const weakConcepts = quizResult?.weakConcepts || []

  if (score !== null && score < 50) {
    return {
      status: 'revision',
      message: 'Revisit the previous lesson and use simplified notes before moving ahead.',
      noteLevel: 'beginner',
      weakConcepts,
    }
  }

  if (watchPercentage < 60 || replayCount > 3) {
    return {
      status: 'practice',
      message: 'This lesson needs another pass with beginner notes and one extra practice task.',
      noteLevel: 'beginner',
      weakConcepts: weakConcepts.length ? weakConcepts : lesson.concepts?.slice(0, 2) || [],
    }
  }

  if (score !== null && score > 90) {
    return {
      status: 'advanced',
      message: 'Great progress. Unlock the next lesson and try an advanced coding challenge.',
      noteLevel: 'advanced',
      weakConcepts: [],
    }
  }

  if (modelGuidance?.difficultyBand) {
    const noteLevel = modelGuidance.difficultyBand === 'beginner'
      ? 'beginner'
      : modelGuidance.difficultyBand === 'advanced' ? 'advanced' : 'standard'
    return {
      status: 'personalized',
      message: `Your current ability profile suggests ${noteLevel} notes and practice for this lesson.`,
      noteLevel,
      weakConcepts: weakConcepts.length ? weakConcepts : modelGuidance.weakConcepts || [],
      modelGuidance: {
        source: modelGuidance.source,
        trainingData: modelGuidance.trainingData,
        experimental: modelGuidance.experimental,
      },
    }
  }

  return {
    status: 'next',
    message: 'Continue to the next lesson with standard notes and quick flashcard review.',
    noteLevel: 'standard',
    weakConcepts,
  }
}

const fallbackSubjects = () =>
  programmingSubjects.map((subject) => ({
    ...subject,
    lessons: subject.lessons.map(([slug, title, summary, videoUrl, concepts], index) => ({
      id: slug,
      slug,
      title,
      content: summary,
      videoUrl,
      concepts,
      chapter: index < 3 ? 'Foundations' : index < 6 ? 'Core Skills' : 'Applied Programming',
      difficulty: index < 3 ? 'Beginner' : index < 6 ? 'Intermediate' : 'Advanced',
      estimatedStudyTime: 18 + index * 2,
      order: index + 1,
    })),
  }))

export const programmingLearningService = {
  async seed() {
    if (!isDbReady()) return { seeded: false, reason: 'MongoDB is not connected' }

    await Promise.all(
      programmingSubjects.map((subject) =>
        ProgrammingSubject.updateOne(
          { slug: subject.slug },
          { $setOnInsert: { slug: subject.slug, title: subject.title, color: subject.color, description: subject.description } },
          { upsert: true },
        ),
      ),
    )

    await Promise.all(
      buildLessonSeed().map((lesson) =>
        Lesson.updateOne(
          { subject: lesson.subject, title: lesson.title },
          { $setOnInsert: lesson },
          { upsert: true },
        ),
      ),
    )

    return { seeded: true, subjects: programmingSubjects.length, lessons: buildLessonSeed().length }
  },

  async listSubjects(userId) {
    if (!isDbReady()) return { subjects: fallbackSubjects(), progress: { completedLessons: 0, averageScore: 0, studyStreak: 0 } }
    await this.seed()

    const subjects = await ProgrammingSubject.find().lean()
    const lessons = await Lesson.find({ class: 'Programming MVP', isPublished: { $ne: false } }).sort({ subject: 1, order: 1 }).lean()
    const progress = await LessonProgress.find({ userId }).lean()
    const results = await QuizResult.find({ userId }).lean()
    const progressByLesson = new Map(progress.map((item) => [String(item.lessonId), item]))

    return {
      subjects: subjects.map((subject) => ({
        ...subject,
        lessons: lessons
          .filter((lesson) => lesson.subjectSlug === subject.slug)
          .map((lesson) => ({
            ...lesson,
            videoId: lesson.videoId || getVideoId(lesson.videoUrl),
            id: lesson._id,
            progress: progressByLesson.get(String(lesson._id)) || null,
          })),
      })),
      progress: {
        completedLessons: progress.filter((item) => item.completed).length,
        averageScore: results.length ? Math.round(results.reduce((sum, item) => sum + item.score, 0) / results.length) : 0,
        studyStreak: calculateLearningStreak(progress, results),
      },
    }
  },

  async getLesson(userId, lessonId) {
    if (!isDbReady()) {
      const subject = fallbackSubjects().find((item) => item.lessons.some((lesson) => lesson.id === lessonId))
      const lesson = subject?.lessons.find((item) => item.id === lessonId)
      if (!lesson) {
        const error = new Error('Lesson not found')
        error.statusCode = 404
        throw error
      }
      const quizAdaptation = buildQuizAdaptation()
      return { lesson, quiz: makeQuiz(lesson, quizAdaptation), quizAdaptation, progress: null, notes: generateNote(lesson, 'standard'), recommendation: { message: 'Start this lesson and submit the quiz.' } }
    }

    if (!mongoose.isValidObjectId(lessonId)) {
      const error = new Error('Invalid lesson ID')
      error.statusCode = 400
      throw error
    }

    await this.seed()
    const lesson = await Lesson.findOne({ _id: lessonId, isPublished: { $ne: false } }).lean()
    if (!lesson) {
      const error = new Error('Lesson not found')
      error.statusCode = 404
      throw error
    }

    const [progress, quizHistory, notes, drawings, modelGuidance] = await Promise.all([
      LessonProgress.findOne({ userId, lessonId }).lean(),
      QuizResult.find({ userId, lessonId }).sort({ createdAt: -1 }).limit(20).lean(),
      SmartLessonNote.findOne({ userId, lessonId }).lean(),
      LessonDrawing.find({ userId, lessonId }).sort({ updatedAt: -1 }).limit(4).lean(),
      modelPersonalizationService.getStudentGuidance(userId),
    ])
    const quizResult = quizHistory[0] || null
    const adaptation = buildQuizAdaptation(quizHistory, modelGuidance)
    const quizSession = await getOrCreateQuizSession(userId, lesson, adaptation)
    const quizAdaptation = { ...(quizSession.adaptation || adaptation), source: quizSession.source }
    const recommendation = buildDecision({ lesson, progress, quizResult, modelGuidance })

    return {
      lesson: { ...lesson, videoId: lesson.videoId || getVideoId(lesson.videoUrl), id: lesson._id },
      quiz: publicQuiz(quizSession.questions),
      quizSessionId: quizSession.sessionId,
      quizSource: quizSession.source,
      quizAdaptation,
      modelGuidance,
      progress,
      quizResult,
      notes: notes || generateNote(lesson, recommendation.noteLevel, quizResult?.weakConcepts || modelGuidance?.weakConcepts),
      drawings,
      recommendation,
    }
  },

  async trackLesson(userId, lessonId) {
    if (!mongoose.isValidObjectId(lessonId)) {
      const error = new Error('Invalid lesson ID')
      error.statusCode = 400
      throw error
    }
    const lesson = await Lesson.findOne({ _id: lessonId, isPublished: { $ne: false } }).lean()
    if (!lesson) {
      const error = new Error('Lesson not found')
      error.statusCode = 404
      throw error
    }

    const progress = await LessonProgress.findOne({ userId, lessonId }).lean()
    return { progress, recommendation: buildDecision({ lesson, progress }) }
  },

  async recordVideoEvent(userId, lessonId, payload = {}) {
    if (!mongoose.isValidObjectId(lessonId)) {
      const error = new Error('Invalid lesson ID')
      error.statusCode = 400
      throw error
    }
    const lesson = await Lesson.findOne({ _id: lessonId, isPublished: { $ne: false } }).lean()
    if (!lesson || !lesson.videoUrl) {
      const error = new Error('Video lesson not found')
      error.statusCode = 404
      throw error
    }

    const videoId = lesson.videoId || getVideoId(lesson.videoUrl)
    if (!videoId) {
      const error = new Error('Lesson does not contain a supported YouTube video')
      error.statusCode = 400
      throw error
    }

    const allowedTypes = new Set(['play', 'pause', 'resume', 'replay', 'seek', 'watch', 'speed', 'complete', 'lesson_enter', 'lesson_exit', 'buffer', 'error'])
    const eventId = String(payload.eventId || '')
    const sessionId = String(payload.sessionId || '')
    if (!allowedTypes.has(payload.type) || !eventId || eventId.length > 100 || !sessionId || sessionId.length > 100) {
      const error = new Error('Invalid video activity event')
      error.statusCode = 400
      throw error
    }

    const position = clamp(payload.position, 0, 100000)
    const duration = clamp(payload.duration, 0, 100000)
    let watchSeconds = payload.type === 'watch' ? clamp(payload.watchSeconds, 0, 30) : 0
    if (watchSeconds) {
      const previousEvent = await VideoActivityEvent.findOne({
        userId: String(userId), videoId, sessionId,
      }).sort({ createdAt: -1 }).select('createdAt').lean()
      const elapsedSeconds = previousEvent ? Math.max(0, (Date.now() - new Date(previousEvent.createdAt).getTime()) / 1000) : 0
      watchSeconds = Math.min(watchSeconds, Math.min(30, Math.ceil(elapsedSeconds) + 2))
    }
    const playbackSpeed = clamp(payload.playbackSpeed || 1, 0.25, 2)
    const segmentEnd = position
    const segmentStart = Math.max(0, position - watchSeconds * playbackSpeed)
    try {
      await VideoActivityEvent.create({
        userId: String(userId),
        lessonId: lesson._id,
        subjectSlug: lesson.subjectSlug || 'unknown',
        videoId,
        sessionId,
        eventId,
        type: payload.type,
        position,
        duration,
        watchSeconds,
        segmentStart: payload.type === 'watch' && watchSeconds > 0 && segmentEnd > segmentStart ? segmentStart : undefined,
        segmentEnd: payload.type === 'watch' && watchSeconds > 0 && segmentEnd > segmentStart ? segmentEnd : undefined,
        playbackSpeed: payload.playbackSpeed ? playbackSpeed : undefined,
        metadata: payload.type === 'error' && Number.isFinite(Number(payload.metadata?.code))
          ? { code: clamp(payload.metadata.code, 0, 999) }
          : {},
      })
    } catch (error) {
      if (error?.code === 11000) return { accepted: false, duplicate: true }
      throw error
    }

    const existingProgress = await LessonProgress.findOne({ userId: String(userId), lessonId: lesson._id }).lean()
    const videoDuration = Math.max(existingProgress?.videoDuration || 0, duration)
    const watchedSegments = payload.type === 'watch' && segmentEnd > segmentStart
      ? mergeSegments([...(existingProgress?.watchedSegments || []), { start: segmentStart, end: segmentEnd }], videoDuration)
      : existingProgress?.watchedSegments || []
    const uniqueWatchedSeconds = sumSegments(watchedSegments)
    const computedWatchPercentage = videoDuration ? Math.min(100, Math.round((uniqueWatchedSeconds / videoDuration) * 100)) : 0
    const increments = {}
    if (payload.type === 'pause') increments.pauseCount = 1
    if (payload.type === 'replay') increments.replayCount = 1
    if (watchSeconds) increments.observedWatchTime = watchSeconds
    await LessonProgress.findOneAndUpdate(
      { userId: String(userId), lessonId: lesson._id },
      {
        $set: {
          userId: String(userId), lessonId: lesson._id, subjectSlug: lesson.subjectSlug || 'unknown',
          lastWatchedAt: new Date(), currentPosition: position, videoDuration,
          watchedSegments, timeSpent: uniqueWatchedSeconds, watchPercentage: computedWatchPercentage,
          playbackSpeed: payload.playbackSpeed ? playbackSpeed : clamp(existingProgress?.playbackSpeed || 1, 0.25, 2),
          completed: Boolean(existingProgress?.completed || computedWatchPercentage >= 90 || payload.type === 'complete'),
        },
        ...(Object.keys(increments).length ? { $inc: increments } : {}),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
    return { accepted: true, duplicate: false }
  },

  async getDashboardAnalytics(userId) {
    if (!isDbReady()) {
      return {
        overview: {
          overallProgress: 0,
          lessonsCompleted: 0,
          averageQuizScore: 0,
          currentStreak: 0,
        },
        summary: { lessonsStarted: 0, lessonsCompleted: 0, overallProgress: 0, totalWatchTime: 0, averageWatchPercentage: 0, pauseCount: 0, replayCount: 0 },
        subjects: [],
        recentActivity: [],
        recentLearningActivity: [],
        quizPerformance: {
          averageScore: 0,
          bestScore: 0,
          quizzesCompleted: 0,
          recent: [],
        },
        continueLearning: null,
        recommendation: null,
        weakConcepts: [],
        perLessonProgress: [],
      }
    }

    await this.seed()

    const [progress, quizResults, subjects, lessons] = await Promise.all([
      LessonProgress.find({ userId }).sort({ lastWatchedAt: -1 }).populate('lessonId').lean(),
      QuizResult.find({ userId }).sort({ createdAt: -1 }).lean(),
      ProgrammingSubject.find().lean(),
      Lesson.find({ class: 'Programming MVP', isPublished: { $ne: false } }).sort({ subject: 1, order: 1 }).lean(),
    ])

    const lessonTitleById = new Map(lessons.map((lesson) => [String(lesson._id), lesson.title]))
    const progressByLesson = new Map(progress.map((item) => [String(item.lessonId?._id || item.lessonId), item]))

    const lessonsStarted = progress.length
    const lessonsCompleted = progress.filter((item) => item.completed).length
    const totalWatchTime = progress.reduce((sum, item) => sum + (item.observedWatchTime || 0), 0)
    const uniqueCoverageSeconds = progress.reduce((sum, item) => sum + (item.timeSpent || 0), 0)
    const averageWatchPercentage = lessonsStarted
      ? Math.round(progress.reduce((sum, item) => sum + (item.watchPercentage || 0), 0) / lessonsStarted)
      : 0
    const pauseCount = progress.reduce((sum, item) => sum + (item.pauseCount || 0), 0)
    const replayCount = progress.reduce((sum, item) => sum + (item.replayCount || 0), 0)
    const currentStreak = calculateLearningStreak(progress, quizResults)
    const quizPerformance = summarizeQuizPerformance(quizResults, lessonTitleById)
    const subjectProgress = buildSubjectProgress(subjects, lessons, progressByLesson)
    const recentLearningActivity = buildRecentLearningActivity(progress, quizResults, lessonTitleById)

    const recommendations = await this.getRecommendations(userId)
    const continueLearning = buildContinueLearning(progress, recommendations.recommendedLesson)
    const weakConcepts = [...new Set(quizResults.flatMap((item) => item.weakConcepts || []).filter(Boolean))].slice(0, 8)

    const recommendation = recommendations.recommendedLesson
      ? {
          lessonId: String(recommendations.recommendedLesson._id || recommendations.recommendedLesson.id),
          title: recommendations.recommendedLesson.title,
          subject: recommendations.recommendedLesson.subject || recommendations.recommendedLesson.subjectTitle,
          reason: recommendations.revision?.length
            ? 'Based on your recent quiz performance and weak concepts.'
            : recommendations.todayMission || 'Continue your learning path with the next lesson.',
        }
      : null

    const perLessonProgress = progress.map((item) => ({
      id: item._id,
      lessonId: item.lessonId?._id || item.lessonId,
      lessonTitle: item.lessonId?.title || 'Lesson',
      subject: item.lessonId?.subject || item.subjectSlug,
      watchPercentage: item.watchPercentage || 0,
      pauseCount: item.pauseCount || 0,
      replayCount: item.replayCount || 0,
      timeSpent: item.timeSpent || 0,
      observedWatchTime: item.observedWatchTime || 0,
      videoDuration: item.videoDuration || 0,
      currentPosition: item.currentPosition || 0,
      watchedSegments: item.watchedSegments || [],
      completed: Boolean(item.completed),
      lastWatchedAt: item.lastWatchedAt,
      updatedAt: item.updatedAt,
    }))

    return {
      overview: {
        overallProgress: averageWatchPercentage,
        lessonsCompleted,
        averageQuizScore: quizPerformance.averageScore,
        currentStreak,
      },
      summary: {
        lessonsStarted,
        lessonsCompleted,
        overallProgress: averageWatchPercentage,
        totalWatchTime,
        uniqueCoverageSeconds,
        averageWatchPercentage,
        pauseCount,
        replayCount,
      },
      subjects: subjectProgress,
      recentActivity: perLessonProgress.slice(0, 8),
      recentLearningActivity,
      quizPerformance,
      continueLearning,
      recommendation,
      weakConcepts,
      perLessonProgress,
    }
  },

  async submitQuiz(userId, lessonId, answers = [], quizSessionId = null) {
    if (!mongoose.isValidObjectId(lessonId)) {
      const error = new Error('Invalid lesson ID')
      error.statusCode = 400
      throw error
    }
    const lesson = await Lesson.findOne({ _id: lessonId, isPublished: { $ne: false } }).lean()
    if (!lesson) {
      const error = new Error('Lesson not found')
      error.statusCode = 404
      throw error
    }

    const [quizHistory, modelGuidance] = await Promise.all([
      QuizResult.find({ userId, lessonId }).sort({ createdAt: -1 }).limit(20).lean(),
      modelPersonalizationService.getStudentGuidance(userId),
    ])
    let activeSession = null
    if (quizSessionId) {
      activeSession = await ProgrammingQuizSession.findOne({
        sessionId: String(quizSessionId), userId: String(userId), lessonId: lesson._id,
        status: 'active', expiresAt: { $gt: new Date() },
      }).lean()
      if (!activeSession) {
        const error = new Error('This quiz session expired. Refresh the lesson to get a new personalized quiz.')
        error.statusCode = 409
        throw error
      }
    } else {
      activeSession = await ProgrammingQuizSession.findOne({
        userId: String(userId), lessonId: lesson._id, status: 'active', expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 }).lean()
    }
    const quiz = activeSession?.questions || makeQuiz(lesson, buildQuizAdaptation(quizHistory, modelGuidance))
    const { correctCount, totalQuestions, score, weakConcepts } = gradeMultipleChoiceQuiz(quiz, answers)

    const result = await QuizResult.create({
      userId,
      lessonId,
      score,
      totalQuestions,
      correctCount,
      weakConcepts,
      answers,
      feedback: score < 50 ? 'Use beginner notes and retry.' : score > 90 ? 'Try the advanced challenge.' : 'Good progress. Review weak concepts.',
    })
    if (activeSession) {
      await ProgrammingQuizSession.updateOne(
        { _id: activeSession._id, status: 'active' },
        { $set: { status: 'submitted' } },
      )
    }

    const progress = await LessonProgress.findOne({ userId, lessonId }).lean()
    const updatedModelGuidance = await modelPersonalizationService.getStudentGuidance(userId, { refresh: true })
    const decision = buildDecision({ lesson, progress, quizResult: result, modelGuidance: updatedModelGuidance || modelGuidance })
    const generated = generateNote(lesson, decision.noteLevel, weakConcepts)
    const notes = await SmartLessonNote.findOneAndUpdate(
      { userId, lessonId },
      { $set: { userId, lessonId, ...generated } },
      { upsert: true, new: true },
    )

    await Promise.all(
      generated.flashcards.map((card) => LessonFlashcard.updateOne(
        { userId, lessonId, front: card.front },
        { $set: {
          back: card.back,
          concept: card.concept,
          difficulty: decision.noteLevel === 'beginner' ? 'easy' : decision.noteLevel === 'advanced' ? 'hard' : 'medium',
        } },
        { upsert: true },
      )),
    )

    return {
      result,
      notes,
      recommendation: decision,
      modelGuidance: updatedModelGuidance || modelGuidance,
      quizSource: activeSession?.source || 'adaptive-fallback',
    }
  },

  async saveNotes(userId, lessonId, editableContent) {
    if (!mongoose.isValidObjectId(lessonId)) {
      const error = new Error('Invalid lesson ID')
      error.statusCode = 400
      throw error
    }
    const lesson = await Lesson.findOne({ _id: lessonId, isPublished: { $ne: false } }).lean()
    if (!lesson) {
      const error = new Error('Lesson not found')
      error.statusCode = 404
      throw error
    }
    const notes = await SmartLessonNote.findOneAndUpdate(
      { userId, lessonId },
      { $set: { editableContent, saved: true } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    )
    return { notes, saved: true }
  },

  async getRecommendations(userId) {
    const { subjects } = await this.listSubjects(userId)
    const flatLessons = subjects.flatMap((subject) => subject.lessons.map((lesson) => ({ ...lesson, subjectTitle: subject.title })))
    const progress = await LessonProgress.find({ userId }).lean()
    const results = await QuizResult.find({ userId }).sort({ createdAt: -1 }).lean()
    const completed = new Set(progress.filter((item) => item.completed).map((item) => String(item.lessonId)))
    const weakResult = results.find((item) => item.score < 60 || item.weakConcepts?.length)
    const modelGuidance = await modelPersonalizationService.getStudentGuidance(userId)
    const availableLessons = flatLessons.filter((lesson) => !completed.has(String(lesson._id || lesson.id)))
    const nextLesson = (modelGuidance?.difficultyBand
      ? availableLessons.find((lesson) => normalizeLessonDifficulty(lesson.difficulty) === modelGuidance.difficultyBand)
      : null) || availableLessons[0] || flatLessons[0]

    return {
      todayMission: weakResult ? 'Repair one weak concept before starting a new lesson.' : 'Finish one lesson and one quiz.',
      recommendedLesson: nextLesson,
      modelGuidance,
      revision: weakResult?.weakConcepts || [],
      flashcardsDue: Math.min(12, results.length * 3),
      challenge: nextLesson ? `Build a tiny example using ${nextLesson.concepts?.[0] || nextLesson.title}.` : 'Complete a lesson to unlock a challenge.',
    }
  },

}
