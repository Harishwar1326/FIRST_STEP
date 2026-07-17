import logging
from typing import Dict, List
import random
from datetime import datetime, timedelta
from collections import defaultdict

logger = logging.getLogger("ai_service")

class LearningTwinPipeline:
    def __init__(self):
        self.learning_styles = ["visual", "auditory", "kinesthetic", "reading"]
        self.attention_patterns = ["focused", "distributed", "alternating"]
        # In-memory storage for demo (in production, use database)
        self.user_profiles = {}
        self.user_sessions = defaultdict(list)
        self.user_mistakes = defaultdict(list)
    
    async def initialize(self, user_id: str, name: str) -> Dict:
        """
        Initialize AI Learning Twin for a new student
        """
        try:
            # Randomly assign initial learning style (in production, use assessment)
            learning_style = random.choice(self.learning_styles)
            attention_pattern = random.choice(self.attention_patterns)
            
            # Store initial profile
            self.user_profiles[user_id] = {
                "learningStyle": learning_style,
                "attentionPattern": attention_pattern,
                "knowledgeScore": 0,
                "skillProgress": {
                    "totalSessions": 0,
                    "totalTime": 0,
                    "averageAccuracy": 0
                },
                "strengths": [],
                "weaknesses": [],
                "createdAt": datetime.now().isoformat()
            }
            
            return {
                "learningStyle": learning_style,
                "attentionPattern": attention_pattern,
                "knowledgeScore": 0,
                "skillProgress": {
                    "totalSessions": 0,
                    "totalTime": 0,
                    "averageAccuracy": 0
                }
            }
        except Exception as e:
            logger.error(f"Twin initialization error: {str(e)}")
            raise
    
    async def get_analytics(self, user_id: str) -> Dict:
        """
        Get learning analytics and insights
        """
        try:
            profile = self.user_profiles.get(user_id, {})
            sessions = self.user_sessions.get(user_id, [])
            mistakes = self.user_mistakes.get(user_id, [])
            
            # Calculate analytics from session data
            if sessions:
                total_time = sum(s.get("duration", 0) for s in sessions)
                avg_accuracy = sum(s.get("accuracy", 0) for s in sessions) / len(sessions)
                learning_speed = self._calculate_learning_speed(sessions)
                memory_retention = self._calculate_memory_retention(sessions)
            else:
                total_time = 0
                avg_accuracy = 0
                learning_speed = 1.0
                memory_retention = 0.7
            
            # Analyze mistakes for weak topics
            weak_topics = self._analyze_weak_topics(mistakes)
            
            # Calculate progress rate
            progress_rate = self._calculate_progress_rate(sessions)
            
            # Calculate focus score
            focus_score = self._calculate_focus_score(sessions)
            
            return {
                "learningSpeed": learning_speed,
                "memoryRetention": memory_retention,
                "progressRate": progress_rate,
                "focusScore": focus_score,
                "studySessions": sessions[-10:] if sessions else [],  # Last 10 sessions
                "mistakes": mistakes[-10:] if mistakes else [],  # Last 10 mistakes
                "weakTopics": weak_topics
            }
        except Exception as e:
            logger.error(f"Analytics retrieval error: {str(e)}")
            raise
    
    async def get_recommendations(self, user_id: str) -> Dict:
        """
        Get personalized learning recommendations
        """
        try:
            profile = self.user_profiles.get(user_id, {})
            mistakes = self.user_mistakes.get(user_id, [])
            sessions = self.user_sessions.get(user_id, [])
            
            # Generate focus areas based on weak topics
            weak_topics = self._analyze_weak_topics(mistakes)
            focus_areas = weak_topics[:3] if weak_topics else ["Physics", "Mathematics"]
            
            # Generate practice topics
            practice_topics = self._generate_practice_topics(sessions, mistakes)
            
            # Generate review materials
            review_materials = self._generate_review_materials(sessions)
            
            # Suggest pace based on performance
            suggested_pace = self._suggest_pace(sessions)
            
            return {
                "focusAreas": focus_areas,
                "practiceTopics": practice_topics,
                "reviewMaterials": review_materials,
                "suggestedPace": suggested_pace
            }
        except Exception as e:
            logger.error(f"Recommendation generation error: {str(e)}")
            raise
    
    async def update_progress(self, user_id: str, progress_data: Dict) -> Dict:
        """
        Update student progress and learning data
        """
        try:
            # Update profile if exists
            if user_id not in self.user_profiles:
                await self.initialize(user_id, "Student")
            
            profile = self.user_profiles[user_id]
            
            # Add study session if provided
            if progress_data.get("studySession"):
                session = progress_data["studySession"]
                session["timestamp"] = datetime.now().isoformat()
                self.user_sessions[user_id].append(session)
                
                # Update skill progress
                profile["skillProgress"]["totalSessions"] += 1
                profile["skillProgress"]["totalTime"] += session.get("duration", 0)
                
                # Recalculate average accuracy
                sessions = self.user_sessions[user_id]
                profile["skillProgress"]["averageAccuracy"] = (
                    sum(s.get("accuracy", 0) for s in sessions) / len(sessions)
                )
            
            # Add mistake if provided
            if progress_data.get("mistake"):
                mistake = progress_data["mistake"]
                mistake["timestamp"] = datetime.now().isoformat()
                self.user_mistakes[user_id].append(mistake)
            
            # Update strengths and weaknesses based on performance
            self._update_strengths_weaknesses(user_id)
            
            # Update knowledge score
            profile["knowledgeScore"] = self._calculate_knowledge_score(user_id)
            
            logger.info(f"Progress updated for user {user_id}")
            return {"success": True}
        except Exception as e:
            logger.error(f"Progress update error: {str(e)}")
            raise
    
    def _calculate_learning_speed(self, sessions: List[Dict]) -> float:
        """Calculate learning speed based on session progression"""
        if len(sessions) < 2:
            return 1.0
        
        # Compare recent sessions to earlier sessions
        recent_avg = sum(s.get("accuracy", 0) for s in sessions[-5:]) / min(5, len(sessions))
        earlier_avg = sum(s.get("accuracy", 0) for s in sessions[:-5]) / max(1, len(sessions) - 5)
        
        return min(2.0, max(0.5, recent_avg / earlier_avg if earlier_avg > 0 else 1.0))
    
    def _calculate_memory_retention(self, sessions: List[Dict]) -> float:
        """Calculate memory retention based on repeated topic performance"""
        # Group sessions by subject
        subject_sessions = defaultdict(list)
        for session in sessions:
            subject = session.get("subject", "General")
            subject_sessions[subject].append(session)
        
        # Calculate retention for subjects with multiple sessions
        retentions = []
        for subject, subj_sessions in subject_sessions.items():
            if len(subj_sessions) >= 2:
                first_acc = subj_sessions[0].get("accuracy", 0)
                last_acc = subj_sessions[-1].get("accuracy", 0)
                retention = (last_acc - first_acc) / 100 if first_acc > 0 else 0
                retentions.append(max(0, min(1, 0.5 + retention)))
        
        return sum(retentions) / len(retentions) if retentions else 0.7
    
    def _analyze_weak_topics(self, mistakes: List[Dict]) -> List[str]:
        """Analyze mistakes to identify weak topics"""
        topic_counts = defaultdict(int)
        for mistake in mistakes:
            topic = mistake.get("concept", mistake.get("topic", "General"))
            topic_counts[topic] += 1
        
        # Sort by frequency
        sorted_topics = sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)
        return [topic for topic, count in sorted_topics[:5]]
    
    def _calculate_progress_rate(self, sessions: List[Dict]) -> str:
        """Calculate overall progress rate"""
        if len(sessions) < 2:
            return "+5%"
        
        recent_avg = sum(s.get("accuracy", 0) for s in sessions[-5:]) / min(5, len(sessions))
        earlier_avg = sum(s.get("accuracy", 0) for s in sessions[:-5]) / max(1, len(sessions) - 5)
        
        improvement = ((recent_avg - earlier_avg) / earlier_avg * 100) if earlier_avg > 0 else 5
        return f"+{int(improvement)}%" if improvement >= 0 else f"{int(improvement)}%"
    
    def _calculate_focus_score(self, sessions: List[Dict]) -> int:
        """Calculate focus score based on session consistency"""
        if not sessions:
            return 75
        
        # Calculate variance in accuracy
        accuracies = [s.get("accuracy", 0) for s in sessions]
        avg_accuracy = sum(accuracies) / len(accuracies)
        variance = sum((acc - avg_accuracy) ** 2 for acc in accuracies) / len(accuracies)
        
        # Lower variance = higher focus
        focus_score = int(max(50, min(100, 100 - variance * 2)))
        return focus_score
    
    def _generate_practice_topics(self, sessions: List[Dict], mistakes: List[Dict]) -> List[str]:
        """Generate practice topics based on performance"""
        weak_topics = self._analyze_weak_topics(mistakes)
        
        # Add topics from recent sessions with lower accuracy
        recent_low_accuracy = []
        for session in sessions[-5:]:
            if session.get("accuracy", 0) < 70:
                recent_low_accuracy.append(session.get("subject", "General"))
        
        # Combine and deduplicate
        practice_topics = list(set(weak_topics + recent_low_accuracy))
        return practice_topics[:5] if practice_topics else ["Calculus", "Thermodynamics"]
    
    def _generate_review_materials(self, sessions: List[Dict]) -> List[str]:
        """Generate review material suggestions"""
        # Suggest reviewing topics from sessions 3-7 days ago
        now = datetime.now()
        review_topics = []
        
        for session in sessions:
            session_date = datetime.fromisoformat(session.get("timestamp", ""))
            days_ago = (now - session_date).days
            
            if 3 <= days_ago <= 7:
                review_topics.append(session.get("subject", "General"))
        
        return list(set(review_topics))[:3] if review_topics else ["Chapter 5", "Previous notes"]
    
    def _suggest_pace(self, sessions: List[Dict]) -> str:
        """Suggest learning pace based on performance"""
        if not sessions:
            return "normal"
        
        avg_accuracy = sum(s.get("accuracy", 0) for s in sessions) / len(sessions)
        
        if avg_accuracy >= 85:
            return "accelerated"
        elif avg_accuracy >= 70:
            return "normal"
        else:
            return "moderate"
    
    def _update_strengths_weaknesses(self, user_id: str):
        """Update strengths and weaknesses based on performance"""
        sessions = self.user_sessions.get(user_id, [])
        mistakes = self.user_mistakes.get(user_id, [])
        
        # Group by subject
        subject_performance = defaultdict(list)
        for session in sessions:
            subject = session.get("subject", "General")
            subject_performance[subject].append(session.get("accuracy", 0))
        
        # Calculate average performance per subject
        subject_avg = {}
        for subject, accuracies in subject_performance.items():
            subject_avg[subject] = sum(accuracies) / len(accuracies)
        
        # Determine strengths (high performance) and weaknesses (low performance)
        profile = self.user_profiles[user_id]
        profile["strengths"] = [
            {"subject": subj, "score": int(avg), "trend": "up"}
            for subj, avg in sorted(subject_avg.items(), key=lambda x: x[1], reverse=True)
            if avg >= 75
        ]
        
        profile["weaknesses"] = [
            {"subject": subj, "score": int(avg), "trend": "down"}
            for subj, avg in sorted(subject_avg.items(), key=lambda x: x[1])
            if avg < 70
        ]
    
    def _calculate_knowledge_score(self, user_id: str) -> int:
        """Calculate overall knowledge score"""
        profile = self.user_profiles.get(user_id, {})
        skill_progress = profile.get("skillProgress", {})
        
        # Weighted score based on sessions, time, and accuracy
        total_sessions = skill_progress.get("totalSessions", 0)
        avg_accuracy = skill_progress.get("averageAccuracy", 0)
        total_time = skill_progress.get("totalTime", 0)
        
        # Base score from accuracy
        base_score = avg_accuracy
        
        # Bonus for consistent practice
        consistency_bonus = min(20, total_sessions * 0.5)
        
        # Bonus for study time
        time_bonus = min(10, total_time / 60)  # 10 points max for 10+ hours
        
        total_score = min(100, base_score + consistency_bonus + time_bonus)
        return int(total_score)
