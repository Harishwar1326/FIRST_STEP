import mongoose from 'mongoose'
import { twinRepository } from '../repositories/twin.repository.js'
import { aiServiceClient } from '../utils/aiServiceClient.js'

const isDbReady = () => mongoose.connection.readyState === 1
const asNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0
const dateValue = (value) => value ? new Date(value) : null
const idOf = (value) => String(value?._id || value || '')

const unavailableError = () => {
  const error = new Error('Learning Twin data is temporarily unavailable because the database is disconnected.')
  error.statusCode = 503
  return error
}

const analyzeSnapshotRecommendations = async (snapshot) => {
  const current = snapshot.recommendations?.items || []
  if (!current.length) return snapshot
  try {
    const response = await aiServiceClient.post('/learning/analyze-recommendations', {
      evidence: {
        averageQuizScore: snapshot.analytics.averageQuizScore,
        weakTopics: (snapshot.analytics.weakTopics || []).map((topic) => topic.topic).slice(0, 8),
        lessonsStarted: snapshot.profile.lessonsStarted,
        lessonsCompleted: snapshot.profile.lessonsCompleted,
        primaryGoal: snapshot.profile.assessment?.goal || null,
        modelDifficulty: snapshot.profile.modelGuidance?.recommendedDifficulty || null,
        modelTrainingData: snapshot.profile.modelGuidance?.trainingData || null,
      },
      candidates: current.slice(0, 8).map(({ id, title, reason, lessonId, subject, type }) => ({ id, title, reason, lessonId, subject, type })),
    }, { timeout: 5000 })
    const originalById = new Map(current.map((item) => [item.id, item]))
    const ordered = []
    const used = new Set()
    for (const item of response?.data?.items || []) {
      const original = originalById.get(String(item.id))
      const reason = String(item.reason || '').trim()
      if (original && reason && !used.has(original.id)) {
        ordered.push({ ...original, reason: reason.slice(0, 300) })
        used.add(original.id)
      }
    }
    if (ordered.length) {
      snapshot.recommendations = {
        ...snapshot.recommendations,
        items: ordered,
        focusAreas: ordered.slice(0, 3).map((item) => item.title),
        analysisSource: response.data.source?.endsWith('_grounded_candidates') ? 'ai_grounded' : 'evidence_rules',
      }
    }
  } catch (error) {
    // AI is contextual only; a timeout or provider error leaves the validated
    // evidence-based candidate list available to the student.
    snapshot.recommendations = { ...snapshot.recommendations, analysisSource: 'evidence_rules' }
  }
  return snapshot
}

