/**
 * ============================================
 * ALERT MANAGER
 * ============================================
 * 
 * Enterprise-grade alert management:
 * - Configurable thresholds
 * - Multiple notification channels
 * - Alert deduplication
 * - Escalation policies
 * - Alert history and analytics
 * 
 * Integrates with Prometheus metrics for automated alerting.
 */

import { EventEmitter } from 'eventemitter3';
import { logger } from '../utils/logger';
import { getPrometheusMetrics } from './prometheus-metrics';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';

/**
 * Alert status
 */
export type AlertStatus = 'firing' | 'resolved' | 'acknowledged' | 'silenced';

/**
 * Alert definition
 */
export interface Alert {
  id: string;
  name: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  source: string;
  value?: number;
  threshold?: number;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  firedAt: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  notificationsSent: number;
}

/**
 * Alert rule definition
 */
export interface AlertRule {
  name: string;
  description: string;
  severity: AlertSeverity;
  condition: AlertCondition;
  forDuration?: number; // Fire only if condition true for X ms
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  notificationChannels?: string[];
  enabled: boolean;
}

/**
 * Alert condition
 */
export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'ne';
  threshold: number;
  labels?: Record<string, string>;
}

/**
 * Notification channel
 */
export interface NotificationChannel {
  name: string;
  type: 'console' | 'webhook' | 'slack' | 'email' | 'pagerduty';
  config: Record<string, any>;
  enabled: boolean;
  minSeverity: AlertSeverity;
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  evaluationInterval: number; // ms
  deduplicationWindow: number; // ms
  resolveTimeout: number; // ms - auto-resolve if condition clears
  maxAlertsPerRule: number;
  silenceDefaultDuration: number; // ms
}

/**
 * Alert Manager
 */
export class AlertManager extends EventEmitter {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private channels: Map<string, NotificationChannel> = new Map();
  private pendingAlerts: Map<string, { startTime: number; rule: AlertRule }> = new Map();
  private evaluationTimer?: NodeJS.Timeout;
  private silences: Map<string, { until: Date; reason: string }> = new Map();
  
  private readonly config: AlertConfig;
  private readonly metrics = getPrometheusMetrics();

  constructor(config?: Partial<AlertConfig>) {
    super();

    this.config = {
      evaluationInterval: config?.evaluationInterval ?? 30000, // 30 seconds
      deduplicationWindow: config?.deduplicationWindow ?? 300000, // 5 minutes
      resolveTimeout: config?.resolveTimeout ?? 60000, // 1 minute
      maxAlertsPerRule: config?.maxAlertsPerRule ?? 10,
      silenceDefaultDuration: config?.silenceDefaultDuration ?? 3600000, // 1 hour
    };

    this.registerDefaultRules();
    this.registerDefaultChannels();
    this.registerMetrics();
    
    logger.info('Alert Manager initialized', {
      evaluationInterval: this.config.evaluationInterval,
      rulesCount: this.rules.size,
    });
  }

  /**
   * Register Prometheus metrics for alerting
   */
  private registerMetrics(): void {
    this.metrics.register({
      name: 'alerts_active',
      help: 'Number of currently active alerts',
      type: 'gauge',
      labels: ['severity'],
    });

    this.metrics.register({
      name: 'alerts_fired_total',
      help: 'Total alerts fired',
      type: 'counter',
      labels: ['rule', 'severity'],
    });

    this.metrics.register({
      name: 'alerts_resolved_total',
      help: 'Total alerts resolved',
      type: 'counter',
      labels: ['rule'],
    });

    this.metrics.register({
      name: 'alert_notifications_sent_total',
      help: 'Total alert notifications sent',
      type: 'counter',
      labels: ['channel', 'severity'],
    });
  }

