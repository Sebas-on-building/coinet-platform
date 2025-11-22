/**
 * Alert Integration Service
 * Integrates quota alerts with external services (Slack, PagerDuty, etc.)
 */

import axios, { AxiosInstance } from 'axios';
import { QuotaAlert } from './quota-monitor.service';
import { logger } from '../utils/logger';

export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
}

export interface PagerDutyConfig {
  integrationKey: string;
  apiUrl?: string;
}

export interface AlertIntegrationConfig {
  slack?: SlackConfig;
  pagerduty?: PagerDutyConfig;
  enabled: boolean;
}

export class AlertIntegrationsService {
  private slackConfig?: SlackConfig;
  private pagerDutyConfig?: PagerDutyConfig;
  private enabled: boolean;
  private httpClient: AxiosInstance;

  constructor(config: AlertIntegrationConfig) {
    this.enabled = config.enabled;
    this.slackConfig = config.slack;
    this.pagerDutyConfig = config.pagerduty;

    this.httpClient = axios.create({
      timeout: 5000,
    });

    logger.info('Alert integrations service initialized', {
      enabled: this.enabled,
      slack: !!this.slackConfig,
      pagerduty: !!this.pagerDutyConfig,
    });
  }

  /**
   * Send alert to all configured integrations
   */
  async sendAlert(alert: QuotaAlert): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const promises: Promise<void>[] = [];

    if (this.slackConfig) {
      promises.push(this.sendSlackAlert(alert));
    }

    if (this.pagerDutyConfig) {
      promises.push(this.sendPagerDutyAlert(alert));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Send alert to Slack
   */
  private async sendSlackAlert(alert: QuotaAlert): Promise<void> {
    if (!this.slackConfig) {
      return;
    }

    try {
      const color = this.getSeverityColor(alert.severity);
      const emoji = this.getSeverityEmoji(alert.severity);

      const payload = {
        channel: this.slackConfig.channel,
        username: this.slackConfig.username || 'Coinet Quota Monitor',
        icon_emoji: this.slackConfig.iconEmoji || ':warning:',
        attachments: [
          {
            color,
            title: `${emoji} Quota Alert: ${alert.source.toUpperCase()}`,
            text: alert.message,
            fields: [
              {
                title: 'Severity',
                value: alert.severity.toUpperCase(),
                short: true,
              },
              {
                title: 'Source',
                value: alert.source,
                short: true,
              },
              {
                title: 'Timestamp',
                value: alert.timestamp.toISOString(),
                short: true,
              },
              ...(alert.usage.quotaUsed !== undefined && alert.usage.quotaLimit !== undefined
                ? [
                    {
                      title: 'Usage',
                      value: `${alert.usage.quotaUsed}/${alert.usage.quotaLimit}`,
                      short: true,
                    },
                  ]
                : []),
            ],
            footer: 'Coinet Market Prices Service',
            ts: Math.floor(alert.timestamp.getTime() / 1000),
          },
        ],
      };

      await this.httpClient.post(this.slackConfig.webhookUrl, payload);

      logger.debug('Slack alert sent', {
        source: alert.source,
        severity: alert.severity,
      });
    } catch (error) {
      logger.error('Failed to send Slack alert', {
        error: (error as Error).message,
        alert: alert.source,
      });
      // Don't throw - alert sending failures shouldn't break the service
    }
  }

  /**
   * Send alert to PagerDuty
   */
  private async sendPagerDutyAlert(alert: QuotaAlert): Promise<void> {
    if (!this.pagerDutyConfig) {
      return;
    }

    try {
      const severity = this.mapSeverityToPagerDuty(alert.severity);
      const apiUrl =
        this.pagerDutyConfig.apiUrl || 'https://events.pagerduty.com/v2/enqueue';

      const payload = {
        routing_key: this.pagerDutyConfig.integrationKey,
        event_action: severity === 'critical' ? 'trigger' : 'acknowledge',
        payload: {
          summary: `Quota Alert: ${alert.source} - ${alert.message}`,
          severity,
          source: 'coinet-market-prices',
          custom_details: {
            source: alert.source,
            message: alert.message,
            usage: alert.usage,
            timestamp: alert.timestamp.toISOString(),
          },
        },
      };

      await this.httpClient.post(apiUrl, payload);

      logger.debug('PagerDuty alert sent', {
        source: alert.source,
        severity: alert.severity,
      });
    } catch (error) {
      logger.error('Failed to send PagerDuty alert', {
        error: (error as Error).message,
        alert: alert.source,
      });
      // Don't throw - alert sending failures shouldn't break the service
    }
  }

  /**
   * Get color for Slack message based on severity
   */
  private getSeverityColor(severity: 'info' | 'warning' | 'critical'): string {
    switch (severity) {
      case 'critical':
        return 'danger'; // Red
      case 'warning':
        return 'warning'; // Yellow
      case 'info':
        return 'good'; // Green
      default:
        return '#36a64f';
    }
  }

  /**
   * Get emoji for Slack message based on severity
   */
  private getSeverityEmoji(severity: 'info' | 'warning' | 'critical'): string {
    switch (severity) {
      case 'critical':
        return ':rotating_light:';
      case 'warning':
        return ':warning:';
      case 'info':
        return ':information_source:';
      default:
        return ':bell:';
    }
  }

  /**
   * Map severity to PagerDuty severity levels
   */
  private mapSeverityToPagerDuty(
    severity: 'info' | 'warning' | 'critical'
  ): 'critical' | 'error' | 'warning' | 'info' {
    switch (severity) {
      case 'critical':
        return 'critical';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'info';
    }
  }

  /**
   * Test Slack integration
   */
  async testSlack(): Promise<boolean> {
    if (!this.slackConfig) {
      return false;
    }

    const testAlert: QuotaAlert = {
      source: 'test' as any,
      severity: 'info',
      message: 'Test alert from Coinet Market Prices Service',
      timestamp: new Date(),
      usage: {
        source: 'test' as any,
        timestamp: new Date(),
        requestsMade: 0,
      },
    };

    try {
      await this.sendSlackAlert(testAlert);
      return true;
    } catch (error) {
      logger.error('Slack test failed', { error });
      return false;
    }
  }

  /**
   * Test PagerDuty integration
   */
  async testPagerDuty(): Promise<boolean> {
    if (!this.pagerDutyConfig) {
      return false;
    }

    const testAlert: QuotaAlert = {
      source: 'test' as any,
      severity: 'info',
      message: 'Test alert from Coinet Market Prices Service',
      timestamp: new Date(),
      usage: {
        source: 'test' as any,
        timestamp: new Date(),
        requestsMade: 0,
      },
    };

    try {
      await this.sendPagerDutyAlert(testAlert);
      return true;
    } catch (error) {
      logger.error('PagerDuty test failed', { error });
      return false;
    }
  }
}

// Singleton instance
let alertIntegrationsInstance: AlertIntegrationsService | null = null;

export function getAlertIntegrations(
  config?: AlertIntegrationConfig
): AlertIntegrationsService {
  if (!alertIntegrationsInstance && config) {
    alertIntegrationsInstance = new AlertIntegrationsService(config);
  }

  if (!alertIntegrationsInstance) {
    throw new Error(
      'Alert integrations not initialized. Provide config on first call.'
    );
  }

  return alertIntegrationsInstance;
}

export function resetAlertIntegrations(): void {
  alertIntegrationsInstance = null;
}

export default getAlertIntegrations;

