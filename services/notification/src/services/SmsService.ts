import {
  SmsData,
  SmsResult,
  SmsTemplate,
  SmsTemplateVariable,
  SmsUserPreference,
  SmsCampaign,
  SmsFallbackConfig,
  SmsServiceConfig,
  ApiResponse,
  SmsStatus,
} from '@/types';
import { SmsProviderManager } from './sms/providers/SmsProviderManager';
import { SmsTemplateEngine, SmsRenderOptions } from './sms/SmsTemplateEngine';
import { SmsRateLimiter, RateLimitCheck } from './sms/SmsRateLimiter';
import { SmsStatusTracker } from './sms/SmsStatusTracker';
import { SmsFallbackService, FallbackResult } from './sms/SmsFallbackService';
import { WebhookService } from './WebhookService';
import { PreferenceService } from './preferences/PreferenceService';
import { PriorityRouter, NotificationContext, RoutingDecision } from './priority/PriorityRouter';
import { DeliveryTracker, DeliveryChannel } from './delivery/DeliveryTracker';
import { Logger } from '@/utils/Logger';

export interface SmsSendRequest {
  to: string;
  body?: string;
  from?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  campaignId?: string;
  fallbackConfig?: SmsFallbackConfig;
  userId?: string;
  metadata?: Record<string, any>;
  maxLength?: number;
}

export class SmsService {
  private static instance: SmsService;
  private providerManager: SmsProviderManager;
  private templateEngine: SmsTemplateEngine;
  private rateLimiter: SmsRateLimiter;
  private statusTracker: SmsStatusTracker;
  private fallbackService: SmsFallbackService;
  private webhookService: WebhookService;
  private preferenceService: PreferenceService;
  private priorityRouter: PriorityRouter;
  private deliveryTracker: DeliveryTracker;
  private logger: Logger;
  private config: SmsServiceConfig;

  private constructor(config?: Partial<SmsServiceConfig>) {
    this.logger = Logger.getInstance();

    // Default configuration
    this.config = {
      providers: [],
      defaultProvider: 'twilio',
      fallbackEnabled: true,
      maxRetries: 3,
      retryDelay: 1000,
      rateLimiting: {
        enabled: true,
        defaultLimits: {
          maxPerMinute: 10,
          maxPerHour: 100,
          maxPerDay: 500,
          maxPerMonth: 10000,
        },
        providerLimits: {
          maxPerMinute: 50,
          maxPerHour: 1000,
          maxPerDay: 5000,
          maxPerMonth: 100000,
        },
      },
      monitoring: {
        enabled: true,
        metricsInterval: 300, // 5 minutes
        alertThresholds: {
          failureRate: 0.05, // 5%
          deliveryRate: 0.95, // 95%
        },
      },
      ...config,
    };

    this.providerManager = SmsProviderManager.getInstance(
      this.config.fallbackEnabled,
      this.config.maxRetries,
      this.config.retryDelay
    );

    this.templateEngine = SmsTemplateEngine.getInstance();
    this.rateLimiter = SmsRateLimiter.getInstance();
    this.statusTracker = SmsStatusTracker.getInstance();
    this.fallbackService = SmsFallbackService.getInstance();
    this.webhookService = WebhookService.getInstance();
    this.preferenceService = PreferenceService.getInstance();
    this.priorityRouter = PriorityRouter.getInstance();
    this.deliveryTracker = DeliveryTracker.getInstance();

    this.initialize();
  }

  static getInstance(config?: Partial<SmsServiceConfig>): SmsService {
    if (!SmsService.instance) {
      SmsService.instance = new SmsService(config);
    }
    return SmsService.instance;
  }

  private async initialize(): Promise<void> {
    this.logger.info('Initializing SmsService...');

    try {
      // Initialize providers from configuration
      if (this.config.providers.length > 0) {
        const providers = await SmsProviderManager.createProvidersFromConfig(this.config.providers);
        for (const provider of providers) {
          this.providerManager.addProvider(provider);
        }
      }

      // Set up default SMS templates
      await this.setupDefaultTemplates();

      this.logger.info('SmsService initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize SmsService', { error });
      throw error;
    }
  }

