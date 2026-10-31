import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { ToolExecutor } from '../src/ai/toolExecutor.js';
import http from 'http';

interface TestResponse {
  status: number;
  body: any;
}

const makeRequest = (
  server: http.Server,
  method: string,
  path: string,
  data?: any,
  token?: string
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
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        host: '127.0.0.1',
        port: address.port,
        path,
        method,
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
          resolve({
            status: res.statusCode || 500,
            body: parsed,
          });
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

const runAllTests = async () => {
  console.log('--- STARTING HABITHERO BACKEND API TESTS ---');
  await connectDB();

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  };

  try {
    // 1. Health check
    const health = await makeRequest(server, 'GET', '/api/health');
    assert(health.status === 200 && health.body.status === 'ok', 'GET /api/health returns ok');

    // 2. Auth: Register User A
    const userAEmail = `hero_${Date.now()}@example.com`;
    const regRes = await makeRequest(server, 'POST', '/api/auth/register', {
      name: 'Alex Hero',
      email: userAEmail,
      password: 'password123',
    });
    assert(regRes.status === 201 && regRes.body.data?.token, 'POST /api/auth/register registers user');
    const tokenA = regRes.body.data.token;
    const userAId = regRes.body.data.user.id;

    // 3. Auth: Duplicate registration prevention
    const dupRes = await makeRequest(server, 'POST', '/api/auth/register', {
      name: 'Alex Duplicate',
      email: userAEmail,
      password: 'password123',
    });
    assert(dupRes.status === 400, 'Duplicate email registration rejected');

    // 4. Auth: Login
    const loginRes = await makeRequest(server, 'POST', '/api/auth/login', {
      email: userAEmail,
      password: 'password123',
    });
    assert(loginRes.status === 200 && loginRes.body.data?.token, 'POST /api/auth/login logs in successfully');

    // 5. Auth: Invalid login
    const badLogin = await makeRequest(server, 'POST', '/api/auth/login', {
      email: userAEmail,
      password: 'wrongpassword',
    });
    assert(badLogin.status === 401, 'Invalid password correctly rejected with 401');

    // 6. Auth: GET /api/auth/me
    const meRes = await makeRequest(server, 'GET', '/api/auth/me', undefined, tokenA);
    assert(meRes.status === 200 && meRes.body.data.email === userAEmail, 'GET /api/auth/me returns current user');
    assert(meRes.body.data.passwordHash === undefined, 'Password hash is NOT exposed in /me');

    // 7. Security: Unauthenticated access to private route
    const unauthRes = await makeRequest(server, 'GET', '/api/goals');
    assert(unauthRes.status === 401, 'Protected route /api/goals blocks unauthenticated request');

    // 8. Goal: Create Goal
    const goalRes = await makeRequest(
      server,
      'POST',
      '/api/goals',
      {
        title: 'Master Java in 30 Days',
        tagline: 'From zero to OOP and backend microservices',
        category: 'learning',
        targetDays: 30,
        dailyCommitmentMinutes: 25,
      },
      tokenA
    );
    assert(goalRes.status === 201 && goalRes.body.data.goal?._id, 'POST /api/goals creates goal with phased plan');
    const goalId = goalRes.body.data.goal._id;
    assert(goalRes.body.data.initialTask?._id, 'POST /api/goals auto-creates kickoff Day 1 task');

    // 9. Goal: GET /api/goals
    const getGoalsRes = await makeRequest(server, 'GET', '/api/goals', undefined, tokenA);
    assert(getGoalsRes.status === 200 && getGoalsRes.body.data.length >= 1, 'GET /api/goals returns user goals');

    // 10. Goal: GET /api/goals/:id
    const singleGoalRes = await makeRequest(server, 'GET', `/api/goals/${goalId}`, undefined, tokenA);
    assert(singleGoalRes.status === 200 && singleGoalRes.body.data.title === 'Master Java in 30 Days', 'GET /api/goals/:id returns goal');

    // 11. Goal: PATCH /api/goals/:id
    const patchGoalRes = await makeRequest(
      server,
      'PATCH',
      `/api/goals/${goalId}`,
      { dailyCommitmentMinutes: 15, adaptationNotice: 'Adapted to 15m' },
      tokenA
    );
    assert(patchGoalRes.status === 200 && patchGoalRes.body.data.dailyCommitmentMinutes === 15, 'PATCH /api/goals/:id updates goal');

    // 12. Task: GET /api/tasks/today
    const todayTasksRes = await makeRequest(server, 'GET', '/api/tasks/today', undefined, tokenA);
    assert(todayTasksRes.status === 200 && todayTasksRes.body.data.length >= 1, 'GET /api/tasks/today returns today tasks');
    const taskId = todayTasksRes.body.data[0]._id;

    // 13. Task: Create an additional custom task
    const newTaskRes = await makeRequest(
      server,
      'POST',
      '/api/tasks',
      {
        goalId,
        title: 'Write BankAccount Class',
        description: 'Implement balance, deposit, withdraw',
        durationMinutes: 15,
        difficulty: 'easy',
        scheduledFor: 'Today',
      },
      tokenA
    );
    assert(newTaskRes.status === 201 && newTaskRes.body.data._id, 'POST /api/tasks creates task');
    const customTaskId = newTaskRes.body.data._id;

    // 14. Task: PATCH /api/tasks/:id/complete
    const completeRes = await makeRequest(
      server,
      'PATCH',
      `/api/tasks/${customTaskId}/complete`,
      { completed: true },
      tokenA
    );
    assert(completeRes.status === 200 && completeRes.body.data.status === 'completed', 'PATCH /api/tasks/:id/complete completes task');
    assert(completeRes.body.data.completedAt !== null, 'Completion timestamp is saved');

    // 15. CheckIn: POST /api/checkins
    const checkInRes = await makeRequest(
      server,
      'POST',
      '/api/checkins',
      {
        goalId,
        status: 'partial',
        completedTaskCount: 1,
        totalTaskCount: 2,
        missedReason: 'busy',
        reflection: 'Busy day with project deadline',
        adaptTomorrow: true,
      },
      tokenA
    );
    assert(checkInRes.status === 201 && checkInRes.body.data._id, 'POST /api/checkins records check-in and adaptation');

    // 16. CheckIn: GET /api/checkins/today
    const todayCheckInRes = await makeRequest(server, 'GET', '/api/checkins/today', undefined, tokenA);
    assert(todayCheckInRes.status === 200 && todayCheckInRes.body.data?.status === 'partial', 'GET /api/checkins/today returns today record');

    // 17. User Data Isolation: Register User B and verify they cannot access User A's data
    const userBEmail = `hero_b_${Date.now()}@example.com`;
    const regBRes = await makeRequest(server, 'POST', '/api/auth/register', {
      name: 'User B',
      email: userBEmail,
      password: 'password456',
    });
    const tokenB = regBRes.body.data.token;

    // User B tries to get User A's goal by ID
    const userBAccessGoal = await makeRequest(server, 'GET', `/api/goals/${goalId}`, undefined, tokenB);
    assert(userBAccessGoal.status === 404, 'User B cannot access User A goal (404 Isolation)');

    // User B tries to complete User A's task
    const userBAccessTask = await makeRequest(
      server,
      'PATCH',
      `/api/tasks/${taskId}/complete`,
      { completed: true },
      tokenB
    );
    assert(userBAccessTask.status === 400, 'User B cannot complete User A task (Access Denied)');

    // User B's goals list should be empty
    const userBGoals = await makeRequest(server, 'GET', '/api/goals', undefined, tokenB);
    assert(userBGoals.status === 200 && userBGoals.body.data.length === 0, 'User B has isolated empty goals list');

    // 18. Goal: DELETE /api/goals/:id (Cascade delete)
    const deleteGoalRes = await makeRequest(server, 'DELETE', `/api/goals/${goalId}`, undefined, tokenA);
    assert(deleteGoalRes.status === 200 && deleteGoalRes.body.success === true, 'DELETE /api/goals/:id deletes goal');

    const tasksAfterDelete = await makeRequest(server, 'GET', `/api/tasks?goalId=${goalId}`, undefined, tokenA);
    assert(tasksAfterDelete.body.data.length === 0, 'Cascade delete verified: tasks removed with goal');

    // ==========================================
    // PHASE 3: AI INTELLIGENCE & AGENT TOOLS TESTS
    // ==========================================
    console.log('\n--- TESTING PHASE 3 AI AGENT TOOLS & SCENARIOS ---');

    // Scenario A: User asks to create a Java learning goal for 30 days
    const toolGoalRes = await ToolExecutor.execute(userAId, 'create_goal', {
      title: 'Learn Java in 30 Days',
      tagline: 'Master OOP, Collections, and Spring Boot',
      category: 'learning',
      targetDays: 30,
      dailyCommitmentMinutes: 30,
    });
    assert(toolGoalRes.success === true, 'Scenario A: Tool create_goal succeeds');
    assert(toolGoalRes.data.goalId && toolGoalRes.data.initialTaskId, 'Scenario A: Goal and Day 1 task created in MongoDB');
    const aiGoalId = toolGoalRes.data.goalId;
    const aiTaskId = toolGoalRes.data.initialTaskId;

    // Scenario B: User asks what tasks are scheduled today
    const toolTasksRes = await ToolExecutor.execute(userAId, 'get_today_tasks', {});
    assert(toolTasksRes.success === true, 'Scenario B: Tool get_today_tasks succeeds');
    assert(toolTasksRes.data.length >= 1, 'Scenario B: Real tasks retrieved from MongoDB');

    // Scenario C: User says they completed a task
    const toolCompleteRes = await ToolExecutor.execute(userAId, 'complete_task', {
      taskId: aiTaskId,
      completed: true,
    });
    assert(toolCompleteRes.success === true, 'Scenario C: Tool complete_task succeeds');
    assert(toolCompleteRes.data.status === 'completed' && toolCompleteRes.data.completedAt, 'Scenario C: Completion timestamp persisted to MongoDB');

    // Scenario D: User says a task is too difficult / wants adaptation
    // First create a challenging task to adapt
    const toolCreateTaskRes = await ToolExecutor.execute(userAId, 'create_tasks', {
      goalId: aiGoalId,
      title: 'Java Concurrency & Thread Pools',
      description: 'Implement ExecutorService with custom ThreadFactory',
      durationMinutes: 45,
      difficulty: 'challenging',
      dayNumber: 2,
    });
    assert(toolCreateTaskRes.success === true, 'Tool create_tasks created new challenge task in MongoDB');
    const challengeTaskId = toolCreateTaskRes.data.id;

    // Adapt the task down to 15m
    const toolAdaptRes = await ToolExecutor.execute(userAId, 'adapt_task', {
      taskId: challengeTaskId,
      newDurationMinutes: 15,
      adaptationNote: '⚡ Scaled to 15m micro-sprint to keep momentum alive.',
    });
    assert(toolAdaptRes.success === true, 'Scenario D: Tool adapt_task succeeds');
    assert(toolAdaptRes.data.durationMinutes === 15 && toolAdaptRes.data.status === 'adapted', 'Scenario D: Task scaled down to 15m in MongoDB');

    // Test tool: update_goal
    const toolUpdateGoalRes = await ToolExecutor.execute(userAId, 'update_goal', {
      goalId: aiGoalId,
      dailyCommitmentMinutes: 20,
      adaptationNotice: 'Adjusted to 20m daily after check-in feedback',
    });
    assert(toolUpdateGoalRes.success === true && toolUpdateGoalRes.data.dailyCommitmentMinutes === 20, 'Tool update_goal modified goal in MongoDB');

    // Test tool: adapt_habit_plan
    const toolPlanAdaptRes = await ToolExecutor.execute(userAId, 'adapt_habit_plan', {
      reason: 'busy',
      targetMinutes: 15,
      goalId: aiGoalId,
    });
    assert(toolPlanAdaptRes.success === true && toolPlanAdaptRes.data.newDurationMinutes === 15, 'Tool adapt_habit_plan adjusted pending tasks');

    // Test tool: record_checkin
    const toolCheckInRes = await ToolExecutor.execute(userAId, 'record_checkin', {
      status: 'partial',
      missedReason: 'tired',
      reflection: 'Long day, completed 15m micro-session',
      adaptTomorrow: true,
    });
    assert(toolCheckInRes.success === true && toolCheckInRes.data.status === 'partial', 'Tool record_checkin persisted check-in to MongoDB');

    // Scenario E: User asks about their progress
    const toolProgressRes = await ToolExecutor.execute(userAId, 'get_progress_summary', {});
    assert(toolProgressRes.success === true, 'Scenario E: Tool get_progress_summary succeeds');
    assert(typeof toolProgressRes.data.consistencyRate === 'string', 'Scenario E: Real consistency statistics retrieved from MongoDB');

    // Scenario F: User B attempts to access or modify User A's data through tools
    const toolUnauthorizedRes = await ToolExecutor.execute(tokenB ? regBRes.body.data.user.id : 'badId', 'complete_task', {
      taskId: challengeTaskId,
    });
    assert(toolUnauthorizedRes.success === false, 'Scenario F: User B cannot complete User A task via tool (User Data Isolation)');

    // Scenario G: Chat endpoint with missing/unconfigured Gemini API Key
    // Tests that sending a message does not fake a response, stores conversation, and returns clear guidance
    const chatMsgRes = await makeRequest(
      server,
      'POST',
      '/api/chat/message',
      { message: 'Hello HabitHero, what should I work on today?' },
      tokenA
    );
    assert(chatMsgRes.status === 200, 'Scenario G: POST /api/chat/message responds without crashing');
    const hasValidAiResponse = chatMsgRes.body.data.apiKeyMissing === true || (typeof chatMsgRes.body.data.reply === 'string' && chatMsgRes.body.data.reply.length > 0);
    assert(hasValidAiResponse, 'Scenario G: Missing API key cleanly reported or live AI response generated');
    assert(chatMsgRes.body.data.conversationId, 'Scenario G: Conversation created and saved in MongoDB');
    const conversationId = chatMsgRes.body.data.conversationId;

    // Chat Conversation List: GET /api/chat/conversations
    const convListRes = await makeRequest(server, 'GET', '/api/chat/conversations', undefined, tokenA);
    assert(convListRes.status === 200 && convListRes.body.data.length >= 1, 'GET /api/chat/conversations lists user conversations');

    // Chat Conversation Detail: GET /api/chat/conversations/:id
    const convDetailRes = await makeRequest(server, 'GET', `/api/chat/conversations/${conversationId}`, undefined, tokenA);
    assert(convDetailRes.status === 200 && convDetailRes.body.data.messages.length >= 2, 'GET /api/chat/conversations/:id retrieves conversation messages');

    // Scenario F (Part 2): User B cannot access User A's conversation
    const userBAccessConv = await makeRequest(server, 'GET', `/api/chat/conversations/${conversationId}`, undefined, tokenB);
    assert(userBAccessConv.status === 404, 'Scenario F: User B cannot access User A conversation (404 Isolation)');

    // Delete conversation: DELETE /api/chat/conversations/:id
    const deleteConvRes = await makeRequest(server, 'DELETE', `/api/chat/conversations/${conversationId}`, undefined, tokenA);
    assert(deleteConvRes.status === 200 && deleteConvRes.body.success === true, 'DELETE /api/chat/conversations/:id deletes conversation');

  } catch (err: any) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close();
    await disconnectDB();
  }

  console.log('\n--- TEST SUMMARY ---');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  }
};

runAllTests();

