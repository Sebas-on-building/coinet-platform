/**
 * API Quota Monitor Service
 * Tracks API usage, rate limits, and quota consumption for all providers
 */

import EventEmitter from 'eventemitter3';
import { DataSource } from '../types';
import { logger } from '../utils/logger';
import { getAlertIntegrations, AlertIntegrationConfig } from './alert-integrations.service';

export interface QuotaUsage {
  source: DataSource;
  timestamp: Date;
  requestsMade: number;
  requestsRemaining?: number;
  quotaLimit?: number;
  quotaUsed?: number;
  quotaRemaining?: number;
  resetTime?: Date;
  creditsUsed?: number;
  creditsRemaining?: number;
}

export interface QuotaAlert {
  source: DataSource;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  usage: QuotaUsage;
}

export interface QuotaThresholds {
  warningPercentage: number; // Alert when usage exceeds this % of quota
  criticalPercentage: number; // Critical alert threshold
  dailyBudget?: number; // Optional daily request budget
  monthlyBudget?: number; // Optional monthly request budget
}

export class QuotaMonitorService extends EventEmitter {
  private usageHistory: Map<DataSource, QuotaUsage[]>;
  private currentUsage: Map<DataSource, QuotaUsage>;
  private thresholds: Map<DataSource, QuotaThresholds>;
  private dailyUsage: Map<DataSource, number>;
  private monthlyUsage: Map<DataSource, number>;
  private lastResetDate: Date;
  private alertIntegrations?: ReturnType<typeof getAlertIntegrations>;

  constructor(alertConfig?: AlertIntegrationConfig) {
    super();
    this.usageHistory = new Map();
    this.currentUsage = new Map();
    this.thresholds = new Map();
    this.dailyUsage = new Map();
    this.monthlyUsage = new Map();
    this.lastResetDate = new Date();

    // Initialize alert integrations if configured
    if (alertConfig) {
      try {
        this.alertIntegrations = getAlertIntegrations(alertConfig);
      } catch (error) {
        logger.warn('Failed to initialize alert integrations', { error });
      }
    }

    // Set default thresholds
    this.setDefaultThresholds();

    // Start daily reset timer
    this.startDailyResetTimer();
  }

  /**
   * Set default quota thresholds for all providers
   */
  private setDefaultThresholds(): void {
    // CoinGecko thresholds
    this.thresholds.set(DataSource.COINGECKO, {
      warningPercentage: 75,
      criticalPercentage: 90,
      dailyBudget: 40000, // Conservative for paid tiers
    });

    // CoinMarketCap thresholds
    this.thresholds.set(DataSource.COINMARKETCAP, {
      warningPercentage: 75,
      criticalPercentage: 90,
      dailyBudget: 10000, // Conservative for paid tiers
      monthlyBudget: 300000, // Typical monthly limit
    });

    // DeFiLlama (generally more permissive)
    this.thresholds.set(DataSource.DEFILLAMA, {
      warningPercentage: 80,
      criticalPercentage: 95,
    });
  }

  /**
   * Update thresholds for a specific provider
   */
  setThresholds(source: DataSource, thresholds: QuotaThresholds): void {
    this.thresholds.set(source, thresholds);
    logger.info(`Updated quota thresholds for ${source}`, { thresholds });
  }

  /**
   * Record API usage from response headers
   */
  recordUsage(source: DataSource, headers?: any): void {
    const now = new Date();
    const usage: QuotaUsage = {
      source,
      timestamp: now,
      requestsMade: 1,
    };

    // Extract quota information from headers (provider-specific)
    if (headers) {
      // CoinGecko headers
      if (source === DataSource.COINGECKO) {
        usage.requestsRemaining = this.parseHeaderInt(headers['x-ratelimit-remaining']);
        usage.quotaLimit = this.parseHeaderInt(headers['x-ratelimit-limit']);
        usage.resetTime = this.parseHeaderDate(headers['x-ratelimit-reset']);
        usage.creditsUsed = this.parseHeaderInt(headers['x-cg-credits-used']);
        usage.creditsRemaining = this.parseHeaderInt(headers['x-cg-credits-remaining']);
      }

      // CoinMarketCap headers
      if (source === DataSource.COINMARKETCAP) {
        usage.creditsUsed = this.parseHeaderInt(headers['x-cmc-credits-used']);
        usage.creditsRemaining = this.parseHeaderInt(headers['x-cmc-credits-remaining']);
        usage.resetTime = this.parseHeaderDate(headers['x-cmc-credits-reset']);
      }
    }

    // Calculate derived metrics
    if (usage.creditsUsed !== undefined && usage.creditsRemaining !== undefined) {
      usage.quotaLimit = usage.creditsUsed + usage.creditsRemaining;
      usage.quotaUsed = usage.creditsUsed;
      usage.quotaRemaining = usage.creditsRemaining;
    }

    // Update current usage
    this.currentUsage.set(source, usage);

    // Update daily/monthly counters
    this.updateUsageCounters(source);

    // Add to history (keep last 1000 entries per source)
    const history = this.usageHistory.get(source) || [];
    history.push(usage);
    if (history.length > 1000) {
      history.shift();
    }
    this.usageHistory.set(source, history);

    // Check thresholds and emit alerts
    this.checkThresholds(source, usage);

    // Emit usage event
    this.emit('usage', usage);
  }

