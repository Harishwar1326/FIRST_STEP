import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import aiServiceClient from './aiServiceClient.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AI_SERVICE_DIR = path.resolve(__dirname, '../../../ai_service');

/**
 * Executes Scikit-Learn models through the AI microservice or local Python CLI.
 * Uses exact feature orders:
 * 1. Mastery: [quizScore, lessonCompletionRate, studyTime, revisionCount]
 * 2. Retention: [studyTime, revisionCount, daysActive, quizAccuracy]
 * 3. Learning Style: [averageWatchPercentage, pauseFrequency, videoWatchRate, averageAnswerTime]
 * 4. Difficulty: [masteryScore, quizScore, confidenceLevel]
 */
export const predictLearningProfile = async (features = {}) => {
  const bounded = (value, fallback, min, max) => {
    const parsed = Number(value ?? fallback);
    return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
  };
  const sanitized = {
    quizScore: bounded(features.quizScore, 0, 0, 100),
    quizAccuracy: bounded(features.quizAccuracy, 0, 0, 1),
    lessonCompletionRate: bounded(features.lessonCompletionRate ?? features.taskCompletion, 0, 0, 1),
    studyTime: bounded(features.studyTime, 0, 0, 1440),
    revisionCount: bounded(features.revisionCount, 0, 0, 1000),
    daysActive: bounded(features.daysActive, 0, 0, 3650),
    averageWatchPercentage: bounded(features.averageWatchPercentage, 0, 0, 1),
    pauseFrequency: bounded(features.pauseFrequency, 0, 0, 1000),
    videoWatchRate: bounded(features.videoWatchRate, 0, 0, 1),
    averageAnswerTime: bounded(features.averageAnswerTime, 0, 0, 86400),
    confidenceLevel: bounded(features.confidenceLevel, 0, 0, 5),
  };

  // 1. Try FastAPI AI service over HTTP
  try {
    const response = await aiServiceClient.post('/learning/predict-profile', sanitized, {
      timeout: 4000,
    });
    if (response?.data && typeof response.data.masteryScore === 'number') {
      return response.data;
    }
  } catch (httpError) {
    console.warn(`[ML Engine] AI Service HTTP unavailable (${httpError.message}). Running local ML pipeline fallback.`);
  }

  // 2. Direct local Python CLI fallback using exact model artifacts
  try {
    const cliScript = path.join(AI_SERVICE_DIR, 'app', 'pipelines', 'predict_cli.py');
    const { stdout } = await execFileAsync(
      'python',
      [cliScript, JSON.stringify(sanitized)],
      {
        cwd: AI_SERVICE_DIR,
        timeout: 10000,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      }
    );

    const parsed = JSON.parse(stdout.trim());
    if (parsed && typeof parsed.masteryScore === 'number') {
      return parsed;
    }
  } catch (cliError) {
    console.error(`[ML Engine] Local Python ML script error:`, cliError.message);
  }

  // 3. Deterministic mathematical fallback in case python runtime is not available
  const masteryScore = Math.max(0, Math.min(100, Math.round(
    sanitized.quizScore * 0.55 +
    sanitized.lessonCompletionRate * 25 +
    Math.min(sanitized.studyTime, 60) * 0.25 +
    sanitized.revisionCount * 2
  )));

  const retentionProbability = Math.max(0.1, Math.min(0.99, Number((
    sanitized.quizAccuracy * 0.55 +
    Math.min(sanitized.revisionCount / 5, 0.3) +
    Math.min(sanitized.daysActive / 30, 0.1)
  ).toFixed(2))));

  const learningStyle = null;

  let difficulty = 'Intermediate';
  if (masteryScore >= 75 && sanitized.quizScore >= 80) difficulty = 'Advanced';
  else if (masteryScore < 45) difficulty = 'Beginner';

  return {
    masteryScore,
    retentionProbability,
    learningStyle,
    difficulty,
    predictionSource: 'transparent_rule_fallback',
    trainingData: 'synthetic',
    difficultySource: 'transparent_policy',
  };
};

export default predictLearningProfile;
