import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Brain,
  Briefcase,
  Building2,
  CheckCircle2,
  GraduationCap,
  Hospital,
  Landmark,
  Library,
  Loader2,
  MapPin,
  Microscope,
  Mountain,
  RefreshCw,
  RotateCcw,
  Send,
  Trees,
  University,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { thinkingService } from '../../services/thinkingService'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'

const placeIcons = {
  school: GraduationCap,
  college: BookOpen,
  university: University,
  library: Library,
  hospital: Hospital,
  research: Microscope,
  government: Landmark,
  skill_center: Briefcase,
  industry: Building2,
  museum: Landmark,
  park: Trees,
  natural: Mountain,
}

const statusCopy = {
  detecting: {
    title: 'Discovering your surroundings...',
    message: 'Allow location access so FirstStep can find useful learning places near you.',
  },
  denied: {
    title: "We couldn't access your location.",
    message: 'Please allow location access to discover interesting places around you.',
  },
  unsupported: {
    title: 'Location is not supported in this browser.',
    message: 'Open Thinking Lab in a browser that supports location permission.',
  },
  error: {
    title: 'Nearby discovery is unavailable right now.',
    message: 'There may be a network or map service issue. Please try again.',
  },
  empty: {
    title: 'No useful nearby places found yet.',
    message: 'The map service did not return enough educational places within this area.',
  },
}

