import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, Brain, CheckCircle2, Code2, Flame, Play, Target, Timer, TrendingUp } from 'lucide-react'
import { programmingLearningService } from '../../services/programmingLearningService'
import LearningProgressSection from '../../components/dashboard/LearningProgressSection'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import ModeSwitcher from '../../components/ui/ModeSwitcher'
import ProgressBar from '../../components/ui/ProgressBar'
import ProgressRing from '../../components/ui/ProgressRing'
import SectionHeader from '../../components/ui/SectionHeader'
import Skeleton from '../../components/ui/Skeleton'

const secondsToMinutes = (seconds = 0) => `${Math.round((Number(seconds) || 0) / 60)} min`

const modeCopy = {
  School: 'Board exam habits, daily revision, and concept clarity.',
  College: 'Build stronger fundamentals and project-ready confidence.',
  Skills: 'Programming, practice, and career-ready learning momentum.',
  Placements: 'Readiness across DSA, aptitude, SQL, interviews, and core skills.',
}

const sparkByMode = {
  School: 'One revised concept today becomes one less doubt tomorrow.',
  College: 'Depth grows when you connect theory to one practical example.',
  Skills: 'Small practice loops are how difficult skills become familiar.',
  Placements: 'Placement readiness is built by consistent, honest reps.',
}

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Unable to load learning progress.'

const StatCard = ({ icon: Icon, label, value, detail }) => (
  <Card className="p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">{label}</p>
        <p className="mt-2 font-display text-2xl font-black text-primary">{value}</p>
        {detail ? <p className="mt-1 text-xs font-semibold text-secondary">{detail}</p> : null}
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-app bg-elevated text-secondary">
        <Icon size={19} strokeWidth={1.5} />
      </div>
    </div>
  </Card>
)

const MissionCard = ({ title, category, difficulty, duration, progress, href = '/programming-learning', icon: Icon = Target }) => (
  <Link to={href} className="group block">
    <Card className="h-full p-5 transition hover:-translate-y-1 hover:border-accent motion-reduce:hover:translate-y-0">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white">
          <Icon size={22} strokeWidth={1.5} />
        </div>
        {difficulty ? <Badge>{difficulty}</Badge> : null}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">{category}</p>
      <h3 className="mt-2 min-h-[3rem] font-display text-lg font-black leading-tight text-primary">{title}</h3>
      <div className="mt-5 flex items-center justify-between text-xs font-bold text-secondary">
        <span>{duration}</span>
        <span>{progress}%</span>
      </div>
      <ProgressBar value={progress} className="mt-2" />
      <div className="mt-5 flex items-center gap-2 text-sm font-black text-primary">
        Continue
        <ArrowRight size={16} strokeWidth={1.5} className="transition group-hover:translate-x-1 motion-reduce:transition-none" />
      </div>
    </Card>
  </Link>
)

