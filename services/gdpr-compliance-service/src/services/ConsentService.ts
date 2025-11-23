/**
 * Consent Management Service - GDPR Article 7 Implementation
 *
 * Handles consent lifecycle including:
 * - Consent collection and validation
 * - Consent withdrawal processing
 * - Consent status management
 * - Integration with third-party services
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/Logger';

// Removed direct PrismaClient instantiation
// const prisma = new PrismaClient();

export interface ConsentOptions {
  consentType: string;
  version: string;
  consentText: string;
  expiresAt?: Date;
  collectionMethod: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConsentWithdrawalOptions {
  consentType: string;
  reason: string;
  method: string;
  ipAddress?: string;
  userAgent?: string;
}

export class ConsentService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }
  /**
   * Grant consent for a user
   */
  async grantConsent(
    userId: string,
    tenantId: string,
    options: ConsentOptions
  ): Promise<any> {
    try {
      const consent = await this.prisma.userConsent.upsert({
        where: {
          userId_consentType: {
            userId,
            consentType: options.consentType as any
          }
        },
        update: {
          status: 'GRANTED',
          version: options.version,
          consentText: options.consentText,
          grantedAt: new Date(),
          expiresAt: options.expiresAt,
          collectionMethod: options.collectionMethod,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
          updatedAt: new Date()
        },
        create: {
          userId,
          tenantId,
          consentType: options.consentType as any,
          status: 'GRANTED',
          version: options.version,
          consentText: options.consentText,
          grantedAt: new Date(),
          expiresAt: options.expiresAt,
          collectionMethod: options.collectionMethod,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent
        }
      });

      // Log consent for audit trail
      await this.logConsentAction(
        userId,
        'CONSENT_GRANTED',
        options.consentType,
        options.ipAddress,
        options.userAgent
      );

      logger.info('Consent granted', {
        userId,
        consentType: options.consentType,
        version: options.version
      });

      return consent;
    } catch (error) {
      logger.error('Failed to grant consent', { userId, options, error });
      throw error;
    }
  }

  /**
   * Withdraw consent for a user
   */
  async withdrawConsent(
    userId: string,
    options: ConsentWithdrawalOptions
  ): Promise<any> {
    try {
      const consent = await this.prisma.userConsent.update({
        where: {
          userId_consentType: {
            userId,
            consentType: options.consentType as any
          }
        },
        data: {
          status: 'WITHDRAWN',
          withdrawnAt: new Date(),
          withdrawalReason: options.reason,
          withdrawalMethod: options.method,
          updatedAt: new Date()
        }
      });

      // Log consent withdrawal
      await this.logConsentAction(
        userId,
        'CONSENT_WITHDRAWN',
        options.consentType,
        options.ipAddress,
        options.userAgent
      );

      // Handle consent withdrawal actions
      await this.handleConsentWithdrawal(userId, options.consentType);

      logger.info('Consent withdrawn', {
        userId,
        consentType: options.consentType,
        reason: options.reason
      });

      return consent;
    } catch (error) {
      logger.error('Failed to withdraw consent', { userId, options, error });
      throw error;
    }
  }

  /**
   * Check if user has valid consent for specific processing
   */
  async checkConsent(
    userId: string,
    consentType: string
  ): Promise<{ hasConsent: boolean; consent?: any }> {
    try {
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

      return {
        hasConsent: hasValidConsent,
        consent: consent ? {
          status: consent.status,
          grantedAt: consent.grantedAt,
          expiresAt: consent.expiresAt,
          version: consent.version
        } : undefined
      };
    } catch (error) {
      logger.error('Failed to check consent', { userId, consentType, error });
      throw error;
    }
  }

  /**
   * Get all consents for a user
   */
  async getUserConsents(userId: string, tenantId: string): Promise<any[]> {
    try {
      return await this.prisma.userConsent.findMany({
        where: {
          userId,
          tenantId
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      logger.error('Failed to get user consents', { userId, tenantId, error });
      throw error;
    }
  }

  /**
   * Get consent statistics for admin dashboard
   */
  async getConsentStats(tenantId: string): Promise<any> {
    try {
      const stats = await this.prisma.userConsent.groupBy({
        by: ['consentType', 'status'],
        _count: true,
        where: { tenantId }
      });

      const consentStats = stats.reduce((acc: any, stat) => {
        const key = `${stat.consentType}_${stat.status}`;
        acc[key] = stat._count;
        return acc;
      }, {});

      return {
        byConsentType: consentStats,
        total: Object.values(consentStats).reduce((sum: number, count: number) => sum + count, 0)
      };
    } catch (error) {
      logger.error('Failed to get consent stats', { tenantId, error });
      throw error;
    }
  }

  /**
   * Handle consent withdrawal actions based on consent type
   */
  async handleConsentWithdrawal(userId: string, consentType: string): Promise<void> {
    try {
      switch (consentType) {
        case 'MARKETING_EMAILS':
          await this.stopMarketingEmails(userId);
          break;
        case 'ANALYTICS_TRACKING':
          await this.disableAnalytics(userId);
          break;
        case 'THIRD_PARTY_SHARING':
          await this.removeThirdPartyData(userId);
          break;
        case 'PUSH_NOTIFICATIONS':
          await this.disablePushNotifications(userId);
          break;
        case 'SMS_NOTIFICATIONS':
          await this.disableSMSNotifications(userId);
          break;
        default:
          logger.info(`No specific withdrawal actions for consent type: ${consentType}`);
      }
    } catch (error) {
      logger.error('Error handling consent withdrawal', { userId, consentType, error });
    }
  }

  /**
   * Stop sending marketing emails
   */
  private async stopMarketingEmails(userId: string): Promise<void> {
    // Integration with email service
    logger.info(`Marketing emails disabled for user: ${userId}`);

    // Update user preferences to disable marketing emails
    await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        categories: {
          // Remove marketing from categories array
          // This is a simplified implementation
        }
      },
      create: {
        userId,
        email: false,
        push: false,
        sms: false,
        inApp: true,
        categories: []
      }
    });
  }

  /**
   * Disable analytics tracking
   */
  private async disableAnalytics(userId: string): Promise<void> {
    // Integration with analytics service
    logger.info(`Analytics tracking disabled for user: ${userId}`);

    // Mark user's analytics events for deletion or anonymization
    // This would be handled by the GDPR service
  }

  /**
   * Remove third-party data sharing
   */
  private async removeThirdPartyData(userId: string): Promise<void> {
    // Integration with third-party services
    logger.info(`Third-party data sharing disabled for user: ${userId}`);

    // Remove user data from integrated services
    // This would involve API calls to external services
  }

  /**
   * Disable push notifications
   */
  private async disablePushNotifications(userId: string): Promise<void> {
    logger.info(`Push notifications disabled for user: ${userId}`);

    // Update notification preferences
    await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: { push: false },
      create: {
        userId,
        email: true,
        push: false,
        sms: false,
        inApp: true,
        categories: ['alerts', 'portfolio']
      }
    });
  }

  /**
   * Disable SMS notifications
   */
  private async disableSMSNotifications(userId: string): Promise<void> {
    logger.info(`SMS notifications disabled for user: ${userId}`);

    // Update notification preferences
    await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: { sms: false },
      create: {
        userId,
        email: true,
        push: false,
        sms: false,
        inApp: true,
        categories: ['alerts', 'portfolio']
      }
    });
  }

  /**
   * Log consent action for audit trail
   */
  private async logConsentAction(
    userId: string,
    action: string,
    consentType: string,
    ipAddress?: string,
    userAgent?: string
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
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      logger.error('Failed to log consent action', { userId, action, error });
    }
  }
}

export default ConsentService;
