import React from 'react';
import { 
  Check, 
  Clock, 
  BookOpen, 
  Activity, 
  Briefcase, 
  Target, 
  Zap, 
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { DailyTask, GoalCategory } from '../types';
import { triggerTaskSuccessConfetti } from '../utils/confetti';

interface DailyTaskCardProps {
  task: DailyTask;
  onToggleComplete: (taskId: string) => void;
  onQuickAdapt: (taskId: string) => void;
}

const categoryIcons: Record<GoalCategory, React.ReactNode> = {
  learning: <BookOpen className="w-3.5 h-3.5" />,
  productivity: <Target className="w-3.5 h-3.5" />,
  health: <Activity className="w-3.5 h-3.5" />,
  career: <Briefcase className="w-3.5 h-3.5" />,
  mindfulness: <Activity className="w-3.5 h-3.5" />
};

const categoryBadgeStyles: Record<GoalCategory, string> = {
  learning: 'bg-blue-50 text-blue-700 border-blue-200',
  productivity: 'bg-purple-50 text-purple-700 border-purple-200',
  health: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  career: 'bg-amber-50 text-amber-700 border-amber-200',
  mindfulness: 'bg-teal-50 text-teal-700 border-teal-200'
};

export const DailyTaskCard: React.FC<DailyTaskCardProps> = ({
  task,
  onToggleComplete,
  onQuickAdapt
}) => {
  const isCompleted = task.status === 'completed';
  const isAdapted = task.status === 'adapted';

  const handleCheckboxClick = () => {
    if (!isCompleted) {
      triggerTaskSuccessConfetti();
    }
    onToggleComplete(task.id);
  };

  return (
    <div 
      className={`group relative rounded-xl border p-4 sm:p-5 transition-all duration-200 ${
        isCompleted
          ? 'bg-slate-50/80 border-slate-200 opacity-90'
          : isAdapted
          ? 'bg-gradient-to-r from-amber-50/40 via-white to-white border-amber-200 shadow-subtle hover:border-amber-300'
          : 'bg-white border-slate-200 shadow-subtle hover:border-emerald-300 hover:shadow-card'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Interactive Checkbox */}
        <button
          type="button"
          onClick={handleCheckboxClick}
          aria-label={isCompleted ? `Mark ${task.title} as incomplete` : `Mark ${task.title} as complete`}
          className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
            isCompleted
              ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
              : 'border-slate-300 bg-white hover:border-emerald-500 text-transparent'
          }`}
        >
          <Check className={`w-4 h-4 stroke-[3] transition-transform ${isCompleted ? 'scale-100' : 'scale-0'}`} />
        </button>

        {/* Task Details */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Top metadata row */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Category tag */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium border text-[11px] ${categoryBadgeStyles[task.category]}`}>
              {categoryIcons[task.category]}
              <span className="capitalize">{task.category}</span>
            </span>

            {/* Goal reference */}
            <span className="font-semibold text-slate-500 truncate max-w-[180px] sm:max-w-[260px]">
              {task.goalTitle}
            </span>

            {/* Duration pill */}
            <span className="inline-flex items-center gap-1 text-slate-500 font-medium ml-auto">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{task.durationMinutes} min</span>
            </span>

            {/* Difficulty */}
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
              task.difficulty === 'easy'
                ? 'bg-emerald-50 text-emerald-700'
                : task.difficulty === 'moderate'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-orange-50 text-orange-700'
            }`}>
              {task.difficulty}
            </span>
          </div>

          {/* Title & Description */}
          <div>
            <h3 className={`text-base font-bold tracking-tight text-slate-900 transition-colors ${
              isCompleted ? 'line-through text-slate-500' : ''
            }`}>
              {task.title}
            </h3>
            <p className={`text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed ${
              isCompleted ? 'text-slate-400' : ''
            }`}>
              {task.description}
            </p>
          </div>

          {/* Adaptation Note if applied */}
          {task.adaptationNote && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{task.adaptationNote}</span>
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-medium">
              Day {task.dayNumber} Action • {task.completedAt ? `Completed at ${task.completedAt}` : 'Due today'}
            </span>

            <div className="flex items-center gap-2">
              {!isCompleted && !isAdapted && (
                <button
                  type="button"
                  onClick={() => onQuickAdapt(task.id)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors text-[11px] font-medium"
                  title="Short of time? Ask AI to adapt task duration"
                >
                  <SlidersHorizontal className="w-3 h-3 text-slate-400" />
                  <span>Adapt to 15m</span>
                </button>
              )}

              {isAdapted && !isCompleted && (
                <span className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" />
                  Short Sprint Mode
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
