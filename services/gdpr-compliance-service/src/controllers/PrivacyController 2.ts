/**
 * Privacy Controller - User Privacy Settings and Data Management
 *
 * Handles user privacy preferences and settings including:
 * - Privacy settings management
 * - Data processing preferences
 * - Third-party integrations
 * - Privacy policy acceptance
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

export class PrivacyController {
  private prisma: PrismaClient;
  private auditService: AuditService;

  constructor(prisma: PrismaClient, auditService: AuditService) {
    this.prisma = prisma;
    this.auditService = auditService;
  }

  /**
   * Get user privacy settings and preferences
   */
  async getPrivacySettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const [consents, notificationPrefs] = await Promise.all([
        this.prisma.userConsent.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.notificationPreference.findUnique({
          where: { userId }
        })
      ]);

      res.json({
        success: true,
        data: {
          consents,
          notificationPreferences: notificationPrefs,
          summary: {
            totalConsents: consents.length,
            grantedConsents: consents.filter(c => c.status === 'GRANTED').length,
            withdrawnConsents: consents.filter(c => c.status === 'WITHDRAWN').length
          }
        },
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Get privacy settings error:', error);
      res.status(500).json({
        error: 'Failed to retrieve privacy settings',
        requestId: req.id
      });
    }
  }

  /**
   * Update user privacy settings
   */
  async updatePrivacySettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const {
        dataProcessingConsent,
        marketingConsent,
        analyticsConsent,
        thirdPartySharingConsent,
        notificationPreferences
      } = req.body;

      // Update consents if provided
      const consentUpdates = [];

      if (dataProcessingConsent !== undefined) {
        consentUpdates.push({
          consentType: 'DATA_PROCESSING',
          status: dataProcessingConsent ? 'GRANTED' : 'DENIED'
        });
      }

      if (marketingConsent !== undefined) {
        consentUpdates.push({
          consentType: 'MARKETING_EMAILS',
          status: marketingConsent ? 'GRANTED' : 'DENIED'
        });
      }

      if (analyticsConsent !== undefined) {
        consentUpdates.push({
          consentType: 'ANALYTICS_TRACKING',
          status: analyticsConsent ? 'GRANTED' : 'DENIED'
        });
      }

      if (thirdPartySharingConsent !== undefined) {
        consentUpdates.push({
          consentType: 'THIRD_PARTY_SHARING',
          status: thirdPartySharingConsent ? 'GRANTED' : 'DENIED'
        });
      }

      // Update consents
      for (const update of consentUpdates) {
        await this.prisma.userConsent.upsert({
          where: {
            userId_consentType: {
              userId,
              consentType: update.consentType as any
            }
          },
          update: {
            status: update.status as any,
            updatedAt: new Date()
          },
          create: {
            userId,
            tenantId: req.user?.tenantId || 'default',
            consentType: update.consentType as any,
            status: update.status as any,
            version: '1.0',
            consentText: `Consent for ${update.consentType.toLowerCase().replace('_', ' ')}`,
            collectionMethod: 'privacy_settings'
          }
        });
      }

      // Update notification preferences if provided
      if (notificationPreferences) {
        await this.prisma.notificationPreference.upsert({
          where: { userId },
          update: notificationPreferences,
          create: {
            userId,
            ...notificationPreferences
          }
        });
      }

      // Log privacy settings update
      await this.logPrivacyAction(
        userId,
        'PRIVACY_SETTINGS_UPDATED',
        'privacy_settings',
        'User privacy settings updated',
        req.ip,
        req.get('User-Agent'),
        req.id
      );

      logger.info('Privacy settings updated', {
        userId,
        updates: consentUpdates.length,
        requestId: req.id
      });

      res.json({
        success: true,
        message: 'Privacy settings updated successfully',
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Update privacy settings error:', error);
      res.status(500).json({
        error: 'Failed to update privacy settings',
        requestId: req.id
      });
    }
  }

  /**
   * Get user's data processing activities
   */
  async getDataProcessingActivities(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const [
        auditLogs,
        consents,
        gdprRequests,
        dataExports
      ] = await Promise.all([
        this.prisma.privacyAuditLog.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 100
        }),
        this.prisma.userConsent.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.gDPRRequest.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 50
        }),
        this.prisma.privacyAuditLog.findMany({
          where: {
            userId,
            action: { in: ['DATA_EXPORTED', 'ACCOUNT_DELETED'] }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        })
      ]);

      res.json({
        success: true,
        data: {
          auditLogs,
          consents,
          gdprRequests,
          dataExports,
          summary: {
            totalAuditLogs: auditLogs.length,
            activeConsents: consents.filter(c => c.status === 'GRANTED').length,
            pendingGdprRequests: gdprRequests.filter(r => r.status === 'PENDING').length,
            dataActions: dataExports.length
          }
        },
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Get data processing activities error:', error);
      res.status(500).json({
        error: 'Failed to retrieve data processing activities',
        requestId: req.id
      });
    }
  }

  /**
   * Download user's personal data
   */
  async downloadPersonalData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { format = 'JSON', categories = 'all' } = req.query;

      // Create GDPR request for this download
      const gdprRequest = await this.prisma.gDPRRequest.create({
        data: {
          userId,
          tenantId: req.user?.tenantId || 'default',
          requestType: 'ACCESS',
          status: 'PROCESSING',
          description: 'Personal data download request',
          requestedData: categories === 'all' ? ['personal', 'preferences'] : [categories as string],
          metadata: {
            format,
            automated: true,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          }
        }
      });

      // Collect personal data
      const personalData = await this.collectPersonalData(userId);

      // Format response based on requested format
      let responseData: string;
      let contentType: string;
      let filename: string;

      switch ((format as string).toUpperCase()) {
        case 'JSON':
          responseData = JSON.stringify(personalData, null, 2);
          contentType = 'application/json';
          filename = `personal-data-${userId}.json`;
          break;

        case 'CSV':
          responseData = this.convertToCSV(personalData);
          contentType = 'text/csv';
          filename = `personal-data-${userId}.csv`;
          break;

        default:
          responseData = JSON.stringify(personalData, null, 2);
          contentType = 'application/json';
          filename = `personal-data-${userId}.json`;
      }

      // Update GDPR request status
      await this.prisma.gDPRRequest.update({
        where: { id: gdprRequest.id },
        data: {
          status: 'COMPLETED',
          actualCompletion: new Date(),
          responseData: personalData,
          responseFormat: format
        }
      });

      // Log data access
      await this.logPrivacyAction(
        userId,
        'PERSONAL_DATA_DOWNLOADED',
        'data_access',
        `Personal data downloaded in ${format} format`,
        req.ip,
        req.get('User-Agent'),
        req.id,
        '15'
      );

      // Set headers for file download
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(responseData));

      res.send(responseData);
    } catch (error) {
      logger.error('Download personal data error:', error);
      res.status(500).json({
        error: 'Failed to download personal data',
        requestId: req.id
      });
    }
  }

  /**
   * Get privacy policy information and acceptance status
   */
  async getPrivacyPolicy(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Get latest privacy policy version
      const latestPolicy = await this.getLatestPrivacyPolicy();

      // Check if user has accepted current version
      const userAcceptance = await this.prisma.userConsent.findFirst({
        where: {
          userId,
          consentType: 'DATA_PROCESSING',
          status: 'GRANTED'
        }
      });

      res.json({
        success: true,
        data: {
          currentPolicy: {
            version: latestPolicy.version,
            content: latestPolicy.content,
            effectiveDate: latestPolicy.effectiveDate,
            summary: latestPolicy.summary
          },
          userAcceptance: userAcceptance ? {
            accepted: true,
            acceptedAt: userAcceptance.grantedAt,
            version: userAcceptance.version
          } : {
            accepted: false
          }
        },
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Get privacy policy error:', error);
      res.status(500).json({
        error: 'Failed to retrieve privacy policy',
        requestId: req.id
      });
    }
  }

  /**
   * Accept privacy policy
   */
  async acceptPrivacyPolicy(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { version, acceptanceText } = req.body;

      if (!version || !acceptanceText) {
        res.status(400).json({
          error: 'Version and acceptance text are required'
        });
        return;
      }

      // Update or create consent record
      const consent = await this.prisma.userConsent.upsert({
        where: {
          userId_consentType: {
            userId,
            consentType: 'DATA_PROCESSING'
          }
        },
        update: {
          status: 'GRANTED',
          version,
          consentText: acceptanceText,
          grantedAt: new Date(),
          collectionMethod: 'privacy_policy_acceptance',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          updatedAt: new Date()
        },
        create: {
          userId,
          tenantId: req.user?.tenantId || 'default',
          consentType: 'DATA_PROCESSING',
          status: 'GRANTED',
          version,
          consentText: acceptanceText,
          grantedAt: new Date(),
          collectionMethod: 'privacy_policy_acceptance',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });

      // Log policy acceptance
      await this.logPrivacyAction(
        userId,
        'PRIVACY_POLICY_ACCEPTED',
        'privacy_policy',
        `Privacy policy version ${version} accepted`,
        req.ip,
        req.get('User-Agent'),
        req.id
      );

      logger.info('Privacy policy accepted', {
        userId,
        version,
        requestId: req.id
      });

      res.json({
        success: true,
        data: consent,
        message: 'Privacy policy accepted successfully'
      });
    } catch (error) {
      logger.error('Accept privacy policy error:', error);
      res.status(500).json({
        error: 'Failed to accept privacy policy',
        requestId: req.id
      });
    }
  }

  /**
   * Get data retention information for user
   */
  async getDataRetentionInfo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Get data retention policies applicable to this user
      const policies = await this.prisma.dataRetentionPolicy.findMany({
        where: {
          OR: [
            { appliesToAll: true },
            { userIds: { has: userId } }
          ],
          isActive: true,
          tenantId: req.user?.tenantId || 'default'
        },
        orderBy: { createdAt: 'desc' }
      });

      // Calculate data deletion dates based on policies
      const dataRetentionInfo = policies.map(policy => ({
        dataCategory: policy.dataCategory,
        retentionPeriod: policy.retentionPeriod,
        autoDelete: policy.autoDelete,
        anonymizeInstead: policy.anonymizeInstead,
        estimatedDeletionDate: policy.retentionPeriod !== 'INDEFINITE'
          ? new Date(Date.now() + this.getRetentionPeriodMs(policy.retentionPeriod))
          : null,
        policyName: policy.name
      }));

      res.json({
        success: true,
        data: {
          policies: dataRetentionInfo,
          summary: {
            totalPolicies: policies.length,
            autoDeleteEnabled: policies.filter(p => p.autoDelete).length,
            anonymizationEnabled: policies.filter(p => p.anonymizeInstead).length
          }
        },
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Get data retention info error:', error);
      res.status(500).json({
        error: 'Failed to retrieve data retention information',
        requestId: req.id
      });
    }
  }

  /**
   * Helper method to collect personal data
   */
  private async collectPersonalData(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        timezone: true,
        language: true,
        role: true,
        tier: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        preferences: true,
        settings: true
      }
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    return {
      ...user,
      exportDate: new Date().toISOString(),
      dataCategory: 'personal',
      gdprArticle: '15',
      legalBasis: 'Right of access'
    };
  }

  /**
   * Helper method to convert data to CSV
   */
  private convertToCSV(data: any): string {
    if (!data || typeof data !== 'object') {
      return '';
    }

    const flattenObject = (obj: any, prefix: string = ''): any => {
      const flattened: any = {};

      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}_${key}` : key;

        if (value === null || value === undefined) {
          flattened[newKey] = '';
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(flattened, flattenObject(value, newKey));
        } else if (Array.isArray(value)) {
          flattened[newKey] = `[${value.join(',')}]`;
        } else {
          flattened[newKey] = String(value);
        }
      }

      return flattened;
    };

    const flattened = flattenObject(data);
    const headers = Object.keys(flattened);
    const values = Object.values(flattened);

    return [headers.join(','), values.map(v => `"${v}"`).join(',')].join('\n');
  }

  /**
   * Helper method to get latest privacy policy
   */
  private async getLatestPrivacyPolicy(): Promise<any> {
    // In a real implementation, this would fetch from a privacy policy management system
    return {
      version: '1.0',
      content: 'Full privacy policy content would be stored here...',
      effectiveDate: new Date().toISOString(),
      summary: 'We collect and process your personal data in accordance with GDPR...'
    };
  }

  /**
   * Helper method to convert retention period to milliseconds
   */
  private getRetentionPeriodMs(period: string): number {
    const periodMap: { [key: string]: number } = {
      'DAYS_30': 30 * 24 * 60 * 60 * 1000,
      'DAYS_90': 90 * 24 * 60 * 60 * 1000,
      'DAYS_180': 180 * 24 * 60 * 60 * 1000,
      'DAYS_365': 365 * 24 * 60 * 60 * 1000,
      'DAYS_730': 730 * 24 * 60 * 60 * 1000,
      'DAYS_1825': 1825 * 24 * 60 * 60 * 1000,
      'DAYS_3650': 3650 * 24 * 60 * 60 * 1000
    };

    return periodMap[period] || 0;
  }

  /**
   * Helper method to log privacy actions
   */
  private async logPrivacyAction(
    userId: string,
    action: string,
    category: string,
    description: string,
    ipAddress?: string,
    userAgent?: string,
    requestId?: string,
    gdprArticle?: string
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
          metadata: { requestId }
        }
      });
    } catch (error) {
      logger.error('Failed to log privacy action', { userId, action, error });
    }
  }
}

export default PrivacyController;
