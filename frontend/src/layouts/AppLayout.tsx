import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Target, 
  Calendar, 
  BarChart3, 
  Bot, 
  User, 
  Settings, 
  LogOut, 
  Sparkles, 
  Flame, 
  Plus, 
  Menu, 
  X,
  ChevronRight,
  ChevronDown,
  MessageSquarePlus,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

export const AppLayout: React.FC = () => {
  const { currentUser, logout, isBackendConnected } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Dynamic user streak calculation (default 0 for brand-new users)
  const [currentStreak, setCurrentStreak] = useState<number>(() => {
    const saved = localStorage.getItem('habithero_streak');
    const parsed = saved !== null ? Number(saved) : 0;
    return isNaN(parsed) ? 0 : parsed;
  });

  const syncStreak = useCallback(async () => {
    if (!currentUser) {
      setCurrentStreak(0);
      localStorage.removeItem('habithero_streak');
      return;
    }

    try {
      if (isBackendConnected) {
        const goals = await api.getGoals();
        const maxStreak = goals.reduce((max, g) => Math.max(max, g.streak || 0), 0);
        setCurrentStreak(maxStreak);
        localStorage.setItem('habithero_streak', String(maxStreak));
      } else {
        const saved = localStorage.getItem('habithero_streak');
        const parsed = saved !== null ? Number(saved) : 0;
        setCurrentStreak(isNaN(parsed) ? 0 : parsed);
      }
    } catch {
      setCurrentStreak(0);
    }
  }, [currentUser, isBackendConnected]);

  useEffect(() => {
    syncStreak();

    const handleStreakUpdate = (e?: Event) => {
      const customEvent = e as CustomEvent<{ streak: number }>;
      if (customEvent?.detail?.streak !== undefined) {
        setCurrentStreak(customEvent.detail.streak);
        localStorage.setItem('habithero_streak', String(customEvent.detail.streak));
      } else {
        syncStreak();
      }
    };

    window.addEventListener('habithero_streak_updated', handleStreakUpdate);
    return () => {
      window.removeEventListener('habithero_streak_updated', handleStreakUpdate);
    };
  }, [syncStreak]);

  // Derive breadcrumb label from current path
  const getBreadcrumbs = () => {
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length <= 1) return [{ label: 'Dashboard', path: '/app/dashboard' }];

    const breadcrumbs = [];
    if (segments[1] === 'dashboard') {
      breadcrumbs.push({ label: 'Dashboard', path: '/app/dashboard' });
    } else if (segments[1] === 'habits') {
      breadcrumbs.push({ label: 'Habits', path: '/app/habits' });
      if (segments[2] === 'new') {
        breadcrumbs.push({ label: 'New Habit', path: '/app/habits/new' });
      } else if (segments[2]) {
        breadcrumbs.push({ label: 'Habit Details', path: location.pathname });
      }
    } else if (segments[1] === 'calendar') {
      breadcrumbs.push({ label: 'Habit Calendar', path: '/app/calendar' });
    } else if (segments[1] === 'analytics') {
      breadcrumbs.push({ label: 'Your Progress', path: '/app/analytics' });
    } else if (segments[1] === 'ai-companion') {
      breadcrumbs.push({ label: 'HabitHero Coach', path: '/app/ai-companion' });
    } else if (segments[1] === 'profile') {
      breadcrumbs.push({ label: 'My Profile', path: '/app/profile' });
    } else if (segments[1] === 'settings') {
      breadcrumbs.push({ label: 'Settings', path: '/app/settings' });
    } else if (segments[1] === 'admin') {
      breadcrumbs.push({ label: 'Feedback Moderation', path: '/app/admin/feedback' });
    }
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const navItems = [
    { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Habits', path: '/app/habits', icon: Target },
    { name: 'Calendar', path: '/app/calendar', icon: Calendar },
    { name: 'Progress', path: '/app/analytics', icon: BarChart3 },
    { name: 'Coach', path: '/app/ai-companion', icon: Bot, badge: 'Ready' },
  ];

  const accountItems = [
    { name: 'My Profile', path: '/app/profile', icon: User },
    { name: 'Settings', path: '/app/settings', icon: Settings },
    { name: 'Feedback & Ideas', path: '/feedback', icon: MessageSquarePlus },
  ];

  return (
    <div className="min-h-screen bg-[#F7F7F2] flex text-[#26352D] font-sans">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#FFFFFF] border-r border-[#E9ECE7] shrink-0 sticky top-0 h-screen select-none">
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-[#E9ECE7] flex items-center justify-between">
          <Link to="/app/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#245C46] flex items-center justify-center text-white shadow-subtle">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-[#26352D] leading-none">
                Habit<span className="text-[#245C46]">Hero</span>
              </span>
              <span className="text-[10px] text-[#5F6F65] font-semibold tracking-wide uppercase mt-0.5">
                Personal Habit Coach
              </span>
            </div>
          </Link>
        </div>

        {/* Primary App Navigation */}
        <div className="flex-1 px-4 py-5 space-y-6 overflow-y-auto">
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#5F6F65]">
              Core Workflows
            </span>
            <nav className="space-y-1 pt-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-[#DCEBDD] text-[#183c2e] shadow-xs'
                          : 'text-[#5F6F65] hover:text-[#26352D] hover:bg-[#F7F7F2]'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#245C46] text-white">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Account & Settings */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#5F6F65]">
              Account
            </span>
            <nav className="space-y-1 pt-1.5">
              {accountItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-[#DCEBDD] text-[#183c2e] shadow-xs'
                          : 'text-[#5F6F65] hover:text-[#26352D] hover:bg-[#F7F7F2]'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#5F6F65] hover:text-[#C85D55] hover:bg-red-50/50 transition-all text-left"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign Out</span>
              </button>
            </nav>
          </div>
        </div>

        {/* User Card in Sidebar Footer */}
        <div className="p-4 border-t border-[#E9ECE7] bg-[#F7F7F2]/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#245C46] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#26352D] truncate">
                {currentUser?.name || 'Habit Hero'}
              </p>
              <p className="text-[11px] text-[#5F6F65] truncate">
                {currentUser?.email || 'alex@example.com'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        {/* Top App Header */}
        <header className="sticky top-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#E9ECE7] h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 shadow-subtle">
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="lg:hidden p-2 rounded-xl text-[#5F6F65] hover:text-[#26352D] hover:bg-[#F7F7F2]"
              aria-label="Toggle navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-xs text-[#5F6F65] min-w-0 truncate" aria-label="Breadcrumb">
              <Link to="/app/dashboard" className="hover:text-[#245C46] font-medium hidden sm:inline">
                App
              </Link>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.path}>
                  <ChevronRight className="w-3.5 h-3.5 text-[#8C9A91] shrink-0 hidden sm:inline" />
                  <span className={`truncate ${idx === breadcrumbs.length - 1 ? 'font-bold text-[#26352D]' : 'font-medium hover:text-[#245C46]'}`}>
                    {crumb.label}
                  </span>
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Right: Actions, Streak & User Menu */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Streak Counter */}
            <div 
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-[#26352D] bg-[#FDF6EB] border border-[#E8B96B]/60 shadow-xs"
              title={`${currentStreak}-day momentum streak`}
            >
              <Flame className="w-3.5 h-3.5 text-[#E8B96B] fill-[#E8B96B]" />
              <span className="tabular-nums font-extrabold">{currentStreak}</span>
              <span className="text-[10px] text-[#5F6F65] font-semibold hidden sm:inline">Days</span>
            </div>

            {/* Quick Action: New Habit Plan */}
            <Link
              to="/app/habits/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle hover:shadow-card transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Habit</span>
            </Link>

            {/* User Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl border border-[#E9ECE7] hover:bg-[#F7F7F2] text-xs font-medium transition-colors"
                aria-expanded={userMenuOpen}
              >
                <div className="w-6 h-6 rounded-lg bg-[#245C46] text-white flex items-center justify-center font-bold text-[11px]">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#5F6F65]" />
              </button>

              {userMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setUserMenuOpen(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#FFFFFF] shadow-elevation border border-[#E9ECE7] p-2 z-40 animate-fade-in space-y-1">
                    <div className="px-3 py-2 border-b border-[#E9ECE7]">
                      <p className="text-xs font-bold text-[#26352D] truncate">
                        {currentUser?.name || 'Habit Hero'}
                      </p>
                      <p className="text-[11px] text-[#5F6F65] truncate">
                        {currentUser?.email}
                      </p>
                      <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#DCEBDD] text-[#183c2e]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#245C46]" />
                        {isBackendConnected ? 'Connected' : 'Offline Mode'}
                      </div>
                    </div>

                    <Link
                      to="/app/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-[#26352D] hover:bg-[#F7F7F2] transition-colors flex items-center gap-2"
                    >
                      <User className="w-3.5 h-3.5 text-[#5F6F65]" />
                      <span>My Profile</span>
                    </Link>

                    <Link
                      to="/app/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-[#26352D] hover:bg-[#F7F7F2] transition-colors flex items-center gap-2"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#5F6F65]" />
                      <span>Settings</span>
                    </Link>

                    <Link
                      to="/feedback"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-[#26352D] hover:bg-[#F7F7F2] transition-colors flex items-center gap-2"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5 text-[#5F6F65]" />
                      <span>Feedback & Roadmap</span>
                    </Link>

                    <Link
                      to="/app/admin/feedback"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-[#26352D] hover:bg-[#F7F7F2] transition-colors flex items-center gap-2"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#245C46]" />
                      <span>Admin Moderation</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                        navigate('/');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-[#C85D55] hover:bg-red-50/50 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Slide-over Sidebar Drawer */}
        {mobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div 
              className="fixed inset-0 bg-[#26352D]/40 backdrop-blur-xs" 
              onClick={() => setMobileSidebarOpen(false)} 
            />
            <div className="relative w-64 max-w-[80vw] bg-[#FFFFFF] h-full flex flex-col p-4 shadow-elevation z-10 animate-fade-in">
              <div className="flex items-center justify-between pb-4 border-b border-[#E9ECE7]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#245C46] flex items-center justify-center text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm text-[#26352D]">HabitHero</span>
                </div>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 rounded-lg text-[#5F6F65]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 py-4 space-y-4 overflow-y-auto">
                <nav className="space-y-1">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold ${
                          isActive ? 'bg-[#DCEBDD] text-[#183c2e]' : 'text-[#5F6F65]'
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </NavLink>
                  ))}
                  {accountItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold ${
                          isActive ? 'bg-[#DCEBDD] text-[#183c2e]' : 'text-[#5F6F65]'
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>

              <div className="pt-4 border-t border-[#E9ECE7]">
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMobileSidebarOpen(false);
                    navigate('/');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#C85D55]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Nested Route Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile Sticky Bottom Navigation (Phones < 1024px) */}
      <nav 
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-md border-t border-[#E9ECE7] shadow-elevation px-3 py-1 flex items-center justify-around"
        aria-label="Mobile Navigation"
      >
        <NavLink
          to="/app/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
              isActive ? 'text-[#245C46] font-bold' : 'text-[#5F6F65]'
            }`
          }
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Home</span>
        </NavLink>

        <NavLink
          to="/app/habits"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
              isActive ? 'text-[#245C46] font-bold' : 'text-[#5F6F65]'
            }`
          }
        >
          <Target className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Habits</span>
        </NavLink>

        <NavLink
          to="/app/calendar"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
              isActive ? 'text-[#245C46] font-bold' : 'text-[#5F6F65]'
            }`
          }
        >
          <Calendar className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Calendar</span>
        </NavLink>

        <NavLink
          to="/app/ai-companion"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
              isActive ? 'text-[#245C46] font-bold' : 'text-[#5F6F65]'
            }`
          }
        >
          <Bot className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Coach</span>
        </NavLink>

        <NavLink
          to="/app/profile"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
              isActive ? 'text-[#245C46] font-bold' : 'text-[#5F6F65]'
            }`
          }
        >
          <User className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Profile</span>
        </NavLink>
      </nav>
    </div>
  );
};
