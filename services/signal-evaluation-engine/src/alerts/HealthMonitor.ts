/**
 * =========================================
 * ALERT ENGINE HEALTH MONITOR
 * =========================================
 * Comprehensive monitoring and health checking system
 * for the alert evaluation engine with performance
 * tracking, alerting, and automatic recovery
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import type {
  HealthStatus,
  HealthMetrics,
  AlertEngineMetrics,
  SystemHealthReport,
  PerformanceAlert,
  RecoveryAction
} from './types';

export class HealthMonitor extends EventEmitter {
  private logger: Logger;
  private isMonitoring: boolean = false;

  // Health check intervals
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 30000; // 30 seconds

  // Performance thresholds
  private readonly WARNING_THRESHOLDS = {
    latency: 50, // ms
    memoryUsage: 100 * 1024 * 1024, // 100MB
    errorRate: 0.01, // 1%
    patternMemoryUsage: 50 * 1024 * 1024, // 50MB
    cooldownMemoryUsage: 10 * 1024 * 1024 // 10MB
  };

  private readonly CRITICAL_THRESHOLDS = {
    latency: 100, // ms
    memoryUsage: 200 * 1024 * 1024, // 200MB
    errorRate: 0.05, // 5%
    patternMemoryUsage: 100 * 1024 * 1024, // 100MB
    cooldownMemoryUsage: 20 * 1024 * 1024 // 20MB
  };

  // Health metrics storage
  private metrics: HealthMetrics[] = [];
  private readonly MAX_METRICS_HISTORY = 1000;

  // Alert tracking
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private alertHistory: PerformanceAlert[] = [];

  constructor() {
    super();
    this.logger = new Logger('HealthMonitor');
  }

  async start(): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    try {
      this.logger.info('Starting health monitoring...');

      this.isMonitoring = true;
      this.startHealthChecks();

      this.logger.info('✅ Health monitoring started successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to start health monitoring', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    try {
      this.logger.info('Stopping health monitoring...');

      this.isMonitoring = false;

      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }

      this.logger.info('✅ Health monitoring stopped successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to stop health monitoring', error);
      throw error;
    }
  }

  /**
   * Get current health status
   */
  getHealthStatus(): HealthStatus {
    const latestMetrics = this.metrics[this.metrics.length - 1];

    if (!latestMetrics) {
      return {
        status: 'unknown',
        timestamp: new Date(),
        components: {},
        overallScore: 0
      };
    }

    const overallScore = this.calculateOverallHealthScore(latestMetrics);

    return {
      status: this.determineOverallStatus(latestMetrics),
      timestamp: latestMetrics.timestamp,
      components: {
        ruleEngine: this.getComponentStatus(latestMetrics.ruleEngine),
        patternEngine: this.getComponentStatus(latestMetrics.sequentialPatternEngine),
        thresholdEngine: this.getComponentStatus(latestMetrics.dynamicThresholdEngine),
        cooldownManager: this.getComponentStatus(latestMetrics.cooldownManager)
      },
      overallScore
    };
  }

  /**
   * Get detailed health report
   */
  getHealthReport(): SystemHealthReport {
    const latestMetrics = this.metrics[this.metrics.length - 1];
    const healthStatus = this.getHealthStatus();

    return {
      health: healthStatus,
      metrics: latestMetrics || this.getEmptyMetrics(),
      alerts: Array.from(this.activeAlerts.values()),
      recommendations: this.generateHealthRecommendations(latestMetrics),
      uptime: this.calculateUptime(),
      lastRestart: this.getLastRestartTime()
    };
  }

  /**
   * Record health metrics (called by monitored components)
   */
  recordMetrics(component: string, metrics: any): void {
    if (!this.isMonitoring) return;

    const healthMetrics: HealthMetrics = {
      timestamp: new Date(),
      ruleEngine: component === 'ruleEngine' ? metrics : this.getEmptyEngineMetrics(),
      sequentialPatternEngine: component === 'sequentialPatternEngine' ? metrics : this.getEmptyPatternMetrics(),
      dynamicThresholdEngine: component === 'dynamicThresholdEngine' ? metrics : this.getEmptyThresholdMetrics(),
      cooldownManager: component === 'cooldownManager' ? metrics : this.getEmptyCooldownMetrics(),
      system: this.getSystemMetrics()
    };

    this.metrics.push(healthMetrics);

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics.shift();
    }

    this.analyzeMetrics(healthMetrics);
  }

  // Private methods

  private startHealthChecks(): void {
    this.checkInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.CHECK_INTERVAL);
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // This would integrate with actual health checks
      // For now, we'll simulate health checks

      const mockMetrics: HealthMetrics = {
        timestamp: new Date(),
        ruleEngine: {
          totalRules: 150,
          activeRules: 120,
          averageEvaluationTime: 25,
          evaluationCount: 15000,
          errorCount: 15,
          cacheHitRate: 0.95,
          memoryUsage: 25 * 1024 * 1024
        },
        sequentialPatternEngine: {
          activePatterns: 500,
          memoryUsage: 30 * 1024 * 1024,
          averageMatchTime: 8,
          totalMatches: 2500,
          errorCount: 2
        },
        dynamicThresholdEngine: {
          totalThresholds: 200,
          memoryUsage: 15 * 1024 * 1024,
          averageAdaptationTime: 2,
          totalAdaptations: 8000,
          errorCount: 1
        },
        cooldownManager: {
          activeCooldowns: 75,
          memoryUsage: 8 * 1024 * 1024,
          totalSuppressed: 1200,
          totalBypassed: 45,
          effectivenessScore: 0.87
        },
        system: this.getSystemMetrics()
      };

      this.recordMetrics('healthCheck', mockMetrics);

    } catch (error: any) {
      this.logger.error('Health check failed', error);
    }
  }

  private analyzeMetrics(metrics: HealthMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // Check rule engine metrics
    if (metrics.ruleEngine.averageEvaluationTime > this.CRITICAL_THRESHOLDS.latency) {
      alerts.push({
        id: `rule_engine_latency_${Date.now()}`,
        type: 'critical',
        component: 'ruleEngine',
        metric: 'averageEvaluationTime',
        value: metrics.ruleEngine.averageEvaluationTime,
        threshold: this.CRITICAL_THRESHOLDS.latency,
        message: `Rule engine latency (${metrics.ruleEngine.averageEvaluationTime}ms) exceeds critical threshold (${this.CRITICAL_THRESHOLDS.latency}ms)`,
        timestamp: new Date(),
        severity: 'critical'
      });
    } else if (metrics.ruleEngine.averageEvaluationTime > this.WARNING_THRESHOLDS.latency) {
      alerts.push({
        id: `rule_engine_latency_${Date.now()}`,
        type: 'warning',
        component: 'ruleEngine',
        metric: 'averageEvaluationTime',
        value: metrics.ruleEngine.averageEvaluationTime,
        threshold: this.WARNING_THRESHOLDS.latency,
        message: `Rule engine latency (${metrics.ruleEngine.averageEvaluationTime}ms) exceeds warning threshold (${this.WARNING_THRESHOLDS.latency}ms)`,
        timestamp: new Date(),
        severity: 'warning'
      });
    }

    // Check memory usage
    const totalMemory = metrics.ruleEngine.memoryUsage +
                       metrics.sequentialPatternEngine.memoryUsage +
                       metrics.dynamicThresholdEngine.memoryUsage +
                       metrics.cooldownManager.memoryUsage;

    if (totalMemory > this.CRITICAL_THRESHOLDS.memoryUsage) {
      alerts.push({
        id: `memory_usage_${Date.now()}`,
        type: 'critical',
        component: 'system',
        metric: 'totalMemoryUsage',
        value: totalMemory,
        threshold: this.CRITICAL_THRESHOLDS.memoryUsage,
        message: `Total memory usage (${(totalMemory / 1024 / 1024).toFixed(1)}MB) exceeds critical threshold (${(this.CRITICAL_THRESHOLDS.memoryUsage / 1024 / 1024).toFixed(1)}MB)`,
        timestamp: new Date(),
        severity: 'critical'
      });
    }

    // Check error rates
    const totalErrors = metrics.ruleEngine.errorCount +
                       metrics.sequentialPatternEngine.errorCount +
                       metrics.dynamicThresholdEngine.errorCount;

    const totalOperations = metrics.ruleEngine.evaluationCount +
                           metrics.sequentialPatternEngine.totalMatches +
                           metrics.dynamicThresholdEngine.totalAdaptations;

    const errorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;

    if (errorRate > this.CRITICAL_THRESHOLDS.errorRate) {
      alerts.push({
        id: `error_rate_${Date.now()}`,
        type: 'critical',
        component: 'system',
        metric: 'errorRate',
        value: errorRate,
        threshold: this.CRITICAL_THRESHOLDS.errorRate,
        message: `Error rate (${(errorRate * 100).toFixed(2)}%) exceeds critical threshold (${(this.CRITICAL_THRESHOLDS.errorRate * 100).toFixed(2)}%)`,
        timestamp: new Date(),
        severity: 'critical'
      });
    }

    // Process alerts
    for (const alert of alerts) {
      this.handlePerformanceAlert(alert);
    }
  }

  private handlePerformanceAlert(alert: PerformanceAlert): void {
    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    // Emit alert
    this.emit('performanceAlert', alert);

    // Log alert
    this.logger.warn('Performance alert triggered', {
      alertId: alert.id,
      type: alert.type,
      component: alert.component,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      message: alert.message
    });

    // Trigger recovery actions for critical alerts
    if (alert.severity === 'critical') {
      this.triggerRecoveryActions(alert);
    }
  }

  private triggerRecoveryActions(alert: PerformanceAlert): void {
    const recoveryActions: RecoveryAction[] = [];

    switch (alert.component) {
      case 'ruleEngine':
        if (alert.metric === 'averageEvaluationTime') {
          recoveryActions.push({
            type: 'rule_optimization',
            description: 'Optimize rule complexity and caching',
            priority: 'high'
          });
        }
        break;

      case 'system':
        if (alert.metric === 'totalMemoryUsage') {
          recoveryActions.push({
            type: 'memory_cleanup',
            description: 'Trigger garbage collection and cleanup expired patterns',
            priority: 'high'
          });
        }
        break;
    }

    for (const action of recoveryActions) {
      this.emit('recoveryAction', action);
    }
  }

  private calculateOverallHealthScore(metrics: HealthMetrics): number {
    let score = 100;

    // Latency impact
    const avgLatency = metrics.ruleEngine.averageEvaluationTime;
    if (avgLatency > 50) score -= (avgLatency - 50) * 0.5;

    // Memory impact
    const totalMemory = metrics.ruleEngine.memoryUsage +
                       metrics.sequentialPatternEngine.memoryUsage +
                       metrics.dynamicThresholdEngine.memoryUsage +
                       metrics.cooldownManager.memoryUsage;
    if (totalMemory > 100 * 1024 * 1024) {
      score -= (totalMemory - 100 * 1024 * 1024) / (1024 * 1024) * 0.1;
    }

    // Error rate impact
    const totalErrors = metrics.ruleEngine.errorCount +
                       metrics.sequentialPatternEngine.errorCount +
                       metrics.dynamicThresholdEngine.errorCount;
    const totalOps = metrics.ruleEngine.evaluationCount +
                    metrics.sequentialPatternEngine.totalMatches +
                    metrics.dynamicThresholdEngine.totalAdaptations;
    const errorRate = totalOps > 0 ? totalErrors / totalOps : 0;
    if (errorRate > 0.01) score -= errorRate * 1000;

    return Math.max(0, Math.min(100, score));
  }

  private determineOverallStatus(metrics: HealthMetrics): 'healthy' | 'warning' | 'critical' | 'unknown' {
    const score = this.calculateOverallHealthScore(metrics);

    if (score >= 90) return 'healthy';
    if (score >= 70) return 'warning';
    if (score >= 50) return 'critical';
    return 'unknown';
  }

  private getComponentStatus(metrics: any): 'healthy' | 'warning' | 'critical' | 'unknown' {
    if (!metrics) return 'unknown';

    // Simple status determination based on key metrics
    const hasErrors = metrics.errorCount && metrics.errorCount > 0;
    const highLatency = metrics.averageEvaluationTime && metrics.averageEvaluationTime > 50;
    const highMemory = metrics.memoryUsage && metrics.memoryUsage > 50 * 1024 * 1024;

    if (hasErrors || highLatency || highMemory) return 'warning';
    return 'healthy';
  }

  private generateHealthRecommendations(metrics: HealthMetrics | undefined): string[] {
    const recommendations: string[] = [];

    if (!metrics) {
      recommendations.push('No metrics available - check system initialization');
      return recommendations;
    }

    // Latency recommendations
    if (metrics.ruleEngine.averageEvaluationTime > 50) {
      recommendations.push('Consider optimizing rule complexity for better latency');
    }

    // Memory recommendations
    const totalMemory = metrics.ruleEngine.memoryUsage +
                       metrics.sequentialPatternEngine.memoryUsage +
                       metrics.dynamicThresholdEngine.memoryUsage +
                       metrics.cooldownManager.memoryUsage;

    if (totalMemory > 150 * 1024 * 1024) {
      recommendations.push('High memory usage - consider increasing memory limits or optimizing patterns');
    }

    // Error rate recommendations
    const totalErrors = metrics.ruleEngine.errorCount +
                       metrics.sequentialPatternEngine.errorCount +
                       metrics.dynamicThresholdEngine.errorCount;
    const totalOps = metrics.ruleEngine.evaluationCount +
                    metrics.sequentialPatternEngine.totalMatches +
                    metrics.dynamicThresholdEngine.totalAdaptations;
    const errorRate = totalOps > 0 ? totalErrors / totalOps : 0;

    if (errorRate > 0.02) {
      recommendations.push('High error rate - investigate and fix underlying issues');
    }

    return recommendations;
  }

  private calculateUptime(): number {
    // Simplified uptime calculation
    return process.uptime() * 1000; // Convert to milliseconds
  }

  private getLastRestartTime(): Date {
    // This would track actual restart times
    return new Date(Date.now() - this.calculateUptime());
  }

  private getSystemMetrics(): any {
    const memUsage = process.memoryUsage();

    return {
      uptime: process.uptime(),
      memoryUsage: memUsage.heapUsed,
      externalMemory: memUsage.external,
      rss: memUsage.rss,
      cpuUsage: process.cpuUsage(),
      loadAverage: require('os').loadavg()
    };
  }

  private getEmptyEngineMetrics(): AlertEngineMetrics {
    return {
      totalRules: 0,
      activeRules: 0,
      averageEvaluationTime: 0,
      evaluationCount: 0,
      errorCount: 0,
      cacheHitRate: 0,
      memoryUsage: 0
    };
  }

  private getEmptyPatternMetrics(): any {
    return {
      activePatterns: 0,
      memoryUsage: 0,
      averageMatchTime: 0,
      totalMatches: 0,
      errorCount: 0
    };
  }

  private getEmptyThresholdMetrics(): any {
    return {
      totalThresholds: 0,
      memoryUsage: 0,
      averageAdaptationTime: 0,
      totalAdaptations: 0,
      errorCount: 0
    };
  }

  private getEmptyCooldownMetrics(): any {
    return {
      activeCooldowns: 0,
      memoryUsage: 0,
      totalSuppressed: 0,
      totalBypassed: 0,
      effectivenessScore: 0
    };
  }

  private getEmptyMetrics(): HealthMetrics {
    return {
      timestamp: new Date(),
      ruleEngine: this.getEmptyEngineMetrics(),
      sequentialPatternEngine: this.getEmptyPatternMetrics(),
      dynamicThresholdEngine: this.getEmptyThresholdMetrics(),
      cooldownManager: this.getEmptyCooldownMetrics(),
      system: this.getSystemMetrics()
    };
  }
}

