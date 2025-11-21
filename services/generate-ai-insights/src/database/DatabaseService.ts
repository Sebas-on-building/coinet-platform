/**
 * =========================================
 * DATABASE SERVICE
 * =========================================
 * Divine world-class database service for AI insights data management
 */

import { Logger } from '../utils/Logger';
import { PrismaClient } from '@prisma/client';
import {
  AlertPerformance,
  SignalCorrelation,
  UserFeedback
} from '../types';

export interface DatabaseConfig {
  url?: string;
  connectionLimit?: number;
  timeout?: number;
}

/**
 * Database service for AI insights
 */
export class DatabaseService {
  private logger: Logger;
  private prisma: PrismaClient;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig = {}) {
    this.logger = new Logger('DatabaseService');
    this.config = {
      url: process.env.DATABASE_URL,
      connectionLimit: 10,
      timeout: 30000,
      ...config
    };

    this.prisma = new PrismaClient({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: this.config.url
        }
      }
    });
  }

  /**
   * Get alert performance data
   */
  async getAlertPerformance(params: {
    userId?: string;
    alertIds?: string[];
    signalTypes?: string[];
    startDate?: Date;
    endDate?: Date;
  }): Promise<AlertPerformance[]> {
    try {
      this.logger.debug('Fetching alert performance data', params);

      const where: any = {
        tenantId: 'default'
      };

      if (params.userId) {
        where.userId = params.userId;
      }

      if (params.alertIds && params.alertIds.length > 0) {
        where.alertId = { in: params.alertIds };
      }

      if (params.signalTypes && params.signalTypes.length > 0) {
        where.alert = {
          condition: { in: params.signalTypes }
        };
      }

      if (params.startDate || params.endDate) {
        where.recordedAt = {};
        if (params.startDate) {
          where.recordedAt.gte = params.startDate;
        }
        if (params.endDate) {
          where.recordedAt.lte = params.endDate;
        }
      }

      const records = await (this.prisma as any).alertPerformance.findMany({
        where,
        include: {
          alert: true,
          user: true
        },
        orderBy: {
          recordedAt: 'desc'
        },
        take: 1000 // Limit for performance
      });

      // Transform to expected format
      const performance: AlertPerformance[] = records.map((record: any) => ({
        alertId: record.alertId,
        userId: record.userId,
        timestamp: record.recordedAt,
        signalType: record.alert?.condition || 'unknown',
        symbol: record.alert?.symbol || 'unknown',
        exchange: 'unknown', // Would need to be derived from alert data
        triggerValue: 0, // Would need calculation
        actualOutcome: {
          price: record.entryPrice?.toNumber(),
          volume: undefined,
          timestamp: record.marketTime,
          success: record.outcome === 'SUCCESS'
        },
        accuracy: record.signalAccuracy || 0,
        latency: record.signalLatency || 0,
        confidence: 0.5, // Default confidence since not in current schema
        roi: record.profitLoss?.toNumber(),
        metadata: {
          kpiValue: record.kpiValue,
          kpiType: record.kpiType,
          duration: record.duration,
          exitPrice: record.exitPrice?.toNumber(),
          portfolioValue: record.portfolioValue?.toNumber(),
          riskTolerance: record.riskTolerance,
          notes: record.notes,
          algorithmVersion: record.algorithmVersion
        }
      }));

      this.logger.debug('Alert performance data fetched', { count: performance.length });
      return performance;

    } catch (error: any) {
      this.logger.error('Failed to fetch alert performance data', { error: error.message });
      return [];
    }
  }

  /**
   * Get signal correlations
   */
  async getSignalCorrelations(params: {
    signalTypes?: string[];
    startDate?: Date;
    endDate?: Date;
  }): Promise<SignalCorrelation[]> {
    try {
      this.logger.debug('Fetching signal correlations', params);

      const where: any = {
        tenantId: 'default'
      };

      if (params.signalTypes && params.signalTypes.length > 0) {
        where.OR = [
          { primarySignal: { signalType: { in: params.signalTypes } } },
          { secondarySignal: { signalType: { in: params.signalTypes } } }
        ];
      }

      if (params.startDate || params.endDate) {
        where.calculatedAt = {};
        if (params.startDate) {
          where.calculatedAt.gte = params.startDate;
        }
        if (params.endDate) {
          where.calculatedAt.lte = params.endDate;
        }
      }

      const records = await (this.prisma as any).signalCorrelation.findMany({
        where,
        include: {
          primarySignal: true,
          secondarySignal: true
        },
        orderBy: {
          calculatedAt: 'desc'
        },
        take: 500
      });

      // Transform to expected format
      const correlations: SignalCorrelation[] = records.map((record: any) => ({
        signalA: record.primarySignal.signalType,
        signalB: record.secondarySignal.signalType,
        correlation: record.strength,
        timeframe: record.timeWindow,
        sampleSize: record.sampleSize,
        significance: record.confidence,
        trend: record.strength > 0 ? 'positive' : record.strength < 0 ? 'negative' : 'neutral',
        strength: this.mapCorrelationStrength(Math.abs(record.strength)),
        lastUpdated: record.calculatedAt,
        metadata: {
          correlationType: record.correlationType,
          lag: record.lag,
          method: record.method,
          validUntil: record.validUntil
        }
      }));

      this.logger.debug('Signal correlations fetched', { count: correlations.length });
      return correlations;

    } catch (error: any) {
      this.logger.error('Failed to fetch signal correlations', { error: error.message });
      return [];
    }
  }

  /**
   * Get user feedback data
   */
  async getUserFeedback(params: {
    userId?: string;
    alertIds?: string[];
    startDate?: Date;
    endDate?: Date;
  }): Promise<UserFeedback[]> {
    try {
      this.logger.debug('Fetching user feedback', params);

      const where: any = {
        tenantId: 'default'
      };

      if (params.userId) {
        where.userId = params.userId;
      }

      if (params.alertIds && params.alertIds.length > 0) {
        where.alertId = { in: params.alertIds };
      }

      if (params.startDate || params.endDate) {
        where.feedbackTime = {};
        if (params.startDate) {
          where.feedbackTime.gte = params.startDate;
        }
        if (params.endDate) {
          where.feedbackTime.lte = params.endDate;
        }
      }

      const records = await (this.prisma as any).userFeedback.findMany({
        where,
        include: {
          alert: true,
          user: true
        },
        orderBy: {
          feedbackTime: 'desc'
        },
        take: 1000
      });

      // Transform to expected format
      const feedback: UserFeedback[] = records.map((record: any) => ({
        userId: record.userId,
        alertId: record.alertId,
        timestamp: record.feedbackTime,
        rating: record.satisfactionScore,
        comment: record.comment || undefined,
        categories: [record.category],
        sentiment: this.mapSentiment(record.satisfactionScore),
        helpfulness: 3, // Default value since not in schema
        actionTaken: undefined, // Would need to be derived
        metadata: {
          alertTime: record.alertTime,
          portfolioValue: record.portfolioValue?.toNumber(),
          riskTolerance: record.riskTolerance,
          tradingFrequency: record.tradingFrequency,
          algorithmVersion: record.algorithmVersion,
          modelConfidence: record.modelConfidence,
          isAnonymous: record.isAnonymous,
          gdprConsent: record.gdprConsent
        }
      }));

      this.logger.debug('User feedback fetched', { count: feedback.length });
      return feedback;

    } catch (error: any) {
      this.logger.error('Failed to fetch user feedback', { error: error.message });
      return [];
    }
  }

  /**
   * Store AI insight in database
   */
  async storeAIInsight(params: {
    userId: string;
    type: string;
    title: string;
    description: string;
    confidence: number;
    priority: string;
    impact: string;
    effort: string;
    insightData: any;
    explanation: any;
    metadata?: any;
  }): Promise<void> {
    try {
      await (this.prisma as any).aIInsight.create({
        data: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          description: params.description,
          confidence: params.confidence,
          priority: params.priority,
          impact: params.impact,
          effort: params.effort,
          insightData: params.insightData,
          explanation: params.explanation,
          metadata: params.metadata || {},
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      });

      this.logger.debug('AI insight stored', { userId: params.userId, title: params.title });

    } catch (error: any) {
      this.logger.error('Failed to store AI insight', { error: error.message, userId: params.userId });
      throw error;
    }
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      // Simple query to test connection
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'healthy',
        details: {
          connection: 'ok',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Database health check failed', { error: error instanceof Error ? error.message : String(error) });

      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.prisma.$disconnect();
    this.logger.info('Database connections closed');
  }

  /**
   * Map correlation strength to string
   */
  private mapCorrelationStrength(strength: number): 'weak' | 'moderate' | 'strong' | 'very_strong' {
    if (strength >= 0.8) return 'very_strong';
    if (strength >= 0.6) return 'strong';
    if (strength >= 0.4) return 'moderate';
    return 'weak';
  }

  /**
   * Map satisfaction score to sentiment
   */
  private mapSentiment(score: number): 'positive' | 'negative' | 'neutral' {
    if (score >= 4) return 'positive';
    if (score <= 2) return 'negative';
    return 'neutral';
  }
}

export default DatabaseService;
