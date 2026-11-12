from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.responses import JSONResponse
try:
    import spacy
except ImportError:
    spacy = None
import logging
from app.core.config import settings
from app.core.service_auth import is_valid_service_key
from app.routers import document_router, flashcard_router, mindmap_router, question_router
from app.routers import twin_router, academy_router, forest_router, thinking_router, learning_engine_router

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_service")
spacy_model_status = "unavailable"

# Lifespan events
@asynccontextmanager
async def lifespan(app: FastAPI):
    global spacy_model_status
    # Startup actions
    logger.info("Initializing AI ML Pipelines & Models...")
    if spacy is not None:
        try:
            # Verify spaCy is loadable
            nlp = spacy.load("en_core_web_sm")
            spacy_model_status = "available"
            logger.info("🛡️  spaCy (en_core_web_sm) loaded successfully!")
        except Exception as e:
            spacy_model_status = "unavailable"
            logger.error(f"❌ Failed to load spaCy model: {str(e)}")
    else:
        spacy_model_status = "unavailable"
        logger.info("ℹ️  spaCy not installed, using fallback NLP modules.")
        
    yield
    # Shutdown actions
    logger.info("Shutting down AI ML Pipelines...")

app = FastAPI(
    title="FirstStep AI Service",
    description="Python API running machine learning, NLP, and cognitive modeling pipelines.",
    version="1.0.0",
    lifespan=lifespan
)

@app.middleware("http")
async def require_internal_service_key(request, call_next):
    # Health is intentionally public for container orchestration. Every
    # generation/data route is private to the backend-to-AI service link.
    if request.url.path == "/health":
        return await call_next(request)
    configured_key = settings.AI_SERVICE_KEY
    if not configured_key:
        return JSONResponse(
            status_code=503,
            content={"detail": "AI service authentication is not configured"},
        )
    provided_key = request.headers.get("x-ai-service-key")
    if not is_valid_service_key(provided_key, configured_key):
        return JSONResponse(status_code=401, content={"detail": "Unauthorized AI service request"})
    return await call_next(request)

# Base health checks
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "firststep-ai-service",
        "environment": settings.ENV,
        "models_status": {
            "spacy_en_core_web_sm": spacy_model_status,
            "gemini_document_processing": "configured" if document_router.document_pipeline.gemini_enabled else "not_configured",
            "gemini_model": settings.GEMINI_MODEL if document_router.document_pipeline.gemini_enabled else None,
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
