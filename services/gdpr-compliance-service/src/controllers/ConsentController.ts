/**
 * Consent Management Controller - GDPR Article 7 Compliance
 *
 * Handles user consent for data processing activities including:
 * - Consent collection and storage
 * - Consent withdrawal
 * - Consent verification
 * - Consent lifecycle management
 * - Audit trail maintenance
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/Logger';
import { ConsentService } from '../services/ConsentService';
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

export class ConsentController {
  private prisma: PrismaClient;
  private consentService: ConsentService;
  private auditService: AuditService;

  constructor(prisma: PrismaClient, consentService: ConsentService, auditService: AuditService) {
    this.prisma = prisma;
    this.consentService = consentService;
    this.auditService = auditService;
  }

  async getUserConsents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const consents = await this.prisma.userConsent.findMany({
        where: {
          userId,
          tenantId: req.user?.tenantId || 'default'
        },
        select: {
          id: true,
          consentType: true,
          status: true,
          version: true,
          grantedAt: true,
          deniedAt: true,
          withdrawnAt: true,
          expiresAt: true,
          collectionMethod: true,
          withdrawalReason: true,
          withdrawalMethod: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: consents,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString(),
          count: consents.length
        }
      });
    } catch (error) {
      logger.error('Get user consents error:', error);
      res.status(500).json({
        error: 'Failed to retrieve consents',
        requestId: req.id
      });
    }
  }

  async grantConsent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const {
        consentType,
        version,
        consentText,
        expiresAt,
        collectionMethod = 'settings'
      } = req.body;

      if (!consentType || !version || !consentText) {
        res.status(400).json({
          error: 'Missing required fields: consentType, version, consentText'
        });
        return;
      }

      const validConsentTypes = [
        'MARKETING_EMAILS', 'ANALYTICS_TRACKING', 'PERSONALIZATION',
        'DATA_PROCESSING', 'THIRD_PARTY_SHARING', 'PROFILING',
        'NEWSLETTER', 'PUSH_NOTIFICATIONS', 'SMS_NOTIFICATIONS', 'TELEMETRY'
      ];

      if (!validConsentTypes.includes(consentType)) {
        res.status(400).json({ error: 'Invalid consent type' });
        return;
      }

      const existingConsent = await this.prisma.userConsent.findUnique({
        where: {
          userId_consentType: {
            userId,
            consentType: consentType as any
          }
        }
      });

      if (existingConsent && existingConsent.status === 'GRANTED') {
        res.status(409).json({
          error: 'Consent already granted for this type'
        });
        return;
      }

      const consent = await this.prisma.userConsent.upsert({
        where: {
          userId_consentType: {
            userId,
            consentType: consentType as any
          }
        },
        update: {
          status: 'GRANTED',
          version,
          consentText,
          grantedAt: new Date(),
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          collectionMethod,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          updatedAt: new Date()
        },
        create: {
          userId,
          tenantId: req.user?.tenantId || 'default',
          consentType: consentType as any,
          status: 'GRANTED',
          version,
          consentText,
          grantedAt: new Date(),
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          collectionMethod,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });

      await this.auditService.createAuditLog({
        userId,
        action: 'CONSENT_GRANTED',
        category: 'consent',
        description: `Consent granted for ${consentType}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        gdprArticle: '7',
        legalBasis: 'consent',
        metadata: {
          consentType,
          requestId: req.id
        }
      });

      logger.info('Consent granted', {
        userId,
        consentType,
        requestId: req.id
      });

      res.json({
        success: true,
        data: consent,
        message: 'Consent granted successfully'
      });
    } catch (error) {
      logger.error('Grant consent error:', error);
      res.status(500).json({
        error: 'Failed to grant consent',
        requestId: req.id
      });
    }
  }

  async withdrawConsent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const {
        consentType,
        withdrawalReason = 'User requested withdrawal',
        withdrawalMethod = 'settings'
      } = req.body;

      if (!consentType) {
        res.status(400).json({ error: 'Consent type is required' });
        return;
      }

      const consent = await this.prisma.userConsent.update({
        where: {
          userId_consentType: {
            userId,
            consentType: consentType as any
          }
        },
        data: {
          status: 'WITHDRAWN',
          withdrawnAt: new Date(),
          withdrawalReason,
          withdrawalMethod,
          updatedAt: new Date()
        }
      });

      await this.auditService.createAuditLog({
        userId,
        action: 'CONSENT_WITHDRAWN',
        category: 'consent',
        description: `Consent withdrawn for ${consentType}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        gdprArticle: '7',
        legalBasis: 'consent',
        metadata: {
          consentType,
          requestId: req.id
        }
      });

      await this.consentService.handleConsentWithdrawal(userId, consentType);

      logger.info('Consent withdrawn', {
        userId,
        consentType,
        withdrawalReason,
        requestId: req.id
      });

      res.json({
        success: true,
        data: consent,
        message: 'Consent withdrawn successfully'
      });
    } catch (error) {
      logger.error('Withdraw consent error:', error);
      res.status(500).json({
        error: 'Failed to withdraw consent',
        requestId: req.id
      });
    }
  }

  async checkConsent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { consentType } = req.params;

      if (!consentType) {
        res.status(400).json({ error: 'Consent type is required' });
        return;
      }

      const consent = await this.prisma.userConsent.findUnique({
        where: {
          userId_consentType: {
            userId,
            consentType: consentType as any
          }
        }
      });

      const hasValidConsent = consent &&
        consent.status === 'GRANTED' &&
        (!consent.expiresAt || consent.expiresAt > new Date());

      res.json({
        success: true,
        data: {
          consentType,
          hasValidConsent,
          consent: consent ? {
            status: consent.status,
            grantedAt: consent.grantedAt,
            expiresAt: consent.expiresAt,
            version: consent.version
          } : null
        },
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Check consent error:', error);
      res.status(500).json({
        error: 'Failed to check consent',
        requestId: req.id
      });
    }
  }

  async getConsentStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const tenantId = req.user?.tenantId || 'default';

      const stats = await this.prisma.userConsent.groupBy({
        by: ['consentType', 'status'],
        _count: true,
        where: { tenantId }
      });

      const consentStats = stats.reduce((acc: Record<string, number>, stat: { consentType: string; status: string; _count: number }) => {
        const key = `${stat.consentType}_${stat.status}`;
        acc[key] = stat._count;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        success: true,
        data: {
          byConsentType: consentStats,
          total: Object.values(consentStats).reduce((sum: number, count: number) => sum + count, 0)
        },
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Get consent stats error:', error);
      res.status(500).json({
        error: 'Failed to retrieve consent statistics',
        requestId: req.id
      });
    }
  }

  private async logConsentAction(
    userId: string,
    action: string,
    consentType: string,
    ipAddress?: string,
    userAgent?: string,
    requestId?: string
  ): Promise<void> {
    try {
      await this.prisma.privacyAuditLog.create({
        data: {
          userId,
          action,
          category: 'consent',
          description: `Consent ${action.toLowerCase().replace('_', ' ')} for ${consentType}`,
          ipAddress: ipAddress || 'unknown',
          userAgent: userAgent || 'unknown',
          gdprArticle: '7',
          legalBasis: 'consent',
          metadata: {
            consentType,
            requestId
          }
        }
      });
    } catch (error) {
      logger.error('Failed to log consent action:', error);
    }
  }

  private async handleConsentWithdrawal(userId: string, consentType: string): Promise<void> {
    await this.consentService.handleConsentWithdrawal(userId, consentType);
  }

  private async stopMarketingEmails(userId: string): Promise<void> {
    logger.info(`Marketing emails stopped for user: ${userId}`);
  }

  private async disableAnalytics(userId: string): Promise<void> {
    logger.info(`Analytics tracking disabled for user: ${userId}`);
  }

  private async removeThirdPartyData(userId: string): Promise<void> {
    logger.info(`Third-party data removal initiated for user: ${userId}`);
  }
}

export default ConsentController;
