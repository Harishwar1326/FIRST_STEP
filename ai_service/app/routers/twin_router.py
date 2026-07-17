from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.pipelines.twin_pipeline import LearningTwinPipeline
import logging

logger = logging.getLogger("ai_service")

router = APIRouter(prefix="/twin", tags=["Learning Twin"])
twin_pipeline = LearningTwinPipeline()

class TwinInitRequest(BaseModel):
    userId: str
    name: str

class ProgressUpdate(BaseModel):
    userId: str
    studySession: dict = None
    mistake: dict = None

@router.post("/initialize")
async def initialize_twin(request: TwinInitRequest):
    """Initialize AI Learning Twin for a new student"""
    try:
        twin = await twin_pipeline.initialize(request.userId, request.name)
        return {
            "status": "success",
            "learningStyle": twin["learningStyle"],
            "attentionPattern": twin["attentionPattern"],
            "knowledgeScore": twin["knowledgeScore"]
        }
    except Exception as e:
        logger.error(f"Twin initialization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/{userId}")
async def get_analytics(userId: str):
    """Get learning analytics and insights"""
    try:
        analytics = await twin_pipeline.get_analytics(userId)
        return analytics
    except Exception as e:
        logger.error(f"Analytics retrieval failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recommendations/{userId}")
async def get_recommendations(userId: str):
    """Get personalized learning recommendations"""
    try:
        recommendations = await twin_pipeline.get_recommendations(userId)
        return recommendations
    except Exception as e:
        logger.error(f"Recommendation generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/progress")
async def update_progress(request: ProgressUpdate):
    """Update student progress and learning data"""
    try:
        result = await twin_pipeline.update_progress(request.userId, request.dict())
        return {"status": "success", "message": "Progress updated"}
    except Exception as e:
        logger.error(f"Progress update failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
