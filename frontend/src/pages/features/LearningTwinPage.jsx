import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, Check, Compass, MessageCircle, Sparkles, Target, TrendingUp } from 'lucide-react'
import { twinService } from '../../services/twinService'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import ProgressBar from '../../components/ui/ProgressBar'
import SectionHeader from '../../components/ui/SectionHeader'
import Skeleton from '../../components/ui/Skeleton'

const LearningTwinPage = () => {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTwinData()
  }, [])

  const fetchTwinData = async () => {
    try {
      setError('')
      const [profileData, analyticsData, recommendationsData] = await Promise.all([
        twinService.getProfile(),
        twinService.getAnalytics(),
        twinService.getRecommendations(),
      ])
      setProfile(profileData)
      setAnalytics(analyticsData)
      setRecommendations(recommendationsData)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load Learning Twin insights.')
    } finally {
      setLoading(false)
    }
  }

  const focusAreas = recommendations?.focusAreas || []
  const practiceTopics = recommendations?.practiceTopics || []
  const strengths = profile?.strengths || []
  const weaknesses = profile?.weaknesses || analytics?.weakTopics || []

  if (loading) {
    return (
      <div className="world-page">
        <Skeleton className="h-80" />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      </div>
    )
  }

  return (
    <div className="world-page">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 sm:p-8">
            <Badge tone="accent">Your Learning Twin</Badge>
            <h1 className="mt-5 font-display text-4xl font-black leading-none tracking-tight text-primary sm:text-6xl">
              Personal learning intelligence.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-secondary">
              Your Twin turns behavior, progress, memory, and mistakes into a clear picture of how you learn best.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Insight label="Learning Style" value={profile?.learningStyle || 'Not enough data'} />
              <Insight label="Focus Score" value={`${analytics?.focusScore || 0}%`} />
              <Insight label="Suggested Pace" value={recommendations?.suggestedPace || 'Normal'} />
            </div>
          </Card>
        </motion.div>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white">
              <MessageCircle size={24} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Mentor Note</p>
              <p className="mt-2 text-xl font-black leading-snug text-primary">
                {focusAreas[0] ? `Start with ${focusAreas[0]}, then explain it in your own words.` : 'Complete a lesson or quiz to unlock sharper mentor guidance.'}
              </p>
            </div>
          </div>
          {error ? <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-300">{error}</p> : null}
        </Card>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Metric icon={Brain} label="Knowledge Score" value={`${profile?.knowledgeScore || 0}%`} progress={profile?.knowledgeScore || 0} />
        <Metric icon={TrendingUp} label="Learning Momentum" value={analytics?.progressRate || '0%'} progress={analytics?.focusScore || 0} />
        <Metric icon={Compass} label="Memory Retention" value={`${Math.round((analytics?.memoryRetention || 0) * 100)}%`} progress={(analytics?.memoryRetention || 0) * 100} />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="p-6">
          <SectionHeader eyebrow="Strong Areas" title="What is working" />
          {strengths.length ? (
            <List items={strengths} />
          ) : (
            <EmptyState title="No strengths detected yet" message="Study activity and quiz submissions will help the Twin identify your strongest areas." />
          )}
        </Card>
        <Card className="p-6">
          <SectionHeader eyebrow="Needs Attention" title="What to practice next" />
          {weaknesses.length || practiceTopics.length ? (
            <List items={[...weaknesses, ...practiceTopics].slice(0, 6)} icon={Target} />
          ) : (
            <EmptyState title="No weak topics yet" message="Weak topics appear after your quizzes, notes, and lesson progress create enough signal." />
          )}
        </Card>
      </section>

      <Card className="mt-6 p-6">
        <div className="flex items-center gap-3">
          <Sparkles size={22} className="text-accent" strokeWidth={1.5} />
          <h2 className="font-display text-2xl font-black text-primary">Current focus areas</h2>
        </div>
        {focusAreas.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {focusAreas.map((area) => <div key={area} className="rounded-2xl border border-app bg-elevated p-4 text-sm font-bold text-primary">{area}</div>)}
          </div>
        ) : (
          <EmptyState title="Focus areas pending" message="Your Twin will recommend focus areas once it has enough learning behavior." />
        )}
      </Card>
    </div>
  )
}

const Insight = ({ label, value }) => (
  <div className="rounded-2xl border border-app bg-elevated p-4">
    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">{label}</p>
    <p className="mt-2 font-display text-xl font-black text-primary">{value}</p>
  </div>
)

const Metric = ({ icon: Icon, label, value, progress }) => (
  <Card className="p-5">
    <Icon size={22} className="text-accent" strokeWidth={1.5} />
    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-muted">{label}</p>
    <p className="mt-2 font-display text-3xl font-black text-primary">{value}</p>
    <ProgressBar value={progress} className="mt-4" />
  </Card>
)

const List = ({ items, icon: Icon = Check }) => (
  <div className="space-y-3">
    {items.map((item) => (
      <div key={item} className="flex items-start gap-3 rounded-2xl border border-app bg-elevated p-4">
        <Icon size={18} className="mt-0.5 shrink-0 text-success" strokeWidth={1.5} />
        <p className="font-semibold leading-6 text-secondary">{item}</p>
      </div>
    ))}
  </div>
)

export default LearningTwinPage
