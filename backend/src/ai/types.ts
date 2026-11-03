import { ToolExecutionResult } from './toolExecutor.js';
import { ToolCallRecord, ToolResultRecord } from '../models/Message.js';

export type AIProviderType = 'groq' | 'gemini';

export interface ProcessMessageResult {
  reply: string;
  conversationId: string;
  toolsExecuted: ToolExecutionResult[];
  actionProposal?: any;
  apiKeyMissing?: boolean;
}

export interface GenerateResponseParams {
  userId: string;
  message: string;
  conversationId: string;
  recentMessages: Array<{
    sender: 'user' | 'agent' | 'system';
    content: string;
  }>;
}

export interface ProviderResponse {
  reply: string;
  toolsExecuted: ToolExecutionResult[];
  toolCallsRecord: ToolCallRecord[];
  toolResultsRecord: ToolResultRecord[];
  actionProposal?: any;
  apiKeyMissing?: boolean;
}

export interface IAIProvider {
  readonly name: AIProviderType;
  isConfigured(): boolean;
  generateResponse(params: GenerateResponseParams): Promise<ProviderResponse>;
}

