import { LearningAcademyActivity } from '../models/learningAcademyActivity.model.js'
import { callGroqJson } from '../utils/groqClient.js'
import { Analytics } from '../models/analytics.model.js'
import { modelPersonalizationService } from './modelPersonalization.service.js'

const DEFAULT_DIFFICULTY = 'medium'

const difficultyWeight = {
  beginner: 0.5,
  easy: 0.75,
  medium: 1,
  intermediate: 1,
  standard: 1,
  hard: 1.25,
  advanced: 1.25,
  expert: 1.5,
}

const normalizeRequestedDifficulty = (value) => {
  const normalized = String(value || '').toLowerCase()
  if (['beginner', 'easy'].includes(normalized)) return 'beginner'
  if (['intermediate', 'standard', 'medium'].includes(normalized)) return 'medium'
  if (['advanced', 'hard'].includes(normalized)) return 'hard'
  if (normalized === 'expert') return 'expert'
  return null
}

const selectDifficulty = (user) => {
  if (user && typeof user === 'object' && typeof user.difficulty === 'string') {
    const d = normalizeRequestedDifficulty(user.difficulty)
    if (d) return d
  }
  return DEFAULT_DIFFICULTY
}

const resolveDifficulty = async (user, requestedDifficulty) => {
  const requested = normalizeRequestedDifficulty(requestedDifficulty)
  if (requested) return requested
  const userId = user?.id || user?._id
  if (userId) {
    const guidance = await modelPersonalizationService.getStudentGuidance(String(userId)).catch(() => null)
    if (guidance?.difficultyBand) {
      return guidance.difficultyBand === 'beginner' ? 'beginner'
        : guidance.difficultyBand === 'advanced' ? 'hard' : 'medium'
    }
  }
  return selectDifficulty(user)
}

const staticAiLesson = ({ topic, difficulty }) => {
  const topicSafe = topic || 'the topic'
  return {
    topic: topicSafe,
    difficulty,
    explanation: `${topicSafe} is a concept you can understand by breaking it into small parts. Start with the definition, then look at the inputs and outputs, and finally trace a concrete example step by step.`,
    realWorldAnalogy: `Think of ${topicSafe} like a recipe in a cookbook. The ingredients are your inputs, the steps are the algorithm, and the dish is the result you can check and share.`,
    example: {
      setup: `Suppose we are studying ${topicSafe}.`,
      steps: [
        'Step 1: State the problem clearly in one sentence.',
        'Step 2: Write down 2–3 small test cases with expected outcomes.',
        'Step 3: Walk through one case by hand and note any surprises.',
      ],
      result: 'After the walkthrough you can see exactly what the concept produces and why.',
    },
    predictionQuestion: {
      question: `If we take the example above and change one key variable, what result do you predict?`,
      options: [
        'The output stays roughly the same',
        'The output changes in a predictable direction',
        'The concept breaks or becomes invalid',
        'We cannot tell without more information',
      ],
      correctIndex: 1,
      correctReasoning: `Because ${topicSafe} follows defined rules, changing a key variable usually shifts the output in a predictable direction that you can reason about without computing everything.`,
    },
    miniChallenge: {
      title: `Hands-on mini-challenge for ${topicSafe}`,
      prompt: `Take a small, real instance of ${topicSafe} and apply the process. Write down: (1) inputs, (2) each step, (3) the final result. If something is unclear, note what question you'd ask next.`,
      expectedDeliverables: [
        'A short written walkthrough',
        'One worked example with actual numbers or data',
        'One thing you found surprising',
      ],
    },
    shortReflection: {
      prompt: `In 2-3 sentences, write how ${topicSafe} is different from the most similar concept you already know. When would you use this one instead?`,
      hints: [
        'Compare inputs/outputs',
        'Compare cost or speed',
        'Compare reliability or failure cases',
      ],
    },
    source: 'static-fallback',
  }
}

