import { Types } from 'mongoose';
import { GoalService } from '../services/goalService.js';
import { TaskService } from '../services/taskService.js';
import { CheckInService } from '../services/checkInService.js';
import { Goal } from '../models/Goal.js';
import { Task } from '../models/Task.js';
import { CheckIn } from '../models/CheckIn.js';

export interface ToolExecutionResult {
  tool: string;
  success: boolean;
  data?: any;
  error?: string;
  uiActionProposal?: {
    type: 'reduce_time' | 'rest_day' | 'break_down_task' | 'boost_challenge';
    label: string;
    description: string;
    impactMinutes?: number;
    taskId?: string;
    applied?: boolean;
  };
}

export class ToolExecutor {
  static async execute(
    userId: string,
    toolName: string,
    args: Record<string, any>
  ): Promise<ToolExecutionResult> {
    try {
      switch (toolName) {
        case 'create_goal':
          return await this.createGoal(userId, args);

        case 'get_user_goals':
          return await this.getUserGoals(userId);

        case 'update_goal':
          return await this.updateGoal(userId, args);

        case 'get_today_tasks':
          return await this.getTodayTasks(userId);

        case 'create_tasks':
          return await this.createTasks(userId, args);

        case 'complete_task':
          return await this.completeTask(userId, args);

        case 'adapt_task':
          return await this.adaptTask(userId, args);

        case 'record_checkin':
          return await this.recordCheckIn(userId, args);

        case 'adapt_habit_plan':
          return await this.adaptHabitPlan(userId, args);

        case 'get_progress_summary':
          return await this.getProgressSummary(userId);

        default:
          return {
            tool: toolName,
            success: false,
            error: `Unknown tool "${toolName}"`,
          };
      }
    } catch (err: any) {
      return {
        tool: toolName,
        success: false,
        error: err.message || 'Execution error occurred in tool',
      };
    }
  }

  // 1. create_goal
  private static async createGoal(userId: string, args: Record<string, any>): Promise<ToolExecutionResult> {
    if (!args.title || typeof args.title !== 'string') {
      return { tool: 'create_goal', success: false, error: 'Goal title is required' };
    }

    const result = await GoalService.createGoal(userId, {
      title: args.title.trim(),
      tagline: args.tagline?.trim(),
      category: args.category || 'learning',
      targetDays: Number(args.targetDays) || 30,
      dailyCommitmentMinutes: Number(args.dailyCommitmentMinutes) || 25,
    });

    return {
      tool: 'create_goal',
      success: true,
      data: {
        goalId: result.goal._id.toString(),
        title: result.goal.title,
        category: result.goal.category,
        targetDays: result.goal.targetDays,
        dailyCommitmentMinutes: result.goal.dailyCommitmentMinutes,
        phasesCount: result.goal.planOutline.length,
        initialTaskId: result.initialTask._id.toString(),
        initialTaskTitle: result.initialTask.title,
      },
    };
  }

  // 2. get_user_goals
  private static async getUserGoals(userId: string): Promise<ToolExecutionResult> {
    const goals = await GoalService.getGoals(userId);
    return {
      tool: 'get_user_goals',
      success: true,
      data: goals.map(g => ({
        id: g._id.toString(),
        title: g.title,
        category: g.category,
        targetDays: g.targetDays,
        currentDay: g.currentDay,
        streak: g.streak,
        status: g.status,
        dailyCommitmentMinutes: g.dailyCommitmentMinutes,
        phases: g.planOutline.map(p => ({ phase: p.phaseNumber, title: p.title, range: p.dayRange })),
      })),
    };
  }

  // 3. update_goal
  private static async updateGoal(userId: string, args: Record<string, any>): Promise<ToolExecutionResult> {
    let goalId = args.goalId;

    if (!goalId && args.goalTitle) {
      const match = await Goal.findOne({
        userId: new Types.ObjectId(userId),
        title: { $regex: args.goalTitle, $options: 'i' },
      });
      if (match) goalId = match._id.toString();
    }

    if (!goalId) {
      const latest = await Goal.findOne({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 });
      if (latest) goalId = latest._id.toString();
    }

    if (!goalId) {
      return { tool: 'update_goal', success: false, error: 'Could not find goal to update' };
    }

    const updateData: any = {};
    if (args.dailyCommitmentMinutes) updateData.dailyCommitmentMinutes = Number(args.dailyCommitmentMinutes);
    if (args.status) updateData.status = args.status;
    if (args.adaptationNotice) updateData.adaptationNotice = args.adaptationNotice;

    const updated = await GoalService.updateGoal(userId, goalId, updateData);

    return {
      tool: 'update_goal',
      success: true,
      data: {
        id: updated._id.toString(),
        title: updated.title,
        status: updated.status,
        dailyCommitmentMinutes: updated.dailyCommitmentMinutes,
        adaptationNotice: updated.adaptationNotice,
      },
    };
  }

