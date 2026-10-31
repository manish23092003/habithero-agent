import { Router } from 'express';
import { ChatController } from '../controllers/chatController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Protect all chat endpoints with JWT authentication middleware
router.use(authenticateToken);

router.post('/message', ChatController.sendMessage);
router.get('/conversations', ChatController.getConversations);
router.get('/conversations/:id', ChatController.getConversationById);
router.delete('/conversations/:id', ChatController.deleteConversation);

export default router;
