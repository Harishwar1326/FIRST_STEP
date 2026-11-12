from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from pathlib import Path

AI_SERVICE_ROOT = Path(__file__).resolve().parents[2]

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=AI_SERVICE_ROOT / ".env", env_file_encoding="utf-8", extra="ignore")
    PORT: int = 8000
    ENV: str = "development"
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    CHROMA_API_KEY: Optional[str] = None
    CHROMA_TENANT: Optional[str] = None
    CHROMA_DATABASE: Optional[str] = None
    CHROMA_COLLECTION: str = "documents"
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.8-flash"
    AI_SERVICE_KEY: Optional[str] = None
    OLLAMA_FALLBACK_ENABLED: bool = True
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "qwen2.5-coder:3b"
    OLLAMA_TIMEOUT_MS: int = 90000

settings = Settings()
