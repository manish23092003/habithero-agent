import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Strict user authentication required for all analytics routes
router.use(authenticateToken);

router.get('/', AnalyticsController.getAnalytics);

export default router;

