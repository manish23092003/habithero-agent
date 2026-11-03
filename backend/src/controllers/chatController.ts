import { Response } from 'express';
import { AIService } from '../ai/aiService.js';
import { ConversationService } from '../ai/conversationService.js';
import { AIQuotaGuard } from '../middleware/aiQuotaGuard.js';
import { AuthenticatedRequest } from '../types/index.js';

export class ChatController {
  static async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { message, conversationId } = req.body;
    if (!message || typeof message !== 'string' || message.trim() === '') {
      res.status(400).json({ success: false, error: 'Message text is required' });
      return;
    }

    // 1. Check per-user rate limit quota
    const quotaCheck = AIQuotaGuard.checkRateLimit(userId);
    if (!quotaCheck.allowed) {
      res.status(429).json({
        success: false,
        code: 'AI_RATE_LIMIT_EXCEEDED',
        error: `AI request rate limit reached (${AIQuotaGuard.MAX_REQUESTS_PER_MINUTE} requests/minute). Please wait ${quotaCheck.retryAfterSeconds}s before sending another prompt.`,
        retryAfter: quotaCheck.retryAfterSeconds,
      });
      return;
    }

    // 2. Concurrency guard: prevent duplicate requests from rapid repeated button clicks
    const acquiredLock = AIQuotaGuard.acquireLock(userId);
    if (!acquiredLock) {
      res.status(429).json({
        success: false,
        code: 'AI_REQUEST_IN_FLIGHT',
        error: 'An AI request is already being processed for your account. Please wait for it to complete.',
      });
      return;
    }

    try {
      const result = await AIService.processUserMessage({
        userId,
        message: message.trim(),
        conversationId,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[ChatController] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to process chat message',
      });
    } finally {
      // Always release in-flight lock for this user
      AIQuotaGuard.releaseLock(userId);
    }
  }

  static async getConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const conversations = await ConversationService.getConversations(req.user.id);
      res.status(200).json({
        success: true,
        data: conversations,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch conversations',
      });
    }
  }

  static async getConversationById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const conversationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await ConversationService.getConversationWithMessages(req.user.id, conversationId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        error: error.message || 'Conversation not found',
      });
    }
  }

  static async deleteConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const conversationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await ConversationService.deleteConversation(req.user.id, conversationId);

      res.status(200).json({
        success: true,
        message: 'Conversation successfully deleted',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to delete conversation',
      });
    }
  }
}
