import { Request } from 'express';
import { Types } from 'mongoose';

export type GoalCategory = 'learning' | 'health' | 'career' | 'productivity' | 'mindfulness';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'recovery';
export type TaskStatus = 'pending' | 'completed' | 'missed' | 'adapted';
export type TaskDifficulty = 'easy' | 'moderate' | 'challenging';
export type CheckInStatus = 'great' | 'partial' | 'missed';
export type FrictionReason = 'busy' | 'difficult' | 'tired' | 'distracted' | 'other';

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IHabitPhase {
  phaseNumber: number;
  title: string;
  focus: string;
  dayRange: string;
  tasksPlanned: number;
}

export interface IGoal {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  tagline: string;
  category: GoalCategory;
  targetDays: number;
  currentDay: number;
  dailyCommitmentMinutes: number;
  streak: number;
  status: GoalStatus;
  planOutline: IHabitPhase[];
  adaptationNotice?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITask {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  goalId: Types.ObjectId;
  goalTitle: string;
  title: string;
  description: string;
  durationMinutes: number;
  difficulty: TaskDifficulty;
  status: TaskStatus;
  completedAt?: Date | string;
  dayNumber: number;
  scheduledFor: string;
  adaptationNote?: string;
  category: GoalCategory;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICheckIn {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  goalId?: Types.ObjectId;
  date: string;
  status: CheckInStatus;
  completedTaskCount: number;
  totalTaskCount: number;
  missedReason?: FrictionReason;
  reflection?: string;
  agentAdaptation?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

