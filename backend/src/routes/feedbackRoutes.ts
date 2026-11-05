import { Router } from 'express';
import { FeedbackController } from '../controllers/feedbackController.js';
import { FeedbackRateLimiter } from '../middleware/feedbackRateLimiter.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { validateRequest } from '../middleware/validate.js';
import {
  createFeedbackSchema,
  updateFeedbackModerationSchema,
  updateFeedbackStatusSchema,
  createOfficialReplySchema,
} from '../schemas/feedbackSchemas.js';

const router = Router();

// =========================================================================
// Public Feedback Routes
// =========================================================================

/**
 * GET /api/feedback
 * Returns approved feedback items with pagination and category/status filters.
 */
router.get('/', FeedbackController.getPublic);

/**
 * POST /api/feedback
 * Allows anonymous submission of feedback. Protected by rate limiting and strict Zod validation.
 */
router.post(
  '/',
  FeedbackRateLimiter.limit,
  validateRequest(createFeedbackSchema),
  FeedbackController.create
);

// =========================================================================
// Administrator Moderation & Status Routes
// Requires Google-authenticated administrator account on ADMIN_EMAILS allowlist
// =========================================================================

/**
 * GET /api/feedback/admin
 * Lists submissions across moderation statuses.
 */
router.get(
  '/admin',
  authenticateToken,
  requireAdmin,
  FeedbackController.getAdmin
);

/**
 * PATCH /api/feedback/admin/:id/moderation
 * Updates moderation status (e.g. approved, rejected, spam).
 */
router.patch(
  '/admin/:id/moderation',
  authenticateToken,
  requireAdmin,
  validateRequest(updateFeedbackModerationSchema),
  FeedbackController.updateModeration
);

/**
 * PATCH /api/feedback/admin/:id/status
 * Updates public progress status (e.g. under_review, planned, in_progress, completed, declined).
 */
router.patch(
  '/admin/:id/status',
  authenticateToken,
  requireAdmin,
  validateRequest(updateFeedbackStatusSchema),
  FeedbackController.updateStatus
);

/**
 * POST /api/feedback/admin/:id/replies
 * Adds official team reply under the verified administrator session.
 */
router.post(
  '/admin/:id/replies',
  authenticateToken,
  requireAdmin,
  validateRequest(createOfficialReplySchema),
  FeedbackController.addReply
);

export default router;

