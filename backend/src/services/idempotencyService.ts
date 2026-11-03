import { Types } from 'mongoose';
import { IdempotencyKey } from '../models/IdempotencyKey.js';

export class IdempotencyService {
  private static inFlightOps = new Map<string, Promise<any>>();

  /**
   * Run a resource creation with atomic race condition prevention and optional Idempotency-Key support.
   */
  static async runWithIdempotency<T>(params: {
    userId: string;
    resourceType: 'goal' | 'task';
    title: string;
    idempotencyKey?: string;
    execute: () => Promise<T>;
    retrieveById: (resourceId: string) => Promise<T | null>;
  }): Promise<T> {
    const { userId, resourceType, title, idempotencyKey, execute, retrieveById } = params;
    const uId = new Types.ObjectId(userId);

    // 1. If explicit idempotency key is provided, check if already recorded in MongoDB
    if (idempotencyKey && idempotencyKey.trim() !== '') {
      const cleanKey = idempotencyKey.trim();
      const existingRecord = await IdempotencyKey.findOne({
        userId: uId,
        key: cleanKey,
      });

      if (existingRecord) {
        const cachedResource = await retrieveById(existingRecord.resourceId.toString());
        if (cachedResource) {
          return cachedResource;
        }
      }
    }

    // 2. Prevent simultaneous duplicate submissions (race condition lock for identical title & user)
    const lockKey = `${userId}:${resourceType}:${idempotencyKey || title.trim().toLowerCase()}`;
    const existingInFlight = this.inFlightOps.get(lockKey);
    if (existingInFlight) {
      return (await existingInFlight) as T;
    }

    // 3. Execute with atomic in-flight promise registration
    const executionPromise = (async () => {
      try {
        const createdResult = await execute();

        // If an idempotencyKey was provided, persist to MongoDB with duplicate key catch
        if (idempotencyKey && idempotencyKey.trim() !== '') {
          const resId = (createdResult as any)?._id || (createdResult as any)?.goal?._id;
          if (resId) {
            try {
              await IdempotencyKey.create({
                userId: uId,
                key: idempotencyKey.trim(),
                resourceType,
                resourceId: new Types.ObjectId(resId),
              });
            } catch (err: any) {
              // If concurrent insert raced, retrieve the winner's resource
              if (err.code === 11000) {
                const winnerRecord = await IdempotencyKey.findOne({
                  userId: uId,
                  key: idempotencyKey.trim(),
                });
                if (winnerRecord) {
                  const winnerResource = await retrieveById(winnerRecord.resourceId.toString());
                  if (winnerResource) return winnerResource;
                }
              }
            }
          }
        }

        return createdResult;
      } finally {
        this.inFlightOps.delete(lockKey);
      }
    })();

    this.inFlightOps.set(lockKey, executionPromise);
    return await executionPromise;
  }
}

