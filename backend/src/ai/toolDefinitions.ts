export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export const HABITHERO_TOOLS: FunctionDeclaration[] = [
  {
    name: 'create_goal',
    description: 'Create a new goal for the authenticated user and auto-generate an achievable phased plan with an initial Day 1 kickoff task.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
          description: 'The title of the goal (e.g., "Learn Java in 30 Days", "Morning Deep Work", "10k Steps Daily").',
        },
        tagline: {
          type: 'STRING',
          description: 'A brief motivating description or reason for this goal.',
        },
        category: {
          type: 'STRING',
          description: 'Category of goal.',
          enum: ['learning', 'health', 'career', 'productivity', 'mindfulness'],
        },
        targetDays: {
          type: 'NUMBER',
          description: 'Total duration in days (e.g., 14, 21, 30). Defaults to 30.',
        },
        dailyCommitmentMinutes: {
          type: 'NUMBER',
          description: 'Daily commitment in minutes (e.g., 15, 25, 30). Defaults to 25.',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'get_user_goals',
    description: 'Retrieve all goals and active roadmaps for the authenticated user from MongoDB.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'update_goal',
    description: 'Update parameters of an existing goal (e.g. change daily commitment, adjust status or add an adaptation notice).',
    parameters: {
      type: 'OBJECT',
      properties: {
        goalId: {
          type: 'STRING',
          description: 'The MongoDB ObjectId of the goal.',
        },
        goalTitle: {
          type: 'STRING',
          description: 'Optional title of the goal to update if goalId is not known.',
        },
        dailyCommitmentMinutes: {
          type: 'NUMBER',
          description: 'New daily commitment in minutes.',
        },
        status: {
          type: 'STRING',
          description: 'New status for the goal.',
          enum: ['active', 'completed', 'paused', 'recovery'],
        },
        adaptationNotice: {
          type: 'STRING',
          description: 'Note explaining how or why the goal roadmap was adjusted.',
        },
      },
    },
  },
  {
    name: 'get_today_tasks',
    description: 'Retrieve all tasks scheduled for today or pending from recent days for the authenticated user.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'create_tasks',
    description: 'Create one or more new daily tasks linked to an existing goal in MongoDB.',
    parameters: {
      type: 'OBJECT',
      properties: {
        goalId: {
          type: 'STRING',
          description: 'The MongoDB ObjectId of the goal to attach this task to.',
        },
        title: {
          type: 'STRING',
          description: 'Title of the task.',
        },
        description: {
          type: 'STRING',
          description: 'Detailed instructions or action steps for the task.',
        },
        durationMinutes: {
          type: 'NUMBER',
          description: 'Estimated duration in minutes (e.g., 15, 25, 30).',
        },
        difficulty: {
          type: 'STRING',
          description: 'Difficulty level.',
          enum: ['easy', 'moderate', 'challenging'],
        },
        dayNumber: {
          type: 'NUMBER',
          description: 'The day index in the goal roadmap (e.g., Day 2, Day 9).',
        },
      },
      required: ['goalId', 'title', 'durationMinutes'],
    },
  },
  {
    name: 'complete_task',
    description: 'Mark a task as completed in MongoDB and save its completion timestamp, keeping user streak active.',
    parameters: {
      type: 'OBJECT',
      properties: {
        taskId: {
          type: 'STRING',
          description: 'The MongoDB ObjectId of the task.',
        },
        taskTitle: {
          type: 'STRING',
          description: 'The title or keywords of the task to complete if taskId is unknown.',
        },
        completed: {
          type: 'BOOLEAN',
          description: 'Whether to mark completed (true) or uncompleted (false). Defaults to true.',
        },
      },
    },
  },
  {
    name: 'adapt_task',
    description: 'Adjust a specific task duration or difficulty based on user feedback (e.g. reduce from 30m to 15m to protect streak).',
    parameters: {
      type: 'OBJECT',
      properties: {
        taskId: {
          type: 'STRING',
          description: 'The MongoDB ObjectId of the task.',
        },
        taskTitle: {
          type: 'STRING',
          description: 'The title or keywords of the task to adapt if taskId is unknown.',
        },
        newDurationMinutes: {
          type: 'NUMBER',
          description: 'Adjusted duration in minutes (typically 10-15m for recovery).',
        },
        adaptationNote: {
          type: 'STRING',
          description: 'Friendly rationale displayed to the user explaining why it was shortened.',
        },
        difficulty: {
          type: 'STRING',
          description: 'New difficulty level.',
          enum: ['easy', 'moderate', 'challenging'],
        },
      },
      required: ['newDurationMinutes'],
    },
  },
  {
    name: 'record_checkin',
    description: 'Save the user daily accountability check-in (mood, completion status, friction reason, reflection) to MongoDB.',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: {
          type: 'STRING',
          description: 'Overall day completion status.',
          enum: ['great', 'partial', 'missed'],
        },
        missedReason: {
          type: 'STRING',
          description: 'Primary friction that hindered task completion.',
          enum: ['busy', 'difficult', 'tired', 'distracted', 'other'],
        },
        reflection: {
          type: 'STRING',
          description: 'User thoughts, lessons, or feelings about today progress.',
        },
        adaptTomorrow: {
          type: 'BOOLEAN',
          description: 'Whether to proactively scale tomorrow tasks down to 15m to protect streak.',
        },
      },
      required: ['status'],
    },
  },
  {
    name: 'adapt_habit_plan',
    description: 'Analyze user difficulty or hectic schedule and automatically adapt upcoming pending tasks to prevent burnout.',
    parameters: {
      type: 'OBJECT',
      properties: {
        reason: {
          type: 'STRING',
          description: 'Friction reason reported by user.',
          enum: ['busy', 'difficult', 'tired', 'distracted', 'other'],
        },
        targetMinutes: {
          type: 'NUMBER',
          description: 'Target micro-session duration in minutes. Defaults to 15.',
        },
        goalId: {
          type: 'STRING',
          description: 'Optional goal ID. If omitted, all pending tasks for today are adapted.',
        },
      },
      required: ['reason'],
    },
  },
  {
    name: 'get_progress_summary',
    description: 'Retrieve real statistics: current active streak, total goals, tasks completed today, overall consistency score.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
];

