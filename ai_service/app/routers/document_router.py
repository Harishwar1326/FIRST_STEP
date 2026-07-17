from fastapi import APIRouter, UploadFile, File, HTTPException
from app.pipelines.document_pipeline import DocumentPipeline
from app.core.config import settings
import logging

logger = logging.getLogger("ai_service")

router = APIRouter(prefix="/pipeline/document", tags=["Document Processing"])
document_pipeline = DocumentPipeline()

@router.post("/process")
async def process_document(file: UploadFile = File(...)):
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
        result = await document_pipeline.process(file)
        return {
            "status": "success",
            "noteId": result["noteId"],
            "content": result["content"],
            "summary": result["summary"],
            "keywords": result["keywords"],
            "concepts": result["concepts"],
            "relationships": result["relationships"],
            "difficulty": result["difficulty"],
            "estimatedStudyTime": result["estimatedStudyTime"]
        }
    except Exception as e:
        logger.error(f"Document processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
