import { api } from './api'

const GUEST_KEY = 'smart_notes_guest_id'
const getGuestId = () => {
  try {
    let id = localStorage.getItem(GUEST_KEY)
    if (!id) {
      id = 'guest-notes-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
      localStorage.setItem(GUEST_KEY, id)
    }
    return id
  } catch (_e) {
    return 'guest-notes-' + Math.random().toString(36).slice(2, 10)
  }
}
const headers = () => ({ 'x-guest-id': getGuestId() })
const post = (url, body) => api.post(url, body || {}, { headers: headers() }).then((r) => r.data)
const get = (url, params) => api.get(url, { headers: headers(), params }).then((r) => r.data)

// ============== CLIENT-SIDE STATIC FALLBACKS (same JSON shapes the backend returns) ==============
const fallbackAnalyze = (note) => {
  const concepts = note?.concepts?.length
    ? note.concepts
    : note?.keywords?.length
    ? note.keywords
    : note?.title
    ? [note.title.split(' ').slice(0, 2).join(' '), 'Key Idea 1', 'Key Idea 2', 'Key Idea 3']
    : ['Central Topic', 'Key Idea 1', 'Key Idea 2', 'Key Idea 3', 'Examples', 'Edge Cases']
  return {
    keyConcepts: concepts.slice(0, 10).map((name, i) => ({ name, confidence: 55 + i * 4, importance: 60 + ((i * 7) % 30) })),
    strongConcepts: concepts.slice(0, 2),
    weakConcepts: concepts.slice(-3).map((name) => ({ name, whyWeak: 'Not much detail or examples in your notes.' })),
    missingConcepts: ['Real-world trade-offs', 'Concrete worked example', 'Common mistakes or misconceptions'].slice(0, Math.max(1, 5 - concepts.length)),
    relationships: concepts.slice(1, 7).map((target, i) => ({
      from: concepts[0] || 'Main Topic',
      to: target,
      type: i % 2 ? 'uses' : 'part of',
      strength: 55 + ((i * 8) % 40),
    })),
  }
}

const fallbackLearning = (note) => {
  const concepts = note?.concepts?.length ? note.concepts : note?.keywords?.length ? note.keywords : ['Core Concept A', 'Core Concept B', 'Core Concept C', 'Sub-topic D']
  const subject = note?.subject || 'General'
  const isCoding = /java|python|sql|javascript|typescript|node|c\+\+|c#|dsa|r\s|rust|go\s|golang|kotlin|swift|html|css/i.test(subject || '')
  return {
    flashcards: concepts.slice(0, 6).map((c) => ({
      front: `Define ${c} in your own words and give 1 tiny example.`,
      back: `Strong answer: WHAT ${c} is + HOW it behaves + 1 real example from your notes.`,
      concept: c,
      difficulty: 'medium',
    })),
    quiz: concepts.slice(0, 3).map((c, i) => ({
      question: `Which statement about ${c} is most accurate?`,
      options: [
        `${c} should be memorized word-for-word before thinking about it.`,
        `${c} has a specific role and produces a tangible result when applied.`,
        `${c} never interacts with other concepts on this page.`,
        `${c} is only useful on the exam and not afterwards.`,
      ],
      correctIndex: 1,
      explanation: `Concepts are tools. Know what ${c} DOES and where it applies, not just what it says.`,
      concept: c,
    })),
    practiceQuestions: concepts.slice(0, 2).map((c) => ({
      question: `Work through 1 concrete example that uses ${c}. Name inputs → each step → final output.`,
      idealAnswer: 'A numbered walkthrough with real values/data and a one-sentence observation of the result.',
      difficulty: 'medium',
    })),
    teachBackChallenges: [
      {
        prompt: `Explain the main idea of ${note?.title || subject} to a 12-year-old, using 1 real-world analogy and 1 tiny worked example.`,
        whatToLookFor: 'Can you explain it without jargon? Did you name 1 input, the process, and 1 output?',
      },
    ],
    revisionSummary: [
      `1) Big picture — one sentence about ${note?.title || subject}.`,
      `2) Key concepts — ${concepts.slice(0, 4).join(', ')}.`,
      '3) Pick the 1 weakest concept; do blurting out loud + 1 worked example.',
      '4) 8-question self quiz. Wrong answers = red mark for 24h later re-test.',
      '5) #1 hardest concept — explain it to a friend without notes.',
    ].join('\n'),
    codingChallenges: isCoding
      ? [
          {
            title: `${subject} practice drill`,
            description: `Write a tiny ${subject} snippet using ${concepts[0] || 'the main concept'} and print/display the result.`,
            starter: `// 1. Create small example input  2. Apply ${concepts[0] || 'the concept'}  3. Print the result\n`,
            expected: `Runs without errors; output clearly demonstrates ${concepts[0] || 'the concept'}.`,
            language: guessLang(subject),
          },
        ]
      : [],
  }
}

