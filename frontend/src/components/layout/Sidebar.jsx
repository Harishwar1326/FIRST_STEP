import { NavLink } from 'react-router-dom'
import {
  BookOpen,
  Brain,
  FlaskConical,
  GraduationCap,
  Code2,
  Leaf,
  LogOut,
  Map,
  Palette
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const navItems = [
  { path: '/', icon: Map, label: 'Today Trail', tone: 'from-amber-200 to-orange-200' },
  { path: '/programming-learning', icon: Code2, label: 'Code Lessons', tone: 'from-cyan-200 to-lime-100' },
  { path: '/smart-notes', icon: Palette, label: 'Notes Studio', tone: 'from-pink-200 to-amber-100' },
  { path: '/learning-twin', icon: Brain, label: 'Mentor Twin', tone: 'from-sky-200 to-indigo-100' },
  { path: '/learning-academy', icon: GraduationCap, label: 'Mission Center', tone: 'from-yellow-200 to-lime-100' },
  { path: '/knowledge-forest', icon: Leaf, label: 'Knowledge Garden', tone: 'from-emerald-200 to-teal-100' },
  { path: '/thinking-lab', icon: FlaskConical, label: 'Challenge Zone', tone: 'from-violet-200 to-rose-100' },
]

const adminNavItems = [
  { path: '/admin', icon: Map, label: 'Admin Dashboard', tone: 'from-emerald-200 to-cyan-100' },
]

const Sidebar = () => {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const visibleNavItems = user?.role === 'admin' ? [...adminNavItems, ...navItems] : navItems

  return (
    <aside className="sticky top-24 hidden h-[calc(100vh-7rem)] w-72 shrink-0 flex-col rounded-[2rem] border border-white/70 bg-white/60 p-4 shadow-[0_24px_80px_rgba(83,68,35,0.12)] backdrop-blur-2xl lg:flex">
      <div className="floating-island mb-4 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <BookOpen size={22} className="text-emerald-800" />
          </div>
          <div>
            <p className="text-sm font-black text-stone-900">Classroom to career</p>
            <p className="text-xs font-medium text-stone-500">Board exams, college, skills</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              group flex items-center gap-3 rounded-[1.4rem] px-3 py-3 text-sm font-bold transition duration-300
              ${isActive
                ? `bg-gradient-to-r ${item.tone} text-stone-950 shadow-[0_14px_34px_rgba(96,76,35,0.14)]`
                : 'text-stone-600 hover:bg-white/70 hover:text-stone-950'
              }
            `}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 transition group-hover:scale-105">
              <item.icon size={19} />
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 space-y-2 border-t border-white/70 pt-4">
        <button
          onClick={toggleTheme}
          className="soft-button w-full justify-start"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
            {theme === 'dark' ? 'L' : 'D'}
          </span>
          <span>{theme === 'dark' ? 'Light Journey' : 'Focus Evening'}</span>
        </button>
        <button
          onClick={logout}
          className="soft-button w-full justify-start text-red-700"
        >
          <LogOut size={18} />
          <span>Leave Journey</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
