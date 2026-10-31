import React from 'react';
import { 
  Flame, 
  TrendingUp, 
  Calendar, 
  Award,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { UserStats, DailyTask } from '../types';

interface ConsistencyTrackerProps {
  stats: UserStats;
  tasks?: DailyTask[];
  compact?: boolean;
}

export const ConsistencyTracker: React.FC<ConsistencyTrackerProps> = ({ 
  stats,
  tasks = [],
  compact = false 
}) => {
  const completedToday = tasks.filter(t => t.status === 'completed').length;
  const totalToday = tasks.length;
  const todayPercentage = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 100;

  // Day names for the current week
  const weekDays = [
    { label: 'Mon', short: 'M' },
    { label: 'Tue', short: 'T' },
    { label: 'Wed', short: 'W' },
    { label: 'Thu', short: 'T' },
    { label: 'Fri', short: 'F' },
    { label: 'Sat', short: 'S' },
    { label: 'Sun', short: 'S' },
  ];

  // Map weekly completions from actual stats.weeklyCompleted or fall back to current streak distribution
  const todayDayIndex = (new Date().getDay() + 6) % 7; // Monday = 0, Sunday = 6
  const weeklyData = weekDays.map((day, idx) => {
    const isPast = idx < todayDayIndex;
    const isToday = idx === todayDayIndex;
    const isFuture = idx > todayDayIndex;

    // Use stats.weeklyCompleted if provided, otherwise derive from current streak and today's tasks
    let count = 0;
    if (Array.isArray(stats.weeklyCompleted) && stats.weeklyCompleted[idx] !== undefined) {
      count = stats.weeklyCompleted[idx];
    } else if (isToday) {
      count = completedToday;
    } else if (isPast) {
      count = (stats.currentStreak > (todayDayIndex - idx)) ? 1 : 0;
    }

    return {
      ...day,
      isToday,
      isPast,
      isFuture,
      count,
      status: count > 0 ? 'completed' : isToday && totalToday > 0 ? 'pending' : 'scheduled'
    };
  });

  const weeklyCompletedCount = weeklyData.filter(d => d.count > 0).length;

  return (
    <div className="space-y-4">
      {/* Header (Only on dedicated Analytics tab) */}
      {!compact && (
        <div className="pb-2 border-b border-slate-200/80">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            Consistency & Streak Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tracking your behavioral momentum, weekly execution, and habit resilience.
          </p>
        </div>
      )}

      {/* 4 Prioritized Metric Cards */}
      <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
        {/* 1. Active Streak */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-card space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Active Streak</span>
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
            {stats.currentStreak} <span className="text-xs font-normal text-slate-500">Days</span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            {stats.currentStreak > 0 ? 'Unbroken daily continuity' : 'Kickoff today to build streak'}
          </p>
        </div>

        {/* 2. Consistency Rate */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-card space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Consistency Rate</span>
            <TrendingUp className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
            {stats.consistencyRate}%
          </div>
          <p className="text-[11px] text-brand-700 truncate font-medium">
            Scheduled action follow-through
          </p>
        </div>

        {/* 3. Today's Completion */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-card space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Today's Actions</span>
            <CheckCircle2 className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
            {completedToday}/{totalToday} <span className="text-xs font-normal text-slate-500">({todayPercentage}%)</span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            {completedToday === totalToday && totalToday > 0 
              ? 'Daily objective fulfilled' 
              : `${totalToday - completedToday} pending action(s)`}
          </p>
        </div>

        {/* 4. Weekly Progress */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-card space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Weekly Progress</span>
            <Calendar className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
            {weeklyCompletedCount} of 7 <span className="text-xs font-normal text-slate-500">Days</span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            {weeklyCompletedCount >= 5 ? 'High weekly consistency' : 'Momentum in progress'}
          </p>
        </div>
      </div>

      {/* Weekly Progress Bar & Day Tracker */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-card space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand-600" />
              <span>Current Week Progress</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Daily habit execution for this week
            </p>
          </div>
          <span className="text-xs font-bold text-brand-800 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200/60 tabular-nums">
            {weeklyCompletedCount}/7 Days Completed
          </span>
        </div>

        {/* 7-Day Matrix */}
        <div className="grid grid-cols-7 gap-2">
          {weeklyData.map((d, i) => {
            const isDone = d.count > 0;
            return (
              <div 
                key={i} 
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  isDone
                    ? 'bg-brand-50 border-brand-300 text-brand-900 font-bold'
                    : d.isToday
                    ? 'bg-white border-brand-500 ring-2 ring-brand-500/20 text-slate-900 font-semibold'
                    : 'bg-slate-50/70 border-slate-200 text-slate-400'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-500 mb-1">
                  {d.label}
                </span>
                <div className="flex items-center justify-center h-6">
                  {isDone ? (
                    <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px]">
                      ✓
                    </span>
                  ) : d.isToday ? (
                    <span className="text-xs font-bold text-brand-700">Today</span>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Behavioral Philosophy (Only in full Analytics tab) */}
      {!compact && (
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-card space-y-2">
          <h4 className="text-xs uppercase font-bold tracking-wider text-slate-600 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-brand-600" />
            <span>Habit Mastery Principle: Never Miss Twice</span>
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Behavioral science confirms that an isolated missed day does not degrade long-term habit formation. Missing two consecutive days, however, begins ingraining avoidance. When schedule friction spikes, HabitHero automatically offers 15-minute micro-sprints to preserve psychological continuity.
          </p>
        </div>
      )}
    </div>
  );
};
