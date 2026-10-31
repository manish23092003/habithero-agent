# Changelog

All notable changes to the **HabitHero — AI Accountability Companion** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-31

### Added
* **Frontend Web Experience (`/frontend`)**:
  * Production-grade React 18, TypeScript, Vite, and Tailwind CSS responsive SaaS application.
  * Adaptive Sprint & Micro-Habit views for scaling commitments down to 5–15 minutes when life gets busy.
  * Real-time streak tracking, consistency rate visualization, and milestone completion confettis.
  * AI Companion drawer interface for natural language habit planning, task adaptation, and accountability check-ins.
  * Dedicated modal workflows: New Goal Planner with AI prompt assistance, and Daily Check-In with reflection logs.
  * Multi-device responsive layouts: optimized for mobile (360px, 390px, 430px), tablet (768px), laptop (1024px), and desktop (1440px+).
* **Backend Architecture (`/backend`)**:
  * Node.js & Express RESTful API with full TypeScript compilation.
  * MongoDB persistence with Mongoose models: `User`, `Goal`, `Task`, `CheckIn`, `Conversation`, and `Message`.
  * Secure JWT authentication with bcrypt password hashing and strict multi-tenant route guards.
  * Autonomous Gemini AI service with multi-turn tool calling across 9 custom functions:
    * `create_goal`
    * `get_today_tasks`
    * `complete_task`
    * `create_tasks`
    * `adapt_task`
    * `update_goal`
    * `adapt_habit_plan`
    * `record_checkin`
    * `get_progress_summary`
  * Dual-mode database fallback: seamless automatic fallback to `mongodb-memory-server` if local MongoDB is not running.
* **Fetch.ai Decentralized Agent (`/habithero-agent`)**:
  * Autonomous Python 3.12 uAgent implementing official Fetch.ai `AgentChatProtocol` v0.3.0.
  * Full message lifecycle: incoming `ChatMessage` → instant `ChatAcknowledgement` → backend reasoning → outgoing `ChatMessage`.
  * Agentverse Mailbox client for 24/7 background message polling.
  * Almanac API registration and manifest publishing for decentralized discoverability on ASI:One.
  * Automatic isolated user provisioning in MongoDB for Fetch.ai agent senders (`agent1q...`).
* **Test Suites & Verification**:
  * 46 backend REST API and AI tool execution tests (`api.test.ts`).
  * 17 multi-tenant agent endpoint isolation tests (`agent.test.ts`).
  * 10 Python uAgent ChatProtocol and serialization tests (`test_agent.py`).

### Security
* Zero-secret repository compliance: sanitized environment templates and strict `.gitignore` configurations.
* Multi-tenant tenant checks on every service method and AI tool invocation.
* Internal agent-to-backend communication protected by `x-agent-secret` header validation.
