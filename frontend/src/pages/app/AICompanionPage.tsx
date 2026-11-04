import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  ArrowRight,
  Plus,
  MessageSquare,
  AlertCircle,
  Zap,
  Trash2,
  Menu,
  X,
  RotateCcw,
} from 'lucide-react';
import { api } from '../../services/api';
import { AgentMessage, ActionProposal } from '../../types';

const STARTER_PROMPTS = [
  'What should I focus on today?',
  'I have less time today. Can you adjust my plan?',
  "Show me how I'm progressing.",
  "I completed yesterday's session. What's next?",
];

const formatToolAction = (toolName?: string) => {
  if (!toolName || typeof toolName !== 'string') {
    return 'Action completed';
  }
  switch (toolName) {
    case 'get_today_tasks':
      return "Checked today's tasks";
    case 'adapt_habit_plan':
      return 'Adjusted task duration';
    case 'create_tasks':
      return 'Added new task';
    case 'update_task_status':
      return 'Updated task status';
    case 'create_goal':
      return 'Created habit plan';
    case 'complete_task':
      return 'Completed task';
    case 'update_goal':
      return 'Updated habit plan';
    case 'record_checkin':
      return 'Recorded check-in';
    case 'get_progress_summary':
      return 'Checked progress';
    default:
      try {
        return toolName.replace(/_/g, ' ');
      } catch {
        return 'Action completed';
      }
  }
};

