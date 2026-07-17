from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
from app.pipelines.learning_engine_pipeline import LearningEnginePipeline
import logging

logger = logging.getLogger("ai_service")

router = APIRouter(prefix="/learning", tags=["Adaptive Learning Engine"])
learning_pipeline = LearningEnginePipeline()

class PredictProfileRequest(BaseModel):
    quizScore: float
    taskCompletion: float
    studyTime: float
    revisionCount: int
    daysSinceLastRevision: float
    readingSpeed: float
    drawingActivity: float
    videoDurationRatio: float
    notesLength: float
    confidenceLevel: int

class GenerateContentRequest(BaseModel):
    type: str # "notes", "flashcards", "quiz"
    lessonTitle: Optional[str] = None
    lessonContent: Optional[str] = None
    masteryLevel: Optional[str] = "Intermediate"
    weakConcepts: Optional[List[str]] = []
    mistakeConcepts: Optional[List[str]] = []

@router.post("/predict-profile")
async def predict_profile(request: PredictProfileRequest):
    """Predict student mastery, memory retention, learning style, and optimal challenge level"""
    try:
        features = request.model_dump()
        predictions = learning_pipeline.predict_profile(features)
        return predictions
    except Exception as e:
        logger.error(f"Failed to predict learning profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-content")
async def generate_content(request: GenerateContentRequest):
    """Generate personalized learning content (notes, flashcards, or diagnostic quizzes)"""
    try:
        content_type = request.type
        if content_type == "notes":
            if not request.lessonTitle or not request.lessonContent:
                raise HTTPException(status_code=400, detail="lessonTitle and lessonContent are required for notes generation")
            notes_data = await learning_pipeline.generate_personalized_notes(
                request.lessonTitle,
                request.lessonContent,
                request.masteryLevel
            )
            return notes_data
        elif content_type == "flashcards":
            cards = await learning_pipeline.generate_personalized_flashcards(request.weakConcepts)
            return {"flashcards": cards}
        elif content_type == "quiz":
            quiz_questions = await learning_pipeline.generate_personalized_quiz(request.mistakeConcepts)
            return {"quiz": quiz_questions}
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported generation type: {content_type}")
    except Exception as e:
        logger.error(f"Failed to generate personalized content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
