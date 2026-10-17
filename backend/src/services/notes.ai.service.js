import { callGroqJson } from "../utils/groqClient.js";
import { callGeminiJson } from "../utils/geminiClient.js";
import { twinService } from "./twin.service.js";
import { Analytics } from "../models/analytics.model.js";
import { Note } from "../models/note.model.js";
import { chromaNotesService } from "./chromaNotes.service.js";

// Prefer Google Gemini (responseMimeType application/json) with Groq as a
// transparent fallback, then local rule-engine fallbacks. Each AI function
// below follows: GEMINI → GROQ → throw (caught by the service layer → local).
const aiCallJson = async (params) => {
  const gem = await callGeminiJson(params);
  if (gem) return gem;
  return callGroqJson(params);
};

const analyzeSystem = [
  "You analyze student notes for FirstStep Smart Notes Studio.",
  "Return ONLY valid JSON with the exact shape below, no markdown fences:",
  "{",
  "  keyConcepts: { name: string, confidence: number, importance: number }[],   // 6..12",
  "  strongConcepts: string[],                                                     // 2..5 of keyConcepts names",
  "  weakConcepts: { name: string, whyWeak: string }[],                           // 2..6",
  "  missingConcepts: { name: string, whyMissing: string }[],                     // 1..5",
  "  relationships: { from: string, to: string, type: string, strength: number }[] // 5..15",
  "}",
  "confidence/importance/strength are integers 0..100.",
  'type values should be short labels like "prerequisite", "causes", "example of", "uses", "opposed to", "part of".',
].join("\n");

const aiAnalyzeNotes = async ({
  title,
  subject,
  content,
  concepts,
  keywords,
  summary,
}) =>
  aiCallJson({
    systemPrompt: analyzeSystem,
    userPayload: { title, subject, content, concepts, keywords, summary },
    maxTokens: 850,
    temperature: 0.25,
  });

const notesToLearningSystem = [
  "You convert student notes into structured learning material in FirstStep Smart Notes Studio.",
  "Return ONLY valid JSON, no markdown fences, with the following shape:",
  "{",
  '  flashcards: { front: string, back: string, concept: string, difficulty: "easy"|"medium"|"hard" }[], // 5..8',
  "  quiz: { question: string, options: string[4], correctIndex: number, explanation: string, concept: string }[], // 3..5",
  "  practiceQuestions: { question: string, idealAnswer: string, difficulty: string }[], // 2..4",
  "  teachBackChallenges: { prompt: string, whatToLookFor: string }[], // 1..3",
  "  revisionSummary: string, // 3..6 bullet style lines separated by newlines",
  "  codingChallenges: { title: string, description: string, starter: string, expected: string, language: string }[] // 0..3; only if the subject/topic sounds like coding (Java, Python, SQL, JS, C++, DSA, etc.). Otherwise EMPTY array [].",
  "}",
].join("\n");

const aiNotesToLearning = async ({
  title,
  subject,
  content,
  concepts,
  keywords,
}) =>
  aiCallJson({
    systemPrompt: notesToLearningSystem,
    userPayload: { title, subject, content, concepts, keywords },
    maxTokens: 1000,
    temperature: 0.35,
  });

const blindSpotSystem = [
  "You detect blind spots / knowledge gaps in FirstStep Smart Notes Studio.",
  "Given the student's note content + extracted key concepts, compare with a typical complete topic structure.",
  "Return ONLY valid JSON with shape:",
  "{",
  '  topicStructure: { name: string, category: "core"|"prerequisite"|"advanced"|"application", order: number }[], // 8..14',
  '  knowledgeGaps: { concept: string, severity: "high"|"medium"|"low", why: string, recommendedAction: string }[], // 2..6',
  "  unmasteredFromNotes: string[], // names from the notes that are probably not solid",
  "  blindSpotSummary: string, // 1 paragraph",
  "}",
].join("\n");

