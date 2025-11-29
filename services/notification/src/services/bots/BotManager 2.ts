import { BotProvider, BotMessageData, BotMessageResult, BotSubscription, BotInteraction, BotMetrics } from '@/types';
import { BaseBotProvider } from './BaseBotProvider';
import { DiscordBot } from './DiscordBot';
import { TelegramBot } from './TelegramBot';
import { MessageFormatter } from './MessageFormatter';
import { Logger } from '@/utils/Logger';

export class BotManager {
  private static instance: BotManager;
  private logger: Logger;
  private bots: Map<string, BotProvider> = new Map();
  private messageFormatter: MessageFormatter;
  private isInitialized: boolean = false;

  private constructor() {
    this.logger = Logger.getInstance();
    this.messageFormatter = MessageFormatter.getInstance();
  }

  static getInstance(): BotManager {
    if (!BotManager.instance) {
      BotManager.instance = new BotManager();
    }
    return BotManager.instance;
  }

  /**
   * Initialize the bot manager with configured bots
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('Initializing BotManager...');

      // Load bot configurations from environment variables
      await this.loadBotsFromConfig();

      // Start periodic cleanup tasks
      this.startCleanupTasks();

      this.isInitialized = true;
      this.logger.info('BotManager initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize BotManager', { error });
      throw error;
    }
  }

  /**
   * Add a bot to the manager
   */
  addBot(bot: BotProvider): void {
    this.bots.set(bot.name, bot);
    this.logger.info(`Added bot: ${bot.name} (${bot.type})`);
  }

  /**
   * Remove a bot from the manager
   */
  removeBot(botName: string): void {
    const bot = this.bots.get(botName);
    if (bot) {
      // Stop the bot if it's running
      if (bot instanceof TelegramBot) {
        bot.stop();
      }
      this.bots.delete(botName);
      this.logger.info(`Removed bot: ${botName}`);
    }
  }

  /**
   * Get all bots
   */
  getBots(): BotProvider[] {
    return Array.from(this.bots.values());
  }

  /**
   * Get a specific bot by name
   */
  getBot(name: string): BotProvider | undefined {
    return this.bots.get(name);
  }

  /**
   * Send message to filtered subscribers (already checked for quiet hours)
   */
  async sendToFilteredSubscribers(
    eventType: string,
    eventData: any,
    subscriptions: any[]
  ): Promise<BotMessageResult[]> {
    const results: BotMessageResult[] = [];

    // Group subscriptions by platform
    const subscriptionsByPlatform = new Map<string, any[]>();
    for (const subscription of subscriptions) {
      const platformSubscriptions = subscriptionsByPlatform.get(subscription.platform) || [];
      platformSubscriptions.push(subscription);
      subscriptionsByPlatform.set(subscription.platform, platformSubscriptions);
    }

    // Send to each platform's bots
    for (const [platform, platformSubscriptions] of subscriptionsByPlatform.entries()) {
      const bot = this.getBotForPlatform(platform);
      if (!bot) {
        this.logger.warn(`No bot available for platform: ${platform}`);
        continue;
      }

      const platformResults = await this.sendToPlatformSubscribers(bot, platformSubscriptions, eventType, eventData);
      results.push(...platformResults);
    }

    return results;
  }

  /**
   * Send message to appropriate bots based on subscriptions
   */
  async sendToSubscribers(eventType: string, eventData: any): Promise<BotMessageResult[]> {
    const results: BotMessageResult[] = [];

    // Find active subscriptions for this event type
    const relevantSubscriptions = this.getSubscriptionsForEvent(eventType);

    if (relevantSubscriptions.length === 0) {
      this.logger.debug(`No active subscriptions found for event type: ${eventType}`);
      return results;
    }

    this.logger.info(`Sending event ${eventType} to ${relevantSubscriptions.length} subscribers`);

    // Group subscriptions by platform
    const subscriptionsByPlatform = new Map<string, BotSubscription[]>();
    for (const subscription of relevantSubscriptions) {
      const platformSubscriptions = subscriptionsByPlatform.get(subscription.platform) || [];
      platformSubscriptions.push(subscription);
      subscriptionsByPlatform.set(subscription.platform, platformSubscriptions);
    }

    // Send to each platform's bots
    for (const [platform, platformSubscriptions] of subscriptionsByPlatform.entries()) {
      const bot = this.getBotForPlatform(platform);
      if (!bot) {
        this.logger.warn(`No bot available for platform: ${platform}`);
        continue;
      }

      const platformResults = await this.sendToPlatformSubscribers(bot, platformSubscriptions, eventType, eventData);
      results.push(...platformResults);
    }

    return results;
  }

