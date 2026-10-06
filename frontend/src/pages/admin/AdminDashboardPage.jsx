import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Activity, Bell, BookOpen, Check, Clock, LogIn, Search, UserPlus, Users } from 'lucide-react'
import { adminService } from '../../services/adminService'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import ProgressBar from '../../components/ui/ProgressBar'
import Button from '../../components/ui/Button'
import SectionHeader from '../../components/ui/SectionHeader'

const metricCards = [
  ['Students', 'totalStudents', Users],
  ['Active', 'activeStudents', Activity],
  ['Lessons', 'totalLessons', BookOpen],
  ['Completed', 'lessonsCompleted', Clock],
  ['Avg Progress', 'averageStudentProgress', Activity],
]

const secondsToMinutes = (seconds = 0) => `${Math.round((Number(seconds) || 0) / 60)} min`

const AdminDashboardPage = () => {
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const summaryQuery = useQuery({ queryKey: ['admin-summary'], queryFn: adminService.getSummary })
  const studentsQuery = useQuery({
    queryKey: ['admin-students', search],
    queryFn: () => adminService.getStudents({ search }),
  })

  // Notifications and Activities queries for real-time auth feed
  const notifQuery = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: adminService.getNotifications,
    refetchInterval: 3000, // Poll every 3 seconds for instant updates
  })

  const activitiesQuery = useQuery({
    queryKey: ['admin-activities'],
    queryFn: adminService.getActivities,
    refetchInterval: 3000,
  })

  const markReadMutation = useMutation({
    mutationFn: adminService.markNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['admin-summary'] })
    },
  })

  const summary = summaryQuery.data || {}
  const students = studentsQuery.data?.students || []
  const notifications = notifQuery.data?.notifications || []
  const unreadCount = notifQuery.data?.unreadCount || 0
  const activities = activitiesQuery.data?.activities || []

  return (
    <div className="world-page">
      <section className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Badge tone="accent">Faculty / Admin Dashboard</Badge>
          <h1 className="mt-4 font-display text-4xl font-black leading-none tracking-tight text-primary sm:text-6xl">
            Student operations.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-secondary">
            Monitor real-time student registrations, logins, activity events, and overall learning progress.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button as={Link} to="/admin/content" variant="secondary" size="sm">
            <BookOpen size={16} strokeWidth={1.5} />
            Content management
          </Button>
          <label className="flex items-center gap-2 rounded-2xl border border-app bg-surface px-4 py-3 lg:min-w-80">
            <Search size={17} className="text-muted" strokeWidth={1.5} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search students"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-primary outline-none placeholder:text-muted"
            />
          </label>
        </div>
      </section>

      {/* Metric Summary Cards */}
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {metricCards.map(([label, key, Icon]) => (
          <Card key={key} className="p-4">
            <Icon size={20} className="text-accent" strokeWidth={1.5} />
            <p className="mt-3 font-display text-3xl font-black text-primary">
              {key === 'averageStudentProgress' ? `${summary[key] || 0}%` : summary[key] || 0}
            </p>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
          </Card>
        ))}
      </section>

      {/* Real-Time Notifications & Activity Stream Grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* 🔔 Admin Notifications Section */}
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-app p-5">
            <div className="flex items-center gap-2">
              <Bell className="text-accent" size={20} strokeWidth={2} />
              <SectionHeader eyebrow="Real-time Alerts" title="🔔 Admin Notifications" />
            </div>
            {unreadCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markReadMutation.mutate([])}
                className="text-xs font-bold text-accent"
              >
                <Check size={14} /> Mark all as read ({unreadCount})
              </Button>
            ) : null}
          </div>
          <div className="divide-y divide-app max-h-80 overflow-y-auto">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 transition hover:bg-elevated ${!notif.read ? 'bg-accent/5' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1 flex h-8 w-8 items-center justify-center rounded-xl ${notif.type === 'student_register' ? 'bg-success/15 text-success' : 'bg-accent/15 text-accent'}`}>
                    {notif.type === 'student_register' ? <UserPlus size={16} /> : <LogIn size={16} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm text-primary">{notif.title}</p>
                      {!notif.read ? <Badge tone="accent">New</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-secondary leading-relaxed">{notif.message}</p>
                    <p className="mt-2 text-[10px] font-semibold text-muted">
                      {new Date(notif.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {!notifications.length ? (
              <div className="p-8">
                <EmptyState
                  title="No notifications yet"
                  message="When students register or log in, system notifications will appear here in real-time."
                />
              </div>
            ) : null}
          </div>
        </Card>

        {/* ⚡ Student Activity Log Feed */}
        <Card className="p-0 overflow-hidden">
          <div className="border-b border-app p-5">
            <div className="flex items-center gap-2">
              <Activity className="text-success" size={20} strokeWidth={2} />
              <SectionHeader eyebrow="Auth & Activity Log" title="⚡ Student Activity Event Stream" />
            </div>
          </div>
          <div className="divide-y divide-app max-h-80 overflow-y-auto">
            {activities.map((act) => (
              <div key={act.id} className="p-4 hover:bg-elevated transition">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${act.type === 'register' ? 'bg-success/15 text-success' : 'bg-accent/15 text-accent'}`}>
                      {act.type === 'register' ? <UserPlus size={16} /> : <LogIn size={16} />}
                    </span>
                    <div>
                      <p className="text-sm font-black text-primary">{act.studentName}</p>
                      <p className="text-xs text-secondary">{act.action}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge tone={act.type === 'register' ? 'success' : 'accent'}>
                      {act.type.toUpperCase()}
                    </Badge>
                    <p className="mt-1 text-[10px] font-semibold text-muted">
                      {new Date(act.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {!activities.length ? (
              <div className="p-8">
                <EmptyState
                  title="No activity events recorded"
                  message="Student authentication activity events will populate here."
                />
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      {/* Main Student Operations Table */}
      <Card className="mt-6 overflow-hidden p-0">
        <div className="border-b border-app p-5">
          <SectionHeader eyebrow="Student Directory" title="Enrolled Students & Progress" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-app bg-elevated text-xs font-black uppercase tracking-[0.12em] text-muted">
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
                <tr key={student.id} className="border-t border-app">
                  <td className="p-4 font-black text-primary">
                    <Link className="hover:text-accent" to={`/admin/students/${student.id}`}>{student.name}</Link>
                  </td>
                  <td className="p-4 font-semibold text-secondary">{student.email}</td>
                  <td className="p-4 font-semibold text-secondary">{student.lessonsStarted || 0}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="w-10 font-black text-primary">{student.progress || 0}%</span>
                      <ProgressBar value={student.progress || 0} className="w-28" />
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-secondary">{student.lessonsCompleted || 0}</td>
                  <td className="p-4 font-semibold text-secondary">{secondsToMinutes(student.totalWatchTime)}</td>
                  <td className="p-4 font-semibold text-secondary">{student.lastActivity ? new Date(student.lastActivity).toLocaleString() : 'No activity'}</td>
                </tr>
              ))}
              {!students.length ? (
                <tr>
                  <td colSpan="7" className="p-8">
                    <EmptyState title="No students found" message="Try a different search term or wait for students to register." />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default AdminDashboardPage
