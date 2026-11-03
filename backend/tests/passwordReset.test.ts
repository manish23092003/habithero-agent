import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import http from 'http';
import jwt from 'jsonwebtoken';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import { User } from '../src/models/User.js';
import { PasswordResetToken } from '../src/models/PasswordResetToken.js';
import { EmailService, SendResetEmailOptions, EmailSendResult } from '../src/services/emailService.js';
import { PasswordResetRateLimiter } from '../src/middleware/passwordResetRateLimiter.js';
import { TokenRevocationService } from '../src/services/tokenRevocationService.js';

let server: http.Server;
let baseUrl: string;
const sentEmails: SendResetEmailOptions[] = [];

describe('HabitHero Production-Grade Password Reset & Account Recovery Tests', () => {
  before(async () => {
    await connectDB();
    server = app.listen(0);
    const addr = server.address() as any;
    baseUrl = `http://127.0.0.1:${addr.port}`;

    // Configure EmailService mock to intercept outgoing emails during tests
    EmailService.setMockHandler(async (options: SendResetEmailOptions): Promise<EmailSendResult> => {
      sentEmails.push(options);
      return {
        success: true,
        messageId: `mock-msg-${Date.now()}-${Math.random()}`,
      };
    });
  });

  after(async () => {
    EmailService.setMockHandler(null);
    TokenRevocationService.clearCache();
    PasswordResetRateLimiter.resetForTests();

    // Clean up test data
    await User.deleteMany({ email: { $in: [/reset_test_.*@example\.com/] } });
    await PasswordResetToken.deleteMany({ email: { $in: [/reset_test_.*@example\.com/] } });

    if (server) {
      server.close();
    }
    await disconnectDB();
  });

  beforeEach(() => {
    sentEmails.length = 0;
    PasswordResetRateLimiter.resetForTests();
  });

  const makeRequest = async (path: string, options: any = {}) => {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, headers: res.headers, body };
  };

  it('1. Registered email reset request returns generic success, stores token hash, and sends email', async () => {
    const email = `reset_test_user_a_${Date.now()}@example.com`;
    // Register user
    const regRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Alice Hero', email, password: 'InitialPassword123!' }),
    });
    assert.strictEqual(regRes.status, 201);

    // Request password reset
    const forgotRes = await makeRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    assert.strictEqual(forgotRes.status, 200);
    assert.strictEqual(forgotRes.body.success, true);
    assert.ok(forgotRes.body.message.includes('If an account exists with that email address'));

    // Verify token was stored in MongoDB
    const tokenRecord = await PasswordResetToken.findOne({ email });
    assert.ok(tokenRecord, 'PasswordResetToken must be created in MongoDB');
    assert.strictEqual(tokenRecord.usedAt, null, 'New token must not be marked used');
    assert.ok(tokenRecord.expiresAt.getTime() > Date.now(), 'Token must have future expiration');
    assert.ok(tokenRecord.expiresAt.getTime() <= Date.now() + 16 * 60 * 1000, 'Expiration must be ~15 minutes');

    // Verify raw token was NOT stored (only 64-char hex SHA-256 hash)
    assert.strictEqual(tokenRecord.tokenHash.length, 64);

    // Verify mock email was sent
    assert.strictEqual(sentEmails.length, 1);
    assert.strictEqual(sentEmails[0].to, email);
    assert.strictEqual(sentEmails[0].name, 'Alice Hero');
    assert.ok(sentEmails[0].rawToken.length >= 32);

    // Verify token hash in DB matches SHA-256 of the raw token dispatched via email
    const expectedHash = crypto.createHash('sha256').update(sentEmails[0].rawToken).digest('hex');
    assert.strictEqual(tokenRecord.tokenHash, expectedHash);
  });

  it('2. Unknown email returns identical generic response without creating token or leaking account status', async () => {
    const unknownEmail = `reset_test_unknown_${Date.now()}@example.com`;
    const res = await makeRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: unknownEmail }),
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.message.includes('If an account exists with that email address'));

    // Verify zero tokens were created
    const record = await PasswordResetToken.findOne({ email: unknownEmail });
    assert.strictEqual(record, null);
    // Verify zero emails were dispatched
    assert.strictEqual(sentEmails.length, 0);
  });

  it('3. Invalid email format is rejected by validation with 400', async () => {
    const res = await makeRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email-address' }),
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error);
  });

  it('4. Expired token is rejected with 400', async () => {
    const email = `reset_test_expired_${Date.now()}@example.com`;
    const regRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Bob Expired', email, password: 'Password123!' }),
    });
    assert.strictEqual(regRes.status, 201);

    // Manually create an expired token record
    const expiredRawToken = crypto.randomBytes(32).toString('hex');
    const expiredHash = crypto.createHash('sha256').update(expiredRawToken).digest('hex');
    await PasswordResetToken.create({
      userId: regRes.body.data.user.id,
      email,
      tokenHash: expiredHash,
      expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
    });

    const resetRes = await makeRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: expiredRawToken, password: 'NewSecurePassword888!' }),
    });

    assert.strictEqual(resetRes.status, 400);
    assert.strictEqual(resetRes.body.success, false);
    assert.ok(resetRes.body.error.includes('expired') || resetRes.body.error.includes('Invalid'));
  });

  it('5. Invalid or tampered token is rejected with 400', async () => {
    const res = await makeRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'this_is_a_completely_fake_invalid_hex_token_1234567890',
        password: 'ValidPassword123!',
      }),
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.includes('Invalid') || res.body.error.includes('expired'));
  });

  it('6. Password with fewer than 8 characters is rejected with 400', async () => {
    const res = await makeRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid_looking_token_1234567890',
        password: 'short',
      }),
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    const combinedMsg = res.body.error + ' ' + JSON.stringify(res.body.details || []);
    assert.ok(combinedMsg.includes('8 characters'));
  });

  it('7. Successful password reset updates password, old password is rejected, new password is accepted', async () => {
    const email = `reset_test_success_${Date.now()}@example.com`;
    const oldPassword = 'OldInitialPassword123!';
    const newPassword = 'BrandNewSecurePassword456!';

    // Step A: Register user
    await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Charlie Success', email, password: oldPassword }),
    });

    // Step B: Request reset
    await makeRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    assert.strictEqual(sentEmails.length, 1);
    const rawToken = sentEmails[0].rawToken;

    // Step C: Perform reset with valid token
    const resetRes = await makeRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: rawToken, password: newPassword }),
    });

    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetRes.body.success, true);
    assert.ok(resetRes.body.message.includes('successfully'));

    // Step D: Verify old password is now REJECTED
    const oldLoginRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: oldPassword }),
    });
    assert.strictEqual(oldLoginRes.status, 401);
    assert.strictEqual(oldLoginRes.body.success, false);

    // Step E: Verify new password is now ACCEPTED
    const newLoginRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: newPassword }),
    });
    assert.strictEqual(newLoginRes.status, 200);
    assert.strictEqual(newLoginRes.body.success, true);
    assert.ok(newLoginRes.body.data.token, 'Must return valid JWT for new password');
  });

  it('8. Reused token is rejected with 400 on subsequent attempt', async () => {
    const email = `reset_test_reuse_${Date.now()}@example.com`;
    await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Dan Reuse', email, password: 'FirstPassword123!' }),
    });

    await makeRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    const rawToken = sentEmails[0].rawToken;

    // First reset succeeds
    const firstReset = await makeRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: rawToken, password: 'SecondPassword123!' }),
    });
    assert.strictEqual(firstReset.status, 200);

    // Second reset with the exact same token must FAIL
    const secondReset = await makeRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: rawToken, password: 'ThirdPassword123!' }),
    });
    assert.strictEqual(secondReset.status, 400);
    assert.strictEqual(secondReset.body.success, false);
    assert.ok(secondReset.body.error.includes('expired') || secondReset.body.error.includes('Invalid'));
  });

  it('9. Session invalidation: JWT issued before password reset is rejected by authenticateToken with 401', async () => {
    const email = `reset_test_session_${Date.now()}@example.com`;
    // Register and get initial session JWT
    const regRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Eve Session', email, password: 'InitialSessionPass123!' }),
    });
    const preResetToken = regRes.body.data.token;

    // Verify pre-reset token works before reset
    const preMeRes = await makeRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${preResetToken}` },
    });
    assert.strictEqual(preMeRes.status, 200);

    // Ensure at least 1 second passes so iat timestamp precedes password reset timestamp
    await new Promise(r => setTimeout(r, 1100));

    // Request and perform password reset
    await makeRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    const rawToken = sentEmails[0].rawToken;

    await makeRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: rawToken, password: 'UpdatedSessionPass123!' }),
    });

    // Now test that the pre-reset JWT is REJECTED with 401
    const postMeRes = await makeRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${preResetToken}` },
    });
    assert.strictEqual(postMeRes.status, 401);
    assert.strictEqual(postMeRes.body.success, false);
    assert.ok(postMeRes.body.error.includes('invalidated') || postMeRes.body.error.includes('expired'));

    // But logging in with the new password generates a token that works
    const newLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'UpdatedSessionPass123!' }),
    });
    const freshToken = newLogin.body.data.token;

    const freshMeRes = await makeRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    assert.strictEqual(freshMeRes.status, 200);
  });

  it('10. Multi-user isolation: User A password reset does not affect User B session or credentials', async () => {
    const emailA = `reset_test_iso_a_${Date.now()}@example.com`;
    const emailB = `reset_test_iso_b_${Date.now()}@example.com`;

    const regA = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'User A', email: emailA, password: 'PasswordA_123!' }),
    });
    const regB = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'User B', email: emailB, password: 'PasswordB_123!' }),
    });
    const tokenB = regB.body.data.token;

    // Reset User A's password
    await makeRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: emailA }),
    });
    const tokenA = sentEmails[0].rawToken;

    await makeRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: tokenA, password: 'NewPasswordA_999!' }),
    });

    // Verify User B's token remains 100% valid and unaffected
    const meB = await makeRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.strictEqual(meB.status, 200);
    assert.strictEqual(meB.body.data.email, emailB);

    // Verify User B can still log in with original password
    const loginB = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emailB, password: 'PasswordB_123!' }),
    });
    assert.strictEqual(loginB.status, 200);
  });

  it('11. Rate limiting: Exceeding request quota returns 429 Too Many Requests with Retry-After', async () => {
    const email = `reset_test_rate_${Date.now()}@example.com`;
    await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Frank Rate', email, password: 'RatePassword123!' }),
    });

    // Send max allowed requests (MAX_FORGOT_PER_EMAIL = 3)
    const req1 = await makeRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    assert.strictEqual(req1.status, 200);

    const req2 = await makeRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    assert.strictEqual(req2.status, 200);

    const req3 = await makeRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    assert.strictEqual(req3.status, 200);

    // 4th request must be rate-limited (429)
    const req4 = await makeRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    assert.strictEqual(req4.status, 429);
    assert.strictEqual(req4.body.success, false);
    assert.ok(req4.body.error.includes('Too many password reset requests'));
    assert.ok(req4.headers.get('retry-after'), 'Must include Retry-After header');
  });

  it('12. Email provider failure is handled safely without leaking token or failing client request', async () => {
    const email = `reset_test_provider_fail_${Date.now()}@example.com`;
    await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Grace Fail', email, password: 'FailPassword123!' }),
    });

    // Temporarily mock email provider to throw a connection error
    EmailService.setMockHandler(async () => {
      throw new Error('Resend upstream gateway timeout 504');
    });

    // Forgot password request should still return generic 200 and NOT crash or expose the internal error
    const res = await makeRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.message.includes('If an account exists with that email address'));

    // Reset handler back
    EmailService.setMockHandler(async (options: SendResetEmailOptions): Promise<EmailSendResult> => {
      sentEmails.push(options);
      return { success: true };
    });
  });

  it('13. Concurrent reset attempts: Simultaneous requests with the same token resolve atomically', async () => {
    const email = `reset_test_concurrent_${Date.now()}@example.com`;
    await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Hank Concurrent', email, password: 'ConcurrentPass123!' }),
    });

    await makeRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    const rawToken = sentEmails[0].rawToken;

    // Fire 2 simultaneous requests with the exact same token
    const [res1, res2] = await Promise.all([
      makeRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: rawToken, password: 'NewConcurrentPassword1!' }),
      }),
      makeRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: rawToken, password: 'NewConcurrentPassword2!' }),
      }),
    ]);

    // Exactly one must succeed (200) and the other must fail (400 or 409 in-flight conflict)
    const successCount = [res1, res2].filter(r => r.status === 200).length;
    const failCount = [res1, res2].filter(r => r.status === 400 || r.status === 409).length;

    assert.strictEqual(successCount, 1, 'Exactly one concurrent reset request must succeed');
    assert.strictEqual(failCount, 1, 'The duplicate concurrent reset request must fail');
  });

  it('14. Requesting a new reset token invalidates any previously issued unused tokens for that user', async () => {
    const email = `reset_test_supersede_${Date.now()}@example.com`;
    await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Ivy Supersede', email, password: 'FirstPass123!' }),
    });

    // First reset request
    await makeRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    const firstToken = sentEmails[0].rawToken;

    // Second reset request (supersedes first token)
    await makeRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    const secondToken = sentEmails[1].rawToken;

    // First token must now be invalidated/used
    const firstReset = await makeRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: firstToken, password: 'NewPasswordFromFirstToken!' }),
    });
    assert.strictEqual(firstReset.status, 400);

    // Second token succeeds
    const secondReset = await makeRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: secondToken, password: 'NewPasswordFromSecondToken!' }),
    });
    assert.strictEqual(secondReset.status, 200);
  });
});
