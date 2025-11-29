import { EmailService } from '../EmailService';
import { SmsService } from '../SmsService';
import { BotService } from '../BotService';
import { PriorityRouter, NotificationContext, RoutingDecision, NotificationChannel } from './PriorityRouter';
import { Logger } from '@/utils/Logger';

export interface PriorityNotificationResult {
  success: boolean;
  channelResults: Map<NotificationChannel, any>;
  errors: Array<{ channel: NotificationChannel; error: any }>;
  totalCost: number;
  totalChannels: number;
  primaryChannel?: NotificationChannel;
  reasoning: string;
}

export interface MultiChannelNotification {
  context: NotificationContext;
  emailData?: any;
  smsData?: any;
  botData?: any;
}

export class PriorityNotificationService {
  private static instance: PriorityNotificationService;
  private logger: Logger;
  private emailService: EmailService;
  private smsService: SmsService;
  private botService: BotService;
  private priorityRouter: PriorityRouter;

  private constructor() {
    this.logger = Logger.getInstance();
    this.emailService = EmailService.getInstance();
    this.smsService = SmsService.getInstance();
    this.botService = BotService.getInstance();
    this.priorityRouter = PriorityRouter.getInstance();
  }

  static getInstance(): PriorityNotificationService {
    if (!PriorityNotificationService.instance) {
      PriorityNotificationService.instance = new PriorityNotificationService();
    }
    return PriorityNotificationService.instance;
  }

  /**
   * Send notification via all appropriate channels based on priority
   */
  async sendPriorityNotification(
    context: NotificationContext,
    notificationData: MultiChannelNotification
  ): Promise<PriorityNotificationResult> {
    const result: PriorityNotificationResult = {
      success: false,
      channelResults: new Map(),
      errors: [],
      totalCost: 0,
      totalChannels: 0,
      reasoning: '',
    };

    try {
      // Determine routing strategy
      const routing = await this.priorityRouter.determineRouting(context);

      this.logger.info('Multi-channel priority notification routing determined', {
        userId: context.userId,
        eventType: context.eventType,
        priority: routing.priority,
        channels: routing.channels,
        confidence: routing.confidence,
        reasoning: routing.reasoning
      });

      result.reasoning = routing.reasoning;

      // Send via each selected channel
      for (const channel of routing.channels) {
        try {
          const channelResult = await this.sendViaChannel(channel, context, notificationData, routing);
          result.channelResults.set(channel, channelResult);

          if (channelResult.success) {
            result.totalChannels++;
            result.totalCost += this.calculateChannelCost(channel, routing.priority);
          } else {
            result.errors.push({
              channel,
              error: channelResult.error || 'Unknown error'
            });
          }
        } catch (error) {
          this.logger.error(`Failed to send via channel ${channel}`, { error, channel, context });
          result.errors.push({
            channel,
            error: (error as Error).message
          });
        }
      }

      // Determine primary channel (first successful one)
      for (const [channel, channelResult] of result.channelResults.entries()) {
        if (channelResult.success) {
          result.primaryChannel = channel;
          break;
        }
      }

      // Success if at least one channel succeeded
      result.success = result.totalChannels > 0;

      this.logger.info('Multi-channel notification completed', {
        userId: context.userId,
        eventType: context.eventType,
        success: result.success,
        totalChannels: result.totalChannels,
        totalCost: result.totalCost,
        errors: result.errors.length
      });

    } catch (error) {
      this.logger.error('Failed to send priority notification', { error, context, notificationData });
      result.success = false;
          result.errors.push({
            channel: 'email' as NotificationChannel,
            error: (error as Error).message
          });
    }

    return result;
  }

  /**
   * Send notification via specific channel
   */
  private async sendViaChannel(
    channel: NotificationChannel,
    context: NotificationContext,
    notificationData: MultiChannelNotification,
    routing: RoutingDecision
  ): Promise<any> {
    switch (channel) {
      case 'email':
        if (notificationData.emailData) {
          return await this.emailService.sendPriorityEmail(context, notificationData.emailData);
        }
        break;

      case 'sms':
        if (notificationData.smsData) {
          return await this.smsService.sendPrioritySms(context, notificationData.smsData);
        }
        break;

      case 'discord':
      case 'telegram':
        if (notificationData.botData) {
          // For bots, we need to send to the appropriate platform
          const platform = channel === 'discord' ? 'discord' : 'telegram';

          // This would require updating BotService to handle priority routing
          // For now, we'll return a placeholder
          this.logger.warn(`Bot priority routing not fully implemented for ${channel}`);
          return {
            success: false,
            error: {
              code: 'NOT_IMPLEMENTED',
              message: `Priority routing for ${channel} not fully implemented`,
              provider: 'bot_service',
              retryable: false,
            },
            provider: 'bot_service',
            timestamp: new Date(),
          };
        }
        break;

      case 'push':
        // Push notifications would be handled by a separate push service
        this.logger.warn('Push notifications not implemented');
        return {
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Push notifications not implemented',
            provider: 'push_service',
            retryable: false,
          },
          provider: 'push_service',
          timestamp: new Date(),
        };

      case 'in_app':
        // In-app notifications would be handled by the app itself
        this.logger.warn('In-app notifications not implemented');
        return {
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'In-app notifications not implemented',
            provider: 'in_app_service',
            retryable: false,
          },
          provider: 'in_app_service',
          timestamp: new Date(),
        };
    }

    return {
      success: false,
      error: {
        code: 'NO_DATA',
        message: `No data provided for channel ${channel}`,
        provider: 'system',
        retryable: false,
      },
      provider: 'system',
      timestamp: new Date(),
    };
  }

  /**
   * Calculate cost for using a specific channel
   */
  private calculateChannelCost(channel: NotificationChannel, priority: string): number {
    const channelConfig = this.priorityRouter.getChannelConfig(channel);
    if (!channelConfig) return 0;

    // Base cost by channel
    let baseCost = 0;
    switch (channel) {
      case 'email': baseCost = 0.001; break; // $0.001 per email
      case 'sms': baseCost = 0.0075; break; // $0.0075 per SMS
      case 'push': baseCost = 0.0001; break; // $0.0001 per push
      case 'discord': baseCost = 0.0001; break; // $0.0001 per Discord message
      case 'telegram': baseCost = 0.0001; break; // $0.0001 per Telegram message
      case 'in_app': baseCost = 0; break; // Free
    }

    // Priority multiplier (higher priority = higher cost)
    const priorityMultiplier = {
      'critical': 2.0,
      'high': 1.5,
      'medium': 1.0,
      'low': 0.5
    }[priority] || 1.0;

    return baseCost * priorityMultiplier;
  }

  /**
   * Get priority routing configuration
   */
  getRoutingConfig(priority?: string) {
    if (priority) {
      return this.priorityRouter.getPriorityConfig(priority as any);
    }
    return this.priorityRouter.getAllPriorityConfigs();
  }

  /**
   * Set user priority override
   */
  setUserPriorityOverride(override: any): void {
    this.priorityRouter.setUserOverride(override);
  }

  /**
   * Remove user priority override
   */
  removeUserPriorityOverride(userId: string): boolean {
    return this.priorityRouter.removeUserOverride(userId);
  }

  /**
   * Get available channels for a priority
   */
  getAvailableChannels(priority: string): NotificationChannel[] {
    return this.priorityRouter.getAvailableChannels(priority as any);
  }
}
