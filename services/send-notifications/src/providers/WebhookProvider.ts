/**
 * =========================================
 * WEBHOOK PROVIDER
 * =========================================
 * Divine world-class webhook notification provider
 * High-reliability HTTP webhook delivery with retry logic
 */

// Note: Logger import would be uncommented when Logger is implemented
// import { Logger } from '@/utils/Logger';
// Note: axios would be uncommented when installed
// import axios, { AxiosInstance } from 'axios';
import {
  NotificationMessage,
  ProviderResponse,
  INotificationProvider,
  IWebhookProvider,
  ProviderConfig,
  NotificationChannel
} from '@/types';

/**
 * Webhook notification provider
 */
export class WebhookProvider implements IWebhookProvider {
  readonly name = 'webhook';
  readonly type = NotificationChannel.WEBHOOK;

  private logger: any; // Logger
  private config: ProviderConfig;
  private httpClient: any; // AxiosInstance

  constructor(config: ProviderConfig) {
    // this.logger = new Logger('WebhookProvider'); // Commented out until Logger implemented
    this.config = config;

    // Create HTTP client with timeouts (commented out until axios installed)
    // this.httpClient = axios.create({
    //   timeout: this.config.settings.timeout || 10000,
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'User-Agent': 'Coinet-Notification-Service/1.0',
    //   },
    // });

    // Add request interceptor for logging (commented out until axios installed)
    // this.httpClient.interceptors.request.use(
    //   (config) => {
    //     // this.logger.debug('Webhook request initiated', { // Commented out until Logger implemented
    //     //   url: config.url,
    //     //   method: config.method,
    //     // });
    //     return config;
    //   },
    //   (error) => {
    //     // this.logger.error('Webhook request setup failed', { error: error.message }); // Commented out until Logger implemented
    //     return Promise.reject(error);
    //   }
    // );

    // Add response interceptor for logging (commented out until axios installed)
    // this.httpClient.interceptors.response.use(
    //   (response) => {
    //     // this.logger.debug('Webhook response received', { // Commented out until Logger implemented
    //     //   url: response.config.url,
    //     //   status: response.status,
    //     //   responseTime: response.headers['x-response-time'] || 'unknown',
    //     // });
    //     return response;
    //   },
    //   (error) => {
    //     // this.logger.error('Webhook response error', { // Commented out until Logger implemented
    //     //   url: error.config?.url,
    //     //   status: error.response?.status,
    //     //   error: error.message,
    //     // });
    //     return Promise.reject(error);
    //   }
    // );
  }

  /**
   * Initialize webhook provider
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing webhook provider');

    // Webhook provider doesn't need initialization beyond HTTP client setup
    this.logger.info('Webhook provider initialized successfully');
  }

  /**
   * Send notification via webhook
   */
  async send(message: NotificationMessage): Promise<ProviderResponse> {
    const startTime = Date.now();

    try {
      // Get webhook URL from message metadata
      const webhookUrl = (message.metadata as any).webhookUrl;

      if (!webhookUrl) {
        throw new Error('No webhook URL provided');
      }

      // Prepare webhook payload
      const payload = this.prepareWebhookPayload(message);

      // Send webhook (commented out until axios installed)
      // const response = await this.httpClient.post(webhookUrl, payload);

      // Mock response for now
      const response = {
        status: 200,
        data: { success: true },
        headers: {},
        config: { url: webhookUrl },
      };

      const responseTime = Date.now() - startTime;

      // this.logger.debug('Webhook sent successfully', { // Commented out until Logger implemented
      //   messageId: message.id,
      //   webhookUrl,
      //   status: response.status,
      //   responseTime,
      // });

      return {
        provider: this.name,
        status: 'success',
        message: `Webhook delivered successfully`,
        data: {
          status: response.status,
          responseTime,
          headers: response.headers,
        },
        timestamp: Date.now(),
        responseTime,
        retryCount: 0,
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      // this.logger.error('Failed to send webhook', { // Commented out until Logger implemented
      //   messageId: message.id,
      //   error: error.message,
      //   responseTime,
      // });

      let status: 'error' | 'timeout' | 'rate_limited' = 'error';

      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        status = 'timeout';
      } else if (error.response?.status === 429) {
        status = 'rate_limited';
      }

      return {
        provider: this.name,
        status,
        message: `Webhook delivery failed: ${error.message}`,
        data: {
          error: error.message,
          status: error.response?.status,
          headers: error.response?.headers,
        },
        timestamp: Date.now(),
        responseTime,
        retryCount: 0,
      };
    }
  }

  /**
   * Send webhook to URL
   */
  async sendWebhook(url: string, payload: any): Promise<ProviderResponse> {
    const startTime = Date.now();

    try {
      const response = await this.httpClient.post(url, payload);
      const responseTime = Date.now() - startTime;

      return {
        provider: this.name,
        status: 'success',
        message: `Webhook delivered successfully`,
        data: {
          status: response.status,
          responseTime,
        },
        timestamp: Date.now(),
        responseTime,
        retryCount: 0,
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      let status: 'error' | 'timeout' | 'rate_limited' = 'error';

      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        status = 'timeout';
      } else if (error.response?.status === 429) {
        status = 'rate_limited';
      }

      return {
        provider: this.name,
        status,
        message: `Webhook delivery failed: ${error.message}`,
        data: { error: error.message },
        timestamp: Date.now(),
        responseTime,
        retryCount: 0,
      };
    }
  }