const fallbackBlindSpots = (note) => {
  const concepts = note?.concepts?.length ? note.concepts : ['Core Idea']
  return {
    topicStructure: [
      { name: 'Why it matters', category: 'prerequisite', order: 1 },
      { name: 'Definition', category: 'core', order: 2 },
      { name: 'Mental model', category: 'core', order: 3 },
      { name: 'Worked example', category: 'core', order: 4 },
      { name: 'Common mistakes', category: 'application', order: 5 },
      { name: 'Edge cases', category: 'advanced', order: 6 },
      { name: 'Real use case', category: 'application', order: 7 },
      { name: 'Next topic connection', category: 'advanced', order: 8 },
    ],
    knowledgeGaps: concepts.slice(-2).length
      ? concepts.slice(-2).map((concept, i) => ({
          concept,
          severity: i === 0 ? 'high' : 'medium',
          why: 'Not covered with an explicit worked example in your notes.',
          recommendedAction: `Add 1 worked example + 1 common mistake for ${concept}.`,
        }))
      : [{ concept: 'Worked example walkthrough', severity: 'high', why: 'Missing step-by-step with numbers/data.', recommendedAction: 'Write a 3-5 step numbered walkthrough.' }],
    unmasteredFromNotes: concepts.slice(-2).length ? concepts.slice(-2) : ['Common misconceptions', 'Trade-offs / when NOT to use'],
    blindSpotSummary: 'You have the skeleton. Lock this in by adding a worked example, a common-mistakes list, and one real-world trade-off.',
  }
}

const fallbackExplainNote = (question) => ({
  answer: `AI unavailable right now. About "${question}": the best grounded answer comes from re-reading your note's summary + the 3 key concepts and doing 1 worked example.`,
  references: ['Open your note summary', 'Look at the key concepts list', 'Do 1 worked example'],
  confidence: 20,
  requiresOutsideContext: true,
})

const fallbackExplainDrawing = (note) => {
  const shapes = (note?.snapshot || note?.tldrawSnapshot)?._serializedShapes
  const shapeCount = Array.isArray(shapes) ? shapes.length : 3
  return {
    summary: `Your ${note?.title || 'drawing'} looks like a concept map in progress (${shapeCount}+ shapes). Start with a central root box, 3 branches for key ideas, and LABELED arrows.`,
    elementsDetected: ['Central idea', 'Supporting ideas', 'Unlabeled arrows (if any)'],
    connectionsDetected: ['Root → Idea 1', 'Root → Idea 2'],
    missingConnections: ['Cause → effect arrow', 'A concrete worked example shape', 'Failure / edge-case branch'],
    suggestedImprovements: [
      { suggestion: 'Add 1 specific worked example as its own shape.', priority: 'high' },
      { suggestion: 'Label every arrow (uses / causes / part of), not just lines.', priority: 'high' },
      { suggestion: 'Mark the weakest concept in red so you revisit it.', priority: 'medium' },
    ],
  }
}

const fallbackRevision = (minutes, note) => {
  const weak = (note?.concepts || []).slice(-3).length ? (note?.concepts || []).slice(-3) : ['Concept X', 'Concept Y']
  if (minutes <= 5) {
    return {
      totalMinutes: 5,
      blocks: [{ title: 'Blurting sprint', minutes: 5, activity: 'Close notes. Write everything you remember. Mark gaps in red. Re-read ONLY the gaps.', focusConcepts: weak.slice(0, 2), technique: 'Blurting' }],
      priorityWeakConcepts: weak.slice(0, 2),
      whyFocused: '5 minutes = gap-spotting only. No reading, no videos.',
    }
  }
  if (minutes <= 10) {
    return {
      totalMinutes: 10,
      blocks: [
        { title: 'Blurting + gap map', minutes: 5, activity: 'Close notes. Dump brain. Mark gaps in red.', focusConcepts: weak.slice(0, 2), technique: 'Blurting' },
        { title: 'Active Recall 5 Qs', minutes: 5, activity: 'Write + answer 5 quick self-questions. Self-grade.', focusConcepts: weak.slice(0, 3), technique: 'Active Recall' },
      ],
      priorityWeakConcepts: weak.slice(0, 3),
      whyFocused: '10 minutes = gap-map first, then active recall on weak items.',
    }
  }
  return {
    totalMinutes: 20,
    blocks: [
      { title: 'Blurting gap inventory', minutes: 6, activity: 'No-notes dump. Highlight gaps in red ink.', focusConcepts: weak.slice(0, 3), technique: 'Blurting' },
      { title: 'Weak concept study', minutes: 6, activity: 'Restudy the 3 weakest concepts; each gets 1 worked example.', focusConcepts: weak.slice(0, 3), technique: 'Active Recall' },
      { title: 'Practice quiz (8 Qs)', minutes: 5, activity: 'Self-quiz. Wrong answers → flag for 24h re-test.', focusConcepts: weak.slice(0, 4), technique: 'Practice Testing' },
      { title: 'Feynman teach-back', minutes: 3, activity: 'Explain #1 weakest concept out loud without notes.', focusConcepts: weak.slice(0, 1), technique: 'Feynman Technique' },
    ],
    priorityWeakConcepts: weak.slice(0, 4),
    whyFocused: '20 minutes = GAP → FIX → TEST → LOCK. Skip the quiz and forgetting returns in 48h.',
  }
}