const staticMission = ({ topic }) => {
  const topicSafe = topic || 'the topic'
  const lower = topicSafe.toLowerCase()
  if (lower.includes('java')) {
    return {
      id: 'mission-java-robot-debug',
      title: 'Mission: Debug a delivery robot',
      topic: topicSafe,
      narrative: 'A warehouse delivery robot written in Java keeps skipping the last package. The loop logic looks right but the route list ends one item early.',
      objective: 'Find the bug, fix it, and verify all 6 packages are delivered in order.',
      roles: ['Junior Java Engineer', 'Robot QA Tester'],
      tasks: [
        'Read the loop that iterates the delivery list and identify why the final item is skipped.',
        'Trace the values of i, length, and stop-condition using a table.',
        'Write a small Java method that runs the corrected loop on the test dataset.',
        'Explain why off-by-one bugs are a recurring pattern in loops.',
      ],
      successCriteria: [
        'All 6 packages appear in the final delivered list.',
        'You can state the bug in one sentence.',
        'You fixed the loop boundary correctly.',
      ],
      debrief: 'Real robots and production systems fail for exactly this kind of bug every day. Mastering loop boundaries makes you a much safer engineer.',
      source: 'static-fallback',
    }
  }
  if (lower.includes('sql') || lower.includes('query') || lower.includes('database')) {
    return {
      id: 'mission-sql-investigate',
      title: 'Mission: Investigate a suspicious orders database',
      topic: topicSafe,
      narrative: 'A small shop exported their PostgreSQL orders but totals look wrong. The manager suspects duplicate rows. Use SQL to surface what happened.',
      objective: 'Find duplicates, missing customer IDs, and summarize monthly revenue using only SELECT / JOIN / GROUP queries.',
      roles: ['Forensic Data Analyst', 'SQL Investigator'],
      tasks: [
        'Count rows and count DISTINCT order_ids — quantify the gap.',
        'Write a query that shows orders with no linked customer record.',
        'Group revenue by month and compare the top month to the bottom month.',
        'Suggest one index the shop should add to make these queries fast.',
      ],
      successCriteria: [
        'You identified the number of duplicate order_ids.',
        'You produced the orphaned-orders query.',
        'You explained why GROUP BY is the right tool for the monthly summary.',
      ],
      debrief: 'Database investigations always follow this pattern: count first, then join, then group, then sanity-check the numbers against reality.',
      source: 'static-fallback',
    }
  }
  if (lower.includes('python')) {
    return {
      id: 'mission-python-build-tool',
      title: 'Mission: Build a tiny study-planner tool in Python',
      topic: topicSafe,
      narrative: 'Your study group needs a CLI tool that reads a list of tasks and prints a prioritized plan sorted by due date.',
      objective: 'Write, run, and test a Python script that reads CSV tasks and prints the sorted plan.',
      roles: ['Python Tool Author', 'Usability Tester'],
      tasks: [
        'Define the task CSV format (title, due date, priority).',
        'Write code to parse the CSV into Python dictionaries.',
        'Sort tasks by due date then priority and print a neat plan.',
        'Add one validation: a task with an empty title should be skipped with a warning.',
      ],
      successCriteria: [
        'Running the script prints 5 example tasks in the correct order.',
        'Invalid rows are skipped but the script does not crash.',
        'You can explain why sorted() with a key is a clean approach.',
      ],
      debrief: 'Nearly every Python tool starts as "read some data, transform it, write some output" — this workflow scales to production systems.',
      source: 'static-fallback',
    }
  }
  if (lower.includes('network') || lower.includes('tcp') || lower.includes('http') || lower.includes('packet')) {
    return {
      id: 'mission-network-fix',
      title: 'Mission: Fix a broken office network',
      topic: topicSafe,
      narrative: 'The office Wi-Fi works but nobody can reach internal servers by hostname. Pings to IPs work; pings to server names fail.',
      objective: 'Diagnose the DNS failure layer by layer and propose the minimal fix.',
      roles: ['Network Support Lead', 'Troubleshooter'],
      tasks: [
        'Draw the request path: laptop → Wi-Fi router → DNS resolver → server.',
        'Explain why IP ping succeeds but hostname ping fails (name resolution vs reachability).',
        'Write the three commands you would run next and what you expect each to tell you.',
        'Propose one configuration change to restore service.',
      ],
      successCriteria: [
        'You identified DNS as the failing layer.',
        'You can separate L3/L4 reachability from name resolution.',
        'You listed concrete commands, not guesses.',
      ],
      debrief: 'Most "the network is down" tickets boil down to one layer failing while the others still work. Learn to prove which layer it is.',
      source: 'static-fallback',
    }
  }
  return {
    id: 'mission-generic-apply',
    title: `Mission: Apply ${topicSafe} to a small real project`,
    topic: topicSafe,
    narrative: `Theory about ${topicSafe} only sticks when you use it for something concrete. Choose a small, real artifact from your life and process it with the concept.`,
    objective: 'Complete a tiny but real artifact using the concept end-to-end and record what surprised you.',
    roles: ['Applied Learner', 'Self-Reviewer'],
    tasks: [
      'Pick one concrete artifact (schedule, spreadsheet, notes, code snippet) from your life.',
      'Apply the concept step by step to that artifact.',
      'Write down what went differently from the theory.',
      'Explain to a friend what the concept actually does, using the artifact as evidence.',
    ],
    successCriteria: [
      'You produced a real artifact, not an abstract example.',
      'You captured a concrete difference between theory and practice.',
      'You can explain the concept via the artifact.',
    ],
    debrief: 'Concepts feel abstract until they touch something real. A small real artifact beats a dozen textbook examples.',
    source: 'static-fallback',
  }
}

