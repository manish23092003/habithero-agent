import React from 'react';
import { 
  Check, 
  Clock, 
  BookOpen, 
  Activity, 
  Briefcase, 
  Target, 
  Zap, 
  RotateCcw,
  Loader2
} from 'lucide-react';
import { DailyTask, GoalCategory } from '../types';
import { triggerTaskSuccessConfetti } from '../utils/confetti';

interface DailyTaskCardProps {
  task: DailyTask;
  onToggleComplete: (taskId: string) => void;
  onQuickAdapt: (taskId: string) => void;
  isUpdating?: boolean;
}

const categoryIcons: Record<GoalCategory, React.ReactNode> = {
  learning: <BookOpen className="w-3.5 h-3.5 text-slate-400" />,
  productivity: <Target className="w-3.5 h-3.5 text-slate-400" />,
  health: <Activity className="w-3.5 h-3.5 text-slate-400" />,
  career: <Briefcase className="w-3.5 h-3.5 text-slate-400" />,
  mindfulness: <Activity className="w-3.5 h-3.5 text-slate-400" />
};

export const DailyTaskCard: React.FC<DailyTaskCardProps> = ({
  task,
  onToggleComplete,
  onQuickAdapt,
  isUpdating = false
}) => {
  const isCompleted = task.status === 'completed';
  const isAdapted = task.status === 'adapted';

  const handleCheckboxClick = () => {
    if (isUpdating) return;
    if (!isCompleted) {
      triggerTaskSuccessConfetti();
    }
    onToggleComplete(task.id);
  };

  return (
    <article 
      id={`task-${task.id}`}
      className={`group relative rounded-xl border p-4 sm:p-5 transition-all duration-200 ${
        isCompleted
          ? 'bg-slate-50/70 border-slate-200/80 text-slate-600'
          : isAdapted
          ? 'bg-white border-amber-200/90 shadow-card hover:border-amber-300'
          : 'bg-white border-slate-200/90 shadow-card hover:border-slate-300 hover:shadow-card-hover'
      }`}
      aria-label={`Task: ${task.title}`}
    >
      <div className="flex items-start gap-3.5 sm:gap-4">
        {/* Custom SaaS Accessible Checkbox */}
        <button
          type="button"
          role="checkbox"
          aria-checked={isCompleted}
          disabled={isUpdating}
          onClick={handleCheckboxClick}
          aria-label={isCompleted ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
          className={`mt-0.5 flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-md border transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
            isUpdating 
              ? 'opacity-60 cursor-not-allowed border-slate-300 bg-slate-100'
              : isCompleted
              ? 'border-brand-600 bg-brand-600 text-white shadow-xs'
              : 'border-slate-300 bg-white hover:border-brand-600 hover:bg-brand-50/30 text-transparent cursor-pointer'
          }`}
        >
          {isUpdating ? (
            <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />
          ) : (
            <Check className={`w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5] transition-transform ${isCompleted ? 'scale-100 text-white' : 'scale-0'}`} />
          )}
        </button>

        {/* Task Details Hierarchy */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header Row: Goal / Habit Association & Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-500 text-xs truncate max-w-[200px] sm:max-w-[280px]">
                {categoryIcons[task.category]}
                <span className="truncate">{task.goalTitle}</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium shrink-0">
                Day {task.dayNumber}
              </span>
            </div>

            {/* Time Commitment & Difficulty Badge */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className="tabular-nums">{task.durationMinutes}m</span>
              </span>

              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                task.difficulty === 'easy'
                  ? 'bg-brand-50 text-brand-800 border border-brand-200/60'
                  : task.difficulty === 'moderate'
                  ? 'bg-slate-100 text-slate-700 border border-slate-200/60'
                  : 'bg-amber-50 text-amber-800 border border-amber-200/60'
              }`}>
                {task.difficulty}
              </span>
            </div>
          </div>

          {/* Primary Task Title (Visually Dominant) */}
          <div>
            <h3 className={`text-base sm:text-lg font-bold tracking-tight text-slate-900 transition-colors ${
              isCompleted ? 'line-through text-slate-500 decoration-slate-400' : ''
            }`}>
              {task.title}
            </h3>
            {task.description && (
              <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${
                isCompleted ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {task.description}
              </p>
            )}
          </div>

          {/* Optional Adaptation Explanation */}
          {task.adaptationNote && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{task.adaptationNote}</span>
            </div>
          )}

          {/* Card Footer: Status & Actions */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-[11px]">
            <span className="text-slate-400 font-medium">
              {isCompleted 
                ? (task.completedAt ? `Completed at ${task.completedAt}` : 'Completed today')
                : 'Scheduled for today'}
            </span>

            <div className="flex items-center gap-2">
              {!isCompleted && !isAdapted && (
                <button
                  type="button"
                  onClick={() => onQuickAdapt(task.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-slate-600 hover:text-brand-700 hover:bg-brand-50 border border-slate-200 transition-colors text-[11px] font-medium"
                  title="Short of time? Scale down to 15m to protect momentum"
                >
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>15m Sprint Mode</span>
                </button>
              )}

              {isAdapted && !isCompleted && (
                <span className="text-[11px] font-semibold text-amber-800 inline-flex items-center gap-1">
                  <RotateCcw className="w-3 h-3 text-amber-600" />
                  <span>Sprint Mode Active</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
