interface RateLimitBucket {
  timestamps: number[];
}

export class AIQuotaGuard {
  private static inFlightRequests = new Set<string>();
  private static userBuckets = new Map<string, RateLimitBucket>();
  public static MAX_REQUESTS_PER_MINUTE = 20;

  /**
   * Acquire an in-flight lock for this user to prevent duplicate concurrent requests
   * (e.g. repeated button clicks or race conditions).
   * Returns true if lock was acquired, false if another AI request is already in progress.
   */
  static acquireLock(userId: string): boolean {
    if (this.inFlightRequests.has(userId)) {
      return false;
    }
    this.inFlightRequests.add(userId);
    return true;
  }

  /**
   * Release the in-flight lock for this user
   */
  static releaseLock(userId: string): void {
    this.inFlightRequests.delete(userId);
  }

  /**
   * Check whether user has exceeded the per-user requests-per-minute quota.
   * Returns { allowed: true } or { allowed: false, retryAfterSeconds: number }.
   */
  static checkRateLimit(userId: string): { allowed: boolean; retryAfterSeconds?: number } {
    const now = Date.now();
    const windowStart = now - 60000;

    let bucket = this.userBuckets.get(userId);
    if (!bucket) {
      bucket = { timestamps: [] };
      this.userBuckets.set(userId, bucket);
    }

    // Prune entries outside the 60-second sliding window
    bucket.timestamps = bucket.timestamps.filter(t => t > windowStart);

    if (bucket.timestamps.length >= this.MAX_REQUESTS_PER_MINUTE) {
      const oldestInWindow = bucket.timestamps[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + 60000 - now) / 1000));
      return { allowed: false, retryAfterSeconds };
    }

    bucket.timestamps.push(now);
    return { allowed: true };
  }

  /**
   * Check if user currently has an in-flight request
   */
  static hasActiveRequest(userId: string): boolean {
    return this.inFlightRequests.has(userId);
  }

  /**
   * Reset tracking state (used in testing)
   */
  static reset(): void {
    this.inFlightRequests.clear();
    this.userBuckets.clear();
  }
}

