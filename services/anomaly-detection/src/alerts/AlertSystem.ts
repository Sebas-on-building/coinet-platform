/**
 * Alert System
 * Real-time alert and notification system for anomaly detection
 */

import { EventEmitter } from 'events';
import {
  Anomaly,
  AnomalyType,
  AnomalySeverity,
  AlertChannel,
  AlertLevel
} from '../core/types';

export interface Alert {
  id: string;
  timestamp: Date;
  level: AlertLevel;
  title: string;
  message: string;
  anomaly: Anomaly;
  channels: AlertChannel[];
  metadata: Record<string, unknown>;
  status: 'pending' | 'sent' | 'failed' | 'acknowledged';
  sentAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  condition: (_anomaly: Anomaly) => boolean;
  level: AlertLevel;
  channels: AlertChannel[];
  throttle?: number; // milliseconds between alerts
  maxAlertsPerHour?: number;
}

export interface NotificationConfig {
  channels: {
    email?: {
      enabled: boolean;
      recipients: string[];
      smtp?: unknown;
    };
    sms?: {
      enabled: boolean;
      phoneNumbers: string[];
      provider?: string;
    };
    webhook?: {
      enabled: boolean;
      urls: string[];
      headers?: Record<string, string>;
    };
    slack?: {
      enabled: boolean;
      webhookUrl: string;
      channel?: string;
    };
    telegram?: {
      enabled: boolean;
      botToken: string;
      chatIds: string[];
    };
  };
  defaultChannels: AlertChannel[];
  rateLimits: {
    maxAlertsPerMinute: number;
    maxAlertsPerHour: number;
  };
}

export class AlertSystem extends EventEmitter {
  private alerts: Map<string, Alert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private config: NotificationConfig;
  private alertCounts: Map<string, number[]> = new Map(); // For throttling
  private lastAlertTime: Map<string, number> = new Map();

  constructor(config: NotificationConfig) {
    super();
    this.config = config;
    this.initializeDefaultRules();
  }

  /**
   * Process anomaly and generate alerts
   */
  async processAnomaly(anomaly: Anomaly): Promise<Alert[]> {
    const generatedAlerts: Alert[] = [];

    // Check each rule
    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      if (rule.condition(anomaly)) {
        // Check throttling
        if (this.isThrottled(ruleId, rule)) {
          continue;
        }

        // Create alert
        const alert = await this.createAlert(anomaly, rule);
        generatedAlerts.push(alert);

        // Send alert
        await this.sendAlert(alert);

        // Update throttling
        this.updateThrottling(ruleId);
      }
    }

