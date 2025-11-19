/**
 * Token Unlocks Monitoring & Health Check Module
 * Divine world-class monitoring for the token unlocks system
 * 
 * Features:
 * - Comprehensive health checks
 * - Performance metrics
 * - Error tracking
 * - Alert notifications
 * - System diagnostics
 * - Uptime monitoring
 */

import EventEmitter from 'eventemitter3';
import { logger } from '../utils/logger';
import { TokenUnlocksService } from './token-unlocks.service';

export interface HealthCheckResult {
  healthy: boolean;
  timestamp: Date;
  uptime: number; // seconds
  components: {
    messari: ComponentHealth;
    cache: ComponentHealth;
    storage: ComponentHealth;
    scheduler: ComponentHealth;
  };
  metrics: SystemMetrics;
  issues: HealthIssue[];
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  responseTime?: number; // milliseconds
  lastSuccessful?: Date;
  lastError?: {
    message: string;
    timestamp: Date;
  };
  details?: any;
}

export interface SystemMetrics {
  totalUnlocksTracked: number;
  nearTermUnlocksCount: number;
  cacheHitRate?: number;
  cacheSizeBytes?: number;
  databaseConnections?: number;
  apiCallsLast24h: number;
  apiErrorsLast24h: number;
  averageResponseTime: number; // milliseconds
  schedulerPollsToday: number;
  alertsGeneratedToday: number;
}

export interface HealthIssue {
  severity: 'critical' | 'warning' | 'info';
  component: string;
  message: string;
  timestamp: Date;
  recommendation?: string;
}

export interface PerformanceMetrics {
  endpoint: string;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  totalCalls: number;
  errorRate: number;
  lastCalled: Date;
}

export interface AlertNotification {
  id: string;
  type: 'health' | 'performance' | 'data' | 'security';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  metadata?: any;
  resolved?: boolean;
  resolvedAt?: Date;
}

export class TokenUnlocksMonitoring extends EventEmitter {
  private service: TokenUnlocksService;
  private startTime: Date;
  private healthCheckInterval?: NodeJS.Timeout;
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map();
  private alerts: AlertNotification[] = [];
  private apiCalls24h: number[] = []; // Timestamps of API calls
  private apiErrors24h: number[] = []; // Timestamps of API errors

  constructor(service: TokenUnlocksService) {
    super();
    this.service = service;
    this.startTime = new Date();
  }

