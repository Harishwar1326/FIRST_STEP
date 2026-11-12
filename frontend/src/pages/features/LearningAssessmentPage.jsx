import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, Sparkles, Activity } from 'lucide-react'
import { learningAssessmentService } from '../../services/learningAssessmentService'
import { learningProfileService } from '../../services/learningProfileService'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import ProgressBar from '../../components/ui/ProgressBar'
import SectionHeader from '../../components/ui/SectionHeader'
import Skeleton from '../../components/ui/Skeleton'

const GROUP_LABELS = {
  INTERESTS: 'A. Interests',
  'CURRENT KNOWLEDGE': 'B. Current Knowledge',
  'LEARNING BEHAVIOR': 'C. Learning Behavior',
  'STUDY CONSISTENCY': 'D. Study Consistency',
  GOALS: 'E. Goals',
}

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.response?.data?.details?.[0] || error?.message || 'Unable to save your assessment.'

const validateResponses = (questions = [], responses = {}) => {
  const errors = {}
  questions.forEach((question) => {
    if (!question.required) return
    const value = responses[question.id]
    if (question.type === 'multi') {
      if (!Array.isArray(value) || !value.length) errors[question.id] = 'Select at least one option.'
      return
    }
    if (question.type === 'number') {
      if (value === null || value === undefined || String(value).trim() === '') {
        errors[question.id] = 'This question is required.'
        return
      }
      const number = Number(value)
      if (!Number.isFinite(number) || number < question.min || number > question.max) {
        errors[question.id] = `Enter a value between ${question.min} and ${question.max}.`
      }
      return
    }
    if (!String(value || '').trim()) errors[question.id] = 'This question is required.'
  })
  return errors
}