const DashboardPage = () => {
  const [mode, setMode] = useState('Skills')
  const dashboardQuery = useQuery({ queryKey: ['student-dashboard'], queryFn: programmingLearningService.getDashboard })

  const summary = dashboardQuery.data?.summary || {}
  const overview = dashboardQuery.data?.overview || {}
  const recentActivity = dashboardQuery.data?.recentActivity || []
  const continueLearning = dashboardQuery.data?.continueLearning
  const recommendation = dashboardQuery.data?.recommendation
  const weakConcepts = dashboardQuery.data?.weakConcepts || []

  const currentActivity = recentActivity[0]
  const progressValue = Number(
    continueLearning?.watchPercentage || currentActivity?.watchPercentage || summary.overallProgress || 0,
  )

  const missions = useMemo(() => {
    const items = []
    if (continueLearning) {
      items.push({
        title: continueLearning.title,
        category: continueLearning.subject || 'Programming',
        difficulty: continueLearning.completed ? 'Review' : 'In Progress',
        duration: 'Continue now',
        progress: continueLearning.watchPercentage || 0,
        icon: Play,
      })
    } else if (currentActivity) {
      items.push({
        title: currentActivity.lessonTitle,
        category: currentActivity.subject || 'Programming',
        difficulty: currentActivity.completed ? 'Review' : 'In Progress',
        duration: secondsToMinutes(currentActivity.timeSpent),
        progress: currentActivity.watchPercentage || 0,
        icon: Play,
      })
    }
    if (recommendation) {
      items.push({
        title: recommendation.title,
        category: recommendation.subject || 'Recommended',
        difficulty: 'Next',
        duration: 'Start now',
        progress: 0,
        icon: Code2,
      })
    }
    weakConcepts.forEach((concept) => {
      items.push({ title: `Repair ${concept}`, category: 'Weak concept', difficulty: 'Practice', duration: 'Focused review', progress: 0, icon: Brain })
    })
    return items.slice(0, 4)
  }, [continueLearning, currentActivity, recommendation, weakConcepts])

  if (dashboardQuery.isLoading) {
    return (
      <div className="journey-page">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_0.75fr]">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <p className="mt-4 text-sm font-semibold text-secondary">Loading your progress...</p>
      </div>
    )
  }

  return (
    <div className="journey-page">
      <div className="mb-6 grid gap-4 xl:grid-cols-[1fr_420px]">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="min-w-0">
          <Card className="relative overflow-hidden p-6 sm:p-8">
            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="min-w-0">
                <Badge tone="accent">Continue Learning</Badge>
                <h1 className="mt-5 max-w-3xl font-display text-4xl font-black leading-[0.95] tracking-tight text-primary sm:text-5xl xl:text-6xl">
                  Take the next step with clarity.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-secondary">
                  {modeCopy[mode]} FirstStep keeps today focused on progress, weak areas, and the next useful action.
                </p>
                <div className="mt-8 rounded-2xl border border-app bg-elevated p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Current Path</p>
                      <h2 className="mt-1 truncate font-display text-2xl font-black text-primary">
                        {continueLearning?.title || currentActivity?.lessonTitle || recommendation?.title || 'No active lesson yet'}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-secondary">
                        {continueLearning?.subject || currentActivity?.subject || recommendation?.subject || 'Start a programming lesson to build your dashboard.'}
                      </p>
                    </div>
                    <Button as={Link} to="/programming-learning" size="lg">
                      Resume Learning
                      <ArrowRight size={17} strokeWidth={1.5} />
                    </Button>
                  </div>
                  <div className="mt-5 flex items-center gap-4">
                    <ProgressBar value={progressValue} className="flex-1" />
                    <span className="text-sm font-black text-primary">{progressValue}%</span>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-muted">
                    {summary.lessonsCompleted || 0} completed from {summary.lessonsStarted || 0} started lessons
                  </p>
                </div>
              </div>
              <div className="flex justify-center lg:justify-end">
                <ProgressRing value={progressValue} size={144} stroke={12} />
              </div>
            </div>
          </Card>
        </motion.section>

        <motion.aside initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08 }} className="space-y-4">
          <ModeSwitcher value={mode} onChange={setMode} />
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success text-black">
                <Flame size={20} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Daily Spark</p>
                <p className="mt-2 text-lg font-black leading-snug text-primary">{sparkByMode[mode]}</p>
              </div>
            </div>
          </Card>
        </motion.aside>
      </div>

      <LearningProgressSection
        data={dashboardQuery.data}
        isLoading={false}
        isError={dashboardQuery.isError}
        errorMessage={getErrorMessage(dashboardQuery.error)}
      />

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BookOpen} label="Lessons Started" value={summary.lessonsStarted || 0} detail={`${summary.lessonsCompleted || 0} completed`} />
        <StatCard icon={TrendingUp} label="Overall Progress" value={`${overview.overallProgress ?? summary.overallProgress ?? 0}%`} detail="From tracked lesson activity" />
        <StatCard icon={Timer} label="Watch Time" value={secondsToMinutes(summary.totalWatchTime)} detail={`${summary.pauseCount || 0} pauses logged`} />
        <StatCard icon={CheckCircle2} label="Study Streak" value={`${overview.currentStreak || 0} days`} detail="From lesson and quiz activity" />
      </section>

      <section className="mt-8 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5 sm:p-6">
          <SectionHeader eyebrow="Today's Missions" title="What should I do today?">
            Built from your latest tracked activity, recommended lesson, and weak concepts.
          </SectionHeader>
          {missions.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {missions.map((mission) => <MissionCard key={`${mission.category}-${mission.title}`} {...mission} />)}
            </div>
          ) : (
            <EmptyState title="No missions yet" message="Complete or start one programming lesson and your missions will appear here." actionLabel="Start Learning" href="/programming-learning" />
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <SectionHeader eyebrow="Needs Attention" title="Weak concepts" />
          {weakConcepts.length ? (
            <div className="space-y-3">
              {weakConcepts.map((concept) => (
                <div key={concept} className="rounded-2xl border border-app bg-elevated px-4 py-3">
                  <p className="text-sm font-black text-primary">{concept}</p>
                  <p className="mt-1 text-xs font-semibold text-secondary">Identified from your recent quiz results.</p>
                </div>
              ))}
              <Button as={Link} to="/programming-learning" variant="secondary" className="mt-3 w-full">
                Practice Weak Areas
                <ArrowRight size={16} strokeWidth={1.5} />
              </Button>
            </div>
          ) : (
            <EmptyState title="No weak concepts detected" message="Submit quizzes or learning tasks so FirstStep can identify what needs attention." actionLabel="Open Programming" href="/programming-learning" />
          )}
        </Card>
      </section>

      <section className="mt-8">
        <Card className="p-5 sm:p-6">
          <SectionHeader eyebrow="Recent Activity" title="Lesson watch history" />
          {recentActivity.length ? (
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-2xl border border-app bg-elevated p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-black text-primary">{item.lessonTitle}</p>
                      <p className="text-sm font-semibold text-secondary">{item.subject}</p>
                    </div>
                    <Badge tone={item.completed ? 'success' : 'accent'}>{item.completed ? 'Completed' : 'In Progress'}</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 text-xs font-bold text-secondary sm:grid-cols-4">
                    <span>{item.watchPercentage || 0}% watched</span>
                    <span>{secondsToMinutes(item.timeSpent)}</span>
                    <span>{item.pauseCount || 0} pauses</span>
                    <span>{item.replayCount || 0} replays</span>
                  </div>
                  <ProgressBar value={item.watchPercentage || 0} className="mt-3" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No lesson activity yet" message="Your watch progress, pauses, replays, and completion activity will appear after you study a lesson." actionLabel="Start First Lesson" href="/programming-learning" />
          )}
        </Card>
      </section>
    </div>
  )
}

export default DashboardPage
