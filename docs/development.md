# HabitHero Development & Operations Guide

This guide provides instructions for setting up, running, testing, and debugging the HabitHero ecosystem across the frontend, backend, and Fetch.ai uAgent services.

---

## 1. Prerequisites

Ensure your development environment meets the following requirements:
* **Operating System**: Windows, macOS, or Linux
* **Node.js**: v18.0.0 or higher (v20+ recommended)
* **Python**: v3.12 (required for `uagents 0.26.1`)
* **MongoDB**: v7.0+ running on `localhost:27017` *(optional: backend includes automatic zero-config in-memory MongoDB fallback)*
* **Google Gemini API Key**: Obtainable from [Google AI Studio](https://aistudio.google.com/)

---

## 2. Environment Configuration

HabitHero requires configuration across three `.env` files. Copy each template:

### Root Level
```bash
cp .env.example .env
```

### Backend (`/backend/.env`)
```bash
cp backend/.env.example backend/.env
```
Key variables:
* `PORT=5000`
* `MONGODB_URI=mongodb://localhost:27017/habithero`
* `JWT_SECRET=your_secure_development_jwt_secret`
* `GEMINI_API_KEY=your_gemini_api_key`
* `GEMINI_MODEL=gemini-3.5-flash`
* `AGENT_SERVICE_SECRET=habithero_internal_secret_hackathon_2026`

### Fetch.ai uAgent (`/habithero-agent/.env`)
```bash
cp habithero-agent/.env.example habithero-agent/.env
```
Key variables:
* `AGENT_NAME=HabitHero`
* `AGENT_SEED_PHRASE=habithero_hackathon_seed_phrase_stranger_builds_2026`
* `AGENT_PORT=8000`
* `BACKEND_API_URL=http://localhost:5000/api/agent/chat`
* `AGENT_SERVICE_SECRET=habithero_internal_secret_hackathon_2026`
* `AGENT_MAILBOX_KEY=` *(Agentverse Mailbox API Key for 24/7 background polling)*

---

## 3. Running Services

Open three separate terminal windows to run the complete ecosystem:

### Terminal 1: Backend API Server
```bash
cd backend
npm install
npm run dev
```
* Backend health check: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### Terminal 2: Frontend Web Application
```bash
cd frontend
npm install
npm run dev
```
* Web dashboard: [http://localhost:5173](http://localhost:5173)

### Terminal 3: Fetch.ai uAgent
```bash
cd habithero-agent
# Activate Python 3.12 virtual environment
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS / Linux
python agent.py
```
* Agent Inspector: View the live inspector URL printed in the agent terminal startup logs.

---

## 4. API Endpoints Overview

### Authentication (`/api/auth`)
* `POST /api/auth/register` — Register a new account (`{ name, email, password }`)
* `POST /api/auth/login` — Login and receive JWT (`{ email, password }`)
* `GET /api/auth/me` — Retrieve current authenticated user profile *(Bearer JWT)*

### Goals & Micro-Plans (`/api/goals`)
* `GET /api/goals` — List authenticated user's goals
* `POST /api/goals` — Create a new goal and auto-generate Day 1 task
* `GET /api/goals/:id` — Retrieve goal details with milestones
* `PATCH /api/goals/:id` — Update commitment duration or status
* `DELETE /api/goals/:id` — Delete goal and cascade-delete associated tasks

### Daily Tasks (`/api/tasks`)
* `GET /api/tasks/today` — Retrieve tasks scheduled for the current day
* `POST /api/tasks` — Manually add a custom task
* `PATCH /api/tasks/:id/complete` — Toggle task completion status and update streak

### Check-Ins & Reflections (`/api/checkins`)
* `POST /api/checkins` — Record evening check-in (`{ status, missedReason, reflection, adaptTomorrow }`)
* `GET /api/checkins/today` — Retrieve today's check-in status

### Conversational Companion (`/api/chat`)
* `POST /api/chat/message` — Send natural language message to Gemini with autonomous tool calling
* `GET /api/chat/conversations` — List conversation history
* `GET /api/chat/conversations/:id` — Retrieve full message transcript and tool calls

### Fetch.ai Agent Hook (`/api/agent`)
* `POST /api/agent/chat` — Internal endpoint for the Python uAgent *(Requires `x-agent-secret` header)*

---

## 5. Running Test Suites

Execute all test suites to confirm system reliability:

```bash
# 1. Run all backend integration tests (63 tests)
cd backend
npm test

# 2. Run Python uAgent pytest suite (10 tests)
cd ../habithero-agent
pytest tests/test_agent.py

# 3. Verify frontend production TypeScript build
cd ../frontend
npm run build
```
