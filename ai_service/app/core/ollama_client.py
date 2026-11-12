import json
import logging
import re
from typing import Optional

import requests

from app.core.config import settings

logger = logging.getLogger("ai_service")


def generate_ollama_text(
    prompt: str,
    *,
    system_prompt: Optional[str] = None,
    json_output: bool = False,
    max_tokens: int = 4096,
    temperature: float = 0.2,
) -> str:
    """Generate text from the configured local Ollama server without sending prompts off-host."""
    if not settings.OLLAMA_FALLBACK_ENABLED:
        raise RuntimeError("Ollama fallback is disabled")

    base_url = settings.OLLAMA_BASE_URL.rstrip("/")
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": str(prompt or "")})
    payload = {
        "model": settings.OLLAMA_MODEL,
        "stream": False,
        "keep_alive": "5m",
        "messages": messages,
        "options": {
            "temperature": max(0.0, min(1.0, float(temperature))),
            "num_predict": max(1, min(int(max_tokens), 8192)),
        },
    }
    if json_output:
        payload["format"] = "json"

    timeout_seconds = max(1.0, float(settings.OLLAMA_TIMEOUT_MS) / 1000.0)
    response = requests.post(
        f"{base_url}/api/chat",
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=timeout_seconds,
    )
    response.raise_for_status()
    content = response.json().get("message", {}).get("content", "")
    content = str(content or "").strip()
    if not content:
        raise ValueError("Ollama returned empty text")
    if json_output:
        candidate = re.sub(r"^```(?:json)?\s*|\s*```$", "", content, flags=re.IGNORECASE).strip()
        try:
            json.loads(candidate)
        except (TypeError, ValueError) as error:
            raise ValueError("Ollama returned invalid JSON") from error
        return candidate
    return content
