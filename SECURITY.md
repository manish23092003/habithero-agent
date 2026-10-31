# Security Policy

Security and user privacy are foundational pillars of HabitHero. This project handles personal habit commitments, user reflections, and conversational AI interactions across web and decentralized agent networks.

---

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

---

## Reporting a Vulnerability

If you discover a security vulnerability or credential leak within HabitHero, please report it privately:

* **Contact**: Manish Soni
* **Email**: [manishsoni135790@gmail.com](mailto:manishsoni135790@gmail.com)
* **Response SLA**: Within 48 hours

Please include:
1. Description of the vulnerability or security flaw.
2. Steps to reproduce or proof-of-concept payload.
3. Potential impact on user data isolation or system integrity.

**Please do not open public GitHub issues for sensitive security vulnerabilities.**

---

## Security Architecture & Best Practices

1. **Multi-Tenant Data Isolation**:
   * Every MongoDB query and AI tool execution enforces explicit ownership checks (`userId: req.user.id`).
   * Fetch.ai agent senders (`agent1q...`) are mapped to isolated user records in MongoDB; users cannot access or mutate another sender's goals, tasks, or conversations.
2. **Zero-Secret Commit Policy**:
   * All `.env`, `*.agent.key`, `*.seed`, and local database files are excluded via `.gitignore`.
   * Template `.env.example` files contain strictly safe placeholder values.
   * Continuous GitHub Secret Scanning and Push Protection are enabled.
3. **Authentication & Token Lifecycle**:
   * Passwords hashed using `bcryptjs` with salt rounds >= 10.
   * JWT tokens signed with dedicated secrets and verified on all protected API routes. Expired and tampered tokens return `401 Unauthorized` and are cleared by the client.
4. **Agent-to-Backend Security**:
   * Internal communication between the Python uAgent and Node.js backend requires a dedicated service secret passed via the `x-agent-secret` header.
