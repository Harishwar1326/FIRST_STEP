import mongoose from 'mongoose'
import Lesson from '../models/lesson.model.js'
import { LessonProgress } from '../models/programmingLearning.model.js'
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
