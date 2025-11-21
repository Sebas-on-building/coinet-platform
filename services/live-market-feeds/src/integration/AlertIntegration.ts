/**
 * =========================================
 * ALERT INTEGRATION
 * =========================================
 * Integrates live market data feeds with the existing
 * Coinet signal/alert system for real-time alert evaluation
 */

import { EventEmitter } from 'events';
import { MarketDataFeedService } from '../services/MarketDataFeedService';
import { MarketData, ExchangeType } from '../types';
import { Logger } from '../utils/Logger';
import { PrismaClient } from '@prisma/client'; // Import PrismaClient only

// Temporarily define AlertOperator and PrismaAlertCondition as stubs to satisfy TypeScript
enum AlertOperator {
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  EQUAL = 'EQUAL',
  NOT_EQUAL = 'NOT_EQUAL',
  GREATER_THAN_OR_EQUAL = 'GREATER_THAN_OR_EQUAL',
  LESS_THAN_OR_EQUAL = 'LESS_THAN_OR_EQUAL',
}

enum PrismaAlertCondition {
  PRICE = 'PRICE',
  VOLUME = 'VOLUME',
  MARKET_CAP = 'MARKET_CAP',
  CHANGE_24H = 'CHANGE_24H',
  RSI = 'RSI',
  MACD = 'MACD',
}

export interface AlertCondition {
  id: string;
  symbol: string;
  exchange: ExchangeType;
  condition: string; // 'price_above', 'price_below', 'volume_spike', etc.
  threshold: number;
  timeframe: number; // seconds
  isActive: boolean;
  createdAt: Date;
}

export interface AlertEvaluation {
  alertId: string;
  symbol: string;
  exchange: ExchangeType;
  condition: string;
  threshold: number;
  currentValue: number;
  isTriggered: boolean;
  confidence: number;
  timestamp: Date;
  metadata: Record<string, any>;
}

export class AlertIntegration extends EventEmitter {
  private logger: Logger;
  private feedService: MarketDataFeedService;
  private prisma: PrismaClient;
  private activeConditions: Map<string, AlertCondition> = new Map();
  private priceHistory: Map<string, number[]> = new Map(); // symbol -> recent prices
  private volumeHistory: Map<string, number[]> = new Map(); // symbol -> recent volumes
  private isRunning: boolean = false;
  private evaluationTimer: NodeJS.Timeout | null = null;

  constructor(feedService: MarketDataFeedService, prisma: PrismaClient) {
    super();
    this.logger = new Logger('AlertIntegration');
    this.feedService = feedService;
    this.prisma = prisma;

    this.setupEventHandlers();
  }

  /**
   * Start alert integration
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.logger.info('🚨 Starting Alert Integration...');

    // Load active alert conditions from database
    await this.loadAlertConditions();

    // Start periodic evaluation
    this.evaluationTimer = setInterval(() => {
      this.evaluateAlertConditions();
    }, 1000); // Evaluate every second

    // Subscribe to market data
    this.feedService.on('processedData', (data: MarketData) => {
      this.handleMarketData(data);
    });

    this.isRunning = true;
    this.logger.info('✅ Alert Integration started');
  }

  /**
   * Stop alert integration
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('🚨 Stopping Alert Integration...');

    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = null;
    }

    this.isRunning = false;
    this.logger.info('✅ Alert Integration stopped');
  }

  /**
   * Create a new alert condition
   */
  async createAlertCondition(condition: Omit<AlertCondition, 'id' | 'createdAt'>): Promise<string> {
    try {
      const alertCondition = {
        ...condition,
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date()
      };

      this.activeConditions.set(alertCondition.id, alertCondition);
      this.logger.info(`✅ Created alert condition: ${alertCondition.id}`);

      // Persist to database
      await this.persistAlertCondition(alertCondition);

      this.emit('alertCreated', alertCondition);
      return alertCondition.id;

    } catch (error) {
      this.logger.error('Failed to create alert condition', error);
      throw error;
    }
  }

  /**
   * Remove an alert condition
   */
  async removeAlertCondition(alertId: string): Promise<void> {
    const condition = this.activeConditions.get(alertId);
    if (condition) {
      this.activeConditions.delete(alertId);
      this.logger.info(`🗑️ Removed alert condition: ${alertId}`);

      // Remove from database
      await this.prisma.alert.deleteMany({
        where: { id: alertId }
      });

      this.emit('alertRemoved', alertId);
    }
  }

  /**
   * Get all active alert conditions
   */
  getActiveConditions(): AlertCondition[] {
    return Array.from(this.activeConditions.values());
  }

  /**
   * Handle incoming market data
   */
  private handleMarketData(data: MarketData): void {
    // Update price and volume history
    this.updateHistory(data);

    // Check for immediate triggers (price alerts, etc.)
    this.checkImmediateTriggers(data);
  }

