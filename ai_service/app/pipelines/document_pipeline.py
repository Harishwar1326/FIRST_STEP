import spacy
from sentence_transformers import SentenceTransformer
from keybert import KeyBERT
import chromadb
from app.core.config import settings
from app.utils.file_helpers import FileProcessor
import logging
import base64
import io
from typing import Dict, List

logger = logging.getLogger("ai_service")

class DocumentPipeline:
    def __init__(self):
        self.nlp = spacy.load("en_core_web_sm")
        self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.keybert = KeyBERT(model=self.sentence_model)
        self.chroma_client = chromadb.HttpClient(
            host=settings.CHROMA_HOST,
            port=settings.CHROMA_PORT
        )
        self.file_processor = FileProcessor()
        
    async def process(self, file) -> Dict:
        """
        Process document through the complete AI pipeline
        """
        try:
            # Read file content
            content = await self._read_file(file)
            
            # Clean and preprocess
            cleaned_content = self._clean_text(content)
            
            # Extract text using spaCy
            doc = self.nlp(cleaned_content)
            
            # Extract keywords using KeyBERT
            keywords = self._extract_keywords(cleaned_content)
            
            # Extract concepts using NER
            concepts = self._extract_concepts(doc)
            
            # Extract relationships
            relationships = self._extract_relationships(doc)
            
            # Generate summary
            summary = self._generate_summary(cleaned_content)
            
            # Generate embeddings
            embeddings = self._generate_embeddings(cleaned_content)
            
            # Store in ChromaDB
            await self._store_embeddings(file.filename or "document", embeddings, cleaned_content)
            
            # Estimate difficulty
            difficulty = self._estimate_difficulty(cleaned_content, concepts)
            
            # Estimate study time
            study_time = self._estimate_study_time(len(cleaned_content), difficulty)
            
            return {
                "noteId": file.filename or "doc",
                "content": cleaned_content,
                "summary": summary,
                "keywords": keywords,
                "concepts": concepts,
                "relationships": relationships,
                "difficulty": difficulty,
                "estimatedStudyTime": study_time
            }
            
        except Exception as e:
            logger.error(f"Document pipeline error: {str(e)}")
            raise
    
    async def _read_file(self, file) -> str:
        """Read file content based on type using FileProcessor"""
        content = await file.read()
        return await self.file_processor.process_file(content, file.content_type)
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        # Remove extra whitespace
        text = ' '.join(text.split())
        # Remove special characters (keep basic punctuation)
        text = ''.join(char if char.isalnum() or char in ' .,!?;:' else ' ' for char in text)
        return text.strip()
    
    def _extract_keywords(self, text: str, top_k: int = 10) -> List[str]:
        """Extract keywords using KeyBERT"""
        keywords = self.keybert.extract_keywords(text, keyphrase_ngram_range=(1, 2), stop_words='english', top_k=top_k)
        return [keyword[0] for keyword in keywords]
    
    def _extract_concepts(self, doc) -> List[str]:
        """Extract concepts using Named Entity Recognition"""
        concepts = []
        for ent in doc.ents:
            if ent.label_ in ['ORG', 'PERSON', 'GPE', 'PRODUCT', 'EVENT', 'WORK_OF_ART']:
                concepts.append(ent.text)
        return list(set(concepts))
    
    def _extract_relationships(self, doc) -> List[Dict]:
        """Extract concept relationships using dependency parsing"""
        relationships = []
        for token in doc:
            if token.dep_ in ['nsubj', 'dobj', 'pobj']:
                relationships.append({
                    "source": token.head.text,
                    "target": token.text,
                    "type": token.dep_
                })
        return relationships[:20]  # Limit to top 20
    
    def _generate_summary(self, text: str) -> str:
        """Generate extractive summary"""
        sentences = text.split('.')
        if len(sentences) <= 3:
            return text
        
        # Simple extractive summary: first and last sentences
        summary = sentences[0] + '. ' + sentences[-1]
        return summary.strip()
    
    def _generate_embeddings(self, text: str) -> List[float]:
        """Generate embeddings using Sentence Transformers"""
        chunks = self._chunk_text(text, chunk_size=512)
        embeddings = self.sentence_model.encode(chunks)
        return embeddings.tolist()
    
    def _chunk_text(self, text: str, chunk_size: int = 512) -> List[str]:
        """Chunk text for embedding"""
        words = text.split()
        chunks = []
        for i in range(0, len(words), chunk_size):
            chunk = ' '.join(words[i:i+chunk_size])
            chunks.append(chunk)
        return chunks
    
    async def _store_embeddings(self, doc_id: str, embeddings: List, content: str):
        """Store embeddings in ChromaDB"""
        try:
            collection = self.chroma_client.get_or_create_collection(name="documents")
            collection.add(
                documents=[content],
                embeddings=[embeddings[0] if embeddings else []],
                ids=[doc_id]
            )
        except Exception as e:
            logger.error(f"ChromaDB storage error: {str(e)}")
    
    def _estimate_difficulty(self, text: str, concepts: List[str]) -> int:
        """Estimate content difficulty (1-10)"""
        # Simple heuristic based on vocabulary complexity
        avg_word_length = sum(len(word) for word in text.split()) / len(text.split())
        concept_complexity = len(concepts)
        
        difficulty = min(10, int((avg_word_length - 4) * 2 + concept_complexity / 2))
        return max(1, difficulty)
    
    def _estimate_study_time(self, text_length: int, difficulty: int) -> int:
        """Estimate study time in minutes"""
        # Base: 1 minute per 100 words, adjusted by difficulty
        base_time = text_length / 100
        difficulty_multiplier = 1 + (difficulty - 5) * 0.2
        return int(base_time * difficulty_multiplier)
