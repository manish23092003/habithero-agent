import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  BookOpen, 
  Activity, 
  Target, 
  Briefcase, 
  Check,
  ArrowRight
} from 'lucide-react';
import { Goal, GoalCategory, HabitPhase, DailyTask } from '../types';

interface NewGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGoal: (newGoal: Goal, initialTask: DailyTask) => void;
}

const CATEGORIES: { id: GoalCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'learning', label: 'Tech & Learning', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'productivity', label: 'Focus & Productivity', icon: <Target className="w-4 h-4" /> },
  { id: 'health', label: 'Health & Fitness', icon: <Activity className="w-4 h-4" /> },
  { id: 'career', label: 'Career Growth', icon: <Briefcase className="w-4 h-4" /> }
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
        title: 'Foundational Micro-Habit',
        focus: `Establish consistency and low friction with initial ${dailyMinutes}m sessions`,
        dayRange: `Days 1-${Math.round(targetDays * 0.25)}`,
        tasksPlanned: Math.round(targetDays * 0.25)
      },
      {
        phaseNumber: 2,
        title: 'Core Competency & Flow',
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
    // Reset form
    setTitle('');
    setTagline('');
    setStep(1);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {step === 1 ? 'Design Your Goal' : 'HabitHero AI Plan Preview'}
              </h3>
              <p className="text-xs text-slate-500">
                {step === 1 ? 'Tell HabitHero what you want to achieve' : 'Engineered for consistency and zero burnout'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 1 ? (
          <form onSubmit={handleNext} className="p-6 space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                What goal do you want to achieve? *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Master TypeScript, Morning Gym Workout, Read Clean Code"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-400"
              />
            </div>

            {/* Tagline / Why */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Why does this matter to you? (Optional)
              </label>
              <input
                type="text"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                placeholder="e.g. Land a software engineering role, boost stamina"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-400"
              />
            </div>

            {/* Category selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      category === cat.id
                        ? 'border-emerald-500 bg-emerald-50/80 text-emerald-800'
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
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-700">Duration</span>
                  <span className="font-extrabold text-emerald-700">{targetDays} Days</span>
                </div>
                <div className="flex gap-1">
                  {[14, 21, 30].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setTargetDays(days)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        targetDays === days
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-700">Daily Commitment</span>
                  <span className="font-extrabold text-emerald-700">{dailyMinutes} min</span>
                </div>
                <div className="flex gap-1">
                  {[15, 25, 40].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDailyMinutes(mins)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        dailyMinutes === mins
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
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
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-40"
              >
                <span>Generate Habit Plan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                  Habit Plan Architecture
                </span>
                <span className="text-xs font-extrabold text-emerald-900">
                  {targetDays} Days • {dailyMinutes}m/day
                </span>
              </div>
              <h4 className="text-base font-extrabold text-slate-900">
                {title}
              </h4>
              <p className="text-xs text-slate-600">
                Broken down into 3 manageable milestones with built-in accountability check-ins.
              </p>
            </div>

            <div className="space-y-2.5">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                Generated Phases
              </span>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">Phase 1: Foundation Setup</span>
                    <p className="text-slate-500 text-[11px]">Daily {dailyMinutes}m low-friction repetition</p>
                  </div>
                  <span className="font-bold text-slate-600">Days 1-{Math.round(targetDays * 0.25)}</span>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">Phase 2: Progressive Mastery</span>
                    <p className="text-slate-500 text-[11px]">Sustained focus & core exercises</p>
                  </div>
                  <span className="font-bold text-slate-600">Days {Math.round(targetDays * 0.25) + 1}-{Math.round(targetDays * 0.55)}</span>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">Phase 3: Real Execution & Capstone</span>
                    <p className="text-slate-500 text-[11px]">Independent creation & reflection</p>
                  </div>
                  <span className="font-bold text-slate-600">Days {Math.round(targetDays * 0.55) + 1}-{targetDays}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-between gap-2 border-t border-slate-100">
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
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Add to Today's Tasks</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
