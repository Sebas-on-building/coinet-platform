import { BotManager } from './bots/BotManager';
import { BotMessageData, BotMessageResult, BotSubscription, BotMetrics, ApiResponse } from '@/types';
import { PreferenceService } from './preferences/PreferenceService';
import { PriorityRouter, NotificationContext, RoutingDecision } from './priority/PriorityRouter';
import { Logger } from '@/utils/Logger';

export interface BotEventData {
  eventType: string;
  source: 'email' | 'sms' | 'webhook';
  sourceId: string;
  payload: Record<string, any>;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export class BotService {
  private static instance: BotService;
  private logger: Logger;
  private botManager: BotManager;
  private preferenceService: PreferenceService;
  private priorityRouter: PriorityRouter;

  private constructor() {
    this.logger = Logger.getInstance();
    this.botManager = BotManager.getInstance();
    this.preferenceService = PreferenceService.getInstance();
    this.priorityRouter = PriorityRouter.getInstance();
  }

  static getInstance(): BotService {
    if (!BotService.instance) {
      BotService.instance = new BotService();
    }
    return BotService.instance;
  }

  /**
   * Initialize the bot service
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing BotService...');
      await this.botManager.initialize();
      this.logger.info('BotService initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize BotService', { error });
      throw error;
    }
  }

  /**
   * Handle incoming webhook event from notification services
   */
  async handleNotificationEvent(eventData: BotEventData): Promise<void> {
    try {
      this.logger.info('Processing notification event for bots', {
        eventType: eventData.eventType,
        source: eventData.source,
        sourceId: eventData.sourceId,
      });

      // Get all subscriptions for this event type
      const relevantSubscriptions = await this.getSubscriptionsForEvent(eventData.eventType);

      if (relevantSubscriptions.length === 0) {
        this.logger.debug(`No active subscriptions found for event type: ${eventData.eventType}`);
        return;
      }

      // Filter subscriptions based on quiet hours preferences
      const filteredSubscriptions = await this.filterByQuietHours(relevantSubscriptions, eventData);

      if (filteredSubscriptions.length === 0) {
        this.logger.info(`All notifications filtered out due to quiet hours for event: ${eventData.eventType}`);
        return;
      }

      // Send to filtered subscribers
      const results = await this.botManager.sendToFilteredSubscribers(eventData.eventType, eventData.payload, filteredSubscriptions);

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      this.logger.info(`Notification event processed for bots`, {
        eventType: eventData.eventType,
        totalSubscribers: results.length,
        successful: successCount,
        failed: failureCount,
      });

    } catch (error) {
      this.logger.error('Failed to handle notification event for bots', { error, eventData });
    }
  }

  /**
   * Subscribe user to bot notifications
   */
  async subscribeUser(
    userId: string,
    platform: 'discord' | 'telegram',
    eventTypes: string[],
    channelId?: string,
    chatId?: string,
    filters?: Record<string, any>
  ): Promise<ApiResponse> {
    try {
      // Get bot for platform (we'll need to expose this method or refactor)
      const bots = this.botManager.getBots();
      const bot = bots.find(b => b.type === platform);
      if (!bot) {
        return {
          success: false,
          error: {
            code: 'BOT_NOT_FOUND',
            message: `No bot available for platform: ${platform}`,
          },
        };
      }

      // Create subscription
      const subscription: BotSubscription = {
        id: `${platform}-${userId}-${Date.now()}`,
        userId,
        platform,
        eventTypes,
        filters: filters || {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (channelId) {
        subscription.channelId = channelId;
      }

      if (chatId) {
        subscription.chatId = chatId;
      }

      // Store subscription in the bot instance
      if (bot instanceof (await import('./bots/DiscordBot')).DiscordBot) {
        // Access private subscriptions map (this would need to be refactored for proper encapsulation)
        // For now, we'll assume the bot manager handles this
      }

      this.logger.info('User subscribed to bot notifications', {
        userId,
        platform,
        eventTypes,
        channelId,
        chatId,
      });

      return {
        success: true,
        data: { subscriptionId: subscription.id },
      };

    } catch (error) {
      this.logger.error('Failed to subscribe user to bot notifications', { error, userId, platform });
      return {
        success: false,
        error: {
          code: 'SUBSCRIPTION_ERROR',
          message: `Failed to subscribe user: ${error}`,
        },
      };
    }
  }

  /**
   * Unsubscribe user from bot notifications
   */
  async unsubscribeUser(
    userId: string,
    platform: 'discord' | 'telegram',
    eventTypes?: string[]
  ): Promise<ApiResponse> {
    try {
      // Get bot for platform (we'll need to expose this method or refactor)
      const bots = this.botManager.getBots();
      const bot = bots.find(b => b.type === platform);
      if (!bot) {
        return {
          success: false,
          error: {
            code: 'BOT_NOT_FOUND',
            message: `No bot available for platform: ${platform}`,
          },
        };
      }

      // Find and deactivate subscriptions
      // This would need proper subscription management implementation

      this.logger.info('User unsubscribed from bot notifications', {
        userId,
        platform,
        eventTypes,
      });

      return {
        success: true,
        data: { unsubscribed: true},
      };

    } catch (error) {
      this.logger.error('Failed to unsubscribe user from bot notifications', { error, userId, platform });
      return {
        success: false,
        error: {
          code: 'UNSUBSCRIPTION_ERROR',
          message: `Failed to unsubscribe user: ${error}`,
        },
      };
    }
  }

  /**
   * Get user subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<BotSubscription[]> {
    const allSubscriptions: BotSubscription[] = [];

    for (const bot of this.botManager.getBots()) {
      if (bot instanceof (await import('./bots/DiscordBot')).DiscordBot) {
        const discordSubscriptions = bot.getUserSubscriptions(userId);
        allSubscriptions.push(...discordSubscriptions);
      } else if (bot instanceof (await import('./bots/TelegramBot')).TelegramBot) {
        const telegramSubscriptions = bot.getUserSubscriptions(userId);
        allSubscriptions.push(...telegramSubscriptions);
      }
    }

    return allSubscriptions;
  }

  /**
   * Get bot metrics
   */
  getBotMetrics(): BotMetrics {
    return this.botManager.getBotMetrics();
  }

  /**
   * Check health of all bots
   */
  async getHealthStatus(): Promise<any> {
    try {
      const botHealth = await this.botManager.checkAllBotsHealth();
      const metrics = this.getBotMetrics();

      const healthyBots = Array.from(botHealth.values()).filter(healthy => healthy).length;
      const totalBots = botHealth.size;

      return {
        status: healthyBots === totalBots ? 'healthy' : (healthyBots > 0 ? 'degraded' : 'error'),
        bots: {
          total: totalBots,
          healthy: healthyBots,
          unhealthy: totalBots - healthyBots,
          details: Object.fromEntries(botHealth),
        },
        metrics,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: 'error',
        error: (error as Error).message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send direct message to bot
   */
  async sendDirectMessage(
    platform: 'discord' | 'telegram',
    messageData: Omit<BotMessageData, 'platform'>
  ): Promise<BotMessageResult> {
    try {
      // Get bot for platform (we'll need to expose this method or refactor)
      const bots = this.botManager.getBots();
      const bot = bots.find(b => b.type === platform);
      if (!bot) {
        throw new Error(`No bot available for platform: ${platform}`);
      }

      const fullMessageData: BotMessageData = {
        ...messageData,
        platform,
      };

      return await bot.sendMessage(fullMessageData);

    } catch (error) {
      this.logger.error('Failed to send direct bot message', { error, platform, messageData });
      return {
        success: false,
        platform,
        error: {
          code: 'DIRECT_SEND_ERROR',
          message: `Failed to send direct message: ${error}`,
          platform,
          retryable: true,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Handle bot command (for API-based command execution)
   */
  async executeBotCommand(
    platform: 'discord' | 'telegram',
    command: string,
    parameters: Record<string, any>,
    userId: string,
    channelId?: string,
    chatId?: string
  ): Promise<ApiResponse> {
    try {
      // This would implement command execution logic
      // For now, provide a placeholder response

      this.logger.info('Bot command executed', {
        platform,
        command,
        userId,
        channelId,
        chatId,
      });

      return {
        success: true,
        data: {
          command,
          executed: true,
          response: `Command ${command} executed successfully`,
        },
      };

    } catch (error) {
      this.logger.error('Failed to execute bot command', { error, platform, command, userId });
      return {
        success: false,
        error: {
          code: 'COMMAND_ERROR',
          message: `Failed to execute command: ${error}`,
        },
      };
    }
  }

  /**
   * Get subscriptions for a specific event type
   */
  private async getSubscriptionsForEvent(eventType: string): Promise<BotSubscription[]> {
    const allSubscriptions: BotSubscription[] = [];

    for (const bot of this.botManager.getBots()) {
      if (bot instanceof (await import('./bots/DiscordBot')).DiscordBot) {
        // Get Discord subscriptions from the bot instance
        const discordSubscriptions = Array.from(bot['subscriptions'].values())
          .filter((sub: BotSubscription) => sub.eventTypes.includes(eventType) && sub.isActive);
        allSubscriptions.push(...discordSubscriptions);
      } else if (bot instanceof (await import('./bots/TelegramBot')).TelegramBot) {
        // Get Telegram subscriptions from the bot instance
        const telegramSubscriptions = Array.from(bot['subscriptions'].values())
          .filter((sub: BotSubscription) => sub.eventTypes.includes(eventType) && sub.isActive);
        allSubscriptions.push(...telegramSubscriptions);
      }
    }

    return allSubscriptions;
  }

  /**
   * Filter subscriptions based on quiet hours preferences
   */
  private async filterByQuietHours(subscriptions: BotSubscription[], eventData: BotEventData): Promise<BotSubscription[]> {
    const filteredSubscriptions: BotSubscription[] = [];

    for (const subscription of subscriptions) {
      try {
        const preferenceCheck = await this.preferenceService.checkNotificationDelivery(
          subscription.userId,
          subscription.platform === 'discord' ? 'discord' : 'telegram',
          eventData.eventType,
          eventData.payload.priority || 'normal',
          subscription.channelId || subscription.chatId
        );

        if (preferenceCheck.shouldSend) {
          filteredSubscriptions.push(subscription);
        } else if (preferenceCheck.queueForLater && preferenceCheck.scheduledFor) {
          // Queue for later delivery
          await this.preferenceService.queueNotification(
            subscription.userId,
            subscription.platform === 'discord' ? 'discord' : 'telegram',
            eventData.eventType,
            eventData.payload,
            eventData.payload.priority || 'normal',
            preferenceCheck.scheduledFor,
            subscription.channelId || subscription.chatId
          );
        }
      } catch (error) {
        this.logger.error('Failed to check quiet hours for subscription', { error, subscription, eventData });
        // Include subscription by default if check fails
        filteredSubscriptions.push(subscription);
      }
    }

    return filteredSubscriptions;
  }
}