const buildSubjectProgress = (lessons = [], progress = [], quizzes = [], taskDefinitions = [], completedTaskIds = new Set()) => {
  const progressByLesson = new Map(progress.map((item) => [idOf(item.lessonId), item]))
  const tasksByLesson = new Map()
  taskDefinitions.forEach((task) => {
    const lessonId = idOf(task.lessonId)
    const tasks = tasksByLesson.get(lessonId) || []
    tasks.push({ id: idOf(task), title: task.title, type: task.type, completed: completedTaskIds.has(idOf(task)) })
    tasksByLesson.set(lessonId, tasks)
  })
  const quizScoresByLesson = new Map()
  quizzes.forEach((quiz) => {
    const key = idOf(quiz.lessonId)
    const scores = quizScoresByLesson.get(key) || []
    scores.push(asNumber(quiz.score))
    quizScoresByLesson.set(key, scores)
  })
  const subjects = new Map()

  lessons.forEach((lesson) => {
    const key = lesson.subjectSlug || lesson.subject || 'other'
    const row = subjects.get(key) || {
      slug: key,
      subject: lesson.subject || 'Programming',
      lessonsTotal: 0,
      lessonsStarted: 0,
      lessonsCompleted: 0,
      progressTotal: 0,
      quizScores: [],
      lessons: [],
    }
    row.lessonsTotal += 1
    const lessonId = idOf(lesson)
    const activity = progressByLesson.get(lessonId)
    const completed = Boolean(activity?.completed || asNumber(activity?.watchPercentage) >= 90)
    if (activity) row.lessonsStarted += 1
    if (completed) row.lessonsCompleted += 1
    row.progressTotal += completed ? 100 : asNumber(activity?.watchPercentage)
    row.quizScores.push(...(quizScoresByLesson.get(lessonId) || []))
    row.lessons.push({
      id: lessonId,
      title: lesson.title,
      chapter: lesson.chapter,
      difficulty: lesson.difficulty,
      status: completed ? 'completed' : activity ? 'in_progress' : 'not_started',
      watchPercentage: completed ? 100 : asNumber(activity?.watchPercentage),
      currentPosition: asNumber(activity?.currentPosition),
      pauseCount: asNumber(activity?.pauseCount),
      replayCount: asNumber(activity?.replayCount),
      observedWatchSeconds: asNumber(activity?.observedWatchTime),
      uniqueCoverageSeconds: asNumber(activity?.timeSpent),
      lastWatchedAt: dateValue(activity?.lastWatchedAt || activity?.updatedAt),
      latestQuizScore: quizScoresByLesson.get(lessonId)?.[0] ?? null,
      tasks: tasksByLesson.get(lessonId) || [],
    })
    subjects.set(key, row)
  })

  return [...subjects.values()].map((row) => ({
    slug: row.slug,
    subject: row.subject,
    lessonsTotal: row.lessonsTotal,
    lessonsStarted: row.lessonsStarted,
    lessonsCompleted: row.lessonsCompleted,
    pendingLessons: row.lessonsTotal - row.lessonsCompleted,
    progressPercent: row.lessonsTotal ? Math.round(row.progressTotal / row.lessonsTotal) : 0,
    averageQuizScore: row.quizScores.length
      ? Math.round(row.quizScores.reduce((sum, score) => sum + score, 0) / row.quizScores.length)
      : null,
    tasksAvailable: row.lessons.reduce((sum, lesson) => sum + lesson.tasks.length, 0),
    tasksCompleted: row.lessons.reduce((sum, lesson) => sum + lesson.tasks.filter((task) => task.completed).length, 0),
    tasksPending: row.lessons.reduce((sum, lesson) => sum + lesson.tasks.filter((task) => !task.completed).length, 0),
    lessons: row.lessons,
  }))
}

const buildWeakTopics = ({ quizzes = [], academyActivities = [], submissions = [] }) => {
  const counts = new Map()
  const add = (topic, amount = 1) => {
    const label = String(topic || '').trim()
    if (label) counts.set(label, (counts.get(label) || 0) + amount)
  }
  quizzes.forEach((quiz) => (quiz.weakConcepts || []).forEach((concept) => add(concept)))
  academyActivities.forEach((activity) => {
    if (activity.misconception && !activity.misconceptionFixed) add(activity.topic)
    ;(activity.teachBackMisconceptions || []).forEach(add)
  })
  submissions.forEach((submission) => {
    if (Number.isFinite(Number(submission.score)) && Number(submission.score) < 50 && submission.challengeTitle) add(submission.challengeTitle)
  })
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([topic, evidenceCount]) => ({ topic, evidenceCount }))
}

