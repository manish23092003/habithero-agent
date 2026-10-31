# HabitHero System Architecture

HabitHero is an autonomous AI accountability companion engineered to solve the consistency problem in personal development. This document details the technical architecture, data pipelines, conversational protocols, and multi-tenant security model.

---

## 1. High-Level Architecture Overview

HabitHero implements a **dual-entry unified backend architecture**. Users can interact with HabitHero through:
1. **Direct Web Application**: High-performance React 18 SPA with responsive dashboards, real-time streak trackers, and an embedded companion chat drawer.
2. **Decentralized Agentverse / ASI:One**: Conversational interface powered by a Python 3.12 Fetch.ai uAgent implementing `AgentChatProtocol` v0.3.0.

Both channels converge on the same Node.js & TypeScript backend, ensuring unified business logic, MongoDB persistence, and Gemini AI reasoning.

```mermaid
graph TD
    subgraph "Client Layer"
        Web["HabitHero React SPA<br/>(Vite + Tailwind CSS)"]
        ASI["ASI:One / Agentverse<br/>(Decentralized Marketplace)"]
    end

    subgraph "Fetch.ai Network Layer"
        uAgent["Python 3.12 uAgent<br/>(agent1qghes4...)"]
        Mailbox["Agentverse Mailbox<br/>(submit & poll v2)"]
        Almanac["Fetch.ai Almanac API<br/>(Discovery & Manifest)"]
    end

    subgraph "Core Backend Services"
        API["Node.js Express API<br/>(TypeScript)"]
        AuthMid["JWT & Service Secret<br/>Auth Middleware"]
        ToolEngine["ToolExecutor<br/>(9 Autonomous Tools)"]
        AIService["AIService<br/>(@google/genai)"]
    end

    subgraph "AI Intelligence"
        Gemini["Google Gemini API<br/>(gemini-3.5-flash)"]
    end

    subgraph "Persistence Layer"
        Mongo[("MongoDB Database<br/>(Local or Memory Server)")]
    end

    Web -->|REST / JSON with JWT| API
    ASI -->|Fetch.ai Messages| Mailbox
    Mailbox -->|Long Polling 200 OK| uAgent
    uAgent <-->|Manifest / Registration| Almanac
    uAgent -->|POST /api/agent/chat with Secret| API

    API --> AuthMid
    AuthMid --> AIService
    AIService <-->|System Prompt + Tools| Gemini
    AIService -->|Execute Function Calls| ToolEngine
    ToolEngine <-->|CRUD with Tenant Isolation| Mongo
    API <-->|Direct Goal & Task REST Queries| Mongo
```

---

## 2. Dual-Entry Message Flow Sequence

### A. Web Application Flow
1. User logs in via `/api/auth/login` and receives a cryptographically signed JWT.
2. User submits a goal or opens the companion drawer to chat.
3. Express controller validates JWT claims (`req.user.id`).
4. Controller routes message to `AIService.processUserMessage()`.

### B. ASI:One / Fetch.ai Agentverse Flow
1. User interacts with HabitHero on the ASI:One agent chat portal.
2. Agentverse delivers `ChatMessage` to HabitHero's mailbox.
3. HabitHero uAgent daemon receives message and immediately sends `ChatAcknowledgement`.
4. uAgent securely forwards message to backend `POST /api/agent/chat` along with `x-agent-secret`.
5. Backend verifies secret, locates or automatically provisions an isolated user mapped to the Fetch.ai sender address (`agent1q...`), and passes request to `AIService`.

```mermaid
sequenceDiagram
    autonumber
    actor User as User (ASI:One)
    participant AV as Agentverse Mailbox
    participant AG as Python uAgent
    participant BE as Node.js Backend API
    participant AI as Gemini AI Service
    participant DB as MongoDB

    User->>AV: Send ChatMessage ("Create habit: Study Java 45m daily")
    AV->>AG: Deliver envelope via mailbox poll
    AG->>AV: Return ChatAcknowledgement (immediate receipt)
    AV->>User: Display Delivery Checkmark

    AG->>BE: POST /api/agent/chat (Sender + Message + x-agent-secret)
    BE->>BE: Validate x-agent-secret header
    BE->>DB: Find or create User by fetchAddress
    BE->>AI: AIService.processUserMessage(userId, message)

    AI->>AI: Load recent conversation context (last 8 messages)
    AI->>Gemini: generateContent(SystemPrompt, Tools, Context)
    Gemini-->>AI: FunctionCall: create_goal(title, dailyMinutes, targetDays)

    AI->>BE: ToolExecutor.execute("create_goal", args)
    BE->>DB: Save Goal and auto-generate kickoff Day 1 Task
    DB-->>BE: Stored Goal & Task ObjectIds
    BE-->>AI: ToolExecutionResult (Success: true)

    AI->>Gemini: Return FunctionResponse for synthesis
    Gemini-->>AI: Natural language reply: "I've set up your Java plan..."
    AI->>DB: Persist User & Agent messages + Tool calls
    AI-->>BE: Final reply payload
    BE-->>AG: HTTP 200 { reply: "..." }
    AG->>AV: Send ChatMessage reply
    AV->>User: Display HabitHero response in ASI:One
```

