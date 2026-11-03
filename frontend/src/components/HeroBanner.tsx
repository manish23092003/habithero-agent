import React from 'react';
import { 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Flame, 
  Target, 
  MessageSquare, 
  ShieldCheck, 
  Plus 
} from 'lucide-react';
import { DailyTask } from '../types';
import { AuthUser } from '../services/api';

interface HeroBannerProps {
  tasks: DailyTask[];
  onOpenCheckIn: () => void;
  onOpenCompanionChat: () => void;
  onOpenNewGoal?: () => void;
  currentStreak: number;
  currentUser?: AuthUser | null;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  tasks,
  onOpenCheckIn,
  onOpenCompanionChat,
  onOpenNewGoal,
  currentStreak,
  currentUser
}) => {
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const nextTask = pendingTasks[0] || null;
  const adaptedTask = tasks.find(t => t.status === 'adapted');
  const allCompleted = totalCount > 0 && pendingTasks.length === 0;

  // Personalized greeting based on time of day
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
    <div className="space-y-4">
      {/* Main Dashboard Hero Card */}
      <section 
        className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-7 shadow-card relative overflow-hidden"
        aria-label="Dashboard Overview"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Column: Greeting, Date & Next Priority */}
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <span className="font-semibold text-stone-700">{formattedDate}</span>
              <span className="text-stone-300">•</span>
              <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/70">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                {currentStreak}-day streak
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 leading-snug">
              {getGreeting()}
            </h1>

            {/* Daily Focus Summary */}
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              {allCompleted ? (
                <span className="text-brand-800 font-medium inline-flex items-center gap-1.5 bg-brand-50/80 px-2.5 py-1 rounded-lg border border-brand-200/70">
                  <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
                  All {totalCount} tasks completed today! Keep up the great work.
                </span>
              ) : nextTask ? (
                <span>
                  Primary focus today: <strong className="font-semibold text-stone-900">"{nextTask.title}"</strong> ({nextTask.durationMinutes} min). Small daily steps build lasting consistency.
                </span>
              ) : (
                <span>No tasks scheduled for today. Create your first habit plan to get started!</span>
              )}
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {nextTask && (
                <button
                  type="button"
                  onClick={handleStartNextTask}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-subtle hover:shadow-card transition-all"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Start Next Task</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={onOpenCheckIn}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200/80 transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                <span>Daily Reflection</span>
              </button>

              <button
                type="button"
                onClick={onOpenCompanionChat}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200/80 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Habit Coach</span>
              </button>

              {onOpenNewGoal && (
                <button
                  type="button"
                  onClick={onOpenNewGoal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all ml-auto sm:ml-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Habit</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Today's Visual Progress Meter */}
          <div className="w-full lg:w-72 rounded-xl bg-stone-50/90 border border-stone-200/80 p-4 space-y-3 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-700">Today's Progress</span>
              <span className="font-bold text-stone-900 tabular-nums">{percentage}%</span>
            </div>

            {/* Custom Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-stone-200/80 overflow-hidden">
              <div 
                className="h-full bg-brand-500 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-500 pt-0.5">
              <span>{completedCount} of {totalCount} completed</span>
              <span className="font-medium text-stone-700">{totalCount - completedCount} remaining</span>
            </div>
          </div>
        </div>
      </section>

      {/* Adaptive Habit Notice (If any task is currently adapted) */}
      {adaptedTask && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-subtle animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Zap className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider text-amber-900">
                  Plan Adjusted for Today
                </span>
                <span className="text-[10px] bg-amber-200/70 text-amber-900 font-semibold px-2 py-0.5 rounded-full">
                  Lighter Pace
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                {adaptedTask.adaptationNote || 'Your task was shortened to 15 minutes so you can make progress without feeling rushed.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenCompanionChat}
            className="self-end sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-amber-900 border border-amber-300 hover:bg-amber-100/70 transition-colors shrink-0 shadow-xs"
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
            <span>Chat with Coach</span>
          </button>
        </div>
      )}
    </div>
  );
};
