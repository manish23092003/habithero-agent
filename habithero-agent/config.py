import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from current directory or parent directory
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

AGENT_NAME = os.getenv("AGENT_NAME", "HabitHero")
AGENT_HANDLE = os.getenv("AGENT_HANDLE", "habithero")
AGENT_SEED = os.getenv("AGENT_SEED_PHRASE", "habithero_hackathon_seed_phrase_stranger_builds_2026")

def get_agent_port() -> int:
    """Read Render's dynamic PORT environment variable first, with AGENT_PORT and 8000 as fallbacks."""
    raw_port = os.getenv("PORT") or os.getenv("AGENT_PORT") or "8000"
    try:
        return int(raw_port.strip())
    except (ValueError, AttributeError):
        return 8000

AGENT_PORT = get_agent_port()

def normalize_backend_url(raw_url: str) -> str:
    """Ensure backend API URL cleanly ends with /api/agent/chat without duplicate paths."""
    cleaned = raw_url.strip().rstrip("/")
    if cleaned.endswith("/api/agent/chat"):
        return cleaned
    if cleaned.endswith("/api/agent"):
        return f"{cleaned}/chat"
    if cleaned.endswith("/api"):
        return f"{cleaned}/agent/chat"
    return f"{cleaned}/api/agent/chat"

def get_health_url(backend_chat_url: str) -> str:
    """Derive backend health check URL from backend chat endpoint URL."""
    custom_health = os.getenv("BACKEND_HEALTH_URL", "").strip()
    if custom_health:
        return custom_health
    if "/api/agent/chat" in backend_chat_url:
        return backend_chat_url.replace("/api/agent/chat", "/api/health")
    return f"{backend_chat_url.rstrip('/')}/health"

RAW_BACKEND_URL = os.getenv("BACKEND_API_URL", "http://localhost:5000/api/agent/chat")
BACKEND_URL = normalize_backend_url(RAW_BACKEND_URL)
BACKEND_HEALTH_URL = get_health_url(BACKEND_URL)
AGENT_SERVICE_SECRET = os.getenv("AGENT_SERVICE_SECRET", "habithero_internal_secret_hackathon_2026")
AGENT_MAILBOX_KEY = os.getenv("AGENT_MAILBOX_KEY", "").strip() or None
