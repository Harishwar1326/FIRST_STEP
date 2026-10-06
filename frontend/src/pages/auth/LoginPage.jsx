import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Lock, Mail, Sparkles, Star, Zap } from 'lucide-react'
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
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 p-4">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_440px]">
        <section className="hidden lg:block">
          <div className="relative">
            <div className="absolute -top-4 -left-4 animate-bounce">
              <Star className="h-8 w-8 text-yellow-300 fill-yellow-300" />
            </div>
            <div className="absolute -top-8 right-0 animate-pulse">
              <Sparkles className="h-10 w-10 text-white fill-white" />
            </div>
            <div className="absolute bottom-0 -left-8 animate-bounce" style={{ animationDelay: '0.5s' }}>
              <Zap className="h-8 w-8 text-yellow-400 fill-yellow-400" />
            </div>
            
            <h1 className="relative text-6xl font-black leading-tight text-white drop-shadow-lg">
              🌟 Welcome Back!
            </h1>
            <p className="relative mt-6 max-w-xl text-2xl font-bold leading-relaxed text-white/95 drop-shadow-md">
              Ready for your next adventure? Let's learn something amazing today! 🚀
            </p>
            
            <div className="relative mt-12 flex gap-6">
              <div className="flex h-32 w-32 animate-bounce items-center justify-center rounded-3xl bg-gradient-to-br from-yellow-300 to-orange-400 shadow-2xl">
                <BookOpen className="h-16 w-16 text-white" />
              </div>
              <div className="flex h-32 w-32 animate-bounce items-center justify-center rounded-3xl bg-gradient-to-br from-green-300 to-teal-400 shadow-2xl" style={{ animationDelay: '0.3s' }}>
                <Sparkles className="h-16 w-16 text-white fill-white" />
              </div>
              <div className="flex h-32 w-32 animate-bounce items-center justify-center rounded-3xl bg-gradient-to-br from-pink-300 to-purple-400 shadow-2xl" style={{ animationDelay: '0.6s' }}>
                <Star className="h-16 w-16 text-white fill-white" />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white/95 p-8 shadow-2xl backdrop-blur-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-xl">
              <Sparkles className="h-10 w-10 text-white fill-white" />
            </div>
            <h1 className="mt-6 text-4xl font-black text-gray-800">Let's Learn! 🎓</h1>
            <p className="mt-3 text-lg font-bold text-gray-600">Sign in to continue your journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <label className="block">
              <span className="mb-2 block text-lg font-black text-gray-700">📧 Email</span>
              <div className="flex items-center gap-3 rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-4 focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-200 transition-all">
                <Mail className="h-6 w-6 text-purple-600" />
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full bg-transparent text-lg font-bold text-gray-800 outline-none placeholder:text-gray-400" 
                  placeholder="you@example.com" 
                  required 
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-lg font-black text-gray-700">🔐 Password</span>
              <div className="flex items-center gap-3 rounded-2xl border-2 border-pink-200 bg-pink-50 px-4 py-4 focus-within:border-pink-500 focus-within:ring-4 focus-within:ring-pink-200 transition-all">
                <Lock className="h-6 w-6 text-pink-600" />
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full bg-transparent text-lg font-bold text-gray-800 outline-none placeholder:text-gray-400" 
                  placeholder="••••••••" 
                  required 
                />
              </div>
            </label>

            {error && (
              <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-lg font-black text-red-600">
                ⚠️ {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 py-4 text-xl font-black text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-60 disabled:hover:scale-100"
            >
              {loading ? '🚀 Loading...' : '🎉 Let\'s Go!'}
            </button>
          </form>

          <p className="mt-8 text-center text-lg font-bold text-gray-600">
            New here?{' '}
            <Link to="/register" className="font-black text-purple-600 hover:text-purple-800 underline decoration-2 underline-offset-4">
              ✨ Create your account
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}

export default LoginPage
