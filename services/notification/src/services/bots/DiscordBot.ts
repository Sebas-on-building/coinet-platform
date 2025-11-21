import { Client, GatewayIntentBits, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { BaseBotProvider } from './BaseBotProvider';
import { BotMessageData, BotMessageResult, BotSubscription, BotInteraction } from '@/types';
import { MessageFormatter } from './MessageFormatter';
import { Logger } from '@/utils/Logger';

export class DiscordBot extends BaseBotProvider {
  private client: Client;
  private token: string;
  private channelId?: string;
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
    super(name, 'discord', config, priority, rateLimit);

    if (!config.token) {
      throw new Error('Discord bot token is required');
    }

    this.token = config.token;
    this.channelId = config.channelId;
    this.messageFormatter = MessageFormatter.getInstance();

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    this.setupEventHandlers();
  }

  async sendMessage(messageData: BotMessageData): Promise<BotMessageResult> {
    try {
      this.validateMessageData(messageData);

      await this.client.login(this.token);

      const formattedMessage = this.messageFormatter.formatForDiscord(messageData);

      let channel: TextChannel | undefined;

      if (messageData.channelId) {
        channel = await this.client.channels.fetch(messageData.channelId) as TextChannel;
      } else if (this.channelId) {
        channel = await this.client.channels.fetch(this.channelId) as TextChannel;
      }

      if (!channel) {
        throw this.createError('CHANNEL_NOT_FOUND', 'No valid channel found for message', false);
      }

      // Check if channel is a text channel
      if (!channel.isTextBased()) {
        throw this.createError('INVALID_CHANNEL', 'Channel is not a text channel', false);
      }

      // Send the message
      const messageOptions: any = { content: formattedMessage.content };

      if (formattedMessage.embeds && formattedMessage.embeds.length > 0) {
        messageOptions.embeds = formattedMessage.embeds;
      }

      const sentMessage = await channel.send(messageOptions);

      this.logger.info(`Message sent successfully to Discord channel ${channel.id}`, {
        messageId: sentMessage.id,
        channelId: channel.id,
        contentLength: messageData.content.length,
      });

      return this.createSuccessResult(sentMessage.id);

    } catch (error: any) {
      this.logger.error(`Failed to send Discord message: ${error.message}`, { error, messageData });

      const retryable = this.isRetryableError(error);

      return this.createErrorResult(
        this.createError(
          error.code || 'DISCORD_SEND_ERROR',
          error.message || 'Unknown Discord error',
          retryable
        )
      );
    }
  }

  protected async performHealthCheck(): Promise<boolean> {
    try {
      // For Discord, we'll check if the bot is ready and can access the configured channel
      if (!this.client.isReady()) {
        await this.client.login(this.token);
      }

      if (this.channelId) {
        const channel = await this.client.channels.fetch(this.channelId);
        return channel !== null && (channel as TextChannel).isTextBased();
      }

      return this.client.isReady();
    } catch (error) {
      this.logger.error('Discord bot health check failed', { error });
      return false;
    }
  }

  private setupEventHandlers(): void {
    this.client.once('ready', () => {
      this.logger.info(`Discord bot ${this.client.user?.tag} is ready!`);
      this.registerSlashCommands();
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      await this.handleSlashCommand(interaction);
    });

    this.client.on('messageCreate', async (message) => {
      // Handle legacy command format (prefix commands) if needed
      if (message.content.startsWith('!') || message.content.startsWith('/')) {
        await this.handleLegacyCommand(message);
      }
    });
  }

  private async registerSlashCommands(): Promise<void> {
    try {
      const commands = [
        {
          name: 'help',
          description: 'Show available bot commands',
        },
        {
          name: 'subscribe',
          description: 'Subscribe to event notifications',
          options: [
            {
              name: 'event_type',
              description: 'Type of events to subscribe to',
              type: 3, // STRING
              required: true,
            },
          ],
        },
        {
          name: 'unsubscribe',
          description: 'Unsubscribe from event notifications',
          options: [
            {
              name: 'event_type',
              description: 'Type of events to unsubscribe from',
              type: 3, // STRING
              required: true,
            },
          ],
        },
        {
          name: 'list',
          description: 'List your current subscriptions',
        },
        {
          name: 'filter',
          description: 'Set notification filters',
          options: [
            {
              name: 'filter',
              description: 'Filter in key=value format',
              type: 3, // STRING
              required: true,
            },
          ],
        },
        {
          name: 'explain',
          description: 'Get detailed explanation of an event',
          options: [
            {
              name: 'event_id',
              description: 'ID of the event to explain',
              type: 3, // STRING
              required: true,
            },
          ],
        },
      ];

      await this.client.application?.commands.set(commands);
      this.logger.info('Discord slash commands registered successfully');
    } catch (error) {
      this.logger.error('Failed to register Discord slash commands', { error });
    }
  }

  private async handleSlashCommand(interaction: any): Promise<void> {
    const commandName = interaction.commandName;
    const userId = interaction.user.id;
    const options = interaction.options;

    const interactionData: BotInteraction = {
      id: `discord-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      platform: 'discord',
      command: commandName,
      parameters: {},
      timestamp: new Date(),
      success: true,
    };

    try {
      switch (commandName) {
        case 'help':
          await this.handleHelpCommand(interaction, interactionData);
          break;

        case 'subscribe':
          await this.handleSubscribeCommand(interaction, options, interactionData);
          break;

        case 'unsubscribe':
          await this.handleUnsubscribeCommand(interaction, options, interactionData);
          break;

        case 'list':
          await this.handleListCommand(interaction, interactionData);
          break;

        case 'filter':
          await this.handleFilterCommand(interaction, options, interactionData);
          break;

        case 'explain':
          await this.handleExplainCommand(interaction, options, interactionData);
          break;

        default:
          await interaction.reply({
            content: 'Unknown command. Use /help to see available commands.',
            ephemeral: true,
          });
      }

      this.interactions.set(interactionData.id, interactionData);

    } catch (error) {
      this.logger.error(`Failed to handle Discord command ${commandName}`, { error, userId });

      interactionData.success = false;

      await interaction.reply({
        content: 'An error occurred while processing your command. Please try again.',
        ephemeral: true,
      });
    }
  }

  private async handleHelpCommand(interaction: any, interactionData: BotInteraction): Promise<void> {
    const helpMessage = this.messageFormatter.createHelpMessage('discord');

    await interaction.reply({
      content: helpMessage,
      ephemeral: true,
    });
  }

  private async handleSubscribeCommand(interaction: any, options: any, interactionData: BotInteraction): Promise<void> {
    const eventType = options.getString('event_type');
    const userId = interaction.user.id;

    // Create or update subscription
    const subscriptionId = `discord-${userId}-${eventType}`;
    const subscription: BotSubscription = {
      id: subscriptionId,
      userId,
      platform: 'discord',
      channelId: interaction.channelId,
      eventTypes: [eventType],
      filters: {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.subscriptions.set(subscriptionId, subscription);

    const responseMessage = this.messageFormatter.createSubscriptionMessage([eventType], 'discord');

    await interaction.reply({
      content: responseMessage,
      ephemeral: true,
    });

    interactionData.parameters = { eventType };
  }

  private async handleUnsubscribeCommand(interaction: any, options: any, interactionData: BotInteraction): Promise<void> {
    const eventType = options.getString('event_type');
    const userId = interaction.user.id;

    const subscriptionId = `discord-${userId}-${eventType}`;
    const subscription = this.subscriptions.get(subscriptionId);

    if (!subscription) {
      await interaction.reply({
        content: `You are not subscribed to ${eventType} events.`,
        ephemeral: true,
      });
      return;
    }

    subscription.isActive = false;
    subscription.updatedAt = new Date();

    const responseMessage = this.messageFormatter.createUnsubscriptionMessage([eventType], 'discord');

    await interaction.reply({
      content: responseMessage,
      ephemeral: true,
    });

    interactionData.parameters = { eventType };
  }

  private async handleListCommand(interaction: any, interactionData: BotInteraction): Promise<void> {
    const userId = interaction.user.id;

    const userSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.userId === userId && sub.isActive);

    if (userSubscriptions.length === 0) {
      await interaction.reply({
        content: 'You have no active subscriptions.',
        ephemeral: true,
      });
      return;
    }

    const subscriptionList = userSubscriptions
      .map(sub => `• ${sub.eventTypes.join(', ')}`)
      .join('\n');

    await interaction.reply({
      content: `**Your Active Subscriptions:**\n${subscriptionList}`,
      ephemeral: true,
    });
  }

  private async handleFilterCommand(interaction: any, options: any, interactionData: BotInteraction): Promise<void> {
    const filterString = options.getString('filter');
    const userId = interaction.user.id;

    // Parse filter string (key=value,key2=value2)
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

      await interaction.reply({
        content: `✅ Filters updated: ${Object.entries(filters).map(([k, v]) => `${k}=${v}`).join(', ')}`,
        ephemeral: true,
      });

    } catch (error) {
      await interaction.reply({
        content: 'Invalid filter format. Use: key1=value1,key2=value2',
        ephemeral: true,
      });
    }

    interactionData.parameters = { filter: filterString };
  }

  private async handleExplainCommand(interaction: any, options: any, interactionData: BotInteraction): Promise<void> {
    const eventId = options.getString('event_id');

    // This would integrate with the explanation service
    // For now, provide a placeholder response
    await interaction.reply({
      content: `🔍 **Event Explanation:**\n\nEvent ID: ${eventId}\n\nDetailed explanation would be provided by the explanation service.`,
      ephemeral: true,
    });

    interactionData.parameters = { eventId };
  }

  private async handleLegacyCommand(message: any): Promise<void> {
    // Handle legacy prefix commands for backward compatibility
    const content = message.content;
    const userId = message.author.id;

    if (content.startsWith('/help') || content.startsWith('!help')) {
      const helpMessage = this.messageFormatter.createHelpMessage('discord');
      await message.reply(helpMessage);
    }
  }

  private isRetryableError(error: any): boolean {
    // Discord retryable errors include:
    // - Rate limiting (429)
    // - Server errors (5xx)
    // - Network timeouts
    if (error.code === 429) return true; // Rate limited
    if (error.status >= 500) return true; // Server errors
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

    this.logger.info(`Cleaned up old Discord bot interactions (older than ${daysToKeep} days)`);
  }
}
