import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Leaf, Lock, Mail, Play } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-transparent p-4">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_440px]">
        <section className="journey-page hidden lg:block">
          <span className="story-label">
            <Leaf size={14} />
            Welcome back
          </span>
          <h1 className="mt-6 text-5xl font-black leading-tight text-stone-950">Your next lesson is waiting on the trail.</h1>
          <p className="mt-5 max-w-xl text-lg font-medium leading-8 text-stone-600">
            Pick up where you stopped, continue your daily mission, or ask your mentor what to revise first.
          </p>
          <div className="relative mt-12 h-64">
            <div className="absolute left-8 top-8 flex h-24 w-24 animate-bob items-center justify-center rounded-[2rem] bg-emerald-200 leaf-shadow">
              <BookOpen size={38} className="text-emerald-900" />
            </div>
            <div className="absolute right-16 top-24 flex h-32 w-32 animate-float-gentle items-center justify-center rounded-full bg-amber-200 shadow-xl">
              <Play size={44} className="text-amber-900" />
            </div>
          </div>
        </section>

        <section className="floating-island bg-white/78 p-7 sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-emerald-200 to-amber-200 leaf-shadow">
              <Leaf size={30} className="text-emerald-900" />
            </div>
            <h1 className="mt-5 text-3xl font-black text-stone-950">Sign in to FirstStep</h1>
            <p className="mt-2 text-sm font-semibold text-stone-500">Continue your learning journey.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-stone-700">Email</span>
              <div className="flex items-center gap-3 rounded-[1.4rem] border border-amber-100 bg-amber-50/70 px-4 py-3 focus-within:ring-4 focus-within:ring-amber-200">
                <Mail size={18} className="text-stone-500" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent font-semibold text-stone-800 outline-none placeholder:text-stone-400" placeholder="you@example.com" required />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-stone-700">Password</span>
              <div className="flex items-center gap-3 rounded-[1.4rem] border border-amber-100 bg-amber-50/70 px-4 py-3 focus-within:ring-4 focus-within:ring-amber-200">
                <Lock size={18} className="text-stone-500" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent font-semibold text-stone-800 outline-none placeholder:text-stone-400" placeholder="********" required />
              </div>
            </label>

            {error && <div className="rounded-[1.2rem] border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

            <button type="submit" disabled={loading} className="organic-button w-full disabled:opacity-60">
              {loading ? 'Opening journey...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-7 text-center text-sm font-semibold text-stone-500">
            New here?{' '}
            <Link to="/register" className="font-black text-emerald-700 hover:text-emerald-900">
              Create your path
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}

export default LoginPage
