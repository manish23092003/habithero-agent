import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Plus,
  MessageSquare,
  AlertCircle,
  Zap
} from 'lucide-react';
import { api } from '../../services/api';
import { AgentMessage, ActionProposal } from '../../types';

const STARTER_PROMPTS = [
  'What should I focus on today?',
  'I have less time today. Can you adjust my plan?',
  'Show me how I\'m progressing.',
  'I completed yesterday\'s session. What\'s next?',
];

const formatToolAction = (toolName: string) => {
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
    default:
      return toolName.replace(/_/g, ' ');
  }
};

export const AICompanionPage: React.FC = () => {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 'welcome-1',
      sender: 'agent',
      content:
        "Hey! Welcome back. How are you feeling today? Let's make a little progress towards your goals.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [conversations, setConversations] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadConversations = async () => {
    try {
      const convos = await api.getChatConversations();
      setConversations(convos);
    } catch {
      // Ignored for clean fallback
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim() || loading) return;

    const userMsg: AgentMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setLoading(true);

    try {
      const response = await api.sendChatMessage(text, conversationId);
      setConversationId(response.conversationId);

      const agentMsg: AgentMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionProposal: response.actionProposal,
        toolExecutions: response.toolsExecuted,
        protocolMetadata: {
          protocol: 'fetchai_chat_v1',
          agentAddress: 'agent1qgp9m8h4z9e5vy4z7j6v2s8k1l0w9x8p7q6r5t4',
          verifiedOnAsi1: true,
        },
      };

      setMessages(prev => [...prev, agentMsg]);
      loadConversations();
    } catch {
      const errorMsg: AgentMessage = {
        id: `err-${Date.now()}`,
        sender: 'system',
        content: "We couldn't connect right now. Please try again in a moment.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyProposal = async (proposal: ActionProposal) => {
    await handleSendMessage(`I would like to apply this adjustment: "${proposal.label}".`);
  };

  const handleNewConversation = () => {
    setConversationId(undefined);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'agent',
        content: "Hey! What would you like to focus on today? Let me know how I can help.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        protocolMetadata: {
          protocol: 'fetchai_chat_v1',
          agentAddress: 'agent1qgp9m8h4z9e5vy4z7j6v2s8k1l0w9x8p7q6r5t4',
        },
      },
    ]);
  };

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col md:flex-row gap-4">
      {/* Left Sidebar: Conversations & Quick Actions */}
      <div className="hidden lg:flex flex-col w-72 bg-white rounded-3xl border border-[#E9ECE7] p-4 shadow-sm justify-between">
        <div className="space-y-4">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#245C46] text-white rounded-xl text-xs font-bold hover:bg-[#1b4736] transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Conversation</span>
          </button>

          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F6F65] px-2 block">
              Recent Conversations
            </span>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="px-2 py-4 text-xs text-[#5F6F65] text-center">
                  No previous conversations
                </div>
              ) : (
                conversations.map(c => (
                  <button
                    key={c._id || c.id}
                    onClick={async () => {
                      try {
                        const data = await api.getChatConversation(c._id || c.id);
                        setConversationId(c._id || c.id);
                        setMessages(data.messages.map(m => ({
                          id: m._id || m.id,
                          sender: m.sender,
                          content: m.content,
                          timestamp: new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                          toolExecutions: m.toolCalls,
                        })));
                      } catch {
                        // ignore
                      }
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors ${
                      conversationId === (c._id || c.id)
                        ? 'bg-[#DCEBDD] text-[#245C46] font-bold'
                        : 'text-[#26352D] hover:bg-[#F7F7F2]'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{c.title || 'Chat with your coach'}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 bg-white rounded-3xl border border-[#E9ECE7] shadow-sm flex flex-col justify-between overflow-hidden">
        {/* Top Chat Header */}
        <div className="px-6 py-4 border-b border-[#E9ECE7] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#DCEBDD] text-[#245C46] flex items-center justify-center">
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
          <button
            onClick={handleNewConversation}
            className="lg:hidden p-2 text-[#5F6F65] hover:bg-[#F7F7F2] rounded-xl"
            title="New Conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map(msg => {
            const isAgent = msg.sender === 'agent';
            const isSystem = msg.sender === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center gap-2 max-w-lg mx-auto">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{msg.content}</span>
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
                        : 'bg-[#245C46] text-white shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {/* Tool execution pills if any */}
                  {msg.toolExecutions && msg.toolExecutions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.toolExecutions.map((t, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#E9ECE7] rounded-lg text-[10px] font-semibold text-[#245C46]"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{formatToolAction(t.tool)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action proposal interactive card if any */}
                  {msg.actionProposal && (
                    <div className="p-4 bg-white rounded-2xl border-2 border-[#245C46]/30 shadow-sm space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#245C46]">
                        <Zap className="w-4 h-4 text-[#E8B96B]" />
                        <span>Suggested adjustment: {msg.actionProposal.label}</span>
                      </div>
                      <p className="text-xs text-[#5F6F65]">
                        {msg.actionProposal.description}
                      </p>
                      <button
                        onClick={() => handleApplyProposal(msg.actionProposal!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#245C46] text-white rounded-xl text-xs font-bold hover:bg-[#1b4736] transition-colors shadow-sm"
                      >
                        <span>Apply this adjustment</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <span className={`block text-[10px] text-[#5F6F65] ${isAgent ? 'text-left' : 'text-right'}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

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
              className="flex-1 px-4 py-3 bg-[#F7F7F2] border border-[#E9ECE7] rounded-2xl text-xs sm:text-sm text-[#26352D] placeholder-[#5F6F65]/60 focus:outline-none focus:ring-2 focus:ring-[#245C46]/30 focus:border-[#245C46] transition-all"
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="px-5 py-3 bg-[#245C46] text-white rounded-2xl text-xs font-bold hover:bg-[#1b4736] transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
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