const staticPrediction = ({ topic, concept }) => {
  const label = concept || topic || 'the concept'
  return {
    scenario: `You are about to see a small demonstration of ${label}. Before we run it, make a prediction.`,
    setup: 'The input is slightly different from the textbook example — one parameter is doubled and another is removed.',
    prompt: `Predict: what will happen? And write a one-sentence reason for your guess.`,
    expectedOutcome: 'The pattern still holds but the result is larger or more concentrated, while the removed parameter introduces a default value.',
    followUpQuestions: [
      'What rule did you use to make the prediction?',
      'If your prediction is wrong, which assumption are you most likely to reconsider first?',
    ],
    source: 'static-fallback',
  }
}

const staticTeachBack = ({ topic, userExplanation }) => {
  const len = typeof userExplanation === 'string' ? userExplanation.trim().length : 0
  const score = len >= 250 ? 82 : len >= 120 ? 68 : 52
  return {
    score,
    accuracy: Math.min(100, score + 3),
    completeness: Math.max(30, score - 5),
    understanding: score,
    strengths: len
      ? ['Stated the topic clearly', 'Tried to use own words']
      : [],
    misconceptions: [
      len < 120 ? 'Explanation was too short — likely skipped a key part of the mechanism.' : 'Potentially missed edge cases or boundary conditions.',
    ],
    constructiveFeedback: len
      ? 'Good start. Next time add a concrete example, state what CANNOT happen, and finish with one real use case.'
      : 'Try the Feynman technique: write as if explaining to a 12-year-old who asks "but why?" after every sentence.',
    suggestedRevision: `Rewrite your explanation with: (1) a one-line definition, (2) a tiny example, (3) one thing that breaks if you misuse ${topic || 'the concept'}.`,
    source: 'static-fallback',
  }
}

const staticMisconception = ({ topic, wrongAnswer, question }) => {
  return {
    likelyMisconception: `The answer suggests you may have mixed up two related-but-different ideas around ${topic || 'the topic'}. This is very common.`,
    whyItFeelsRight: 'It feels right because the wrong pattern is similar to something you already know, and your brain reused that familiar shortcut.',
    targetedActivity: {
      title: 'Side-by-side correction activity',
      steps: [
        'Draw two columns: correct mental model vs the pattern you just used.',
        'List one concrete input where both patterns give the same answer (this is why the confusion is tricky).',
        'List one input where they give DIFFERENT answers — this is the test case you should always run first.',
        'Apply the correct pattern to that diverging input by hand.',
      ],
      workedExample: question
        ? `For "${question}", first name the rule precisely, then list two cases where it applies and one where it does NOT. The edge case is what fixes the misconception.`
        : 'Always create a diverging test case. A rule that has no exceptions is usually not understood yet.',
      durationMinutes: 8,
    },
    checkQuestion: 'Explain in your own words the difference between the two patterns and give the diverging test case.',
    source: 'static-fallback',
  }
}

const staticWhatIf = ({ topic }) => {
  const topicSafe = topic || 'the topic'
  return {
    challenges: [
      {
        id: 'increase-x',
        prompt: `What happens if we increase the key input of ${topicSafe} by a factor of 10?`,
        correctPrediction: 'The core pattern stays the same, but any linear cost or size terms scale proportionally while constant overhead becomes negligible.',
        reasoning: `Most concepts behave smoothly under scaling; the trick is separating linear parts from constant parts from non-linear (N²) parts.`,
      },
      {
        id: 'change-condition',
        prompt: `What happens if the edge case you assumed never happens actually occurs?`,
        correctPrediction: 'The concept either produces a wrong answer, throws an explicit error, or degrades gracefully depending on whether the design handles that boundary.',
        reasoning: 'Real systems spend most of their bug-fixing on exactly these edge cases. Predicting them in advance is the mark of strong understanding.',
      },
      {
        id: 'missing-step',
        prompt: `What happens if we remove one step of the ${topicSafe} process?`,
        correctPrediction: 'Either the output becomes wrong in a predictable direction, or a later step fails because the missing step\'s invariant was violated.',
        reasoning: 'Every step of a concept exists to maintain some invariant. When you remove it, you lose that invariant and the next steps go off the rails.',
      },
    ],
    source: 'static-fallback',
  }
}

