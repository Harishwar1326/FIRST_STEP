import logging
import json
import asyncio
try:
    import spacy
except ImportError:
    spacy = None
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
try:
    from google import genai
    from google.genai import types as genai_types
except ImportError:
    genai = None
    genai_types = None
from app.core.config import settings
from app.core.ollama_client import generate_ollama_text

logger = logging.getLogger("ai_service")

class LearningEnginePipeline:
    STYLE_LABELS = ["Visual", "Text/Reading", "Practical/Hands-on", "Interactive Quiz"]
    DIFFICULTY_LABELS = ["Beginner", "Intermediate", "Advanced"]

    def __init__(self):
        # Initialize spaCy
        self.nlp = None
        if spacy is not None:
            try:
                self.nlp = spacy.load("en_core_web_sm")
            except Exception as e:
                logger.error(f"Failed to load spaCy inside LearningEnginePipeline: {str(e)}")

        # Try to initialize Gemini
        self.gemini_enabled = False
        self.gemini_client = None
        if genai is not None and settings.GEMINI_API_KEY:
            try:
                self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
                self.gemini_enabled = True
                logger.info("Gemini API configured successfully in LearningEnginePipeline.")
            except Exception as e:
                logger.error(f"Failed to configure Gemini API: {str(e)}")

        # Initialize and train/load the ML models
        self._initialize_and_train_models()

    @property
    def llm_fallback_enabled(self) -> bool:
        return self.gemini_enabled or settings.OLLAMA_FALLBACK_ENABLED

    def generate_text_with_provider(self, prompt: str, *, json_output: bool = False):
        if self.gemini_enabled and self.gemini_client:
            try:
                response = self.gemini_client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                    config=genai_types.GenerateContentConfig(
                        response_mime_type="application/json" if json_output else "text/plain",
                        temperature=0.2,
                        max_output_tokens=4096,
                    ),
                )
                text = (response.text or "").strip()
                if text:
                    if json_output:
                        json.loads(text)
                    return text, "Gemini"
                raise ValueError("Gemini returned empty text")
            except Exception:
                logger.exception("Gemini generation failed; trying the configured local Ollama model")

        if settings.OLLAMA_FALLBACK_ENABLED:
            text = generate_ollama_text(
                prompt,
                system_prompt="You are FirstStep's local AI fallback. Follow the task instructions carefully and ground answers in supplied evidence.",
                json_output=json_output,
                max_tokens=4096,
                temperature=0.2,
            )
            return text, "Ollama"

        raise RuntimeError("Gemini is unavailable and Ollama fallback is disabled")

    def generate_gemini_text(self, prompt: str, *, json_output: bool = False) -> str:
        # Kept as a compatibility wrapper for existing pipeline callers.
        return self.generate_text_with_provider(prompt, json_output=json_output)[0]

    def _initialize_and_train_models(self):
        """Load the two supported baseline artifacts; never train fake data at startup."""
        import joblib
        from pathlib import Path

        base_data_dir = Path(__file__).resolve().parent.parent.parent / "data" / "models"
        self.mastery_model = None
        self.retention_model = None
        self.style_model = None
        self.diff_model = None
        manifest_path = base_data_dir / "training_report.json"
        manifest = None
        if manifest_path.exists():
            try:
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            except Exception:
                logger.exception("The model provenance report is invalid; refusing to load old model artifacts.")
        if not manifest or manifest.get("trainingVersion") != 3 or manifest.get("datasetType") != "SYNTHETIC_DATA":
            logger.warning("No current model provenance report; old or unverified artifacts will not be loaded.")
            return
        expected_features = {
            "mastery_model": [
                "average_quiz_score", "lesson_completion_rate", "average_session_time", "revision_frequency",
            ],
            "retention_model": [
                "average_session_time", "revision_frequency", "days_active", "quiz_accuracy",
            ],
            "style_model": [
                "average_watch_percentage", "pause_frequency", "video_watch_rate", "average_answer_time",
            ],
            "diff_model": ["mastery_100", "average_quiz_score", "confidence_5"],
        }
        for attr in expected_features:
            artifact = base_data_dir / f"{attr.removesuffix('_model')}_model.joblib"
            if artifact.exists():
                try:
                    model = joblib.load(artifact)
                    if list(getattr(model, "feature_names_in_", [])) != expected_features[attr]:
                        raise ValueError(f"{artifact.name} feature schema does not match the current API contract")
                    setattr(self, attr, model)
                except Exception:
                    logger.exception("Could not load %s; the service will use an explicit rule fallback", artifact.name)
        if any(getattr(self, attr) is None for attr in expected_features):
            logger.warning("One or more synthetic baseline artifacts are missing; fallback predictions will be marked non-ML.")

    def predict_profile(self, features: Dict) -> Dict:
        """Predict mastery, retention, learning style, and recommended difficulty"""
        # Parse mastery inputs: ['average_quiz_score', 'lesson_completion_rate', 'average_session_time', 'revision_frequency']
        quiz_score = float(features.get("quizScore", features.get("averageQuizScore", 0.0)) or 0.0)
        completion_value = features.get("lessonCompletionRate")
        if completion_value is None:
            completion_value = features.get("taskCompletion", 0.0)
        task_completion = float(completion_value or 0.0)
        if task_completion > 1.0:
            task_completion = task_completion / 100.0
        task_completion = float(np.clip(task_completion, 0.0, 1.0))

        study_time = float(features.get("studyTime", features.get("averageSessionTime", 0.0)) or 0.0)
        revisions = float(features.get("revisionCount", features.get("revisionFrequency", 0.0)) or 0.0)

        mastery_features = pd.DataFrame([{
            "average_quiz_score": quiz_score,
            "lesson_completion_rate": task_completion,
            "average_session_time": study_time,
            "revision_frequency": revisions,
        }])
        if self.mastery_model is not None:
            mastery_pred = float(self.mastery_model.predict(mastery_features)[0])
            prediction_source = "synthetic_baseline_model"
        else:
            mastery_pred = float(quiz_score * 0.55 + task_completion * 25 + min(study_time, 60) * 0.2 + min(revisions, 7) * 1.5)
            prediction_source = "transparent_rule_fallback"
        mastery_pred = float(np.clip(mastery_pred, 0, 100))

        # Parse retention inputs: ['average_session_time', 'revision_frequency', 'days_active', 'quiz_accuracy']
        days_active = float(features.get("daysActive") or 0.0)
        quiz_accuracy = float(features.get("quizAccuracy", quiz_score / 100.0) or 0.0)
        if quiz_accuracy > 1.0:
            quiz_accuracy = quiz_accuracy / 100.0
        quiz_accuracy = float(np.clip(quiz_accuracy, 0.0, 1.0))

        retention_features = pd.DataFrame([{
            "average_session_time": study_time,
            "revision_frequency": revisions,
            "days_active": days_active,
            "quiz_accuracy": quiz_accuracy,
        }])
        if self.retention_model is not None:
            classes = list(self.retention_model.classes_)
            positive_index = classes.index(1)
            retention_proba = self.retention_model.predict_proba(retention_features)[0][positive_index]
        else:
            retention_proba = 0.55 * quiz_accuracy + 0.25 * min(revisions / 7.0, 1.0) + 0.20 * min(days_active / 30.0, 1.0)
        retention_proba = float(np.clip(retention_proba, 0.0, 1.0))
        watch_percentage = float(features.get("averageWatchPercentage", 0.0) or 0.0)
        if watch_percentage > 1.0:
            watch_percentage /= 100.0
        video_watch_rate = float(features.get("videoWatchRate", 0.0) or 0.0)
        if video_watch_rate > 1.0:
            video_watch_rate /= 100.0
        style_features = pd.DataFrame([{
            "average_watch_percentage": float(np.clip(watch_percentage, 0.0, 1.0)),
            "pause_frequency": float(max(features.get("pauseFrequency", 0.0) or 0.0, 0.0)),
            "video_watch_rate": float(np.clip(video_watch_rate, 0.0, 1.0)),
            "average_answer_time": float(max(features.get("averageAnswerTime", 0.0) or 0.0, 0.0)),
        }])
        style_model = getattr(self, "style_model", None)
        if style_model is not None:
            style_index = int(style_model.predict(style_features)[0])
            learning_style = self.STYLE_LABELS[style_index]
            learning_style_status = "synthetic_baseline_model"
        else:
            learning_style = None
            learning_style_status = "unavailable_without_validated_preference_evidence"

        confidence_level = float(features.get("confidenceLevel", 0.0) or 0.0)
        if confidence_level > 1.0:
            confidence_level /= 100.0
        difficulty_features = pd.DataFrame([{
            "mastery_100": mastery_pred,
            "average_quiz_score": quiz_score,
            "confidence_5": float(np.clip(confidence_level, 0.0, 1.0) * 5.0),
        }])
        diff_model = getattr(self, "diff_model", None)
        if diff_model is not None:
            difficulty_index = int(diff_model.predict(difficulty_features)[0])
            diff_pred = self.DIFFICULTY_LABELS[difficulty_index]
            difficulty_source = "synthetic_baseline_model"
        else:
            diff_pred = "Advanced" if mastery_pred >= 75 and quiz_score >= 80 else "Beginner" if mastery_pred < 45 else "Intermediate"
            difficulty_source = "transparent_policy"

        return {
            "masteryScore": round(mastery_pred, 1),
            "retentionProbability": round(retention_proba, 2),
            "learningStyle": learning_style,
            "difficulty": diff_pred,
            "predictionSource": prediction_source,
            "trainingData": "synthetic",
            "difficultySource": difficulty_source,
            "learningStyleSource": learning_style_status,
            "learningStyleStatus": learning_style_status,
        }

    async def analyze_learning_recommendations(self, evidence: Dict, candidates: List[Dict]) -> Dict:
        """Let the configured LLM explain/rank only evidence-backed candidates."""
        safe_candidates = candidates[:8]
        fallback = [{"id": item["id"], "reason": item["reason"]} for item in safe_candidates]
        if not safe_candidates or not self.llm_fallback_enabled:
            return {"items": fallback, "source": "evidence_rules"}

        import json
        allowed_ids = {item["id"] for item in safe_candidates}
        safe_evidence = {
            "averageQuizScore": evidence.get("averageQuizScore"),
            "weakTopics": [str(value)[:120] for value in evidence.get("weakTopics", [])[:8]],
            "lessonsStarted": evidence.get("lessonsStarted"),
            "lessonsCompleted": evidence.get("lessonsCompleted"),
            "primaryGoal": str(evidence.get("primaryGoal") or "")[:120],
            "modelDifficulty": evidence.get("modelDifficulty"),
            "modelTrainingData": evidence.get("modelTrainingData"),
        }
        prompt = (
            "Choose and rank up to four next actions from the supplied candidates for this learner. "
            "Use missed quiz topics, saved progress, prerequisites already checked by the application, and the stated goal. "
            "Do not invent lessons, links, weaknesses, or evidence. Treat model estimates trained on synthetic data as experimental and never use them as the sole reason. "
            "Return only JSON: [{\"id\":\"candidate id\",\"reason\":\"short evidence-grounded reason\"}].\n"
            f"Evidence: {json.dumps(safe_evidence)}\nCandidates: {json.dumps(safe_candidates)}"
        )
        try:
            raw, provider = await asyncio.to_thread(self.generate_text_with_provider, prompt, json_output=True)
            proposed = json.loads(raw)
            accepted = []
            used = set()
            for item in proposed if isinstance(proposed, list) else []:
                candidate_id = str(item.get("id", ""))
                reason = str(item.get("reason", "")).strip()
                if candidate_id in allowed_ids and candidate_id not in used and reason:
                    accepted.append({"id": candidate_id, "reason": reason[:300]})
                    used.add(candidate_id)
            if accepted:
                return {"items": accepted, "source": f"{provider.lower()}_grounded_candidates"}
        except Exception:
            logger.exception("AI recommendation analysis failed; preserving evidence-rule recommendations")
        return {"items": fallback, "source": "evidence_rules"}

    async def generate_personalized_notes(self, lesson_title: str, lesson_content: str, mastery_level: str, student_evidence: Optional[Dict] = None) -> Dict:
        """Generate notes tailored to the student's mastery level"""
        prompt = (
            f"Generate educational study notes for the topic '{lesson_title}' targeting a '{mastery_level}' level student.\n"
            f"Reference material:\n{lesson_content}\n\n"
        )
        evidence = student_evidence if isinstance(student_evidence, dict) else {}
        weak_concepts = [str(item)[:120] for item in evidence.get("weakConcepts", [])[:5] if str(item).strip()]
        quiz_score = evidence.get("recentQuizScore")
        if weak_concepts or quiz_score is not None:
            prompt += (
                "Personalization evidence (use only to focus these notes): "
                f"recent objectively graded quiz score={quiz_score if quiz_score is not None else 'not recorded'}; "
                f"missed concepts={weak_concepts or 'none recorded'}. "
                "Focus explanations and practice on the recorded missed concepts. Do not claim that video behavior proves understanding.\n"
            )
        if evidence.get("modelScoreStatus") == "synthetic":
            prompt += "The model estimate was trained on synthetic data; do not present its numerical score as established knowledge or evidence.\n"
        if mastery_level == "Beginner":
            prompt += (
                "Requirements:\n"
                "- Use extremely simple language.\n"
                "- Include concrete, daily-life examples suitable for rural environments.\n"
                "- Provide visual/illustration descriptions (e.g. 'Imagine a bicycle wheel...')."
            )
        elif mastery_level == "Advanced":
            prompt += (
                "Requirements:\n"
                "- Provide a concise, highly-scientific summary.\n"
                "- Include practical, real-world engineering or scientific applications.\n"
                "- Include 2 advanced review or technical interview questions with answers."
            )
        else: # Intermediate
            prompt += (
                "Requirements:\n"
                "- Provide a balanced conceptual explanation.\n"
                "- Include active-recall summaries and a list of key definitions."
            )

        if self.llm_fallback_enabled:
            try:
                response, provider = await asyncio.to_thread(self.generate_text_with_provider, prompt)
                return {"notes": response, "level": mastery_level, "generatedBy": provider}
            except Exception as e:
                logger.error("Gemini and Ollama generation failed: %s. Falling back to local NLP generator.", e)

        # Local NLP Fallback using spaCy
        return self._generate_local_fallback_notes(lesson_title, lesson_content, mastery_level)

    def _generate_local_fallback_notes(self, title: str, content: str, level: str) -> Dict:
        """Local template-based notes generator using spaCy keyword extraction"""
        keywords = []
        if self.nlp:
            doc = self.nlp(content[:1500])
            # Extract nouns and proper nouns as key concepts
            keywords = list(set([token.text for token in doc if token.pos_ in ["NOUN", "PROPN"] and len(token.text) > 3]))
        
        keywords = keywords[:6] if keywords else ["Key Concept", "Subject Material", "Fundamental Principles"]

        if level == "Beginner":
            body = (
                f"### Welcome to {title}! (Beginner Guide)\n\n"
                f"Let's learn this concept together using simple terms.\n\n"
                f"**What does this mean?**\n"
                f"Think of it like daily-life events. In simple words, the main ideas here revolve around: "
                f"{', '.join(keywords)}.\n\n"
                f"**Easy Example:**\n"
                f"Just like how water flows downhill, or how wind blows leaves, {keywords[0] if len(keywords) > 0 else 'this concept'} "
                f"helps us explain standard behaviors we see in the village and around us every day.\n\n"
                f"**💡 Visual Illustration:**\n"
                f"- Picture a balance scale. When you put a weight on one side, it tilts. That's exactly how "
                f"{keywords[-1] if keywords else 'forces'} work in this subject! Keep it simple and clear."
            )
        elif level == "Advanced":
            body = (
                f"### {title} - Deep Dive Analysis (Advanced)\n\n"
                f"This advanced notes document evaluates core mechanisms of {title}.\n\n"
                f"**Theoretical Overview:**\n"
                f"The governing parameters center on critical variables: {', '.join(keywords)}.\n\n"
                f"**🚀 Real-World Practical Applications:**\n"
                f"1. **Modern Agriculture**: Utilizing the principles of {keywords[0]} to construct smart irrigation channels.\n"
                f"2. **Solar Infrastructure**: How local village solar grids rely on managing {keywords[min(1, len(keywords)-1)]}.\n\n"
                f"**📋 Technical Review & Board Exam Questions:**\n"
                f"1. *Question*: Discuss the impact of fluctuations in {keywords[-1]} on system equilibrium.\n"
                f"   *Answer*: Fluctuations directly shift the thermodynamic states, requiring negative feedback loops to stabilize.\n"
                f"2. *Question*: Derive the structural relationship between {keywords[0]} and ambient resistance.\n"
                f"   *Answer*: The relationship is proportional, represented by the ratio of force distribution over surface area."
            )
        else: # Intermediate
            body = (
                f"### {title} Study Guide (Intermediate)\n\n"
                f"A balanced explanation of the core principles.\n\n"
                f"**Key Concepts & Glossary:**\n"
                + "\n".join([f"- **{kw.capitalize()}**: The dynamic role of {kw} in relation to the main chapter." for kw in keywords]) + "\n\n"
                f"**Active Recall Checkpoint:**\n"
                f"Take 30 seconds to close your eyes and explain what you know about "
                f"{keywords[0] if keywords else 'this topic'} to a classmate!"
            )

        return {"notes": body, "level": level, "generatedBy": "Local NLP Engine"}

    async def generate_personalized_flashcards(self, weak_concepts: List[str]) -> List[Dict]:
        """Generate flashcards for weak concepts"""
        if not weak_concepts:
            weak_concepts = ["General Science", "Study Habits"]

        prompt = (
            f"Generate a JSON array of flashcards for the following weak academic concepts: {', '.join(weak_concepts)}.\n"
            "Each flashcard must have a 'front' (question) and a 'back' (answer/definition).\n"
            "Respond ONLY with a valid JSON array of objects. Example:\n"
            "[{\"front\": \"Question here?\", \"back\": \"Answer here.\", \"concept\": \"Concept Name\"}]"
        )

        if self.llm_fallback_enabled:
            try:
                cleaned_text = await asyncio.to_thread(self.generate_gemini_text, prompt, json_output=True)
                cards = json.loads(cleaned_text)
                return cards
            except Exception as e:
                logger.error(f"Gemini flashcard generation failed: {str(e)}")

        # Local NLP Fallback
        cards = []
        for concept in weak_concepts:
            cards.append({
                "front": f"What is the definition and primary role of {concept} in exams?",
                "back": f"{concept} represents a key topic. Reviewing this means testing active memory recalls, checking definitions, and solving chapter problems.",
                "concept": concept
            })
            cards.append({
                "front": f"Can you give a practical example of {concept} in action?",
                "back": f"When applying {concept}, we observe physical or mathematical reactions. Review the lesson examples to practice calculations.",
                "concept": concept
            })
        return cards

    async def generate_personalized_quiz(self, mistake_concepts: List[str]) -> List[Dict]:
        """Generate quiz questions specifically targeting concepts the user previously got wrong"""
        if not mistake_concepts:
            mistake_concepts = ["Fundamental Mathematics"]

        prompt = (
            f"Generate a diagnostic practice quiz in JSON format targeting these weak/mistake concepts: {', '.join(mistake_concepts)}.\n"
            "Provide 3 multiple-choice questions. Respond ONLY with a valid JSON array of objects. Format:\n"
            "[\n"
            "  {\n"
            "    \"questionText\": \"Question text here?\",\n"
            "    \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"],\n"
            "    \"correctAnswer\": \"Option A\",\n"
            "    \"explanation\": \"Explain why this is correct.\",\n"
            "    \"concept\": \"Concept Name\"\n"
            "  }\n"
            "]"
        )

        if self.llm_fallback_enabled:
            try:
                cleaned_text = await asyncio.to_thread(self.generate_gemini_text, prompt, json_output=True)
                questions = json.loads(cleaned_text)
                return questions
            except Exception as e:
                logger.error(f"Gemini quiz generation failed: {str(e)}")

        # Local Fallback quiz questions
        questions = []
        for i, concept in enumerate(mistake_concepts):
            questions.append({
                "questionText": f"In curriculum topics, which of the following best describes the core principle of {concept}?",
                "options": [
                    f"It represents a variable balance state",
                    f"It is defined strictly as a static constraint",
                    f"It is the derivative of the primary function",
                    f"None of the above options fit the definition"
                ],
                "correctAnswer": f"It represents a variable balance state",
                "explanation": f"When studied, {concept} acts as a key state variable. Understanding its fluctuations helps master related concepts.",
                "concept": concept
            })
        return questions[:3]
