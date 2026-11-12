import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import {
  Bookmark,
  Brain,
  CheckCircle2,
  Code2,
  Edit3,
  Flame,
  Layers3,
  PlayCircle,
  Save,
  Sparkles,
  Target,
} from 'lucide-react'
import { programmingLearningService } from '../../services/programmingLearningService'

const metricDefaults = {
  watchPercentage: 0,
  pauseCount: 0,
  replayCount: 0,
  playbackSpeed: 1,
  timeSpent: 0,
  watchedSegments: [],
  videoDuration: 0,
  completed: false,
}

const getYouTubeVideoId = (url = '') => {
  const match = String(url).match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([^?&/]+)/)
  return match?.[1] || ''
}

const loadYouTubeApi = () => {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (window.firstStepYouTubeApiPromise) return window.firstStepYouTubeApiPromise

  window.firstStepYouTubeApiPromise = new Promise((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.()
      resolve(window.YT)
    }

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(script)
    }
  })

  return window.firstStepYouTubeApiPromise
}

const secondsToMinutes = (seconds = 0) => `${Math.round((Number(seconds) || 0) / 60)} min`

const mergeSegments = (segments = []) =>
  segments
    .filter((segment) => Number(segment.end) > Number(segment.start))
    .sort((a, b) => a.start - b.start)
    .reduce((merged, segment) => {
      const clean = { start: Number(segment.start), end: Number(segment.end) }
      const previous = merged[merged.length - 1]
      if (!previous || clean.start > previous.end + 0.5) return [...merged, clean]
      previous.end = Math.max(previous.end, clean.end)
      return merged
    }, [])

const getUniqueWatchedSeconds = (segments = []) =>
  Math.round(mergeSegments(segments).reduce((sum, segment) => sum + segment.end - segment.start, 0))

