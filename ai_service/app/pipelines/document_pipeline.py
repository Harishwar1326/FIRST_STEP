import spacy
from sentence_transformers import SentenceTransformer
from keybert import KeyBERT
import chromadb
from app.core.config import settings
from app.core.ollama_client import generate_ollama_text
from app.utils.file_helpers import FileProcessor
import logging
import base64
import io
import json
import re
import asyncio
from typing import Dict, List, Optional
try:
    from google import genai
    from google.genai import types as genai_types
except ImportError:
    genai = None
    genai_types = None

logger = logging.getLogger("ai_service")

class DocumentPipeline:
    def __init__(self):
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except Exception as exc:
            logger.warning("spaCy model unavailable; using blank English tokenizer: %s", exc)
            self.nlp = spacy.blank("en")
        # Do not download large embedding models during API startup. Document
        # extraction and Gemini study-pack generation work without embeddings.
        self.sentence_model = None
        self.keybert = None
        self.chroma_client = self._create_chroma_client()
        self.file_processor = FileProcessor()
        self.gemini_client = None
        self.gemini_enabled = bool(genai is not None and settings.GEMINI_API_KEY)
        if self.gemini_enabled:
            try:
                self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
            except Exception:
                logger.exception("Could not configure Gemini for document processing")
                self.gemini_enabled = False

    def _create_chroma_client(self):
        """Use Chroma Cloud in production and local Chroma during development."""
        if all((settings.CHROMA_API_KEY, settings.CHROMA_TENANT, settings.CHROMA_DATABASE)):
            try:
                return chromadb.CloudClient(
                    api_key=settings.CHROMA_API_KEY,
                    tenant=settings.CHROMA_TENANT,
                    database=settings.CHROMA_DATABASE,
                )
            except Exception as exc:
                logger.warning("Chroma Cloud is unavailable; vector indexing is disabled: %s", exc)
                return None
        try:
            return chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)
        except Exception as exc:
            logger.warning("ChromaDB is unavailable; document processing will continue without vector indexing: %s", exc)
            return None
        
    async def process(self, file, note_id: Optional[str] = None) -> Dict:
        """
        Process document through the complete AI pipeline
        """
        try:
            # Read file content
            content = await self._read_file(file)
            
            # Clean and preprocess
            cleaned_content = self._clean_text(content)
            if not cleaned_content:
                raise ValueError("No readable text was found in the uploaded document")
            
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
            
            # Index the extracted source under its database note ID. Gemini uses
            # overlapping, larger chunks below for study-material generation.
            document_id = str(note_id or file.filename or "document")
            await self._store_embeddings(document_id, cleaned_content)
            
            # Estimate difficulty
            difficulty = self._estimate_difficulty(cleaned_content, concepts)
            
            # Estimate study time
            study_time = self._estimate_study_time(len(cleaned_content), difficulty)

            study_pack = await self._generate_study_pack(cleaned_content)
            
            return {
                "noteId": document_id,
                "content": cleaned_content,
                "summary": study_pack.get("summary") or summary,
                "keywords": keywords,
                "concepts": concepts,
                "relationships": relationships,
                "difficulty": difficulty,
                "estimatedStudyTime": study_time,
                **study_pack,
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
        """Extract keywords with KeyBERT when available, otherwise by frequency."""
        if self.keybert is not None:
            keywords = self.keybert.extract_keywords(text, keyphrase_ngram_range=(1, 2), stop_words='english', top_k=top_k)
            return [keyword[0] for keyword in keywords]
        stop_words = {
            "about", "after", "again", "also", "because", "before", "being", "between",
            "could", "every", "from", "have", "into", "more", "other", "should", "than",
            "their", "there", "these", "this", "through", "were", "when", "where", "which",
            "with", "would", "your", "that", "then", "they", "them", "what", "when",
        }
        counts = {}
        for word in re.findall(r"[A-Za-z][A-Za-z-]{3,}", text.lower()):
            if word not in stop_words:
                counts[word] = counts.get(word, 0) + 1
        ranked = sorted(counts.items(), key=lambda item: (-item[1], item[0]))[:top_k]
        return [word.title() for word, _ in ranked]
    
    def _extract_concepts(self, doc) -> List[str]:
        """Extract concepts using Named Entity Recognition"""
        concepts = []
        for ent in doc.ents:
            if ent.label_ in ['ORG', 'PERSON', 'GPE', 'PRODUCT', 'EVENT', 'WORK_OF_ART']:
                concepts.append(ent.text)
        return list(dict.fromkeys(concepts)) or self._extract_keywords(doc.text, top_k=10)
    
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
    
    def _chunk_text(self, text: str, chunk_size: int = 512) -> List[str]:
        """Chunk text for embedding"""
        words = text.split()
        chunks = []
        for i in range(0, len(words), chunk_size):
            chunk = ' '.join(words[i:i+chunk_size])
            chunks.append(chunk)
        return chunks

    async def _generate_study_pack(self, content: str) -> Dict:
        """Use bounded overlapping source chunks to generate persistable study assets."""
        source_chunks = self._chunk_for_generation(content)
        # Four small chunks per request provide context while keeping each request
        # bounded. Reject exceptionally large extractions instead of silently
        # pretending that the full document was analyzed.
        if len(source_chunks) > 48:
            raise ValueError("This document contains too much extracted text for one study pack. Split it into smaller documents and upload again.")

        chunk_results = []
        providers = set()
        gemini_available = self.gemini_enabled
        batches = [source_chunks[index:index + 4] for index in range(0, len(source_chunks), 4)]
        for batch_index, batch in enumerate(batches):
            prompt = self._study_pack_prompt(batch, batch_index)
            if gemini_available:
                try:
                    response = await asyncio.to_thread(
                        self.gemini_client.models.generate_content,
                        model=settings.GEMINI_MODEL,
                        contents=prompt,
                        config=genai_types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.2,
                            max_output_tokens=4096,
                        ),
                    )
                    chunk_results.append(self._parse_json_response(response.text))
                    providers.add("gemini")
                    continue
                except Exception:
                    logger.exception("Gemini document generation failed for chunk batch %s; trying Ollama", batch_index + 1)
                    gemini_available = False

            try:
                raw = await asyncio.to_thread(
                    generate_ollama_text,
                    prompt,
                    system_prompt="Generate source-grounded study materials and return valid JSON only.",
                    json_output=True,
                    max_tokens=4096,
                    temperature=0.2,
                )
                chunk_results.append(self._parse_json_response(raw))
                providers.add("ollama")
            except Exception:
                logger.exception("Local Ollama document generation failed for chunk batch %s", batch_index + 1)
                return self._local_study_pack(
                    content,
                    "Remote AI and the configured local Ollama model were unavailable; this study pack uses local text extraction.",
                )

        return self._merge_study_pack(chunk_results, len(source_chunks), providers)

    def _local_study_pack(self, content: str, warning: str) -> Dict:
        concepts = self._extract_keywords(content, top_k=10)
        sentences = [sentence.strip() for sentence in re.split(r"(?<=[.!?])\s+|\n+", content) if len(sentence.strip()) >= 35]
        flashcards = [
            {"front": f"What does this material say about {concept}?", "back": sentence, "difficulty": "medium"}
            for concept, sentence in zip(concepts[:8], sentences[:8])
        ]
        questions = [
            {"question": f"Explain this key point about {concept} in your own words.", "answer": sentence, "bloomLevel": "understand", "difficulty": "medium"}
            for concept, sentence in zip(concepts[:8], sentences[:8])
        ]
        nodes = [{"id": f"concept-{index}", "label": concept} for index, concept in enumerate(concepts[:10])]
        edges = [{"source": nodes[0]["id"], "target": node["id"], "label": "related topic"} for node in nodes[1:]] if nodes else []
        summary = self._generate_summary(content)
        return {
            "summary": summary,
            "aiProvider": "local-nlp",
            "processingWarning": warning,
            "revisionNotes": summary,
            "chapterNotes": summary,
            "keyConcepts": concepts,
            "glossary": [],
            "definitions": [],
            "formulaSheet": [],
            "quickRevisionSheet": summary,
            "flashcards": flashcards,
            "mindMap": {"nodes": nodes, "edges": edges},
            "questions": questions,
            "learningQuiz": [],
            "gapFill": [],
            "gaps": [],
            "learningPack": {"chunksProcessed": 0, "source": "local-nlp"},
        }

    @staticmethod
    def _chunk_for_generation(text: str, max_chars: int = 5000, overlap: int = 400) -> List[str]:
        text = str(text or "").strip()
        if not text:
            return []
        chunks = []
        start = 0
        while start < len(text):
            end = min(len(text), start + max_chars)
            if end < len(text):
                boundary = max(text.rfind("\n", start, end), text.rfind(". ", start, end), text.rfind(" ", start, end))
                if boundary > start + max_chars // 2:
                    end = boundary + 1
            chunks.append(text[start:end].strip())
            if end >= len(text):
                break
            start = max(start + 1, end - overlap)
        return chunks

    @staticmethod
    def _study_pack_prompt(chunks: List[str], batch_index: int) -> str:
        labeled = "\n\n".join(f"[DOCUMENT CHUNK {index + 1}]\n{chunk}" for index, chunk in enumerate(chunks))
        return (
            "You are a careful study-material assistant. Use only the supplied source chunks. "
            "Do not invent facts, definitions, answers, or formulas. If evidence is missing, omit the item. "
            "The 'gaps' field means topics that the source document itself leaves unclear or unsupported; "
            "it does not describe a student's personal knowledge gaps. Return valid JSON only, with this shape: "
            '{"summary":"...","chapterNotes":"...","revisionNotes":"...","quickRevisionSheet":"...",'
            '"keyConcepts":["..."],"glossary":[{"term":"...","definition":"..."}],'
            '"definitions":["..."],"formulaSheet":["..."],'
            '"flashcards":[{"front":"...","back":"...","difficulty":"easy|medium|hard"}],'
            '"questions":[{"question":"...","answer":"...","bloomLevel":"remember|understand|apply|analyze|evaluate|create","difficulty":"easy|medium|hard"}],'
            '"learningQuiz":[{"question":"...","options":["..."],"correctIndex":0,"explanation":"...","concept":"..."}],'
            '"gapFill":[{"prompt":"... ____ ...","answer":"...","explanation":"...","concept":"..."}],'
            '"mindMap":{"nodes":[{"id":"...","label":"..."}],"edges":[{"source":"...","target":"...","label":"..."}]},'
            '"gaps":[{"concept":"...","reason":"...","evidence":"...","severity":"low|medium|high","recommendedAction":"..."}]}\n'
            f"This is chunk batch {batch_index + 1}. Produce a compact, useful set: at most 6 flashcards, "
            "5 practice questions, 4 multiple-choice questions, 4 fill-in-the-blank prompts, 8 concepts, and 4 potential source gaps. "
            "Use concise answers directly supported by the text.\n\n"
            f"SOURCE CHUNKS:\n{labeled}"
        )

    @staticmethod
    def _parse_json_response(raw: str) -> Dict:
        text = str(raw or "").strip()
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.IGNORECASE)
        start, end = text.find("{"), text.rfind("}")
        if start < 0 or end <= start:
            raise ValueError("Gemini returned an invalid study-pack response. Please retry processing this note.")
        data = json.loads(text[start:end + 1])
        if not isinstance(data, dict):
            raise ValueError("Gemini returned an invalid study-pack response. Please retry processing this note.")
        return data

    def _merge_study_pack(self, packs: List[Dict], chunk_count: int, providers=None) -> Dict:
        providers = set(providers or {"gemini"})
        provider_label = "+".join(sorted(providers))
        def unique(field: str, limit: int = 40) -> List:
            values = []
            seen = set()
            for pack in packs:
                for value in pack.get(field, []) if isinstance(pack.get(field), list) else []:
                    key = json.dumps(value, sort_keys=True, ensure_ascii=False) if isinstance(value, (dict, list)) else str(value).strip().casefold()
                    if key and key not in seen:
                        seen.add(key)
                        values.append(value)
                    if len(values) >= limit:
                        return values
            return values

        notes = [str(pack.get("chapterNotes") or pack.get("summary") or "").strip() for pack in packs]
        summaries = [str(pack.get("summary") or "").strip() for pack in packs]
        revisions = [str(pack.get("revisionNotes") or "").strip() for pack in packs]
        quick = [str(pack.get("quickRevisionSheet") or "").strip() for pack in packs]
        nodes = []
        edges = []
        for pack in packs:
            mind_map = pack.get("mindMap") if isinstance(pack.get("mindMap"), dict) else {}
            nodes.extend(mind_map.get("nodes", []))
            edges.extend(mind_map.get("edges", []))
        def dedupe_objects(items: List[Dict], key: str, limit: int) -> List[Dict]:
            result = []
            seen = set()
            for item in items:
                if not isinstance(item, dict):
                    continue
                value = str(item.get(key) or "").strip()
                normalized = value.casefold()
                if not normalized or normalized in seen:
                    continue
                seen.add(normalized)
                result.append(item)
                if len(result) >= limit:
                    break
            return result

        glossary = dedupe_objects(unique("glossary", 60), "term", 60)
        nodes = dedupe_objects(nodes, "label", 100)
        mind_map = {"nodes": nodes[:100], "edges": edges[:160]}
        return {
            "aiProvider": provider_label,
            "processingWarning": "Local Ollama generated some or all study-pack chunks." if "ollama" in providers else "",
            "summary": " ".join(value for value in summaries if value),
            "revisionNotes": "\n\n".join(value for value in revisions if value),
            "chapterNotes": "\n\n".join(value for value in notes if value),
            "keyConcepts": unique("keyConcepts", 40),
            "glossary": glossary,
            "definitions": unique("definitions", 50),
            "formulaSheet": unique("formulaSheet", 50),
            "quickRevisionSheet": "\n\n".join(value for value in quick if value),
            "flashcards": unique("flashcards", 60),
            "mindMap": mind_map,
            "questions": unique("questions", 60),
            "learningQuiz": unique("learningQuiz", 48),
            "gapFill": unique("gapFill", 48),
            "gaps": unique("gaps", 40),
            "learningPack": {"chunksProcessed": chunk_count, "batchesProcessed": len(packs), "source": f"{provider_label}-grounded-chunks"},
        }
    
    async def _store_embeddings(self, doc_id: str, content: str):
        """Store embeddings in ChromaDB"""
        if self.sentence_model is None:
            logger.info("Embedding model unavailable; skipping vector indexing for note %s", doc_id)
            return
        try:
            collection = self.chroma_client.get_or_create_collection(name=settings.CHROMA_COLLECTION)
            chunks = self._chunk_text(content, chunk_size=512)
            chunk_embeddings = self.sentence_model.encode(chunks).tolist()
            collection.upsert(
                documents=chunks,
                embeddings=chunk_embeddings,
                ids=[f"{doc_id}-{index}" for index in range(len(chunks))],
                metadatas=[{"documentId": doc_id, "chunkIndex": index} for index in range(len(chunks))],
            )
        except Exception as e:
            logger.error(f"ChromaDB storage error: {str(e)}")

    def retrieve(self, question: str, document_id: Optional[str] = None, limit: int = 5) -> List[Dict]:
        """Retrieve the most relevant PDF chunks for a question."""
        if self.sentence_model is None:
            return []
        try:
            collection = self.chroma_client.get_or_create_collection(name=settings.CHROMA_COLLECTION)
            where = {"documentId": document_id} if document_id else None
            query_embedding = self.sentence_model.encode([question])[0].tolist()
            result = collection.query(
                query_embeddings=[query_embedding],
                n_results=max(1, min(limit, 10)),
                where=where,
            )
            documents = (result.get("documents") or [[]])[0]
            metadatas = (result.get("metadatas") or [[]])[0]
            distances = (result.get("distances") or [[]])[0]
            return [
                {"document": document, "metadata": metadata or {}, "distance": distance}
                for document, metadata, distance in zip(documents, metadatas, distances)
            ]
        except Exception as e:
            logger.warning(f"Chroma retrieval unavailable: {str(e)}")
            return []
    
    def _estimate_difficulty(self, text: str, concepts: List[str]) -> int:
        """Estimate content difficulty (1-10)"""
        # Simple heuristic based on vocabulary complexity
        words = text.split()
        if not words:
            return 1
        avg_word_length = sum(len(word) for word in words) / len(words)
        concept_complexity = len(concepts)
        
        difficulty = min(10, int((avg_word_length - 4) * 2 + concept_complexity / 2))
        return max(1, difficulty)
    
    def _estimate_study_time(self, text_length: int, difficulty: int) -> int:
        """Estimate study time in minutes"""
        # Base: 1 minute per 100 words, adjusted by difficulty
        base_time = text_length / 100
        difficulty_multiplier = 1 + (difficulty - 5) * 0.2
        return int(base_time * difficulty_multiplier)
