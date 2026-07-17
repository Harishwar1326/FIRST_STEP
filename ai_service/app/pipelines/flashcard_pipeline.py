import spacy
from keybert import KeyBERT
from sentence_transformers import SentenceTransformer
import logging
from typing import Dict, List

logger = logging.getLogger("ai_service")

class FlashcardPipeline:
    def __init__(self):
        self.nlp = spacy.load("en_core_web_sm")
        self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.keybert = KeyBERT(model=self.sentence_model)
    
    async def generate(self, note_id: str, content: str, concepts: List[str]) -> List[Dict]:
        """
        Generate flashcards from content
        """
        try:
            flashcards = []
            
            # Generate concept-based flashcards
            concept_cards = self._generate_concept_flashcards(concepts, content)
            flashcards.extend(concept_cards)
            
            # Generate definition flashcards
            definition_cards = self._generate_definition_flashcards(content)
            flashcards.extend(definition_cards)
            
            # Generate question-answer pairs
            qa_cards = self._generate_qa_flashcards(content)
            flashcards.extend(qa_cards)
            
            # Assign difficulty levels
            for card in flashcards:
                card['difficulty'] = self._estimate_difficulty(card['back'])
            
            return flashcards[:20]  # Limit to 20 flashcards
            
        except Exception as e:
            logger.error(f"Flashcard generation error: {str(e)}")
            raise
    
    def _generate_concept_flashcards(self, concepts: List[str], content: str) -> List[Dict]:
        """Generate flashcards for key concepts"""
        cards = []
        for concept in concepts[:5]:  # Top 5 concepts
            # Find definition in content
            definition = self._find_definition(concept, content)
            if definition:
                cards.append({
                    "front": f"What is {concept}?",
                    "back": definition
                })
        return cards
    
    def _generate_definition_flashcards(self, content: str) -> List[Dict]:
        """Generate definition flashcards from keywords"""
        cards = []
        keywords = self.keybert.extract_keywords(content, keyphrase_ngram_range=(1, 2), top_k=5)
        
        for keyword, score in keywords:
            definition = self._find_definition(keyword, content)
            if definition:
                cards.append({
                    "front": f"Define: {keyword}",
                    "back": definition
                })
        return cards
    
    def _generate_qa_flashcards(self, content: str) -> List[Dict]:
        """Generate question-answer pairs"""
        cards = []
        sentences = content.split('.')
        
        # Convert declarative sentences to questions
        for sentence in sentences[:5]:
            sentence = sentence.strip()
            if len(sentence) > 20 and len(sentence) < 100:
                question = self._sentence_to_question(sentence)
                if question:
                    cards.append({
                        "front": question,
                        "back": sentence
                    })
        return cards
    
    def _find_definition(self, term: str, content: str) -> str:
        """Find definition of a term in content"""
        # Simple pattern matching for definitions
        patterns = [
            f"{term} is",
            f"{term} refers to",
            f"{term} means",
            f"{term} can be defined as"
        ]
        
        for pattern in patterns:
            if pattern in content.lower():
                idx = content.lower().find(pattern)
                definition = content[idx + len(pattern):idx + len(pattern) + 100]
                return definition.strip()
        
        return f"{term} - Key concept from the material"
    
    def _sentence_to_question(self, sentence: str) -> str:
        """Convert declarative sentence to question"""
        doc = self.nlp(sentence)
        
        # Simple transformation: find main verb and create question
        for token in doc:
            if token.pos_ == "VERB" and token.dep_ == "ROOT":
                return f"What {token.text}...?"
        
        return None
    
    def _estimate_difficulty(self, answer: str) -> str:
        """Estimate flashcard difficulty"""
        word_count = len(answer.split())
        
        if word_count < 10:
            return "easy"
        elif word_count < 20:
            return "medium"
        else:
            return "hard"
