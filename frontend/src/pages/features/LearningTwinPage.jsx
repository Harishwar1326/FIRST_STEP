import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, Check, Compass, MessageCircle, Sparkles, Target, Waves } from 'lucide-react'
import { twinService } from '../../services/twinService'

const LearningTwinPage = () => {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [recommendations, setRecommendations] = useState(null)

  useEffect(() => {
    fetchTwinData()
  }, [])

  const fetchTwinData = async () => {
    try {
      const [profileData, analyticsData, recommendationsData] = await Promise.all([
        twinService.getProfile(),
        twinService.getAnalytics(),
        twinService.getRecommendations()
      ])
      setProfile(profileData)
      setAnalytics(analyticsData)
      setRecommendations(recommendationsData)
    } catch (error) {
      console.error('Failed to fetch twin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const suggestions = recommendations?.focusAreas || [
    'Revise Biology diagrams before attempting MCQs',
    'Practice three heat-transfer numericals',
    'Explain oxidation in your own words'
  ]

  const rhythm = [
    ['See', profile?.learningStyle || 'Visual learner', 'Use diagrams, colors, and small maps first.'],
    ['Try', `${analytics?.focusScore || 85}% focus`, 'Short sessions are working better than long marathons.'],
    ['Grow', analytics?.progressRate || '+15% pace', 'Your understanding improves after recall practice.']
  ]

  if (loading) {
    return (
      <div className="world-page flex items-center justify-center bg-gradient-to-br from-sky-50 via-indigo-50 to-emerald-50">
        <p className="rounded-full bg-white/70 px-5 py-3 text-sm font-black text-stone-600 shadow">Waking up your mentor...</p>
      </div>
    )
  }

  return (
    <div className="world-page bg-gradient-to-br from-sky-50 via-indigo-50 to-emerald-50">
      <div className="absolute right-8 top-12 h-48 w-48 rounded-full bg-sky-200/60 blur-3xl" />
      <div className="absolute bottom-8 left-10 h-40 w-40 rounded-full bg-emerald-200/60 blur-3xl" />

      <section className="relative grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="space-y-6">
          <span className="story-label">
            <Brain size={14} />
            Personal Mentor
          </span>
          <h1 className="text-4xl font-black leading-tight text-stone-950 sm:text-5xl">AI Learning Twin</h1>
          <p className="max-w-2xl text-lg font-medium leading-8 text-stone-600">
            A mentor that learns your rhythm, notices where you hesitate, and suggests the next gentle step.
          </p>
          <div className="floating-island bg-white/70">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sky-200">
                <MessageCircle size={25} className="text-sky-900" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-sky-800">Mentor note</p>
                <p className="mt-2 text-xl font-black leading-8 text-stone-950">
                  Start with one diagram, then teach it back in simple Hindi or English.
                </p>
              </div>
            </div>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="relative min-h-[390px]">
          <div className="absolute left-1/2 top-8 flex h-52 w-52 -translate-x-1/2 animate-float-gentle items-center justify-center rounded-full bg-gradient-to-br from-white to-sky-100 shadow-[0_30px_80px_rgba(52,89,132,0.16)]">
            <Brain size={82} className="text-indigo-700" />
          </div>
          <div className="absolute left-4 top-44 rounded-[2rem] bg-white/80 p-4 shadow-xl">
            <Waves size={24} className="text-emerald-700" />
            <p className="mt-2 text-sm font-black text-stone-900">Calm pace</p>
          </div>
          <div className="absolute bottom-10 right-6 rounded-[2rem] bg-white/80 p-4 shadow-xl">
            <Compass size={24} className="text-sky-700" />
            <p className="mt-2 text-sm font-black text-stone-900">Next step ready</p>
          </div>
        </motion.div>
      </section>

      <section className="relative mt-10 grid gap-4 md:grid-cols-3">
        {rhythm.map(([label, value, desc], index) => (
          <motion.div key={label} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} className="floating-island">
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-800">{label}</span>
            <p className="mt-4 text-2xl font-black text-stone-950">{value}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-stone-600">{desc}</p>
          </motion.div>
        ))}
      </section>

      <section className="relative mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="floating-island">
          <div className="flex items-center gap-3">
            <Target size={24} className="text-indigo-700" />
            <h2 className="text-xl font-black text-stone-950">Mentor-recommended focus</h2>
          </div>
          <div className="mt-5 space-y-3">
            {suggestions.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-[1.5rem] bg-sky-50/80 p-4">
                <Check size={18} className="mt-1 shrink-0 text-emerald-700" />
                <p className="font-semibold leading-6 text-stone-700">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="floating-island bg-gradient-to-br from-indigo-100 to-white">
          <Sparkles size={28} className="text-indigo-700" />
          <h2 className="mt-4 text-xl font-black text-stone-950">Tiny experiment</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-stone-600">
            For the next chapter, read for 7 minutes, close the book, and draw what you remember. Your Twin will compare it with your notes.
          </p>
          <button className="organic-button mt-6">Try mentor mode</button>
        </div>
      </section>
    </div>
  )
}

export default LearningTwinPage