const aiBlindSpotDetection = async ({
  title,
  subject,
  content,
  keyConcepts = [],
  relationships = [],
}) =>
  aiCallJson({
    systemPrompt: blindSpotSystem,
    userPayload: { title, subject, content, keyConcepts, relationships },
    maxTokens: 800,
    temperature: 0.3,
  });

const explainNotesSystem = [
  "You answer a student's question using ONLY their saved notes as context. FirstStep Smart Notes Studio.",
  'If the answer is not supported by the notes, say so and give a cautiously helpful answer clearly labeled as beyond notes. Avoid inventing "facts" not present.',
  "Return JSON: { answer: string, references: string[], confidence: number, requiresOutsideContext: boolean }",
  "references = list of 1..4 short quotes or concept names from the notes supporting the answer. confidence is integer 0..100.",
].join("\n");

const aiExplainNotes = async ({
  title,
  subject,
  content,
  concepts,
  keywords,
  summary,
  question,
}) =>
  aiCallJson({
    systemPrompt: explainNotesSystem,
    userPayload: {
      title,
      subject,
      content,
      concepts,
      keywords,
      summary,
      question,
    },
    maxTokens: 600,
    temperature: 0.2,
  });

const explainDrawingSystem = [
  "You analyze a tldraw / whiteboard drawing snapshot (JSON-like shapes, texts, bindings) from FirstStep Smart Notes Studio.",
  "Try to identify what the student drew, the message or flow, what is missing, and concrete improvements. Input is a mix of: textContents array, shapeCount, shapeTypes histogram, snapshot hints.",
  "Return JSON:",
  "{",
  "  summary: string, // 1 paragraph what the drawing represents",
  "  elementsDetected: string[], // 3..10 labels",
  "  connectionsDetected: string[], // 2..6",
  "  missingConnections: string[], // 1..5 missing links the student should draw",
  '  suggestedImprovements: { suggestion: string, priority: "high"|"medium"|"low" }[] // 2..6',
  "}",
].join("\n");

const aiExplainDrawing = async ({
  noteTitle,
  subject,
  textContents = [],
  shapeCount,
  shapeTypes = {},
  snapshot = null,
}) =>
  aiCallJson({
    systemPrompt: explainDrawingSystem,
    userPayload: {
      noteTitle,
      subject,
      textContents,
      shapeCount,
      shapeTypes,
      snapshotSummary: snapshot ? "provided" : "none",
    },
    maxTokens: 650,
    temperature: 0.35,
  });

const revisionSystem = [
  "You build a personalized time-boxed revision plan in FirstStep Smart Notes Studio.",
  "Use the provided weak concepts, recent revision activity, and the exact number of MINUTES the student has.",
  "Return JSON: { totalMinutes: number, blocks: { title: string, minutes: number, activity: string, focusConcepts: string[], technique: string }[], priorityWeakConcepts: string[], whyFocused: string }",
  "Sum of block minutes MUST equal totalMinutes exactly. Use real study techniques: Active Recall, Spaced Repetition, Blurting, Feynman, Pomodoro, Practice Testing, Interleaving, Exam Simulation.",
].join("\n");

const aiPersonalizedRevision = async ({
  minutes,
  subject,
  weakConcepts = [],
  strongConcepts = [],
  recentActivity = [],
}) =>
  aiCallJson({
    systemPrompt: revisionSystem,
    userPayload: {
      minutes,
      subject,
      weakConcepts,
      strongConcepts,
      recentActivity,
    },
    maxTokens: 650,
    temperature: 0.3,
  });