  // 4. get_today_tasks
  private static async getTodayTasks(userId: string): Promise<ToolExecutionResult> {
    const tasks = await TaskService.getTodayTasks(userId);
    return {
      tool: 'get_today_tasks',
      success: true,
      data: tasks.map(t => ({
        id: t._id.toString(),
        goalId: t.goalId.toString(),
        goalTitle: t.goalTitle,
        title: t.title,
        description: t.description,
        durationMinutes: t.durationMinutes,
        difficulty: t.difficulty,
        status: t.status,
        dayNumber: t.dayNumber,
        adaptationNote: t.adaptationNote,
      })),
    };
  }

  // 5. create_tasks
  private static async createTasks(userId: string, args: Record<string, any>): Promise<ToolExecutionResult> {
    let goalId = args.goalId;

    if (!goalId || !Types.ObjectId.isValid(goalId)) {
      const firstGoal = await Goal.findOne({ userId: new Types.ObjectId(userId) });
      if (firstGoal) goalId = firstGoal._id.toString();
      else return { tool: 'create_tasks', success: false, error: 'Goal ID required' };
    }

    const created = await TaskService.createTask(userId, {
      goalId,
      title: args.title,
      description: args.description || '',
      durationMinutes: Number(args.durationMinutes) || 20,
      difficulty: args.difficulty || 'easy',
      dayNumber: Number(args.dayNumber) || 1,
    });

    return {
      tool: 'create_tasks',
      success: true,
      data: {
        id: created._id.toString(),
        title: created.title,
        durationMinutes: created.durationMinutes,
        scheduledFor: created.scheduledFor,
      },
    };
  }

  // 6. complete_task
  private static async completeTask(userId: string, args: Record<string, any>): Promise<ToolExecutionResult> {
    let taskId = args.taskId;

    // Search by title if ID is not direct
    if (!taskId && args.taskTitle) {
      const match = await Task.findOne({
        userId: new Types.ObjectId(userId),
        title: { $regex: args.taskTitle, $options: 'i' },
      });
      if (match) taskId = match._id.toString();
    }

    if (!taskId) {
      // Find the first pending task
      const pending = await Task.findOne({
        userId: new Types.ObjectId(userId),
        status: { $in: ['pending', 'adapted'] },
      }).sort({ createdAt: -1 });
      if (pending) taskId = pending._id.toString();
    }

    if (!taskId) {
      return { tool: 'complete_task', success: false, error: 'No matching pending task found to complete' };
    }

    const isComplete = args.completed !== undefined ? Boolean(args.completed) : true;
    const task = await TaskService.completeTask(userId, taskId, isComplete);

    return {
      tool: 'complete_task',
      success: true,
      data: {
        id: task._id.toString(),
        title: task.title,
        status: task.status,
        completedAt: task.completedAt,
      },
    };
  }

