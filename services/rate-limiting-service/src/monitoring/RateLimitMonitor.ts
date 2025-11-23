/**
 * =========================================
 * RATE LIMIT MONITORING
 * =========================================
 * Comprehensive monitoring and analytics for rate limiting
 */

import { RateLimitingService } from '../RateLimitingService';
import { LoadMetrics, TrafficPattern, UserBehavior } from '../types';
import { Logger } from '../utils/Logger';

export interface RateLimitMetrics {
  timestamp: number;
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  algorithms: Record<string, {
    used: number;
    blocked: number;
  }>;
  endpoints: Record<string, {
    requests: number;
    blocked: number;
    averageLatency: number;
  }>;
  users: Record<string, {
    requests: number;
    blocked: number;
    pattern: string;
  }>;
}

export interface RateLimitAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalRequests: number;
    totalBlocked: number;
    blockRate: number;
    averageResponseTime: number;
    peakRequestsPerSecond: number;
  };
  algorithms: Record<string, {
    usage: number;
    effectiveness: number;
    averageLatency: number;
  }>;
  endpoints: Record<string, {
    requests: number;
    blocked: number;
    blockRate: number;
    topUsers: string[];
  }>;
  patterns: {
    traffic: TrafficPattern[];
    suspiciousUsers: UserBehavior[];
    loadSpikes: Array<{
      timestamp: number;
      requests: number;
      increase: number;
    }>;
  };
}

export class RateLimitMonitor {
  private service: RateLimitingService;
  private logger: Logger;
  private metrics: RateLimitMetrics[] = [];
  private analytics: RateLimitAnalytics | null = null;

  // Monitoring state
  private monitoringTimer?: NodeJS.Timeout;
  private lastCollection: number = 0;
  private requestCounts: Map<string, number> = new Map();
  private blockedCounts: Map<string, number> = new Map();

  constructor(service: RateLimitingService) {
    this.service = service;
    this.logger = new Logger('RateLimitMonitor');
  }

