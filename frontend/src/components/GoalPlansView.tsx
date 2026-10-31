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
  Layers
} from 'lucide-react';
import { Goal, GoalCategory } from '../types';

interface GoalPlansViewProps {
  goals: Goal[];
  onOpenNewGoal: () => void;
  onSelectGoalForChat?: (goal: Goal) => void;
}

const categoryIcons: Record<GoalCategory, React.ReactNode> = {
  learning: <BookOpen className="w-4 h-4" />,
  productivity: <Target className="w-4 h-4" />,
  health: <Activity className="w-4 h-4" />,
  career: <Briefcase className="w-4 h-4" />,
  mindfulness: <Activity className="w-4 h-4" />
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Active Goal Roadmaps
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {goals.length} Active Plans
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Every goal is automatically phased by HabitHero to prevent overload and build mastery.
          </p>
        </div>

        <button
          onClick={onOpenNewGoal}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Goal Plan</span>
        </button>
      </div>

      {/* Goal Cards */}
      <div className="space-y-4">
        {goals.map(goal => {
          const isExpanded = expandedGoalId === goal.id;
          const progressPercent = Math.min(
            100,
            Math.round((goal.currentDay / goal.targetDays) * 100)
          );

          return (
            <div
              key={goal.id}
              className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden transition-all hover:border-slate-300"
            >
              {/* Header section */}
              <div 
                onClick={() => toggleExpand(goal.id)}
                className="p-5 sm:p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                      {categoryIcons[goal.category]}
                      {goal.category}
                    </span>

                    {goal.status === 'recovery' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <Zap className="w-3 h-3 text-amber-600" />
                        Adaptive Recovery Active
                      </span>
                    )}

                    <span className="text-xs text-slate-500 font-medium">
                      Created on {new Date(goal.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    {goal.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600">
                    {goal.tagline}
                  </p>
                </div>

                {/* Right stats & expand button */}
                <div className="flex items-center gap-4 sm:gap-6 self-start md:self-center">
                  <div className="text-right space-y-1">
                    <div className="flex items-center justify-end gap-1.5 text-xs text-slate-600 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{goal.dailyCommitmentMinutes}m / day</span>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-orange-600">
                      <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                      <span>{goal.streak}-day streak</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-20 sm:w-28 text-right">
                      <span className="text-xs font-bold text-slate-900">
                        Day {goal.currentDay}/{goal.targetDays}
                      </span>
                      <div className="w-full bg-slate-100 rounded-full h-2 mt-1 overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-2 rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <button 
                      type="button" 
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                      aria-label="Expand goal details"
                    >
                      <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Roadmap Breakdown */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/60 p-5 sm:p-6 space-y-4">
                  {goal.adaptationNotice && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{goal.adaptationNotice}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <h4 className="text-xs uppercase tracking-wider font-bold text-slate-600 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      Curated Milestone Phases
                    </h4>
                    <span className="text-xs text-slate-500 font-medium">
                      Designed by HabitHero Companion
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {goal.planOutline.map((phase, idx) => {
                      const isCurrentPhase = idx === 1; // e.g. Day 8 is in Phase 2
                      const isPastPhase = idx === 0;

                      return (
                        <div
                          key={phase.phaseNumber}
                          className={`rounded-xl border p-4 space-y-2 transition-all ${
                            isCurrentPhase
                              ? 'bg-white border-emerald-400 shadow-sm ring-1 ring-emerald-500/20'
                              : isPastPhase
                              ? 'bg-slate-100/80 border-slate-200 text-slate-600'
                              : 'bg-white/60 border-slate-200/80 text-slate-500'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              Phase {phase.phaseNumber}
                            </span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700">
                              {phase.dayRange}
                            </span>
                          </div>

                          <h5 className="text-sm font-bold text-slate-900">
                            {phase.title}
                          </h5>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            {phase.focus}
                          </p>

                          <div className="pt-2 flex items-center justify-between text-[11px] border-t border-slate-100 font-medium">
                            <span className="text-slate-500">{phase.tasksPlanned} micro-tasks</span>
                            {isPastPhase ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                <CheckCircle2 className="w-3 h-3" />
                                Mastered
                              </span>
                            ) : isCurrentPhase ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                In Progress
                              </span>
                            ) : (
                              <span className="text-slate-400">Upcoming</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Ask Companion regarding this goal */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onSelectGoalForChat && onSelectGoalForChat(goal)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
                    >
                      <span>Discuss or adapt this roadmap with HabitHero Agent</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
