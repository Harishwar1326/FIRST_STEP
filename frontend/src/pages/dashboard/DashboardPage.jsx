import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, Brain, CheckCircle2, Compass, Leaf, Lightbulb, MapPin, Play, Sprout } from 'lucide-react'
import { programmingLearningService } from '../../services/programmingLearningService'

const trailStops = [
  {
    title: 'Continue your coding path',
    subject: 'C, Python, or Java adaptive lesson',
    time: '24 min',
    icon: BookOpen,
    color: 'bg-cyan-200',
    route: '/programming-learning'
  },
  {
    title: 'Ask your mentor what to revise',
    subject: 'Your Twin spotted weak formulas',
    time: '8 min',
    icon: Brain,
    color: 'bg-sky-200',
    route: '/learning-twin'
  },
  {
    title: 'Grow one concept branch',
    subject: 'Thermodynamics connects to chemistry',
    time: '15 min',
    icon: Sprout,
    color: 'bg-emerald-200',
    route: '/knowledge-forest'
  },
  {
    title: 'Solve the village challenge',
    subject: 'Solar energy design problem',
    time: '20 min',
    icon: Lightbulb,
    color: 'bg-violet-200',
    route: '/thinking-lab'
  }
]

const worlds = [
  ['Smart Notes Studio', 'Turn textbook pages into maps, quizzes, and flashcards.', 'from-rose-100 to-orange-100'],
  ['AI Learning Twin', 'A calm mentor that remembers how you learn best.', 'from-sky-100 to-indigo-100'],
  ['Knowledge Garden', 'Watch subjects grow into connected branches.', 'from-emerald-100 to-lime-100'],
  ['Daily Mission Center', 'Small wins for exams, college, and real skills.', 'from-yellow-100 to-amber-100'],
]

const secondsToMinutes = (seconds = 0) => `${Math.round((Number(seconds) || 0) / 60)} min`

