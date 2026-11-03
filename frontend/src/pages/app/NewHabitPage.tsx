import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  BookOpen,
  Activity,
  Briefcase,
  Zap,
  Smile,
  Clock,
  Calendar,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { GoalCategory, HabitPhase } from '../../types';

const CATEGORIES: { id: GoalCategory; label: string; icon: any; desc: string }[] = [
  { id: 'learning', label: 'Continuous Learning', icon: BookOpen, desc: 'Languages, reading, engineering skills' },
  { id: 'health', label: 'Health & Fitness', icon: Activity, desc: 'Mobility, running, workout routines, sleep' },
  { id: 'career', label: 'Career Growth', icon: Briefcase, desc: 'Portfolio, networking, deep work sprint' },
  { id: 'productivity', label: 'Personal Productivity', icon: Zap, desc: 'Inbox zero, planning, journaling' },
  { id: 'mindfulness', label: 'Mindfulness & Calm', icon: Smile, desc: 'Meditation, screen limits, breathing' },
];

const TARGET_DAYS_OPTIONS = [14, 21, 30, 60, 90];
const DURATION_OPTIONS = [5, 10, 15, 25, 45, 60];

export const NewHabitPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form state
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState<GoalCategory>('learning');
  const [targetDays, setTargetDays] = useState<number>(30);
  const [dailyCommitmentMinutes, setDailyCommitmentMinutes] = useState<number>(15);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `goal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  );

  // Generate preview roadmap phases dynamically
  const previewPhases: HabitPhase[] = [
    {
      phaseNumber: 1,
      title: 'Getting Started',
      dayRange: `Days 1 - ${Math.round(targetDays * 0.25)}`,
      focus: `Get comfortable with your routine in gentle ${dailyCommitmentMinutes}-minute sessions.`,
      tasksPlanned: Math.round(targetDays * 0.25),
    },
    {
      phaseNumber: 2,
      title: 'Building Consistency',
      dayRange: `Days ${Math.round(targetDays * 0.25) + 1} - ${Math.round(targetDays * 0.55)}`,
      focus: 'Make your habit a natural part of your daily routine and build your streak.',
      tasksPlanned: Math.round(targetDays * 0.3),
    },
    {
      phaseNumber: 3,
      title: 'Deepening Your Practice',
      dayRange: `Days ${Math.round(targetDays * 0.55) + 1} - ${Math.round(targetDays * 0.85)}`,
      focus: 'Gradually deepen your practice while keeping it enjoyable and steady.',
      tasksPlanned: Math.round(targetDays * 0.3),
    },
    {
      phaseNumber: 4,
      title: 'Making It Last',
      dayRange: `Days ${Math.round(targetDays * 0.85) + 1} - ${targetDays}`,
      focus: 'Turn your practice into a lasting part of your everyday life.',
      tasksPlanned: targetDays - Math.round(targetDays * 0.85),
    },
  ];

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Please provide a habit name or focus area.');
      setStep(1);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await api.createGoal({
        title: title.trim(),
        tagline: tagline.trim() || undefined,
        category,
        targetDays,
        dailyCommitmentMinutes,
        idempotencyKey: submissionKey,
      });

      navigate(`/app/habits/${result.goal.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create habit plan.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/app/habits"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5F6F65] hover:text-[#26352D] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Habits</span>
        </Link>
        <span className="text-xs font-mono font-medium text-[#5F6F65]">
          Step {step} of 3
        </span>
      </div>

      {/* Progress pill steps */}
      <div className="grid grid-cols-3 gap-2">
        <div className={`h-1.5 rounded-full transition-all ${step >= 1 ? 'bg-[#245C46]' : 'bg-[#E9ECE7]'}`} />
        <div className={`h-1.5 rounded-full transition-all ${step >= 2 ? 'bg-[#245C46]' : 'bg-[#E9ECE7]'}`} />
        <div className={`h-1.5 rounded-full transition-all ${step >= 3 ? 'bg-[#245C46]' : 'bg-[#E9ECE7]'}`} />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Core Habit Identity */}
      {step === 1 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9ECE7] shadow-sm space-y-6 animate-fade-in">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#245C46]">Step 1: Your Goal</span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#26352D] mt-1">What habit would you like to build?</h2>
            <p className="text-xs text-[#5F6F65] mt-1">
              Name your habit. We will break it down into gentle, manageable steps.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#26352D] mb-1.5">
                Habit Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Read technical articles, Morning jog, or Practice meditation"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-[#F7F7F2] border border-[#E9ECE7] rounded-xl text-sm text-[#26352D] placeholder-[#5F6F65]/50 focus:outline-none focus:ring-2 focus:ring-[#245C46]/30 focus:border-[#245C46] transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#26352D] mb-1.5">
                Why is this important to you? (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Feel more energized and confident every morning"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                className="w-full px-4 py-3 bg-[#F7F7F2] border border-[#E9ECE7] rounded-xl text-sm text-[#26352D] placeholder-[#5F6F65]/50 focus:outline-none focus:ring-2 focus:ring-[#245C46]/30 focus:border-[#245C46] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#26352D] mb-2">
                Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                        isSelected
                          ? 'border-[#245C46] bg-[#DCEBDD]/30 shadow-sm'
                          : 'border-[#E9ECE7] bg-white hover:bg-[#F7F7F2]'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-[#245C46] text-white' : 'bg-[#F7F7F2] text-[#5F6F65]'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#26352D]">{cat.label}</div>
                        <div className="text-[11px] text-[#5F6F65] line-clamp-1">{cat.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-[#E9ECE7]">
            <button
              type="button"
              onClick={() => {
                if (!title.trim()) {
                  setError('Please enter a habit title.');
                  return;
                }
                setError(null);
                setStep(2);
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#245C46] text-white text-xs font-bold rounded-xl hover:bg-[#1b4736] transition-all shadow-sm"
            >
              <span>Continue to Daily Time</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Time and Target Calibration */}
      {step === 2 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9ECE7] shadow-sm space-y-6 animate-fade-in">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#245C46]">Step 2: Daily Time</span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#26352D] mt-1">Choose your daily pace</h2>
            <p className="text-xs text-[#5F6F65] mt-1">
              Habits stick through small daily consistency. You can always adjust your plan if life gets busy.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-[#26352D] mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#245C46]" />
                <span>Time per day</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {DURATION_OPTIONS.map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDailyCommitmentMinutes(mins)}
                    className={`py-3 px-2 rounded-xl border text-center font-bold text-xs transition-all ${
                      dailyCommitmentMinutes === mins
                        ? 'border-[#245C46] bg-[#245C46] text-white shadow-sm'
                        : 'border-[#E9ECE7] bg-[#F7F7F2] text-[#26352D] hover:bg-[#E9ECE7]'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#5F6F65] mt-2">
                Recommended: 15 minutes allows comfortable practice without feeling rushed.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#26352D] mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#245C46]" />
                <span>Goal duration</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {TARGET_DAYS_OPTIONS.map(days => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setTargetDays(days)}
                    className={`py-3 px-3 rounded-xl border text-center font-bold text-xs transition-all ${
                      targetDays === days
                        ? 'border-[#245C46] bg-[#245C46] text-white shadow-sm'
                        : 'border-[#E9ECE7] bg-[#F7F7F2] text-[#26352D] hover:bg-[#E9ECE7]'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#E9ECE7]">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs font-semibold text-[#5F6F65] hover:text-[#26352D] transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#245C46] text-white text-xs font-bold rounded-xl hover:bg-[#1b4736] transition-all shadow-sm"
            >
              <span>Review Your Plan</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Phased Roadmap Preview & Confirmation */}
      {step === 3 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9ECE7] shadow-sm space-y-6 animate-fade-in">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#245C46]">Step 3: Plan Overview</span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#26352D] mt-1">Your 4-Step Journey</h2>
            <p className="text-xs text-[#5F6F65] mt-1">
              Your habit is organized into 4 clear phases so you can make steady, sustainable progress.
            </p>
          </div>

          {/* Quick Summary Card */}
          <div className="p-4 bg-[#F7F7F2] rounded-2xl border border-[#E9ECE7] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[#5F6F65] block">Habit</span>
              <span className="font-bold text-[#26352D] text-sm">{title}</span>
            </div>
            <div>
              <span className="text-[#5F6F65] block">Category</span>
              <span className="font-bold text-[#26352D] capitalize">{category}</span>
            </div>
            <div>
              <span className="text-[#5F6F65] block">Target</span>
              <span className="font-bold text-[#26352D]">{targetDays} Days</span>
            </div>
            <div>
              <span className="text-[#5F6F65] block">Daily Commitment</span>
              <span className="font-bold text-[#26352D]">{dailyCommitmentMinutes} min / day</span>
            </div>
          </div>

          {/* Phased Timeline */}
          <div className="space-y-3">
            {previewPhases.map((phase, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-[#E9ECE7] bg-white hover:border-[#245C46]/40 transition-colors flex items-start gap-3.5"
              >
                <div className="w-8 h-8 rounded-xl bg-[#DCEBDD] text-[#245C46] flex items-center justify-center font-mono font-bold text-xs shrink-0">
                  {phase.phaseNumber}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-[#26352D]">{phase.title}</h4>
                    <span className="text-[11px] font-mono text-[#5F6F65] bg-[#F7F7F2] px-2 py-0.5 rounded-md">
                      {phase.dayRange}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5F6F65] mt-1 leading-relaxed">
                    {phase.focus}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#E9ECE7]">
            <button
              type="button"
              disabled={loading}
              onClick={() => setStep(2)}
              className="px-4 py-2 text-xs font-semibold text-[#5F6F65] hover:text-[#26352D] transition-colors disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#245C46] text-white text-xs font-bold rounded-xl hover:bg-[#1b4736] transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Creating your habit...' : 'Start This Habit'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
