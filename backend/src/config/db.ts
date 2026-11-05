import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../models/User.js';
import { Goal } from '../models/Goal.js';
import { Task } from '../models/Task.js';
import { CheckIn } from '../models/CheckIn.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { IdempotencyKey } from '../models/IdempotencyKey.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';
import { Feedback } from '../models/Feedback.js';

let memoryServer: MongoMemoryServer | null = null;

export const getMemoryServer = (): MongoMemoryServer | null => memoryServer;

/**
 * Ensures indexes exist across all collections and performs repeatable, non-destructive
 * backfill for legacy completed tasks that have completedAt but missing completedDate.
 */
export const syncDatabaseIndexesAndBackfill = async (): Promise<{ backfilledTasks: number }> => {
  try {
    // 1. Build and create missing database indexes reliably at startup without dropping unmanaged production indexes
    await Promise.all([
      User.createIndexes().catch(e => console.warn('[Database] User createIndexes warning:', e.message)),
      Goal.createIndexes().catch(e => console.warn('[Database] Goal createIndexes warning:', e.message)),
      Task.createIndexes().catch(e => console.warn('[Database] Task createIndexes warning:', e.message)),
      CheckIn.createIndexes().catch(e => console.warn('[Database] CheckIn createIndexes warning:', e.message)),
      Conversation.createIndexes().catch(e => console.warn('[Database] Conversation createIndexes warning:', e.message)),
      Message.createIndexes().catch(e => console.warn('[Database] Message createIndexes warning:', e.message)),
      IdempotencyKey.createIndexes().catch(e => console.warn('[Database] IdempotencyKey createIndexes warning:', e.message)),
      PasswordResetToken.createIndexes().catch(e => console.warn('[Database] PasswordResetToken createIndexes warning:', e.message)),
      Feedback.createIndexes().catch(e => console.warn('[Database] Feedback createIndexes warning:', e.message)),
    ]);

    // 2. Safe, repeatable backfill: for completed tasks with valid completedAt, set completedDate = YYYY-MM-DD
    // Never invents dates when completedAt is missing.
    const backfillResult = await Task.updateMany(
      {
        status: 'completed',
        $or: [{ completedDate: { $exists: false } }, { completedDate: null }],
        completedAt: { $ne: null },
      },
      [
        {
          $set: {
            completedDate: {
              $dateToString: { format: '%Y-%m-%d', date: '$completedAt' },
            },
          },
        },
      ]
    );

    const backfilledCount = backfillResult.modifiedCount || 0;
    if (backfilledCount > 0) {
      console.log(`[Database Migration] Safely backfilled completedDate for ${backfilledCount} legacy completed tasks.`);
    }

    return { backfilledTasks: backfilledCount };
  } catch (err: any) {
    console.warn('[Database] Index synchronization / backfill warning:', err.message);
    return { backfilledTasks: 0 };
  }
};

export const sanitizeMongoUri = (rawUri?: string | null): string => {
  if (!rawUri) return 'unknown';
  // Redact embedded username and password credentials:
  // e.g. mongodb+srv://username:password@cluster.mongodb.net -> mongodb+srv://***:***@cluster.mongodb.net
  return rawUri.replace(/(mongodb(?:\+srv)?:\/\/)([^:@/]+):([^@]+)@/i, '$1***:***@');
};

export const sanitizeErrorMessage = (msg?: string | null): string => {
  if (!msg) return '';
  // Redact embedded credentials if driver or network error echoes connection string
  return msg.replace(/(mongodb(?:\+srv)?:\/\/)([^:@/]+):([^@]+)@/gi, '$1***:***@');
};

export const connectDB = async (): Promise<string> => {
  // If already connected and ready, return existing URI immediately (idempotency check)
  if (mongoose.connection.readyState === 1) {
    if (memoryServer) {
      return memoryServer.getUri();
    }
    return (mongoose.connection as any).client?.options?.srvHost || mongoose.connection.host || 'connected';
  }

  // Tuned for early-stage production on MongoDB Atlas Free/Shared tiers (500-conn cluster ceiling)
  // Keeps warm pool lean (minPoolSize: 2) while comfortably supporting concurrent API requests (maxPoolSize: 25)
  const maxPoolSize = parseInt(process.env.MONGO_MAX_POOL_SIZE || '25', 10);
  const minPoolSize = parseInt(process.env.MONGO_MIN_POOL_SIZE || '2', 10);

  const connectionOptions = {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize,
    minPoolSize,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
  };

  // 1. STRICT TEST ISOLATION:
  // When running in test mode (NODE_ENV === 'test'), always use an isolated MongoMemoryServer instance.
  // Never read, connect to, or fall back from MONGODB_URI (even if pointing to Atlas or remote MongoDB).
  if (process.env.NODE_ENV === 'test') {
    try {
      if (!memoryServer) {
        memoryServer = await MongoMemoryServer.create({
          instance: {
            dbName: 'habithero_test',
          },
        });
      }
      const testUri = memoryServer.getUri();
      await mongoose.connect(testUri, connectionOptions);
      console.log(`[Database] Test environment active: connected to isolated in-memory MongoDB at ${sanitizeMongoUri(testUri)} (dbName: habithero_test)`);
      await syncDatabaseIndexesAndBackfill();
      return testUri;
    } catch (testErr: any) {
      console.error('[Database] Failed to start test in-memory MongoDB:', sanitizeErrorMessage(testErr.message));
      throw testErr;
    }
  }

  // 2. NON-TEST ENVIRONMENTS (Development / Production):
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/habithero';

  try {
    // Attempt standard connection with connection pool options
    await mongoose.connect(uri, connectionOptions);
    const sanitizedUri = sanitizeMongoUri(uri);
    console.log(`[Database] Connected successfully to MongoDB at ${sanitizedUri} (maxPoolSize: ${connectionOptions.maxPoolSize}, minPoolSize: ${connectionOptions.minPoolSize})`);
    await syncDatabaseIndexesAndBackfill();
    return uri;
  } catch (err: any) {
    const sanitizedUri = sanitizeMongoUri(uri);
    const sanitizedErr = sanitizeErrorMessage(err.message);

    if (process.env.NODE_ENV === 'production') {
      const prodErr = `[Database Error] Refusing to start in production: Unable to connect to persistent MongoDB at ${sanitizedUri}: ${sanitizedErr}. In-memory fallback is strictly disabled in production.`;
      console.error(prodErr);
      throw new Error(prodErr);
    }

    console.warn(`[Database] Could not connect to primary MongoDB at ${sanitizedUri}: ${sanitizedErr}`);
    console.log('[Database] Starting built-in in-memory MongoDB instance for automatic local zero-config persistence...');

    try {
      memoryServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'habithero',
        },
      });
      const memoryUri = memoryServer.getUri();
      await mongoose.connect(memoryUri, connectionOptions);
      console.log(`[Database] In-memory MongoDB running and connected at ${sanitizeMongoUri(memoryUri)}`);
      await syncDatabaseIndexesAndBackfill();
      return memoryUri;
    } catch (memErr: any) {
      console.error('[Database] Failed to start in-memory MongoDB:', sanitizeErrorMessage(memErr.message));
      throw memErr;
    }
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }
  } catch (err: any) {
    console.error('[Database] Error during disconnect:', err.message);
  }
};
