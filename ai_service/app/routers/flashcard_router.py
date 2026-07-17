from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.pipelines.flashcard_pipeline import FlashcardPipeline
import logging

logger = logging.getLogger("ai_service")

router = APIRouter(prefix="/pipeline/flashcards", tags=["Flashcards"])
flashcard_pipeline = FlashcardPipeline()

class FlashcardRequest(BaseModel):
    noteId: str
    content: str
    concepts: list

@router.post("/generate")
async def generate_flashcards(request: FlashcardRequest):
    """
    Generate flashcards from processed content using
    - KeyBERT for keyword extraction
    - Bloom's taxonomy for question generation
    - Difficulty estimation
    """
    try:
        flashcards = await flashcard_pipeline.generate(
            request.noteId,
            request.content,
            request.concepts
        )
        return {
            "status": "success",
            "flashcards": flashcards,
            "count": len(flashcards)
        }
    except Exception as e:
        logger.error(f"Flashcard generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
