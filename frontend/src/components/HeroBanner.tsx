import React, { useState } from 'react';
import { ShieldCheck, Zap, ArrowRight, X, Play, CheckCircle2, Sparkles } from 'lucide-react';
import { DailyTask } from '../types';
import { AuthUser } from '../services/api';

interface HeroBannerProps {
  tasks: DailyTask[];
  onOpenCheckIn: () => void;
  onOpenCompanionChat: () => void;
  currentStreak: number;
  currentUser?: AuthUser | null;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  tasks,
  onOpenCheckIn,
  onOpenCompanionChat,
  currentStreak,
  currentUser
}) => {
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const nextTask = pendingTasks[0] || null;
  const adaptedTask = tasks.find(t => t.status === 'adapted');
  const allCompleted = totalCount > 0 && pendingTasks.length === 0;

  // Personalized greeting & time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    let timeGreeting = 'Good morning';
    if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
    if (hour >= 17) timeGreeting = 'Good evening';

    if (currentUser?.name) {
      const firstName = currentUser.name.trim().split(' ')[0];
      return `${timeGreeting}, ${firstName}`;
    }
    return timeGreeting;
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  const handleStartNextTask = () => {
    if (nextTask) {
      const el = document.getElementById(`task-${nextTask.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-brand-500');
        setTimeout(() => el.classList.remove('ring-2', 'ring-brand-500'), 1500);
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Daily Overview Card */}
      <section 
        className="rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-card"
        aria-label="Daily Overview"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Personalized Greeting & Focus Statement */}
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{formattedDate}</span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {currentStreak}-day momentum
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-snug">
              {getGreeting()}
            </h1>

            {/* Answer 1: What should I focus on today? */}
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {allCompleted ? (
                <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  All {totalCount} scheduled actions are completed. Your consistency chain is locked in for today.
                </span>
              ) : nextTask ? (
                <span>
                  Focus on <strong className="font-semibold text-slate-900">"{nextTask.title}"</strong> ({nextTask.durationMinutes} min). Completing this single micro-action preserves your daily habit.
                </span>
              ) : (
                <span>No actions currently scheduled. Create a new goal roadmap to begin your streak.</span>
              )}
            </p>
          </div>

          {/* Right: Progress Telemetry & Single Clear Primary Action */}
          <div className="flex flex-col sm:flex-row lg:flex-col justify-between gap-3 p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 min-w-[280px]">
            {/* Answer 2: How much have I completed? */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-600">Daily Completion</span>
                <span className="text-slate-900 font-bold tabular-nums">
                  {completedCount} of {totalCount} <span className="font-normal text-slate-500 text-[11px]">({percentage}%)</span>
                </span>
              </div>
              <div 
                className="w-full bg-slate-200 rounded-full h-2 overflow-hidden" 
                role="progressbar" 
                aria-valuenow={percentage} 
                aria-valuemin={0} 
                aria-valuemax={100}
                aria-label="Daily task completion percentage"
              >
                <div
                  className="bg-brand-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            {/* Answer 3: What should I do next? (Clear Primary Action) */}
            <div>
              {allCompleted ? (
                <button
                  type="button"
                  onClick={onOpenCheckIn}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-subtle hover:shadow-card"
                >
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span>Log Evening Reflection</span>
                </button>
              ) : nextTask ? (
                <button
                  type="button"
                  onClick={handleStartNextTask}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-all shadow-subtle hover:shadow-card"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Next Task ({nextTask.durationMinutes}m)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenCheckIn}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition-colors shadow-subtle"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Daily Check-In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Contextual Adaptive Accountability Alert */}
      {adaptedTask && !isAlertDismissed && (
        <aside 
          className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 sm:p-4 text-xs shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
              <Zap className="w-4 h-4 text-amber-600" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-950">
                  Adaptive Recovery: Shortened to 15m Sprint
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Friction Protection
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed text-[11px] sm:text-xs">
                <strong className="font-semibold text-slate-900">What changed:</strong> "{adaptedTask.title}" was scaled down to 15 minutes.
                <br className="hidden sm:inline" />
                <span className="text-slate-600 ml-0 sm:ml-1">
                  <strong>Why:</strong> Lowering activation energy protects your streak when schedule friction is high.
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center ml-auto sm:ml-0">
            <button
              type="button"
              onClick={onOpenCompanionChat}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-900 bg-white border border-amber-200 hover:bg-amber-100/70 transition-colors shadow-subtle"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Discuss in Chat</span>
              <ArrowRight className="w-3 h-3 text-amber-700" />
            </button>

            <button
              type="button"
              onClick={() => setIsAlertDismissed(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-amber-100/60 transition-colors"
              aria-label="Dismiss adaptive alert"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}
    </div>
  );
};
