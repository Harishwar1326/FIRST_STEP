from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.pipelines.academy_pipeline import AcademyPipeline
import logging

logger = logging.getLogger("ai_service")

router = APIRouter(prefix="/academy", tags=["Learning Academy"])
academy_pipeline = AcademyPipeline()

class PlanGenerateRequest(BaseModel):
    userId: str

class FlashcardReview(BaseModel):
    userId: str
    cardId: str
    rating: int

class StreakUpdate(BaseModel):
    userId: str

class TechniqueRequest(BaseModel):
    userId: str
    subject: str

@router.post("/plan/generate")
async def generate_study_plan(request: PlanGenerateRequest):
    """Generate personalized study plan using spaced repetition"""
    try:
        plan = await academy_pipeline.generate_plan(request.userId)
        return plan
    except Exception as e:
        logger.error(f"Study plan generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/flashcard/review")
async def review_flashcard(request: FlashcardReview):
    """Process flashcard review for spaced repetition algorithm"""
    try:
        result = await academy_pipeline.process_flashcard_review(
            request.userId,
            request.cardId,
            request.rating
        )
        return result
    except Exception as e:
        logger.error(f"Flashcard review processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/flashcards/due/{userId}")
async def get_due_flashcards(userId: str):
    """Get flashcards due for review today"""
    try:
        result = await academy_pipeline.get_due_flashcards(userId)
        return result
    except Exception as e:
        logger.error(f"Get due flashcards failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/streak/update")
async def update_streak(request: StreakUpdate):
    """Update study streak"""
    try:
        result = await academy_pipeline.update_streak(request.userId)
        return result
    except Exception as e:
        logger.error(f"Streak update failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/technique/recommend")
async def recommend_technique(request: TechniqueRequest):
    """Recommend best study technique for specific subject"""
    try:
        result = await academy_pipeline.get_technique_recommendation(
            request.userId,
            request.subject
        )
        return result
    except Exception as e:
        logger.error(f"Technique recommendation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