// Types for health monitoring
export interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  timestamp: Date;
  components: {
    ruleEngine: 'healthy' | 'warning' | 'critical' | 'unknown';
    patternEngine: 'healthy' | 'warning' | 'critical' | 'unknown';
    thresholdEngine: 'healthy' | 'warning' | 'critical' | 'unknown';
    cooldownManager: 'healthy' | 'warning' | 'critical' | 'unknown';
  };
  overallScore: number;
}

export interface HealthMetrics {
  timestamp: Date;
  ruleEngine: AlertEngineMetrics;
  sequentialPatternEngine: {
    activePatterns: number;
    memoryUsage: number;
    averageMatchTime: number;
    totalMatches: number;
    errorCount: number;
  };
  dynamicThresholdEngine: {
    totalThresholds: number;
    memoryUsage: number;
    averageAdaptationTime: number;
    totalAdaptations: number;
    errorCount: number;
  };
  cooldownManager: {
    activeCooldowns: number;
    memoryUsage: number;
    totalSuppressed: number;
    totalBypassed: number;
    effectivenessScore: number;
  };
  system: {
    uptime: number;
    memoryUsage: number;
    externalMemory: number;
    rss: number;
    cpuUsage: any;
    loadAverage: number[];
  };
}

export interface SystemHealthReport {
  health: HealthStatus;
  metrics: HealthMetrics;
  alerts: PerformanceAlert[];
  recommendations: string[];
  uptime: number;
  lastRestart: Date;
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical';
  component: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
  severity: 'warning' | 'critical';
}

export interface RecoveryAction {
  type: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}
