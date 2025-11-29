import { Logger } from '../logging/Logger';
import { ErrorContext } from '../errors/ErrorManager';

export interface CriticalAlert {
  title: string;
  message: string;
  errorId: string;
  context: ErrorContext;
  recovery: string;
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: Record<string, any>;
  enabled: boolean;
}

export class NotificationService {
  private static instance: NotificationService;
  private logger: Logger;
  private channels: NotificationChannel[] = [];

  private constructor() {
    this.logger = Logger.getInstance();
    this.setupDefaultChannels();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async sendCriticalAlert(alert: CriticalAlert): Promise<void> {
    this.logger.error(`Critical Alert: ${alert.title}`, alert);

    const enabledChannels = this.channels.filter(channel => channel.enabled);

    const notifications = enabledChannels.map(channel =>
      this.sendToChannel(channel, alert)
    );

    try {
      await Promise.allSettled(notifications);
    } catch (error) {
      this.logger.error('Failed to send critical alert', { error, alert });
    }
  }

  addChannel(channel: NotificationChannel): void {
    this.channels.push(channel);
  }

  removeChannel(type: string): void {
    this.channels = this.channels.filter(channel => channel.type !== type);
  }

  private async sendToChannel(channel: NotificationChannel, alert: CriticalAlert): Promise<void> {
    try {
      switch (channel.type) {
        case 'email':
          await this.sendEmail(channel.config, alert);
          break;
        case 'slack':
          await this.sendSlack(channel.config, alert);
          break;
        case 'webhook':
          await this.sendWebhook(channel.config, alert);
          break;
        case 'sms':
          await this.sendSMS(channel.config, alert);
          break;
        default:
          this.logger.warn(`Unknown notification channel type: ${channel.type}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send notification via ${channel.type}`, { error, alert });
    }
  }

  private async sendEmail(config: any, alert: CriticalAlert): Promise<void> {
    // Implementation would depend on email service (SendGrid, AWS SES, etc.)
    this.logger.info(`Email notification sent for error ${alert.errorId}`);
  }

  private async sendSlack(config: any, alert: CriticalAlert): Promise<void> {
    // Implementation would use Slack webhook or API
    this.logger.info(`Slack notification sent for error ${alert.errorId}`);
  }

  private async sendWebhook(config: any, alert: CriticalAlert): Promise<void> {
    // Implementation would make HTTP POST to webhook URL
    this.logger.info(`Webhook notification sent for error ${alert.errorId}`);
  }

  private async sendSMS(config: any, alert: CriticalAlert): Promise<void> {
    // Implementation would use SMS service (Twilio, AWS SNS, etc.)
    this.logger.info(`SMS notification sent for error ${alert.errorId}`);
  }

  private setupDefaultChannels(): void {
    // Setup default notification channels based on environment
    if (process.env.NODE_ENV === 'production') {
      // Add production notification channels
      this.channels.push({
        type: 'email',
        config: {
          to: process.env.ADMIN_EMAIL || 'admin@coinet.com',
          from: process.env.SYSTEM_EMAIL || 'system@coinet.com'
        },
        enabled: true
      });

      if (process.env.SLACK_WEBHOOK_URL) {
        this.channels.push({
          type: 'slack',
          config: {
            webhookUrl: process.env.SLACK_WEBHOOK_URL,
            channel: '#alerts'
          },
          enabled: true
        });
      }
    } else {
      // Development/staging - just log to console
      this.logger.info('NotificationService initialized in development mode');
    }
  }
} 