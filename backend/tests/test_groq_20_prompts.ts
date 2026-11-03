import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Goal } from '../src/models/Goal.js';
import { Task } from '../src/models/Task.js';
import { CheckIn } from '../src/models/CheckIn.js';
import { GroqProvider } from '../src/ai/providers/groqProvider.js';

interface PromptResult {
  index: number;
  type: 'chat' | 'tool';
  prompt: string;
  durationMs: number;
  toolsExecuted: string[];
  replySnippet: string;
  dbVerified: boolean;
  success: boolean;
  error?: string;
}

function calculatePercentiles(values: number[]) {
  if (values.length === 0) return { p50: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const avg = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  const p99 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];
  return {
    min: sorted[0],
    p50,
    p95,
    p99,
    max: sorted[sorted.length - 1],
    avg,
  };
}

async function runGroq20PromptsBenchmark() {
  console.log('\n===============================================================');
  console.log('   HABITHERO REAL GROQ GPT-OSS 120B LATENCY BENCHMARK (20 PROMPTS) ');
  console.log('===============================================================\n');

  await connectDB();

  const provider = new GroqProvider();
  if (!provider.isConfigured()) {
    throw new Error('GROQ_API_KEY is not configured in backend/.env');
  }

  // Create test user and initial baseline goal/task
  const testUser = await User.create({
    name: 'Groq Benchmark User',
    email: `groq_bench_${Date.now()}@example.com`,
    passwordHash: 'dummy_hash',
  });
  const userId = testUser._id.toString();

  const baseGoal = await Goal.create({
    userId: testUser._id,
    title: 'Daily Coding Practice',
    category: 'learning',
    targetDays: 30,
    streak: 3,
  });

  const baseTask = await Task.create({
    userId: testUser._id,
    goalId: baseGoal._id,
    goalTitle: baseGoal.title,
    title: 'Complete LeetCode Problem #1',
    durationMinutes: 25,
    status: 'pending',
    scheduledFor: 'Today',
  });

  // 10 Normal Chat Prompts (No tools required)
  const chatPrompts = [
    'Give me a 1-sentence motivation for staying consistent with morning habits.',
    'Why is habit tracking more effective than relying on willpower alone?',
    'What should I do if I feel unmotivated before starting my 20-minute study session?',
    'Explain the concept of micro-sprints for building habits in simple terms.',
    'How do I bounce back after missing a single day without losing momentum?',
    'Give me 3 quick tips to avoid digital distractions during focus sessions.',
    'What is the difference between outcome-based goals and process-based habits?',
    'How does maintaining a daily streak affect habit formation psychology?',
    'What is a healthy mindset for handling busy days when time is tight?',
    'Summarize the core habit loop (cue, routine, reward) in two concise sentences.',
  ];

  // 10 Tool Execution Prompts (Requires invoking MongoDB tools)
  const toolPrompts = [
    'What tasks do I have scheduled for today?',
    'Show me all of my current active goals and progress.',
    'I just finished my coding task for today. Please mark it as completed.',
    'How is my overall habit consistency and streak looking right now?',
    'I feel exhausted today and only have 15 minutes. Can you adapt my pending tasks to shorter sprints?',
    'I want to start a new habit called "Daily Mindfulness Meditation" for 15 minutes a day for 21 days. Set it up.',
    'Record a check-in for me today with status "great" and note that I stayed focused.',
    'I want to add a milestone task to my Daily Coding Practice goal: "Read Chapter 4 of TypeScript Handbook" for 30 minutes.',
    'Check my progress summary and tell me my current active streaks.',
    'Can you adapt my habit plan because my schedule is hectic this week?',
  ];

  const results: PromptResult[] = [];

  try {
    // Phase A: Run Chat Prompts
    console.log('--- Phase A: Benchmarking 10 Normal Conversational Chat Prompts ---');
    for (let i = 0; i < chatPrompts.length; i++) {
      const promptText = chatPrompts[i];
      process.stdout.write(`  [Chat ${i + 1}/10] "${promptText.slice(0, 45)}..." `);
      const t0 = Date.now();
      try {
        const resp = await provider.generateResponse({
          userId,
          message: promptText,
          conversationId: '507f1f77bcf86cd799439011',
          recentMessages: [{ sender: 'user', content: promptText }],
        });
        const duration = Date.now() - t0;
        console.log(`-> ${duration}ms | Reply: ${resp.reply.length} chars | Tools: ${resp.toolsExecuted.length}`);
        results.push({
          index: i + 1,
          type: 'chat',
          prompt: promptText,
          durationMs: duration,
          toolsExecuted: resp.toolsExecuted.map(t => t.tool),
          replySnippet: resp.reply.trim().slice(0, 80).replace(/\n/g, ' '),
          dbVerified: true,
          success: true,
        });
      } catch (err: any) {
        const duration = Date.now() - t0;
        console.log(`-> FAILED (${duration}ms): ${err.message}`);
        results.push({
          index: i + 1,
          type: 'chat',
          prompt: promptText,
          durationMs: duration,
          toolsExecuted: [],
          replySnippet: '',
          dbVerified: false,
          success: false,
          error: err.message,
        });
      }
      // Small 1.5s spacing between prompts to respect free tier rate limit
      await new Promise(r => setTimeout(r, 1500));
    }

    // Phase B: Run Tool Prompts
    console.log('\n--- Phase B: Benchmarking 10 Tool Execution Prompts ---');
    for (let i = 0; i < toolPrompts.length; i++) {
      const promptText = toolPrompts[i];
      process.stdout.write(`  [Tool ${i + 1}/10] "${promptText.slice(0, 45)}..." `);
      const t0 = Date.now();
      try {
        const resp = await provider.generateResponse({
          userId,
          message: promptText,
          conversationId: '507f1f77bcf86cd799439011',
          recentMessages: [{ sender: 'user', content: promptText }],
        });
        const duration = Date.now() - t0;
        const toolNames = resp.toolsExecuted.map(t => t.tool);
        console.log(`-> ${duration}ms | Tools [${toolNames.join(', ')}] | Reply: ${resp.reply.length} chars`);

        // Verify DB side effects if tool executed
        let dbOk = true;
        if (toolNames.includes('create_goal')) {
          const g = await Goal.findOne({ userId: testUser._id, title: /Mindfulness/i });
          dbOk = Boolean(g);
        } else if (toolNames.includes('complete_task')) {
          const t = await Task.findOne({ _id: baseTask._id, status: 'completed' });
          dbOk = Boolean(t);
        } else if (toolNames.includes('record_checkin')) {
          const c = await CheckIn.findOne({ userId: testUser._id, status: 'great' });
          dbOk = Boolean(c);
        }

        results.push({
          index: 10 + i + 1,
          type: 'tool',
          prompt: promptText,
          durationMs: duration,
          toolsExecuted: toolNames,
          replySnippet: resp.reply.trim().slice(0, 80).replace(/\n/g, ' '),
          dbVerified: dbOk,
          success: true,
        });
      } catch (err: any) {
        const duration = Date.now() - t0;
        console.log(`-> FAILED (${duration}ms): ${err.message}`);
        results.push({
          index: 10 + i + 1,
          type: 'tool',
          prompt: promptText,
          durationMs: duration,
          toolsExecuted: [],
          replySnippet: '',
          dbVerified: false,
          success: false,
          error: err.message,
        });
      }
      // Small 1.5s spacing between prompts to respect free tier rate limit
      await new Promise(r => setTimeout(r, 1500));
    }

    // Teardown
    await User.findByIdAndDelete(testUser._id);
    await Goal.deleteMany({ userId: testUser._id });
    await Task.deleteMany({ userId: testUser._id });
    await CheckIn.deleteMany({ userId: testUser._id });

    // Compute Metrics
    const chatDurations = results.filter(r => r.type === 'chat' && r.success).map(r => r.durationMs);
    const toolDurations = results.filter(r => r.type === 'tool' && r.success).map(r => r.durationMs);
    const allDurations = results.filter(r => r.success).map(r => r.durationMs);

    const chatStats = calculatePercentiles(chatDurations);
    const toolStats = calculatePercentiles(toolDurations);
    const overallStats = calculatePercentiles(allDurations);

    console.log('\n===============================================================');
    console.log('              GROQ GPT-OSS 120B LATENCY STATS SUMMARY          ');
    console.log('===============================================================');
    console.log(`Total Prompts Tested: ${results.length} | Successful: ${results.filter(r => r.success).length}`);
    console.log('\n1. Normal Conversational Chat (10 Prompts):');
    console.table([chatStats]);

    console.log('\n2. Autonomous Tool Execution & DB Mutation (10 Prompts):');
    console.table([toolStats]);

    console.log('\n3. Overall Combined AI Latency (20 Prompts):');
    console.table([overallStats]);

    // Save JSON output
    fs.writeFileSync(
      path.resolve(process.cwd(), 'backend/tests/groq_20_prompts_results.json'),
      JSON.stringify({ chatStats, toolStats, overallStats, details: results }, null, 2),
      'utf-8'
    );
  } finally {
    await disconnectDB();
  }
}

runGroq20PromptsBenchmark().catch(err => {
  console.error('[Benchmark Error]:', err);
  process.exit(1);
});

