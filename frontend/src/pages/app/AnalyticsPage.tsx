import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Flame,
  Layers,
  PieChart,
  BarChart3,
  ShieldCheck,
  AlertCircle,
  Tag
} from 'lucide-react';
import { api } from '../../services/api';
import { UserAnalytics, WeeklyRhythmDay } from '../../types';

export const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get local client date in YYYY-MM-DD
      const localDate = new Date().toLocaleDateString('en-CA');
      
      try {
        const data = await api.getAnalytics(localDate);
        setAnalytics(data);
      } catch (backendErr: any) {
        // Fallback: calculate directly from user records if dedicated analytics endpoint is unavailable
        const [goalsData, tasksData, checkInsData] = await Promise.all([
          api.getGoals(),
          api.getAllTasks(),
          api.getCheckIns(),
        ]);

        const totalTasks = tasksData.length;
        const completedTasksList = tasksData.filter(t => t.status === 'completed');
        const completedTasks = completedTasksList.length;
        const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const currentStreak = goalsData.reduce((max, g) => Math.max(max, g.streak || 0), 0);
        const longestStreak = Math.max(currentStreak, checkInsData.length);

        // Bounce-back rate
        let bounceBackRate: number | null = null;
        const sortedCheckIns = [...checkInsData].sort((a, b) => a.date.localeCompare(b.date));
        const setbackIndices = sortedCheckIns
          .map((c, i) => (c.status === 'missed' || c.status === 'partial' ? i : -1))
          .filter(i => i !== -1 && i < sortedCheckIns.length - 1);
        if (setbackIndices.length > 0) {
          const recoveredCount = setbackIndices.filter(i => sortedCheckIns[i + 1]?.status === 'great').length;
          bounceBackRate = Math.round((recoveredCount / setbackIndices.length) * 100);
        }

        // Weekly rhythm
        const daysOfWeek: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'> = [
          'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
        ];
        const dayShorts = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        const [refY, refM, refD] = localDate.split('-').map(Number);
        const refDate = new Date(Date.UTC(refY, refM - 1, refD, 12, 0, 0));
        const dayOfWeek = refDate.getUTCDay();
        const distToMonday = (dayOfWeek + 6) % 7;
        const mondayUtcTime = refDate.getTime() - distToMonday * 86400000;

        let weeklyCompletedTotal = 0;
        const weeklyRhythm: WeeklyRhythmDay[] = daysOfWeek.map((dayLabel, idx) => {
          const dayDate = new Date(mondayUtcTime + idx * 86400000);
          const dateStr = dayDate.toISOString().split('T')[0];
          const tasksOnDay = tasksData.filter(t => {
            if (t.status !== 'completed') return false;
            return t.completedDate === dateStr || (t.completedAt && new Date(t.completedAt).toISOString().split('T')[0] === dateStr);
          });
          const scheduledOnDay = tasksData.filter(t => t.scheduledFor === dateStr || (t.scheduledFor === 'Today' && dateStr === localDate));
          const completedCount = tasksOnDay.length;
          const scheduledCount = Math.max(scheduledOnDay.length, completedCount);
          let percentage = 0;
          if (scheduledCount > 0 && completedCount > 0) {
            percentage = Math.min(100, Math.round((completedCount / scheduledCount) * 100));
          } else if (completedCount > 0) {
            percentage = 100;
          }
          weeklyCompletedTotal += completedCount;
          return {
            day: dayLabel,
            short: dayShorts[idx],
            date: dateStr,
            completedCount,
            scheduledCount,
            percentage,
          };
        });

        const categoryCounts: Record<string, number> = {};
        goalsData.forEach(g => {
          if (g.category) {
            categoryCounts[g.category] = (categoryCounts[g.category] || 0) + 1;
          }
        });

        const habitBreakdown = goalsData.map(g => ({
          id: g.id,
          title: g.title,
          category: g.category,
          currentDay: g.currentDay,
          targetDays: g.targetDays,
          dailyCommitmentMinutes: g.dailyCommitmentMinutes,
          streak: g.streak || 0,
          status: g.status,
        }));

        setAnalytics({
          taskCompletionRate,
          totalTasks,
          completedTasks,
          currentStreak,
          longestStreak,
          bounceBackRate,
          weeklyRhythm,
          weeklyCompletedTotal,
          categoryCounts,
          activeGoalsCount: goalsData.length,
          totalPlannedDailyMinutes: goalsData.reduce((acc, g) => acc + g.dailyCommitmentMinutes, 0),
          habitBreakdown,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load progress data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 bg-[#E9ECE7] rounded w-48"></div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-white rounded-3xl border border-[#E9ECE7]"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-white rounded-3xl border border-[#E9ECE7]"></div>
          <div className="h-64 bg-white rounded-3xl border border-[#E9ECE7]"></div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-red-200 text-center max-w-lg mx-auto shadow-sm my-12">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="font-bold text-[#26352D] text-lg mb-1">Could Not Load Progress</h3>
        <p className="text-xs text-[#5F6F65] mb-4">{error || 'Unable to retrieve your analytics'}</p>
        <button
          onClick={loadAnalytics}
          className="px-4 py-2 bg-[#245C46] text-white rounded-xl text-xs font-semibold hover:bg-[#1b4736]"
        >
          Try Again
        </button>
      </div>
    );
  }

  const {
    taskCompletionRate,
    totalTasks,
    completedTasks,
    currentStreak,
    longestStreak,
    bounceBackRate,
    weeklyRhythm,
    weeklyCompletedTotal,
    categoryCounts,
    activeGoalsCount,
    totalPlannedDailyMinutes,
    habitBreakdown,
  } = analytics;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#26352D]">Your Progress & Insights</h1>
        <p className="text-sm text-[#5F6F65] mt-1">
          See how your habits are growing over time, track your streaks, and celebrate steady progress.
        </p>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Completion Rate */}
        <div className="bg-white p-5 rounded-3xl border border-[#E9ECE7] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-[#5F6F65]">
            <span className="font-semibold">Completion Rate</span>
            <TrendingUp className="w-4 h-4 text-[#245C46]" />
          </div>
          <div className="text-3xl font-bold text-[#26352D] font-mono">
            {totalTasks > 0 ? `${taskCompletionRate}%` : '0%'}
          </div>
          <p className="text-[11px] text-[#5F6F65]">
            {totalTasks > 0 ? `${completedTasks} of ${totalTasks} tasks completed` : 'No tasks created yet'}
          </p>
        </div>

        {/* 2. Daily Streak */}
        <div className="bg-white p-5 rounded-3xl border border-[#E9ECE7] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-[#5F6F65]">
            <span className="font-semibold">Daily Streak</span>
            <Flame className="w-4 h-4 text-[#E8B96B]" />
          </div>
          <div className="text-3xl font-bold text-[#26352D] font-mono">
            {currentStreak} <span className="text-sm font-sans font-normal text-[#5F6F65]">days</span>
          </div>
          <p className="text-[11px] text-[#5F6F65]">
            {currentStreak > 0 ? `Best record: ${longestStreak} days in a row` : 'No active streak yet'}
          </p>
        </div>

        {/* 3. Bounce-Back Rate */}
        <div className="bg-white p-5 rounded-3xl border border-[#E9ECE7] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-[#5F6F65]">
            <span className="font-semibold">Bounce-Back Rate</span>
            <ShieldCheck className="w-4 h-4 text-[#245C46]" />
          </div>
          <div className="text-3xl font-bold text-[#26352D] font-mono">
            {bounceBackRate !== null && bounceBackRate !== undefined ? `${bounceBackRate}%` : '—'}
          </div>
          <p className="text-[11px] text-[#5F6F65]">
            {bounceBackRate !== null && bounceBackRate !== undefined
              ? 'Getting back on track after busy days'
              : 'Not enough activity yet'}
          </p>
        </div>

        {/* 4. Active Habits */}
        <div className="bg-white p-5 rounded-3xl border border-[#E9ECE7] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-[#5F6F65]">
            <span className="font-semibold">Active Habits</span>
            <Layers className="w-4 h-4 text-[#245C46]" />
          </div>
          <div className="text-3xl font-bold text-[#26352D] font-mono">
            {activeGoalsCount}
          </div>
          <p className="text-[11px] text-[#5F6F65]">
            {activeGoalsCount > 0 ? `${totalPlannedDailyMinutes} mins total planned daily` : 'No active habits yet'}
          </p>
        </div>
      </div>

      {/* 2-Column Section: Day-of-Week Rhythm & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Day-of-Week Rhythm */}
        <div className="bg-white rounded-3xl p-6 border border-[#E9ECE7] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#26352D]">Your Weekly Rhythm</h3>
              <p className="text-xs text-[#5F6F65]">How consistently you complete habits throughout the week</p>
            </div>
            <BarChart3 className="w-5 h-5 text-[#245C46]" />
          </div>

          <div className="pt-4 flex items-end justify-between gap-3 h-48">
            {weeklyRhythm.map(dayInfo => {
              const heightPercent = dayInfo.percentage;
              return (
                <div key={dayInfo.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[10px] font-mono text-[#5F6F65]">{heightPercent}%</span>
                  <div className="w-full bg-[#F7F7F2] rounded-xl overflow-hidden h-36 flex items-end">
                    <div
                      className="w-full bg-[#245C46] rounded-xl transition-all duration-500 hover:bg-[#1b4736]"
                      style={{ height: `${heightPercent}%` }}
                      title={`${dayInfo.day}: ${dayInfo.completedCount} completed (${heightPercent}%)`}
                    />
                  </div>
                  <span className="text-xs font-bold text-[#26352D]">{dayInfo.day}</span>
                </div>
              );
            })}
          </div>

          {weeklyCompletedTotal === 0 && (
            <div className="p-3 bg-[#F7F7F2] rounded-2xl border border-dashed border-[#E9ECE7] text-center text-xs text-[#5F6F65]">
              No tasks completed yet this week. Complete today's tasks to build your weekly rhythm!
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-[#E9ECE7] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#26352D]">Habits by Category</h3>
              <p className="text-xs text-[#5F6F65]">See how your habits are balanced across life areas</p>
            </div>
            <PieChart className="w-5 h-5 text-[#245C46]" />
          </div>

          <div className="space-y-3 pt-2">
            {Object.keys(categoryCounts).length === 0 ? (
              <div className="text-center py-10 text-xs text-[#5F6F65]">
                No active habits yet.
              </div>
            ) : (
              Object.entries(categoryCounts).map(([cat, count]) => {
                const percent = Math.round((count / activeGoalsCount) * 100);
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="capitalize text-[#26352D] flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-[#245C46]" />
                        {cat}
                      </span>
                      <span className="text-[#5F6F65] font-mono">
                        {count} {count === 1 ? 'habit' : 'habits'} ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#E9ECE7] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#245C46] rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Habit-by-Habit Performance Table */}
      <div className="bg-white rounded-3xl p-6 border border-[#E9ECE7] shadow-sm space-y-4">
        <h3 className="text-base font-bold text-[#26352D]">Habit Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E9ECE7] text-[#5F6F65] font-bold">
                <th className="pb-3 font-semibold">Habit</th>
                <th className="pb-3 font-semibold">Category</th>
                <th className="pb-3 font-semibold">Progress</th>
                <th className="pb-3 font-semibold">Daily Time</th>
                <th className="pb-3 font-semibold">Daily Streak</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9ECE7]">
              {habitBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#5F6F65]">
                    No habit records to display.
                  </td>
                </tr>
              ) : (
                habitBreakdown.map(goal => (
                  <tr key={goal.id} className="hover:bg-[#F7F7F2]/50 transition-colors">
                    <td className="py-3.5 font-bold text-[#26352D]">{goal.title}</td>
                    <td className="py-3.5 capitalize text-[#5F6F65]">{goal.category}</td>
                    <td className="py-3.5 text-[#5F6F65]">
                      Day {goal.currentDay} of {goal.targetDays}
                    </td>
                    <td className="py-3.5 font-mono text-[#26352D]">{goal.dailyCommitmentMinutes}m</td>
                    <td className="py-3.5 font-mono font-bold text-[#245C46]">
                      {goal.streak || 0}d
                    </td>
                    <td className="py-3.5">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-emerald-50 text-emerald-800">
                        {goal.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
