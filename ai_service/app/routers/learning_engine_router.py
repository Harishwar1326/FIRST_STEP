from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
from app.pipelines.learning_engine_pipeline import LearningEnginePipeline
try:
    from app.routers.document_router import document_pipeline
except ImportError:
    document_pipeline = None
from app.core.config import settings
try:
    import google.generativeai as genai
except ImportError:
    genai = None
import logging

logger = logging.getLogger("ai_service")

router = APIRouter(prefix="/learning", tags=["Adaptive Learning Engine"])
learning_pipeline = LearningEnginePipeline()

class PredictProfileRequest(BaseModel):
    quizScore: Optional[float] = 75.0
    taskCompletion: Optional[float] = 0.8
    studyTime: Optional[float] = 20.0
    revisionCount: Optional[int] = 1
    daysActive: Optional[float] = 5.0
    averageWatchPercentage: Optional[float] = 0.5
    pauseFrequency: Optional[float] = 1.0
    videoWatchRate: Optional[float] = 0.5
    averageAnswerTime: Optional[float] = 30.0
    confidenceLevel: Optional[float] = 3.0
    # Backwards compatibility fields
    daysSinceLastRevision: Optional[float] = None
    readingSpeed: Optional[float] = None
    drawingActivity: Optional[float] = None
    videoDurationRatio: Optional[float] = None
    notesLength: Optional[float] = None

class GenerateContentRequest(BaseModel):
    type: str # "notes", "flashcards", "quiz"
    lessonTitle: Optional[str] = None
    lessonContent: Optional[str] = None
    masteryLevel: Optional[str] = "Intermediate"
    weakConcepts: Optional[List[str]] = []
    mistakeConcepts: Optional[List[str]] = []

class AskRequest(BaseModel):
    question: str
    documentId: Optional[str] = None
    limit: int = 5

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

@router.post("/ask")
async def ask_from_documents(request: AskRequest):
    """Answer a question using retrieved PDF chunks and Gemini."""
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="question is required")

    try:
        chunks = document_pipeline.retrieve(question, request.documentId, request.limit)
        if not chunks:
            return {"answer": "I could not find relevant content in the uploaded documents.", "sources": []}

        context = "\n\n---\n\n".join(
            f"[Source {index + 1}]\n{chunk['document']}"
            for index, chunk in enumerate(chunks)
        )
        prompt = (
            "Answer the student's question using only the source text below. "
            "If the answer is not present, say that clearly. Keep the answer simple.\n\n"
            f"Question: {question}\n\nSources:\n{context}"
        )

        if learning_pipeline.gemini_enabled:
            model = genai.GenerativeModel(settings.GEMINI_MODEL)
            response = model.generate_content(prompt)
            answer = response.text.strip()
            generated_by = "Gemini"
        else:
            answer = "Gemini is not configured. Retrieved sources are available for review."
            generated_by = "retrieval-only"

        return {
            "answer": answer,
            "generatedBy": generated_by,
            "sources": [chunk["metadata"] for chunk in chunks],
        }
    except Exception as e:
        logger.error(f"Failed to answer from documents: {str(e)}")
        raise HTTPException(status_code=500, detail="Document question answering failed")
