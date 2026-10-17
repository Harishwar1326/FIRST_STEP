from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import learning_engine_router

app = FastAPI(title="FirstStep Learning Engine Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "learning-engine"}

@app.post("/twin/initialize")
async def initialize_twin(payload: dict = None):
    return {"status": "success", "message": "Twin initialized successfully"}

app.include_router(learning_engine_router.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("engine_server:app", host="0.0.0.0", port=8000, reload=False)
