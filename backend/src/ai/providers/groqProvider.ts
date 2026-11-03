import Groq from 'groq-sdk';
import { HABITHERO_SYSTEM_PROMPT } from '../prompts.js';
import { GROQ_HABITHERO_TOOLS } from '../toolDefinitions.js';
import { ToolExecutor, ToolExecutionResult } from '../toolExecutor.js';
import { ToolCallRecord, ToolResultRecord } from '../../models/Message.js';
import { IAIProvider, GenerateResponseParams, ProviderResponse } from '../types.js';

/**
 * Executes a Groq chat completion with exponential backoff and jitter for transient errors (5xx, network timeouts).
 * Rate limit (429) and authentication (401) errors fail fast without redundant retry hammering.
 */
async function callChatCompletionWithRetry(
  groqClient: Groq,
  payload: any,
  maxRetries: number = 2
): Promise<Groq.Chat.Completions.ChatCompletion> {
  let attempt = 0;
  while (true) {
    try {
      return await groqClient.chat.completions.create(payload);
    } catch (err: any) {
      attempt++;
      const isTransient =
        err instanceof Groq.APIConnectionError ||
        err instanceof Groq.APIConnectionTimeoutError ||
        err instanceof Groq.InternalServerError ||
        (err.status >= 500 && err.status < 600);

      if (!isTransient || attempt > maxRetries) {
        throw err;
      }

      const baseDelay = 400 * Math.pow(2, attempt - 1);
      const jitter = Math.floor(Math.random() * 300);
      const totalDelay = baseDelay + jitter;
      console.warn(`[GroqProvider] Transient API error (${err.message}). Retrying attempt ${attempt}/${maxRetries} after ${totalDelay}ms...`);
      await new Promise((res) => setTimeout(res, totalDelay));
    }
  }
}

export class GroqProvider implements IAIProvider {
  readonly name = 'groq';
  public clientOverride?: Groq;

  private getClient(): { client: Groq; model: string } | null {
    if (this.clientOverride) {
      return {
        client: this.clientOverride,
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      };
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your_groq_api_key_here') {
      return null;
    }
    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    return {
      client: new Groq({ apiKey: apiKey.trim(), timeout: 15000 }),
      model,
    };
  }

  isConfigured(): boolean {
    if (this.clientOverride) return true;
    const apiKey = process.env.GROQ_API_KEY;
    return Boolean(apiKey && apiKey.trim() !== '' && apiKey !== 'your_groq_api_key_here');
  }

  async generateResponse(params: GenerateResponseParams): Promise<ProviderResponse> {
    const { userId, recentMessages } = params;

    if (process.env.MOCK_AI_RESPONSE === 'true') {
      return {
        reply: `Mocked AI: Keep building your daily momentum on "${params.message.slice(0, 30)}"! You are on track today.`,
        toolsExecuted: [],
        toolCallsRecord: [],
        toolResultsRecord: [],
        apiKeyMissing: false,
      };
    }

    const groq = this.getClient();

    if (!groq) {
      const guidanceMessage =
        '⚠️ GROQ_API_KEY is not configured on the HabitHero backend.\n\n' +
        'To activate full AI intelligence and automated tool reasoning with Groq (Free Tier):\n' +
        '1. Get a free API key at Groq Console: https://console.groq.com/keys\n' +
        '2. Add `GROQ_API_KEY=your_key_here` to `backend/.env`\n' +
        '3. Restart the server.\n\n' +
        'All your habit roadmaps, daily action checklist, and MongoDB persistence remain fully operational!';

      return {
        reply: guidanceMessage,
        toolsExecuted: [],
        toolCallsRecord: [],
        toolResultsRecord: [],
        apiKeyMissing: true,
      };
    }

    // Convert recent messages into Groq chat completion messages
    const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: HABITHERO_SYSTEM_PROMPT,
      },
    ];

    for (const msg of recentMessages) {
      if (msg.sender === 'user') {
        messages.push({
          role: 'user',
          content: msg.content,
        });
      } else if (msg.sender === 'agent') {
        messages.push({
          role: 'assistant',
          content: msg.content,
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

        // Call Groq API with sequential tool calling enforced and transient retries
        const completion = await callChatCompletionWithRetry(groq.client, {
          model: groq.model,
          messages,
          tools: GROQ_HABITHERO_TOOLS as any,
          tool_choice: 'auto',
          parallel_tool_calls: false, // Enforce sequential execution for GPT-OSS 120B
          max_completion_tokens: 1024, // Preferred over deprecated max_tokens for modern reasoning models
          reasoning_format: 'hidden', // Keeps thought stream internal so final reply is clean natural language
          temperature: 0.6,
        });

        const choice = completion.choices?.[0];
        const message = choice?.message;

        if (!message) {
          throw new Error('Groq returned an empty response choice.');
        }

        const toolCalls = message.tool_calls;

        // If no tool calls requested, we have the final natural language answer
        if (!toolCalls || toolCalls.length === 0) {
          finalReply = message.content || '';
          break;
        }

        // Add the assistant's turn (containing the tool calls) to the conversation history
        messages.push({
          role: 'assistant',
          content: message.content || null,
          tool_calls: toolCalls,
        });

        // Execute each requested tool call sequentially
        for (const call of toolCalls) {
          if (call.type !== 'function') continue;

          const toolName = call.function.name;
          let toolArgs: Record<string, any> = {};

          try {
            toolArgs = call.function.arguments ? JSON.parse(call.function.arguments) : {};
          } catch {
            toolArgs = {};
          }

          toolCallsRecord.push({
            name: toolName,
            args: toolArgs,
          });

          // Execute tool securely against authenticated user context in MongoDB
          const result = await ToolExecutor.execute(userId, toolName, toolArgs);
          executedTools.push(result);

          if (result.uiActionProposal) {
            latestActionProposal = result.uiActionProposal;
          }

          toolResultsRecord.push({
            name: toolName,
            result: result.data || { error: result.error },
          });

          // Return tool result to Groq
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify({
              success: result.success,
              data: result.data,
              error: result.error,
            }),
          });
        }
      }

      if (!finalReply) {
        finalReply = 'I have processed your request and updated your HabitHero plan in MongoDB.';
      }
    } catch (err: any) {
      if (err instanceof Groq.RateLimitError || err.status === 429) {
        const retryAfter =
          (typeof err.headers?.get === 'function' ? err.headers.get('retry-after') : err.headers?.['retry-after']) ||
          'a few moments';
        console.error('[GroqProvider] Rate limit exceeded (429). Retry after:', retryAfter);
        finalReply = `Groq rate limit reached on Free Tier. Please retry in ${retryAfter}, or check your plan details at https://console.groq.com/`;
      } else if (err instanceof Groq.AuthenticationError || err.status === 401) {
        console.error('[GroqProvider] Invalid GROQ_API_KEY (401)');
        finalReply = 'The configured GROQ_API_KEY is invalid or expired. Please check your key at https://console.groq.com/keys and update backend/.env.';
      } else if (err instanceof Groq.APIConnectionError || err instanceof Groq.APIConnectionTimeoutError) {
        console.error('[GroqProvider] Network connection error:', err.message);
        finalReply = 'Unable to reach Groq API. Please verify network connectivity. Your data remains safely stored in MongoDB.';
      } else {
        console.error('[GroqProvider] Groq API error:', err.message);
        finalReply = `I encountered an issue connecting to Groq: ${err.message}. Your data remains safely saved in MongoDB.`;
      }
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