  /**
   * Update price and volume history for trend analysis
   */
  private updateHistory(data: MarketData): void {
    const key = `${data.exchange}:${data.symbol}`;

    // Update price history
    if (!this.priceHistory.has(key)) {
      this.priceHistory.set(key, []);
    }
    const priceHistory = this.priceHistory.get(key)!;

    if (data.type === 'trade') {
      priceHistory.push(data.price);
    } else if (data.type === 'quote') {
      // Use mid price for quotes
      priceHistory.push((data.bid + data.ask) / 2);
    }

    // Keep only last 1000 data points
    if (priceHistory.length > 1000) {
      priceHistory.shift();
    }

    // Update volume history for trades
    if (data.type === 'trade' && 'volume' in data) {
      if (!this.volumeHistory.has(key)) {
        this.volumeHistory.set(key, []);
      }
      const volumeHistory = this.volumeHistory.get(key)!;
      volumeHistory.push(data.volume);

      // Keep only last 1000 data points
      if (volumeHistory.length > 1000) {
        volumeHistory.shift();
      }
    }
  }

  /**
   * Check for immediate triggers (price alerts)
   */
  private checkImmediateTriggers(data: MarketData): void {
    const key = `${data.exchange}:${data.symbol}`;

    for (const [alertId, condition] of this.activeConditions.entries()) {
      if (condition.symbol !== data.symbol || condition.exchange !== data.exchange) {
        continue;
      }

      const evaluation = this.evaluateCondition(condition, data);
      if (evaluation.isTriggered) {
        this.handleAlertTrigger(evaluation);
      }
    }
  }

  /**
   * Evaluate a single alert condition
   */
  private evaluateCondition(condition: AlertCondition, data: MarketData): AlertEvaluation {
    const key = `${data.exchange}:${data.symbol}`;
    let currentValue: number;
    let isTriggered: boolean = false;
    let confidence: number = 0.8; // Default confidence

    switch (condition.condition) {
      case 'price_above':
        currentValue = data.type === 'trade' ? data.price : (data as any).ask || 0;
        isTriggered = currentValue > condition.threshold;
        break;

      case 'price_below':
        currentValue = data.type === 'trade' ? data.price : (data as any).bid || 0;
        isTriggered = currentValue < condition.threshold;
        break;

      case 'volume_spike':
        const volumeHistory = this.volumeHistory.get(key) || [];
        const avgVolume = volumeHistory.length > 0 ?
          volumeHistory.reduce((sum, v) => sum + v, 0) / volumeHistory.length : 0;
        currentValue = data.type === 'trade' ? data.volume : 0;
        isTriggered = currentValue > avgVolume * condition.threshold;
        confidence = Math.min(1.0, currentValue / (avgVolume * condition.threshold));
        break;

      case 'price_change_percent':
        const priceHistory = this.priceHistory.get(key) || [];
        if (priceHistory.length < 2) {
          currentValue = 0;
          isTriggered = false;
        } else {
          const currentPrice = data.type === 'trade' ? data.price : (data as any).ask || 0;
          const previousPrice = priceHistory[priceHistory.length - 2];
          if (previousPrice === undefined || previousPrice === 0) { // Check for undefined and zero
            currentValue = 0;
            isTriggered = false;
          } else {
            const percentChange = ((currentPrice - previousPrice) / previousPrice) * 100;
            currentValue = Math.abs(percentChange);
            isTriggered = currentValue > condition.threshold;
            confidence = Math.min(1.0, currentValue / condition.threshold);
          }
        }
        break;

      default:
        currentValue = 0;
        isTriggered = false;
        confidence = 0;
    }

    return {
      alertId: condition.id,
      symbol: condition.symbol,
      exchange: condition.exchange,
      condition: condition.condition,
      threshold: condition.threshold,
      currentValue,
      isTriggered,
      confidence,
      timestamp: new Date(),
      metadata: {
        dataType: data.type,
        rawData: data.raw
      }
    };
  }

  /**
   * Handle alert trigger
   */
  private async handleAlertTrigger(evaluation: AlertEvaluation): Promise<void> {
    this.logger.info(`🚨 Alert triggered: ${evaluation.alertId} - ${evaluation.condition} (${evaluation.currentValue})`);

    try {
      // Create alert trigger record in database
      await this.prisma.alertTrigger.create({
        data: {
          alertId: evaluation.alertId,
          tenantId: 'default', // Should be dynamic based on user
          userId: 'system', // Should be dynamic based on user
          triggerConditions: JSON.stringify({
            condition: evaluation.condition,
            threshold: evaluation.threshold,
            currentValue: evaluation.currentValue
          }),
          evaluationLogic: 'market_dat-integration',
          result: evaluation.isTriggered.toString(), // Convert boolean to string
          confidence: evaluation.confidence,
          signalData: JSON.stringify(evaluation.metadata),
          signalIds: [], // Could link to specific signals
          evaluationTime: Date.now() - evaluation.timestamp.getTime(),
          evaluatedAt: new Date(),
          metadata: {
            integration: 'live_market_feeds',
            triggerType: 'real_time'
          }
        }
      });

      // Emit alert event for further processing
      this.emit('alertTriggered', evaluation);

      // Could also trigger notifications, update user dashboard, etc.

    } catch (error: any) {
      this.logger.error('Failed to handle alert trigger', error);
    }
  }

