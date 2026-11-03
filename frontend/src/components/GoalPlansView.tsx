import React, { useState } from 'react';
import { 
  Target, 
  Clock, 
  Flame, 
  ChevronRight, 
  Plus, 
  BookOpen, 
  Activity, 
  Briefcase, 
  MessageSquare 
} from 'lucide-react';
import { Goal, GoalCategory } from '../types';

interface GoalPlansViewProps {
  goals: Goal[];
  onOpenNewGoal: () => void;
  onSelectGoalForChat?: (goal: Goal) => void;
}

const categoryIcons: Record<GoalCategory, React.ReactNode> = {
  learning: <BookOpen className="w-4 h-4 text-stone-500" />,
  productivity: <Target className="w-4 h-4 text-stone-500" />,
  health: <Activity className="w-4 h-4 text-stone-500" />,
  career: <Briefcase className="w-4 h-4 text-stone-500" />,
  mindfulness: <Activity className="w-4 h-4 text-stone-500" />
};

export const GoalPlansView: React.FC<GoalPlansViewProps> = ({
  goals,
  onOpenNewGoal,
  onSelectGoalForChat
}) => {
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(goals[0]?.id || null);

  const toggleExpand = (goalId: string) => {
    setExpandedGoalId(prev => (prev === goalId ? null : goalId));
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900">
              Your Habit Plans
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/80">
              {goals.length} {goals.length === 1 ? 'Active Habit Plan' : 'Active Habit Plans'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Every habit is broken down into gentle phases so you can make steady, sustainable progress.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewGoal}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-subtle hover:shadow-card transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Habit Plan</span>
        </button>
      </div>

      {/* Goal Cards */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 sm:p-12 text-center space-y-4 shadow-subtle">
            <div className="w-12 h-12 mx-auto rounded-xl bg-brand-50 border border-brand-200/60 flex items-center justify-center text-brand-600 shadow-xs">
              <Target className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-stone-900">
                No Habit Plans Yet
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
                Every lasting habit begins with a single step. We break your goal down into clear phases so it's easy to stick with.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenNewGoal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-subtle hover:shadow-card transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Habit Plan</span>
            </button>
          </div>
        ) : (
          goals.map(goal => {
            const isExpanded = expandedGoalId === goal.id;
            const progressPercent = Math.min(
              100,
              Math.round((goal.currentDay / goal.targetDays) * 100)
            );

            return (
              <div 
                key={goal.id}
                className="rounded-2xl border border-stone-200/90 bg-white shadow-card hover:shadow-card-hover transition-all overflow-hidden"
              >
                {/* Header Summary Row */}
                <div 
                  className="p-5 sm:p-6 cursor-pointer select-none space-y-4"
                  onClick={() => toggleExpand(goal.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center shrink-0 mt-0.5">
                        {categoryIcons[goal.category]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-stone-900 truncate">
                            {goal.title}
                          </h3>
                          {goal.streak > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 shrink-0">
                              <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                              {goal.streak}d streak
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5 truncate">
                          {goal.tagline}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                        <Clock className="w-3 h-3 text-stone-500" />
                        {goal.dailyCommitmentMinutes}m / day
                      </span>

                      <span className="text-xs font-semibold text-stone-500 px-2 py-0.5 bg-stone-50 rounded-lg">
                        Day {goal.currentDay} of {goal.targetDays}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
                      <span>Overall Progress</span>
                      <span className="font-bold text-stone-900">{progressPercent}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                      <div 
                        className="h-full bg-brand-500 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                    <span className="text-stone-400 font-medium">
                      {isExpanded ? 'Hide step details' : `View ${goal.planOutline.length} steps`}
                    </span>

                    <div className="flex items-center gap-3">
                      {onSelectGoalForChat && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectGoalForChat(goal);
                          }}
                          className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Discuss with Coach</span>
                        </button>
                      )}
                      <ChevronRight className={`w-4 h-4 text-stone-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </div>

                {/* Expanded Phase Breakdown */}
                {isExpanded && (
                  <div className="px-5 sm:px-6 pb-6 pt-2 bg-stone-50/60 border-t border-stone-200/70 space-y-3 animate-fade-in">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Plan Steps & Timeline
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {goal.planOutline.map((phase) => (
                        <div 
                          key={phase.phaseNumber}
                          className="rounded-xl border border-stone-200 bg-white p-3.5 space-y-2 shadow-xs"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-brand-700">Phase {phase.phaseNumber}</span>
                            <span className="text-[11px] font-mono text-stone-400">{phase.dayRange}</span>
                          </div>
                          <h5 className="text-xs font-bold text-stone-900 leading-snug">
                            {phase.title}
                          </h5>
                          <p className="text-[11px] text-stone-600 leading-relaxed">
                            {phase.focus}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