  /**
   * Register default alert rules
   */
  private registerDefaultRules(): void {
    // Cache hit rate alert
    this.addRule({
      name: 'LowCacheHitRate',
      description: 'Cache hit rate below 90%',
      severity: 'warning',
      condition: {
        metric: 'cache_hit_ratio',
        operator: 'lt',
        threshold: 0.9,
      },
      forDuration: 60000, // 1 minute
      annotations: {
        summary: 'Cache hit rate is low',
        description: 'Cache hit rate has been below 90% for more than 1 minute',
        runbook: 'Check cache configuration and key distribution',
      },
      enabled: true,
    });

    // Critical cache hit rate
    this.addRule({
      name: 'CriticalCacheHitRate',
      description: 'Cache hit rate below 70%',
      severity: 'critical',
      condition: {
        metric: 'cache_hit_ratio',
        operator: 'lt',
        threshold: 0.7,
      },
      forDuration: 30000,
      annotations: {
        summary: 'Cache hit rate is critically low',
        description: 'Cache hit rate has dropped below 70%',
        runbook: 'Immediate investigation required. Check Redis connectivity.',
      },
      enabled: true,
    });

    // High error rate
    this.addRule({
      name: 'HighErrorRate',
      description: 'API error rate above 5%',
      severity: 'warning',
      condition: {
        metric: 'error_rate',
        operator: 'gt',
        threshold: 0.05,
      },
      forDuration: 60000,
      enabled: true,
    });

    // Critical error rate
    this.addRule({
      name: 'CriticalErrorRate',
      description: 'API error rate above 20%',
      severity: 'critical',
      condition: {
        metric: 'error_rate',
        operator: 'gt',
        threshold: 0.2,
      },
      forDuration: 30000,
      enabled: true,
    });

    // Low efficiency multiplier
    this.addRule({
      name: 'LowEfficiency',
      description: 'Efficiency multiplier below 10x',
      severity: 'warning',
      condition: {
        metric: 'efficiency_multiplier',
        operator: 'lt',
        threshold: 10,
      },
      forDuration: 300000, // 5 minutes
      annotations: {
        summary: 'Efficiency has dropped',
        description: 'System efficiency is below target 10x multiplier',
      },
      enabled: true,
    });

    // Provider health
    this.addRule({
      name: 'ProviderUnhealthy',
      description: 'Data provider is unhealthy',
      severity: 'warning',
      condition: {
        metric: 'provider_health',
        operator: 'eq',
        threshold: 0,
      },
      forDuration: 60000,
      enabled: true,
    });

    // High latency
    this.addRule({
      name: 'HighLatency',
      description: 'P95 latency above 2 seconds',
      severity: 'warning',
      condition: {
        metric: 'response_time_p95_seconds',
        operator: 'gt',
        threshold: 2,
      },
      forDuration: 120000,
      enabled: true,
    });

    // Memory usage
    this.addRule({
      name: 'HighMemoryUsage',
      description: 'Memory usage above 80%',
      severity: 'warning',
      condition: {
        metric: 'memory_usage_percent',
        operator: 'gt',
        threshold: 80,
      },
      forDuration: 300000,
      enabled: true,
    });

    // DeFi-specific alerts
    this.addRule({
      name: 'DexScreenerHighErrorRate',
      description: 'DexScreener error rate above 10%',
      severity: 'warning',
      condition: {
        metric: 'dexscreener_error_rate',
        operator: 'gt',
        threshold: 0.1,
      },
      forDuration: 120000,
      labels: { source: 'dexscreener' },
      enabled: true,
    });

    this.addRule({
      name: 'SentimentAccuracyLow',
      description: 'Sentiment analysis accuracy below 70%',
      severity: 'warning',
      condition: {
        metric: 'sentiment_accuracy',
        operator: 'lt',
        threshold: 0.7,
      },
      forDuration: 600000, // 10 minutes
      enabled: true,
    });

    this.addRule({
      name: 'StaleData',
      description: 'Data is stale (older than 5 minutes)',
      severity: 'warning',
      condition: {
        metric: 'defi_aggregation_data_freshness_seconds',
        operator: 'gt',
        threshold: 300,
      },
      forDuration: 60000,
      enabled: true,
    });

    logger.info('Default alert rules registered', { count: this.rules.size });
  }

