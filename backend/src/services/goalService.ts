import { Types } from 'mongoose';
import { Goal } from '../models/Goal.js';
import { Task } from '../models/Task.js';
import { IHabitPhase, GoalCategory, GoalStatus } from '../types/index.js';

export interface CreateGoalDTO {
  title: string;
  tagline?: string;
  category?: GoalCategory;
  targetDays?: number;
  dailyCommitmentMinutes?: number;
  planOutline?: IHabitPhase[];
}

export interface UpdateGoalDTO {
  title?: string;
  tagline?: string;
  category?: GoalCategory;
  targetDays?: number;
  currentDay?: number;
  dailyCommitmentMinutes?: number;
  streak?: number;
  status?: GoalStatus;
  adaptationNotice?: string;
}

export class GoalService {
  static async createGoal(userId: string, dto: CreateGoalDTO) {
    const targetDays = dto.targetDays || 30;
    const dailyMinutes = dto.dailyCommitmentMinutes || 25;

    // Generate phased plan if not supplied
    let planOutline = dto.planOutline;
    if (!planOutline || planOutline.length === 0) {
      planOutline = [
        {
          phaseNumber: 1,
          title: 'Foundational Consistency',
          focus: `Establish frictionless daily habit with ${dailyMinutes}m sessions`,
          dayRange: `Days 1-${Math.max(3, Math.round(targetDays * 0.25))}`,
          tasksPlanned: Math.max(3, Math.round(targetDays * 0.25)),
        },
        {
          phaseNumber: 2,
          title: 'Competency & Sustained Flow',
          focus: 'Deepening mechanics and progressive repetition',
          dayRange: `Days ${Math.max(4, Math.round(targetDays * 0.25) + 1)}-${Math.round(targetDays * 0.55)}`,
          tasksPlanned: Math.max(4, Math.round(targetDays * 0.3)),
        },
        {
          phaseNumber: 3,
          title: 'Synthesis & Real Output',
          focus: 'Autonomous execution and long-term consolidation',
          dayRange: `Days ${Math.round(targetDays * 0.55) + 1}-${targetDays}`,
          tasksPlanned: Math.round(targetDays * 0.45),
        },
      ];
    }

    const goal = await Goal.create({
      userId: new Types.ObjectId(userId),
      title: dto.title,
      tagline: dto.tagline || `Achieve ${dto.title} through daily ${dailyMinutes}-minute actions.`,
      category: dto.category || 'learning',
      targetDays,
      currentDay: 1,
      dailyCommitmentMinutes: dailyMinutes,
      streak: 0,
      status: 'active',
      planOutline,
    });

    // Auto-create Day 1 task for the new goal
    const initialTask = await Task.create({
      userId: new Types.ObjectId(userId),
      goalId: goal._id,
      goalTitle: goal.title,
      title: `Kickoff: Day 1 of ${goal.title}`,
      description: `Complete your initial ${dailyMinutes}-minute focused session. Set up workspace and record day 1 key notes.`,
      durationMinutes: dailyMinutes,
      difficulty: 'easy',
      status: 'pending',
      dayNumber: 1,
      scheduledFor: 'Today',
      category: goal.category,
    });

    return {
      goal,
      initialTask,
    };
  }

  static async getGoals(userId: string) {
    return Goal.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 });
  }

  static async getGoalById(userId: string, goalId: string) {
    if (!Types.ObjectId.isValid(goalId)) {
      throw new Error('Invalid goal ID format');
    }
    const goal = await Goal.findOne({
      _id: new Types.ObjectId(goalId),
      userId: new Types.ObjectId(userId),
    });
    if (!goal) {
      throw new Error('Goal not found or access denied');
    }
    return goal;
  }

  static async updateGoal(userId: string, goalId: string, updateData: UpdateGoalDTO) {
    if (!Types.ObjectId.isValid(goalId)) {
      throw new Error('Invalid goal ID format');
    }
    const goal = await Goal.findOneAndUpdate(
      {
        _id: new Types.ObjectId(goalId),
        userId: new Types.ObjectId(userId),
      },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!goal) {
      throw new Error('Goal not found or access denied');
    }
    return goal;
  }

  static async deleteGoal(userId: string, goalId: string) {
    if (!Types.ObjectId.isValid(goalId)) {
      throw new Error('Invalid goal ID format');
    }
    const goal = await Goal.findOneAndDelete({
      _id: new Types.ObjectId(goalId),
      userId: new Types.ObjectId(userId),
    });
    if (!goal) {
      throw new Error('Goal not found or access denied');
    }

    // Cascade delete associated tasks
    await Task.deleteMany({
      goalId: new Types.ObjectId(goalId),
      userId: new Types.ObjectId(userId),
    });

    return { success: true, message: 'Goal and linked tasks successfully deleted' };
  }
}

