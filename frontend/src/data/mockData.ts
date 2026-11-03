import { Goal, DailyTask, AgentMessage, UserStats } from '../types';

export const INITIAL_STATS: UserStats = {
  currentStreak: 0,
  longestStreak: 0,
  totalCompletedTasks: 0,
  consistencyRate: 0,
  weeklyCompleted: [0, 0, 0, 0, 0, 0, 0], // Mon to Sun completion count
  recoveryResilienceScore: 0,
};

export const INITIAL_GOALS: Goal[] = [
  {
    id: 'goal-java-30',
    title: 'Learn Java Fundamentals in 30 Days',
    tagline: 'From zero to OOP concepts, Collections, and building a CLI project',
    category: 'learning',
    targetDays: 30,
    currentDay: 1,
    dailyCommitmentMinutes: 25,
    streak: 0,
    status: 'active',
    adaptationNotice: '',
    createdAt: '2026-10-23T00:00:00.000Z',
    planOutline: [
      { phaseNumber: 1, title: 'Syntax & Core Control Flow', focus: 'Variables, loops, and conditional statements', dayRange: 'Days 1-7', tasksPlanned: 7 },
      { phaseNumber: 2, title: 'Object-Oriented Architecture', focus: 'Classes, inheritance, encapsulation & interfaces', dayRange: 'Days 8-16', tasksPlanned: 9 },
      { phaseNumber: 3, title: 'Collections & Streams API', focus: 'ArrayLists, HashMaps, lambda expressions', dayRange: 'Days 17-24', tasksPlanned: 8 },
      { phaseNumber: 4, title: 'Capstone Project & Refactoring', focus: 'HabitTracker CLI with file persistence', dayRange: 'Days 25-30', tasksPlanned: 6 }
    ]
  },
  {
    id: 'goal-deepwork-21',
    title: '21-Day 7:30 AM Morning Focus Sprint',
    tagline: 'Block 30 minutes of uninterrupted study/coding before social apps',
    category: 'productivity',
    targetDays: 21,
    currentDay: 1,
    dailyCommitmentMinutes: 30,
    streak: 0,
    status: 'active',
    createdAt: '2026-10-19T00:00:00.000Z',
    planOutline: [
      { phaseNumber: 1, title: 'Trigger & Friction Removal', focus: 'Night-before desk prep & instant start', dayRange: 'Days 1-7', tasksPlanned: 7 },
      { phaseNumber: 2, title: 'Sustained Flow State', focus: 'Zero tab switching & 30-min Pomodoro', dayRange: 'Days 8-14', tasksPlanned: 7 },
      { phaseNumber: 3, title: 'Cognitive Consolidation', focus: 'End-of-session 3-sentence summary note', dayRange: 'Days 15-21', tasksPlanned: 7 }
    ]
  },
  {
    id: 'goal-cardio-health',
    title: 'Daily Posture & 20-Min Brisk Movement',
    tagline: 'Counter computer fatigue with active spine stretching and walking',
    category: 'health',
    targetDays: 14,
    currentDay: 1,
    dailyCommitmentMinutes: 20,
    streak: 0,
    status: 'active',
    createdAt: '2026-10-27T00:00:00.000Z',
    planOutline: [
      { phaseNumber: 1, title: 'Posture Reset Routine', focus: 'Chest openers & neck decompressions', dayRange: 'Days 1-7', tasksPlanned: 7 },
      { phaseNumber: 2, title: 'Aerobic Rhythm Building', focus: 'Brisk cadence walking with breath control', dayRange: 'Days 8-14', tasksPlanned: 7 }
    ]
  }
];

