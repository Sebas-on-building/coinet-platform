/**
 * ============================================
 * NOTIFICATION CHANNEL CONFIGURATION
 * ============================================
 * 
 * Enterprise-grade notification channels:
 * - Slack integration
 * - PagerDuty integration
 * - Webhook support
 * - Email (future)
 * 
 * Configure via environment variables for each channel.
 */

import { logger } from '../utils/logger';
import { NotificationChannel, AlertSeverity } from './alert-manager';

/**
 * Slack notification configuration
 */
export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
  mentionUsers?: string[];    // User IDs to mention on critical alerts
  mentionGroups?: string[];   // Group IDs to mention on emergency alerts
}

/**
 * PagerDuty notification configuration
 */
export interface PagerDutyConfig {
  integrationKey: string;      // Events API v2 integration key
  serviceId?: string;          // Service ID for routing
  escalationPolicy?: string;   // Escalation policy ID
  severity?: 'critical' | 'error' | 'warning' | 'info';
}

/**
 * Webhook notification configuration
 */
export interface WebhookConfig {
  url: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
  authToken?: string;          // Bearer token
  timeout?: number;            // Request timeout in ms
}

/**
 * Email notification configuration
 */
export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromAddress: string;
  toAddresses: string[];
  useTLS?: boolean;
}

/**
 * Build Slack notification channel from environment
 */
export function buildSlackChannel(): NotificationChannel | null {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  if (!webhookUrl) {
    logger.debug('Slack notifications not configured (SLACK_WEBHOOK_URL not set)');
    return null;
  }

  const config: SlackConfig = {
    webhookUrl,
    channel: process.env.SLACK_CHANNEL || '#alerts',
    username: process.env.SLACK_USERNAME || 'Coinet Alert Bot',
    iconEmoji: process.env.SLACK_ICON_EMOJI || ':warning:',
    mentionUsers: process.env.SLACK_MENTION_USERS?.split(',').filter(Boolean),
    mentionGroups: process.env.SLACK_MENTION_GROUPS?.split(',').filter(Boolean),
  };

  return {
    name: 'slack',
    type: 'slack',
    config,
    enabled: true,
    minSeverity: (process.env.SLACK_MIN_SEVERITY as AlertSeverity) || 'warning',
  };
}

/**
 * Build PagerDuty notification channel from environment
 */
export function buildPagerDutyChannel(): NotificationChannel | null {
  const integrationKey = process.env.PAGERDUTY_INTEGRATION_KEY;
  
  if (!integrationKey) {
    logger.debug('PagerDuty notifications not configured (PAGERDUTY_INTEGRATION_KEY not set)');
    return null;
  }

  const config: PagerDutyConfig = {
    integrationKey,
    serviceId: process.env.PAGERDUTY_SERVICE_ID,
    escalationPolicy: process.env.PAGERDUTY_ESCALATION_POLICY,
  };

  return {
    name: 'pagerduty',
    type: 'pagerduty',
    config,
    enabled: true,
    minSeverity: (process.env.PAGERDUTY_MIN_SEVERITY as AlertSeverity) || 'critical',
  };
}

/**
 * Build webhook notification channel from environment
 */
export function buildWebhookChannel(): NotificationChannel | null {
  const url = process.env.ALERT_WEBHOOK_URL;
  
  if (!url) {
    logger.debug('Webhook notifications not configured (ALERT_WEBHOOK_URL not set)');
    return null;
  }

  const config: WebhookConfig = {
    url,
    method: (process.env.ALERT_WEBHOOK_METHOD as 'POST' | 'PUT') || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.ALERT_WEBHOOK_AUTH_TOKEN && {
        'Authorization': `Bearer ${process.env.ALERT_WEBHOOK_AUTH_TOKEN}`,
      }),
    },
    timeout: parseInt(process.env.ALERT_WEBHOOK_TIMEOUT || '5000', 10),
  };

  return {
    name: 'webhook',
    type: 'webhook',
    config,
    enabled: true,
    minSeverity: (process.env.ALERT_WEBHOOK_MIN_SEVERITY as AlertSeverity) || 'warning',
  };
}

/**
 * Build all configured notification channels
 */
export function buildNotificationChannels(): NotificationChannel[] {
  const channels: NotificationChannel[] = [];

  // Console (always enabled)
  channels.push({
    name: 'console',
    type: 'console',
    config: {},
    enabled: true,
    minSeverity: 'info',
  });

  // Slack
  const slackChannel = buildSlackChannel();
  if (slackChannel) {
    channels.push(slackChannel);
    logger.info('Slack notification channel configured', {
      channel: slackChannel.config.channel,
      minSeverity: slackChannel.minSeverity,
    });
  }

  // PagerDuty
  const pagerDutyChannel = buildPagerDutyChannel();
  if (pagerDutyChannel) {
    channels.push(pagerDutyChannel);
    logger.info('PagerDuty notification channel configured', {
      minSeverity: pagerDutyChannel.minSeverity,
    });
  }

  // Webhook
  const webhookChannel = buildWebhookChannel();
  if (webhookChannel) {
    channels.push(webhookChannel);
    logger.info('Webhook notification channel configured', {
      url: webhookChannel.config.url,
      minSeverity: webhookChannel.minSeverity,
    });
  }

  return channels;
}

/**
 * Format alert for Slack
 */
