import { Types } from 'mongoose';
import { Goal } from '../models/Goal.js';
import { Task } from '../models/Task.js';
import { CheckIn } from '../models/CheckIn.js';

export interface WeeklyRhythmDay {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  short: string;
  date: string;
  completedCount: number;
  scheduledCount: number;
  percentage: number;
}

export interface UserAnalyticsResponse {
  taskCompletionRate: number;
  totalTasks: number;
  completedTasks: number;
  currentStreak: number;
  longestStreak: number;
  bounceBackRate: number | null;
  weeklyRhythm: WeeklyRhythmDay[];
  weeklyCompletedTotal: number;
  categoryCounts: Record<string, number>;
  activeGoalsCount: number;
  totalPlannedDailyMinutes: number;
  habitBreakdown: Array<{
    id: string;
    title: string;
    category: string;
    currentDay: number;
    targetDays: number;
    dailyCommitmentMinutes: number;
    streak: number;
    status: string;
  }>;
}

export class AnalyticsService {
  /**
   * Calculate comprehensive user analytics purely and securely from the authenticated
   * user's database records. Never leaks or aggregates cross-tenant data.
   */
  static async getUserAnalytics(userId: string, clientDate?: string): Promise<UserAnalyticsResponse> {
    const userObjectId = new Types.ObjectId(userId);

    // Fetch user's actual database records with strict tenant isolation
    const [goals, tasks, checkIns] = await Promise.all([
      Goal.find({ userId: userObjectId }).sort({ createdAt: -1 }).lean(),
      Task.find({ userId: userObjectId }).sort({ createdAt: -1 }).lean(),
      CheckIn.find({ userId: userObjectId }).sort({ date: 1 }).lean(),
    ]);

    // 1. Task Completion Rate
    const totalTasks = tasks.length;
    const completedTasksList = tasks.filter(t => t.status === 'completed');
    const completedTasks = completedTasksList.length;
    // When a user has 0 tasks, completion rate is 0%, NEVER 100%
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 2. Streaks
    const currentStreak = goals.reduce((max, g) => Math.max(max, g.streak || 0), 0);

    // Calculate true consecutive calendar day streaks across all activity
    const activeDates = new Set<string>();
    completedTasksList.forEach(t => {
      const d = t.completedDate || (t.completedAt ? new Date(t.completedAt).toISOString().split('T')[0] : null);
      if (d) activeDates.add(d);
    });
    checkIns.forEach(c => {
      if (c.date && (c.status === 'great' || c.completedTaskCount > 0)) {
        activeDates.add(c.date);
      }
    });

    const sortedActiveDates = Array.from(activeDates).sort();
    let maxConsecutiveDays = 0;
    let currentRun = 0;
    for (let i = 0; i < sortedActiveDates.length; i++) {
      if (i === 0) {
        currentRun = 1;
      } else {
        const d1 = new Date(sortedActiveDates[i] + 'T00:00:00Z');
        const d0 = new Date(sortedActiveDates[i - 1] + 'T00:00:00Z');
        const diff = Math.round((d1.getTime() - d0.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          currentRun++;
        } else if (diff === 0) {
          continue;
        } else {
          currentRun = 1;
        }
      }
      if (currentRun > maxConsecutiveDays) {
        maxConsecutiveDays = currentRun;
      }
    }

    const longestStreak = Math.max(currentStreak, maxConsecutiveDays);

    // 3. Bounce-Back Rate (Recovery Resilience Score)
    // Percentage of times user successfully bounced back to a great day after a missed or partial check-in
    let bounceBackRate: number | null = null;
    const sortedCheckIns = [...checkIns].sort((a, b) => a.date.localeCompare(b.date));
    const setbackIndices: number[] = [];

    sortedCheckIns.forEach((c, idx) => {
      if (c.status === 'missed' || c.status === 'partial') {
        setbackIndices.push(idx);
      }
    });

    const evaluableSetbacks = setbackIndices.filter(idx => idx < sortedCheckIns.length - 1);
    if (evaluableSetbacks.length > 0) {
      const recoveredCount = evaluableSetbacks.filter(idx => {
        const nextCheckIn = sortedCheckIns[idx + 1];
        if (nextCheckIn && nextCheckIn.status === 'great') return true;
        // Or if user completed tasks on that next checkin date
        if (nextCheckIn && nextCheckIn.completedTaskCount > 0) return true;
        return false;
      }).length;
      bounceBackRate = Math.round((recoveredCount / evaluableSetbacks.length) * 100);
    }

    // 4. Weekly Rhythm (Mon-Sun of the current week)
    const referenceDateStr = clientDate || new Date().toISOString().split('T')[0];
    const [refY, refM, refD] = referenceDateStr.split('-').map(Number);
    const refDate = new Date(Date.UTC(refY, refM - 1, refD, 12, 0, 0));
    const dayOfWeek = refDate.getUTCDay(); // 0 is Sun, 1 is Mon...
    const distToMonday = (dayOfWeek + 6) % 7;
    const mondayUtcTime = refDate.getTime() - distToMonday * 86400000;

    const dayLabels: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'> = [
      'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
    ];
    const dayShorts = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    let weeklyCompletedTotal = 0;
    const weeklyRhythm: WeeklyRhythmDay[] = dayLabels.map((dayLabel, idx) => {
      const dayDate = new Date(mondayUtcTime + idx * 86400000);
      const dateStr = dayDate.toISOString().split('T')[0];

      // Completed tasks on this specific calendar date
      const tasksCompletedOnDay = tasks.filter(t => {
        if (t.status !== 'completed') return false;
        const cDate = t.completedDate || (t.completedAt ? new Date(t.completedAt).toISOString().split('T')[0] : null);
        return cDate === dateStr;
      });

      // Scheduled tasks for this date
      const tasksScheduledOnDay = tasks.filter(t => {
        return t.scheduledFor === dateStr || (t.scheduledFor === 'Today' && dateStr === referenceDateStr);
      });

      const checkInOnDay = checkIns.find(c => c.date === dateStr);

      const completedCount = tasksCompletedOnDay.length;
      const scheduledCount = Math.max(tasksScheduledOnDay.length, completedCount);

      let percentage = 0;
      if (scheduledCount > 0 && completedCount > 0) {
        percentage = Math.min(100, Math.round((completedCount / scheduledCount) * 100));
      } else if (completedCount > 0) {
        percentage = 100;
      } else if (checkInOnDay) {
        if (checkInOnDay.status === 'great') percentage = 100;
        else if (checkInOnDay.status === 'partial') percentage = 50;
        else percentage = 0;
      } else {
        percentage = 0;
      }

      weeklyCompletedTotal += completedCount;

      return {
        day: dayLabel,
        short: dayShorts[idx],
        date: dateStr,
        completedCount,
        scheduledCount,
        percentage,
      };
    });

    // 5. Category Breakdown
    const categoryCounts: Record<string, number> = {};
    goals.forEach(g => {
      if (g.category) {
        categoryCounts[g.category] = (categoryCounts[g.category] || 0) + 1;
      }
    });

    // 6. Habit Breakdown List
    const habitBreakdown = goals.map(g => ({
      id: (g._id as any).toString(),
      title: g.title,
      category: g.category || 'learning',
      currentDay: g.currentDay || 1,
      targetDays: g.targetDays || 30,
      dailyCommitmentMinutes: g.dailyCommitmentMinutes || 20,
      streak: g.streak || 0,
      status: g.status || 'active',
    }));

    const totalPlannedDailyMinutes = goals.reduce((acc, g) => acc + (g.dailyCommitmentMinutes || 0), 0);

    return {
      taskCompletionRate,
      totalTasks,
      completedTasks,
      currentStreak,
      longestStreak,
      bounceBackRate,
      weeklyRhythm,
      weeklyCompletedTotal,
      categoryCounts,
      activeGoalsCount: goals.length,
      totalPlannedDailyMinutes,
      habitBreakdown,
    };
  }
}

