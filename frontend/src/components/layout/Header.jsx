import { useEffect, useMemo, useState } from 'react'
import { Bell, Check, Command, Flame, Search, User, UserPlus, LogIn, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { adminService } from '../../services/adminService'
import IconButton from '../ui/IconButton'

const commandItems = [
  { label: 'Home', path: '/', keywords: 'dashboard today missions progress' },
  { label: 'Smart Notes', path: '/smart-notes', keywords: 'notes flashcards mindmap tldraw documents' },
  { label: 'Learning Profile', path: '/learning-assessment', keywords: 'learning dna assessment profile roadmap' },
  { label: 'Learning Twin', path: '/learning-twin', keywords: 'analytics mentor profile weak concepts' },
  { label: 'Learning Academy', path: '/learning-academy', keywords: 'study plan flashcards streak mission' },
  { label: 'Knowledge Forest', path: '/knowledge-forest', keywords: 'concept graph knowledge map gaps' },
  { label: 'Thinking Lab', path: '/thinking-lab', keywords: 'challenge logic critical thinking' },
  { label: 'Programming', path: '/programming-learning', keywords: 'code lessons java python c videos quiz' },
  { label: 'Admin', path: '/admin', keywords: 'students analytics operations' },
  { label: 'Content', path: '/admin/content', keywords: 'lessons curriculum admin content' },
]

const titleByPath = {
  '/': 'Home',
  '/smart-notes': 'Smart Notes',
  '/learning-assessment': 'Learning Profile',
  '/learning-twin': 'Learning Twin',
  '/learning-academy': 'Learning Academy',
  '/knowledge-forest': 'Knowledge Forest',
  '/thinking-lab': 'Thinking Lab',
  '/programming-learning': 'Programming',
  '/admin': 'Admin',
  '/admin/content': 'Content Management',
}

const Header = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [query, setQuery] = useState('')
  const [activeToast, setActiveToast] = useState(null)
  const [prevNotifId, setPrevNotifId] = useState(null)

  const isAdmin = user?.role === 'admin'

  // Fetch notifications for Admin with fast 3s polling
  const notifQuery = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: adminService.getNotifications,
    enabled: Boolean(isAdmin),
    refetchInterval: 3000, // Poll every 3 seconds for near-instant alerts
  })

  const markReadMutation = useMutation({
    mutationFn: adminService.markNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['admin-summary'] })
    },
  })

  const notifications = notifQuery.data?.notifications || []
  const unreadCount = notifQuery.data?.unreadCount || 0

  // Trigger floating Toast alert popup whenever a new unread notification arrives
  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0]
      if (latest && !latest.read && latest.id !== prevNotifId) {
        setActiveToast(latest)
        setPrevNotifId(latest.id)
        const timer = setTimeout(() => setActiveToast(null), 6000)
        return () => clearTimeout(timer)
      }
    }
  }, [notifications, prevNotifId])

  const pageTitle = titleByPath[location.pathname] || 'FirstStep'
  const filteredItems = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return commandItems
    return commandItems.filter((item) => `${item.label} ${item.keywords}`.toLowerCase().includes(value))
  }, [query])

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
      if (event.key === 'Escape') {
        setOpen(false)
        setShowNotifs(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const goTo = (path) => {
    navigate(path)
    setOpen(false)
    setQuery('')
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-app bg-app/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">FirstStep</p>
            <h1 className="truncate font-display text-xl font-black tracking-tight text-primary">{pageTitle}</h1>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="hidden h-11 min-w-0 max-w-xl flex-1 items-center gap-3 rounded-2xl border border-app bg-surface px-4 text-left text-sm text-secondary transition hover:border-accent hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 md:flex"
          >
            <Search size={18} strokeWidth={1.5} />
            <span className="flex-1 truncate">Search FirstStep...</span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-app bg-elevated px-2 py-1 text-[11px] font-black text-muted">
              <Command size={12} strokeWidth={1.5} /> K
            </span>
          </button>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-xl border border-app bg-surface px-3 py-2 text-sm font-black text-primary sm:flex" title="Current streak">
              <Flame size={17} className="text-success" strokeWidth={1.5} />
              <span>0</span>
            </div>
            <IconButton label="Open search" className="md:hidden" onClick={() => setOpen(true)}>
              <Search size={18} strokeWidth={1.5} />
            </IconButton>

            {/* Notification Bell with Badge & Dropdown */}
            <div className="relative">
              <IconButton
                label="Notifications"
                onClick={() => setShowNotifs((prev) => !prev)}
                className="relative"
              >
                <Bell size={18} strokeWidth={1.5} />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-black text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </IconButton>

              {/* Notification Overlay Popover */}
              {showNotifs ? (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border border-app bg-surface shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between border-b border-app p-4">
                    <div className="flex items-center gap-2">
                      <Bell size={16} className="text-accent" strokeWidth={2} />
                      <span className="font-bold text-primary">Notifications</span>
                      {unreadCount > 0 ? (
                        <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-black text-accent">
                          {unreadCount} unread
                        </span>
                      ) : null}
                    </div>
                    {unreadCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => markReadMutation.mutate([])}
                        className="flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                      >
                        <Check size={14} /> Mark all read
                      </button>
                    ) : null}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-app">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 transition hover:bg-elevated ${!notif.read ? 'bg-accent/5' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg ${notif.type === 'student_register' ? 'bg-success/15 text-success' : 'bg-accent/15 text-accent'}`}>
                            {notif.type === 'student_register' ? <UserPlus size={14} /> : <LogIn size={14} />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-primary">{notif.title}</p>
                            <p className="mt-1 text-xs leading-5 text-secondary">{notif.message}</p>
                            <span className="mt-1 block text-[10px] font-semibold text-muted">
                              {new Date(notif.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {!notifications.length ? (
                      <div className="p-6 text-center text-xs font-semibold text-secondary">
                        No notifications yet. Student logins & registrations will trigger notifications here.
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex h-10 items-center gap-2 rounded-xl border border-app bg-surface py-1 pl-1 pr-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
                <User size={16} strokeWidth={1.5} />
              </span>
              <span className="hidden max-w-28 truncate text-sm font-bold text-primary sm:block">{user?.name || 'Student'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Floating Real-Time Admin Notification Toast Alert Banner */}
      {activeToast && isAdmin ? (
        <div className="fixed top-20 right-4 z-50 max-w-sm rounded-2xl border border-accent/40 bg-surface/95 p-4 shadow-2xl backdrop-blur transition-all duration-300">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-lg shadow-accent/30">
              <Bell size={18} className="animate-bounce" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display font-black text-xs uppercase tracking-wider text-accent">🔔 Real-time Admin Alert</p>
                <button
                  type="button"
                  onClick={() => setActiveToast(null)}
                  className="rounded-lg p-1 text-muted hover:bg-elevated hover:text-primary transition"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="mt-1 font-bold text-sm text-primary">{activeToast.title}</p>
              <p className="mt-0.5 text-xs text-secondary leading-snug">{activeToast.message}</p>
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Command palette">
          <div className="mx-auto mt-16 max-w-2xl overflow-hidden rounded-2xl border border-app bg-surface shadow-2xl">
            <div className="flex items-center gap-3 border-b border-app p-4">
              <Search size={18} className="text-secondary" strokeWidth={1.5} />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Navigate pages, lessons, notes, missions..."
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-primary outline-none placeholder:text-muted"
              />
              <IconButton label="Close search" onClick={() => setOpen(false)} className="h-9 w-9">
                <X size={17} strokeWidth={1.5} />
              </IconButton>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {filteredItems.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => goTo(item.path)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition hover:bg-elevated focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
                >
                  <span>
                    <span className="block font-bold text-primary">{item.label}</span>
                    <span className="block text-xs text-muted">{item.keywords}</span>
                  </span>
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-muted">Open</span>
                </button>
              ))}
              {!filteredItems.length ? <p className="p-5 text-center text-sm font-semibold text-secondary">No matching command found.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default Header
