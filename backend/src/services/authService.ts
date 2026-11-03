import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';
import { EmailService } from './emailService.js';
import { TokenRevocationService } from './tokenRevocationService.js';

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

  static async getMe(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  static async updateMe(userId: string, data: { name?: string }) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    if (data.name && data.name.trim()) {
      user.name = data.name.trim();
      await user.save();
    }
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
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
