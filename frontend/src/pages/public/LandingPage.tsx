import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  ChevronRight, 
  Layers, 
  Bot,
  HeartHandshake
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="space-y-20 py-8 sm:py-16">
      {/* 1. Hero Section */}
      <section className="text-center max-w-4xl mx-auto px-4 space-y-6">
        {/* Friendly Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DCEBDD] text-[#183c2e] text-xs font-semibold shadow-subtle animate-fade-in border border-[#E9ECE7]">
          <Sparkles className="w-3.5 h-3.5 text-[#245C46]" />
          <span>Your Personal Habit Coach</span>
          <span className="text-[#8C9A91]">•</span>
          <span className="font-medium text-[11px] text-[#245C46]">
            Ready to help you build lasting consistency
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#26352D] leading-[1.12]">
          The Habit Coach for People Who{' '}
          <span className="text-[#245C46] underline decoration-[#DCEBDD] decoration-wavy underline-offset-8">
            Refuse to Miss Twice
          </span>
        </h1>

        {/* Value Proposition */}
        <p className="text-base sm:text-xl text-[#5F6F65] max-w-2xl mx-auto leading-relaxed">
          Most habit apps guilt-trip you when life gets chaotic. HabitHero is a supportive personal habit coach that adapts your daily tasks when you are busy, protecting your momentum and peace of mind.
        </p>

        {/* Primary Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
          <Link
            to={isAuthenticated ? "/app/dashboard" : "/register"}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-card hover:shadow-card-hover transition-all group"
          >
            <span>{isAuthenticated ? 'Enter Your Dashboard' : 'Start Building Habits Free'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          
          <Link
            to="/features"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm bg-[#FFFFFF] hover:bg-[#F7F7F2] text-[#26352D] border border-[#E9ECE7] shadow-subtle transition-all"
          >
            <span>See How It Works</span>
            <ChevronRight className="w-4 h-4 text-[#5F6F65]" />
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-5 sm:gap-8 text-xs text-[#5F6F65]">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-[#245C46]" />
            Zero-Guilt Habit Pacing
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-[#245C46]" />
            Supportive Daily Reflections
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-[#245C46]" />
            Private & Secure Account
          </span>
        </div>
      </section>

      {/* 2. Interactive Product Preview Mockup */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="rounded-2xl border border-[#E9ECE7] bg-[#FFFFFF] shadow-elevation p-3 sm:p-5">
          <div className="bg-[#F7F7F2] rounded-xl border border-[#E9ECE7] p-4 sm:p-6 space-y-6">
            {/* Top Mock Window Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E9ECE7] text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-400/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-400/80 inline-block" />
                <span className="ml-2 font-mono text-[#5F6F65] text-[11px] hidden sm:inline">habithero.app/app/dashboard</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#DCEBDD] text-[#183c2e]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#245C46] animate-pulse" />
                Coach is ready
              </span>
            </div>

            {/* Mock Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Left 2 Cols: Mock Daily Task */}
              <div className="md:col-span-2 space-y-3">
                <div className="p-4 rounded-xl bg-white border border-[#E9ECE7] shadow-subtle space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#5F6F65]">Today's Focus • Day 8</span>
                    <span className="font-bold text-[#26352D] bg-[#FDF6EB] px-2 py-0.5 rounded-full border border-[#E8B96B]/60">
                      5-day streak 🔥
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-[#26352D]">
                    Build a Simple BankAccount Class (OOP Basics)
                  </h4>
                  <p className="text-xs text-[#5F6F65]">
                    Implement private balance field, deposit() and withdraw() methods with validation in Java.
                  </p>
                  <div className="p-2.5 rounded-lg bg-[#FDF6EB] border border-[#E8B96B]/60 text-xs text-[#26352D] flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#E8B96B] shrink-0" />
                    <span><strong>Adjusted for Today:</strong> Shortened to a 15-minute session so you stay on track.</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E9ECE7] text-xs flex items-center justify-between text-[#5F6F65]">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-md bg-[#245C46] text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="line-through font-medium text-[#5F6F65]">30-Min Morning Focus Sprint</span>
                  </div>
                  <span className="text-[#8C9A91] font-mono text-[11px]">Completed 08:15 AM</span>
                </div>
              </div>

              {/* Right Col: Companion Snapshot */}
              <div className="p-4 rounded-xl bg-white border border-[#E9ECE7] shadow-subtle space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#DCEBDD] text-[#183c2e] flex items-center justify-center">
                    <Bot className="w-4 h-4 text-[#245C46]" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#26352D]">HabitHero Coach</h5>
                    <span className="text-[10px] text-[#5F6F65]">Your personal habit coach</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#F7F7F2] border border-[#E9ECE7] text-xs text-[#26352D] leading-relaxed">
                  "I adjusted today's plan based on your evening reflection. A quick 15-minute session keeps your 5-day habit going strong!"
                </div>
                <Link
                  to="/app/ai-companion"
                  className="w-full py-2 rounded-lg bg-[#26352D] hover:bg-[#183c2e] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#E8B96B]" />
                  Chat with Coach
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. The Problem vs The HabitHero Solution */}
      <section className="max-w-5xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#26352D]">
            Why Traditional Habit Trackers Fail You
          </h2>
          <p className="text-xs sm:text-sm text-[#5F6F65]">
            Rigid checkboxes punish real-life unpredictability. HabitHero introduces gentle, adaptive consistency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-red-200/80 bg-red-50/20 p-6 sm:p-7 space-y-4">
            <span className="text-red-700 text-xs font-bold uppercase tracking-wider block">
              Traditional Checklist Apps
            </span>
            <h3 className="text-lg font-bold text-[#26352D]">
              The Guilt & Failure Spiral
            </h3>
            <ul className="space-y-3 text-xs sm:text-sm text-[#5F6F65]">
              <li className="flex items-start gap-2.5">
                <span className="text-red-500 font-bold">✕</span>
                <span>Expect full hour sessions even on hectic, exhausted, or emergency days.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-red-500 font-bold">✕</span>
                <span>A single missed day wipes out your entire streak, discouraging you from restarting.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-red-500 font-bold">✕</span>
                <span>Impersonal generic push notifications that are easy to tune out.</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[#245C46]/30 bg-[#DCEBDD]/25 p-6 sm:p-7 space-y-4">
            <span className="text-[#245C46] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#245C46]" />
              HabitHero Personal Coach
            </span>
            <h3 className="text-lg font-bold text-[#26352D]">
              The "Never Miss Twice" Principle
            </h3>
            <ul className="space-y-3 text-xs sm:text-sm text-[#26352D]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#245C46] shrink-0 mt-0.5" />
                <span><strong>Adaptive Pacing:</strong> Automatically shortens session times down to a 10-15 minute step when life gets busy.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#245C46] shrink-0 mt-0.5" />
                <span><strong>Bounce-Back Score:</strong> Focuses on how quickly you return after difficult days rather than punishing resets.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#245C46] shrink-0 mt-0.5" />
                <span><strong>Intelligent Coach:</strong> Ready to talk through challenges, add tasks, and adjust your plan in conversational language.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. Core Features Overview */}
      <section className="max-w-5xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#26352D]">
            Designed for Real People and Busy Days
          </h2>
          <p className="text-xs sm:text-sm text-[#5F6F65]">
            Simple habit structure, compassionate flexibility, and a supportive coach.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-[#E9ECE7] bg-[#FFFFFF] p-6 shadow-card space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#DCEBDD] text-[#245C46] flex items-center justify-center">
              <Layers className="w-5 h-5 text-[#245C46]" />
            </div>
            <h3 className="text-base font-bold text-[#26352D]">Sequential Habit Plans</h3>
            <p className="text-xs text-[#5F6F65] leading-relaxed">
              Every habit breaks down into 3 manageable phases: Getting Started, Building Momentum, and Reaching Your Goal.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E9ECE7] bg-[#FFFFFF] p-6 shadow-card space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#FDF6EB] text-[#E8B96B] flex items-center justify-center">
              <HeartHandshake className="w-5 h-5 text-[#E8B96B]" />
            </div>
            <h3 className="text-base font-bold text-[#26352D]">Daily Evening Reflection</h3>
            <p className="text-xs text-[#5F6F65] leading-relaxed">
              A 30-second evening reflection lets your coach adjust tomorrow's schedule so you always wake up with a feasible plan.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E9ECE7] bg-[#FFFFFF] p-6 shadow-card space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#DCEBDD] text-[#245C46] flex items-center justify-center">
              <Bot className="w-5 h-5 text-[#245C46]" />
            </div>
            <h3 className="text-base font-bold text-[#26352D]">A Coach That Takes Action</h3>
            <p className="text-xs text-[#5F6F65] leading-relaxed">
              Ask your coach to shorten a task, add a new step, or adjust your schedule. Changes apply directly to your daily plan.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Call to Action Banner */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="rounded-2xl bg-[#245C46] text-white p-8 sm:p-12 text-center space-y-6 shadow-elevation">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Turn Consistency into Your Superpower?
          </h2>
          <p className="text-[#DCEBDD] text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Create your account today to start your first habit plan with your personal coach by your side.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/register"
              className="px-6 py-3 rounded-xl font-bold text-sm bg-white hover:bg-[#F7F7F2] text-[#245C46] shadow-subtle transition-all"
            >
              Create Free Account
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 rounded-xl font-semibold text-sm bg-[#183c2e] hover:bg-[#133025] text-white border border-[#3d8650] transition-all"
            >
              Sign In to Existing Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
