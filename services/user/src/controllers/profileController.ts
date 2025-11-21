/**
 * Profile Controller - Advanced User Profile Management
 * Handles preferences, settings, notifications, and profile customization
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createLogger } from 'winston';

const prisma = new PrismaClient();
const logger = createLogger({
  level: 'info',
  defaultMeta: { service: 'profile-controller' }
});

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  id?: string;
}

export class ProfileController {
  /**
   * Get user preferences
   */
  static async getPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      let preferences = await prisma.userPreferences.findUnique({
        where: { userId }
      });

      // Create default preferences if none exist
      if (!preferences) {
        preferences = await prisma.userPreferences.create({
          data: {
            userId,
            theme: 'dark',
            language: 'en',
            timezone: 'UTC',
            currency: 'USD',
            dateFormat: 'MM/DD/YYYY',
            timeFormat: '12h',
            notifications: {
              email: true,
              push: true,
              sms: false,
              desktop: true
            },
            trading: {
              defaultOrderType: 'market',
              confirmationRequired: true,
              riskLevel: 'medium',
              autoStopLoss: false
            },
            dashboard: {
              defaultView: 'portfolio',
              showBalance: true,
              showPnL: true,
              refreshInterval: 30
            }
          }
        });
      }

      res.json({
        success: true,
        data: preferences
      });
    } catch (error) {
      logger.error('Get preferences error:', error);
      res.status(500).json({
        error: 'Failed to fetch preferences',
        requestId: req.id
      });
    }
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const {
        theme,
        language,
        timezone,
        currency,
        dateFormat,
        timeFormat,
        notifications,
        trading,
        dashboard
      } = req.body;

      const preferences = await prisma.userPreferences.upsert({
        where: { userId },
        update: {
          theme,
          language,
          timezone,
          currency,
          dateFormat,
          timeFormat,
          notifications,
          trading,
          dashboard,
          updatedAt: new Date()
        },
        create: {
          userId,
          theme: theme || 'dark',
          language: language || 'en',
          timezone: timezone || 'UTC',
          currency: currency || 'USD',
          dateFormat: dateFormat || 'MM/DD/YYYY',
          timeFormat: timeFormat || '12h',
          notifications: notifications || {
            email: true,
            push: true,
            sms: false,
            desktop: true
          },
          trading: trading || {
            defaultOrderType: 'market',
            confirmationRequired: true,
            riskLevel: 'medium',
            autoStopLoss: false
          },
          dashboard: dashboard || {
            defaultView: 'portfolio',
            showBalance: true,
            showPnL: true,
            refreshInterval: 30
          }
        }
      });

      logger.info('Preferences updated', { userId, requestId: req.id });

      res.json({
        success: true,
        data: preferences,
        message: 'Preferences updated successfully'
      });
    } catch (error) {
      logger.error('Update preferences error:', error);
      res.status(500).json({
        error: 'Failed to update preferences',
        requestId: req.id
      });
    }
  }

  /**
   * Get user settings
   */
  static async getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      let settings = await prisma.userSettings.findUnique({
        where: { userId }
      });

      // Create default settings if none exist
      if (!settings) {
        settings = await prisma.userSettings.create({
          data: {
            userId,
            privacy: {
              profileVisible: true,
              showOnlineStatus: false,
              allowDirectMessages: true,
              showTradingActivity: false
            },
            security: {
              loginNotifications: true,
              deviceVerification: true,
              ipWhitelist: [],
              sessionTimeout: 24 // hours
            },
            api: {
              rateLimit: 1000,
              allowedIPs: [],
              webhookUrl: null
            },
            advanced: {
              betaFeatures: false,
              dataExport: true,
              analyticsOptOut: false
            }
          }
        });
      }

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      logger.error('Get settings error:', error);
      res.status(500).json({
        error: 'Failed to fetch settings',
        requestId: req.id
      });
    }
  }

  /**
   * Update user settings
   */
  static async updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { privacy, security, api, advanced } = req.body;

      const settings = await prisma.userSettings.upsert({
        where: { userId },
        update: {
          privacy,
          security,
          api,
          advanced,
          updatedAt: new Date()
        },
        create: {
          userId,
          privacy: privacy || {
            profileVisible: true,
            showOnlineStatus: false,
            allowDirectMessages: true,
            showTradingActivity: false
          },
          security: security || {
            loginNotifications: true,
            deviceVerification: true,
            ipWhitelist: [],
            sessionTimeout: 24
          },
          api: api || {
            rateLimit: 1000,
            allowedIPs: [],
            webhookUrl: null
          },
          advanced: advanced || {
            betaFeatures: false,
            dataExport: true,
            analyticsOptOut: false
          }
        }
      });

      logger.info('Settings updated', { userId, requestId: req.id });

      res.json({
        success: true,
        data: settings,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      logger.error('Update settings error:', error);
      res.status(500).json({
        error: 'Failed to update settings',
        requestId: req.id
      });
    }
  }

  /**
   * Get notification preferences
   */
  static async getNotificationPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      let notifications = await prisma.notificationPreferences.findUnique({
        where: { userId }
      });

      if (!notifications) {
        notifications = await prisma.notificationPreferences.create({
          data: {
            userId,
            email: {
              enabled: true,
              priceAlerts: true,
              portfolioUpdates: true,
              newsDigest: true,
              securityAlerts: true,
              marketingEmails: false
            },
            push: {
              enabled: true,
              priceAlerts: true,
              portfolioUpdates: false,
              newsBreaking: true,
              securityAlerts: true
            },
            sms: {
              enabled: false,
              securityAlerts: true,
              criticalPriceAlerts: false
            },
            inApp: {
              enabled: true,
              all: true
            }
          }
        });
      }

      res.json({
        success: true,
        data: notifications
      });
    } catch (error) {
      logger.error('Get notification preferences error:', error);
      res.status(500).json({
        error: 'Failed to fetch notification preferences',
        requestId: req.id
      });
    }
  }

  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { email, push, sms, inApp } = req.body;

      const notifications = await prisma.notificationPreferences.upsert({
        where: { userId },
        update: {
          email,
          push,
          sms,
          inApp,
          updatedAt: new Date()
        },
        create: {
          userId,
          email: email || {
            enabled: true,
            priceAlerts: true,
            portfolioUpdates: true,
            newsDigest: true,
            securityAlerts: true,
            marketingEmails: false
          },
          push: push || {
            enabled: true,
            priceAlerts: true,
            portfolioUpdates: false,
            newsBreaking: true,
            securityAlerts: true
          },
          sms: sms || {
            enabled: false,
            securityAlerts: true,
            criticalPriceAlerts: false
          },
          inApp: inApp || {
            enabled: true,
            all: true
          }
        }
      });

      logger.info('Notification preferences updated', { userId, requestId: req.id });

      res.json({
        success: true,
        data: notifications,
        message: 'Notification preferences updated successfully'
      });
    } catch (error) {
      logger.error('Update notification preferences error:', error);
      res.status(500).json({
        error: 'Failed to update notification preferences',
        requestId: req.id
      });
    }
  }
}

export default ProfileController;
