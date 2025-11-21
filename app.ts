import express from 'express';
import cookieParser from 'cookie-parser';
import cacheRoutes from './routes/api/cache';
import sessionRoutes from './routes/api/session';
import rateLimitRoutes from './routes/api/rateLimit';
import leaderboardRoutes from './routes/api/leaderboard';
import pubsubRoutes from './routes/api/pubsub';
import { rateLimitMiddleware, sessionMiddleware } from './services/cache/middleware';
import {
  comprehensiveAuditMiddleware,
  databaseAuditMiddleware,
  authenticationAuditMiddleware,
  configurationAuditMiddleware
} from './middleware/audit';
import { AuditService } from './services/auth/services/auditService';

const app = express();
app.use(express.json());
app.use(cookieParser());

// =========================================
// AUDIT LOGGING INITIALIZATION
// =========================================

// Initialize audit service on startup
AuditService.initialize()
  .then(async () => {
    // Initialize retention policies
    await AuditService.initializeRetentionPolicies();
    // Schedule periodic cleanup (daily)
    AuditService.scheduleCleanup();
    console.log('🔐 Audit system fully initialized');
  })
  .catch(console.error);

// =========================================
// GLOBAL MIDDLEWARE
// =========================================

// Apply comprehensive audit logging to all API routes
app.use('/api', comprehensiveAuditMiddleware());

// Apply database audit logging to routes that use database operations
app.use('/api', databaseAuditMiddleware());

// Apply authentication audit logging to auth-related routes
app.use('/api/auth', authenticationAuditMiddleware());
app.use('/api/session', authenticationAuditMiddleware());

// Apply configuration audit logging to admin/config routes
app.use('/api/admin', configurationAuditMiddleware());
app.use('/api/config', configurationAuditMiddleware());

// Apply rate limiting and session middleware globally or per route as needed
app.use('/api/portfolio', rateLimitMiddleware, sessionMiddleware);

app.use('/api/cache', cacheRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/rate-limit', rateLimitRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/pubsub', pubsubRoutes);

// =========================================
// GRACEFUL SHUTDOWN
// =========================================

process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  await AuditService.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  await AuditService.shutdown();
  process.exit(0);
});

export default app; 