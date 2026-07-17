import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Bookmark,
  Brain,
  CheckCircle2,
  Code2,
  Edit3,
  Flame,
  Layers3,
  PlayCircle,
  RotateCcw,
  Save,
  Sparkles,
  Target,
} from 'lucide-react'
import { programmingLearningService } from '../../services/programmingLearningService'

const metricDefaults = {
  watchPercentage: 92,
  pauseCount: 1,
  replayCount: 1,
  playbackSpeed: 1,
  timeSpent: 24,
  completed: true,
}

const ProgrammingLearningPage = () => {
  const queryClient = useQueryClient()
  const canvasRef = useRef(null)
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [metrics, setMetrics] = useState(metricDefaults)
  const [answers, setAnswers] = useState({})
  const [notesDraft, setNotesDraft] = useState('')
  const [drawingNotes, setDrawingNotes] = useState('')
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
    mutationFn: () => programmingLearningService.trackLesson(selectedLessonId, metrics),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programming-lesson', selectedLessonId] })
      queryClient.invalidateQueries({ queryKey: ['programming-subjects'] })
    },
  })

  const quizMutation = useMutation({
    mutationFn: () =>
      programmingLearningService.submitQuiz(
        selectedLessonId,
        Object.entries(answers).map(([id, answer]) => ({ id, answer })),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programming-lesson', selectedLessonId] })
      queryClient.invalidateQueries({ queryKey: ['programming-subjects'] })
    },
  })

  const saveNotesMutation = useMutation({
    mutationFn: () => programmingLearningService.saveNotes(selectedLessonId, notesDraft),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['programming-lesson', selectedLessonId] }),
  })

  const saveDrawingMutation = useMutation({
    mutationFn: () => {
      const canvas = canvasRef.current
      return programmingLearningService.saveDrawing(selectedLessonId, {
        title: `${lesson?.title || 'Lesson'} notebook`,
        dataUrl: canvas ? canvas.toDataURL('image/png') : '',
        notes: drawingNotes,
      })
    },
    onSuccess: () => {
      setDrawingNotes('')
      queryClient.invalidateQueries({ queryKey: ['programming-lesson', selectedLessonId] })
    },
  })

  const drawStarter = () => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#fff7ed'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = '#0f172a'
    context.lineWidth = 3
    context.strokeRect(48, 44, 180, 64)
    context.strokeRect(330, 44, 180, 64)
    context.strokeRect(188, 170, 180, 64)
    context.beginPath()
    context.moveTo(228, 76)
    context.lineTo(330, 76)
    context.moveTo(420, 108)
    context.lineTo(300, 170)
    context.stroke()
    context.font = '18px sans-serif'
    context.fillStyle = '#1f2937'
    context.fillText('Input', 108, 83)
    context.fillText('Logic', 394, 83)
    context.fillText('Output', 246, 209)
  }

  useEffect(() => {
    drawStarter()
  }, [selectedLessonId])

  return (
    <div className="world-page bg-[linear-gradient(135deg,#fff7ed_0%,#ecfeff_48%,#f7fee7_100%)]">
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
                <iframe
                  className="h-full w-full"
                  src={lesson.videoUrl}
                  title={lesson.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
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
                  ['watchPercentage', 'Watch percentage', 0, 100],
                  ['pauseCount', 'Pause count', 0, 12],
                  ['replayCount', 'Replay count', 0, 8],
                  ['timeSpent', 'Time spent', 1, 90],
                ].map(([key, label, min, max]) => (
                  <label key={key} className="block">
                    <div className="mb-1 flex justify-between text-sm font-bold text-stone-600">
                      <span>{label}</span>
                      <span>{metrics[key]}</span>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      value={metrics[key]}
                      onChange={(event) => setMetrics((current) => ({ ...current, [key]: Number(event.target.value) }))}
                      className="w-full accent-orange-500"
                    />
                  </label>
                ))}
                <button onClick={() => trackMutation.mutate()} className="organic-button w-full" disabled={trackMutation.isPending || !selectedLessonId}>
                  <Save size={18} />
                  Save learning activity
                </button>
              </div>
            </section>

            <section className="floating-island">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-black text-stone-950">Quiz Studio</h3>
                <Brain className="text-sky-700" />
              </div>
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
                  Latest score: {lessonData.quizResult.score}% · Weak concepts: {lessonData.quizResult.weakConcepts?.join(', ') || 'none'}
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
              <button onClick={() => saveNotesMutation.mutate()} className="soft-button mt-4" disabled={saveNotesMutation.isPending}>
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

              <div className="floating-island">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-black text-stone-950">Notebook Canvas</h3>
                  <RotateCcw className="cursor-pointer text-stone-600" onClick={drawStarter} />
                </div>
                <canvas ref={canvasRef} width="560" height="280" className="w-full rounded-[1.2rem] border border-white bg-white shadow-inner" />
                <textarea
                  value={drawingNotes}
                  onChange={(event) => setDrawingNotes(event.target.value)}
                  placeholder="Add handwritten-note summary, flowchart idea, or algorithm notes."
                  className="mt-3 min-h-20 w-full rounded-[1rem] border border-stone-200 bg-white/80 p-3 text-sm outline-none focus:ring-4 focus:ring-emerald-100"
                />
                <button onClick={() => saveDrawingMutation.mutate()} className="soft-button mt-3" disabled={saveDrawingMutation.isPending}>
                  <Save size={17} />
                  Save notebook
                </button>
              </div>
            </div>
          </section>
        </main>
      </section>
    </div>
  )
}

export default ProgrammingLearningPage
