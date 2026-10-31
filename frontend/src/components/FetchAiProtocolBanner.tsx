import React, { useState } from 'react';
import { 
  Bot, 
  Radio, 
  ExternalLink, 
  Terminal, 
  Network,
  Cpu
} from 'lucide-react';

interface FetchAiProtocolBannerProps {
  onOpenCompanionChat: () => void;
}

export const FetchAiProtocolBanner: React.FC<FetchAiProtocolBannerProps> = ({
  onOpenCompanionChat
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Network className="w-5 h-5 text-emerald-400" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Fetch.ai uAgent & ASI:One Integration
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Chat Protocol v1 Ready
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
              HabitHero operates as a persistent autonomous agent. You can interact via this web dashboard or message your personal habit companion directly on ASI:One.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {isDetailsOpen ? 'Hide Architecture' : 'View Architecture'}
          </button>

          <button
            onClick={onOpenCompanionChat}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Chat with Agent</span>
          </button>
        </div>
      </div>

      {isDetailsOpen && (
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Cpu className="w-3.5 h-3.5 text-emerald-600" />
              <span>Python 3.12 uAgent</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Standalone agent service in <code className="text-emerald-700 font-mono">/habithero-agent</code> executing daily proactive accountability cron intervals.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Radio className="w-3.5 h-3.5 text-emerald-600" />
              <span>Agentverse & Mailbox</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Discoverable on the Fetch.ai decentralized agent network with persistent mailbox message buffering.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-600" />
                <span>ASI:One Chat Interface</span>
              </div>
              <a
                href="https://asi1.ai/chat"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 hover:underline inline-flex items-center gap-0.5 text-[10px]"
              >
                asi1.ai
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Native compatibility with Fetch.ai Chat Protocol v1 so users can converse with HabitHero directly from their ASI:One client.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
