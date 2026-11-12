import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Brain, Check, Clock3, Compass, MessageCircle, PlayCircle, Sparkles, Target, TrendingUp } from 'lucide-react'
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
  const [sprint, setSprint] = useState({ subject: '', duration: 25, confidence: 80 })
  const [savingSprint, setSavingSprint] = useState(false)
  const [sprintSaved, setSprintSaved] = useState(false)

  useEffect(() => { fetchTwinData() }, [])

  const fetchTwinData = async () => {
    try {
      setError('')
      const snapshot = await twinService.getSnapshot()
      setProfile(snapshot.profile)
      setAnalytics(snapshot.analytics)
      setRecommendations(snapshot.recommendations)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load Learning Twin insights.')
    } finally {
      setLoading(false)
    }
  }

  const practiceTopics = recommendations?.practiceTopics || []
  const strengths = profile?.strengths || []
  const weaknesses = profile?.weaknesses || []

  const logStudySprint = async (event) => {
    event.preventDefault()
    if (!sprint.subject.trim()) return
    setSavingSprint(true)
    setSprintSaved(false)
    try {
      await twinService.updateProgress({
        studySession: {
          subject: sprint.subject.trim(),
          duration: Number(sprint.duration),
          confidence: Number(sprint.confidence),
        },
      })
      setSprintSaved(true)
      setSprint((current) => ({ ...current, subject: '' }))
      await fetchTwinData()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not record this study sprint.')
    } finally {
      setSavingSprint(false)
    }
  }

  if (loading) {
    return <div className="world-page learning-twin-page"><Skeleton className="h-80" /><div className="mt-4 grid gap-4 md:grid-cols-3"><Skeleton className="h-36" /><Skeleton className="h-36" /><Skeleton className="h-36" /></div></div>
  }

  if (error && !profile) {
    return <div className="world-page learning-twin-page"><Card className="p-8"><h1 className="font-display text-2xl font-black text-primary">Learning Twin is unavailable</h1><p className="mt-3 text-sm font-semibold text-secondary">{error}</p><button type="button" onClick={() => { setLoading(true); fetchTwinData() }} className="mt-5 rounded-xl bg-accent px-4 py-2 text-sm font-black text-stone-950">Try again</button></Card></div>
  }

  return (
    <div className="world-page learning-twin-page">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 sm:p-8">
            <Badge tone="accent">Your Learning Twin</Badge>
            <h1 className="mt-5 font-display text-4xl font-black leading-none tracking-tight text-primary sm:text-6xl">Personal learning intelligence.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-secondary">Your Twin brings together saved lessons, video activity, quiz results, and learning activities associated with your account.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Insight label="Available lessons" value={profile?.availableLessons ?? 'Not available'} />
              <Insight label="Lessons started" value={profile?.lessonsStarted || 0} />
              <Insight label="Suggested pace" value={recommendations?.suggestedPace || 'Not enough quiz data'} />
            </div>
          </Card>
        </motion.div>
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white"><MessageCircle size={24} strokeWidth={1.5} /></div>
            <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Mentor Note</p><p className="mt-2 text-xl font-black leading-snug text-primary">{recommendations?.items?.[0]?.reason || 'Complete a lesson or quiz to get a recommendation based on your activity.'}</p></div>
          </div>
        </Card>
      </section>

      {error ? <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-700">{error}</p> : null}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Metric icon={Brain} label="Recorded learning score" value={profile?.knowledgeScore == null ? 'Not enough data' : `${profile.knowledgeScore}%`} progress={profile?.knowledgeScore} />
        <Metric icon={TrendingUp} label="Quiz attempts" value={analytics?.quizAttempts || 0} />
        <Metric icon={Compass} label="Observed video time" value={`${Math.round((analytics?.observedWatchSeconds || 0) / 60)} min`} />
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Check} label="Saved notes" value={profile?.notesCount || 0} />
        <Metric icon={Clock3} label="Revisions due" value={profile?.revisionDueCount || 0} />
        <Metric icon={Target} label="Course tasks" value={`${profile?.taskProgress?.completed || 0} / ${profile?.taskProgress?.available || 0}`} detail={`${profile?.taskProgress?.pending || 0} pending${profile?.taskProgress?.unlinkedSubmissions ? ` · ${profile.taskProgress.unlinkedSubmissions} submissions lack task IDs` : ''}`} />
        <Metric icon={PlayCircle} label="Pauses / replays" value={`${analytics?.pauseCount || 0} / ${analytics?.replayCount || 0}`} />
      </section>

      {profile?.lastWatchedLesson || profile?.assessment ? (
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {profile.lastWatchedLesson ? <Card className="p-5"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Last watched lesson</p><h2 className="mt-2 font-display text-xl font-black text-primary">{profile.lastWatchedLesson.title}</h2><p className="mt-1 text-sm font-semibold text-secondary">{profile.lastWatchedLesson.subject} · {profile.lastWatchedLesson.watchPercentage}% covered · position {Math.round(profile.lastWatchedLesson.position)}s</p><Link to={`/programming-learning?subject=${encodeURIComponent(profile.lastWatchedLesson.subjectSlug)}&lesson=${encodeURIComponent(profile.lastWatchedLesson.id)}`} className="mt-4 inline-flex rounded-xl bg-accent px-4 py-2 text-sm font-black text-stone-950">Resume lesson</Link></Card> : null}
          {profile.assessment ? <Card className="p-5"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Learning DNA assessment</p><h2 className="mt-2 font-display text-xl font-black text-primary">Recorded score: {profile.assessment.score}%</h2><p className="mt-1 text-sm font-semibold text-secondary">Completed {new Date(profile.assessment.completedAt).toLocaleDateString()}{profile.assessment.goal ? ` · Goal: ${profile.assessment.goal}` : ''}</p></Card> : null}
        </section>
      ) : null}

      <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="p-6"><SectionHeader eyebrow="Strong Areas" title="What is working" />{strengths.length ? <List items={strengths} /> : <EmptyState title="No strengths detected yet" message="Quiz results will reveal subjects where your scores are consistently strong." />}</Card>
        <Card className="p-6"><SectionHeader eyebrow="Needs Attention" title="What to practice next" />{weaknesses.length || practiceTopics.length ? <List items={[...new Set([...weaknesses, ...practiceTopics])].slice(0, 8)} icon={Target} /> : <EmptyState title="No weak topics recorded" message="Missed quiz concepts and unresolved learning misconceptions will appear here." />}</Card>
      </section>

      <Card className="mt-6 p-6">
        <div className="flex items-center gap-3"><Sparkles size={22} className="text-accent" strokeWidth={1.5} /><h2 className="font-display text-2xl font-black text-primary">Recommended next steps</h2></div>
        {recommendations?.items?.length ? <p className="mt-2 text-xs font-semibold text-secondary">{recommendations.analysisSource === 'ai_grounded' ? 'AI reviewed and ranked these available actions using your recorded learning evidence.' : 'Ordered from your recorded learning evidence. AI review is unavailable, so the evidence-based recommendations are shown.'}</p> : null}
        {profile?.modelGuidance ? <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-950">The saved model profile suggests {profile.modelGuidance.recommendedDifficulty || 'no difficulty level yet'} material{profile.modelGuidance.masteryEstimate == null ? '' : ` (experimental mastery estimate ${profile.modelGuidance.masteryEstimate}%)`}. Training used synthetic data, so recommendations prioritize your recorded quiz gaps, progress, prerequisites, and goals; model estimates are experimental.</p> : null}
        {recommendations?.items?.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {recommendations.items.map((item) => <div key={item.id} className="rounded-2xl border border-app bg-elevated p-4"><p className="font-black text-primary">{item.title}</p><p className="mt-2 text-sm font-semibold leading-6 text-secondary">{item.reason}</p><p className="mt-2 text-xs font-bold text-muted">{item.lessonTitle} · {item.subject}</p><Link to={item.href} className="mt-4 inline-flex rounded-xl bg-accent px-4 py-2 text-sm font-black text-stone-950 hover:opacity-90">Open this lesson</Link></div>)}
          </div>
        ) : <EmptyState title="No recommendation yet" message="Your Twin will suggest an available lesson when it has saved lesson, quiz, or revision evidence." />}
      </Card>

      <Card className="mt-6 p-6">
        <SectionHeader eyebrow="Available curriculum" title="Progress by subject" />
        {profile?.subjects?.length ? <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{profile.subjects.map((subject) => <div key={subject.slug} className="rounded-2xl border border-app bg-elevated p-4"><div className="flex items-center justify-between gap-3"><p className="font-black text-primary">{subject.subject}</p><span className="text-sm font-black text-accent">{subject.progressPercent}%</span></div><ProgressBar value={subject.progressPercent} className="mt-3" /><p className="mt-3 text-xs font-semibold text-secondary">{subject.lessonsCompleted}/{subject.lessonsTotal} complete · {subject.lessonsStarted} started</p><p className="mt-1 text-xs font-semibold text-secondary">{subject.averageQuizScore == null ? 'No quiz score yet' : `Quiz average ${subject.averageQuizScore}%`}</p><p className="mt-1 text-xs font-semibold text-secondary">Course tasks: {subject.tasksCompleted}/{subject.tasksAvailable} complete · {subject.tasksPending} pending</p><div className="mt-3 space-y-2">{subject.lessons.map((lesson) => <Link key={lesson.id} to={`/programming-learning?subject=${encodeURIComponent(subject.slug)}&lesson=${encodeURIComponent(lesson.id)}`} className="flex items-center justify-between gap-2 rounded-lg bg-white/70 px-3 py-2 text-xs"><span className="truncate font-bold text-primary">{lesson.title}</span><span className="shrink-0 font-black capitalize text-secondary">{lesson.status.replace('_', ' ')}</span></Link>)}</div></div>)}</div> : <EmptyState title="No published lessons available" message="Programming curriculum will appear here when lessons are available." />}
      </Card>

      <section className="mt-6 grid gap-4 xl:grid-cols-[.85fr_1.15fr]">
        <Card className="p-6">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-white"><PlayCircle size={22} /></div><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Teach your Twin</p><h2 className="font-display text-2xl font-black text-primary">Log a study sprint</h2></div></div>
          <p className="mt-4 text-sm font-semibold leading-6 text-secondary">This entry is self-reported. It is kept separate from quiz scores and observed video activity.</p>
          <form onSubmit={logStudySprint} className="mt-5 space-y-3">
            <input value={sprint.subject} onChange={(event) => setSprint((current) => ({ ...current, subject: event.target.value }))} placeholder="What did you study?" maxLength={120} required className="w-full rounded-xl border border-app bg-elevated px-3 py-3 text-sm font-bold text-primary outline-none focus:border-accent" />
            <div className="grid grid-cols-2 gap-3">
              <label className="rounded-xl border border-app bg-elevated px-3 py-2"><span className="block text-[10px] font-black uppercase tracking-wider text-muted">Minutes</span><select value={sprint.duration} onChange={(event) => setSprint((current) => ({ ...current, duration: event.target.value }))} className="mt-1 w-full bg-transparent text-sm font-black text-primary outline-none"><option value="15">15 min</option><option value="25">25 min</option><option value="45">45 min</option><option value="60">60 min</option></select></label>
              <label className="rounded-xl border border-app bg-elevated px-3 py-2"><span className="block text-[10px] font-black uppercase tracking-wider text-muted">Confidence</span><select value={sprint.confidence} onChange={(event) => setSprint((current) => ({ ...current, confidence: event.target.value }))} className="mt-1 w-full bg-transparent text-sm font-black text-primary outline-none"><option value="50">Still unsure</option><option value="70">Getting there</option><option value="85">Pretty clear</option><option value="100">I can teach it</option></select></label>
            </div>
            <button type="submit" disabled={savingSprint || !sprint.subject.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-black text-stone-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"><Clock3 size={17} />{savingSprint ? 'Saving your sprint...' : 'Save this sprint'}</button>
            {sprintSaved ? <p className="text-center text-xs font-black text-emerald-600">Saved as a self-reported study entry.</p> : null}
          </form>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Recent rhythm</p><h2 className="mt-1 font-display text-2xl font-black text-primary">Your learning activity</h2></div><TrendingUp size={22} className="text-accent" /></div>
          {analytics?.recentActivity?.length ? <div className="mt-5 divide-y divide-app">{analytics.recentActivity.slice(0, 8).map((activity) => <div key={activity.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><p className="text-sm font-black capitalize text-primary">{activity.title}</p><p className="text-xs font-semibold text-secondary">{activity.detail}{activity.subject ? ` · ${activity.subject}` : ''}</p></div><time className="text-xs font-semibold text-muted">{new Date(activity.createdAt).toLocaleString()}</time></div>)}</div> : <EmptyState title="No learning activity yet" message="Saved lesson, quiz, and learning activity will appear here." />}
        </Card>
      </section>
    </div>
  )
}

const Insight = ({ label, value }) => <div className="rounded-2xl border border-app bg-elevated p-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">{label}</p><p className="mt-2 font-display text-xl font-black text-primary">{value}</p></div>

const Metric = ({ icon: Icon, label, value, progress, detail }) => <Card className="p-5"><Icon size={22} className="text-accent" strokeWidth={1.5} /><p className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-muted">{label}</p><p className="mt-2 font-display text-3xl font-black text-primary">{value}</p>{detail ? <p className="mt-2 text-xs font-semibold text-secondary">{detail}</p> : null}{progress == null ? null : <ProgressBar value={progress} className="mt-4" />}</Card>

const List = ({ items, icon: Icon = Check }) => <div className="space-y-3">{items.map((item) => <div key={item} className="flex items-start gap-3 rounded-2xl border border-app bg-elevated p-4"><Icon size={18} className="mt-0.5 shrink-0 text-success" strokeWidth={1.5} /><p className="font-semibold leading-6 text-secondary">{item}</p></div>)}</div>

export default LearningTwinPage
