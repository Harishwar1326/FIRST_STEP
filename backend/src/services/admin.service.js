import mongoose from 'mongoose'
import Lesson from '../models/lesson.model.js'
import { Quiz } from '../models/quiz.model.js'
import { Task } from '../models/task.model.js'
import {
  LessonDrawing,
  LessonFlashcard,
  LessonProgress,
  QuizResult,
  SmartLessonNote,
} from '../models/programmingLearning.model.js'
import { userSqlRepository } from '../repositories/user.repository.sql.js'

const isDbReady = () => mongoose.connection.readyState === 1

const summarizeProgress = (progress = []) => {
  const lessonsStarted = progress.length
  const lessonsCompleted = progress.filter((item) => item.completed).length
  const totalWatchTime = progress.reduce((sum, item) => sum + (item.timeSpent || 0), 0)
  const averageWatchPercentage = lessonsStarted
    ? Math.round(progress.reduce((sum, item) => sum + (item.watchPercentage || 0), 0) / lessonsStarted)
    : 0

  return {
    lessonsStarted,
    lessonsCompleted,
    progress: averageWatchPercentage,
    totalWatchTime,
    pauseCount: progress.reduce((sum, item) => sum + (item.pauseCount || 0), 0),
    replayCount: progress.reduce((sum, item) => sum + (item.replayCount || 0), 0),
    lastActivity: progress[0]?.lastWatchedAt || null,
  }
}

