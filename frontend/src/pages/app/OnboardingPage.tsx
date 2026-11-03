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
  Loader2 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { GoalCategory } from '../../types';
import { triggerStreakMilestoneConfetti } from '../../utils/confetti';

const FOCUS_AREAS: { id: GoalCategory; label: string; description: string; icon: React.ReactNode }[] = [
  { id: 'learning', label: 'Tech & Learning', description: 'Master a new programming language, framework, or skill', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'productivity', label: 'Deep Work', description: 'Cultivate uninterrupted morning focus sprints and study blocks', icon: <Target className="w-4 h-4" /> },
  { id: 'health', label: 'Physical Health', description: 'Consistent daily movement, posture correction, or running', icon: <Activity className="w-4 h-4" /> },
  { id: 'career', label: 'Career Growth', description: 'Daily technical writing, resume building, and project execution', icon: <Briefcase className="w-4 h-4" /> },
];

export const OnboardingPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<GoalCategory>('learning');
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [dailyMinutes, setDailyMinutes] = useState<number>(20);
  const [targetDays, setTargetDays] = useState<number>(30);
  const [reminderTime, setReminderTime] = useState<string>('20:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `goal_${Date.now()}`
  );

  const handleFinish = async () => {
    if (!title.trim()) {
      setError('Please provide a habit name to get started');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Save accountability preferences
      localStorage.setItem('habithero_pref_reminder', reminderTime);
      localStorage.setItem('habithero_onboarding_completed', 'true');

      // Create initial goal & day 1 action in MongoDB
      await api.createGoal({
        title: title.trim(),
        tagline: tagline.trim() || `Daily ${dailyMinutes}-minute focus on ${title.trim()}`,
        category,
        targetDays,
        dailyCommitmentMinutes: dailyMinutes,
        idempotencyKey: submissionKey,
      });

      triggerStreakMilestoneConfetti();
      navigate('/app/dashboard', { replace: true });
    } catch (err: any) {
      console.warn('Backend goal creation failed during onboarding:', err.message);
      // Fallback: still let user into app
      navigate('/app/dashboard', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F2] flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6">
        {/* Progress Step Bar */}
        <div className="flex items-center justify-between text-xs font-semibold text-[#5F6F65] px-2">
          <span>Step {step} of 3</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-6 h-1.5 rounded-full transition-all ${step >= 1 ? 'bg-[#245C46]' : 'bg-[#E9ECE7]'}`} />
            <span className={`w-6 h-1.5 rounded-full transition-all ${step >= 2 ? 'bg-[#245C46]' : 'bg-[#E9ECE7]'}`} />
            <span className={`w-6 h-1.5 rounded-full transition-all ${step >= 3 ? 'bg-[#245C46]' : 'bg-[#E9ECE7]'}`} />
          </div>
        </div>

        {/* Step Card */}
        <div className="rounded-2xl border border-[#E9ECE7] bg-[#FFFFFF] p-6 sm:p-8 shadow-elevation space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-[#C85D55] text-xs font-medium">
              {error}
            </div>
          )}

          {/* Step 1: Welcome & Focus Area Selection */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#245C46] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Welcome, {currentUser?.name?.split(' ')[0] || 'Friend'}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#26352D]">
                  What area do you want to build momentum in?
                </h1>
                <p className="text-xs text-[#5F6F65]">
                  Select your primary focus area. We'll set up your initial habit plan to match.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FOCUS_AREAS.map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => setCategory(area.id)}
                    className={`p-4 rounded-xl border text-left transition-all space-y-1.5 ${
                      category === area.id
                        ? 'border-[#245C46] bg-[#DCEBDD]/40 text-[#26352D] ring-2 ring-[#245C46]/20 shadow-xs'
                        : 'border-[#E9ECE7] text-[#5F6F65] hover:border-[#8C9A91] bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={category === area.id ? 'text-[#245C46]' : 'text-[#5F6F65]'}>
                        {area.icon}
                      </span>
                      <span className="text-xs font-bold text-[#26352D]">{area.label}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#5F6F65]">
                      {area.description}
                    </p>
                  </button>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle transition-all"
                >
                  <span>Next: Define Your Habit</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Habit Title & Scope */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#26352D]">
                  Name your first habit goal
                </h2>
                <p className="text-xs text-[#5F6F65]">
                  Make it specific and achievable. You'll start with comfortable daily sessions.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="onboarding-title" className="block text-xs font-semibold text-[#26352D]">
                    Habit Title
                  </label>
                  <input
                    id="onboarding-title"
                    type="text"
                    placeholder="e.g. Learn Java in 30 Days or Morning 20-Min Run"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E9ECE7] focus:outline-none focus:ring-2 focus:ring-[#245C46] text-[#26352D]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="onboarding-tagline" className="block text-xs font-semibold text-[#26352D]">
                    Why is this important to you? (Optional)
                  </label>
                  <input
                    id="onboarding-tagline"
                    type="text"
                    placeholder="e.g. Feel healthier and more energized each morning"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E9ECE7] focus:outline-none focus:ring-2 focus:ring-[#245C46] text-[#26352D]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#26352D]">
                      Time per day
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[15, 20, 30].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setDailyMinutes(mins)}
                          className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                            dailyMinutes === mins
                              ? 'border-[#245C46] bg-[#DCEBDD] text-[#183c2e]'
                              : 'border-[#E9ECE7] text-[#5F6F65]'
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#26352D]">
                      Goal duration
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[21, 30, 60].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setTargetDays(days)}
                          className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                            targetDays === days
                              ? 'border-[#245C46] bg-[#DCEBDD] text-[#183c2e]'
                              : 'border-[#E9ECE7] text-[#5F6F65]'
                          }`}
                        >
                          {days}d
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-[#5F6F65] hover:text-[#26352D] flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  disabled={!title.trim()}
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle transition-all disabled:opacity-50"
                >
                  <span>Next: Reflection Reminder</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Check-in Routine & Activation */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#26352D]">
                  Set your daily reflection reminder
                </h2>
                <p className="text-xs text-[#5F6F65]">
                  A 30-second evening reflection helps you celebrate your wins and sets a comfortable pace for tomorrow.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F7F7F2] border border-[#E9ECE7] space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="onboarding-reminder" className="block text-xs font-semibold text-[#26352D]">
                    Reminder Time
                  </label>
                  <input
                    id="onboarding-reminder"
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E9ECE7] focus:outline-none focus:ring-2 focus:ring-[#245C46] bg-white text-[#26352D]"
                  />
                  <span className="text-[11px] text-[#5F6F65]">
                    We'll remind you to check in and review your progress at this time.
                  </span>
                </div>

                <div className="pt-2 border-t border-[#E9ECE7] space-y-1 text-xs text-[#5F6F65]">
                  <span className="font-bold text-[#26352D] block">Summary of your new habit:</span>
                  <p>• Habit: <strong>"{title}"</strong> ({dailyMinutes} mins/day)</p>
                  <p>• Plan: Gentle steps over {targetDays} days</p>
                  <p>• Day 1 task will be ready on your dashboard</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-semibold text-[#5F6F65] hover:text-[#26352D] flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleFinish}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Setting up your habit...</span>
                    </>
                  ) : (
                    <>
                      <span>Start Habit & Go to Dashboard</span>
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
