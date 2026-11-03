import React, { useState } from 'react';
import { 
  Flame, 
  Plus, 
  Bot, 
  Calendar, 
  Target, 
  BarChart3, 
  LogOut, 
  Sparkles, 
  ChevronDown, 
  ShieldCheck, 
  Compass, 
  Settings, 
  LogIn 
} from 'lucide-react';
import { AuthUser } from '../services/api';

export type NavTabType = 'landing' | 'today' | 'goals' | 'analytics';

interface NavbarProps {
  currentStreak: number;
  activeTab: NavTabType;
  setActiveTab: (tab: NavTabType) => void;
  onOpenNewGoal: () => void;
  onOpenCheckIn: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  unresolvedAdaptation: boolean;
  currentUser: AuthUser | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  isBackendConnected: boolean;
  onOpenProfileSettings?: () => void;
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
  isBackendConnected,
  onOpenProfileSettings
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop & Tablet Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/90 shadow-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3 lg:gap-6">
            {/* Left: Brand Identity & Primary Tab Navigation */}
            <div className="flex items-center gap-4 sm:gap-6 lg:gap-8 min-w-0">
              {/* Brand Logo */}
              <button 
                onClick={() => setActiveTab(currentUser ? 'today' : 'landing')}
                className="flex items-center gap-2.5 text-left group focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl p-1 -ml-1 transition-opacity shrink-0"
                aria-label="HabitHero home"
              >
                <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-subtle group-hover:bg-brand-700 transition-colors">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-lg tracking-tight text-stone-900 leading-none">
                    Habit<span className="text-brand-600">Hero</span>
                  </span>
                  <span className="text-[10px] text-stone-400 font-medium tracking-wide uppercase mt-0.5 hidden sm:block">
                    Personal Habit Coach
                  </span>
                </div>
              </button>

              {/* Desktop Nav Tabs */}
              <nav 
                className="hidden md:flex items-center gap-1 bg-stone-100/80 p-1 rounded-xl border border-stone-200/60" 
                aria-label="Primary navigation"
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('landing')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'landing'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>About</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('today')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'today'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Today's Tasks</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('goals')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'goals'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Habits</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('analytics')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'analytics'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Progress</span>
                </button>
              </nav>
            </div>

            {/* Right: Actions, Streak, Coach & User Profile */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Streak Badge */}
              <div 
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200/80 shadow-xs"
                title={`${currentStreak}-day streak`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="tabular-nums">{currentStreak}</span>
                <span className="text-[10px] uppercase tracking-wider text-amber-700/80 hidden sm:inline">Days</span>
              </div>

              {/* Check-In Modal Trigger (Desktop/Tablet) */}
              <button
                type="button"
                onClick={onOpenCheckIn}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/70 transition-all"
                title="Daily Reflection"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                <span>Reflect</span>
              </button>

              {/* New Goal Modal Trigger (Desktop/Tablet) */}
              <button
                type="button"
                onClick={onOpenNewGoal}
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/70 transition-all"
                title="Create New Habit"
              >
                <Plus className="w-3.5 h-3.5 text-brand-600" />
                <span>New Habit</span>
              </button>

              {/* Coach Chat Drawer Button */}
              <button
                type="button"
                onClick={onToggleChat}
                className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  isChatOpen
                    ? 'bg-brand-50 text-brand-800 border-brand-300 ring-2 ring-brand-500/20'
                    : 'bg-white hover:bg-stone-50 text-stone-800 border-stone-200 shadow-subtle'
                }`}
                aria-label="Toggle Habit Coach Chat"
              >
                <Bot className="w-4 h-4 text-brand-600" />
                <span className="hidden sm:inline">Coach</span>

                {unresolvedAdaptation && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                  </span>
                )}
              </button>

              {/* User Account / Profile Menu or Sign In */}
              {currentUser ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1 pl-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand-500"
                    aria-expanded={isUserMenuOpen}
                    aria-label="User menu"
                  >
                    <div className="w-6 h-6 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-[11px] shadow-xs">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="max-w-[100px] truncate hidden md:inline font-semibold">
                      {currentUser.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400 mr-1" />
                  </button>

                  {isUserMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-30" 
                        onClick={() => setIsUserMenuOpen(false)} 
                      />
                      <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-elevation border border-stone-200 p-2 z-40 animate-fade-in space-y-1">
                        <div className="px-3 py-2 border-b border-stone-100">
                          <p className="text-xs font-bold text-stone-900 truncate">
                            {currentUser.name}
                          </p>
                          <p className="text-[11px] text-stone-500 truncate">
                            {currentUser.email}
                          </p>
                          <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                            {isBackendConnected ? 'Connected' : 'Offline Mode'}
                          </div>
                        </div>

                        {onOpenProfileSettings && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onOpenProfileSettings();
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-2"
                          >
                            <Settings className="w-3.5 h-3.5 text-stone-400" />
                            <span>Profile & Preferences</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onLogout();
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-subtle hover:shadow-card transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sticky Bottom Navigation Bar (For Phones < 768px) */}
      <nav 
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-stone-200/90 shadow-elevation px-2 py-1 flex items-center justify-around"
        aria-label="Mobile Navigation"
      >
        <button
          type="button"
          onClick={() => setActiveTab('landing')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
            activeTab === 'landing' ? 'text-brand-600 font-bold' : 'text-stone-500'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">About</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('today')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
            activeTab === 'today' ? 'text-brand-600 font-bold' : 'text-stone-500'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Today</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('goals')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
            activeTab === 'goals' ? 'text-brand-600 font-bold' : 'text-stone-500'
          }`}
        >
          <Target className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Habits</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
            activeTab === 'analytics' ? 'text-brand-600 font-bold' : 'text-stone-500'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Progress</span>
        </button>

        <button
          type="button"
          onClick={onToggleChat}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
            isChatOpen ? 'text-brand-600 font-bold' : 'text-stone-500'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Coach</span>
        </button>
      </nav>
    </>
  );
};