export const INITIAL_TASKS: DailyTask[] = [
  {
    id: 'task-java-day8',
    goalId: 'goal-java-30',
    goalTitle: 'Learn Java in 30 Days',
    title: 'Build a Simple "BankAccount" Class (OOP Basics)',
    description: 'Implement private balance field, deposit() and withdraw() methods with validation. Test in a main method.',
    durationMinutes: 15, // Adapted from 25m!
    difficulty: 'easy',
    status: 'adapted',
    dayNumber: 8,
    scheduledFor: 'Today',
    category: 'learning',
    adaptationNote: '⚡ Adjusted: Shortened to 15 mins to keep your momentum going after yesterday\'s busy schedule.'
  },
  {
    id: 'task-focus-day12',
    goalId: 'goal-deepwork-21',
    goalTitle: 'Morning Focus Sprint',
    title: '30-Minute Deep Work: Read Spring Boot Dependency Injection Docs',
    description: 'Phone in do-not-disturb mode. Read annotations @Component, @Autowired, @Service and write 2 bullet takeaways.',
    durationMinutes: 30,
    difficulty: 'moderate',
    status: 'completed',
    completedAt: '08:15 AM',
    dayNumber: 12,
    scheduledFor: 'Today',
    category: 'productivity'
  },
  {
    id: 'task-health-day4',
    goalId: 'goal-cardio-health',
    goalTitle: 'Posture & Movement',
    title: 'Spine Decompression + 2,000 Step Midday Walk',
    description: 'Step away from screen. 5-minute doorway chest stretch + 15-minute sunlight walk around the block.',
    durationMinutes: 20,
    difficulty: 'easy',
    status: 'pending',
    dayNumber: 4,
    scheduledFor: 'Today',
    category: 'health'
  }
];

export const INITIAL_MESSAGES: AgentMessage[] = [
  {
    id: 'msg-1',
    sender: 'user',
    content: 'I want to learn Java in 30 days.',
    timestamp: 'Yesterday at 9:00 AM'
  },
  {
    id: 'msg-2',
    sender: 'agent',
    content: "Great choice! Java is an incredible language for software engineering. How much focused time can you realistically dedicate each day?",
    timestamp: 'Yesterday at 9:01 AM',
    protocolMetadata: {
      protocol: 'fetchai_chat_v1',
      agentAddress: 'agent1qv09h2z...fetch',
      verifiedOnAsi1: true
    }
  },
  {
    id: 'msg-3',
    sender: 'user',
    content: 'About 25-30 minutes after dinner.',
    timestamp: 'Yesterday at 9:03 AM'
  },
  {
    id: 'msg-4',
    sender: 'agent',
    content: "Perfect! I've put together a clear 30-Day Java habit plan with 4 phases, broken down into manageable daily steps.",
    timestamp: 'Yesterday at 9:04 AM',
    protocolMetadata: {
      protocol: 'fetchai_chat_v1',
      agentAddress: 'agent1qv09h2z...fetch',
      verifiedOnAsi1: true
    }
  },
  {
    id: 'msg-5',
    sender: 'agent',
    content: "Hey Manish! 👋 I noticed yesterday's Object Constructors exercise wasn't checked off. Did work run late, did the topic feel confusing, or was energy low?",
    timestamp: 'Today at 8:00 AM',
    protocolMetadata: {
      protocol: 'fetchai_chat_v1',
      agentAddress: 'agent1qv09h2z...fetch',
      verifiedOnAsi1: true
    }
  },
  {
    id: 'msg-6',
    sender: 'user',
    content: 'College project deadline ran super late yesterday, honestly had zero mental bandwidth left.',
    timestamp: 'Today at 8:30 AM'
  },
  {
    id: 'msg-7',
    sender: 'agent',
    content: "Totally understandable — life happens! The secret to habit mastery is never allowing one hectic day to break momentum. I've automatically adjusted today's BankAccount task to a lightweight 15-minute micro-exercise so you can keep your 5-day streak blazing. 🔥",
    timestamp: 'Today at 8:31 AM',
    actionProposal: {
      type: 'reduce_time',
      label: 'Adjusted to 15-Minute Session',
      description: 'Kept the exercise manageable for today so you stay on track without feeling rushed.',
      impactMinutes: 15,
      applied: true
    },
    protocolMetadata: {
      protocol: 'fetchai_chat_v1',
      agentAddress: 'agent1qv09h2z...fetch',
      verifiedOnAsi1: true
    }
  }
];

