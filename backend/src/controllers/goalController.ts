import { Response } from 'express';
import { GoalService } from '../services/goalService.js';
import { AuthenticatedRequest } from '../types/index.js';

export class GoalController {
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const idempotencyKey = (req.body?.idempotencyKey || req.headers['idempotency-key'] || req.headers['x-idempotency-key']) as string | undefined;
      const result = await GoalService.createGoal(req.user.id, { ...req.body, idempotencyKey });
      res.status(201).json({
        success: true,
        message: 'Goal plan created successfully',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create goal',
      });
    }
  }

  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const goals = await GoalService.getGoals(req.user.id);
      res.status(200).json({
        success: true,
        data: goals,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch goals',
      });
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const goalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const goal = await GoalService.getGoalById(req.user.id, goalId);
      res.status(200).json({
        success: true,
        data: goal,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        error: error.message || 'Goal not found',
      });
    }
  }

  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const goalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const goal = await GoalService.updateGoal(req.user.id, goalId, req.body);
      res.status(200).json({
        success: true,
        message: 'Goal updated successfully',
        data: goal,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update goal',
      });
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const goalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await GoalService.deleteGoal(req.user.id, goalId);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      const isNotFound = error.message.includes('not found') || error.message.includes('access denied');
      res.status(isNotFound ? 404 : 400).json({
        success: false,
        error: error.message || 'Failed to delete goal',
      });
    }
  }
}