const fallbackEvolution = (meta) => {
  const total = meta?.counts?.total || 0
  return {
    snapshots: total > 0
      ? [
          { date: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(), conceptsCount: Math.max(1, Math.round(total / 2)), coverage: 30, confidence: 25 },
          { date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), conceptsCount: Math.max(2, total), coverage: 55, confidence: 50 },
          { date: new Date().toISOString(), conceptsCount: Math.max(3, total + 2), coverage: 72, confidence: 68 },
        ]
      : [],
    topConcepts: (meta?.tags || []).slice(0, 12).map((name) => ({ name, occurrences: 1 + Math.round(Math.random() * 4) })),
    growth: total > 0
      ? { startingCoverage: 30, latestCoverage: 72, startingConfidence: 25, latestConfidence: 68, notesAnalyzed: total }
      : { startingCoverage: 0, latestCoverage: 0, startingConfidence: 0, latestConfidence: 0, notesAnalyzed: 0 },
    generated: false,
  }
}

const guessLang = (subject) => {
  const s = String(subject || '').toLowerCase()
  if (s.includes('java') && !s.includes('script')) return 'Java'
  if (s.includes('python')) return 'Python'
  if (s.includes('sql') || s.includes('database')) return 'SQL'
  if (s.includes('javascript') || s.includes('node')) return 'JavaScript'
  if (s.includes('c++')) return 'C++'
  if (s.includes('c#')) return 'C#'
  return 'Code'
}

// ============== PUBLIC EXPORT ==============
export const notesAIService = {
  guestId: getGuestId(),

  async analyze(note) {
    const id = note?.id || note?._id
    if (!id) return fallbackAnalyze(note)
    try {
      return await post(`/notes/${id}/ai/analyze`, { noteSnippet: note?.content || '' })
    } catch (err) {
      console.warn('[notesAIService] analyze fallback:', err.message)
      return fallbackAnalyze(note)
    }
  },

  async transformToLearning(note) {
    const id = note?.id || note?._id
    if (!id) return fallbackLearning(note)
    try {
      return await post(`/notes/${id}/ai/learning`, {})
    } catch (err) {
      console.warn('[notesAIService] learning fallback:', err.message)
      return fallbackLearning(note)
    }
  },

  async blindSpots(note, analysis) {
    const id = note?.id || note?._id
    if (!id) return fallbackBlindSpots(note)
    try {
      return await post(`/notes/${id}/ai/blindspots`, { analysis })
    } catch (err) {
      console.warn('[notesAIService] blindSpots fallback:', err.message)
      return fallbackBlindSpots(note)
    }
  },

  async explainNote(note, question) {
    const id = note?.id || note?._id
    if (!id) return fallbackExplainNote(question)
    try {
      return await post(`/notes/${id}/ai/explain`, { question })
    } catch (err) {
      console.warn('[notesAIService] explainNote fallback:', err.message)
      return fallbackExplainNote(question)
    }
  },

  async explainDrawing(note) {
    const id = note?.id || note?._id
    if (!id) return fallbackExplainDrawing(note)
    try {
      return await post(`/notes/${id}/ai/drawing`, {})
    } catch (err) {
      console.warn('[notesAIService] explainDrawing fallback:', err.message)
      return fallbackExplainDrawing(note)
    }
  },

  async revisionPlan(note, minutes, analysis) {
    const id = note?.id || note?._id
    if (!id) return fallbackRevision(minutes, note)
    try {
      return await post(`/notes/${id}/ai/revision`, { minutes, analysis })
    } catch (err) {
      console.warn('[notesAIService] revisionPlan fallback:', err.message)
      return fallbackRevision(minutes, note)
    }
  },

  async knowledgeEvolution({ subject, meta } = {}) {
    try {
      const params = subject ? { subject } : {}
      return await get('/notes/ai/evolution', params)
    } catch (err) {
      console.warn('[notesAIService] knowledgeEvolution fallback:', err.message)
      return fallbackEvolution(meta)
    }
  },
}

export default notesAIService
