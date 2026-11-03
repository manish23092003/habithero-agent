import path from 'path';
import fs from 'fs';
import http, { Server } from 'http';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

import mongoose, { Types } from 'mongoose';
import { startServer } from './server.js';
import { User } from '../../src/models/User.js';
import { Goal } from '../../src/models/Goal.js';
import { Task } from '../../src/models/Task.js';
import { CheckIn } from '../../src/models/CheckIn.js';
import { GroqProvider } from '../../src/ai/providers/groqProvider.js';

const BASE_URL = 'http://127.0.0.1:5001/api';

interface BenchmarkRow {
  scenario: string;
  concurrency: number;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  avgMs: number;
  rps: number;
  serverHeapMB: number;
  eventLoopLagP95Ms: number;
  mongoConnections: number;
}

function calcQuantiles(durations: number[]) {
  if (durations.length === 0) return { p50: 0, p95: 0, p99: 0, avg: 0 };
  const sorted = [...durations].sort((a, b) => a - b);
  const avg = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  const p99 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];
  return { p50, p95, p99, avg };
}

function httpGet(url: string, headers: Record<string, string> = {}): Promise<{ status: number; duration: number; data: any }> {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const u = new URL(url);
    http.get(
      url,
      { headers },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          const duration = Date.now() - t0;
          try {
            resolve({ status: res.statusCode || 0, duration, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode || 0, duration, data });
          }
        });
      }
    ).on('error', err => {
      resolve({ status: 0, duration: Date.now() - t0, data: err.message });
    });
  });
}

function httpPost(url: string, body: any, headers: Record<string, string> = {}): Promise<{ status: number; duration: number; data: any }> {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const payload = JSON.stringify(body);
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...headers,
        },
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          const duration = Date.now() - t0;
          try {
            resolve({ status: res.statusCode || 0, duration, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode || 0, duration, data });
          }
        });
      }
    );
    req.on('error', err => {
      resolve({ status: 0, duration: Date.now() - t0, data: err.message });
    });
    req.write(payload);
    req.end();
  });
}

function httpPatch(url: string, body: any, headers: Record<string, string> = {}): Promise<{ status: number; duration: number; data: any }> {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const payload = JSON.stringify(body);
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...headers,
        },
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          const duration = Date.now() - t0;
          try {
            resolve({ status: res.statusCode || 0, duration, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode || 0, duration, data });
          }
        });
      }
    );
    req.on('error', err => {
      resolve({ status: 0, duration: Date.now() - t0, data: err.message });
    });
    req.write(payload);
    req.end();
  });
}