---

## 3. Database Entity Relationship (ER) Model

All entities enforce strict multi-tenant isolation through indexed `userId` references.

```mermaid
erDiagram
    USER ||--o{ GOAL : owns
    USER ||--o{ TASK : assigned
    USER ||--o{ CHECKIN : records
    USER ||--o{ CONVERSATION : participates
    GOAL ||--o{ TASK : contains
    CONVERSATION ||--o{ MESSAGE : contains

    USER {
        ObjectId _id PK
        string name
        string email UK
        string passwordHash
        string fetchAddress UK
        datetime createdAt
    }

    GOAL {
        ObjectId _id PK
        ObjectId userId FK
        string title
        string category
        int dailyCommitmentMinutes
        int targetDays
        int currentDay
        int streak
        string status
        array phases
        array adaptationHistory
    }

    TASK {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId goalId FK
        string title
        string description
        int dayNumber
        int durationMinutes
        string status
        datetime completedAt
        boolean adapted
    }

    CHECKIN {
        ObjectId _id PK
        ObjectId userId FK
        date checkInDate
        string status
        string missedReason
        string reflection
        boolean adaptedTomorrow
    }

    CONVERSATION {
        ObjectId _id PK
        ObjectId userId FK
        string status
        datetime lastMessageAt
    }

    MESSAGE {
        ObjectId _id PK
        ObjectId conversationId FK
        ObjectId userId FK
        string sender
        string content
        array toolCalls
        array toolResults
        datetime createdAt
    }
```

---

## 4. Autonomous Gemini AI Tool Engine

HabitHero defines **9 native tool declarations** provided to Gemini during each conversation turn. The model decides autonomously when to query or modify user state:

| Tool Name | Parameters | Responsibility |
|---|---|---|
| `create_goal` | `title`, `category`, `dailyCommitmentMinutes`, `targetDays` | Creates a new habit goal and automatically schedules the Day 1 kickoff task. |
| `get_today_tasks` | *(none)* | Queries all active, pending, or completed tasks for the current day. |
| `complete_task` | `taskId` | Marks a task as completed, timestamps it, and increments the goal streak. |
| `create_tasks` | `goalId`, `tasks: [{ title, durationMinutes, dayNumber }]` | Adds milestone or challenge micro-tasks to an existing goal. |
| `adapt_task` | `taskId`, `newDurationMinutes`, `adaptationNote` | Dynamically scales task duration down (e.g. 15m) when the user is busy. |
| `update_goal` | `goalId`, `dailyCommitmentMinutes`, `adaptationNotice` | Modifies the target commitment and logs adaptation reason in history. |
| `adapt_habit_plan` | `goalId`, `reason`, `targetMinutes` | Bulk adapts upcoming pending tasks to maintain momentum without burnout. |
| `record_checkin` | `status`, `missedReason`, `reflection`, `adaptTomorrow` | Records evening accountability check-in and triggers plan adjustments. |
| `get_progress_summary` | *(none)* | Computes overall consistency rate, current streak, and completion metrics. |

---

## 5. Security & Isolation Architecture

* **Tenant Segregation**: `req.user.id` is derived strictly from verified JWT tokens on REST endpoints, and from verified `fetchAddress` mapping on agent endpoints. No client can pass a foreign `userId` to mutate another user's goals or tasks.
* **Secret Protection**: API keys, JWT secrets, and database credentials exist exclusively in server-side environment variables and are never bundled in frontend code.
* **Service Secret Gate**: External requests to `/api/agent/chat` must supply the pre-shared `x-agent-secret` header, preventing unauthorized proxying into the agent processing pipeline.
