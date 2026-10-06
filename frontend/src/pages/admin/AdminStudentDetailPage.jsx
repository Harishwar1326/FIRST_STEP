import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { Activity, Clock, Pause, Repeat, Timer, Trophy } from 'lucide-react'
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
          ['Pauses', summary.pauseCount || 0, Pause],
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
              <div className="mt-3 grid gap-2 text-sm font-semibold text-secondary sm:grid-cols-4">
                <span>{item.completed ? 'Completed' : 'In progress'}</span>
                <span>{secondsToMinutes(item.timeSpent)}</span>
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