const DashboardPage = () => {
  const analyticsQuery = useQuery({ queryKey: ['student-dashboard'], queryFn: programmingLearningService.getDashboard })
  const summary = analyticsQuery.data?.summary || {}
  const recentActivity = analyticsQuery.data?.recentActivity || []

  return (
    <div className="journey-page">
      <div className="absolute left-8 top-24 h-24 w-24 rounded-full bg-emerald-200/50 blur-2xl" />
      <div className="absolute bottom-12 right-8 h-32 w-32 rounded-full bg-amber-200/60 blur-2xl" />

      <section className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <span className="story-label">
            <Compass size={14} />
            Today Trail
          </span>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-black leading-[1.05] text-stone-950 sm:text-5xl lg:text-6xl">
              Start with the next right lesson.
            </h1>
            <p className="max-w-2xl text-lg font-medium leading-8 text-stone-600">
              Your journey today is built from your notes, weak concepts, and exam goals. No clutter. Just one friendly path forward.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="#today-path" className="organic-button">
              <Play size={18} />
              Begin today's path
            </a>
            <a href="/learning-academy" className="soft-button">
              Choose a mission
              <ArrowRight size={16} />
            </a>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 }} className="relative min-h-[360px]">
          <div className="absolute inset-x-8 top-20 h-2 rounded-full path-line animate-draw-path" />
          <div className="absolute left-8 top-8 flex h-24 w-24 animate-bob items-center justify-center rounded-[2rem] bg-emerald-200 leaf-shadow">
            <Leaf size={38} className="text-emerald-900" />
          </div>
          <div className="absolute right-8 top-28 flex h-28 w-28 animate-float-gentle items-center justify-center rounded-full bg-amber-200 shadow-xl">
            <BookOpen size={42} className="text-amber-900" />
          </div>
          <div className="absolute bottom-8 left-1/2 flex h-32 w-32 -translate-x-1/2 items-center justify-center rounded-[2.5rem] bg-sky-200 shadow-xl">
            <Brain size={46} className="text-sky-900" />
          </div>
          <div className="absolute bottom-24 left-16 rounded-full bg-white/70 px-4 py-2 text-sm font-bold text-stone-700 shadow">
            State board + college ready
          </div>
        </motion.div>
      </section>

      <section id="today-path" className="relative mt-12">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <span className="story-label">What should I learn next?</span>
            <h2 className="mt-3 text-2xl font-black text-stone-950">Your living path for today</h2>
          </div>
          <p className="max-w-md text-sm font-semibold text-stone-500">
            Built for short study windows between school, coaching, commute, and home responsibilities.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {trailStops.map((stop, index) => (
            <motion.a
              href={stop.route}
              key={stop.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="floating-island group block"
            >
              <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-[1.35rem] ${stop.color} transition group-hover:rotate-3 group-hover:scale-105`}>
                <stop.icon size={28} className="text-stone-900" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-black text-stone-950">{stop.title}</p>
                <p className="text-sm font-semibold leading-6 text-stone-600">{stop.subject}</p>
                <div className="flex items-center justify-between pt-2 text-sm font-bold text-stone-600">
                  <span>{stop.time}</span>
                  <ArrowRight size={17} className="transition group-hover:translate-x-1" />
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </section>

      <section className="relative mt-10">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <span className="story-label">My Progress</span>
            <h2 className="mt-3 text-2xl font-black text-stone-950">Your learning analytics</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {[
            ['Started', summary.lessonsStarted || 0],
            ['Completed', summary.lessonsCompleted || 0],
            ['Progress', `${summary.overallProgress || 0}%`],
            ['Watch Time', secondsToMinutes(summary.totalWatchTime)],
            ['Pauses', summary.pauseCount || 0],
            ['Replays', summary.replayCount || 0],
          ].map(([label, value]) => (
            <div key={label} className="floating-island p-4">
              <p className="text-2xl font-black text-stone-950">{value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-stone-500">{label}</p>
            </div>
          ))}
        </div>
        <div className="floating-island mt-5">
          <h3 className="mb-4 text-xl font-black text-stone-950">Recent lesson activity</h3>
          <div className="space-y-3">
            {recentActivity.map((item) => (
              <div key={item.id} className="rounded-[1.1rem] bg-white/70 p-4">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-black text-stone-950">{item.lessonTitle}</p>
                    <p className="text-sm font-semibold text-stone-500">{item.subject}</p>
                  </div>
                  <p className="font-black text-emerald-800">{item.watchPercentage}% watched</p>
                </div>
                <div className="mt-3 grid gap-2 text-sm font-semibold text-stone-600 sm:grid-cols-4">
                  <span>{item.completed ? 'Completed' : 'In Progress'}</span>
                  <span>{secondsToMinutes(item.timeSpent)}</span>
                  <span>{item.pauseCount || 0} pauses</span>
                  <span>{item.replayCount || 0} replays</span>
                </div>
              </div>
            ))}
            {!recentActivity.length ? <p className="font-bold text-stone-500">Save a lesson activity to start your dashboard.</p> : null}
          </div>
        </div>
      </section>

      <section className="relative mt-10 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="floating-island bg-gradient-to-br from-emerald-100/90 to-white/80">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={26} className="text-emerald-700" />
            <h2 className="text-xl font-black text-stone-950">Daily promise</h2>
          </div>
          <p className="mt-4 text-base font-medium leading-7 text-stone-600">
            Finish one concept, one practice, and one reflection. That is enough to keep momentum alive.
          </p>
          <div className="mt-6 flex gap-2">
            {['Concept', 'Practice', 'Reflect'].map((item) => (
              <span key={item} className="rounded-full bg-white/75 px-3 py-1 text-xs font-black text-emerald-800">{item}</span>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {worlds.map(([title, desc, color]) => (
            <div key={title} className={`rounded-[2rem] bg-gradient-to-br ${color} p-5 shadow-[0_16px_42px_rgba(92,72,35,0.10)]`}>
              <MapPin size={22} className="text-stone-700" />
              <h3 className="mt-4 text-lg font-black text-stone-950">{title}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-stone-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default DashboardPage
