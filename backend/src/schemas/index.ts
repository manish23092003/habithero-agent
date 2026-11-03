import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Password reset token is missing or invalid'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export const createGoalSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(150),
  tagline: z.string().optional(),
  category: z.enum(['learning', 'health', 'career', 'productivity', 'mindfulness']).optional(),
  targetDays: z.number().int().min(1).max(365).optional(),
  dailyCommitmentMinutes: z.number().int().min(5).max(480).optional(),
  idempotencyKey: z.string().optional(),
});

export const updateGoalSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  tagline: z.string().optional(),
  category: z.enum(['learning', 'health', 'career', 'productivity', 'mindfulness']).optional(),
  targetDays: z.number().int().min(1).max(365).optional(),
  currentDay: z.number().int().min(1).optional(),
  dailyCommitmentMinutes: z.number().int().min(5).max(480).optional(),
  streak: z.number().int().min(0).optional(),
  status: z.enum(['active', 'completed', 'paused', 'recovery']).optional(),
  adaptationNotice: z.string().optional(),
});

export const createTaskSchema = z.object({
  goalId: z.string().min(1, 'Goal ID is required'),
  title: z.string().min(2, 'Task title must be at least 2 characters'),
  description: z.string().optional(),
  durationMinutes: z.number().int().min(1).max(480),
  difficulty: z.enum(['easy', 'moderate', 'challenging']).optional(),
  scheduledFor: z.string().optional(),
  dayNumber: z.number().int().min(1).optional(),
  category: z.enum(['learning', 'health', 'career', 'productivity', 'mindfulness']).optional(),
  idempotencyKey: z.string().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  durationMinutes: z.number().int().min(1).max(480).optional(),
  difficulty: z.enum(['easy', 'moderate', 'challenging']).optional(),
  status: z.enum(['pending', 'completed', 'missed', 'adapted']).optional(),
  adaptationNote: z.string().optional(),
  scheduledFor: z.string().optional(),
});

export const createCheckInSchema = z.object({
  goalId: z.string().optional(),
  date: z.string().optional(),
  status: z.enum(['great', 'partial', 'missed']),
  completedTaskCount: z.number().int().min(0),
  totalTaskCount: z.number().int().min(0),
  missedReason: z.enum(['busy', 'difficult', 'tired', 'distracted', 'other']).optional(),
  reflection: z.string().optional(),
  adaptTomorrow: z.boolean().optional(),
});
