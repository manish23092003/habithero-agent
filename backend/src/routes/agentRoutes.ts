import { Router } from 'express';
import { AgentController } from '../controllers/agentController.js';

const router = Router();

// Internal service-to-service endpoint for Python Fetch.ai uAgent
router.post('/chat', AgentController.handleChatMessage);

export default router;