  /**
   * Update daily and monthly usage counters
   */
  private updateUsageCounters(source: DataSource): void {
    this.dailyUsage.set(source, (this.dailyUsage.get(source) || 0) + 1);
    this.monthlyUsage.set(source, (this.monthlyUsage.get(source) || 0) + 1);
  }

  /**
   * Check if usage exceeds thresholds and emit alerts
   */
  private checkThresholds(source: DataSource, usage: QuotaUsage): void {
    const thresholds = this.thresholds.get(source);
    if (!thresholds) return;

    const alerts: QuotaAlert[] = [];

    // Check quota percentage
    if (usage.quotaLimit && usage.quotaUsed !== undefined) {
      const usagePercentage = (usage.quotaUsed / usage.quotaLimit) * 100;

      if (usagePercentage >= thresholds.criticalPercentage) {
        alerts.push({
          source,
          severity: 'critical',
          message: `API quota ${usagePercentage.toFixed(1)}% used (${usage.quotaUsed}/${usage.quotaLimit})`,
          timestamp: new Date(),
          usage,
        });
      } else if (usagePercentage >= thresholds.warningPercentage) {
        alerts.push({
          source,
          severity: 'warning',
          message: `API quota ${usagePercentage.toFixed(1)}% used (${usage.quotaUsed}/${usage.quotaLimit})`,
          timestamp: new Date(),
          usage,
        });
      }
    }

    // Check daily budget
    if (thresholds.dailyBudget) {
      const daily = this.dailyUsage.get(source) || 0;
      const dailyPercentage = (daily / thresholds.dailyBudget) * 100;

      if (dailyPercentage >= thresholds.criticalPercentage) {
        alerts.push({
          source,
          severity: 'critical',
          message: `Daily budget ${dailyPercentage.toFixed(1)}% used (${daily}/${thresholds.dailyBudget})`,
          timestamp: new Date(),
          usage,
        });
      } else if (dailyPercentage >= thresholds.warningPercentage) {
        alerts.push({
          source,
          severity: 'warning',
          message: `Daily budget ${dailyPercentage.toFixed(1)}% used (${daily}/${thresholds.dailyBudget})`,
          timestamp: new Date(),
          usage,
        });
      }
    }

    // Check monthly budget
    if (thresholds.monthlyBudget) {
      const monthly = this.monthlyUsage.get(source) || 0;
      const monthlyPercentage = (monthly / thresholds.monthlyBudget) * 100;

      if (monthlyPercentage >= thresholds.criticalPercentage) {
        alerts.push({
          source,
          severity: 'critical',
          message: `Monthly budget ${monthlyPercentage.toFixed(1)}% used (${monthly}/${thresholds.monthlyBudget})`,
          timestamp: new Date(),
          usage,
        });
      } else if (monthlyPercentage >= thresholds.warningPercentage) {
        alerts.push({
          source,
          severity: 'warning',
          message: `Monthly budget ${monthlyPercentage.toFixed(1)}% used (${monthly}/${thresholds.monthlyBudget})`,
          timestamp: new Date(),
          usage,
        });
      }
    }

    // Emit alerts and send to integrations
    alerts.forEach(async (alert) => {
      logger.warn(`Quota alert: ${alert.message}`, { source, severity: alert.severity });
      this.emit('alert', alert);
      
      // Send to external integrations (Slack, PagerDuty, etc.)
      if (this.alertIntegrations) {
        try {
          await this.alertIntegrations.sendAlert(alert);
        } catch (error) {
          logger.error('Failed to send alert to integrations', { error, alert });
        }
      }
    });
  }

