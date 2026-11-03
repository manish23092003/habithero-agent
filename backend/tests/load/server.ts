process.env.UV_THREADPOOL_SIZE = '64';
process.env.NODE_ENV = 'development';
process.env.PORT = '5001';
process.env.MONGODB_URI = 'mongodb://localhost:27017/habithero_loadtest';
process.env.MOCK_AI_RESPONSE = 'true';

import { Server } from 'http';
import mongoose from 'mongoose';
import { app } from '../../src/app.js';
import { connectDB } from '../../src/config/db.js';

const PORT = 5001;

export async function startServer(): Promise<Server> {
  await connectDB();
  return new Promise((resolve) => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[LoadTest Server] Running on http://localhost:${PORT}`);
      console.log(`[LoadTest Server] Connected to ${process.env.MONGODB_URI}`);
      console.log(`[LoadTest Server] Mock AI Mode: ${process.env.MOCK_AI_RESPONSE}`);
      resolve(server);
    });
  });
}

// Standalone execution support
if (process.argv[1] && process.argv[1].includes('server.ts')) {
  startServer().catch(err => {
    console.error('[LoadTest Server Fatal Error]:', err);
    process.exit(1);
  });
}
