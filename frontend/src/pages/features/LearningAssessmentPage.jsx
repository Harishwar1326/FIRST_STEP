import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
import { learningAssessmentService } from '../../services/learningAssessmentService'
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

const ProfileResult = ({ assessment, onRetake }) => {
  const profile = assessment?.capabilityProfile || {}
  const insights = assessment?.insights || {}

  const profileRows = [
    ['Programming', profile.programming],
    ['Problem Solving', profile.problemSolving],
    ['Consistency', profile.consistency],
    ['Confidence', profile.confidence],
    ['Academic Performance', profile.academicPerformance],
  ]

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <Badge tone="accent">Assessment complete</Badge>
        <h1 className="mt-4 font-display text-4xl font-black tracking-tight text-primary sm:text-5xl">Your Learning Profile</h1>
        <p className="mt-3 text-sm font-semibold text-secondary">
          Knowledge check score: {assessment?.assessmentScore ?? 0}%
        </p>

        <div className="mt-8 space-y-5">
          {profileRows.map(([label, value]) => (
            <div key={label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-black text-primary">{label}</p>
                <span className="text-sm font-black text-secondary">{value ?? 0}%</span>
              </div>
              <ProgressBar value={value ?? 0} />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <SectionHeader eyebrow="Strengths" title="Your strengths" />
          <ul className="space-y-2">
            {(insights.strengths || []).map((item) => (
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
            {(insights.areasToImprove || []).map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm font-semibold text-secondary">
                <ArrowRight size={16} className="mt-0.5 shrink-0 text-accent" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        <Insight label="Learning style" value={insights.learningPreference} />
        <Insight label="Study availability" value={insights.studyAvailability} />
        <Insight label="Current capability" value={insights.currentCapability} />
        <Insight label="Primary goal" value={insights.primaryGoal} />
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
  const showResult = Boolean(completedAssessment?.completedAt) && !retaking

  useEffect(() => {
    if (retaking && completedAssessment?.responses) {
      setResponses(completedAssessment.responses)
    }
  }, [retaking, completedAssessment])

  if (questionsQuery.isLoading || assessmentQuery.isLoading) {
    return (
      <div className="world-page">
        <Skeleton className="h-40" />
        <Skeleton className="mt-4 h-96" />
        <p className="mt-4 text-sm font-semibold text-secondary">Loading assessment...</p>
      </div>
    )
  }

  if (questionsQuery.isError || assessmentQuery.isError) {
    return (
      <div className="world-page">
        <EmptyState
          title="Unable to load learning assessment"
          message={getErrorMessage(questionsQuery.error || assessmentQuery.error)}
        />
      </div>
    )
  }

  if (showResult) {
    return (
      <div className="world-page">
        <ProfileResult assessment={completedAssessment} onRetake={() => setRetaking(true)} />
      </div>
    )
  }

  return (
    <div className="world-page">
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
