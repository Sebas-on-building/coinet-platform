/**
 * GDPR Compliance Service - Enterprise-Grade Privacy Management
 *
 * This service provides comprehensive GDPR compliance including:
 * - Consent Management (GDPR Article 7)
 * - Right of Access (GDPR Article 15)
 * - Right to Erasure (GDPR Article 17)
 * - Data Portability (GDPR Article 20)
 * - Data Anonymization & Pseudonymization
 * - Privacy Audit Logging
 * - Data Residency Controls
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { logger } from './utils/Logger';
import rateLimit from 'express-rate-limit';

import { ConsentController } from './controllers/ConsentController';
import { GDPRController } from './controllers/GDPRController';
import { PrivacyController } from './controllers/PrivacyController';
import { AuditController } from './controllers/AuditController';
import { DataRetentionController } from './controllers/DataRetentionController';
import { DataResidencyController } from './controllers/DataResidencyController';

import { ConsentService } from './services/ConsentService';
import { GDPRService } from './services/GDPRService';
import { DataExportService } from './services/DataExportService';
import { AuditService } from './services/AuditService';

interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId?: string;
  };
  id?: string;
}

// Initialize Prisma Client with GDPR-specific configuration
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn', 'info'],
  errorFormat: 'pretty',
});

const app = express();
const server = createServer(app);

// Initialize services
const consentService = new ConsentService(prisma);
const gdprService = new GDPRService(prisma);
const dataExportService = new DataExportService(prisma);
const auditService = new AuditService(prisma);

// Initialize controllers with dependencies
const consentController = new ConsentController(prisma, consentService, auditService);
const gdprController = new GDPRController(prisma, gdprService, dataExportService);
const privacyController = new PrivacyController(prisma, auditService);
const auditController = new AuditController(prisma, auditService);
const dataRetentionController = new DataRetentionController(prisma, auditService);
const dataResidencyController = new DataResidencyController(prisma, auditService);

// =============================================================================
// MIDDLEWARE CONFIGURATION
// =============================================================================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration for GDPR compliance
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from our frontend domains
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://coinet.ai',
      'https://app.coinet.ai'
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-GDPR-Request-ID',
    'X-Consent-Token'
  ],
}));

// Rate limiting for GDPR endpoints (more strict for privacy-sensitive operations)
const gdprRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs for GDPR operations
  message: {
    error: 'Too many GDPR requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // general API rate limit
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware for traceability
app.use((req: AuthenticatedRequest, res, next) => {
  req.id = `gdpr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  next();
});

// GDPR-specific request logging
app.use((req: AuthenticatedRequest, res, next) => {
  const start = Date.now();

  // Log GDPR-related requests for compliance audit
  if (req.path.startsWith('/api/gdpr') || req.path.startsWith('/api/privacy')) {
    logger.info('GDPR Request Initiated', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      gdprArticle: req.headers['x-gdpr-article'],
      consentToken: req.headers['x-consent-token'] ? 'present' : 'missing',
    });
  }

  res.on('finish', () => {
    const duration = Date.now() - start;

    // Log GDPR request completion
    if (req.path.startsWith('/api/gdpr') || req.path.startsWith('/api/privacy')) {
      logger.info('GDPR Request Completed', {
        requestId: req.id,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
      });
    }
  });

  next();
});

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'gdpr-compliance-service',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API Routes with appropriate rate limiting
app.post('/api/gdpr/request', gdprRateLimit, gdprController.submitGDPRRequest.bind(gdprController));
app.get('/api/gdpr/request/:requestId', gdprRateLimit, gdprController.getGDPRRequestStatus.bind(gdprController));
app.get('/api/gdpr/requests', gdprRateLimit, gdprController.getUserGDPRRequests.bind(gdprController));
app.post('/api/gdpr/process/:requestId', gdprRateLimit, gdprController.processGDPRRequest.bind(gdprController));
app.get('/api/gdpr/export', gdprRateLimit, gdprController.exportUserData.bind(gdprController));
app.post('/api/gdpr/delete-account', gdprRateLimit, gdprController.deleteUserAccount.bind(gdprController));
app.get('/api/gdpr/dashboard', gdprRateLimit, gdprController.getGDPRDashboard.bind(gdprController));

app.get('/api/consent', gdprRateLimit, consentController.getUserConsents.bind(consentController));
app.post('/api/consent/grant', gdprRateLimit, consentController.grantConsent.bind(consentController));
app.post('/api/consent/withdraw', gdprRateLimit, consentController.withdrawConsent.bind(consentController));
app.get('/api/consent/check/:consentType', gdprRateLimit, consentController.checkConsent.bind(consentController));
app.get('/api/consent/stats', gdprRateLimit, consentController.getConsentStats.bind(consentController));

app.get('/api/privacy/settings', generalRateLimit, privacyController.getPrivacySettings.bind(privacyController));
app.post('/api/privacy/settings', generalRateLimit, privacyController.updatePrivacySettings.bind(privacyController));
app.get('/api/privacy/data-activities', generalRateLimit, privacyController.getDataProcessingActivities.bind(privacyController));
app.get('/api/privacy/download-data', generalRateLimit, privacyController.downloadPersonalData.bind(privacyController));
app.get('/api/privacy/policy', generalRateLimit, privacyController.getPrivacyPolicy.bind(privacyController));
app.post('/api/privacy/policy/accept', generalRateLimit, privacyController.acceptPrivacyPolicy.bind(privacyController));
app.get('/api/privacy/retention-info', generalRateLimit, privacyController.getDataRetentionInfo.bind(privacyController));

app.get('/api/audit/user-logs', generalRateLimit, auditController.getUserAuditLogs.bind(auditController));
app.get('/api/audit/search', generalRateLimit, auditController.searchAuditLogs.bind(auditController));
app.get('/api/audit/report', generalRateLimit, auditController.generateComplianceReport.bind(auditController));
app.get('/api/audit/stats', generalRateLimit, auditController.getAuditStats.bind(auditController));
app.get('/api/audit/export', generalRateLimit, auditController.exportAuditLogs.bind(auditController));

app.get('/api/retention/policies', generalRateLimit, dataRetentionController.getRetentionPolicies.bind(dataRetentionController));
app.post('/api/retention/policies', generalRateLimit, dataRetentionController.createRetentionPolicy.bind(dataRetentionController));
app.put('/api/retention/policies/:policyId', generalRateLimit, dataRetentionController.updateRetentionPolicy.bind(dataRetentionController));
app.delete('/api/retention/policies/:policyId', generalRateLimit, dataRetentionController.deleteRetentionPolicy.bind(dataRetentionController));
app.get('/api/retention/user-info', generalRateLimit, dataRetentionController.getUserRetentionInfo.bind(dataRetentionController));
app.post('/api/retention/cleanup', generalRateLimit, dataRetentionController.executeRetentionCleanup.bind(dataRetentionController));
app.get('/api/retention/report', generalRateLimit, dataRetentionController.getRetentionReport.bind(dataRetentionController));

app.get('/api/residency/rules', generalRateLimit, dataResidencyController.getResidencyRules.bind(dataResidencyController));
app.post('/api/residency/rules', generalRateLimit, dataResidencyController.createResidencyRule.bind(dataResidencyController));
app.put('/api/residency/rules/:ruleId', generalRateLimit, dataResidencyController.updateResidencyRule.bind(dataResidencyController));
app.delete('/api/residency/rules/:ruleId', generalRateLimit, dataResidencyController.deleteResidencyRule.bind(dataResidencyController));
app.get('/api/residency/user-compliance', generalRateLimit, dataResidencyController.checkUserResidencyCompliance.bind(dataResidencyController));
app.get('/api/residency/report', generalRateLimit, dataResidencyController.getResidencyReport.bind(dataResidencyController));
app.post('/api/residency/validate-transfer', generalRateLimit, dataResidencyController.validateDataTransfer.bind(dataResidencyController));

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Global error handler for GDPR compliance
app.use((error: any, req: AuthenticatedRequest, res: any, next: any) => {
  logger.error('Unhandled Error in GDPR Service', {
    error: error.message,
    stack: error.stack,
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(error.status || 500).json({
    error: isDevelopment ? error.message : 'Internal server error',
    requestId: req.id,
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: error.stack }),
  });
});

// 404 handler
app.use((req: AuthenticatedRequest, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested GDPR endpoint does not exist',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed.');

    try {
      await prisma.$disconnect();
      logger.info('Database connection closed.');
    } catch (error) {
      logger.error('Error during database disconnect:', error);
    }

    process.exit(0);
  });

  // Force exit after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// SERVER STARTUP
// =============================================================================

const PORT = process.env.GDPR_COMPLIANCE_PORT || 8009;

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connection established');

    // Initialize GDPR compliance tables if they don't exist
    await initializeGDPRExtensions();

    server.listen(PORT, () => {
      logger.info(`🚀 GDPR Compliance Service running on port ${PORT}`);
      logger.info(`📋 Health check available at http://localhost:${PORT}/health`);
      logger.info(`🔒 GDPR API available at http://localhost:${PORT}/api/gdpr`);
      logger.info(`📋 Consent API available at http://localhost:${PORT}/api/consent`);
      logger.info(`🔒 Privacy API available at http://localhost:${PORT}/api/privacy`);
    });
  } catch (error) {
    logger.error('Failed to start GDPR Compliance Service:', error);
    process.exit(1);
  }
};

// Initialize GDPR-specific database extensions and policies
async function initializeGDPRExtensions() {
  try {
    // Create GDPR-specific indexes and policies if they don't exist
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;

    logger.info('GDPR database extensions initialized');
  } catch (error) {
    logger.warn('Could not initialize GDPR extensions:', error);
    // Continue anyway - extensions might already exist
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export { app, server, prisma, logger };
export default app;
