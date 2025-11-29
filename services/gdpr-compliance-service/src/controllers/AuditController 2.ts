/**
 * Audit Controller - GDPR Compliance Audit Management
 *
 * Handles audit log access and compliance reporting:
 * - Audit log retrieval for users and admins
 * - Compliance report generation
 * - Audit log search and filtering
 * - GDPR compliance monitoring
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/Logger';
import { AuditService } from '../services/AuditService';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId?: string;
  };
  id?: string;
}

export class AuditController {
  private prisma: PrismaClient;
  private auditService: AuditService;

  constructor(prisma: PrismaClient, auditService: AuditService) {
    this.prisma = prisma;
    this.auditService = auditService;
  }

  /**
   * Get audit logs for current user (GDPR Article 15)
   */
  async getUserAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const {
        startDate,
        endDate,
        category,
        action,
        limit = 100,
        offset = 0
      } = req.query;

      const options: any = {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      if (startDate) options.startDate = new Date(startDate as string);
      if (endDate) options.endDate = new Date(endDate as string);
      if (category) options.category = category as string;
      if (action) options.action = action as string;

      const logs = await this.prisma.privacyAuditLog.findMany({
        where: {
          userId,
          ...options
        },
        orderBy: { createdAt: 'desc' },
        take: options.limit,
        skip: options.offset,
        select: {
          id: true,
          action: true,
          category: true,
          description: true,
          ipAddress: true,
          createdAt: true,
          gdprArticle: true,
          legalBasis: true,
          metadata: true
        }
      });

      res.json({
        success: true,
        data: logs,
        pagination: {
          limit: options.limit,
          offset: options.offset,
          count: logs.length
        },
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Get user audit logs error:', error);
      res.status(500).json({
        error: 'Failed to retrieve audit logs',
        requestId: req.id
      });
    }
  }

  /**
   * Search audit logs (admin only)
   */
  async searchAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const {
        query,
        categories,
        actions,
        startDate,
        endDate,
        ipAddresses,
        gdprArticles,
        limit = 1000,
        offset = 0
      } = req.query;

      const searchCriteria: any = {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      if (query) searchCriteria.query = query as string;
      if (startDate) searchCriteria.dateRange = {
        ...searchCriteria.dateRange,
        start: new Date(startDate as string)
      };
      if (endDate) searchCriteria.dateRange = {
        ...searchCriteria.dateRange,
        end: new Date(endDate as string)
      };
      if (categories) searchCriteria.categories = (categories as string).split(',');
      if (actions) searchCriteria.actions = (actions as string).split(',');
      if (ipAddresses) searchCriteria.ipAddresses = (ipAddresses as string).split(',');
      if (gdprArticles) searchCriteria.gdprArticles = (gdprArticles as string).split(',');

      const { logs, total } = await this.prisma.privacyAuditLog.findMany({
        where: this.buildSearchWhereClause(searchCriteria),
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: searchCriteria.limit,
        skip: searchCriteria.offset
      });

      res.json({
        success: true,
        data: logs,
        pagination: {
          limit: searchCriteria.limit,
          offset: searchCriteria.offset,
          total,
          pages: Math.ceil(total / searchCriteria.limit)
        },
        searchCriteria,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Search audit logs error:', error);
      res.status(500).json({
        error: 'Failed to search audit logs',
        requestId: req.id
      });
    }
  }

  /**
   * Generate GDPR compliance report (admin only)
   */
  async generateComplianceReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const {
        startDate,
        endDate,
        format = 'JSON'
      } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          error: 'Start date and end date are required'
        });
        return;
      }

      const dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };

      const tenantId = req.user?.tenantId || 'default';

      // Generate comprehensive compliance report
      const report = await this.generateDetailedComplianceReport(tenantId, dateRange);

      // Format response based on requested format
      let responseData: any;
      let contentType: string;
      let filename: string;

      switch ((format as string).toUpperCase()) {
        case 'JSON':
          responseData = JSON.stringify(report, null, 2);
          contentType = 'application/json';
          filename = `gdpr-compliance-report-${dateRange.start.toISOString().split('T')[0]}-to-${dateRange.end.toISOString().split('T')[0]}.json`;
          break;

        case 'CSV':
          responseData = this.convertReportToCSV(report);
          contentType = 'text/csv';
          filename = `gdpr-compliance-report-${dateRange.start.toISOString().split('T')[0]}-to-${dateRange.end.toISOString().split('T')[0]}.csv`;
          break;

        default:
          responseData = JSON.stringify(report, null, 2);
          contentType = 'application/json';
          filename = `gdpr-compliance-report-${dateRange.start.toISOString().split('T')[0]}-to-${dateRange.end.toISOString().split('T')[0]}.json`;
      }

      // Log report generation
      await this.logAuditAction(
        req.user?.id || 'system',
        'COMPLIANCE_REPORT_GENERATED',
        'compliance_reporting',
        `GDPR compliance report generated for period ${startDate} to ${endDate}`,
        req.ip,
        req.get('User-Agent'),
        req.id,
        undefined,
        tenantId
      );

      logger.info('GDPR compliance report generated', {
        tenantId,
        dateRange,
        format,
        requestId: req.id
      });

      // Set headers for file download
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(responseData));

      res.send(responseData);
    } catch (error) {
      logger.error('Generate compliance report error:', error);
      res.status(500).json({
        error: 'Failed to generate compliance report',
        requestId: req.id
      });
    }
  }

  /**
   * Get audit log statistics (admin only)
   */
  async getAuditStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const tenantId = req.user?.tenantId || 'default';
      const { days = 30 } = req.query;

      const startDate = new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000);

      const [
        totalLogs,
        logsByCategory,
        logsByGdprArticle,
        logsByAction,
        uniqueUsers,
        recentActivity
      ] = await Promise.all([
        this.prisma.privacyAuditLog.count({
          where: {
            tenantId,
            createdAt: { gte: startDate }
          }
        }),

        this.prisma.privacyAuditLog.groupBy({
          by: ['category'],
          _count: true,
          where: {
            tenantId,
            createdAt: { gte: startDate }
          }
        }),

        this.prisma.privacyAuditLog.groupBy({
          by: ['gdprArticle'],
          _count: true,
          where: {
            tenantId,
            createdAt: { gte: startDate }
          }
        }),

        this.prisma.privacyAuditLog.groupBy({
          by: ['action'],
          _count: true,
          where: {
            tenantId,
            createdAt: { gte: startDate }
          }
        }),

        this.prisma.privacyAuditLog.groupBy({
          by: ['userId'],
          where: {
            tenantId,
            createdAt: { gte: startDate }
          }
        }),

        this.prisma.privacyAuditLog.findMany({
          where: {
            tenantId,
            createdAt: { gte: startDate }
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            id: true,
            action: true,
            category: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          }
        })
      ]);

      const stats = {
        period: {
          startDate,
          endDate: new Date(),
          days: parseInt(days as string)
        },
        summary: {
          totalLogs,
          uniqueUsers: uniqueUsers.length,
          averageLogsPerUser: uniqueUsers.length > 0 ? (totalLogs / uniqueUsers.length).toFixed(2) : '0'
        },
        byCategory: logsByCategory.reduce((acc: any, item) => {
          acc[item.category] = item._count;
          return acc;
        }, {}),
        byGdprArticle: logsByGdprArticle.reduce((acc: any, item) => {
          acc[item.gdprArticle || 'unknown'] = item._count;
          return acc;
        }, {}),
        byAction: logsByAction.reduce((acc: any, item) => {
          acc[item.action] = item._count;
          return acc;
        }, {}),
        recentActivity,
        generatedAt: new Date().toISOString()
      };

      res.json({
        success: true,
        data: stats,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Get audit stats error:', error);
      res.status(500).json({
        error: 'Failed to retrieve audit statistics',
        requestId: req.id
      });
    }
  }

  /**
   * Export audit logs for external audit (admin only)
   */
  async exportAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const {
        startDate,
        endDate,
        format = 'JSON',
        includeUserDetails = false
      } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          error: 'Start date and end date are required'
        });
        return;
      }

      const dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };

      const tenantId = req.user?.tenantId || 'default';

      // Get all audit logs for the period
      const logs = await this.prisma.privacyAuditLog.findMany({
        where: {
          tenantId,
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        },
        include: includeUserDetails ? {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        } : undefined,
        orderBy: { createdAt: 'asc' }
      });

      const exportData = {
        exportInfo: {
          tenantId,
          dateRange,
          format,
          totalLogs: logs.length,
          exportedAt: new Date().toISOString(),
          exportedBy: req.user?.id
        },
        logs
      };

      // Format response
      let responseData: string;
      let contentType: string;
      let filename: string;

      switch ((format as string).toUpperCase()) {
        case 'JSON':
          responseData = JSON.stringify(exportData, null, 2);
          contentType = 'application/json';
          filename = `audit-logs-${dateRange.start.toISOString().split('T')[0]}-to-${dateRange.end.toISOString().split('T')[0]}.json`;
          break;

        case 'CSV':
          responseData = this.convertAuditLogsToCSV(logs);
          contentType = 'text/csv';
          filename = `audit-logs-${dateRange.start.toISOString().split('T')[0]}-to-${dateRange.end.toISOString().split('T')[0]}.csv`;
          break;

        default:
          responseData = JSON.stringify(exportData, null, 2);
          contentType = 'application/json';
          filename = `audit-logs-${dateRange.start.toISOString().split('T')[0]}-to-${dateRange.end.toISOString().split('T')[0]}.json`;
      }

      // Log audit log export
      await this.logAuditAction(
        req.user?.id || 'system',
        'AUDIT_LOGS_EXPORTED',
        'audit_export',
        `Audit logs exported for period ${startDate} to ${endDate}`,
        req.ip,
        req.get('User-Agent'),
        req.id,
        undefined,
        tenantId
      );

      logger.info('Audit logs exported', {
        tenantId,
        dateRange,
        format,
        totalLogs: logs.length,
        requestId: req.id
      });

      // Set headers for file download
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(responseData));

      res.send(responseData);
    } catch (error) {
      logger.error('Export audit logs error:', error);
      res.status(500).json({
        error: 'Failed to export audit logs',
        requestId: req.id
      });
    }
  }

  /**
   * Helper method to build search where clause
   */
  private buildSearchWhereClause(criteria: any): any {
    const where: any = {};

    if (criteria.dateRange) {
      where.createdAt = {
        gte: criteria.dateRange.start,
        lte: criteria.dateRange.end
      };
    }

    if (criteria.categories?.length > 0) {
      where.category = { in: criteria.categories };
    }

    if (criteria.actions?.length > 0) {
      where.action = { in: criteria.actions };
    }

    if (criteria.ipAddresses?.length > 0) {
      where.ipAddress = { in: criteria.ipAddresses };
    }

    if (criteria.gdprArticles?.length > 0) {
      where.gdprArticle = { in: criteria.gdprArticles };
    }

    if (criteria.query) {
      where.description = { contains: criteria.query, mode: 'insensitive' };
    }

    return where;
  }

  /**
   * Helper method to generate detailed compliance report
   */
  private async generateDetailedComplianceReport(tenantId: string, dateRange: { start: Date; end: Date }): Promise<any> {
    // This would be implemented to generate comprehensive compliance reports
    // For now, return a basic structure
    return {
      tenantId,
      reportPeriod: dateRange,
      generatedAt: new Date().toISOString(),
      sections: {
        executiveSummary: 'GDPR compliance report executive summary...',
        consentManagement: 'Consent management compliance details...',
        dataRights: 'Data subject rights fulfillment details...',
        securityMeasures: 'Security and encryption compliance details...',
        auditTrail: 'Audit logging and monitoring details...'
      }
    };
  }

  /**
   * Helper method to convert report to CSV
   */
  private convertReportToCSV(report: any): string {
    // Implementation for CSV conversion
    return JSON.stringify(report, null, 2);
  }

  /**
   * Helper method to convert audit logs to CSV
   */
  private convertAuditLogsToCSV(logs: any[]): string {
    if (logs.length === 0) return '';

    const headers = ['id', 'action', 'category', 'description', 'userId', 'ipAddress', 'createdAt', 'gdprArticle'];
    const csvRows = [headers.join(',')];

    for (const log of logs) {
      const row = [
        log.id,
        log.action,
        log.category,
        `"${log.description.replace(/"/g, '""')}"`,
        log.userId || '',
        log.ipAddress || '',
        log.createdAt.toISOString(),
        log.gdprArticle || ''
      ];
      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Helper method to log audit actions
   */
  private async logAuditAction(
    userId: string,
    action: string,
    category: string,
    description: string,
    ipAddress?: string,
    userAgent?: string,
    requestId?: string,
    gdprArticle?: string,
    tenantId?: string
  ): Promise<void> {
    try {
      await this.prisma.privacyAuditLog.create({
        data: {
          userId,
          action,
          category,
          description,
          ipAddress: ipAddress || 'unknown',
          userAgent: userAgent || 'unknown',
          gdprArticle,
          legalBasis: 'legitimate_interest',
          metadata: {
            requestId,
            tenantId,
            complianceAction: true
          }
        }
      });
    } catch (error) {
      logger.error('Failed to log audit action', { userId, action, error });
    }
  }
}

export default AuditController;