  /**
   * Send a single SMS
   */
  async sendSms(smsData: SmsData): Promise<SmsResult> {
    let deliveryId: string | undefined;

    try {
      this.logger.logSmsEvent('send_attempt', smsData);

      // Create delivery tracking record
      deliveryId = await this.deliveryTracker.createDelivery(
        `sms-${Date.now()}`,
        smsData.to,
        `sms.${smsData.priority || 'medium'}`,
        smsData.priority || 'medium',
        ['sms'],
        smsData.metadata?.groupId,
        smsData.metadata?.idempotencyKey
      );

      // Check rate limits
      if (this.config.rateLimiting.enabled) {
        const destinationCheck = await this.rateLimiter.checkDestinationRateLimit(
          smsData.to,
          smsData.metadata?.userId,
          smsData.priority
        );

        if (!destinationCheck.allowed) {
          this.logger.warn(`SMS rate limit exceeded for ${smsData.to}`, {
            reason: destinationCheck.reason,
          });

          return {
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: `Rate limit exceeded: ${destinationCheck.reason}`,
              provider: 'system',
              retryable: false,
            },
            provider: 'system',
            timestamp: new Date(),
          };
        }

        const providerCheck = await this.rateLimiter.checkProviderRateLimit(
          this.config.defaultProvider,
          smsData.priority
        );

        if (!providerCheck.allowed) {
          this.logger.warn(`SMS provider rate limit exceeded`, {
            provider: this.config.defaultProvider,
            reason: providerCheck.reason,
          });

          return {
            success: false,
            error: {
              code: 'PROVIDER_RATE_LIMIT_EXCEEDED',
              message: `Provider rate limit exceeded: ${providerCheck.reason}`,
              provider: 'system',
              retryable: true,
            },
            provider: 'system',
            timestamp: new Date(),
          };
        }
      }

      // Check quiet hours preferences for this recipient
      const preferenceCheck = await this.preferenceService.checkNotificationDelivery(
        smsData.to,
        'sms',
        `sms.${smsData.priority || 'normal'}`,
        smsData.priority || 'normal'
      );

      if (!preferenceCheck.shouldSend) {
        this.logger.info(`SMS queued due to quiet hours: ${smsData.to}`, {
          reason: preferenceCheck.reason,
          scheduledFor: preferenceCheck.scheduledFor,
        });

        // Queue the notification for later delivery
        if (preferenceCheck.queueForLater && preferenceCheck.scheduledFor) {
          await this.preferenceService.queueNotification(
            smsData.to,
            'sms',
            `sms.${smsData.priority || 'normal'}`,
            {
              to: smsData.to,
              from: smsData.from,
              body: smsData.body,
              priority: smsData.priority,
              campaignId: smsData.campaignId,
              originalSendTime: new Date(),
            },
            smsData.priority || 'medium',
            preferenceCheck.scheduledFor
          );
        }

        return {
          success: false,
          error: {
            code: 'QUIET_HOURS_ACTIVE',
            message: preferenceCheck.reason,
            provider: 'system',
            retryable: preferenceCheck.overrideRequired ? false : true,
          },
          provider: 'system',
          timestamp: new Date(),
        };
      }

      // Send via provider manager
      const startTime = Date.now();
      const result = await this.providerManager.sendSms(smsData);
      const responseTime = Date.now() - startTime;

      // Record delivery attempt
      await this.deliveryTracker.recordAttempt(
        deliveryId!,
        'sms',
        result.provider,
        result.success ? 'delivered' : 'failed',
        {
          messageId: result.messageId,
          providerResponse: result,
          recipient: smsData.to
        },
        result.error?.code,
        result.error?.message,
        responseTime,
        result.metadata?.cost || 0.0075 // Default SMS cost estimate
      );

      // Record rate limit usage if successful
      if (result.success && this.config.rateLimiting.enabled) {
        this.rateLimiter.recordSmsSend(
          smsData.to,
          result.provider,
          smsData.metadata?.userId,
          smsData.priority
        );
      }

      // Track status
      if (result.messageId) {
        await this.statusTracker.recordStatusUpdate(
          result.messageId,
          result.provider,
          'sent'
        );
      }

      // Trigger webhooks for SMS events
      if (result.success && result.messageId) {
        await this.webhookService.deliverWebhookEvent({
          eventType: 'sms.sent',
          source: 'sms',
          sourceId: result.messageId,
          payload: {
            to: smsData.to,
            from: smsData.from,
            body: smsData.body,
            messageId: result.messageId,
            provider: result.provider,
            timestamp: result.timestamp,
            deliveryId,
          },
        });
      }

      // Update result with delivery tracking info
      const enhancedResult: SmsResult = {
        ...result,
        metadata: {
          ...result.metadata,
          deliveryId,
          responseTime,
          retryCount: 0 // Will be updated by delivery tracker
        }
      };

      this.logger.logSmsEvent(result.success ? 'send_success' : 'send_failure', smsData, {
        provider: result.provider,
        messageId: result.messageId,
        error: result.error,
        deliveryId,
        responseTime,
      });

      return enhancedResult;

    } catch (error) {
      const errorMessage = (error as Error).message;

      // Record failed delivery attempt
      if (deliveryId) {
        await this.deliveryTracker.recordAttempt(
          deliveryId,
          'sms',
          'system',
          'failed',
          { error: errorMessage },
          'SERVICE_ERROR',
          errorMessage
        );
      }

      this.logger.logSmsError('send_error', smsData, { error });
      return {
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: `SMS service error: ${errorMessage}`,
          provider: 'system',
          retryable: true,
        },
        provider: 'system',
        metadata: { deliveryId },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send SMS using template
   */
  async sendTemplatedSms(
    templateId: string,
    templateData: Record<string, any>,
    smsRequest: SmsSendRequest,
    options?: SmsRenderOptions
  ): Promise<SmsResult> {
    try {
      // Validate template data
      const validation = this.templateEngine.validateTemplateData(templateId, templateData);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'TEMPLATE_VALIDATION_ERROR',
            message: `Template validation failed: ${validation.errors.join(', ')}`,
            provider: 'system',
            retryable: false,
          },
          provider: 'system',
          timestamp: new Date(),
        };
      }