async function runFinalBetaLoadTest() {
  console.log('\n===============================================================');
  console.log('   HABITHERO FINAL BETA LOAD TEST & CAPACITY BENCHMARK        ');
  console.log('===============================================================\n');

  // Load synthetic user profiles
  const usersPath = path.resolve(process.cwd(), 'backend/tests/load/users.json');
  const users: any[] = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
  console.log(`[LoadTest] Loaded ${users.length} pre-seeded user accounts.`);

  let serverInstance: Server | null = null;
  const benchmarkRows: BenchmarkRow[] = [];

  try {
    serverInstance = await startServer();
    // Warmup
    await httpGet(`${BASE_URL}/health`);

    // -------------------------------------------------------------
    // SECTION 1: AUTHENTICATED CORE REST WORKFLOWS (MOCKED AI / NO AI)
    // Concurrencies: 25, 50, 100, 200 users
    // Workflows: GET /me, GET /goals, GET /tasks/today, POST /goals, PATCH /tasks/complete, POST /checkins
    // -------------------------------------------------------------
    console.log('\n--- SECTION 1: Authenticated Core REST Workflows (25, 50, 100, 200 Users) ---');
    const stages = [25, 50, 100, 200];

    for (const vus of stages) {
      const activeUsers = users.slice(0, vus);
      const durations: number[] = [];
      let successCount = 0;
      let errorCount = 0;

      const tStart = Date.now();

      // Run parallel user session loops
      await Promise.all(
        activeUsers.map(async (u, idx) => {
          const authH = { Authorization: `Bearer ${u.token}` };

          // Step 1: GET /auth/me
          const r1 = await httpGet(`${BASE_URL}/auth/me`, authH);
          durations.push(r1.duration);
          if (r1.status === 200) successCount++; else errorCount++;

          // Step 2: GET /goals
          const r2 = await httpGet(`${BASE_URL}/goals`, authH);
          durations.push(r2.duration);
          if (r2.status === 200) successCount++; else errorCount++;

          // Step 3: GET /tasks/today
          const r3 = await httpGet(`${BASE_URL}/tasks/today`, authH);
          durations.push(r3.duration);
          if (r3.status === 200) successCount++; else errorCount++;

          // Step 4: POST /goals (Create habit with idempotency)
          const r4 = await httpPost(
            `${BASE_URL}/goals`,
            {
              title: `Beta Habit VU ${idx} ${Date.now()}`,
              category: 'learning',
              targetDays: 21,
              idempotencyKey: `beta_idem_${idx}_${Date.now()}`,
            },
            authH
          );
          durations.push(r4.duration);
          if (r4.status === 201 || r4.status === 200) successCount++; else errorCount++;

          // Step 5: PATCH /tasks/:id/complete
          const r5 = await httpPatch(
            `${BASE_URL}/tasks/${u.taskId}/complete`,
            { completed: true, clientDate: '2026-11-02' },
            authH
          );
          durations.push(r5.duration);
          if (r5.status === 200) successCount++; else errorCount++;

          // Step 6: POST /checkins
          const r6 = await httpPost(
            `${BASE_URL}/checkins`,
            {
              date: '2026-11-02',
              status: 'great',
              completedTaskCount: 1,
              totalTaskCount: 1,
              reflection: `Checked in by user ${idx}`,
            },
            authH
          );
          durations.push(r6.duration);
          if (r6.status === 200 || r6.status === 201) successCount++; else errorCount++;
        })
      );

      const totalTimeSec = (Date.now() - tStart) / 1000;
      const totalRequests = durations.length;
      const rps = Math.round((totalRequests / totalTimeSec) * 10) / 10;
      const { p50, p95, p99, avg } = calcQuantiles(durations);

      // Query server metrics
      const mRes = await httpGet(`${BASE_URL}/loadtest/metrics`);
      const metrics = mRes.data;

      const row: BenchmarkRow = {
        scenario: 'Core REST Operations',
        concurrency: vus,
        totalRequests,
        successCount,
        errorCount,
        p50Ms: p50,
        p95Ms: p95,
        p99Ms: p99,
        avgMs: avg,
        rps,
        serverHeapMB: metrics?.memory?.heapUsedMB || 0,
        eventLoopLagP95Ms: metrics?.eventLoopDelayMs?.p95 || 0,
        mongoConnections: metrics?.mongodb?.connectionsCurrent || 0,
      };

      benchmarkRows.push(row);
      console.log(`  ✓ Completed ${vus} VUs: ${totalRequests} requests in ${totalTimeSec.toFixed(1)}s (RPS: ${rps} | p50: ${p50}ms | p95: ${p95}ms | Errors: ${errorCount})`);
      await new Promise(r => setTimeout(r, 1000));
    }

    // -------------------------------------------------------------
    // SECTION 2: BCRYPT LOGIN BURST (CONCURRENT AUTH SPIKE)
    // Concurrencies: 25, 50, 100 simultaneous POST /auth/login
    // -------------------------------------------------------------
    console.log('\n--- SECTION 2: Bcrypt Login Burst Stress Test ---');
    const loginStages = [25, 50, 100];
    for (const vus of loginStages) {
      const activeUsers = users.slice(0, vus);
      const durations: number[] = [];
      let successCount = 0;
      let errorCount = 0;

      const tStart = Date.now();
      await Promise.all(
        activeUsers.map(async u => {
          const res = await httpPost(`${BASE_URL}/auth/login`, {
            email: u.email,
            password: u.password,
          });
          durations.push(res.duration);
          if (res.status === 200) successCount++; else errorCount++;
        })
      );

      const totalTimeSec = (Date.now() - tStart) / 1000;
      const rps = Math.round((durations.length / totalTimeSec) * 10) / 10;
      const { p50, p95, p99, avg } = calcQuantiles(durations);

      const mRes = await httpGet(`${BASE_URL}/loadtest/metrics`);
      const metrics = mRes.data;

      const row: BenchmarkRow = {
        scenario: 'Bcrypt Login Spike',
        concurrency: vus,
        totalRequests: durations.length,
        successCount,
        errorCount,
        p50Ms: p50,
        p95Ms: p95,
        p99Ms: p99,
        avgMs: avg,
        rps,
        serverHeapMB: metrics?.memory?.heapUsedMB || 0,
        eventLoopLagP95Ms: metrics?.eventLoopDelayMs?.p95 || 0,
        mongoConnections: metrics?.mongodb?.connectionsCurrent || 0,
      };
      benchmarkRows.push(row);
      console.log(`  ✓ Login Burst ${vus} simultaneous users: ${durations.length} logins in ${totalTimeSec.toFixed(1)}s (p50: ${p50}ms | p95: ${p95}ms | Errors: ${errorCount})`);
      await new Promise(r => setTimeout(r, 1000));
    }

    // -------------------------------------------------------------
    // SECTION 3: REAL AI CONVERSATIONS (LIVE GROQ PROVIDER)
    // Testing real AI latency with 1, 5, 10 users to observe WAN inference behavior
    // -------------------------------------------------------------
    console.log('\n--- SECTION 3: Live Groq AI Provider Concurrency (Real WAN Inference) ---');
    const realGroqProvider = new GroqProvider();
    const liveAiStages = [1, 5, 10];

    for (const vus of liveAiStages) {
      const activeUsers = users.slice(0, vus);
      const durations: number[] = [];
      let successCount = 0;
      let errorCount = 0;

      const tStart = Date.now();
      await Promise.all(
        activeUsers.map(async (u, idx) => {
          const t0 = Date.now();
          try {
            const resp = await realGroqProvider.generateResponse({
              userId: u.userId,
              message: `User ${idx}: How can I stay consistent with my 20-minute daily habit?`,
              conversationId: '507f1f77bcf86cd799439011',
              recentMessages: [{ sender: 'user', content: 'How can I stay consistent?' }],
            });
            durations.push(Date.now() - t0);
            if (resp.reply && !resp.apiKeyMissing) successCount++; else errorCount++;
          } catch {
            durations.push(Date.now() - t0);
            errorCount++;
          }
        })
      );

      const totalTimeSec = (Date.now() - tStart) / 1000;
      const rps = Math.round((durations.length / totalTimeSec) * 10) / 10;
      const { p50, p95, p99, avg } = calcQuantiles(durations);

      const mRes = await httpGet(`${BASE_URL}/loadtest/metrics`);
      const metrics = mRes.data;

      const row: BenchmarkRow = {
        scenario: 'Real Groq AI Inference',
        concurrency: vus,
        totalRequests: durations.length,
        successCount,
        errorCount,
        p50Ms: p50,
        p95Ms: p95,
        p99Ms: p99,
        avgMs: avg,
        rps,
        serverHeapMB: metrics?.memory?.heapUsedMB || 0,
        eventLoopLagP95Ms: metrics?.eventLoopDelayMs?.p95 || 0,
        mongoConnections: metrics?.mongodb?.connectionsCurrent || 0,
      };
      benchmarkRows.push(row);
      console.log(`  ✓ Real Groq AI ${vus} concurrent users: in ${totalTimeSec.toFixed(1)}s (p50: ${p50}ms | p95: ${p95}ms | Errors: ${errorCount})`);
      await new Promise(r => setTimeout(r, 2000));
    }

    console.log('\n===============================================================');
    console.log('         HABITHERO FINAL BETA CAPACITY REPORT SUMMARY          ');
    console.log('===============================================================');
    console.table(benchmarkRows);

    fs.writeFileSync(
      path.resolve(process.cwd(), 'backend/tests/load/final_beta_load_results.json'),
      JSON.stringify(benchmarkRows, null, 2),
      'utf-8'
    );
  } finally {
    if (serverInstance) {
      console.log('\n[LoadTest] Shutting down load test server...');
      serverInstance.close();
    }
    await mongoose.disconnect();
  }
}

runFinalBetaLoadTest().catch(err => {
  console.error('[LoadTest Fatal Error]:', err);
  process.exit(1);
});

