from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.pipelines.document_pipeline import DocumentPipeline
from app.core.config import settings
import logging

logger = logging.getLogger("ai_service")

router = APIRouter(prefix="/pipeline/document", tags=["Document Processing"])
document_pipeline = DocumentPipeline()

@router.post("/process")
async def process_document(file: UploadFile = File(...), noteId: str | None = Form(default=None)):
    """
    Process uploaded document through the AI pipeline:
    - OCR
    - Cleaning
    - Chunking
    - Embeddings
    - Topic Extraction
    - Keyword Extraction
    - NER
    - Summary Generation
    """
    try:
        result = await document_pipeline.process(file, note_id=noteId)
        return {
            "status": "success",
            "noteId": result["noteId"],
            "content": result["content"],
            "summary": result["summary"],
            "keywords": result["keywords"],
            "concepts": result["concepts"],
            "relationships": result["relationships"],
            "difficulty": result["difficulty"],
            "estimatedStudyTime": result["estimatedStudyTime"],
            "revisionNotes": result.get("revisionNotes", ""),
            "chapterNotes": result.get("chapterNotes", ""),
            "keyConcepts": result.get("keyConcepts", []),
            "glossary": result.get("glossary", []),
            "definitions": result.get("definitions", []),
            "formulaSheet": result.get("formulaSheet", []),
            "quickRevisionSheet": result.get("quickRevisionSheet", ""),
            "flashcards": result.get("flashcards", []),
            "mindMap": result.get("mindMap", {"nodes": [], "edges": []}),
            "questions": result.get("questions", []),
            "learningQuiz": result.get("learningQuiz", []),
            "gapFill": result.get("gapFill", []),
            "gaps": result.get("gaps", []),
            "learningPack": result.get("learningPack", {}),
            "aiProvider": result.get("aiProvider", "local-nlp"),
            "processingWarning": result.get("processingWarning", "")
        }
    except Exception as e:
        logger.error(f"Document processing failed: {str(e)}")
        if isinstance(e, ValueError):
            raise HTTPException(status_code=422, detail=str(e))
        raise HTTPException(status_code=500, detail="Document processing failed")