const aiGenerateLesson = async ({ topic, difficulty, history = [] }) => {
  const recent = history.slice(-3).map((h) => ({
    topic: h.topic,
    difficulty: h.difficulty,
    understanding: h.understanding ?? null,
    misconception: h.misconception ?? null,
  }))
  const systemPrompt = [
    'You are a friendly, highly interactive study mentor working inside FirstStep Learning Academy.',
    'Generate structured JSON for a single topic lesson.',
    'The user experience flow is EXPLORE → PREDICT → LEARN → EXPERIMENT → EXPLAIN → IMPROVE, so the output must drive that loop.',
    'Adapt difficulty: if recent history shows weak understanding, simplify the explanation and add a concrete metaphor. If strong, go deeper.',
    'Return ONLY valid JSON with keys:',
    '{ topic, difficulty, explanation, realWorldAnalogy, example, predictionQuestion, miniChallenge, shortReflection }.',
    'explanation: short, written for a 16-year-old student, avoid jargon.',
    'realWorldAnalogy: one paragraph, use a kitchen / school / city analogy the student can touch or see.',
    'example: object with keys { setup, steps: string[], result }.',
    'predictionQuestion: object with keys { question, options: string[4], correctIndex: 0..3, correctReasoning: string }.',
    'miniChallenge: object with { title, prompt, expectedDeliverables: string[] } — small enough to finish in 5-10 minutes.',
    'shortReflection: object with { prompt, hints: string[] } — 2-3 sentence reflection.',
    'difficulty in JSON must match the requested difficulty exactly. Never wrap JSON in markdown fences.',
  ].join(' ')
  const json = await callGroqJson({
    systemPrompt,
    userPayload: { topic, difficulty, recentHistory: recent },
    maxTokens: 900,
    temperature: 0.4,
  })
  return json
}

const aiGenerateMission = async ({ topic, difficulty }) => {
  const systemPrompt = [
    'You create short, real-world learning missions for FirstStep Learning Academy.',
    'Turn the requested topic into a story-driven mission the student can actually complete with a laptop, pen and paper, or free tools.',
    'Return ONLY valid JSON with keys:',
    '{ id, title, topic, narrative, objective, roles: string[], tasks: string[], successCriteria: string[], debrief }.',
    'Missions should feel like work a real person in that role would do: Java → debug a robot, SQL → investigate a database, Python → build a small tool, Networking → fix a broken network.',
    'Keep it short: 3-5 tasks total, each 5-15 minutes. Avoid requiring paid software.',
    'id should be a stable lowercase slug (mission-<something-short>).',
    'Never wrap JSON in markdown fences.',
  ].join(' ')
  return callGroqJson({
    systemPrompt,
    userPayload: { topic, difficulty },
    maxTokens: 700,
    temperature: 0.5,
  })
}

const aiGeneratePrediction = async ({ topic, difficulty, concept }) => {
  const systemPrompt = [
    'You create the PREDICT stage of EXPLORE→PREDICT→LEARN for FirstStep Learning Academy.',
    'Before revealing the concept result, ask the student what will happen and why.',
    'Return ONLY valid JSON with keys:',
    '{ scenario, setup, prompt, expectedOutcome, followUpQuestions: string[] }.',
    'The prediction must be concrete, testable, and not obvious. A student should genuinely have to think.',
    'expectedOutcome describes the correct result and WHY, but does not include exact numbers unless required.',
    'Never wrap JSON in markdown fences.',
  ].join(' ')
  return callGroqJson({
    systemPrompt,
    userPayload: { topic, difficulty, concept: concept || topic },
    maxTokens: 550,
    temperature: 0.4,
  })
}

