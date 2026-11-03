import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Goal } from '../src/models/Goal.js';
import { Task } from '../src/models/Task.js';
import { Message } from '../src/models/Message.js';
import { Conversation } from '../src/models/Conversation.js';
import { ToolExecutor } from '../src/ai/toolExecutor.js';
import { GroqProvider } from '../src/ai/providers/groqProvider.js';
import { AIService } from '../src/ai/aiService.js';
import Groq from 'groq-sdk';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    failed++;
  }
}

async function runGroqSuite() {
  console.log('\n==================================================');
  console.log('   HABITHERO GROQ AI INTEGRATION & TOOL TESTS    ');
  console.log('==================================================\n');

  await connectDB();

  try {
    // 1. Setup isolated test users
    const userA = await User.create({
      name: 'Groq Test User A',
      email: `groq_user_a_${Date.now()}@example.com`,
      passwordHash: 'dummy_hash_a',
    });
    const userAId = userA._id.toString();

    const userB = await User.create({
      name: 'Groq Test User B',
      email: `groq_user_b_${Date.now()}@example.com`,
      passwordHash: 'dummy_hash_b',
    });
    const userBId = userB._id.toString();

    // ----------------------------------------------------
    // TEST 1: Missing API Key Handling
    // ----------------------------------------------------
    console.log('--- TEST 1: Missing / Unconfigured API Key ---');
    const originalGroqKey = process.env.GROQ_API_KEY;
    const originalProvider = process.env.AI_PROVIDER;

    process.env.AI_PROVIDER = 'groq';
    delete process.env.GROQ_API_KEY;

    const unconfiguredProvider = new GroqProvider();
    assert(unconfiguredProvider.isConfigured() === false, 'GroqProvider reports unconfigured when key is missing');

    const missingKeyRes = await unconfiguredProvider.generateResponse({
      userId: userAId,
      message: 'Hello HabitHero',
      conversationId: '507f1f77bcf86cd799439011',
      recentMessages: [],
    });
    assert(missingKeyRes.apiKeyMissing === true, 'Returns apiKeyMissing: true');
    assert(missingKeyRes.reply.includes('GROQ_API_KEY is not configured'), 'Returns clear onboarding setup instructions');

    // Restore key
    process.env.GROQ_API_KEY = originalGroqKey || 'mock_groq_api_key_for_testing';

    // ----------------------------------------------------
    // TEST 2: Normal Conversational Message (No Tools)
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Normal Conversational AI Message ---');
    const testProvider = new GroqProvider();
    const mockClient = new Groq({ apiKey: 'mock_key_for_testing' });
    testProvider.clientOverride = mockClient;
    assert(mockClient !== null, 'Groq client instantiated');

    const origCreate = mockClient.chat.completions.create;

    mockClient.chat.completions.create = async (params: any) => {
      // Verify parameters
      assert(params.parallel_tool_calls === false, 'Enforces sequential tool calling (parallel_tool_calls: false)');
      assert(params.tools && params.tools.length === 10, 'Passes all 10 HabitHero tool definitions');
      assert(params.max_completion_tokens === 1024, 'Uses max_completion_tokens: 1024 for modern reasoning model');
      assert(params.reasoning_format === 'hidden', 'Specifies reasoning_format: hidden for clean responses');
      return {
        id: 'chatcmpl-test-1',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Consistency is your greatest superpower! Let us focus on a 15-minute micro-sprint today.',
            },
          },
        ],
      };
    };

    const convRes = await testProvider.generateResponse({
      userId: userAId,
      message: 'Give me motivation',
      conversationId: '507f1f77bcf86cd799439011',
      recentMessages: [{ sender: 'user', content: 'Give me motivation' }],
    });

    assert(convRes.toolsExecuted.length === 0, 'No tools executed for plain motivational prompt');
    assert(convRes.reply.includes('Consistency is your greatest superpower'), 'Returns conversational assistant content');

    // ----------------------------------------------------
    // TEST 3: Tool Calling - create_goal
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Tool Calling - create_goal ---');
    let callCount = 0;
    mockClient.chat.completions.create = async (params: any) => {
      callCount++;
      if (callCount === 1) {
        // Model decides to call create_goal
        return {
          id: 'chatcmpl-tool-create-goal',
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call_create_goal_1',
                    type: 'function',
                    function: {
                      name: 'create_goal',
                      arguments: JSON.stringify({
                        title: 'Learn Rust in 21 Days',
                        category: 'learning',
                        targetDays: 21,
                        dailyCommitmentMinutes: 20,
                      }),
                    },
                  },
                ],
              },
            },
          ],
        };
      } else {
        // Model receives tool result and produces natural reply
        return {
          id: 'chatcmpl-tool-create-goal-final',
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'I have set up your 21-day Rust learning roadmap with Day 1 scheduled!',
              },
            },
          ],
        };
      }
    };

    const goalToolRes = await testProvider.generateResponse({
      userId: userAId,
      message: 'I want to learn Rust in 21 days',
      conversationId: '507f1f77bcf86cd799439011',
      recentMessages: [],
    });

    assert(goalToolRes.toolsExecuted.length === 1, 'Tool create_goal executed');
    assert(goalToolRes.toolsExecuted[0].tool === 'create_goal', 'Tool name matched create_goal');
    assert(goalToolRes.toolsExecuted[0].success === true, 'Goal created successfully in MongoDB');
    const createdGoalId = goalToolRes.toolsExecuted[0].data.goalId;
    assert(Boolean(createdGoalId), 'MongoDB ObjectId returned for created goal');

    // Verify in MongoDB
    const dbGoal = await Goal.findById(createdGoalId);
    assert(dbGoal !== null && dbGoal.title === 'Learn Rust in 21 Days', 'Goal verified in MongoDB');
    const kickoffTask = await Task.findOne({ goalId: dbGoal?._id });
    assert(kickoffTask !== null, 'Day 1 kickoff task auto-created in MongoDB');

    // ----------------------------------------------------
    // TEST 4: Tool Calling - complete_task
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Tool Calling - complete_task ---');
    callCount = 0;
    mockClient.chat.completions.create = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          id: 'chatcmpl-complete-task',
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call_comp_1',
                    type: 'function',
                    function: {
                      name: 'complete_task',
                      arguments: JSON.stringify({
                        taskId: kickoffTask?._id.toString(),
                      }),
                    },
                  },
                ],
              },
            },
          ],
        };
      } else {
        return {
          id: 'chatcmpl-comp-final',
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Great job! Day 1 task marked complete. Streak incremented!',
              },
            },
          ],
        };
      }
    };

    const compRes = await testProvider.generateResponse({
      userId: userAId,
      message: 'I finished my Day 1 task',
      conversationId: '507f1f77bcf86cd799439011',
      recentMessages: [],
    });

    assert(compRes.toolsExecuted.length === 1, 'complete_task tool executed');
    assert(compRes.toolsExecuted[0].success === true, 'Task completed successfully');
    const updatedTask = await Task.findById(kickoffTask?._id);
    assert(updatedTask?.status === 'completed' && Boolean(updatedTask?.completedAt), 'Task status is completed with timestamp in MongoDB');

    // ----------------------------------------------------
    // TEST 5: Tool Calling - adapt_task
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Tool Calling - adapt_task ---');
    // Create a new task to adapt
    const taskToAdapt = await Task.create({
      userId: userA._id,
      goalId: dbGoal?._id,
      goalTitle: dbGoal?.title,
      title: 'Day 2 Heavy Systems Chapter',
      durationMinutes: 45,
      difficulty: 'challenging',
      scheduledFor: 'Today',
      dayNumber: 2,
      category: 'learning',
    });

    callCount = 0;
    mockClient.chat.completions.create = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call_adapt_1',
                    type: 'function',
                    function: {
                      name: 'adapt_task',
                      arguments: JSON.stringify({
                        taskId: taskToAdapt._id.toString(),
                        newDurationMinutes: 15,
                        adaptationNote: 'Scaled down to 15m micro-sprint due to hectic workday.',
                      }),
                    },
                  },
                ],
              },
            },
          ],
        };
      } else {
        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Never Miss Twice! I scaled your 45m task down to 15m so you can keep momentum.',
              },
            },
          ],
        };
      }
    };

    const adaptRes = await testProvider.generateResponse({
      userId: userAId,
      message: 'I am exhausted today and cannot do 45 minutes',
      conversationId: '507f1f77bcf86cd799439011',
      recentMessages: [],
    });

    assert(adaptRes.toolsExecuted.length === 1, 'adapt_task executed');
    const adaptedDbTask = await Task.findById(taskToAdapt._id);
    assert(adaptedDbTask?.durationMinutes === 15 && adaptedDbTask?.status === 'adapted', 'Task duration reduced to 15m with adapted status in MongoDB');

    // ----------------------------------------------------
    // TEST 6: Tool Calling - adapt_habit_plan
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Tool Calling - adapt_habit_plan ---');
    callCount = 0;
    mockClient.chat.completions.create = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call_plan_1',
                    type: 'function',
                    function: {
                      name: 'adapt_habit_plan',
                      arguments: JSON.stringify({
                        reason: 'busy',
                        targetMinutes: 10,
                      }),
                    },
                  },
                ],
              },
            },
          ],
        };
      } else {
        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'I have calibrated your upcoming pending tasks down to 10m sessions.',
              },
            },
          ],
        };
      }
    };

    const planRes = await testProvider.generateResponse({
      userId: userAId,
      message: 'I have exam week, adapt all my habits to lighter load',
      conversationId: '507f1f77bcf86cd799439011',
      recentMessages: [],
    });

    assert(planRes.toolsExecuted.length === 1, 'adapt_habit_plan executed');
    assert(planRes.toolsExecuted[0].success === true, 'Bulk plan adaptation succeeded');

    // ----------------------------------------------------
    // TEST 7: Tool Calling - record_checkin
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Tool Calling - record_checkin ---');
    callCount = 0;
    mockClient.chat.completions.create = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call_chk_1',
                    type: 'function',
                    function: {
                      name: 'record_checkin',
                      arguments: JSON.stringify({
                        status: 'great',
                        reflection: 'Pushed through and finished all micro-commitments today!',
                        adaptTomorrow: false,
                      }),
                    },
                  },
                ],
              },
            },
          ],
        };
      } else {
        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Daily check-in logged! Proud of your execution today.',
              },
            },
          ],
        };
      }
    };

    const checkInRes = await testProvider.generateResponse({
      userId: userAId,
      message: 'Checking in for today, completed everything',
      conversationId: '507f1f77bcf86cd799439011',
      recentMessages: [],
    });

    assert(checkInRes.toolsExecuted.length === 1, 'record_checkin executed');
    assert(checkInRes.toolsExecuted[0].data.status === 'great', 'Check-in saved with status great');

    // ----------------------------------------------------
    // TEST 8: Tool Calling - get_progress_summary
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Tool Calling - get_progress_summary ---');
    callCount = 0;
    mockClient.chat.completions.create = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call_summary_1',
                    type: 'function',
                    function: {
                      name: 'get_progress_summary',
                      arguments: '{}',
                    },
                  },
                ],
              },
            },
          ],
        };
      } else {
        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'You have a 100% consistency rate today with 1 active goal.',
              },
            },
          ],
        };
      }
    };

    const summaryRes = await testProvider.generateResponse({
      userId: userAId,
      message: 'How is my consistency doing?',
      conversationId: '507f1f77bcf86cd799439011',
      recentMessages: [],
    });

    assert(summaryRes.toolsExecuted.length === 1, 'get_progress_summary executed');
    assert(summaryRes.toolsExecuted[0].data.activeGoalsCount >= 1, 'Summary calculates active goals from MongoDB');

    // ----------------------------------------------------
    // TEST 9: Remaining Tools (get_user_goals, create_tasks, update_goal)
    // ----------------------------------------------------
    console.log('\n--- TEST 9: Remaining Tools (get_user_goals, create_tasks, update_goal) ---');
    const goalsList = await ToolExecutor.execute(userAId, 'get_user_goals', {});
    assert(goalsList.success === true && goalsList.data.length >= 1, 'Tool get_user_goals retrieves user roadmaps');

    const newTaskCreated = await ToolExecutor.execute(userAId, 'create_tasks', {
      goalId: createdGoalId,
      title: 'Day 3 Async Rust Sprint',
      durationMinutes: 15,
      dayNumber: 3,
    });
    assert(newTaskCreated.success === true, 'Tool create_tasks creates milestone task');

    const updateGoalRes = await ToolExecutor.execute(userAId, 'update_goal', {
      goalId: createdGoalId,
      dailyCommitmentMinutes: 25,
      adaptationNotice: 'Upgraded daily target to 25m',
    });
    assert(updateGoalRes.success === true && updateGoalRes.data.dailyCommitmentMinutes === 25, 'Tool update_goal updates parameters in MongoDB');

    // ----------------------------------------------------
    // TEST 10: Multiple Sequential Tool Calls Loop
    // ----------------------------------------------------
    console.log('\n--- TEST 10: Multiple Sequential Tool Calls Loop ---');
    callCount = 0;
    mockClient.chat.completions.create = async () => {
      callCount++;
      if (callCount === 1) {
        // Step 1: Model calls get_today_tasks
        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'seq_call_1',
                    type: 'function',
                    function: {
                      name: 'get_today_tasks',
                      arguments: '{}',
                    },
                  },
                ],
              },
            },
          ],
        };
      } else if (callCount === 2) {
        // Step 2: Model receives task list, then sequentially calls get_progress_summary
        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'seq_call_2',
                    type: 'function',
                    function: {
                      name: 'get_progress_summary',
                      arguments: '{}',
                    },
                  },
                ],
              },
            },
          ],
        };
      } else {
        // Step 3: Model finishes
        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'I have reviewed your active tasks and overall progress statistics.',
              },
            },
          ],
        };
      }
    };

    const multiToolRes = await testProvider.generateResponse({
      userId: userAId,
      message: 'Review my day and summary',
      conversationId: '507f1f77bcf86cd799439011',
      recentMessages: [],
    });

    assert(multiToolRes.toolsExecuted.length === 2, 'Executed 2 sequential tool calls');
    assert(multiToolRes.toolsExecuted[0].tool === 'get_today_tasks', 'First sequential tool was get_today_tasks');
    assert(multiToolRes.toolsExecuted[1].tool === 'get_progress_summary', 'Second sequential tool was get_progress_summary');

    // ----------------------------------------------------
    // TEST 11: Invalid Tool Arguments Handling
    // ----------------------------------------------------
    console.log('\n--- TEST 11: Invalid Tool Arguments Handling ---');
    callCount = 0;
    mockClient.chat.completions.create = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call_invalid_args',
                    type: 'function',
                    function: {
                      name: 'create_goal',
                      arguments: '{}', // Missing required 'title'
                    },
                  },
                ],
              },
            },
          ],
        };
      } else {
        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Could you please specify a title for the goal?',
              },
            },
          ],
        };
      }
    };

    const invalidArgsRes = await testProvider.generateResponse({
      userId: userAId,
      message: 'Create a goal without title',
      conversationId: '507f1f77bcf86cd799439011',
      recentMessages: [],
    });

    assert(invalidArgsRes.toolsExecuted.length === 1, 'Tool was invoked');
    assert(invalidArgsRes.toolsExecuted[0].success === false, 'Tool validation caught missing argument gracefully');
    assert(invalidArgsRes.toolsExecuted[0].error?.includes('title is required'), 'Helpful validation error returned');

    // ----------------------------------------------------
    // TEST 12: Provider Rate Limit (429) Handling
    // ----------------------------------------------------
    console.log('\n--- TEST 12: Provider Rate Limit (429) Handling ---');
    mockClient.chat.completions.create = async () => {
      const err: any = new Error('Rate limit exceeded on Groq Free Tier');
      err.status = 429;
      err.headers = { 'retry-after': '30s' };
      throw err;
    };

    const rateLimitRes = await testProvider.generateResponse({
      userId: userAId,
      message: 'Test rate limit',
      conversationId: '507f1f77bcf86cd799439011',
      recentMessages: [],
    });

    assert(rateLimitRes.reply.includes('rate limit reached on Free Tier'), 'Rate limit cleanly reported to user');
    assert(rateLimitRes.reply.includes('30s'), 'Retry-After duration surfaced to user');

    // ----------------------------------------------------
    // TEST 13: Authentication & Multi-Tenant User Isolation
    // ----------------------------------------------------
    console.log('\n--- TEST 13: Authentication & Multi-Tenant User Isolation ---');
    // User B tries to complete User A's task
    const userBTamperRes = await ToolExecutor.execute(userBId, 'complete_task', {
      taskId: kickoffTask?._id.toString(),
    });
    assert(userBTamperRes.success === false, 'User B blocked from modifying User A task via tool');
    assert(userBTamperRes.error?.includes('not found') || userBTamperRes.error?.includes('Access denied'), 'Tenant isolation confirmed: 404/Access denied');

    // User B queries goals: must be empty
    const userBGoals = await ToolExecutor.execute(userBId, 'get_user_goals', {});
    assert(userBGoals.success === true && userBGoals.data.length === 0, 'User B has isolated empty goals list');

    // ----------------------------------------------------
    // TEST 14: End-to-End AIService with Conversation History
    // ----------------------------------------------------
    console.log('\n--- TEST 14: AIService End-to-End Execution & MongoDB Persistence ---');
    (AIService as any).groqProvider.clientOverride = mockClient;

    mockClient.chat.completions.create = async () => {
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Your habit journey is progressing well! Stay consistent.',
            },
          },
        ],
      };
    };

    const e2eResult = await AIService.processUserMessage({
      userId: userAId,
      message: 'Check in on my habits',
    });

    assert(Boolean(e2eResult.conversationId), 'Conversation created in MongoDB');
    assert(e2eResult.reply.includes('Stay consistent'), 'Reply generated through Groq provider');

    // Verify messages saved to MongoDB
    const savedMessages = await Message.find({ conversationId: e2eResult.conversationId });
    assert(savedMessages.length === 2, 'Both user message and agent reply persisted in MongoDB');
    assert(savedMessages[0].sender === 'user' && savedMessages[1].sender === 'agent', 'Message roles properly tagged');

    // Restore original create method
    delete (AIService as any).groqProvider.clientOverride;
    mockClient.chat.completions.create = origCreate;
    process.env.AI_PROVIDER = originalProvider || 'groq';

  } catch (suiteErr: any) {
    console.error('Groq test suite error:', suiteErr);
    failed++;
  } finally {
    await disconnectDB();
  }

  console.log('\n==================================================');
  console.log(`GROQ TEST SUITE RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runGroqSuite();
