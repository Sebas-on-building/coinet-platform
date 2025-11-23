/**
 * =========================================
 * ENHANCED AUDIT API ROUTES
 * =========================================
 * Divine world-class audit API with comprehensive search, export,
 * and compliance features for regulatory requirements
 */

import express from 'express';
import { enforceHTTPS } from '../../../../../middleware/httpsEnforce';
import { authenticateJWT } from '../../../../../middleware/auth';
import { requireAnyRole } from '../../../../../middleware/rbac';
import { rateLimit } from '../../../../../middleware/rateLimit';
import { enforceVersioning } from '../../../../../middleware/versioning';
import { prometheusMetrics } from '../../../../../middleware/metrics';
import { query, validationResult, body } from 'express-validator';
import { AuditService, AuditLogCategory, LogSeverity } from '../../../../../services/auth/services/auditService';

const router = express.Router();

function asyncHandler(fn: any) {
  return function (req: any, res: any, next: any) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

router.use(enforceHTTPS);
router.use(enforceVersioning);
router.use(asyncHandler(authenticateJWT));
router.use(asyncHandler(rateLimit));

function validationErrorHandler(req: any, res: any, next: any) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }
  next();
}

// =========================================
// AUDIT LOG SEARCH & RETRIEVAL
// =========================================

/**
 * GET /v1/audit - Search and filter audit logs
 * Supports comprehensive filtering for compliance audits
 */
