import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Leaf, Lock, Mail, UserRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const RegisterPage = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await register({ name: formData.name, email: formData.email, password: formData.password })
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full bg-transparent font-semibold text-stone-800 outline-none placeholder:text-stone-400'

  return (
    <div className="min-h-screen bg-transparent p-4">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="floating-island bg-white/78 p-7 sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-emerald-200 to-amber-200 leaf-shadow">
              <Leaf size={30} className="text-emerald-900" />
            </div>
            <h1 className="mt-5 text-3xl font-black text-stone-950">Create your learning path</h1>
            <p className="mt-2 text-sm font-semibold text-stone-500">Start with one step. The journey will grow with you.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-stone-700">Full name</span>
              <div className="flex items-center gap-3 rounded-[1.4rem] border border-emerald-100 bg-emerald-50/70 px-4 py-3 focus-within:ring-4 focus-within:ring-emerald-200">
                <UserRound size={18} className="text-stone-500" />
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} placeholder="Your name" required />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-stone-700">Email</span>
              <div className="flex items-center gap-3 rounded-[1.4rem] border border-emerald-100 bg-emerald-50/70 px-4 py-3 focus-within:ring-4 focus-within:ring-emerald-200">
                <Mail size={18} className="text-stone-500" />
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputClass} placeholder="you@example.com" required />
              </div>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-stone-700">Password</span>
                <div className="flex items-center gap-3 rounded-[1.4rem] border border-emerald-100 bg-emerald-50/70 px-4 py-3 focus-within:ring-4 focus-within:ring-emerald-200">
                  <Lock size={18} className="text-stone-500" />
                  <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={inputClass} placeholder="********" required />
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-black text-stone-700">Confirm</span>
                <div className="flex items-center gap-3 rounded-[1.4rem] border border-emerald-100 bg-emerald-50/70 px-4 py-3 focus-within:ring-4 focus-within:ring-emerald-200">
                  <Lock size={18} className="text-stone-500" />
                  <input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} className={inputClass} placeholder="********" required />
                </div>
              </label>
            </div>

            {error && <div className="rounded-[1.2rem] border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

            <button type="submit" disabled={loading} className="organic-button w-full disabled:opacity-60">
              {loading ? 'Planting your path...' : 'Start learning'}
            </button>
          </form>

          <p className="mt-7 text-center text-sm font-semibold text-stone-500">
            Already on the trail?{' '}
            <Link to="/login" className="font-black text-emerald-700 hover:text-emerald-900">Sign in</Link>
          </p>
        </motion.section>

        <section className="journey-page hidden lg:block">
          <span className="story-label">Built for Indian learners</span>
          <h2 className="mt-6 text-5xl font-black leading-tight text-stone-950">School, college, coaching, and self-study in one gentle rhythm.</h2>
          <p className="mt-5 text-lg font-medium leading-8 text-stone-600">
            FirstStep helps you decide what to learn next, make notes useful, and build confidence one mission at a time.
          </p>
        </section>
      </div>
    </div>
  )
}

export default RegisterPage
