import { Response } from 'express';
import { TaskService } from '../services/taskService.js';
import { AuthenticatedRequest } from '../types/index.js';

export class TaskController {
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const idempotencyKey = (req.body?.idempotencyKey || req.headers['idempotency-key'] || req.headers['x-idempotency-key']) as string | undefined;
      const task = await TaskService.createTask(req.user.id, { ...req.body, idempotencyKey });
      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        data: task,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create task',
      });
    }
  }

  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const tasks = await TaskService.getTasks(req.user.id, {
        goalId: req.query.goalId as string,
        status: req.query.status as string,
      });
      res.status(200).json({
        success: true,
        data: tasks,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch tasks',
      });
    }
  }

  static async getToday(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const tasks = await TaskService.getTodayTasks(req.user.id);
      res.status(200).json({
        success: true,
        data: tasks,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch today\'s tasks',
      });
    }
  }

  static async complete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const taskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const isCompleted = req.body.completed !== undefined ? req.body.completed : true;
      const clientDate = (req.body?.clientDate || req.headers['x-client-date']) as string | undefined;
      const task = await TaskService.completeTask(req.user.id, taskId, isCompleted, clientDate);
      res.status(200).json({
        success: true,
        message: `Task marked as ${task.status}`,
        data: task,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to complete task',
      });
    }
  }

  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const taskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const task = await TaskService.updateTask(req.user.id, taskId, req.body);
      res.status(200).json({
        success: true,
        message: 'Task updated successfully',
        data: task,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update task',
      });
    }
  }
}
