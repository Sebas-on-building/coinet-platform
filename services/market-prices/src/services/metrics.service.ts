/**
 * Metrics Service
 * Exposes metrics for monitoring rate limits, quotas, and service health
 */

import { DataSource } from '../types';
import { getRateLimiter } from '../middleware/rateLimiter';
import { getQuotaMonitor } from './quota-monitor.service';
import { MarketDataAggregator } from '../aggregator';
import { logger } from '../utils/logger';

export interface MetricsSnapshot {
  timestamp: Date;
  service: {
    uptime: number; // seconds
    version: string;
    environment: string;
  };
  providers: {
    [key: string]: {
      rateLimit: {
        running: number;
        queued: number;
        executing: number;
        isThrottled: boolean;
        maxRequestsPerMinute: number;
      };
      quota: {
        current: {
          quotaUsed?: number;
          quotaLimit?: number;
          quotaRemaining?: number;
          usagePercentage?: string;
          resetTime?: Date;
        } | null;
        daily: {
          requestsMade: number;
          budget?: number;
          budgetRemaining?: number;
          usagePercentage?: string;
        };
        monthly: {
          requestsMade: number;
          budget?: number;
          budgetRemaining?: number;
          usagePercentage?: string;
        };
      };
    };
  };
  health?: any;
}

export class MetricsService {
  private startTime: Date;
  private aggregator?: MarketDataAggregator;

  constructor(aggregator?: MarketDataAggregator) {
    this.startTime = new Date();
    this.aggregator = aggregator;
  }

  /**
   * Set aggregator reference for health checks
   */
  setAggregator(aggregator: MarketDataAggregator): void {
    this.aggregator = aggregator;
  }