  /**
   * Send message to specific platform subscribers
   */
  private async sendToPlatformSubscribers(
    bot: BotProvider,
    subscriptions: BotSubscription[],
    eventType: string,
    eventData: any
  ): Promise<BotMessageResult[]> {
    const results: BotMessageResult[] = [];

    // Group subscriptions by channel/chat for batching
    const subscriptionsByChannel = new Map<string, BotSubscription[]>();
    for (const subscription of subscriptions) {
      const channelId = subscription.channelId || subscription.chatId || 'default';
      const channelSubscriptions = subscriptionsByChannel.get(channelId) || [];
      channelSubscriptions.push(subscription);
      subscriptionsByChannel.set(channelId, channelSubscriptions);
    }

    // Send to each channel/chat
    for (const [channelId, channelSubscriptions] of subscriptionsByChannel.entries()) {
      try {
        const messageContent = this.formatEventMessage(eventType, eventData, channelSubscriptions);

        const messageData: BotMessageData = {
          content: messageContent,
          platform: bot.type,
          messageType: 'notification',
          priority: this.determinePriority(eventType, eventData),
          formatting: {
            markdown: true,
            embeds: bot.type === 'discord',
          },
        };

        if (bot.type === 'discord' && channelId) {
          messageData.channelId = channelId;
        } else if (bot.type === 'telegram' && channelId) {
          messageData.chatId = channelId;
        }

        const result = await bot.sendMessage(messageData);
        results.push(result);

        if (result.success) {
          this.logger.info(`Event ${eventType} sent successfully to ${channelSubscriptions.length} subscribers on ${bot.type}`);
        } else {
          this.logger.error(`Failed to send event ${eventType} to ${bot.type}`, { error: result.error });
        }

      } catch (error) {
        this.logger.error(`Error sending to ${bot.type} channel ${channelId}`, { error, eventType });

        results.push({
          success: false,
          platform: bot.type,
          error: {
            code: 'SEND_ERROR',
            message: `Failed to send to ${bot.type}: ${error}`,
            platform: bot.type,
            retryable: true,
          },
          timestamp: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Get subscriptions for a specific event type
   */
  private getSubscriptionsForEvent(eventType: string): BotSubscription[] {
    const allSubscriptions: BotSubscription[] = [];

    for (const bot of this.bots.values()) {
      if (bot instanceof DiscordBot) {
        // Get Discord subscriptions from the bot instance
        const discordSubscriptions = Array.from(bot['subscriptions'].values())
          .filter(sub => sub.eventTypes.includes(eventType) && sub.isActive);
        allSubscriptions.push(...discordSubscriptions);
      } else if (bot instanceof TelegramBot) {
        // Get Telegram subscriptions from the bot instance
        const telegramSubscriptions = Array.from(bot['subscriptions'].values())
          .filter(sub => sub.eventTypes.includes(eventType) && sub.isActive);
        allSubscriptions.push(...telegramSubscriptions);
      }
    }

    return allSubscriptions;
  }

  /**
   * Get bot for specific platform
   */
  private getBotForPlatform(platform: string): BotProvider | undefined {
    for (const bot of this.bots.values()) {
      if (bot.type === platform) {
        return bot;
      }
    }
    return undefined;
  }

  /**
   * Format event message for display
   */
  private formatEventMessage(eventType: string, eventData: any, subscriptions: BotSubscription[]): string {
    const timestamp = new Date().toLocaleString();

    let message = `🔔 **${eventType}**\n\n`;
    message += `Time: ${timestamp}\n`;

    // Add key event details
    if (eventData.messageId) {
      message += `Message ID: \`${eventData.messageId}\`\n`;
    }

    if (eventData.provider) {
      message += `Provider: ${eventData.provider}\n`;
    }

    if (eventData.email) {
      message += `Email: ${eventData.email}\n`;
    }

    if (eventData.to) {
      message += `Recipient: ${eventData.to}\n`;
    }

    // Add metadata if available
    if (eventData.metadata) {
      message += '\n**Details:**\n';
      for (const [key, value] of Object.entries(eventData.metadata).slice(0, 5)) {
        message += `• ${key}: ${String(value)}\n`;
      }
    }

    return message;
  }

  /**
   * Determine message priority based on event type and data
   */
  private determinePriority(eventType: string, eventData: any): 'low' | 'normal' | 'high' | 'critical' {
    // Critical events
    if (eventType.includes('failed') || eventType.includes('error') || eventType.includes('bounce')) {
      return 'critical';
    }

    // High priority events
    if (eventType.includes('delivered') || eventType.includes('sent')) {
      return 'high';
    }

    // Normal priority for other events
    return 'normal';
  }

  /**
   * Get bot metrics for analytics
   */
  getBotMetrics(): BotMetrics {
    const totalMessages = 0;
    const successfulMessages = 0;
    const failedMessages = 0;
    const averageResponseTime = 0;
    const commandsExecuted = 0;
    const subscriptionsActive = 0;

    const platformStats: Record<string, any> = {};

    for (const bot of this.bots.values()) {
      platformStats[bot.type] = {
        name: bot.name,
        type: bot.type,
        healthy: bot.getHealthInfo().status,
        subscriptionsActive: bot instanceof DiscordBot ? bot['subscriptions'].size : 0, // Simplified
      };
    }

    return {
      totalMessages,
      successfulMessages,
      failedMessages,
      averageResponseTime,
      commandsExecuted,
      subscriptionsActive,
      platformStats,
    };
  }

  /**
   * Load bots from configuration
   */
  private async loadBotsFromConfig(): Promise<void> {
    // Discord bot configuration
    if (process.env.DISCORD_BOT_TOKEN) {
      const discordConfig = {
        token: process.env.DISCORD_BOT_TOKEN,
        channelId: process.env.DISCORD_CHANNEL_ID,
      };

      try {
        const discordBot = new DiscordBot('discord-main', discordConfig, 1, {
          maxRequests: 5, // Discord rate limit
          windowMs: 1000,
        });

        // Test health check
        const isHealthy = await discordBot.healthCheck();
        if (isHealthy) {
          this.addBot(discordBot);
        } else {
          this.logger.warn('Discord bot health check failed, not adding to active bots');
        }
      } catch (error) {
        this.logger.error('Failed to initialize Discord bot', { error });
      }
    }

    // Telegram bot configuration
    if (process.env.TELEGRAM_BOT_TOKEN) {
      const telegramConfig = {
        token: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID,
      };

      try {
        const telegramBot = new TelegramBot('telegram-main', telegramConfig, 1, {
          maxRequests: 30, // Telegram rate limit
          windowMs: 1000,
        });

        // Test health check
        const isHealthy = await telegramBot.healthCheck();
        if (isHealthy) {
          this.addBot(telegramBot);
        } else {
          this.logger.warn('Telegram bot health check failed, not adding to active bots');
        }
      } catch (error) {
        this.logger.error('Failed to initialize Telegram bot', { error });
      }
    }
  }

  /**
   * Start periodic cleanup tasks
   */
  private startCleanupTasks(): void {
    // Clean up old interactions every hour
    setInterval(() => {
      for (const bot of this.bots.values()) {
        if (bot instanceof DiscordBot || bot instanceof TelegramBot) {
          bot.cleanupOldInteractions();
        }
      }
    }, 60 * 60 * 1000); // 1 hour

    this.logger.info('Started bot cleanup tasks');
  }

  /**
   * Health check for all bots
   */
  async checkAllBotsHealth(): Promise<Map<string, boolean>> {
    const healthResults = new Map<string, boolean>();

    for (const [name, bot] of this.bots) {
      try {
        const isHealthy = await bot.healthCheck();
        healthResults.set(name, isHealthy);
      } catch (error) {
        this.logger.error(`Health check failed for bot ${name}`, { error });
        healthResults.set(name, false);
      }
    }

    return healthResults;
  }
}
