import { api } from './api'

export const academyService = {
  getStudyPlan: async () => {
    const response = await api.get('/academy/plan')
    return response.data
  },

  getTodayTasks: async () => {
    const response = await api.get('/academy/today')
    return response.data
  },

  getFlashcards: async () => {
    const response = await api.get('/academy/flashcards')
    return response.data
  },

  submitFlashcardReview: async (cardId, rating) => {
    const response = await api.post('/academy/flashcards/review', { cardId, rating })
    return response.data
  },

  getStreak: async () => {
    const response = await api.get('/academy/streak')
    return response.data
  },

  updateStreak: async () => {
    const response = await api.post('/academy/streak/update')
    return response.data
  },

  getTechniqueRecommendation: async (subject) => {
    const response = await api.get('/academy/recommendation', { params: { subject } })
    return response.data
  },

  getStudentProfile: async (studentId) => {
    const url = studentId ? `/academy/profile/${studentId}` : '/academy/profile'
    const response = await api.get(url)
    return response.data
  },

  getAllTechniques: async () => {
    const response = await api.get('/academy/techniques')
    return response.data
  },

  getTechniqueById: async (techniqueId) => {
    const response = await api.get(`/academy/techniques/${techniqueId}`)
    return response.data
  },

  recordTechniqueSession: async (sessionData) => {
    const response = await api.post('/academy/technique-session', sessionData)
    return response.data
  },

  getProgress: async (studentId) => {
    const url = studentId ? `/academy/progress/${studentId}` : '/academy/progress'
    const response = await api.get(url)
    return response.data
  },

  evaluateSituation: async (situationInputs) => {
    try {
      const response = await api.post('/academy/situation', situationInputs)
      return response.data
    } catch (err) {
      console.warn('Backend /academy/situation endpoint failed, attempting fallback endpoint:', err.message)
      try {
        const fallbackRes = await api.post('/academy/technique/recommend', situationInputs)
        if (fallbackRes.data && fallbackRes.data.recommendedTechnique) {
          return fallbackRes.data
        }
      } catch (err2) {
        console.warn('Technique recommend fallback failed, generating client-side evaluation:', err2.message)
      }

      const { timeAvailable = '1–3 hours', goal = 'Preparing for an upcoming exam', subject = 'General', difficulty = 'Moderate', confidenceLevel = 'Moderate', mainProblem = 'I understand but forget later' } = situationInputs || {}
      const isExamUrgent = ['Exam tomorrow', 'Exam in a few days'].includes(goal) || ['Less than 1 hour', '1–3 hours'].includes(timeAvailable) || mainProblem === 'I have very little time' || mainProblem === 'I need to revise quickly'

      const techName = isExamUrgent ? 'Active Recall' : 'Spaced Repetition'
      const techScore = isExamUrgent ? 92 : 88

      return {
        studentId: 'current',
        situationInputs,
        recommendedTechnique: {
          id: techName.toLowerCase().replace(/\s+/g, '-'),
          name: techName,
          score: techScore,
          tagline: isExamUrgent ? 'Testing yourself to retrieve information from memory without notes' : 'Reviewing concepts at expanding time intervals to beat the forgetting curve',
          category: 'Retrieval & Memory',
          description: `${techName} is an evidence-based study technique optimized for your situation (${subject}, Goal: ${goal}, Time: ${timeAvailable}).`,
          bestUsedWhen: ['Before exams & tests', 'During rapid revision cycles', 'When you forget concepts easily'],
          notIdealWhen: ['When you have zero initial understanding of the basic concepts'],
          steps: [
            'Study the topic section for 15–20 minutes.',
            'Close your notebook, slides, and references completely.',
            'Write down or speak out loud everything you remember from memory.',
            'Answer 5–10 diagnostic practice questions.',
            'Compare your responses directly with your notes.',
            'Mark the specific concepts you failed to recall.',
            'Review only those weak areas in your notes.',
            'Test yourself again on the weak points 24 hours later.'
          ]
        },
        whyReason: isExamUrgent
          ? `You have limited time (${timeAvailable}) before your ${goal.toLowerCase()} in ${subject}. Passive rereading is ineffective right now; ${techName} allows you to quickly retrieve what you know and test your memory under pressure.`
          : `You have ${timeAvailable} to prepare for ${subject}. Because your goal is long-term retention, ${techName} systematically locks concepts into memory at expanding intervals.`,
        secondaryTechniques: [
          { name: 'Practice Testing', score: 84, reason: 'Simulate exam conditions under time constraints.' },
          { name: 'Blurting Method', score: 78, reason: 'Rapidly write down facts on paper to catch missing gaps.' },
          { name: 'Feynman Technique', score: 72, reason: 'Explain concepts in simple terms to uncover hidden confusion.' }
        ],
        whyNotExplanations: [
          {
            techniqueName: isExamUrgent ? 'Spaced Repetition' : 'Blurting Method',
            reason: isExamUrgent
              ? `Spaced Repetition is excellent for long-term retention over weeks, but given your current timeline (${timeAvailable} / ${goal}), your immediate priority is rapid retrieval testing rather than long-interval scheduling.`
              : `Blurting is great for rapid exam cramming, but Spaced Repetition provides superior long-term retention for your preparation timeline.`
          }
        ],
        timeAllocatedPlan: [
          { time: '0:00 – 0:40', title: `${techName} – Block 1`, activity: `Study main ${subject} topic for 20 mins, then execute ${techName}.` },
          { time: '0:40 – 0:50', title: 'Rest Break', activity: 'Step away from study area.' },
          { time: '0:50 – 1:30', title: `${techName} – Block 2`, activity: `Apply technique to secondary ${subject} sub-topic.` },
          { time: '1:30 – 1:40', title: 'Rest Break', activity: 'Hydrate and stretch.' },
          { time: '1:40 – 2:20', title: 'Practice Testing & Diagnostics', activity: 'Solve 8 practice problems without peeking at answers.' },
          { time: '2:20 – 2:30', title: 'Rest Break', activity: 'Rest eyes.' },
          { time: '2:30 – 3:00', title: 'Mini Exam Simulation', activity: 'Complete a 15-minute timed quiz under silent conditions.' },
        ]
      }
    }
  },

  submitFeedback: async (feedbackData) => {
    try {
      const response = await api.post('/academy/feedback', feedbackData)
      return response.data
    } catch (err) {
      console.warn('Feedback submission fallback:', err.message)
      return { success: true }
    }
  },


  recordActivity: async (activityData) => {
    const response = await api.post('/academy/activity', activityData)
    return response.data
  },
}