  /**
   * Get comprehensive metrics snapshot
   */
  async getMetrics(): Promise<MetricsSnapshot> {
    const rateLimiter = getRateLimiter();
    const quotaMonitor = getQuotaMonitor();

    const rateLimiterStats = rateLimiter.getStats();
    const quotaStats = quotaMonitor.getAllUsageStats();

    const providers: MetricsSnapshot['providers'] = {};

    // Combine rate limit and quota stats for each provider
    for (const source of Object.values(DataSource)) {
      providers[source] = {
        rateLimit: {
          running: rateLimiterStats[source]?.counts?.running || 0,
          queued: rateLimiterStats[source]?.counts?.queued || 0,
          executing: rateLimiterStats[source]?.counts?.executing || 0,
          isThrottled: rateLimiterStats[source]?.isThrottled || false,
          maxRequestsPerMinute: rateLimiterStats[source]?.config?.maxRequestsPerMinute || 0,
        },
        quota: {
          current: quotaStats[source]?.current || null,
          daily: quotaStats[source]?.daily || { requestsMade: 0 },
          monthly: quotaStats[source]?.monthly || { requestsMade: 0 },
        },
      };
    }

    // Get health status if aggregator is available
    let health;
    if (this.aggregator) {
      try {
        health = await this.aggregator.getHealthStatus();
      } catch (error) {
        logger.error('Failed to get health status for metrics', { error });
      }
    }

    return {
      timestamp: new Date(),
      service: {
        uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      providers,
      health,
    };
  }

  /**
   * Get rate limiter metrics only (lightweight)
   */
  getRateLimitMetrics(): any {
    const rateLimiter = getRateLimiter();
    return rateLimiter.getStats();
  }

  /**
   * Get quota metrics only
   */
  getQuotaMetrics(): any {
    const quotaMonitor = getQuotaMonitor();
    return quotaMonitor.getAllUsageStats();
  }

  /**
   * Get Prometheus-compatible metrics format
   */
  async getPrometheusMetrics(): Promise<string> {
    const metrics = await this.getMetrics();
    const lines: string[] = [];

    // Service uptime
    lines.push('# HELP coinet_service_uptime_seconds Service uptime in seconds');
    lines.push('# TYPE coinet_service_uptime_seconds gauge');
    lines.push(`coinet_service_uptime_seconds ${metrics.service.uptime}`);
    lines.push('');

    // Provider rate limit metrics
    lines.push('# HELP coinet_rate_limit_running Running requests');
    lines.push('# TYPE coinet_rate_limit_running gauge');
    for (const [source, data] of Object.entries(metrics.providers)) {
      lines.push(`coinet_rate_limit_running{provider="${source}"} ${data.rateLimit.running}`);
    }
    lines.push('');

    lines.push('# HELP coinet_rate_limit_queued Queued requests');
    lines.push('# TYPE coinet_rate_limit_queued gauge');
    for (const [source, data] of Object.entries(metrics.providers)) {
      lines.push(`coinet_rate_limit_queued{provider="${source}"} ${data.rateLimit.queued}`);
    }
    lines.push('');

    lines.push('# HELP coinet_rate_limit_throttled Whether provider is throttled (0=no, 1=yes)');
    lines.push('# TYPE coinet_rate_limit_throttled gauge');
    for (const [source, data] of Object.entries(metrics.providers)) {
      lines.push(`coinet_rate_limit_throttled{provider="${source}"} ${data.rateLimit.isThrottled ? 1 : 0}`);
    }
    lines.push('');

    // Provider quota metrics
    lines.push('# HELP coinet_quota_used Current quota used');
    lines.push('# TYPE coinet_quota_used gauge');
    for (const [source, data] of Object.entries(metrics.providers)) {
      if (data.quota.current?.quotaUsed !== undefined) {
        lines.push(`coinet_quota_used{provider="${source}"} ${data.quota.current.quotaUsed}`);
      }
    }
    lines.push('');

    lines.push('# HELP coinet_quota_remaining Current quota remaining');
    lines.push('# TYPE coinet_quota_remaining gauge');
    for (const [source, data] of Object.entries(metrics.providers)) {
      if (data.quota.current?.quotaRemaining !== undefined) {
        lines.push(`coinet_quota_remaining{provider="${source}"} ${data.quota.current.quotaRemaining}`);
      }
    }
    lines.push('');

    lines.push('# HELP coinet_daily_requests Daily requests made');
    lines.push('# TYPE coinet_daily_requests counter');
    for (const [source, data] of Object.entries(metrics.providers)) {
      lines.push(`coinet_daily_requests{provider="${source}"} ${data.quota.daily.requestsMade}`);
    }
    lines.push('');

    lines.push('# HELP coinet_monthly_requests Monthly requests made');
    lines.push('# TYPE coinet_monthly_requests counter');
    for (const [source, data] of Object.entries(metrics.providers)) {
      lines.push(`coinet_monthly_requests{provider="${source}"} ${data.quota.monthly.requestsMade}`);
    }
    lines.push('');

    // Health metrics
    if (metrics.health) {
      lines.push('# HELP coinet_provider_healthy Provider health status (0=unhealthy, 1=healthy)');
      lines.push('# TYPE coinet_provider_healthy gauge');
      if (metrics.health.providers?.coingecko?.rest !== undefined) {
        lines.push(`coinet_provider_healthy{provider="coingecko",type="rest"} ${metrics.health.providers.coingecko.rest ? 1 : 0}`);
      }
      if (metrics.health.providers?.coingecko?.websocket !== undefined) {
        lines.push(`coinet_provider_healthy{provider="coingecko",type="websocket"} ${metrics.health.providers.coingecko.websocket ? 1 : 0}`);
      }
      if (metrics.health.providers?.coinmarketcap?.rest !== undefined) {
        lines.push(`coinet_provider_healthy{provider="coinmarketcap",type="rest"} ${metrics.health.providers.coinmarketcap.rest ? 1 : 0}`);
      }
      lines.push('');

      lines.push('# HELP coinet_database_connected Database connection status (0=disconnected, 1=connected)');
      lines.push('# TYPE coinet_database_connected gauge');
      lines.push(`coinet_database_connected ${metrics.health.database?.connected ? 1 : 0}`);
      lines.push('');

      lines.push('# HELP coinet_cache_connected Cache connection status (0=disconnected, 1=connected)');
      lines.push('# TYPE coinet_cache_connected gauge');
      lines.push(`coinet_cache_connected ${metrics.health.cache?.connected ? 1 : 0}`);
      lines.push('');

      if (metrics.health.cache?.hitRate !== undefined) {
        lines.push('# HELP coinet_cache_hit_rate Cache hit rate (0-1)');
        lines.push('# TYPE coinet_cache_hit_rate gauge');
        lines.push(`coinet_cache_hit_rate ${metrics.health.cache.hitRate}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Get summary stats for dashboard
   */
  async getSummary(): Promise<any> {
    const metrics = await this.getMetrics();

    return {
      timestamp: metrics.timestamp,
      uptime: metrics.service.uptime,
      environment: metrics.service.environment,
      providers: Object.entries(metrics.providers).map(([source, data]) => ({
        name: source,
        status: metrics.health?.providers?.[source]?.rest ? 'healthy' : 'degraded',
        rateLimit: {
          active: data.rateLimit.running + data.rateLimit.executing,
          queued: data.rateLimit.queued,
          throttled: data.rateLimit.isThrottled,
        },
        quota: {
          currentUsage: data.quota.current?.usagePercentage || 'N/A',
          dailyUsage: data.quota.daily.usagePercentage || 'N/A',
          monthlyUsage: data.quota.monthly.usagePercentage || 'N/A',
        },
      })),
      health: {
        overall: metrics.health?.healthy || false,
        database: metrics.health?.database?.connected || false,
        cache: metrics.health?.cache?.connected || false,
      },
    };
  }
}

// Singleton instance
let metricsServiceInstance: MetricsService | null = null;

export function getMetricsService(aggregator?: MarketDataAggregator): MetricsService {
  if (!metricsServiceInstance) {
    metricsServiceInstance = new MetricsService(aggregator);
  } else if (aggregator) {
    metricsServiceInstance.setAggregator(aggregator);
  }
  return metricsServiceInstance;
}

export function resetMetricsService(): void {
  metricsServiceInstance = null;
}

export default getMetricsService;

