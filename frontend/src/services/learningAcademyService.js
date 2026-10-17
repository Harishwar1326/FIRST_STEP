import { api } from './api';

const GUEST_KEY = 'la_guest_id';
const SESSION_KEY = 'la_session_id';

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const getOrCreateGuest = () => {
  try {
    let g = localStorage.getItem(GUEST_KEY);
    if (!g) {
      g = 'guest-' + uid();
      localStorage.setItem(GUEST_KEY, g);
    }
    return g;
  } catch (_e) {
    return 'guest-' + uid();
  }
};

const getOrCreateSession = () => {
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = 'sess-' + uid();
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch (_e) {
    return 'sess-' + uid();
  }
};

const headers = () => ({
  'x-guest-id': getOrCreateGuest(),
  'x-session-id': getOrCreateSession(),
});

const post = (url, body) => api.post(url, body, { headers: headers() }).then((r) => r.data);

const staticLessonFallback = (topic, difficulty = 'medium') => ({
  topic,
  difficulty,
  explanation: `${topic} is a concept you can understand by breaking it into small parts. Start with the definition, then look at inputs and outputs, then trace a concrete example.`,
  realWorldAnalogy: `Think of ${topic} like a cookbook recipe. Ingredients = inputs, steps = algorithm, dish = result you can check and share.`,
  example: {
    setup: `Suppose we are studying ${topic}.`,
    steps: [
      'Step 1: State the problem clearly in one sentence.',
      'Step 2: Write down 2-3 small test cases with expected outcomes.',
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
    correctReasoning: `Because ${topic} follows defined rules, changing a key variable usually shifts the output predictably.`,
  },
  miniChallenge: {
    title: `Hands-on mini-challenge for ${topic}`,
    prompt: `Take a small, real instance of ${topic} and apply the process. Write down: inputs, each step, and the final result.`,
    expectedDeliverables: [
      'A short written walkthrough',
      'One worked example with actual numbers or data',
      'One thing you found surprising',
    ],
  },
  shortReflection: {
    prompt: `In 2-3 sentences, write how ${topic} is different from the most similar concept you already know. When would you use this one instead?`,
    hints: ['Compare inputs/outputs', 'Compare cost or speed', 'Compare reliability or failure cases'],
  },
  source: 'client-fallback',
});

const staticWhatIfFallback = (topic) => ({
  challenges: [
    {
      id: 'increase-x',
      prompt: `What happens if we increase the key input of ${topic} by a factor of 10?`,
      correctPrediction: 'The core pattern stays the same, but linear cost or size terms scale proportionally while constant overhead becomes negligible.',
      reasoning: 'Most concepts behave smoothly under scaling; separate linear parts from constant parts from non-linear parts.',
    },
    {
      id: 'change-condition',
      prompt: 'What happens if the edge case you assumed never happens actually occurs?',
      correctPrediction: 'The concept either produces a wrong answer, throws an explicit error, or degrades gracefully depending on design.',
      reasoning: 'Real systems spend most of their bug-fixing on exactly these edge cases.',
    },
    {
      id: 'missing-step',
      prompt: `What happens if we remove one step of the ${topic} process?`,
      correctPrediction: 'Either the output becomes wrong, or a later step fails because the missing step\'s invariant was violated.',
      reasoning: 'Every step exists to maintain some invariant. Remove it, and the next steps go off the rails.',
    },
  ],
  source: 'client-fallback',
});

export const learningAcademyService = {
  guestId: getOrCreateGuest(),
  sessionId: getOrCreateSession(),

  async generateLesson({ topic, difficulty, subject }) {
    try {
      return await post('/academy-ai/generate-lesson', { topic, difficulty, subject });
    } catch (err) {
      console.warn('[learningAcademy] generateLesson fallback:', err.message);
      return {
        lesson: staticLessonFallback(topic, difficulty || 'medium'),
        activityId: null,
        predictionHint: 'Answer the prediction question BEFORE reading the explanation fully.',
      };
    }
  },

  async generateMission({ topic, difficulty }) {
    try {
      return await post('/academy-ai/generate-mission', { topic, difficulty });
    } catch (err) {
      console.warn('[learningAcademy] generateMission fallback:', err.message);
      const lower = String(topic || '').toLowerCase();
      let mission;
      if (lower.includes('java')) {
        mission = {
          id: 'mission-java-robot-debug',
          title: 'Mission: Debug a delivery robot',
          topic,
          narrative: 'A warehouse delivery robot written in Java keeps skipping the last package.',
          objective: 'Find the bug, fix it, and verify all 6 packages are delivered in order.',
          roles: ['Junior Java Engineer', 'Robot QA Tester'],
          tasks: [
            'Read the loop that iterates the delivery list.',
            'Trace the values of i, length, and stop-condition using a table.',
            'Write a small Java method that runs the corrected loop.',
            'Explain why off-by-one bugs are a recurring pattern.',
          ],
          successCriteria: [
            'All 6 packages appear in the final delivered list.',
            'You can state the bug in one sentence.',
            'You fixed the loop boundary correctly.',
          ],
          debrief: 'Real robots fail for exactly this kind of bug every day.',
          source: 'client-fallback',
        };
      } else if (lower.includes('sql') || lower.includes('database')) {
        mission = {
          id: 'mission-sql-investigate',
          title: 'Mission: Investigate a suspicious orders database',
          topic,
          narrative: 'A shop exported their PostgreSQL orders but totals look wrong.',
          objective: 'Find duplicates, missing customer IDs, and summarize monthly revenue.',
          roles: ['Forensic Data Analyst', 'SQL Investigator'],
          tasks: ['Count rows vs DISTINCT order_ids', 'Find orphaned orders', 'Group revenue by month', 'Suggest one index'],
          successCriteria: ['You identified the duplicate count', 'You produced the orphaned-orders query', 'You explained GROUP BY usage'],
          debrief: 'Database investigations: count first, then join, then group.',
          source: 'client-fallback',
        };
      } else if (lower.includes('python')) {
        mission = {
          id: 'mission-python-build-tool',
          title: 'Mission: Build a tiny study-planner tool in Python',
          topic,
          narrative: 'Your study group needs a CLI tool that prints a prioritized plan.',
          objective: 'Write, run, and test a Python script that reads CSV tasks.',
          roles: ['Python Tool Author', 'Usability Tester'],
          tasks: ['Define task CSV format', 'Parse CSV into dicts', 'Sort and print', 'Validate empty titles'],
          successCriteria: ['Script prints 5 tasks in correct order', 'Invalid rows skipped without crash', 'Explain sorted() with a key'],
          debrief: 'Nearly every Python tool is: read data, transform, write output.',
          source: 'client-fallback',
        };
      } else {
        mission = {
          id: 'mission-generic-apply',
          title: `Mission: Apply ${topic} to a small real project`,
          topic,
          narrative: `Theory about ${topic} only sticks when you use it for something concrete.`,
          objective: 'Complete a tiny real artifact using the concept end-to-end.',
          roles: ['Applied Learner', 'Self-Reviewer'],
          tasks: ['Pick one real artifact from your life', 'Apply the concept step by step', 'Write down what went differently from theory', 'Explain to a friend using the artifact'],
          successCriteria: ['Real artifact produced', 'Captured a theory vs practice difference', 'Can explain via the artifact'],
          debrief: 'A small real artifact beats a dozen textbook examples.',
          source: 'client-fallback',
        };
      }
      return { mission, activityId: null };
    }
  },

  async generatePrediction({ topic, difficulty, concept }) {
    try {
      return await post('/academy-ai/generate-prediction', { topic, difficulty, concept });
    } catch (err) {
      console.warn('[learningAcademy] generatePrediction fallback:', err.message);
      return {
        prediction: {
          scenario: `You are about to see a small demonstration of ${topic}. Before we run it, make a prediction.`,
          setup: 'The input is slightly different from the textbook example.',
          prompt: 'Predict: what will happen? And write a one-sentence reason for your guess.',
          expectedOutcome: 'The pattern still holds but the result is larger or more concentrated.',
          followUpQuestions: ['What rule did you use to make the prediction?', 'If wrong, which assumption will you reconsider first?'],
          source: 'client-fallback',
        },
        activityId: null,
      };
    }
  },

  async submitPrediction(payload) {
    try {
      return await post('/academy-ai/submit-prediction', payload);
    } catch (err) {
      console.warn('[learningAcademy] submitPrediction fallback:', err.message);
      return { predictionAccuracy: payload.isCorrect ? 100 : 0, activityId: null };
    }
  },

  async evaluateTeachBack({ topic, userExplanation, lesson, activityId }) {
    try {
      return await post('/academy-ai/evaluate-teach-back', { topic, userExplanation, lesson, activityId });
    } catch (err) {
      console.warn('[learningAcademy] evaluateTeachBack fallback:', err.message);
      const len = typeof userExplanation === 'string' ? userExplanation.trim().length : 0;
      const score = len >= 250 ? 82 : len >= 120 ? 68 : 52;
      return {
        evaluation: {
          score,
          accuracy: Math.min(100, score + 3),
          completeness: Math.max(30, score - 5),
          understanding: score,
          strengths: len ? ['Stated the topic clearly', 'Tried to use own words'] : [],
          misconceptions: [len < 120 ? 'Explanation was too short — likely skipped a key part.' : 'Potentially missed edge cases.'],
          constructiveFeedback: len
            ? 'Good start. Next time add a concrete example, state what CANNOT happen, and finish with a real use case.'
            : 'Try the Feynman technique: write as if explaining to a 12-year-old.',
          suggestedRevision: `Rewrite your explanation with: (1) a one-line definition, (2) a tiny example, (3) one thing that breaks if you misuse ${topic || 'the concept'}.`,
          source: 'client-fallback',
        },
        activityId: null,
      };
    }
  },

  async fixMisconception({ topic, wrongAnswer, correctAnswer, question, activityId }) {
    try {
      return await post('/academy-ai/fix-misconception', { topic, wrongAnswer, correctAnswer, question, activityId });
    } catch (err) {
      console.warn('[learningAcademy] fixMisconception fallback:', err.message);
      return {
        plan: {
          likelyMisconception: `The answer suggests you may have mixed up two related ideas around ${topic || 'the topic'}.`,
          whyItFeelsRight: 'It feels right because the wrong pattern is similar to something you already know.',
          targetedActivity: {
            title: 'Side-by-side correction activity',
            steps: [
              'Draw two columns: correct mental model vs the pattern you just used.',
              'List one input where both give the same answer (this is why confusion is tricky).',
              'List one input where they give DIFFERENT answers — your diverging test case.',
              'Apply the correct pattern to that diverging input by hand.',
            ],
            workedExample: question
              ? `For "${question}", first name the rule precisely, then list two cases where it applies and one where it does NOT.`
              : 'Always create a diverging test case.',
            durationMinutes: 8,
          },
          checkQuestion: 'Explain the difference between the two patterns and give the diverging test case.',
          source: 'client-fallback',
        },
        activityId: null,
      };
    }
  },

  async resolveMisconceptionFixed(activityId) {
    try {
      return await post('/academy-ai/resolve-misconception', { activityId });
    } catch (err) {
      console.warn('[learningAcademy] resolveMisconceptionFixed fallback:', err.message);
      return { ok: true, activityId };
    }
  },

  async generateWhatIf({ topic, difficulty, seedPrompt, activityId }) {
    try {
      return await post('/academy-ai/generate-what-if', { topic, difficulty, seedPrompt, activityId });
    } catch (err) {
      console.warn('[learningAcademy] generateWhatIf fallback:', err.message);
      return { whatIf: staticWhatIfFallback(topic), activityId: null };
    }
  },

  async markStage({ activityId, stage, topic }) {
    try {
      return await post('/academy-ai/mark-stage', { activityId, stage, topic });
    } catch (err) {
      console.warn('[learningAcademy] markStage fallback:', err.message);
      const order = ['explored', 'predicted', 'learned', 'experimented', 'explained', 'improved'];
      const i = order.indexOf(stage);
      return { ok: true, completion: i >= 0 ? Math.round(((i + 1) / order.length) * 100) : 0, activityId };
    }
  },

  async getRecentActivity(limit = 10) {
    try {
      const res = await api.get(`/academy-ai/activity?limit=${limit}`, { headers: headers() });
      return res.data?.items || [];
    } catch (_err) {
      return [];
    }
  },
};

export default learningAcademyService;