const slugify = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const formatLesson = (lesson) => {
  const doc = lesson?.toObject ? lesson.toObject() : lesson
  if (!doc) return null

  return {
    id: String(doc._id),
    _id: doc._id,
    class: doc.class,
    subject: doc.subject,
    subjectSlug: doc.subjectSlug || '',
    chapter: doc.chapter,
    title: doc.title,
    content: doc.content,
    difficulty: doc.difficulty,
    estimatedStudyTime: doc.estimatedStudyTime,
    prerequisites: doc.prerequisites || [],
    order: doc.order ?? 0,
    videoUrl: doc.videoUrl || '',
    slug: doc.slug || '',
    concepts: doc.concepts || [],
    status: 'Active',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

const normalizeLessonPayload = (payload = {}) => {
  const title = String(payload.title || '').trim()
  const content = String(payload.content || '').trim()
  const subject = String(payload.subject || '').trim()
  const chapter = String(payload.chapter || '').trim()
  const className = String(payload.class || 'Programming MVP').trim()

  if (!title || !content || !subject || !chapter || !className) {
    const error = new Error('Title, subject, chapter, class, and content are required')
    error.statusCode = 400
    throw error
  }

  const order = Number(payload.order)
  const estimatedStudyTime = Number(payload.estimatedStudyTime)

  return {
    class: className,
    subject,
    subjectSlug: String(payload.subjectSlug || '').trim() || slugify(subject),
    chapter,
    title,
    content,
    videoUrl: String(payload.videoUrl || '').trim(),
    order: Number.isFinite(order) ? order : 0,
    estimatedStudyTime: Number.isFinite(estimatedStudyTime) ? estimatedStudyTime : 15,
    difficulty: payload.difficulty || 'Intermediate',
    slug: String(payload.slug || '').trim() || slugify(title),
    concepts: Array.isArray(payload.concepts)
      ? payload.concepts.map((item) => String(item).trim()).filter(Boolean)
      : undefined,
    prerequisites: Array.isArray(payload.prerequisites)
      ? payload.prerequisites.map((item) => String(item).trim()).filter(Boolean)
      : undefined,
  }
}

const formatStudent = (student, progress = []) => ({
  id: student.id,
  name: student.name,
  email: student.email,
  registrationDate: student.created_at,
  lastActiveAt: student.last_active_at,
  ...summarizeProgress(progress),
})

export const adminService = {
  async getDashboardSummary() {
    const totalStudents = await userSqlRepository.countStudents()

    if (!isDbReady()) {
      return {
        totalStudents,
        activeStudents: 0,
        totalLessons: 0,
        lessonsCompleted: 0,
        averageStudentProgress: 0,
      }
    }

    const [lessonCount, progress] = await Promise.all([
      Lesson.countDocuments(),
      LessonProgress.find().lean(),
    ])
    const studentIds = new Set(progress.map((item) => item.userId))
    const averageStudentProgress = studentIds.size
      ? Math.round(progress.reduce((sum, item) => sum + (item.watchPercentage || 0), 0) / progress.length)
      : 0

    return {
      totalStudents,
      activeStudents: studentIds.size,
      totalLessons: lessonCount,
      lessonsCompleted: progress.filter((item) => item.completed).length,
      averageStudentProgress,
    }
  },

  async listStudents(query = {}) {
    const { students, total } = await userSqlRepository.listStudents(query)
    if (!isDbReady() || !students.length) {
      return { students: students.map((student) => formatStudent(student)), total }
    }

    const ids = students.map((student) => String(student.id))
    const progress = await LessonProgress.find({ userId: { $in: ids } }).sort({ lastWatchedAt: -1 }).lean()
    const byUser = new Map()
    progress.forEach((item) => {
      const list = byUser.get(item.userId) || []
      list.push(item)
      byUser.set(item.userId, list)
    })

    return {
      students: students.map((student) => formatStudent(student, byUser.get(String(student.id)) || [])),
      total,
    }
  },

  async listLessons(filters = {}) {
    if (!isDbReady()) {
      return { lessons: [] }
    }

    const query = {}
    if (filters.subject) {
      query.subject = new RegExp(`^${String(filters.subject).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
    }
    if (filters.class) {
      query.class = String(filters.class).trim()
    }

    const lessons = await Lesson.find(query).sort({ subject: 1, order: 1, title: 1 }).lean()
    return { lessons: lessons.map(formatLesson) }
  },

  async createLesson(payload) {
    if (!isDbReady()) {
      const error = new Error('Lesson database is unavailable')
      error.statusCode = 503
      throw error
    }

    const data = normalizeLessonPayload(payload)
    const lesson = await Lesson.create(data)
    return { lesson: formatLesson(lesson) }
  },

  async updateLesson(lessonId, payload) {
    if (!isDbReady()) {
      const error = new Error('Lesson database is unavailable')
      error.statusCode = 503
      throw error
    }

    const data = normalizeLessonPayload(payload)
    const lesson = await Lesson.findByIdAndUpdate(lessonId, data, {
      new: true,
      runValidators: true,
    })

    if (!lesson) {
      const error = new Error('Lesson not found')
      error.statusCode = 404
      throw error
    }

    return { lesson: formatLesson(lesson) }
  },

  async deleteLesson(lessonId) {
    if (!isDbReady()) {
      const error = new Error('Lesson database is unavailable')
      error.statusCode = 503
      throw error
    }

    const lesson = await Lesson.findById(lessonId)
    if (!lesson) {
      const error = new Error('Lesson not found')
      error.statusCode = 404
      throw error
    }

    await Promise.all([
      Quiz.deleteMany({ lessonId }),
      Task.deleteMany({ lessonId }),
      LessonProgress.deleteMany({ lessonId }),
      QuizResult.deleteMany({ lessonId }),
      SmartLessonNote.deleteMany({ lessonId }),
      LessonDrawing.deleteMany({ lessonId }),
      LessonFlashcard.deleteMany({ lessonId }),
    ])

    await Lesson.findByIdAndDelete(lessonId)
    return { success: true, message: 'Lesson deleted successfully' }
  },

  async getStudentAnalytics(studentId) {
    const student = await userSqlRepository.findById(studentId)
    if (!student || student.role !== 'student') {
      const error = new Error('Student not found')
      error.statusCode = 404
      throw error
    }

    const progress = isDbReady()
      ? await LessonProgress.find({ userId: String(studentId) }).sort({ lastWatchedAt: -1 }).populate('lessonId').lean()
      : []

    return {
      student: formatStudent(student, progress),
      summary: summarizeProgress(progress),
      recentActivity: progress.slice(0, 8).map(formatProgressItem),
      perLessonProgress: progress.map(formatProgressItem),
    }
  },

}

const formatProgressItem = (item) => ({
  id: item._id,
  lessonId: item.lessonId?._id || item.lessonId,
  lessonTitle: item.lessonId?.title || 'Lesson',
  subject: item.lessonId?.subject || item.subjectSlug,
  watchPercentage: item.watchPercentage || 0,
  pauseCount: item.pauseCount || 0,
  replayCount: item.replayCount || 0,
  timeSpent: item.timeSpent || 0,
  completed: Boolean(item.completed),
  lastWatchedAt: item.lastWatchedAt,
})
