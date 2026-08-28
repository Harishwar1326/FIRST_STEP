import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Activity, BookOpen, Clock, Search, Users } from 'lucide-react'
import { adminService } from '../../services/adminService'

const metricCards = [
  ['Total Students', 'totalStudents', Users],
  ['Active Students', 'activeStudents', Activity],
  ['Total Lessons', 'totalLessons', BookOpen],
  ['Lessons Completed', 'lessonsCompleted', Clock],
  ['Avg Progress', 'averageStudentProgress', Activity],
]

const secondsToMinutes = (seconds = 0) => `${Math.round((Number(seconds) || 0) / 60)} min`

const AdminDashboardPage = () => {
  const [search, setSearch] = useState('')
  const summaryQuery = useQuery({ queryKey: ['admin-summary'], queryFn: adminService.getSummary })
  const studentsQuery = useQuery({
    queryKey: ['admin-students', search],
    queryFn: () => adminService.getStudents({ search }),
  })

  const summary = summaryQuery.data || {}
  const students = studentsQuery.data?.students || []

  return (
    <div className="world-page bg-[linear-gradient(135deg,#fff7ed_0%,#ecfeff_48%,#f7fee7_100%)]">
      <section className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <span className="story-label">Admin Console</span>
          <h1 className="mt-3 text-4xl font-black text-stone-950">Learning analytics and students</h1>
        </div>
        <label className="flex items-center gap-2 rounded-full bg-white/75 px-4 py-3 shadow-sm">
          <Search size={17} className="text-stone-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search students"
            className="bg-transparent text-sm font-semibold outline-none"
          />
        </label>
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {metricCards.map(([label, key, Icon]) => (
          <div key={key} className="floating-island p-4">
            <Icon size={20} className="text-emerald-700" />
            <p className="mt-3 text-2xl font-black text-stone-950">
              {key === 'averageStudentProgress' ? `${summary[key] || 0}%` : summary[key] || 0}
            </p>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">{label}</p>
          </div>
        ))}
      </section>

      <section className="floating-island mt-6 overflow-hidden p-0">
        <div className="border-b border-white/70 p-5">
          <h2 className="text-2xl font-black text-stone-950">Students</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-white/55 text-xs font-black uppercase tracking-[0.12em] text-stone-500">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Started</th>
                <th className="p-4">Progress</th>
                <th className="p-4">Completed</th>
                <th className="p-4">Watch Time</th>
                <th className="p-4">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-t border-white/70">
                  <td className="p-4 font-black text-stone-950">
                    <Link className="hover:text-emerald-700" to={`/admin/students/${student.id}`}>{student.name}</Link>
                  </td>
                  <td className="p-4 font-semibold text-stone-600">{student.email}</td>
                  <td className="p-4 font-semibold text-stone-700">{student.lessonsStarted || 0}</td>
                  <td className="p-4 font-black text-stone-900">{student.progress || 0}%</td>
                  <td className="p-4 font-semibold text-stone-700">{student.lessonsCompleted || 0}</td>
                  <td className="p-4 font-semibold text-stone-700">{secondsToMinutes(student.totalWatchTime)}</td>
                  <td className="p-4 font-semibold text-stone-600">{student.lastActivity ? new Date(student.lastActivity).toLocaleString() : 'No activity'}</td>
                </tr>
              ))}
              {!students.length ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center font-bold text-stone-500">No students found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default AdminDashboardPage
