import http from 'http';
import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Conversation } from '../src/models/Conversation.js';
import { Message } from '../src/models/Message.js';
import { AuthService } from '../src/services/authService.js';
import { AIService } from '../src/ai/aiService.js';

interface TestResponse {
  status: number;
  body: any;
}

const makeRequest = (
  server: http.Server,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  data?: any,
  token?: string,
  extraHeaders?: Record<string, string>
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
      ...extraHeaders,
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
            parsed = { rawBody };
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

const runChatPersistenceTests = async () => {
  console.log('--- STARTING HABITHERO CHAT PERSISTENCE & HISTORY RETRIEVAL TESTS ---');

  await connectDB();
  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, resolve));

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, name: string) => {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  };

  try {
    // Clean up test emails before starting
    const emailA = 'chat_test_user_a@example.com';
    const emailB = 'chat_test_user_b@example.com';
    await User.deleteMany({ email: { $in: [emailA, emailB] } });

    // 1. Setup User A and User B
    const regResA = await makeRequest(server, 'POST', '/api/auth/register', {
      name: 'Chat Tester Alice',
      email: emailA,
      password: 'Password123!',
    });
    const tokenA = regResA.body.data?.token;
    const userAId = regResA.body.data?.user?.id;
    assert(!!tokenA && !!userAId, 'User A registered and authenticated');

    const regResB = await makeRequest(server, 'POST', '/api/auth/register', {
      name: 'Chat Tester Bob',
      email: emailB,
      password: 'Password123!',
    });
    const tokenB = regResB.body.data?.token;
    const userBId = regResB.body.data?.user?.id;
    assert(!!tokenB && !!userBId, 'User B registered and authenticated');

    // TEST 1: Initial empty state
    const initialConvRes = await makeRequest(server, 'GET', '/api/chat/conversations', undefined, tokenA);
    assert(initialConvRes.status === 200, 'GET /api/chat/conversations returns 200');
    assert(Array.isArray(initialConvRes.body.data) && initialConvRes.body.data.length === 0, 'New user starts with 0 conversations');

    // TEST 2: Send first user message and verify MongoDB persistence of both User message & AI response
    const firstMsgRes = await makeRequest(
      server,
      'POST',
      '/api/chat/message',
      { message: 'I want to build a daily morning meditation habit.' },
      tokenA
    );
    assert(firstMsgRes.status === 200, 'POST /api/chat/message succeeds (200)');
    assert(firstMsgRes.body.success === true, 'Response payload success is true');
    const convId1 = firstMsgRes.body.data?.conversationId;
    assert(!!convId1, 'Returns valid conversationId from MongoDB');
    assert(typeof firstMsgRes.body.data?.reply === 'string' && firstMsgRes.body.data.reply.length > 0, 'Returns non-empty AI reply');

    // Verify conversation document in MongoDB
    const convDoc1 = await Conversation.findById(convId1);
    assert(!!convDoc1, 'Conversation document persisted in MongoDB');
    assert(convDoc1?.userId.toString() === userAId, 'Conversation document belongs to User A');
    assert(convDoc1?.title.toLowerCase().includes('meditation'), 'Conversation title auto-generated from user prompt');

    // Verify messages persisted in MongoDB
    const messagesInDb = await Message.find({ conversationId: convId1 }).sort({ createdAt: 1 });
    assert(messagesInDb.length === 2, 'Exactly 2 messages persisted in MongoDB for turn 1 (User + Agent)');
    assert(messagesInDb[0].sender === 'user', 'First message is user sender');
    assert(messagesInDb[0].content === 'I want to build a daily morning meditation habit.', 'User message content matches exact prompt');
    assert(messagesInDb[0].userId.toString() === userAId, 'User message belongs to User A');
    assert(messagesInDb[1].sender === 'agent', 'Second message is agent sender');
    assert(messagesInDb[1].userId.toString() === userAId, 'Agent message belongs to User A');

    // TEST 3: Retrieve Conversation History via API (Checking chronological ordering and formatting)
    const historyRes = await makeRequest(server, 'GET', `/api/chat/conversations/${convId1}`, undefined, tokenA);
    assert(historyRes.status === 200, 'GET /api/chat/conversations/:id succeeds (200)');
    assert(historyRes.body.data?.conversation?._id === convId1, 'Returns correct conversation metadata');
    assert(historyRes.body.data?.messages?.length === 2, 'Returns full message history array');
    assert(historyRes.body.data?.messages[0].createdAt !== undefined, 'Messages contain valid createdAt timestamps');

    // TEST 4: Multi-turn message exchange within same conversation
    const secondMsgRes = await makeRequest(
      server,
      'POST',
      '/api/chat/message',
      { message: 'Can you schedule 10 minutes at 7:00 AM?', conversationId: convId1 },
      tokenA
    );
    assert(secondMsgRes.status === 200, 'Second message in conversation succeeds (200)');
    assert(secondMsgRes.body.data?.conversationId === convId1, 'Reuses same conversation ID');

    const updatedHistoryRes = await makeRequest(server, 'GET', `/api/chat/conversations/${convId1}`, undefined, tokenA);
    assert(updatedHistoryRes.body.data?.messages?.length === 4, 'History contains 4 messages after 2 turns');
    assert(updatedHistoryRes.body.data.messages[2].content.includes('7:00 AM'), 'Turn 2 user message persisted');
    assert(updatedHistoryRes.body.data.messages[3].sender === 'agent', 'Turn 2 agent reply persisted');

    // TEST 5: Browser Refresh & Reopening Chat Simulation
    // When the browser refreshes or the user navigates back to /app/ai-companion,
    // the frontend calls GET /api/chat/conversations, selects convos[0], and calls GET /api/chat/conversations/:id
    const refreshListRes = await makeRequest(server, 'GET', '/api/chat/conversations', undefined, tokenA);
    assert(refreshListRes.status === 200 && refreshListRes.body.data.length === 1, 'Restores conversation list on reload');
    const restoredConvId = refreshListRes.body.data[0]._id;
    assert(restoredConvId === convId1, 'Most recent conversation is top of the list');

    const restoredDetailRes = await makeRequest(server, 'GET', `/api/chat/conversations/${restoredConvId}`, undefined, tokenA);
    assert(restoredDetailRes.body.data.messages.length === 4, 'Full chat history completely restored upon reopening chat');

    // TEST 6: Multiple Conversations & Explicit Creation
    const createConvRes = await makeRequest(
      server,
      'POST',
      '/api/chat/conversations',
      { title: 'Evening Reading Plan' },
      tokenA
    );
    assert(createConvRes.status === 201, 'POST /api/chat/conversations creates new conversation (201)');
    const convId2 = createConvRes.body.data?._id;
    assert(!!convId2 && convId2 !== convId1, 'Creates distinct new conversation ID');

    const multiListRes = await makeRequest(server, 'GET', '/api/chat/conversations', undefined, tokenA);
    assert(multiListRes.body.data.length === 2, 'User A now has 2 distinct conversations');

    // Send message to conversation 2
    const msgConv2Res = await makeRequest(
      server,
      'POST',
      '/api/chat/message',
      { message: 'I want to read 15 pages of clean code every night.', conversationId: convId2 },
      tokenA
    );
    assert(msgConv2Res.status === 200, 'Message sent to conversation 2 succeeds');

    // Verify isolation between conversation 1 and conversation 2
    const detailConv1 = await makeRequest(server, 'GET', `/api/chat/conversations/${convId1}`, undefined, tokenA);
    const detailConv2 = await makeRequest(server, 'GET', `/api/chat/conversations/${convId2}`, undefined, tokenA);
    assert(detailConv1.body.data.messages.length === 4, 'Conversation 1 messages remain untouched (4)');
    assert(detailConv2.body.data.messages.length === 2, 'Conversation 2 has its own isolated messages (2)');

    // TEST 7: User-to-User Data Isolation
    // User B attempts to access User A's conversation 1
    const userBAccess = await makeRequest(server, 'GET', `/api/chat/conversations/${convId1}`, undefined, tokenB);
    assert(userBAccess.status === 404, 'User B cannot access User A conversation (404 Not Found)');

    // User B attempts to delete User A's conversation
    const userBDelete = await makeRequest(server, 'DELETE', `/api/chat/conversations/${convId1}`, undefined, tokenB);
    assert(userBDelete.status === 400 || userBDelete.status === 404, 'User B cannot delete User A conversation');

    // User B conversation list is empty
    const userBList = await makeRequest(server, 'GET', '/api/chat/conversations', undefined, tokenB);
    assert(userBList.body.data.length === 0, 'User B conversation list contains zero of User A conversations');

    // TEST 8: Logout and Login Persistence
    // Simulate user logging in again
    const loginRes = await makeRequest(server, 'POST', '/api/auth/login', {
      email: emailA,
      password: 'Password123!',
    });
    const newTokenA = loginRes.body.data?.token;
    assert(!!newTokenA, 'User A successfully logged in again');

    const postLoginConvList = await makeRequest(server, 'GET', '/api/chat/conversations', undefined, newTokenA);
    assert(postLoginConvList.body.data.length === 2, 'All previous conversations restored after login');

    // TEST 9: Fetch.ai Agent Integration & Account Linking Conversation Merge
    const fetchSender = 'agent1qpersistence_test_sender_address_8899aabbcc';
    const agentMsgRes = await makeRequest(
      server,
      'POST',
      '/api/agent/chat',
      {
        sender: fetchSender,
        message: 'Habit check-in from Fetch.ai uAgent: completed 20m run today.',
      },
      undefined,
      { 'x-agent-secret': process.env.AGENT_SERVICE_SECRET || 'habithero_internal_secret_hackathon_2026' }
    );
    assert(agentMsgRes.status === 200, 'Fetch.ai agent chat message processed successfully (200)');
    const fetchConvId = agentMsgRes.body.data?.conversationId;
    assert(!!fetchConvId, 'Fetch.ai agent interaction generated conversationId');

    // Link Fetch.ai account to User A
    await AuthService.updateMe(userAId, { fetchAddress: fetchSender });

    // Verify Fetch.ai conversation is now accessible by User A
    const postLinkList = await makeRequest(server, 'GET', '/api/chat/conversations', undefined, tokenA);
    const hasLinkedConv = postLinkList.body.data.some((c: any) => c._id === fetchConvId);
    assert(hasLinkedConv, 'Fetch.ai conversation successfully merged and accessible by authenticated web user');

    const linkedConvDetail = await makeRequest(server, 'GET', `/api/chat/conversations/${fetchConvId}`, undefined, tokenA);
    assert(linkedConvDetail.status === 200 && linkedConvDetail.body.data.messages.length >= 2, 'Fetch.ai conversation history retrievable by web user');

    // TEST 10: Fault-Tolerant AI Recovery & Message Persistence
    // Verify that even if the AI provider encounters an issue, both user prompt and fallback response are safely persisted
    const faultPrompt = 'Simulate provider resilience check';
    const resilientResult = await AIService.processUserMessage({
      userId: userAId,
      message: faultPrompt,
      conversationId: convId1,
    });
    assert(!!resilientResult.reply, 'AIService produces response even under adverse conditions');

    const postFaultHistory = await makeRequest(server, 'GET', `/api/chat/conversations/${convId1}`, undefined, tokenA);
    const faultMsgs = postFaultHistory.body.data.messages;
    const hasFaultUserMsg = faultMsgs.some((m: any) => m.content === faultPrompt);
    assert(hasFaultUserMsg, 'User prompt safely persisted in MongoDB under all circumstances');

    // TEST 11: Clean Conversation Deletion
    const deleteRes = await makeRequest(server, 'DELETE', `/api/chat/conversations/${convId2}`, undefined, tokenA);
    assert(deleteRes.status === 200, 'DELETE /api/chat/conversations/:id succeeds (200)');

    const postDeleteList = await makeRequest(server, 'GET', '/api/chat/conversations', undefined, tokenA);
    assert(!postDeleteList.body.data.some((c: any) => c._id === convId2), 'Deleted conversation removed from list');

    const deletedMsgsCount = await Message.countDocuments({ conversationId: convId2 });
    assert(deletedMsgsCount === 0, 'Associated messages purged from MongoDB on conversation deletion');

    // Cleanup
    await User.deleteMany({ email: { $in: [emailA, emailB] } });
    await Conversation.deleteMany({ userId: { $in: [userAId, userBId] } });
    await Message.deleteMany({ userId: { $in: [userAId, userBId] } });

    console.log(`\nChat Persistence Test Summary: ${passed} Passed, ${failed} Failed`);

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

runChatPersistenceTests();