const ProfileResult = ({ profile, onRetake }) => {
  const skills = profile?.skills || profile?.capabilityProfile || {}
  const insights = profile?.insights || {}

  const strengths = profile?.strengths || insights.strengths || []
  const areasToImprove = profile?.areasToImprove || insights.areasToImprove || []
  const learningStyle = profile?.learningStyle || insights.learningPreference || 'Not provided'
  const studyAvailability = profile?.studyAvailability || insights.studyAvailability || 'Not provided'
  const currentCapability = profile?.currentCapability || insights.currentCapability || 'Not provided'
  const primaryGoal = profile?.primaryGoal || insights.primaryGoal || 'Not provided'
  const overallScore = profile?.overallScore ?? null
  const isDeveloping = Boolean(profile?.isDeveloping)

  const profileRows = [
    ['Programming baseline', skills.programming],
    ['Problem-solving indicator', skills.problemSolving],
    ['Study consistency indicator', skills.consistency],
    ['Self-reported confidence', skills.confidence],
    ['Reported academic / activity performance', skills.academicPerformance],
  ]

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge tone={isDeveloping ? 'warning' : 'accent'}>
            {isDeveloping ? 'Learning profile is still developing.' : 'Active Dynamic Profile'}
          </Badge>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-secondary">
            <Activity size={14} className="text-accent" />
            Assessment answers and recorded activity
          </span>
        </div>

        <h1 className="mt-4 font-display text-4xl font-black tracking-tight text-primary sm:text-5xl">Your Learning Profile</h1>
        <p className="mt-3 text-sm font-semibold text-secondary">
          {overallScore === null
            ? 'Observed quiz average: not available yet'
            : `Observed quiz and knowledge-check average: ${overallScore}%`}
          {profile?.objectiveQuestionCount > 0 && (
            <span className="ml-2">({profile.objectiveQuestionCount} scored questions)</span>
          )}
        </p>
        <p className="mt-2 text-xs font-medium text-muted">
          The overall score uses correct answers from quizzes and the knowledge check. Skill indicators may include survey answers and logged activity; they are guideposts, not standardized test results.
        </p>

        {isDeveloping && (
          <div className="mt-4 rounded-xl border border-app bg-surface p-3 text-xs font-semibold text-secondary">
            {profile?.statusMessage || 'Learning profile is still developing. Ongoing activity across lessons, quizzes, and Thinking Lab continues to refine your profile.'}
          </div>
        )}
        <div className="mt-8 space-y-5">
          {profileRows.map(([label, value]) => (
            <div key={label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-black text-primary">{label}</p>
                <span className="text-sm font-black text-secondary">{value === null || value === undefined ? 'Not enough data' : `${value}%`}</span>
              </div>
              {value === null || value === undefined
                ? <p className="text-xs font-medium text-muted">Complete relevant activities to establish this indicator.</p>
                : <ProgressBar value={value} />}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <SectionHeader eyebrow="Strengths" title="Your strengths" />
          <ul className="space-y-2">
            {strengths.length === 0 && <li className="text-sm font-semibold text-secondary">No strengths are established by the available evidence yet.</li>}
            {strengths.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm font-semibold text-primary">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 sm:p-6">
          <SectionHeader eyebrow="Growth" title="Areas to improve" />
          <ul className="space-y-2">
            {areasToImprove.length === 0 && <li className="text-sm font-semibold text-secondary">More scored activity is needed before identifying a growth area.</li>}
            {areasToImprove.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm font-semibold text-secondary">
                <ArrowRight size={16} className="mt-0.5 shrink-0 text-accent" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        <Insight label="Learning preference" value={learningStyle} />
        <Insight label="Study availability" value={studyAvailability} />
        <Insight label="Self-reported programming level" value={currentCapability} />
        <Insight label="Primary goal" value={primaryGoal} />
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button as={Link} to="/" size="lg">
          Continue to FirstStep
          <ArrowRight size={16} strokeWidth={1.5} />
        </Button>
        <Button type="button" variant="secondary" onClick={onRetake}>
          Retake assessment
        </Button>
      </div>
    </div>
  )
}

const Insight = ({ label, value }) => (
  <div className="rounded-2xl border border-app bg-elevated p-4">
    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted">{label}</p>
    <p className="mt-2 text-sm font-black text-primary">{value || '—'}</p>
  </div>
)

const LearningAssessmentPage = () => {
  const queryClient = useQueryClient()
  const [responses, setResponses] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [retaking, setRetaking] = useState(false)

  const profileQuery = useQuery({
    queryKey: ['learning-profile'],
    queryFn: learningProfileService.getLearningProfile,
  })

  const questionsQuery = useQuery({
    queryKey: ['learning-assessment-questions'],
    queryFn: learningAssessmentService.getQuestions,
  })

  const assessmentQuery = useQuery({
    queryKey: ['learning-assessment-me'],
    queryFn: learningAssessmentService.getMyAssessment,
  })

  const submitMutation = useMutation({
    mutationFn: learningAssessmentService.submitAssessment,
    onSuccess: () => {
      setRetaking(false)
      setSubmitError('')
      queryClient.invalidateQueries({ queryKey: ['learning-assessment-me'] })
      queryClient.invalidateQueries({ queryKey: ['learning-profile'] })
    },
    onError: (error) => setSubmitError(getErrorMessage(error)),
  })

  const questions = questionsQuery.data?.questions || []
  const groups = questionsQuery.data?.groups || []

  const questionsByGroup = useMemo(() => {
    const map = new Map()
    groups.forEach((group) => map.set(group, []))
    questions.forEach((question) => {
      const list = map.get(question.group) || []
      list.push(question)
      map.set(question.group, list)
    })
    return map
  }, [questions, groups])

  const setFieldValue = (id, value) => {
    setResponses((current) => ({ ...current, [id]: value }))
    setFieldErrors((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  const toggleMulti = (id, option) => {
    setResponses((current) => {
      const selected = new Set(current[id] || [])
      if (selected.has(option)) selected.delete(option)
      else selected.add(option)
      return { ...current, [id]: Array.from(selected) }
    })
    setFieldErrors((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setSubmitError('')
    const errors = validateResponses(questions, responses)
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    submitMutation.mutate(responses)
  }

  const completedAssessment = assessmentQuery.data?.assessment
  const hasCompletedAssessment = Boolean(completedAssessment?.completedAt || assessmentQuery.data?.completed)
  const hasProfileData = profileQuery.data?.hasProfileData === false
    ? false
    : Boolean(profileQuery.data && (profileQuery.data.overallScore !== undefined || profileQuery.data.skills))
  const showResult = !retaking && (hasCompletedAssessment || hasProfileData)

  useEffect(() => {
    if (retaking && completedAssessment?.responses) {
      setResponses(completedAssessment.responses)
    }
  }, [retaking, completedAssessment])

  if (profileQuery.isLoading || (retaking && questionsQuery.isLoading)) {
    return (
      <div className="world-page learning-profile-page">
        <Skeleton className="h-40" />
        <Skeleton className="mt-4 h-96" />
        <p className="mt-4 text-sm font-semibold text-secondary">Loading learning profile from ML engine...</p>
      </div>
    )
  }

  if (profileQuery.isError && !showResult && (!questionsQuery.data || questionsQuery.isError)) {
    return (
      <div className="world-page learning-profile-page">
        <EmptyState
          title="Unable to load learning profile"
          message={getErrorMessage(profileQuery.error || questionsQuery.error)}
        />
      </div>
    )
  }

  if (showResult && profileQuery.data) {
    return (
      <div className="world-page learning-profile-page">
        <ProfileResult profile={profileQuery.data} onRetake={() => setRetaking(true)} />
      </div>
    )
  }

  return (
    <div className="world-page learning-profile-page">
      <Card className="mb-6 p-6 sm:p-8">
        <Badge tone="accent">
          <Sparkles size={12} className="mr-1 inline" />
          Learning DNA
        </Badge>
        <h1 className="mt-4 font-display text-4xl font-black tracking-tight text-primary sm:text-5xl">
          Discover Your Learning DNA
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-secondary">
          Help FirstStep understand how you learn so we can personalize your roadmap.
        </p>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {groups.map((group) => (
          <Card key={group} className="p-5 sm:p-6">
            <SectionHeader eyebrow="Assessment" title={GROUP_LABELS[group] || group} />
            <div className="space-y-5">
              {(questionsByGroup.get(group) || []).map((question) => (
                <QuestionField
                  key={question.id}
                  question={question}
                  value={responses[question.id]}
                  error={fieldErrors[question.id]}
                  onChange={setFieldValue}
                  onToggleMulti={toggleMulti}
                />
              ))}
            </div>
          </Card>
        ))}

        {submitError ? <p className="text-sm font-semibold text-red-700">{submitError}</p> : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={submitMutation.isPending}>
            {submitMutation.isPending ? 'Submitting...' : 'Submit assessment'}
          </Button>
          {completedAssessment ? (
            <Button type="button" variant="secondary" onClick={() => setRetaking(false)}>
              Cancel retake
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  )
}

const QuestionField = ({ question, value, error, onChange, onToggleMulti }) => {
  const inputClass =
    'mt-2 w-full rounded-xl border border-app bg-surface px-3 py-2.5 text-sm font-semibold text-primary outline-none focus:ring-4 focus:ring-accent/25'

  return (
    <label className="block">
      <span className="whitespace-pre-line text-sm font-black text-primary">{question.label}</span>
      {question.type === 'text' ? (
        <input
          value={value || ''}
          onChange={(event) => onChange(question.id, event.target.value)}
          className={inputClass}
        />
      ) : null}

      {question.type === 'number' ? (
        <input
          type="number"
          min={question.min}
          max={question.max}
          value={value ?? ''}
          onChange={(event) => onChange(question.id, event.target.value)}
          className={inputClass}
          placeholder={`${question.min}–${question.max}`}
        />
      ) : null}

      {question.type === 'single' ? (
        <div className="mt-2 space-y-2">
          {question.options.map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-3 rounded-xl border border-app bg-elevated px-3 py-2.5">
              <input
                type="radio"
                name={question.id}
                checked={value === option}
                onChange={() => onChange(question.id, option)}
              />
              <span className="text-sm font-semibold text-primary">{option}</span>
            </label>
          ))}
        </div>
      ) : null}

      {question.type === 'multi' ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {question.options.map((option) => {
            const selected = Array.isArray(value) && value.includes(option)
            return (
              <button
                key={option}
                type="button"
                onClick={() => onToggleMulti(question.id, option)}
                className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                  selected ? 'border-accent bg-accent/15 text-primary' : 'border-app bg-surface text-secondary'
                }`}
              >
                {option}
              </button>
            )
          })}
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs font-semibold text-red-700">{error}</p> : null}
    </label>
  )
}

export default LearningAssessmentPage
