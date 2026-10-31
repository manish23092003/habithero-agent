import React, { useState } from 'react';
import { 
  ListFilter, 
  Trophy, 
  Plus, 
  Sparkles,
  CalendarCheck
} from 'lucide-react';
import { DailyTask } from '../types';
import { DailyTaskCard } from './DailyTaskCard';

interface DailyActionFeedProps {
  tasks: DailyTask[];
  onToggleComplete: (taskId: string) => void;
  onQuickAdapt: (taskId: string) => void;
  onOpenNewGoal: () => void;
  onOpenCheckIn: () => void;
}

type FilterType = 'all' | 'pending' | 'completed';

export const DailyActionFeed: React.FC<DailyActionFeedProps> = ({
  tasks,
  onToggleComplete,
  onQuickAdapt,
  onOpenNewGoal,
  onOpenCheckIn
}) => {
  const [filter, setFilter] = useState<FilterType>('all');

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const displayedTasks = tasks.filter(task => {
    if (filter === 'pending') return task.status !== 'completed';
    if (filter === 'completed') return task.status === 'completed';
    return true;
  });

  const allCompleted = tasks.length > 0 && pendingTasks.length === 0;

  return (
    <div className="space-y-4">
      {/* Feed Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Today's Action Feed
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              {pendingTasks.length} remaining
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Focus on one action at a time. Never skip twice in a row.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100/90 p-1 rounded-xl border border-slate-200/60">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'pending'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({pendingTasks.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'completed'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed ({completedTasks.length})
          </button>
        </div>
      </div>

      {/* Celebration Banner when all completed */}
      {allCompleted && (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-6 text-center space-y-3 shadow-subtle">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-glow-emerald">
            <Trophy className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">
              100% Habit Consistency Today!
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Every scheduled action completed. You're building ironclad momentum. Don't forget to submit your evening reflection.
            </p>
          </div>
          <button
            onClick={onOpenCheckIn}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors"
          >
            <CalendarCheck className="w-4 h-4" />
            Complete Evening Check-In
          </button>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-3">
        {displayedTasks.map(task => (
          <DailyTaskCard
            key={task.id}
            task={task}
            onToggleComplete={onToggleComplete}
            onQuickAdapt={onQuickAdapt}
          />
        ))}

        {displayedTasks.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center bg-white space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <ListFilter className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800">
                No tasks match this filter
              </h4>
              <p className="text-xs text-slate-500">
                {filter === 'completed'
                  ? 'Complete your first task above to see it here.'
                  : 'All your tasks for today are checked off! Great job.'}
              </p>
            </div>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline"
              >
                View all tasks
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Proactive Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">
              Want to master another skill or daily routine?
            </p>
            <p className="text-[11px] text-slate-500">
              Tell HabitHero your target, and our AI will build your day-by-day roadmap.
            </p>
          </div>
        </div>
        <button
          onClick={onOpenNewGoal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New Goal</span>
        </button>
      </div>
    </div>
  );
};
