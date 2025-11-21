/**
 * =========================================
 * NOTIFICATION DELIVERY ORCHESTRATOR
 * =========================================
 * Divine world-class notification delivery orchestration
 * End-to-end notification processing with retry, rate limiting, and logging
 */

// Note: Logger import would be uncommented when Logger is implemented
// import { Logger } from '@/utils/Logger';
import pLimit from 'p-limit';
import {
  AlertEvent,
  RoutingDecision,
  NotificationMessage,
  NotificationDelivery,
  NotificationLogEntry,
  NotificationStatus,
  NotificationChannel,
  INotificationProvider,
  INotificationCache,
  INotificationLogsStorage,
  IUserPreferencesStorage,
  IRateLimiter
} from '@/types';
import { NotificationRouter } from './NotificationRouter';
import { RetryManager, CircuitBreaker } from '@/utils/RetryManager';
import { AdaptiveRateLimiter } from '@/rate-limiting/RateLimiter';

/**
 * Notification delivery orchestrator
 */
export class NotificationDeliveryOrchestrator {
  private logger: any; // Logger
  private router: NotificationRouter;
  private providers: Map<NotificationChannel, INotificationProvider> = new Map();
  private retryManager: RetryManager;
  private rateLimiter: AdaptiveRateLimiter;
  private logsStorage: INotificationLogsStorage;
  private cache: INotificationCache;

  // Circuit breakers for each provider
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  // Concurrency control
  private concurrencyLimiter: any;

  constructor(
    router: NotificationRouter,
    rateLimiter: AdaptiveRateLimiter,
    logsStorage: INotificationLogsStorage,
    cache: INotificationCache,
    maxConcurrency: number = 10
  ) {
    // this.logger = new Logger('NotificationDeliveryOrchestrator'); // Commented out until Logger implemented
    this.router = router;
    this.rateLimiter = rateLimiter;
    this.logsStorage = logsStorage;
    this.cache = cache;
    this.retryManager = new RetryManager();
    this.concurrencyLimiter = pLimit(maxConcurrency);
  }

  /**
   * Register notification provider
   */
  async registerProvider(provider: INotificationProvider): Promise<void> {
    await provider.initialize();

    this.providers.set(provider.type, provider);

    // Create circuit breaker for provider
    this.circuitBreakers.set(provider.name, new CircuitBreaker(5, 60000)); // 5 failures, 1 minute reset

    // Note: Logger calls commented out until Logger is implemented
    // this.logger.info('Registered notification provider', {
    //   provider: provider.name,
    //   type: provider.type,
    // });
  }

  /**
   * Process alert event and deliver notifications
   */
  async processAlertEvent(event: AlertEvent): Promise<NotificationLogEntry> {
    const startTime = Date.now();
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Note: Logger calls commented out until Logger is implemented
    // this.logger.info('Processing alert event for delivery', {
    //   logId,
    //   eventId: event.id,
    //   userId: event.userId,
    //   type: event.type,
    //   severity: event.severity,
    // });

    try {
      // Step 1: Route event to channels
      const routingDecision = await this.router.routeEvent(event);

      if (routingDecision.selectedChannels.length === 0) {
        this.logger.info('No channels selected for delivery', {
          logId,
          eventId: event.id,
          reason: 'No suitable channels',
        });

        return this.createLogEntry(event, routingDecision, [], startTime, logId);
      }

      // Step 2: Create notification messages for each channel
      const messages = await this.createNotificationMessages(event, routingDecision);

      // Step 3: Deliver notifications in parallel
      const deliveryPromises = messages.map(message =>
        this.concurrencyLimiter(() => this.deliverNotification(message, logId))
      );

      const deliveries = await Promise.all(deliveryPromises);

      // Step 4: Create log entry
      const logEntry = this.createLogEntry(event, routingDecision, deliveries, startTime, logId);

      // Step 5: Store log entry
      await this.logsStorage.logDelivery(logEntry);

      const totalTime = Date.now() - startTime;

        // Note: Logger calls commented out until Logger is implemented
        // this.logger.info('Alert event processed successfully', {
        //   logId,
        //   eventId: event.id,
        //   channelsDelivered: deliveries.filter(d => d.status === NotificationStatus.SENT).length,
        //   totalDeliveries: deliveries.length,
        //   totalTime,
        // });

      return logEntry;

    } catch (error: any) {
      const totalTime = Date.now() - startTime;

      // Note: Logger calls commented out until Logger is implemented
      // this.logger.error('Failed to process alert event', {
      //   logId,
      //   eventId: event.id,
      //   error: error.message,
      //   totalTime,
      // });

      // Create error log entry
      const errorLogEntry = this.createLogEntry(event, {
        eventId: event.id,
        userId: event.userId,
        selectedChannels: [],
        filteredChannels: [{
          channel: NotificationChannel.EMAIL,
          reason: `Processing error: ${error.message}`,
        }],
        routedAt: Date.now(),
        processingTime: totalTime,
        preferencesSnapshot: {},
        rulesApplied: ['error'],
      }, [], startTime, logId);

      await this.logsStorage.logDelivery(errorLogEntry);

      return errorLogEntry;
    }
  }

