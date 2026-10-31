import React from 'react';
import { 
  Flame, 
  Trophy, 
  ShieldCheck, 
  TrendingUp, 
  Calendar, 
  HelpCircle,
  Award
} from 'lucide-react';
import { UserStats } from '../types';

interface ConsistencyTrackerProps {
  stats: UserStats;
}

export const ConsistencyTracker: React.FC<ConsistencyTrackerProps> = ({ stats }) => {
  // Generate 28-day sample heatmap days
  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const heatmapCells = Array.from({ length: 28 }, (_, i) => {
    // Generate realistic data: mostly 2 or 3 completed tasks, one day with 0 (which triggered recovery!)
    if (i === 19) return { day: i + 1, count: 0, status: 'missed' };
    if (i === 20) return { day: i + 1, count: 1, status: 'adapted' };
    if (i > 24) return { day: i + 1, count: 2, status: 'completed' };
    const count = (i % 3 === 0) ? 3 : 2;
    return { day: i + 1, count, status: 'completed' };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Consistency & Streak Analytics
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Tracking your behavioral momentum, adaptive bounce-backs, and long-term milestones.
        </p>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Current Streak */}
        <div className="rounded-xl border border-orange-200/80 bg-gradient-to-br from-orange-50/80 to-white p-4 shadow-subtle space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-orange-800">
            <span>Active Streak</span>
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-orange-950">
            {stats.currentStreak} <span className="text-xs font-semibold text-orange-700">Days</span>
          </div>
          <p className="text-[11px] text-orange-800/80">
            Target: 7-day milestone badge
          </p>
        </div>

        {/* Longest Streak */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-subtle space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Personal Best</span>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {stats.longestStreak} <span className="text-xs font-semibold text-slate-500">Days</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Achieved earlier this month
          </p>
        </div>

        {/* Consistency Rate */}
        <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white p-4 shadow-subtle space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
            <span>Consistency Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-950">
            {stats.consistencyRate}%
          </div>
          <p className="text-[11px] text-emerald-700">
            Top 10% of consistent learners
          </p>
        </div>

        {/* Recovery Resilience */}
        <div className="rounded-xl border border-teal-200/80 bg-gradient-to-br from-teal-50/80 to-white p-4 shadow-subtle space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-teal-800">
            <span className="flex items-center gap-1">
              Resilience Score
              <span title="Score measures how consistently you adapt and rebound after a missed task">
                <HelpCircle className="w-3 h-3 text-teal-600 cursor-help" />
              </span>
            </span>
            <ShieldCheck className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-teal-950">
            {stats.recoveryResilienceScore}%
          </div>
          <p className="text-[11px] text-teal-800">
            High adaptive bounce-back
          </p>
        </div>
      </div>

      {/* 28-Day Habit Heatmap Grid */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              28-Day Consistency Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Each block represents completed daily micro-actions.
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium self-start sm:self-auto">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-100 border border-slate-200" />
              0
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-300" />
              Adapted
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
              1-2
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
              3+
            </span>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-slate-400">
          {daysOfWeek.map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>

        {/* Heatmap Blocks */}
        <div className="grid grid-cols-7 gap-2">
          {heatmapCells.map(cell => {
            let colorClass = 'bg-slate-100 hover:ring-2 hover:ring-slate-300';
            if (cell.status === 'adapted') colorClass = 'bg-amber-300 hover:ring-2 hover:ring-amber-400';
            else if (cell.count === 1) colorClass = 'bg-emerald-300 hover:ring-2 hover:ring-emerald-400';
            else if (cell.count === 2) colorClass = 'bg-emerald-500 hover:ring-2 hover:ring-emerald-600';
            else if (cell.count >= 3) colorClass = 'bg-emerald-700 hover:ring-2 hover:ring-emerald-800';

            return (
              <div
                key={cell.day}
                title={`Day ${cell.day}: ${cell.count} tasks completed (${cell.status})`}
                className={`h-9 sm:h-11 rounded-lg flex flex-col items-center justify-center text-xs font-semibold cursor-pointer transition-all ${colorClass} ${
                  cell.count > 1 ? 'text-white' : 'text-slate-700'
                }`}
              >
                <span className="text-[10px] opacity-75">{cell.day}</span>
                {cell.status === 'adapted' ? (
                  <span className="text-[9px] font-bold text-amber-900 leading-none">⚡</span>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Science note on HabitHero Philosophy */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-emerald-600" />
            The HabitHero Philosophy: The "Never Miss Twice" Principle
          </span>
          <p className="leading-relaxed">
            Missing one day is an accident; missing two is the start of a new habit. HabitHero is designed around reducing task friction on hectic days to ensure your momentum remains unbroken.
          </p>
        </div>
      </div>
    </div>
  );
};
