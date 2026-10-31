import { GoogleGenAI } from '@google/genai';
import { HABITHERO_SYSTEM_PROMPT } from './prompts.js';
import { HABITHERO_TOOLS } from './toolDefinitions.js';
import { ToolExecutor, ToolExecutionResult } from './toolExecutor.js';
import { ConversationService } from './conversationService.js';
import { ToolCallRecord, ToolResultRecord } from '../models/Message.js';

export interface ProcessMessageResult {
  reply: string;
  conversationId: string;
  toolsExecuted: ToolExecutionResult[];
  actionProposal?: any;
  apiKeyMissing?: boolean;
}

export class AIService {
  private static getClient(): { client: GoogleGenAI; model: string } | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
      return null;
    }
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    return {
      client: new GoogleGenAI({ apiKey: apiKey.trim() }),
      model,
    };
  }

  static isConfigured(): boolean {
    const apiKey = process.env.GEMINI_API_KEY;
    return Boolean(apiKey && apiKey.trim() !== '' && apiKey !== 'your_gemini_api_key_here');
  }

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

    // 2. Save user's message to MongoDB
    await ConversationService.addMessage({
      conversationId: convId,
      userId,
      sender: 'user',
      content: message,
    });

    // 3. Check Gemini API configuration
    const gemini = this.getClient();
    if (!gemini) {
      const guidanceMessage = 
        '⚠️ GEMINI_API_KEY is not configured on the HabitHero backend.\n\n' +
        'To activate full AI intelligence and automated tool reasoning:\n' +
        '1. Get a free API key at Google AI Studio: https://aistudio.google.com/\n' +
        '2. Add `GEMINI_API_KEY=your_key` to `backend/.env`\n' +
        '3. Restart the server.\n\n' +
        'All your habit roadmaps, daily action checklist, and MongoDB persistence remain fully operational!';

      const agentMsg = await ConversationService.addMessage({
        conversationId: convId,
        userId,
        sender: 'agent',
        content: guidanceMessage,
      });

      return {
        reply: agentMsg.content,
        conversationId: convId,
        toolsExecuted: [],
        apiKeyMissing: true,
      };
    }

    // 4. Retrieve recent message history from MongoDB for context
    const recentMessages = await ConversationService.getRecentHistory(convId, 8);

    // Build contents array for Gemini
    const contents: any[] = [];
    for (const msg of recentMessages) {
      if (msg.sender === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }],
        });
      } else if (msg.sender === 'agent') {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content }],
        });
      }
    }

    const executedTools: ToolExecutionResult[] = [];
    const toolCallsRecord: ToolCallRecord[] = [];
    const toolResultsRecord: ToolResultRecord[] = [];
    let latestActionProposal: any = undefined;

    let finalReply = '';
    let iterations = 0;
    const maxIterations = 5;

    try {
      while (iterations < maxIterations) {
        iterations++;

        const response: any = await gemini.client.models.generateContent({
          model: gemini.model,
          contents,
          config: {
            systemInstruction: HABITHERO_SYSTEM_PROMPT,
            tools: [{ functionDeclarations: HABITHERO_TOOLS as any }],
          },
        });

        // Check if candidate parts have function calls
        const candidate = response.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const functionCalls = parts
          .filter((p: any) => p.functionCall)
          .map((p: any) => p.functionCall);

        // If no function calls, extract text and complete
        if (!functionCalls || functionCalls.length === 0) {
          finalReply = parts.map((p: any) => p.text || '').join('\n').trim();
          break;
        }

        // Add the model's turn (with functionCalls) into contents history
        contents.push({
          role: 'model',
          parts,
        });

        // Execute each function call securely through backend ToolExecutor
        const functionResponseParts: any[] = [];

        for (const call of functionCalls) {
          const toolName = call.name;
          const toolArgs = call.args || {};

          toolCallsRecord.push({
            name: toolName,
            args: toolArgs,
          });

          // ToolExecutor validates ownership and executes against MongoDB models
          const result = await ToolExecutor.execute(userId, toolName, toolArgs);
          executedTools.push(result);

          if (result.uiActionProposal) {
            latestActionProposal = result.uiActionProposal;
          }

          toolResultsRecord.push({
            name: toolName,
            result: result.data || { error: result.error },
          });

          functionResponseParts.push({
            functionResponse: {
              name: toolName,
              response: {
                success: result.success,
                data: result.data,
                error: result.error,
              },
            },
          });
        }

        // Provide function responses back to Gemini for final natural language generation
        contents.push({
          role: 'user',
          parts: functionResponseParts,
        });
      }

      if (!finalReply) {
        finalReply = 'I have processed your request and updated your HabitHero plan in MongoDB.';
      }
    } catch (apiErr: any) {
      console.error('[AIService] Gemini API error:', apiErr.message);
      finalReply = `I encountered an issue connecting to Gemini: ${apiErr.message}. Your data remains safely saved in MongoDB.`;
    }

    // 5. Persist agent response with tool calls and results to MongoDB
    await ConversationService.addMessage({
      conversationId: convId,
      userId,
      sender: 'agent',
      content: finalReply,
      toolCalls: toolCallsRecord.length > 0 ? toolCallsRecord : undefined,
      toolResults: toolResultsRecord.length > 0 ? toolResultsRecord : undefined,
      actionProposal: latestActionProposal,
    });

    return {
      reply: finalReply,
      conversationId: convId,
      toolsExecuted: executedTools,
      actionProposal: latestActionProposal,
    };
  }
}

