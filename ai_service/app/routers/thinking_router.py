from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.pipelines.thinking_pipeline import ThinkingPipeline
import logging

logger = logging.getLogger("ai_service")

router = APIRouter(prefix="/thinking", tags=["Thinking Lab"])
thinking_pipeline = ThinkingPipeline()

class ChallengeGenerateRequest(BaseModel):
    userId: str

class AnswerSubmit(BaseModel):
    challengeId: str
    answer: str
    expectedAnswer: str

class HistoryRequest(BaseModel):
    userId: str

class ScoreRequest(BaseModel):
    userId: str

@router.post("/challenge/generate")
async def generate_challenge(request: ChallengeGenerateRequest):
    """Generate daily critical thinking challenge"""
    try:
        challenge = await thinking_pipeline.generate_challenge(request.userId)
        return challenge
    except Exception as e:
        logger.error(f"Challenge generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/answer/evaluate")
async def evaluate_answer(request: AnswerSubmit):
    """Evaluate thinking challenge answer using AI"""
    try:
        evaluation = await thinking_pipeline.evaluate_answer(
            request.challengeId,
            request.answer,
            request.expectedAnswer
        )
        return evaluation
    except Exception as e:
        logger.error(f"Answer evaluation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/history")
async def get_history(request: HistoryRequest):
    """Get user's challenge history and thinking skills"""
    try:
        history = await thinking_pipeline.get_history(request.userId)
        return history
    except Exception as e:
        logger.error(f"Get history failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/score")
async def get_score(request: ScoreRequest):
    """Get user's current thinking score and ranking"""
    try:
        score = await thinking_pipeline.get_score(request.userId)
        return score
    except Exception as e:
        logger.error(f"Get score failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