      // Render template
      const rendered = await this.templateEngine.renderTemplate(templateId, templateData, options);

      if (rendered.errors && rendered.errors.length > 0) {
        this.logger.warn(`SMS template rendered with errors: ${templateId}`, { errors: rendered.errors });
      }

      // Build final SMS data
      const finalSmsData: SmsData = {
        to: smsRequest.to,
        body: rendered.body,
        priority: smsRequest.priority || 'normal',
        templateId,
        templateData,
        metadata: {
          templateId,
          templateData,
          ...smsRequest.metadata,
        },
      };

      if (smsRequest.from) {
        finalSmsData.from = smsRequest.from;
      }

      if (smsRequest.campaignId) {
        finalSmsData.campaignId = smsRequest.campaignId;
      }

      if (smsRequest.maxLength) {
        finalSmsData.maxLength = smsRequest.maxLength;
      }

      // Send SMS with fallback if configured
      const smsResult = await this.sendSms(finalSmsData);

      // Attempt fallback if SMS failed and fallback is configured
      if (!smsResult.success && smsRequest.fallbackConfig) {
        const fallbackResult = await this.fallbackService.sendWithFallback(
          finalSmsData,
          smsRequest.fallbackConfig,
          smsResult
        );

        if (fallbackResult.finalSuccess) {
          this.logger.info('SMS fallback succeeded', {
            messageId: smsResult.messageId,
            finalChannel: fallbackResult.finalChannel,
          });

          const result: SmsResult = {
            success: true,
            provider: smsResult.provider,
            metadata: {
              ...smsResult.metadata,
              fallbackResult,
            },
            timestamp: new Date(),
          };

          if (smsResult.messageId) {
            result.messageId = smsResult.messageId;
          }

          return result;
        }
      }

