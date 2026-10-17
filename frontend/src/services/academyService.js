import { api } from "./api";

const ACADEMY_GUEST_KEY = "academy_guest_id";
const getAcademyGuestId = () => {
  try {
    let id = localStorage.getItem(ACADEMY_GUEST_KEY);
    if (!id) {
      id =
        "guest-academy-" +
        Math.random().toString(36).slice(2, 10) +
        Date.now().toString(36).slice(-4);
      localStorage.setItem(ACADEMY_GUEST_KEY, id);
    }
    return id;
  } catch (_e) {
    return "guest-academy-" + Math.random().toString(36).slice(2, 10);
  }
};

const academyHeaders = () => ({ "x-guest-id": getAcademyGuestId() });

const DEFAULT_PROGRESS = {
  totalSessions: 0,
  totalMinutes: 0,
  techniquesTried: [],
  mostUsed: null,
  recentSessions: [],
  feedbackSummary: { avgUsefulness: 0, wouldUseAgainRate: 0 },
};

const DEFAULT_TECHNIQUES_CATALOG = [
  {
    id: "active-recall",
    name: "Active Recall",
    tagline: "Test yourself to lock concepts into memory",
    category: "Retrieval & Memory",
    difficulty: "Beginner",
    description: "The #1 evidence-based technique: close your notes and retrieve information from memory instead of rereading.",
    steps: [
      "Study the material for 15–20 minutes.",
      "Put notes away completely.",
      "Write or speak everything you remember.",
      "Re-open notes and mark gaps.",
      "Re-study only the missed items.",
    ],
  },
  {
    id: "spaced-repetition",
    name: "Spaced Repetition",
    tagline: "Review at expanding intervals to beat the forgetting curve",
    category: "Retrieval & Memory",
    difficulty: "Beginner",
    description: "Systematically review topics at 1-day, 3-day, 7-day, and 14-day intervals for permanent retention.",
    steps: [
      "Learn the concept on Day 1.",
      "Quick review on Day 2 without notes.",
      "Practice recall on Day 4.",
      "Full review on Day 7.",
      "Refresh on Day 14.",
    ],
  },
  {
    id: "feynman-technique",
    name: "Feynman Technique",
    tagline: "Explain it simply to uncover hidden confusion",
    category: "Deep Understanding",
    difficulty: "Intermediate",
    description: "Teach the topic to a 12-year-old; every place you get stuck is exactly where you need to study more.",
    steps: [
      "Choose a concept.",
      "Explain it aloud in plain English.",
      "Identify where your explanation breaks.",
      "Go back to the source material for the weak spots.",
      "Simplify and use analogies.",
    ],
  },
  {
    id: "pomodoro",
    name: "Pomodoro Technique",
    tagline: "25-minute focused bursts with 5-minute breaks",
    category: "Focus & Discipline",
    difficulty: "Beginner",
    description: "Time-boxed focus sessions designed to beat procrastination and prevent burnout.",
    steps: [
      "Pick one single task.",
      "Set a 25-minute timer.",
      "Work with zero distractions.",
      "Take a 5-minute break.",
      "After 4 rounds, take a 15–30 minute break.",
    ],
  },
  {
    id: "practice-testing",
    name: "Practice Testing",
    tagline: "Simulate exam conditions for real readiness",
    category: "Assessment & Practice",
    difficulty: "Beginner",
    description: "Take timed tests in exam-like conditions to build stamina and identify knowledge gaps.",
    steps: [
      "Gather past papers / question banks.",
      "Set a strict timer matching the real exam.",
      "No notes, phone, or distractions.",
      "Grade with a rubric.",
      "Log every wrong answer in a revision list.",
    ],
  },
  {
    id: "blurting",
    name: "Blurting Method",
    tagline: "Dump everything from memory, then fill the gaps",
    category: "Retrieval & Memory",
    difficulty: "Beginner",
    description: "A rapid active-recall variant perfect for last-minute exam revision.",
    steps: [
      "Open a blank page.",
      "Set 10 minutes and write everything you remember.",
      "Open notes and compare line by line.",
      "Highlight gaps in a different color.",
      "Re-blurt only the missing parts.",
    ],
  },
];

