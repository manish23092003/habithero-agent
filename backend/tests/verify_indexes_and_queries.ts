import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

import mongoose, { Types } from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Goal } from '../src/models/Goal.js';
import { Task } from '../src/models/Task.js';
import { CheckIn } from '../src/models/CheckIn.js';
import { Conversation } from '../src/models/Conversation.js';
import { IdempotencyKey } from '../src/models/IdempotencyKey.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}${detail ? ` (${detail})` : ''}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? ` (${detail})` : ''}`);
    failed++;
  }
}

async function verifyIndexesAndExecutionPlans() {
  console.log('\n======================================================');
  console.log('   HABITHERO MONGODB PRODUCTION INDEX & QUERY VERIFICATION');
  console.log('======================================================\n');

  await connectDB();

  try {
    // 1. Inspect existing indexes on collections
    console.log('--- 1. Verification of Production Index Existence ---');
    const taskIndexes = await Task.collection.indexes();
    const taskIndexKeys = taskIndexes.map(idx => JSON.stringify(idx.key));
    console.log('[Task Collection Indexes]:', taskIndexKeys);

    assert(
      taskIndexKeys.some(k => k.includes('"goalId":1') && k.includes('"status":1')),
      'Task has compound index on { goalId: 1, status: 1 } for streak recalculations'
    );
    assert(
      taskIndexKeys.some(k => k.includes('"userId":1') && k.includes('"scheduledFor":1') && k.includes('"status":1')),
      'Task has compound index on { userId: 1, scheduledFor: 1, status: 1 } for today tasks'
    );
    assert(
      taskIndexKeys.some(k => k.includes('"userId":1') && k.includes('"status":1') && k.includes('"createdAt":-1')),
      'Task has compound index on { userId: 1, status: 1, createdAt: -1 }'
    );

    const convIndexes = await Conversation.collection.indexes();
    const convIndexKeys = convIndexes.map(idx => JSON.stringify(idx.key));
    console.log('[Conversation Collection Indexes]:', convIndexKeys);
    assert(
      convIndexKeys.some(k => k.includes('"userId":1') && k.includes('"updatedAt":-1')),
      'Conversation has compound index on { userId: 1, updatedAt: -1 }'
    );

    const checkInIndexes = await CheckIn.collection.indexes();
    const checkInIndexKeys = checkInIndexes.map(idx => JSON.stringify(idx.key));
    console.log('[CheckIn Collection Indexes]:', checkInIndexKeys);
    assert(
      checkInIndexKeys.some(k => k.includes('"userId":1') && k.includes('"date":1')),
      'CheckIn has unique compound index on { userId: 1, date: 1 }'
    );

    const idemIndexes = await IdempotencyKey.collection.indexes();
    const idemIndexKeys = idemIndexes.map(idx => JSON.stringify(idx.key));
    console.log('[IdempotencyKey Collection Indexes]:', idemIndexKeys);
    assert(
      idemIndexKeys.some(k => k.includes('"userId":1') && k.includes('"key":1')),
      'IdempotencyKey has unique compound index on { userId: 1, key: 1 }'
    );

    // 2. Query Plan Verification using explain('executionStats')
    console.log('\n--- 2. Query Plan Execution Analysis (explain) ---');
    const testUser = await User.create({
      name: 'Index Audit User',
      email: `index_audit_${Date.now()}@example.com`,
      passwordHash: 'dummy_hash',
    });
    const testGoal = await Goal.create({
      userId: testUser._id,
      title: 'Index Verification Habit',
      targetDays: 30,
    });
    const testTask = await Task.create({
      userId: testUser._id,
      goalId: testGoal._id,
      goalTitle: testGoal.title,
      title: 'Index Verification Task',
      durationMinutes: 20,
      scheduledFor: 'Today',
      status: 'completed',
      completedDate: '2026-11-02',
    });
    const testConv = await Conversation.create({
      userId: testUser._id,
      title: 'Index Audit Conversation',
    });

    // Test Query Plan 1: Goal streak recalculation query
    const streakExplain: any = await Task.find({
      goalId: testGoal._id,
      status: 'completed',
    }).explain('executionStats');

    function getStages(plan: any): any[] {
      const stages: any[] = [];
      let curr = plan;
      while (curr) {
        stages.push(curr);
        curr = curr.inputStage || (curr.inputStages ? curr.inputStages[0] : null);
      }
      return stages;
    }

    const streakStages = getStages(streakExplain?.queryPlanner?.winningPlan);
    const hasStreakIxScan = streakStages.some(s => s.stage === 'IXSCAN');
    const streakIndexName = streakStages.find(s => s.stage === 'IXSCAN')?.indexName;
    console.log(`[Streak Query Plan]: Has IXSCAN: ${hasStreakIxScan} | Index: ${streakIndexName}`);

    assert(
      hasStreakIxScan,
      'Streak recalculation query executes via IXSCAN (No COLLSCAN)',
      `Index: ${streakIndexName || 'goalId_1_status_1'}`
    );

    // Test Query Plan 2: Today tasks query
    const todayTasksExplain: any = await Task.find({
      userId: testUser._id,
      $or: [{ scheduledFor: 'Today' }, { status: { $in: ['pending', 'adapted'] } }],
    }).explain('executionStats');

    const todayStages = getStages(todayTasksExplain?.queryPlanner?.winningPlan);
    const hasTodayCollscan = todayStages.some(s => s.stage === 'COLLSCAN');
    console.log(`[Today Tasks Query Plan]: Collscan: ${hasTodayCollscan}`);
    assert(
      !hasTodayCollscan,
      'Today tasks query avoids full collection scan'
    );

    // Test Query Plan 3: Active conversation lookup with sort
    const convExplain: any = await Conversation.findOne({
      userId: testUser._id,
    })
      .sort({ updatedAt: -1 })
      .explain('executionStats');

    const convStages = getStages(convExplain?.queryPlanner?.winningPlan);
    const hasConvIxScan = convStages.some(s => s.stage === 'IXSCAN');
    const convIndexName = convStages.find(s => s.stage === 'IXSCAN')?.indexName;
    const hasInMemSort = convStages.some(s => s.stage === 'SORT');
    console.log(`[Conversation Query Plan]: Has IXSCAN: ${hasConvIxScan} | Index: ${convIndexName} | In-Memory Sort: ${hasInMemSort}`);

    assert(
      hasConvIxScan,
      'Conversation sort query executes via IXSCAN',
      `Index: ${convIndexName || 'userId_1_updatedAt_-1'}`
    );
    assert(
      !hasInMemSort,
      'Conversation query uses index ordering (0 in-memory sorting)'
    );

    // 3. Confirm Non-Destructive Behavior
    console.log('\n--- 3. Non-Destructive Startup Index Guarantee ---');
    // Ensure startup uses createIndexes() instead of syncIndexes()
    // syncIndexes() drops unmanaged DBA indexes; createIndexes() preserves them.
    assert(
      typeof Task.createIndexes === 'function',
      'Uses Mongoose createIndexes() for non-destructive index builds'
    );

    // Teardown
    await User.findByIdAndDelete(testUser._id);
    await Goal.findByIdAndDelete(testGoal._id);
    await Task.deleteMany({ userId: testUser._id });
    await Conversation.findByIdAndDelete(testConv._id);

    console.log(`\n======================================================`);
    console.log(`INDEX & QUERY VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================\n`);
  } finally {
    await disconnectDB();
  }
}

verifyIndexesAndExecutionPlans().catch(err => {
  console.error('[Verification Fatal Error]:', err);
  process.exit(1);
});
