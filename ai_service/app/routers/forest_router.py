from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.pipelines.forest_pipeline import ForestPipeline
import logging

logger = logging.getLogger("ai_service")

router = APIRouter(prefix="/forest", tags=["Knowledge Forest"])
forest_pipeline = ForestPipeline()

class GraphGenerateRequest(BaseModel):
    userId: str

class GapDetectRequest(BaseModel):
    userId: str

class ConceptRequest(BaseModel):
    userId: str
    conceptId: str

@router.post("/graph/generate")
async def generate_knowledge_graph(request: GraphGenerateRequest):
    """Generate interactive knowledge graph from student's notes"""
    try:
        graph = await forest_pipeline.generate_graph(request.userId)
        return graph
    except Exception as e:
        logger.error(f"Knowledge graph generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/path/generate")
async def generate_learning_path(request: GraphGenerateRequest):
    """Generate personalized learning path based on knowledge gaps"""
    try:
        path = await forest_pipeline.generate_learning_path(request.userId)
        return path
    except Exception as e:
        logger.error(f"Learning path generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/gaps/detect")
async def detect_learning_gaps(request: GapDetectRequest):
    """Detect learning gaps using knowledge graph analysis"""
    try:
        gaps = await forest_pipeline.detect_gaps(request.userId)
        return gaps
    except Exception as e:
        logger.error(f"Gap detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/concept/details")
async def get_concept_details(request: ConceptRequest):
    """Get detailed information about a specific concept"""
    try:
        details = await forest_pipeline.get_concept_details(request.userId, request.conceptId)
        return details
    except Exception as e:
        logger.error(f"Get concept details failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
