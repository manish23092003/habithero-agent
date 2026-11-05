import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Feedback } from '../src/models/Feedback.js';
import { requireAdmin, getAdminEmails } from '../src/middleware/requireAdmin.js';
import { authenticateToken } from '../src/middleware/auth.js';
import { FeedbackRateLimiter } from '../src/middleware/feedbackRateLimiter.js';
import feedbackRoutes from '../src/routes/feedbackRoutes.js';
import {
  createFeedbackSchema,
  updateFeedbackStatusSchema,
  updateFeedbackModerationSchema,
  createOfficialReplySchema,
} from '../src/schemas/feedbackSchemas.js';

let server: http.Server;
let baseUrl: string;

const JWT_SECRET = process.env.JWT_SECRET || 'habithero_development_jwt_secret_token_2026';

const generateToken = (userId: string, email: string, name: string): string => {
  return jwt.sign({ id: userId, email, name }, JWT_SECRET, { expiresIn: '1h' });
};

const makeRequest = async (path: string, token?: string, options: any = {}) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  const body = await res.json().catch(() => ({}));
  return { status: res.status, headers: res.headers, body };
};

describe('HabitHero Feedback Portal — Phase 1 & 2: Backend Foundation, Admin Authorization & Hardened APIs Tests', () => {
  let adminUser: any;
  let regularUser: any;
  let adminToken: string;
  let regularToken: string;
  const originalAdminEmails = process.env.ADMIN_EMAILS;

  before(async () => {
    await connectDB();

    // Isolated test Express application mounting the real production feedback router
    const testApp = express();
    // Enable 1-hop proxy trust matching production configuration
    testApp.set('trust proxy', 1);
    testApp.use(express.json());

    // Mount real production feedback routes at /api/feedback
    testApp.use('/api/feedback', feedbackRoutes);

    // Test-only endpoint protected by both authenticateToken and requireAdmin
    testApp.get(
      '/api/test-admin/dashboard',
      authenticateToken,
      requireAdmin,
      (req: any, res) => {
        res.status(200).json({
          success: true,
          message: 'Admin authorization granted',
          userId: req.user?.id,
        });
      }
    );

    await new Promise<void>((resolve) => {
      server = http.createServer(testApp);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });

    // Seed test users:
    // Administrator must be verified via Google OAuth (authProvider: 'google')
    adminUser = await User.create({
      name: 'System Administrator',
      email: `admin_${Date.now()}@habithero.test`,
      authProvider: 'google',
      googleId: `google_admin_${Date.now()}`,
      timezone: 'UTC',
    });

    // Regular community member (authProvider: 'local')
    regularUser = await User.create({
      name: 'Regular Community User',
      email: `member_${Date.now()}@habithero.test`,
      password: 'hashedPassword123!',
      authProvider: 'local',
      timezone: 'UTC',
    });

    adminToken = generateToken(adminUser._id.toString(), adminUser.email, adminUser.name);
    regularToken = generateToken(regularUser._id.toString(), regularUser.email, regularUser.name);

    // Set test admin emails environment variable to include adminUser email
    process.env.ADMIN_EMAILS = `${adminUser.email},other_owner@habithero.test`;
  });

  after(async () => {
    // Restore original environment
    process.env.ADMIN_EMAILS = originalAdminEmails;

    if (adminUser) await User.findByIdAndDelete(adminUser._id);
    if (regularUser) await User.findByIdAndDelete(regularUser._id);
    await Feedback.deleteMany({ title: /Test Feedback|Automated Test/ });

    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();
  });

  beforeEach(() => {
    // Reset rate limiter between tests to prevent test pollution
    FeedbackRateLimiter.reset();
  });

  // =========================================================================
  // 1. Feedback Model Defaults and Privacy
  // =========================================================================
  describe('Feedback MongoDB Model Defaults & Projection Security', () => {
    it('should default moderationStatus to pending and status to under_review', async () => {
      const feedback = await Feedback.create({
        title: 'Test Feedback Default State',
        description: 'Verifying that newly created feedback defaults safely to pending moderation.',
        category: 'feature_request',
      });

      assert.strictEqual(feedback.moderationStatus, 'pending');
      assert.strictEqual(feedback.status, 'under_review');
      assert.strictEqual(feedback.displayName, 'HabitHero Community Member');
      assert.deepStrictEqual(feedback.officialReplies, []);
      assert.ok(feedback.createdAt);
      assert.ok(feedback.updatedAt);

      await Feedback.findByIdAndDelete(feedback._id);
    });

    it('should exclude email from standard query projections (select: false) to protect submitter privacy', async () => {
      const feedback = await Feedback.create({
        title: 'Test Feedback Privacy Check',
        description: 'Ensuring submitter email address is never projected by default queries.',
        category: 'bug_report',
        displayName: 'Anonymous Submitter',
        email: 'secret_submitter@example.com',
      });

      // Standard findById without explicit select
      const queriedDoc = await Feedback.findById(feedback._id).lean();
      assert.ok(queriedDoc);
      assert.strictEqual((queriedDoc as any).email, undefined, 'Email MUST be omitted in default queries');
      assert.strictEqual(queriedDoc.title, 'Test Feedback Privacy Check');

      // Standard find query without explicit select
      const queriedList = await Feedback.find({ _id: feedback._id }).lean();
      assert.strictEqual(queriedList.length, 1);
      assert.strictEqual((queriedList[0] as any).email, undefined, 'Email MUST be omitted in list queries');

      // Explicit select('+email') for administrative or backend internal lookup
      const adminQueriedDoc = await Feedback.findById(feedback._id).select('+email').lean();
      assert.ok(adminQueriedDoc);
      assert.strictEqual((adminQueriedDoc as any).email, 'secret_submitter@example.com');

      await Feedback.findByIdAndDelete(feedback._id);
    });

    it('should enforce official reply default author as HabitHero Team', async () => {
      const feedback = await Feedback.create({
        title: 'Test Feedback Official Reply',
        description: 'Verifying official replies store HabitHero Team as author by default.',
        category: 'improvement',
        officialReplies: [
          {
            content: 'Thank you for your feedback! We are actively reviewing this.',
            authorId: adminUser._id,
          },
        ],
      });

      assert.strictEqual(feedback.officialReplies.length, 1);
      assert.strictEqual(feedback.officialReplies[0].authorName, 'HabitHero Team');
      assert.strictEqual(
        feedback.officialReplies[0].content,
        'Thank you for your feedback! We are actively reviewing this.'
      );

      await Feedback.findByIdAndDelete(feedback._id);
    });

    it('should hide official reply authorId from default query projections (select: false)', async () => {
      const feedback = await Feedback.create({
        title: 'Test Feedback Author Privacy',
        description: 'Verifying official reply authorId is never leaked to public queries.',
        category: 'improvement',
        officialReplies: [
          {
            content: 'Official response from HabitHero Team.',
            authorId: adminUser._id,
          },
        ],
      });

      // Standard findById without explicit select
      const queriedDoc = await Feedback.findById(feedback._id).lean();
      assert.ok(queriedDoc);
      assert.strictEqual(queriedDoc.officialReplies.length, 1);
      assert.strictEqual(
        (queriedDoc.officialReplies[0] as any).authorId,
        undefined,
        'authorId MUST be undefined in default query projection'
      );
      assert.strictEqual(queriedDoc.officialReplies[0].authorName, 'HabitHero Team');

      // Standard list find query without explicit select
      const queriedList = await Feedback.find({ _id: feedback._id }).lean();
      assert.strictEqual(queriedList.length, 1);
      assert.strictEqual(
        (queriedList[0].officialReplies[0] as any).authorId,
        undefined,
        'authorId MUST be undefined in list query projection'
      );

      await Feedback.findByIdAndDelete(feedback._id);
    });
  });

  // =========================================================================
  // 2. Feedback Zod Validation Schemas
  // =========================================================================
  describe('Feedback Validation Schemas (Strictness & Sanitization)', () => {
    it('should validate a valid feedback submission', () => {
      const validPayload = {
        title: 'Add export to CSV option',
        description: 'It would be great to export habit completion records to CSV for spreadsheet analysis.',
        category: 'feature_request',
        displayName: 'Data Enthusiast',
        email: 'user@example.com',
      };

      const result = createFeedbackSchema.safeParse(validPayload);
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.title, 'Add export to CSV option');
        assert.strictEqual(result.data.category, 'feature_request');
      }
    });

    it('should reject feedback submission with title < 3 characters or > 150 characters', () => {
      const shortTitle = {
        title: 'Hi',
        description: 'This is a description that has enough characters.',
        category: 'general',
      };
      const resShort = createFeedbackSchema.safeParse(shortTitle);
      assert.strictEqual(resShort.success, false);

      const longTitle = {
        title: 'A'.repeat(151),
        description: 'This is a description that has enough characters.',
        category: 'general',
      };
      const resLong = createFeedbackSchema.safeParse(longTitle);
      assert.strictEqual(resLong.success, false);
    });

    it('should reject feedback submission with description < 10 characters or > 2000 characters', () => {
      const shortDesc = {
        title: 'Valid Title Here',
        description: 'Too short',
        category: 'general',
      };
      const resShort = createFeedbackSchema.safeParse(shortDesc);
      assert.strictEqual(resShort.success, false);

      const longDesc = {
        title: 'Valid Title Here',
        description: 'B'.repeat(2001),
        category: 'general',
      };
      const resLong = createFeedbackSchema.safeParse(longDesc);
      assert.strictEqual(resLong.success, false);
    });

    it('should reject feedback submission with invalid category', () => {
      const invalidCat = {
        title: 'Valid Title Here',
        description: 'Valid description with enough characters.',
        category: 'not_a_real_category',
      };
      const res = createFeedbackSchema.safeParse(invalidCat);
      assert.strictEqual(res.success, false);
    });

    it('should reject client-injected status, moderationStatus, or officialReplies (.strict() check)', () => {
      const maliciousPayload = {
        title: 'Attempting Privilege Escalation',
        description: 'Trying to auto-approve my own feedback with client payload injection.',
        category: 'general',
        status: 'completed', // Injected!
        moderationStatus: 'approved', // Injected!
        officialReplies: [{ content: 'Spoofed Team Reply' }], // Injected!
      };

      const res = createFeedbackSchema.safeParse(maliciousPayload);
      assert.strictEqual(res.success, false, 'Payload with client-injected status or moderationStatus MUST be rejected');
    });

    it('should validate status update schema', () => {
      const valid = updateFeedbackStatusSchema.safeParse({ status: 'in_progress' });
      assert.strictEqual(valid.success, true);

      const invalid = updateFeedbackStatusSchema.safeParse({ status: 'archived_invalid' });
      assert.strictEqual(invalid.success, false);

      const extraField = updateFeedbackStatusSchema.safeParse({ status: 'planned', extra: 123 });
      assert.strictEqual(extraField.success, false, 'Unexpected keys must be rejected');
    });

    it('should validate moderation update schema', () => {
      const valid = updateFeedbackModerationSchema.safeParse({ moderationStatus: 'approved' });
      assert.strictEqual(valid.success, true);

      const invalid = updateFeedbackModerationSchema.safeParse({ moderationStatus: 'verified_invalid' });
      assert.strictEqual(invalid.success, false);
    });

    it('should validate official reply schema and reject boundary violations (< 2 or > 2000 chars)', () => {
      const valid = createOfficialReplySchema.safeParse({
        content: 'We have prioritized this for next sprint.',
      });
      assert.strictEqual(valid.success, true);

      // Below minimum length (< 2 chars)
      const tooShort = createOfficialReplySchema.safeParse({ content: 'A' });
      assert.strictEqual(tooShort.success, false);

      // Above maximum length (> 2000 chars)
      const tooLong = createOfficialReplySchema.safeParse({ content: 'C'.repeat(2001) });
      assert.strictEqual(tooLong.success, false);

      const extraAuthor = createOfficialReplySchema.safeParse({
        content: 'Valid content here',
        authorName: 'Hacker Spoof',
      });
      assert.strictEqual(extraAuthor.success, false, 'AuthorName cannot be injected via client payload');
    });
  });

  // =========================================================================
  // 3. requireAdmin Middleware Authorization & Security
  // =========================================================================
  describe('requireAdmin Middleware Authorization Enforcement', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const { status, body } = await makeRequest('/api/test-admin/dashboard');
      assert.strictEqual(status, 401);
      assert.strictEqual(body.success, false);
    });

    it('should reject authenticated non-admin users with 403 (ADMIN_ACCESS_REQUIRED)', async () => {
      const { status, body } = await makeRequest('/api/test-admin/dashboard', regularToken);
      assert.strictEqual(status, 403);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.code, 'ADMIN_ACCESS_REQUIRED');
      assert.strictEqual(
        body.error,
        'Access denied: administrator access requires a verified Google-authenticated account.'
      );
    });

    it('should allow Google-authenticated allowlisted admin users with 200', async () => {
      const { status, body } = await makeRequest('/api/test-admin/dashboard', adminToken);
      assert.strictEqual(status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.userId, adminUser._id.toString());
    });

    it('should reject password-based account (authProvider: local) even if email matches allowlist', async () => {
      const localAdminEmail = `local_imposter_${Date.now()}@habithero.test`;
      const localUser = await User.create({
        name: 'Unverified Local Account',
        email: localAdminEmail,
        password: 'hashedPassword123!',
        authProvider: 'local',
        timezone: 'UTC',
      });

      process.env.ADMIN_EMAILS = `${adminUser.email},${localAdminEmail}`;

      const localToken = generateToken(localUser._id.toString(), localUser.email, localUser.name);
      const { status, body } = await makeRequest('/api/test-admin/dashboard', localToken);

      assert.strictEqual(status, 403);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.code, 'ADMIN_ACCESS_REQUIRED');
      assert.strictEqual(
        body.error,
        'Access denied: administrator access requires a verified Google-authenticated account.'
      );

      await User.findByIdAndDelete(localUser._id);
      process.env.ADMIN_EMAILS = `${adminUser.email}`;
    });

    it('should reject user with missing or invalid authProvider with 403', async () => {
      const missingProviderEmail = `missing_prov_${Date.now()}@habithero.test`;
      const rawUser = await User.collection.insertOne({
        name: 'Missing Provider User',
        email: missingProviderEmail,
        timezone: 'UTC',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      process.env.ADMIN_EMAILS = `${adminUser.email},${missingProviderEmail}`;

      const token = generateToken(rawUser.insertedId.toString(), missingProviderEmail, 'Missing Provider');
      const { status, body } = await makeRequest('/api/test-admin/dashboard', token);

      assert.strictEqual(status, 403);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.code, 'ADMIN_ACCESS_REQUIRED');
      assert.strictEqual(
        body.error,
        'Access denied: administrator access requires a verified Google-authenticated account.'
      );

      await User.findByIdAndDelete(rawUser.insertedId);
      process.env.ADMIN_EMAILS = `${adminUser.email}`;
    });

    it('should reject Google-authenticated user not on the allowlist with 403', async () => {
      const nonAdminGoogleUser = await User.create({
        name: 'Non-Admin Google User',
        email: `nonadmin_${Date.now()}@habithero.test`,
        authProvider: 'google',
        googleId: `google_nonadmin_${Date.now()}`,
        timezone: 'UTC',
      });

      const token = generateToken(
        nonAdminGoogleUser._id.toString(),
        nonAdminGoogleUser.email,
        nonAdminGoogleUser.name
      );
      const { status, body } = await makeRequest('/api/test-admin/dashboard', token);

      assert.strictEqual(status, 403);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.code, 'ADMIN_ACCESS_REQUIRED');
      assert.strictEqual(body.error, 'Access denied: administrator privileges required.');

      await User.findByIdAndDelete(nonAdminGoogleUser._id);
    });

    it('should support case-insensitive admin email matching for Google-authenticated users', async () => {
      const mixedCaseUser = await User.create({
        name: 'Mixed Case Google Admin',
        email: `MixedAdmin_${Date.now()}@HabitHero.TEST`,
        authProvider: 'google',
        googleId: `google_mixed_${Date.now()}`,
        timezone: 'UTC',
      });

      process.env.ADMIN_EMAILS = `${adminUser.email},mixedadmin_${Date.now()}@habithero.test,${mixedCaseUser.email.toLowerCase()}`;

      const mixedToken = generateToken(
        mixedCaseUser._id.toString(),
        mixedCaseUser.email,
        mixedCaseUser.name
      );

      const { status, body } = await makeRequest('/api/test-admin/dashboard', mixedToken);
      assert.strictEqual(status, 200);
      assert.strictEqual(body.success, true);

      await User.findByIdAndDelete(mixedCaseUser._id);
      process.env.ADMIN_EMAILS = `${adminUser.email}`;
    });

    it('should fail closed with 403 when ADMIN_EMAILS is empty or unset', async () => {
      delete process.env.ADMIN_EMAILS;
      assert.deepStrictEqual(getAdminEmails(), []);

      const { status, body } = await makeRequest('/api/test-admin/dashboard', adminToken);
      assert.strictEqual(status, 403);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.code, 'ADMIN_ACCESS_REQUIRED');
      assert.strictEqual(body.error, 'Administrator access is not configured on this server.');

      process.env.ADMIN_EMAILS = `${adminUser.email}`;
    });

    it('should reject request with 403 if user ID from token does not exist in MongoDB', async () => {
      const ghostId = new Types.ObjectId().toString();
      const ghostToken = generateToken(ghostId, adminUser.email, 'Ghost Admin');

      const { status, body } = await makeRequest('/api/test-admin/dashboard', ghostToken);
      assert.strictEqual(status, 403);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.code, 'ADMIN_ACCESS_REQUIRED');
      assert.strictEqual(body.error, 'Access denied: user account not found.');
    });
  });

  // =========================================================================
  // 4. Public Feedback APIs (GET /api/feedback & POST /api/feedback)
  // =========================================================================
  describe('Public Feedback APIs', () => {
    let approvedFeedback1: any;
    let approvedFeedback2: any;
    let pendingFeedback: any;
    let rejectedFeedback: any;
    let spamFeedback: any;

    before(async () => {
      // Seed test feedback with various moderation and status states
      approvedFeedback1 = await Feedback.create({
        title: 'Automated Test: Dark mode for dashboard',
        description: 'Please add a dark mode theme to protect our eyes at night.',
        category: 'feature_request',
        status: 'in_progress',
        moderationStatus: 'approved',
        displayName: 'Night Owl',
        email: 'nightowl@example.com',
        officialReplies: [
          {
            authorName: 'HabitHero Team',
            authorId: adminUser._id,
            content: 'We are working on dark mode right now!',
          },
        ],
      });

      approvedFeedback2 = await Feedback.create({
        title: 'Automated Test: Habit streak reset bug',
        description: 'My streak reset prematurely despite completing tasks yesterday.',
        category: 'bug_report',
        status: 'under_review',
        moderationStatus: 'approved',
        displayName: 'Bug Hunter',
        email: 'bughunter@example.com',
      });

      pendingFeedback = await Feedback.create({
        title: 'Automated Test: Pending Moderation Feedback',
        description: 'This feedback is pending review and should NOT appear publicly.',
        category: 'general',
        status: 'under_review',
        moderationStatus: 'pending',
        displayName: 'Cautious User',
        email: 'pending@example.com',
      });

      rejectedFeedback = await Feedback.create({
        title: 'Automated Test: Rejected Spam Item',
        description: 'Spammy promotional text that was rejected by moderator.',
        category: 'general',
        status: 'declined',
        moderationStatus: 'rejected',
        displayName: 'Declined Submitter',
        email: 'rejected@example.com',
      });

      spamFeedback = await Feedback.create({
        title: 'Automated Test: Flagged Spam Feedback With URLs',
        description: 'Check out cheap crypto deals at fake-link dot com!',
        category: 'general',
        status: 'under_review',
        moderationStatus: 'spam',
        displayName: 'Bot Spammer',
        email: 'bot@example.com',
      });
    });

    after(async () => {
      await Feedback.deleteMany({
        _id: { $in: [approvedFeedback1._id, approvedFeedback2._id, pendingFeedback._id, rejectedFeedback._id, spamFeedback._id] },
      });
    });

    it('GET /api/feedback returns only approved feedback and excludes pending, rejected, and spam items', async () => {
      const { status, body } = await makeRequest('/api/feedback');
      assert.strictEqual(status, 200);
      assert.strictEqual(body.success, true);
      assert.ok(Array.isArray(body.data));

      const titles = body.data.map((item: any) => item.title);
      assert.ok(titles.includes('Automated Test: Dark mode for dashboard'));
      assert.ok(titles.includes('Automated Test: Habit streak reset bug'));
      assert.ok(!titles.includes('Automated Test: Pending Moderation Feedback'), 'Pending feedback MUST NOT be in public results');
      assert.ok(!titles.includes('Automated Test: Rejected Spam Item'), 'Rejected feedback MUST NOT be in public results');
      assert.ok(!titles.includes('Automated Test: Flagged Spam Feedback With URLs'), 'Spam feedback MUST NOT be in public results');
    });

    it('GET /api/feedback supports category and status filtering', async () => {
      // Category filter: bug_report
      const { status: catStatus, body: catBody } = await makeRequest('/api/feedback?category=bug_report');
      assert.strictEqual(catStatus, 200);
      const bugTitles = catBody.data.map((i: any) => i.title);
      assert.ok(bugTitles.includes('Automated Test: Habit streak reset bug'));
      assert.ok(!bugTitles.includes('Automated Test: Dark mode for dashboard'));

      // Status filter: in_progress
      const { status: statStatus, body: statBody } = await makeRequest('/api/feedback?status=in_progress');
      assert.strictEqual(statStatus, 200);
      const inProgTitles = statBody.data.map((i: any) => i.title);
      assert.ok(inProgTitles.includes('Automated Test: Dark mode for dashboard'));
      assert.ok(!inProgTitles.includes('Automated Test: Habit streak reset bug'));
    });

    it('GET /api/feedback supports pagination parameters', async () => {
      const { status, body } = await makeRequest('/api/feedback?page=1&limit=1');
      assert.strictEqual(status, 200);
      assert.strictEqual(body.data.length, 1);
      assert.strictEqual(body.pagination.page, 1);
      assert.strictEqual(body.pagination.limit, 1);
      assert.ok(body.pagination.total >= 2);
      assert.ok(body.pagination.totalPages >= 2);
    });

    it('GET /api/feedback never exposes submitter email or officialReplies.authorId', async () => {
      const { status, body } = await makeRequest('/api/feedback');
      assert.strictEqual(status, 200);

      for (const item of body.data) {
        assert.strictEqual(item.email, undefined, 'Public feedback must never expose submitter email');
        assert.strictEqual(item.moderationStatus, undefined, 'Public feedback should not expose internal moderation status');
        if (item.officialReplies && item.officialReplies.length > 0) {
          for (const reply of item.officialReplies) {
            assert.strictEqual(reply.authorId, undefined, 'Public replies must NEVER expose admin authorId');
            assert.strictEqual(reply.authorName, 'HabitHero Team');
          }
        }
      }
    });

    it('POST /api/feedback allows anonymous submission and forces moderationStatus to pending', async () => {
      const submission = {
        title: 'Automated Test: Anonymous Habit Audio Chimes',
        description: 'Provide an option to play sound effects when finishing habits.',
        category: 'feature_request',
        displayName: 'Sound Fan',
        email: 'sounds@example.com',
      };

      const { status, body } = await makeRequest('/api/feedback', undefined, {
        method: 'POST',
        body: JSON.stringify(submission),
      });

      assert.strictEqual(status, 201);
      assert.strictEqual(body.success, true);
      assert.ok(body.data._id);
      assert.strictEqual(body.data.title, submission.title);
      assert.strictEqual(body.data.email, undefined, 'Response data must not echo private submitter email');

      // Verify database record
      const dbRecord = await Feedback.findById(body.data._id).select('+email').lean();
      assert.ok(dbRecord);
      assert.strictEqual(dbRecord.moderationStatus, 'pending', 'New submissions must default to pending');
      assert.strictEqual(dbRecord.status, 'under_review', 'New submissions must default to under_review');
      assert.strictEqual(dbRecord.email, 'sounds@example.com');

      // Verify that this new submission is NOT visible on GET /api/feedback
      const publicList = await makeRequest('/api/feedback');
      const publicTitles = publicList.body.data.map((i: any) => i.title);
      assert.ok(!publicTitles.includes(submission.title), 'Unmoderated submission must not be visible publicly');

      await Feedback.findByIdAndDelete(body.data._id);
    });

    it('POST /api/feedback rejects invalid submissions with 400', async () => {
      // Too short title
      const { status, body } = await makeRequest('/api/feedback', undefined, {
        method: 'POST',
        body: JSON.stringify({
          title: 'No',
          description: 'This is long enough for a description.',
          category: 'general',
        }),
      });
      assert.strictEqual(status, 400);
      assert.strictEqual(body.success, false);
    });

    it('POST /api/feedback rejects client attempts to inject moderationStatus or status', async () => {
      const { status, body } = await makeRequest('/api/feedback', undefined, {
        method: 'POST',
        body: JSON.stringify({
          title: 'Automated Test: Injected Admin Field',
          description: 'Trying to sneak approved moderationStatus into body.',
          category: 'general',
          moderationStatus: 'approved',
        }),
      });
      assert.strictEqual(status, 400);
      assert.strictEqual(body.success, false);
    });

    it('POST /api/feedback enforces anonymous submission rate limiting (5 per 15 mins)', async () => {
      FeedbackRateLimiter.reset();

      const validPayload = {
        title: 'Automated Test: Rate limit burst',
        description: 'Testing rate limit burst functionality.',
        category: 'general',
      };

      const createdIds: string[] = [];

      // Send 5 requests (all should succeed)
      for (let i = 0; i < 5; i++) {
        const res = await makeRequest('/api/feedback', undefined, {
          method: 'POST',
          body: JSON.stringify(validPayload),
        });
        assert.strictEqual(res.status, 201, `Submission ${i + 1} should succeed`);
        if (res.body?.data?._id) createdIds.push(res.body.data._id);
      }

      // 6th request must be rejected with 429
      const excessRes = await makeRequest('/api/feedback', undefined, {
        method: 'POST',
        body: JSON.stringify(validPayload),
      });
      assert.strictEqual(excessRes.status, 429);
      assert.strictEqual(excessRes.body.success, false);
      assert.ok(excessRes.headers.get('retry-after'), 'Must include Retry-After header');

      // Cleanup
      await Feedback.deleteMany({ _id: { $in: createdIds } });
      FeedbackRateLimiter.reset();
    });

    it('POST /api/feedback provides independent rate-limit quotas for distinct client IPs', async () => {
      FeedbackRateLimiter.reset();

      const validPayload = {
        title: 'Automated Test: Independent IP quota test',
        description: 'Verifying separate IP rate limit isolation.',
        category: 'general',
      };

      const createdIds: string[] = [];
      const ipAlpha = '198.51.100.11';
      const ipBeta = '198.51.100.22';

      // Exhaust IP Alpha's quota (5 submissions)
      for (let i = 0; i < 5; i++) {
        const res = await makeRequest('/api/feedback', undefined, {
          method: 'POST',
          headers: { 'X-Forwarded-For': ipAlpha },
          body: JSON.stringify(validPayload),
        });
        assert.strictEqual(res.status, 201);
        if (res.body?.data?._id) createdIds.push(res.body.data._id);
      }

      // 6th submission from IP Alpha is rate-limited (429)
      const alphaBlocked = await makeRequest('/api/feedback', undefined, {
        method: 'POST',
        headers: { 'X-Forwarded-For': ipAlpha },
        body: JSON.stringify(validPayload),
      });
      assert.strictEqual(alphaBlocked.status, 429);

      // Submission from IP Beta must SUCCEED independently (201)
      const betaAllowed = await makeRequest('/api/feedback', undefined, {
        method: 'POST',
        headers: { 'X-Forwarded-For': ipBeta },
        body: JSON.stringify(validPayload),
      });
      assert.strictEqual(betaAllowed.status, 201, 'IP Beta must not be affected by IP Alpha rate limit');
      if (betaAllowed.body?.data?._id) createdIds.push(betaAllowed.body.data._id);

      // Cleanup
      await Feedback.deleteMany({ _id: { $in: createdIds } });
      FeedbackRateLimiter.reset();
    });

    it('Rate limiter deletes expired IP buckets to prevent memory accumulation', async () => {
      FeedbackRateLimiter.reset();

      // Submit from a temporary IP
      const tempIp = '203.0.113.99';
      const res = await makeRequest('/api/feedback', undefined, {
        method: 'POST',
        headers: { 'X-Forwarded-For': tempIp },
        body: JSON.stringify({
          title: 'Automated Test: Memory bucket cleanup',
          description: 'Testing deletion of empty timestamp buckets.',
          category: 'improvement',
        }),
      });
      assert.strictEqual(res.status, 201);
      if (res.body?.data?._id) {
        await Feedback.findByIdAndDelete(res.body.data._id);
      }

      assert.strictEqual(FeedbackRateLimiter.getBucketCount(), 1);

      // Manually simulate expiration by shifting window back in time
      const originalWindow = FeedbackRateLimiter.WINDOW_MS;
      FeedbackRateLimiter.WINDOW_MS = 0; // Everything is immediately expired
      const pruned = FeedbackRateLimiter.sweepExpired();
      assert.strictEqual(pruned, 1, 'Expired bucket must be pruned from memory map');
      assert.strictEqual(FeedbackRateLimiter.getBucketCount(), 0, 'Memory bucket count must return to 0');

      FeedbackRateLimiter.WINDOW_MS = originalWindow;
      FeedbackRateLimiter.reset();
    });
  });

  // =========================================================================
  // 5. Admin Feedback APIs (/api/feedback/admin/...)
  // =========================================================================
  describe('Administrator Moderation, Status & Official Reply APIs', () => {
    let testItem: any;
    let pendingItem: any;
    let rejectedItem: any;
    let spamItem: any;

    before(async () => {
      testItem = await Feedback.create({
        title: 'Automated Test: Item for Admin Workflows',
        description: 'Description of item being moderated and replied to.',
        category: 'feature_request',
        status: 'under_review',
        moderationStatus: 'pending',
        displayName: 'Submitting Member',
        email: 'member_private@example.com',
      });

      pendingItem = await Feedback.create({
        title: 'Automated Test: Strictly Pending Feedback Item',
        description: 'This pending item tests rejection of premature status updates.',
        category: 'general',
        status: 'under_review',
        moderationStatus: 'pending',
      });

      rejectedItem = await Feedback.create({
        title: 'Automated Test: Rejected Feedback Item',
        description: 'This rejected item tests status change rejection.',
        category: 'general',
        status: 'under_review',
        moderationStatus: 'rejected',
      });

      spamItem = await Feedback.create({
        title: 'Automated Test: Spam Feedback Item',
        description: 'This spam item tests status change rejection.',
        category: 'general',
        status: 'under_review',
        moderationStatus: 'spam',
      });
    });

    after(async () => {
      await Feedback.deleteMany({
        _id: { $in: [testItem._id, pendingItem._id, rejectedItem._id, spamItem._id] },
      });
    });

    it('GET /api/feedback/admin rejects unauthenticated requests with 401', async () => {
      const { status } = await makeRequest('/api/feedback/admin');
      assert.strictEqual(status, 401);
    });

    it('GET /api/feedback/admin rejects regular non-admin user with 403', async () => {
      const { status } = await makeRequest('/api/feedback/admin', regularToken);
      assert.strictEqual(status, 403);
    });

    it('GET /api/feedback/admin allows Google-authenticated admin and includes submitter email', async () => {
      const { status, body } = await makeRequest('/api/feedback/admin', adminToken);
      assert.strictEqual(status, 200);
      assert.strictEqual(body.success, true);
      assert.ok(Array.isArray(body.data));

      const found = body.data.find((item: any) => item._id === testItem._id.toString());
      assert.ok(found, 'Admin list should contain test feedback');
      assert.strictEqual(found.email, 'member_private@example.com', 'Admin list MUST include submitter email');
    });

    it('PATCH /api/feedback/admin/:id/status strictly rejects status updates on pending feedback with 400', async () => {
      const { status, body } = await makeRequest(
        `/api/feedback/admin/${pendingItem._id}/status`,
        adminToken,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'in_progress' }),
        }
      );

      assert.strictEqual(status, 400);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.code, 'FEEDBACK_NOT_APPROVED');
      assert.ok(body.error.includes('feedback submission has not been approved'));

      // Verify status in DB was NOT modified
      const doc = await Feedback.findById(pendingItem._id);
      assert.strictEqual(doc?.status, 'under_review');
      assert.strictEqual(doc?.moderationStatus, 'pending');
    });

    it('PATCH /api/feedback/admin/:id/status strictly rejects status updates on rejected and spam feedback with 400', async () => {
      // Attempt status change on rejected item
      const { status: rejStatus, body: rejBody } = await makeRequest(
        `/api/feedback/admin/${rejectedItem._id}/status`,
        adminToken,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'declined' }),
        }
      );
      assert.strictEqual(rejStatus, 400);
      assert.strictEqual(rejBody.code, 'FEEDBACK_NOT_APPROVED');

      // Attempt status change on spam item
      const { status: spamStatus, body: spamBody } = await makeRequest(
        `/api/feedback/admin/${spamItem._id}/status`,
        adminToken,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'declined' }),
        }
      );
      assert.strictEqual(spamStatus, 400);
      assert.strictEqual(spamBody.code, 'FEEDBACK_NOT_APPROVED');
    });

    it('PATCH /api/feedback/admin/:id/moderation updates moderation status to approved', async () => {
      const { status, body } = await makeRequest(
        `/api/feedback/admin/${testItem._id}/moderation`,
        adminToken,
        {
          method: 'PATCH',
          body: JSON.stringify({ moderationStatus: 'approved' }),
        }
      );

      assert.strictEqual(status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.moderationStatus, 'approved');

      // Verify that it is now visible in the public GET /api/feedback list
      const publicRes = await makeRequest('/api/feedback');
      const publicIds = publicRes.body.data.map((i: any) => i._id);
      assert.ok(publicIds.includes(testItem._id.toString()), 'Approved feedback must now be publicly visible');
    });

    it('PATCH /api/feedback/admin/:id/moderation rejects invalid moderation status with 400', async () => {
      const { status } = await makeRequest(
        `/api/feedback/admin/${testItem._id}/moderation`,
        adminToken,
        {
          method: 'PATCH',
          body: JSON.stringify({ moderationStatus: 'unrecognized_state' }),
        }
      );
      assert.strictEqual(status, 400);
    });

    it('PATCH /api/feedback/admin/:id/status allows updating status on approved feedback with 200', async () => {
      // testItem was approved in previous test
      const { status, body } = await makeRequest(
        `/api/feedback/admin/${testItem._id}/status`,
        adminToken,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'planned' }),
        }
      );

      assert.strictEqual(status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.status, 'planned');

      const updatedDoc = await Feedback.findById(testItem._id);
      assert.strictEqual(updatedDoc?.status, 'planned');
    });

    it('PATCH /api/feedback/admin/:id/status rejects invalid status with 400', async () => {
      const { status } = await makeRequest(
        `/api/feedback/admin/${testItem._id}/status`,
        adminToken,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'invalid_status' }),
        }
      );
      assert.strictEqual(status, 400);
    });

    it('POST /api/feedback/admin/:id/replies adds official team reply with server-controlled authorName', async () => {
      const replyPayload = {
        content: 'We have evaluated this feature and planned it for our Q1 roadmap.',
      };

      const { status, body } = await makeRequest(
        `/api/feedback/admin/${testItem._id}/replies`,
        adminToken,
        {
          method: 'POST',
          body: JSON.stringify(replyPayload),
        }
      );

      assert.strictEqual(status, 201);
      assert.strictEqual(body.success, true);
      assert.ok(body.data.officialReplies);
      const reply = body.data.officialReplies[body.data.officialReplies.length - 1];
      assert.strictEqual(reply.authorName, 'HabitHero Team');
      assert.strictEqual(reply.content, replyPayload.content);

      // Verify public viewing does not leak authorId
      const publicRes = await makeRequest('/api/feedback');
      const publicItem = publicRes.body.data.find((i: any) => i._id === testItem._id.toString());
      assert.ok(publicItem);
      assert.strictEqual(publicItem.officialReplies.length, 1);
      assert.strictEqual(publicItem.officialReplies[0].authorName, 'HabitHero Team');
      assert.strictEqual(publicItem.officialReplies[0].authorId, undefined, 'Public reply MUST NOT expose authorId');
    });

    it('POST /api/feedback/admin/:id/replies rejects reply content below minimum or above maximum length with 400', async () => {
      // Content < 2 characters
      const { status: shortStatus } = await makeRequest(
        `/api/feedback/admin/${testItem._id}/replies`,
        adminToken,
        {
          method: 'POST',
          body: JSON.stringify({ content: 'X' }),
        }
      );
      assert.strictEqual(shortStatus, 400);

      // Content > 2000 characters
      const { status: longStatus } = await makeRequest(
        `/api/feedback/admin/${testItem._id}/replies`,
        adminToken,
        {
          method: 'POST',
          body: JSON.stringify({ content: 'Z'.repeat(2001) }),
        }
      );
      assert.strictEqual(longStatus, 400);
    });

    it('POST /api/feedback/admin/:id/replies rejects client attempts to inject authorName with 400', async () => {
      const maliciousReply = {
        content: 'Valid content long enough.',
        authorName: 'Spoofed Imposter',
      };

      const { status } = await makeRequest(
        `/api/feedback/admin/${testItem._id}/replies`,
        adminToken,
        {
          method: 'POST',
          body: JSON.stringify(maliciousReply),
        }
      );
      assert.strictEqual(status, 400, 'Zod strictness must reject unexpected authorName in reply');
    });

    it('Admin routes reject malformed feedback IDs with 400 and non-existent IDs with 404', async () => {
      // Malformed ID
      const { status: badModId } = await makeRequest(
        '/api/feedback/admin/invalid-hex-id/moderation',
        adminToken,
        {
          method: 'PATCH',
          body: JSON.stringify({ moderationStatus: 'approved' }),
        }
      );
      assert.strictEqual(badModId, 400);

      // Non-existent ID
      const ghostId = new Types.ObjectId().toString();
      const { status: notFoundModId } = await makeRequest(
        `/api/feedback/admin/${ghostId}/moderation`,
        adminToken,
        {
          method: 'PATCH',
          body: JSON.stringify({ moderationStatus: 'approved' }),
        }
      );
      assert.strictEqual(notFoundModId, 404);
    });
  });
});
