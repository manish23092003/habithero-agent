import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer: MongoMemoryServer | null = null;

export const connectDB = async (): Promise<string> => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/habithero';

  try {
    // Attempt standard connection with 2.5s server selection timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[Database] Connected successfully to MongoDB at ${uri}`);
    return uri;
  } catch (err: any) {
    console.warn(`[Database] Could not connect to primary MongoDB at ${uri}: ${err.message}`);
    console.log('[Database] Starting built-in in-memory MongoDB instance for automatic local zero-config persistence...');

    try {
      memoryServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'habithero',
        },
      });
      const memoryUri = memoryServer.getUri();
      await mongoose.connect(memoryUri);
      console.log(`[Database] In-memory MongoDB running and connected at ${memoryUri}`);
      return memoryUri;
    } catch (memErr: any) {
      console.error('[Database] Failed to start in-memory MongoDB:', memErr.message);
      throw memErr;
    }
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
};

