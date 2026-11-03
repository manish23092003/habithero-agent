import React from 'react';
import { 
  Check, 
  Clock, 
  BookOpen, 
  Activity, 
  Briefcase, 
  Target, 
  Zap, 
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
  learning: <BookOpen className="w-3.5 h-3.5 text-stone-500" />,
  productivity: <Target className="w-3.5 h-3.5 text-stone-500" />,
  health: <Activity className="w-3.5 h-3.5 text-stone-500" />,
  career: <Briefcase className="w-3.5 h-3.5 text-stone-500" />,
  mindfulness: <Activity className="w-3.5 h-3.5 text-stone-500" />
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

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200/70';
      case 'moderate':
        return 'bg-blue-50 text-blue-800 border-blue-200/70';
      case 'challenging':
        return 'bg-purple-50 text-purple-800 border-purple-200/70';
      default:
        return 'bg-stone-50 text-stone-700 border-stone-200';
    }
  };

  return (
    <article 
      id={`task-${task.id}`}
      className={`group relative rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${
        isCompleted
          ? 'bg-stone-50/70 border-stone-200/80 text-stone-600'
          : isAdapted
          ? 'bg-white border-amber-200/90 shadow-card hover:border-amber-300'
          : 'bg-white border-stone-200/90 shadow-card hover:border-stone-300 hover:shadow-card-hover'
      }`}
      aria-label={`Task: ${task.title}`}
    >
      <div className="flex items-start gap-3.5 sm:gap-4">
        {/* Custom SaaS Accessible Checkbox Button */}
        <button
          type="button"
          role="checkbox"
          aria-checked={isCompleted}
          disabled={isUpdating}
          onClick={handleCheckboxClick}
          aria-label={isCompleted ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
            isUpdating 
              ? 'opacity-60 cursor-not-allowed border-stone-300 bg-stone-100'
              : isCompleted
              ? 'border-brand-600 bg-brand-600 text-white shadow-xs'
              : 'border-stone-300 bg-white hover:border-brand-600 hover:bg-brand-50/40 text-transparent cursor-pointer'
          }`}
        >
          {isUpdating ? (
            <Loader2 className="w-3.5 h-3.5 text-stone-500 animate-spin" />
          ) : (
            <Check className={`w-4 h-4 stroke-[2.5] transition-transform ${isCompleted ? 'scale-100 text-white' : 'scale-0'}`} />
          )}
        </button>

        {/* Task Details Hierarchy */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header Row: Goal association & Day */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center gap-1.5 font-medium text-stone-500 text-xs truncate max-w-[200px] sm:max-w-[280px]">
                {categoryIcons[task.category]}
                <span className="truncate">{task.goalTitle}</span>
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-xs text-stone-500 font-semibold shrink-0">
                Day {task.dayNumber}
              </span>
            </div>

            {/* Time Commitment & Difficulty Badges */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/80">
                <Clock className="w-3 h-3 text-stone-500" />
                {task.durationMinutes} min
              </span>

              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize border ${getDifficultyColor(task.difficulty)}`}>
                {task.difficulty}
              </span>
            </div>
          </div>

          {/* Action Title */}
          <h3 
            className={`text-sm sm:text-base font-bold leading-snug transition-colors ${
              isCompleted 
                ? 'line-through text-stone-500 decoration-stone-400' 
                : 'text-stone-900 group-hover:text-stone-950'
            }`}
          >
            {task.title}
          </h3>

          {/* Action Description */}
          {task.description && (
            <p className={`text-xs leading-relaxed ${isCompleted ? 'text-stone-400' : 'text-stone-600'}`}>
              {task.description}
            </p>
          )}

          {/* Adaptation Callout Notice */}
          {isAdapted && task.adaptationNote && (
            <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-xs text-amber-950 flex items-center gap-2 animate-fade-in">
              <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-medium text-[11px] leading-tight">{task.adaptationNote}</span>
            </div>
          )}

          {/* Footer Metadata: Completion Timestamp or Quick Adapt Button */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100 text-xs">
            {isCompleted ? (
              <span className="inline-flex items-center gap-1.5 text-brand-700 text-[11px] font-semibold">
                <Check className="w-3.5 h-3.5 text-brand-600" />
                Completed {task.completedAt ? `at ${task.completedAt}` : 'Today'}
              </span>
            ) : (
              <div className="flex items-center gap-2 w-full justify-between">
                <span className="text-[11px] text-stone-400">
                  Scheduled for {task.scheduledFor}
                </span>

                {!isAdapted && (
                  <button
                    type="button"
                    onClick={() => onQuickAdapt(task.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 hover:text-amber-900 bg-amber-50/80 hover:bg-amber-100 px-2 py-1 rounded-lg border border-amber-200/60 transition-colors"
                  >
                    <Zap className="w-3 h-3 text-amber-600" />
                    <span>Shorten to 15 min</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
