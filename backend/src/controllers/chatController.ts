import { Response } from 'express';
import { AIService } from '../ai/aiService.js';
import { ConversationService } from '../ai/conversationService.js';
import { AuthenticatedRequest } from '../types/index.js';

export class ChatController {
  static async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { message, conversationId } = req.body;
      if (!message || typeof message !== 'string' || message.trim() === '') {
        res.status(400).json({ success: false, error: 'Message text is required' });
        return;
      }

      const result = await AIService.processUserMessage({
        userId: req.user.id,
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