  /**
   * Evaluate all alert conditions periodically
   */
  private evaluateAlertConditions(): void {
    for (const condition of this.activeConditions.values()) {
      if (!condition.isActive) continue;

      // This would typically query recent market data
      // For now, we'll rely on the real-time data handler
    }
  }

  /**
   * Load active alert conditions from database
   */
  private async loadAlertConditions(): Promise<void> {
    try {
      const alerts = await this.prisma.alert.findMany({
        where: {
          isActive: true
        },
        include: {
          user: true
        }
      });

      for (const alert of alerts) {
        // Convert alert to condition format
        const condition: AlertCondition = {
          id: alert.id,
          symbol: alert.symbol,
          exchange: 'binance' as ExchangeType, // Should be dynamic
          condition: this.mapAlertToCondition(alert.condition), // Use direct enum mapping
          threshold: alert.threshold.toNumber(), // Convert Decimal to number
          timeframe: 60, // Default timeframe
          isActive: alert.isActive,
          createdAt: alert.createdAt
        };

        this.activeConditions.set(condition.id, condition);
      }

      this.logger.info(`📋 Loaded ${this.activeConditions.size} active alert conditions`);

    } catch (error: any) {
      this.logger.error('Failed to load alert conditions', error);
    }
  }

  /**
   * Persist alert condition to database
   */
  private async persistAlertCondition(condition: AlertCondition): Promise<void> {
    try {
      // Check if alert already exists to prevent duplicates
      let existingAlert = await this.prisma.alert.findUnique({
        where: { id: condition.id },
      });

      if (existingAlert) {
        // Update existing alert
        await this.prisma.alert.update({
          where: { id: condition.id },
          data: {
            symbol: condition.symbol,
            condition: this.mapAlertConditionStringToPrismaEnum(condition.condition), // Use correct mapping
            operator: this.mapAlertConditionToAlertOperator(condition.condition), // Use enum
            threshold: condition.threshold, // Already a number
            isActive: condition.isActive,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new alert
        await this.prisma.alert.create({
          data: {
            id: condition.id,
            userId: 'system', // Default to system user, ideally linked to tenant user
            name: `${condition.symbol} ${condition.condition} ${condition.threshold}`,
            symbol: condition.symbol,
            condition: this.mapAlertConditionStringToPrismaEnum(condition.condition), // Use correct mapping
            operator: this.mapAlertConditionToAlertOperator(condition.condition), // Use enum
            threshold: condition.threshold, // Already a number
            currentValue: 0, // Initial value
            isActive: condition.isActive,
            triggered: false,
            notifyEmail: true,
            notifyPush: false,
            notifySMS: false,
            createdAt: condition.createdAt,
            updatedAt: new Date(),
          },
        });
      }
    } catch (error: any) {
      this.logger.error('Failed to persist alert condition', error);
      throw error;
    }
  }

  /**
   * Map alert condition enum to string
   */
  private mapAlertToCondition(condition: PrismaAlertCondition): string {
    switch (condition) {
      case PrismaAlertCondition.PRICE: return 'price_above'; // Or 'price_below' depending on context
      case PrismaAlertCondition.VOLUME: return 'volume_spike';
      case PrismaAlertCondition.MARKET_CAP: return 'market_cap';
      case PrismaAlertCondition.CHANGE_24H: return 'price_change_percent';
      case PrismaAlertCondition.RSI: return 'rsi';
      case PrismaAlertCondition.MACD: return 'macd';
      default: return 'price_above'; // Default fallback
    }
  }

  /**
   * Map condition string to Prisma AlertCondition enum
   */
  private mapAlertConditionStringToPrismaEnum(condition: string): PrismaAlertCondition {
    switch (condition) {
      case 'price_above': return PrismaAlertCondition.PRICE;
      case 'price_below': return PrismaAlertCondition.PRICE;
      case 'volume_spike': return PrismaAlertCondition.VOLUME;
      case 'price_change_percent': return PrismaAlertCondition.CHANGE_24H;
      default: return PrismaAlertCondition.PRICE;
    }
  }

  /**
   * Map condition string to alert operator enum
   */
  private mapAlertConditionToAlertOperator(condition: string): AlertOperator {
    switch (condition) {
      case 'price_above': return AlertOperator.GREATER_THAN;
      case 'price_below': return AlertOperator.LESS_THAN;
      case 'volume_spike': return AlertOperator.GREATER_THAN; // Assuming volume spike means > threshold
      case 'price_change_percent': return AlertOperator.GREATER_THAN; // Assuming % change > threshold
      default: return AlertOperator.GREATER_THAN; // Default fallback
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.feedService.on('ready', () => {
      this.logger.info('Market data feeds ready, starting alert evaluation');
    });

    this.feedService.on('error', (error) => {
      this.logger.error('Market data feeds error', error);
    });
  }

  /**
   * Get integration status
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      activeConditions: this.activeConditions.size,
      priceHistorySize: this.priceHistory.size,
      volumeHistorySize: this.volumeHistory.size,
      lastEvaluation: new Date()
    };
  }
}
