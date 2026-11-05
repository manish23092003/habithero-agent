import { z } from 'zod';

export const feedbackCategoryEnum = z.enum([
  'feature_request',
  'bug_report',
  'general',
  'improvement',
]);

export const feedbackStatusEnum = z.enum([
  'under_review',
  'planned',
  'in_progress',
  'completed',
  'declined',
]);

export const feedbackModerationStatusEnum = z.enum([
  'pending',
  'approved',
  'rejected',
  'spam',
]);

/**
 * Public feedback submission schema.
 * Rejects unexpected/client-injected fields (e.g. status, moderationStatus, officialReplies, isAdmin).
 */
export const createFeedbackSchema = z
  .object({
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(3, 'Title must be at least 3 characters long')
      .max(150, 'Title cannot exceed 150 characters'),
    description: z
      .string({ required_error: 'Description is required' })
      .trim()
      .min(10, 'Description must be at least 10 characters long')
      .max(2000, 'Description cannot exceed 2000 characters'),
    category: feedbackCategoryEnum,
    displayName: z
      .string()
      .trim()
      .min(1, 'Display name cannot be empty if provided')
      .max(50, 'Display name cannot exceed 50 characters')
      .optional(),
    email: z
      .string()
      .trim()
      .email('Please provide a valid email address')
      .max(254, 'Email address is too long')
      .optional(),
  })
  .strict();

/**
 * Admin status update schema (e.g. Planned, In Progress, Completed).
 */
export const updateFeedbackStatusSchema = z
  .object({
    status: feedbackStatusEnum,
  })
  .strict();

/**
 * Admin moderation state update schema (e.g. Approved, Rejected, Spam).
 */
export const updateFeedbackModerationSchema = z
  .object({
    moderationStatus: feedbackModerationStatusEnum,
  })
  .strict();

/**
 * Admin official reply schema.
 * Author identity is locked to 'HabitHero Team' on the backend and cannot be spoofed by the client.
 */
export const createOfficialReplySchema = z
  .object({
    content: z
      .string({ required_error: 'Reply content is required' })
      .trim()
      .min(2, 'Reply content must be at least 2 characters long')
      .max(2000, 'Reply content cannot exceed 2000 characters'),
  })
  .strict();

