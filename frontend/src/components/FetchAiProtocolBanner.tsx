import React from 'react';
import { 
  Bot, 
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
  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-card space-y-4">
      {/* Coach Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200/60 text-brand-700 flex items-center justify-center shrink-0 shadow-xs">
            <Bot className="w-5 h-5 text-brand-600" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-stone-900">
                HabitHero Coach
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200/70">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                {isConnected ? 'Ready to assist' : 'Connecting'}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Your personal habit coach
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-stone-600 leading-relaxed">
        Chat with your coach to plan your day, make adjustments when you're busy, or celebrate your daily progress.
      </p>

      {/* Primary Chat Button */}
      <button
        type="button"
        onClick={onOpenCompanionChat}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white transition-all shadow-subtle hover:shadow-card group"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Chat with your coach</span>
        <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
};
