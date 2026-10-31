# Contributing to HabitHero

Thank you for your interest in contributing to **HabitHero — AI Accountability Companion**! We welcome contributions from developers, designers, prompt engineers, and AI researchers.

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for all contributors. Please be respectful and constructive in issues, discussions, and code reviews.

---

## Development Setup

HabitHero consists of three coordinated services:

```text
hero-habit/
├── frontend/          # React + Vite + TypeScript + Tailwind CSS
├── backend/           # Node.js + Express + TypeScript + MongoDB + Gemini
└── habithero-agent/   # Python 3.12 + Fetch.ai uAgents + AgentChatProtocol 0.3.0
```

### Prerequisites
* Node.js v18+ & npm
* Python 3.12
* MongoDB v7.0+ (running locally on port 27017 or in-memory fallback)
* Google Gemini API Key

### Initial Setup
```bash
# 1. Clone the repository
git clone https://github.com/manish23092003/habithero-agent.git
cd habithero-agent

# 2. Install backend dependencies
cd backend
npm install
cp .env.example .env

# 3. Install frontend dependencies
cd ../frontend
npm install

# 4. Setup Python virtual environment for the uAgent
cd ../habithero-agent
python -m venv .venv
source .venv/bin/activate  # Or on Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

---

## Development Workflow

1. Create a focused feature branch:
   ```bash
   git checkout -b feat/my-new-feature
   ```
2. Follow Conventional Commits:
   * `feat: add adaptive check-in streak recovery`
   * `fix: prevent duplicate task completion race condition`
   * `docs: update Fetch.ai Chat Protocol sequence diagram`
   * `test: add multi-tenant agent endpoint isolation test`
3. Verify all tests pass before opening a Pull Request:
   ```bash
   # Backend integration & agent endpoint tests (63 tests)
   cd backend && npm test

   # Frontend production build
   cd frontend && npm run build

   # Python uAgent test suite
   cd habithero-agent && pytest tests/test_agent.py
   ```

---

## Pull Request Guidelines

* Keep pull requests focused on a single responsibility.
* Do not commit real API keys, seed phrases, or database connection strings.
* Include screenshots or terminal logs for UI or tool execution changes.
* Verify multi-tenant data isolation when modifying backend services or database schemas.

---

## Questions & Support

Feel free to open a GitHub Issue for bug reports, feature requests, or questions about the Fetch.ai and Gemini integrations.
