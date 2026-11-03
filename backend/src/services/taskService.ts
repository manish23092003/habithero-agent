import { Types } from 'mongoose';
import { Task } from '../models/Task.js';
import { Goal } from '../models/Goal.js';
import { IdempotencyService } from './idempotencyService.js';
import { TaskStatus, TaskDifficulty, GoalCategory } from '../types/index.js';

export interface CreateTaskDTO {
  goalId: string;
  title: string;
  description?: string;
  durationMinutes: number;
  difficulty?: TaskDifficulty;
  scheduledFor?: string;
  dayNumber?: number;
  category?: GoalCategory;
  idempotencyKey?: string;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  durationMinutes?: number;
  difficulty?: TaskDifficulty;
  status?: TaskStatus;
  adaptationNote?: string;
  scheduledFor?: string;
}

export class TaskService {
  static async createTask(userId: string, dto: CreateTaskDTO) {
    if (!Types.ObjectId.isValid(dto.goalId)) {
      throw new Error('Invalid goal ID format');
    }

    const goal = await Goal.findOne({
      _id: new Types.ObjectId(dto.goalId),
      userId: new Types.ObjectId(userId),
    });

    if (!goal) {
      throw new Error('Goal not found or does not belong to you');
    }

    return IdempotencyService.runWithIdempotency({
      userId,
      resourceType: 'task',
      title: `${dto.goalId}:${dto.title}`,
      idempotencyKey: dto.idempotencyKey,
      execute: async () => {
        return Task.create({
          userId: new Types.ObjectId(userId),
          goalId: goal._id,
          goalTitle: goal.title,
          title: dto.title,
          description: dto.description || '',
          durationMinutes: dto.durationMinutes,
          difficulty: dto.difficulty || 'easy',
          status: 'pending',
          dayNumber: dto.dayNumber || goal.currentDay,
          scheduledFor: dto.scheduledFor || 'Today',
          category: dto.category || goal.category,
        });
      },
      retrieveById: async (taskId: string) => {
        return Task.findById(taskId);
      },
    });
  }

  static async getTasks(userId: string, filter?: { goalId?: string; status?: string }) {
    const query: any = { userId: new Types.ObjectId(userId) };
    if (filter?.goalId && Types.ObjectId.isValid(filter.goalId)) {
      query.goalId = new Types.ObjectId(filter.goalId);
    }
    if (filter?.status) {
      query.status = filter.status;
    }
    return Task.find(query).sort({ createdAt: -1 }).lean();
  }

  static async getTodayTasks(userId: string) {
    // Return all tasks marked for today or not completed from recent days
    return Task.find({
      userId: new Types.ObjectId(userId),
      $or: [
        { scheduledFor: 'Today' },
        { status: { $in: ['pending', 'adapted'] } },
      ],
    })
      .sort({ status: 1, createdAt: -1 })
      .lean();
  }

  /**
   * Recalculate daily unbroken streak for a goal based on distinct active calendar days.
   * - Multiple tasks on the same date count as 1 active day (does NOT inflate streak).
   * - Uncompleting 1 task does NOT wipe the day if other qualifying tasks remain on that day.
   * - Missing days (> 1 day gap from reference date) reset the active streak.
   */
  static async recalculateGoalStreak(goalId: Types.ObjectId | string, referenceDate?: string): Promise<number> {
    const gId = typeof goalId === 'string' ? new Types.ObjectId(goalId) : goalId;
    const completedTasks = await Task.find({
      goalId: gId,
      status: 'completed',
    })
      .select('completedDate completedAt')
      .lean();

    if (completedTasks.length === 0) {
      await Goal.findByIdAndUpdate(gId, { $set: { streak: 0 } });
      return 0;
    }

    const todayStr = referenceDate || new Date().toISOString().split('T')[0];

    // Gather distinct calendar dates with completed tasks
    const dateSet = new Set<string>();
    for (const t of completedTasks) {
      const d =
        (t as any).completedDate ||
        (t.completedAt instanceof Date
          ? t.completedAt.toISOString().split('T')[0]
          : typeof t.completedAt === 'string' && t.completedAt.includes('T')
          ? t.completedAt.split('T')[0]
          : undefined);
      if (d) {
        dateSet.add(d);
      }
    }

    const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));
    if (sortedDates.length === 0) {
      await Goal.findByIdAndUpdate(gId, { $set: { streak: 0 } });
      return 0;
    }

    const daysBetween = (later: string, earlier: string): number => {
      const d1 = new Date(later + 'T00:00:00Z');
      const d2 = new Date(earlier + 'T00:00:00Z');
      return Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
    };

    const latestCompletedDate = sortedDates[0];
    const daysSinceLastCompletion = daysBetween(todayStr, latestCompletedDate);

    // If last completed date is more than 1 day before referenceDate (i.e. missed yesterday and today), streak is broken (0)
    if (daysSinceLastCompletion > 1) {
      await Goal.findByIdAndUpdate(gId, { $set: { streak: 0 } });
      return 0;
    }

    // Count consecutive unbroken daily streak starting from latestCompletedDate
    let currentStreak = 1;
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const gap = daysBetween(sortedDates[i], sortedDates[i + 1]);
      if (gap === 1) {
        currentStreak++;
      } else if (gap === 0) {
        continue;
      } else {
        break;
      }
    }

    await Goal.findByIdAndUpdate(gId, { $set: { streak: currentStreak } });
    return currentStreak;
  }

  static async completeTask(
    userId: string,
    taskId: string,
    isCompleted: boolean = true,
    clientDate?: string
  ) {
    if (!Types.ObjectId.isValid(taskId)) {
      throw new Error('Invalid task ID format');
    }

    const task = await Task.findOne({
      _id: new Types.ObjectId(taskId),
      userId: new Types.ObjectId(userId),
    });

    if (!task) {
      throw new Error('Task not found or access denied');
    }

    const todayStr = clientDate || new Date().toISOString().split('T')[0];
    task.status = isCompleted ? 'completed' : 'pending';
    task.completedAt = isCompleted ? (task.completedAt || new Date()) : undefined;
    (task as any).completedDate = isCompleted ? ((task as any).completedDate || todayStr) : undefined;
    await task.save();

    // Recalculate true daily calendar streak for this goal
    await this.recalculateGoalStreak(task.goalId, todayStr);

    return task;
  }

  static async updateTask(userId: string, taskId: string, updateData: UpdateTaskDTO) {
    if (!Types.ObjectId.isValid(taskId)) {
      throw new Error('Invalid task ID format');
    }

    const task = await Task.findOneAndUpdate(
      {
        _id: new Types.ObjectId(taskId),
        userId: new Types.ObjectId(userId),
      },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!task) {
      throw new Error('Task not found or access denied');
    }

    return task;
  }
}
