import React, { useState } from 'react';
import { 
  Flame, 
  Plus, 
  Bot, 
  CheckCircle2, 
  Calendar, 
  Target, 
  BarChart3,
  User,
  LogOut,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { AuthUser } from '../services/api';

interface NavbarProps {
  currentStreak: number;
  activeTab: 'today' | 'goals' | 'analytics';
  setActiveTab: (tab: 'today' | 'goals' | 'analytics') => void;
  onOpenNewGoal: () => void;
  onOpenCheckIn: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  unresolvedAdaptation: boolean;
  currentUser: AuthUser | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  isBackendConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentStreak,
  activeTab,
  setActiveTab,
  onOpenNewGoal,
  onOpenCheckIn,
  onToggleChat,
  isChatOpen,
  unresolvedAdaptation,
  currentUser,
  onOpenAuth,
  onLogout,
  isBackendConnected
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop & Tablet Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3 lg:gap-6">
            {/* Left: Brand Identity & Primary Tab Navigation */}
            <div className="flex items-center gap-4 sm:gap-6 lg:gap-8 min-w-0">
              {/* Brand Logo */}
              <button 
                onClick={() => setActiveTab('today')}
                className="flex items-center gap-2.5 text-left group focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg p-1 -ml-1 transition-opacity shrink-0"
                aria-label="HabitHero home"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-subtle group-hover:bg-brand-700 transition-colors">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-lg tracking-tight text-slate-900 leading-none">
                    Habit<span className="text-brand-600">Hero</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5 hidden sm:block">
                    Accountability Companion
                  </span>
                </div>
              </button>

              {/* Desktop Nav Tabs (Hidden on mobile phones, clean on tablet/desktop) */}
              <nav 
                className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200/60"
                aria-label="Primary navigation"
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('today')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'today'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Today's Actions</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('goals')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'goals'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Goal Roadmaps</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('analytics')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'analytics'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Consistency</span>
                </button>
              </nav>
            </div>

            {/* Right: Status Indicators & Actions */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Agent Connection Indicator (Quiet & Subtle) */}
              <button
                type="button"
                onClick={onToggleChat}
                className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
                title={isBackendConnected ? "HabitHero Agent active & connected via Agentverse" : "Agent offline"}
              >
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isBackendConnected ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    isBackendConnected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`} />
                </span>
                <span className="text-[11px] font-medium text-slate-700 whitespace-nowrap">
                  {isBackendConnected ? 'Agent Live' : 'Connecting'}
                </span>
              </button>

              {/* Streak Indicator (Compact & Clear) */}
              <div 
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50/90 border border-amber-200 text-amber-900 shrink-0"
                title={`${currentStreak}-day active consistency streak`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                <span className="tabular-nums">
                  {currentStreak} <span className="font-normal text-amber-700 text-[11px]">d</span>
                </span>
              </div>

              {/* Secondary Action: Daily Check-In */}
              <button
                type="button"
                onClick={onOpenCheckIn}
                className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-subtle shrink-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="whitespace-nowrap">Daily Check-In</span>
              </button>

              {/* Primary Action: + New Goal */}
              <button
                type="button"
                onClick={onOpenNewGoal}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white transition-all shadow-subtle hover:shadow-card shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline whitespace-nowrap">New Goal</span>
                <span className="sm:hidden">Goal</span>
              </button>

              {/* Account Controls: Profile Menu */}
              {currentUser ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-1.5 h-9 p-1 rounded-lg hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors"
                    aria-expanded={isUserMenuOpen}
                    aria-label="User account menu"
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="hidden lg:inline max-w-[90px] truncate text-slate-800 font-semibold text-xs">
                      {currentUser.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block shrink-0" />
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-slate-200 shadow-elevation py-1 z-40 text-xs animate-fade-in"
                      onMouseLeave={() => setIsUserMenuOpen(false)}
                    >
                      <div className="px-3 py-2 border-b border-slate-100">
                        <p className="font-semibold text-slate-900 truncate">{currentUser.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors font-medium"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-subtle"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sign In</span>
                </button>
              )}

              {/* AI Companion Chat Trigger Button */}
              <button
                type="button"
                onClick={onToggleChat}
                className={`relative flex items-center justify-center h-9 w-9 rounded-lg border transition-all ${
                  isChatOpen
                    ? 'bg-slate-900 border-slate-900 text-white shadow-subtle'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
                title="Toggle HabitHero AI Companion Drawer"
                aria-label="Toggle AI Companion Chat"
              >
                <Bot className="w-4 h-4" />
                {unresolvedAdaptation && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Ergonomic Mobile Bottom Navigation Bar (Phones) */}
      <nav 
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-4 flex items-center justify-around shadow-elevation"
        aria-label="Mobile navigation"
      >
        <button
          type="button"
          onClick={() => setActiveTab('today')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-semibold transition-colors ${
            activeTab === 'today' ? 'text-brand-700 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Calendar className={`w-4 h-4 ${activeTab === 'today' ? 'text-brand-600' : 'text-slate-400'}`} />
          <span>Today</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('goals')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-semibold transition-colors ${
            activeTab === 'goals' ? 'text-brand-700 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Target className={`w-4 h-4 ${activeTab === 'goals' ? 'text-brand-600' : 'text-slate-400'}`} />
          <span>Goals</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-semibold transition-colors ${
            activeTab === 'analytics' ? 'text-brand-700 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <BarChart3 className={`w-4 h-4 ${activeTab === 'analytics' ? 'text-brand-600' : 'text-slate-400'}`} />
          <span>Consistency</span>
        </button>

        <button
          type="button"
          onClick={onOpenCheckIn}
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-semibold text-slate-500 hover:text-slate-900"
        >
          <CheckCircle2 className="w-4 h-4 text-slate-400" />
          <span>Check-In</span>
        </button>
      </nav>
    </>
  );
};
