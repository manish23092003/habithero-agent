import React, { useState } from 'react';
import { 
  Bot, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface FetchAiProtocolBannerProps {
  onOpenCompanionChat: () => void;
  isConnected?: boolean;
}

export const FetchAiProtocolBanner: React.FC<FetchAiProtocolBannerProps> = ({
  onOpenCompanionChat,
  isConnected = true
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const agentAddress = "agent1qghes4q3u28wc48zeateraflnf3uadm3ygam56lwh2m5elxm407256zqkkw";

  const handleCopy = () => {
    navigator.clipboard.writeText(agentAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-card space-y-4">
      {/* Companion Identity Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200/60 text-brand-700 flex items-center justify-center shrink-0 shadow-xs">
            <Bot className="w-5 h-5 text-brand-600" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                HabitHero AI Companion
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {isConnected ? 'Connected' : 'Connecting'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalized accountability & habit calibration
            </p>
          </div>
        </div>
      </div>

      {/* User-Centric Explanation */}
      <p className="text-xs text-slate-600 leading-relaxed">
        Chat with your companion to adjust daily commitment times, reschedule around high-friction days, or review milestone consistency.
      </p>

      {/* Prominent Chat Action */}
      <button
        type="button"
        onClick={onOpenCompanionChat}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-subtle hover:shadow-card group"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Chat with HabitHero Companion</span>
        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* Expandable Technical Details */}
      <div className="pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          className="w-full flex items-center justify-between text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors py-1"
          aria-expanded={isDetailsOpen}
        >
          <span>Fetch.ai & Agentverse Infrastructure</span>
          {isDetailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {isDetailsOpen && (
          <div className="pt-2.5 space-y-2 text-[11px] text-slate-600 animate-fade-in">
            {/* Agent Address & Copy */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Autonomous uAgent Address
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-slate-700 truncate select-all">
                  {agentAddress}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800 shrink-0"
                  title="Copy Agent Address"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-brand-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-0.5">
                <span className="font-semibold text-slate-800">Chat Protocol</span>
                <p className="text-slate-500">AgentChat 0.3.0 on Python 3.12 uAgent</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-0.5">
                <span className="font-semibold text-slate-800">ASI:One Direct Chat</span>
                <a 
                  href="https://asi1.ai/chat" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-brand-700 hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <span>Open ASI:One</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
