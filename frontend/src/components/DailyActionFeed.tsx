import React, { useState } from 'react';
import { 
  ListFilter, 
  Trophy, 
  Plus, 
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
  inFlightTaskIds?: Set<string>;
}

type FilterType = 'all' | 'pending' | 'completed';

export const DailyActionFeed: React.FC<DailyActionFeedProps> = ({
  tasks,
  onToggleComplete,
  onQuickAdapt,
  onOpenNewGoal,
  onOpenCheckIn,
  inFlightTaskIds = new Set()
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
      {/* Feed Header with Task Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              Today's Actions
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {pendingTasks.length} {pendingTasks.length === 1 ? 'task pending' : 'tasks pending'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Focus on one micro-action at a time. The foundational habit rule: <em>Never miss twice</em>.
          </p>
        </div>

        {/* Filter Segmented Control */}
        <div 
          className="flex items-center gap-1 self-start sm:self-auto bg-slate-100 p-1 rounded-lg border border-slate-200/60" 
          role="tablist"
          aria-label="Filter tasks by completion status"
        >
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'all'}
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              filter === 'all'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'pending'}
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              filter === 'pending'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({pendingTasks.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'completed'}
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              filter === 'completed'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed ({completedTasks.length})
          </button>
        </div>
      </div>

      {/* Completion Banner */}
      {allCompleted && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 text-center space-y-2.5 shadow-subtle animate-fade-in">
          <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              All Actions Completed for Today
            </h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto mt-0.5 leading-relaxed">
              You've protected your momentum and completed all scheduled micro-tasks. Lock in your streak with an evening check-in.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCheckIn}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-subtle hover:shadow-card transition-all"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Complete Evening Reflection</span>
          </button>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-3" role="feed" aria-label="Daily micro-actions feed">
        {displayedTasks.map(task => (
          <DailyTaskCard
            key={task.id}
            task={task}
            onToggleComplete={onToggleComplete}
            onQuickAdapt={onQuickAdapt}
            isUpdating={inFlightTaskIds.has(task.id)}
          />
        ))}

        {tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 sm:p-10 text-center bg-white space-y-3 shadow-subtle">
            <div className="w-10 h-10 mx-auto rounded-xl bg-brand-50 border border-brand-200/60 flex items-center justify-center text-brand-600 shadow-xs">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h4 className="text-sm font-bold text-slate-900">
                No Daily Actions Scheduled Yet
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Create your first goal roadmap to generate your personalized daily micro-actions.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenNewGoal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-subtle transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Goal Plan</span>
            </button>
          </div>
        ) : displayedTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-white space-y-2">
            <div className="w-9 h-9 mx-auto rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
              <ListFilter className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs sm:text-sm font-semibold text-slate-800">
                No tasks match this filter
              </h4>
              <p className="text-xs text-slate-500">
                {filter === 'completed'
                  ? 'Complete an action above to see it recorded here.'
                  : 'All your actions for today are completed.'}
              </p>
            </div>
            {filter !== 'all' && (
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="text-xs font-semibold text-brand-700 hover:underline pt-1"
              >
                View all tasks
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Quick Add Goal Prompt Card */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-card">
        <div className="space-y-0.5">
          <p className="text-xs sm:text-sm font-bold text-slate-900">
            Have a new habit or skill you want to develop?
          </p>
          <p className="text-xs text-slate-500">
            HabitHero breaks your target into low-friction daily micro-sessions with progressive milestones.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenNewGoal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 hover:bg-slate-50 text-slate-800 transition-colors shrink-0 shadow-subtle"
        >
          <Plus className="w-3.5 h-3.5 text-slate-600" />
          <span>New Goal Plan</span>
        </button>
      </div>
    </div>
  );
};