export const academyService = {
  getStudyPlan: async () => {
    const response = await api.get("/academy/plan");
    return response.data;
  },

  getTodayTasks: async () => {
    const response = await api.get("/academy/today");
    return response.data;
  },

  getFlashcards: async () => {
    const response = await api.get("/academy/flashcards");
    return response.data;
  },

  submitFlashcardReview: async (cardId, rating) => {
    const response = await api.post("/academy/flashcards/review", {
      cardId,
      rating,
    });
    return response.data;
  },

  getStreak: async () => {
    const response = await api.get("/academy/streak");
    return response.data;
  },

  updateStreak: async () => {
    const response = await api.post("/academy/streak/update");
    return response.data;
  },

  getTechniqueRecommendation: async (subject) => {
    try {
      const response = await api.get("/academy/recommendation", {
        params: { subject },
        headers: academyHeaders(),
      });
      return response.data;
    } catch (err) {
      console.warn("Technique recommendation fallback:", err.message);
      return {
        recommendedTechnique: DEFAULT_TECHNIQUES_CATALOG[0],
        fallback: true,
      };
    }
  },

  getStudentProfile: async (studentId) => {
    try {
      const url = studentId
        ? `/academy/profile/${studentId}`
        : "/academy/profile";
      const response = await api.get(url, { headers: academyHeaders() });
      return response.data;
    } catch (err) {
      console.warn("Student profile fallback:", err.message);
      return {
        studentId: getAcademyGuestId(),
        dominantStyle: "Balanced",
        strengthAreas: ["Memory retrieval"],
        focusAreas: ["Consistent practice"],
        recommendedPath: "Start with the Situation Wizard to generate a tailored plan.",
        fallback: true,
      };
    }
  },

  getAllTechniques: async () => {
    try {
      const response = await api.get("/academy/techniques", {
        headers: academyHeaders(),
      });
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data;
      }
      return DEFAULT_TECHNIQUES_CATALOG;
    } catch (err) {
      console.warn("Techniques catalog fallback:", err.message);
      return DEFAULT_TECHNIQUES_CATALOG;
    }
  },

  getTechniqueById: async (techniqueId) => {
    try {
      const response = await api.get(`/academy/techniques/${techniqueId}`, {
        headers: academyHeaders(),
      });
      return response.data;
    } catch (err) {
      console.warn("Technique by id fallback:", err.message);
      return (
        DEFAULT_TECHNIQUES_CATALOG.find((t) => t.id === techniqueId) ||
        DEFAULT_TECHNIQUES_CATALOG[0]
      );
    }
  },

  recordTechniqueSession: async (sessionData) => {
    try {
      const response = await api.post(
        "/academy/technique-session",
        sessionData,
        { headers: academyHeaders() },
      );
      return response.data;
    } catch (err) {
      console.warn("Technique session fallback:", err.message);
      return {
        success: true,
        session: {
          _id: "guest-session-" + Date.now(),
          guest: true,
          saved: false,
          ...sessionData,
        },
        fallback: true,
      };
    }
  },

  getProgress: async (studentId) => {
    try {
      const url = studentId
        ? `/academy/progress/${studentId}`
        : "/academy/progress";
      const response = await api.get(url, { headers: academyHeaders() });
      return response.data;
    } catch (err) {
      console.warn("Progress fallback:", err.message);
      return { ...DEFAULT_PROGRESS, studentId: getAcademyGuestId(), fallback: true };
    }
  },

  evaluateSituation: async (situationInputs) => {
    try {
      const response = await api.post("/academy/situation", situationInputs, {
        headers: academyHeaders(),
      });
      return response.data;
    } catch (err) {
      console.warn(
        "Backend /academy/situation endpoint failed, attempting fallback endpoint:",
        err.message,
      );
      try {
        const fallbackRes = await api.post(
          "/academy/technique/recommend",
          situationInputs,
          { headers: academyHeaders() },
        );
        if (fallbackRes.data && fallbackRes.data.recommendedTechnique) {
          return fallbackRes.data;
        }
      } catch (err2) {
        console.warn(
          "Technique recommend fallback failed, generating client-side evaluation:",
          err2.message,
        );
      }

      const {
        timeAvailable = "1–3 hours",
        goal = "Preparing for an upcoming exam",
        subject = "General",
        difficulty = "Moderate",
        confidenceLevel = "Moderate",
        mainProblem = "I understand but forget later",
      } = situationInputs || {};
      const isExamUrgent =
        ["Exam tomorrow", "Exam in a few days"].includes(goal) ||
        ["Less than 1 hour", "1–3 hours"].includes(timeAvailable) ||
        mainProblem === "I have very little time" ||
        mainProblem === "I need to revise quickly";

      const techName = isExamUrgent ? "Active Recall" : "Spaced Repetition";
      const techScore = isExamUrgent ? 92 : 88;

      return {
        studentId: "current",
        situationInputs,
        recommendedTechnique: {
          id: techName.toLowerCase().replace(/\s+/g, "-"),
          name: techName,
          score: techScore,
          tagline: isExamUrgent
            ? "Testing yourself to retrieve information from memory without notes"
            : "Reviewing concepts at expanding time intervals to beat the forgetting curve",
          category: "Retrieval & Memory",
          description: `${techName} is an evidence-based study technique optimized for your situation (${subject}, Goal: ${goal}, Time: ${timeAvailable}).`,
          bestUsedWhen: [
            "Before exams & tests",
            "During rapid revision cycles",
            "When you forget concepts easily",
          ],
          notIdealWhen: [
            "When you have zero initial understanding of the basic concepts",
          ],
          steps: [
            "Study the topic section for 15–20 minutes.",
            "Close your notebook, slides, and references completely.",
            "Write down or speak out loud everything you remember from memory.",
            "Answer 5–10 diagnostic practice questions.",
            "Compare your responses directly with your notes.",
            "Mark the specific concepts you failed to recall.",
            "Review only those weak areas in your notes.",
            "Test yourself again on the weak points 24 hours later.",
          ],
        },
        whyReason: isExamUrgent
          ? `You have limited time (${timeAvailable}) before your ${goal.toLowerCase()} in ${subject}. Passive rereading is ineffective right now; ${techName} allows you to quickly retrieve what you know and test your memory under pressure.`
          : `You have ${timeAvailable} to prepare for ${subject}. Because your goal is long-term retention, ${techName} systematically locks concepts into memory at expanding intervals.`,
        secondaryTechniques: [
          {
            name: "Practice Testing",
            score: 84,
            reason: "Simulate exam conditions under time constraints.",
          },
          {
            name: "Blurting Method",
            score: 78,
            reason: "Rapidly write down facts on paper to catch missing gaps.",
          },
          {
            name: "Feynman Technique",
            score: 72,
            reason:
              "Explain concepts in simple terms to uncover hidden confusion.",
          },
        ],
        whyNotExplanations: [
          {
            techniqueName: isExamUrgent
              ? "Spaced Repetition"
              : "Blurting Method",
            reason: isExamUrgent
              ? `Spaced Repetition is excellent for long-term retention over weeks, but given your current timeline (${timeAvailable} / ${goal}), your immediate priority is rapid retrieval testing rather than long-interval scheduling.`
              : `Blurting is great for rapid exam cramming, but Spaced Repetition provides superior long-term retention for your preparation timeline.`,
          },
        ],
        timeAllocatedPlan: [
          {
            time: "0:00 – 0:40",
            title: `${techName} – Block 1`,
            activity: `Study main ${subject} topic for 20 mins, then execute ${techName}.`,
          },
          {
            time: "0:40 – 0:50",
            title: "Rest Break",
            activity: "Step away from study area.",
          },
          {
            time: "0:50 – 1:30",
            title: `${techName} – Block 2`,
            activity: `Apply technique to secondary ${subject} sub-topic.`,
          },
          {
            time: "1:30 – 1:40",
            title: "Rest Break",
            activity: "Hydrate and stretch.",
          },
          {
            time: "1:40 – 2:20",
            title: "Practice Testing & Diagnostics",
            activity: "Solve 8 practice problems without peeking at answers.",
          },
          { time: "2:20 – 2:30", title: "Rest Break", activity: "Rest eyes." },
          {
            time: "2:30 – 3:00",
            title: "Mini Exam Simulation",
            activity:
              "Complete a 15-minute timed quiz under silent conditions.",
          },
        ],
      };
    }
  },

  submitFeedback: async (feedbackData) => {
    try {
      const response = await api.post("/academy/feedback", feedbackData, {
        headers: academyHeaders(),
      });
      return response.data;
    } catch (err) {
      console.warn("Feedback submission fallback:", err.message);
      return {
        success: true,
        feedbackId: "guest-fb-" + Date.now(),
        fallback: true,
      };
    }
  },

  recordActivity: async (activityData) => {
    try {
      const response = await api.post("/academy/activity", activityData, {
        headers: academyHeaders(),
      });
      return response.data;
    } catch (err) {
      console.warn("Activity logging fallback:", err.message);
      return { success: true, fallback: true };
    }
  },
};