  /**
   * Start monitoring
   */
  start(intervalMs: number = 60000): void {
    logger.info('Starting token unlocks monitoring...', {
      interval: `${intervalMs}ms`,
    });

    // Run initial health check
    this.performHealthCheck().catch((error) => {
      logger.error('Initial health check failed', { error });
    });

    // Schedule periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Health check failed', { error });
      }
    }, intervalMs);

    this.emit('monitoring_started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    this.emit('monitoring_stopped');
    logger.info('Token unlocks monitoring stopped');
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const timestamp = new Date();
    const uptime = Math.floor((timestamp.getTime() - this.startTime.getTime()) / 1000);

    logger.debug('Performing health check...');

    // Check all components
    const messariHealth = await this.checkMessariHealth();
    const cacheHealth = await this.checkCacheHealth();
    const storageHealth = await this.checkStorageHealth();
    const schedulerHealth = await this.checkSchedulerHealth();

    // Calculate overall health
    const healthy =
      messariHealth.status !== 'unhealthy' &&
      cacheHealth.status !== 'unhealthy' &&
      storageHealth.status !== 'unhealthy' &&
      schedulerHealth.status !== 'unhealthy';

    // Collect metrics
    const metrics = await this.collectMetrics();

    // Identify issues
    const issues = this.identifyIssues({
      messari: messariHealth,
      cache: cacheHealth,
      storage: storageHealth,
      scheduler: schedulerHealth,
    });

    const result: HealthCheckResult = {
      healthy,
      timestamp,
      uptime,
      components: {
        messari: messariHealth,
        cache: cacheHealth,
        storage: storageHealth,
        scheduler: schedulerHealth,
      },
      metrics,
      issues,
    };

    // Generate alerts for critical issues
    this.processHealthCheckResult(result);

    // Emit health check event
    this.emit('health_check_completed', result);

    logger.info('Health check completed', {
      healthy,
      issues: issues.length,
    });

    return result;
  }

  /**
   * Check Messari API health
   */
  private async checkMessariHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      const serviceHealth = await this.service.getHealthStatus();
      const responseTime = Date.now() - startTime;

      if (serviceHealth.messari) {
        return {
          status: 'healthy',
          responseTime,
          lastSuccessful: new Date(),
          details: serviceHealth.messari,
        };
      } else {
        return {
          status: 'degraded',
          responseTime,
          lastError: {
            message: 'Messari API health check failed',
            timestamp: new Date(),
          },
          details: serviceHealth.messari,
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastError: {
          message: (error as Error).message,
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Check cache health
   */
  private async checkCacheHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      const serviceHealth = await this.service.getHealthStatus();
      const responseTime = Date.now() - startTime;

      if (serviceHealth.cache) {
        return {
          status: 'healthy',
          responseTime,
          lastSuccessful: new Date(),
        };
      } else {
        return {
          status: 'degraded',
          responseTime,
          lastError: {
            message: 'Cache health check failed',
            timestamp: new Date(),
          },
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastError: {
          message: (error as Error).message,
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Check storage health
   */
  private async checkStorageHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      const serviceHealth = await this.service.getHealthStatus();
      const responseTime = Date.now() - startTime;

      if (serviceHealth.storage) {
        return {
          status: 'healthy',
          responseTime,
          lastSuccessful: new Date(),
        };
      } else {
        return {
          status: 'unhealthy',
          responseTime,
          lastError: {
            message: 'Storage health check failed',
            timestamp: new Date(),
          },
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastError: {
          message: (error as Error).message,
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Check scheduler health
   */
  private async checkSchedulerHealth(): Promise<ComponentHealth> {
    try {
      const serviceHealth = await this.service.getHealthStatus();
      const schedulerStatus = serviceHealth.scheduler;

      if (schedulerStatus.isRunning && !schedulerStatus.isPaused) {
        return {
          status: 'healthy',
          lastSuccessful: new Date(),
          details: schedulerStatus,
        };
      } else if (schedulerStatus.isPaused) {
        return {
          status: 'degraded',
          details: schedulerStatus,
        };
      } else {
        return {
          status: 'unhealthy',
          lastError: {
            message: 'Scheduler not running',
            timestamp: new Date(),
          },
          details: schedulerStatus,
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        lastError: {
          message: (error as Error).message,
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Collect system metrics
   */
  private async collectMetrics(): Promise<SystemMetrics> {
    try {
      const stats = await this.service.getStats();
      const schedulerStats = stats.scheduler;

      // Clean up old API call/error records (older than 24h)
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      this.apiCalls24h = this.apiCalls24h.filter((t) => t > oneDayAgo);
      this.apiErrors24h = this.apiErrors24h.filter((t) => t > oneDayAgo);

      // Calculate average response time
      let totalResponseTime = 0;
      let responseTimeCount = 0;
      for (const metric of this.performanceMetrics.values()) {
        totalResponseTime += metric.avgResponseTime;
        responseTimeCount++;
      }
      const avgResponseTime =
        responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;

      return {
        totalUnlocksTracked: schedulerStats.unlocksTracked || 0,
        nearTermUnlocksCount: schedulerStats.nearTermUnlocksCount || 0,
        apiCallsLast24h: this.apiCalls24h.length,
        apiErrorsLast24h: this.apiErrors24h.length,
        averageResponseTime: avgResponseTime,
        schedulerPollsToday:
          schedulerStats.dailyPollCount + schedulerStats.nearTermPollCount,
        alertsGeneratedToday: this.alerts.filter(
          (a) =>
            a.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000) &&
            !a.resolved
        ).length,
      };
    } catch (error) {
      logger.error('Failed to collect metrics', { error });
      return {
        totalUnlocksTracked: 0,
        nearTermUnlocksCount: 0,
        apiCallsLast24h: 0,
        apiErrorsLast24h: 0,
        averageResponseTime: 0,
        schedulerPollsToday: 0,
        alertsGeneratedToday: 0,
      };
    }
  }

  /**
   * Identify health issues
   */
  private identifyIssues(components: {
    messari: ComponentHealth;
    cache: ComponentHealth;
    storage: ComponentHealth;
    scheduler: ComponentHealth;
  }): HealthIssue[] {
    const issues: HealthIssue[] = [];

    // Check Messari
    if (components.messari.status === 'unhealthy') {
      issues.push({
        severity: 'critical',
        component: 'messari',
        message: 'Messari API is unhealthy',
        timestamp: new Date(),
        recommendation:
          'Check API key validity and network connectivity. Verify Messari service status.',
      });
    } else if (components.messari.status === 'degraded') {
      issues.push({
        severity: 'warning',
        component: 'messari',
        message: 'Messari API performance degraded',
        timestamp: new Date(),
        recommendation: 'Monitor API rate limits and response times.',
      });
    }

    // Check Cache
    if (components.cache.status === 'unhealthy') {
      issues.push({
        severity: 'warning',
        component: 'cache',
        message: 'Cache is unhealthy',
        timestamp: new Date(),
        recommendation:
          'Check Redis connectivity. System will fall back to database.',
      });
    }

    // Check Storage
    if (components.storage.status === 'unhealthy') {
      issues.push({
        severity: 'critical',
        component: 'storage',
        message: 'Database storage is unhealthy',
        timestamp: new Date(),
        recommendation:
          'URGENT: Check database connectivity and credentials. Service cannot function without storage.',
      });
    }

    // Check Scheduler
    if (components.scheduler.status === 'unhealthy') {
      issues.push({
        severity: 'critical',
        component: 'scheduler',
        message: 'Scheduler is not running',
        timestamp: new Date(),
        recommendation: 'Restart the scheduler to resume automatic polling.',
      });
    } else if (components.scheduler.status === 'degraded') {
      issues.push({
        severity: 'info',
        component: 'scheduler',
        message: 'Scheduler is paused',
        timestamp: new Date(),
        recommendation: 'Resume scheduler if intentional pause is complete.',
      });
    }

    // Check response times
    if (
      components.messari.responseTime &&
      components.messari.responseTime > 5000
    ) {
      issues.push({
        severity: 'warning',
        component: 'messari',
        message: 'Messari API response time is slow',
        timestamp: new Date(),
        recommendation: 'Monitor API performance and consider caching strategies.',
      });
    }

    return issues;
  }

  /**
   * Process health check result and generate alerts
   */
  private processHealthCheckResult(result: HealthCheckResult): void {
    // Generate alerts for critical issues
    result.issues.forEach((issue) => {
      if (issue.severity === 'critical') {
        this.createAlert({
          type: 'health',
          severity: 'critical',
          title: `Critical Health Issue: ${issue.component}`,
          message: issue.message,
          metadata: {
            component: issue.component,
            recommendation: issue.recommendation,
          },
        });
      }
    });

    // Check overall health
    if (!result.healthy) {
      this.createAlert({
        type: 'health',
        severity: 'critical',
        title: 'System Unhealthy',
        message: `Token unlocks system is unhealthy. ${result.issues.length} issue(s) detected.`,
        metadata: {
          issues: result.issues,
          uptime: result.uptime,
        },
      });
    }

    // Check metrics
    if (result.metrics.apiErrorsLast24h > 10) {
      this.createAlert({
        type: 'performance',
        severity: 'warning',
        title: 'High API Error Rate',
        message: `${result.metrics.apiErrorsLast24h} API errors in the last 24 hours`,
        metadata: {
          errorCount: result.metrics.apiErrorsLast24h,
          callCount: result.metrics.apiCallsLast24h,
        },
      });
    }
  }

  /**
   * Create alert notification
   */
  private createAlert(
    alert: Omit<AlertNotification, 'id' | 'timestamp' | 'resolved'>
  ): void {
    const newAlert: AlertNotification = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date(),
      resolved: false,
      ...alert,
    };

    this.alerts.push(newAlert);

    // Emit alert event
    this.emit('alert_created', newAlert);

    logger.warn('Alert created', {
      id: newAlert.id,
      type: newAlert.type,
      severity: newAlert.severity,
      title: newAlert.title,
    });

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Record API call
   */
  recordApiCall(success: boolean): void {
    this.apiCalls24h.push(Date.now());
    if (!success) {
      this.apiErrors24h.push(Date.now());
    }
  }

  /**
   * Record performance metric
   */
  recordPerformanceMetric(
    endpoint: string,
    responseTime: number,
    error: boolean = false
  ): void {
    const existing = this.performanceMetrics.get(endpoint);

    if (existing) {
      const totalCalls = existing.totalCalls + 1;
      const avgResponseTime =
        (existing.avgResponseTime * existing.totalCalls + responseTime) /
        totalCalls;

      this.performanceMetrics.set(endpoint, {
        endpoint,
        avgResponseTime,
        minResponseTime: Math.min(existing.minResponseTime, responseTime),
        maxResponseTime: Math.max(existing.maxResponseTime, responseTime),
        totalCalls,
        errorRate:
          (existing.errorRate * existing.totalCalls + (error ? 1 : 0)) /
          totalCalls,
        lastCalled: new Date(),
      });
    } else {
      this.performanceMetrics.set(endpoint, {
        endpoint,
        avgResponseTime: responseTime,
        minResponseTime: responseTime,
        maxResponseTime: responseTime,
        totalCalls: 1,
        errorRate: error ? 1 : 0,
        lastCalled: new Date(),
      });
    }
  }

  /**
   * Get all alerts
   */
  getAlerts(includeResolved: boolean = false): AlertNotification[] {
    if (includeResolved) {
      return [...this.alerts];
    }
    return this.alerts.filter((a) => !a.resolved);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.emit('alert_resolved', alert);
      logger.info('Alert resolved', { id: alertId });
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values());
  }

  /**
   * Get uptime
   */
  getUptime(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  /**
   * Get diagnostic information
   */
  async getDiagnostics(): Promise<{
    uptime: number;
    healthCheck: HealthCheckResult;
    performanceMetrics: PerformanceMetrics[];
    alerts: AlertNotification[];
    stats: any;
  }> {
    const healthCheck = await this.performHealthCheck();
    const performanceMetrics = this.getPerformanceMetrics();
    const alerts = this.getAlerts();
    const stats = await this.service.getStats();

    return {
      uptime: this.getUptime(),
      healthCheck,
      performanceMetrics,
      alerts,
      stats,
    };
  }
}

export default TokenUnlocksMonitoring;

