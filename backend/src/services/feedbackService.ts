import { Types } from 'mongoose';
import { Feedback, FeedbackDocument } from '../models/Feedback.js';
import {
  FeedbackCategory,
  FeedbackStatus,
  FeedbackModerationStatus,
} from '../types/index.js';

export interface CreateFeedbackDTO {
  title: string;
  description: string;
  category: FeedbackCategory;
  displayName?: string;
  email?: string;
}

export interface PublicFeedbackQuery {
  page?: number | string;
  limit?: number | string;
  category?: string;
  status?: string;
}

export interface AdminFeedbackQuery {
  page?: number | string;
  limit?: number | string;
  moderationStatus?: string;
  status?: string;
  category?: string;
}

export interface PublicFeedbackItem {
  _id: Types.ObjectId;
  title: string;
  description: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  displayName: string;
  officialReplies: Array<{
    _id: Types.ObjectId;
    authorName: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class FeedbackService {
  /**
   * Retrieves public approved feedback with explicit projection shielding.
   * Only documents with moderationStatus === 'approved' are returned.
   * Submitter email and officialReplies.authorId are strictly excluded.
   */
  static async getPublicFeedback(query: PublicFeedbackQuery): Promise<PaginationResult<PublicFeedbackItem>> {
    const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(query.limit || '20'), 10) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      moderationStatus: 'approved',
    };

    if (query.category && ['feature_request', 'bug_report', 'general', 'improvement'].includes(query.category)) {
      filter.category = query.category;
    }

    if (query.status && ['under_review', 'planned', 'in_progress', 'completed', 'declined'].includes(query.status)) {
      filter.status = query.status;
    }

    const [docs, total] = await Promise.all([
      Feedback.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('_id title description category status displayName officialReplies createdAt updatedAt')
        .lean(),
      Feedback.countDocuments(filter),
    ]);

    // Explicit DTO mapping guarantees that internal attributes (authorId, submitter email) can never leak
    const items: PublicFeedbackItem[] = docs.map(doc => ({
      _id: doc._id,
      title: doc.title,
      description: doc.description,
      category: doc.category as FeedbackCategory,
      status: doc.status as FeedbackStatus,
      displayName: doc.displayName || 'HabitHero Community Member',
      officialReplies: (doc.officialReplies || []).map((reply: any) => ({
        _id: reply._id,
        authorName: reply.authorName || 'HabitHero Team',
        content: reply.content,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
      })),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Anonymous feedback submission.
   * Forces moderationStatus = 'pending' and status = 'under_review' on the server.
   * Strips client-supplied administrative fields.
   */
  static async createFeedback(dto: CreateFeedbackDTO): Promise<Partial<PublicFeedbackItem>> {
    const sanitizedTitle = dto.title.trim();
    const sanitizedDescription = dto.description.trim();
    const sanitizedDisplayName = dto.displayName?.trim() || undefined;
    const sanitizedEmail = dto.email?.trim().toLowerCase() || undefined;

    const created = await Feedback.create({
      title: sanitizedTitle,
      description: sanitizedDescription,
      category: dto.category,
      status: 'under_review',
      moderationStatus: 'pending',
      displayName: sanitizedDisplayName,
      email: sanitizedEmail,
      officialReplies: [],
    });

    // Return safe presentation payload omitting email
    return {
      _id: created._id,
      title: created.title,
      description: created.description,
      category: created.category as FeedbackCategory,
      status: created.status as FeedbackStatus,
      displayName: created.displayName,
      createdAt: created.createdAt,
    };
  }

  /**
   * Admin view: lists feedback across moderation statuses with submitter email projected.
   */
  static async getAdminFeedback(query: AdminFeedbackQuery): Promise<PaginationResult<FeedbackDocument>> {
    const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(query.limit || '20'), 10) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.moderationStatus && ['pending', 'approved', 'rejected', 'spam'].includes(query.moderationStatus)) {
      filter.moderationStatus = query.moderationStatus;
    }

    if (query.status && ['under_review', 'planned', 'in_progress', 'completed', 'declined'].includes(query.status)) {
      filter.status = query.status;
    }

    if (query.category && ['feature_request', 'bug_report', 'general', 'improvement'].includes(query.category)) {
      filter.category = query.category;
    }

    const [items, total] = await Promise.all([
      Feedback.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('+email')
        .lean(),
      Feedback.countDocuments(filter),
    ]);

    return {
      items: items as unknown as FeedbackDocument[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Admin updates moderation status (e.g. approved, rejected, spam).
   */
  static async updateModerationStatus(
    id: string,
    moderationStatus: FeedbackModerationStatus
  ): Promise<FeedbackDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('INVALID_ID');
    }

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return null;
    }

    feedback.moderationStatus = moderationStatus;
    await feedback.save();
    return feedback;
  }

  /**
   * Admin updates public status (e.g. planned, in_progress, completed, declined).
   * Feedback must be approved (moderationStatus === 'approved') before public progress status can be modified.
   */
  static async updateStatus(
    id: string,
    status: FeedbackStatus
  ): Promise<FeedbackDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('INVALID_ID');
    }

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return null;
    }

    if (feedback.moderationStatus !== 'approved') {
      const err = new Error(
        `Cannot update status: feedback submission has not been approved (current moderation status: '${feedback.moderationStatus}').`
      );
      (err as any).statusCode = 400;
      (err as any).code = 'FEEDBACK_NOT_APPROVED';
      throw err;
    }

    feedback.status = status;
    await feedback.save();
    return feedback;
  }

  /**
   * Admin creates official reply.
   * Author identity is derived from authenticated admin user, but display name is fixed to HabitHero Team.
   */
  static async addOfficialReply(
    id: string,
    adminUserId: string,
    content: string
  ): Promise<FeedbackDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('INVALID_ID');
    }

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return null;
    }

    feedback.officialReplies.push({
      authorName: 'HabitHero Team',
      authorId: new Types.ObjectId(adminUserId),
      content: content.trim(),
    } as any);

    await feedback.save();
    return feedback;
  }
}
