import React from 'react';
import { 
  Flame, 
  TrendingUp, 
  Calendar, 
  Award, 
  CheckCircle2, 
  Clock, 
  ShieldCheck 
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

  const todayDayIndex = (new Date().getDay() + 6) % 7; // Monday = 0, Sunday = 6
  const weeklyData = weekDays.map((day, idx) => {
    const isPast = idx < todayDayIndex;
    const isToday = idx === todayDayIndex;
    const isFuture = idx > todayDayIndex;

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
        <div className="pb-2 border-b border-stone-200/80">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900">
            Your Consistency & Progress
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Track your daily habits, weekly rhythm, and consistency over time.
          </p>
        </div>
      )}

      {/* 4 Prioritized Metric Cards */}
      <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
        {/* 1. Daily Streak */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-card space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
            <span>Daily Streak</span>
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 tabular-nums">
            {stats.currentStreak} <span className="text-xs font-normal text-stone-500">Days</span>
          </div>
          <p className="text-[11px] text-stone-500 truncate">
            {stats.currentStreak > 0 ? 'Days in a row' : 'Complete today’s task to start'}
          </p>
        </div>

        {/* 2. Completion Rate */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-card space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
            <span>Completion Rate</span>
            <TrendingUp className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 tabular-nums">
            {stats.consistencyRate !== undefined && stats.consistencyRate !== null ? `${stats.consistencyRate}%` : '0%'}
          </div>
          <p className="text-[11px] text-stone-500 truncate">
            {stats.totalCompletedTasks > 0 ? `${stats.totalCompletedTasks} tasks completed` : 'No tasks completed yet'}
          </p>
        </div>

        {/* 3. Best Streak */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-card space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
            <span>Best Streak</span>
            <Award className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 tabular-nums">
            {stats.longestStreak} <span className="text-xs font-normal text-stone-500">Days</span>
          </div>
          <p className="text-[11px] text-stone-500 truncate">
            {stats.longestStreak > 0 ? 'Your longest daily streak' : 'No active streak yet'}
          </p>
        </div>

        {/* 4. Bounce-Back Score */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-card space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
            <span>Bounce-Back Score</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 tabular-nums">
            {stats.recoveryResilienceScore !== null && stats.recoveryResilienceScore !== undefined ? `${stats.recoveryResilienceScore}%` : '—'}
          </div>
          <p className="text-[11px] text-stone-500 truncate">
            {stats.recoveryResilienceScore !== null && stats.recoveryResilienceScore !== undefined ? 'How well you get back on track' : 'Not enough activity yet'}
          </p>
        </div>
      </div>

      {/* 7-Day Weekly Rhythm Card */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
              This Week's Activity
            </h3>
          </div>
          <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
            {weeklyCompletedCount} of 7 days completed
          </span>
        </div>

        {/* 7-Day Bar Grid */}
        <div className="grid grid-cols-7 gap-2 text-center pt-2">
          {weeklyData.map((d, index) => {
            const isCompleted = d.count > 0;
            return (
              <div key={index} className="flex flex-col items-center gap-2">
                <span className={`text-[11px] font-semibold ${d.isToday ? 'text-brand-700 font-bold' : 'text-stone-500'}`}>
                  {d.label}
                </span>

                <div 
                  className={`w-full h-14 rounded-xl flex flex-col items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-brand-500 text-white shadow-xs'
                      : d.isToday
                      ? 'bg-amber-100/80 border-2 border-dashed border-amber-400 text-amber-900'
                      : d.isPast
                      ? 'bg-stone-100 text-stone-400'
                      : 'bg-stone-50 border border-stone-200/60 text-stone-300'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : d.isToday ? (
                    <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                  ) : (
                    <span className="text-[10px] font-mono">•</span>
                  )}
                </div>

                <span className="text-[10px] text-stone-400">
                  {isCompleted ? `${d.count} done` : d.isToday ? 'Today' : '-'}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-stone-500 pt-1 border-t border-stone-100 leading-relaxed">
          💡 <strong>Helpful Reminder:</strong> A missed day is just a bump in the road. What matters most is getting back on track the very next day!
        </p>
      </div>
    </div>
  );
};