const ThinkingLabPage = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [cards, setCards] = useState([])
  const [selectedCard, setSelectedCard] = useState(null)
  const [status, setStatus] = useState('detecting')
  const [mode, setMode] = useState('location')
  const [message, setMessage] = useState('')
  const [answer, setAnswer] = useState('')
  const [evaluation, setEvaluation] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [startedAt, setStartedAt] = useState(Date.now())

  const loadIndiaFallback = useCallback(async (reason = '') => {
    try {
      setStatus('detecting')
      setMode('india')
      setMessage('Loading India Thinking Challenges...')
      setCards([])
      setSelectedCard(null)
      setAnswer('')
      setEvaluation(null)

      const response = await thinkingService.getIndiaChallenges()
      const fallbackCards = (response.challenges || []).map((challenge) => ({
        id: challenge.id,
        mode: 'india',
        title: challenge.title,
        category: challenge.issue,
        description: challenge.scenario,
        whyItMatters: `${challenge.region} - builds ${challenge.skills.join(', ')}.`,
        thinkingQuestion: challenge.question,
        distance: null,
        sourceUrl: null,
        place: { type: 'government' },
        challenge,
      }))

      setCards(fallbackCards)
      setSelectedCard(fallbackCards[0] || null)
      setStatus(fallbackCards.length ? 'ready' : 'empty')
      setMessage(reason || 'Location discovery is unavailable, so India-wide challenges are ready.')
      setStartedAt(Date.now())
    } catch (error) {
      setStatus('error')
      setMode('india')
      setMessage('India Thinking Challenges could not be loaded. Please try again.')
    }
  }, [])

  const requestNearbyCards = useCallback(() => {
    if (!('geolocation' in navigator)) {
      loadIndiaFallback(statusCopy.unsupported.message)
      return
    }

    setStatus('detecting')
    setMode('location')
    setMessage(statusCopy.detecting.message)
    setCards([])
    setSelectedCard(null)
    setAnswer('')
    setEvaluation(null)
    setStartedAt(Date.now())

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await thinkingService.discoverNearby({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            studentProfile: {
              name: user?.name,
              learningLevel: user?.level || 'beginner',
            },
          })

          const nearbyCards = response.cards || []
          if (!nearbyCards.length) {
            await loadIndiaFallback(statusCopy.empty.message)
            return
          }

          const isFallback = response.fallback === true
          const resultMode = isFallback ? 'india' : 'location'
          const mappedCards = nearbyCards.map((card) => {
            if (isFallback && card.indiaChallenge) {
              return { ...card, mode: resultMode, challenge: card.indiaChallenge }
            }
            return { ...card, mode: resultMode }
          })

          setMode(resultMode)
          setCards(mappedCards)
          setSelectedCard({ ...mappedCards[0] })
          setStatus('ready')
          setMessage(response.message || '')
          setStartedAt(Date.now())
        } catch (error) {
          await loadIndiaFallback(error.response?.data?.message || statusCopy.error.message)
        }
      },
      async (error) => {
        const denied = error.code === error.PERMISSION_DENIED
        await loadIndiaFallback(denied ? statusCopy.denied.message : error.message || statusCopy.error.message)
      },
      {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 5 * 60 * 1000,
      }
    )
  }, [loadIndiaFallback, user])

  useEffect(() => {
    requestNearbyCards()
  }, [requestNearbyCards])

  const chooseCard = (card) => {
    setSelectedCard(card)
    setAnswer('')
    setEvaluation(null)
    setStartedAt(Date.now())
  }

  const submitAnswer = async () => {
    if (!selectedCard || !answer.trim()) return

    try {
      setSubmitting(true)
      if (selectedCard.mode === 'india') {
        const result = await thinkingService.submitIndiaChallengeAnswer(selectedCard.id, answer)
        setEvaluation(result.evaluation)
      } else {
        const result = await thinkingService.submitThinkingLabAnswer(`location-${selectedCard.id}`, {
          answer,
          challengeType: 'creative',
          difficulty: user?.level || 'beginner',
          question: selectedCard.thinkingQuestion,
          topic: selectedCard.title,
          timeSpentSeconds: Math.round((Date.now() - startedAt) / 1000),
        })
        setEvaluation(result.evaluation)
      }
      queryClient.invalidateQueries({ queryKey: ['learning-profile'] })
    } catch (error) {
      setEvaluation({
        feedback: 'Good start. Try explaining who is affected, why your idea matters, and one practical next step.',
        score: 55,
        criticalThinking: 55,
        reasoning: 55,
        creativity: 50,
        socialAwareness: 50,
        problemSolving: 55,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const showBlockingState = status !== 'ready'
  const pageTitle = mode === 'india' ? 'India Thinking Challenges' : 'Discover the world around you.'
  const pageSubtitle = mode === 'india'
    ? 'Location discovery is unavailable, so FirstStep is showing India-wide real-world scenarios that build critical thinking and empathy.'
    : 'FirstStep uses your browser location only for this discovery request, then turns nearby places into learning cards and thinking questions.'

  return (
    <div className="world-page">
      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="accent">Thinking Lab</Badge>
              <Badge tone="success">{mode === 'india' ? 'India fallback mode' : 'Location-Based MVP'}</Badge>
            </div>
            <h1 className="mt-5 font-display text-4xl font-black leading-none tracking-tight text-primary sm:text-6xl">
              {pageTitle}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-secondary">
              {pageSubtitle}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button onClick={requestNearbyCards} disabled={status === 'detecting'}>
                {status === 'detecting' ? <Loader2 size={18} className="animate-spin" strokeWidth={1.5} /> : <RefreshCw size={18} strokeWidth={1.5} />}
                Discover near me
              </Button>
              <Button variant="secondary" onClick={() => loadIndiaFallback('India Thinking Challenges are ready.')}>
                🇮🇳 India challenges
              </Button>
              <div className="rounded-2xl border border-app bg-elevated px-4 py-3 text-sm font-bold leading-6 text-secondary">
                Exact coordinates are not shown or saved by this MVP.
              </div>
            </div>
          </Card>
        </motion.div>

        <StatusCard status={status} mode={mode} message={message} count={cards.length} onRetry={requestNearbyCards} />
      </section>

      {showBlockingState ? (
        <BlockingState status={status} message={message} onRetry={requestNearbyCards} />
      ) : (
        <>
          <section className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="p-6">
              <SectionTitle
                icon={mode === 'india' ? Landmark : MapPin}
                eyebrow={mode === 'india' ? 'India Thinking Challenges' : 'Discover Near You'}
                title={mode === 'india' ? 'Real-world social issues across India' : 'Knowledge cards from nearby places'}
              />
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {cards.map((card) => (
                  <KnowledgeCard
                    key={card.id}
                    card={card}
                    active={selectedCard?.id === card.id}
                    onClick={() => chooseCard(card)}
                  />
                ))}
              </div>
            </Card>

            <Card className="self-start p-6">
              <SectionTitle icon={Brain} eyebrow="Think About It" title="Your response" />
              <div className="mt-5 rounded-2xl border border-app bg-elevated p-4">
                <p className="text-sm font-black leading-6 text-primary">{selectedCard?.thinkingQuestion}</p>
              </div>
              <textarea
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Write your idea. Explain the problem, who it affects, and what students could try first..."
                className="mt-4 min-h-[240px] w-full resize-none rounded-2xl border border-app bg-elevated p-5 text-base font-semibold leading-7 text-primary outline-none transition placeholder:text-muted focus:ring-4 focus:ring-accent/25"
              />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button className="flex-1" onClick={submitAnswer} disabled={submitting || !answer.trim()}>
                  {submitting ? <Loader2 size={18} className="animate-spin" strokeWidth={1.5} /> : <Send size={18} strokeWidth={1.5} />}
                  Submit thinking
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAnswer('')
                    setEvaluation(null)
                    setStartedAt(Date.now())
                  }}
                >
                  <RotateCcw size={18} strokeWidth={1.5} />
                  Reset
                </Button>
              </div>
              {evaluation ? <FeedbackPanel evaluation={evaluation} /> : null}
            </Card>
          </section>
        </>
      )}
    </div>
  )
}

const StatusCard = ({ status, mode, message, count, onRetry }) => {
  const detecting = status === 'detecting'
  const ready = status === 'ready'
  const Icon = ready ? CheckCircle2 : detecting ? Loader2 : AlertCircle
  const readyTitle = mode === 'india'
    ? `${count} India thinking challenges ready`
    : `${count} nearby learning places found`
  const readyMessage = mode === 'india'
    ? 'Choose a scenario and propose what you would do, why, and how it could work.'
    : 'Choose a card to think about a real place near you.'

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
          <Icon size={24} className={detecting ? 'animate-spin' : ''} strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Location Discovery</p>
          <h2 className="mt-2 font-display text-2xl font-black leading-tight text-primary">
            {ready ? readyTitle : statusCopy[status]?.title || statusCopy.error.title}
          </h2>
          <p className="mt-3 text-sm font-bold leading-6 text-secondary">
            {ready ? readyMessage : message}
          </p>
          {!detecting && !ready ? (
            <Button className="mt-5" variant="secondary" onClick={onRetry}>
              <RefreshCw size={17} strokeWidth={1.5} />
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

const BlockingState = ({ status, message, onRetry }) => {
  if (status === 'detecting') {
    return (
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <Card className="mt-6 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-elevated text-accent">
        <MapPin size={28} strokeWidth={1.5} />
      </div>
      <h2 className="mt-5 font-display text-3xl font-black text-primary">
        {statusCopy[status]?.title || statusCopy.error.title}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-secondary">
        {message || statusCopy[status]?.message || statusCopy.error.message}
      </p>
      <Button className="mt-6" onClick={onRetry}>
        <RefreshCw size={17} strokeWidth={1.5} />
        Try location again
      </Button>
    </Card>
  )
}

const KnowledgeCard = ({ card, active, onClick }) => {
  const Icon = placeIcons[card.place?.type] || MapPin

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 ${
        active ? 'border-accent bg-accent/10' : 'border-app bg-elevated hover:border-accent'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
          <Icon size={21} strokeWidth={1.5} />
        </div>
        <Badge>{card.distance ? `${card.distance} km` : card.mode === 'india' ? 'India' : 'Nearby'}</Badge>
      </div>
      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.14em] text-muted">{card.category}</p>
      <h3 className="mt-2 text-lg font-black leading-6 text-primary">{card.title}</h3>
      {card.address ? (
        <p className="mt-2 text-xs font-bold leading-5 text-muted">{card.address}</p>
      ) : null}
      <p className="mt-3 text-sm font-semibold leading-6 text-secondary">{card.description}</p>
      <div className="mt-4 rounded-xl border border-app bg-surface p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">Why it matters</p>
        <p className="mt-2 text-xs font-bold leading-5 text-primary">{card.whyItMatters}</p>
      </div>
      {card.sourceUrl ? (
        <a
          href={card.sourceUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="mt-4 inline-flex items-center gap-1 text-xs font-black text-accent"
        >
          Open map source <ArrowRight size={13} strokeWidth={1.5} />
        </a>
      ) : null}
    </button>
  )
}

const SectionTitle = ({ icon: Icon, eyebrow, title }) => (
  <div className="flex items-start gap-3">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
      <Icon size={21} strokeWidth={1.5} />
    </div>
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">{eyebrow}</p>
      <h2 className="mt-1 font-display text-2xl font-black text-primary">{title}</h2>
    </div>
  </div>
)

const FeedbackPanel = ({ evaluation }) => {
  const overallScore = evaluation.score ?? evaluation.overall

  return (
    <div className="mt-5 rounded-2xl border border-success/40 bg-success/10 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-success" strokeWidth={1.5} />
        <div>
          <p className="text-sm font-black text-primary">Feedback for your thinking</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-secondary">{evaluation.feedback}</p>
          {overallScore !== undefined && overallScore !== null ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <FeedbackMetric label="Overall" value={overallScore} />
              <FeedbackMetric label="Critical thinking" value={evaluation.criticalThinking ?? evaluation.understanding} />
              <FeedbackMetric label="Reasoning" value={evaluation.reasoning} />
              <FeedbackMetric label="Creativity" value={evaluation.creativity} />
              <FeedbackMetric label="Social awareness" value={evaluation.socialAwareness ?? evaluation.evidence} />
              <FeedbackMetric label="Problem solving" value={evaluation.problemSolving} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const FeedbackMetric = ({ label, value }) => (
  <div className="rounded-xl border border-app bg-surface p-3">
    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted">{label}</p>
    <p className="mt-1 text-sm font-black text-primary">{Math.round(Number(value) || 0)}/100</p>
  </div>
)

export default ThinkingLabPage
