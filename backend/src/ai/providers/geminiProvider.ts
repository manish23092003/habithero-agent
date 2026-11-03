import { GoogleGenAI } from '@google/genai';
import { HABITHERO_SYSTEM_PROMPT } from '../prompts.js';
import { HABITHERO_TOOLS } from '../toolDefinitions.js';
import { ToolExecutor, ToolExecutionResult } from '../toolExecutor.js';
import { ToolCallRecord, ToolResultRecord } from '../../models/Message.js';
import { IAIProvider, GenerateResponseParams, ProviderResponse } from '../types.js';

export class GeminiProvider implements IAIProvider {
  readonly name = 'gemini';

  private getClient(): { client: GoogleGenAI; model: string } | null {
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

  isConfigured(): boolean {
    const apiKey = process.env.GEMINI_API_KEY;
    return Boolean(apiKey && apiKey.trim() !== '' && apiKey !== 'your_gemini_api_key_here');
  }

  async generateResponse(params: GenerateResponseParams): Promise<ProviderResponse> {
    const { userId, recentMessages } = params;
    const gemini = this.getClient();

    if (!gemini) {
      return {
        reply:
          '⚠️ GEMINI_API_KEY is not configured on the HabitHero backend.\n\n' +
          'To activate Gemini intelligence:\n' +
          '1. Get a free API key at Google AI Studio: https://aistudio.google.com/\n' +
          '2. Add `GEMINI_API_KEY=your_key` to `backend/.env`\n' +
          '3. Restart the server.',
        toolsExecuted: [],
        toolCallsRecord: [],
        toolResultsRecord: [],
        apiKeyMissing: true,
      };
    }

    // Build Gemini contents array
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

        const candidate = response.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const functionCalls = parts
          .filter((p: any) => p.functionCall)
          .map((p: any) => p.functionCall);

        if (!functionCalls || functionCalls.length === 0) {
          finalReply = parts.map((p: any) => p.text || '').join('\n').trim();
          break;
        }

        contents.push({
          role: 'model',
          parts,
        });

        const functionResponseParts: any[] = [];

        for (const call of functionCalls) {
          const toolName = call.name;
          const toolArgs = call.args || {};

          toolCallsRecord.push({
            name: toolName,
            args: toolArgs,
          });

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

        contents.push({
          role: 'user',
          parts: functionResponseParts,
        });
      }

      if (!finalReply) {
        finalReply = 'I have processed your request and updated your HabitHero plan in MongoDB.';
      }
    } catch (apiErr: any) {
      console.error('[GeminiProvider] Gemini API error:', apiErr.message);
      finalReply = `I encountered an issue connecting to Gemini: ${apiErr.message}. Your data remains safely saved in MongoDB.`;
    }

    return {
      reply: finalReply,
      toolsExecuted: executedTools,
      toolCallsRecord,
      toolResultsRecord,
      actionProposal: latestActionProposal,
    };
  }
}

