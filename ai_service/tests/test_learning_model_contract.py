import unittest
from unittest.mock import patch

from app.pipelines.learning_engine_pipeline import LearningEnginePipeline
from app.routers.learning_engine_router import AnalyzeRecommendationsRequest, PredictProfileRequest


class FakeMasteryModel:
    def predict(self, frame):
        self.columns = list(frame.columns)
        self.values = frame.iloc[0].to_dict()
        return [67.5]


class FakeRetentionModel:
    classes_ = [0, 1]

    def predict_proba(self, frame):
        self.values = frame.iloc[0].to_dict()
        return [[0.25, 0.75]]


class LearningModelContractTest(unittest.TestCase):
    def test_prediction_uses_training_feature_names_and_never_guesses_learning_style(self):
        pipeline = LearningEnginePipeline.__new__(LearningEnginePipeline)
        pipeline.mastery_model = FakeMasteryModel()
        pipeline.retention_model = FakeRetentionModel()

        result = pipeline.predict_profile({
            "quizScore": 90,
            "quizAccuracy": 0.9,
            "lessonCompletionRate": 0.5,
            "studyTime": 20,
            "revisionCount": 2,
            "daysActive": 5,
        })

        self.assertEqual(pipeline.mastery_model.columns, [
            "average_quiz_score", "lesson_completion_rate",
            "average_session_time", "revision_frequency",
        ])
        self.assertEqual(pipeline.mastery_model.values["lesson_completion_rate"], 0.5)
        self.assertEqual(pipeline.retention_model.values["days_active"], 5.0)
        self.assertEqual(result["masteryScore"], 67.5)
        self.assertEqual(result["retentionProbability"], 0.75)
        self.assertIsNone(result["learningStyle"])
        self.assertEqual(result["difficultySource"], "transparent_policy")
        self.assertEqual(result["trainingData"], "synthetic")

    def test_prediction_api_rejects_requests_without_evidence(self):
        with self.assertRaises(ValueError):
            PredictProfileRequest()
        self.assertEqual(PredictProfileRequest(quizScore=0).quizScore, 0)
        with self.assertRaises(ValueError):
            PredictProfileRequest(quizScore=101)

    def test_ai_path_analysis_cannot_return_a_nonexistent_lesson(self):
        pipeline = LearningEnginePipeline.__new__(LearningEnginePipeline)
        pipeline.gemini_enabled = True
        candidate = {"id": "real-lesson", "title": "Loops", "reason": "Quiz gap", "lessonId": "lesson-1", "subject": "Python", "type": "practice"}
        with patch.object(
            pipeline,
            "generate_text_with_provider",
            return_value=('[{"id":"real-lesson","reason":"Your quiz identified this topic."},{"id":"fake-lesson","reason":"Invented lesson."}]', "Gemini"),
        ):
            result = __import__("asyncio").run(pipeline.analyze_learning_recommendations({}, [candidate]))
        self.assertEqual(result["items"], [{"id": "real-lesson", "reason": "Your quiz identified this topic."}])
        self.assertEqual(result["source"], "gemini_grounded_candidates")

    def test_ai_path_request_bounds_candidate_count_and_evidence(self):
        candidate = {"id": "x", "title": "Lesson", "reason": "Reason", "lessonId": "x"}
        self.assertEqual(len(AnalyzeRecommendationsRequest(evidence={}, candidates=[candidate]).candidates), 1)
        with self.assertRaises(ValueError):
            AnalyzeRecommendationsRequest(evidence={}, candidates=[])


if __name__ == "__main__":
    unittest.main()
