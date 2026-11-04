import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Conversation } from '../src/models/Conversation.js';
import { Goal } from '../src/models/Goal.js';
import { Task } from '../src/models/Task.js';
import { ToolExecutor } from '../src/ai/toolExecutor.js';
import http from 'http';

interface TestResponse {
  status: number;
  body: any;
}

const makeAgentRequest = (
  server: http.Server,
  data?: any,
  secretHeader?: string
): Promise<TestResponse> => {
  return new Promise((resolve, reject) => {
    const address = server.address();
    if (!address || typeof address === 'string') {
      return reject(new Error('Server address not available'));
    }

    const payload = data ? JSON.stringify(data) : '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload).toString(),
    };
    if (secretHeader !== undefined) {
      headers['x-agent-secret'] = secretHeader;
    }

    const req = http.request(
      {
        host: '127.0.0.1',
        port: address.port,
        path: '/api/agent/chat',
        method: 'POST',
        headers,
      },
      res => {
        let rawBody = '';
        res.on('data', chunk => {
          rawBody += chunk;
        });
        res.on('end', () => {
          let parsed = {};
          try {
            parsed = rawBody ? JSON.parse(rawBody) : {};
          } catch {
            parsed = { raw: rawBody };
          }
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
};

const runAgentTests = async () => {
  console.log('--- STARTING HABITHERO AGENT ENDPOINT & DATA ISOLATION TESTS ---');
  await connectDB();

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));

  const secret = process.env.AGENT_SERVICE_SECRET || 'habithero_internal_secret_hackathon_2026';
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string) => {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  };

  try {
    // Test 1: Reject request without secret
    const resNoSecret = await makeAgentRequest(server, {
      sender: 'agent1qtestsender1',
      message: 'Hello',
    });
    assert(resNoSecret.status === 401, 'Rejects request without secret header (401)');

    // Test 2: Reject request with invalid secret
    const resBadSecret = await makeAgentRequest(
      server,
      { sender: 'agent1qtestsender1', message: 'Hello' },
      'wrong_secret_code'
    );
    assert(resBadSecret.status === 401, 'Rejects request with invalid secret header (401)');

    // Test 3: Validate missing message
    const resMissingMsg = await makeAgentRequest(
      server,
      { sender: 'agent1qtestsender1', message: '' },
      secret
    );
    assert(resMissingMsg.status === 400, 'Rejects request with empty message (400)');

    // Test 4: Validate missing sender
    const resMissingSender = await makeAgentRequest(
      server,
      { sender: '', message: 'Valid message' },
      secret
    );
    assert(resMissingSender.status === 400, 'Rejects request with empty sender (400)');

    // Test 5: Process valid message from Sender A -> creates user & conversation
    const senderA = 'agent1qtestuser_alpha_sender';
    const resSenderA = await makeAgentRequest(
      server,
      { sender: senderA, message: 'I want to build a reading habit.' },
      secret
    );
    assert(resSenderA.status === 200, 'Processes message from Sender A successfully (200)');
    assert(Boolean(resSenderA.body.data?.reply), 'Sender A receives non-empty reply');
    assert(Boolean(resSenderA.body.data?.userId), 'Sender A receives userId');
    assert(Boolean(resSenderA.body.data?.conversationId), 'Sender A receives conversationId');

    const userA = await User.findOne({ fetchAddress: senderA });
    assert(Boolean(userA), 'Sender A has isolated user record created in MongoDB');
    assert(userA?.fetchAddress === senderA, 'Sender A user record has correct fetchAddress');

    // Test 6: Subsequent message from Sender A reuses same user record
    const resSenderA2 = await makeAgentRequest(
      server,
      { sender: senderA, message: 'What was my goal again?' },
      secret
    );
    assert(resSenderA2.status === 200, 'Second message from Sender A succeeds (200)');
    assert(resSenderA2.body.data?.userId === userA?._id.toString(), 'Sender A reuses same userId');

    // Test 7: Process message from Sender B -> separate isolated user
    const senderB = 'agent1qtestuser_beta_sender';
    const resSenderB = await makeAgentRequest(
      server,
      { sender: senderB, message: 'I need to run 5k every morning.' },
      secret
    );
    assert(resSenderB.status === 200, 'Processes message from Sender B successfully (200)');
    const userB = await User.findOne({ fetchAddress: senderB });
    assert(Boolean(userB), 'Sender B has separate user record in MongoDB');
    assert(userB?._id.toString() !== userA?._id.toString(), 'Sender A and Sender B have distinct isolated user IDs');

    // Test 8: Conversations are isolated between senders
    const convA = await Conversation.find({ userId: userA?._id });
    const convB = await Conversation.find({ userId: userB?._id });
    assert(convA.length > 0 && convB.length > 0, 'Both users have distinct conversation documents');
    assert(convA[0]._id.toString() !== convB[0]._id.toString(), 'Sender A and Sender B conversation IDs are completely isolated');

    // Test 9: End-to-end goal creation via ToolExecutor & idempotency on second identical submission
    const goalTitle = 'Build a Consistent Java Habit';
    const firstExec = await ToolExecutor.execute(userA!._id.toString(), 'create_goal', {
      title: goalTitle,
      targetDays: 30,
      dailyCommitmentMinutes: 30,
      category: 'learning',
    });
    assert(firstExec.success === true, 'Goal creation tool executes successfully');
    assert(Boolean(firstExec.data?.goalId), 'Returns goalId');
    assert(Boolean(firstExec.data?.initialTaskId), 'Returns initialTaskId');

    const dbGoal = await Goal.findById(firstExec.data.goalId);
    assert(Boolean(dbGoal), 'Goal is persisted in MongoDB');
    assert(dbGoal?.userId.toString() === userA!._id.toString(), 'Goal belongs to the correct authenticated user');
    assert(dbGoal?.targetDays === 30, 'Goal has 30 days target');
    assert(dbGoal?.planOutline.length === 3, 'Goal has 3-phase roadmap persisted');

    const dbTask = await Task.findById(firstExec.data.initialTaskId);
    assert(Boolean(dbTask), 'Day 1 kickoff task is persisted in MongoDB');
    assert(dbTask?.goalId.toString() === dbGoal?._id.toString(), 'Day 1 task belongs to the created goal');
    assert(dbTask?.userId.toString() === userA!._id.toString(), 'Day 1 task belongs to the authenticated user');

    // Second execution with identical title: must prevent duplicate creation
    const secondExec = await ToolExecutor.execute(userA!._id.toString(), 'create_goal', {
      title: goalTitle,
      targetDays: 30,
      dailyCommitmentMinutes: 30,
    });
    assert(secondExec.success === true, 'Second goal creation succeeds idempotently');
    assert(secondExec.data?.alreadyExists === true, 'Detects existing goal and flags alreadyExists: true');
    assert(secondExec.data?.goalId === firstExec.data.goalId, 'Reuses original goal ID without creating a duplicate');

    const totalJavaGoals = await Goal.countDocuments({
      userId: userA!._id,
      title: goalTitle,
    });
    assert(totalJavaGoals === 1, 'Strictly 1 goal exists in MongoDB (no duplicate goal created)');

    const totalJavaTasks = await Task.countDocuments({
      userId: userA!._id,
      goalId: dbGoal?._id,
    });
    assert(totalJavaTasks === 1, 'Strictly 1 Day 1 kickoff task exists in MongoDB (no duplicate task created)');

    // Test 10: Web user account linking & automatic data merging from ASI:One
    const webUserEmail = 'webuser_tester@example.com';
    const failPlaceholderSender = 'agent1qfailtestsender1234567890abcdefghijklmnopqrstuvwx';
    await User.deleteMany({
      email: {
        $in: [
          webUserEmail,
          'another_user@example.com',
          'rollback_tester@example.com',
          `${failPlaceholderSender.toLowerCase()}@fetchai.agent`,
        ],
      },
    });
    const webUser = await User.create({
      name: 'Web User Tester',
      email: webUserEmail,
      passwordHash: 'dummy_hash',
    });

    // Link webUser to senderA's Fetch.ai address
    const { AuthService } = await import('../src/services/authService.js');
    const updateResult = await AuthService.updateMe(webUser._id.toString(), {
      fetchAddress: senderA,
    });
    assert(updateResult.fetchAddress === senderA, 'Web user has successfully linked fetchAddress');

    // Verify placeholder userA was deleted and merged
    const placeholderUserCheck = await User.findById(userA!._id);
    assert(placeholderUserCheck === null, 'Placeholder userA was merged and deleted');

    // Verify Goal and Task were reassigned to webUser
    const mergedGoal = await Goal.findById(dbGoal?._id);
    assert(mergedGoal?.userId.toString() === webUser._id.toString(), 'Goal was successfully reassigned to web user');

    const mergedTask = await Task.findById(dbTask?._id);
    assert(mergedTask?.userId.toString() === webUser._id.toString(), 'Task was successfully reassigned to web user');

    // Test 11: Subsequent message from senderA routes directly to webUser
    const resSenderAAfterMerge = await makeAgentRequest(
      server,
      { sender: senderA, message: 'Check my progress today' },
      secret
    );
    assert(resSenderAAfterMerge.status === 200, 'Message after merge succeeds (200)');
    assert(
      resSenderAAfterMerge.body.data?.userId === webUser._id.toString(),
      'Subsequent ASI:One message directly routes to the linked web user'
    );

    // Test 12: Linking address already registered to another real user throws error
    const anotherWebUser = await User.create({
      name: 'Another Real User',
      email: 'another_user@example.com',
      passwordHash: 'dummy_hash',
    });
    let linkErrorCaught = false;
    try {
      await AuthService.updateMe(anotherWebUser._id.toString(), {
        fetchAddress: senderA,
      });
    } catch (err: any) {
      linkErrorCaught = true;
      assert(
        err.message.includes('already linked to another HabitHero account'),
        'Rejects linking an address already claimed by another user'
      );
    }
    assert(linkErrorCaught, 'Throws exception when attempting duplicate address claim');

    // Clean up test documents
    await Goal.deleteMany({ userId: webUser._id });
    await Task.deleteMany({ userId: webUser._id });
    await Conversation.deleteMany({ userId: webUser._id });
    await User.deleteOne({ _id: webUser._id });
    await User.deleteOne({ _id: anotherWebUser._id });

    // Test 13: Transactional Rollback on Partial Failure
    const failPlaceholderUser = await User.create({
      name: 'ASI User FailTest',
      email: `${failPlaceholderSender.toLowerCase()}@fetchai.agent`,
      fetchAddress: failPlaceholderSender,
      passwordHash: 'dummy_hash',
    });

    const failGoal = await Goal.create({
      userId: failPlaceholderUser._id,
      title: 'Rollback Safety Goal',
      targetDays: 30,
      dailyCommitmentMinutes: 20,
      planOutline: [{ phaseNumber: 1, title: 'Phase 1', focus: 'Init', dayRange: 'Day 1-7', tasksPlanned: 7 }],
    });

    const failTask = await Task.create({
      userId: failPlaceholderUser._id,
      goalId: failGoal._id,
      goalTitle: failGoal.title,
      title: 'Rollback Kickoff Task',
      durationMinutes: 20,
      scheduledFor: 'Today',
    });

    const webUserRollback = await User.create({
      name: 'Web User Rollback',
      email: 'rollback_tester@example.com',
      passwordHash: 'dummy_hash',
    });

    // Temporarily stub destinationUser.save to simulate an unexpected mid-merge failure
    const originalSave = webUserRollback.save;
    webUserRollback.save = (async function (..._args: any[]) {
      throw new Error('Simulated database write error during account linking');
    }) as any;

    let partialFailureCaught = false;
    try {
      await (AuthService as any).mergePlaceholderAccount(webUserRollback, failPlaceholderUser, failPlaceholderSender);
    } catch (err: any) {
      partialFailureCaught = true;
      assert(err.message.includes('Simulated database write error'), 'Catches simulated mid-merge failure');
    }
    assert(partialFailureCaught, 'Throws on partial merge failure');

    webUserRollback.save = originalSave;

    // Verify Rollback: Goal, Task and placeholder user must remain completely intact
    const postFailGoal = await Goal.findById(failGoal._id);
    const postFailTask = await Task.findById(failTask._id);
    const postFailPlaceholder = await User.findById(failPlaceholderUser._id);

    assert(
      postFailGoal?.userId.toString() === failPlaceholderUser._id.toString(),
      'Goal was rolled back to placeholder user on partial failure'
    );
    assert(
      postFailTask?.userId.toString() === failPlaceholderUser._id.toString(),
      'Task was rolled back to placeholder user on partial failure'
    );
    assert(postFailPlaceholder !== null, 'Placeholder user document was preserved and not deleted on failure');

    // Clean up rollback test docs
    await Goal.deleteOne({ _id: failGoal._id });
    await Task.deleteOne({ _id: failTask._id });
    await User.deleteOne({ _id: failPlaceholderUser._id });
    await User.deleteOne({ _id: webUserRollback._id });

    // Test 14: Production Strict Transaction Enforcement (Zero Fallback)
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const prodPlaceholderSender = 'agent1qprod_test_sender_address_strictly_transactional';
    const prodPlaceholderUser = await User.create({
      name: 'ASI User ProdStrict',
      email: `${prodPlaceholderSender.toLowerCase()}@fetchai.agent`,
      fetchAddress: prodPlaceholderSender,
      passwordHash: 'dummy_hash',
    });

    const prodGoal = await Goal.create({
      userId: prodPlaceholderUser._id,
      title: 'Prod Strict Goal',
      targetDays: 30,
      dailyCommitmentMinutes: 15,
      planOutline: [{ phaseNumber: 1, title: 'Phase 1', focus: 'Init', dayRange: 'Day 1-7', tasksPlanned: 7 }],
    });

    const prodWebUser = await User.create({
      name: 'Web User ProdStrict',
      email: 'prodstrict_tester@example.com',
      passwordHash: 'dummy_hash',
    });

    let prodErrorCaught = false;
    try {
      // In production mode on a standalone instance without replica set support,
      // account linking must strictly reject and refuse non-transactional sequential writes.
      await AuthService.updateMe(prodWebUser._id.toString(), { fetchAddress: prodPlaceholderSender });
    } catch (err: any) {
      prodErrorCaught = true;
      const isExpectedError =
        err.message.includes('Transaction') ||
        err.message.includes('replica set') ||
        err.message.includes('strictly requires a successful MongoDB transaction in production');
      assert(isExpectedError, 'Production rejects non-transactional linking without replica set support');
    }
    assert(prodErrorCaught, 'Throws error instead of falling back to sequential writes in production');

    // Confirm that NO documents were modified or deleted
    const postProdGoal = await Goal.findById(prodGoal._id);
    const postProdPlaceholder = await User.findById(prodPlaceholderUser._id);
    const postProdWebUser = await User.findById(prodWebUser._id);

    assert(
      postProdGoal?.userId.toString() === prodPlaceholderUser._id.toString(),
      'Goal remains untouched with placeholder user in production rejection'
    );
    assert(postProdPlaceholder !== null, 'Placeholder user preserved in production rejection');
    assert(postProdWebUser?.fetchAddress === undefined, 'Web user fetchAddress remains unlinked on transaction failure');

    // Restore environment
    process.env.NODE_ENV = originalEnv;

    // Clean up prod strict test docs
    await Goal.deleteOne({ _id: prodGoal._id });
    await User.deleteOne({ _id: prodPlaceholderUser._id });
    await User.deleteOne({ _id: prodWebUser._id });

    console.log(`\nAgent Endpoint Test Summary: ${passed} Passed, ${failed} Failed`);

    if (userB) {
      await User.deleteOne({ _id: userB._id });
      await Conversation.deleteMany({ userId: userB._id });
    }

    server.close();
    await disconnectDB();

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    server.close();
    await disconnectDB();
    process.exit(1);
  }
};

runAgentTests();

