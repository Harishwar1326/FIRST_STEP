import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CirclePlay,
  Flame,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Card from '../ui/Card'
import EmptyState from '../ui/EmptyState'
import ProgressBar from '../ui/ProgressBar'
import SectionHeader from '../ui/SectionHeader'
import Skeleton from '../ui/Skeleton'

const activityIcon = {
  completed: CheckCircle2,
  quiz: Trophy,
  watched: CirclePlay,
  started: ArrowRight,
}

const ActivityRow = ({ item }) => {
  const Icon = activityIcon[item.type] || ArrowRight
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-app bg-elevated p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-accent">
        <Icon size={17} strokeWidth={1.5} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-primary">{item.label}</p>
        <p className="mt-1 text-xs font-semibold text-muted">
          {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
        </p>
      </div>
    </div>
  )
}

const OverviewCard = ({ label, value, icon: Icon }) => (
  <Card className="p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">{label}</p>
        <p className="mt-2 font-display text-2xl font-black text-primary">{value}</p>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-app bg-elevated text-secondary">
        <Icon size={19} strokeWidth={1.5} />
      </div>
    </div>
  </Card>
)

const LearningProgressSection = ({ data, isLoading, isError, errorMessage }) => {
  if (isLoading) {
    return (
      <section className="mt-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64" />
        <p className="text-sm font-semibold text-secondary">Loading your progress...</p>
      </section>
    )
  }

  if (isError) {
    return (
      <section className="mt-8">
        <EmptyState
          title="Unable to load learning progress"
          message={errorMessage || 'Please refresh the page or try again in a moment.'}
        />
      </section>
    )
  }

  const overview = data?.overview || {}
  const subjects = data?.subjects || []
  const recentLearningActivity = data?.recentLearningActivity || []
  const quizPerformance = data?.quizPerformance || {}
  const continueLearning = data?.continueLearning
  const recommendation = data?.recommendation
  const hasAnyActivity =
    (overview.lessonsCompleted || 0) > 0 ||
    (overview.overallProgress || 0) > 0 ||
    (quizPerformance.quizzesCompleted || 0) > 0 ||
    recentLearningActivity.length > 0

  return (
    <section className="mt-8 space-y-6">
      <SectionHeader eyebrow="My Learning Progress" title="Your learning at a glance">
        Real progress from your lesson activity, quizzes, and study sessions.
      </SectionHeader>

      {!hasAnyActivity ? (
        <EmptyState
          title="No learning activity yet"
          message="Start your first lesson to see progress, quiz scores, and recommendations here."
          actionLabel="Start your first lesson"
          href="/programming-learning"
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewCard label="Overall Progress" value={`${overview.overallProgress || 0}%`} icon={Target} />
        <OverviewCard label="Lessons Completed" value={overview.lessonsCompleted || 0} icon={BookOpenCheck} />
        <OverviewCard label="Average Quiz Score" value={`${overview.averageQuizScore || 0}%`} icon={Trophy} />
        <OverviewCard label="Current Streak" value={`${overview.currentStreak || 0} days`} icon={Flame} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5 sm:p-6">
          <SectionHeader eyebrow="Subjects" title="Subject progress" />
          {subjects.length ? (
            <div className="space-y-5">
              {subjects.map((subject) => (
                <div key={subject.slug || subject.title}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-black text-primary">{subject.title}</p>
                    <span className="text-sm font-black text-secondary">{subject.progressPercent || 0}%</span>
                  </div>
                  <ProgressBar value={subject.progressPercent || 0} />
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {subject.lessonsCompleted || 0} of {subject.lessonsTotal || 0} lessons completed
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm font-semibold text-secondary">No subjects available yet.</p>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <SectionHeader eyebrow="Quiz" title="Quiz performance" />
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-app bg-elevated p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted">Average</p>
              <p className="mt-1 font-display text-xl font-black text-primary">{quizPerformance.averageScore || 0}%</p>
            </div>
            <div className="rounded-2xl border border-app bg-elevated p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted">Best</p>
              <p className="mt-1 font-display text-xl font-black text-primary">{quizPerformance.bestScore || 0}%</p>
            </div>
            <div className="rounded-2xl border border-app bg-elevated p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted">Completed</p>
              <p className="mt-1 font-display text-xl font-black text-primary">{quizPerformance.quizzesCompleted || 0}</p>
            </div>
          </div>
          {quizPerformance.recent?.length ? (
            <div className="mt-5 space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Recent quiz performance</p>
              {quizPerformance.recent.map((quiz) => (
                <div key={quiz.id} className="flex items-center justify-between rounded-xl border border-app bg-elevated px-3 py-2 text-sm">
                  <span className="font-semibold text-primary">{quiz.label}</span>
                  <span className="font-black text-secondary">
                    {quiz.totalQuestions ? `${quiz.correctCount}/${quiz.totalQuestions}` : `${quiz.score}%`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm font-semibold text-secondary">Complete a lesson quiz to see scores here.</p>
          )}
        </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <SectionHeader eyebrow="Timeline" title="Recent learning activity" />
          {recentLearningActivity.length ? (
            <div className="space-y-3">
              {recentLearningActivity.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <p className="text-sm font-semibold text-secondary">No learning activity yet.</p>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5 sm:p-6">
            <SectionHeader eyebrow="Continue" title="Continue learning" />
            {continueLearning ? (
              <>
                <p className="text-sm font-semibold text-muted">{continueLearning.subject}</p>
                <h3 className="mt-1 font-display text-2xl font-black text-primary">{continueLearning.title}</h3>
                <div className="mt-4 flex items-center gap-3">
                  <ProgressBar value={continueLearning.watchPercentage || 0} className="flex-1" />
                  <span className="text-sm font-black text-primary">{continueLearning.watchPercentage || 0}%</span>
                </div>
                <Button as={Link} to="/programming-learning" className="mt-5 w-full">
                  Continue lesson
                  <ArrowRight size={16} strokeWidth={1.5} />
                </Button>
              </>
            ) : (
              <EmptyState
                title="No lesson in progress"
                message="Start a recommended lesson below or open programming learning."
                actionLabel="Open programming"
                href="/programming-learning"
              />
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionHeader
              eyebrow="Recommended"
              title="Recommended for you"
              action={
                recommendation ? (
                  <Badge tone="accent">
                    <Sparkles size={12} className="mr-1 inline" />
                    Next step
                  </Badge>
                ) : null
              }
            />
            {recommendation ? (
              <>
                <p className="text-sm font-semibold text-muted">{recommendation.subject}</p>
                <h3 className="mt-1 font-display text-xl font-black text-primary">&ldquo;{recommendation.title}&rdquo;</h3>
                <p className="mt-3 text-sm leading-6 text-secondary">{recommendation.reason}</p>
                <Button as={Link} to="/programming-learning" variant="secondary" className="mt-5 w-full">
                  Start lesson
                  <ArrowRight size={16} strokeWidth={1.5} />
                </Button>
              </>
            ) : (
              <p className="text-sm font-semibold text-secondary">Recommendations appear after you begin learning.</p>
            )}
          </Card>
        </div>
          </div>
        </>
      )}
    </section>
  )
}

export default LearningProgressSection
