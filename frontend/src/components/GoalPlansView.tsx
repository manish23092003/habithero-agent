import React, { useState } from 'react';
import { 
  Target, 
  Clock, 
  Flame, 
  ChevronRight, 
  CheckCircle2, 
  Plus, 
  BookOpen, 
  Activity, 
  Briefcase, 
  Zap,
  Layers,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { Goal, GoalCategory } from '../types';

interface GoalPlansViewProps {
  goals: Goal[];
  onOpenNewGoal: () => void;
  onSelectGoalForChat?: (goal: Goal) => void;
}

const categoryIcons: Record<GoalCategory, React.ReactNode> = {
  learning: <BookOpen className="w-3.5 h-3.5" />,
  productivity: <Target className="w-3.5 h-3.5" />,
  health: <Activity className="w-3.5 h-3.5" />,
  career: <Briefcase className="w-3.5 h-3.5" />,
  mindfulness: <Activity className="w-3.5 h-3.5" />
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              Active Goal Roadmaps
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/80">
              {goals.length} {goals.length === 1 ? 'Active Plan' : 'Active Plans'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Every goal is structured into sequential phases by HabitHero to prevent overload and ensure progressive overload.
          </p>
        </div>

        <button
          onClick={onOpenNewGoal}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-subtle hover:shadow-card transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal Plan</span>
        </button>
      </div>

      {/* Goal Cards */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 sm:p-12 text-center space-y-4 shadow-subtle">
            <div className="w-12 h-12 mx-auto rounded-xl bg-brand-50 border border-brand-200/60 flex items-center justify-center text-brand-600 shadow-xs">
              <Target className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-900">
                No Active Goal Roadmaps Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Every habit begins with a single focused roadmap. HabitHero structures your ambition into manageable phases to guarantee daily consistency.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenNewGoal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-subtle hover:shadow-card transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Goal Roadmap</span>
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
                className="rounded-xl border border-slate-200/90 bg-white shadow-card overflow-hidden transition-all hover:border-slate-300"
              >
              {/* Header section */}
              <div 
                onClick={() => toggleExpand(goal.id)}
                className="p-5 sm:p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpand(goal.id);
                  }
                }}
                aria-expanded={isExpanded}
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 capitalize border border-slate-200/70">
                      {categoryIcons[goal.category]}
                      {goal.category}
                    </span>

                    {goal.status === 'recovery' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <Zap className="w-3 h-3 text-amber-600" />
                        Adaptive Recovery Active
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400 font-medium">
                      Started {new Date(goal.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {goal.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">
                    {goal.tagline}
                  </p>
                </div>

                {/* Right stats & expand button */}
                <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right space-y-1">
                    <div className="flex items-center sm:justify-end gap-1.5 text-xs text-slate-600 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{goal.dailyCommitmentMinutes}m / day</span>
                    </div>

                    <div className="flex items-center sm:justify-end gap-1.5 text-xs font-semibold text-amber-600">
                      <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{goal.streak}-day streak</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-24 sm:w-28 text-right">
                      <span className="text-xs font-bold text-slate-800 tabular-nums">
                        Day {goal.currentDay} / {goal.targetDays}
                      </span>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div 
                          className="bg-brand-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div 
                      className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition-transform duration-200 ${isExpanded ? 'rotate-90 bg-slate-100 text-slate-700' : ''}`}
                      aria-label="Toggle goal details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Roadmap Breakdown */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/70 p-5 sm:p-6 space-y-4">
                  {goal.adaptationNotice && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200/90 text-amber-900 text-xs font-medium flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{goal.adaptationNotice}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="text-xs uppercase tracking-wider font-bold text-slate-600 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      Curated Milestone Phases
                    </h4>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Calibrated by HabitHero Autonomous Companion
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {goal.planOutline.map((phase, idx) => {
                      const isCurrentPhase = idx === 0 && goal.currentDay <= 7;
                      const isPastPhase = false;

                      return (
                        <div
                          key={phase.phaseNumber}
                          className={`rounded-xl border p-4 space-y-2 transition-all ${
                            isCurrentPhase
                              ? 'bg-white border-brand-300 shadow-subtle ring-1 ring-brand-500/20'
                              : isPastPhase
                              ? 'bg-slate-100/80 border-slate-200 text-slate-600'
                              : 'bg-white/80 border-slate-200/90 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Phase {phase.phaseNumber}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
                              {phase.dayRange}
                            </span>
                          </div>

                          <h5 className="text-sm font-bold text-slate-900">
                            {phase.title}
                          </h5>

                          <p className="text-xs text-slate-500 leading-relaxed">
                            {phase.focus}
                          </p>

                          <div className="pt-2 flex items-center justify-between text-[11px] border-t border-slate-100 font-medium">
                            <span className="text-slate-400">{phase.tasksPlanned} micro-tasks</span>
                            {isPastPhase ? (
                              <span className="inline-flex items-center gap-1 text-brand-600 font-semibold">
                                <CheckCircle2 className="w-3 h-3" />
                                Mastered
                              </span>
                            ) : isCurrentPhase ? (
                              <span className="inline-flex items-center gap-1 text-brand-700 font-semibold">
                                Active Phase
                              </span>
                            ) : (
                              <span className="text-slate-400">Scheduled</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Ask Companion regarding this goal */}
                  <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-200/60">
                    <span className="text-xs text-slate-500">
                      Need to accelerate or reschedule this roadmap?
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectGoalForChat && onSelectGoalForChat(goal)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                      <span>Ask HabitHero Companion to adjust roadmap</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
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
