import { ConversationService } from './conversationService.js';
import { Conversation } from '../models/Conversation.js';
import { IAIProvider, ProcessMessageResult } from './types.js';
import { GroqProvider } from './providers/groqProvider.js';
import { GeminiProvider } from './providers/geminiProvider.js';

export type { ProcessMessageResult };

export class AIService {
  private static groqProvider: GroqProvider = new GroqProvider();
  private static geminiProvider: GeminiProvider = new GeminiProvider();

  /**
   * Determine the configured AI provider ('groq' by default, or 'gemini')
   */
  static getActiveProvider(): IAIProvider {
    const providerChoice = (process.env.AI_PROVIDER || 'groq').toLowerCase().trim();
    if (providerChoice === 'gemini') {
      return this.geminiProvider;
    }
    return this.groqProvider;
  }

  /**
   * Check whether the active provider has valid credentials configured
   */
  static isConfigured(): boolean {
    return this.getActiveProvider().isConfigured();
  }

  /**
   * Process incoming user message, orchestrate tool calling, persist to MongoDB
   */
  static async processUserMessage(params: {
    userId: string;
    message: string;
    conversationId?: string;
  }): Promise<ProcessMessageResult> {
    const { userId, message } = params;

    // 1. Get or create active conversation
    const isNewRequested = params.conversationId === 'new';
    const conversation = isNewRequested
      ? await ConversationService.createConversation(userId)
      : params.conversationId
        ? (await ConversationService.getConversationWithMessages(userId, params.conversationId)).conversation
        : await ConversationService.getOrCreateActiveConversation(userId);

    const convId = conversation._id.toString();

    // 2. Automatically generate a concise, human-readable title from the first message
    if (conversation.title === 'Habit Accountability Session' || conversation.title === 'New Conversation') {
      const trimmedTitle = message.length > 50 ? message.slice(0, 47).trim() + '...' : message.trim();
      if (trimmedTitle) {
        await Conversation.findByIdAndUpdate(conversation._id, { $set: { title: trimmedTitle } });
      }
    }

    // 3. Save user's incoming message to MongoDB
    await ConversationService.addMessage({
      conversationId: convId,
      userId,
      sender: 'user',
      content: message,
    });

    // 4. Select active provider
    const primaryProvider = this.getActiveProvider();

    // 5. Retrieve recent message history from MongoDB for context (limited to 8 messages to optimize tokens)
    const recentMessages = await ConversationService.getRecentHistory(convId, 8);

    // 6. Generate response and execute tools through the provider with fault-tolerant recovery
    let response: any;
    try {
      response = await primaryProvider.generateResponse({
        userId,
        message,
        conversationId: convId,
        recentMessages: recentMessages.map(m => ({
          sender: m.sender,
          content: m.content,
        })),
      });

      // Optional Gemini Fallback (Strictly disabled by default, only activated if ENABLE_GEMINI_FALLBACK === 'true')
      const enableFallback = process.env.ENABLE_GEMINI_FALLBACK === 'true';
      if (
        enableFallback &&
        primaryProvider.name === 'groq' &&
        response.toolsExecuted.length === 0 &&
        (response.apiKeyMissing || response.reply.includes('issue connecting to Groq') || response.reply.includes('rate limit')) &&
        this.geminiProvider.isConfigured()
      ) {
        console.log('[AIService] Groq failed or unconfigured; falling back to Gemini provider...');
        const fallbackResponse = await this.geminiProvider.generateResponse({
          userId,
          message,
          conversationId: convId,
          recentMessages: recentMessages.map(m => ({
            sender: m.sender,
            content: m.content,
          })),
        });

        if (fallbackResponse.reply) {
          response = fallbackResponse;
        }
      }
    } catch (providerError: any) {
      console.error('[AIService] Provider error during generateResponse:', providerError);
      response = {
        reply: 'I encountered a temporary connection issue while processing your request. Your habit records are safe, please feel free to try again.',
        toolsExecuted: [],
        toolCallsRecord: [],
        toolResultsRecord: [],
        actionProposal: undefined,
        apiKeyMissing: false,
      };
    }

    // 7. Persist agent response with executed tool calls and results to MongoDB
    await ConversationService.addMessage({
      conversationId: convId,
      userId,
      sender: 'agent',
      content: response.reply,
      toolCalls: response.toolCallsRecord && response.toolCallsRecord.length > 0 ? response.toolCallsRecord : undefined,
      toolResults: response.toolResultsRecord && response.toolResultsRecord.length > 0 ? response.toolResultsRecord : undefined,
      actionProposal: response.actionProposal,
    });

    return {
      reply: response.reply,
      conversationId: convId,
      toolsExecuted: response.toolsExecuted || [],
      actionProposal: response.actionProposal,
      apiKeyMissing: response.apiKeyMissing,
    };
  }
}