const buildRecommendations = ({ lessons = [], progress = [], quizzes = [], revisions = [], weakTopics = [], goal = '', modelDifficulty = null }) => {
  const lessonById = new Map(lessons.map((lesson) => [idOf(lesson), lesson]))
  const progressByLesson = new Map(progress.map((item) => [idOf(item.lessonId), item]))
  const items = []
  const addLessonAction = (lesson, type, title, reason) => {
    if (!lesson || items.some((item) => item.lessonId === idOf(lesson))) return
    items.push({
      id: `${type}-${idOf(lesson)}`,
      type,
      title,
      reason,
      lessonId: idOf(lesson),
      lessonTitle: lesson.title,
      subject: lesson.subject,
      subjectSlug: lesson.subjectSlug || '',
      href: `/programming-learning?subject=${encodeURIComponent(lesson.subjectSlug || '')}&lesson=${encodeURIComponent(idOf(lesson))}`,
    })
  }

  const dueRevision = revisions.find((revision) => new Date(revision.dueDate) <= new Date() && lessonById.has(idOf(revision.lessonId)))
  if (dueRevision) {
    addLessonAction(
      lessonById.get(idOf(dueRevision.lessonId)),
      'review',
      'Review a lesson due for revision',
      'Your saved revision schedule marks this lesson as due.',
    )
  }

  const latestWeakQuiz = quizzes.find((quiz) => (quiz.weakConcepts || []).length && asNumber(quiz.score) < 70)
  if (latestWeakQuiz) {
    const lesson = lessonById.get(idOf(latestWeakQuiz.lessonId))
    const concepts = (latestWeakQuiz.weakConcepts || []).slice(0, 3).join(', ')
    addLessonAction(lesson, 'practice', `Practice ${concepts || 'missed concepts'}`, `Your latest quiz for this lesson scored ${asNumber(latestWeakQuiz.score)}% and recorded these missed concepts: ${concepts}.`)
  }

  const unfinished = progress
    .filter((item) => !item.completed && asNumber(item.watchPercentage) < 90 && lessonById.has(idOf(item.lessonId)))
    .sort((a, b) => new Date(b.lastWatchedAt || b.updatedAt || 0) - new Date(a.lastWatchedAt || a.updatedAt || 0))[0]
  if (unfinished) {
    const lesson = lessonById.get(idOf(unfinished.lessonId))
    addLessonAction(lesson, 'continue', 'Continue your lesson', `You have watched ${asNumber(unfinished.watchPercentage)}% and saved position ${Math.round(asNumber(unfinished.currentPosition))} seconds.`)
  }

  const completedTitles = new Set(lessons
    .filter((lesson) => {
      const item = progressByLesson.get(idOf(lesson))
      return item?.completed || asNumber(item?.watchPercentage) >= 90
    })
    .map((lesson) => lesson.title))
  const isAvailable = (lesson) => {
    const item = progressByLesson.get(idOf(lesson))
    const completed = item?.completed || asNumber(item?.watchPercentage) >= 90
    const prerequisites = lesson.prerequisites || []
    return !completed && !item && prerequisites.every((title) => completedTitles.has(title))
  }
  const goalText = String(goal || '').toLocaleLowerCase()
  const goalLesson = goalText
    ? lessons.find((lesson) => isAvailable(lesson) && [lesson.subject, lesson.title, ...(lesson.concepts || [])].some((value) => goalText.includes(String(value || '').toLocaleLowerCase())))
    : null
  const nextDifficulty = ({ Easy: 'Beginner', Medium: 'Intermediate', Advanced: 'Advanced' })[modelDifficulty]
  const modelMatchedLesson = nextDifficulty ? lessons.find((lesson) => isAvailable(lesson) && lesson.difficulty === nextDifficulty) : null
  const nextLesson = goalLesson || modelMatchedLesson || lessons.find(isAvailable)
  if (nextLesson) {
    addLessonAction(nextLesson, 'start', goalLesson ? 'Continue toward your selected goal' : 'Start an available lesson', goalLesson
      ? `This published lesson matches your Learning DNA goal: ${goal}. Its listed prerequisites are complete.`
      : modelMatchedLesson
        ? `Your saved model profile recommends ${nextDifficulty} material; this published lesson matches that level and its listed prerequisites are complete. Model estimates are experimental because training data is synthetic.`
        : 'This published lesson is available based on its listed prerequisites.')
  }

  const weakTopicNames = weakTopics.map((item) => item.topic)
  return {
    items: items.slice(0, 4),
    analysisSource: 'evidence_rules',
    focusAreas: items.slice(0, 3).map((item) => item.title),
    practiceTopics: weakTopicNames,
    modelDifficulty: modelMatchedLesson ? nextDifficulty : null,
    modelPredictionSource: modelMatchedLesson ? 'synthetic_experimental' : null,
    suggestedPace: quizzes.length
      ? asNumber(quizzes[0].score) < 50 ? 'step-by-step' : asNumber(quizzes[0].score) >= 85 ? 'challenge' : 'steady'
      : null,
  }
}