router.get(
  '/audit',
  [
    query('userId').optional().isString(),
    query('tenantId').optional().isString(),
    query('category').optional().isIn(Object.values(AuditLogCategory)),
    query('action').optional().isString(),
    query('resource').optional().isString(),
    query('resourceId').optional().isString(),
    query('outcome').optional().isIn(['SUCCESS', 'FAILURE', 'ERROR']),
    query('severity').optional().isIn(Object.values(LogSeverity)),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('ipAddress').optional().isIP(),
    query('sessionId').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  validationErrorHandler,
  prometheusMetrics,
  requireAnyRole(['admin', 'auditor', 'security']),
  asyncHandler(async (req, res) => {
    try {
      const filters = {
        userId: req.query.userId,
        tenantId: req.query.tenantId,
        category: req.query.category,
        action: req.query.action,
        resource: req.query.resource,
        resourceId: req.query.resourceId,
        outcome: req.query.outcome,
        severity: req.query.severity,
        startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
        ipAddress: req.query.ipAddress,
        sessionId: req.query.sessionId,
        limit: req.query.limit ? parseInt(req.query.limit) : 100,
        offset: req.query.offset ? parseInt(req.query.offset) : 0,
      };

      // Log the search itself for compliance
      await AuditService.log({
        category: AuditLogCategory.DATA_ACCESS,
        action: 'audit_log_search',
        resource: 'audit_logs',
        details: `Audit log search performed with filters: ${JSON.stringify(filters)}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        outcome: 'SUCCESS',
        severity: LogSeverity.INFO,
        metadata: { filters },
      }, req);

      const logs = await AuditService.searchLogs(filters);

      res.json({
        success: true,
        data: logs,
        filters: req.query,
        total: logs.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Audit search failed:', error);
      res.status(500).json({
        error: 'Failed to search audit logs',
        message: error.message,
      });
    }
  })
);

// =========================================
// AUDIT LOG STATISTICS
// =========================================

/**
 * GET /v1/audit/stats - Get audit statistics for compliance reporting
 */
router.get(
  '/audit/stats',
  [
    query('timeRange').optional().isIn(['day', 'week', 'month']),
  ],
  validationErrorHandler,
  prometheusMetrics,
  requireAnyRole(['admin', 'auditor']),
  asyncHandler(async (req, res) => {
    try {
      const timeRange = (req.query.timeRange as 'day' | 'week' | 'month') || 'day';

      const stats = await AuditService.getStats(timeRange);

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Audit stats failed:', error);
      res.status(500).json({
        error: 'Failed to get audit statistics',
        message: error.message,
      });
    }
  })
);

// =========================================
// AUDIT LOG EXPORT
// =========================================

/**
 * POST /v1/audit/export - Export audit logs for compliance
 */
router.post(
  '/audit/export',
  [
    body('format').optional().isIn(['JSON', 'CSV', 'PDF']),
    body('filters').optional().isObject(),
    body('includeMetadata').optional().isBoolean(),
  ],
  validationErrorHandler,
  prometheusMetrics,
  requireAnyRole(['admin', 'auditor']),
  asyncHandler(async (req, res) => {
    try {
      const format = (req.body.format as 'JSON' | 'CSV' | 'PDF') || 'JSON';
      const filters = req.body.filters || {};
      const includeMetadata = req.body.includeMetadata !== false;

      // Log the export request for compliance
      await AuditService.log({
        category: AuditLogCategory.DATA_ACCESS,
        action: 'audit_log_export',
        resource: 'audit_logs',
        details: `Audit log export requested in ${format} format`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        outcome: 'SUCCESS',
        severity: LogSeverity.INFO,
        metadata: { format, filters },
      }, req);

      const exportData = await AuditService.exportLogs(filters, format);

      // Set appropriate headers for file download
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `audit-logs-${timestamp}.${format.toLowerCase()}`;

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      if (format === 'CSV') {
        res.setHeader('Content-Type', 'text/csv');
        res.send(exportData);
      } else if (format === 'PDF') {
        res.setHeader('Content-Type', 'application/pdf');
        res.json(exportData); // Simplified - would need PDF generation library
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.json(exportData);
      }
    } catch (error) {
      console.error('❌ Audit export failed:', error);
      res.status(500).json({
        error: 'Failed to export audit logs',
        message: error.message,
      });
    }
  })
);

// =========================================
// AUDIT LOG INTEGRITY VERIFICATION
// =========================================

/**
 * GET /v1/audit/verify - Verify audit log integrity using hash chain
 */
router.get(
  '/audit/verify',
  prometheusMetrics,
  requireAnyRole(['admin', 'auditor']),
  asyncHandler(async (req, res) => {
    try {
      const integrityResult = await AuditService.verifyIntegrity();

      res.json({
        success: true,
        data: integrityResult,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Audit integrity verification failed:', error);
      res.status(500).json({
        error: 'Failed to verify audit log integrity',
        message: error.message,
      });
    }
  })
);

// =========================================
// AUDIT LOG RETENTION MANAGEMENT
// =========================================

/**
 * POST /v1/audit/cleanup - Clean up old audit logs based on retention policies
 */
router.post(
  '/audit/cleanup',
  prometheusMetrics,
  requireAnyRole(['admin']),
  asyncHandler(async (req, res) => {
    try {
      const cleanupResult = await AuditService.cleanupOldLogs();

      res.json({
        success: true,
        data: cleanupResult,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Audit cleanup failed:', error);
      res.status(500).json({
        error: 'Failed to cleanup audit logs',
        message: error.message,
      });
    }
  })
);

// =========================================
// USER-SPECIFIC AUDIT LOGS
// =========================================

/**
 * GET /v1/audit/user/:userId - Get audit logs for a specific user
 */
router.get(
  '/audit/user/:userId',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  validationErrorHandler,
  prometheusMetrics,
  requireAnyRole(['admin', 'auditor']),
  asyncHandler(async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset) : 0;

      const logs = await AuditService.searchLogs({
        userId,
        limit,
        offset,
      });

      res.json({
        success: true,
        data: logs,
        userId,
        total: logs.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ User audit logs failed:', error);
      res.status(500).json({
        error: 'Failed to get user audit logs',
        message: error.message,
      });
    }
  })
);

// =========================================
// AUDIT SYSTEM MONITORING & ALERTING
// =========================================

/**
 * GET /v1/audit/health - Get audit system health status
 */
router.get(
  '/audit/health',
  prometheusMetrics,
  requireAnyRole(['admin', 'auditor']),
  asyncHandler(async (req, res) => {
    try {
      const health = await AuditService.healthCheck();

      res.json({
        success: true,
        data: health,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Audit health check failed:', error);
      res.status(500).json({
        error: 'Failed to perform health check',
        message: error.message,
      });
    }
  })
);

/**
 * GET /v1/audit/alerts - Get current audit alerts and critical events
 */
router.get(
  '/audit/alerts',
  prometheusMetrics,
  requireAnyRole(['admin', 'auditor', 'security']),
  asyncHandler(async (req, res) => {
    try {
      const alerts = await AuditService.checkForCriticalEvents();

      res.json({
        success: true,
        data: {
          alerts,
          count: alerts.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ Audit alerts check failed:', error);
      res.status(500).json({
        error: 'Failed to check for alerts',
        message: error.message,
      });
    }
  })
);

/**
 * GET /v1/audit/metrics - Get audit system performance metrics
 */
router.get(
  '/audit/metrics',
  prometheusMetrics,
  requireAnyRole(['admin', 'auditor']),
  asyncHandler(async (req, res) => {
    try {
      const metrics = await AuditService.getPerformanceMetrics();

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Audit metrics failed:', error);
      res.status(500).json({
        error: 'Failed to get performance metrics',
        message: error.message,
      });
    }
  })
);

/**
 * GET /v1/audit/compliance - Generate compliance report
 */
router.get(
  '/audit/compliance',
  [
    query('framework').optional().isIn(['GDPR', 'SOX', 'PCI', 'ALL']),
  ],
  validationErrorHandler,
  prometheusMetrics,
  requireAnyRole(['admin', 'auditor']),
  asyncHandler(async (req, res) => {
    try {
      const framework = (req.query.framework as 'GDPR' | 'SOX' | 'PCI' | 'ALL') || 'ALL';

      const report = await AuditService.generateComplianceReport(framework);

      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Compliance report failed:', error);
      res.status(500).json({
        error: 'Failed to generate compliance report',
        message: error.message,
      });
    }
  })
);

/**
 * GET /v1/audit/dashboard - Get comprehensive audit dashboard data
 */
router.get(
  '/audit/dashboard',
  prometheusMetrics,
  requireAnyRole(['admin', 'auditor']),
  asyncHandler(async (req, res) => {
    try {
      const [stats, health, alerts, metrics] = await Promise.all([
        AuditService.getStats('day'),
        AuditService.healthCheck(),
        AuditService.checkForCriticalEvents(),
        AuditService.getPerformanceMetrics(),
      ]);

      res.json({
        success: true,
        data: {
          stats,
          health,
          alerts,
          metrics,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ Audit dashboard failed:', error);
      res.status(500).json({
        error: 'Failed to load audit dashboard',
        message: error.message,
      });
    }
  })
);

export default router; 