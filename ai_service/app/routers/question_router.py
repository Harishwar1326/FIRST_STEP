from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.pipelines.question_pipeline import QuestionPipeline
import logging

logger = logging.getLogger("ai_service")

router = APIRouter(prefix="/pipeline/questions", tags=["Questions"])
question_pipeline = QuestionPipeline()

class QuestionRequest(BaseModel):
    noteId: str
    content: str
    bloomLevel: str = "all"

@router.post("/generate")
async def generate_questions(request: QuestionRequest):
    """
    Generate questions using Bloom's Taxonomy:
    - Remember
    - Understand
    - Apply
    - Analyze
    - Evaluate
    - Create
    """
    try:
        questions = await question_pipeline.generate(
            request.noteId,
            request.content,
            request.bloomLevel
        )
        return {
            "status": "success",
            "questions": questions,
            "count": len(questions),
            "distribution": question_pipeline.get_bloom_distribution(questions)
        }
    except Exception as e:
        logger.error(f"Question generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
