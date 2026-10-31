import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  X, 
  Zap, 
  Check, 
  Radio, 
  ExternalLink,
  Wrench,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AgentMessage, ActionProposal, DailyTask } from '../types';

interface AgentCompanionChatProps {
  isOpen: boolean;
  onClose: () => void;
  messages: AgentMessage[];
  onSendMessage: (text: string) => Promise<void> | void;
  onApplyProposal: (proposal: ActionProposal) => void;
  tasks: DailyTask[];
  isLoading?: boolean;
}

export const AgentCompanionChat: React.FC<AgentCompanionChatProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  onApplyProposal,
  isLoading = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isSubmitting, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSubmitting || isLoading) return;

    const userQuery = inputText.trim();
    setInputText('');
    setIsSubmitting(true);
    try {
      await onSendMessage(userQuery);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickPrompt = async (prompt: string) => {
    if (isSubmitting || isLoading) return;
    setIsSubmitting(true);
    try {
      await onSendMessage(prompt);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-white shadow-2xl border-l border-slate-200 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-slate-900"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm tracking-tight text-white">
                HabitHero Companion
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                AI + Tools
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-400" />
              Powered by Gemini Function Calling & MongoDB
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close companion drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Fetch.ai ASI:One Sync Sub-bar */}
      <div className="px-4 py-2 bg-slate-800 text-[11px] text-slate-300 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-semibold text-emerald-400">Agent Status:</span>
          <span className="text-[10px] text-slate-300">
            Real Backend Tools Connected
          </span>
        </div>
        <a 
          href="https://asi1.ai/chat" 
          target="_blank" 
          rel="noreferrer"
          className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 hover:underline"
        >
          <span>ASI:One Protocol</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map(msg => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-br-none'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-subtle'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center gap-1 mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    HabitHero AI Companion
                  </div>
                )}

                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Tool Executions Badge if present */}
                {msg.toolExecutions && msg.toolExecutions.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Wrench className="w-3 h-3 text-emerald-600" />
                      Actions Executed in MongoDB:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.toolExecutions.map((t, idx) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            t.success
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-red-50 text-red-800 border-red-200'
                          }`}
                        >
                          {t.success ? (
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-2.5 h-2.5 text-red-600" />
                          )}
                          <code>{t.tool}</code>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Proposal if attached to message */}
                {msg.actionProposal && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-950 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                      <span>{msg.actionProposal.label}</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-tight">
                      {msg.actionProposal.description}
                    </p>

                    <button
                      type="button"
                      disabled={msg.actionProposal.applied}
                      onClick={() => msg.actionProposal && onApplyProposal(msg.actionProposal)}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        msg.actionProposal.applied
                          ? 'bg-emerald-600 text-white cursor-default'
                          : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                      }`}
                    >
                      {msg.actionProposal.applied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Applied to Today's Tasks</span>
                        </>
                      ) : (
                        <span>Apply Adaptive Adjustment</span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          );
        })}

        {/* Typing / Tool Execution Indicator */}
        {(isSubmitting || isLoading) && (
          <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl rounded-bl-none w-64 shadow-subtle text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
            <span className="text-[11px] font-medium text-emerald-800 ml-1">
              Reasoning & executing tools...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Action Chips */}
      <div className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
        <button
          onClick={() => handleQuickPrompt("What tasks do I have scheduled for today?")}
          disabled={isSubmitting || isLoading}
          className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors disabled:opacity-50"
        >
          📋 Today's tasks
        </button>
        <button
          onClick={() => handleQuickPrompt("I couldn't finish yesterday's task because I was busy. Can you adapt today's plan?")}
          disabled={isSubmitting || isLoading}
          className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors disabled:opacity-50"
        >
          ⚡ Adapt plan (15m)
        </button>
        <button
          onClick={() => handleQuickPrompt("I want to learn Java in 30 days with 25 minutes daily.")}
          disabled={isSubmitting || isLoading}
          className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors disabled:opacity-50"
        >
          🎯 Plan 30-Day Java
        </button>
        <button
          onClick={() => handleQuickPrompt("How is my habit streak and consistency rate looking?")}
          disabled={isSubmitting || isLoading}
          className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors disabled:opacity-50"
        >
          📊 Progress summary
        </button>
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          disabled={isSubmitting || isLoading}
          placeholder="Message HabitHero Agent (creates goals, completes tasks, adapts plans)..."
          className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-400 disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSubmitting || isLoading}
          className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white transition-all shadow-sm"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
