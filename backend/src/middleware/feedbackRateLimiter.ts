import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  timestamps: number[];
}

export class FeedbackRateLimiter {
  private static ipBuckets = new Map<string, RateLimitEntry>();
  private static inFlightIps = new Set<string>();

  public static WINDOW_MS = 15 * 60 * 1000; // 15-minute sliding window
  public static MAX_PER_WINDOW = 5; // 5 submissions per 15 minutes per IP

  /**
   * Clears internal rate-limit maps (used for test isolation).
   */
  public static reset(): void {
    FeedbackRateLimiter.ipBuckets.clear();
    FeedbackRateLimiter.inFlightIps.clear();
  }

  /**
   * Returns current count of tracked IP buckets in memory (used for verification/testing).
   */
  public static getBucketCount(): number {
    return FeedbackRateLimiter.ipBuckets.size;
  }

  /**
   * Sweeps and deletes all IP entries whose timestamp arrays have expired.
   * Prevents unbounded memory growth in long-running processes.
   */
  public static sweepExpired(): number {
    const now = Date.now();
    const windowStart = now - FeedbackRateLimiter.WINDOW_MS;
    let pruned = 0;

    for (const [ip, entry] of FeedbackRateLimiter.ipBuckets.entries()) {
      entry.timestamps = entry.timestamps.filter(t => t > windowStart);
      if (entry.timestamps.length === 0) {
        FeedbackRateLimiter.ipBuckets.delete(ip);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Express middleware for anonymous feedback submission rate limiting.
   */
  public static limit(req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();
    const windowStart = now - FeedbackRateLimiter.WINDOW_MS;

    // 1. In-flight concurrency lock to prevent duplicate rapid submissions (double-click)
    if (FeedbackRateLimiter.inFlightIps.has(ip)) {
      res.status(429).json({
        success: false,
        error: 'A feedback submission from your network is currently processing. Please wait a moment.',
      });
      return;
    }

    // 2. Sliding window check with immediate memory cleanup
    let ipEntry = FeedbackRateLimiter.ipBuckets.get(ip);
    if (ipEntry) {
      // Filter out timestamps outside active window
      ipEntry.timestamps = ipEntry.timestamps.filter(t => t > windowStart);
      // Immediately delete empty/expired IP bucket to prevent memory accumulation
      if (ipEntry.timestamps.length === 0) {
        FeedbackRateLimiter.ipBuckets.delete(ip);
        ipEntry = undefined;
      }
    }

    // Occasional opportunistic sweep to prune inactive IPs when map grows
    if (FeedbackRateLimiter.ipBuckets.size > 100) {
      FeedbackRateLimiter.sweepExpired();
    }

    if (ipEntry && ipEntry.timestamps.length >= FeedbackRateLimiter.MAX_PER_WINDOW) {
      const oldest = ipEntry.timestamps[0];
      const retryAfter = Math.max(1, Math.ceil((oldest + FeedbackRateLimiter.WINDOW_MS - now) / 1000));
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({
        success: false,
        error: `Submission limit reached. You can submit up to ${FeedbackRateLimiter.MAX_PER_WINDOW} feedback items per 15 minutes. Please wait ${Math.ceil(retryAfter / 60)} minute(s) before trying again.`,
      });
      return;
    }

    // Acquire in-flight lock and record timestamp
    FeedbackRateLimiter.inFlightIps.add(ip);

    if (!ipEntry) {
      ipEntry = { timestamps: [] };
      FeedbackRateLimiter.ipBuckets.set(ip, ipEntry);
    }
    ipEntry.timestamps.push(now);

    const releaseLock = () => {
      FeedbackRateLimiter.inFlightIps.delete(ip);
    };

    res.on('finish', releaseLock);
    res.on('close', releaseLock);

    next();
  }
}