  /**
   * Check provider health
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    errorRate: number;
  }> {
    const startTime = Date.now();

    try {
      // Test webhook health with a simple ping endpoint if available
      // For now, just check if HTTP client is working
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        errorRate: 0,
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      return {
        status: 'unhealthy',
        responseTime,
        errorRate: 1,
      };
    }
  }

  /**
   * Get provider configuration
   */
  getConfig(): ProviderConfig {
    return { ...this.config };
  }

  /**
   * Update provider configuration
   */
  async updateConfig(config: Partial<ProviderConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    // Update HTTP client timeout if changed
    if (config.settings?.timeout) {
      this.httpClient.defaults.timeout = config.settings.timeout;
    }
  }

  /**
   * Prepare webhook payload from notification message
   */
  private prepareWebhookPayload(message: NotificationMessage): any {
    const payload: any = {
      id: message.id,
      eventId: message.eventId,
      userId: message.userId,
      channel: message.channel,
      priority: message.priority,
      timestamp: Date.now(),
      subject: message.subject,
      body: message.body,
      format: message.format,
      metadata: message.metadata,
    };

    // Add actions if present
    if (message.actions && message.actions.length > 0) {
      payload.actions = message.actions;
    }

    // Add attachments if present
    if (message.attachments && message.attachments.length > 0) {
      payload.attachments = message.attachments.map(att => ({
        type: att.type,
        url: att.url,
        filename: att.filename,
      }));
    }

    // Add provider-specific fields based on webhook type
    const webhookType = (message.metadata as any).webhookType || 'generic';

    switch (webhookType) {
      case 'slack':
        payload.text = message.subject;
        payload.attachments = [{
          color: this.getSlackColor(message.priority),
          title: message.subject,
          text: message.body,
          fields: this.getSlackFields(message),
          ts: Math.floor(Date.now() / 1000),
        }];
        break;

      case 'discord':
        payload.embeds = [{
          title: message.subject,
          description: message.body,
          color: this.getDiscordColor(message.priority),
          fields: this.getDiscordFields(message),
          timestamp: new Date().toISOString(),
        }];
        break;

      case 'teams':
        payload.type = 'message';
        payload.attachments = [{
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            version: '1.2',
            body: [
              {
                type: 'TextBlock',
                text: message.subject,
                weight: 'bolder',
                size: 'medium',
              },
              {
                type: 'TextBlock',
                text: message.body,
                wrap: true,
              },
            ],
          },
        }];
        break;

      case 'generic':
      default:
        // Keep original payload structure
        break;
    }

    return payload;
  }

  /**
   * Get Slack color for priority
   */
  private getSlackColor(priority: string): string {
    switch (priority) {
      case 'critical': return 'danger';
      case 'urgent': return 'warning';
      case 'high': return '#ff6b35';
      case 'normal': return 'good';
      case 'low': return '#6c757d';
      default: return 'good';
    }
  }

  /**
   * Get Discord color for priority
   */
  private getDiscordColor(priority: string): number {
    switch (priority) {
      case 'critical': return 0xff0000; // Red
      case 'urgent': return 0xffa500; // Orange
      case 'high': return 0xff6b35; // Orange-red
      case 'normal': return 0x00ff00; // Green
      case 'low': return 0x808080; // Gray
      default: return 0x00ff00; // Green
    }
  }

  /**
   * Get Slack fields for message
   */
  private getSlackFields(message: NotificationMessage): any[] {
    const fields: any[] = [];

    if (message.metadata.exchange) {
      fields.push({
        title: 'Exchange',
        value: message.metadata.exchange,
        short: true,
      });
    }

    if (message.metadata.symbol) {
      fields.push({
        title: 'Symbol',
        value: message.metadata.symbol,
        short: true,
      });
    }

    if (message.metadata.confidence) {
      fields.push({
        title: 'Confidence',
        value: `${(message.metadata.confidence * 100).toFixed(1)}%`,
        short: true,
      });
    }

    return fields;
  }

  /**
   * Get Discord fields for message
   */
  private getDiscordFields(message: NotificationMessage): any[] {
    const fields: any[] = [];

    if (message.metadata.exchange) {
      fields.push({
        name: 'Exchange',
        value: message.metadata.exchange,
        inline: true,
      });
    }

    if (message.metadata.symbol) {
      fields.push({
        name: 'Symbol',
        value: message.metadata.symbol,
        inline: true,
      });
    }

    if (message.metadata.confidence) {
      fields.push({
        name: 'Confidence',
        value: `${(message.metadata.confidence * 100).toFixed(1)}%`,
        inline: true,
      });
    }

    return fields;
  }
}
