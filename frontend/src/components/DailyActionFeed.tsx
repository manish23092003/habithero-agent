import React, { useState } from 'react';
import { 
  Trophy, 
  Plus, 
  CalendarCheck,
  CheckCircle2,
  Inbox
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900">
              Today's Tasks
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
              {pendingTasks.length} {pendingTasks.length === 1 ? 'task remaining' : 'tasks remaining'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Focus on one small step at a time. Even 15 minutes keeps your momentum going.
          </p>
        </div>

        {/* Filter Segmented Control */}
        <div 
          className="flex items-center gap-1 self-start sm:self-auto bg-stone-100/90 p-1 rounded-xl border border-stone-200/70" 
          role="tablist"
          aria-label="Filter tasks by status"
        >
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'all'}
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === 'all'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'pending'}
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === 'pending'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Pending ({pendingTasks.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'completed'}
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === 'completed'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Completed ({completedTasks.length})
          </button>
        </div>
      </div>

      {/* Task Cards List */}
      <div className="space-y-3" role="feed" aria-label="Daily task list">
        {displayedTasks.length === 0 ? (
          <div className="rounded-2xl border border-stone-200/90 bg-white p-8 sm:p-12 text-center space-y-4 shadow-card">
            {filter === 'completed' && completedTasks.length === 0 ? (
              <>
                <div className="w-12 h-12 mx-auto rounded-xl bg-stone-100 flex items-center justify-center text-stone-500">
                  <Inbox className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="text-base font-bold text-stone-900">No tasks completed yet today</h3>
                  <p className="text-xs text-stone-500">
                    Choose a task above and check it off when you're done.
                  </p>
                </div>
              </>
            ) : filter === 'pending' && allCompleted ? (
              <>
                <div className="w-12 h-12 mx-auto rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center shadow-xs">
                  <Trophy className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="text-base font-bold text-stone-900">All tasks completed! 🎉</h3>
                  <p className="text-xs text-stone-500">
                    You've finished everything on your list today! Take a moment to reflect on your day.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenCheckIn}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-subtle hover:shadow-card transition-all"
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>Complete Daily Reflection</span>
                </button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 mx-auto rounded-xl bg-stone-100 flex items-center justify-center text-stone-400">
                  <Inbox className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="text-base font-bold text-stone-900">No tasks scheduled</h3>
                  <p className="text-xs text-stone-500">
                    Add a new habit to start building your daily routine.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenNewGoal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-subtle transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Habit</span>
                </button>
              </>
            )}
          </div>
        ) : (
          displayedTasks.map(task => (
            <DailyTaskCard
              key={task.id}
              task={task}
              onToggleComplete={onToggleComplete}
              onQuickAdapt={onQuickAdapt}
              isUpdating={inFlightTaskIds.has(task.id)}
            />
          ))
        )}
      </div>

      {/* Congratulatory banner when all tasks are finished */}
      {allCompleted && filter === 'all' && (
        <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-200/80 text-brand-900 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-subtle animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-brand-900">
                All Tasks Done for Today!
              </h4>
              <p className="text-xs text-brand-700">
                You completed all {tasks.length} tasks today! Great job staying consistent.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenCheckIn}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-subtle transition-colors shrink-0"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Complete Daily Reflection</span>
          </button>
        </div>
      )}
    </div>
  );
};
