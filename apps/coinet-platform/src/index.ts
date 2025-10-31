/**
 * 🚀 Coinet Platform - Main Entry Point
 * 
 * Divine platform with AI chat capabilities, perfect error handling,
 * and production-ready architecture.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './db/client';
import { logger } from './utils/logger';
import chatRoutes from './api/chat/routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Handle preflight OPTIONS requests FIRST - before CORS middleware
app.options('*', (req: Request, res: Response) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Request-ID, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
});

// CORS configuration - Allow ALL origins for development (will restrict in production)
app.use(cors({
  origin: (origin, callback) => {
    // Allow all origins in development
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Request-ID', 'Accept'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  (req as any).requestId = requestId;
  (req as any).startTime = startTime;

  res.setHeader('X-Request-ID', requestId);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('HTTP Request', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint for Railway
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    // Check database health with timeout
    const dbHealthPromise = prisma.healthCheck();
    const timeoutPromise = new Promise<{ healthy: boolean }>((resolve) => 
      setTimeout(() => resolve({ healthy: false }), 3000)
    );
    
    const dbHealth = await Promise.race([dbHealthPromise, timeoutPromise]);

    const health = {
      ok: dbHealth.healthy !== false, // Consider service OK even if DB is down
      service: 'coinet-platform',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'production',
      database: {
        healthy: dbHealth.healthy,
        latency: 'latency' in dbHealth ? dbHealth.latency : undefined,
        configured: !!process.env.DATABASE_URL,
      },
    };

    // Always return 200 unless there's a critical error
    res.status(200).json(health);
  } catch (error) {
    logger.error('❌ Health check failed', error);
    res.status(200).json({
      ok: true,
      service: 'coinet-platform',
      database: {
        healthy: false,
        error: 'Health check error',
      },
    });
  }
});

// Status endpoint with detailed information
app.get('/api/status', async (_req: Request, res: Response) => {
  try {
    const dbStats = await prisma.getStats();
    
    res.json({
      status: 'operational',
      service: 'coinet-platform',
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'production',
      database: dbStats,
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('❌ Status check failed', error);
    res.status(500).json({
      status: 'error',
      error: 'Status check failed',
    });
  }
});

// API routes
app.use('/api/chat', chatRoutes);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'coinet-platform',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      status: '/api/status',
      chat: '/api/chat',
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    requestId: (req as any).requestId,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('❌ Unhandled error', err, {
    requestId: (req as any).requestId,
    path: req.path,
    method: req.method,
  });

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred'
        : err.message,
    },
    requestId: (req as any).requestId,
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      logger.warn('⚠️  DATABASE_URL not configured. Server will start but database features will be unavailable.');
      logger.warn('   Set DATABASE_URL in .env file to enable database features.');
    } else {
      // Verify database connection with timeout
      logger.info('🔍 Verifying database connection...');
      
      try {
        const dbHealth = await Promise.race([
          prisma.healthCheck(),
          new Promise<{ healthy: boolean }>((_, reject) => 
            setTimeout(() => reject(new Error('Database health check timeout')), 5000)
          )
        ]);
        
        if (!dbHealth.healthy) {
          logger.warn('⚠️  Database connection failed. Server will start but database features will be unavailable.');
        } else {
          const latency = 'latency' in dbHealth ? dbHealth.latency : 0;
          logger.info('✅ Database connected', { latency });
        }
      } catch (error) {
        logger.warn('⚠️  Database health check failed or timed out. Server will start anyway.');
        logger.warn('Database Error', { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    // Start HTTP server (always start, even if DB fails)
    app.listen(PORT, '0.0.0.0', () => {
      const env = process.env.NODE_ENV || 'production';
      logger.info(`🚀 Coinet Platform started`, {
        port: PORT,
        environment: env,
      });
      logger.info(`📍 Health: http://0.0.0.0:${PORT}/api/health`);
      logger.info(`📍 Status: http://0.0.0.0:${PORT}/api/status`);
      logger.info(`📍 Chat API: http://0.0.0.0:${PORT}/api/chat`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`🛑 ${signal} received, shutting down gracefully...`);

  try {
    // Close database connection
    await (prisma as any).$disconnect();
    logger.info('✅ Database connection closed');

    // Exit process
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection', new Error(String(reason)), { promise });
  process.exit(1);
});

// Start the server
startServer();

