import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  BookOpen,
  Activity,
  Target,
  Briefcase,
  Smile,
  Zap,
  Clock,
  Calendar,
  Loader2,
  AlertCircle,
  Plus,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { GoalCategory, HabitPhase } from '../../types';
import { triggerStreakMilestoneConfetti } from '../../utils/confetti';

interface StarterTemplate {
  id: string;
  title: string;
  category: GoalCategory;
  dailyMinutes: number;
  targetDays: number;
  description: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'reading',
    title: 'Daily Reading',
    category: 'learning',
    dailyMinutes: 15,
    targetDays: 30,
    description: 'Read books, technical docs, or articles each day without screen distractions.',
    tagline: 'Expand knowledge through calm, focused daily reading sessions.',
    icon: BookOpen,
  },
  {
    id: 'deep-work',
    title: 'Deep Work',
    category: 'productivity',
    dailyMinutes: 20,
    targetDays: 30,
    description: 'Dedicate an uninterrupted focus sprint to high-impact priority work.',
    tagline: 'Build deep focus and protect high-value work from context switching.',
    icon: Target,
  },
  {
    id: 'movement',
    title: 'Morning Movement',
    category: 'health',
    dailyMinutes: 15,
    targetDays: 30,
    description: 'Light mobility, walking, posture reset, or bodyweight exercises.',
    tagline: 'Energize your body and maintain healthy physical momentum.',
    icon: Activity,
  },
  {
    id: 'code-practice',
    title: 'Code Practice',
    category: 'career',
    dailyMinutes: 30,
    targetDays: 30,
    description: 'Solve an engineering problem, build a feature, or study core syntax.',
    tagline: 'Strengthen software craft with daily hands-on coding practice.',
    icon: Briefcase,
  },
  {
    id: 'wind-down',
    title: 'Evening Wind-down',
    category: 'mindfulness',
    dailyMinutes: 10,
    targetDays: 30,
    description: 'Disconnect from screens, reflect on wins, and relax before sleep.',
    tagline: 'Clear your mind in the evening to rest better and wake refreshed.',
    icon: Smile,
  },
];

const CATEGORIES: { id: GoalCategory; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { id: 'learning', label: 'Learning', icon: BookOpen, desc: 'Languages, reading, engineering skills' },
  { id: 'productivity', label: 'Productivity', icon: Zap, desc: 'Focus sprints, planning, study blocks' },
  { id: 'health', label: 'Health & Fitness', icon: Activity, desc: 'Movement, running, posture, sleep' },
  { id: 'career', label: 'Career Growth', icon: Briefcase, desc: 'Portfolio, technical writing, coding' },
  { id: 'mindfulness', label: 'Mindfulness & Calm', icon: Smile, desc: 'Meditation, screen limits, breathing' },
];

const DURATION_OPTIONS = [10, 15, 20, 30, 45];
const TARGET_DAYS_OPTIONS = [21, 30, 60];

const getPhasedRoadmap = (targetDays: number, dailyMinutes: number): HabitPhase[] => {
  const p1Days = Math.max(3, Math.round(targetDays * 0.25));
  const p2Days = Math.max(4, Math.round(targetDays * 0.3));
  const p2End = Math.round(targetDays * 0.55);
  const p3Days = Math.max(4, targetDays - p2End);

  return [
    {
      phaseNumber: 1,
      title: 'Foundational Consistency',
      focus: `Establish a frictionless daily habit with comfortable ${dailyMinutes}m sessions.`,
      dayRange: `Days 1 - ${p1Days}`,
      tasksPlanned: p1Days,
    },
    {
      phaseNumber: 2,
      title: 'Competency & Sustained Flow',
      focus: 'Make your routine a natural daily reflex and build streak momentum.',
      dayRange: `Days ${p1Days + 1} - ${p2End}`,
      tasksPlanned: p2Days,
    },
    {
      phaseNumber: 3,
      title: 'Synthesis & Real Output',
      focus: 'Consolidate long-term habit permanence that lasts effortlessly.',
      dayRange: `Days ${p2End + 1} - ${targetDays}`,
      tasksPlanned: p3Days,
    },
  ];
};

