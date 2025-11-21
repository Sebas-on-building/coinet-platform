/**
 * GDPR Service - Core GDPR Data Rights Implementation
 *
 * Provides comprehensive GDPR compliance functionality including:
 * - Data access and export
 * - Account deletion and data erasure
 * - Data rectification and restriction
 * - Privacy audit logging
 * - Compliance reporting
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/Logger';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export interface DeletionResult {
  categoriesDeleted: string[];
  recordsDeleted: number;
  errors: string[];
}

export interface ExportResult {
  data: any;
  format: string;
  size: number;
  downloadUrl?: string;
}

export class GDPRService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }
  /**
   * Export all user data for GDPR access request (Article 15)
   */
  async exportUserData(
    userId: string,
    categories: string = 'all',
    format: string = 'JSON',
    requestId?: string
  ): Promise<ExportResult> {
    try {
      logger.info('Starting user data export', { userId, categories, format, requestId });

      const dataCategories = categories === 'all'
        ? ['personal', 'preferences', 'activity', 'analytics', 'financial']
        : categories.split(',');

      const exportData: any = {
        exportInfo: {
          userId,
          exportDate: new Date().toISOString(),
          requestId,
          format,
          categories: dataCategories,
          gdprArticle: '15',
          legalBasis: 'Right of access'
        },
        data: {}
      };

      // Export personal data
      if (dataCategories.includes('personal') || dataCategories.includes('all')) {
        exportData.data.personal = await this.exportPersonalData(userId);
      }

      // Export preferences and settings
      if (dataCategories.includes('preferences') || dataCategories.includes('all')) {
        exportData.data.preferences = await this.exportUserPreferences(userId);
      }

      // Export activity data
      if (dataCategories.includes('activity') || dataCategories.includes('all')) {
        exportData.data.activity = await this.exportUserActivity(userId);
      }

      // Export analytics data
      if (dataCategories.includes('analytics') || dataCategories.includes('all')) {
        exportData.data.analytics = await this.exportUserAnalytics(userId);
      }

      // Export financial/portfolio data
      if (dataCategories.includes('financial') || dataCategories.includes('all')) {
        exportData.data.financial = await this.exportFinancialData(userId);
      }

      const result: ExportResult = {
        data: exportData,
        format,
        size: JSON.stringify(exportData).length
      };

      logger.info('User data export completed', {
        userId,
        size: result.size,
        categories: dataCategories.length,
        requestId
      });

      return result;
    } catch (error) {
      logger.error('User data export failed', { userId, error, requestId });
      throw error;
    }
  }

  /**
   * Delete user account and all associated data (Article 17)
   */
  async deleteUserAccount(
    userId: string,
    reason: string,
    requestId?: string
  ): Promise<DeletionResult> {
    const result: DeletionResult = {
      categoriesDeleted: [],
      recordsDeleted: 0,
      errors: []
    };

    try {
      logger.warn('Starting account deletion', { userId, reason, requestId });

      // Start transaction for atomic deletion
      await this.prisma.$transaction(async (tx) => {
        // 1. Delete user consents
        try {
          const consentResult = await tx.userConsent.deleteMany({
            where: { userId }
          });
          result.categoriesDeleted.push('consents');
          result.recordsDeleted += consentResult.count;
        } catch (error) {
          result.errors.push(`Failed to delete consents: ${error}`);
        }

        // 2. Delete GDPR requests
        try {
          const gdprResult = await tx.gDPRRequest.deleteMany({
            where: { userId }
          });
          result.categoriesDeleted.push('gdpr_requests');
          result.recordsDeleted += gdprResult.count;
        } catch (error) {
          result.errors.push(`Failed to delete GDPR requests: ${error}`);
        }

        // 3. Delete privacy audit logs
        try {
          const auditResult = await tx.privacyAuditLog.deleteMany({
            where: { userId }
          });
          result.categoriesDeleted.push('privacy_audit_logs');
          result.recordsDeleted += auditResult.count;
        } catch (error) {
          result.errors.push(`Failed to delete privacy audit logs: ${error}`);
        }

        // 4. Delete notification preferences
        try {
          const notifResult = await tx.notificationPreference.deleteMany({
            where: { userId }
          });
          result.categoriesDeleted.push('notification_preferences');
          result.recordsDeleted += notifResult.count;
        } catch (error) {
          result.errors.push(`Failed to delete notification preferences: ${error}`);
        }

        // 5. Delete analytics events
        try {
          const analyticsResult = await tx.analyticsEvent.deleteMany({
            where: { userId }
          });
          result.categoriesDeleted.push('analytics_events');
          result.recordsDeleted += analyticsResult.count;
        } catch (error) {
          result.errors.push(`Failed to delete analytics events: ${error}`);
        }

        // 6. Delete audit logs
        try {
          const auditLogResult = await tx.auditLog.deleteMany({
            where: { userId }
          });
          result.categoriesDeleted.push('audit_logs');
          result.recordsDeleted += auditLogResult.count;
        } catch (error) {
          result.errors.push(`Failed to delete audit logs: ${error}`);
        }

        // 7. Delete portfolios and related data
        try {
          const portfolios = await tx.portfolio.findMany({
            where: { userId },
            include: { holdings: true, transactions: true }
          });

          for (const portfolio of portfolios) {
            await tx.transaction.deleteMany({
              where: { portfolioId: portfolio.id }
            });
            await tx.portfolioHolding.deleteMany({
              where: { portfolioId: portfolio.id }
            });
          }

          const portfolioResult = await tx.portfolio.deleteMany({
            where: { userId }
          });
          result.categoriesDeleted.push('portfolios');
          result.recordsDeleted += portfolioResult.count;
        } catch (error) {
          result.errors.push(`Failed to delete portfolios: ${error}`);
        }

        // 8. Delete alerts
        try {
          const alertResult = await tx.alert.deleteMany({
            where: { userId }
          });
          result.categoriesDeleted.push('alerts');
          result.recordsDeleted += alertResult.count;
        } catch (error) {
          result.errors.push(`Failed to delete alerts: ${error}`);
        }

        // 9. Delete strategies
        try {
          const strategyResult = await tx.strategy.deleteMany({
            where: { userId }
          });
          result.categoriesDeleted.push('strategies');
          result.recordsDeleted += strategyResult.count;
        } catch (error) {
          result.errors.push(`Failed to delete strategies: ${error}`);
        }

        // 10. Delete AI insights and related data
        try {
          const insights = await tx.aIInsight.findMany({
            where: { userId }
          });

          for (const insight of insights) {
            await tx.aIRecommendation.deleteMany({
              where: { insightId: insight.id }
            });
            await tx.aIDashboardView.deleteMany({
              where: { insightId: insight.id }
            });
            await tx.aIModelPrediction.deleteMany({
              where: { userId }
            });
          }

          const insightResult = await tx.aIInsight.deleteMany({
            where: { userId }
          });
          result.categoriesDeleted.push('ai_insights');
          result.recordsDeleted += insightResult.count;
        } catch (error) {
          result.errors.push(`Failed to delete AI insights: ${error}`);
        }

        // 11. Delete user feedback
        try {
          const feedbackResult = await tx.userFeedback.deleteMany({
            where: { userId }
          });
          result.categoriesDeleted.push('user_feedback');
          result.recordsDeleted += feedbackResult.count;
        } catch (error) {
          result.errors.push(`Failed to delete user feedback: ${error}`);
        }

        // 12. Delete encrypted data
        try {
          const encryptedResult = await tx.encryptedUserData.deleteMany({
            where: { userId }
          });
          result.categoriesDeleted.push('encrypted_data');
          result.recordsDeleted += encryptedResult.count;
        } catch (error) {
          result.errors.push(`Failed to delete encrypted data: ${error}`);
        }

        // 13. Delete encryption keys
        try {
          const keyResult = await tx.userEncryptionKey.deleteMany({
            where: { userId }
          });
          result.categoriesDeleted.push('encryption_keys');
          result.recordsDeleted += keyResult.count;
        } catch (error) {
          result.errors.push(`Failed to delete encryption keys: ${error}`);
        }

        // 14. Delete sessions and tokens
        try {
          await tx.session.deleteMany({ where: { userId } });
          await tx.refreshToken.deleteMany({ where: { userId } });
          await tx.passwordResetToken.deleteMany({ where: { userId } });
          await tx.apiKey.deleteMany({ where: { userId } });
          await tx.oAuthAccount.deleteMany({ where: { userId } });
          await tx.trustedDevice.deleteMany({ where: { userId } });
          await tx.backupCode.deleteMany({ where: { userId } });
          result.categoriesDeleted.push('authentication_data');
        } catch (error) {
          result.errors.push(`Failed to delete authentication data: ${error}`);
        }

        // 15. Anonymize user record (soft delete)
        try {
          await tx.user.update({
            where: { id: userId },
            data: {
              email: `deleted_${userId}@deleted.coinet.local`,
              name: null,
              password: crypto.randomBytes(32).toString('hex'),
              avatar: null,
              bio: null,
              isVerified: false,
              isTwoFactorEnabled: false,
              twoFASecret: null,
              twoFactorBackupCodes: [],
              loginAttempts: 0,
              lockedUntil: null,
              lastLoginAt: null,
              passwordResetToken: null,
              passwordResetExpires: null,
              verificationToken: null,
              timezone: 'UTC',
              language: 'en',
              metadata: {
                deletedAt: new Date().toISOString(),
                deletionReason: reason,
                requestId,
                gdprErasure: true
              }
            }
          });
          result.categoriesDeleted.push('user_record_anonymized');
        } catch (error) {
          result.errors.push(`Failed to anonymize user record: ${error}`);
        }
      });

      logger.warn('Account deletion completed', {
        userId,
        recordsDeleted: result.recordsDeleted,
        categoriesDeleted: result.categoriesDeleted,
        requestId
      });

      return result;
    } catch (error) {
      logger.error('Account deletion failed', { userId, error, requestId });
      throw error;
    }
  }

  /**
   * Export personal data (name, email, profile info)
   */
  private async exportPersonalData(userId: string): Promise<any> {
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
        lastLoginAt: true
      }
    });

    return {
      ...user,
      exportedAt: new Date().toISOString(),
      dataCategory: 'personal'
    };
  }

  /**
   * Export user preferences and settings
   */
  private async exportUserPreferences(userId: string): Promise<any> {
    const [userPreferences, notificationPrefs] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          preferences: true, 
          settings: true
        }
      }),
      this.prisma.notificationPreference.findUnique({
        where: { userId }
      })
    ]);

    return {
      preferences: userPreferences?.preferences, 
      settings: userPreferences?.settings, 
      notificationPreferences: notificationPrefs,
      exportedAt: new Date().toISOString(),
      dataCategory: 'preferences'
    };
  }

  /**
   * Export user activity data
   */
  private async exportUserActivity(userId: string): Promise<any> {
    const [sessions, auditLogs, onboarding] = await Promise.all([
      this.prisma.session.findMany({
        where: { userId },
        select: {
          id: true,
          deviceInfo: true,
          ipAddress: true,
          lastActivity: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 1000
      }),
      this.prisma.auditLog.findMany({
        where: { userId },
        select: {
          id: true,
          action: true,
          resource: true,
          details: true,
          ipAddress: true,
          createdAt: true,
          outcome: true
        },
        orderBy: { createdAt: 'desc' },
        take: 1000
      }),
      this.prisma.onboardingStep.findMany({
        where: { userId },
        select: {
          step: true,
          completed: true,
          timestamp: true,
          data: true
        }
      })
    ]);

    return {
      sessions,
      auditLogs,
      onboardingSteps: onboarding,
      exportedAt: new Date().toISOString(),
      dataCategory: 'activity'
    };
  }

  /**
   * Export user analytics data
   */
  private async exportUserAnalytics(userId: string): Promise<any> {
    const analyticsEvents = await this.prisma.analyticsEvent.findMany({
      where: { userId },
      select: {
        id: true,
        event: true,
        category: true,
        action: true,
        label: true,
        value: true,
        data: true,
        timestamp: true,
        userAgent: true,
        ipAddress: true,
        referer: true
      },
      orderBy: { timestamp: 'desc' },
      take: 10000
    });

    return {
      events: analyticsEvents,
      eventCount: analyticsEvents.length,
      exportedAt: new Date().toISOString(),
      dataCategory: 'analytics'
    };
  }

  /**
   * Export financial and portfolio data
   */
  private async exportFinancialData(userId: string): Promise<any> {
    const [portfolios, alerts, strategies] = await Promise.all([
      this.prisma.portfolio.findMany({
        where: { userId },
        include: {
          holdings: true,
          transactions: {
            orderBy: { executedAt: 'desc' },
            take: 1000
          }
        }
      }),
      this.prisma.alert.findMany({
        where: { userId },
        select: {
          name: true,
          symbol: true,
          condition: true,
          threshold: true,
          isActive: true,
          createdAt: true,
          triggeredAt: true
        }
      }),
      this.prisma.strategy.findMany({
        where: { userId },
        select: {
          name: true,
          description: true,
          isActive: true,
          totalReturn: true,
          winRate: true,
          createdAt: true
        }
      })
    ]);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        portfolio: {
          userId
        }
      },
      select: {
        id: true,
        symbol: true,
        side: true,
        quantity: true,
        price: true,
        total: true,
        executedAt: true
      },
      orderBy: { executedAt: 'desc' },
      take: 5000
    });

    return {
      portfolios,
      alerts,
      strategies,
      transactions,
      collectedAt: new Date().toISOString(),
      category: 'financial'
    };
  }

  /**
   * Anonymize user data while preserving analytics value
   */
  async anonymizeUserData(userId: string, reason: string): Promise<void> {
    try {
      logger.info('Starting data anonymization', { userId, reason });

      await this.prisma.$transaction(async (tx) => {
        // Anonymize personal identifiable information
        await tx.user.update({
          where: { id: userId },
          data: {
            email: `anon_${crypto.randomBytes(8).toString('hex')}@anonymous.local`,
            name: `Anonymous User ${crypto.randomBytes(4).toString('hex')}`,
            avatar: null,
            bio: null,
            metadata: {
              ...((await tx.user.findUnique({ where: { id: userId } }))?.metadata || {}),
              anonymizedAt: new Date().toISOString(),
              anonymizationReason: reason,
              originalUserId: userId
            }
          }
        });

        // Remove direct identifiers from analytics events
        await tx.analyticsEvent.updateMany({
          where: { userId },
          data: {
            userAgent: null,
            ipAddress: null,
            referer: null,
            data: {
              anonymized: true,
              anonymizedAt: new Date().toISOString()
            }
          }
        });

        // Anonymize audit logs (remove IP addresses)
        await tx.auditLog.updateMany({
          where: { userId },
          data: {
            ipAddress: null,
            userAgent: null,
            details: { // Wrap in JSON since metadata is Json
              anonymized: true,
              anonymizedAt: new Date().toISOString()
            } as any // Cast to any to bypass type checking for direct JSON manipulation
          }
        });

        // Log anonymization
        await tx.privacyAuditLog.create({
          data: {
            userId,
            action: 'DATA_ANONYMIZED',
            category: 'data_anonymization',
            description: `User data anonymized: ${reason}`,
            gdprArticle: '17',
            legalBasis: 'consent',
            metadata: { reason }
          }
        });
      });

      logger.info('Data anonymization completed', { userId });
    } catch (error) {
      logger.error('Data anonymization failed', { userId, error });
      throw error;
    }
  }

  /**
   * Generate GDPR compliance report
   */
  async generateComplianceReport(tenantId: string, dateRange?: { start: Date; end: Date }): Promise<any> {
    const whereClause: any = { tenantId };

    if (dateRange) {
      whereClause.createdAt = {
        gte: dateRange.start,
        lte: dateRange.end
      };
    }

    const [
      totalUsers,
      consentStats,
      gdprRequests,
      dataExports,
      deletions,
      auditLogs
    ] = await Promise.all([
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.userConsent.groupBy({
        by: ['status'],
        _count: true,
        where: whereClause
      }),
      this.prisma.gDPRRequest.groupBy({
        by: ['requestType', 'status'],
        _count: true,
        where: whereClause
      }),
      this.prisma.privacyAuditLog.count({
        where: { ...whereClause, action: 'DATA_EXPORTED' }
      }),
      this.prisma.privacyAuditLog.count({
        where: { ...whereClause, action: 'ACCOUNT_DELETED' }
      }),
      this.prisma.privacyAuditLog.count({
        where: whereClause
      })
    ]);

    return {
      reportPeriod: {
        start: dateRange?.start || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        end: dateRange?.end || new Date()
      },
      summary: {
        totalUsers,
        totalAuditLogs: auditLogs,
        dataExports,
        accountDeletions: deletions
      },
      consents: consentStats.reduce((acc: any, stat) => {
        acc[stat.status] = stat._count;
        return acc;
      }, {}),
      gdprRequests: gdprRequests.reduce((acc: any, req) => {
        const key = `${req.requestType}_${req.status}`;
        acc[key] = req._count;
        return acc;
      }, {}),
      complianceMetrics: {
        consentRate: totalUsers > 0 ?
          ((consentStats.find(s => s.status === 'GRANTED')?._count || 0) / totalUsers * 100).toFixed(2) : '0',
        deletionRate: totalUsers > 0 ? (deletions / totalUsers * 100).toFixed(4) : '0',
        requestFulfillmentRate: gdprRequests.length > 0 ?
          ((gdprRequests.find(r => r.status === 'COMPLETED')?._count || 0) / gdprRequests.length * 100).toFixed(2) : '0'
      },
      generatedAt: new Date().toISOString()
    };
  }
}
