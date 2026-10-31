import { Types } from 'mongoose';
import { Conversation, ConversationDocument } from '../models/Conversation.js';
import { Message, MessageDocument, ToolCallRecord, ToolResultRecord } from '../models/Message.js';

export class ConversationService {
  static async getOrCreateActiveConversation(userId: string, title?: string): Promise<ConversationDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID format');
    }

    const uId = new Types.ObjectId(userId);
    let conv = await Conversation.findOne({ userId: uId }).sort({ updatedAt: -1 });

    if (!conv) {
      conv = await Conversation.create({
        userId: uId,
        title: title || 'Habit Accountability Session',
      });
    }

    return conv;
  }

  static async getConversations(userId: string): Promise<ConversationDocument[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID format');
    }
    return Conversation.find({ userId: new Types.ObjectId(userId) }).sort({ updatedAt: -1 });
  }

  static async getConversationWithMessages(userId: string, conversationId: string): Promise<{
    conversation: ConversationDocument;
    messages: MessageDocument[];
  }> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(conversationId)) {
      throw new Error('Invalid ID format');
    }

    const conv = await Conversation.findOne({
      _id: new Types.ObjectId(conversationId),
      userId: new Types.ObjectId(userId),
    });

    if (!conv) {
      throw new Error('Conversation not found or access denied');
    }

    const messages = await Message.find({ conversationId: conv._id }).sort({ createdAt: 1 });

    return {
      conversation: conv,
      messages,
    };
  }

  static async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(conversationId)) {
      throw new Error('Invalid ID format');
    }

    const conv = await Conversation.findOneAndDelete({
      _id: new Types.ObjectId(conversationId),
      userId: new Types.ObjectId(userId),
    });

    if (!conv) {
      throw new Error('Conversation not found or access denied');
    }

    await Message.deleteMany({ conversationId: conv._id });
    return true;
  }

  static async addMessage(params: {
    conversationId: string;
    userId: string;
    sender: 'user' | 'agent' | 'system';
    content: string;
    toolCalls?: ToolCallRecord[];
    toolResults?: ToolResultRecord[];
    actionProposal?: any;
  }): Promise<MessageDocument> {
    const msg = await Message.create({
      conversationId: new Types.ObjectId(params.conversationId),
      userId: new Types.ObjectId(params.userId),
      sender: params.sender,
      content: params.content,
      toolCalls: params.toolCalls,
      toolResults: params.toolResults,
      actionProposal: params.actionProposal,
    });

    // Bump conversation updatedAt
    await Conversation.findByIdAndUpdate(params.conversationId, {
      $set: { updatedAt: new Date() },
    });

    return msg;
  }

  static async getRecentHistory(conversationId: string, limit: number = 10): Promise<MessageDocument[]> {
    return Message.find({ conversationId: new Types.ObjectId(conversationId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .then(msgs => msgs.reverse());
  }
}
