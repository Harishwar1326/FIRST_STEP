import mongoose from 'mongoose'
import Lesson from '../models/lesson.model.js'
import {
  LessonFlashcard,
  LessonDrawing,
  LessonProgress,
  ProgrammingSubject,
  QuizResult,
  SmartLessonNote,
} from '../models/programmingLearning.model.js'
import { buildLessonSeed, programmingSubjects } from '../data/programmingSubjects.js'

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0))

const isDbReady = () => mongoose.connection.readyState === 1

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

const makeQuiz = (lesson) => {
  const concepts = lesson.concepts?.length ? lesson.concepts : [lesson.title, lesson.chapter, lesson.subject]
  const mcqs = concepts.slice(0, 5).map((concept, index) => ({
    id: `mcq-${index + 1}`,
    type: 'mcq',
    concept,
    question: `Which option best describes ${concept} in ${lesson.title}?`,
    options: [
      `${concept} is a core idea used in this lesson`,
      `${concept} is unrelated to programming`,
      `${concept} only matters after deployment`,
      `${concept} is another name for a database`,
    ],
    correctAnswer: `${concept} is a core idea used in this lesson`,
  }))

  return [
    ...mcqs,
    {
      id: 'short-1',
      type: 'short',
      concept: concepts[0],
      question: `Explain ${concepts[0]} in two simple sentences.`,
    },
    {
      id: 'short-2',
      type: 'short',
      concept: concepts[1] || concepts[0],
      question: `Write one mistake students commonly make with ${concepts[1] || concepts[0]}.`,
    },
    {
      id: 'code-1',
      type: 'coding',
      concept: concepts[2] || concepts[0],
      question: `Write a tiny ${lesson.subject.split(' ')[0]} example that uses ${concepts[2] || concepts[0]}.`,
    },
  ]
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

const buildDecision = ({ lesson, progress, quizResult }) => {
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
          { $set: { slug: subject.slug, title: subject.title, color: subject.color, description: subject.description } },
          { upsert: true },
        ),
      ),
    )

    await Promise.all(
      buildLessonSeed().map((lesson) =>
        Lesson.updateOne(
          { subject: lesson.subject, title: lesson.title },
          { $set: lesson },
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
    const lessons = await Lesson.find({ class: 'Programming MVP' }).sort({ subject: 1, order: 1 }).lean()
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
            id: lesson._id,
            progress: progressByLesson.get(String(lesson._id)) || null,
          })),
      })),
      progress: {
        completedLessons: progress.filter((item) => item.completed).length,
        averageScore: results.length ? Math.round(results.reduce((sum, item) => sum + item.score, 0) / results.length) : 0,
        studyStreak: Math.min(14, progress.length),
      },
    }
  },

  async getLesson(userId, lessonId) {
    if (!isDbReady()) {
      const subject = fallbackSubjects().find((item) => item.lessons.some((lesson) => lesson.id === lessonId))
      const lesson = subject?.lessons.find((item) => item.id === lessonId)
      return { lesson, quiz: makeQuiz(lesson), progress: null, notes: generateNote(lesson, 'standard'), recommendation: { message: 'Start this lesson and submit the quiz.' } }
    }

    await this.seed()
    const lesson = await Lesson.findById(lessonId).lean()
    if (!lesson) {
      const error = new Error('Lesson not found')
      error.statusCode = 404
      throw error
    }

    const [progress, quizResult, notes, drawings] = await Promise.all([
      LessonProgress.findOne({ userId, lessonId }).lean(),
      QuizResult.findOne({ userId, lessonId }).sort({ createdAt: -1 }).lean(),
      SmartLessonNote.findOne({ userId, lessonId }).lean(),
      LessonDrawing.find({ userId, lessonId }).sort({ updatedAt: -1 }).limit(4).lean(),
    ])

    return {
      lesson: { ...lesson, id: lesson._id },
      quiz: makeQuiz(lesson),
      progress,
      quizResult,
      notes: notes || generateNote(lesson, getLevel({ score: quizResult?.score, ...progress }), quizResult?.weakConcepts),
      drawings,
      recommendation: buildDecision({ lesson, progress, quizResult }),
    }
  },

  async trackLesson(userId, lessonId, payload) {
    const lesson = await Lesson.findById(lessonId).lean()
    if (!lesson) {
      const error = new Error('Lesson not found')
      error.statusCode = 404
      throw error
    }

    const existing = await LessonProgress.findOne({ userId, lessonId }).lean()
    const videoDuration = Math.max(existing?.videoDuration || 0, clamp(payload.videoDuration, 0, 100000))
    const watchedSegments = mergeSegments([...(existing?.watchedSegments || []), ...(payload.watchedSegments || [])], videoDuration)
    const uniqueWatchedSeconds = sumSegments(watchedSegments)
    const computedWatchPercentage = videoDuration ? Math.min(100, Math.round((uniqueWatchedSeconds / videoDuration) * 100)) : 0
    const update = {
      userId,
      lessonId,
      subjectSlug: lesson.subjectSlug,
      watchPercentage: Math.max(existing?.watchPercentage || 0, computedWatchPercentage),
      pauseCount: Math.max(existing?.pauseCount || 0, clamp(payload.pauseCount, 0, 999)),
      replayCount: Math.max(existing?.replayCount || 0, clamp(payload.replayCount, 0, 999)),
      playbackSpeed: clamp(payload.playbackSpeed || 1, 0.25, 2),
      timeSpent: Math.max(existing?.timeSpent || 0, uniqueWatchedSeconds),
      watchedSegments,
      videoDuration,
      completed: Boolean(existing?.completed || computedWatchPercentage >= 90),
      lastWatchedAt: new Date(),
    }

    const progress = await LessonProgress.findOneAndUpdate({ userId, lessonId }, update, { upsert: true, new: true })
    return { progress, recommendation: buildDecision({ lesson, progress }) }
  },

  async getDashboardAnalytics(userId) {
    if (!isDbReady()) {
      return {
        summary: { lessonsStarted: 0, lessonsCompleted: 0, overallProgress: 0, totalWatchTime: 0, averageWatchPercentage: 0, pauseCount: 0, replayCount: 0 },
        recentActivity: [],
        perLessonProgress: [],
      }
    }

    const progress = await LessonProgress.find({ userId }).sort({ lastWatchedAt: -1 }).populate('lessonId').lean()
    const lessonsStarted = progress.length
    const lessonsCompleted = progress.filter((item) => item.completed).length
    const totalWatchTime = progress.reduce((sum, item) => sum + (item.timeSpent || 0), 0)
    const averageWatchPercentage = lessonsStarted
      ? Math.round(progress.reduce((sum, item) => sum + (item.watchPercentage || 0), 0) / lessonsStarted)
      : 0
    const pauseCount = progress.reduce((sum, item) => sum + (item.pauseCount || 0), 0)
    const replayCount = progress.reduce((sum, item) => sum + (item.replayCount || 0), 0)

    const perLessonProgress = progress.map((item) => ({
      id: item._id,
      lessonId: item.lessonId?._id || item.lessonId,
      lessonTitle: item.lessonId?.title || 'Lesson',
      subject: item.lessonId?.subject || item.subjectSlug,
      watchPercentage: item.watchPercentage || 0,
      pauseCount: item.pauseCount || 0,
      replayCount: item.replayCount || 0,
      timeSpent: item.timeSpent || 0,
      videoDuration: item.videoDuration || 0,
      watchedSegments: item.watchedSegments || [],
      completed: Boolean(item.completed),
      lastWatchedAt: item.lastWatchedAt,
      updatedAt: item.updatedAt,
    }))

    return {
      summary: {
        lessonsStarted,
        lessonsCompleted,
        overallProgress: averageWatchPercentage,
        totalWatchTime,
        averageWatchPercentage,
        pauseCount,
        replayCount,
      },
      recentActivity: perLessonProgress.slice(0, 8),
      perLessonProgress,
    }
  },

  async submitQuiz(userId, lessonId, answers = []) {
    const lesson = await Lesson.findById(lessonId).lean()
    if (!lesson) {
      const error = new Error('Lesson not found')
      error.statusCode = 404
      throw error
    }

    const quiz = makeQuiz(lesson)
    const mcqs = quiz.filter((item) => item.type === 'mcq')
    const answerMap = new Map(answers.map((answer) => [answer.id, answer.answer]))
    const correctCount = mcqs.filter((question) => answerMap.get(question.id) === question.correctAnswer).length
    const shortAttemptCount = quiz.filter((question) => question.type !== 'mcq' && String(answerMap.get(question.id) || '').trim().length > 20).length
    const score = Math.round(((correctCount + shortAttemptCount * 0.5) / (mcqs.length + 1.5)) * 100)
    const weakConcepts = quiz
      .filter((question) => question.type === 'mcq' && answerMap.get(question.id) !== question.correctAnswer)
      .map((question) => question.concept)

    const result = await QuizResult.create({
      userId,
      lessonId,
      score,
      totalQuestions: quiz.length,
      correctCount,
      weakConcepts,
      answers,
      feedback: score < 50 ? 'Use beginner notes and retry.' : score > 90 ? 'Try the advanced challenge.' : 'Good progress. Review weak concepts.',
    })

    const progress = await LessonProgress.findOne({ userId, lessonId }).lean()
    const decision = buildDecision({ lesson, progress, quizResult: result })
    const generated = generateNote(lesson, decision.noteLevel, weakConcepts)
    const notes = await SmartLessonNote.findOneAndUpdate(
      { userId, lessonId },
      { $set: { userId, lessonId, ...generated } },
      { upsert: true, new: true },
    )

    await Promise.all(
      generated.flashcards.map((card) =>
        LessonFlashcard.create({
          userId,
          lessonId,
          front: card.front,
          back: card.back,
          concept: card.concept,
          difficulty: decision.noteLevel === 'beginner' ? 'easy' : decision.noteLevel === 'advanced' ? 'hard' : 'medium',
        }),
      ),
    )

    return { result, notes, recommendation: decision }
  },

  async saveNotes(userId, lessonId, editableContent) {
    const notes = await SmartLessonNote.findOneAndUpdate(
      { userId, lessonId },
      { $set: { editableContent, saved: true } },
      { new: true },
    )
    return { notes, saved: true }
  },

  async saveDrawing(userId, lessonId, payload) {
    const drawing = await LessonDrawing.create({
      userId,
      lessonId,
      title: payload.title || 'Lesson notebook',
      dataUrl: payload.dataUrl || '',
      notes: payload.notes || '',
    })
    return { drawing }
  },

  async getRecommendations(userId) {
    const { subjects } = await this.listSubjects(userId)
    const flatLessons = subjects.flatMap((subject) => subject.lessons.map((lesson) => ({ ...lesson, subjectTitle: subject.title })))
    const progress = await LessonProgress.find({ userId }).lean()
    const results = await QuizResult.find({ userId }).sort({ createdAt: -1 }).lean()
    const completed = new Set(progress.filter((item) => item.completed).map((item) => String(item.lessonId)))
    const weakResult = results.find((item) => item.score < 60 || item.weakConcepts?.length)
    const nextLesson = flatLessons.find((lesson) => !completed.has(String(lesson._id || lesson.id))) || flatLessons[0]

    return {
      todayMission: weakResult ? 'Repair one weak concept before starting a new lesson.' : 'Finish one lesson and one quiz.',
      recommendedLesson: nextLesson,
      revision: weakResult?.weakConcepts || [],
      flashcardsDue: Math.min(12, results.length * 3),
      challenge: nextLesson ? `Build a tiny example using ${nextLesson.concepts?.[0] || nextLesson.title}.` : 'Complete a lesson to unlock a challenge.',
    }
  },

}