  /**
   * Create notification messages for each selected channel
   */
  private async createNotificationMessages(
    event: AlertEvent,
    routingDecision: RoutingDecision
  ): Promise<NotificationMessage[]> {
    const messages: NotificationMessage[] = [];

    for (const channelInfo of routingDecision.selectedChannels) {
      const message = await this.createMessageForChannel(event, channelInfo);
      messages.push(message);
    }

    return messages;
  }

  /**
   * Create message for specific channel
   */
  private async createMessageForChannel(
    event: AlertEvent,
    channelInfo: {
      channel: NotificationChannel;
      priority: string;
      reason: string;
      estimatedDeliveryTime: number;
    }
  ): Promise<NotificationMessage> {
    // Get user preferences for channel customization
    const preferences = await this.router['getUserPreferences'](event.userId);
    const channelPref = preferences.channels.find(c => c.channel === channelInfo.channel);

    // Format message based on channel and preferences
    const formattedMessage = this.formatMessageForChannel(event, channelInfo.channel, channelPref);

    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventId: event.id,
      userId: event.userId,
      channel: channelInfo.channel,
      priority: channelInfo.priority as any,
      subject: formattedMessage.subject,
      body: formattedMessage.body,
      format: formattedMessage.format,
      metadata: {
        alertRuleId: event.alertRuleId,
        exchange: event.source.exchange,
        symbol: event.source.symbol,
        assetType: event.source.assetType,
        signalType: event.source.signalType,
        confidence: event.metrics.confidence,
        impact: event.metrics.impact,
        urgency: event.metrics.urgency,
        tags: event.tags,
      } as any, // Type assertion for metadata flexibility
      expiresAt: Date.now() + (event.ttl || 3600000), // 1 hour default
    };
  }

  /**
   * Format message for specific channel
   */
  private formatMessageForChannel(
    event: AlertEvent,
    channel: NotificationChannel,
    channelPref?: any
  ): {
    subject: string;
    body: string;
    format: 'text' | 'markdown' | 'html' | 'json';
  } {
    // Base message content
    let subject = event.title;
    let body = event.message;
    let format: 'text' | 'markdown' | 'html' | 'json' = 'text';

    // Customize based on channel and preferences
    switch (channel) {
      case NotificationChannel.EMAIL:
        format = channelPref?.content?.format === 'html' ? 'html' : 'markdown';
        if (format === 'html') {
          subject = `<strong>${subject}</strong>`;
          body = `<p>${body}</p>`;
          if (event.data.details) {
            body += `<pre>${JSON.stringify(event.data.details, null, 2)}</pre>`;
          }
        } else {
          // Markdown format
          body += `\n\n**Details:**\n${JSON.stringify(event.data.details || {}, null, 2)}`;
        }
        break;

      case NotificationChannel.SMS:
        format = 'text';
        // Keep very short for SMS
        subject = subject.length > 50 ? subject.substring(0, 47) + '...' : subject;
        body = body.length > 100 ? body.substring(0, 97) + '...' : body;
        break;

      case NotificationChannel.WEBHOOK:
        format = 'json';
        // Webhook gets full JSON structure
        break;

      case NotificationChannel.PUSH:
        format = 'text';
        // Push notifications should be concise
        break;

      default:
        format = 'text';
    }

    return { subject, body, format };
  }

  /**
   * Deliver single notification with retry logic
   */
  private async deliverNotification(
    message: NotificationMessage,
    logId: string
  ): Promise<NotificationDelivery> {
    const deliveryId = `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Note: Logger calls commented out until Logger is implemented
    // this.logger.debug('Delivering notification', {
    //   deliveryId,
    //   messageId: message.id,
    //   channel: message.channel,
    //   provider: message.channel, // Simplified mapping
    // });

    try {
      // Get provider for channel
      const provider = this.providers.get(message.channel);

      if (!provider) {
        throw new Error(`No provider available for channel: ${message.channel}`);
      }

      // Check rate limits
      const rateLimitResult = await this.rateLimiter.checkAdaptiveLimit(
        `user:${message.userId}:channel:${message.channel}`,
        provider.name,
        this.getChannelRateLimit(message.channel),
        60000 // 1 minute window
      );

      if (!rateLimitResult.allowed) {
        return {
          id: deliveryId,
          messageId: message.id,
          eventId: message.eventId,
          userId: message.userId,
          channel: message.channel,
          provider: provider.name,
          status: NotificationStatus.FAILED,
          retryAttempts: 0,
          processingTime: Date.now() - startTime,
          error: {
            code: 'RATE_LIMITED',
            message: 'Rate limit exceeded',
            details: { retryAfter: rateLimitResult.retryAfter },
          },
          rateLimit: {
            hitLimit: true,
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime,
          },
        };
      }

      // Execute delivery with retry logic and circuit breaker
      const retryResult = await this.retryManager.executeWithRetry(
        async () => {
          return await this.circuitBreakers.get(provider.name)!.executeWithCircuitBreaker(
            async () => {
              const response = await provider.send(message);

              // Update provider health metrics
              this.rateLimiter.updateProviderHealth(provider.name, {
                success: response.status === 'success',
                responseTime: response.responseTime,
              });

              return response;
            },
            { messageId: message.id, channel: message.channel }
          );
        },
        { messageId: message.id, channel: message.channel }
      );

      // Increment rate limit counter (simplified for now)
      // await this.rateLimiter.increment(
      //   `user:${message.userId}:channel:${message.channel}`,
      //   60000
      // );

      if (retryResult.success && retryResult.result) {
        const response = retryResult.result;

        return {
          id: deliveryId,
          messageId: message.id,
          eventId: message.eventId,
          userId: message.userId,
          channel: message.channel,
          provider: provider.name,
          status: this.mapProviderStatusToNotificationStatus(response.status),
          deliveredAt: Date.now(),
          providerResponse: response,
          retryAttempts: retryResult.attempts - 1,
          processingTime: retryResult.totalTime,
        };

      } else {
        return {
          id: deliveryId,
          messageId: message.id,
          eventId: message.eventId,
          userId: message.userId,
          channel: message.channel,
          provider: provider.name,
          status: NotificationStatus.FAILED,
          retryAttempts: retryResult.attempts - 1,
          processingTime: retryResult.totalTime,
          error: {
            code: 'DELIVERY_FAILED',
            message: retryResult.error?.message || 'Unknown delivery error',
          },
        };
      }

    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      // Note: Logger calls commented out until Logger is implemented
      // this.logger.error('Notification delivery failed', {
      //   deliveryId,
      //   messageId: message.id,
      //   channel: message.channel,
      //   error: error.message,
      //   processingTime,
      // });

      return {
        id: deliveryId,
        messageId: message.id,
        eventId: message.eventId,
        userId: message.userId,
        channel: message.channel,
        provider: message.channel, // Fallback
        status: NotificationStatus.FAILED,
        retryAttempts: 0,
        processingTime,
        error: {
          code: 'DELIVERY_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * Map provider status to notification status
   */
  private mapProviderStatusToNotificationStatus(providerStatus: string): NotificationStatus {
    switch (providerStatus) {
      case 'success':
        return NotificationStatus.SENT;
      case 'rate_limited':
        return NotificationStatus.FAILED;
      case 'timeout':
        return NotificationStatus.FAILED;
      default:
        return NotificationStatus.FAILED;
    }
  }

  /**
   * Get rate limit for channel
   */
  private getChannelRateLimit(channel: NotificationChannel): number {
    const channelLimits = {
      [NotificationChannel.EMAIL]: 30, // 30 per minute
      [NotificationChannel.SMS]: 10, // 10 per minute
      [NotificationChannel.PUSH]: 100, // 100 per minute
      [NotificationChannel.WEBHOOK]: 60, // 60 per minute
      [NotificationChannel.TELEGRAM]: 30, // 30 per minute
      [NotificationChannel.DISCORD]: 20, // 20 per minute
      [NotificationChannel.SLACK]: 20, // 20 per minute
      [NotificationChannel.IN_APP]: 1000, // 1000 per minute
    };

    return channelLimits[channel] || 10;
  }

  /**
   * Create log entry from delivery results
   */
  private createLogEntry(
    event: AlertEvent,
    routingDecision: RoutingDecision,
    deliveries: NotificationDelivery[],
    startTime: number,
    logId: string
  ): NotificationLogEntry {
    const totalTime = Date.now() - startTime;

    // Calculate error summary
    const failedDeliveries = deliveries.filter(d => d.status === NotificationStatus.FAILED);
    const lastErrorMessage = failedDeliveries[failedDeliveries.length - 1]?.error?.message;
    const errorSummary = failedDeliveries.length > 0 ? {
      totalFailures: failedDeliveries.length,
      errorCodes: failedDeliveries.reduce((acc, d) => {
        const code = d.error?.code || 'UNKNOWN';
        acc[code] = (acc[code] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      lastError: lastErrorMessage,
    } : undefined;

    // Calculate metrics
    const routingTime = routingDecision.processingTime;
    const deliveryTime = totalTime - routingTime;
    const retryCount = deliveries.reduce((sum, d) => sum + d.retryAttempts, 0);

    const baseLogEntry = {
      id: logId,
      eventId: event.id,
      alertRuleId: event.alertRuleId,
      userId: event.userId,
      message: deliveries[0]?.messageId ? {
        id: deliveries[0].messageId,
        eventId: event.id,
        userId: event.userId,
        channel: deliveries[0].channel,
        priority: event.severity,
        subject: event.title,
        body: event.message,
        format: 'text' as const,
        metadata: event.source,
      } : {
        id: 'unknown',
        eventId: event.id,
        userId: event.userId,
        channel: NotificationChannel.EMAIL,
        priority: event.severity,
        subject: event.title,
        body: event.message,
        format: 'text' as const,
        metadata: event.source,
      },
      routingDecision,
      deliveries,
      status: this.calculateOverallStatus(deliveries),
      startedAt: startTime,
      completedAt: Date.now(),
      totalTime,
      metrics: {
        routingTime,
        deliveryTime,
        totalTime,
        retryCount,
        cacheHits: 0, // Would need to track this
      },
      metadata: {
        source: 'send-notifications-service',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
    };

    // Conditionally add errorSummary only if it exists
    return errorSummary ? { ...baseLogEntry, errorSummary } : baseLogEntry;
  }

  /**
   * Calculate overall notification status
   */
  private calculateOverallStatus(deliveries: NotificationDelivery[]): NotificationStatus {
    if (deliveries.length === 0) return NotificationStatus.FAILED;

    const sentCount = deliveries.filter(d => d.status === NotificationStatus.SENT).length;
    const failedCount = deliveries.filter(d => d.status === NotificationStatus.FAILED).length;

    if (sentCount === deliveries.length) return NotificationStatus.SENT;
    if (failedCount === deliveries.length) return NotificationStatus.FAILED;
    if (sentCount > 0) return NotificationStatus.SENT; // Partial success

    return NotificationStatus.FAILED;
  }

  /**
   * Get registered providers
   */
  getRegisteredProviders(): INotificationProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider health status
   */
  getProviderHealth(providerName: string): any {
    return this.rateLimiter.getProviderHealth(providerName);
  }

  /**
   * Get all provider health statuses
   */
  getAllProviderHealth(): Record<string, any> {
    return this.rateLimiter.getAllProviderHealth();
  }

  /**
   * Clear caches and reset state
   */
  async reset(): Promise<void> {
    // this.cache.invalidate('*'); // Simplified for now
    this.circuitBreakers.clear();
    // this.logger.info('Notification delivery orchestrator reset'); // Commented out until Logger implemented
  }
}
