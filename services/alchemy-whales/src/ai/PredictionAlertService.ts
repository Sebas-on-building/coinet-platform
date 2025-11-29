/**
 * ============================================
 * PREDICTION ALERT SERVICE
 * ============================================
 * 
 * Sends whale prediction alerts via multiple channels:
 * - Telegram (primary)
 * - Discord
 * - Slack
 * - Email
 * - Webhooks
 * 
 * Features:
 * - Beautiful formatted messages
 * - Rate limiting
 * - Priority-based delivery
 * - Alert deduplication
 */

import { EventEmitter } from 'events';
import { Telegraf } from 'telegraf';
import axios from 'axios';
import { createLogger } from '../utils/logger';
import { WhalePrediction } from './WhalePredictor';
import { ShadowAlert, TrackedWhale } from './WhaleShadowMode';
import { WhaleTier } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface AlertServiceConfig {
  // Telegram
  telegramEnabled: boolean;
  telegramBotToken?: string;
  telegramChatIds?: string[];
  
  // Discord
  discordEnabled: boolean;
  discordWebhookUrl?: string;
  
  // Slack
  slackEnabled: boolean;
  slackWebhookUrl?: string;
  
  // Custom Webhook
  webhookEnabled: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
  
  // Rate limiting
  minAlertIntervalMs: number;
  maxAlertsPerHour: number;
  
  // Filtering
  minSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  minProbability: number;
}

export interface AlertDeliveryResult {
  channel: 'telegram' | 'discord' | 'slack' | 'webhook';
  success: boolean;
  error?: string;
  timestamp: Date;
}

export interface AlertStats {
  totalSent: number;
  successRate: number;
  byChannel: Record<string, { sent: number; failed: number }>;
  lastAlertTime: Date | null;
  alertsThisHour: number;
  deduplicated: number;
}

const DEFAULT_CONFIG: AlertServiceConfig = {
  telegramEnabled: false,
  discordEnabled: false,
  slackEnabled: false,
  webhookEnabled: false,
  minAlertIntervalMs: 30000, // 30 seconds
  maxAlertsPerHour: 60,
  minSeverity: 'MEDIUM',
  minProbability: 0.7,
};

const SEVERITY_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// =============================================================================
// MAIN CLASS
// =============================================================================

export class PredictionAlertService extends EventEmitter {
  private logger: any;
  private config: AlertServiceConfig;
  
  // Clients
  private telegramBot: Telegraf | null = null;
  
  // Rate limiting
  private recentAlerts: Map<string, number> = new Map();
  private alertsThisHour: number = 0;
  private hourStartTime: number = Date.now();
  
  // Stats
  private stats: AlertStats = {
    totalSent: 0,
    successRate: 100,
    byChannel: {
      telegram: { sent: 0, failed: 0 },
      discord: { sent: 0, failed: 0 },
      slack: { sent: 0, failed: 0 },
      webhook: { sent: 0, failed: 0 },
    },
    lastAlertTime: null,
    alertsThisHour: 0,
    deduplicated: 0,
  };

  constructor(config?: Partial<AlertServiceConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = createLogger({ component: 'PredictionAlertService' });

    this.initializeClients();

    this.logger.info('PredictionAlertService initialized', {
      telegram: this.config.telegramEnabled,
      discord: this.config.discordEnabled,
      slack: this.config.slackEnabled,
      webhook: this.config.webhookEnabled,
    });
  }

  /**
   * Initialize notification clients
   */
  private initializeClients(): void {
    // Initialize Telegram
    if (this.config.telegramEnabled && this.config.telegramBotToken) {
      try {
        this.telegramBot = new Telegraf(this.config.telegramBotToken);
        this.logger.debug('Telegram bot initialized');
      } catch (error: any) {
        this.logger.warn('Failed to initialize Telegram', { error: error.message });
      }
    }
  }

  // ===========================================================================
  // ALERT SENDING
  // ===========================================================================