const ProgrammingLearningPage = () => {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const playerContainerRef = useRef(null)
  const playerRef = useRef(null)
  const syncInFlightRef = useRef(false)
  const trackingRef = useRef({
    playing: false,
    lastTime: 0,
    lastTickAt: 0,
    lastReplayAt: 0,
    pendingWatchSeconds: 0,
    hasPlayed: false,
    wasPaused: false,
    sessionId: '',
    eventQueue: Promise.resolve(),
    lastSpeed: 1,
    watchedSegments: [],
    syncTimer: null,
    metrics: metricDefaults,
  })
  const [selectedSubject, setSelectedSubject] = useState(() => searchParams.get('subject') || '')
  const [selectedLessonId, setSelectedLessonId] = useState(() => searchParams.get('lesson') || '')
  const [metrics, setMetrics] = useState(metricDefaults)
  const [answers, setAnswers] = useState({})
  const [notesDraft, setNotesDraft] = useState('')
  const [activeFlashcard, setActiveFlashcard] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const subjectsQuery = useQuery({
    queryKey: ['programming-subjects'],
    queryFn: programmingLearningService.getSubjects,
  })

  const subjects = subjectsQuery.data?.subjects || []

  useEffect(() => {
    if (!selectedSubject && subjects[0]) setSelectedSubject(subjects[0].slug)
  }, [selectedSubject, subjects])

  const currentSubject = subjects.find((subject) => subject.slug === selectedSubject)
  const lessons = currentSubject?.lessons || []

  useEffect(() => {
    if (!selectedLessonId && lessons[0]) setSelectedLessonId(lessons[0].id || lessons[0]._id)
  }, [selectedLessonId, lessons])

  const lessonQuery = useQuery({
    queryKey: ['programming-lesson', selectedLessonId],
    queryFn: () => programmingLearningService.getLesson(selectedLessonId),
    enabled: Boolean(selectedLessonId),
  })

  const lessonData = lessonQuery.data
  const lesson = lessonData?.lesson
  const quiz = lessonData?.quiz || []
  const notes = lessonData?.notes
  const recommendation = lessonData?.recommendation

  useEffect(() => {
    if (!lessonData?.progress) {
      trackingRef.current.metrics = metricDefaults
      trackingRef.current.watchedSegments = []
      setMetrics(metricDefaults)
      return
    }

    const nextMetrics = {
      watchPercentage: lessonData.progress.watchPercentage || 0,
      pauseCount: lessonData.progress.pauseCount || 0,
      replayCount: lessonData.progress.replayCount || 0,
      playbackSpeed: lessonData.progress.playbackSpeed || 1,
      timeSpent: lessonData.progress.timeSpent || 0,
      watchedSegments: lessonData.progress.watchedSegments || [],
      videoDuration: lessonData.progress.videoDuration || 0,
      completed: Boolean(lessonData.progress.completed),
    }
    trackingRef.current.metrics = nextMetrics
    trackingRef.current.watchedSegments = nextMetrics.watchedSegments
    setMetrics(nextMetrics)
  }, [lessonData?.progress, selectedLessonId])

  useEffect(() => {
    if (notes?.editableContent) setNotesDraft(notes.editableContent)
  }, [notes?.editableContent])

  const mcqs = quiz.filter((question) => question.type === 'mcq')
  const openQuestions = quiz.filter((question) => question.type !== 'mcq')
  const flashcards = notes?.flashcards || []

  const progressSummary = useMemo(() => {
    const progress = subjectsQuery.data?.progress
    return [
      ['Completed', progress?.completedLessons || 0, CheckCircle2],
      ['Avg score', `${progress?.averageScore || 0}%`, Brain],
      ['Streak', `${progress?.studyStreak || 0} days`, Flame],
    ]
  }, [subjectsQuery.data?.progress])

  const trackMutation = useMutation({
    mutationFn: ({ lessonId, metrics: payload }) => programmingLearningService.trackLesson(lessonId, payload),
    onMutate: () => {
      syncInFlightRef.current = true
    },
    onSuccess: (data) => {
      const progress = data?.progress
      if (progress) {
        const nextMetrics = {
          watchPercentage: progress.watchPercentage || 0,
          pauseCount: progress.pauseCount || 0,
          replayCount: progress.replayCount || 0,
          playbackSpeed: progress.playbackSpeed || 1,
          timeSpent: progress.timeSpent || 0,
          watchedSegments: progress.watchedSegments || [],
          videoDuration: progress.videoDuration || 0,
          completed: Boolean(progress.completed),
        }
        trackingRef.current.metrics = nextMetrics
        trackingRef.current.watchedSegments = nextMetrics.watchedSegments
        setMetrics(nextMetrics)
      }
      queryClient.invalidateQueries({ queryKey: ['programming-subjects'] })
    },
    onSettled: () => {
      syncInFlightRef.current = false
    },
  })

  const updateMetricsFromTracker = useCallback((changes = {}) => {
    const watchedSegments = mergeSegments(changes.watchedSegments || trackingRef.current.watchedSegments)
    const videoDuration = changes.videoDuration ?? trackingRef.current.metrics.videoDuration
    const uniqueWatchedSeconds = getUniqueWatchedSeconds(watchedSegments)
    const watchPercentage = videoDuration ? Math.min(100, Math.round((uniqueWatchedSeconds / videoDuration) * 100)) : 0
    const nextMetrics = {
      ...trackingRef.current.metrics,
      ...changes,
      watchedSegments,
      videoDuration,
      timeSpent: uniqueWatchedSeconds,
      watchPercentage,
      completed: trackingRef.current.metrics.completed || watchPercentage >= 90,
    }

    trackingRef.current.metrics = nextMetrics
    trackingRef.current.watchedSegments = watchedSegments
    setMetrics(nextMetrics)
    return nextMetrics
  }, [])

  const syncTracking = useCallback((lessonId = selectedLessonId) => {
    if (!lessonId || syncInFlightRef.current) return
    syncInFlightRef.current = true
    trackingRef.current.eventQueue.finally(() => trackMutation.mutate({ lessonId, metrics: trackingRef.current.metrics }))
  }, [selectedLessonId, trackMutation.mutate])

  const addWatchedSegment = useCallback((start, end) => {
    if (!Number.isFinite(start) || !Number.isFinite(end) || end - start < 0.75) return
    updateMetricsFromTracker({
      watchedSegments: [...trackingRef.current.watchedSegments, { start, end }],
    })
  }, [updateMetricsFromTracker])

  const recordEvent = useCallback((lessonId, type, fields = {}) => {
    if (!lessonId) return
    if (!trackingRef.current.sessionId) trackingRef.current.sessionId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const eventPayload = {
      eventId: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      sessionId: trackingRef.current.sessionId,
      type,
      ...fields,
    }
    const send = async () => {
      try {
        await programmingLearningService.recordVideoEvent(lessonId, eventPayload)
      } catch (error) {
        if (!error?.response || error.response.status >= 500) {
          await new Promise((resolve) => window.setTimeout(resolve, 1000))
          await programmingLearningService.recordVideoEvent(lessonId, eventPayload)
        }
      }
    }
    trackingRef.current.eventQueue = trackingRef.current.eventQueue.then(send, send).catch(() => {})
  }, [])

  const isAlreadyWatched = useCallback((time) =>
    trackingRef.current.watchedSegments.some((segment) => time >= segment.start - 1 && time <= segment.end + 1),
  [])

  const capturePlaybackTick = useCallback(() => {
    const player = playerRef.current
    if (!player?.getCurrentTime) return

    const currentTime = player.getCurrentTime()
    const lastTime = trackingRef.current.lastTime
    const now = Date.now()
    const backwardsSeek = lastTime - currentTime > 5
    const normalPlayback = currentTime > lastTime && currentTime - lastTime < 2.5

    if (trackingRef.current.playing && normalPlayback) {
      const elapsed = trackingRef.current.lastTickAt ? Math.min(2, (now - trackingRef.current.lastTickAt) / 1000) : 0
      trackingRef.current.pendingWatchSeconds += elapsed
      if (trackingRef.current.pendingWatchSeconds >= 20) {
        const watchSeconds = Math.min(30, Math.floor(trackingRef.current.pendingWatchSeconds))
        trackingRef.current.pendingWatchSeconds -= watchSeconds
        const rate = trackingRef.current.lastSpeed || 1
        recordEvent(selectedLessonId, 'watch', { position: currentTime, duration: trackingRef.current.metrics.videoDuration, watchSeconds, segmentStart: Math.max(0, currentTime - watchSeconds * rate), segmentEnd: currentTime })
      }
    }

    if (Math.abs(currentTime - lastTime) > 2.5) {
      recordEvent(selectedLessonId, 'seek', { position: currentTime, duration: trackingRef.current.metrics.videoDuration })
    }

    if (backwardsSeek && isAlreadyWatched(currentTime) && Date.now() - trackingRef.current.lastReplayAt > 3000) {
      trackingRef.current.lastReplayAt = Date.now()
      updateMetricsFromTracker({ replayCount: trackingRef.current.metrics.replayCount + 1 })
      recordEvent(selectedLessonId, 'replay', { position: currentTime, duration: trackingRef.current.metrics.videoDuration })
      syncTracking()
    } else if (normalPlayback) {
      addWatchedSegment(lastTime, currentTime)
    }

    trackingRef.current.lastTime = currentTime
    trackingRef.current.lastTickAt = now
  }, [addWatchedSegment, isAlreadyWatched, recordEvent, selectedLessonId, syncTracking, updateMetricsFromTracker])

  const quizMutation = useMutation({
    mutationFn: () =>
      programmingLearningService.submitQuiz(
        selectedLessonId,
        Object.entries(answers).map(([id, answer]) => ({ id, answer })),
        lessonData?.quizSessionId,
      ),
    onSuccess: () => {
      setAnswers({})
      queryClient.invalidateQueries({ queryKey: ['programming-lesson', selectedLessonId] })
      queryClient.invalidateQueries({ queryKey: ['programming-subjects'] })
      queryClient.invalidateQueries({ queryKey: ['learning-profile'] })
    },
  })

  const saveNotesMutation = useMutation({
    mutationFn: () => programmingLearningService.saveNotes(selectedLessonId, notesDraft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programming-lesson', selectedLessonId] })
      queryClient.invalidateQueries({ queryKey: ['learning-profile'] })
    },
  })

  useEffect(() => {
    const videoId = getYouTubeVideoId(lesson?.videoUrl)
    const container = playerContainerRef.current
    if (!videoId || !container || !selectedLessonId) return undefined

    let disposed = false
    // YouTube replaces its target node with an iframe. Keep that target outside
    // React's rendered child tree so React never tries to remove a node YouTube replaced.
    const playerTarget = document.createElement('div')
    playerTarget.className = 'h-full w-full'
    container.replaceChildren(playerTarget)
    const resumePosition = Number(lessonData?.progress?.currentPosition) || 0

    loadYouTubeApi().then((YT) => {
      if (disposed || !playerContainerRef.current) return
      playerRef.current?.destroy?.()
      playerRef.current = new YT.Player(playerTarget, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          enablejsapi: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event) => {
            const duration = event.target.getDuration()
            if (resumePosition > 1 && resumePosition < duration - 5) event.target.seekTo(resumePosition, true)
            updateMetricsFromTracker({ videoDuration: duration || trackingRef.current.metrics.videoDuration || 0 })
            trackingRef.current.lastTime = resumePosition > 1 ? Math.min(resumePosition, duration) : event.target.getCurrentTime() || 0
            trackingRef.current.sessionId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
            trackingRef.current.hasPlayed = false
            trackingRef.current.wasPaused = false
            trackingRef.current.pendingWatchSeconds = 0
            recordEvent(selectedLessonId, 'lesson_enter', { position: trackingRef.current.lastTime, duration })
          },
          onStateChange: (event) => {
            const YTState = window.YT?.PlayerState
            const currentTime = event.target.getCurrentTime?.() || 0

            if (event.data === YTState?.PLAYING) {
              if (trackingRef.current.hasPlayed && trackingRef.current.lastTime - currentTime > 5 && Date.now() - trackingRef.current.lastReplayAt > 3000) {
                trackingRef.current.lastReplayAt = Date.now()
                updateMetricsFromTracker({ replayCount: trackingRef.current.metrics.replayCount + 1 })
                recordEvent(selectedLessonId, 'replay', { position: currentTime, duration: event.target.getDuration?.() || 0 })
              }
              if (trackingRef.current.wasPaused) {
                recordEvent(selectedLessonId, 'resume', { position: currentTime, duration: event.target.getDuration?.() || 0 })
              } else if (!trackingRef.current.hasPlayed) {
                recordEvent(selectedLessonId, 'play', { position: currentTime, duration: event.target.getDuration?.() || 0 })
              }
              trackingRef.current.hasPlayed = true
              trackingRef.current.wasPaused = false
              trackingRef.current.playing = true
              trackingRef.current.lastTime = currentTime
              trackingRef.current.lastTickAt = Date.now()
              trackingRef.current.lastSpeed = event.target.getPlaybackRate?.() || 1
              updateMetricsFromTracker({
                videoDuration: event.target.getDuration?.() || trackingRef.current.metrics.videoDuration,
                playbackSpeed: event.target.getPlaybackRate?.() || 1,
              })
              if (!trackingRef.current.syncTimer) {
                trackingRef.current.syncTimer = window.setInterval(() => {
                  capturePlaybackTick()
                  const speed = event.target.getPlaybackRate?.() || 1
                  if (speed !== trackingRef.current.lastSpeed) {
                    trackingRef.current.lastSpeed = speed
                    recordEvent(selectedLessonId, 'speed', { position: event.target.getCurrentTime?.() || 0, duration: event.target.getDuration?.() || 0, playbackSpeed: speed })
                  }
                }, 1000)
              }
              return
            }

            if (event.data === YTState?.PAUSED) {
              const wasPlaying = trackingRef.current.playing
              const wasSeeking = Math.abs(currentTime - trackingRef.current.lastTime) > 2.5
              capturePlaybackTick()
              trackingRef.current.playing = false
              if (wasPlaying && !wasSeeking) {
                updateMetricsFromTracker({ pauseCount: trackingRef.current.metrics.pauseCount + 1 })
                trackingRef.current.wasPaused = true
                if (trackingRef.current.pendingWatchSeconds > 0) {
                  const watchSeconds = Math.min(30, Math.floor(trackingRef.current.pendingWatchSeconds))
                  recordEvent(selectedLessonId, 'watch', { position: currentTime, duration: event.target.getDuration?.() || 0, watchSeconds, segmentStart: Math.max(0, currentTime - watchSeconds * (trackingRef.current.lastSpeed || 1)), segmentEnd: currentTime })
                  trackingRef.current.pendingWatchSeconds = 0
                }
                recordEvent(selectedLessonId, 'pause', { position: currentTime, duration: event.target.getDuration?.() || 0 })
                syncTracking()
              }
              return
            }

            if (event.data === YTState?.ENDED) {
              capturePlaybackTick()
              trackingRef.current.playing = false
              recordEvent(selectedLessonId, 'complete', { position: currentTime, duration: event.target.getDuration?.() || 0 })
              syncTracking()
              return
            }

            if (event.data === YTState?.BUFFERING) {
              capturePlaybackTick()
              trackingRef.current.playing = false
              recordEvent(selectedLessonId, 'buffer', { position: currentTime, duration: event.target.getDuration?.() || 0 })
            }
          },
          onError: (event) => recordEvent(selectedLessonId, 'error', { position: event.target.getCurrentTime?.() || 0, duration: event.target.getDuration?.() || 0, metadata: { code: event.data } }),
        },
      })
    })

    return () => {
      disposed = true
      capturePlaybackTick()
      if (trackingRef.current.pendingWatchSeconds > 0) {
        const position = playerRef.current?.getCurrentTime?.() || 0
        const watchSeconds = Math.min(30, Math.floor(trackingRef.current.pendingWatchSeconds))
        recordEvent(selectedLessonId, 'watch', { position, duration: playerRef.current?.getDuration?.() || 0, watchSeconds, segmentStart: Math.max(0, position - watchSeconds * (trackingRef.current.lastSpeed || 1)), segmentEnd: position })
        trackingRef.current.pendingWatchSeconds = 0
      }
      recordEvent(selectedLessonId, 'lesson_exit', { position: playerRef.current?.getCurrentTime?.() || 0, duration: playerRef.current?.getDuration?.() || 0 })
      syncTracking()
      if (trackingRef.current.syncTimer) {
        window.clearInterval(trackingRef.current.syncTimer)
        trackingRef.current.syncTimer = null
      }
      playerRef.current?.destroy?.()
      playerRef.current = null
      container.replaceChildren()
    }
  }, [capturePlaybackTick, lesson?.videoUrl, lessonData?.progress?.currentPosition, recordEvent, selectedLessonId, syncTracking, updateMetricsFromTracker])

  return (
    <div className="world-page redesign-surface programming-learning-page">
      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <span className="story-label">
            <Sparkles size={14} />
            Adaptive Programming MVP
          </span>
          <div>
            <h1 className="text-4xl font-black leading-tight text-stone-950 sm:text-5xl">
              Learn code with a path that reacts to you.
            </h1>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-stone-600">
              Choose C, Python, or Java, watch a lesson, submit a quiz, and let FirstStep adjust notes, flashcards, revision, and the next task.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {progressSummary.map(([label, value, Icon]) => (
              <div key={label} className="rounded-[1.4rem] bg-white/70 p-4 shadow-sm">
                <Icon size={20} className="text-stone-700" />
                <p className="mt-3 text-2xl font-black text-stone-950">{value}</p>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="floating-island">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-stone-500">Today's Mission</p>
              <h2 className="text-2xl font-black text-stone-950">{recommendation?.message || 'Complete one lesson and quiz.'}</h2>
            </div>
            <Target className="text-emerald-700" size={32} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {subjects.map((subject) => (
              <button
                key={subject.slug}
                onClick={() => {
                  setSelectedSubject(subject.slug)
                  setSelectedLessonId('')
                  setAnswers({})
                }}
                className={`rounded-[1.5rem] border p-4 text-left transition ${
                  selectedSubject === subject.slug ? 'border-stone-900 bg-white shadow-lg' : 'border-white/70 bg-white/55 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full text-white" style={{ backgroundColor: subject.color }}>
                    <Code2 size={19} />
                  </span>
                  <span className="font-black text-stone-950">{subject.title}</span>
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-stone-600">{subject.description}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="floating-island h-fit">
          <div className="mb-4 flex items-center gap-2">
            <Layers3 size={20} />
            <h2 className="text-xl font-black text-stone-950">Learning Path</h2>
          </div>
          <div className="space-y-2">
            {lessons.map((item) => {
              const itemId = item.id || item._id
              const active = String(itemId) === String(selectedLessonId)
              return (
                <button
                  key={itemId}
                  onClick={() => {
                    setSelectedLessonId(itemId)
                    setAnswers({})
                    setFlipped(false)
                  }}
                  className={`w-full rounded-[1.2rem] p-3 text-left transition ${
                    active ? 'bg-stone-950 text-white shadow-lg' : 'bg-white/65 text-stone-700 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black">{item.order}. {item.title}</span>
                    {item.progress?.completed ? <CheckCircle2 size={17} className="text-emerald-400" /> : null}
                  </div>
                  <p className={`mt-1 text-xs font-semibold ${active ? 'text-white/70' : 'text-stone-500'}`}>{item.chapter} · {item.difficulty}</p>
                </button>
              )
            })}
          </div>
        </aside>

        <main className="space-y-6">
          <div className="floating-island">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-stone-500">{lesson?.subject}</p>
                <h2 className="text-3xl font-black text-stone-950">{lesson?.title || 'Loading lesson...'}</h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-stone-600">{lesson?.content}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-800">
                {lesson?.estimatedStudyTime || 20} min
              </span>
            </div>
            <div className="aspect-video overflow-hidden rounded-[1.5rem] bg-stone-950 shadow-inner">
              {lesson?.videoUrl ? (
                <div ref={playerContainerRef} className="h-full w-full" title={lesson.title} />
              ) : null}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="floating-island">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-black text-stone-950">Behavior Tracker</h3>
                <PlayCircle className="text-orange-600" />
              </div>
              <div className="space-y-4">
                {[
                  ['Watch percentage', `${metrics.watchPercentage || 0}%`],
                  ['Pause count', metrics.pauseCount || 0],
                  ['Replay count', metrics.replayCount || 0],
                  ['Unique video coverage', secondsToMinutes(metrics.timeSpent)],
                  ['Status', metrics.completed ? 'Completed' : 'In Progress'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[1.1rem] bg-white/70 p-4">
                    <div className="flex justify-between gap-3 text-sm font-bold text-stone-600">
                      <span>{label}</span>
                      <span className="text-stone-950">{value}</span>
                    </div>
                  </div>
                ))}
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">
                  Activity is captured automatically from video playback.
                </p>
              </div>
            </section>

            <section className="floating-island">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-black text-stone-950">Quiz Studio</h3>
                <Brain className="text-sky-700" />
              </div>
              {lessonData?.quizAdaptation ? (
                <div className="mb-4 rounded-[1.1rem] border border-sky-100 bg-sky-50/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black capitalize text-sky-800">
                      {lessonData.quizAdaptation.level} set · {quiz.length} questions · {lessonData.quizAdaptation.source === 'ollama' ? 'Ollama generated' : 'adaptive fallback'}
                    </span>
                    {lessonData.quizAdaptation.attempts > 0 ? (
                      <span className="text-xs font-bold text-sky-800">
                        Recent average: {lessonData.quizAdaptation.averageScore}%
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-sky-950">{lessonData.quizAdaptation.message}</p>
                  {lessonData.quizAdaptation.focusConcepts?.length ? (
                    <p className="mt-1 text-xs font-bold text-sky-800">
                      Focus practice: {lessonData.quizAdaptation.focusConcepts.join(', ')}
                    </p>
                  ) : null}
                  {lessonData.quizAdaptation.abilityGuidance ? (
                    <p className="mt-1 text-xs font-semibold text-sky-800">
                      Ability profile: {lessonData.quizAdaptation.abilityGuidance.difficulty} level
                      {lessonData.quizAdaptation.abilityGuidance.masteryEstimate !== null
                        ? ` · mastery ${Math.round(lessonData.quizAdaptation.abilityGuidance.masteryEstimate)}%` : ''}
                      {lessonData.quizAdaptation.abilityGuidance.retentionEstimate !== null
                        ? ` · retention ${Math.round(lessonData.quizAdaptation.abilityGuidance.retentionEstimate * 100)}%` : ''}
                      {lessonData.quizAdaptation.abilityGuidance.experimental ? ' · demo estimate' : ''}
                    </p>
                  ) : null}
                </div>
              ) : lessonQuery.isFetching ? (
                <p className="mb-4 rounded-xl bg-sky-50 p-4 text-sm font-bold text-sky-800">Ollama is creating a quiz from this lesson and your ability profile…</p>
              ) : null}
              <div className="max-h-[430px] space-y-4 overflow-y-auto pr-1">
                {mcqs.map((question) => (
                  <div key={question.id} className="rounded-[1.2rem] bg-white/70 p-4">
                    <p className="font-black text-stone-900">{question.question}</p>
                    <div className="mt-3 grid gap-2">
                      {question.options.map((option) => (
                        <label key={option} className="flex items-center gap-2 rounded-full bg-white/75 px-3 py-2 text-sm font-semibold text-stone-700">
                          <input
                            type="radio"
                            name={question.id}
                            checked={answers[question.id] === option}
                            onChange={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {openQuestions.map((question) => (
                  <label key={question.id} className="block rounded-[1.2rem] bg-white/70 p-4">
                    <span className="font-black text-stone-900">{question.question}</span>
                    <textarea
                      value={answers[question.id] || ''}
                      onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                      className="mt-3 min-h-20 w-full rounded-[1rem] border border-stone-200 bg-white/80 p-3 text-sm outline-none focus:ring-4 focus:ring-sky-100"
                    />
                  </label>
                ))}
              </div>
              <button onClick={() => quizMutation.mutate()} className="organic-button mt-4 w-full" disabled={quizMutation.isPending || !selectedLessonId}>
                Submit quiz and personalize
              </button>
              {lessonData?.quizResult ? (
                <div className="mt-4 rounded-[1.2rem] bg-emerald-100 p-4 font-bold text-emerald-900">
                  Latest multiple-choice score: {lessonData.quizResult.score}% · Weak concepts: {lessonData.quizResult.weakConcepts?.join(', ') || 'none'}
                </div>
              ) : null}
            </section>
          </div>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="floating-island">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.12em] text-stone-500">Smart Notes Studio</p>
                  <h3 className="text-2xl font-black text-stone-950">{notes?.level || 'standard'} notes</h3>
                </div>
                <Edit3 className="text-rose-600" />
              </div>
              <textarea
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
                className="min-h-[260px] w-full rounded-[1.5rem] border border-white bg-white/75 p-4 font-mono text-sm leading-6 text-stone-800 outline-none focus:ring-4 focus:ring-orange-100"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {(notes?.revisionNotes || []).map((item) => (
                  <span key={item} className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">{item}</span>
                ))}
              </div>
              <button onClick={() => saveNotesMutation.mutate()} className="soft-button mt-4" disabled={saveNotesMutation.isPending || !selectedLessonId}>
                <Save size={17} />
                Save notes
              </button>
            </div>

            <div className="space-y-6">
              <div className="floating-island">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-black text-stone-950">Flashcards</h3>
                  <Bookmark className="text-amber-700" />
                </div>
                <button
                  onClick={() => setFlipped((current) => !current)}
                  className="min-h-[190px] w-full rounded-[1.5rem] bg-gradient-to-br from-stone-950 to-stone-800 p-6 text-left text-white shadow-xl"
                >
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200">{flipped ? 'Answer' : 'Question'}</p>
                  <p className="mt-5 text-2xl font-black leading-tight">
                    {flashcards[activeFlashcard] ? (flipped ? flashcards[activeFlashcard].back : flashcards[activeFlashcard].front) : 'Complete a quiz to generate flashcards.'}
                  </p>
                </button>
                <div className="mt-4 flex justify-between">
                  <button
                    className="soft-button"
                    onClick={() => {
                      setActiveFlashcard((current) => Math.max(0, current - 1))
                      setFlipped(false)
                    }}
                  >
                    Previous
                  </button>
                  <button
                    className="soft-button"
                    onClick={() => {
                      setActiveFlashcard((current) => Math.min(Math.max(0, flashcards.length - 1), current + 1))
                      setFlipped(false)
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </section>
    </div>
  )
}

export default ProgrammingLearningPage
