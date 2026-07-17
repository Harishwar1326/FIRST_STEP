import logging
import random
import spacy
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import numpy as np
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
import google.generativeai as genai
from app.core.config import settings

logger = logging.getLogger("ai_service")

class LearningEnginePipeline:
    def __init__(self):
        # Initialize spaCy
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except Exception as e:
            logger.error(f"Failed to load spaCy inside LearningEnginePipeline: {str(e)}")
            self.nlp = None

        # Try to initialize Gemini
        self.gemini_enabled = False
        if settings.GEMINI_API_KEY:
            try:
                genai.configure(api_key=settings.GEMINI_API_KEY)
                self.gemini_enabled = True
                logger.info("Gemini API configured successfully in LearningEnginePipeline.")
            except Exception as e:
                logger.error(f"Failed to configure Gemini API: {str(e)}")

        # Initialize and train the ML models on synthetic data
        self._initialize_and_train_models()

    def _initialize_and_train_models(self):
        """Train models on seed data during startup for deterministic and realistic predictions"""
        logger.info("Training Scikit-Learn models on synthetic learning history...")
        np.random.seed(42)
        n_samples = 150

        # 1. Knowledge Mastery Prediction (RandomForestRegressor)
        # Inputs: [QuizScore (0-100), TaskCompletion (0-1), StudyTime (min), RevisionCount]
        X_mastery = []
        y_mastery = []
        for _ in range(n_samples):
            quiz = np.random.uniform(30, 100)
            task = np.random.uniform(0.1, 1.0)
            time = np.random.uniform(5, 60)
            revisions = np.random.randint(0, 5)
            # Mastery increases with quiz score, task completion, study time, and revisions
            mastery = (quiz * 0.5) + (task * 20) + (min(time, 30) * 0.5) + (revisions * 4)
            mastery = min(100, max(0, mastery + np.random.normal(0, 3)))
            X_mastery.append([quiz, task, time, revisions])
            y_mastery.append(mastery)

        self.mastery_model = RandomForestRegressor(n_estimators=20, random_state=42)
        self.mastery_model.fit(X_mastery, y_mastery)

        # 2. Retention Prediction (LogisticRegression)
        # Inputs: [StudyTime (min), RevisionCount, DaysSinceLastRevision, QuizAccuracy (0-1)]
        X_retention = []
        y_retention = [] # Binary: 1 = retained, 0 = forgotten
        for _ in range(n_samples):
            time = np.random.uniform(5, 60)
            revisions = np.random.randint(0, 5)
            days_since = np.random.uniform(0, 30)
            accuracy = np.random.uniform(0.3, 1.0)
            # Probability of retention score
            score = (accuracy * 4.0) + (revisions * 0.8) + (min(time, 30) * 0.05) - (days_since * 0.25)
            retained = 1 if score > 1.5 else 0
            X_retention.append([time, revisions, days_since, accuracy])
            y_retention.append(retained)

        self.retention_model = LogisticRegression(random_state=42)
        self.retention_model.fit(X_retention, y_retention)

        # 3. Learning Style Classification (RandomForestClassifier)
        # Inputs: [ReadingSpeed (WPM), DrawingActivity (strokes), VideoDurationRatio (0-1), NotesLength (chars)]
        # Classes: 0: Visual, 1: Text, 2: Practice-Oriented, 3: Mixed
        X_style = []
        y_style = []
        for _ in range(n_samples):
            speed = np.random.uniform(80, 300)
            strokes = np.random.randint(0, 150)
            video_ratio = np.random.uniform(0, 1)
            notes_len = np.random.randint(0, 1000)

            # Assign labels based on dominant activity
            if strokes > 50 and video_ratio > 0.5:
                style = 0 # Visual
            elif notes_len > 400 and strokes < 10:
                style = 1 # Text
            elif strokes > 20 and speed > 180:
                style = 2 # Practice-Oriented
            else:
                style = 3 # Mixed

            X_style.append([speed, strokes, video_ratio, notes_len])
            y_style.append(style)

        self.style_model = RandomForestClassifier(n_estimators=20, random_state=42)
        self.style_model.fit(X_style, y_style)
        self.style_classes = ['Visual', 'Text', 'Practice-Oriented', 'Mixed']

        # 4. Next Lesson Difficulty Prediction (DecisionTreeClassifier)
        # Inputs: [CurrentMastery (0-100), PrevQuizScore (0-100), ConfidenceLevel (1-5)]
        # Classes: 0: Easy, 1: Medium, 2: Advanced
        X_diff = []
        y_diff = []
        for _ in range(n_samples):
            mastery = np.random.uniform(10, 100)
            quiz = np.random.uniform(20, 100)
            conf = np.random.randint(1, 6)

            if mastery > 75 and quiz > 80:
                diff = 2 # Advanced
            elif mastery > 45:
                diff = 1 # Medium
            else:
                diff = 0 # Easy

            X_diff.append([mastery, quiz, conf])
            y_diff.append(diff)

        self.diff_model = DecisionTreeClassifier(max_depth=4, random_state=42)
        self.diff_model.fit(X_diff, y_diff)
        self.diff_classes = ['Easy', 'Medium', 'Advanced']

        logger.info("Scikit-Learn ML models trained successfully!")

    def predict_profile(self, features: Dict) -> Dict:
        """Predict mastery, retention, learning style, and recommended difficulty"""
        # Parse mastery inputs
        quiz_score = features.get("quizScore", 75.0)
        task_completion = features.get("taskCompletion", 0.8)
        study_time = features.get("studyTime", 20.0)
        revisions = features.get("revisionCount", 1)

        mastery_pred = self.mastery_model.predict([[quiz_score, task_completion, study_time, revisions]])[0]
        mastery_pred = float(np.clip(mastery_pred, 0, 100))

        # Parse retention inputs
        days_since_rev = features.get("daysSinceLastRevision", 1.0)
        quiz_accuracy = quiz_score / 100.0

        retention_proba = self.retention_model.predict_proba([[study_time, revisions, days_since_rev, quiz_accuracy]])[0][1]
        retention_proba = float(np.clip(retention_proba, 0.0, 1.0))

        # Parse style inputs
        reading_speed = features.get("readingSpeed", 150.0)
        drawing_activity = features.get("drawingActivity", 10.0)
        video_ratio = features.get("videoDurationRatio", 0.5)
        notes_length = features.get("notesLength", 100.0)

        style_idx = self.style_model.predict([[reading_speed, drawing_activity, video_ratio, notes_length]])[0]
        style_pred = self.style_classes[style_idx]

        # Parse difficulty inputs
        confidence = features.get("confidenceLevel", 3)
        diff_idx = self.diff_model.predict([[mastery_pred, quiz_score, confidence]])[0]
        diff_pred = self.diff_classes[diff_idx]

        return {
            "masteryScore": round(mastery_pred, 1),
            "retentionProbability": round(retention_proba, 2),
            "learningStyle": style_pred,
            "difficulty": diff_pred
        }

    async def generate_personalized_notes(self, lesson_title: str, lesson_content: str, mastery_level: str) -> Dict:
        """Generate notes tailored to the student's mastery level"""
        prompt = (
            f"Generate educational study notes for the topic '{lesson_title}' targeting a '{mastery_level}' level student.\n"
            f"Reference material:\n{lesson_content}\n\n"
        )
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

        if self.gemini_enabled:
            try:
                model = genai.GenerativeModel('gemini-pro')
                response = model.generate_content(prompt)
                return {"notes": response.text, "level": mastery_level, "generatedBy": "Gemini"}
            except Exception as e:
                logger.error(f"Gemini generation error: {str(e)}. Falling back to local NLP generator.")

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

        if self.gemini_enabled:
            try:
                model = genai.GenerativeModel('gemini-pro')
                response = model.generate_content(prompt)
                import json
                cleaned_text = response.text.strip().replace("```json", "").replace("```", "").strip()
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

        if self.gemini_enabled:
            try:
                model = genai.GenerativeModel('gemini-pro')
                response = model.generate_content(prompt)
                import json
                cleaned_text = response.text.strip().replace("```json", "").replace("```", "").strip()
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