// ============== LOCAL-ONLY FALLBACKS (used when Groq is unreachable or fails) ==============
const localAnalyze = ({ content = "", concepts = [], title = "Topic" }) => {
  const base = concepts?.length ? concepts : extractKeywordsSimple(content);
  const keyConcepts = base.slice(0, 10).map((name, i) => ({
    name,
    confidence: 60 + ((i * 5) % 35),
    importance: 65 + ((i * 7) % 30),
  }));
  return {
    keyConcepts,
    strongConcepts: base.slice(0, 2),
    weakConcepts: base.slice(-3).map((name) => ({
      name,
      whyWeak: "Not much detail or examples in your notes.",
    })),
    missingConcepts:
      base.length < 5
        ? ["Concrete worked example", "Edge cases / failure cases"]
        : ["Real-world application / trade-offs", "Common misconceptions"],
    relationships: base.slice(1, 7).map((target, i) => ({
      from: base[0] || title,
      to: target,
      type: i % 2 ? "uses" : "part of",
      strength: 55 + ((i * 8) % 40),
    })),
  };
};

const localNotesToLearning = ({
  concepts = [],
  title = "Topic",
  subject = "General",
}) => {
  const base = concepts?.length
    ? concepts
    : extractKeywordsSimple(subject + " " + title);
  return {
    flashcards: base.slice(0, 6).map((c) => ({
      front: `Define ${c} in your own words.`,
      back: `A solid answer names what ${c} IS, what it DOES, and gives 1 tiny example from your notes.`,
      concept: c,
      difficulty: "medium",
    })),
    quiz: base.slice(0, 3).map((c, i) => ({
      question: `Which statement about ${c} is most accurate?`,
      options: [
        `${c} is a standalone concept with no connections.`,
        `${c} plays a specific role and supports a real outcome.`,
        `${c} should always be memorized first word-for-word.`,
        `${c} is only useful on the day of the exam.`,
      ],
      correctIndex: 1,
      explanation: `${c} is best learned by role + example, not rote memorization.`,
      concept: c,
    })),
    practiceQuestions: base.slice(0, 2).map((c) => ({
      question: `Show, using a worked example from your notes, how ${c} affects a concrete result.`,
      idealAnswer: `A name + a step-by-step walkthrough + an observation of the result.`,
      difficulty: "medium",
    })),
    teachBackChallenges: [
      {
        prompt: `Explain the main idea of ${title || "your notes"} to a friend using only a pen, no notes, and one concrete example.`,
        whatToLookFor:
          "Can they name inputs → process → outputs without skipping the middle?",
      },
    ],
    revisionSummary: [
      `1. Overview of ${title || "the topic"} – one sentence.`,
      `2. Key concepts: ${base.slice(0, 4).join(", ")}.`,
      "3. Pick the 1 weakest concept above and do blurting + a worked example.",
      "4. 10-question self-quiz; mark missed ones.",
      "5. Re-teach the hardest part out loud.",
    ].join("\n"),
    codingChallenges: isCodingSubject(subject)
      ? [
          {
            title: `${subject || "Code"} mini drill`,
            description: `Write a small ${subject} snippet using ${base[0] || "the main concept"} and print the result.`,
            starter: `// Starter: create input, call the concept, print result\n`,
            expected: `Runs without error; output clearly demonstrates ${base[0] || "the concept"}.`,
            language: guessLanguage(subject),
          },
        ]
      : [],
  };
};

const localBlindSpot = ({ concepts = [] }) => {
  const structure = [
    "Big picture / why",
    "Definition",
    "Mental model / analogy",
    "Worked example",
    "Common mistakes",
    "Edge cases",
    "Real use case",
    "Connections to next topic",
  ];
  return {
    topicStructure: structure.map((name, i) => ({
      name,
      category:
        i < 2
          ? "prerequisite"
          : i < 5
            ? "core"
            : i < 7
              ? "application"
              : "advanced",
      order: i + 1,
    })),
    knowledgeGaps: concepts.slice(-2).length
      ? concepts.slice(-2).map((concept) => ({
          concept,
          severity: "medium",
          why: "Not explained deeply in your notes.",
          recommendedAction: `Add a worked example + 1 edge case for ${concept}.`,
        }))
      : [
          {
            concept: "Worked examples",
            severity: "high",
            why: "No explicit step-by-step examples detected.",
            recommendedAction: "Create one numbered walkthrough.",
          },
        ],
    unmasteredFromNotes: concepts.slice(-2).length
      ? concepts.slice(-2)
      : ["Subtle edge cases", "Trade-offs"],
    blindSpotSummary:
      "Your notes have the right skeleton; strengthen the 3 middle parts (mental model, worked example, common mistakes) and you will lock this in.",
  };
};

