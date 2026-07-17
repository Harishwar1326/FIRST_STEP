import spacy
from typing import Dict, List
import logging

logger = logging.getLogger("ai_service")

class QuestionPipeline:
    def __init__(self):
        self.nlp = spacy.load("en_core_web_sm")
    
    # Bloom's Taxonomy levels
    BLOOM_LEVELS = {
        "remember": "Recall facts and basic concepts",
        "understand": "Explain ideas or concepts",
        "apply": "Use information in new situations",
        "analyze": "Draw connections among ideas",
        "evaluate": "Justify a stand or decision",
        "create": "Produce new or original work"
    }
    
    async def generate(self, note_id: str, content: str, bloom_level: str = "all") -> List[Dict]:
        """
        Generate questions based on Bloom's Taxonomy
        """
        try:
            questions = []
            
            if bloom_level == "all":
                levels = list(self.BLOOM_LEVELS.keys())
            else:
                levels = [bloom_level]
            
            for level in levels:
                level_questions = self._generate_questions_for_level(content, level)
                questions.extend(level_questions)
            
            return questions
            
        except Exception as e:
            logger.error(f"Question generation error: {str(e)}")
            raise
    
    def _generate_questions_for_level(self, content: str, level: str) -> List[Dict]:
        """Generate questions for specific Bloom level"""
        questions = []
        sentences = content.split('.')
        
        if level == "remember":
            questions = self._generate_remember_questions(sentences)
        elif level == "understand":
            questions = self._generate_understand_questions(sentences)
        elif level == "apply":
            questions = self._generate_apply_questions(sentences)
        elif level == "analyze":
            questions = self._generate_analyze_questions(sentences)
        elif level == "evaluate":
            questions = self._generate_evaluate_questions(sentences)
        elif level == "create":
            questions = self._generate_create_questions(sentences)
        
        return questions[:3]  # 3 questions per level
    
    def _generate_remember_questions(self, sentences: List[str]) -> List[Dict]:
        """Generate recall questions"""
        questions = []
        for sentence in sentences[:3]:
            if len(sentence) > 20:
                doc = self.nlp(sentence)
                entities = [ent.text for ent in doc.ents]
                if entities:
                    questions.append({
                        "question": f"What is {entities[0]}?",
                        "answer": sentence,
                        "bloomLevel": "remember",
                        "difficulty": "easy"
                    })
        return questions
    
    def _generate_understand_questions(self, sentences: List[str]) -> List[Dict]:
        """Generate understanding questions"""
        questions = []
        for sentence in sentences[:3]:
            if len(sentence) > 30:
                questions.append({
                    "question": f"Explain the meaning of: {sentence[:50]}...",
                    "answer": sentence,
                    "bloomLevel": "understand",
                    "difficulty": "easy"
                })
        return questions
    
    def _generate_apply_questions(self, sentences: List[str]) -> List[Dict]:
        """Generate application questions"""
        return [{
            "question": "How would you apply this concept in a real-world scenario?",
            "answer": "Application requires understanding the context and adapting the concept accordingly.",
            "bloomLevel": "apply",
            "difficulty": "medium"
        }]
    
    def _generate_analyze_questions(self, sentences: List[str]) -> List[Dict]:
        """Generate analysis questions"""
        return [{
            "question": "What are the key components and their relationships in this concept?",
            "answer": "Analysis involves breaking down the concept into its constituent parts and understanding how they interact.",
            "bloomLevel": "analyze",
            "difficulty": "medium"
        }]
    
    def _generate_evaluate_questions(self, sentences: List[str]) -> List[Dict]:
        """Generate evaluation questions"""
        return [{
            "question": "Critically evaluate the strengths and weaknesses of this approach.",
            "answer": "Evaluation requires assessing the merits and limitations based on evidence and criteria.",
            "bloomLevel": "evaluate",
            "difficulty": "hard"
        }]
    
    def _generate_create_questions(self, sentences: List[str]) -> List[Dict]:
        """Generate creative questions"""
        return [{
            "question": "Design a new solution or improvement based on these concepts.",
            "answer": "Creation involves synthesizing knowledge to produce something novel and valuable.",
            "bloomLevel": "create",
            "difficulty": "hard"
        }]
    
    def get_bloom_distribution(self, questions: List[Dict]) -> Dict[str, int]:
        """Get distribution of questions across Bloom levels"""
        distribution = {}
        for q in questions:
            level = q.get("bloomLevel", "unknown")
            distribution[level] = distribution.get(level, 0) + 1
        return distribution