      return smsResult;

    } catch (error) {
      this.logger.logSmsError('templated_send_error', smsRequest, { error, templateId });
      return {
        success: false,
        error: {
          code: 'TEMPLATE_ERROR',
          message: `SMS template rendering failed: ${(error as Error).message}`,
          provider: 'system',
          retryable: true,
        },
        provider: 'system',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send SMS to multiple recipients
   */
  async sendBulkSms(smsList: SmsData[]): Promise<SmsResult[]> {
    if (smsList.length === 0) {
      return [];
    }

    if (smsList.length > 1000) {
      throw new Error('Bulk SMS limited to 1000 messages per call');
    }

    const results: SmsResult[] = [];

    // Process messages in batches to respect rate limits
    const batchSize = 10;
    for (let i = 0; i < smsList.length; i += batchSize) {
      const batch = smsList.slice(i, i + batchSize);

      const batchPromises = batch.map(async (smsData, index) => {
        try {
          // Add delay for rate limiting
          if (index > 0) {
            await this.delay(100);
          }

          return await this.sendSms(smsData);
        } catch (error) {
          this.logger.error(`Bulk SMS error at index ${index}`, { error, smsData });
          return {
            success: false,
            error: {
              code: 'BULK_ERROR',
              message: `Bulk SMS processing error: ${(error as Error).message}`,
              provider: 'system',
              retryable: true,
            },
            provider: 'system',
            timestamp: new Date(),
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: {
              code: 'BATCH_ERROR',
              message: `Batch SMS processing error: ${(result.reason as Error).message}`,
              provider: 'system',
              retryable: true,
            },
            provider: 'system',
            timestamp: new Date(),
          });
        }
      }

      // Delay between batches
      if (i + batchSize < smsList.length) {
        await this.delay(1000);
      }
    }

    return results;
  }

  /**
   * Register an SMS template
   */
  registerTemplate(template: SmsTemplate): ApiResponse {
    try {
      this.templateEngine.registerTemplate(template);
      return {
        success: true,
        data: { templateId: template.id },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TEMPLATE_ERROR',
          message: `SMS template registration failed: ${error}`,
        },
      };
    }
  }

  /**
   * Get SMS message status
   */
  async getMessageStatus(messageId: string): Promise<SmsStatus | null> {
    try {
      // Check with all providers for status
      const providers = this.providerManager.getProviders();

      for (const provider of providers) {
        if (provider instanceof (await import('./sms/providers/TwilioSmsProvider')).TwilioSmsProvider) {
          const status = await (provider as any).getMessageStatus(messageId);
          if (status) {
            return status;
          }
        }
      }

      // Fallback to status tracker
      return this.statusTracker.getCurrentMessageStatus(messageId);

    } catch (error) {
      this.logger.error('Failed to get SMS message status', { error: (error as Error).message, messageId });
      return null;
    }
  }

  /**
   * Handle provider webhook for status updates
   */
  async handleProviderWebhook(provider: string, webhookData: Record<string, any>): Promise<void> {
    try {
      await this.statusTracker.handleProviderWebhook(provider, webhookData);
    } catch (error) {
      this.logger.error('Failed to handle SMS provider webhook', { error, provider, webhookData });
    }
  }

  /**
   * Send SMS with priority-based routing
   */
  async sendPrioritySms(context: NotificationContext, smsData: SmsData): Promise<SmsResult> {
    try {
      // Determine routing based on context
      const routing = await this.priorityRouter.determineRouting(context);

      this.logger.info('Priority SMS routing determined', {
        userId: context.userId,
        eventType: context.eventType,
        priority: routing.priority,
        channels: routing.channels,
        confidence: routing.confidence,
        reasoning: routing.reasoning
      });

      // Check if SMS is in the selected channels
      if (!routing.channels.includes('sms')) {
        return {
          success: false,
          error: {
            code: 'CHANNEL_NOT_SELECTED',
            message: `SMS not selected for priority ${routing.priority} - using channels: ${routing.channels.join(', ')}`,
            provider: 'priority_router',
            retryable: false,
          },
          provider: 'priority_router',
          timestamp: new Date(),
        };
      }

      // Apply priority to SMS data
      const prioritySmsData: SmsData = {
        ...smsData,
        priority: routing.priority,
        metadata: {
          ...smsData.metadata,
          routingPriority: routing.priority,
          routingChannels: routing.channels,
          routingReasoning: routing.reasoning,
          routingConfidence: routing.confidence,
          originalContext: context,
        }
      };

      // Send the SMS
      return await this.sendSms(prioritySmsData);

    } catch (error) {
      this.logger.error('Failed to send priority SMS', { error, context, smsData });
      return {
        success: false,
        error: {
          code: 'PRIORITY_ROUTING_ERROR',
          message: `Priority routing failed: ${(error as Error).message}`,
          provider: 'priority_router',
          retryable: true,
        },
        provider: 'priority_router',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Process queued notifications that are ready for delivery
   */
  async processQueuedNotifications(): Promise<number> {
    return await this.preferenceService.processQueuedNotifications();
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<any> {
    try {
      const providerHealth = this.providerManager.getAllProvidersHealth();
      const templates = this.templateEngine.getAllTemplates();

      return {
        status: 'healthy',
        providers: {
          configured: providerHealth.length,
          healthy: providerHealth.filter(p => p.healthy).length,
          details: providerHealth,
        },
        templates: {
          total: templates.length,
          active: templates.filter(t => t.isActive).length,
        },
        preferences: {
          total: (await this.preferenceService.getAllUserPreferences()).length,
          queued: this.preferenceService.getUserNotificationQueue('').length,
        },
        rateLimiting: this.config.rateLimiting.enabled,
        fallback: this.config.fallbackEnabled,
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
   * Set up default SMS templates
   */
  private async setupDefaultTemplates(): Promise<void> {
    // Verification code template
    const verificationTemplate = this.templateEngine.createTemplateFromContent(
      'SMS Verification',
      '{{t "verification"}} {{code}}',
      [
        { name: 'code', type: 'string', required: true, description: 'Verification code' },
      ],
      'en',
      'verification',
      160
    );

    this.templateEngine.registerTemplate(verificationTemplate);

    // Notification template
    const notificationTemplate = this.templateEngine.createTemplateFromContent(
      'SMS Notification',
      '{{t "notification"}}: {{message}}',
      [
        { name: 'message', type: 'string', required: true, description: 'Notification message' },
      ],
      'en',
      'notification',
      160
    );

    this.templateEngine.registerTemplate(notificationTemplate);

    // Alert template
    const alertTemplate = this.templateEngine.createTemplateFromContent(
      'SMS Alert',
      '{{t "alert"}}: {{message}} {{#if actionUrl}}View: {{actionUrl}}{{/if}}',
      [
        { name: 'message', type: 'string', required: true, description: 'Alert message' },
        { name: 'actionUrl', type: 'string', required: false, description: 'Action URL' },
      ],
      'en',
      'alert',
      160
    );

    this.templateEngine.registerTemplate(alertTemplate);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
