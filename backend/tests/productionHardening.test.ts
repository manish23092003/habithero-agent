import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';
import { app, normalizeOrigin, getConfiguredOrigins } from '../src/app.js';
import { connectDB, disconnectDB, sanitizeMongoUri, sanitizeErrorMessage, getMemoryServer } from '../src/config/db.js';
import { User } from '../src/models/User.js';

const makeRequest = (
  server: http.Server,
  method: string,
  path: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> => {
  return new Promise((resolve, reject) => {
    const address = server.address();
    if (!address || typeof address === 'string') {
      return reject(new Error('Server address unavailable'));
    }

    const req = http.request(
      {
        host: '127.0.0.1',
        port: address.port,
        method,
        path,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let body = raw;
          try {
            body = JSON.parse(raw);
          } catch {
            // Keep raw string
          }
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body,
          });
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
};

test('HabitHero Production Hardening & Verification Suite', async (t) => {
  let server: http.Server;

  await t.test('Setup: Connect to database and start HTTP server', async () => {
    await connectDB();
    assert.equal(mongoose.connection.readyState, 1, 'MongoDB connection should be ready (state 1)');

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
  });

  // --- 1. URI & Error Sanitization Tests ---
  await t.test('1. sanitizeMongoUri redacts Atlas SRV credentials', () => {
    const rawAtlas = 'mongodb+srv://admin_user:SuperSecretPassword123!@cluster0.abcde.mongodb.net/habithero?retryWrites=true&w=majority';
    const sanitized = sanitizeMongoUri(rawAtlas);

    assert.doesNotMatch(sanitized, /SuperSecretPassword123!/, 'Password must not be present');
    assert.doesNotMatch(sanitized, /admin_user/, 'Username must not be present');
    assert.match(sanitized, /^mongodb\+srv:\/\/\*\*\*:\*\*\*@cluster0\.abcde\.mongodb\.net\/habithero/, 'Must preserve cluster host & options with redacted credentials');
  });

  await t.test('2. sanitizeMongoUri redacts standard mongodb:// credentials', () => {
    const rawLocal = 'mongodb://app_service:db_pass_987@localhost:27017/habithero?authSource=admin';
    const sanitized = sanitizeMongoUri(rawLocal);

    assert.doesNotMatch(sanitized, /db_pass_987/, 'Password must not be present');
    assert.doesNotMatch(sanitized, /app_service/, 'Username must not be present');
    assert.match(sanitized, /^mongodb:\/\/\*\*\*:\*\*\*@localhost:27017\/habithero/, 'Credentials replaced by ***:***');
  });

  await t.test('3. sanitizeMongoUri preserves credential-free local URI', () => {
    const rawLocalNoAuth = 'mongodb://localhost:27017/habithero';
    const sanitized = sanitizeMongoUri(rawLocalNoAuth);
    assert.equal(sanitized, 'mongodb://localhost:27017/habithero');
  });

  await t.test('4. sanitizeErrorMessage redacts credentials embedded in driver errors', () => {
    const errorWithCreds = 'MongooseServerSelectionError: connection failed to mongodb+srv://prod_admin:UltraSecretPwd@cluster0.net: server selection timed out';
    const sanitized = sanitizeErrorMessage(errorWithCreds);

    assert.doesNotMatch(sanitized, /UltraSecretPwd/);
    assert.doesNotMatch(sanitized, /prod_admin/);
    assert.match(sanitized, /mongodb\+srv:\/\/\*\*\*:\*\*\*@cluster0\.net/);
  });

  // --- 2. CORS Normalization Unit Tests ---
  await t.test('5. normalizeOrigin strips trailing slashes and trims whitespace', () => {
    assert.equal(normalizeOrigin('  https://habithero.vercel.app/  '), 'https://habithero.vercel.app');
    assert.equal(normalizeOrigin('https://habithero.vercel.app///'), 'https://habithero.vercel.app');
    assert.equal(normalizeOrigin('http://localhost:5173'), 'http://localhost:5173');
    assert.equal(normalizeOrigin(null), '');
    assert.equal(normalizeOrigin(undefined), '');
  });

  await t.test('6. getConfiguredOrigins parses multiple comma-separated URLs with trailing slashes', () => {
    const envString = 'https://habithero.vercel.app/, https://habithero.com/, http://localhost:5173  ';
    const parsed = getConfiguredOrigins(envString);

    assert.deepEqual(parsed, [
      'https://habithero.vercel.app',
      'https://habithero.com',
      'http://localhost:5173',
    ]);
  });

  // --- 3. Live HTTP CORS Tests ---
  await t.test('7. Production CORS: Allows origin matching configured URL without trailing slash', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalFrontend = process.env.FRONTEND_URL;
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://habithero.vercel.app/, https://habithero.com';

    try {
      const res = await makeRequest(server, 'OPTIONS', '/api/health', {
        Origin: 'https://habithero.vercel.app',
        'Access-Control-Request-Method': 'GET',
      });

      assert.equal(res.status, 204, 'Preflight OPTIONS request should succeed with 204');
      assert.equal(res.headers['access-control-allow-origin'], 'https://habithero.vercel.app');
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.FRONTEND_URL = originalFrontend;
    }
  });

  await t.test('8. Production CORS: Allows origin when browser sends trailing slash or whitespace', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalFrontend = process.env.FRONTEND_URL;
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://habithero.vercel.app';

    try {
      const res = await makeRequest(server, 'OPTIONS', '/api/health', {
        Origin: 'https://habithero.vercel.app/',
        'Access-Control-Request-Method': 'GET',
      });

      assert.equal(res.status, 204);
      assert.equal(res.headers['access-control-allow-origin'], 'https://habithero.vercel.app/');
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.FRONTEND_URL = originalFrontend;
    }
  });

  await t.test('9. Production CORS: Allows secondary domain from comma-separated list', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalFrontend = process.env.FRONTEND_URL;
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://habithero.vercel.app, https://habithero.com/';

    try {
      const res = await makeRequest(server, 'OPTIONS', '/api/health', {
        Origin: 'https://habithero.com',
        'Access-Control-Request-Method': 'GET',
      });

      assert.equal(res.status, 204);
      assert.equal(res.headers['access-control-allow-origin'], 'https://habithero.com');
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.FRONTEND_URL = originalFrontend;
    }
  });

  await t.test('10. Production CORS: Rejects unconfigured origin with 500 / error message', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalFrontend = process.env.FRONTEND_URL;
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://habithero.vercel.app';

    try {
      const res = await makeRequest(server, 'GET', '/api/health', {
        Origin: 'https://malicious-attacker.com',
      });

      // Express error handler returns 500 when CORS callback throws an error in production
      assert.equal(res.status, 500);
      assert.ok(res.body.error, 'Should return error object');
      assert.notEqual(res.headers['access-control-allow-origin'], 'https://malicious-attacker.com');
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.FRONTEND_URL = originalFrontend;
    }
  });

  // --- 4. Health Endpoint Tests ---
  await t.test('11. Health endpoint returns 200 and database: connected when MongoDB is ready', async () => {
    const res = await makeRequest(server, 'GET', '/api/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.database, 'connected');
    assert.equal(res.body.service, 'HabitHero Backend API');
    assert.equal(res.body.phase, 'Phase 2: Authentication & Database Connected');
    assert.ok(res.body.timestamp);
    // Credentials & stack trace check
    assert.equal(res.body.uri, undefined, 'Must not expose URI');
    assert.equal(res.body.connectionString, undefined, 'Must not expose connection string');
  });

  await t.test('12. Health endpoint returns 503 and database: disconnected when MongoDB is disconnected', async () => {
    // Temporarily simulate disconnected state
    const originalReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 0,
      configurable: true,
      writable: true,
    });

    try {
      const res = await makeRequest(server, 'GET', '/api/health');

      assert.equal(res.status, 503, 'Should return HTTP 503 Service Unavailable when DB disconnected');
      assert.equal(res.body.status, 'degraded');
      assert.equal(res.body.database, 'disconnected');
      assert.equal(res.body.service, 'HabitHero Backend API');
      assert.equal(res.body.phase, 'Phase 2: Authentication & Database Connected');
      assert.ok(res.body.timestamp);
    } finally {
      Object.defineProperty(mongoose.connection, 'readyState', {
        value: originalReadyState,
        configurable: true,
        writable: true,
      });
    }
  });

  // --- 5. Test Database Isolation & Safety Guarantees ---
  await t.test('13. Test mode: Ignores remote Atlas MONGODB_URI and exclusively connects to isolated MongoMemoryServer', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalUri = process.env.MONGODB_URI;

    try {
      // Disconnect existing connection to test cold startup
      await disconnectDB();

      // Configure test environment with a fake remote Atlas URI
      process.env.NODE_ENV = 'test';
      process.env.MONGODB_URI = 'mongodb+srv://admin_atlas:FakeSuperSecret123!@cluster0.unreachable-domain-atlas.mongodb.net/habithero_prod?retryWrites=true&w=majority';

      // Connect using connectDB
      const connectedUri = await connectDB();

      // Verify connection state and isolation
      assert.equal(mongoose.connection.readyState, 1, 'Mongoose connection should be ready');
      assert.ok(getMemoryServer(), 'MongoMemoryServer instance must be active in test mode');
      assert.doesNotMatch(connectedUri, /cluster0\.unreachable-domain-atlas\.mongodb\.net/, 'Must NOT connect to remote Atlas URI');
      assert.match(connectedUri, /^mongodb:\/\/127\.0\.0\.1:/, 'Must connect to local in-memory MongoMemoryServer instance');

      // Check mongoose connection host
      assert.equal(mongoose.connection.host, '127.0.0.1', 'Host must be local loopback, never external Atlas cluster');
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.MONGODB_URI = originalUri;
    }
  });

  await t.test('14. Test DB operations succeed against isolated in-memory database', async () => {
    const testEmail = `isolation_test_${Date.now()}@example.com`;
    const user = await User.create({
      name: 'Isolation Test User',
      email: testEmail,
      passwordHash: 'dummy_hash_for_test',
    });

    assert.ok(user._id, 'User record created in isolated test DB');
    const retrieved = await User.findOne({ email: testEmail });
    assert.equal(retrieved?.name, 'Isolation Test User');

    // Clean up
    await User.deleteOne({ _id: user._id });
    const countAfter = await User.countDocuments({ email: testEmail });
    assert.equal(countAfter, 0, 'Cleaned up successfully from isolated test DB');
  });

  await t.test('15. connectDB is idempotent and does not create duplicate memory servers or connections', async () => {
    const initialServer = getMemoryServer();
    assert.ok(initialServer, 'Active memory server exists');

    // Call connectDB while already connected
    const secondUri = await connectDB();
    assert.equal(mongoose.connection.readyState, 1, 'Still connected and ready');
    assert.equal(getMemoryServer(), initialServer, 'Same memory server instance preserved');
    assert.match(secondUri, /^mongodb:\/\/127\.0\.0\.1:/, 'Returned in-memory URI');
  });

  await t.test('16. Production mode safety: Refuses to start with in-memory DB when primary DB is unreachable', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalUri = process.env.MONGODB_URI;

    try {
      // Disconnect existing connection
      await disconnectDB();

      // Configure production mode with unreachable local port
      process.env.NODE_ENV = 'production';
      process.env.MONGODB_URI = 'mongodb://127.0.0.1:27099/unreachable_habithero_prod?serverSelectionTimeoutMS=500';

      // Expect connectDB to reject firmly without spinning up MongoMemoryServer
      await assert.rejects(
        async () => {
          await connectDB();
        },
        (err: Error) => {
          const hasRefusal = err.message.includes('Refusing to start in production');
          const hasDisabledMessage = err.message.includes('In-memory fallback is strictly disabled in production');
          return hasRefusal && hasDisabledMessage;
        },
        'Production mode must reject with clear refusal error and never start MongoMemoryServer'
      );

      assert.equal(getMemoryServer(), null, 'MongoMemoryServer must NOT be created in production mode');
    } finally {
      // Restore test mode and reconnect cleanly for any subsequent test runs
      process.env.NODE_ENV = 'test';
      process.env.MONGODB_URI = originalUri;
      await connectDB();
    }
  });

  // --- Cleanup ---
  await t.test('Teardown: Close server and disconnect database', async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDB();
  });
});

