from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import spacy
import logging
from app.core.config import settings
from app.routers import document_router, flashcard_router, mindmap_router, question_router
from app.routers import twin_router, academy_router, forest_router, thinking_router, learning_engine_router

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_service")

# Lifespan events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing AI ML Pipelines & Models...")
    try:
        # Verify spaCy is loadable
        nlp = spacy.load("en_core_web_sm")
        logger.info("🛡️  spaCy (en_core_web_sm) loaded successfully!")
    except Exception as e:
        logger.error(f"❌ Failed to load spaCy model: {str(e)}")
        
    yield
    # Shutdown actions
    logger.info("Shutting down AI ML Pipelines...")

app = FastAPI(
    title="FirstStep AI Service",
    description="Python API running machine learning, NLP, and cognitive modeling pipelines.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base health checks
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "firststep-ai-service",
        "environment": settings.ENV,
        "models_status": {
            "spacy_en_core_web_sm": "available"
        }
    }

# Include all routers
app.include_router(document_router.router)
app.include_router(flashcard_router.router)
app.include_router(mindmap_router.router)
app.include_router(question_router.router)
app.include_router(twin_router.router)
app.include_router(academy_router.router)
app.include_router(forest_router.router)
app.include_router(thinking_router.router)
app.include_router(learning_engine_router.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
