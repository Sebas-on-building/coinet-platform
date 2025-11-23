/**
 * GDPR Controller - Core GDPR Data Rights Implementation
 *
 * Implements the fundamental GDPR data subject rights:
 * - Article 15: Right of access
 * - Article 17: Right to erasure (right to be forgotten)
 * - Article 20: Right to data portability
 * - Article 16: Right to rectification
 * - Article 18: Right to restriction of processing
 * - Article 21: Right to object
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/Logger';
import { GDPRService } from '../services/GDPRService';
import { DataExportService } from '../services/DataExportService';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId?: string;
  };
  id?: string;
}

export class GDPRController {
  private prisma: PrismaClient;
  private gdprService: GDPRService;
  private dataExportService: DataExportService;

  constructor(prisma: PrismaClient, gdprService: GDPRService, dataExportService: DataExportService) {
    this.prisma = prisma;
    this.gdprService = gdprService;
    this.dataExportService = dataExportService;
  }

  async submitGDPRRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const {
        requestType,
        description,
        requestedData = [],
        justification,
        priority = 'NORMAL'
      } = req.body;

      const validRequestTypes = [
        'ACCESS', 'RECTIFICATION', 'ERASURE', 'RESTRICTION',
        'PORTABILITY', 'OBJECTION', 'AUTOMATED_DECISION'
      ];

      if (!requestType || !validRequestTypes.includes(requestType)) {
        res.status(400).json({ error: 'Invalid or missing request type' });
        return;
      }

      if (!description || description.length < 10) {
        res.status(400).json({
          error: 'Description must be at least 10 characters long'
        });
        return;
      }

      const gdprRequest = await this.prisma.gDPRRequest.create({
        data: {
          userId,
          tenantId: req.user?.tenantId || 'default',
          requestType: requestType as any,
          status: 'PENDING',
          priority: priority as any,
          description,
          requestedData,
          justification,
          estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          metadata: {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            submittedAt: new Date().toISOString()
          }
        }
      });

      await this.logPrivacyAction(
        userId,
        'GDPR_REQUEST_SUBMITTED',
        'gdpr_request',
        `GDPR ${(requestType as string).toLowerCase()} request submitted`,
        req.ip,
        req.get('User-Agent'),
        req.id,
        requestType
      );

      logger.info('GDPR request submitted', {
        userId,
        requestType,
        requestId: gdprRequest.id,
        gdprRequestId: req.id
      });

      res.status(201).json({
        success: true,
        data: {
          requestId: gdprRequest.id,
          requestType: gdprRequest.requestType,
          status: gdprRequest.status,
          estimatedCompletion: gdprRequest.estimatedCompletion
        },
        message: 'GDPR request submitted successfully'
      });
    } catch (error) {
      logger.error('Submit GDPR request error:', error);
      res.status(500).json({
        error: 'Failed to submit GDPR request',
        requestId: req.id
      });
    }
  }

  async getGDPRRequestStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { requestId } = req.params;

      if (!requestId) {
        res.status(400).json({ error: 'Request ID is required' });
        return;
      }

      const gdprRequest = await this.prisma.gDPRRequest.findFirst({
        where: {
          id: requestId,
          userId,
          tenantId: req.user?.tenantId || 'default'
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      });

      if (!gdprRequest) {
        res.status(404).json({ error: 'GDPR request not found' });
        return;
      }

      res.json({
        success: true,
        data: gdprRequest,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Get GDPR request status error:', error);
      res.status(500).json({
        error: 'Failed to retrieve GDPR request status',
        requestId: req.id
      });
    }
  }

  async getUserGDPRRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;

      const where: any = {
        userId,
        tenantId: req.user?.tenantId || 'default'
      };

      if (status) {
        where.status = status;
      }

      const [requests, total] = await Promise.all([
        this.prisma.gDPRRequest.findMany({
          where,
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
          skip: (page - 1) * limit,
          take: limit
        }),
        this.prisma.gDPRRequest.count({ where })
      ]);

      res.json({
        success: true,
        data: requests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Get user GDPR requests error:', error);
      res.status(500).json({
        error: 'Failed to retrieve GDPR requests',
        requestId: req.id
      });
    }
  }

  async processGDPRRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!['admin', 'compliance'].includes(req.user?.role || '')) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const { requestId } = req.params;
      const { action, responseData, denialReason, denialBasis } = req.body;

      if (!requestId || !action) {
        res.status(400).json({ error: 'Request ID and action are required' });
        return;
      }

      const validActions = ['approve', 'deny', 'complete'];
      if (!validActions.includes(action)) {
        res.status(400).json({ error: 'Invalid action' });
        return;
      }

      const gdprRequest = await this.prisma.gDPRRequest.findUnique({
        where: { id: requestId },
        include: { user: true }
      });

      if (!gdprRequest) {
        res.status(404).json({ error: 'GDPR request not found' });
        return;
      }

      if (gdprRequest.status !== 'PENDING' && gdprRequest.status !== 'IN_REVIEW') {
        res.status(400).json({ error: 'Request is not in a processable state' });
        return;
      }

      let updateData: any = {
        assignedTo: req.user?.id,
        updatedAt: new Date()
      };

      switch (action) {
        case 'approve':
          updateData.status = 'PROCESSING';
          updateData.estimatedCompletion = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          break;

        case 'complete':
          if (!responseData) {
            res.status(400).json({ error: 'Response data required for completion' });
            return;
          }

          updateData.status = 'COMPLETED';
          updateData.actualCompletion = new Date();
          updateData.responseData = responseData;

          if (gdprRequest.requestType === 'ACCESS' || gdprRequest.requestType === 'PORTABILITY') {
            updateData.responseFormat = 'JSON';
            updateData.downloadUrl = await this.generateSecureDownloadUrl(
              gdprRequest.id,
              gdprRequest.userId
            );
            updateData.downloadExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
          }
          break;

        case 'deny':
          if (!denialReason || !denialBasis) {
            res.status(400).json({
              error: 'Denial reason and legal basis are required'
            });
            return;
          }

          updateData.status = 'DENIED';
          updateData.denialReason = denialReason;
          updateData.denialBasis = denialBasis;
          updateData.actualCompletion = new Date();
          break;
      }

      const updatedRequest = await this.prisma.gDPRRequest.update({
        where: { id: requestId },
        data: updateData,
        include: { user: true }
      });

      await this.logPrivacyAction(
        gdprRequest.userId,
        `GDPR_REQUEST_${(action as string).toUpperCase()}`,
        'gdpr_request',
        `GDPR ${gdprRequest.requestType.toLowerCase()} request ${action}d`,
        req.ip,
        req.get('User-Agent'),
        req.id,
        gdprRequest.requestType,
        req.user?.id
      );

      logger.info('GDPR request processed', {
        requestId: gdprRequest.id,
        action,
        processedBy: req.user?.id,
        gdprRequestId: req.id
      });

      res.json({
        success: true,
        data: updatedRequest,
        message: `GDPR request ${action}d successfully`
      });
    } catch (error) {
      logger.error('Process GDPR request error:', error);
      res.status(500).json({
        error: 'Failed to process GDPR request',
        requestId: req.id
      });
    }
  }

  async exportUserData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { format = 'JSON', categories = 'all' } = req.query;

      const gdprRequest = await this.prisma.gDPRRequest.create({
        data: {
          userId,
          tenantId: req.user?.tenantId || 'default',
          requestType: 'ACCESS',
          status: 'PROCESSING',
          description: 'Automated data export request',
          requestedData: categories === 'all' ? ['personal', 'preferences', 'activity', 'analytics'] : [categories as string],
          estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
          metadata: {
            automated: true,
            format,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          }
        }
      });

      const exportResult = await this.dataExportService.exportUserData(
        userId,
        categories as string,
        format as string,
        gdprRequest.id
      );

      await this.prisma.gDPRRequest.update({
        where: { id: gdprRequest.id },
        data: {
          status: 'COMPLETED',
          actualCompletion: new Date(),
          responseData: exportResult.data,
          responseFormat: format,
          downloadUrl: exportResult.downloadUrl,
          downloadExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      await this.logPrivacyAction(
        userId,
        'DATA_EXPORTED',
        'data_access',
        `User data exported in ${format} format`,
        req.ip,
        req.get('User-Agent'),
        req.id,
        '15'
      );

      logger.info('User data exported', {
        userId,
        format,
        categories,
        requestId: gdprRequest.id,
        gdprRequestId: req.id
      });

      res.json({
        success: true,
        data: {
          requestId: gdprRequest.id,
          downloadUrl: exportResult.downloadUrl,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          format,
          size: exportResult.size
        },
        message: 'Data export completed successfully'
      });
    } catch (error) {
      logger.error('Export user data error:', error);
      res.status(500).json({
        error: 'Failed to export user data',
        requestId: req.id
      });
    }
  }

  async deleteUserAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { confirmDeletion, deletionReason = 'GDPR erasure request' } = req.body;

      if (confirmDeletion !== 'DELETE_MY_ACCOUNT_PERMANENTLY') {
        res.status(400).json({
          error: 'Account deletion not confirmed properly'
        });
        return;
      }

      const gdprRequest = await this.prisma.gDPRRequest.create({
        data: {
          userId,
          tenantId: req.user?.tenantId || 'default',
          requestType: 'ERASURE',
          status: 'PROCESSING',
          description: `Account deletion request: ${deletionReason}`,
          justification: 'GDPR Article 17 - Right to erasure',
          estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          metadata: {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            deletionReason
          }
        }
      });

      const deletionResult = await this.gdprService.deleteUserAccount(
        userId,
        deletionReason,
        gdprRequest.id
      );

      await this.prisma.gDPRRequest.update({
        where: { id: gdprRequest.id },
        data: {
          status: 'COMPLETED',
          actualCompletion: new Date(),
          responseData: {
            deleted: true,
            deletionTimestamp: new Date().toISOString(),
            dataCategoriesDeleted: deletionResult.categoriesDeleted,
            recordsDeleted: deletionResult.recordsDeleted
          }
        }
      });

      await this.logPrivacyAction(
        userId,
        'ACCOUNT_DELETED',
        'account_deletion',
        'User account permanently deleted under GDPR Article 17',
        req.ip,
        req.get('User-Agent'),
        req.id,
        '17'
      );

      logger.warn('User account deleted', {
        userId,
        deletionReason,
        requestId: gdprRequest.id,
        gdprRequestId: req.id
      });

      res.json({
        success: true,
        data: {
          deleted: true,
          deletionTimestamp: new Date().toISOString(),
          requestId: gdprRequest.id
        },
        message: 'Account deletion completed successfully'
      });
    } catch (error) {
      logger.error('Delete user account error:', error);
      res.status(500).json({
        error: 'Failed to delete account',
        requestId: req.id
      });
    }
  }

  async getGDPRDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const tenantId = req.user?.tenantId || 'default';

      const [
        totalRequests,
        pendingRequests,
        completedRequests,
        deniedRequests,
        requestsByType,
        requestsByMonth
      ] = await Promise.all([
        this.prisma.gDPRRequest.count({ where: { tenantId } }),
        this.prisma.gDPRRequest.count({
          where: { tenantId, status: { in: ['PENDING', 'IN_REVIEW', 'PROCESSING'] } }
        }),
        this.prisma.gDPRRequest.count({ where: { tenantId, status: 'COMPLETED' } }),
        this.prisma.gDPRRequest.count({ where: { tenantId, status: 'DENIED' } }),
        this.prisma.gDPRRequest.groupBy({
          by: ['requestType'],
          _count: true,
          where: { tenantId }
        }),
        this.prisma.gDPRRequest.groupBy({
          by: ['createdAt'],
          _count: true,
          where: {
            tenantId,
            createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
          }
        })
      ]);

      const dashboardData = {
        overview: {
          totalRequests,
          pendingRequests,
          completedRequests,
          deniedRequests,
          completionRate: totalRequests > 0 ? (completedRequests / totalRequests * 100).toFixed(2) : '0'
        },
        byRequestType: requestsByType.reduce((acc: any, item) => {
          acc[item.requestType] = item._count;
          return acc;
        }, {}),
        trends: requestsByMonth.reduce((acc: any, item) => {
          const month = item.createdAt.toISOString().substring(0, 7); // YYYY-MM
          acc[month] = (acc[month] || 0) + item._count;
          return acc;
        }, {})
      };

      res.json({
        success: true,
        data: dashboardData,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString(),
          tenantId
        }
      });
    } catch (error) {
      logger.error('Get GDPR dashboard error:', error);
      res.status(500).json({
        error: 'Failed to retrieve GDPR dashboard data',
        requestId: req.id
      });
    }
  }

  private async logPrivacyAction(
    userId: string,
    action: string,
    category: string,
    description: string,
    ipAddress?: string,
    userAgent?: string,
    requestId?: string,
    gdprArticle?: string,
    performedBy?: string
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
          legalBasis: 'consent',
          metadata: {
            requestId,
            performedBy
          }
        }
      });
    } catch (error) {
      logger.error('Failed to log privacy action:', error);
    }
  }

  private async generateSecureDownloadUrl(requestId: string, userId: string): Promise<string> {
    const token = Buffer.from(`${requestId}:${userId}:${Date.now()}`).toString('base64');
    return `https://api.coinet.ai/gdpr/download/${token}`;
  }
}