const localRevision = ({ minutes, weakConcepts = [] }) => {
  const techniques = [
    "Active Recall",
    "Blurting",
    "Practice Testing",
    "Feynman Teach-Back",
  ];
  if (minutes <= 5) {
    return {
      totalMinutes: 5,
      blocks: [
        {
          title: "Blurting sprint",
          minutes: 5,
          activity:
            "Close notes. Write everything you remember. Mark gaps in red. Re-read only gaps.",
          focusConcepts: weakConcepts.slice(0, 2),
          technique: techniques[1],
        },
      ],
      priorityWeakConcepts: weakConcepts.slice(0, 2),
      whyFocused:
        "In 5 minutes only gap-spotting with blurting moves the needle.",
    };
  }
  if (minutes <= 10) {
    return {
      totalMinutes: 10,
      blocks: [
        {
          title: "Blurting + gap map",
          minutes: 5,
          activity: "Close notes. Dump all. Mark gaps.",
          focusConcepts: weakConcepts.slice(0, 2),
          technique: techniques[1],
        },
        {
          title: "5 Active Recall questions",
          minutes: 5,
          activity: "Write + answer 5 quick Qs. Self-grade.",
          focusConcepts: weakConcepts.slice(0, 3),
          technique: techniques[0],
        },
      ],
      priorityWeakConcepts: weakConcepts.slice(0, 3),
      whyFocused:
        "10 minutes = gap map first, then deliberate recall on the weak ones.",
    };
  }
  return {
    totalMinutes: 20,
    blocks: [
      {
        title: "Blurting + gap inventory",
        minutes: 6,
        activity: "No-notes brain dump, highlight gaps with red.",
        focusConcepts: weakConcepts.slice(0, 3),
        technique: techniques[1],
      },
      {
        title: "Focused weak-concept review",
        minutes: 6,
        activity:
          "Re-study only the 3 weakest concepts; each gets 1 worked example.",
        focusConcepts: weakConcepts.slice(0, 3),
        technique: techniques[0],
      },
      {
        title: "Practice quiz (8 Qs)",
        minutes: 5,
        activity: "Self-quiz. Wrong answers → mark for 24h re-test.",
        focusConcepts: weakConcepts.slice(0, 4),
        technique: techniques[2],
      },
      {
        title: "Feynman teach-back (1 concept)",
        minutes: 3,
        activity:
          "Pick the #1 weakest concept, explain out loud without notes.",
        focusConcepts: weakConcepts.slice(0, 1),
        technique: techniques[3],
      },
    ],
    priorityWeakConcepts: weakConcepts.slice(0, 4),
    whyFocused:
      "20 minutes lets you GAP → FIX → TEST → LOCK. If you skip the quiz, forgetting returns in 48 hours.",
  };
};

const localExplainDrawing = ({ textContents = [], shapeCount = 0 }) => ({
  summary: shapeCount
    ? `Your diagram has ~${shapeCount} shapes and these key labels: ${textContents.slice(0, 5).join(", ") || "(no text detected)"}. It looks like a concept map in progress.`
    : "Your whiteboard is still empty. Add 1 central idea, 3 related boxes, and connecting arrows first.",
  elementsDetected: textContents.slice(0, 6).length
    ? textContents.slice(0, 6)
    : ["(empty canvas – start drawing!)"],
  connectionsDetected:
    textContents.length >= 3
      ? [
          `${textContents[0]} → ${textContents[1]}`,
          `${textContents[1]} → ${textContents[2] || "example"}`,
        ]
      : [],
  missingConnections:
    textContents.length >= 3
      ? [
          "Cause → effect arrow",
          "Concrete example branch",
          "Failure / edge case branch",
        ]
      : [
          "Central root box",
          "3 branches for key ideas",
          "Labeled arrows (not just lines)",
        ],
  suggestedImprovements: [
    {
      suggestion: "Add ONE specific worked example as its own shape.",
      priority: "high",
    },
    {
      suggestion:
        "Label every arrow (uses / causes / part of), not just lines.",
      priority: "high",
    },
    {
      suggestion:
        "Mark your weak spot with a red shape so you remember to revisit.",
      priority: "medium",
    },
  ],
});