const aiEvaluateTeachBack = async ({ topic, userExplanation, lesson }) => {
  const systemPrompt = [
    'You are the EXPLAIN stage evaluator for FirstStep Learning Academy.',
    'After learning a concept, the student tries to teach it back in their own words.',
    'Evaluate understanding, accuracy, and detect common misconceptions.',
    'Return ONLY valid JSON with keys:',
    '{ score, accuracy, completeness, understanding, strengths: string[], misconceptions: string[], constructiveFeedback, suggestedRevision }.',
    'All score fields are integers 0..100. score should be the headline overall teach-back grade.',
    'misconceptions array: short actionable sentences, each naming one specific error or gap in the explanation. If explanation is empty, indicate that.',
    'constructiveFeedback should be one paragraph, encouraging, with concrete next step, not mean.',
    'suggestedRevision: 2-3 bullet style instructions on how to rewrite the explanation.',
    'Never wrap JSON in markdown fences.',
  ].join(' ')
  return callGroqJson({
    systemPrompt,
    userPayload: {
      topic,
      userExplanation: userExplanation || '(student provided no explanation)',
      lesson: lesson || null,
    },
    maxTokens: 800,
    temperature: 0.2,
  })
}

const aiFixMisconception = async ({ topic, wrongAnswer, correctAnswer, question }) => {
  const systemPrompt = [
    'You are the MISCONCEPTION DETECTOR for FirstStep Learning Academy.',
    'When a student gets a question wrong, do NOT just show the answer. Diagnose the likely underlying misconception and prescribe a tiny targeted activity that corrects it.',
    'Return ONLY valid JSON with keys:',
    '{ likelyMisconception, whyItFeelsRight, targetedActivity: { title, steps: string[], workedExample, durationMinutes }, checkQuestion }.',
    'likelyMisconception: one sentence that explains the underlying confusion pattern (not the specific answer).',
    'whyItFeelsRight: one sentence explaining why this wrong answer is tempting.',
    'targetedActivity: small activity taking 8-10 minutes max. Step-by-step, no external tools needed usually.',
    'checkQuestion: a single question the student answers afterward to confirm they fixed the confusion.',
    'Never wrap JSON in markdown fences.',
  ].join(' ')
  return callGroqJson({
    systemPrompt,
    userPayload: { topic, wrongAnswer: wrongAnswer || '', correctAnswer: correctAnswer || null, question: question || '' },
    maxTokens: 700,
    temperature: 0.3,
  })
}

const aiGenerateWhatIf = async ({ topic, difficulty, seedPrompt }) => {
  const systemPrompt = [
    'You create WHAT-IF challenges for the EXPERIMENT stage of FirstStep Learning Academy.',
    'Generate 3 scenario-changing prompts: "increase X", "change a condition", "remove one step of the process".',
    'Student must predict, then AI explains the real outcome and the reasoning.',
    'Return ONLY valid JSON with key "challenges" which is an array of 3 objects, each with keys:',
    '{ id, prompt, correctPrediction, reasoning }.',
    'id short slug: increase-x, change-condition, missing-step or similar.',
    'prompt: a short "what if?" question the student can actually reason about.',
    'correctPrediction: 1-2 sentences, the actual outcome.',
    'reasoning: 2-3 sentences explaining why. Highlight linear vs constant vs non-linear parts when relevant.',
    'Never wrap JSON in markdown fences.',
  ].join(' ')
  return callGroqJson({
    systemPrompt,
    userPayload: { topic, difficulty, seedPrompt: seedPrompt || '' },
    maxTokens: 750,
    temperature: 0.5,
  })
}

const asActivityIdentity = (user, { guestId, sessionId }) => {
  const userId = user && user.id ? user.id : null
  return { userId, guestId, sessionId }
}

const updateActivityForOwner = (activityId, user, { guestId, sessionId }, update, options = { new: true }) => {
  const owner = user?.id
    ? { userId: user.id }
    : guestId && sessionId
      ? { guestId, sessionId }
      : null
  if (!owner) return Promise.resolve(null)
  return LearningAcademyActivity.findOneAndUpdate({ _id: activityId, ...owner }, update, options)
}

const upsertActivity = async (payload) => {
  try {
    const doc = new LearningAcademyActivity(payload)
    await doc.save()
    return doc
  } catch (_error) {
    return null
  }
}

const logAnalytic = async (activity, kind, extra = {}) => {
  try {
    const log = new Analytics({
      userId: activity.userId || undefined,
      activityType: `learning_academy_${kind}`,
      score: typeof activity.understanding === 'number' ? activity.understanding : activity.teachBackScore || 0,
      metadata: {
        topic: activity.topic,
        mode: activity.lastMode,
        difficulty: activity.difficulty,
        completion: activity.completion,
        sessionId: activity.sessionId || undefined,
        ...extra,
      },
    })
    await log.save()
  } catch (_error) {
    // Optional analytics.
  }
}

