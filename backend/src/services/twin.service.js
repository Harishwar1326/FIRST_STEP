import { twinRepository } from "../repositories/twin.repository.js";
import { aiServiceClient } from "../utils/aiServiceClient.js";

const defaultTwinProfile = (userId) => ({
  learningStyle: "Visual",
  attentionPattern: "Focused",
  knowledgeScore: 0,
  skillProgress: {},
  strengths: [],
  weaknesses: [],
});

const defaultAnalytics = {
  learningSpeed: 1,
  memoryRetention: 0.7,
  progressRate: "+0%",
  focusScore: 75,
  studySessions: [],
  mistakes: [],
  weakTopics: [],
};

const defaultRecommendations = {
  focusAreas: [
    "Active recall practice",
    "Connect new ideas to what you already know",
    "Test yourself with one short quiz after each topic",
  ],
  practiceTopics: [
    "Critical thinking",
    "Reading comprehension",
    "Clear writing",
  ],
  reviewMaterials: [
    "Summarize each chapter in your own words",
    "Use flashcards for key terms",
  ],
};

const deriveAnalytics = (twin) => {
  const sessions = Array.isArray(twin?.studySessions) ? twin.studySessions : [];
  const mistakes = Array.isArray(twin?.mistakes) ? twin.mistakes : [];
  const accuracies = sessions.map((session) => Number(session.accuracy) || 0);
  const averageAccuracy = accuracies.length
    ? accuracies.reduce((total, value) => total + value, 0) / accuracies.length
    : 0;
  const recent = accuracies.slice(-5);
  const previous = accuracies.slice(0, -5);
  const recentAverage = recent.length
    ? recent.reduce((total, value) => total + value, 0) / recent.length
    : averageAccuracy;
  const previousAverage = previous.length
    ? previous.reduce((total, value) => total + value, 0) / previous.length
    : averageAccuracy;
  const progress = previousAverage
    ? Math.round(((recentAverage - previousAverage) / previousAverage) * 100)
    : 0;
  const variance = accuracies.length
    ? accuracies.reduce(
        (total, value) => total + (value - averageAccuracy) ** 2,
        0,
      ) / accuracies.length
    : 0;
  const topicCounts = mistakes.reduce((counts, mistake) => {
    const topic = mistake.concept || mistake.topic;
    if (topic) counts[topic] = (counts[topic] || 0) + 1;
    return counts;
  }, {});
  const weakTopics = Object.entries(topicCounts)
    .sort(([, first], [, second]) => second - first)
    .slice(0, 5)
    .map(([topic]) => topic);

  return {
    learningSpeed: 1,
    memoryRetention: Math.max(
      0,
      Math.min(
        1,
        averageAccuracy
          ? averageAccuracy / 100
          : defaultAnalytics.memoryRetention,
      ),
    ),
    progressRate: `${progress >= 0 ? "+" : ""}${progress}%`,
    focusScore: Math.max(50, Math.min(100, Math.round(100 - variance / 2))),
    studySessions: sessions.slice(-10),
    mistakes: mistakes.slice(-10),
    weakTopics,
  };
};

const tryAi = async (fn) => {
  try {
    return await fn();
  } catch (_error) {
    return null;
  }
};

export const twinService = {
  async getProfile(userId, name = "Student") {
    let twin = null;
    try {
      twin = await twinRepository.findByUserId(userId);
    } catch (_error) {
      twin = null;
    }

    if (!twin) {
      const aiResponse = await tryAi(() =>
        aiServiceClient.post("/twin/initialize", { userId, name }),
      );
      if (aiResponse?.data) {
        try {
          twin = await twinRepository.create({
            userId: String(userId),
            ...aiResponse.data,
          });
        } catch (_error) {
          twin = null;
        }
      }
    }

    if (!twin) {
      twin = await twinRepository.update(userId, {
        $setOnInsert: { userId: String(userId), ...defaultTwinProfile(userId) },
      });
    }

    return {
      learningStyle:
        twin.learningStyle || defaultTwinProfile(userId).learningStyle,
      attentionPattern:
        twin.attentionPattern || defaultTwinProfile(userId).attentionPattern,
      knowledgeScore: twin.knowledgeScore ?? 0,
      skillProgress: twin.skillProgress || {},
      strengths: twin.strengths || [],
      weaknesses: twin.weaknesses || [],
    };
  },

  async getAnalytics(userId) {
    let twin = null;
    try {
      twin = await twinRepository.findByUserId(userId);
    } catch (_error) {
      twin = null;
    }
    const persisted = deriveAnalytics(twin);
    return {
      learningSpeed: persisted.learningSpeed || defaultAnalytics.learningSpeed,
      memoryRetention:
        persisted.memoryRetention || defaultAnalytics.memoryRetention,
      progressRate: persisted.progressRate || defaultAnalytics.progressRate,
      focusScore: persisted.focusScore || defaultAnalytics.focusScore,
      studySessions: persisted.studySessions,
      mistakes: persisted.mistakes,
      weakTopics: persisted.weakTopics,
    };
  },

  async getRecommendations(userId) {
    let twin = null;
    try {
      twin = await twinRepository.findByUserId(userId);
    } catch (_error) {
      twin = null;
    }

    const persistedAnalytics = deriveAnalytics(twin);
    return {
      focusAreas: persistedAnalytics.weakTopics.length
        ? persistedAnalytics.weakTopics
        : defaultRecommendations.focusAreas,
      practiceTopics: persistedAnalytics.weakTopics.length
        ? persistedAnalytics.weakTopics
        : defaultRecommendations.practiceTopics,
      reviewMaterials: persistedAnalytics.studySessions.length
        ? [
            ...new Set(
              persistedAnalytics.studySessions
                .map((session) => session.subject)
                .filter(Boolean),
            ),
          ].slice(-3)
        : defaultRecommendations.reviewMaterials,
      suggestedPace:
        persistedAnalytics.memoryRetention >= 0.85 ? "accelerated" : "normal",
    };
  },

  async updateProgress(userId, progressData) {
    let savedTwin;
    try {
      savedTwin = await twinRepository.updateProgress(userId, progressData);
    } catch (error) {
      const persistenceError = new Error(
        "Learning progress could not be saved",
      );
      persistenceError.statusCode = 503;
      persistenceError.cause = error;
      throw persistenceError;
    }

    await tryAi(() =>
      aiServiceClient.post("/twin/progress", { userId, ...progressData }),
    );

    return {
      success: Boolean(savedTwin),
      message: "Progress updated successfully",
    };
  },
};