  /**
   * Start monitoring collection
   */
  startMonitoring(interval: number = 60000): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }

    this.monitoringTimer = setInterval(() => {
      this.collectMetrics();
    }, interval);

    this.logger.info('Rate limit monitoring started', { interval });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }

    this.logger.info('Rate limit monitoring stopped');
  }

  /**
   * Collect current metrics
   */
  async collectMetrics(): Promise<void> {
    try {
      const now = Date.now();
      const stats = await this.service.getStatistics();

      // Collect request/block counts since last collection
      const totalRequests = this.requestCounts.get('total') || 0;
      const totalBlocked = this.blockedCounts.get('total') || 0;

      const metrics: RateLimitMetrics = {
        timestamp: now,
        totalRequests,
        allowedRequests: totalRequests - totalBlocked,
        blockedRequests: totalBlocked,
        algorithms: {},
        endpoints: {},
        users: {},
      };

      // Process algorithm stats
      Object.entries(stats.algorithms).forEach(([name, info]: [string, any]) => {
        metrics.algorithms[name] = {
          used: 0, // Would be populated from actual usage
          blocked: 0,
        };
      });

      // Process endpoint stats
      Object.entries(stats.patterns.traffic).forEach(([key, pattern]: [string, any]) => {
        metrics.endpoints[key] = {
          requests: pattern.requests,
          blocked: 0, // Would be calculated
          averageLatency: 0,
        };
      });

      // Process user stats
      Object.entries(stats.patterns.users).forEach(([userId, behavior]: [string, any]) => {
        metrics.users[userId] = {
          requests: behavior.averageRequestsPerHour,
          blocked: 0,
          pattern: behavior.requestPattern,
        };
      });

      this.metrics.push(metrics);
      this.lastCollection = now;

      // Clean up old metrics (keep last 24 hours)
      const cutoff = now - (24 * 60 * 60 * 1000);
      this.metrics = this.metrics.filter(m => m.timestamp > cutoff);

      // Generate analytics periodically
      if (this.metrics.length >= 60) { // Every hour
        await this.generateAnalytics();
      }

    } catch (error: any) {
      this.logger.error('Failed to collect rate limit metrics', error);
    }
  }

  /**
   * Generate analytics report
   */
  async generateAnalytics(periodHours: number = 24): Promise<RateLimitAnalytics> {
    const now = Date.now();
    const startTime = now - (periodHours * 60 * 60 * 1000);

    // Filter metrics for the period
    const periodMetrics = this.metrics.filter(m => m.timestamp >= startTime);

    if (periodMetrics.length === 0) {
      return this.getEmptyAnalytics();
    }

    // Calculate summary statistics
    const totalRequests = periodMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const totalBlocked = periodMetrics.reduce((sum, m) => sum + m.blockedRequests, 0);
    const blockRate = totalRequests > 0 ? (totalBlocked / totalRequests) * 100 : 0;

    // Calculate average response time (mock for demo)
    const averageResponseTime = 50; // milliseconds

    // Find peak requests per second
    const peakRequestsPerSecond = Math.max(...periodMetrics.map(m => m.totalRequests));

    // Analyze algorithms
    const algorithmStats = {};
    for (const metric of periodMetrics) {
      Object.entries(metric.algorithms).forEach(([name, algorithmData]) => {
        if (!algorithmStats[name]) {
          algorithmStats[name] = { usage: 0, blocked: 0, latency: 0 };
        }
        algorithmStats[name].usage += algorithmData.used;
        algorithmStats[name].blocked += algorithmData.blocked;
      });
    }

    // Calculate algorithm effectiveness
    Object.keys(algorithmStats).forEach(name => {
      const algorithmInfo = algorithmStats[name];
      const effectiveness = algorithmInfo.usage > 0 ? (algorithmInfo.blocked / algorithmInfo.usage) * 100 : 0;
      algorithmStats[name].effectiveness = effectiveness;
    });

    // Analyze endpoints
    const endpointStats = {};
    for (const metric of periodMetrics) {
      Object.entries(metric.endpoints).forEach(([endpoint, stats]) => {
        if (!endpointStats[endpoint]) {
          endpointStats[endpoint] = { requests: 0, blocked: 0, users: new Set() };
        }
        endpointStats[endpoint].requests += stats.requests;
        endpointStats[endpoint].blocked += stats.blocked;
      });
    }

    // Calculate endpoint block rates and top users
    Object.keys(endpointStats).forEach(endpoint => {
      const stats = endpointStats[endpoint];
      const blockRate = stats.requests > 0 ? (stats.blocked / stats.requests) * 100 : 0;
      endpointStats[endpoint].blockRate = blockRate;
      endpointStats[endpoint].topUsers = []; // Would be calculated from actual data
    });

    // Analyze traffic patterns
    const serviceStats = await this.service.getStatistics();
    const trafficPatterns = Object.entries(serviceStats.patterns?.traffic || {})
      .map(([key, pattern]: [string, any]) => ({
        endpoint: pattern.endpoint,
        method: 'GET', // Would be extracted from key
        requestsPerMinute: pattern.requests,
        uniqueUsers: pattern.uniqueUsers?.size || 0,
        errorRate: 0,
        averageLatency: 0,
      }));

    // Identify suspicious users
    const suspiciousUsers = Object.entries(serviceStats.patterns?.users || {})
      .filter(([_, behavior]: [string, any]) => behavior.requestPattern === 'suspicious')
      .map(([_, behavior]: [string, any]) => behavior);

    // Detect load spikes
    const loadSpikes = [];
    for (let i = 1; i < periodMetrics.length; i++) {
      const current = periodMetrics[i];
      const previous = periodMetrics[i - 1];
      const increase = previous.totalRequests > 0 ?
        ((current.totalRequests - previous.totalRequests) / previous.totalRequests) * 100 : 0;

      if (increase > 200) { // 200% increase threshold
        loadSpikes.push({
          timestamp: current.timestamp,
          requests: current.totalRequests,
          increase,
        });
      }
    }

    this.analytics = {
      period: {
        start: new Date(startTime),
        end: new Date(now),
      },
      summary: {
        totalRequests,
        totalBlocked,
        blockRate,
        averageResponseTime,
        peakRequestsPerSecond,
      },
      algorithms: algorithmStats,
      endpoints: endpointStats,
      patterns: {
        traffic: trafficPatterns,
        suspiciousUsers,
        loadSpikes,
      },
    };

    return this.analytics;
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): RateLimitMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get analytics report
   */
  getAnalytics(): RateLimitAnalytics | null {
    return this.analytics;
  }

  /**
   * Record request (called by middleware)
   */
  recordRequest(endpoint: string, userId: string, blocked: boolean = false): void {
    // Update counters
    const totalKey = 'total';
    this.requestCounts.set(totalKey, (this.requestCounts.get(totalKey) || 0) + 1);

    if (blocked) {
      this.blockedCounts.set(totalKey, (this.blockedCounts.get(totalKey) || 0) + 1);
    }
  }

  /**
   * Update load metrics (called by external monitoring)
   */
  updateLoadMetrics(metrics: LoadMetrics): void {
    this.service.updateLoadMetrics(metrics);
  }

  /**
   * Get monitoring health
   */
  healthCheck(): { status: 'healthy' | 'unhealthy'; details?: string } {
    try {
      const metricsCount = this.metrics.length;
      const lastCollection = this.lastCollection;

      if (metricsCount === 0) {
        return {
          status: 'healthy',
          details: 'Monitoring initialized, no metrics collected yet',
        };
      }

      const timeSinceLastCollection = Date.now() - lastCollection;
      if (timeSinceLastCollection > 300000) { // 5 minutes
        return {
          status: 'unhealthy',
          details: 'Metrics collection may be stalled',
        };
      }

      return {
        status: 'healthy',
        details: `${metricsCount} metric points collected`,
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        details: error.message,
      };
    }
  }

  private getEmptyAnalytics(): RateLimitAnalytics {
    return {
      period: {
        start: new Date(),
        end: new Date(),
      },
      summary: {
        totalRequests: 0,
        totalBlocked: 0,
        blockRate: 0,
        averageResponseTime: 0,
        peakRequestsPerSecond: 0,
      },
      algorithms: {},
      endpoints: {},
      patterns: {
        traffic: [],
        suspiciousUsers: [],
        loadSpikes: [],
      },
    };
  }
}
