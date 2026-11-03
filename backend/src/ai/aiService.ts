import { ConversationService } from './conversationService.js';
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
    const conversation = params.conversationId
      ? (await ConversationService.getConversationWithMessages(userId, params.conversationId)).conversation
      : await ConversationService.getOrCreateActiveConversation(userId);

    const convId = conversation._id.toString();

    // 2. Save user's incoming message to MongoDB
    await ConversationService.addMessage({
      conversationId: convId,
      userId,
      sender: 'user',
      content: message,
    });

    // 3. Select active provider
    const primaryProvider = this.getActiveProvider();

    // 4. Retrieve recent message history from MongoDB for context (limited to 8 messages to optimize tokens)
    const recentMessages = await ConversationService.getRecentHistory(convId, 8);

    // 5. Generate response and execute tools through the provider
    let response = await primaryProvider.generateResponse({
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

    // 6. Persist agent response with executed tool calls and results to MongoDB
    await ConversationService.addMessage({
      conversationId: convId,
      userId,
      sender: 'agent',
      content: response.reply,
      toolCalls: response.toolCallsRecord.length > 0 ? response.toolCallsRecord : undefined,
      toolResults: response.toolResultsRecord.length > 0 ? response.toolResultsRecord : undefined,
      actionProposal: response.actionProposal,
    });

    return {
      reply: response.reply,
      conversationId: convId,
      toolsExecuted: response.toolsExecuted,
      actionProposal: response.actionProposal,
      apiKeyMissing: response.apiKeyMissing,
    };
  }
}
