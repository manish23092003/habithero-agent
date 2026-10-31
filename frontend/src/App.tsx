import React, { useState, useEffect, useCallback } from 'react';
import { 
  INITIAL_GOALS, 
  INITIAL_TASKS, 
  INITIAL_MESSAGES, 
  INITIAL_STATS 
} from './data/mockData';
import { 
  Goal, 
  DailyTask, 
  AgentMessage, 
  UserStats, 
  ActionProposal, 
  CheckInRecord 
} from './types';
import { api, AuthUser } from './services/api';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { DailyActionFeed } from './components/DailyActionFeed';
import { GoalPlansView } from './components/GoalPlansView';
import { ConsistencyTracker } from './components/ConsistencyTracker';
import { AgentCompanionChat } from './components/AgentCompanionChat';
import { NewGoalModal } from './components/NewGoalModal';
import { DailyCheckInModal } from './components/DailyCheckInModal';
import { AuthModal } from './components/AuthModal';
import { FetchAiProtocolBanner } from './components/FetchAiProtocolBanner';
import { triggerStreakMilestoneConfetti } from './utils/confetti';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  // Authentication & Server state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // App core state
  const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS);
  const [tasks, setTasks] = useState<DailyTask[]>(INITIAL_TASKS);
  const [stats, setStats] = useState<UserStats>(INITIAL_STATS);
  const [messages, setMessages] = useState<AgentMessage[]>(() => {
    const saved = localStorage.getItem('habithero_messages');
    return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
  });

  // UI state
  const [activeTab, setActiveTab] = useState<'today' | 'goals' | 'analytics'>('today');
  const [isNewGoalOpen, setIsNewGoalOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [inFlightTaskIds, setInFlightTaskIds] = useState<Set<string>>(new Set());

  // Sync messages locally
  useEffect(() => {
    localStorage.setItem('habithero_messages', JSON.stringify(messages));
  }, [messages]);

  // Load data from Backend MongoDB or fallback
  const loadBackendData = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);

    try {
      const isHealthy = await api.checkHealth();
      setIsBackendConnected(isHealthy);

      if (!isHealthy) {
        // Fallback to local storage / demo seed data
        const savedGoals = localStorage.getItem('habithero_goals');
        const savedTasks = localStorage.getItem('habithero_tasks');
        const savedStats = localStorage.getItem('habithero_stats');
        if (savedGoals) setGoals(JSON.parse(savedGoals));
        if (savedTasks) setTasks(JSON.parse(savedTasks));
        if (savedStats) setStats(JSON.parse(savedStats));
        setIsLoading(false);
        return;
      }

      // Check current user session
      let user: AuthUser | null = null;
      try {
        user = await api.getMe();
        setCurrentUser(user);
      } catch {
        setCurrentUser(null);
      }

      if (user) {
        // Fetch user's actual MongoDB data
        const [dbGoals, dbTasks] = await Promise.all([
          api.getGoals(),
          api.getTodayTasks(),
        ]);

        setGoals(dbGoals);
        setTasks(dbTasks);

        // Derive real stats directly from user's active MongoDB records
        const realStreak = dbGoals.reduce((max, g) => Math.max(max, g.streak || 0), 0);
        const completedTasksCount = dbTasks.filter(t => t.status === 'completed').length;
        const consistencyRate = dbTasks.length > 0
          ? Math.round((completedTasksCount / dbTasks.length) * 100)
          : (realStreak > 0 ? 100 : 0);

        setStats(prev => ({
          ...prev,
          currentStreak: realStreak,
          longestStreak: Math.max(prev.longestStreak, realStreak),
          consistencyRate,
        }));
      } else {
        // Guest mode / not logged in preview
        const savedGoals = localStorage.getItem('habithero_goals');
        const savedTasks = localStorage.getItem('habithero_tasks');
        if (savedGoals) {
          setGoals(JSON.parse(savedGoals));
        } else {
          setGoals(INITIAL_GOALS);
        }
        if (savedTasks) {
          setTasks(JSON.parse(savedTasks));
        } else {
          setTasks(INITIAL_TASKS);
        }
      }
    } catch (err: any) {
      console.warn('API sync warning:', err.message);
      setApiError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackendData();
  }, [loadBackendData]);

  // Handle Auth success
  const handleAuthSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    loadBackendData();
  };

  // Handle Logout
  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setGoals(INITIAL_GOALS);
    setTasks(INITIAL_TASKS);
  };

  // Toggle complete task (MongoDB persisted with in-flight lock & error rollback)
  const handleToggleComplete = async (taskId: string) => {
    if (inFlightTaskIds.has(taskId)) return; // Prevent duplicate rapid submission
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;
    const nowCompleted = targetTask.status !== 'completed';

    setInFlightTaskIds(prev => new Set(prev).add(taskId));

    // Optimistic UI update
    setTasks(prevTasks =>
      prevTasks.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          status: nowCompleted ? 'completed' : 'pending',
          completedAt: nowCompleted
            ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : undefined,
        };
      })
    );

    setStats(prevStats => ({
      ...prevStats,
      totalCompletedTasks: nowCompleted
        ? prevStats.totalCompletedTasks + 1
        : Math.max(0, prevStats.totalCompletedTasks - 1),
    }));

    // Persist to MongoDB if connected and authenticated
    if (isBackendConnected && currentUser) {
      try {
        await api.completeTask(taskId, nowCompleted);
      } catch (err: any) {
        console.error('Failed to persist task completion to MongoDB:', err.message);
        // Rollback on error
        setTasks(prevTasks =>
          prevTasks.map(t => {
            if (t.id !== taskId) return t;
            return {
              ...t,
              status: !nowCompleted ? 'completed' : 'pending',
              completedAt: !nowCompleted
                ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : undefined,
            };
          })
        );
      } finally {
        setInFlightTaskIds(prev => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }
    } else {
      localStorage.setItem('habithero_tasks', JSON.stringify(tasks));
      setInFlightTaskIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  // Quick adapt task directly from card (MongoDB persisted)
  const handleQuickAdapt = async (taskId: string) => {
    const adaptationNote = '⚡ Adapted: Shortened to 15 min sprint to protect your consistency streak.';

    setTasks(prevTasks =>
      prevTasks.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          durationMinutes: 15,
          status: 'adapted',
          adaptationNote,
        };
      })
    );

    // Persist to MongoDB if connected
    if (isBackendConnected && currentUser) {
      try {
        await api.updateTask(taskId, {
          durationMinutes: 15,
          status: 'adapted',
          adaptationNote,
        });
      } catch (err: any) {
        console.error('Failed to persist task adaptation to MongoDB:', err.message);
      }
    }

    const companionNotice: AgentMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      content: "I saw you adapted your task to a 15-minute micro-session. That is the exact high-resilience strategy that builds lasting habits. Go crush that 15 minutes! 🚀",
      timestamp: 'Just now',
      protocolMetadata: {
        protocol: 'fetchai_chat_v1',
        agentAddress: 'agent1qv09h2z...fetch',
        verifiedOnAsi1: true,
      },
    };

    setMessages(prev => [...prev, companionNotice]);
  };

  // Apply action proposal from agent chat
  const handleApplyProposal = async (proposal: ActionProposal) => {
    setTasks(prevTasks =>
      prevTasks.map(t => {
        if (t.goalId === 'goal-java-30' || proposal.taskId === t.id) {
          return {
            ...t,
            durationMinutes: proposal.impactMinutes || 15,
            status: 'adapted',
            adaptationNote: '⚡ Adapted via Fetch.ai Companion conversation',
          };
        }
        return t;
      })
    );

    setMessages(prev =>
      prev.map(m => {
        if (m.actionProposal && m.actionProposal.label === proposal.label) {
          return {
            ...m,
            actionProposal: { ...m.actionProposal, applied: true },
          };
        }
        return m;
      })
    );
  };

  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
  const [isChatAiLoading, setIsChatAiLoading] = useState(false);

  // Send message to Agent companion (Real AI + Tools)
  const handleSendMessage = async (text: string) => {
    const userMsg: AgentMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: 'Just now',
    };

    setMessages(prev => [...prev, userMsg]);

    if (isBackendConnected && currentUser) {
      setIsChatAiLoading(true);
      try {
        const res = await api.sendChatMessage(text, activeConversationId);
        setActiveConversationId(res.conversationId);

        const agentReply: AgentMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: 'agent',
          content: res.reply,
          timestamp: 'Just now',
          toolExecutions: res.toolsExecuted,
          actionProposal: res.actionProposal,
          protocolMetadata: {
            protocol: 'fetchai_chat_v1',
            agentAddress: 'agent1qv09h2z...fetch',
            verifiedOnAsi1: true,
          },
        };

        setMessages(prev => [...prev, agentReply]);

        // Reflect database mutations performed by tools on the dashboard in real time
        if (res.toolsExecuted && res.toolsExecuted.length > 0) {
          const [updatedGoals, updatedTasks] = await Promise.all([
            api.getGoals(),
            api.getTodayTasks(),
          ]);
          if (updatedGoals.length > 0) setGoals(updatedGoals);
          if (updatedTasks.length > 0) setTasks(updatedTasks);
        }
      } catch (err: any) {
        const errorReply: AgentMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: 'agent',
          content: `Communication error: ${err.message}`,
          timestamp: 'Just now',
        };
        setMessages(prev => [...prev, errorReply]);
      } finally {
        setIsChatAiLoading(false);
      }
    } else {
      // Offline / guest mode fallback
      setTimeout(() => {
        let agentReply: AgentMessage;
        const lower = text.toLowerCase();

        if (lower.includes('sign in') || lower.includes('login') || lower.includes('account')) {
          agentReply = {
            id: `msg-${Date.now() + 1}`,
            sender: 'agent',
            content: "Click 'Sign In' in the navigation bar to log in with our one-click test account (Alex Hero) or create your own profile. That activates real MongoDB persistence and AI tool execution!",
            timestamp: 'Just now',
          };
        } else {
          agentReply = {
            id: `msg-${Date.now() + 1}`,
            sender: 'agent',
            content: "You are currently in preview mode. Click 'Sign In' in the navbar to connect your session to our Node/Express backend and enable real AI function calling on your MongoDB data!",
            timestamp: 'Just now',
          };
        }
        setMessages(prev => [...prev, agentReply]);
      }, 500);
    }
  };

  // Add new goal & kickoff task (MongoDB persisted)
  const handleAddGoal = async (newGoal: Goal, initialTask: DailyTask) => {
    triggerStreakMilestoneConfetti();

    if (isBackendConnected && currentUser) {
      try {
        const created = await api.createGoal({
          title: newGoal.title,
          tagline: newGoal.tagline,
          category: newGoal.category,
          targetDays: newGoal.targetDays,
          dailyCommitmentMinutes: newGoal.dailyCommitmentMinutes,
        });
        setGoals(prev => [created.goal, ...prev]);
        setTasks(prev => [created.initialTask, ...prev]);
      } catch (err: any) {
        console.error('Failed to create goal in MongoDB:', err.message);
        setGoals(prev => [newGoal, ...prev]);
        setTasks(prev => [initialTask, ...prev]);
      }
    } else {
      setGoals(prev => [newGoal, ...prev]);
      setTasks(prev => [initialTask, ...prev]);
      localStorage.setItem('habithero_goals', JSON.stringify([newGoal, ...goals]));
      localStorage.setItem('habithero_tasks', JSON.stringify([initialTask, ...tasks]));
    }

    const welcomeMsg: AgentMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      content: `🎉 Awesome! I've activated your new goal: "${newGoal.title}". I've scheduled your first action for today (${newGoal.dailyCommitmentMinutes} mins). Let's make day 1 count!`,
      timestamp: 'Just now',
      protocolMetadata: {
        protocol: 'fetchai_chat_v1',
        agentAddress: 'agent1qv09h2z...fetch',
        verifiedOnAsi1: true,
      },
    };

    setMessages(prev => [...prev, welcomeMsg]);
  };

  // Submit daily check-in (MongoDB persisted)
  const handleSubmitCheckIn = async (
    record: Partial<CheckInRecord>,
    shouldAdaptTomorrow: boolean
  ) => {
    if (record.status === 'great') {
      triggerStreakMilestoneConfetti();
      setStats(prev => ({
        ...prev,
        currentStreak: prev.currentStreak + 1,
        longestStreak: Math.max(prev.longestStreak, prev.currentStreak + 1),
        consistencyRate: Math.min(100, prev.consistencyRate + 2),
      }));
    } else {
      setStats(prev => ({
        ...prev,
        recoveryResilienceScore: Math.min(100, prev.recoveryResilienceScore + 1),
      }));

      if (shouldAdaptTomorrow) {
        setTasks(prev =>
          prev.map(t =>
            t.status !== 'completed'
              ? {
                  ...t,
                  durationMinutes: Math.min(t.durationMinutes, 15),
                  status: 'adapted',
                  adaptationNote: `⚡ Adapted for recovery based on check-in (${record.missedReason})`,
                }
              : t
          )
        );
      }
    }

    // Persist to MongoDB if connected
    if (isBackendConnected && currentUser) {
      try {
        await api.createCheckIn({
          status: record.status || 'great',
          completedTaskCount: record.completedTaskCount || 0,
          totalTaskCount: record.totalTaskCount || 0,
          missedReason: record.missedReason,
          reflection: record.reflection,
          adaptTomorrow: shouldAdaptTomorrow,
        });
      } catch (err: any) {
        console.error('Failed to persist check-in to MongoDB:', err.message);
      }
    }
  };

  const hasUnresolvedAdaptation = tasks.some(t => t.status === 'adapted');
  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Top Navbar */}
      <Navbar
        currentStreak={stats.currentStreak}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewGoal={() => setIsNewGoalOpen(true)}
        onOpenCheckIn={() => setIsCheckInOpen(true)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        unresolvedAdaptation={hasUnresolvedAdaptation}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        isBackendConnected={isBackendConnected}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8 space-y-6">
        {/* API Error / Reconnect Banner if needed */}
        {apiError && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{apiError} — Using local demo fallback.</span>
            </div>
            <button
              onClick={loadBackendData}
              className="inline-flex items-center gap-1 font-bold text-amber-900 hover:underline"
            >
              <RefreshCw className="w-3 h-3" />
              Retry Sync
            </button>
          </div>
        )}

        {/* Loading State Spinner */}
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">
              Synchronizing with HabitHero MongoDB Backend...
            </p>
          </div>
        ) : (
          <>
            {/* Hero Banner with progress & adaptive alert */}
            <HeroBanner
              tasks={tasks}
              onOpenCheckIn={() => setIsCheckInOpen(true)}
              onOpenCompanionChat={() => setIsChatOpen(true)}
              currentStreak={stats.currentStreak}
              currentUser={currentUser}
            />

            {/* Tab-driven Views */}
            {activeTab === 'today' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Action Feed */}
                <div className="lg:col-span-2 space-y-6">
                  <DailyActionFeed
                    tasks={tasks}
                    onToggleComplete={handleToggleComplete}
                    onQuickAdapt={handleQuickAdapt}
                    onOpenNewGoal={() => setIsNewGoalOpen(true)}
                    onOpenCheckIn={() => setIsCheckInOpen(true)}
                    inFlightTaskIds={inFlightTaskIds}
                  />
                </div>

                {/* Right 1 Col: Fetch.ai uAgent & Quick Companion Snapshot */}
                <div className="space-y-6">
                  <FetchAiProtocolBanner
                    onOpenCompanionChat={() => setIsChatOpen(true)}
                    isConnected={isBackendConnected}
                  />
                  <ConsistencyTracker stats={stats} tasks={tasks} compact={true} />
                </div>
              </div>
            )}

            {activeTab === 'goals' && (
              <GoalPlansView
                goals={goals}
                onOpenNewGoal={() => setIsNewGoalOpen(true)}
                onSelectGoalForChat={() => setIsChatOpen(true)}
              />
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <ConsistencyTracker stats={stats} tasks={tasks} />
                <FetchAiProtocolBanner
                  onOpenCompanionChat={() => setIsChatOpen(true)}
                  isConnected={isBackendConnected}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 mb-16 md:mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">HabitHero</span>
            <span>—</span>
            <span className="text-slate-500">AI Accountability Companion & Autonomous Habit Protocol</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/70">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isBackendConnected ? 'MongoDB Live' : 'Local Storage Mode'}
            </span>
            <span>•</span>
            <a 
              href="https://asi1.ai/chat" 
              target="_blank" 
              rel="noreferrer" 
              className="text-slate-600 hover:text-brand-600 transition-colors"
            >
              ASI:One Chat
            </a>
            <span>•</span>
            <span className="font-mono text-[11px] text-slate-400">AgentChat 0.3.0</span>
          </div>
        </div>
      </footer>

      {/* Interactive AI Companion Chat Drawer */}
      <AgentCompanionChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        onSendMessage={handleSendMessage}
        onApplyProposal={handleApplyProposal}
        tasks={tasks}
        isLoading={isChatAiLoading}
      />

      {/* New Goal Creation Modal */}
      <NewGoalModal
        isOpen={isNewGoalOpen}
        onClose={() => setIsNewGoalOpen(false)}
        onAddGoal={handleAddGoal}
      />

      {/* Daily Check-In Modal */}
      <DailyCheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        onSubmitCheckIn={handleSubmitCheckIn}
        completedTasksCount={completedTasksCount}
        totalTasksCount={tasks.length}
      />

      {/* Auth Modal (Sign In / Register / Demo) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default App;
