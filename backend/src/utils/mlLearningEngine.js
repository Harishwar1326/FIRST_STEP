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
 * 1. Mastery: [quizScore, taskCompletion, studyTime, revisionCount]
 * 2. Retention: [studyTime, revisionCount, daysActive, quizAccuracy]
 * 3. Learning Style: [averageWatchPercentage, pauseFrequency, videoWatchRate, averageAnswerTime]
 * 4. Difficulty: [masteryScore, quizScore, confidenceLevel]
 */
export const predictLearningProfile = async (features = {}) => {
  const sanitized = {
    quizScore: Number(features.quizScore ?? 75),
    taskCompletion: Number(features.taskCompletion ?? 0.8),
    studyTime: Number(features.studyTime ?? 20),
    revisionCount: Number(features.revisionCount ?? 1),
    daysActive: Number(features.daysActive ?? 5),
    averageWatchPercentage: Number(features.averageWatchPercentage ?? 0.5),
    pauseFrequency: Number(features.pauseFrequency ?? 1.0),
    videoWatchRate: Number(features.videoWatchRate ?? 0.5),
    averageAnswerTime: Number(features.averageAnswerTime ?? 30.0),
    confidenceLevel: Number(features.confidenceLevel ?? 3.0),
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
    sanitized.quizScore * 0.5 +
    sanitized.taskCompletion * 25 +
    Math.min(sanitized.studyTime, 60) * 0.25 +
    sanitized.revisionCount * 2
  )));

  const retentionProbability = Math.max(0.1, Math.min(0.99, Number((
    (sanitized.quizScore / 100) * 0.6 +
    Math.min(sanitized.revisionCount / 5, 0.3) +
    Math.min(sanitized.daysActive / 30, 0.1)
  ).toFixed(2))));

  let learningStyle = 'Visual';
  if (sanitized.averageWatchPercentage > 0.6 && sanitized.videoWatchRate > 0.6) {
    learningStyle = 'Visual';
  } else if (sanitized.averageAnswerTime < 25) {
    learningStyle = 'Interactive Quiz';
  } else if (sanitized.taskCompletion > 0.7) {
    learningStyle = 'Practical/Hands-on';
  } else {
    learningStyle = 'Text/Reading';
  }

  let difficulty = 'Intermediate';
  if (masteryScore > 75 && sanitized.quizScore > 80) difficulty = 'Advanced';
  else if (masteryScore < 45) difficulty = 'Beginner';

  return {
    masteryScore,
    retentionProbability,
    learningStyle,
    difficulty,
  };
};

export default predictLearningProfile;
