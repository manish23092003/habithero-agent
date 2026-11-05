import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { FeedbackService } from '../services/feedbackService.js';
import { AuthenticatedRequest } from '../types/index.js';

export class FeedbackController {
  /**
   * GET /api/feedback
   * Public browsing endpoint. Returns only approved feedback with pagination and filters.
   */
  static async getPublic(req: Request, res: Response): Promise<void> {
    try {
      const result = await FeedbackService.getPublicFeedback(req.query);
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error: any) {
      console.error('[FeedbackController.getPublic] Error:', error);
      res.status(500).json({
        success: false,
        error: 'An internal error occurred while retrieving feedback.',
      });
    }
  }

  /**
   * POST /api/feedback
   * Anonymous feedback submission endpoint. Subject to rate limiting and strict Zod validation.
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const result = await FeedbackService.createFeedback(req.body);
      res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully. It will be publicly visible once approved by a moderator.',
        data: result,
      });
    } catch (error: any) {
      console.error('[FeedbackController.create] Error:', error);
      res.status(500).json({
        success: false,
        error: 'An internal error occurred while submitting feedback.',
      });
    }
  }

  /**
   * GET /api/feedback/admin
   * Administrator portal endpoint for reviewing submissions across moderation states.
   */
  static async getAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await FeedbackService.getAdminFeedback(req.query);
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error: any) {
      console.error('[FeedbackController.getAdmin] Error:', error);
      res.status(500).json({
        success: false,
        error: 'An internal error occurred while retrieving moderation feedback.',
      });
    }
  }

  /**
   * PATCH /api/feedback/admin/:id/moderation
   * Updates moderation state (e.g. pending, approved, rejected, spam).
   */
  static async updateModeration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid feedback ID format.',
        });
        return;
      }

      const updated = await FeedbackService.updateModerationStatus(id, req.body.moderationStatus);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: 'Feedback submission not found.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Feedback moderation status updated successfully.',
        data: updated,
      });
    } catch (error: any) {
      console.error('[FeedbackController.updateModeration] Error:', error);
      res.status(500).json({
        success: false,
        error: 'An internal error occurred while updating moderation status.',
      });
    }
  }

  /**
   * PATCH /api/feedback/admin/:id/status
   * Updates public progress status (e.g. planned, in_progress, completed, declined).
   */
  static async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid feedback ID format.',
        });
        return;
      }

      const updated = await FeedbackService.updateStatus(id, req.body.status);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: 'Feedback submission not found.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Feedback progress status updated successfully.',
        data: updated,
      });
    } catch (error: any) {
      if (error.statusCode === 400 || error.code === 'FEEDBACK_NOT_APPROVED') {
        res.status(400).json({
          success: false,
          code: 'FEEDBACK_NOT_APPROVED',
          error: error.message,
        });
        return;
      }
      console.error('[FeedbackController.updateStatus] Error:', error);
      res.status(500).json({
        success: false,
        error: 'An internal error occurred while updating feedback status.',
      });
    }
  }

  /**
   * POST /api/feedback/admin/:id/replies
   * Adds official reply as 'HabitHero Team' using authenticated admin user identity.
   */
  static async addReply(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid feedback ID format.',
        });
        return;
      }

      const adminUserId = req.user?.id;
      if (!adminUserId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required.',
        });
        return;
      }

      const updated = await FeedbackService.addOfficialReply(id, adminUserId, req.body.content);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: 'Feedback submission not found.',
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: 'Official reply added successfully.',
        data: updated,
      });
    } catch (error: any) {
      console.error('[FeedbackController.addReply] Error:', error);
      res.status(500).json({
        success: false,
        error: 'An internal error occurred while adding official reply.',
      });
    }
  }
}
