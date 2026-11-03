import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import jwt from 'jsonwebtoken';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import { User } from '../src/models/User.js';
import { GoogleAuthService, VerifiedGoogleUser } from '../src/services/googleAuthService.js';

let server: http.Server;
let baseUrl: string;

describe('HabitHero Google Authentication & Account Linking Tests', () => {
  before(async () => {
    await connectDB();
    server = app.listen(0);
    const addr = server.address() as any;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    // Reset mock verifier
    GoogleAuthService.setMockVerifier(null);

    // Clean up test users
    await User.deleteMany({ email: { $in: [/google_test_.*@example\.com/] } });

    if (server) {
      server.close();
    }
    await disconnectDB();
  });

  beforeEach(async () => {
    GoogleAuthService.setMockVerifier(null);
  });

  it('1. Rejects request when idToken is missing', async () => {
    const res = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.error || data.errors);
  });

  it('2. Rejects request when idToken is too short (< 10 chars)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'short' }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
  });

  it('3. Rejects request when Google verification fails or throws an error', async () => {
    GoogleAuthService.setMockVerifier(async () => {
      throw new Error('Google token signature is invalid or expired');
    });

    const res = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'mock_invalid_google_token_12345' }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
    assert.ok(data.error.includes('Google token signature is invalid or expired'));
  });

  it('4. Rejects request when Google email is not verified', async () => {
    GoogleAuthService.setMockVerifier(async () => {
      throw new Error('Google email address is not verified by Google.');
    });

    const res = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'mock_unverified_email_token_12345' }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
    assert.ok(data.error.includes('not verified'));
  });

  it('4b. Rejects request cleanly when server GOOGLE_CLIENT_ID is not configured', async () => {
    const originalClientId = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    try {
      const res = await fetch(`${baseUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'valid_looking_token_12345' }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(data.success, false);
      assert.ok(data.error.includes('Missing GOOGLE_CLIENT_ID'));
    } finally {
      if (originalClientId !== undefined) {
        process.env.GOOGLE_CLIENT_ID = originalClientId;
      }
    }
  });

  it('5. Successfully signs up a new user with Google ID token', async () => {
    const testEmail = `google_test_new_${Date.now()}@example.com`;
    const testGoogleId = `gid_${Date.now()}`;
    const testAvatar = 'https://lh3.googleusercontent.com/a/mock-photo-1';

    GoogleAuthService.setMockVerifier(async (token: string): Promise<VerifiedGoogleUser> => {
      assert.strictEqual(token, 'valid_google_token_for_new_user');
      return {
        googleId: testGoogleId,
        email: testEmail,
        name: 'Google Newbie',
        picture: testAvatar,
        emailVerified: true,
      };
    });

    const res = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'valid_google_token_for_new_user' }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.isNewUser, true);
    assert.ok(body.data.token, 'Must return JWT token');
    assert.strictEqual(body.data.user.email, testEmail);
    assert.strictEqual(body.data.user.name, 'Google Newbie');
    assert.strictEqual(body.data.user.avatarUrl, testAvatar);

    // Verify user is in MongoDB
    const dbUser = await User.findOne({ email: testEmail });
    assert.ok(dbUser);
    assert.strictEqual(dbUser.googleId, testGoogleId);
    assert.strictEqual(dbUser.authProvider, 'google');
    assert.strictEqual(dbUser.passwordHash, undefined);

    // Verify JWT token is valid and allows accessing /api/auth/me
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${body.data.token}` },
    });
    const meData = await meRes.json();
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meData.data.email, testEmail);
  });

  it('6. Successfully logs in an existing Google user without creating duplicates', async () => {
    const testEmail = `google_test_returning_${Date.now()}@example.com`;
    const testGoogleId = `gid_returning_${Date.now()}`;

    // Create user initially
    await User.create({
      name: 'Returning Hero',
      email: testEmail,
      googleId: testGoogleId,
      authProvider: 'google',
    });

    GoogleAuthService.setMockVerifier(async (): Promise<VerifiedGoogleUser> => {
      return {
        googleId: testGoogleId,
        email: testEmail,
        name: 'Returning Hero',
        emailVerified: true,
      };
    });

    const res = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'valid_token_for_returning_user' }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.isNewUser, false);
    assert.ok(body.data.token);

    // Ensure only 1 user exists in DB
    const count = await User.countDocuments({ email: testEmail });
    assert.strictEqual(count, 1);
  });

  it('7. Safely links Google account when existing user registered with email/password', async () => {
    const testEmail = `google_test_link_${Date.now()}@example.com`;
    const testGoogleId = `gid_link_${Date.now()}`;
    const testAvatar = 'https://lh3.googleusercontent.com/avatar-linked.png';

    // 1. Register user with standard email/password
    const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Local User',
        email: testEmail,
        password: 'Password123!',
      }),
    });
    assert.strictEqual(registerRes.status, 201);

    const initialDbUser = await User.findOne({ email: testEmail }).select('+passwordHash');
    assert.ok(initialDbUser);
    assert.ok(initialDbUser.passwordHash, 'Must have passwordHash');
    assert.strictEqual(initialDbUser.googleId, undefined);

    // 2. User subsequently signs in with Google having the same verified email
    GoogleAuthService.setMockVerifier(async (): Promise<VerifiedGoogleUser> => {
      return {
        googleId: testGoogleId,
        email: testEmail,
        name: 'Local User',
        picture: testAvatar,
        emailVerified: true,
      };
    });

    const googleRes = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'valid_link_google_token' }),
    });

    const googleBody = await googleRes.json();
    assert.strictEqual(googleRes.status, 200);
    assert.strictEqual(googleBody.data.isNewUser, false);

    // 3. Verify user record is safely linked: googleId is added, passwordHash is preserved
    const linkedDbUser = await User.findOne({ email: testEmail }).select('+passwordHash');
    assert.ok(linkedDbUser);
    assert.strictEqual(linkedDbUser.googleId, testGoogleId);
    assert.strictEqual(linkedDbUser.avatarUrl, testAvatar);
    assert.strictEqual(linkedDbUser.passwordHash, initialDbUser.passwordHash, 'Password hash must be preserved');

    // 4. User can still log in using their original password
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!',
      }),
    });
    assert.strictEqual(loginRes.status, 200);
  });

  it('8. Google-only user attempting password login gets clear explanatory message', async () => {
    const testEmail = `google_test_only_${Date.now()}@example.com`;
    const testGoogleId = `gid_only_${Date.now()}`;

    // Create Google-only user
    await User.create({
      name: 'Google Only User',
      email: testEmail,
      googleId: testGoogleId,
      authProvider: 'google',
    });

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'SomeRandomPassword123',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.success, false);
    assert.ok(body.error.includes('Google Sign-In'));
  });

  it('9. Existing email/password authentication continues to work without regression', async () => {
    const testEmail = `google_test_reg_${Date.now()}@example.com`;
    const testPassword = 'SecurePassword789!';

    // Register
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Standard User',
        email: testEmail,
        password: testPassword,
      }),
    });
    const regBody = await regRes.json();
    assert.strictEqual(regRes.status, 201);
    assert.strictEqual(regBody.success, true);
    assert.ok(regBody.data.token);

    // Login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginBody = await loginRes.json();
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginBody.success, true);
    assert.ok(loginBody.data.token);
  });
});