  /**
   * Send shadow alert
   */
  async sendShadowAlert(alert: ShadowAlert): Promise<AlertDeliveryResult[]> {
    // Check severity filter
    if (!this.meetsMinSeverity(alert.severity)) {
      this.logger.debug('Alert filtered by severity', { severity: alert.severity });
      return [];
    }

    // Check probability filter
    if (alert.prediction.probability < this.config.minProbability) {
      this.logger.debug('Alert filtered by probability', { probability: alert.prediction.probability });
      return [];
    }

    // Check rate limiting
    if (!this.checkRateLimit(alert.id)) {
      this.stats.deduplicated++;
      return [];
    }

    // Format messages
    const telegramMessage = this.formatTelegramMessage(alert);
    const discordMessage = this.formatDiscordMessage(alert);
    const slackMessage = this.formatSlackMessage(alert);
    const webhookPayload = this.formatWebhookPayload(alert);

    // Send to all enabled channels
    const results: AlertDeliveryResult[] = [];

    if (this.config.telegramEnabled && this.telegramBot && this.config.telegramChatIds) {
      for (const chatId of this.config.telegramChatIds) {
        const result = await this.sendTelegram(chatId, telegramMessage);
        results.push(result);
      }
    }

    if (this.config.discordEnabled && this.config.discordWebhookUrl) {
      const result = await this.sendDiscord(discordMessage);
      results.push(result);
    }

    if (this.config.slackEnabled && this.config.slackWebhookUrl) {
      const result = await this.sendSlack(slackMessage);
      results.push(result);
    }

    if (this.config.webhookEnabled && this.config.webhookUrl) {
      const result = await this.sendWebhook(webhookPayload);
      results.push(result);
    }

    // Update stats
    this.updateStats(results);

    this.emit('alert_sent', { alert, results });
    return results;
  }

  /**
   * Send prediction alert
   */
  async sendPredictionAlert(
    prediction: WhalePrediction,
    whale?: TrackedWhale
  ): Promise<AlertDeliveryResult[]> {
    // Create shadow alert wrapper
    const alert: ShadowAlert = {
      id: `pred-${Date.now()}`,
      whale: whale || {
        address: prediction.address,
        chain: prediction.chain,
        tier: WhaleTier.WHALE,
        addedAt: new Date(),
        lastActivityAt: new Date(),
        totalValueTracked: 0,
        transferCount: 0,
        accuracy: 0,
        isActive: true,
        tags: [],
      },
      prediction,
      alertType: 'IMMINENT_MOVE',
      severity: prediction.probability > 0.9 ? 'CRITICAL' :
                prediction.probability > 0.8 ? 'HIGH' :
                prediction.probability > 0.7 ? 'MEDIUM' : 'LOW',
      message: `Whale ${prediction.address.slice(0, 10)}... predicted to ${prediction.predictedAction}`,
      recommendation: prediction.reasoning.join('. '),
      createdAt: new Date(),
      acknowledged: false,
    };

    return this.sendShadowAlert(alert);
  }

  // ===========================================================================
  // CHANNEL-SPECIFIC SENDING
  // ===========================================================================

  /**
   * Send Telegram message
   */
  private async sendTelegram(chatId: string, message: string): Promise<AlertDeliveryResult> {
    try {
      if (!this.telegramBot) {
        throw new Error('Telegram bot not initialized');
      }

      await this.telegramBot.telegram.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });

