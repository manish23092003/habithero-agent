import { Types } from 'mongoose';
import { CheckIn } from '../models/CheckIn.js';
import { Task } from '../models/Task.js';
import { CheckInStatus, FrictionReason } from '../types/index.js';

export interface CreateCheckInDTO {
  goalId?: string;
  date?: string;
  status: CheckInStatus;
  completedTaskCount: number;
  totalTaskCount: number;
  missedReason?: FrictionReason;
  reflection?: string;
  adaptTomorrow?: boolean;
}

export class CheckInService {
  static async createCheckIn(userId: string, dto: CreateCheckInDTO) {
    const today = dto.date || new Date().toISOString().split('T')[0];

    let agentAdaptation = '';
    if (dto.status !== 'great' && dto.adaptTomorrow) {
      agentAdaptation = `Shortened tomorrow's actions to 15m micro-sprints to recover momentum after experiencing: ${dto.missedReason || 'hectic schedule'}.`;

      // Adapt any pending tasks
      await Task.updateMany(
        {
          userId: new Types.ObjectId(userId),
          status: 'pending',
        },
        {
          $set: {
            durationMinutes: 15,
            status: 'adapted',
            adaptationNote: `⚡ Adapted via check-in reflection: ${dto.missedReason || 'burnout prevention'}`,
          },
        }
      );
    }

    const checkIn = await CheckIn.create({
      userId: new Types.ObjectId(userId),
      goalId: dto.goalId && Types.ObjectId.isValid(dto.goalId) ? new Types.ObjectId(dto.goalId) : undefined,
      date: today,
      status: dto.status,
      completedTaskCount: dto.completedTaskCount,
      totalTaskCount: dto.totalTaskCount,
      missedReason: dto.missedReason,
      reflection: dto.reflection || '',
      agentAdaptation,
    });

    return checkIn;
  }

  static async getCheckIns(userId: string) {
    return CheckIn.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 });
  }

  static async getTodayCheckIn(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    return CheckIn.findOne({
      userId: new Types.ObjectId(userId),
      date: today,
    });
  }
}

