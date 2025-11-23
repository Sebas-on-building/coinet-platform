import TelegramBotAPI = require('node-telegram-bot-api');
import { BaseBotProvider } from './BaseBotProvider';
import { BotMessageData, BotMessageResult, BotSubscription, BotInteraction } from '@/types';
import { MessageFormatter } from './MessageFormatter';
import { Logger } from '@/utils/Logger';

export class TelegramBot extends BaseBotProvider {
  private bot: TelegramBotAPI;
  private token: string;
  private chatId?: string;
  private messageFormatter: MessageFormatter;

  // In-memory storage for subscriptions (in production, use database)
  private subscriptions: Map<string, BotSubscription> = new Map();
  private interactions: Map<string, BotInteraction> = new Map();

  constructor(
    name: string,
    config: any,
    priority: number = 1,
    rateLimit?: { maxRequests: number; windowMs: number }
  ) {
    super(name, 'telegram', config, priority, rateLimit);

    if (!config.token) {
      throw new Error('Telegram bot token is required');
    }

    this.token = config.token;
    this.chatId = config.chatId;
    this.messageFormatter = MessageFormatter.getInstance();

    // Initialize Telegram bot with polling
    this.bot = new TelegramBotAPI(this.token, {
      polling: true,
    });

    this.setupEventHandlers();
  }

  async sendMessage(messageData: BotMessageData): Promise<BotMessageResult> {
    try {
      this.validateMessageData(messageData);

      const formattedMessage = this.messageFormatter.formatForTelegram(messageData);

      let chatId: string | number | undefined;

      if (messageData.chatId) {
        chatId = messageData.chatId;
      } else if (this.chatId) {
        chatId = this.chatId;
      }

      if (!chatId) {
        throw this.createError('CHAT_NOT_FOUND', 'No valid chat found for message', false);
      }

      // Send the message
      const sentMessage = await this.bot.sendMessage(chatId, formattedMessage.content, {
        parse_mode: messageData.formatting.markdown ? 'MarkdownV2' : undefined,
        disable_web_page_preview: true,
      });

      this.logger.info(`Message sent successfully to Telegram chat ${chatId}`, {
        messageId: sentMessage.message_id,
        chatId,
        contentLength: messageData.content.length,
      });

      return this.createSuccessResult(sentMessage.message_id.toString());

    } catch (error: any) {
      this.logger.error(`Failed to send Telegram message: ${error.message}`, { error, messageData });

      const retryable = this.isRetryableError(error);

      return this.createErrorResult(
        this.createError(
          error.code || 'TELEGRAM_SEND_ERROR',
          error.message || 'Unknown Telegram error',
          retryable
        )
      );
    }
  }

