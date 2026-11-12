from fastapi import APIRouter, HTTPException
import asyncio
from pydantic import BaseModel, Field, model_validator, constr
from typing import Dict, List, Optional
from app.pipelines.learning_engine_pipeline import LearningEnginePipeline
try:
    from app.routers.document_router import document_pipeline
except ImportError:
    document_pipeline = None
import logging

logger = logging.getLogger("ai_service")

router = APIRouter(prefix="/learning", tags=["Adaptive Learning Engine"])
learning_pipeline = LearningEnginePipeline()

class RecommendationCandidate(BaseModel):
    id: str = Field(min_length=1, max_length=160)
    title: str = Field(min_length=1, max_length=180)
    reason: str = Field(min_length=1, max_length=300)
    lessonId: str = Field(min_length=1, max_length=160)
    subject: str = Field(default="", max_length=100)
    type: str = Field(default="start", max_length=30)

class RecommendationEvidence(BaseModel):
    averageQuizScore: Optional[float] = Field(default=None, ge=0, le=100)
    weakTopics: List[constr(max_length=120)] = Field(default_factory=list, max_length=8)
    lessonsStarted: Optional[int] = Field(default=None, ge=0, le=10000)
    lessonsCompleted: Optional[int] = Field(default=None, ge=0, le=10000)
    primaryGoal: Optional[str] = Field(default=None, max_length=120)
    modelDifficulty: Optional[str] = Field(default=None, max_length=20)
    modelTrainingData: Optional[str] = Field(default=None, max_length=40)

class AnalyzeRecommendationsRequest(BaseModel):
    evidence: RecommendationEvidence
    candidates: List[RecommendationCandidate] = Field(min_length=1, max_length=8)

class PredictProfileRequest(BaseModel):
    quizScore: Optional[float] = Field(default=None, ge=0, le=100)
    quizAccuracy: Optional[float] = Field(default=None, ge=0, le=100)
    lessonCompletionRate: Optional[float] = Field(default=None, ge=0, le=100)
    studyTime: Optional[float] = Field(default=None, ge=0, le=1440)
    revisionCount: Optional[int] = Field(default=None, ge=0, le=1000)
    daysActive: Optional[float] = Field(default=None, ge=0, le=3650)
    averageWatchPercentage: Optional[float] = Field(default=None, ge=0, le=100)
    pauseFrequency: Optional[float] = Field(default=None, ge=0, le=1000)
    videoWatchRate: Optional[float] = Field(default=None, ge=0, le=100)
    averageAnswerTime: Optional[float] = Field(default=None, ge=0, le=86400)
    confidenceLevel: Optional[float] = Field(default=None, ge=0, le=100)
    # Backwards compatible input name; semantically this must be lesson
    # completion, not a fabricated task success score.
    taskCompletion: Optional[float] = Field(default=None, ge=0, le=100)

    @model_validator(mode="after")
    def require_learning_evidence(self):
        evidence_fields = (
            self.quizScore, self.quizAccuracy, self.lessonCompletionRate,
            self.taskCompletion, self.studyTime, self.revisionCount, self.daysActive,
        )
        if all(value is None for value in evidence_fields):
            raise ValueError("At least one measured learning activity or assessment value is required")
        return self
    # Backwards compatibility fields
    daysSinceLastRevision: Optional[float] = None
    readingSpeed: Optional[float] = None
    drawingActivity: Optional[float] = None
    videoDurationRatio: Optional[float] = None
    notesLength: Optional[float] = None

class StudentLearningEvidence(BaseModel):
    recentQuizScore: Optional[float] = Field(default=None, ge=0, le=100)
    weakConcepts: List[constr(max_length=120)] = Field(default_factory=list, max_length=5)
    modelDifficulty: Optional[str] = Field(default=None, max_length=20)
    modelScoreStatus: Optional[str] = Field(default=None, max_length=40)


class GenerateContentRequest(BaseModel):
    type: str # "notes", "flashcards", "quiz"
    lessonTitle: Optional[str] = None
    lessonContent: Optional[str] = None
    masteryLevel: Optional[str] = "Intermediate"
    weakConcepts: Optional[List[str]] = []
    mistakeConcepts: Optional[List[str]] = []
    studentEvidence: Optional[StudentLearningEvidence] = None

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

@router.post("/analyze-recommendations")
async def analyze_recommendations(request: AnalyzeRecommendationsRequest):
    """Rank only real, backend-selected lesson actions using bounded evidence."""
    try:
        result = await learning_pipeline.analyze_learning_recommendations(
            request.evidence.model_dump(),
            [candidate.model_dump() for candidate in request.candidates],
        )
        allowed_ids = {candidate.id for candidate in request.candidates}
        result["items"] = [item for item in result.get("items", []) if item.get("id") in allowed_ids]
        return result
    except Exception as e:
        logger.error("Recommendation analysis failed: %s", str(e))
        raise HTTPException(status_code=500, detail="Recommendation analysis failed")

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
                request.masteryLevel,
                request.studentEvidence.model_dump() if request.studentEvidence else None,
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

        if learning_pipeline.llm_fallback_enabled:
            answer, generated_by = await asyncio.to_thread(learning_pipeline.generate_text_with_provider, prompt)
        else:
            answer = "AI generation is not configured. Retrieved sources are available for review."
            generated_by = "retrieval-only"

        return {
            "answer": answer,
            "generatedBy": generated_by,
            "sources": [chunk["metadata"] for chunk in chunks],
        }
    except Exception as e:
        logger.error(f"Failed to answer from documents: {str(e)}")
        raise HTTPException(status_code=500, detail="Document question answering failed")