  /**
   * Register default notification channels
   */
  private registerDefaultChannels(): void {
    // Console channel (always enabled)
    this.addChannel({
      name: 'console',
      type: 'console',
      config: {},
      enabled: true,
      minSeverity: 'info',
    });

    // Webhook channel (configurable)
    if (process.env.ALERT_WEBHOOK_URL) {
      this.addChannel({
        name: 'webhook',
        type: 'webhook',
        config: {
          url: process.env.ALERT_WEBHOOK_URL,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        enabled: true,
        minSeverity: 'warning',
      });
    }

    // Slack channel
    if (process.env.SLACK_WEBHOOK_URL) {
      this.addChannel({
        name: 'slack',
        type: 'slack',
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_CHANNEL || '#alerts',
        },
        enabled: true,
        minSeverity: 'warning',
      });
    }

    // PagerDuty channel
    if (process.env.PAGERDUTY_INTEGRATION_KEY) {
      this.addChannel({
        name: 'pagerduty',
        type: 'pagerduty',
        config: {
          integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY,
        },
        enabled: true,
        minSeverity: 'critical',
      });
    }

    logger.info('Notification channels configured', { 
      count: this.channels.size,
      channels: Array.from(this.channels.keys()),
    });
  }

  /**
   * Add an alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.name, rule);
    logger.debug(`Alert rule added: ${rule.name}`);
  }

  /**
   * Remove an alert rule
   */
  removeRule(name: string): void {
    this.rules.delete(name);
    this.pendingAlerts.delete(name);
  }

  /**
   * Add a notification channel
   */
  addChannel(channel: NotificationChannel): void {
    this.channels.set(channel.name, channel);
  }

  /**
   * Start alert evaluation loop
   */
  start(): void {
    if (this.evaluationTimer) {
      return;
    }

    this.evaluationTimer = setInterval(() => {
      this.evaluate();
    }, this.config.evaluationInterval);

    logger.info('Alert Manager started');
    this.emit('started');
  }

  /**
   * Stop alert evaluation
   */
  stop(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = undefined;
    }