// ============== TWIN INTEGRATION ==============
const logNotesActivityToTwin = async (userId, activity) => {
  if (!userId || String(userId).startsWith("guest-")) return; // skip synthetic guests to avoid polluting twin with sparse data
  try {
    const topicProgress = {};
    if (activity.weakConcepts?.length) {
      activity.weakConcepts.forEach((c) => {
        topicProgress[typeof c === "string" ? c : c.name || "concept"] = 30;
      });
    }
    if (activity.conceptsLearned?.length) {
      activity.conceptsLearned.forEach((c) => {
        topicProgress[typeof c === "string" ? c : c.name || "concept"] = 70;
      });
    }
    const payload = {
      studySession: {
        kind: "smart-notes",
        mode: activity.mode || "analysis",
        topic: activity.subject || activity.title || "Notes",
        completed: true,
        understanding: activity.understanding ?? null,
        teachBackScore: activity.teachBackScore ?? null,
        weakConcepts: activity.weakConcepts || [],
        knowledgeGaps: activity.knowledgeGaps || [],
      },
      topicProgress,
    };
    await twinService.updateProgress(userId, payload);
  } catch (_err) {
    /* never break notes UX on twin failure */
  }
  try {
    if (userId && !String(userId).startsWith("guest-")) {
      await Analytics.create({
        userId,
        activityType: `smart_notes_${activity.mode || "analysis"}`,
        score: activity.understanding || activity.quizPerformance || 0,
        metadata: {
          subject: activity.subject,
          title: activity.title,
          weakConcepts: activity.weakConcepts || [],
          knowledgeGaps: activity.knowledgeGaps || [],
          quizPerformance: activity.quizPerformance || null,
          revisionMinutes: activity.revisionMinutes || null,
        },
        timestamp: new Date(),
      }).catch(() => {});
    }
  } catch (_err) {
    /* ignore */
  }
};

// ============== KNOWLEDGE EVOLUTION ==============
const buildKnowledgeEvolution = async (userId, subject) => {
  try {
    const match = { userId };
    if (subject) match.subject = subject;
    const history = await Note.find({
      ...(subject ? { userId, subject } : { userId }),
    })
      .select(
        "title subject concepts keywords updatedAt createdAt difficulty aiResults",
      )
      .sort({ updatedAt: -1 })
      .limit(30)
      .lean()
      .exec();

    const snapshots = [];
    const conceptMap = new Map();
    history.forEach((note, i) => {
      const concepts = [
        ...new Set([
          ...(note.concepts || []),
          ...(note.aiResults?.keyConcepts || []),
          ...(note.keywords || []),
        ]),
      ];
      concepts.forEach((c) => {
        conceptMap.set(c, (conceptMap.get(c) || 0) + 1);
      });
      const coverage = Math.min(
        100,
        20 +
          Math.round((concepts.length / 8) * 40) +
          Math.round((history.length - i) * 3),
      );
      const confidence = Math.min(
        100,
        30 + i * 3 + (note.difficulty ? note.difficulty * 2 : 0),
      );
      snapshots.push({
        date: note.updatedAt || note.createdAt,
        noteId: note._id,
        title: note.title,
        conceptsCount: concepts.length,
        coverage,
        confidence,
      });
    });
    const topConcepts = [...conceptMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, occurrences]) => ({ name, occurrences }));

    const growth = snapshots.length
      ? {
          startingCoverage: snapshots[snapshots.length - 1].coverage,
          latestCoverage: snapshots[0].coverage,
          startingConfidence: snapshots[snapshots.length - 1].confidence,
          latestConfidence: snapshots[0].confidence,
          notesAnalyzed: snapshots.length,
        }
      : {
          startingCoverage: 0,
          latestCoverage: 0,
          startingConfidence: 0,
          latestConfidence: 0,
          notesAnalyzed: 0,
        };

    return {
      snapshots: snapshots.reverse(),
      topConcepts,
      growth,
      generated: true,
    };
  } catch (err) {
    console.warn("Knowledge evolution aggregation fallback:", err.message);
    return {
      snapshots: [],
      topConcepts: [],
      growth: {
        startingCoverage: 0,
        latestCoverage: 0,
        startingConfidence: 0,
        latestConfidence: 0,
        notesAnalyzed: 0,
      },
      generated: false,
    };
  }
};

