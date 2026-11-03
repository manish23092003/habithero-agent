import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  timestamps: number[];
}

export class PasswordResetRateLimiter {
  private static ipBuckets = new Map<string, RateLimitEntry>();
  private static emailBuckets = new Map<string, RateLimitEntry>();
  private static inFlightEmails = new Set<string>();
  private static inFlightTokens = new Set<string>();

  public static FORGOT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  public static MAX_FORGOT_PER_IP = 5;
  public static MAX_FORGOT_PER_EMAIL = 3;
  public static MAX_RESET_PER_IP = 10;

  /**
   * Rate limiting and in-flight guard for POST /api/auth/forgot-password
   */
  static forgotPasswordLimit(req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const now = Date.now();
    const windowStart = now - PasswordResetRateLimiter.FORGOT_WINDOW_MS;

    // 1. IP rate check
    let ipEntry = PasswordResetRateLimiter.ipBuckets.get(ip);
    if (!ipEntry) {
      ipEntry = { timestamps: [] };
      PasswordResetRateLimiter.ipBuckets.set(ip, ipEntry);
    }
    ipEntry.timestamps = ipEntry.timestamps.filter(t => t > windowStart);
    if (ipEntry.timestamps.length >= PasswordResetRateLimiter.MAX_FORGOT_PER_IP) {
      const oldest = ipEntry.timestamps[0];
      const retryAfter = Math.max(1, Math.ceil((oldest + PasswordResetRateLimiter.FORGOT_WINDOW_MS - now) / 1000));
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({
        success: false,
        error: `Too many password reset requests from this network. Please wait ${Math.ceil(retryAfter / 60)} minute(s) before trying again.`,
      });
      return;
    }

    // 2. Email rate check (if valid email string provided)
    if (rawEmail) {
      let emailEntry = PasswordResetRateLimiter.emailBuckets.get(rawEmail);
      if (!emailEntry) {
        emailEntry = { timestamps: [] };
        PasswordResetRateLimiter.emailBuckets.set(rawEmail, emailEntry);
      }
      emailEntry.timestamps = emailEntry.timestamps.filter(t => t > windowStart);
      if (emailEntry.timestamps.length >= PasswordResetRateLimiter.MAX_FORGOT_PER_EMAIL) {
        const oldest = emailEntry.timestamps[0];
        const retryAfter = Math.max(1, Math.ceil((oldest + PasswordResetRateLimiter.FORGOT_WINDOW_MS - now) / 1000));
        res.setHeader('Retry-After', retryAfter);
        res.status(429).json({
          success: false,
          error: `Too many password reset requests for this email account. Please wait ${Math.ceil(retryAfter / 60)} minute(s) before trying again.`,
        });
        return;
      }

      // 3. In-flight concurrency lock per email
      if (PasswordResetRateLimiter.inFlightEmails.has(rawEmail)) {
        res.status(429).json({
          success: false,
          error: 'A password reset request is already currently processing for this email. Please check your inbox.',
        });
        return;
      }

      PasswordResetRateLimiter.inFlightEmails.add(rawEmail);
      emailEntry.timestamps.push(now);

      // Release lock when response finishes
      res.on('finish', () => {
        PasswordResetRateLimiter.inFlightEmails.delete(rawEmail);
      });
      res.on('close', () => {
        PasswordResetRateLimiter.inFlightEmails.delete(rawEmail);
      });
    }

    ipEntry.timestamps.push(now);
    next();
  }

  /**
   * Rate limiting and in-flight guard for POST /api/auth/reset-password
   */
  static resetPasswordLimit(req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const rawToken = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const now = Date.now();
    const windowStart = now - PasswordResetRateLimiter.FORGOT_WINDOW_MS;

    // IP rate check
    let ipEntry = PasswordResetRateLimiter.ipBuckets.get(ip);
    if (!ipEntry) {
      ipEntry = { timestamps: [] };
      PasswordResetRateLimiter.ipBuckets.set(ip, ipEntry);
    }
    ipEntry.timestamps = ipEntry.timestamps.filter(t => t > windowStart);
    if (ipEntry.timestamps.length >= PasswordResetRateLimiter.MAX_RESET_PER_IP) {
      const oldest = ipEntry.timestamps[0];
      const retryAfter = Math.max(1, Math.ceil((oldest + PasswordResetRateLimiter.FORGOT_WINDOW_MS - now) / 1000));
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({
        success: false,
        error: `Too many reset attempts from this network. Please wait ${Math.ceil(retryAfter / 60)} minute(s) before trying again.`,
      });
      return;
    }

    // In-flight concurrency guard on token
    if (rawToken) {
      if (PasswordResetRateLimiter.inFlightTokens.has(rawToken)) {
        res.status(409).json({
          success: false,
          error: 'This password reset request is already being processed.',
        });
        return;
      }
      PasswordResetRateLimiter.inFlightTokens.add(rawToken);

      res.on('finish', () => {
        PasswordResetRateLimiter.inFlightTokens.delete(rawToken);
      });
      res.on('close', () => {
        PasswordResetRateLimiter.inFlightTokens.delete(rawToken);
      });
    }

    ipEntry.timestamps.push(now);
    next();
  }

  /**
   * Clear all buckets and locks (for automated tests)
   */
  static resetForTests(): void {
    this.ipBuckets.clear();
    this.emailBuckets.clear();
    this.inFlightEmails.clear();
    this.inFlightTokens.clear();
  }
}

