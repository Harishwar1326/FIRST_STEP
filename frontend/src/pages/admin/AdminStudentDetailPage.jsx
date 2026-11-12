import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { Activity, Clock, Pause, Play, Repeat, Timer, Trophy } from 'lucide-react'
import { adminService } from '../../services/adminService'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import ProgressBar from '../../components/ui/ProgressBar'

const secondsToMinutes = (seconds = 0) => `${Math.round((Number(seconds) || 0) / 60)} min`

const AdminStudentDetailPage = () => {
  const { id } = useParams()
  const studentQuery = useQuery({ queryKey: ['admin-student', id], queryFn: () => adminService.getStudent(id), enabled: Boolean(id) })
  const data = studentQuery.data
  const summary = data?.summary || {}
  const twin = data?.learningTwin

  return (
    <div className="world-page">
      <Card className="p-6 sm:p-8">
        <Badge tone="accent">Student Detail</Badge>
        <h1 className="mt-4 font-display text-4xl font-black leading-none tracking-tight text-primary sm:text-6xl">
          {data?.student?.name || 'Loading student...'}
        </h1>
        <p className="mt-3 font-semibold text-secondary">{data?.student?.email}</p>
      </Card>

      <section className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          ['Started', summary.lessonsStarted || 0, Activity],
          ['Completed', summary.lessonsCompleted || 0, Trophy],
          ['Progress', `${summary.progress || 0}%`, Activity],
          ['Plays', summary.playCount || 0, Play],
          ['Pauses', summary.pauseCount || 0, Pause],
          ['Resumes', summary.resumeCount || 0, Play],
          ['Replays', summary.replayCount || 0, Repeat],
          ['Time Watched', secondsToMinutes(summary.totalWatchTime), Timer],
        ].map(([label, value, Icon]) => (
          <Card key={label} className="p-4">
            <Icon size={20} className="text-accent" strokeWidth={1.5} />
            <p className="mt-3 font-display text-2xl font-black text-primary">{value}</p>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
          </Card>
        ))}
      </section>

      {twin ? <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2"><Activity size={20} className="text-accent" /><h2 className="font-display text-2xl font-black text-primary">Learning Twin evidence</h2></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-elevated p-3"><p className="text-xs font-bold uppercase text-muted">Evidence score</p><p className="mt-1 text-2xl font-black text-primary">{twin.profile.knowledgeScore == null ? '—' : `${twin.profile.knowledgeScore}%`}</p></div>
            <div className="rounded-xl bg-elevated p-3"><p className="text-xs font-bold uppercase text-muted">Quiz attempts</p><p className="mt-1 text-2xl font-black text-primary">{twin.analytics.quizAttempts}</p></div>
            <div className="rounded-xl bg-elevated p-3"><p className="text-xs font-bold uppercase text-muted">Lessons started</p><p className="mt-1 text-2xl font-black text-primary">{twin.profile.lessonsStarted}</p></div>
            <div className="rounded-xl bg-elevated p-3"><p className="text-xs font-bold uppercase text-muted">Course tasks</p><p className="mt-1 text-2xl font-black text-primary">{twin.profile.taskProgress.completed}/{twin.profile.taskProgress.available}</p><p className="text-xs font-semibold text-secondary">{twin.profile.taskProgress.pending} pending</p></div>
          </div>
          <p className="mt-4 text-xs font-semibold text-muted">Derived from the same saved learning records shown in the student Twin. No independent or inferred student metrics are stored here.</p>
          <div className="mt-4 space-y-2">{twin.profile.subjects.map((subject) => <div key={subject.slug} className="flex items-center justify-between rounded-xl bg-elevated p-3 text-sm"><span className="font-bold text-primary">{subject.subject}</span><span className="font-black text-secondary">{subject.lessonsCompleted}/{subject.lessonsTotal} lessons · {subject.progressPercent}%</span></div>)}</div>
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-2xl font-black text-primary">Evidence-based learning gaps</h2>
          {twin.profile.weaknesses.length ? <div className="mt-4 space-y-2">{twin.profile.weaknesses.map((item) => <p key={item} className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-950">{item}</p>)}</div> : <p className="mt-4 text-sm font-semibold text-secondary">No weak topics have been recorded from quiz or learning activity evidence.</p>}
          {twin.recommendations.items.length ? <div className="mt-5 space-y-3">{twin.recommendations.items.map((item) => <div key={item.id} className="rounded-xl border border-app p-3"><p className="font-black text-primary">{item.title}</p><p className="mt-1 text-xs font-semibold text-secondary">{item.lessonTitle} · {item.reason}</p></div>)}</div> : null}
        </Card>
      </section> : null}

      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Play size={20} className="text-accent" strokeWidth={1.5} />
          <h2 className="font-display text-2xl font-black text-primary">Per-video activity</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {(data?.videoActivity || []).map((item) => (
            <div key={`${item.videoId}-${item.lessonId}`} className="rounded-2xl border border-app bg-elevated p-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-black text-primary">{item.lessonTitle}</p><p className="text-sm font-semibold text-secondary">{item.subject}</p></div>
                <Badge tone={item.plays ? 'success' : 'accent'}>{item.plays} plays</Badge>
              </div>
              <p className="mt-3 text-sm font-semibold text-secondary">
                {item.pauses} pauses · {item.resumes} resumes · {item.replays} replays · {secondsToMinutes(item.watchSeconds)} observed
              </p>
              <p className="mt-1 text-xs text-muted">Last position {Math.round(item.lastPosition || 0)}s · Last activity {item.lastActivity ? new Date(item.lastActivity).toLocaleString() : 'Unknown'}</p>
            </div>
          ))}
          {!data?.videoActivity?.length ? <EmptyState title="No video events recorded" message="Only activity captured after event tracking was added appears here. Existing lesson progress remains listed below." /> : null}
        </div>
      </Card>

      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Activity size={20} className="text-accent" strokeWidth={1.5} />
          <h2 className="font-display text-2xl font-black text-primary">Recent video sessions and events</h2>
        </div>
        <div className="divide-y divide-app">
          {(data?.recentVideoEvents || []).map((event) => (
            <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div><span className="font-black capitalize text-primary">{event.type.replace('_', ' ')}</span><span className="ml-2 font-semibold text-secondary">{event.lessonTitle} · {event.subject}</span></div>
              <div className="text-xs font-semibold text-muted">{event.sessionId.slice(0, 8)} · {Math.round(event.position || 0)}s · {event.createdAt ? new Date(event.createdAt).toLocaleString() : ''}</div>
            </div>
          ))}
          {!data?.recentVideoEvents?.length ? <EmptyState title="No event history yet" message="Activity recorded by the restored player will be listed here." /> : null}
        </div>
      </Card>

      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Clock size={20} className="text-accent" strokeWidth={1.5} />
          <h2 className="font-display text-2xl font-black text-primary">Per-lesson progress</h2>
        </div>
        <div className="space-y-3">
          {(data?.perLessonProgress || []).map((item) => (
            <div key={item.id} className="rounded-2xl border border-app bg-elevated p-4">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-black text-primary">{item.lessonTitle}</p>
                  <p className="text-sm font-semibold text-secondary">{item.subject}</p>
                </div>
                <p className="font-black text-primary">{item.watchPercentage}% watched</p>
              </div>
              <ProgressBar value={item.watchPercentage || 0} className="mt-3" />
              <div className="mt-3 grid gap-2 text-sm font-semibold text-secondary sm:grid-cols-5">
                <span>{item.completed ? 'Completed' : 'In progress'}</span>
                <span>{secondsToMinutes(item.observedWatchTime)} observed</span>
                <span>{secondsToMinutes(item.timeSpent)} unique coverage</span>
                <span>{item.pauseCount || 0} pauses</span>
                <span>{item.replayCount || 0} replays</span>
              </div>
            </div>
          ))}
          {!data?.perLessonProgress?.length ? <EmptyState title="No lesson activity yet" message="This student has not started tracked programming lessons yet." /> : null}
        </div>
      </Card>
    </div>
  )
}

export default AdminStudentDetailPage
