import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  BookOpen, 
  Activity, 
  Target, 
  Briefcase, 
  Check,
  ArrowRight,
  Clock,
  Calendar
} from 'lucide-react';
import { Goal, GoalCategory, HabitPhase, DailyTask } from '../types';

interface NewGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGoal: (newGoal: Goal, initialTask: DailyTask) => void;
}

const CATEGORIES: { id: GoalCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'learning', label: 'Tech & Learning', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: 'productivity', label: 'Deep Work & Productivity', icon: <Target className="w-3.5 h-3.5" /> },
  { id: 'health', label: 'Health & Fitness', icon: <Activity className="w-3.5 h-3.5" /> },
  { id: 'career', label: 'Career Growth', icon: <Briefcase className="w-3.5 h-3.5" /> }
];

export const NewGoalModal: React.FC<NewGoalModalProps> = ({
  isOpen,
  onClose,
  onAddGoal
}) => {
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState<GoalCategory>('learning');
  const [targetDays, setTargetDays] = useState<number>(30);
  const [dailyMinutes, setDailyMinutes] = useState<number>(25);
  const [step, setStep] = useState<1 | 2>(1);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setStep(2);
  };

  const handleCreate = () => {
    const goalId = `goal-${Date.now()}`;
    const generatedPhases: HabitPhase[] = [
      {
        phaseNumber: 1,
        title: 'Foundational Consistency',
        focus: `Establish zero-friction daily ritual with ${dailyMinutes}m sessions`,
        dayRange: `Days 1-${Math.round(targetDays * 0.25)}`,
        tasksPlanned: Math.round(targetDays * 0.25)
      },
      {
        phaseNumber: 2,
        title: 'Deep Competency & Flow',
        focus: 'Deepening mechanics and compound repetition',
        dayRange: `Days ${Math.round(targetDays * 0.25) + 1}-${Math.round(targetDays * 0.55)}`,
        tasksPlanned: Math.round(targetDays * 0.3)
      },
      {
        phaseNumber: 3,
        title: 'Application & Challenge Sprints',
        focus: 'Synthesizing knowledge into real-world output',
        dayRange: `Days ${Math.round(targetDays * 0.55) + 1}-${targetDays}`,
        tasksPlanned: Math.round(targetDays * 0.45)
      }
    ];

    const newGoal: Goal = {
      id: goalId,
      title: title.trim(),
      tagline: tagline.trim() || `Achieve ${title.trim()} through daily ${dailyMinutes}-minute actions.`,
      category,
      targetDays,
      currentDay: 1,
      dailyCommitmentMinutes: dailyMinutes,
      streak: 1,
      status: 'active',
      planOutline: generatedPhases,
      createdAt: new Date().toISOString()
    };

    const initialTask: DailyTask = {
      id: `task-${Date.now()}`,
      goalId,
      goalTitle: title.trim(),
      title: `Kickoff: Day 1 of ${title.trim()}`,
      description: `Complete your first ${dailyMinutes}-minute session. Establish your dedicated workspace and log your initial notes.`,
      durationMinutes: dailyMinutes,
      difficulty: 'easy',
      status: 'pending',
      dayNumber: 1,
      scheduledFor: 'Today',
      category
    };

    onAddGoal(newGoal, initialTask);
    onClose();
    setTitle('');
    setTagline('');
    setStep(1);
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-goal-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-elevation border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 border border-brand-200/60 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <h3 id="new-goal-modal-title" className="text-sm sm:text-base font-bold text-slate-900">
                {step === 1 ? 'Design Habit Roadmap' : 'Review Autonomous Roadmap'}
              </h3>
              <p className="text-xs text-slate-500">
                {step === 1 ? 'Specify your objective and daily commitment' : 'Curated 3-phase milestone progression'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 1 ? (
          <form onSubmit={handleNext} className="p-6 space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="goal-title-input" className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Habit Objective <span className="text-rose-500">*</span>
              </label>
              <input
                id="goal-title-input"
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Master TypeScript, Morning Gym Workout, Read Clean Code"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder:text-slate-400 transition-all"
              />
            </div>

            {/* Tagline / Why */}
            <div className="space-y-1.5">
              <label htmlFor="goal-why-input" className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Core Motivation <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="goal-why-input"
                type="text"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                placeholder="e.g. Land a senior engineering role, build cognitive stamina"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder:text-slate-400 transition-all"
              />
            </div>

            {/* Category selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                      category === cat.id
                        ? 'border-brand-500 bg-brand-50/80 text-brand-900 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {cat.icon}
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders: Duration & Daily Minutes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Target Horizon
                  </span>
                  <span className="font-bold text-brand-700 tabular-nums">{targetDays} Days</span>
                </div>
                <div className="flex gap-1.5">
                  {[14, 21, 30, 60].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setTargetDays(days)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        targetDays === days
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Daily Commitment
                  </span>
                  <span className="font-bold text-brand-700 tabular-nums">{dailyMinutes} min</span>
                </div>
                <div className="flex gap-1.5">
                  {[15, 25, 45, 60].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDailyMinutes(mins)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        dailyMinutes === mins
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg shadow-subtle hover:shadow-card transition-all disabled:opacity-40"
              >
                <span>Continue to Preview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-brand-50/70 border border-brand-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-brand-800 uppercase tracking-wider">
                  Calibrated Plan Structure
                </span>
                <span className="text-xs font-bold text-brand-900 tabular-nums">
                  {targetDays} Days • {dailyMinutes}m daily
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-900">
                {title}
              </h4>
              <p className="text-xs text-slate-600">
                Segmented into 3 progressive phases to ensure mastery and prevent drop-off.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500">
                Phased Progression
              </span>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-slate-200/90 bg-white flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900">Phase 1: Foundation Setup</span>
                    <p className="text-slate-500 text-[11px]">Daily low-friction {dailyMinutes}m habit anchor</p>
                  </div>
                  <span className="font-medium text-slate-600 text-[11px] px-2 py-0.5 rounded bg-slate-100">Days 1-{Math.round(targetDays * 0.25)}</span>
                </div>

                <div className="p-3 rounded-lg border border-slate-200/90 bg-white flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900">Phase 2: Progressive Mastery</span>
                    <p className="text-slate-500 text-[11px]">Deep work focus & core exercise repetitions</p>
                  </div>
                  <span className="font-medium text-slate-600 text-[11px] px-2 py-0.5 rounded bg-slate-100">Days {Math.round(targetDays * 0.25) + 1}-{Math.round(targetDays * 0.55)}</span>
                </div>

                <div className="p-3 rounded-lg border border-slate-200/90 bg-white flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900">Phase 3: Execution Capstone</span>
                    <p className="text-slate-500 text-[11px]">Autonomous implementation & reflection</p>
                  </div>
                  <span className="font-medium text-slate-600 text-[11px] px-2 py-0.5 rounded bg-slate-100">Days {Math.round(targetDays * 0.55) + 1}-{targetDays}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg shadow-subtle hover:shadow-card transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Activate Goal</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