    logger.info('Alert Manager stopped');
    this.emit('stopped');
  }

  /**
   * Evaluate all alert rules
   */
  private evaluate(): void {
    const now = Date.now();

    for (const [ruleName, rule] of this.rules) {
      if (!rule.enabled) continue;

      const conditionMet = this.evaluateCondition(rule.condition);
      const alertId = this.generateAlertId(rule);
      const pendingKey = ruleName;

      if (conditionMet) {
        // Check if we need to wait for forDuration
        if (rule.forDuration) {
          const pending = this.pendingAlerts.get(pendingKey);
          
          if (!pending) {
            // Start pending
            this.pendingAlerts.set(pendingKey, { startTime: now, rule });
            continue;
          }

          // Check if duration exceeded
          if (now - pending.startTime < rule.forDuration) {
            continue;
          }
        }

        // Fire alert if not already active
        if (!this.activeAlerts.has(alertId)) {
          this.fireAlert(rule, alertId);
        }
      } else {
        // Clear pending
        this.pendingAlerts.delete(pendingKey);

        // Resolve active alert
        const activeAlert = this.activeAlerts.get(alertId);
        if (activeAlert && activeAlert.status === 'firing') {
          this.resolveAlert(alertId);
        }
      }
    }

    // Update active alerts metric
    this.updateActiveAlertsMetric();
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: AlertCondition): boolean {
    const value = this.metrics.getValue(condition.metric, condition.labels);
    
    if (value === undefined) {
      return false;
    }

    switch (condition.operator) {
      case 'gt': return value > condition.threshold;
      case 'lt': return value < condition.threshold;
      case 'gte': return value >= condition.threshold;
      case 'lte': return value <= condition.threshold;
      case 'eq': return value === condition.threshold;
      case 'ne': return value !== condition.threshold;
      default: return false;
    }
  }

  /**
   * Fire an alert
   */
  private fireAlert(rule: AlertRule, alertId: string): void {
    // Check silence
    const silence = this.silences.get(rule.name);
    if (silence && silence.until > new Date()) {
      logger.debug(`Alert ${rule.name} is silenced until ${silence.until}`);
      return;
    }

    const value = this.metrics.getValue(rule.condition.metric, rule.condition.labels);

    const alert: Alert = {
      id: alertId,
      name: rule.name,
      severity: rule.severity,
      status: 'firing',
      message: rule.description,
      source: rule.condition.metric,
      value,
      threshold: rule.condition.threshold,
      labels: { ...rule.labels },
      annotations: { ...rule.annotations },
      firedAt: new Date(),
      notificationsSent: 0,
    };

    this.activeAlerts.set(alertId, alert);
    this.alertHistory.push(alert);

    // Update metrics
    this.metrics.incCounter('alerts_fired_total', { rule: rule.name, severity: rule.severity });

    logger.warn(`🚨 Alert fired: ${rule.name}`, {
      severity: rule.severity,
      value,
      threshold: rule.condition.threshold,
    });

    // Send notifications
    this.sendNotifications(alert);

    this.emit('alert_fired', alert);
  }

  /**
   * Resolve an alert
   */
  private resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    alert.status = 'resolved';
    alert.resolvedAt = new Date();

    this.activeAlerts.delete(alertId);

    // Update metrics
    this.metrics.incCounter('alerts_resolved_total', { rule: alert.name });

    logger.info(`✅ Alert resolved: ${alert.name}`, {
      duration: alert.resolvedAt.getTime() - alert.firedAt.getTime(),
    });

    // Send resolution notification
    this.sendNotifications(alert, true);

    this.emit('alert_resolved', alert);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert || alert.status !== 'firing') return false;

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;

    logger.info(`Alert acknowledged: ${alert.name} by ${acknowledgedBy}`);
    this.emit('alert_acknowledged', alert);

    return true;
  }

  /**
   * Silence an alert rule
   */
  silenceRule(ruleName: string, durationMs?: number, reason?: string): void {
    const duration = durationMs || this.config.silenceDefaultDuration;
    const until = new Date(Date.now() + duration);

    this.silences.set(ruleName, { until, reason: reason || 'Manual silence' });

    logger.info(`Alert rule silenced: ${ruleName} until ${until.toISOString()}`);
    this.emit('rule_silenced', { ruleName, until, reason });
  }

  /**
   * Unsilence an alert rule
   */
  unsilenceRule(ruleName: string): void {
    this.silences.delete(ruleName);
    logger.info(`Alert rule unsilenced: ${ruleName}`);
  }

  /**
   * Send notifications for an alert
   */
  private async sendNotifications(alert: Alert, resolved: boolean = false): Promise<void> {
    const severityOrder: Record<AlertSeverity, number> = {
      info: 0,
      warning: 1,
      critical: 2,
      emergency: 3,
    };

    for (const [channelName, channel] of this.channels) {
      if (!channel.enabled) continue;
      if (severityOrder[alert.severity] < severityOrder[channel.minSeverity]) continue;

      try {
        await this.sendToChannel(channel, alert, resolved);
        alert.notificationsSent++;
        
        this.metrics.incCounter('alert_notifications_sent_total', { 
          channel: channelName, 
          severity: alert.severity,
        });
      } catch (error) {
        logger.error(`Failed to send notification to ${channelName}`, { error });
      }
    }
  }

  /**
   * Send to a specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel,
    alert: Alert,
    resolved: boolean
  ): Promise<void> {
    const status = resolved ? '✅ RESOLVED' : '🚨 FIRING';
    const color = resolved ? 'good' : (alert.severity === 'critical' ? 'danger' : 'warning');

    switch (channel.type) {
      case 'console':
        const logLevel = alert.severity === 'critical' || alert.severity === 'emergency' 
          ? logger.error.bind(logger)
          : logger.warn.bind(logger);
        
        logLevel(`[ALERT ${status}] ${alert.name}: ${alert.message}`, {
          severity: alert.severity,
          source: alert.source,
          value: alert.value,
          threshold: alert.threshold,
        });
        break;

      case 'webhook':
        await fetch(channel.config.url, {
          method: channel.config.method || 'POST',
          headers: channel.config.headers,
          body: JSON.stringify({
            status: resolved ? 'resolved' : 'firing',
            alert,
            timestamp: new Date().toISOString(),
          }),
        });
        break;

      case 'slack':
        await fetch(channel.config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: channel.config.channel,
            attachments: [{
              color,
              title: `${status} - ${alert.name}`,
              text: alert.message,
              fields: [
                { title: 'Severity', value: alert.severity, short: true },
                { title: 'Source', value: alert.source, short: true },
                { title: 'Value', value: String(alert.value ?? 'N/A'), short: true },
                { title: 'Threshold', value: String(alert.threshold ?? 'N/A'), short: true },
              ],
              ts: Math.floor(Date.now() / 1000),
            }],
          }),
        });
        break;

      case 'pagerduty':
        await fetch('https://events.pagerduty.com/v2/enqueue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            routing_key: channel.config.integrationKey,
            event_action: resolved ? 'resolve' : 'trigger',
            dedup_key: alert.id,
            payload: {
              summary: `${alert.name}: ${alert.message}`,
              severity: alert.severity === 'critical' ? 'critical' : 
                       alert.severity === 'warning' ? 'warning' : 'info',
              source: alert.source,
              custom_details: {
                value: alert.value,
                threshold: alert.threshold,
                labels: alert.labels,
              },
            },
          }),
        });
        break;
    }
  }

  /**
   * Update active alerts metric
   */
  private updateActiveAlertsMetric(): void {
    const countBySeverity: Record<AlertSeverity, number> = {
      info: 0,
      warning: 0,
      critical: 0,
      emergency: 0,
    };

    for (const alert of this.activeAlerts.values()) {
      countBySeverity[alert.severity]++;
    }

    for (const [severity, count] of Object.entries(countBySeverity)) {
      this.metrics.setGauge('alerts_active', count, { severity });
    }
  }

  /**
   * Generate alert ID
   */
  private generateAlertId(rule: AlertRule): string {
    const labelStr = rule.labels ? JSON.stringify(rule.labels) : '';
    return `${rule.name}-${labelStr}`;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Get alert statistics
   */
  getStatistics(): {
    activeCount: number;
    totalFired: number;
    totalResolved: number;
    avgResolutionTime: number;
    alertsByRule: Record<string, number>;
  } {
    let totalFired = 0;
    let totalResolved = 0;
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    const alertsByRule: Record<string, number> = {};

    for (const alert of this.alertHistory) {
      totalFired++;
      alertsByRule[alert.name] = (alertsByRule[alert.name] || 0) + 1;

      if (alert.resolvedAt) {
        totalResolved++;
        totalResolutionTime += alert.resolvedAt.getTime() - alert.firedAt.getTime();
        resolvedCount++;
      }
    }

    return {
      activeCount: this.activeAlerts.size,
      totalFired,
      totalResolved,
      avgResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
      alertsByRule,
    };
  }

  /**
   * Export rules
   */
  exportRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stop();
    this.rules.clear();
    this.activeAlerts.clear();
    this.channels.clear();
    this.pendingAlerts.clear();
    this.silences.clear();
    this.removeAllListeners();
  }
}

/**
 * Global instance
 */
let globalAlertManager: AlertManager | null = null;

export function getAlertManager(): AlertManager {
  if (!globalAlertManager) {
    globalAlertManager = new AlertManager();
  }
  return globalAlertManager;
}

export function resetAlertManager(): void {
  if (globalAlertManager) {
    globalAlertManager.destroy();
  }
  globalAlertManager = null;
}

export default AlertManager;

