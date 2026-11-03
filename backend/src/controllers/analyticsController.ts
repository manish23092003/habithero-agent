import { Response } from 'express';
import { AnalyticsService } from '../services/analyticsService.js';
import { AuthenticatedRequest } from '../types/index.js';

export class AnalyticsController {
  static async getAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const clientDate = (req.query.date || req.headers['x-client-date']) as string | undefined;
      const analytics = await AnalyticsService.getUserAnalytics(req.user.id, clientDate);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to calculate user analytics',
      });
    }
  }
}

