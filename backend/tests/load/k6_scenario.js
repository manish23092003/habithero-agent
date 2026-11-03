import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// Custom metrics
const status429Counter = new Counter('http_429_count');
const status500Counter = new Counter('http_500_count');
const status503Counter = new Counter('http_503_count');
const successfulOps = new Counter('successful_operations');
const failedOps = new Counter('failed_operations');

// Read 200 isolated user profiles
const users = JSON.parse(open('./users.json'));

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  thresholds: {
    http_req_failed: ['rate<0.05'], // Failure rate must be < 5% under load
    http_req_duration: ['p(95)<3000'], // p95 response time threshold < 3.0s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:5001/api';

// In-memory VU session state for tokens
const sessionTokens = {};

export default function () {
  const vuIndex = (__VU - 1) % users.length;
  const user = users[vuIndex];
  const iteration = __ITER;

  let token = sessionTokens[__VU] || user.token;

  // 1. User Login: executed on initial iteration to establish session
  if (iteration === 0 || !sessionTokens[__VU]) {
    const loginPayload = JSON.stringify({
      email: user.email,
      password: user.password,
    });
    const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'POST /auth/login' },
    });
    check(loginRes, {
      'login status 200': (r) => r.status === 200,
    });
    recordStatus(loginRes.status);

    if (loginRes.status === 200) {
      try {
        const body = JSON.parse(loginRes.body);
        if (body.data?.token) {
          token = body.data.token;
          sessionTokens[__VU] = token;
        }
      } catch {}
    }
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // 2. Dashboard Loading (GET /auth/me, GET /goals, GET /tasks/today, GET /checkins/today)
  const meRes = http.get(`${BASE_URL}/auth/me`, {
    headers: authHeaders,
    tags: { name: 'GET /auth/me' },
  });
  check(meRes, { 'me status 200': (r) => r.status === 200 });
  recordStatus(meRes.status);

  const goalsRes = http.get(`${BASE_URL}/goals`, {
    headers: authHeaders,
    tags: { name: 'GET /goals' },
  });
  check(goalsRes, { 'goals status 200': (r) => r.status === 200 });
  recordStatus(goalsRes.status);

  const tasksRes = http.get(`${BASE_URL}/tasks/today`, {
    headers: authHeaders,
    tags: { name: 'GET /tasks/today' },
  });
  check(tasksRes, { 'tasks status 200': (r) => r.status === 200 });
  recordStatus(tasksRes.status);

  const checkinsRes = http.get(`${BASE_URL}/checkins/today`, {
    headers: authHeaders,
    tags: { name: 'GET /checkins/today' },
  });
  check(checkinsRes, { 'checkin status 200 or 404': (r) => r.status === 200 || r.status === 404 });
  recordStatus(checkinsRes.status);

  // 3. Goal Creation (with unique idempotency key)
  const goalKey = `idem_vu_${user.index}_iter_${iteration}_${Date.now()}`;
  const goalPayload = JSON.stringify({
    title: `Active Habit VU ${user.index} Iter ${iteration}`,
    tagline: 'Achieve daily consistency',
    category: 'productivity',
    targetDays: 30,
    dailyCommitmentMinutes: 20,
    idempotencyKey: goalKey,
  });
  const createGoalRes = http.post(`${BASE_URL}/goals`, goalPayload, {
    headers: Object.assign({}, authHeaders, { 'Idempotency-Key': goalKey }),
    tags: { name: 'POST /goals' },
  });
  check(createGoalRes, { 'create goal status 201 or 200': (r) => r.status === 201 || r.status === 200 });
  recordStatus(createGoalRes.status);

  // 4. Task Completion (PATCH /tasks/:id/complete)
  const completePayload = JSON.stringify({
    completed: true,
    clientDate: '2026-11-02',
  });
  const completeRes = http.patch(`${BASE_URL}/tasks/${user.taskId}/complete`, completePayload, {
    headers: authHeaders,
    tags: { name: 'PATCH /tasks/:id/complete' },
  });
  check(completeRes, { 'complete task status 200': (r) => r.status === 200 });
  recordStatus(completeRes.status);

  // 5. Record Daily Check-In (POST /checkins)
  const checkinPayload = JSON.stringify({
    date: '2026-11-02',
    status: 'great',
    completedTaskCount: 2,
    totalTaskCount: 2,
    reflection: `Synthetic user ${user.index} completed tasks.`,
  });
  const postCheckinRes = http.post(`${BASE_URL}/checkins`, checkinPayload, {
    headers: authHeaders,
    tags: { name: 'POST /checkins' },
  });
  check(postCheckinRes, { 'post checkin status 200 or 201': (r) => r.status === 200 || r.status === 201 });
  recordStatus(postCheckinRes.status);

  // 6. AI Companion Chat Message (using Mocked AI provider)
  const chatPayload = JSON.stringify({
    message: `Hello HabitHero, I completed my session today for user ${user.index}. How should I pace tomorrow?`,
  });
  const chatRes = http.post(`${BASE_URL}/chat/message`, chatPayload, {
    headers: authHeaders,
    tags: { name: 'POST /chat/message' },
  });
  check(chatRes, { 'chat message status 200 or 429': (r) => r.status === 200 || r.status === 429 });
  recordStatus(chatRes.status);

  // Pacing think time between full user interaction loops
  sleep(0.3);
}

function recordStatus(status) {
  if (status >= 200 && status < 300) {
    successfulOps.add(1);
  } else {
    failedOps.add(1);
  }

  if (status === 429) {
    status429Counter.add(1);
  } else if (status === 500) {
    status500Counter.add(1);
  } else if (status === 503) {
    status503Counter.add(1);
  }
}