// ============== PUBLIC SERVICE EXPORT ==============
export const notesAIService = {
  async analyzeNotes(userId, note, { snapshot } = {}) {
    const payload = {
      title: note.title,
      subject: note.subject || "General",
      content: snapshot ? drawingToText(snapshot) : note.content || "",
      concepts: note.concepts || [],
      keywords: note.keywords || [],
      summary: note.summary || "",
    };
    let result = null;
    try {
      result = await aiAnalyzeNotes(payload);
    } catch (err) {
      console.warn("[notes-ai] analyze fallback:", err.message);
    }
    if (!result || !Array.isArray(result.keyConcepts)) {
      result = localAnalyze(payload);
    }
    await logNotesActivityToTwin(userId, {
      mode: "analysis",
      subject: payload.subject,
      title: payload.title,
      weakConcepts: (result.weakConcepts || []).map((w) => w.name),
      conceptsLearned: result.strongConcepts || [],
      knowledgeGaps: result.missingConcepts || [],
      understanding: Math.round(
        avg([
          ...(result.strongConcepts || []).map(() => 85),
          ...(result.weakConcepts || []).map(() => 45),
        ]) || 60,
      ),
    });
    return result;
  },

  async notesToLearning(userId, note, { snapshot } = {}) {
    const payload = {
      title: note.title,
      subject: note.subject || "General",
      content: snapshot ? drawingToText(snapshot) : note.content || "",
      concepts: note.concepts || [],
      keywords: note.keywords || [],
    };
    let result = null;
    try {
      result = await aiNotesToLearning(payload);
    } catch (err) {
      console.warn("[notes-ai] notes→learning fallback:", err.message);
    }
    const hasShape =
      result &&
      Array.isArray(result.flashcards) &&
      Array.isArray(result.quiz) &&
      typeof result.revisionSummary === "string";
    if (!hasShape) result = localNotesToLearning(payload);
    await logNotesActivityToTwin(userId, {
      mode: "notes-to-learning",
      subject: payload.subject,
      title: payload.title,
      conceptsLearned: payload.concepts,
      weakConcepts: [],
      quizPerformance: 0,
    });
    return result;
  },

  async detectBlindSpots(userId, note, analysis = null) {
    const keyConcepts =
      analysis?.keyConcepts?.map((k) => k.name) ||
      note.concepts ||
      note.aiResults?.keyConcepts ||
      [];
    const payload = {
      title: note.title,
      subject: note.subject || "General",
      content: note.content || "",
      keyConcepts,
      relationships: analysis?.relationships || note.relationships || [],
    };
    let result = null;
    try {
      result = await aiBlindSpotDetection(payload);
    } catch (err) {
      console.warn("[notes-ai] blindspot fallback:", err.message);
    }
    if (!result || !Array.isArray(result.knowledgeGaps))
      result = localBlindSpot(payload);
    await logNotesActivityToTwin(userId, {
      mode: "blind-spot-detection",
      subject: payload.subject,
      title: payload.title,
      weakConcepts: result.unmasteredFromNotes || [],
      knowledgeGaps: (result.knowledgeGaps || []).map((g) => g.concept),
    });
    return result;
  },

  async explainNotesQa(userId, note, question) {
    const noteId = String(note._id || note.id || "");
    let retrievedContext = null;
    try {
      if (chromaNotesService.isEnabled()) {
        const focused = await chromaNotesService.expandRerank(userId, {
          query: question,
          noteId,
          limit: 3,
        });
        const crossNote = await chromaNotesService.hybridSearch(userId, {
          query: question,
          limit: 2,
          where: note.subject ? { subject: note.subject } : null,
          groupByNote: true,
        });
        const merged = [
          ...((focused.ok && focused.chunks) || []),
          ...((crossNote.ok &&
            crossNote.rows &&
            crossNote.rows.filter((r) => r.noteId !== noteId)) ||
            []),
        ];
        if (merged.length) {
          retrievedContext = merged
            .slice(0, 5)
            .map(
              (chunk) =>
                `[SOURCE: note=${chunk.noteId} chunk=${chunk.chunkIndex ?? 0}]\n${chunk.document}`,
            )
            .join("\n\n------\n\n");
        }
      }
    } catch (_err) {
      /* Chroma is optional, do not break UX */
    }

    const baseContent = note.content || "";
    const enrichedContent = retrievedContext
      ? `${baseContent}\n\n--- RETRIEVED SEMANTIC CONTEXT ---\n${retrievedContext}`
      : baseContent;

    const payload = {
      title: note.title,
      subject: note.subject || "General",
      content: enrichedContent,
      concepts: note.concepts || [],
      keywords: note.keywords || [],
      summary: note.summary || "",
      question,
    };
    try {
      const answer = await aiExplainNotes(payload);
      return {
        ...answer,
        retrieval: retrievedContext
          ? { mode: "chroma-hybrid", chunksUsed: 5, noteCrossReference: true }
          : { mode: "note-local" },
      };
    } catch (err) {
      console.warn("[notes-ai] explain-notes fallback:", err.message);
      const concepts = (note.concepts || []).slice(0, 3);
      return {
        answer: `Without calling the AI, here is a grounded answer based on your notes: focus on ${concepts.join(", ") || "the key concepts"} and re-read the summary and worked examples. For stronger confirmation, run Analyze first or try again when the AI is available.`,
        references: note.summary ? [note.summary.slice(0, 80)] : concepts,
        confidence: 30,
        requiresOutsideContext: true,
        retrieval: retrievedContext
          ? {
              mode: "chroma-hybrid",
              chunksUsed: 5,
              noteCrossReference: true,
              aiFailed: true,
            }
          : { mode: "note-local-fallback" },
      };
    }
  },

  async explainDrawing(userId, note) {
    const snapshot = note.tldrawSnapshot || null;
    const { textContents, shapeCount, shapeTypes } = summarizeTldraw(snapshot);
    const payload = {
      noteTitle: note.title,
      subject: note.subject || "General",
      textContents,
      shapeCount,
      shapeTypes,
      snapshot,
    };
    let result = null;
    try {
      result = await aiExplainDrawing(payload);
    } catch (err) {
      console.warn("[notes-ai] explain-drawing fallback:", err.message);
    }
    if (!result || !Array.isArray(result.elementsDetected))
      result = localExplainDrawing(payload);
    await logNotesActivityToTwin(userId, {
      mode: "explain-drawing",
      subject: payload.subject,
      title: payload.noteTitle,
      conceptsLearned: result.elementsDetected || [],
      weakConcepts: result.missingConnections || [],
      understanding: Math.round(
        Math.min(
          100,
          40 +
            (result.suggestedImprovements?.length
              ? (6 - result.suggestedImprovements.length) * 10
              : 0),
        ),
      ),
    });
    return result;
  },

  async personalizedRevision(userId, note, minutes, analysis = null) {
    const weakConcepts = (analysis?.weakConcepts || [])
      .map((w) => w.name || w)
      .concat(analysis?.missingConcepts || []);
    const strongConcepts =
      analysis?.strongConcepts || note.concepts?.slice(0, 3) || [];
    const recentActivity = (note.activity || []).slice(-6);
    const payload = {
      minutes,
      subject: note.subject || "General",
      weakConcepts,
      strongConcepts,
      recentActivity,
    };
    let result = null;
    try {
      result = await aiPersonalizedRevision(payload);
    } catch (err) {
      console.warn("[notes-ai] personalized revision fallback:", err.message);
    }
    if (
      !result ||
      !Array.isArray(result.blocks) ||
      result.totalMinutes !== minutes
    ) {
      result = localRevision(payload);
    }
    await logNotesActivityToTwin(userId, {
      mode: "personalized-revision",
      subject: payload.subject,
      title: note.title,
      weakConcepts: result.priorityWeakConcepts || [],
      revisionMinutes: minutes,
    });
    return result;
  },

  async knowledgeEvolution(userId, subject = null) {
    return buildKnowledgeEvolution(userId, subject);
  },
};

