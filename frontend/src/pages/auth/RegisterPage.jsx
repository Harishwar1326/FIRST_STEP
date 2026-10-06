import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Mail, Sparkles, Star, UserRound, Zap } from 'lucide-react'
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

  const inputClass = 'w-full bg-transparent text-lg font-bold text-gray-800 outline-none placeholder:text-gray-400'

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-400 to-purple-400 p-4">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-white/95 p-8 shadow-2xl backdrop-blur-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-blue-500 shadow-xl">
              <Sparkles className="h-10 w-10 text-white fill-white" />
            </div>
            <h1 className="mt-6 text-4xl font-black text-gray-800">Join the Adventure! 🌈</h1>
            <p className="mt-3 text-lg font-bold text-gray-600">Create your account and start learning</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <label className="block">
              <span className="mb-2 block text-lg font-black text-gray-700">👤 Your Name</span>
              <div className="flex items-center gap-3 rounded-2xl border-2 border-green-200 bg-green-50 px-4 py-4 focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-200 transition-all">
                <UserRound className="h-6 w-6 text-green-600" />
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} placeholder="Your name" required />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-lg font-black text-gray-700">📧 Email</span>
              <div className="flex items-center gap-3 rounded-2xl border-2 border-blue-200 bg-blue-50 px-4 py-4 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-200 transition-all">
                <Mail className="h-6 w-6 text-blue-600" />
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputClass} placeholder="you@example.com" required />
              </div>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-lg font-black text-gray-700">🔐 Password</span>
                <div className="flex items-center gap-3 rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-4 focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-200 transition-all">
                  <Lock className="h-6 w-6 text-purple-600" />
                  <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={inputClass} placeholder="••••••••" required />
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-lg font-black text-gray-700">✅ Confirm</span>
                <div className="flex items-center gap-3 rounded-2xl border-2 border-pink-200 bg-pink-50 px-4 py-4 focus-within:border-pink-500 focus-within:ring-4 focus-within:ring-pink-200 transition-all">
                  <Lock className="h-6 w-6 text-pink-600" />
                  <input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} className={inputClass} placeholder="••••••••" required />
                </div>
              </label>
            </div>

            {error && (
              <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-lg font-black text-red-600">
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-gradient-to-r from-green-500 to-blue-500 py-4 text-xl font-black text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-60 disabled:hover:scale-100">
              {loading ? '🚀 Creating account...' : '🎉 Start Learning!'}
            </button>
          </form>

          <p className="mt-8 text-center text-lg font-bold text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-black text-green-600 hover:text-green-800 underline decoration-2 underline-offset-4">
              ✨ Sign in here
            </Link>
          </p>
        </motion.section>

        <section className="hidden lg:block">
          <div className="relative">
            <div className="absolute -top-4 -right-4 animate-bounce">
              <Star className="h-8 w-8 text-yellow-300 fill-yellow-300" />
            </div>
            <div className="absolute -top-8 left-0 animate-pulse">
              <Sparkles className="h-10 w-10 text-white fill-white" />
            </div>
            <div className="absolute bottom-0 -right-8 animate-bounce" style={{ animationDelay: '0.5s' }}>
              <Zap className="h-8 w-8 text-yellow-400 fill-yellow-400" />
            </div>
            
            <h2 className="relative text-6xl font-black leading-tight text-white drop-shadow-lg">
              🎓 Learn & Grow!
            </h2>
            <p className="relative mt-6 max-w-xl text-2xl font-bold leading-relaxed text-white/95 drop-shadow-md">
              School, college, coaching, and self-study in one fun adventure! 🚀
            </p>
            
            <div className="relative mt-12 flex gap-6">
              <div className="flex h-32 w-32 animate-bounce items-center justify-center rounded-3xl bg-gradient-to-br from-yellow-300 to-orange-400 shadow-2xl">
                <Star className="h-16 w-16 text-white fill-white" />
              </div>
              <div className="flex h-32 w-32 animate-bounce items-center justify-center rounded-3xl bg-gradient-to-br from-green-300 to-teal-400 shadow-2xl" style={{ animationDelay: '0.3s' }}>
                <Sparkles className="h-16 w-16 text-white fill-white" />
              </div>
              <div className="flex h-32 w-32 animate-bounce items-center justify-center rounded-3xl bg-gradient-to-br from-pink-300 to-purple-400 shadow-2xl" style={{ animationDelay: '0.6s' }}>
                <Zap className="h-16 w-16 text-white fill-yellow-400" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default RegisterPage
