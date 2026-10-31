import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { DailyTask } from '../types';

interface HeroBannerProps {
  tasks: DailyTask[];
  onOpenCheckIn: () => void;
  onOpenCompanionChat: () => void;
  currentStreak: number;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  tasks,
  onOpenCheckIn,
  onOpenCompanionChat,
  currentStreak
}) => {
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const hasAdaptedTask = tasks.some(t => t.status === 'adapted');

  return (
    <div className="space-y-4">
      {/* Primary Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-6 sm:p-8 shadow-card">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Day {currentStreak} of consistent habit building</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Ready to win today? Small daily wins compound into massive skills.
            </h1>
            
            <p className="text-slate-300 text-sm leading-relaxed">
              HabitHero monitors your schedule, breaks intimidating goals into bite-sized 15–30 minute actions, and helps you recover the moment life gets chaotic.
            </p>
          </div>

          {/* Quick Progress Ring / Stats Box */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/15 flex flex-col justify-between min-w-[240px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-300">
                Today's Target
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200">
                {completedCount}/{totalCount} Done
              </span>
            </div>

            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between text-xs font-medium text-slate-200">
                <span>Progress</span>
                <span className="font-bold">{percentage}%</span>
              </div>
              <div className="w-full bg-slate-700/60 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-400 to-teal-300 h-2.5 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            <button
              onClick={onOpenCheckIn}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
            >
              <ShieldCheck className="w-4 h-4 text-slate-950" />
              <span>Log Daily Check-In</span>
            </button>
          </div>
        </div>
      </div>

      {/* Adaptive Rescue Notification (The core HabitHero differentiator!) */}
      {hasAdaptedTask && (
        <div className="rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50/60 p-4 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0 mt-0.5 shadow-sm">
              <Zap className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-amber-950">
                  Adaptive Accountability Activated
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-200/80 text-amber-900 border border-amber-300/80">
                  Streak Protected
                </span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed max-w-2xl">
                You reported low bandwidth yesterday. Instead of letting you skip or feel guilty, HabitHero scaled today's Java task down from <strong>25 min</strong> to a focused <strong>15 min</strong> micro-session.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenCompanionChat}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-950 bg-amber-200/70 hover:bg-amber-300/80 border border-amber-300 transition-colors shrink-0 self-start sm:self-center"
          >
            <span>View Agent Strategy</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
