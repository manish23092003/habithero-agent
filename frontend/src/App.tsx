import React, { useState, useEffect } from 'react';
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
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { DailyActionFeed } from './components/DailyActionFeed';
import { GoalPlansView } from './components/GoalPlansView';
import { ConsistencyTracker } from './components/ConsistencyTracker';
import { AgentCompanionChat } from './components/AgentCompanionChat';
import { NewGoalModal } from './components/NewGoalModal';
import { DailyCheckInModal } from './components/DailyCheckInModal';
import { FetchAiProtocolBanner } from './components/FetchAiProtocolBanner';
import { triggerStreakMilestoneConfetti } from './utils/confetti';

export const App: React.FC = () => {
  // Local state with localStorage hydration
  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('habithero_goals');
    return saved ? JSON.parse(saved) : INITIAL_GOALS;
  });

  const [tasks, setTasks] = useState<DailyTask[]>(() => {
    const saved = localStorage.getItem('habithero_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('habithero_stats');
    return saved ? JSON.parse(saved) : INITIAL_STATS;
  });

  const [messages, setMessages] = useState<AgentMessage[]>(() => {
    const saved = localStorage.getItem('habithero_messages');
    return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
  });

  const [activeTab, setActiveTab] = useState<'today' | 'goals' | 'analytics'>('today');
  const [isNewGoalOpen, setIsNewGoalOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('habithero_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('habithero_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('habithero_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('habithero_messages', JSON.stringify(messages));
  }, [messages]);

  // Toggle complete task
  const handleToggleComplete = (taskId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(t => {
        if (t.id !== taskId) return t;
        const nowCompleted = t.status !== 'completed';
        return {
          ...t,
          status: nowCompleted ? 'completed' : 'pending',
          completedAt: nowCompleted
            ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : undefined
        };
      })
    );

    setStats(prevStats => ({
      ...prevStats,
      totalCompletedTasks: prevStats.totalCompletedTasks + 1
    }));
  };

  // Quick adapt task directly from card
  const handleQuickAdapt = (taskId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          durationMinutes: 15,
          status: 'adapted',
          adaptationNote: '⚡ Adapted: Shortened to 15 min sprint to protect your consistency streak.'
        };
      })
    );

    const companionNotice: AgentMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      content: "I saw you adapted your task to a 15-minute micro-session. That is the exact high-resilience strategy that builds lasting habits. Go crush that 15 minutes! 🚀",
      timestamp: 'Just now',
      protocolMetadata: {
        protocol: 'fetchai_chat_v1',
        agentAddress: 'agent1qv09h2z...fetch',
        verifiedOnAsi1: true
      }
    };

    setMessages(prev => [...prev, companionNotice]);
  };

  // Apply action proposal from agent chat
  const handleApplyProposal = (proposal: ActionProposal) => {
    setTasks(prevTasks =>
      prevTasks.map(t => {
        if (t.goalId === 'goal-java-30' || proposal.taskId === t.id) {
          return {
            ...t,
            durationMinutes: proposal.impactMinutes || 15,
            status: 'adapted',
            adaptationNote: '⚡ Adapted via Fetch.ai Companion conversation'
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
            actionProposal: { ...m.actionProposal, applied: true }
          };
        }
        return m;
      })
    );
  };

  // Send message to Agent companion
  const handleSendMessage = (text: string) => {
    const userMsg: AgentMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: 'Just now'
    };

    setMessages(prev => [...prev, userMsg]);

    // Intelligent reactive agent response
    setTimeout(() => {
      let agentReply: AgentMessage;
      const lower = text.toLowerCase();

      if (lower.includes('adapt') || lower.includes('busy') || lower.includes('rough') || lower.includes('reduce')) {
        agentReply = {
          id: `msg-${Date.now() + 1}`,
          sender: 'agent',
          content: "Understood! When life gets hectic, forcing an unrealistic 30–45 minute session leads to skipping and guilt. I've formulated a 15-minute high-yield micro-exercise for you so you maintain full streak credit with zero burnout.",
          timestamp: 'Just now',
          actionProposal: {
            type: 'reduce_time',
            label: 'Switch Today to 15-Minute Micro Sprint',
            description: 'Reduces task time to 15 mins while keeping your 5-day streak intact.',
            impactMinutes: 15,
            applied: false
          },
          protocolMetadata: {
            protocol: 'fetchai_chat_v1',
            agentAddress: 'agent1qv09h2z...fetch',
            verifiedOnAsi1: true
          }
        };
      } else if (lower.includes('fetch.ai') || lower.includes('asi1') || lower.includes('agentverse') || lower.includes('uagent')) {
        agentReply = {
          id: `msg-${Date.now() + 1}`,
          sender: 'agent',
          content: "HabitHero is built natively with Fetch.ai uAgents & Python 3.12. Using the Fetch.ai Chat Protocol v1 and Agentverse Mailbox, I act as an autonomous decentralized companion. You can chat with me here or discover me on ASI:One (https://asi1.ai/chat) with agent address `agent1qv09h2z6k08m9v7...`!",
          timestamp: 'Just now',
          protocolMetadata: {
            protocol: 'fetchai_chat_v1',
            agentAddress: 'agent1qv09h2z...fetch',
            verifiedOnAsi1: true
          }
        };
      } else if (lower.includes('java') || lower.includes('streak') || lower.includes('progress')) {
        agentReply = {
          id: `msg-${Date.now() + 1}`,
          sender: 'agent',
          content: `You are currently on Day 8 of your 30-Day Java Blueprint with an active 5-day streak! You are currently mastering Phase 2: Object-Oriented Architecture (Classes, encapsulation, and methods). Keep this cadence and you'll hit Phase 3 (Collections & Streams) in 8 days!`,
          timestamp: 'Just now',
          protocolMetadata: {
            protocol: 'fetchai_chat_v1',
            agentAddress: 'agent1qv09h2z...fetch',
            verifiedOnAsi1: true
          }
        };
      } else if (lower.includes('python') || lower.includes('learn') || lower.includes('plan')) {
        agentReply = {
          id: `msg-${Date.now() + 1}`,
          sender: 'agent',
          content: `I'd love to help you build a new habit! Click the '+ New Goal' button or let me know: What is your target, how many days (e.g. 21 or 30 days), and how many minutes can you dedicate daily? I'll build your structured phased roadmap.`,
          timestamp: 'Just now',
          protocolMetadata: {
            protocol: 'fetchai_chat_v1',
            agentAddress: 'agent1qv09h2z...fetch',
            verifiedOnAsi1: true
          }
        };
      } else {
        agentReply = {
          id: `msg-${Date.now() + 1}`,
          sender: 'agent',
          content: `I've noted that. As your HabitHero companion, my mission is to eliminate the gap between setting goals and actually achieving them. Let me know if you need to adapt today's plan, review your streak, or break down a tough task!`,
          timestamp: 'Just now',
          protocolMetadata: {
            protocol: 'fetchai_chat_v1',
            agentAddress: 'agent1qv09h2z...fetch',
            verifiedOnAsi1: true
          }
        };
      }

      setMessages(prev => [...prev, agentReply]);
    }, 700);
  };

  // Add new goal & kickoff task
  const handleAddGoal = (newGoal: Goal, initialTask: DailyTask) => {
    setGoals(prev => [newGoal, ...prev]);
    setTasks(prev => [initialTask, ...prev]);
    triggerStreakMilestoneConfetti();

    const welcomeMsg: AgentMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      content: `🎉 Awesome! I've activated your new goal: "${newGoal.title}". I've scheduled your first action for today (${newGoal.dailyCommitmentMinutes} mins). Let's make day 1 count!`,
      timestamp: 'Just now',
      protocolMetadata: {
        protocol: 'fetchai_chat_v1',
        agentAddress: 'agent1qv09h2z...fetch',
        verifiedOnAsi1: true
      }
    };

    setMessages(prev => [...prev, welcomeMsg]);
  };

  // Submit daily check-in
  const handleSubmitCheckIn = (
    record: Partial<CheckInRecord>,
    shouldAdaptTomorrow: boolean
  ) => {
    if (record.status === 'great') {
      triggerStreakMilestoneConfetti();
      setStats(prev => ({
        ...prev,
        currentStreak: prev.currentStreak + 1,
        longestStreak: Math.max(prev.longestStreak, prev.currentStreak + 1),
        consistencyRate: Math.min(100, prev.consistencyRate + 2)
      }));
    } else {
      setStats(prev => ({
        ...prev,
        recoveryResilienceScore: Math.min(100, prev.recoveryResilienceScore + 1)
      }));

      if (shouldAdaptTomorrow) {
        setTasks(prev =>
          prev.map(t =>
            t.status !== 'completed'
              ? {
                  ...t,
                  durationMinutes: Math.min(t.durationMinutes, 15),
                  status: 'adapted',
                  adaptationNote: `⚡ Adapted for recovery based on check-in (${record.missedReason})`
                }
              : t
          )
        );
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
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Hero Banner with progress & adaptive alert */}
        <HeroBanner
          tasks={tasks}
          onOpenCheckIn={() => setIsCheckInOpen(true)}
          onOpenCompanionChat={() => setIsChatOpen(true)}
          currentStreak={stats.currentStreak}
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
              />
            </div>

            {/* Right 1 Col: Fetch.ai uAgent & Quick Companion Snapshot */}
            <div className="space-y-6">
              <FetchAiProtocolBanner
                onOpenCompanionChat={() => setIsChatOpen(true)}
              />
              <ConsistencyTracker stats={stats} />
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
            <ConsistencyTracker stats={stats} />
            <FetchAiProtocolBanner
              onOpenCompanionChat={() => setIsChatOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-bold text-slate-700">HabitHero</span> — Built for Stranger Builds Halloween Hackathon (Fetch.ai Track).
          </div>
          <div className="flex items-center gap-4">
            <a href="https://asi1.ai/chat" target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline">
              ASI:One Platform
            </a>
            <span>•</span>
            <span>Fetch.ai Chat Protocol v1</span>
            <span>•</span>
            <span>Python 3.12 uAgent</span>
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
    </div>
  );
};

export default App;
