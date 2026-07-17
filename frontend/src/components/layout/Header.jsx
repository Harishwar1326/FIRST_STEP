import { Bell, Leaf, Search, Sparkles, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const Header = () => {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-[#fff8e8]/82 backdrop-blur-2xl">
      <div className="mx-auto flex h-20 max-w-[1480px] items-center justify-between gap-4 px-3 sm:px-5 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[1.3rem] bg-gradient-to-br from-emerald-300 to-amber-200 leaf-shadow">
            <Leaf size={24} className="text-emerald-900" />
          </div>
          <div>
            <p className="text-xl font-black leading-tight text-stone-900">FirstStep</p>
            <p className="hidden text-xs font-semibold text-stone-500 sm:block">Your learning journey for today</p>
          </div>
        </div>

        <label className="hidden min-w-0 flex-1 items-center gap-3 rounded-full border border-white/70 bg-white/70 px-4 py-3 shadow-sm md:flex md:max-w-xl">
          <Search size={18} className="shrink-0 text-stone-500" />
          <input
            type="text"
            placeholder="Find a chapter, concept, mission..."
            className="w-full bg-transparent text-sm font-medium text-stone-800 outline-none placeholder:text-stone-400"
          />
        </label>

        <div className="flex items-center gap-2 sm:gap-3">
          <button className="soft-button hidden sm:inline-flex" aria-label="Daily spark">
            <Sparkles size={17} className="text-amber-600" />
            <span>Daily Spark</span>
          </button>
          <button className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/70 text-stone-600 shadow-sm transition hover:bg-white" aria-label="Notifications">
            <Bell size={19} />
          </button>
          <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/75 py-1.5 pl-1.5 pr-3 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-300 to-emerald-300">
              <User size={17} className="text-stone-800" />
            </div>
            <div className="hidden sm:block">
              <p className="max-w-28 truncate text-sm font-bold text-stone-900">{user?.name || 'Student'}</p>
              <p className="text-xs font-semibold text-emerald-700">{user?.level || 'Beginner'} path</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
