import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';
import { Goal } from '../models/Goal.js';
import { Task } from '../models/Task.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { CheckIn } from '../models/CheckIn.js';
import { EmailService } from './emailService.js';
import { TokenRevocationService } from './tokenRevocationService.js';
import { GoogleAuthService } from './googleAuthService.js';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (
      !secret ||
      secret === 'habithero_development_jwt_secret_token_2026' ||
      secret === 'your_jwt_secret_key_change_in_production' ||
      secret.length < 16
    ) {
      throw new Error('Production security error: Insecure or missing JWT_SECRET');
    }
    return secret;
  }
  return secret || 'habithero_development_jwt_secret_token_2026';
};

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface ForgotPasswordDTO {
  email: string;
  clientIp?: string;
  userAgent?: string;
}

export interface ResetPasswordDTO {
  token: string;
  password: string;
}

export class AuthService {
  static async register(dto: RegisterDTO) {
    const existing = await User.findOne({ email: dto.email.toLowerCase() });
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await User.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash,
    });

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, name: user.name },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    };
  }

  static async login(dto: LoginDTO) {
    const user = await User.findOne({ email: dto.email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new Error('This account was created with Google Sign-In. Please sign in with Google or use forgot password to set a password.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, name: user.name },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    };
  }

  static async googleAuth(idToken: string) {
    // 1. Verify Google ID token cryptographically
    const googleProfile = await GoogleAuthService.verifyIdToken(idToken);
    const normalizedEmail = googleProfile.email.toLowerCase();

    // 2. Locate existing user by googleId or verified email
    let user = await User.findOne({
      $or: [
        { googleId: googleProfile.googleId },
        { email: normalizedEmail },
      ],
    });

    let isNewUser = false;

    if (user) {
      // 3. User exists: link googleId and avatar if not present
      let shouldSave = false;
      if (!user.googleId) {
        user.googleId = googleProfile.googleId;
        shouldSave = true;
      }
      if (googleProfile.picture && !user.avatarUrl) {
        user.avatarUrl = googleProfile.picture;
        shouldSave = true;
      }
      if (shouldSave) {
        await user.save();
      }
    } else {
      // 4. User does not exist: create new Google user record
      isNewUser = true;
      user = await User.create({
        name: googleProfile.name,
        email: normalizedEmail,
        googleId: googleProfile.googleId,
        avatarUrl: googleProfile.picture,
        authProvider: 'google',
      });
    }

    // 5. Generate standard JWT session token
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, name: user.name },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      isNewUser,
    };
  }

  static async getMe(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      fetchAddress: user.fetchAddress,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }

  /**
   * Safely merges an auto-provisioned placeholder ASI account into a destination web user account.
   * Requires a MongoDB transaction in production to guarantee atomic reassignment and deletion.
   * In production, non-transactional fallback is strictly prohibited. If transactions are unavailable
   * or fail, operations fail safely without modifying account data.
   */
  private static async mergePlaceholderAccount(
    destinationUser: any,
    placeholderUser: any,
    normalizedAddress: string
  ): Promise<void> {
    const destUserId = destinationUser._id;
    const sourceUserId = placeholderUser._id;
    const isProduction = process.env.NODE_ENV === 'production';

    // Snapshot existing IDs for rollback safety (used in dev/test fallback if transactions are unsupported)
    const [goalIds, taskIds, convIds, msgIds, checkInIds] = await Promise.all([
      Goal.find({ userId: sourceUserId }).distinct('_id'),
      Task.find({ userId: sourceUserId }).distinct('_id'),
      Conversation.find({ userId: sourceUserId }).distinct('_id'),
      Message.find({ userId: sourceUserId }).distinct('_id'),
      CheckIn.find({ userId: sourceUserId }).distinct('_id'),
    ]);

    let session: mongoose.ClientSession | null = null;
    let transactionCommitted = false;

    try {
      session = await mongoose.startSession();
    } catch (err: any) {
      if (isProduction) {
        throw new Error(`Database transaction unavailable in production: ${err.message || 'Cannot start session'}. Account linking aborted.`);
      }
      session = null;
    }

    if (session) {
      try {
        await session.withTransaction(async () => {
          await Goal.updateMany({ userId: sourceUserId }, { $set: { userId: destUserId } }, { session });
          await Task.updateMany({ userId: sourceUserId }, { $set: { userId: destUserId } }, { session });
          await Conversation.updateMany({ userId: sourceUserId }, { $set: { userId: destUserId } }, { session });
          await Message.updateMany({ userId: sourceUserId }, { $set: { userId: destUserId } }, { session });
          await CheckIn.updateMany({ userId: sourceUserId }, { $set: { userId: destUserId } }, { session });

          // Release the unique fetchAddress index by deleting the placeholder within the transaction boundary
          await User.deleteOne({ _id: sourceUserId }, { session });

          destinationUser.fetchAddress = normalizedAddress;
          await destinationUser.save({ session });
        });
        transactionCommitted = true;
      } catch (txnError: any) {
        const isUnsupported =
          txnError.message?.includes('replica set') ||
          txnError.message?.includes('Transaction numbers are only allowed') ||
          txnError.code === 263 ||
          txnError.codeName === 'OperationNotSupportedInTransaction';

        if (isProduction || !isUnsupported) {
          // In production or on genuine transaction errors, fail safely without modifying data
          throw txnError;
        }
      } finally {
        await session.endSession();
      }
    }

    if (!transactionCommitted) {
      if (isProduction) {
        throw new Error('Fetch.ai account linking strictly requires a successful MongoDB transaction in production. Operations aborted safely without modifying account data.');
      }

      // Standalone dev/test fallback path with compensating rollback when transactions are unsupported by the local environment
      await User.updateOne({ _id: sourceUserId }, { $unset: { fetchAddress: 1 } });

      try {
        if (goalIds.length > 0) {
          await Goal.updateMany({ _id: { $in: goalIds } }, { $set: { userId: destUserId } });
        }
        if (taskIds.length > 0) {
          await Task.updateMany({ _id: { $in: taskIds } }, { $set: { userId: destUserId } });
        }
        if (convIds.length > 0) {
          await Conversation.updateMany({ _id: { $in: convIds } }, { $set: { userId: destUserId } });
        }
        if (msgIds.length > 0) {
          await Message.updateMany({ _id: { $in: msgIds } }, { $set: { userId: destUserId } });
        }
        if (checkInIds.length > 0) {
          await CheckIn.updateMany({ _id: { $in: checkInIds } }, { $set: { userId: destUserId } });
        }

        destinationUser.fetchAddress = normalizedAddress;
        await destinationUser.save();

        // Delete the placeholder user only AFTER destination user save has succeeded
        await User.deleteOne({ _id: sourceUserId });
      } catch (err) {
        // Compensating rollback: restore records and restore placeholder fetchAddress
        await Promise.allSettled([
          User.updateOne({ _id: sourceUserId }, { $set: { fetchAddress: normalizedAddress } }),
          goalIds.length > 0 ? Goal.updateMany({ _id: { $in: goalIds } }, { $set: { userId: sourceUserId } }) : Promise.resolve(),
          taskIds.length > 0 ? Task.updateMany({ _id: { $in: taskIds } }, { $set: { userId: sourceUserId } }) : Promise.resolve(),
          convIds.length > 0 ? Conversation.updateMany({ _id: { $in: convIds } }, { $set: { userId: sourceUserId } }) : Promise.resolve(),
          msgIds.length > 0 ? Message.updateMany({ _id: { $in: msgIds } }, { $set: { userId: sourceUserId } }) : Promise.resolve(),
          checkInIds.length > 0 ? CheckIn.updateMany({ _id: { $in: checkInIds } }, { $set: { userId: sourceUserId } }) : Promise.resolve(),
        ]);
        throw err;
      }
    }
  }

  static async updateMe(userId: string, data: { name?: string; fetchAddress?: string }) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    if (data.name && data.name.trim()) {
      user.name = data.name.trim();
    }
    if (data.fetchAddress !== undefined) {
      const normalizedAddress = data.fetchAddress.trim();
      if (normalizedAddress === '') {
        user.fetchAddress = undefined;
        await user.save();
      } else {
        const existingWithAddress = await User.findOne({ fetchAddress: normalizedAddress });
        if (existingWithAddress && !existingWithAddress._id.equals(user._id)) {
          // If the existing user is an auto-provisioned placeholder ASI user, safely merge records
          if (existingWithAddress.email.endsWith('@fetchai.agent') && !existingWithAddress.googleId) {
            await AuthService.mergePlaceholderAccount(user, existingWithAddress, normalizedAddress);
          } else {
            throw new Error('This Fetch.ai address is already linked to another HabitHero account');
          }
        } else {
          user.fetchAddress = normalizedAddress;
          await user.save();
        }
      }
    } else {
      await user.save();
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      fetchAddress: user.fetchAddress,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }

  /**
   * Secure Forgot Password request
   * Always returns a generic response regardless of whether the email exists.
   */
  static async requestPasswordReset(dto: ForgotPasswordDTO): Promise<{ message: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const genericResponse = {
      message: 'If an account exists with that email address, password reset instructions have been sent.',
    };

    // 1. Locate user by email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Mitigate timing attack: simulate subtle crypto hashing workload
      crypto.pbkdf2Sync(normalizedEmail, 'timing-defense-salt', 1000, 32, 'sha256');
      return genericResponse;
    }

    // 2. Invalidate all previous unused reset tokens for this account
    await PasswordResetToken.updateMany(
      { userId: user._id, usedAt: null },
      { $set: { usedAt: new Date() } }
    );

    // 3. Generate cryptographically strong random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 4. Set 15-minute expiration
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // 5. Store only the SHA-256 hash
    await PasswordResetToken.create({
      userId: user._id,
      email: user.email,
      tokenHash,
      expiresAt,
      clientIp: dto.clientIp,
      userAgent: dto.userAgent,
    });

    // 6. Dispatch transactional email via Resend
    try {
      await EmailService.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        rawToken,
      });
    } catch (err: any) {
      // Safe error logging: never leak the raw token or secret details
      console.error('[AuthService] Failed to send password reset email:', err?.message || err);
    }

    // 7. Generic response (never exposes token or internal user details)
    return genericResponse;
  }

  /**
   * Secure Reset Password completion
   * Verifies token hash, expiration, and single-use atomicity.
   */
  static async resetPassword(dto: ResetPasswordDTO): Promise<{ message: string }> {
    const rawToken = dto.token.trim();
    if (!rawToken || rawToken.length < 10) {
      throw new Error('Invalid or expired password reset link. Please request a new one.');
    }

    // Hash the supplied token to compare against database hash
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Atomically find and mark the token as used in a single operation
    // This prevents simultaneous requests from reusing the same token (race conditions)
    const resetRecord = await PasswordResetToken.findOneAndUpdate(
      {
        tokenHash,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: { usedAt: new Date() },
      },
      { new: true }
    );

    if (!resetRecord) {
      throw new Error('Invalid or expired password reset link. Please request a new one.');
    }

    // Validate password length and strength
    if (!dto.password || dto.password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    // Find the associated user
    const user = await User.findById(resetRecord.userId).select('+passwordHash');
    if (!user) {
      throw new Error('Account associated with this reset link was not found.');
    }

    // Hash new password using existing bcrypt configuration
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    // Save updated password and record timestamp
    const now = new Date();
    user.passwordHash = passwordHash;
    user.passwordChangedAt = now;
    await user.save();

    // Invalidate existing JWT sessions for this user
    await TokenRevocationService.revokeAllSessions(user._id.toString(), now);

    // Invalidate any other pending tokens for this account
    await PasswordResetToken.updateMany(
      { userId: user._id, usedAt: null },
      { $set: { usedAt: now } }
    );

    return {
      message: 'Your password has been reset successfully. You can now sign in with your new password.',
    };
  }
}