const buildRecentActivity = (evidence, lessonById) => {
  const events = []
  ;(evidence.lessonProgress || []).forEach((item) => {
    const lesson = lessonById.get(idOf(item.lessonId))
    const date = dateValue(item.lastWatchedAt || item.updatedAt)
    if (date) events.push({ id: `lesson-${idOf(item.lessonId)}`, type: 'lesson', title: lesson?.title || 'Programming lesson', detail: `${Math.round(asNumber(item.watchPercentage))}% video coverage`, subject: lesson?.subject || 'Programming', createdAt: date })
  })
  ;(evidence.quizResults || []).forEach((item) => {
    const date = dateValue(item.createdAt)
    if (date) events.push({ id: `quiz-${idOf(item)}`, type: 'quiz', title: `Quiz: ${lessonById.get(idOf(item.lessonId))?.title || 'Programming lesson'}`, detail: `${asNumber(item.score)}% · ${asNumber(item.correctCount)}/${asNumber(item.totalQuestions)} correct`, createdAt: date })
  })
  ;(evidence.videoEvents || []).forEach((item) => {
    const date = dateValue(item.createdAt)
    if (!date || !['play', 'pause', 'resume', 'replay', 'complete', 'lesson_enter', 'lesson_exit'].includes(item.type)) return
    events.push({
      id: `video-${idOf(item)}`,
      type: `video_${item.type}`,
      title: `${String(item.type).replace('_', ' ')} · ${item.lessonId?.title || 'Programming lesson'}`,
      detail: `Position ${Math.round(asNumber(item.position))}s`,
      subject: item.lessonId?.subject || item.subjectSlug,
      createdAt: date,
    })
  })
  ;(evidence.academyActivities || []).forEach((item) => {
    const date = dateValue(item.updatedAt || item.createdAt)
    if (date) events.push({ id: `academy-${idOf(item)}`, type: 'learning_academy', title: item.topic, detail: `${Math.round(asNumber(item.completion))}% complete`, createdAt: date })
  })
  ;(evidence.thinkingSubmissions || []).forEach((item) => {
    const date = dateValue(item.createdAt)
    if (date) events.push({ id: `thinking-${idOf(item)}`, type: 'thinking_lab', title: item.challengeTitle || 'Thinking Lab challenge', detail: Number.isFinite(Number(item.score)) ? `${asNumber(item.score)}% score` : 'Submitted', createdAt: date })
  })
  ;(evidence.analytics || []).forEach((item) => {
    const date = dateValue(item.createdAt)
    if (!date) return
    if (item.activityType === 'submit_task') {
      events.push({ id: `task-${idOf(item)}`, type: 'task', title: 'Learning task submitted', detail: item.metadata?.taskId ? `Task ${item.metadata.taskId}` : 'Submission recorded without a task ID', createdAt: date })
      return
    }
    if (item.activityType === 'revision') {
      events.push({ id: `revision-${idOf(item)}`, type: 'revision', title: 'Revision activity recorded', detail: item.lessonId ? `Lesson ${idOf(item.lessonId)}` : 'Study revision', createdAt: date })
      return
    }
    if (!String(item.activityType || '').startsWith('smart_notes')) return
    events.push({ id: `analytics-${idOf(item)}`, type: 'smart_notes', title: String(item.activityType).replaceAll('_', ' '), detail: item.lessonId ? `Lesson ${idOf(item.lessonId)}` : 'Study notes activity', createdAt: date })
  })
  ;(evidence.twin?.studySessions || []).forEach((item, index) => {
    const date = dateValue(item.date)
    if (date) events.push({ id: `sprint-${index}-${date.getTime()}`, type: 'self_reported_sprint', title: item.subject || 'Study sprint', detail: `${asNumber(item.duration)} minutes · self-reported confidence ${asNumber(item.confidence ?? item.accuracy)}%`, createdAt: date })
  })
  ;[...(evidence.notes || []), ...(evidence.smartNotes || [])].forEach((item) => {
    const date = dateValue(item.updatedAt || item.createdAt)
    if (date) events.push({ id: `note-${idOf(item)}`, type: 'notes', title: item.title || 'Study note', detail: item.subject || 'Saved learning material', createdAt: date })
  })
  return events.sort((a, b) => b.createdAt - a.createdAt).slice(0, 12)
}

