import { User } from '../models/User.js';

export class TokenRevocationService {
  // In-memory revocation cache: userId -> revocation timestamp in ms
  private static revokedUsers = new Map<string, number>();

  /**
   * Invalidate all current JWT sessions for a user (called upon password reset).
   */
  static async revokeAllSessions(userId: string, revokedAt?: Date): Promise<number> {
    const timestamp = revokedAt ? revokedAt.getTime() : Date.now();
    this.revokedUsers.set(userId, timestamp);

    try {
      // Ensure persistence on user document
      await User.findByIdAndUpdate(userId, {
        $set: { passwordChangedAt: new Date(timestamp) },
      });
    } catch (err) {
      console.error('[TokenRevocationService] Failed to persist passwordChangedAt to DB:', err);
    }

    return timestamp;
  }

  /**
   * Check if a JWT token issued at `iatSeconds` has been revoked for this user.
   * Compares in whole seconds since JWT `iat` is specified in seconds.
   */
  static isRevoked(userId: string, iatSeconds?: number): boolean {
    if (!iatSeconds) {
      // Tokens without iat are considered unsafe if user has a revocation entry
      return this.revokedUsers.has(userId);
    }

    const revokedAtMs = this.revokedUsers.get(userId);
    if (!revokedAtMs) {
      return false;
    }

    const revokedAtSeconds = Math.floor(revokedAtMs / 1000);
    // Any token issued in a second strictly before the password change second is revoked
    return iatSeconds < revokedAtSeconds;
  }

  /**
   * Populate revocation cache from database if needed (e.g., on first lookup)
   */
  static async checkPersistentRevocation(userId: string, iatSeconds?: number): Promise<boolean> {
    if (this.isRevoked(userId, iatSeconds)) {
      return true;
    }

    if (!iatSeconds) {
      return false;
    }

    try {
      const user = await User.findById(userId).select('passwordChangedAt');
      if (user?.passwordChangedAt) {
        const changedAtMs = user.passwordChangedAt.getTime();
        this.revokedUsers.set(userId, changedAtMs);
        const changedAtSeconds = Math.floor(changedAtMs / 1000);
        return iatSeconds < changedAtSeconds;
      }
    } catch {
      // Gracefully continue
    }

    return false;
  }

  /**
   * Clear in-memory cache (primarily for unit test isolation)
   */
  static clearCache(): void {
    this.revokedUsers.clear();
  }
}
