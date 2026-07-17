import logging
from typing import Dict, List
from datetime import datetime, timedelta
from collections import defaultdict
import random

logger = logging.getLogger("ai_service")

class AcademyPipeline:
    def __init__(self):
        self.techniques = ["spaced-repetition", "active-recall", "pomodoro", "feynman", "interleaving", "elaborative-interrogation"]
        # In-memory storage for demo (in production, use database)
        self.user_plans = {}
        self.user_flashcards = defaultdict(list)
        self.user_streaks = {}
    
    async def generate_plan(self, user_id: str) -> Dict:
        """
        Generate personalized study plan using spaced repetition
        """
        try:
            # Check if plan exists
            if user_id not in self.user_plans:
                # Generate initial plan
                plan = self._create_initial_plan(user_id)
                self.user_plans[user_id] = plan
            else:
                # Update existing plan
                plan = self._update_plan(user_id)
                self.user_plans[user_id] = plan
            
            return plan
        except Exception as e:
            logger.error(f"Study plan generation error: {str(e)}")
            raise
    
    def _create_initial_plan(self, user_id: str) -> Dict:
        """Create initial study plan for new user"""
        today = datetime.now()
        week_later = today + timedelta(days=7)
        
        # Generate weekly goals based on common subjects
        subjects = ["Physics", "Chemistry", "Mathematics", "Biology"]
        weekly_goals = []
        for subject in subjects:
            weekly_goals.append({
                "subject": subject,
                "topics": self._generate_topics_for_subject(subject),
                "targetHours": random.randint(3, 6)
            })
        
        # Generate daily tasks for today
        daily_tasks = self._generate_daily_tasks(today, weekly_goals)
        
        return {
            "weeklyGoals": weekly_goals,
            "dailyTasks": daily_tasks,
            "techniques": [
                {"type": "spaced-repetition", "enabled": True},
                {"type": "active-recall", "enabled": True},
                {"type": "pomodoro", "enabled": True},
                {"type": "feynman", "enabled": True}
            ],
            "estimatedCompletion": week_later.isoformat(),
            "createdAt": today.isoformat()
        }
    
    def _update_plan(self, user_id: str) -> Dict:
        """Update existing study plan based on progress"""
        plan = self.user_plans[user_id]
        today = datetime.now()
        
        # Update daily tasks for today
        plan["dailyTasks"] = self._generate_daily_tasks(today, plan["weeklyGoals"])
        
        return plan
    
    def _generate_topics_for_subject(self, subject: str) -> List[str]:
        """Generate topics for a given subject"""
        topics_map = {
            "Physics": ["Thermodynamics", "Newton's Laws", "Electromagnetism", "Optics"],
            "Chemistry": ["Organic Chemistry", "Periodic Table", "Chemical Bonding", "Stoichiometry"],
            "Mathematics": ["Calculus", "Algebra", "Geometry", "Statistics"],
            "Biology": ["Cell Biology", "Genetics", "Ecology", "Human Anatomy"]
        }
        return random.sample(topics_map.get(subject, ["General"]), 3)
    
    def _generate_daily_tasks(self, date: datetime, weekly_goals: List[Dict]) -> List[Dict]:
        """Generate daily tasks based on weekly goals"""
        tasks = []
        techniques = ["spaced-repetition", "active-recall", "pomodoro", "feynman"]
        
        # Generate tasks from weekly goals
        for goal in weekly_goals[:2]:  # Focus on top 2 subjects
            subject = goal["subject"]
            topic = random.choice(goal["topics"])
            technique = random.choice(techniques)
            
            tasks.append({
                "title": f"{subject}: {topic} ({technique.replace('-', ' ').title()})",
                "technique": technique,
                "duration": f"{random.randint(15, 45)} min",
                "completed": False,
                "priority": "high" if random.random() > 0.5 else "medium",
                "date": date.isoformat(),
                "subject": subject
            })
        
        return tasks
    
    async def process_flashcard_review(self, user_id: str, card_id: str, rating: int) -> Dict:
        """
        Process flashcard review using SM-2 spaced repetition algorithm
        """
        try:
            # Find or create flashcard
            flashcard = self._find_or_create_flashcard(user_id, card_id)
            
            # SM-2 Algorithm parameters
            ease_factor = flashcard.get("easeFactor", 2.5)
            interval = flashcard.get("interval", 1)
            repetitions = flashcard.get("repetitions", 0)
            
            # Update parameters based on rating
            if rating >= 3:
                # Correct answer
                if repetitions == 0:
                    interval = 1
                elif repetitions == 1:
                    interval = 6
                else:
                    interval = round(interval * ease_factor)
                
                repetitions += 1
                ease_factor = ease_factor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
                ease_factor = max(1.3, ease_factor)
            else:
                # Incorrect answer
                repetitions = 0
                interval = 1
                ease_factor = ease_factor - 0.2
                ease_factor = max(1.3, ease_factor)
            
            # Calculate next review date
            next_review = datetime.now() + timedelta(days=interval)
            
            # Update flashcard
            flashcard.update({
                "interval": interval,
                "repetitions": repetitions,
                "easeFactor": ease_factor,
                "lastReview": datetime.now().isoformat(),
                "nextReview": next_review.isoformat(),
                "rating": rating
            })
            
            return {
                "success": True,
                "nextReview": next_review.isoformat(),
                "interval": interval,
                "repetitions": repetitions,
                "easeFactor": round(ease_factor, 2),
                "message": "Flashcard reviewed successfully"
            }
        except Exception as e:
            logger.error(f"Flashcard review processing error: {str(e)}")
            raise
    
    def _find_or_create_flashcard(self, user_id: str, card_id: str) -> Dict:
        """Find existing flashcard or create new one"""
        flashcards = self.user_flashcards[user_id]
        
        for card in flashcards:
            if card.get("id") == card_id:
                return card
        
        # Create new flashcard
        new_card = {
            "id": card_id,
            "interval": 1,
            "repetitions": 0,
            "easeFactor": 2.5,
            "lastReview": None,
            "nextReview": datetime.now().isoformat(),
            "createdAt": datetime.now().isoformat()
        }
        flashcards.append(new_card)
        return new_card
    
    async def get_due_flashcards(self, user_id: str) -> Dict:
        """Get flashcards due for review today"""
        try:
            now = datetime.now()
            flashcards = self.user_flashcards.get(user_id, [])
            
            due_cards = []
            for card in flashcards:
                next_review = datetime.fromisoformat(card.get("nextReview", now.isoformat()))
                if next_review <= now:
                    due_cards.append(card)
            
            return {
                "flashcards": due_cards,
                "dueCount": len(due_cards),
                "totalCards": len(flashcards)
            }
        except Exception as e:
            logger.error(f"Get due flashcards error: {str(e)}")
            raise
    
    async def update_streak(self, user_id: str) -> Dict:
        """Update study streak"""
        try:
            today = datetime.now().date()
            
            if user_id not in self.user_streaks:
                # Initialize streak
                self.user_streaks[user_id] = {
                    "currentStreak": 1,
                    "longestStreak": 1,
                    "lastStudyDate": today.isoformat(),
                    "history": [{"date": today.isoformat(), "streak": 1}]
                }
            else:
                streak = self.user_streaks[user_id]
                last_study = datetime.fromisoformat(streak["lastStudyDate"]).date()
                
                if last_study == today:
                    # Already studied today
                    pass
                elif (today - last_study).days == 1:
                    # Consecutive day
                    streak["currentStreak"] += 1
                    streak["longestStreak"] = max(streak["currentStreak"], streak["longestStreak"])
                    streak["lastStudyDate"] = today.isoformat()
                    streak["history"].append({"date": today.isoformat(), "streak": streak["currentStreak"]})
                else:
                    # Streak broken
                    streak["currentStreak"] = 1
                    streak["lastStudyDate"] = today.isoformat()
                    streak["history"].append({"date": today.isoformat(), "streak": 1})
            
            return self.user_streaks[user_id]
        except Exception as e:
            logger.error(f"Update streak error: {str(e)}")
            raise
    
    async def get_technique_recommendation(self, user_id: str, subject: str) -> Dict:
        """Recommend best study technique for specific subject"""
        try:
            # Simple recommendation logic (in production, use ML)
            technique_map = {
                "Physics": "feynman",  # Good for understanding concepts
                "Mathematics": "active-recall",  # Good for problem solving
                "Chemistry": "spaced-repetition",  # Good for memorization
                "Biology": "interleaving",  # Good for connecting concepts
            }
            
            recommended = technique_map.get(subject, "active-recall")
            
            return {
                "recommendedTechnique": recommended,
                "reason": self._get_technique_reason(recommended),
                "alternatives": [t for t in self.techniques if t != recommended][:2]
            }
        except Exception as e:
            logger.error(f"Technique recommendation error: {str(e)}")
            raise
    
    def _get_technique_reason(self, technique: str) -> str:
        """Get reason for technique recommendation"""
        reasons = {
            "spaced-repetition": "Optimizes memory retention through timed reviews",
            "active-recall": "Strengthens memory by testing yourself",
            "pomodoro": "Maintains focus with timed work intervals",
            "feynman": "Deepens understanding by teaching concepts",
            "interleaving": "Improves problem-solving by mixing topics",
            "elaborative-interrogation": "Enhances learning through self-questioning"
        }
        return reasons.get(technique, "Effective study technique")