  /**
   * Parse integer from header value
   */
  private parseHeaderInt(value: any): number | undefined {
    if (value === undefined || value === null) return undefined;
    const num = parseInt(String(value), 10);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Parse date from header value (Unix timestamp)
   */
  private parseHeaderDate(value: any): Date | undefined {
    if (value === undefined || value === null) return undefined;
    const timestamp = parseInt(String(value), 10);
    return isNaN(timestamp) ? undefined : new Date(timestamp * 1000);
  }

  /**
   * Get current usage for a provider
   */
  getCurrentUsage(source: DataSource): QuotaUsage | undefined {
    return this.currentUsage.get(source);
  }

  /**
   * Get usage history for a provider
   */
  getUsageHistory(source: DataSource, limit?: number): QuotaUsage[] {
    const history = this.usageHistory.get(source) || [];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get daily usage for a provider
   */
  getDailyUsage(source: DataSource): number {
    return this.dailyUsage.get(source) || 0;
  }

  /**
   * Get monthly usage for a provider
   */
  getMonthlyUsage(source: DataSource): number {
    return this.monthlyUsage.get(source) || 0;
  }

  /**
   * Get all usage statistics
   */
  getAllUsageStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const source of Object.values(DataSource)) {
      const current = this.currentUsage.get(source);
      const thresholds = this.thresholds.get(source);
      const daily = this.dailyUsage.get(source) || 0;
      const monthly = this.monthlyUsage.get(source) || 0;

      stats[source] = {
        current: current ? {
          quotaUsed: current.quotaUsed,
          quotaLimit: current.quotaLimit,
          quotaRemaining: current.quotaRemaining,
          creditsUsed: current.creditsUsed,
          creditsRemaining: current.creditsRemaining,
          resetTime: current.resetTime,
          usagePercentage: current.quotaLimit && current.quotaUsed
            ? ((current.quotaUsed / current.quotaLimit) * 100).toFixed(2)
            : null,
        } : null,
        daily: {
          requestsMade: daily,
          budget: thresholds?.dailyBudget,
          budgetRemaining: thresholds?.dailyBudget ? thresholds.dailyBudget - daily : null,
          usagePercentage: thresholds?.dailyBudget
            ? ((daily / thresholds.dailyBudget) * 100).toFixed(2)
            : null,
        },
        monthly: {
          requestsMade: monthly,
          budget: thresholds?.monthlyBudget,
          budgetRemaining: thresholds?.monthlyBudget ? thresholds.monthlyBudget - monthly : null,
          usagePercentage: thresholds?.monthlyBudget
            ? ((monthly / thresholds.monthlyBudget) * 100).toFixed(2)
            : null,
        },
        thresholds,
        historyCount: this.usageHistory.get(source)?.length || 0,
      };
    }

    return stats;
  }

  /**
   * Reset daily usage counters
   */
  private resetDailyUsage(): void {
    logger.info('Resetting daily usage counters');
    this.dailyUsage.clear();
    this.lastResetDate = new Date();
    this.emit('daily_reset', { timestamp: this.lastResetDate });
  }

  /**
   * Reset monthly usage counters
   */
  resetMonthlyUsage(): void {
    logger.info('Resetting monthly usage counters');
    this.monthlyUsage.clear();
    this.emit('monthly_reset', { timestamp: new Date() });
  }

  /**
   * Start timer for daily usage reset (at midnight)
   */
  private startDailyResetTimer(): void {
    // Calculate time until next midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();

    // Schedule first reset
    setTimeout(() => {
      this.resetDailyUsage();
      // Then reset every 24 hours
      setInterval(() => this.resetDailyUsage(), 24 * 60 * 60 * 1000);
    }, timeUntilMidnight);

    logger.info('Daily usage reset timer started', {
      nextReset: tomorrow.toISOString(),
    });
  }

  /**
   * Clear all usage data
   */
  clear(): void {
    this.usageHistory.clear();
    this.currentUsage.clear();
    this.dailyUsage.clear();
    this.monthlyUsage.clear();
    logger.info('Quota monitor data cleared');
  }
}

// Singleton instance
let quotaMonitorInstance: QuotaMonitorService | null = null;

export function getQuotaMonitor(alertConfig?: AlertIntegrationConfig): QuotaMonitorService {
  if (!quotaMonitorInstance) {
    quotaMonitorInstance = new QuotaMonitorService(alertConfig);
  }
  return quotaMonitorInstance;
}

export function resetQuotaMonitor(): void {
  if (quotaMonitorInstance) {
    quotaMonitorInstance.clear();
    quotaMonitorInstance.removeAllListeners();
    quotaMonitorInstance = null;
  }
}

export default getQuotaMonitor;