export const buildTwinSnapshot = (evidence, { userId, name = 'Student' } = {}) => {
  const lessons = evidence.lessons || []
  const lessonProgress = evidence.lessonProgress || []
  const quizResults = evidence.quizResults || []
  const academyActivities = evidence.academyActivities || []
  const thinkingSubmissions = evidence.thinkingSubmissions || []
  const lessonById = new Map(lessons.map((lesson) => [idOf(lesson), lesson]))
  const weakTopics = buildWeakTopics({ quizzes: quizResults, academyActivities, submissions: thinkingSubmissions })
  const assessment = evidence.assessment
  const learningModelProfile = evidence.learningModelProfile
  const taskDefinitions = evidence.taskDefinitions || []
  const taskDefinitionIds = new Set(taskDefinitions.map((task) => idOf(task)))
  const completedTaskIds = new Set((evidence.taskSubmissions?.taskIds || []).map(idOf).filter((id) => taskDefinitionIds.has(id)))
  const taskMetrics = {
    available: taskDefinitions.length,
    completed: completedTaskIds.size,
    pending: Math.max(0, taskDefinitions.length - completedTaskIds.size),
    submissions: asNumber(evidence.taskSubmissions?.submissions),
    unlinkedSubmissions: Math.max(0, asNumber(evidence.taskSubmissions?.submissions) - asNumber(evidence.taskSubmissions?.linkedSubmissions)),
  }
  const subjects = buildSubjectProgress(lessons, lessonProgress, quizResults, taskDefinitions, completedTaskIds)
  const hasEvidence = Boolean(
    assessment?.completedAt || lessonProgress.length || quizResults.length || academyActivities.length ||
    thinkingSubmissions.length || (evidence.twin?.studySessions || []).length ||
    (evidence.notes || []).length || (evidence.smartNotes || []).length || (evidence.revisions || []).length || (evidence.analytics || []).length || taskMetrics.submissions,
  )
  const recommendationEvidenceExists = Boolean(
    assessment?.completedAt || lessonProgress.length || quizResults.length || academyActivities.length ||
    thinkingSubmissions.length || (evidence.revisions || []).length,
  )
  const primaryGoal = assessment?.insights?.primaryGoal || assessment?.responses?.primaryGoal || ''
  const recommendations = recommendationEvidenceExists
    ? buildRecommendations({
      lessons,
      progress: lessonProgress,
      quizzes: quizResults,
      revisions: evidence.revisions || [],
      weakTopics,
      goal: primaryGoal,
      modelDifficulty: learningModelProfile?.predictionSource === 'synthetic_baseline_model'
        ? learningModelProfile.difficulty
        : null,
    })
    : { items: [], focusAreas: [], practiceTopics: weakTopics.map((item) => item.topic), suggestedPace: null }
  const quizAverage = evidence.quizSummary
    ? evidence.quizSummary.averageScore == null ? null : Math.round(asNumber(evidence.quizSummary.averageScore))
    : quizResults.length
      ? Math.round(quizResults.reduce((sum, quiz) => sum + asNumber(quiz.score), 0) / quizResults.length)
      : null
  const completedLessons = lessonProgress.filter((item) => item.completed || asNumber(item.watchPercentage) >= 90).length
  const observedWatchSeconds = lessonProgress.reduce((sum, item) => sum + asNumber(item.observedWatchTime), 0)
  const uniqueCoverageSeconds = lessonProgress.reduce((sum, item) => sum + asNumber(item.timeSpent), 0)
  const pauseCount = lessonProgress.reduce((sum, item) => sum + asNumber(item.pauseCount), 0)
  const replayCount = lessonProgress.reduce((sum, item) => sum + asNumber(item.replayCount), 0)
  const latestProgress = lessonProgress
    .slice()
    .sort((a, b) => new Date(b.lastWatchedAt || b.updatedAt || 0) - new Date(a.lastWatchedAt || a.updatedAt || 0))[0]
  const supportedScores = [
    ...(assessment?.completedAt && Number.isFinite(Number(assessment.assessmentScore)) ? [asNumber(assessment.assessmentScore)] : []),
    ...quizResults.map((item) => asNumber(item.score)),
    ...academyActivities.flatMap((item) => [item.teachBackScore, item.understanding].filter((value) => value !== null && value !== undefined && Number.isFinite(Number(value))).map(asNumber)),
    ...thinkingSubmissions.map((item) => item.score).filter((value) => value !== null && value !== undefined && Number.isFinite(Number(value))).map(asNumber),
    ...(thinkingSubmissions.length && evidence.thinkingSkills?.overallScore != null ? [asNumber(evidence.thinkingSkills.overallScore)] : []),
  ]
  const subjectScores = subjects.filter((item) => item.averageQuizScore !== null)
  const strengths = subjectScores.filter((item) => item.averageQuizScore >= 80).map((item) => `${item.subject}: quiz average ${item.averageQuizScore}%`)
  const activityDates = new Set([
    ...lessonProgress.map((item) => item.lastWatchedAt || item.updatedAt),
    ...quizResults.map((item) => item.createdAt),
    ...academyActivities.map((item) => item.updatedAt || item.createdAt),
    ...thinkingSubmissions.map((item) => item.createdAt),
    ...(evidence.notes || []).map((item) => item.updatedAt || item.createdAt),
    ...(evidence.smartNotes || []).map((item) => item.updatedAt || item.createdAt),
    ...(evidence.revisions || []).map((item) => item.lastReviewed || item.updatedAt),
    ...(evidence.analytics || []).map((item) => item.createdAt),
    ...(evidence.twin?.studySessions || []).map((item) => item.date),
    ...(assessment?.completedAt ? [assessment.completedAt] : []),
  ].filter(Boolean).map((value) => new Date(value).toISOString().slice(0, 10)))
  const recentQuizResults = quizResults.slice(0, 10).map((item) => ({
    id: idOf(item),
    lessonId: idOf(item.lessonId),
    lessonTitle: lessonById.get(idOf(item.lessonId))?.title || 'Programming lesson',
    subject: lessonById.get(idOf(item.lessonId))?.subject || 'Programming',
    score: asNumber(item.score),
    correctCount: asNumber(item.correctCount),
    totalQuestions: asNumber(item.totalQuestions),
    weakConcepts: item.weakConcepts || [],
    createdAt: item.createdAt,
  }))
  const recentActivity = buildRecentActivity(evidence, lessonById)
  const profile = {
    student: { id: String(userId), name },
    hasEvidence,
    availableLessons: lessons.length,
    subjects,
    lessonsStarted: lessonProgress.length,
    lessonsCompleted: completedLessons,
    pendingLessons: Math.max(0, lessons.length - completedLessons),
    lastWatchedLesson: latestProgress ? {
      id: idOf(latestProgress.lessonId),
      title: lessonById.get(idOf(latestProgress.lessonId))?.title || 'Programming lesson',
      subject: lessonById.get(idOf(latestProgress.lessonId))?.subject || 'Programming',
      subjectSlug: lessonById.get(idOf(latestProgress.lessonId))?.subjectSlug || '',
      position: asNumber(latestProgress.currentPosition),
      watchPercentage: asNumber(latestProgress.watchPercentage),
      lastWatchedAt: latestProgress.lastWatchedAt || latestProgress.updatedAt,
    } : null,
    assessment: assessment?.completedAt ? {
      score: asNumber(assessment.assessmentScore),
      completedAt: assessment.completedAt,
      capabilityProfile: assessment.capabilityProfile || {},
      goal: assessment.insights?.primaryGoal || assessment.responses?.primaryGoal || null,
      learningPreference: assessment.insights?.learningPreference || null,
    } : null,
    quizHistory: recentQuizResults,
    notesCount: asNumber(evidence.noteCount) + asNumber(evidence.smartNoteCount),
    taskProgress: taskMetrics,
    modelGuidance: learningModelProfile?.predictionSource ? {
      masteryEstimate: learningModelProfile.masteryScore != null && Number.isFinite(Number(learningModelProfile.masteryScore)) ? asNumber(learningModelProfile.masteryScore) : null,
      retentionEstimate: learningModelProfile.retentionProbability != null && Number.isFinite(Number(learningModelProfile.retentionProbability)) ? asNumber(learningModelProfile.retentionProbability) : null,
      recommendedDifficulty: learningModelProfile.difficulty || null,
      source: learningModelProfile.predictionSource,
      trainingData: learningModelProfile.predictionTrainingData || 'unknown',
      difficultySource: learningModelProfile.difficultySource || 'unknown',
    } : null,
    recordedRevisions: asNumber(evidence.revisionEventCount),
    revisionDueCount: asNumber(evidence.revisionDueCount),
    strengths,
    weaknesses: weakTopics.map((item) => `${item.topic} (${item.evidenceCount} recorded miss${item.evidenceCount === 1 ? '' : 'es'})`),
    knowledgeScore: supportedScores.length ? Math.round(supportedScores.reduce((sum, score) => sum + score, 0) / supportedScores.length) : null,
  }
  const analytics = {
    activityDays: activityDates.size,
    quizAttempts: asNumber(evidence.quizSummary?.attempts ?? quizResults.length),
    averageQuizScore: quizAverage,
    observedWatchSeconds,
    uniqueCoverageSeconds,
    pauseCount,
    replayCount,
    videoCompletionPercent: lessonProgress.length
      ? Math.round(lessonProgress.reduce((sum, item) => sum + asNumber(item.watchPercentage), 0) / lessonProgress.length)
      : null,
    measuredResultCount: supportedScores.length,
    weakTopics,
    studySessions: (evidence.twin?.studySessions || []).slice(-10).map((item) => ({
      subject: item.subject,
      duration: asNumber(item.duration),
      confidence: Number.isFinite(Number(item.confidence ?? item.accuracy)) ? asNumber(item.confidence ?? item.accuracy) : null,
      source: 'self-reported',
      timestamp: item.date,
    })),
    recentActivity,
  }
  return { profile, analytics, recommendations }
}