  // 7. adapt_task
  private static async adaptTask(userId: string, args: Record<string, any>): Promise<ToolExecutionResult> {
    let taskId = args.taskId;

    if (!taskId && args.taskTitle) {
      const match = await Task.findOne({
        userId: new Types.ObjectId(userId),
        title: { $regex: args.taskTitle, $options: 'i' },
      });
      if (match) taskId = match._id.toString();
    }

    if (!taskId) {
      const pending = await Task.findOne({
        userId: new Types.ObjectId(userId),
        status: { $in: ['pending', 'adapted'] },
      }).sort({ createdAt: -1 });
      if (pending) taskId = pending._id.toString();
    }

    if (!taskId) {
      return { tool: 'adapt_task', success: false, error: 'No pending task found to adapt' };
    }

    const newDuration = Number(args.newDurationMinutes) || 15;
    const note = args.adaptationNote || `⚡ Adapted: Scaled down to ${newDuration}m micro-sprint to keep streak alive.`;

    const updated = await TaskService.updateTask(userId, taskId, {
      durationMinutes: newDuration,
      status: 'adapted',
      adaptationNote: note,
      difficulty: args.difficulty || 'easy',
    });

    return {
      tool: 'adapt_task',
      success: true,
      data: {
        id: updated._id.toString(),
        title: updated.title,
        durationMinutes: updated.durationMinutes,
        status: updated.status,
        adaptationNote: updated.adaptationNote,
      },
      uiActionProposal: {
        type: 'reduce_time',
        label: `Applied ${newDuration}-Minute Micro Sprint`,
        description: `Scaled down "${updated.title}" to ${newDuration}m to protect streak consistency.`,
        impactMinutes: newDuration,
        taskId: updated._id.toString(),
        applied: true,
      },
    };
  }

  // 8. record_checkin
  private static async recordCheckIn(userId: string, args: Record<string, any>): Promise<ToolExecutionResult> {
    const todayTasks = await TaskService.getTodayTasks(userId);
    const completedCount = todayTasks.filter(t => t.status === 'completed').length;

    const checkIn = await CheckInService.createCheckIn(userId, {
      status: args.status || (completedCount === todayTasks.length ? 'great' : 'partial'),
      completedTaskCount: completedCount,
      totalTaskCount: todayTasks.length,
      missedReason: args.missedReason,
      reflection: args.reflection || '',
      adaptTomorrow: args.adaptTomorrow ?? (args.status !== 'great'),
    });

    return {
      tool: 'record_checkin',
      success: true,
      data: {
        id: checkIn._id.toString(),
        date: checkIn.date,
        status: checkIn.status,
        missedReason: checkIn.missedReason,
        agentAdaptation: checkIn.agentAdaptation,
      },
    };
  }

  // 9. adapt_habit_plan
  private static async adaptHabitPlan(userId: string, args: Record<string, any>): Promise<ToolExecutionResult> {
    const targetMinutes = Number(args.targetMinutes) || 15;
    const reason = args.reason || 'busy';
    const note = `⚡ Proactively adapted to ${targetMinutes}m due to reported: ${reason}.`;

    const filter: any = {
      userId: new Types.ObjectId(userId),
      status: { $in: ['pending', 'adapted'] },
    };
    if (args.goalId && Types.ObjectId.isValid(args.goalId)) {
      filter.goalId = new Types.ObjectId(args.goalId);
    }

    const modified = await Task.updateMany(filter, {
      $set: {
        durationMinutes: targetMinutes,
        status: 'adapted',
        adaptationNote: note,
      },
    });

    return {
      tool: 'adapt_habit_plan',
      success: true,
      data: {
        adaptedTasksCount: modified.modifiedCount,
        newDurationMinutes: targetMinutes,
        reason,
        adaptationNote: note,
      },
      uiActionProposal: {
        type: 'reduce_time',
        label: `Active Recovery: ${targetMinutes}-Min Sprint`,
        description: `Adjusted schedule to prevent burnout after ${reason}.`,
        impactMinutes: targetMinutes,
        applied: true,
      },
    };
  }

  // 10. get_progress_summary
  private static async getProgressSummary(userId: string): Promise<ToolExecutionResult> {
    const [goals, tasks, checkIns] = await Promise.all([
      Goal.find({ userId: new Types.ObjectId(userId) }),
      Task.find({ userId: new Types.ObjectId(userId) }),
      CheckIn.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 }).limit(7),
    ]);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const consistencyRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
    const maxStreak = goals.reduce((max, g) => Math.max(max, g.streak), 0);

    return {
      tool: 'get_progress_summary',
      success: true,
      data: {
        activeGoalsCount: goals.filter(g => g.status === 'active' || g.status === 'recovery').length,
        totalGoalsCount: goals.length,
        totalTasksCount: totalTasks,
        completedTasksCount: completedTasks,
        currentBestStreak: maxStreak,
        consistencyRate: `${consistencyRate}%`,
        recentCheckIns: checkIns.map(c => ({ date: c.date, status: c.status, reason: c.missedReason })),
      },
    };
  }
}
