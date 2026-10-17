from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PORT: int = 8000
    ENV: str = "development"
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    CHROMA_API_KEY: Optional[str] = None
    CHROMA_TENANT: Optional[str] = None
    CHROMA_DATABASE: Optional[str] = None
    CHROMA_COLLECTION: str = "documents"
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
