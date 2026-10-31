import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from current directory or parent directory
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

AGENT_NAME = os.getenv("AGENT_NAME", "HabitHero")
AGENT_SEED = os.getenv("AGENT_SEED_PHRASE", "habithero_hackathon_seed_phrase_stranger_builds_2026")
AGENT_PORT = int(os.getenv("AGENT_PORT", "8000"))
BACKEND_URL = os.getenv("BACKEND_API_URL", "http://localhost:5000/api/agent/chat")
AGENT_SERVICE_SECRET = os.getenv("AGENT_SERVICE_SECRET", "habithero_internal_secret_hackathon_2026")
AGENT_MAILBOX_KEY = os.getenv("AGENT_MAILBOX_KEY", "").strip() or None
