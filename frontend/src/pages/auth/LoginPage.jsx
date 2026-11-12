import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Lock, Mail, Sparkles, Zap } from 'lucide-react'
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
      const user = await login(email, password)
      navigate(user?.role === 'admin' ? '/admin' : '/')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page min-h-screen p-4 sm:p-6">
      <div className="auth-layout mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_430px]">
        <section className="auth-story hidden lg:block">
          <div className="auth-story-mark"><Sparkles size={18} /> FirstStep / 01</div>
          <h1 className="mt-6 font-display text-6xl font-black leading-[.95] text-primary xl:text-7xl">
            Keep your<br /><span>curiosity</span> in motion.
          </h1>
          <p className="mt-6 max-w-xl text-xl font-semibold leading-8 text-secondary">
            One focused session, one useful idea, one confident next step.
          </p>
          <div className="auth-story-grid mt-12">
            <div className="auth-story-tile auth-story-tile-coral"><BookOpen size={30} /><strong>Learn</strong><span>Build a clear path.</span></div>
            <div className="auth-story-tile auth-story-tile-mint"><Sparkles size={30} /><strong>Explore</strong><span>Make connections.</span></div>
            <div className="auth-story-tile auth-story-tile-sun"><Zap size={30} /><strong>Practice</strong><span>Turn ideas into skill.</span></div>
          </div>
        </section>

        <section className="auth-card rounded-[2rem] p-7 sm:p-9">
          <div className="mb-8">
            <div className="auth-logo"><Sparkles size={24} /></div>
            <p className="mt-7 text-[11px] font-black uppercase tracking-[.2em] text-accent">Welcome back</p>
            <h1 className="mt-2 font-display text-4xl font-black text-primary">Ready for today?</h1>
            <p className="mt-3 font-semibold leading-6 text-secondary">Sign in and pick up your learning momentum.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-primary">Email address</span>
              <div className="auth-field auth-field-coral flex items-center gap-3 rounded-2xl px-4 py-3.5">
                <Mail size={20} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent text-base font-semibold text-primary outline-none placeholder:text-muted" placeholder="you@example.com" required />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-primary">Password</span>
              <div className="auth-field auth-field-mint flex items-center gap-3 rounded-2xl px-4 py-3.5">
                <Lock size={20} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent text-base font-semibold text-primary outline-none placeholder:text-muted" placeholder="Your password" required />
              </div>
            </label>

            {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-600">{error}</div>}

            <button type="submit" disabled={loading} className="auth-submit w-full rounded-2xl py-4 text-base font-black text-white disabled:opacity-60">
              {loading ? 'Opening your space...' : 'Continue learning'}
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <p className="mt-8 text-center text-sm font-semibold text-secondary">
            New here?{' '}
            <Link to="/register" className="font-black text-accent underline decoration-2 underline-offset-4">Create your account</Link>
          </p>
        </section>
      </div>
    </div>
  )
}

export default LoginPage