export const deriveAnalytics = (twin) => ({
  activityDays: 0,
  quizAttempts: 0,
  averageQuizScore: null,
  observedWatchSeconds: 0,
  uniqueCoverageSeconds: 0,
  videoCompletionPercent: null,
  measuredResultCount: 0,
  weakTopics: [],
  studySessions: (twin?.studySessions || []).slice(-10),
  recentActivity: [],
})

export const twinService = {
  async getSnapshot(userId, name = 'Student') {
    if (!isDbReady()) throw unavailableError()
    const evidence = await twinRepository.getLearningEvidence(userId)
    return analyzeSnapshotRecommendations(buildTwinSnapshot(evidence, { userId, name }))
  },

  async getProfile(userId, name = 'Student') {
    return (await this.getSnapshot(userId, name)).profile
  },

  async getAnalytics(userId) {
    return (await this.getSnapshot(userId)).analytics
  },

  async getRecommendations(userId) {
    return (await this.getSnapshot(userId)).recommendations
  },

  async updateProgress(userId, progressData) {
    if (!isDbReady()) throw unavailableError()
    let savedTwin
    try {
      savedTwin = await twinRepository.updateProgress(userId, progressData)
    } catch (error) {
      const persistenceError = new Error('Learning progress could not be saved')
      persistenceError.statusCode = 503
      persistenceError.cause = error
      throw persistenceError
    }
    return {
      success: Boolean(savedTwin),
      message: 'Progress updated successfully',
    }
  },
}
