import React from 'react';
import { 
  Flame, 
  Sparkles, 
  Plus, 
  Bot, 
  CheckCircle2, 
  Calendar, 
  Target, 
  BarChart3,
  Radio
} from 'lucide-react';

interface NavbarProps {
  currentStreak: number;
  activeTab: 'today' | 'goals' | 'analytics';
  setActiveTab: (tab: 'today' | 'goals' | 'analytics') => void;
  onOpenNewGoal: () => void;
  onOpenCheckIn: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  unresolvedAdaptation: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentStreak,
  activeTab,
  setActiveTab,
  onOpenNewGoal,
  onOpenCheckIn,
  onToggleChat,
  isChatOpen,
  unresolvedAdaptation
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Identity */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('today')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-sm ring-2 ring-emerald-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xl tracking-tight text-slate-900">
                    Habit<span className="text-emerald-600">Hero</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Fetch.ai Track
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden md:block leading-none">
                  Don't just set goals. Actually achieve them.
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-200">
              <button
                onClick={() => setActiveTab('today')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'today'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Today's Actions
              </button>
              <button
                onClick={() => setActiveTab('goals')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'goals'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Target className="w-4 h-4" />
                Goal Roadmaps
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'analytics'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Consistency
              </button>
            </nav>
          </div>

          {/* Right Section: Fetch.ai uAgent Status, Streak, Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Fetch.ai Live Agent Status Badge */}
            <div 
              onClick={onToggleChat}
              className="cursor-pointer group flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-all text-xs"
              title="Click to interact with the HabitHero Fetch.ai Companion"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div className="flex items-center gap-1 font-medium text-slate-700">
                <Radio className="w-3 h-3 text-emerald-600" />
                <span className="hidden sm:inline">ASI:One Agent</span>
                <span className="sm:hidden">uAgent</span>
              </div>
            </div>

            {/* Streak Counter */}
            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80 shadow-xs"
              title="Active Streak: 5 consecutive days"
            >
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse-subtle" />
              <span className="text-xs font-bold text-orange-950">
                {currentStreak} <span className="font-medium text-orange-800 text-[11px]">Days</span>
              </span>
            </div>

            {/* Daily Check-In CTA */}
            <button
              onClick={onOpenCheckIn}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Daily Check-In
            </button>

            {/* New Goal CTA */}
            <button
              onClick={onOpenNewGoal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all hover:shadow"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Goal</span>
            </button>

            {/* Companion Chat Drawer Button */}
            <button
              onClick={onToggleChat}
              className={`relative p-2 rounded-lg border transition-all ${
                isChatOpen
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              aria-label="Toggle AI Companion Chat"
            >
              <Bot className="w-5 h-5" />
              {unresolvedAdaptation && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden border-t border-slate-100 py-2 justify-around">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold ${
              activeTab === 'today' ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Today
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold ${
              activeTab === 'goals' ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Goals
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold ${
              activeTab === 'analytics' ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Consistency
          </button>
          <button
            onClick={onOpenCheckIn}
            className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold text-emerald-700 bg-emerald-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Check-In
          </button>
        </div>
      </div>
    </header>
  );
};
