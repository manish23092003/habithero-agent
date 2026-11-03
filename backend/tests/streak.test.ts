import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { Types } from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Goal } from '../src/models/Goal.js';
import { Task } from '../src/models/Task.js';
import { CheckIn } from '../src/models/CheckIn.js';
import { TaskService } from '../src/services/taskService.js';
import { AnalyticsService } from '../src/services/analyticsService.js';

let server: http.Server;
let baseUrl: string;

describe('HabitHero Streak Calculation & Zero-Default Verification Tests', () => {
  before(async () => {
    await connectDB();
    server = app.listen(0);
    const addr = server.address() as any;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    await User.deleteMany({ email: { $in: [/streak_test_.*@example\.com/] } });
    if (server) {
      server.close();
    }
    await disconnectDB();
  });

  const makeRequest = async (path: string, options: any = {}) => {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  };

  // Helper to format Date to YYYY-MM-DD
  const formatYMD = (d: Date): string => d.toISOString().split('T')[0];

  it('1. Brand-new user: always has streak of 0, 0% completion, null bounce-back, and 0% weekly rhythm', async () => {
    const email = `streak_test_new_${Date.now()}@example.com`;
    const regRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'New Hero',
        email,
        password: 'password123',
      }),
    });
    assert.strictEqual(regRes.status, 201);
    const token = regRes.body.data.token;

    // Check goals endpoint
    const goalsRes = await makeRequest('/api/goals', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(goalsRes.status, 200);
    assert.strictEqual(goalsRes.body.data.length, 0);

    // Check analytics endpoint
    const today = formatYMD(new Date());
    const analyticsRes = await makeRequest(`/api/analytics?date=${today}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(analyticsRes.status, 200);
    const data = analyticsRes.body.data;

    assert.strictEqual(data.currentStreak, 0, 'New user currentStreak must be 0');
    assert.strictEqual(data.longestStreak, 0, 'New user longestStreak must be 0');
    assert.strictEqual(data.taskCompletionRate, 0, 'New user completion rate must be 0%');
    assert.strictEqual(data.totalTasks, 0, 'New user total tasks must be 0');
    assert.strictEqual(data.completedTasks, 0, 'New user completed tasks must be 0');
    assert.strictEqual(data.activeGoalsCount, 0, 'New user active goals count must be 0');
    assert.strictEqual(data.bounceBackRate, null, 'Bounce-back rate must be null');
    assert.strictEqual(data.weeklyCompletedTotal, 0, 'Weekly completed total must be 0');

    // All days in weekly rhythm must be 0%
    assert.strictEqual(data.weeklyRhythm.length, 7);
    data.weeklyRhythm.forEach((day: any) => {
      assert.strictEqual(day.percentage, 0, `${day.day} rhythm must be 0%`);
      assert.strictEqual(day.completedCount, 0, `${day.day} completedCount must be 0`);
    });
  });

  it('2. User with habits created but no completed tasks: streak remains strictly 0', async () => {
    const email = `streak_test_nohabit_${Date.now()}@example.com`;
    const regRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Pending Hero',
        email,
        password: 'password123',
      }),
    });
    assert.strictEqual(regRes.status, 201);
    const token = regRes.body.data.token;

    // Create a new goal
    const goalRes = await makeRequest('/api/goals', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: 'Morning Yoga',
        category: 'health',
        targetDays: 21,
        dailyCommitmentMinutes: 15,
      }),
    });
    assert.strictEqual(goalRes.status, 201);
    const goal = goalRes.body.data.goal;

    // Goal itself must be initialized with streak = 0
    assert.strictEqual(goal.streak, 0, 'New goal streak must initialize to 0 in MongoDB');

    // Goals listing must return streak = 0
    const listRes = await makeRequest('/api/goals', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(listRes.status, 200);
    assert.strictEqual(listRes.body.data[0].streak, 0);

    // Analytics must report streak = 0
    const today = formatYMD(new Date());
    const analyticsRes = await makeRequest(`/api/analytics?date=${today}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = analyticsRes.body.data;
    assert.strictEqual(data.currentStreak, 0, 'Streak with 0 completed tasks must be 0');
    assert.strictEqual(data.longestStreak, 0, 'Longest streak with 0 completed tasks must be 0');
    assert.strictEqual(data.completedTasks, 0);
    assert.strictEqual(data.activeGoalsCount, 1);
  });

  it('3. User completes a task for the first time: streak increments to 1', async () => {
    const email = `streak_test_first_${Date.now()}@example.com`;
    const regRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'First Task Hero',
        email,
        password: 'password123',
      }),
    });
    const token = regRes.body.data.token;

    // Create goal
    const goalRes = await makeRequest('/api/goals', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: 'Daily Meditation',
        targetDays: 14,
        dailyCommitmentMinutes: 10,
      }),
    });
    const goalId = goalRes.body.data.goal._id || goalRes.body.data.goal.id;

    // Retrieve today tasks
    const tasksRes = await makeRequest('/api/tasks/today', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(tasksRes.status, 200);
    assert.ok(tasksRes.body.data.length >= 1);
    const taskId = tasksRes.body.data[0]._id || tasksRes.body.data[0].id;

    // Complete the task
    const today = formatYMD(new Date());
    const compRes = await makeRequest(`/api/tasks/${taskId}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ completed: true, clientDate: today }),
    });
    assert.strictEqual(compRes.status, 200);
    assert.strictEqual(compRes.body.data.status, 'completed');

    // Verify goal streak was updated to 1
    const updatedGoalsRes = await makeRequest('/api/goals', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const updatedGoal = updatedGoalsRes.body.data.find((g: any) => String(g._id || g.id) === String(goalId));
    assert.ok(updatedGoal, 'Updated goal must exist');
    assert.strictEqual(updatedGoal.streak, 1, 'Goal streak must update to 1 upon task completion');

    // Verify analytics reflects streak = 1
    const analyticsRes = await makeRequest(`/api/analytics?date=${today}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = analyticsRes.body.data;
    assert.strictEqual(data.currentStreak, 1, 'Current streak must be 1');
    assert.strictEqual(data.longestStreak, 1, 'Longest streak must be 1');
    assert.strictEqual(data.completedTasks, 1);
    assert.strictEqual(data.taskCompletionRate, 100);
  });

  it('4. User with consecutive completed days: streak increments correctly', async () => {
    const user = await User.create({
      name: 'Consecutive Hero',
      email: `streak_test_consec_${Date.now()}@example.com`,
    });
    const userId = user._id.toString();

    const goal = await Goal.create({
      userId: user._id,
      title: 'Daily Coding',
      targetDays: 30,
      dailyCommitmentMinutes: 30,
      streak: 0,
    });

    const now = new Date();
    const todayStr = formatYMD(now);
    const yesterday = new Date(now.getTime() - 86400000);
    const yesterdayStr = formatYMD(yesterday);
    const dayBefore = new Date(now.getTime() - 2 * 86400000);
    const dayBeforeStr = formatYMD(dayBefore);

    // Create 3 completed tasks on 3 consecutive calendar days
    await Task.create([
      {
        userId: user._id,
        goalId: goal._id,
        goalTitle: goal.title,
        scheduledFor: 'Today',
        title: 'Coding Day 1',
        durationMinutes: 30,
        status: 'completed',
        completedDate: dayBeforeStr,
        completedAt: dayBefore,
      },
      {
        userId: user._id,
        goalId: goal._id,
        goalTitle: goal.title,
        scheduledFor: 'Today',
        title: 'Coding Day 2',
        durationMinutes: 30,
        status: 'completed',
        completedDate: yesterdayStr,
        completedAt: yesterday,
      },
      {
        userId: user._id,
        goalId: goal._id,
        goalTitle: goal.title,
        scheduledFor: 'Today',
        title: 'Coding Day 3',
        durationMinutes: 30,
        status: 'completed',
        completedDate: todayStr,
        completedAt: now,
      },
    ]);

    // Recalculate streak
    const calculatedStreak = await TaskService.recalculateGoalStreak(goal._id, todayStr);
    assert.strictEqual(calculatedStreak, 3, 'Streak must be 3 for 3 consecutive days');

    // Check Analytics
    const analytics = await AnalyticsService.getUserAnalytics(userId, todayStr);
    assert.strictEqual(analytics.currentStreak, 3);
    assert.strictEqual(analytics.longestStreak, 3);
  });

  it('5. User misses a day: streak resets to 0 while preserving historical longest streak', async () => {
    const user = await User.create({
      name: 'Missed Day Hero',
      email: `streak_test_miss_${Date.now()}@example.com`,
    });
    const userId = user._id.toString();

    const goal = await Goal.create({
      userId: user._id,
      title: 'Workout Sprint',
      targetDays: 30,
      dailyCommitmentMinutes: 20,
      streak: 3,
    });

    const now = new Date();
    const todayStr = formatYMD(now);
    // User last completed 3 days ago and 2 days ago (missed yesterday and today)
    const twoDaysAgo = new Date(now.getTime() - 2 * 86400000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);

    await Task.create([
      {
        userId: user._id,
        goalId: goal._id,
        goalTitle: goal.title,
        scheduledFor: 'Today',
        title: 'Workout Day 1',
        durationMinutes: 20,
        status: 'completed',
        completedDate: formatYMD(threeDaysAgo),
        completedAt: threeDaysAgo,
      },
      {
        userId: user._id,
        goalId: goal._id,
        goalTitle: goal.title,
        scheduledFor: 'Today',
        title: 'Workout Day 2',
        durationMinutes: 20,
        status: 'completed',
        completedDate: formatYMD(twoDaysAgo),
        completedAt: twoDaysAgo,
      },
    ]);

    // Recalculate streak with reference date = today
    const streak = await TaskService.recalculateGoalStreak(goal._id, todayStr);
    assert.strictEqual(streak, 0, 'Streak must reset to 0 when last completion was > 1 day ago');

    // Check analytics
    const analytics = await AnalyticsService.getUserAnalytics(userId, todayStr);
    assert.strictEqual(analytics.currentStreak, 0, 'Current streak is reset to 0');
    assert.strictEqual(analytics.longestStreak, 2, 'Historical longest streak must be preserved at 2');
  });

  it('6. Tenant isolation: One user streak cannot affect another user streak', async () => {
    // User A has an active streak of 5
    const userA = await User.create({
      name: 'User A Experienced',
      email: `streak_test_user_a_${Date.now()}@example.com`,
    });
    await Goal.create({
      userId: userA._id,
      title: 'Habit User A',
      targetDays: 30,
      dailyCommitmentMinutes: 20,
      streak: 5,
    });

    // User B registers fresh
    const userBRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'User B Newbie',
        email: `streak_test_user_b_${Date.now()}@example.com`,
        password: 'password123',
      }),
    });
    const tokenB = userBRes.body.data.token;

    // User B queries analytics: MUST be strictly 0, unaffected by User A
    const today = formatYMD(new Date());
    const analyticsB = await makeRequest(`/api/analytics?date=${today}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.strictEqual(analyticsB.body.data.currentStreak, 0, 'User B must see 0 streak');
    assert.strictEqual(analyticsB.body.data.longestStreak, 0, 'User B must see 0 longest streak');
    assert.strictEqual(analyticsB.body.data.activeGoalsCount, 0, 'User B must see 0 active goals');

    // Verify User A remains intact
    const analyticsA = await AnalyticsService.getUserAnalytics(userA._id.toString(), today);
    assert.strictEqual(analyticsA.currentStreak, 5, 'User A streak must remain 5');
  });
});
