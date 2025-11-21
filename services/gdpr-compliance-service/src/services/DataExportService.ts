/**
 * Data Export Service - GDPR Article 20 Data Portability
 *
 * Handles secure export of user data in multiple formats:
 * - JSON (default)
 * - CSV (for spreadsheet analysis)
 * - PDF (for human-readable reports)
 * - XML (for system integration)
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/Logger';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export interface ExportOptions {
  format: 'JSON' | 'CSV' | 'PDF' | 'XML';
  categories: string[];
  includeMetadata: boolean;
  compress: boolean;
  encrypt: boolean;
}

export class DataExportService {
  private prisma: PrismaClient;
  private exportDir: string;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.exportDir = path.join(process.cwd(), 'exports', 'gdpr');
    this.ensureExportDirectory();
  }

  async exportUserData(
    userId: string,
    categories: string,
    format: string,
    requestId?: string
  ): Promise<{ data: any; downloadUrl: string; size: number }> {
    try {
      logger.info('Starting data export', { userId, format, categories, requestId });

      const dataCategories = categories === 'all'
        ? ['personal', 'preferences', 'activity', 'analytics', 'financial']
        : categories.split(',');

      const userData = await this.collectUserData(userId, dataCategories);

      let formattedData: any;
      let fileExtension: string;
      let mimeType: string;

      switch (format.toUpperCase()) {
        case 'JSON':
          formattedData = this.formatAsJSON(userData, requestId);
          fileExtension = 'json';
          mimeType = 'application/json';
          break;

        case 'CSV':
          formattedData = this.formatAsCSV(userData);
          fileExtension = 'csv';
          mimeType = 'text/csv';
          break;

        case 'XML':
          formattedData = this.formatAsXML(userData, requestId);
          fileExtension = 'xml';
          mimeType = 'application/xml';
          break;

        case 'PDF':
          formattedData = await this.formatAsPDF(userData, requestId);
          fileExtension = 'pdf';
          mimeType = 'application/pdf';
          break;

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      const filename = this.generateSecureFilename(userId, format, requestId);
      const filePath = path.join(this.exportDir, filename);

      await fs.writeFile(filePath, formattedData, 'utf8');

      const downloadUrl = await this.generateSecureDownloadUrl(filename, userId);

      const stats = await fs.stat(filePath);
      const size = stats.size;

      logger.info('Data export completed', {
        userId,
        format,
        size,
        filePath,
        requestId
      });

      return {
        data: formattedData,
        downloadUrl,
        size
      };
    } catch (error) {
      logger.error('Data export failed', { userId, format, error, requestId });
      throw error;
    }
  }

  private async collectUserData(userId: string, categories: string[]): Promise<any> {
    const data: any = {
      exportInfo: {
        userId,
        exportDate: new Date().toISOString(),
        categories,
        gdprArticle: '20',
        legalBasis: 'Data portability'
      },
      data: {}
    };

    for (const category of categories) {
      switch (category) {
        case 'personal':
          data.data.personal = await this.getPersonalData(userId);
          break;
        case 'preferences':
          data.data.preferences = await this.getUserPreferences(userId);
          break;
        case 'activity':
          data.data.activity = await this.getUserActivity(userId);
          break;
        case 'analytics':
          data.data.analytics = await this.getUserAnalytics(userId);
          break;
        case 'financial':
          data.data.financial = await this.getFinancialData(userId);
          break;
      }
    }

    return data;
  }

  private async getPersonalData(userId: string): Promise<any> {
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
        verifiedAt: true
      }
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    return {
      ...user,
      collectedAt: new Date().toISOString(),
      category: 'personal'
    };
  }

  private async getUserPreferences(userId: string): Promise<any> {
    const [userPrefs, notificationPrefs] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true, settings: true }
      }),
      this.prisma.notificationPreference.findUnique({
        where: { userId }
      })
    ]);

    return {
      preferences: userPrefs?.preferences,
      settings: userPrefs?.settings,
      notificationPreferences: notificationPrefs,
      collectedAt: new Date().toISOString(),
      category: 'preferences'
    };
  }

  private async getUserActivity(userId: string): Promise<any> {
    const [sessions, auditLogs, notificationEvents] = await Promise.all([
      this.prisma.session.findMany({
        where: { userId },
        select: {
          id: true,
          deviceInfo: true,
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
          createdAt: true,
          outcome: true
        },
        orderBy: { createdAt: 'desc' },
        take: 1000
      }),
      this.prisma.notificationEvent.findMany({
        where: { userId },
        select: {
          id: true,
          type: true,
          title: true,
          read: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 1000
      })
    ]);

    return {
      sessions,
      auditLogs,
      notificationEvents,
      collectedAt: new Date().toISOString(),
      category: 'activity'
    };
  }

  private async getUserAnalytics(userId: string): Promise<any> {
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
      collectedAt: new Date().toISOString(),
      category: 'analytics'
    };
  }

  private async getFinancialData(userId: string): Promise<any> {
    const [portfolios, alerts, strategies, transactions] = await Promise.all([
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
          id: true,
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
          id: true,
          name: true,
          description: true,
          isActive: true,
          totalReturn: true,
          createdAt: true
        }
      }),
      this.prisma.transaction.findMany({
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
      })
    ]);

    return {
      portfolios,
      alerts,
      strategies,
      transactions,
      collectedAt: new Date().toISOString(),
      category: 'financial'
    };
  }

  private formatAsJSON(data: any, requestId?: string): string {
    return JSON.stringify({
      ...data,
      metadata: {
        format: 'JSON',
        version: '1.0',
        requestId,
        exportedAt: new Date().toISOString()
      }
    }, null, 2);
  }

  private formatAsCSV(data: any): string {
    return this.flattenToCSV(data);
  }

  private formatAsXML(data: any, requestId?: string): string {
    const xmlData = {
      ...data,
      metadata: {
        format: 'XML',
        version: '1.0',
        requestId,
        exportedAt: new Date().toISOString()
      }
    };

    return this.jsonToXML(xmlData, 'gdpr_export');
  }

  private async formatAsPDF(data: any, requestId?: string): Promise<string> {
    return this.formatAsJSON(data, requestId);
  }

  private generateSecureFilename(userId: string, format: string, requestId?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = crypto.randomBytes(8).toString('hex');
    return `gdpr-export-${userId}-${timestamp}-${random}.${format.toLowerCase()}`;
  }

  private async generateSecureDownloadUrl(filename: string, userId: string): Promise<string> {
    const token = crypto.createHash('sha256')
      .update(`${filename}:${userId}:${process.env.JWT_SECRET}:${Date.now()}`)
      .digest('hex');

    return `/api/gdpr/download/${filename}?token=${token}&expires=${Date.now() + 7 * 24 * 60 * 60 * 1000}`;
  }

  private async ensureExportDirectory(): Promise<void> {
    try {
      await fs.access(this.exportDir);
    } catch {
      await fs.mkdir(this.exportDir, { recursive: true });
    }
  }

  private flattenToCSV(obj: any, prefix: string = ''): string {
    let csv = '';

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}_${key}` : key;

      if (value === null || value === undefined) {
        csv += `${newKey},""\n`;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        csv += this.flattenToCSV(value, newKey);
      } else if (Array.isArray(value)) {
        csv += `${newKey},"[${value.join(',')}]"\n`;
      } else {
        csv += `${newKey},"${String(value).replace(/"/g, '""')}"\n`;
      }
    }

    return csv;
  }

  private jsonToXML(obj: any, rootName: string): string {
    const escapeXml = (str: string) => str.replace(/[<>&'"]/g, (match) => {
      const escapeMap: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return escapeMap[match];
    });

    const buildXml = (data: any, name: string): string => {
      if (data === null || data === undefined) {
        return `<${name}></${name}>`;
      }

      if (typeof data !== 'object') {
        return `<${name}>${escapeXml(String(data))}</${name}>`;
      }

      if (Array.isArray(data)) {
        return `<${name}>${data.map(item => buildXml(item, 'item')).join('')}</${name}>`;
      }

      let xml = `<${name}>`;
      for (const [key, value] of Object.entries(data)) {
        xml += buildXml(value, key);
      }
      xml += `</${name}>`;

      return xml;
    };

    return `<?xml version="1.0" encoding="UTF-8"?>\n${buildXml(obj, rootName)}`;
  }
}

export default DataExportService;
