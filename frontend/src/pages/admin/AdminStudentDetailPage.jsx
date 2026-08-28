import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { Activity, Clock, Pause, Repeat, Timer, Trophy } from 'lucide-react'
import { adminService } from '../../services/adminService'

const AdminStudentDetailPage = () => {
  const { id } = useParams()
  const studentQuery = useQuery({ queryKey: ['admin-student', id], queryFn: () => adminService.getStudent(id), enabled: Boolean(id) })
  const data = studentQuery.data
  const summary = data?.summary || {}

  return (
    <div className="world-page bg-[linear-gradient(135deg,#fff7ed_0%,#ecfeff_48%,#f7fee7_100%)]">
      <section className="floating-island">
        <span className="story-label">Student Detail</span>
        <h1 className="mt-3 text-4xl font-black text-stone-950">{data?.student?.name || 'Loading student...'}</h1>
        <p className="mt-2 font-semibold text-stone-600">{data?.student?.email}</p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-6">
        {[
          ['Started', summary.lessonsStarted || 0, Activity],
          ['Completed', summary.lessonsCompleted || 0, Trophy],
          ['Progress', `${summary.progress || 0}%`, Activity],
          ['Pauses', summary.pauseCount || 0, Pause],
          ['Replays', summary.replayCount || 0, Repeat],
          ['Time Watched', secondsToMinutes(summary.totalWatchTime), Timer],
        ].map(([label, value, Icon]) => (
          <div key={label} className="floating-island p-4">
            <Icon size={20} className="text-orange-700" />
            <p className="mt-3 text-2xl font-black text-stone-950">{value}</p>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">{label}</p>
          </div>
        ))}
      </section>

      <section className="floating-island mt-6">
        <div className="mb-4 flex items-center gap-2">
          <Clock size={20} />
          <h2 className="text-2xl font-black text-stone-950">Per-lesson progress</h2>
        </div>
        <div className="space-y-3">
          {(data?.perLessonProgress || []).map((item) => (
            <div key={item.id} className="rounded-[1.2rem] bg-white/70 p-4">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <p className="font-black text-stone-950">{item.lessonTitle}</p>
                  <p className="text-sm font-semibold text-stone-500">{item.subject}</p>
                </div>
                <p className="font-black text-emerald-800">{item.watchPercentage}% watched</p>
              </div>
              <div className="mt-3 grid gap-2 text-sm font-semibold text-stone-600 sm:grid-cols-4">
                <span>{item.completed ? 'Completed' : 'In progress'}</span>
                <span>{secondsToMinutes(item.timeSpent)}</span>
                <span>{item.pauseCount || 0} pauses</span>
                <span>{item.replayCount || 0} replays</span>
              </div>
            </div>
          ))}
          {!data?.perLessonProgress?.length ? <p className="font-bold text-stone-500">No lesson activity yet.</p> : null}
        </div>
      </section>
    </div>
  )
}

const secondsToMinutes = (seconds = 0) => `${Math.round((Number(seconds) || 0) / 60)} min`

export default AdminStudentDetailPage
