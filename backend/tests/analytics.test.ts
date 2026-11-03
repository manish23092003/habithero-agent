import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Goal } from '../src/models/Goal.js';
import { Task } from '../src/models/Task.js';
import { CheckIn } from '../src/models/CheckIn.js';
import http from 'http';

let server: http.Server;
let baseUrl: string;

describe('HabitHero Analytics & Empty-State Isolation Tests', () => {
  before(async () => {
    await connectDB();
    server = app.listen(0);
    const addr = server.address() as any;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    // Cleanup any test accounts created
    await User.deleteMany({ email: { $in: [/test_analytics_a_.*@example\.com/, /test_analytics_b_.*@example\.com/] } });
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

  it('1. Rejects unauthenticated GET /api/analytics with 401', async () => {
    const res = await makeRequest('/api/analytics');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  it('2. Account A (Brand-new user with zero habits and tasks) sees zero/empty analytics', async () => {
    const uniqueId = Date.now();
    const emailA = `test_analytics_a_${uniqueId}@example.com`;

    // Register Account A
    const regRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Account A Zero',
        email: emailA,
        password: 'password123',
      }),
    });
    assert.strictEqual(regRes.status, 201);
    const tokenA = regRes.body.data.token;

    // Request analytics for Account A
    const today = new Date().toISOString().split('T')[0];
    const analyticsRes = await makeRequest(`/api/analytics?date=${today}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    assert.strictEqual(analyticsRes.status, 200);
    assert.strictEqual(analyticsRes.body.success, true);
    const dataA = analyticsRes.body.data;

    // Empty state assertions:
    // - Completion rate must be 0, never 100
    assert.strictEqual(dataA.taskCompletionRate, 0, 'Completion rate must be 0 for user with 0 tasks');
    assert.strictEqual(dataA.totalTasks, 0, 'Total tasks must be 0');
    assert.strictEqual(dataA.completedTasks, 0, 'Completed tasks must be 0');
    assert.strictEqual(dataA.currentStreak, 0, 'Current streak must be 0');
    assert.strictEqual(dataA.longestStreak, 0, 'Longest streak must be 0');

    // - Bounce-back rate must be null (not enough activity), never 92
    assert.strictEqual(dataA.bounceBackRate, null, 'Bounce-back rate must be null when no activity history exists');

    // - Weekly chart must show 0% for every day, not fabricated percentages (85, 92, 78, etc.)
    assert.strictEqual(dataA.weeklyCompletedTotal, 0, 'Weekly completed total must be 0');
    assert.strictEqual(dataA.weeklyRhythm.length, 7, 'Weekly rhythm must have 7 days');
    dataA.weeklyRhythm.forEach((day: any) => {
      assert.strictEqual(day.percentage, 0, `Day ${day.day} must have 0% completion`);
      assert.strictEqual(day.completedCount, 0, `Day ${day.day} must have 0 completed tasks`);
    });

    // - Categories must be empty
    assert.deepStrictEqual(dataA.categoryCounts, {}, 'Category counts must be empty');
    assert.strictEqual(dataA.activeGoalsCount, 0, 'Active goals count must be 0');
    assert.strictEqual(dataA.totalPlannedDailyMinutes, 0, 'Total planned daily minutes must be 0');
    assert.strictEqual(dataA.habitBreakdown.length, 0, 'Habit breakdown must be empty');
  });

  it('3. Account B (User with habits, tasks, and completion history) sees only its own calculated data', async () => {
    const uniqueId = Date.now();
    const emailB = `test_analytics_b_${uniqueId}@example.com`;

    // Register Account B
    const regRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Account B Active',
        email: emailB,
        password: 'password123',
      }),
    });
    assert.strictEqual(regRes.status, 201);
    const tokenB = regRes.body.data.token;
    const userBId = regRes.body.data.user.id;

    // Create a habit for Account B
    const goalRes = await makeRequest('/api/goals', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        title: 'Daily TypeScript Practice',
        category: 'learning',
        targetDays: 21,
        dailyCommitmentMinutes: 25,
      }),
    });
    assert.strictEqual(goalRes.status, 201);
    const goalB = goalRes.body.data.goal;
    const kickoffTaskB = goalRes.body.data.initialTask;
    const kickoffTaskId = kickoffTaskB._id || kickoffTaskB.id;
    const goalBId = goalB._id || goalB.id;

    const today = new Date().toISOString().split('T')[0];

    // Complete the kickoff task today
    const completeRes = await makeRequest(`/api/tasks/${kickoffTaskId}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenB}`, 'X-Client-Date': today },
      body: JSON.stringify({ completed: true, clientDate: today }),
    });
    assert.strictEqual(completeRes.status, 200);

    // Create a 2nd task for Account B (pending)
    const task2Res = await makeRequest('/api/tasks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        goalId: goalBId,
        title: 'Write Unit Tests for Middleware',
        durationMinutes: 20,
        category: 'learning',
        scheduledFor: 'Today',
      }),
    });
    assert.strictEqual(task2Res.status, 201);

    // Simulate setback and bounce-back:
    // Yesterday: check-in status 'missed'
    const yesterdayDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    await makeRequest('/api/checkins', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        date: yesterdayDate,
        status: 'missed',
        completedTaskCount: 0,
        totalTaskCount: 1,
        missedReason: 'busy',
        reflection: 'Had overtime at work',
      }),
    });

    // Today: check-in status 'great' (recovered!)
    await makeRequest('/api/checkins', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        date: today,
        status: 'great',
        completedTaskCount: 1,
        totalTaskCount: 2,
        reflection: 'Bounced back with 25m session!',
      }),
    });

    // Query analytics for Account B
    const analyticsRes = await makeRequest(`/api/analytics?date=${today}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.strictEqual(analyticsRes.status, 200);
    const dataB = analyticsRes.body.data;

    // Account B assertions:
    assert.strictEqual(dataB.totalTasks, 2, 'Account B must have 2 tasks (kickoff + task2)');
    assert.strictEqual(dataB.completedTasks, 1, 'Account B must have 1 completed task');
    assert.strictEqual(dataB.taskCompletionRate, 50, 'Account B completion rate must be 50% (1 of 2)');
    assert.strictEqual(dataB.currentStreak, 1, 'Account B daily streak must be 1');
    assert.strictEqual(dataB.bounceBackRate, 100, 'Account B bounce-back rate must be 100% (recovered from yesterday setback)');
    assert.strictEqual(dataB.activeGoalsCount, 1, 'Account B active goals count must be 1');
    assert.strictEqual(dataB.categoryCounts.learning, 1, 'Category counts must have learning: 1');
    assert.strictEqual(dataB.totalPlannedDailyMinutes, 25, 'Total planned daily minutes must be 25');
    assert.strictEqual(dataB.weeklyCompletedTotal, 1, 'Weekly completed total must be 1');
  });

  it('4. Strict Isolation: Account A re-query confirms zero data leakage from Account B', async () => {
    const uniqueId = Date.now();
    const emailA = `test_analytics_a_leakcheck_${uniqueId}@example.com`;

    // Register Account A
    const regRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Account A Leak Check',
        email: emailA,
        password: 'password123',
      }),
    });
    const tokenA = regRes.body.data.token;

    // Re-verify Account A analytics
    const today = new Date().toISOString().split('T')[0];
    const analyticsRes = await makeRequest(`/api/analytics?date=${today}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(analyticsRes.status, 200);
    const dataA = analyticsRes.body.data;

    assert.strictEqual(dataA.taskCompletionRate, 0, 'Account A completion rate must remain 0%');
    assert.strictEqual(dataA.totalTasks, 0, 'Account A total tasks must remain 0');
    assert.strictEqual(dataA.completedTasks, 0, 'Account A completed tasks must remain 0');
    assert.strictEqual(dataA.currentStreak, 0, 'Account A current streak must remain 0');
    assert.strictEqual(dataA.bounceBackRate, null, 'Account A bounce-back rate must remain null');
    assert.strictEqual(dataA.weeklyCompletedTotal, 0, 'Account A weekly completed total must remain 0');
    assert.deepStrictEqual(dataA.categoryCounts, {}, 'Account A category counts must remain empty');
    assert.strictEqual(dataA.activeGoalsCount, 0, 'Account A active goals count must remain 0');
    assert.strictEqual(dataA.habitBreakdown.length, 0, 'Account A habit breakdown must remain empty');
  });
});
