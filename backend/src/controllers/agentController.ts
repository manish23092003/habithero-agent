import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { AIService } from '../ai/aiService.js';

export class AgentController {
  static async handleChatMessage(req: Request, res: Response): Promise<void> {
    try {
      const secret = req.headers['x-agent-secret'];
      const expectedSecret = process.env.AGENT_SERVICE_SECRET || 'habithero_internal_secret_hackathon_2026';

      if (!secret || secret !== expectedSecret) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: Invalid agent service secret',
        });
        return;
      }

      const { sender, message, conversationId } = req.body;

      if (!sender || typeof sender !== 'string' || sender.trim() === '') {
        res.status(400).json({
          success: false,
          error: 'Sender address is required',
        });
        return;
      }

      if (!message || typeof message !== 'string' || message.trim() === '') {
        res.status(400).json({
          success: false,
          error: 'Message content is required',
        });
        return;
      }

      const trimmedSender = sender.trim();
      const trimmedMessage = message.trim();

      // Find existing user mapped to this Fetch.ai agent address or provision a new isolated user
      let user = await User.findOne({ fetchAddress: trimmedSender });
      if (!user) {
        const shortAddress = trimmedSender.length > 8 ? trimmedSender.slice(-6) : trimmedSender;
        const randomPasswordHash = crypto.randomBytes(32).toString('hex');
        
        user = await User.create({
          name: `ASI User ${shortAddress}`,
          email: `${trimmedSender.toLowerCase()}@fetchai.agent`,
          fetchAddress: trimmedSender,
          passwordHash: randomPasswordHash,
        });
      }

      // Process message through HabitHero AI Service (tools, MongoDB isolation, prompts)
      const result = await AIService.processUserMessage({
        userId: user._id.toString(),
        message: trimmedMessage,
        conversationId,
      });

      res.status(200).json({
        success: true,
        data: {
          reply: result.reply,
          conversationId: result.conversationId,
          toolsExecuted: result.toolsExecuted,
          actionProposal: result.actionProposal,
          sender: trimmedSender,
          userId: user._id.toString(),
        },
      });
    } catch (error: any) {
      console.error('[AgentController] Error handling agent message:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal agent message processing error',
      });
    }
  }
}
