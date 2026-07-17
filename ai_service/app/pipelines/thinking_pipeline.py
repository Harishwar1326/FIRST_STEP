import logging
from typing import Dict, List
import random
from datetime import datetime, timedelta
from collections import defaultdict

logger = logging.getLogger("ai_service")

class ThinkingPipeline:
    def __init__(self):
        self.challenge_types = ["case-study", "scenario", "logic-puzzle", "design-thinking", "reflection"]
        self.bloom_levels = ["remember", "understand", "apply", "analyze", "evaluate", "create"]
        # In-memory storage for demo (in production, use database)
        self.user_challenges = {}
        self.user_submissions = defaultdict(list)
        self.user_skills = {}
    
    async def generate_challenge(self, user_id: str) -> Dict:
        """
        Generate daily critical thinking challenge
        """
        try:
            # Check if user already has a challenge for today
            today = datetime.now().date()
            
            if user_id in self.user_challenges:
                last_challenge = self.user_challenges[user_id]
                challenge_date = datetime.fromisoformat(last_challenge.get("createdAt", "")).date()
                
                if challenge_date == today:
                    # Return existing challenge
                    return last_challenge
            
            # Generate new challenge
            challenge_type = random.choice(self.challenge_types)
            bloom_level = random.choice(self.bloom_levels[3:])  # Higher-order thinking
            
            challenge = self._create_challenge(challenge_type, bloom_level)
            challenge["userId"] = user_id
            challenge["createdAt"] = datetime.now().isoformat()
            
            self.user_challenges[user_id] = challenge
            return challenge
        except Exception as e:
            logger.error(f"Challenge generation error: {str(e)}")
            raise
    
    def _create_challenge(self, challenge_type: str, bloom_level: str) -> Dict:
        """Create a challenge based on type and Bloom level"""
        challenges = {
            "case-study": {
                "case-study": {
                    "type": "case-study",
                    "title": "The Solar Village Problem",
                    "description": "A rural village needs sustainable energy. Design a solution considering limited resources, maintenance challenges, and local conditions.",
                    "bloomLevel": bloom_level,
                    "timeLimit": "30 min",
                    "difficulty": "medium",
                    "points": 100,
                    "expectedAnswer": "A comprehensive solution considering solar panels, community involvement, maintenance training, and cost-effectiveness."
                },
                "scenario": {
                    "type": "scenario",
                    "title": "Water Purification Challenge",
                    "description": "Design a low-cost water purification system for a remote village using locally available materials.",
                    "bloomLevel": bloom_level,
                    "timeLimit": "25 min",
                    "difficulty": "hard",
                    "points": 150,
                    "expectedAnswer": "Solution involving sand filtration, charcoal treatment, and community education."
                },
                "logic-puzzle": {
                    "type": "logic-puzzle",
                    "title": "Resource Allocation Puzzle",
                    "description": "You have limited resources to solve multiple community problems. How would you prioritize and allocate them optimally?",
                    "bloomLevel": bloom_level,
                    "timeLimit": "20 min",
                    "difficulty": "medium",
                    "points": 80,
                    "expectedAnswer": "Logical framework for prioritization based on impact, urgency, and feasibility."
                },
                "design-thinking": {
                    "type": "design-thinking",
                    "title": "Sustainable Agriculture Design",
                    "description": "Design a sustainable agricultural system for a small community that maximizes yield while minimizing environmental impact.",
                    "bloomLevel": bloom_level,
                    "timeLimit": "35 min",
                    "difficulty": "hard",
                    "points": 120,
                    "expectedAnswer": "Solution incorporating crop rotation, water conservation, organic methods, and community participation."
                },
                "reflection": {
                    "type": "reflection",
                    "title": "Learning Journey Reflection",
                    "description": "Reflect on your learning journey and identify key insights, challenges overcome, and areas for growth.",
                    "bloomLevel": bloom_level,
                    "timeLimit": "20 min",
                    "difficulty": "easy",
                    "points": 50,
                    "expectedAnswer": "Thoughtful reflection on personal learning experiences and growth."
                }
            }
        }
        return challenges.get(challenge_type, challenges["case-study"])[challenge_type]
    
    async def evaluate_answer(self, challenge_id: str, answer: str, expected_answer: str) -> Dict:
        """
        Evaluate thinking challenge answer using AI
        """
        try:
            # In production, use LLM for detailed evaluation
            # Placeholder evaluation based on multiple factors
            
            # Analyze answer length and depth
            answer_length = len(answer.split())
            expected_length = len(expected_answer.split())
            
            # Length score (0-40 points)
            length_score = min(40, int((answer_length / max(expected_length, 50)) * 40))
            
            # Structure score (0-30 points) - based on paragraphs
            paragraphs = answer.split('\n')
            structure_score = min(30, len(paragraphs) * 10)
            
            # Content score (0-30 points) - keyword matching
            keywords = expected_answer.lower().split()
            answer_lower = answer.lower()
            keyword_matches = sum(1 for kw in keywords if kw in answer_lower)
            content_score = min(30, int((keyword_matches / max(len(keywords), 1)) * 30))
            
            # Total score
            total_score = length_score + structure_score + content_score
            
            # Generate detailed feedback
            feedback = self._generate_feedback(total_score, answer_length, structure_score)
            
            # Update thinking skills
            skills = self._update_thinking_skills(total_score)
            
            return {
                "score": total_score,
                "feedback": feedback,
                "reasoning": "Based on answer length, structure, and content relevance",
                "skills": skills,
                "breakdown": {
                    "lengthScore": length_score,
                    "structureScore": structure_score,
                    "contentScore": content_score
                }
            }
        except Exception as e:
            logger.error(f"Answer evaluation error: {str(e)}")
            raise
    
    def _generate_feedback(self, score: int, answer_length: int, structure_score: int) -> str:
        """Generate personalized feedback based on score"""
        if score >= 80:
            return "Excellent work! Your answer demonstrates deep understanding and critical thinking. Consider exploring more complex scenarios."
        elif score >= 60:
            return "Good effort! Your answer shows solid reasoning. Try to provide more specific examples and deeper analysis."
        elif score >= 40:
            return "Fair attempt. Focus on structuring your answer more clearly and providing more detailed explanations."
        else:
            return "Keep practicing! Try to expand your answer with more details, better structure, and deeper reasoning."
    
    def _update_thinking_skills(self, score: int) -> Dict:
        """Update thinking skills based on performance"""
        # In production, this would update user's skill profile
        skill_improvement = score / 20  # 0-5 improvement based on score
        
        return {
            "criticalThinking": min(5, random.randint(1, 3) + skill_improvement),
            "problemSolving": min(5, random.randint(1, 3) + skill_improvement),
            "creativity": min(5, random.randint(1, 3) + skill_improvement),
            "logicalReasoning": min(5, random.randint(1, 3) + skill_improvement),
            "overallScore": score,
            "trends": {
                "criticalThinking": f"+{random.randint(1, 5)}%",
                "problemSolving": f"+{random.randint(1, 5)}%",
                "creativity": f"+{random.randint(1, 5)}%",
                "logicalReasoning": f"+{random.randint(1, 5)}%"
            }
        }
    
    async def get_history(self, user_id: str) -> Dict:
        """Get user's challenge history and thinking skills"""
        try:
            submissions = self.user_submissions.get(user_id, [])
            
            # Calculate statistics
            if submissions:
                avg_score = sum(s.get("score", 0) for s in submissions) / len(submissions)
                total_points = sum(s.get("points", 0) for s in submissions)
                completed_challenges = len(submissions)
            else:
                avg_score = 0
                total_points = 0
                completed_challenges = 0
            
            # Get current skills
            skills = self.user_skills.get(user_id, {
                "criticalThinking": 3,
                "problemSolving": 3,
                "creativity": 3,
                "logicalReasoning": 3,
                "overallScore": 0,
                "trends": {
                    "criticalThinking": "0%",
                    "problemSolving": "0%",
                    "creativity": "0%",
                    "logicalReasoning": "0%"
                }
            })
            
            return {
                "submissions": submissions[-10:],  # Last 10 submissions
                "statistics": {
                    "averageScore": round(avg_score, 1),
                    "totalPoints": total_points,
                    "completedChallenges": completed_challenges,
                    "streak": self._calculate_streak(submissions)
                },
                "skills": skills
            }
        except Exception as e:
            logger.error(f"Get history error: {str(e)}")
            raise
    
    def _calculate_streak(self, submissions: List[Dict]) -> int:
        """Calculate current streak of completed challenges"""
        if not submissions:
            return 0
        
        today = datetime.now().date()
        streak = 0
        
        # Check consecutive days
        for i in range(len(submissions)):
            submission_date = datetime.fromisoformat(submissions[-(i+1)].get("timestamp", "")).date()
            days_ago = (today - submission_date).days
            
            if days_ago == i:
                streak += 1
            else:
                break
        
        return streak
    
    async def get_score(self, user_id: str) -> Dict:
        """Get user's current thinking score and ranking"""
        try:
            skills = self.user_skills.get(user_id, {
                "criticalThinking": 3,
                "problemSolving": 3,
                "creativity": 3,
                "logicalReasoning": 3,
                "overallScore": 0,
                "trends": {
                    "criticalThinking": "0%",
                    "problemSolving": "0%",
                    "creativity": "0%",
                    "logicalReasoning": "0%"
                }
            })
            
            # Calculate percentile (in production, would compare with all users)
            percentile = min(99, int(skills["overallScore"] * 0.99))
            
            return {
                "overallScore": skills["overallScore"],
                "percentile": percentile,
                "skills": skills,
                "level": self._get_level(skills["overallScore"])
            }
        except Exception as e:
            logger.error(f"Get score error: {str(e)}")
            raise
    
    def _get_level(self, score: int) -> str:
        """Get thinking level based on score"""
        if score >= 90:
            return "Expert"
        elif score >= 75:
            return "Advanced"
        elif score >= 60:
            return "Intermediate"
        elif score >= 40:
            return "Beginner"
        else:
            return "Novice"
