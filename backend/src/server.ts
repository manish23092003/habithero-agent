import { app } from './app.js';
import { connectDB } from './config/db.js';

const PORT = parseInt(process.env.PORT || '5000', 10);

const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[HabitHero Server] Running on http://localhost:${PORT}`);
      console.log(`[HabitHero Server] API Health: http://localhost:${PORT}/api/health`);
    });

    const shutdown = async () => {
      console.log('\n[HabitHero Server] Shutting down gracefully...');
      server.close(() => {
        console.log('[HabitHero Server] HTTP server closed');
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