      this.stats.byChannel.telegram.sent++;
      return { channel: 'telegram', success: true, timestamp: new Date() };

    } catch (error: any) {
      this.stats.byChannel.telegram.failed++;
      this.logger.error('Telegram send failed', { error: error.message });
      return { channel: 'telegram', success: false, error: error.message, timestamp: new Date() };
    }
  }

  /**
   * Send Discord message
   */
  private async sendDiscord(embed: any): Promise<AlertDeliveryResult> {
    try {
      await axios.post(this.config.discordWebhookUrl!, {
        embeds: [embed],
      });

      this.stats.byChannel.discord.sent++;
      return { channel: 'discord', success: true, timestamp: new Date() };

    } catch (error: any) {
      this.stats.byChannel.discord.failed++;
      this.logger.error('Discord send failed', { error: error.message });
      return { channel: 'discord', success: false, error: error.message, timestamp: new Date() };
    }
  }

  /**
   * Send Slack message
   */
  private async sendSlack(blocks: any): Promise<AlertDeliveryResult> {
    try {
      await axios.post(this.config.slackWebhookUrl!, blocks);

      this.stats.byChannel.slack.sent++;
      return { channel: 'slack', success: true, timestamp: new Date() };

    } catch (error: any) {
      this.stats.byChannel.slack.failed++;
      this.logger.error('Slack send failed', { error: error.message });
      return { channel: 'slack', success: false, error: error.message, timestamp: new Date() };
    }
  }

  /**
   * Send webhook
   */
  private async sendWebhook(payload: any): Promise<AlertDeliveryResult> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.config.webhookSecret) {
        headers['X-Webhook-Secret'] = this.config.webhookSecret;
      }

      await axios.post(this.config.webhookUrl!, payload, { headers });

      this.stats.byChannel.webhook.sent++;
      return { channel: 'webhook', success: true, timestamp: new Date() };

    } catch (error: any) {
      this.stats.byChannel.webhook.failed++;
      this.logger.error('Webhook send failed', { error: error.message });
      return { channel: 'webhook', success: false, error: error.message, timestamp: new Date() };
    }
  }

  // ===========================================================================
  // MESSAGE FORMATTING
  // ===========================================================================

  /**
   * Format Telegram message
   */
  private formatTelegramMessage(alert: ShadowAlert): string {
    const { whale, prediction } = alert;
    
    const tierEmoji = {
      [WhaleTier.MEGA_WHALE]: '🐋',
      [WhaleTier.LARGE_WHALE]: '🐳',
      [WhaleTier.WHALE]: '🐟',
    }[whale.tier];

    const actionEmoji = {
      BUY: '🟢',
      SELL: '🔴',
      HOLD: '⚪',
      TRANSFER: '🔄',
    }[prediction.predictedAction];

    const severityEmoji = {
      LOW: '🔵',
      MEDIUM: '🟡',
      HIGH: '🟠',
      CRITICAL: '🔴',
    }[alert.severity];

    return `
${severityEmoji} <b>WHALE PREDICTION ALERT</b> ${severityEmoji}

${tierEmoji} <b>Whale:</b> <code>${whale.address.slice(0, 6)}...${whale.address.slice(-4)}</code>
🔗 <b>Chain:</b> ${whale.chain.toUpperCase()}
📊 <b>Tier:</b> ${whale.tier.replace('_', ' ')}

${actionEmoji} <b>Predicted Action:</b> ${prediction.predictedAction}
📈 <b>Probability:</b> ${(prediction.probability * 100).toFixed(1)}%
🎯 <b>Confidence:</b> ${(prediction.confidence * 100).toFixed(1)}%
⏱ <b>Timeframe:</b> ${prediction.timeframe}

💰 <b>Expected Value:</b>
   $${prediction.expectedValueRange.min.toLocaleString()} - $${prediction.expectedValueRange.max.toLocaleString()}

🪙 <b>Expected Tokens:</b>
   ${prediction.expectedTokens.slice(0, 3).map(t => t.slice(0, 10)).join(', ') || 'Unknown'}

📝 <b>Reasoning:</b>
${prediction.reasoning.slice(0, 3).map(r => `   • ${r}`).join('\n')}

💡 <b>Recommendation:</b>
${alert.recommendation}

⏰ ${new Date().toISOString()}
`.trim();
  }

  /**
   * Format Discord embed
   */
  private formatDiscordMessage(alert: ShadowAlert): any {
    const { whale, prediction } = alert;

    const colorMap = {
      LOW: 0x3498db,
      MEDIUM: 0xf1c40f,
      HIGH: 0xe67e22,
      CRITICAL: 0xe74c3c,
    };

    return {
      title: `🐋 Whale Prediction Alert`,
      color: colorMap[alert.severity],
      fields: [
        {
          name: '👤 Whale',
          value: `\`${whale.address.slice(0, 10)}...\``,
          inline: true,
        },
        {
          name: '🔗 Chain',
          value: whale.chain.toUpperCase(),
          inline: true,
        },
        {
          name: '📊 Tier',
          value: whale.tier.replace('_', ' '),
          inline: true,
        },
        {
          name: '🎯 Prediction',
          value: `${prediction.predictedAction} (${(prediction.probability * 100).toFixed(0)}%)`,
          inline: true,
        },
        {
          name: '⏱ Timeframe',
          value: prediction.timeframe,
          inline: true,
        },
        {
          name: '🎯 Confidence',
          value: `${(prediction.confidence * 100).toFixed(0)}%`,
          inline: true,
        },
        {
          name: '💰 Expected Value',
          value: `$${prediction.expectedValueRange.min.toLocaleString()} - $${prediction.expectedValueRange.max.toLocaleString()}`,
          inline: false,
        },
        {
          name: '📝 Reasoning',
          value: prediction.reasoning.slice(0, 3).join('\n') || 'N/A',
          inline: false,
        },
        {
          name: '💡 Recommendation',
          value: alert.recommendation,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: `Severity: ${alert.severity}`,
      },
    };
  }

  /**
   * Format Slack message
   */
  private formatSlackMessage(alert: ShadowAlert): any {
    const { whale, prediction } = alert;

    return {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🐋 Whale Prediction Alert',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Whale:*\n\`${whale.address.slice(0, 10)}...\``,
            },
            {
              type: 'mrkdwn',
              text: `*Chain:*\n${whale.chain.toUpperCase()}`,
            },
            {
              type: 'mrkdwn',
              text: `*Prediction:*\n${prediction.predictedAction}`,
            },
            {
              type: 'mrkdwn',
              text: `*Probability:*\n${(prediction.probability * 100).toFixed(0)}%`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Recommendation:*\n${alert.recommendation}`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Severity: ${alert.severity} | Timeframe: ${prediction.timeframe}`,
            },
          ],
        },
      ],
    };
  }

  /**
   * Format webhook payload
   */
  private formatWebhookPayload(alert: ShadowAlert): any {
    return {
      type: 'whale_prediction_alert',
      timestamp: new Date().toISOString(),
      alert: {
        id: alert.id,
        severity: alert.severity,
        alertType: alert.alertType,
        message: alert.message,
        recommendation: alert.recommendation,
      },
      whale: {
        address: alert.whale.address,
        chain: alert.whale.chain,
        tier: alert.whale.tier,
        totalValueTracked: alert.whale.totalValueTracked,
      },
      prediction: {
        action: alert.prediction.predictedAction,
        probability: alert.prediction.probability,
        confidence: alert.prediction.confidence,
        timeframe: alert.prediction.timeframe,
        expectedValueRange: alert.prediction.expectedValueRange,
        expectedTokens: alert.prediction.expectedTokens,
        reasoning: alert.prediction.reasoning,
      },
    };
  }

  // ===========================================================================
  // RATE LIMITING & UTILITIES
  // ===========================================================================

  /**
   * Check rate limit
   */
  private checkRateLimit(alertId: string): boolean {
    const now = Date.now();

    // Reset hourly counter
    if (now - this.hourStartTime > 3600000) {
      this.alertsThisHour = 0;
      this.hourStartTime = now;
    }

    // Check hourly limit
    if (this.alertsThisHour >= this.config.maxAlertsPerHour) {
      this.logger.warn('Hourly alert limit reached');
      return false;
    }

    // Check minimum interval (deduplication)
    const lastTime = this.recentAlerts.get(alertId);
    if (lastTime && now - lastTime < this.config.minAlertIntervalMs) {
      return false;
    }

    // Update tracking
    this.recentAlerts.set(alertId, now);
    this.alertsThisHour++;

    // Clean old entries
    for (const [id, time] of this.recentAlerts) {
      if (now - time > 3600000) {
        this.recentAlerts.delete(id);
      }
    }

    return true;
  }

  /**
   * Check if alert meets minimum severity
   */
  private meetsMinSeverity(severity: ShadowAlert['severity']): boolean {
    const alertLevel = SEVERITY_ORDER.indexOf(severity);
    const minLevel = SEVERITY_ORDER.indexOf(this.config.minSeverity);
    return alertLevel >= minLevel;
  }

  /**
   * Update stats
   */
  private updateStats(results: AlertDeliveryResult[]): void {
    const successful = results.filter(r => r.success).length;
    const total = results.length;

    this.stats.totalSent += total;
    this.stats.lastAlertTime = new Date();
    this.stats.alertsThisHour = this.alertsThisHour;

    // Update success rate (rolling average)
    if (total > 0) {
      const currentRate = (successful / total) * 100;
      this.stats.successRate = (this.stats.successRate * 0.9) + (currentRate * 0.1);
    }
  }

  /**
   * Get stats
   */
  getStats(): AlertStats {
    return { ...this.stats };
  }

  /**
   * Test connection to all channels
   */
  async testConnections(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    if (this.config.telegramEnabled && this.telegramBot && this.config.telegramChatIds?.[0]) {
      try {
        await this.telegramBot.telegram.sendMessage(
          this.config.telegramChatIds[0],
          '🧪 Test message from Whale Prediction Alert Service'
        );
        results.telegram = true;
      } catch {
        results.telegram = false;
      }
    }

    if (this.config.discordEnabled && this.config.discordWebhookUrl) {
      try {
        await axios.post(this.config.discordWebhookUrl, {
          content: '🧪 Test message from Whale Prediction Alert Service',
        });
        results.discord = true;
      } catch {
        results.discord = false;
      }
    }

    if (this.config.slackEnabled && this.config.slackWebhookUrl) {
      try {
        await axios.post(this.config.slackWebhookUrl, {
          text: '🧪 Test message from Whale Prediction Alert Service',
        });
        results.slack = true;
      } catch {
        results.slack = false;
      }
    }

    return results;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let alertServiceInstance: PredictionAlertService | null = null;

export function getPredictionAlertService(config?: Partial<AlertServiceConfig>): PredictionAlertService {
  if (!alertServiceInstance) {
    alertServiceInstance = new PredictionAlertService(config);
  }
  return alertServiceInstance;
}

export function resetPredictionAlertService(): void {
  alertServiceInstance = null;
}

export default PredictionAlertService;