  protected async performHealthCheck(): Promise<boolean> {
    try {
      // For Telegram, we can check if the bot is initialized and can get bot info
      const botInfo = await this.bot.getMe();

      if (!botInfo || !botInfo.is_bot) {
        this.logger.error('Telegram bot validation failed');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Telegram bot health check failed', { error });
      return false;
    }
  }

  private setupEventHandlers(): void {
    this.bot.on('polling_error', (error: any) => {
      this.logger.error('Telegram polling error', { error: (error as Error).message });
    });

    // Handle text messages (commands)
    this.bot.onText(/^\/(help|subscribe|unsubscribe|list|filter|explain)/, async (msg: any, match: any) => {
      const command = match?.[1];
      if (!command) return;

      await this.handleCommand(msg, command);
    });

    // Handle callback queries (button presses)
    this.bot.on('callback_query', async (query: any) => {
      await this.handleCallbackQuery(query);
    });

    this.logger.info('Telegram bot event handlers set up');
  }

  private async handleCommand(msg: any, command: string): Promise<void> {
    const userId = msg.from?.id?.toString();
    if (!userId) return;

    const interactionData: BotInteraction = {
      id: `telegram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      platform: 'telegram',
      command,
      parameters: {},
      timestamp: new Date(),
      success: true,
    };

    try {
      switch (command) {
        case 'help':
          await this.handleHelpCommand(msg, interactionData);
          break;

        case 'subscribe':
          await this.handleSubscribeCommand(msg, interactionData);
          break;

        case 'unsubscribe':
          await this.handleUnsubscribeCommand(msg, interactionData);
          break;

        case 'list':
          await this.handleListCommand(msg, interactionData);
          break;

        case 'filter':
          await this.handleFilterCommand(msg, interactionData);
          break;

        case 'explain':
          await this.handleExplainCommand(msg, interactionData);
          break;
      }

      this.interactions.set(interactionData.id, interactionData);

    } catch (error) {
      this.logger.error(`Failed to handle Telegram command ${command}`, { error, userId });

      interactionData.success = false;

      await this.bot.sendMessage(msg.chat.id, 'An error occurred while processing your command. Please try again.');
    }
  }

  private async handleHelpCommand(msg: TelegramBotAPI.Message, interactionData: BotInteraction): Promise<void> {
    const helpMessage = this.messageFormatter.createHelpMessage('telegram');

    await this.bot.sendMessage(msg.chat.id, helpMessage, {
      parse_mode: 'Markdown',
    });
  }

  private async handleSubscribeCommand(msg: TelegramBotAPI.Message, interactionData: BotInteraction): Promise<void> {
    const text = msg.text || '';
    const eventType = text.replace('/subscribe', '').trim();

    if (!eventType) {
      await this.bot.sendMessage(msg.chat.id, 'Usage: /subscribe <event_type>\nExample: /subscribe email.sent');
      return;
    }

    const userId = msg.from?.id?.toString();
    if (!userId) return;

    // Create or update subscription
    const subscriptionId = `telegram-${userId}-${eventType}`;
    const subscription: BotSubscription = {
      id: subscriptionId,
      userId,
      platform: 'telegram',
      chatId: msg.chat.id.toString(),
      eventTypes: [eventType],
      filters: {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.subscriptions.set(subscriptionId, subscription);

    const responseMessage = this.messageFormatter.createSubscriptionMessage([eventType], 'telegram');

    await this.bot.sendMessage(msg.chat.id, responseMessage);

    interactionData.parameters = { eventType };
  }

  private async handleUnsubscribeCommand(msg: TelegramBotAPI.Message, interactionData: BotInteraction): Promise<void> {
    const text = msg.text || '';
    const eventType = text.replace('/unsubscribe', '').trim();

    if (!eventType) {
      await this.bot.sendMessage(msg.chat.id, 'Usage: /unsubscribe <event_type>\nExample: /unsubscribe email.sent');
      return;
    }

    const userId = msg.from?.id?.toString();
    if (!userId) return;

    const subscriptionId = `telegram-${userId}-${eventType}`;
    const subscription = this.subscriptions.get(subscriptionId);

    if (!subscription) {
      await this.bot.sendMessage(msg.chat.id, `You are not subscribed to ${eventType} events.`);
      return;
    }

    subscription.isActive = false;
    subscription.updatedAt = new Date();

    const responseMessage = this.messageFormatter.createUnsubscriptionMessage([eventType], 'telegram');

    await this.bot.sendMessage(msg.chat.id, responseMessage);

    interactionData.parameters = { eventType };
  }

  private async handleListCommand(msg: TelegramBotAPI.Message, interactionData: BotInteraction): Promise<void> {
    const userId = msg.from?.id?.toString();
    if (!userId) return;

    const userSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.userId === userId && sub.isActive);

    if (userSubscriptions.length === 0) {
      await this.bot.sendMessage(msg.chat.id, 'You have no active subscriptions.');
      return;
    }

    const subscriptionList = userSubscriptions
      .map(sub => `• ${sub.eventTypes.join(', ')}`)
      .join('\n');

    await this.bot.sendMessage(msg.chat.id, `Your Active Subscriptions:\n${subscriptionList}`);
  }

  private async handleFilterCommand(msg: TelegramBotAPI.Message, interactionData: BotInteraction): Promise<void> {
    const text = msg.text || '';
    const filterString = text.replace('/filter', '').trim();

    if (!filterString) {
      await this.bot.sendMessage(msg.chat.id, 'Usage: /filter <key>=<value>\nExample: /filter priority=high,provider=ses');
      return;
    }

    const userId = msg.from?.id?.toString();
    if (!userId) return;

    // Parse filter string
    const filters: Record<string, any> = {};
    try {
      const filterPairs = filterString.split(',');
      for (const pair of filterPairs) {
        const [key, value] = pair.split('=');
        if (key && value) {
          filters[key.trim()] = value.trim();
        }
      }

      // Update user's subscriptions with new filters
      const userSubscriptions = Array.from(this.subscriptions.values())
        .filter(sub => sub.userId === userId && sub.isActive);

      for (const subscription of userSubscriptions) {
        subscription.filters = { ...subscription.filters, ...filters };
        subscription.updatedAt = new Date();
      }

      await this.bot.sendMessage(msg.chat.id, `Filters updated: ${Object.entries(filters).map(([k, v]) => `${k}=${v}`).join(', ')}`);

    } catch (error) {
      await this.bot.sendMessage(msg.chat.id, 'Invalid filter format. Use: key1=value1,key2=value2');
    }

    interactionData.parameters = { filter: filterString };
  }

  private async handleExplainCommand(msg: TelegramBotAPI.Message, interactionData: BotInteraction): Promise<void> {
    const text = msg.text || '';
    const eventId = text.replace('/explain', '').trim();

    if (!eventId) {
      await this.bot.sendMessage(msg.chat.id, 'Usage: /explain <event_id>\nExample: /explain event-12345');
      return;
    }

    // This would integrate with the explanation service
    await this.bot.sendMessage(msg.chat.id, `🔍 Event Explanation:\n\nEvent ID: ${eventId}\n\nDetailed explanation would be provided by the explanation service.`);

    interactionData.parameters = { eventId };
  }

  private async handleCallbackQuery(query: any): Promise<void> {
    // Handle callback queries from inline keyboards if implemented
    await this.bot.answerCallbackQuery(query.id);
  }

  private isRetryableError(error: any): boolean {
    // Telegram retryable errors include:
    // - Rate limiting (429)
    // - Server errors (5xx)
    // - Network timeouts
    if (error.code === 429) return true; // Rate limited
    if (error.response?.status >= 500) return true; // Server errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true; // Network issues

    return false;
  }

  /**
   * Get bot subscriptions for a user
   */
  getUserSubscriptions(userId: string): BotSubscription[] {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.userId === userId && sub.isActive);
  }

  /**
   * Get bot interactions for analytics
   */
  getInteractions(): BotInteraction[] {
    return Array.from(this.interactions.values());
  }

  /**
   * Clean up old interactions
   */
  cleanupOldInteractions(daysToKeep: number = 30): void {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    for (const [id, interaction] of this.interactions.entries()) {
      if (interaction.timestamp < cutoffDate) {
        this.interactions.delete(id);
      }
    }

    this.logger.info(`Cleaned up old Telegram bot interactions (older than ${daysToKeep} days)`);
  }

  /**
   * Stop the bot (cleanup)
   */
  async stop(): Promise<void> {
    try {
      await this.bot.stopPolling();
      this.logger.info('Telegram bot stopped successfully');
    } catch (error) {
      this.logger.error('Failed to stop Telegram bot', { error });
    }
  }
}
