# HabitHero Fetch.ai uAgent

**HabitHero** is an autonomous AI accountability companion built on the **Fetch.ai uAgents framework** for the **STRANGER BUILDS Halloween Hackathon (Fetch.ai track)**. It turns ambitious goals into consistent daily habits using the "Never Miss Twice" habit formation philosophy.

---

## Agent Overview

- **Agent Name:** `HabitHero`
- **Identity / Address:** `agent1qghes4q3u28wc48zeateraflnf3uadm3ygam56lwh2m5elxm407256zqkkw` *(derived from seed phrase)*
- **Protocol:** `AgentChatProtocol` **version 0.3.0** (`proto:30a801ed3a83f9a0ff0a9f1e6fe958cb91da1fc2218b153df7b6cbf87bd33d62`)
- **Compatibility:** Native ASI:One chat and Fetch.ai agent ecosystem
- **Python Version:** Python 3.12 (`3.12.10`)
- **Discovery Keywords:** `habits`, `accountability`, `goals`, `productivity`, `habithero`, `motivation`, `daily-routine`, `check-in`

---

## Architecture

```
+-------------------------------------------------------------+
|                     ASI:One Chat / Fetch.ai User            |
+-------------------------------------------------------------+
                              |
                     ChatMessage (Protocol 0.3.0)
                              |
                              v
+-------------------------------------------------------------+
|               HabitHero Python uAgent (agent.py)            |
|  - Validates ChatMessage & extracts TextContent             |
|  - Emits immediate ChatAcknowledgement                      |
|  - Authenticates with Node.js backend using service secret  |
+-------------------------------------------------------------+
                              |
                 POST /api/agent/chat (HTTP JSON)
                 Header: x-agent-secret
                              |
                              v
+-------------------------------------------------------------+
|           HabitHero Node.js + Express AI Engine             |
|  - Maps sender address to isolated user profile             |
|  - Gemini 2.5 Flash Function Calling with 10 backend tools  |
|  - MongoDB persistence (Goals, Tasks, CheckIns, History)    |
+-------------------------------------------------------------+
                              |
                     Structured AI Reply
                              |
                              v
+-------------------------------------------------------------+
|                HabitHero Python uAgent                      |
|  - Wraps reply into ChatMessage(content=[TextContent(...)]) |
|  - Sends back to recipient over AgentChatProtocol           |
+-------------------------------------------------------------+
```

---

## Directory Structure

```
habithero-agent/
|-- agent.py              # Main uAgent definition, protocol registration & message handlers
|-- config.py             # Environment configuration (seed, port, URLs, secrets)
|-- backend_client.py     # Async client for service-to-service communication
|-- requirements.txt      # Exact pinned dependencies (uagents 0.26.1, uagents-core 0.4.12)
|-- .env.example          # Template environment file
|-- .env                  # Local environment file (git ignored)
|-- .gitignore            # Git ignore rules for venv, keys, and cache
|-- README.md             # Documentation & usage guide
`-- tests/
    `-- test_agent.py     # 10 automated unit and integration tests
```

---

## Setup & Running

### 1. Requirements
- Python 3.12 (`3.12.10` recommended)
- HabitHero Node.js backend running on `http://localhost:5000`

### 2. Installation
```powershell
# Navigate to habithero-agent
cd habithero-agent

# Create virtual environment with Python 3.12
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install pinned dependencies
pip install -r requirements.txt
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```

Ensure `AGENT_SERVICE_SECRET` matches the value configured in `backend/.env`.

### 4. Running the Agent
```powershell
python agent.py
```

Expected output:
```
INFO: [HabitHero]: Starting agent with address: agent1qghes4q3u28wc48zeateraflnf3uadm3ygam56lwh2m5elxm407256zqkkw
INFO: [HabitHeroAgent]: Starting HabitHero uAgent 'HabitHero' on port 8000
```

---

## Running the Automated Test Suite

Run the full pytest suite:
```powershell
.\.venv\Scripts\python -m pytest -v tests/test_agent.py
```

Covered test scenarios:
1. `test_protocol_specification`: Protocol specification validation (`AgentChatProtocol 0.3.0`).
2. `test_agent_initialization`: Deterministic address derivation and protocol manifest inclusion.
3. `test_chat_message_schema`: `ChatMessage` and `TextContent` schema verification.
4. `test_chat_acknowledgement_schema`: `ChatAcknowledgement` schema verification.
5. `test_handle_empty_message`: Graceful fallback and user guidance when input is empty.
6. `test_handle_acknowledgement_callback`: Delivery receipt handling.
7. `test_backend_client_connection_failure`: Resilient error handling when backend is unreachable.
8. `test_backend_client_auth_failure`: Security check rejecting invalid agent service secrets.
9. `test_end_to_end_backend_integration`: Real live round-trip to Node.js backend with user provisioning.
10. `test_full_message_flow_with_live_backend`: End-to-end ChatMessage -> Ack -> AI Reasoning -> ChatMessage.

---

## ASI:One & Agentverse Registration (Phase 6)
To connect this agent to the live Agentverse mailbox and ASI:One:
1. Obtain an Agentverse Mailbox API Key from [agentverse.ai](https://agentverse.ai).
2. Set `AGENT_MAILBOX_KEY=<your-key>` in `.env`.
3. Start the agent with `python agent.py`.
4. Register the agent in the Agentverse Explorer and test interaction on [asi1.ai/chat](https://asi1.ai/chat).