    return generatedAlerts;
  }

  /**
   * Create alert from anomaly
   */
  private async createAlert(anomaly: Anomaly, rule: AlertRule): Promise<Alert> {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level: rule.level,
      title: this.generateAlertTitle(anomaly),
      message: this.generateAlertMessage(anomaly),
      anomaly,
      channels: rule.channels,
      metadata: {
        ruleId: rule.id,
        ruleName: rule.name,
        anomalyId: anomaly.id
      },
      status: 'pending'
    };

    this.alerts.set(alert.id, alert);
    this.emit('alert_created', alert);

    return alert;
  }

  /**
   * Send alert through configured channels
   */
  private async sendAlert(alert: Alert): Promise<void> {
    const sendPromises: Promise<void>[] = [];

    for (const channel of alert.channels) {
      switch (channel) {
        case AlertChannel.EMAIL:
          sendPromises.push(this.sendEmail(alert));
          break;
        case AlertChannel.SMS:
          sendPromises.push(this.sendSMS(alert));
          break;
        case AlertChannel.WEBHOOK:
          sendPromises.push(this.sendWebhook(alert));
          break;
        case AlertChannel.SLACK:
          sendPromises.push(this.sendSlack(alert));
          break;
        case AlertChannel.TELEGRAM:
          sendPromises.push(this.sendTelegram(alert));
          break;
        case AlertChannel.PUSH:
          sendPromises.push(this.sendPush(alert));
          break;
        case AlertChannel.IN_APP:
          sendPromises.push(this.sendInApp(alert));
          break;
      }
    }

    try {
      await Promise.all(sendPromises);
      alert.status = 'sent';
      alert.sentAt = new Date();
      this.emit('alert_sent', alert);
    } catch (error) {
      alert.status = 'failed';
      this.emit('alert_failed', { alert, error });
    }
  }

  /**
   * Send email alert
   */
  private async sendEmail(alert: Alert): Promise<void> {
    const config = this.config.channels.email;
    if (!config?.enabled) return;

    const emailContent = {
      subject: `[${alert.level}] ${alert.title}`,
      to: config.recipients,
      body: this.formatEmailBody(alert)
    };

    // Emit event for email service to handle
    this.emit('send_email', emailContent);
    
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    // console.log(`📧 Email alert sent: ${alert.title}`);
  }

  /**
   * Send SMS alert
   */
  private async sendSMS(alert: Alert): Promise<void> {
    const config = this.config.channels.sms;
    if (!config?.enabled) return;

    const smsContent = {
      to: config.phoneNumbers,
      body: this.formatSMSBody(alert)
    };

    this.emit('send_sms', smsContent);
    
    // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
    // console.log(`📱 SMS alert sent: ${alert.title}`);
  }

  /**
   * Send webhook alert
   */
  private async sendWebhook(alert: Alert): Promise<void> {
    const config = this.config.channels.webhook;
    if (!config?.enabled) return;

    const payload = {
      alert: {
        id: alert.id,
        timestamp: alert.timestamp,
        level: alert.level,
        title: alert.title,
        message: alert.message
      },
      anomaly: {
        id: alert.anomaly.id,
        type: alert.anomaly.type,
        severity: alert.anomaly.severity,
        source: alert.anomaly.source,
        score: alert.anomaly.score,
        deviation: alert.anomaly.deviation,
        suggestedActions: alert.anomaly.suggestedActions
      }
    };

    this.emit('send_webhook', { urls: config.urls, payload });
    
    // In production, make HTTP POST requests to webhook URLs
    // console.log(`🔗 Webhook alert sent to ${config.urls.length} endpoints`);
  }

  /**
   * Send Slack alert
   */
  private async sendSlack(alert: Alert): Promise<void> {
    const config = this.config.channels.slack;
    if (!config?.enabled) return;

    const slackMessage = {
      channel: config.channel || '#alerts',
      text: alert.title,
      attachments: [
        {
          color: this.getSlackColor(alert.level),
          title: alert.title,
          text: alert.message,
          fields: [
            {
              title: 'Severity',
              value: alert.anomaly.severity,
              short: true
            },
            {
              title: 'Type',
              value: alert.anomaly.type,
              short: true
            },
            {
              title: 'Source',
              value: alert.anomaly.source,
              short: true
            },
            {
              title: 'Score',
              value: alert.anomaly.score.toFixed(3),
              short: true
            }
          ],
          footer: 'Anomaly Detection System',
          ts: Math.floor(alert.timestamp.getTime() / 1000)
        }
      ]
    };

    this.emit('send_slack', { webhookUrl: config.webhookUrl, message: slackMessage });
    
    // console.log(`💬 Slack alert sent`);
  }

  /**
   * Send Telegram alert
   */
  private async sendTelegram(alert: Alert): Promise<void> {
    const config = this.config.channels.telegram;
    if (!config?.enabled) return;

    const message = this.formatTelegramMessage(alert);

    this.emit('send_telegram', {
      botToken: config.botToken,
      chatIds: config.chatIds,
      message
    });

    // console.log(`✈️ Telegram alert sent`);
  }

  /**
   * Send push notification
   */
  private async sendPush(alert: Alert): Promise<void> {
    const pushContent = {
      title: alert.title,
      body: alert.message,
      data: {
        alertId: alert.id,
        anomalyId: alert.anomaly.id,
        level: alert.level
      }
    };

    this.emit('send_push', pushContent);
    
    // console.log(`🔔 Push notification sent`);
  }

  /**
   * Send in-app alert
   */
  private async sendInApp(alert: Alert): Promise<void> {
    // Store in database or cache for in-app display
    this.emit('send_in_app', alert);
    
    // console.log(`📲 In-app alert created`);
  }

  /**
   * Generate alert title
   */
  private generateAlertTitle(_anomaly: Anomaly): string {
    const symbol = _anomaly.dataPoint.symbol || _anomaly.dataPoint.chain || 'System';
    const emoji = this.getEmojiForType(_anomaly.type);
    
    return `${emoji} ${_anomaly.type.toUpperCase()}: ${_anomaly.source} anomaly detected for ${symbol}`;
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(_anomaly: Anomaly): string {
    const parts: string[] = [];

    // Basic info
    parts.push(`Anomaly Score: ${(_anomaly.score * 100).toFixed(1)}%`);
    parts.push(`Severity: ${_anomaly.severity}`);
    parts.push(`Deviation: ${_anomaly.deviation.standardDeviations.toFixed(2)}σ (${_anomaly.deviation.relativeDifference.toFixed(1)}%)`);

    // Classification
    if (_anomaly.classification) {
      parts.push(`\nClassification: ${_anomaly.classification.primaryCategory}`);
      if (_anomaly.classification.reasoning.length > 0) {
        parts.push(`Reasoning: ${_anomaly.classification.reasoning[0]}`);
      }
    }

    // Context
    if (_anomaly.context.marketConditions) {
      parts.push(`\nMarket: ${_anomaly.context.marketConditions.trend} trend, ${_anomaly.context.marketConditions.volatility.toFixed(2)} volatility`);
    }

    // Correlated events
    if (_anomaly.context.correlatedEvents.length > 0) {
      parts.push(`\nCorrelated Events: ${_anomaly.context.correlatedEvents.length}`);
    }

    // Top suggested actions
    if (_anomaly.suggestedActions.length > 0) {
      parts.push('\nSuggested Actions:');
      const topActions = _anomaly.suggestedActions.slice(0, 3);
      topActions.forEach((action, i) => {
        parts.push(`${i + 1}. [${action.priority.toUpperCase()}] ${action.description}`);
      });
    }

    return parts.join('\n');
  }

  /**
   * Format email body
   */
  private formatEmailBody(alert: Alert): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: ${this.getColorForLevel(alert.level)}; color: white; padding: 20px; }
    .content { padding: 20px; }
    .section { margin-bottom: 20px; }
    .label { font-weight: bold; }
    .action { background-color: #f4f4f4; padding: 10px; margin: 5px 0; border-left: 3px solid #007bff; }
  </style>
</head>
<body>
  <div class="header">
    <h2>${alert.title}</h2>
  </div>
  <div class="content">
    <div class="section">
      <p>${alert.message.replace(/\n/g, '<br>')}</p>
    </div>
    <div class="section">
      <p><span class="label">Alert ID:</span> ${alert.id}</p>
      <p><span class="label">Timestamp:</span> ${alert.timestamp.toISOString()}</p>
      <p><span class="label">Level:</span> ${alert.level}</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Format SMS body (short version)
   */
  private formatSMSBody(alert: Alert): string {
    return `[${alert.level}] ${alert.title}. Score: ${(alert.anomaly.score * 100).toFixed(0)}%. ${alert.anomaly.suggestedActions[0]?.description || 'Review immediately.'}`;
  }

  /**
   * Format Telegram message
   */
  private formatTelegramMessage(alert: Alert): string {
    const emoji = this.getEmojiForType(alert.anomaly.type);
    return `
${emoji} *${alert.title}*

📊 *Details:*
• Score: ${(alert.anomaly.score * 100).toFixed(1)}%
• Severity: ${alert.anomaly.severity}
• Deviation: ${alert.anomaly.deviation.standardDeviations.toFixed(2)}σ

${alert.anomaly.suggestedActions.length > 0 ? `\n🎯 *Top Action:*\n${alert.anomaly.suggestedActions[0].description}` : ''}

_Timestamp: ${alert.timestamp.toISOString()}_
    `.trim();
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    // Critical anomalies
    this.addRule({
      id: 'critical_anomalies',
      name: 'Critical Anomalies',
      enabled: true,
      condition: (a) => a.type === AnomalyType.CRITICAL,
      level: AlertLevel.CRITICAL,
      channels: [AlertChannel.EMAIL, AlertChannel.SMS, AlertChannel.SLACK, AlertChannel.PUSH],
      throttle: 0 // No throttling for critical
    });

    // High severity threats
    this.addRule({
      id: 'high_severity_threats',
      name: 'High Severity Threats',
      enabled: true,
      condition: (a) => 
        a.type === AnomalyType.EMERGING_THREAT &&
        a.severity >= AnomalySeverity.HIGH,
      level: AlertLevel.ERROR,
      channels: [AlertChannel.EMAIL, AlertChannel.SLACK, AlertChannel.PUSH],
      throttle: 300000, // 5 minutes
      maxAlertsPerHour: 10
    });

    // Trading opportunities
    this.addRule({
      id: 'trading_opportunities',
      name: 'Trading Opportunities',
      enabled: true,
      condition: (a) => a.type === AnomalyType.OPPORTUNITY,
      level: AlertLevel.WARNING,
      channels: [AlertChannel.WEBHOOK, AlertChannel.IN_APP, AlertChannel.PUSH],
      throttle: 600000, // 10 minutes
      maxAlertsPerHour: 20
    });

    // General anomalies
    this.addRule({
      id: 'general_anomalies',
      name: 'General Anomalies',
      enabled: true,
      condition: (a) => a.severity >= AnomalySeverity.MEDIUM,
      level: AlertLevel.INFO,
      channels: [AlertChannel.IN_APP, AlertChannel.WEBHOOK],
      throttle: 900000, // 15 minutes
      maxAlertsPerHour: 30
    });
  }

  /**
   * Check if alert should be throttled
   */
  private isThrottled(ruleId: string, rule: AlertRule): boolean {
    const now = Date.now();

    // Check time-based throttle
    if (rule.throttle) {
      const lastAlert = this.lastAlertTime.get(ruleId);
      if (lastAlert && now - lastAlert < rule.throttle) {
        return true;
      }
    }

    // Check count-based throttle
    if (rule.maxAlertsPerHour) {
      const counts = this.alertCounts.get(ruleId) || [];
      const hourAgo = now - 3600000;
      const recentCounts = counts.filter(t => t > hourAgo);
      
      if (recentCounts.length >= rule.maxAlertsPerHour) {
        return true;
      }
    }

    return false;
  }

  /**
   * Update throttling counters
   */
  private updateThrottling(ruleId: string): void {
    const now = Date.now();
    
    this.lastAlertTime.set(ruleId, now);
    
    const counts = this.alertCounts.get(ruleId) || [];
    counts.push(now);
    
    // Keep only last hour
    const hourAgo = now - 3600000;
    this.alertCounts.set(ruleId, counts.filter(t => t > hourAgo));
  }

  /**
   * Helper methods
   */
  private getEmojiForType(type: AnomalyType): string {
    const emojiMap = {
      [AnomalyType.CRITICAL]: '🚨',
      [AnomalyType.EMERGING_THREAT]: '⚠️',
      [AnomalyType.OPPORTUNITY]: '✨',
      [AnomalyType.BENIGN]: 'ℹ️'
    };
    return emojiMap[type] || 'ℹ️';
  }

  private getColorForLevel(level: AlertLevel): string {
    const colorMap = {
      [AlertLevel.INFO]: '#17a2b8',
      [AlertLevel.WARNING]: '#ffc107',
      [AlertLevel.ERROR]: '#dc3545',
      [AlertLevel.CRITICAL]: '#8b0000'
    };
    return colorMap[level];
  }

  private getSlackColor(level: AlertLevel): string {
    const colorMap = {
      [AlertLevel.INFO]: '#36a64f',
      [AlertLevel.WARNING]: '#ff9800',
      [AlertLevel.ERROR]: '#f44336',
      [AlertLevel.CRITICAL]: '#b71c1c'
    };
    return colorMap[level];
  }

  /**
   * Public API methods
   */

  addRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
  }

  removeRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
  }

  enableRule(ruleId: string): void {
    const rule = this.alertRules.get(ruleId);
    if (rule) rule.enabled = true;
  }

  disableRule(ruleId: string): void {
    const rule = this.alertRules.get(ruleId);
    if (rule) rule.enabled = false;
  }

  acknowledgeAlert(alertId: string, acknowledgedBy: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.status = 'acknowledged';
      alert.acknowledgedAt = new Date();
      alert.acknowledgedBy = acknowledgedBy;
      this.emit('alert_acknowledged', alert);
    }
  }

  getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  getRecentAlerts(limit: number = 100): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getAlertsByLevel(level: AlertLevel, limit: number = 100): Alert[] {
    return Array.from(this.alerts.values())
      .filter(a => a.level === level)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getUnacknowledgedAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter(a => a.status !== 'acknowledged');
  }

  clearOldAlerts(olderThanHours: number = 24): number {
    const cutoff = Date.now() - (olderThanHours * 3600000);
    let cleared = 0;

    for (const [id, alert] of this.alerts) {
      if (alert.timestamp.getTime() < cutoff) {
        this.alerts.delete(id);
        cleared++;
      }
    }

    return cleared;
  }
}

