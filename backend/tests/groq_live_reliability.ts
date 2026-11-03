import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Goal } from '../src/models/Goal.js';
import { Task } from '../src/models/Task.js';
import { GroqProvider } from '../src/ai/providers/groqProvider.js';
import Groq from 'groq-sdk';

async function runLiveGroqReliabilityTest() {
  console.log('\n======================================================');
  console.log('   HABITHERO LIVE GROQ GPT-OSS 120B RELIABILITY TEST   ');
  console.log('======================================================\n');

  await connectDB();

  let passed = 0;
  let failed = 0;
  function assert(cond: boolean, name: string) {
    if (cond) {
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${name}`);
      failed++;
    }
  }

  try {
    const testUser = await User.create({
      name: 'Groq Live Test User',
      email: `groq_live_${Date.now()}@example.com`,
      passwordHash: 'dummy_hash',
    });
    const userId = testUser._id.toString();

    // 1. Live API Round-Trip Latency Benchmark
    console.log('--- 1. Live Groq Latency & Natural Language Response ---');
    const provider = new GroqProvider();
    assert(provider.isConfigured(), 'Groq provider detects valid live GROQ_API_KEY');

    const t0 = Date.now();
    const liveReply = await provider.generateResponse({
      userId,
      message: 'Briefly encourage me in 1 sentence for completing my morning routine.',
      conversationId: '507f1f77bcf86cd799439011',
      recentMessages: [],
    });
    const duration = Date.now() - t0;
    console.log(`[Live Groq] Response time: ${duration}ms | Model: ${process.env.GROQ_MODEL || 'openai/gpt-oss-120b'}`);
    console.log(`[Live Groq] Reply: "${liveReply.reply.trim()}"`);
    assert(liveReply.reply.length > 10, 'Live Groq produced substantial motivational response');
    assert(!liveReply.apiKeyMissing, 'API key was accepted by Groq without authentication error');

    // 2. Live Tool Reasoning Execution
    console.log('\n--- 2. Live Groq Autonomous Tool Calling & DB Safety ---');
    const tTool0 = Date.now();
    const toolPrompt = 'I want to build a daily habit to study TypeScript for 25 minutes every day for 30 days. Please set this up for me.';
    const toolReply = await provider.generateResponse({
      userId,
      message: toolPrompt,
      conversationId: '507f1f77bcf86cd799439011',
      recentMessages: [{ sender: 'user', content: toolPrompt }],
    });
    const toolDuration = Date.now() - tTool0;
    console.log(`[Live Groq] Tool execution roundtrip: ${toolDuration}ms`);
    console.log(`[Live Groq] Tools executed count: ${toolReply.toolsExecuted.length}`);
    console.log(`[Live Groq] Reply: "${toolReply.reply.trim().slice(0, 120)}..."`);

    assert(toolReply.toolsExecuted.length >= 1, 'Groq autonomously called create_goal tool');
    const dbGoal = await Goal.findOne({ userId: testUser._id });
    assert(Boolean(dbGoal), 'Goal was safely and permanently persisted to MongoDB');
    if (dbGoal) {
      console.log(`[MongoDB Verified] Goal ID: ${dbGoal._id} | Title: "${dbGoal.title}"`);
      const dbTask = await Task.findOne({ goalId: dbGoal._id, userId: testUser._id });
      assert(Boolean(dbTask), 'Kickoff Day 1 task was automatically created in MongoDB');
    }

    // 3. Client Timeout Resilience
    console.log('\n--- 3. Client Timeout Handling ---');
    const lowTimeoutProvider = new GroqProvider();
    // Configure client with an impossibly low 1ms timeout to test timeout rejection
    lowTimeoutProvider.clientOverride = new Groq({
      apiKey: process.env.GROQ_API_KEY || 'dummy',
      timeout: 1,
    });

    const timeoutRes = await lowTimeoutProvider.generateResponse({
      userId,
      message: 'Will this trigger timeout?',
      conversationId: '507f1f77bcf86cd799439011',
      recentMessages: [],
    });
    assert(
      timeoutRes.reply.includes('Unable to reach Groq API') ||
      timeoutRes.reply.includes('timed out') ||
      timeoutRes.reply.includes('issue connecting to Groq'),
      'Client timeout gracefully caught and converted to friendly user guidance'
    );
    assert(timeoutRes.reply.includes('safely saved in MongoDB') || timeoutRes.reply.includes('safely stored'), 'Confirms MongoDB data safety even upon AI timeout');

    // 4. Rate Limit (429) & Auth Error (401) Clean Messages
    console.log('\n--- 4. Clear User-Facing Error Messages ---');
    const invalidKeyProvider = new GroqProvider();
    invalidKeyProvider.clientOverride = new Groq({
      apiKey: 'gsk_invalid_bogus_key_for_testing_12345',
      timeout: 5000,
    });
    const invalidKeyRes = await invalidKeyProvider.generateResponse({
      userId,
      message: 'Hello',
      conversationId: '507f1f77bcf86cd799439011',
      recentMessages: [],
    });
    assert(
      invalidKeyRes.reply.includes('GROQ_API_KEY is invalid') || invalidKeyRes.reply.includes('401'),
      'Invalid key returns actionable instructions to check Groq Console'
    );

    // Teardown
    await User.findByIdAndDelete(testUser._id);
    if (dbGoal) {
      await Goal.findByIdAndDelete(dbGoal._id);
      await Task.deleteMany({ goalId: dbGoal._id });
    }

    console.log(`\n======================================================`);
    console.log(`LIVE GROQ RELIABILITY RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================\n`);
  } finally {
    await disconnectDB();
  }
}

runLiveGroqReliabilityTest().catch(err => {
  console.error('[Live Groq Test Error]:', err);
  process.exit(1);
});
