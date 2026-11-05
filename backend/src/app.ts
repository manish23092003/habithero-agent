import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { monitorEventLoopDelay } from 'perf_hooks';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import goalRoutes from './routes/goalRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import checkInRoutes from './routes/checkInRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';

dotenv.config();

export const app = express();

// Reverse proxy trust configuration:
// In production (e.g. Render / Railway single-hop reverse proxy), trust the immediate fronting proxy (1 hop)
// so that req.ip accurately reflects the client IP without trusting arbitrary upstream spoofed headers.
// In development/test, keep default (disabled) unless explicitly configured via TRUST_PROXY.
if (process.env.TRUST_PROXY !== undefined) {
  const parsedHops = parseInt(process.env.TRUST_PROXY, 10);
  app.set('trust proxy', isNaN(parsedHops) ? process.env.TRUST_PROXY === 'true' : parsedHops);
} else if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Initialize event-loop delay monitor for production observability
const eld = monitorEventLoopDelay({ resolution: 20 });
eld.enable();

// CORS configuration helpers
export const normalizeOrigin = (url?: string | null): string => {
  if (!url) return '';
  return url.trim().replace(/\/+$/, '');
};

export const getConfiguredOrigins = (envUrl?: string | null): string[] => {
  if (!envUrl) return [];
  return envUrl
    .split(',')
    .map(u => normalizeOrigin(u))
    .filter(Boolean);
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      const isProd = process.env.NODE_ENV === 'production';
      const configuredOrigins = getConfiguredOrigins(process.env.FRONTEND_URL);
      const normalizedRequestOrigin = normalizeOrigin(origin);

      if (isProd) {
        if (configuredOrigins.includes(normalizedRequestOrigin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS blocked: Origin "${origin}" is not authorized in production.`));
        }
      } else {
        const devOrigins = [
          ...configuredOrigins,
          'http://localhost:5173',
          'http://127.0.0.1:5173',
        ];
        if (
          devOrigins.includes(normalizedRequestOrigin) ||
          normalizedRequestOrigin.startsWith('http://localhost:') ||
          normalizedRequestOrigin.startsWith('http://127.0.0.1:')
        ) {
          callback(null, true);
        } else {
          callback(null, true); // Permissive for local development
        }
      }
    },
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Idempotency-Key',
      'idempotency-key',
      'x-idempotency-key',
      'X-Client-Date',
      'x-client-date',
    ],
  })
);

app.use(express.json());

// Health check endpoint with real database readiness check
app.get('/api/health', (_req: Request, res: Response) => {
  const readyState = mongoose.connection.readyState;
  const isConnected = readyState === 1;

  const dbStatusMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const databaseStatus = dbStatusMap[readyState] || 'unknown';

  if (!isConnected) {
    res.status(503).json({
      status: 'degraded',
      service: 'HabitHero Backend API',
      timestamp: new Date().toISOString(),
      phase: 'Phase 2: Authentication & Database Connected',
      database: databaseStatus,
    });
    return;
  }

  res.status(200).json({
    status: 'ok',
    service: 'HabitHero Backend API',
    timestamp: new Date().toISOString(),
    phase: 'Phase 2: Authentication & Database Connected',
    database: databaseStatus,
  });
});

// Middleware to restrict metrics to authorized monitoring systems or authenticated users
const authenticateMetrics = (req: Request, res: Response, next: NextFunction): void => {
  const monitoringSecret = process.env.METRICS_SECRET || process.env.MONITORING_SECRET;
  const headerSecret = req.headers['x-metrics-key'] || req.headers['x-monitoring-secret'];
  const authHeader = req.headers['authorization'];

  // Check 1: Explicit monitoring secret / metrics key header
  if (monitoringSecret && (headerSecret === monitoringSecret || authHeader === `Bearer ${monitoringSecret}`)) {
    return next();
  }

  // Check 2: Valid JWT Bearer token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const jwtSecret = process.env.JWT_SECRET || 'habithero_development_jwt_secret_token_2026';
    try {
      jwt.verify(token, jwtSecret);
      return next();
    } catch {
      // Continue to rejection
    }
  }

  // Loopback access in development/test mode if no explicit METRICS_SECRET is defined
  if (process.env.NODE_ENV !== 'production' && !monitoringSecret) {
    const remoteIp = req.socket.remoteAddress;
    if (remoteIp === '127.0.0.1' || remoteIp === '::1' || remoteIp === '::ffff:127.0.0.1') {
      return next();
    }
  }

  res.status(401).json({
    success: false,
    error: 'Unauthorized: Metrics endpoint requires valid monitoring credentials or administrator authorization',
  });
};

// System observability and load testing metrics endpoint
app.get(['/api/metrics', '/api/loadtest/metrics'], authenticateMetrics, async (_req: Request, res: Response) => {
  try {
    const mem = process.memoryUsage();
    let mongoStats: any = {};
    if (mongoose.connection?.db) {
      try {
        const adminDb = mongoose.connection.db.admin();
        const serverStatus = await adminDb.serverStatus();
        mongoStats = {
          connectionsCurrent: serverStatus.connections?.current || 0,
          connectionsAvailable: serverStatus.connections?.available || 0,
          opcounters: serverStatus.opcounters || {},
        };
      } catch (e: any) {
        mongoStats = { error: e.message };
      }
    }

    res.status(200).json({
      uptimeSeconds: Math.round(process.uptime()),
      memory: {
        rssMB: Math.round(mem.rss / 1024 / 1024),
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      },
      cpu: process.cpuUsage(),
      eventLoopDelayMs: {
        min: +(eld.min / 1e6).toFixed(2),
        mean: +(eld.mean / 1e6).toFixed(2),
        p50: +(eld.percentile(50) / 1e6).toFixed(2),
        p95: +(eld.percentile(95) / 1e6).toFixed(2),
        p99: +(eld.percentile(99) / 1e6).toFixed(2),
        max: +(eld.max / 1e6).toFixed(2),
      },
      mongodb: mongoStats,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/checkins', checkInRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/feedback', feedbackRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err);
  const status = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
  const isProd = process.env.NODE_ENV === 'production';
  res.status(status).json({
    success: false,
    error: isProd && status === 500 ? 'Internal server error occurred. Please try again later.' : (err.message || 'Internal Server Error'),
  });
});
