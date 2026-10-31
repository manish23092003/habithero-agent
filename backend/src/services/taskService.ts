import { Types } from 'mongoose';
import { Task } from '../models/Task.js';
import { Goal } from '../models/Goal.js';
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
  }

  static async getTasks(userId: string, filter?: { goalId?: string; status?: string }) {
    const query: any = { userId: new Types.ObjectId(userId) };
    if (filter?.goalId && Types.ObjectId.isValid(filter.goalId)) {
      query.goalId = new Types.ObjectId(filter.goalId);
    }
    if (filter?.status) {
      query.status = filter.status;
    }
    return Task.find(query).sort({ createdAt: -1 });
  }

  static async getTodayTasks(userId: string) {
    // Return all tasks marked for today or not completed from recent days
    return Task.find({
      userId: new Types.ObjectId(userId),
      $or: [
        { scheduledFor: 'Today' },
        { status: { $in: ['pending', 'adapted'] } },
      ],
    }).sort({ status: 1, createdAt: -1 });
  }

  static async completeTask(userId: string, taskId: string, isCompleted: boolean = true) {
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

    task.status = isCompleted ? 'completed' : 'pending';
    task.completedAt = isCompleted ? new Date() : undefined;
    await task.save();

    // Increment goal streak if task was completed
    if (isCompleted) {
      await Goal.findByIdAndUpdate(task.goalId, {
        $inc: { streak: 1 },
      });
    }

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

