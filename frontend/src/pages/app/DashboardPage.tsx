import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Flame, 
  Target, 
  CheckCircle2, 
  Zap, 
  Plus, 
  ShieldCheck, 
  Bot, 
  Loader2 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Goal, DailyTask, CheckInRecord } from '../../types';
import { DailyTaskCard } from '../../components/DailyTaskCard';
import { DailyCheckInModal } from '../../components/DailyCheckInModal';
import { triggerStreakMilestoneConfetti } from '../../utils/confetti';

export const DashboardPage: React.FC = () => {
  const { currentUser, isBackendConnected } = useAuth();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [todayCheckIn, setTodayCheckIn] = useState<CheckInRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inFlightTaskIds, setInFlightTaskIds] = useState<Set<string>>(new Set());
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (currentUser) {
        const [dbGoals, dbTasks, dbCheckIn] = await Promise.all([
          api.getGoals().catch(() => []),
          api.getTodayTasks().catch(() => []),
          api.getTodayCheckIn().catch(() => null),
        ]);
        setGoals(dbGoals);
        setTasks(dbTasks);
        setTodayCheckIn(dbCheckIn);

        // Synchronize actual user streak with layout header
        const maxStreak = dbGoals.reduce((max, g) => Math.max(max, g.streak || 0), 0);
        localStorage.setItem('habithero_streak', String(maxStreak));
        window.dispatchEvent(new CustomEvent('habithero_streak_updated', { detail: { streak: maxStreak } }));
      } else {
        // Unauthenticated or empty state: strictly 0
        setGoals([]);
        setTasks([]);
        setTodayCheckIn(null);
        localStorage.removeItem('habithero_streak');
        window.dispatchEvent(new CustomEvent('habithero_streak_updated', { detail: { streak: 0 } }));
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived metrics from real user data (never initialized from sample defaults)
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const currentStreak = goals.reduce((max, g) => Math.max(max, g.streak || 0), 0);
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  const nextTask = pendingTasks[0] || null;
  const adaptedTask = tasks.find(t => t.status === 'adapted');

  const handleToggleComplete = async (taskId: string) => {
    if (inFlightTaskIds.has(taskId)) return;
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;
    const nowCompleted = targetTask.status !== 'completed';

    setInFlightTaskIds(prev => new Set(prev).add(taskId));

    // Optimistic UI update
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: nowCompleted ? 'completed' : 'pending',
              completedAt: nowCompleted
                ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : undefined,
            }
          : t
      )
    );

    if (isBackendConnected && currentUser) {
      try {
        await api.completeTask(taskId, nowCompleted);
        // Refresh goals to get true updated streak calculated by backend
        const updatedGoals = await api.getGoals().catch(() => goals);
        setGoals(updatedGoals);
        const newMaxStreak = updatedGoals.reduce((max, g) => Math.max(max, g.streak || 0), 0);
        localStorage.setItem('habithero_streak', String(newMaxStreak));
        window.dispatchEvent(new CustomEvent('habithero_streak_updated', { detail: { streak: newMaxStreak } }));
        if (newMaxStreak > 0 && nowCompleted) {
          triggerStreakMilestoneConfetti();
        }
      } catch (err: any) {
        console.error('Failed to update task:', err.message);
        // Rollback
        setTasks(prev =>
          prev.map(t =>
            t.id === taskId ? { ...t, status: !nowCompleted ? 'completed' : 'pending' } : t
          )
        );
      } finally {
        setInFlightTaskIds(prev => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }
    } else {
      setInFlightTaskIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const handleQuickAdapt = async (taskId: string) => {
    const adaptationNote = '⚡ Adjusted to 15 minutes so you can keep your momentum.';
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? { ...t, durationMinutes: 15, status: 'adapted', adaptationNote }
          : t
      )
    );

    if (isBackendConnected && currentUser) {
      try {
        await api.updateTask(taskId, {
          durationMinutes: 15,
          status: 'adapted',
          adaptationNote,
        });
      } catch (err: any) {
        console.error('Adaptation error:', err.message);
      }
    }
  };

  const handleSubmitCheckIn = async (record: Partial<CheckInRecord>, shouldAdapt: boolean) => {
    if (record.status === 'great') {
      triggerStreakMilestoneConfetti();
    } else if (shouldAdapt) {
      setTasks(prev =>
        prev.map(t =>
          t.status !== 'completed'
            ? {
                ...t,
                durationMinutes: Math.min(t.durationMinutes, 15),
                status: 'adapted',
                adaptationNote: `⚡ Adjusted for today (${record.missedReason})`,
              }
            : t
        )
      );
    }

    if (isBackendConnected && currentUser) {
      try {
        const created = await api.createCheckIn({
          status: record.status || 'great',
          completedTaskCount: completedTasks.length,
          totalTaskCount: tasks.length,
          missedReason: record.missedReason,
          reflection: record.reflection,
          adaptTomorrow: shouldAdapt,
        });
        setTodayCheckIn(created);
      } catch (err: any) {
        console.error('Check-in error:', err.message);
      }
    }
  };

  const displayedTasks = tasks.filter(t => {
    if (filter === 'pending') return t.status !== 'completed';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#245C46] animate-spin" />
        <p className="text-xs text-[#5F6F65] font-medium">
          Loading your habits and tasks...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Main Welcome Banner Card */}
      <section className="rounded-2xl border border-[#E9ECE7] bg-[#FFFFFF] p-6 sm:p-7 shadow-card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#5F6F65]">
              <span className="font-semibold text-[#26352D]">{formattedDate}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 font-bold text-[#26352D] bg-[#FDF6EB] px-2.5 py-0.5 rounded-full border border-[#E8B96B]/60">
                <Flame className="w-3.5 h-3.5 text-[#E8B96B] fill-[#E8B96B]" />
                {currentStreak}-day streak
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#26352D]">
              {getGreeting()}, {currentUser?.name?.split(' ')[0] || 'Friend'}
            </h1>

            <p className="text-xs sm:text-sm text-[#5F6F65] leading-relaxed">
              {pendingTasks.length === 0 && totalTasks > 0 ? (
                <span className="text-[#245C46] font-semibold inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#245C46]" />
                  All tasks for today are complete! Great job keeping your streak alive.
                </span>
              ) : nextTask ? (
                <span>
                  Primary focus today: <strong className="text-[#26352D]">"{nextTask.title}"</strong> ({nextTask.durationMinutes} min). Small daily steps build lasting consistency.
                </span>
              ) : (
                <span>No tasks scheduled for today. Create your first habit plan to get started!</span>
              )}
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCheckInModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{todayCheckIn ? `Reflection Saved (${todayCheckIn.status})` : 'Daily Reflection'}</span>
              </button>

              <Link
                to="/app/habits/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F7F7F2] hover:bg-[#E9ECE7] text-[#26352D] border border-[#E9ECE7] transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-[#245C46]" />
                <span>New Habit</span>
              </Link>

              <Link
                to="/app/ai-companion"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F7F7F2] hover:bg-[#E9ECE7] text-[#26352D] border border-[#E9ECE7] transition-all"
              >
                <Bot className="w-3.5 h-3.5 text-[#245C46]" />
                <span>Coach</span>
              </Link>
            </div>
          </div>

          {/* Right Progress Dial Card */}
          <div className="w-full lg:w-72 rounded-xl bg-[#F7F7F2] border border-[#E9ECE7] p-4 space-y-3 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#26352D]">Today's Progress</span>
              <span className="font-extrabold text-[#245C46] tabular-nums">{progressPercent}%</span>
            </div>

            <div className="w-full h-2 rounded-full bg-[#E9ECE7] overflow-hidden">
              <div
                className="h-full bg-[#245C46] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#5F6F65]">
              <span>{completedTasks.length} of {totalTasks} finished</span>
              <span className="font-medium text-[#26352D]">{pendingTasks.length} remaining</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Adaptive Habit Alert */}
      {adaptedTask && (
        <div className="p-4 rounded-2xl bg-[#FDF6EB] border border-[#E8B96B]/80 text-[#26352D] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-subtle animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#E8B96B] text-white flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider text-[#26352D]">
                  Plan Adjusted for Today
                </span>
                <span className="text-[10px] bg-[#FFFFFF] text-[#245C46] font-bold px-2 py-0.5 rounded-full border border-[#E8B96B]/50">
                  Lighter Pace
                </span>
              </div>
              <p className="text-xs text-[#5F6F65] mt-0.5">
                {adaptedTask.adaptationNote || 'Your task was shortened to 15 minutes so you can make progress without feeling rushed.'}
              </p>
            </div>
          </div>

          <Link
            to="/app/ai-companion"
            className="self-end sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-[#26352D] border border-[#E8B96B]/80 hover:bg-[#FDF6EB] transition-colors shrink-0 shadow-xs"
          >
            <Bot className="w-3.5 h-3.5 text-[#245C46]" />
            <span>Chat with Coach</span>
          </Link>
        </div>
      )}

      {/* 3. Task Feed & Secondary Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Task Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E9ECE7]">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[#26352D]">
                Today's Tasks
              </h2>
              <p className="text-xs text-[#5F6F65]">
                {pendingTasks.length} {pendingTasks.length === 1 ? 'task remaining' : 'tasks remaining'} for today.
              </p>
            </div>

            {/* Segmented Filter */}
            <div className="flex items-center gap-1 bg-[#FFFFFF] p-1 rounded-xl border border-[#E9ECE7]">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === 'all'
                    ? 'bg-[#DCEBDD] text-[#183c2e]'
                    : 'text-[#5F6F65] hover:text-[#26352D]'
                }`}
              >
                All ({tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === 'pending'
                    ? 'bg-[#DCEBDD] text-[#183c2e]'
                    : 'text-[#5F6F65] hover:text-[#26352D]'
                }`}
              >
                Pending ({pendingTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('completed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === 'completed'
                    ? 'bg-[#DCEBDD] text-[#183c2e]'
                    : 'text-[#5F6F65] hover:text-[#26352D]'
                }`}
              >
                Completed ({completedTasks.length})
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-3">
            {displayedTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#E9ECE7] bg-[#FFFFFF] p-8 text-center space-y-3">
                <Target className="w-8 h-8 text-[#5F6F65] mx-auto" />
                <h3 className="text-sm font-bold text-[#26352D]">No tasks in this view</h3>
                <p className="text-xs text-[#5F6F65]">
                  {filter === 'completed'
                    ? 'Complete a task above to see it here.'
                    : 'You are all caught up for today!'}
                </p>
              </div>
            ) : (
              displayedTasks.map(task => (
                <DailyTaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={handleToggleComplete}
                  onQuickAdapt={handleQuickAdapt}
                  isUpdating={inFlightTaskIds.has(task.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Habit Stats & Coach Card */}
        <div className="space-y-6">
          {/* Active Goals Summary Card */}
          <div className="rounded-2xl border border-[#E9ECE7] bg-[#FFFFFF] p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#245C46]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#26352D]">
                  Your Habits ({goals.length})
                </h3>
              </div>
              <Link to="/app/habits" className="text-xs font-semibold text-[#245C46] hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-2.5">
              {goals.slice(0, 3).map(g => (
                <Link
                  key={g.id}
                  to={`/app/habits/${g.id}`}
                  className="block p-3 rounded-xl border border-[#E9ECE7] bg-[#F7F7F2] hover:bg-[#FFFFFF] hover:border-[#245C46]/50 transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#26352D] truncate max-w-[170px]">{g.title}</span>
                    <span className="font-semibold text-[#245C46] bg-[#DCEBDD] px-2 py-0.5 rounded text-[10px]">
                      Day {g.currentDay} / {g.targetDays}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#E9ECE7] overflow-hidden">
                    <div 
                      className="h-full bg-[#245C46] rounded-full" 
                      style={{ width: `${Math.min(100, Math.round((g.currentDay / g.targetDays) * 100))}%` }}
                    />
                  </div>
                </Link>
              ))}

              <Link
                to="/app/habits/new"
                className="w-full py-2 rounded-xl text-xs font-semibold border border-dashed border-[#E9ECE7] hover:border-[#245C46] text-[#5F6F65] hover:text-[#245C46] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Habit</span>
              </Link>
            </div>
          </div>

          {/* Coach Quick Launcher */}
          <div className="rounded-2xl border border-[#E9ECE7] bg-[#FFFFFF] p-5 shadow-card space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#DCEBDD] text-[#245C46] flex items-center justify-center font-bold">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#26352D]">HabitHero Coach</h4>
                <p className="text-[11px] text-[#5F6F65]">Your personal habit coach</p>
              </div>
            </div>
            <p className="text-xs text-[#5F6F65] leading-relaxed">
              Have questions about your routine or want to adjust your schedule? Your coach is ready to help whenever you need.
            </p>
            <Link
              to="/app/ai-companion"
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-[#26352D] hover:bg-[#183c2e] text-white shadow-subtle transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E8B96B]" />
              <span>Chat with Your Coach</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Check-In Modal */}
      <DailyCheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        onSubmitCheckIn={handleSubmitCheckIn}
        completedTasksCount={completedTasks.length}
        totalTasksCount={tasks.length}
      />
    </div>
  );
};
