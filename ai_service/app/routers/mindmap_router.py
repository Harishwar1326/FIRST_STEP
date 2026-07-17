from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.pipelines.mindmap_pipeline import MindMapPipeline
import logging

logger = logging.getLogger("ai_service")

router = APIRouter(prefix="/pipeline/mindmap", tags=["Mind Map"])
mindmap_pipeline = MindMapPipeline()

class MindMapRequest(BaseModel):
    noteId: str
    concepts: list
    relationships: list

@router.post("/generate")
async def generate_mindmap(request: MindMapRequest):
    """
    Generate interactive mind map using:
    - NetworkX for graph construction
    - Concept relationship extraction
    - Hierarchical organization
    """
    try:
        mindmap = await mindmap_pipeline.generate(
            request.noteId,
            request.concepts,
            request.relationships
        )
        return {
            "status": "success",
            "nodes": mindmap["nodes"],
            "edges": mindmap["edges"],
            "layout": mindmap["layout"]
        }
    except Exception as e:
        logger.error(f"Mind map generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
