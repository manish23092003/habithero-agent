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
  ArrowLeft
} from 'lucide-react';
import { Goal, GoalCategory, HabitPhase, DailyTask } from '../types';

interface NewGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGoal: (newGoal: Goal, initialTask: DailyTask) => void;
}

const CATEGORIES: { id: GoalCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'learning', label: 'Tech & Learning', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'productivity', label: 'Deep Work', icon: <Target className="w-4 h-4" /> },
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
        title: 'Getting Started',
        focus: `Build your daily routine with gentle ${dailyMinutes}-minute sessions`,
        dayRange: `Days 1-${Math.max(3, Math.round(targetDays * 0.25))}`,
        tasksPlanned: Math.max(3, Math.round(targetDays * 0.25))
      },
      {
        phaseNumber: 2,
        title: 'Building Momentum',
        focus: 'Deepening your skills with consistent daily practice',
        dayRange: `Days ${Math.max(3, Math.round(targetDays * 0.25)) + 1}-${Math.round(targetDays * 0.6)}`,
        tasksPlanned: Math.round(targetDays * 0.35)
      },
      {
        phaseNumber: 3,
        title: 'Reaching Your Goal',
        focus: 'Applying your new habit to real projects and personal goals',
        dayRange: `Days ${Math.round(targetDays * 0.6) + 1}-${targetDays}`,
        tasksPlanned: Math.round(targetDays * 0.4)
      }
    ];

    const newGoal: Goal = {
      id: goalId,
      title: title.trim(),
      tagline: tagline.trim() || `Practice ${title.trim()} for ${dailyMinutes} minutes a day.`,
      category,
      targetDays,
      currentDay: 1,
      dailyCommitmentMinutes: dailyMinutes,
      streak: 0,
      status: 'active',
      planOutline: generatedPhases,
      createdAt: new Date().toISOString()
    };

    const initialTask: DailyTask = {
      id: `task-${Date.now()}`,
      goalId,
      goalTitle: title.trim(),
      title: `Day 1: Start ${title.trim()}`,
      description: `Complete your first ${dailyMinutes}-minute session to start building your streak.`,
      durationMinutes: dailyMinutes,
      difficulty: 'easy',
      status: 'pending',
      dayNumber: 1,
      scheduledFor: 'Today',
      category
    };

    onAddGoal(newGoal, initialTask);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-goal-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-elevation border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 border border-brand-200/60 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <h3 id="new-goal-modal-title" className="text-base font-bold text-stone-900">
                {step === 1 ? 'Create a New Habit Plan' : 'Review Your Habit Steps'}
              </h3>
              <p className="text-xs text-stone-500">
                {step === 1 ? 'Step 1 of 2: What would you like to practice?' : 'Step 2 of 2: Your step-by-step roadmap'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 1 ? (
          <form onSubmit={handleNext} className="p-6 space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="goal-title" className="block text-xs font-semibold text-stone-700">
                What habit do you want to build?
              </label>
              <input
                id="goal-title"
                type="text"
                placeholder="e.g. Morning Jog, Learn TypeScript, or Read 20 Pages"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-stone-900 placeholder:text-stone-400"
              />
            </div>

            {/* Tagline */}
            <div className="space-y-1.5">
              <label htmlFor="goal-tagline" className="block text-xs font-semibold text-stone-700">
                Why is this important to you? (Optional)
              </label>
              <input
                id="goal-tagline"
                type="text"
                placeholder="e.g. Feel healthier and more energized each morning"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-stone-900 placeholder:text-stone-400"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-700">
                Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2.5 transition-all text-left ${
                      category === cat.id
                        ? 'border-brand-500 bg-brand-50/70 text-brand-900 shadow-xs'
                        : 'border-stone-200 text-stone-600 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <span className={category === cat.id ? 'text-brand-600' : 'text-stone-400'}>
                      {cat.icon}
                    </span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Days & Daily Minutes */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  Goal Timeline
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[21, 30, 60].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setTargetDays(days)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                        targetDays === days
                          ? 'border-brand-500 bg-brand-50 text-brand-800'
                          : 'border-stone-200 text-stone-600 bg-white'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  Time per day
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[15, 25, 45].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDailyMinutes(mins)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                        dailyMinutes === mins
                          ? 'border-brand-500 bg-brand-50 text-brand-800'
                          : 'border-stone-200 text-stone-600 bg-white'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Next Step */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!title.trim()}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-subtle hover:shadow-card transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>Continue to Plan Preview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-5">
            <div className="p-3.5 rounded-xl bg-brand-50/70 border border-brand-200/80 text-xs text-brand-900 space-y-1">
              <span className="font-bold">Your Personalized Plan:</span>
              <p className="text-stone-600">
                Broken down over {targetDays} days with {dailyMinutes} minutes each day for steady, stress-free progress.
              </p>
            </div>

            {/* Preview Phases */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Your Roadmap Steps
              </h4>
              <div className="space-y-2">
                <div className="p-3 rounded-xl border border-stone-200 bg-white space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-brand-700">Phase 1: Getting Started</span>
                    <span className="text-[11px] font-mono text-stone-400">Days 1-{Math.round(targetDays * 0.25)}</span>
                  </div>
                  <p className="text-xs text-stone-600">Gentle daily practice to form the habit.</p>
                </div>

                <div className="p-3 rounded-xl border border-stone-200 bg-white space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-brand-700">Phase 2: Building Momentum</span>
                    <span className="text-[11px] font-mono text-stone-400">Days {Math.round(targetDays * 0.25) + 1}-{Math.round(targetDays * 0.6)}</span>
                  </div>
                  <p className="text-xs text-stone-600">Deepening your focus and building confidence.</p>
                </div>

                <div className="p-3 rounded-xl border border-stone-200 bg-white space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-brand-700">Phase 3: Reaching Your Goal</span>
                    <span className="text-[11px] font-mono text-stone-400">Days {Math.round(targetDays * 0.6) + 1}-{targetDays}</span>
                  </div>
                  <p className="text-xs text-stone-600">Putting it all together and making it stick.</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleCreate}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-subtle hover:shadow-card transition-all flex items-center gap-2"
              >
                <span>Save Habit & Start Day 1</span>
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