export const OnboardingPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // 2-Step Flow: Step 1 = Pick/Create Habit, Step 2 = Customize & Activate
  const [step, setStep] = useState<1 | 2>(1);

  // Selected template & form state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('reading');
  const [isCustomHabit, setIsCustomHabit] = useState(false);
  const [title, setTitle] = useState('Daily Reading');
  const [tagline, setTagline] = useState('Expand knowledge through calm, focused daily reading sessions.');
  const [category, setCategory] = useState<GoalCategory>('learning');
  const [dailyMinutes, setDailyMinutes] = useState<number>(15);
  const [targetDays, setTargetDays] = useState<number>(30);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `goal_${Date.now()}`
  );

  const handleSelectTemplate = (template: StarterTemplate) => {
    setSelectedTemplateId(template.id);
    setIsCustomHabit(false);
    setTitle(template.title);
    setTagline(template.tagline);
    setCategory(template.category);
    setDailyMinutes(template.dailyMinutes);
    setTargetDays(template.targetDays);
    setError(null);
  };

  const handleSelectCustom = () => {
    setSelectedTemplateId('custom');
    setIsCustomHabit(true);
    if (selectedTemplateId !== 'custom') {
      setTitle('');
      setTagline('');
    }
    setError(null);
  };

  const handleContinueToStep2 = () => {
    if (!title.trim()) {
      setError('Please provide a habit name or choose one of the starter templates.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleActivate = async () => {
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      localStorage.setItem('habithero_onboarding_completed', 'true');

      // Create initial goal & day 1 kickoff action in MongoDB
      await api.createGoal({
        title: title.trim(),
        tagline: tagline.trim() || `Daily ${dailyMinutes}-minute focus on ${title.trim()}`,
        category,
        targetDays,
        dailyCommitmentMinutes: dailyMinutes,
        idempotencyKey: submissionKey,
      });

      // Confetti and navigation strictly upon confirmed success
      triggerStreakMilestoneConfetti();
      navigate('/app/dashboard', { replace: true });
    } catch (err: any) {
      console.error('[OnboardingPage] Goal creation failed:', err);
      setError(
        err.message || 'Unable to create your habit plan right now. Please check your connection and try again.'
      );
      setIsSubmitting(false);
    }
  };

  const roadmapPhases = getPhasedRoadmap(targetDays, dailyMinutes);
  const firstName = currentUser?.name?.split(' ')[0] || 'Friend';

  return (
    <div className="min-h-screen bg-[#F7F7F2] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Progress Step Header */}
        <div className="flex items-center justify-between text-xs font-semibold text-[#5F6F65] px-1">
          <span className="flex items-center gap-1.5 font-bold text-[#26352D]">
            <span>Step {step} of 2</span>
            <span>•</span>
            <span className="text-[#5F6F65] font-medium">
              {step === 1 ? 'Choose Your Habit' : 'Review & Activate'}
            </span>
          </span>
          <div className="flex items-center gap-1.5" aria-label={`Step ${step} of 2`}>
            <span
              className={`w-8 h-2 rounded-full transition-all ${
                step >= 1 ? 'bg-[#245C46]' : 'bg-[#E9ECE7]'
              }`}
            />
            <span
              className={`w-8 h-2 rounded-full transition-all ${
                step >= 2 ? 'bg-[#245C46]' : 'bg-[#E9ECE7]'
              }`}
            />
          </div>
        </div>

        {/* Step Card */}
        <div className="rounded-3xl border border-[#E9ECE7] bg-white p-6 sm:p-8 shadow-card space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-[#C85D55] text-xs flex items-start justify-between gap-3 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#C85D55] shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
              <button
                type="button"
                onClick={step === 2 ? handleActivate : handleContinueToStep2}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600 text-white rounded-lg text-[11px] font-bold hover:bg-red-700 transition-colors shrink-0 disabled:opacity-50"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* STEP 1: Choose Starter Habit Template or Custom */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#245C46] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Welcome, {firstName}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#26352D]">
                  Choose your first habit
                </h1>
                <p className="text-xs sm:text-sm text-[#5F6F65] leading-relaxed">
                  Start with a popular starter habit below or define your own. Small daily steps build lasting momentum.
                </p>
              </div>

              {/* Starter Habit Templates Grid */}
              <div
                role="radiogroup"
                aria-label="Starter habit templates"
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                {STARTER_TEMPLATES.map((tmpl) => {
                  const Icon = tmpl.icon;
                  const isSelected = selectedTemplateId === tmpl.id && !isCustomHabit;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => handleSelectTemplate(tmpl)}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2.5 relative group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#245C46] ${
                        isSelected
                          ? 'border-[#245C46] bg-[#DCEBDD]/40 ring-2 ring-[#245C46]/20 shadow-xs'
                          : 'border-[#E9ECE7] bg-white hover:border-[#245C46]/40 hover:bg-[#F7F7F2]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-[#245C46] text-white shadow-xs'
                              : 'bg-[#F7F7F2] text-[#245C46] group-hover:bg-[#DCEBDD]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F7F7F2] text-[#245C46] border border-[#E9ECE7]">
                            {tmpl.dailyMinutes}m / day
                          </span>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-[#245C46] text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h2 className="text-xs font-bold text-[#26352D]">{tmpl.title}</h2>
                        <p className="text-[11px] leading-relaxed text-[#5F6F65] mt-0.5 line-clamp-2">
                          {tmpl.description}
                        </p>
                      </div>

                      <div className="text-[10px] font-semibold text-[#8C9A91] uppercase tracking-wider capitalize">
                        {tmpl.category}
                      </div>
                    </button>
                  );
                })}

                {/* Custom Habit Card */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={isCustomHabit}
                  onClick={handleSelectCustom}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2.5 relative group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#245C46] ${
                    isCustomHabit
                      ? 'border-[#245C46] bg-[#DCEBDD]/40 ring-2 ring-[#245C46]/20 shadow-xs'
                      : 'border-dashed border-[#8C9A91]/60 bg-white hover:border-[#245C46] hover:bg-[#F7F7F2]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                        isCustomHabit
                          ? 'bg-[#245C46] text-white shadow-xs'
                          : 'bg-[#F7F7F2] text-[#245C46] group-hover:bg-[#DCEBDD]'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                    </div>
                    {isCustomHabit && (
                      <span className="w-5 h-5 rounded-full bg-[#245C46] text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <div>
                    <h2 className="text-xs font-bold text-[#26352D]">Custom Habit</h2>
                    <p className="text-[11px] leading-relaxed text-[#5F6F65] mt-0.5">
                      Have a specific focus in mind? Define your own unique daily habit.
                    </p>
                  </div>

                  <div className="text-[10px] font-semibold text-[#245C46] uppercase tracking-wider">
                    Create Custom
                  </div>
                </button>
              </div>

              {/* Custom Title Input field (shown when custom is selected) */}
              {isCustomHabit && (
                <div className="p-4 rounded-2xl bg-[#F7F7F2] border border-[#E9ECE7] space-y-2 animate-fade-in">
                  <label htmlFor="custom-habit-title" className="block text-xs font-bold text-[#26352D]">
                    What habit would you like to build? *
                  </label>
                  <input
                    id="custom-habit-title"
                    type="text"
                    placeholder="e.g. 15-Minute Morning Journal, Evening Guitar Practice..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                    className="w-full px-4 py-2.5 bg-white border border-[#E9ECE7] rounded-xl text-xs text-[#26352D] placeholder-[#5F6F65]/50 focus:outline-none focus:ring-2 focus:ring-[#245C46]"
                  />
                </div>
              )}

              {/* Action Bar */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-[#5F6F65]">
                  Takes ~30 seconds to activate
                </span>

                <button
                  type="button"
                  onClick={handleContinueToStep2}
                  disabled={!title.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
                >
                  <span>Continue to Customize</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Review, Customize Commitment & Activate */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h1 className="text-2xl font-extrabold tracking-tight text-[#26352D]">
                  Review your daily commitment
                </h1>
                <p className="text-xs text-[#5F6F65]">
                  Habits stick through small daily consistency. You can adjust your pace anytime.
                </p>
              </div>

              <div className="space-y-5">
                {/* Title & Tagline Inputs */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label htmlFor="onboarding-title-input" className="block text-xs font-bold text-[#26352D]">
                      Habit Title *
                    </label>
                    <input
                      id="onboarding-title-input"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Daily Reading"
                      required
                      className="w-full px-4 py-2.5 text-xs rounded-xl border border-[#E9ECE7] bg-[#F7F7F2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#245C46] text-[#26352D] font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="onboarding-tagline-input" className="block text-xs font-semibold text-[#5F6F65]">
                      Why is this important to you? (Optional)
                    </label>
                    <input
                      id="onboarding-tagline-input"
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="e.g. Feel energized and build mental clarity each morning"
                      className="w-full px-4 py-2 text-xs rounded-xl border border-[#E9ECE7] bg-[#F7F7F2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#245C46] text-[#26352D]"
                    />
                  </div>
                </div>

                {/* Category Pills */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#26352D]">
                    Category
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" role="radiogroup" aria-label="Habit category">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => setCategory(cat.id)}
                          className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#245C46] bg-[#245C46] text-white shadow-xs'
                              : 'border-[#E9ECE7] bg-[#F7F7F2] text-[#5F6F65] hover:bg-[#E9ECE7]'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{cat.label.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time & Duration Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Daily Minutes */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#26352D] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#245C46]" />
                      <span>Time per day</span>
                    </label>
                    <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Time per day">
                      {DURATION_OPTIONS.map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          role="radio"
                          aria-checked={dailyMinutes === mins}
                          onClick={() => setDailyMinutes(mins)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            dailyMinutes === mins
                              ? 'border-[#245C46] bg-[#245C46] text-white shadow-xs'
                              : 'border-[#E9ECE7] bg-[#F7F7F2] text-[#5F6F65] hover:bg-[#E9ECE7]'
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Goal Duration */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#26352D] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#245C46]" />
                      <span>Plan duration</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Plan duration">
                      {TARGET_DAYS_OPTIONS.map((days) => (
                        <button
                          key={days}
                          type="button"
                          role="radio"
                          aria-checked={targetDays === days}
                          onClick={() => setTargetDays(days)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            targetDays === days
                              ? 'border-[#245C46] bg-[#245C46] text-white shadow-xs'
                              : 'border-[#E9ECE7] bg-[#F7F7F2] text-[#5F6F65] hover:bg-[#E9ECE7]'
                          }`}
                        >
                          {days} Days
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Phased Roadmap Preview (Matching 3 backend phases) */}
                <div className="p-4 rounded-2xl bg-[#F7F7F2] border border-[#E9ECE7] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#26352D]">Your 3-Phase Roadmap</span>
                    <span className="text-[11px] font-semibold text-[#245C46] bg-[#DCEBDD] px-2 py-0.5 rounded-md">
                      Day 1 task kicks off today
                    </span>
                  </div>

                  <div className="space-y-2">
                    {roadmapPhases.map((phase) => (
                      <div
                        key={phase.phaseNumber}
                        className="p-3 bg-white rounded-xl border border-[#E9ECE7] flex items-start gap-3"
                      >
                        <div className="w-6 h-6 rounded-lg bg-[#DCEBDD] text-[#245C46] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          {phase.phaseNumber}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs font-bold text-[#26352D]">
                            <span className="truncate">{phase.title}</span>
                            <span className="text-[10px] text-[#5F6F65] font-mono bg-[#F7F7F2] px-1.5 py-0.5 rounded">
                              {phase.dayRange}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#5F6F65] mt-0.5 leading-relaxed">
                            {phase.focus}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-[#5F6F65] hover:text-[#26352D] flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || !title.trim()}
                  onClick={handleActivate}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Activating habit plan...</span>
                    </>
                  ) : (
                    <>
                      <span>Activate Habit & Go to Dashboard</span>
                      <Check className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
