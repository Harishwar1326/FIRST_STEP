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
  VideoActivityEvent,
} from '../models/programmingLearning.model.js'
import { userSqlRepository } from '../repositories/user.repository.sql.js'
import { twinService } from './twin.service.js'

const isDbReady = () => mongoose.connection.readyState === 1

const summarizeProgress = (progress = []) => {
  const lessonsStarted = progress.length
  const lessonsCompleted = progress.filter((item) => item.completed).length
  const totalWatchTime = progress.reduce((sum, item) => sum + (item.observedWatchTime || 0), 0)
  const uniqueCoverageSeconds = progress.reduce((sum, item) => sum + (item.timeSpent || 0), 0)
  const averageWatchPercentage = lessonsStarted
    ? Math.round(progress.reduce((sum, item) => sum + (item.watchPercentage || 0), 0) / lessonsStarted)
    : 0

  return {
    lessonsStarted,
    lessonsCompleted,
    progress: averageWatchPercentage,
    totalWatchTime,
    uniqueCoverageSeconds,
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
    videoId: doc.videoId || String(doc.videoUrl || '').match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([^?&/]+)/)?.[1] || '',
    slug: doc.slug || '',
    concepts: doc.concepts || [],
    isPublished: doc.isPublished !== false,
    status: doc.isPublished === false ? 'Unpublished' : 'Published',
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
  const videoUrl = String(payload.videoUrl || '').trim()
  if (videoUrl && !/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)[^?&/]+/.test(videoUrl)) {
    const error = new Error('Video URL must be a supported YouTube link')
    error.statusCode = 400
    throw error
  }

  return {
    class: className,
    subject,
    subjectSlug: String(payload.subjectSlug || '').trim() || slugify(subject),
    chapter,
    title,
    content,
    videoUrl,
    videoId: videoUrl.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([^?&/]+)/)?.[1] || '',
    isPublished: payload.isPublished !== false,
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
  async getVideoAnalytics({ from, to, page = 1, limit = 20 } = {}) {
    if (!isDbReady()) return { subjects: [], videos: [], page: 1, limit: 20, totalVideos: 0 }
    const match = {}
    if (from || to) {
      match.createdAt = {}
      if (from) {
        const start = new Date(`${from}T00:00:00.000Z`)
        if (Number.isNaN(start.getTime())) throw Object.assign(new Error('Invalid start date'), { statusCode: 400 })
        match.createdAt.$gte = start
      }
      if (to) {
        const end = new Date(`${to}T23:59:59.999Z`)
        if (Number.isNaN(end.getTime())) throw Object.assign(new Error('Invalid end date'), { statusCode: 400 })
        match.createdAt.$lte = end
      }
    }
    const safePage = Math.max(1, Math.floor(Number(page) || 1))
    const safeLimit = Math.min(100, Math.max(1, Math.floor(Number(limit) || 20)))
    const videoRows = await VideoActivityEvent.aggregate([
      { $match: match },
      { $group: {
        _id: { videoId: '$videoId', lessonId: '$lessonId', subjectSlug: '$subjectSlug' },
        plays: { $sum: { $cond: [{ $eq: ['$type', 'play'] }, 1, 0] } },
        pauses: { $sum: { $cond: [{ $eq: ['$type', 'pause'] }, 1, 0] } },
        resumes: { $sum: { $cond: [{ $eq: ['$type', 'resume'] }, 1, 0] } },
        replays: { $sum: { $cond: [{ $eq: ['$type', 'replay'] }, 1, 0] } },
        watchSeconds: { $sum: { $cond: [{ $eq: ['$type', 'watch'] }, '$watchSeconds', 0] } },
        students: { $addToSet: '$userId' },
        lastActivity: { $max: '$createdAt' },
      } },
    ])
    const videoKey = (lessonId, videoId) => `${String(lessonId)}:${videoId}`
    const eventByVideo = new Map(videoRows.map((row) => [videoKey(row._id.lessonId, row._id.videoId), row]))
    const lessons = await Lesson.find({ videoUrl: { $ne: '' } }).select('title subject subjectSlug videoUrl videoId').lean()
    const lessonById = new Map(lessons.map((lesson) => [String(lesson._id), lesson]))
    const totalVideos = lessons.length
    const lessonIds = lessons.map((lesson) => lesson._id)
    const progress = await LessonProgress.find({ lessonId: { $in: lessonIds } }).select('lessonId watchPercentage completed').lean()
    const progressByLesson = new Map()
    progress.forEach((item) => {
      const list = progressByLesson.get(String(item.lessonId)) || []
      list.push(item)
      progressByLesson.set(String(item.lessonId), list)
    })
    const seenVideos = new Set()
    const allVideos = lessons.map((lesson) => {
      const lessonId = String(lesson._id)
      const videoId = lesson.videoId || String(lesson.videoUrl).match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([^?&/]+)/)?.[1] || ''
      const key = videoKey(lessonId, videoId)
      seenVideos.add(key)
      const row = eventByVideo.get(key) || { _id: { videoId, subjectSlug: lesson.subjectSlug }, plays: 0, pauses: 0, resumes: 0, replays: 0, watchSeconds: 0, students: [], lastActivity: null }
      const records = progressByLesson.get(lessonId) || []
      return {
        videoId: row._id.videoId,
        lessonId,
        title: lesson.title || 'Lesson',
        subject: lesson.subject || row._id.subjectSlug,
        plays: row.plays, pauses: row.pauses, resumes: row.resumes, replays: row.replays,
        uniqueStudents: row.students.length,
        watchSeconds: row.watchSeconds,
        averageCompletion: records.length ? Math.round(records.reduce((sum, item) => sum + (item.watchPercentage || 0), 0) / records.length) : 0,
        completionCount: records.filter((item) => item.completed).length,
        lastActivity: row.lastActivity,
      }
    })
    videoRows.forEach((row) => {
      const lessonId = String(row._id.lessonId)
      const key = videoKey(lessonId, row._id.videoId)
      if (seenVideos.has(key)) return
      seenVideos.add(key)
      const lesson = lessonById.get(lessonId)
      allVideos.push({
        videoId: row._id.videoId, lessonId,
        title: lesson?.title || 'Archived lesson video',
        subject: lesson?.subject || row._id.subjectSlug,
        plays: row.plays, pauses: row.pauses, resumes: row.resumes, replays: row.replays,
        uniqueStudents: row.students.length, watchSeconds: row.watchSeconds,
        averageCompletion: 0, completionCount: 0, lastActivity: row.lastActivity,
      })
    })
    allVideos.sort((a, b) => b.plays - a.plays || new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0))
    const videos = allVideos.slice((safePage - 1) * safeLimit, safePage * safeLimit)
    const leastViewedVideo = allVideos.length ? allVideos[allVideos.length - 1] : null
    const mostViewedVideo = allVideos.length ? allVideos[0] : null

    const trendMatch = Object.keys(match).length
      ? match
      : { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
    const [subjects, subjectLessonCounts, subjectProgress, dailyActivity, recentEvents] = await Promise.all([VideoActivityEvent.aggregate([
      { $match: match },
      { $group: {
        _id: '$subjectSlug',
        plays: { $sum: { $cond: [{ $eq: ['$type', 'play'] }, 1, 0] } },
        pauses: { $sum: { $cond: [{ $eq: ['$type', 'pause'] }, 1, 0] } },
        replays: { $sum: { $cond: [{ $eq: ['$type', 'replay'] }, 1, 0] } },
        watchSeconds: { $sum: { $cond: [{ $eq: ['$type', 'watch'] }, '$watchSeconds', 0] } },
        students: { $addToSet: '$userId' },
        lessons: { $addToSet: '$lessonId' },
      } },
      { $sort: { plays: -1 } },
    ]), Lesson.aggregate([
      { $group: { _id: '$subjectSlug', totalLessons: { $sum: 1 }, totalVideos: { $sum: { $cond: [{ $ne: ['$videoUrl', ''] }, 1, 0] } } } },
    ]), LessonProgress.aggregate([
      { $group: { _id: '$subjectSlug', averageCompletion: { $avg: '$watchPercentage' }, completed: { $sum: { $cond: ['$completed', 1, 0] } }, tracked: { $sum: 1 } } },
    ]), VideoActivityEvent.aggregate([
      { $match: trendMatch },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
        plays: { $sum: { $cond: [{ $eq: ['$type', 'play'] }, 1, 0] } },
        pauses: { $sum: { $cond: [{ $eq: ['$type', 'pause'] }, 1, 0] } },
        watchSeconds: { $sum: { $cond: [{ $eq: ['$type', 'watch'] }, '$watchSeconds', 0] } },
        students: { $addToSet: '$userId' },
      } },
      { $sort: { _id: 1 } },
    ]), VideoActivityEvent.find(match).sort({ createdAt: -1 }).limit(20).populate('lessonId', 'title subject').lean()])
    const lessonCountsBySlug = new Map(subjectLessonCounts.map((row) => [row._id || 'unknown', row]))
    const progressBySlug = new Map(subjectProgress.map((row) => [row._id || 'unknown', row]))
    return {
      subjects: subjects.map((row) => {
        const lessons = lessonCountsBySlug.get(row._id) || {}
        const completion = progressBySlug.get(row._id) || {}
        return {
          subject: row._id,
          participatingStudents: row.students.length,
          lessonsWithActivity: row.lessons.length,
          totalLessons: lessons.totalLessons || 0,
          totalVideos: lessons.totalVideos || 0,
          lessonCompletionRate: completion.tracked ? Math.round((completion.completed / completion.tracked) * 100) : 0,
          averageCompletion: Math.round(completion.averageCompletion || 0),
          plays: row.plays, pauses: row.pauses, replays: row.replays, watchSeconds: row.watchSeconds,
        }
      }),
      videos, page: safePage, limit: safeLimit, totalVideos, mostViewedVideo, leastViewedVideo,
      dailyActivity: dailyActivity.map((row) => ({ date: row._id, plays: row.plays, pauses: row.pauses, watchSeconds: row.watchSeconds, activeStudents: row.students.length })),
      recentActivity: recentEvents.map((event) => ({
        id: String(event._id), studentId: event.userId, type: event.type,
        lessonTitle: event.lessonId?.title || 'Lesson', subject: event.lessonId?.subject || event.subjectSlug,
        position: event.position, createdAt: event.createdAt,
      })),
    }
  },

  async getDashboardSummary() {
    const totalStudents = await userSqlRepository.countStudents()

    if (!isDbReady()) {
      return {
        totalStudents,
        activeStudents: 0,
        activeStudents7d: 0,
        totalLessons: 0,
        lessonsCompleted: 0,
        averageStudentProgress: 0,
      }
    }

    const [lessonCount, progress, events, students30d, students7d] = await Promise.all([
      Lesson.countDocuments(),
      LessonProgress.find().lean(),
      VideoActivityEvent.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 }, watchSeconds: { $sum: '$watchSeconds' } } },
      ]),
        userSqlRepository.countActiveStudentsSince(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        userSqlRepository.countActiveStudentsSince(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    ])
    const studentIds = new Set(progress.map((item) => item.userId))
    const averageStudentProgress = studentIds.size
      ? Math.round(progress.reduce((sum, item) => sum + (item.watchPercentage || 0), 0) / progress.length)
      : 0

    return {
      totalStudents,
      activeStudents: students30d,
      activeStudents7d: students7d,
      activeStudentsPeriod: '30 days',
      totalLessons: lessonCount,
      lessonsCompleted: progress.filter((item) => item.completed).length,
      averageStudentProgress,
      totalVideoPlays: events.find((event) => event._id === 'play')?.count || 0,
      totalVideoPauses: events.find((event) => event._id === 'pause')?.count || 0,
      totalVideoResumes: events.find((event) => event._id === 'resume')?.count || 0,
      totalVideoReplays: events.find((event) => event._id === 'replay')?.count || 0,
      totalObservedWatchTime: events.find((event) => event._id === 'watch')?.watchSeconds || 0,
      averageVideoCompletion: progress.length ? Math.round(progress.reduce((sum, item) => sum + (item.watchPercentage || 0), 0) / progress.length) : 0,
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

    const [progress, groupedEvents, recentEvents] = isDbReady()
      ? await Promise.all([
          LessonProgress.find({ userId: String(studentId) }).sort({ lastWatchedAt: -1 }).populate('lessonId').lean(),
          VideoActivityEvent.aggregate([
            { $match: { userId: String(studentId) } },
            { $sort: { createdAt: 1 } },
            { $group: {
              _id: { videoId: '$videoId', lessonId: '$lessonId', subjectSlug: '$subjectSlug', type: '$type' },
              count: { $sum: 1 }, watchSeconds: { $sum: '$watchSeconds' },
              lastActivity: { $last: '$createdAt' }, lastPosition: { $last: '$position' },
            } },
          ]),
          VideoActivityEvent.find({ userId: String(studentId) }).sort({ createdAt: -1 }).limit(100).populate('lessonId', 'title subject').lean(),
        ])
      : [[], [], []]

    const videoStats = new Map()
    const videoSummary = { plays: 0, pauses: 0, resumes: 0, replays: 0, watchSeconds: 0 }
    for (const item of groupedEvents) {
      const { videoId, lessonId, subjectSlug, type } = item._id
      const key = `${videoId}:${String(lessonId)}`
      const entry = videoStats.get(key) || {
        videoId,
        lessonId: String(lessonId),
        lessonTitle: 'Lesson',
        subject: subjectSlug,
        plays: 0, pauses: 0, resumes: 0, replays: 0, watchSeconds: 0,
        lastPosition: 0, lastActivity: item.lastActivity,
      }
      if (['play', 'pause', 'resume', 'replay'].includes(type)) entry[`${type === 'play' ? 'plays' : `${type}s`}`] += item.count
      if (type === 'watch') entry.watchSeconds += item.watchSeconds || 0
      if (entry.lastActivity <= item.lastActivity) { entry.lastActivity = item.lastActivity; entry.lastPosition = item.lastPosition || 0 }
      if (type === 'play') videoSummary.plays += item.count
      if (type === 'pause') videoSummary.pauses += item.count
      if (type === 'resume') videoSummary.resumes += item.count
      if (type === 'replay') videoSummary.replays += item.count
      if (type === 'watch') videoSummary.watchSeconds += item.watchSeconds || 0
      videoStats.set(key, entry)
    }
    const lessonIds = [...videoStats.values()].map((item) => item.lessonId)
    const lessons = await Lesson.find({ _id: { $in: lessonIds } }).select('title subject').lean()
    const lessonById = new Map(lessons.map((lesson) => [String(lesson._id), lesson]))
    for (const item of videoStats.values()) {
      const lesson = lessonById.get(item.lessonId)
      if (lesson) { item.lessonTitle = lesson.title; item.subject = lesson.subject }
    }

    const learningTwin = isDbReady()
      ? await twinService.getSnapshot(String(studentId), student.name)
      : null

    return {
      student: formatStudent(student, progress),
      learningTwin,
      summary: {
        ...summarizeProgress(progress),
        totalWatchTime: videoSummary.watchSeconds,
        playCount: videoSummary.plays,
        pauseCount: videoSummary.pauses,
        resumeCount: videoSummary.resumes,
        replayCount: videoSummary.replays,
      },
      recentActivity: progress.slice(0, 8).map(formatProgressItem),
      perLessonProgress: progress.map(formatProgressItem),
      videoActivity: [...videoStats.values()],
      recentVideoEvents: recentEvents.map((event) => ({
        id: String(event._id), type: event.type, videoId: event.videoId,
        lessonTitle: event.lessonId?.title || 'Lesson', subject: event.lessonId?.subject || event.subjectSlug,
        sessionId: event.sessionId, position: event.position, watchSeconds: event.watchSeconds,
        createdAt: event.createdAt,
      })),
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
  observedWatchTime: item.observedWatchTime || 0,
  completed: Boolean(item.completed),
  lastWatchedAt: item.lastWatchedAt,
})