export function formatSlackAlert(
  alert: { name: string; severity: string; message: string; source: string; value?: number; threshold?: number },
  resolved: boolean = false
): object {
  const status = resolved ? 'RESOLVED' : 'FIRING';
  const emoji = resolved ? ':white_check_mark:' : (
    alert.severity === 'critical' || alert.severity === 'emergency' 
      ? ':rotating_light:' 
      : ':warning:'
  );
  const color = resolved ? 'good' : (
    alert.severity === 'critical' || alert.severity === 'emergency'
      ? 'danger'
      : 'warning'
  );

  return {
    attachments: [{
      color,
      fallback: `${status}: ${alert.name} - ${alert.message}`,
      pretext: `${emoji} Alert ${status}`,
      title: alert.name,
      text: alert.message,
      fields: [
        { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
        { title: 'Source', value: alert.source, short: true },
        ...(alert.value !== undefined ? [{ title: 'Value', value: String(alert.value), short: true }] : []),
        ...(alert.threshold !== undefined ? [{ title: 'Threshold', value: String(alert.threshold), short: true }] : []),
      ],
      footer: 'Coinet Market Prices',
      ts: Math.floor(Date.now() / 1000),
    }],
  };
}

/**
 * Format alert for PagerDuty Events API v2
 */
export function formatPagerDutyAlert(
  alert: { 
    id: string;
    name: string; 
    severity: string; 
    message: string; 
    source: string; 
    value?: number; 
    threshold?: number;
    labels?: Record<string, string>;
  },
  integrationKey: string,
  resolved: boolean = false
): object {
  const pdSeverity = {
    info: 'info',
    warning: 'warning',
    critical: 'critical',
    emergency: 'critical',
  }[alert.severity] || 'warning';

  return {
    routing_key: integrationKey,
    event_action: resolved ? 'resolve' : 'trigger',
    dedup_key: alert.id,
    payload: {
      summary: `[${alert.severity.toUpperCase()}] ${alert.name}: ${alert.message}`,
      severity: pdSeverity,
      source: alert.source,
      component: 'market-prices',
      group: 'coinet',
      class: alert.name,
      custom_details: {
        value: alert.value,
        threshold: alert.threshold,
        labels: alert.labels,
        timestamp: new Date().toISOString(),
      },
    },
    links: [
      {
        href: 'https://railway.app/dashboard',
        text: 'Railway Dashboard',
      },
    ],
  };
}

/**
 * Send Slack notification
 */
export async function sendSlackNotification(
  config: SlackConfig,
  alert: { name: string; severity: string; message: string; source: string; value?: number; threshold?: number },
  resolved: boolean = false
): Promise<boolean> {
  try {
    const payload = formatSlackAlert(alert, resolved);

    // Add mentions for critical/emergency alerts
    if (!resolved && (alert.severity === 'critical' || alert.severity === 'emergency')) {
      const mentions: string[] = [];
      
      if (config.mentionUsers?.length) {
        mentions.push(...config.mentionUsers.map(u => `<@${u}>`));
      }
      if (config.mentionGroups?.length) {
        mentions.push(...config.mentionGroups.map(g => `<!subteam^${g}>`));
      }
      
      if (mentions.length) {
        (payload as any).text = mentions.join(' ') + ' ';
      }
    }

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      logger.warn('Slack notification failed', {
        status: response.status,
        statusText: response.statusText,
      });
      return false;
    }

    logger.debug('Slack notification sent', { alert: alert.name, resolved });
    return true;
  } catch (error: any) {
    logger.error('Failed to send Slack notification', { error: error.message });
    return false;
  }
}

/**
 * Send PagerDuty notification
 */
export async function sendPagerDutyNotification(
  config: PagerDutyConfig,
  alert: { 
    id: string;
    name: string; 
    severity: string; 
    message: string; 
    source: string; 
    value?: number; 
    threshold?: number;
    labels?: Record<string, string>;
  },
  resolved: boolean = false
): Promise<boolean> {
  try {
    const payload = formatPagerDutyAlert(alert, config.integrationKey, resolved);

    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn('PagerDuty notification failed', {
        status: response.status,
        error: errorText,
      });
      return false;
    }

    const result = await response.json();
    logger.debug('PagerDuty notification sent', { 
      alert: alert.name, 
      resolved,
      dedupKey: result.dedup_key,
    });
    return true;
  } catch (error: any) {
    logger.error('Failed to send PagerDuty notification', { error: error.message });
    return false;
  }
}

/**
 * Send webhook notification
 */
export async function sendWebhookNotification(
  config: WebhookConfig,
  alert: { 
    id?: string;
    name: string; 
    severity: string; 
    message: string; 
    source: string; 
    value?: number; 
    threshold?: number;
    labels?: Record<string, string>;
  },
  resolved: boolean = false
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || 5000);

    const payload = {
      status: resolved ? 'resolved' : 'firing',
      alert: {
        id: alert.id,
        name: alert.name,
        severity: alert.severity,
        message: alert.message,
        source: alert.source,
        value: alert.value,
        threshold: alert.threshold,
        labels: alert.labels,
      },
      timestamp: new Date().toISOString(),
      service: 'market-prices',
    };

    const response = await fetch(config.url, {
      method: config.method || 'POST',
      headers: config.headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn('Webhook notification failed', {
        status: response.status,
        url: config.url,
      });
      return false;
    }

    logger.debug('Webhook notification sent', { alert: alert.name, resolved });
    return true;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      logger.warn('Webhook notification timeout', { url: config.url });
    } else {
      logger.error('Failed to send webhook notification', { error: error.message });
    }
    return false;
  }
}

export default {
  buildNotificationChannels,
  sendSlackNotification,
  sendPagerDutyNotification,
  sendWebhookNotification,
};

