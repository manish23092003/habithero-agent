# 🚀 HabitHero – AI Accountability Companion

**Don't just set goals. Actually achieve them.**

HabitHero is an AI-powered accountability companion that helps people turn their goals into consistent daily habits. Instead of simply tracking completed and missed tasks, HabitHero helps users create personalized plans, stay accountable, adapt tasks when life gets busy, and track their progress.

Built for **STRANGER BUILDS 2026 – Fetch.ai Track**.

---

## 💡 The Problem

Starting a new habit is easy. Staying consistent is difficult.

People often:
- Set goals but struggle to follow a daily routine.
- Lose motivation after missing a few days.
- Find fixed habit plans difficult to maintain.
- Track failures without knowing how to recover.

Traditional habit trackers mainly record progress. HabitHero focuses on helping users take the next step.

## ✨ What HabitHero Does

HabitHero works as an AI accountability companion that understands user goals and helps turn them into actionable tasks.

### Key Features

- **🎯 Personalized Goal Creation** – Describe a goal in natural language and let the AI create a structured habit plan.
- **📅 Daily Task Generation** – Break long-term goals into manageable daily actions.
- **🤖 AI Accountability Companion** – Chat with the agent to manage goals, tasks, and daily progress.
- **🔄 Adaptive Task Planning** – Ask the agent to adjust a task when your schedule or availability changes.
- **📊 Progress Tracking** – Track completed tasks, consistency, and streaks.
- **💬 Natural Language Interaction** – Manage your habits through conversational messages.
- **🔐 User Data Isolation** – Keep each user's goals, tasks, and conversations separate.

## 🧠 How It Works

1. **Set a goal** – Tell HabitHero what you want to achieve.
2. **Get a personalized plan** – The AI converts your goal into manageable daily tasks.
3. **Take action** – Complete tasks and record daily check-ins.
4. **Adapt when needed** – Ask HabitHero to adjust tasks based on your availability.
5. **Track progress** – Review your consistency and see how far you've progressed.

## 🌐 Fetch.ai Integration

Fetch.ai powers HabitHero's discoverable conversational agent experience.

The project uses:

- **uAgents** – Implements the HabitHero autonomous agent in Python.
- **Agentverse** – Registers and hosts the agent for discovery.
- **ASI:One** – Allows users to discover and interact with HabitHero through a conversational marketplace.
- **Fetch.ai Chat Protocol** – Enables structured communication between the agent and users.

Users can discover HabitHero on ASI:One, select the agent, and interact with it using natural language.

## 🏗️ System Architecture

```text
                 User
                  |
          +-------+--------+
          |                |
     HabitHero Web      ASI:One
          |                |
          |          Fetch.ai uAgent
          |                |
          +-------+--------+
                  |
             Node.js API
                  |
          Gemini AI + Tools
                  |
              MongoDB
```

### How the Components Work Together

| Component | Technology | Responsibility |
|---|---|---|
| Frontend | React, Vite, Tailwind CSS | User dashboard and interaction |
| Backend | Node.js, Express.js | APIs, authentication, and business logic |
| Database | MongoDB | User profiles, goals, tasks, and conversations |
| AI | Google Gemini | Goal understanding, planning, and tool selection |
| Agent | Python, uAgents | Fetch.ai agent communication |
| Agent Discovery | Agentverse | Agent registration and discoverability |
| Marketplace | ASI:One | Conversational access to HabitHero |
| Communication | Fetch.ai Chat Protocol | Structured agent messaging |

## 🛠️ Tech Stack

**Frontend**
- React
- Vite
- Tailwind CSS
- JavaScript / TypeScript

**Backend**
- Node.js
- Express.js
- MongoDB
- JWT Authentication
- Zod Validation

**AI & Agent Technology**
- Google Gemini API
- Gemini Function Calling
- Python
- Fetch.ai uAgents
- Fetch.ai Chat Protocol
- Agentverse
- ASI:One

## ⚙️ Getting Started

### Prerequisites

- Node.js and npm
- Python 3.12
- MongoDB
- Google Gemini API key

### 1. Clone the Repository

```bash
git clone https://github.com/manish23092003/habithero-agent.git
cd habithero-agent
```

### 2. Configure the Backend

```bash
cd backend
npm install
```

Create a `.env` file using the project's environment example and configure your MongoDB connection, JWT secret, Gemini API key, and agent authentication secret.

Start the backend:

```bash
npm run dev
```

### 3. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

### 4. Run the Fetch.ai Agent

Open another terminal:

```bash
cd habithero-agent
```

Create and activate a Python 3.12 virtual environment, then install dependencies:

```bash
python -m venv .venv
```

Activate it on Windows:

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure the agent environment variables using `.env.example`, then run:

```bash
python agent.py
```

> Keep API keys, database credentials, JWT secrets, and agent secrets in local environment files. Never commit them to GitHub.

## 🧪 Agent Capabilities

HabitHero uses AI function calling to perform meaningful actions rather than only generating conversational responses.

Some supported actions include:

- Create and manage goals.
- Generate daily tasks.
- Retrieve today's tasks.
- Complete tasks.
- Adapt existing tasks.
- Update habit plans.
- Record daily check-ins.
- Calculate progress summaries.

These actions are executed through backend tools and saved in MongoDB.

## 🎬 Demo Flow

Try HabitHero with a message like:

```text
Hi HabitHero! I want to learn Java for
30 minutes every day for 7 days.

Create a personalized goal and my
first daily task.
```

Then try:

```text
I am busy today and cannot study for
30 minutes. Can you reduce today's
pending task to 10 minutes?
```

HabitHero can create the goal, generate tasks, and adapt the requested task through its AI-powered tools.

## 🔮 Future Improvements

- Automated missed-habit detection and reminders.
- More personalized recovery strategies.
- Calendar integration.
- Voice-based accountability check-ins.
- Advanced habit analytics.
- More agent capabilities through the Fetch.ai ecosystem.

## 🏆 Hackathon

Built for **STRANGER BUILDS 2026 – Fetch.ai Track**.

The goal was to build an agent that users can discover and interact with through the Fetch.ai ecosystem, while solving a practical everyday problem.

## 👨‍💻 Author

**Manish Soni**

- GitHub: [@manish23092003](https://github.com/manish23092003)

---

**HabitHero – Small actions. Consistent progress. Real results.** 🚀