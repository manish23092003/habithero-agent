// Set libuv threadpool size to handle concurrent bcrypt hashing and crypto without thread exhaustion
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '64';

import { app } from './app.js';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { validateProductionConfig } from './config/envValidator.js';

const PORT = parseInt(process.env.PORT || '5000', 10);

const startServer = async () => {
  try {
    // 1. Fail safely at startup if required production security settings are missing
    validateProductionConfig();

    await connectDB();
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[HabitHero Server] Running on http://localhost:${PORT}`);
      console.log(`[HabitHero Server] API Health: http://localhost:${PORT}/api/health`);
    });

    const shutdown = async () => {
      console.log('\n[HabitHero Server] Shutting down gracefully...');
      server.close(async () => {
        console.log('[HabitHero Server] HTTP server closed');
        try {
          await mongoose.disconnect();
          console.log('[HabitHero Server] Database connections closed gracefully');
        } catch (e: any) {
          console.warn('[HabitHero Server] Error during DB disconnect:', e.message);
        }
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err: any) {
    console.error('[HabitHero Server] Failed to start:', err.message);
    process.exit(1);
  }
};

startServer();