const formatMessageTimestamp = (createdAt?: string | Date) => {
  if (!createdAt) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  try {
    const d = new Date(createdAt);
    return isNaN(d.getTime())
      ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
};

export const AICompanionPage: React.FC = () => {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [activeHistoryRetryId, setActiveHistoryRetryId] = useState<string | undefined>();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [conversations, setConversations] = useState<any[]>([]);
  const [mobileConversationsOpen, setMobileConversationsOpen] = useState(false);
  const [failedPromptToRetry, setFailedPromptToRetry] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const mapBackendMessages = (rawMessages: any[]): AgentMessage[] => {
    if (!Array.isArray(rawMessages)) return [];
    return rawMessages
      .filter(m => Boolean(m && typeof m === 'object'))
      .map(m => {
        // Robustly normalize tool executions across MongoDB toolCalls ({name, args}) and runtime toolExecutions ({tool, data})
        let toolExecutions: Array<{ tool: string; success: boolean; data?: any; error?: string }> | undefined = undefined;

        if (Array.isArray(m.toolCalls) && m.toolCalls.length > 0) {
          toolExecutions = m.toolCalls
            .filter((tc: any) => Boolean(tc))
            .map((tc: any) => ({
              tool:
                typeof tc === 'object'
                  ? typeof tc.name === 'string' && tc.name.trim()
                    ? tc.name.trim()
                    : typeof tc.tool === 'string' && tc.tool.trim()
                    ? tc.tool.trim()
                    : 'Action'
                  : String(tc || 'Action'),
              success: true,
              data: tc && typeof tc === 'object' ? tc.args || tc.result || tc.data : undefined,
            }));
        } else if (Array.isArray(m.toolExecutions) && m.toolExecutions.length > 0) {
          toolExecutions = m.toolExecutions
            .filter((tc: any) => Boolean(tc))
            .map((tc: any) => ({
              tool:
                typeof tc === 'object'
                  ? typeof tc.tool === 'string' && tc.tool.trim()
                    ? tc.tool.trim()
                    : typeof tc.name === 'string' && tc.name.trim()
                    ? tc.name.trim()
                    : 'Action'
                  : String(tc || 'Action'),
              success: tc && typeof tc === 'object' ? tc.success !== false : true,
              data: tc && typeof tc === 'object' ? tc.data || tc.args : undefined,
              error: tc && typeof tc === 'object' && typeof tc.error === 'string' ? tc.error : undefined,
            }));
        }

        return {
          id: m._id || m.id || `msg-${Date.now()}-${Math.random()}`,
          sender: (m.sender as 'user' | 'agent' | 'system') || 'agent',
          content: typeof m.content === 'string' ? m.content : String(m.content || ''),
          timestamp: formatMessageTimestamp(m.createdAt || m.timestamp),
          toolExecutions,
          actionProposal: m.actionProposal && typeof m.actionProposal === 'object' ? m.actionProposal : undefined,
          protocolMetadata: {
            protocol: 'fetchai_chat_v1',
            agentAddress: 'agent1qgp9m8h4z9e5vy4z7j6v2s8k1l0w9x8p7q6r5t4',
            verifiedOnAsi1: true,
          },
        };
      });
  };

  const loadInitialChat = useCallback(async (targetConvId?: string) => {
    setLoadingHistory(true);
    setHistoryError(null);
    setActiveHistoryRetryId(targetConvId);
    try {
      const convos = await api.getChatConversations();
      const safeConvos = Array.isArray(convos) ? convos : [];
      setConversations(safeConvos);

      if (safeConvos.length > 0) {
        const selectedId =
          targetConvId && safeConvos.some(c => (c._id || c.id) === targetConvId)
            ? targetConvId
            : safeConvos[0]._id || safeConvos[0].id;

        if (selectedId) {
          setActiveHistoryRetryId(selectedId);
          const data = await api.getChatConversation(selectedId);
          setConversationId(selectedId);

          if (data && Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages(mapBackendMessages(data.messages));
          } else {
            setMessages([
              {
                id: `welcome-${selectedId}`,
                sender: 'agent',
                content:
                  "Hey! Welcome back. How are you feeling today? Let's make steady progress towards your goals.",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
          }
          setActiveHistoryRetryId(undefined);
        } else {
          setConversationId(undefined);
          setMessages([
            {
              id: 'welcome-fresh',
              sender: 'agent',
              content:
                "Hey! Welcome to HabitHero Coach. I'm here to help you build habits, plan your daily tasks, and adapt your schedule when life gets busy. What habit or goal would you like to tackle today?",
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      } else {
        // Genuine empty conversation list: safeConvos is empty array from database
        setConversationId(undefined);
        setMessages([
          {
            id: 'welcome-fresh',
            sender: 'agent',
            content:
              "Hey! Welcome to HabitHero Coach. I'm here to help you build habits, plan your daily tasks, and adapt your schedule when life gets busy. What habit or goal would you like to tackle today?",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err: any) {
      console.error('[AICompanionPage] Failed to load chat history:', err);
      setHistoryError(err.message || 'Unable to connect to the database to load your conversations.');
      // Do NOT discard existing conversations or messages on network failure
      setMessages(prev =>
        prev.length > 0
          ? prev
          : [
              {
                id: 'welcome-fallback',
                sender: 'agent',
                content:
                  'Welcome to HabitHero Coach! We had a temporary hiccup loading previous conversations, but you can retry above or send a message below.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]
      );
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadInitialChat();
  }, [loadInitialChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSelectConversation = async (id: string) => {
    if (!id || id === conversationId || loading) return;
    setLoadingHistory(true);
    setHistoryError(null);
    setActiveHistoryRetryId(id);
    setMobileConversationsOpen(false);
    setFailedPromptToRetry(null);
    try {
      const data = await api.getChatConversation(id);
      setConversationId(id);
      if (data && Array.isArray(data.messages) && data.messages.length > 0) {
        setMessages(mapBackendMessages(data.messages));
      } else {
        setMessages([
          {
            id: `welcome-${id}`,
            sender: 'agent',
            content: 'How can I assist with this accountability session today?',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
      setActiveHistoryRetryId(undefined);
    } catch (err: any) {
      console.error('[AICompanionPage] Error switching conversation:', err);
      setHistoryError(err.message || 'Failed to switch conversation.');
      // Existing conversations and messages remain intact in state
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRetryHistory = () => {
    if (activeHistoryRetryId) {
      handleSelectConversation(activeHistoryRetryId);
    } else {
      loadInitialChat(conversationId);
    }
  };

  const handleNewConversation = async () => {
    if (loading) return;
    setLoadingHistory(true);
    setMobileConversationsOpen(false);
    setFailedPromptToRetry(null);
    try {
      const newConv = await api.createChatConversation('Habit Accountability Session');
      const newId = newConv?._id || newConv?.id;
      if (newId) {
        setConversationId(newId);
        setConversations(prev => [newConv, ...prev.filter(c => (c._id || c.id) !== newId)]);
        setMessages([
          {
            id: `welcome-${newId}`,
            sender: 'agent',
            content: 'Hey! What would you like to focus on today? Let me know how I can help.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            protocolMetadata: {
              protocol: 'fetchai_chat_v1',
              agentAddress: 'agent1qgp9m8h4z9e5vy4z7j6v2s8k1l0w9x8p7q6r5t4',
            },
          },
        ]);
      }
    } catch (err) {
      console.error('[AICompanionPage] Error creating new conversation:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!id) return;
    if (!window.confirm('Delete this conversation history?')) return;
    try {
      await api.deleteChatConversation(id);
      const remaining = conversations.filter(c => (c._id || c.id) !== id);
      setConversations(remaining);

      if (conversationId === id) {
        if (remaining.length > 0) {
          await handleSelectConversation(remaining[0]._id || remaining[0].id);
        } else {
          setConversationId(undefined);
          setMessages([
            {
              id: 'welcome-fresh',
              sender: 'agent',
              content: 'What habit or goal would you like to work on today?',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      }
    } catch (err) {
      console.error('[AICompanionPage] Error deleting conversation:', err);
    }
  };

  const handleSendMessage = async (textToSend?: string, isRetry: boolean = false) => {
    const text = textToSend || inputValue;
    if (!text.trim() || loading) return;

    const trimmedText = text.trim();
    setFailedPromptToRetry(null);

    if (isRetry) {
      // Clear out the previous system error banner and reuse existing user message bubble
      setMessages(prev => prev.filter(m => m.sender !== 'system'));
    } else {
      const userMsg: AgentMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        content: trimmedText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, userMsg]);
      if (!textToSend) setInputValue('');
    }

    setLoading(true);

    try {
      const response = await api.sendChatMessage(trimmedText, conversationId);
      if (response?.conversationId && response.conversationId !== conversationId) {
        setConversationId(response.conversationId);
      }

      const agentMsg: AgentMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        content: response?.reply || 'I have processed your request.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionProposal: response?.actionProposal,
        toolExecutions: response?.toolsExecuted,
        protocolMetadata: {
          protocol: 'fetchai_chat_v1',
          agentAddress: 'agent1qgp9m8h4z9e5vy4z7j6v2s8k1l0w9x8p7q6r5t4',
          verifiedOnAsi1: true,
        },
      };

      setMessages(prev => [...prev, agentMsg]);

      // Silently sync conversation list so titles update in the sidebar without discarding
      api.getChatConversations().then(convos => {
        if (Array.isArray(convos) && convos.length > 0) {
          setConversations(convos);
        }
      }).catch(() => {});
    } catch (err: any) {
      setFailedPromptToRetry(trimmedText);
      const errorMsg: AgentMessage = {
        id: `err-${Date.now()}`,
        sender: 'system',
        content: err.message || "We couldn't connect right now. Please try again in a moment.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyProposal = async (proposal: ActionProposal) => {
    if (!proposal?.label) return;
    await handleSendMessage(`I would like to apply this adjustment: "${proposal.label}".`);
  };

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col md:flex-row gap-4 relative">
      {/* Left Sidebar: Desktop Conversations List */}
      <div className="hidden lg:flex flex-col w-72 bg-white rounded-3xl border border-[#E9ECE7] p-4 shadow-xs justify-between shrink-0">
        <div className="space-y-4">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#245C46] text-white rounded-xl text-xs font-bold hover:bg-[#1b4736] transition-all shadow-xs active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Conversation</span>
          </button>

          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F6F65] px-2 block">
              Recent Conversations
            </span>
            <div className="space-y-1 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
              {loadingHistory && conversations.length === 0 ? (
                <div className="space-y-2 p-2">
                  <div className="h-8 bg-stone-100 rounded-lg animate-pulse" />
                  <div className="h-8 bg-stone-100 rounded-lg animate-pulse" />
                  <div className="h-8 bg-stone-100 rounded-lg animate-pulse" />
                </div>
              ) : historyError && conversations.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2 my-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mx-auto" />
                  <p className="text-[11px] text-amber-900 font-medium">Unable to load conversations</p>
                  <button
                    onClick={handleRetryHistory}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[10px] font-bold hover:bg-amber-700 transition-colors shadow-2xs"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                </div>
              ) : conversations.length === 0 ? (
                <div className="px-2 py-6 text-xs text-[#5F6F65] text-center">
                  No previous conversations
                </div>
              ) : (
                conversations.map(c => {
                  const id = c._id || c.id;
                  const isActive = conversationId === id;
                  return (
                    <div
                      key={id}
                      onClick={() => handleSelectConversation(id)}
                      className={`group w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-[#DCEBDD] text-[#245C46] font-bold shadow-2xs'
                          : 'text-[#26352D] hover:bg-[#F7F7F2]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{c.title || 'Chat with your coach'}</span>
                      </div>
                      <button
                        onClick={e => handleDeleteConversation(e, id)}
                        title="Delete conversation"
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-600 transition-opacity rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[#E9ECE7] text-[11px] text-[#5F6F65] text-center">
          Persisted in MongoDB Atlas
        </div>
      </div>

      {/* Mobile / Tablet Slide-over Drawer */}
      {mobileConversationsOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs animate-fade-in"
            onClick={() => setMobileConversationsOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white p-4 shadow-elevation flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E9ECE7]">
                <div className="flex items-center gap-2 text-sm font-bold text-[#26352D]">
                  <MessageSquare className="w-4 h-4 text-[#245C46]" />
                  <span>Conversations</span>
                </div>
                <button
                  onClick={() => setMobileConversationsOpen(false)}
                  className="p-1 rounded-lg text-stone-500 hover:bg-stone-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={handleNewConversation}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#245C46] text-white rounded-xl text-xs font-bold hover:bg-[#1b4736] transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>New Conversation</span>
              </button>

              <div className="space-y-1 max-h-[calc(100vh-14rem)] overflow-y-auto">
                {loadingHistory && conversations.length === 0 ? (
                  <div className="space-y-2 p-2">
                    <div className="h-8 bg-stone-100 rounded-lg animate-pulse" />
                    <div className="h-8 bg-stone-100 rounded-lg animate-pulse" />
                  </div>
                ) : historyError && conversations.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2 my-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mx-auto" />
                    <p className="text-[11px] text-amber-900 font-medium">Unable to load conversations</p>
                    <button
                      onClick={handleRetryHistory}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[10px] font-bold hover:bg-amber-700 transition-colors shadow-2xs"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-xs text-[#5F6F65] text-center">No previous conversations</div>
                ) : (
                  conversations.map(c => {
                    const id = c._id || c.id;
                    const isActive = conversationId === id;
                    return (
                      <div
                        key={id}
                        onClick={() => handleSelectConversation(id)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-[#DCEBDD] text-[#245C46] font-bold'
                            : 'text-[#26352D] hover:bg-[#F7F7F2]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <MessageSquare className="w-4 h-4 shrink-0" />
                          <span className="truncate">{c.title || 'Chat with your coach'}</span>
                        </div>
                        <button
                          onClick={e => handleDeleteConversation(e, id)}
                          className="p-1 text-stone-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="text-[11px] text-[#5F6F65] text-center pt-2 border-t border-[#E9ECE7]">
              HabitHero Cloud Sync
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Interface */}
      <div className="flex-1 bg-white rounded-3xl border border-[#E9ECE7] shadow-xs flex flex-col justify-between overflow-hidden">
        {/* Top Chat Header */}
        <div className="px-6 py-4 border-b border-[#E9ECE7] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileConversationsOpen(true)}
              className="lg:hidden p-2 text-[#5F6F65] hover:bg-[#F7F7F2] rounded-xl"
              title="View Conversations"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-2xl bg-[#DCEBDD] text-[#245C46] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#26352D] text-sm">HabitHero Coach</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Coach is ready
                </span>
              </div>
              <p className="text-[11px] text-[#5F6F65]">Your personal habit coach • Adapts when life gets busy</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNewConversation}
              className="lg:hidden p-2 text-[#5F6F65] hover:bg-[#F7F7F2] rounded-xl"
              title="New Conversation"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {historyError && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between gap-3 max-w-lg mx-auto shadow-xs">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">{historyError}</span>
              </div>
              <button
                onClick={handleRetryHistory}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 text-white rounded-lg text-[11px] font-bold hover:bg-amber-700 transition-colors shrink-0 shadow-2xs"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {loadingHistory ? (
            <div className="space-y-4 max-w-md mx-auto py-12 text-center text-xs text-[#5F6F65]">
              <div className="w-8 h-8 rounded-full border-2 border-[#245C46] border-t-transparent animate-spin mx-auto" />
              <p>Restoring your conversation history from MongoDB...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-xs text-[#5F6F65]">
              <Bot className="w-8 h-8 mx-auto text-[#245C46] mb-2 opacity-60" />
              <p className="font-semibold text-stone-700">No messages yet in this session</p>
              <p className="mt-1">Ask a question below or choose a starter prompt to begin!</p>
            </div>
          ) : (
            messages.map(msg => {
              const isAgent = msg.sender === 'agent';
              const isSystem = msg.sender === 'system';

              if (isSystem) {
                return (
                  <div
                    key={msg.id}
                    className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center justify-between gap-2 max-w-lg mx-auto"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>{msg.content}</span>
                    </div>
                    {failedPromptToRetry && (
                      <button
                        onClick={() => handleSendMessage(failedPromptToRetry, true)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded-lg text-[11px] font-bold hover:bg-red-700 transition-colors shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Retry</span>
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-2xl ${isAgent ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isAgent ? 'bg-[#245C46] text-white' : 'bg-[#E9ECE7] text-[#26352D]'
                    }`}
                  >
                    {isAgent ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  <div className="space-y-2">
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isAgent
                          ? 'bg-[#F7F7F2] text-[#26352D] border border-[#E9ECE7]'
                          : 'bg-[#245C46] text-white shadow-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>

                    {/* Tool execution pills: safely handles MongoDB toolCalls or runtime toolExecutions */}
                    {Array.isArray(msg.toolExecutions) && msg.toolExecutions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.toolExecutions
                          .filter((t): t is NonNullable<typeof t> => Boolean(t))
                          .map((t, idx) => {
                            const actionName =
                              (typeof t === 'object' ? (typeof t.tool === 'string' ? t.tool : (t as any).name) : undefined) || 'Action';
                            return (
                              <div
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#E9ECE7] rounded-lg text-[10px] font-semibold text-[#245C46]"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{formatToolAction(actionName)}</span>
                              </div>
                            );
                          })}
                      </div>
                    )}

                    {/* Action proposal card */}
                    {msg.actionProposal && (
                      <div className="p-4 bg-white rounded-2xl border-2 border-[#245C46]/30 shadow-xs space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#245C46]">
                          <Zap className="w-4 h-4 text-[#E8B96B]" />
                          <span>Suggested adjustment: {msg.actionProposal.label || 'Recommended Adjustment'}</span>
                        </div>
                        {msg.actionProposal.description && (
                          <p className="text-xs text-[#5F6F65]">{msg.actionProposal.description}</p>
                        )}
                        <button
                          onClick={() => handleApplyProposal(msg.actionProposal!)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#245C46] text-white rounded-xl text-xs font-bold hover:bg-[#1b4736] transition-colors shadow-xs"
                        >
                          <span>Apply this adjustment</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <span
                      className={`block text-[10px] text-[#5F6F65] ${isAgent ? 'text-left' : 'text-right'}`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {loading && (
            <div className="flex gap-3 max-w-md mr-auto animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-[#245C46] text-white flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 bg-[#F7F7F2] rounded-2xl border border-[#E9ECE7] text-xs text-[#5F6F65] flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin text-[#245C46]" />
                <span>Your coach is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Starter Prompts */}
        <div className="px-6 py-2 border-t border-[#E9ECE7] bg-[#F7F7F2]/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {STARTER_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              className="px-3 py-1.5 rounded-full bg-white border border-[#E9ECE7] text-[11px] font-medium text-[#5F6F65] hover:text-[#245C46] hover:border-[#245C46]/40 transition-colors whitespace-nowrap shadow-2xs"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[#E9ECE7] bg-white">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask your coach a question or request an adjustment..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              disabled={loading || loadingHistory}
              className="flex-1 px-4 py-3 bg-[#F7F7F2] border border-[#E9ECE7] rounded-2xl text-xs sm:text-sm text-[#26352D] placeholder-[#5F6F65]/60 focus:outline-none focus:ring-2 focus:ring-[#245C46]/30 focus:border-[#245C46] transition-all disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || loadingHistory || !inputValue.trim()}
              className="px-5 py-3 bg-[#245C46] text-white rounded-2xl text-xs font-bold hover:bg-[#1b4736] transition-all shadow-xs active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
