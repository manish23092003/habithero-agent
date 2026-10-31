import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Conversation } from '../src/models/Conversation.js';
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

    console.log(`\nAgent Endpoint Test Summary: ${passed} Passed, ${failed} Failed`);

    // Clean up test documents
    if (userA) {
      await User.deleteOne({ _id: userA._id });
      await Conversation.deleteMany({ userId: userA._id });
    }
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
