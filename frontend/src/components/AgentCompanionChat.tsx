import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  X, 
  Zap, 
  Check, 
  Wrench,
  CheckCircle2,
  AlertCircle,
  Loader2
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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-stone-900/30 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div 
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white shadow-elevation border-l border-stone-200 flex flex-col transition-all duration-300"
        role="dialog"
        aria-label="HabitHero Coach Chat"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-xs">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500 ring-2 ring-white" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm tracking-tight text-stone-900">
                  HabitHero Coach
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                  Your Personal Coach
                </span>
              </div>
              <p className="text-[11px] text-stone-500 flex items-center gap-1">
                <span>Your daily guide to steady, realistic progress</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            aria-label="Close coach chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Coach Status Sub-bar */}
        <div className="px-5 py-2 bg-stone-50 text-[11px] text-stone-600 flex items-center justify-between border-b border-stone-200/80">
          <div className="flex items-center gap-1.5 text-stone-700 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Ready to help you build habits</span>
          </div>
          <span className="text-[10px] text-stone-400 font-medium">Adaptive Coach</span>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-stone-50/50">
          {messages.map(msg => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-stone-900 text-white rounded-tr-xs shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-800 rounded-tl-xs shadow-card'
                  }`}
                >
                  {!isUser && (
                    <div className="flex items-center gap-1 mb-1 text-[10px] font-semibold text-brand-700 uppercase tracking-wider">
                      <Sparkles className="w-3 h-3 text-brand-600" />
                      <span>HabitHero Coach</span>
                    </div>
                  )}

                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Actions Taken By Coach */}
                  {msg.toolExecutions && msg.toolExecutions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-stone-100 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                        <Wrench className="w-3 h-3 text-brand-600" />
                        Actions completed:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.toolExecutions.map((t, idx) => (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              t.success
                                ? 'bg-brand-50 text-brand-800 border-brand-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {t.success ? (
                              <CheckCircle2 className="w-2.5 h-2.5 text-brand-600" />
                            ) : (
                              <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                            )}
                            <span>{formatToolAction(t.tool)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Proposal from Coach */}
                  {msg.actionProposal && (
                    <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <Zap className="w-3.5 h-3.5 text-amber-600" />
                        <span>Suggested adjustment: {msg.actionProposal.label}</span>
                      </div>
                      <p className="text-[11px] text-amber-900 leading-tight">
                        {msg.actionProposal.description}
                      </p>

                      <button
                        type="button"
                        disabled={msg.actionProposal.applied}
                        onClick={() => msg.actionProposal && onApplyProposal(msg.actionProposal)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                          msg.actionProposal.applied
                            ? 'bg-brand-600 text-white cursor-default'
                            : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                        }`}
                      >
                        {msg.actionProposal.applied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Applied to Today's Tasks</span>
                          </>
                        ) : (
                          <span>Apply this adjustment</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-stone-400 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            );
          })}

          {/* Typing / Thinking Indicator */}
          {(isSubmitting || isLoading) && (
            <div className="flex items-center gap-2 p-3 bg-white border border-stone-200 rounded-2xl rounded-tl-xs w-64 shadow-card text-xs text-stone-600">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-bounce [animation-delay:0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-bounce [animation-delay:0.3s]" />
              <span className="text-[11px] font-medium text-stone-700 ml-1">
                Your coach is thinking...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompt Chips */}
        <div className="p-2.5 bg-white border-t border-stone-100 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
          <button
            onClick={() => handleQuickPrompt("What should I focus on today?")}
            disabled={isSubmitting || isLoading}
            className="shrink-0 px-3 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-medium transition-colors disabled:opacity-50"
          >
            What should I focus on today?
          </button>
          <button
            onClick={() => handleQuickPrompt("I have less time today. Can you adjust my plan?")}
            disabled={isSubmitting || isLoading}
            className="shrink-0 px-3 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-medium transition-colors disabled:opacity-50"
          >
            Adjust my plan for today
          </button>
          <button
            onClick={() => handleQuickPrompt("Show me how I'm progressing.")}
            disabled={isSubmitting || isLoading}
            className="shrink-0 px-3 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-medium transition-colors disabled:opacity-50"
          >
            Show me how I'm progressing
          </button>
          <button
            onClick={() => handleQuickPrompt("I completed yesterday's session. What's next?")}
            disabled={isSubmitting || isLoading}
            className="shrink-0 px-3 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-medium transition-colors disabled:opacity-50"
          >
            What's next?
          </button>
        </div>

        {/* Input Box */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 bg-white border-t border-stone-200 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            disabled={isSubmitting || isLoading}
            placeholder="Ask your coach a question or request an adjustment..."
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-stone-400 disabled:bg-stone-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSubmitting || isLoading}
            className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white transition-all shadow-xs"
            aria-label="Send message to coach"
          >
            {isSubmitting || isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </>
  );
};
