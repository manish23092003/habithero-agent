export type GoalCategory = 'learning' | 'health' | 'career' | 'productivity' | 'mindfulness';

export interface HabitPhase {
  phaseNumber: number;
  title: string;
  focus: string;
  dayRange: string;
  tasksPlanned: number;
}

export interface Goal {
  id: string;
  title: string;
  tagline: string;
  category: GoalCategory;
  targetDays: number;
  currentDay: number;
  dailyCommitmentMinutes: number;
  streak: number;
  status: 'active' | 'completed' | 'paused' | 'recovery';
  planOutline: HabitPhase[];
  createdAt: string;
  adaptationNotice?: string;
}

export type TaskStatus = 'pending' | 'completed' | 'missed' | 'adapted';

export interface DailyTask {
  id: string;
  goalId: string;
  goalTitle: string;
  title: string;
  description: string;
  durationMinutes: number;
  difficulty: 'easy' | 'moderate' | 'challenging';
  status: TaskStatus;
  completedAt?: string;
  completedDate?: string;
  dayNumber: number;
  scheduledFor: string;
  adaptationNote?: string;
  category: GoalCategory;
}

export interface CheckInRecord {
  id: string;
  date: string;
  completedTaskCount: number;
  totalTaskCount: number;
  status: 'great' | 'partial' | 'missed';
  reflection?: string;
  missedReason?: 'busy' | 'difficult' | 'tired' | 'distracted' | 'other';
  agentAdaptation?: string;
}

export interface ActionProposal {
  type: 'reduce_time' | 'rest_day' | 'break_down_task' | 'boost_challenge';
  label: string;
  description: string;
  impactMinutes?: number;
  taskId?: string;
  applied?: boolean;
}

export interface AgentMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  actionProposal?: ActionProposal;
  toolExecutions?: Array<{ tool: string; success: boolean; data?: any; error?: string }>;
  protocolMetadata?: {
    protocol: 'fetchai_chat_v1';
    agentAddress?: string;
    verifiedOnAsi1?: boolean;
  };
}

export interface UserStats {
  currentStreak: number;
  longestStreak: number;
  totalCompletedTasks: number;
  consistencyRate: number;
  weeklyCompleted: number[];
  recoveryResilienceScore: number | null;
}

export interface WeeklyRhythmDay {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  short: string;
  date: string;
  completedCount: number;
  scheduledCount: number;
  percentage: number;
}

export interface UserAnalytics {
  taskCompletionRate: number;
  totalTasks: number;
  completedTasks: number;
  currentStreak: number;
  longestStreak: number;
  bounceBackRate: number | null;
  weeklyRhythm: WeeklyRhythmDay[];
  weeklyCompletedTotal: number;
  categoryCounts: Record<string, number>;
  activeGoalsCount: number;
  totalPlannedDailyMinutes: number;
  habitBreakdown: Array<{
    id: string;
    title: string;
    category: string;
    currentDay: number;
    targetDays: number;
    dailyCommitmentMinutes: number;
    streak: number;
    status: string;
  }>;
}

