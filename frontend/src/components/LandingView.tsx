import React from 'react';
import { 
  Sparkles, 
  Bot, 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  ChevronRight,
  Layers,
  HeartHandshake
} from 'lucide-react';

interface LandingViewProps {
  onOpenAuth: () => void;
  onExploreApp: () => void;
  isBackendConnected: boolean;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onOpenAuth,
  onExploreApp,
  isBackendConnected: _isBackendConnected,
}) => {
  return (
    <div className="space-y-16 pb-12">
      {/* 1. Hero Section */}
      <section className="relative pt-6 sm:pt-12 text-center max-w-4xl mx-auto space-y-6">
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
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-stone-900 leading-[1.15]">
          The Habit Coach for People Who{' '}
          <span className="text-[#245C46] underline decoration-[#DCEBDD] decoration-wavy underline-offset-8">
            Refuse to Miss Twice
          </span>
        </h1>

        {/* Value Proposition Subtitle */}
        <p className="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
          Most habit apps guilt-trip you when life gets chaotic. HabitHero is a supportive personal habit coach that adapts your daily tasks when you are busy, protecting your momentum and peace of mind.
        </p>

        {/* Primary Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-card hover:shadow-card-hover transition-all group"
          >
            <span>Start Building Habits Free</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          
          <button
            type="button"
            onClick={onExploreApp}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm bg-white hover:bg-stone-50 text-stone-800 border border-stone-200/90 shadow-subtle transition-all"
          >
            <span>Explore Live Dashboard</span>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </button>
        </div>

        {/* Trust Badges */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-stone-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#245C46]" />
            Zero-Guilt Habit Pacing
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#245C46]" />
            Supportive Daily Reflections
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#245C46]" />
            Private & Secure Account
          </span>
        </div>
      </section>

      {/* 2. Interactive Product Preview Mockup */}
      <section className="relative max-w-5xl mx-auto">
        <div className="rounded-2xl border border-stone-200/90 bg-white shadow-elevation overflow-hidden p-2 sm:p-4">
          <div className="bg-stone-50 rounded-xl border border-stone-200/70 p-4 sm:p-6 space-y-6">
            {/* Top Mock Window Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/70 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-400/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-400/80 inline-block" />
                <span className="ml-2 font-mono text-stone-400 text-[11px] hidden sm:inline">habithero.app/dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#DCEBDD] text-[#183c2e] border border-[#245C46]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#245C46] animate-pulse" />
                  Coach is ready
                </span>
              </div>
            </div>

            {/* Mock Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Left 2 Cols: Mock Daily Task */}
              <div className="md:col-span-2 space-y-3">
                <div className="p-4 rounded-xl bg-white border border-stone-200/90 shadow-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-500">Today's Focus • Day 8</span>
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                      5-day streak 🔥
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-stone-900">Build a Simple BankAccount Class (OOP Basics)</h4>
                  <p className="text-xs text-stone-600">
                    Implement balance field, deposit and withdraw validation methods in Java.
                  </p>
                  <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                    <span><strong>Adjusted for Today:</strong> Shortened to a 15-minute session so you stay on track.</span>
                  </div>
                </div>

                {/* Secondary completed task */}
                <div className="p-3.5 rounded-xl bg-stone-100/70 border border-stone-200/70 text-xs flex items-center justify-between text-stone-600">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-md bg-[#245C46] text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="line-through font-medium text-stone-500">30-Min Morning Focus Sprint</span>
                  </div>
                  <span className="text-stone-400 font-mono text-[11px]">Completed 08:15 AM</span>
                </div>
              </div>

              {/* Right Col: Companion Snapshot */}
              <div className="p-4 rounded-xl bg-white border border-stone-200/90 shadow-subtle space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#DCEBDD] text-[#183c2e] flex items-center justify-center">
                    <Bot className="w-4 h-4 text-[#245C46]" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-stone-900">HabitHero Coach</h5>
                    <span className="text-[10px] text-stone-400">Your personal coach</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/70 text-xs text-stone-700 leading-relaxed">
                  "I adjusted today's plan based on your evening reflection. A quick 15-minute session keeps your 5-day habit going strong!"
                </div>
                <button
                  type="button"
                  onClick={onExploreApp}
                  className="w-full py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Chat with Coach
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. The Problem vs The HabitHero Solution */}
      <section className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            Why Traditional Habit Trackers Fail You
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Static checkboxes punish real-life unpredictability. HabitHero introduces gentle, adaptive consistency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Traditional Apps */}
          <div className="rounded-2xl border border-red-200/60 bg-red-50/20 p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-2 text-red-700 text-xs font-bold uppercase tracking-wider">
              <span>Traditional Checklist Apps</span>
            </div>
            <h3 className="text-lg font-bold text-stone-900">
              The Guilt & Failure Spiral
            </h3>
            <ul className="space-y-3 text-xs sm:text-sm text-stone-600">
              <li className="flex items-start gap-2.5">
                <span className="text-red-500 font-bold">✕</span>
                <span>Expect full sessions even on hectic, exhausted, or emergency days.</span>
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

          {/* Card 2: HabitHero */}
          <div className="rounded-2xl border border-[#245C46]/30 bg-[#DCEBDD]/30 p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-2 text-[#245C46] text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#245C46]" />
              <span>HabitHero Personal Coach</span>
            </div>
            <h3 className="text-lg font-bold text-stone-900">
              The "Never Miss Twice" Principle
            </h3>
            <ul className="space-y-3 text-xs sm:text-sm text-stone-700">
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

      {/* 4. Core Features Deep Dive */}
      <section className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            Designed for Real People and Busy Days
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Simple habit structure, compassionate flexibility, and a supportive coach.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-card hover:shadow-card-hover transition-all space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#DCEBDD] text-[#245C46] flex items-center justify-center">
              <Layers className="w-5 h-5 text-[#245C46]" />
            </div>
            <h3 className="text-base font-bold text-stone-900">Sequential Habit Plans</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Never stare at an overwhelming list. HabitHero breaks goals into 3 manageable phases: Getting Started, Building Momentum, and Reaching Your Goal.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-card hover:shadow-card-hover transition-all space-y-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-700 flex items-center justify-center">
              <HeartHandshake className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-base font-bold text-stone-900">Daily Evening Reflection</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Reflect at the end of each day in 30 seconds. If life got busy, your coach immediately adjusts tomorrow's commitment so you wake up with a doable plan.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-card hover:shadow-card-hover transition-all space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#DCEBDD] text-[#245C46] flex items-center justify-center">
              <Bot className="w-5 h-5 text-[#245C46]" />
            </div>
            <h3 className="text-base font-bold text-stone-900">A Coach That Takes Action</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Your coach has real agency. Ask it to schedule tasks, shorten durations, or review your weekly rhythm directly in natural conversation.
            </p>
          </div>
        </div>
      </section>

      {/* 5. How It Works: 3 Simple Steps */}
      <section className="rounded-2xl border border-stone-200/90 bg-white p-8 sm:p-12 shadow-card max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            How HabitHero Works
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            From first habit creation to unbreakable consistency in 3 steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <div className="space-y-3 relative">
            <div className="w-9 h-9 rounded-full bg-[#DCEBDD] text-[#245C46] font-bold flex items-center justify-center text-sm border border-[#245C46]/30">
              1
            </div>
            <h4 className="text-base font-bold text-stone-900">Create a Habit Plan</h4>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Set your target days and realistic daily commitment (e.g. 15-20 minutes of daily coding, reading, or movement).
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-3 relative">
            <div className="w-9 h-9 rounded-full bg-[#DCEBDD] text-[#245C46] font-bold flex items-center justify-center text-sm border border-[#245C46]/30">
              2
            </div>
            <h4 className="text-base font-bold text-stone-900">Complete One Step Daily</h4>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Focus on today's single action card. Mark it done with celebratory visual confetti.
            </p>
          </div>

          {/* Step 3 */}
          <div className="space-y-3 relative">
            <div className="w-9 h-9 rounded-full bg-[#DCEBDD] text-[#245C46] font-bold flex items-center justify-center text-sm border border-[#245C46]/30">
              3
            </div>
            <h4 className="text-base font-bold text-stone-900">Coach Adapts When Life Happens</h4>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              If a hectic day hits, chat with your coach or complete an evening reflection. Never miss twice.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Ready to Begin CTA */}
      <section className="rounded-2xl bg-[#245C46] text-white p-8 sm:p-12 text-center max-w-5xl mx-auto space-y-6 shadow-elevation">
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
          Ready to Turn Consistency into Your Superpower?
        </h2>
        <p className="text-[#DCEBDD] text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          Join HabitHero today. Create your personal account to start building lasting momentum immediately.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm bg-white hover:bg-stone-50 text-[#245C46] transition-all shadow-subtle"
          >
            Create Free Account
          </button>
          <button
            type="button"
            onClick={onExploreApp}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm bg-[#183c2e] hover:bg-[#133025] text-white border border-[#3d8650] transition-all"
          >
            Launch Interactive Dashboard
          </button>
        </div>
      </section>
    </div>
  );
};