export const learningAcademyService = {
  async generateLesson({ user, topic, difficulty: requestedDifficulty, guestId, sessionId, subject }) {
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      const err = new Error('topic is required')
      err.statusCode = 400
      throw err
    }

    const cleanTopic = topic.trim().slice(0, 120)
    const difficulty = await resolveDifficulty(user, requestedDifficulty)
    const history = await LearningAcademyActivity
      .find({
        $or: [{ userId: user && user.id ? user.id : null }, { guestId }].filter(Boolean),
        topic: cleanTopic,
      })
      .sort({ updatedAt: -1 })
      .limit(6)
      .lean()
      .catch(() => [])

    let lesson = await aiGenerateLesson({ topic: cleanTopic, difficulty, history }).catch(() => null)
    if (!lesson || !lesson.explanation) {
      lesson = staticAiLesson({ topic: cleanTopic, difficulty })
    }

    const identity = asActivityIdentity(user, { guestId, sessionId })
    const activity = await upsertActivity({
      ...identity,
      sessionId: sessionId || undefined,
      topic: cleanTopic,
      subject: subject || undefined,
      difficulty,
      lastMode: 'ai-learning',
      completion: 20,
      stages: { explored: true, predicted: false, learned: false, experimented: false, explained: false, improved: false },
      meta: { generatedLesson: true },
    })

    return {
      lesson: {
        topic: lesson.topic || cleanTopic,
        difficulty: lesson.difficulty || difficulty,
        explanation: lesson.explanation,
        realWorldAnalogy: lesson.realWorldAnalogy,
        example: lesson.example,
        predictionQuestion: lesson.predictionQuestion,
        miniChallenge: lesson.miniChallenge,
        shortReflection: lesson.shortReflection,
        source: lesson.source || 'groq',
      },
      activityId: activity ? activity._id : null,
      predictionHint: 'Answer the predictionQuestion BEFORE reading the explanation fully — this drives the PREDICT → LEARN loop.',
    }
  },

  async generateMission({ user, topic, difficulty: requestedDifficulty, guestId, sessionId }) {
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      const err = new Error('topic is required')
      err.statusCode = 400
      throw err
    }
    const cleanTopic = topic.trim().slice(0, 120)
    const difficulty = await resolveDifficulty(user, requestedDifficulty)
    let mission = await aiGenerateMission({ topic: cleanTopic, difficulty }).catch(() => null)
    if (!mission || !mission.title) {
      mission = staticMission({ topic: cleanTopic })
    }
    const identity = asActivityIdentity(user, { guestId, sessionId })
    const activity = await upsertActivity({
      ...identity,
      sessionId: sessionId || undefined,
      topic: cleanTopic,
      difficulty,
      missionId: mission.id,
      lastMode: 'mission',
      completion: 15,
      stages: { explored: true, predicted: false, learned: false, experimented: false, explained: false, improved: false },
    })
    return { mission, activityId: activity ? activity._id : null }
  },

  async generatePrediction({ user, topic, difficulty: requestedDifficulty, concept, guestId, sessionId }) {
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      const err = new Error('topic is required')
      err.statusCode = 400
      throw err
    }
    const cleanTopic = topic.trim().slice(0, 120)
    const difficulty = await resolveDifficulty(user, requestedDifficulty)
    let prediction = await aiGeneratePrediction({ topic: cleanTopic, difficulty, concept }).catch(() => null)
    if (!prediction || !prediction.prompt) {
      prediction = staticPrediction({ topic: cleanTopic, concept })
    }
    const identity = asActivityIdentity(user, { guestId, sessionId })
    const activity = await upsertActivity({
      ...identity,
      sessionId: sessionId || undefined,
      topic: cleanTopic,
      difficulty,
      lastMode: 'predict',
      attempts: 1,
      completion: 10,
      stages: { explored: true, predicted: true, learned: false, experimented: false, explained: false, improved: false },
    })
    return { prediction, activityId: activity ? activity._id : null }
  },

  async submitPrediction({ user, activityId, sessionId, guestId, topic, predictionAnswer, isCorrect, correctReasoning }) {
    const cleanTopic = topic ? topic.trim().slice(0, 120) : null
    const accuracy = isCorrect ? 100 : 0
    const updatePayload = {
      lastMode: 'predict',
      attempts: 1,
      predictionAccuracy: accuracy,
      completion: 25,
      stages: { predicted: true, learned: Boolean(correctReasoning) },
      meta: { predictionAnswer, correctReasoning: correctReasoning || null },
    }
    let activity = null
    try {
      if (activityId) {
        activity = await updateActivityForOwner(activityId, user, { guestId, sessionId }, { $set: updatePayload, $inc: { attempts: 0 } })
      }
    } catch (_error) {
      activity = null
    }
    if (!activity) {
      const identity = asActivityIdentity(user, { guestId, sessionId })
      activity = await upsertActivity({
        ...identity,
        sessionId: sessionId || undefined,
        topic: cleanTopic || 'unknown',
        ...updatePayload,
      })
    }
    if (activity) await logAnalytic(activity, 'predict', { isCorrect })
    return { predictionAccuracy: accuracy, activityId: activity ? activity._id : null }
  },

  async evaluateTeachBack({ user, topic, userExplanation, lesson, activityId, sessionId, guestId }) {
    if (!userExplanation || typeof userExplanation !== 'string' || !userExplanation.trim()) {
      const err = new Error('userExplanation is required')
      err.statusCode = 400
      throw err
    }
    const cleanTopic = topic ? topic.trim().slice(0, 120) : 'unknown'
    let evaluation = await aiEvaluateTeachBack({ topic: cleanTopic, userExplanation: userExplanation.trim().slice(0, 5000), lesson }).catch(() => null)
    if (!evaluation || typeof evaluation.score !== 'number') {
      evaluation = staticTeachBack({ topic: cleanTopic, userExplanation: userExplanation.trim() })
    }
    const identity = asActivityIdentity(user, { guestId, sessionId })
    let activity = null
    try {
      if (activityId) {
        activity = await updateActivityForOwner(
          activityId, user, { guestId, sessionId },
          {
            $set: {
              topic: cleanTopic,
              teachBackScore: evaluation.score,
              understanding: evaluation.understanding ?? evaluation.score,
              teachBackMisconceptions: evaluation.misconceptions || [],
              completion: 80,
              lastMode: 'teach-back',
              stages: { explained: true, learned: true },
            },
          },
          { new: true }
        )
      }
    } catch (_error) {
      activity = null
    }
    if (!activity) {
      activity = await upsertActivity({
        ...identity,
        sessionId: sessionId || undefined,
        topic: cleanTopic,
        teachBackScore: evaluation.score,
        understanding: evaluation.understanding ?? evaluation.score,
        teachBackMisconceptions: evaluation.misconceptions || [],
        completion: 80,
        lastMode: 'teach-back',
        stages: { explained: true, learned: true },
      })
    }
    if (activity) {
      await logAnalytic(activity, 'teach_back', {
        accuracy: evaluation.accuracy,
        misconceptionCount: (evaluation.misconceptions || []).length,
      })
    }
    return {
      evaluation: {
        score: evaluation.score,
        accuracy: evaluation.accuracy,
        completeness: evaluation.completeness,
        understanding: evaluation.understanding,
        strengths: Array.isArray(evaluation.strengths) ? evaluation.strengths : [],
        misconceptions: Array.isArray(evaluation.misconceptions) ? evaluation.misconceptions : [],
        constructiveFeedback: evaluation.constructiveFeedback,
        suggestedRevision: evaluation.suggestedRevision,
        source: evaluation.source || 'groq',
      },
      activityId: activity ? activity._id : null,
    }
  },

  async fixMisconception({ user, topic, wrongAnswer, correctAnswer, question, activityId, sessionId, guestId }) {
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      const err = new Error('topic is required')
      err.statusCode = 400
      throw err
    }
    const cleanTopic = topic.trim().slice(0, 120)
    let plan = await aiFixMisconception({ topic: cleanTopic, wrongAnswer, correctAnswer, question }).catch(() => null)
    if (!plan || !plan.likelyMisconception) {
      plan = staticMisconception({ topic: cleanTopic, wrongAnswer, question })
    }
    const identity = asActivityIdentity(user, { guestId, sessionId })
    let activity = null
    try {
      if (activityId) {
        activity = await updateActivityForOwner(
          activityId, user, { guestId, sessionId },
          {
            $set: {
              topic: cleanTopic,
              misconception: plan.likelyMisconception,
              misconceptionFixed: false,
              lastMode: 'misconception',
              stages: { improved: false },
            },
          },
          { new: true }
        )
      }
    } catch (_error) {
      activity = null
    }
    if (!activity) {
      activity = await upsertActivity({
        ...identity,
        sessionId: sessionId || undefined,
        topic: cleanTopic,
        misconception: plan.likelyMisconception,
        misconceptionFixed: false,
        lastMode: 'misconception',
      })
    }
    if (activity) await logAnalytic(activity, 'misconception', { planLength: 3 })
    return {
      plan: {
        likelyMisconception: plan.likelyMisconception,
        whyItFeelsRight: plan.whyItFeelsRight,
        targetedActivity: plan.targetedActivity,
        checkQuestion: plan.checkQuestion,
        source: plan.source || 'groq',
      },
      activityId: activity ? activity._id : null,
    }
  },

  async resolveMisconceptionFixed({ user, activityId, guestId, sessionId }) {
    if (!activityId) {
      const err = new Error('activityId is required')
      err.statusCode = 400
      throw err
    }
    let activity = null
    try {
      activity = await updateActivityForOwner(
        activityId, user, { guestId, sessionId },
        { $set: { misconceptionFixed: true, completion: 95, 'stages.improved': true } },
        { new: true }
      )
    } catch (_error) {
      return { ok: false }
    }
    return { ok: Boolean(activity), activityId: activity ? activity._id : null }
  },

  async generateWhatIf({ user, topic, difficulty: requestedDifficulty, seedPrompt, activityId, sessionId, guestId }) {
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      const err = new Error('topic is required')
      err.statusCode = 400
      throw err
    }
    const cleanTopic = topic.trim().slice(0, 120)
    const difficulty = await resolveDifficulty(user, requestedDifficulty)
    let result = await aiGenerateWhatIf({ topic: cleanTopic, difficulty, seedPrompt }).catch(() => null)
    if (!result || !Array.isArray(result.challenges) || result.challenges.length === 0) {
      result = staticWhatIf({ topic: cleanTopic })
    }
    const identity = asActivityIdentity(user, { guestId, sessionId })
    let activity = null
    try {
      if (activityId) {
        activity = await updateActivityForOwner(
          activityId, user, { guestId, sessionId },
          {
            $set: {
              topic: cleanTopic,
              difficulty,
              lastMode: 'what-if',
              completion: 60,
              stages: { experimented: true, learned: true },
            },
          },
          { new: true }
        )
      }
    } catch (_error) {
      activity = null
    }
    if (!activity) {
      activity = await upsertActivity({
        ...identity,
        sessionId: sessionId || undefined,
        topic: cleanTopic,
        difficulty,
        lastMode: 'what-if',
        completion: 60,
        stages: { experimented: true, learned: true },
      })
    }
    if (activity) await logAnalytic(activity, 'what_if', { challenges: result.challenges.length })
    return {
      whatIf: {
        challenges: result.challenges.map((c) => ({
          id: c.id,
          prompt: c.prompt,
          correctPrediction: c.correctPrediction,
          reasoning: c.reasoning,
        })),
        source: result.source || 'groq',
      },
      activityId: activity ? activity._id : null,
    }
  },

  async markStageCompleted({ user, activityId, stage, sessionId, guestId, topic }) {
    const validStages = ['explored', 'predicted', 'learned', 'experimented', 'explained', 'improved']
    if (!activityId || !validStages.includes(stage)) {
      const err = new Error('activityId and a valid stage are required')
      err.statusCode = 400
      throw err
    }
    const stageIndex = validStages.indexOf(stage)
    const completion = Math.round(((stageIndex + 1) / validStages.length) * 100)
    let activity = null
    try {
      activity = await updateActivityForOwner(
        activityId, user, { guestId, sessionId },
        {
          $set: {
            [`stages.${stage}`]: true,
            completion,
            topic: topic ? topic.trim().slice(0, 120) : undefined,
          },
        },
        { new: true }
      )
    } catch (_error) {
      return { ok: false }
    }
    if (activity && stage === 'improved' && user && user.id) {
    }
    if (activity) await logAnalytic(activity, `stage_${stage}`, { completion })
    return { ok: Boolean(activity), completion, activityId: activity ? activity._id : null }
  },

  async getRecentActivity({ user, guestId, limit = 10 }) {
    const query = {
      $or: [{ userId: user && user.id ? user.id : null }, { guestId }].filter(Boolean),
    }
    if (!query.$or.length) return []
    try {
      return await LearningAcademyActivity.find(query).sort({ updatedAt: -1 }).limit(limit).lean()
    } catch (_error) {
      return []
    }
  },
}

export default learningAcademyService
