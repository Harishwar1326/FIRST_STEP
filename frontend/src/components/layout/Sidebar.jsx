import { NavLink } from 'react-router-dom'
import {
  BookOpen,
  Brain,
  Code2,
  FlaskConical,
  GraduationCap,
  Home,
  Leaf,
  Sparkles,
  LogOut,
  Moon,
  Palette,
  Sun,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/smart-notes', icon: Palette, label: 'Smart Notes' },
  { path: '/learning-assessment', icon: Sparkles, label: 'Learning Profile' },
  { path: '/learning-twin', icon: Brain, label: 'Learning Twin' },
  { path: '/learning-academy', icon: GraduationCap, label: 'Learning Academy' },
  { path: '/knowledge-forest', icon: Leaf, label: 'Knowledge Forest' },
  { path: '/thinking-lab', icon: FlaskConical, label: 'Thinking Lab' },
  { path: '/programming-learning', icon: Code2, label: 'Programming' },
]

const adminNavItems = [
  { path: '/admin', icon: BookOpen, label: 'Admin' },
  { path: '/admin/content', icon: Code2, label: 'Content' },
]

const SidebarLink = ({ item }) => (
  <NavLink
    to={item.path}
    className={({ isActive }) => `
      group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-bold transition
      ${isActive
        ? 'border-accent bg-accent/15 text-primary'
        : 'border-transparent text-secondary hover:border-app hover:bg-elevated hover:text-primary'
      }
    `}
    title={item.label}
  >
    {({ isActive }) => (
      <>
        <span className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent transition ${isActive ? 'opacity-100' : 'opacity-0'}`} />
        <item.icon size={20} strokeWidth={1.5} className="shrink-0" />
        <span className="whitespace-nowrap opacity-0 transition group-hover/sidebar:opacity-100">{item.label}</span>
      </>
    )}
  </NavLink>
)

const Sidebar = () => {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const visibleNavItems = user?.role === 'admin' ? [...adminNavItems, ...navItems] : navItems
  const mobileItems = visibleNavItems.slice(0, 5)

  return (
    <>
      <aside className="group/sidebar sticky top-0 z-40 hidden h-screen w-[72px] shrink-0 flex-col border-r border-app bg-surface transition-[width] duration-300 hover:w-64 lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-app px-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent font-display text-sm font-black text-white">
            FS
          </div>
          <div className="min-w-0 opacity-0 transition group-hover/sidebar:opacity-100">
            <p className="font-display text-sm font-black text-primary">FirstStep</p>
            <p className="text-[11px] font-semibold text-muted">Next step learning</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visibleNavItems.map((item) => (
            <SidebarLink key={item.path} item={item} />
          ))}
        </nav>

        <div className="space-y-1 border-t border-app p-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-bold text-secondary transition hover:border-app hover:bg-elevated hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
          >
            {theme === 'dark' ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
            <span className="whitespace-nowrap opacity-0 transition group-hover/sidebar:opacity-100">
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-bold text-secondary transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
          >
            <LogOut size={20} strokeWidth={1.5} />
            <span className="whitespace-nowrap opacity-0 transition group-hover/sidebar:opacity-100">Logout</span>
          </button>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-app bg-surface/95 px-2 py-2 backdrop-blur lg:hidden" aria-label="Mobile navigation">
        {mobileItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-black ${isActive ? 'text-primary' : 'text-muted'}`}
          >
            <item.icon size={19} strokeWidth={1.5} />
            <span className="max-w-full truncate">{item.label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}

export default Sidebar
