import { BotMessageData } from '@/types';

export interface FormattedMessage {
  content: string;
  embeds?: any[];
  components?: any[];
  files?: any[];
}

export class MessageFormatter {
  private static instance: MessageFormatter;

  static getInstance(): MessageFormatter {
    if (!MessageFormatter.instance) {
      MessageFormatter.instance = new MessageFormatter();
    }
    return MessageFormatter.instance;
  }

  /**
   * Format message for Discord
   */
  formatForDiscord(messageData: BotMessageData): FormattedMessage {
    const content = this.formatMarkdown(messageData.content, 'discord');

    const result: FormattedMessage = {
      content,
    };

    // Add embeds for alerts and notifications
    if (messageData.formatting.embeds && (messageData.messageType === 'alert' || messageData.messageType === 'notification')) {
      result.embeds = [this.createDiscordEmbed(messageData)];
    }

    // Add mentions if specified
    if (messageData.formatting.mentions && messageData.formatting.mentions.length > 0) {
      const mentions = messageData.formatting.mentions.map(userId => `<@${userId}>`).join(' ');
      result.content = `${mentions}\n${result.content}`;
    }

    return result;
  }

  /**
   * Format message for Telegram
   */
  formatForTelegram(messageData: BotMessageData): FormattedMessage {
    const content = this.formatMarkdown(messageData.content, 'telegram');

    return {
      content,
    };
  }

  /**
   * Create Discord embed for alerts and notifications
   */
  private createDiscordEmbed(messageData: BotMessageData): any {
    const embed: any = {
      title: this.getEmbedTitle(messageData.messageType),
      description: messageData.content,
      color: this.getEmbedColor(messageData.priority),
      timestamp: new Date().toISOString(),
      footer: {
        text: `${messageData.platform.charAt(0).toUpperCase() + messageData.platform.slice(1)} Bot`
      }
    };

    // Add metadata as fields if present
    if (messageData.metadata) {
      embed.fields = Object.entries(messageData.metadata).slice(0, 10).map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: String(value).substring(0, 1000), // Discord field value limit
        inline: true
      }));
    }

    return embed;
  }

  private getEmbedTitle(messageType: string): string {
    switch (messageType) {
      case 'alert':
        return '🚨 Alert';
      case 'notification':
        return '📢 Notification';
      case 'command_response':
        return '🤖 Bot Response';
      default:
        return 'Message';
    }
  }

  private getEmbedColor(priority: string): number {
    switch (priority) {
      case 'critical':
        return 0xFF0000; // Red
      case 'high':
        return 0xFF8C00; // Orange
      case 'normal':
        return 0x0099FF; // Blue
      case 'low':
        return 0x00FF00; // Green
      default:
        return 0x0099FF; // Blue
    }
  }

  /**
   * Format markdown for different platforms
   */
  private formatMarkdown(content: string, platform: 'discord' | 'telegram'): string {
    if (!content) return '';

    // Common markdown formatting
    let formatted = content;

    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, `**$1**`);

    // Italic
    formatted = formatted.replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, `*$1*`);

    // Code inline
    formatted = formatted.replace(/`([^`]+)`/g, '`$1`');

    // Code blocks (multiline)
    formatted = formatted.replace(/```([\s\S]*?)```/g, (match, code) => {
      if (platform === 'discord') {
        return `\`\`\`${code}\`\`\``;
      } else {
        return `\`\`\`${code}\`\`\``;
      }
    });

    // Links
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '[$1]($2)');

    // Platform-specific formatting
    if (platform === 'discord') {
      // Discord-specific markdown
      formatted = formatted.replace(/__(.*?)__/g, '__$1__'); // Underline
      formatted = formatted.replace(/\|\|(.*?)\|\|/g, '||$1||'); // Spoiler
    } else if (platform === 'telegram') {
      // Telegram-specific markdown (similar to Discord but some differences)
      formatted = formatted.replace(/__(.*?)__/g, '__$1__'); // Underline
      formatted = formatted.replace(/\|\|(.*?)\|\|/g, '||$1||'); // Spoiler
    }

    return formatted;
  }

  /**
   * Escape special characters for platform
   */
  escapeForPlatform(content: string, platform: 'discord' | 'telegram'): string {
    if (platform === 'discord') {
      return content
        .replace(/\*/g, '\\*')
        .replace(/_/g, '\\_')
        .replace(/`/g, '\\`')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
    } else if (platform === 'telegram') {
      return content
        .replace(/\*/g, '\\*')
        .replace(/_/g, '\\_')
        .replace(/`/g, '\\`')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]');
    }

    return content;
  }

  /**
   * Create command help message
   */
  createHelpMessage(platform: 'discord' | 'telegram'): string {
    const commands = [
      { command: '/help', description: 'Show this help message' },
      { command: '/subscribe [event_type]', description: 'Subscribe to event notifications' },
      { command: '/unsubscribe [event_type]', description: 'Unsubscribe from event notifications' },
      { command: '/list', description: 'List your current subscriptions' },
      { command: '/filter [key=value]', description: 'Set notification filters' },
      { command: '/explain [event_id]', description: 'Get detailed explanation of an event' }
    ];

    let helpText = '**Available Commands:**\n\n';

    for (const cmd of commands) {
      if (platform === 'discord') {
        helpText += `**${cmd.command}**\n${cmd.description}\n\n`;
      } else {
        helpText += `${cmd.command} - ${cmd.description}\n`;
      }
    }

    return helpText;
  }

  /**
   * Create subscription confirmation message
   */
  createSubscriptionMessage(eventTypes: string[], platform: 'discord' | 'telegram'): string {
    const eventList = eventTypes.map(type => `\`${type}\``).join(', ');

    if (platform === 'discord') {
      return `✅ **Successfully subscribed to:** ${eventList}\n\nYou will now receive notifications for these event types.`;
    } else {
      return `✅ Successfully subscribed to: ${eventList}\n\nYou will now receive notifications for these event types.`;
    }
  }

  /**
   * Create unsubscription confirmation message
   */
  createUnsubscriptionMessage(eventTypes: string[], platform: 'discord' | 'telegram'): string {
    const eventList = eventTypes.map(type => `\`${type}\``).join(', ');

    if (platform === 'discord') {
      return `❌ **Successfully unsubscribed from:** ${eventList}\n\nYou will no longer receive notifications for these event types.`;
    } else {
      return `❌ Successfully unsubscribed from: ${eventList}\n\nYou will no longer receive notifications for these event types.`;
    }
  }
}