// ============== HELPERS ==============
const avg = (nums) =>
  nums && nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;

const extractKeywordsSimple = (content) => {
  const stop = new Set([
    "about",
    "after",
    "again",
    "also",
    "because",
    "before",
    "being",
    "between",
    "could",
    "every",
    "from",
    "have",
    "into",
    "more",
    "other",
    "should",
    "than",
    "their",
    "there",
    "these",
    "this",
    "through",
    "were",
    "when",
    "where",
    "which",
    "with",
    "would",
    "your",
    "that",
    "they",
    "them",
    "then",
  ]);
  const counts = new Map();
  String(content || "")
    .toLowerCase()
    .match(/[a-z][a-z-]{3,}/g)
    ?.forEach((w) => {
      if (!stop.has(w)) counts.set(w, (counts.get(w) || 0) + 1);
    });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w.replace(/^\w/, (c) => c.toUpperCase()));
};

const isCodingSubject = (subject) =>
  /java|python|sql|javascript|typescript|node|react|c\+\+|c#|dsa|data\s*structure|algorithm|r\s|rust|go\s|golang|kotlin|swift|html|css/i.test(
    String(subject || ""),
  );

const guessLanguage = (subject) => {
  const s = String(subject || "").toLowerCase();
  if (s.includes("java") && !s.includes("script")) return "Java";
  if (s.includes("python")) return "Python";
  if (s.includes("sql") || s.includes("database")) return "SQL";
  if (s.includes("javascript") || s.includes("node")) return "JavaScript";
  if (s.includes("c++")) return "C++";
  if (s.includes("c#")) return "C#";
  if (s.includes("kotlin")) return "Kotlin";
  if (s.includes("swift")) return "Swift";
  return "Code";
};

const summarizeTldraw = (snapshot) => {
  const textContents = [];
  const shapeTypes = {};
  let shapeCount = 0;
  try {
    const shapes =
      (snapshot?.documents &&
        snapshot.documents[snapshot.currentPageId]?.shapes) ||
      snapshot?.shapes ||
      snapshot;
    if (shapes && typeof shapes === "object") {
      const list = Array.isArray(shapes) ? shapes : Object.values(shapes);
      list.forEach((s) => {
        if (!s || typeof s !== "object") return;
        shapeCount += 1;
        const type = String(s.type || "shape");
        shapeTypes[type] = (shapeTypes[type] || 0) + 1;
        const text = s.props?.text || s.text || s.props?.label || "";
        if (typeof text === "string" && text.trim())
          textContents.push(text.trim().slice(0, 120));
      });
    }
  } catch (_e) {
    /* ignore */
  }
  return { textContents: textContents.slice(0, 50), shapeCount, shapeTypes };
};

const drawingToText = (snapshot) => {
  const { textContents } = summarizeTldraw(snapshot);
  return textContents.join(" | ");
};

export default notesAIService;
