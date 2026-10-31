import { Response } from 'express';
import { CheckInService } from '../services/checkInService.js';
import { AuthenticatedRequest } from '../types/index.js';

export class CheckInController {
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const checkIn = await CheckInService.createCheckIn(req.user.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Daily check-in recorded successfully',
        data: checkIn,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to record check-in',
      });
    }
  }

  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const checkIns = await CheckInService.getCheckIns(req.user.id);
      res.status(200).json({
        success: true,
        data: checkIns,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch check-ins',
      });
    }
  }

  static async getToday(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const checkIn = await CheckInService.getTodayCheckIn(req.user.id);
      res.status(200).json({
        success: true,
        data: checkIn || null,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch today\'s check-in',
      });
    }
  }
}

