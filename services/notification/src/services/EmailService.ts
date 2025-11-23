import { EmailData, EmailResult, EmailServiceConfig, EmailSendRequest, CampaignCreateRequest, ApiResponse, EmailEvent, UnsubscribeRequest, EmailTemplate } from '@/types';
import { ProviderManager } from './providers/ProviderManager';
import { TemplateEngine, TemplateRenderOptions } from './TemplateEngine';
import { SuppressionService } from './SuppressionService';
import { WebhookService } from './WebhookService';
import { PreferenceService } from './preferences/PreferenceService';
import { PriorityRouter, NotificationContext, RoutingDecision } from './priority/PriorityRouter';
import { DeliveryTracker, DeliveryChannel } from './delivery/DeliveryTracker';
import { Logger } from '@/utils/Logger';

export class EmailService {
  private static instance: EmailService;
  private providerManager: ProviderManager;
  private templateEngine: TemplateEngine;
  private suppressionService: SuppressionService;
  private webhookService: WebhookService;
  private preferenceService: PreferenceService;
  private priorityRouter: PriorityRouter;
  private deliveryTracker: DeliveryTracker;
  private logger: Logger;
  private config: EmailServiceConfig;

  private constructor(config?: Partial<EmailServiceConfig>) {
    this.logger = Logger.getInstance();

    // Default configuration
    this.config = {
      providers: [],
      defaultProvider: 'ses',
      fallbackEnabled: true,
      maxRetries: 3,
      retryDelay: 1000,
      batchConfig: {
        size: 50,
        delay: 100,
        maxConcurrency: 5,
        retryAttempts: 3,
        retryDelay: 1000,
      },
      tracking: {
        enabled: true,
        domain: 'coinet.com',
        webhookUrl: 'https://api.coinet.com/email/webhooks',
      },
      compliance: {
        canSpamEnabled: true,
        gdprEnabled: true,
        defaultUnsubscribeUrl: 'https://coinet.com/unsubscribe',
        physicalAddress: 'Coinet Platform, 123 Innovation Drive, Tech City, TC 12345',
      },
      limits: {
        maxEmailsPerHour: 10000,
        maxEmailsPerDay: 100000,
        maxRecipientsPerEmail: 50,
      },
      monitoring: {
        enabled: true,
        metricsInterval: 300, // 5 minutes
        alertThresholds: {
          bounceRate: 0.05, // 5%
          complaintRate: 0.01, // 1%
          deliveryRate: 0.95, // 95%
        },
      },
      ...config,
    };

    this.providerManager = ProviderManager.getInstance(
      this.config.fallbackEnabled,
      this.config.maxRetries,
      this.config.retryDelay
    );

    this.templateEngine = TemplateEngine.getInstance();
    this.suppressionService = SuppressionService.getInstance();
    this.webhookService = WebhookService.getInstance();
    this.preferenceService = PreferenceService.getInstance();
    this.priorityRouter = PriorityRouter.getInstance();
    this.deliveryTracker = DeliveryTracker.getInstance();

    this.initialize();
  }

  static getInstance(config?: Partial<EmailServiceConfig>): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService(config);
    }
    return EmailService.instance;
  }

  private async initialize(): Promise<void> {
    this.logger.info('Initializing EmailService...');

    try {
      // Initialize providers from configuration
      if (this.config.providers.length > 0) {
        const providers = await ProviderManager.createProvidersFromConfig(this.config.providers);
        for (const provider of providers) {
          this.providerManager.addProvider(provider);
        }
      }

      // Set up default templates if none exist
      await this.setupDefaultTemplates();

      // Start monitoring if enabled
      if (this.config.monitoring.enabled) {
        this.startMonitoring();
      }

      this.logger.info('EmailService initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize EmailService', { error });
      throw error;
    }
  }

  /**
   * Send a single email
   */
  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    let deliveryId: string | undefined;

    try {
      this.logger.logEmailEvent('send_attempt', emailData);

      // Create delivery tracking record
      deliveryId = await this.deliveryTracker.createDelivery(
        `email-${Date.now()}`,
        emailData.to[0] || 'unknown', // Use first recipient as primary user ID
        `email.${emailData.priority || 'normal'}`,
        emailData.priority || 'normal',
        ['email'],
        emailData.metadata?.groupId,
        emailData.metadata?.idempotencyKey
      );

      // Check suppression before sending
      for (const recipient of emailData.to) {
        const suppressionCheck = await this.suppressionService.checkSuppression(recipient, emailData.campaignId);

        if (suppressionCheck.isSuppressed) {
          this.logger.warn(`Email suppressed: ${recipient}`, {
            reason: suppressionCheck.reason,
            campaignId: emailData.campaignId,
          });

          // Record failed delivery attempt
          await this.deliveryTracker.recordAttempt(
            deliveryId,
            'email',
            'system',
            'failed',
            { suppressed: true, reason: suppressionCheck.reason },
            'EMAIL_SUPPRESSED',
            suppressionCheck.reason
          );

          return {
            success: false,
            error: {
              code: 'EMAIL_SUPPRESSED',
              message: `Email suppressed: ${suppressionCheck.reason}`,
              provider: 'system',
              retryable: false,
            },
            provider: 'system',
            metadata: { deliveryId },
            timestamp: new Date(),
          };
        }

        // Check quiet hours preferences for this recipient
        const preferenceCheck = await this.preferenceService.checkNotificationDelivery(
          recipient,
          'email',
          `email.${emailData.priority || 'normal'}`,
          emailData.priority || 'normal'
        );

        if (!preferenceCheck.shouldSend) {
          this.logger.info(`Email queued due to quiet hours: ${recipient}`, {
            reason: preferenceCheck.reason,
            scheduledFor: preferenceCheck.scheduledFor,
          });

          // Queue the notification for later delivery
          if (preferenceCheck.queueForLater && preferenceCheck.scheduledFor) {
            await this.preferenceService.queueNotification(
              recipient,
              'email',
              `email.${emailData.priority || 'normal'}`,
              {
                to: emailData.to,
                subject: emailData.subject,
                html: emailData.html,
                text: emailData.text,
                priority: emailData.priority,
                campaignId: emailData.campaignId,
                originalSendTime: new Date(),
              },
              emailData.priority || 'normal',
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
            metadata: undefined,
            timestamp: new Date(),
          };
        }
      }

      // Apply compliance headers
      const compliantEmailData = await this.applyCompliance(emailData);

      // Send via provider manager
      const startTime = Date.now();
      const result = await this.providerManager.sendEmail(compliantEmailData);
      const responseTime = Date.now() - startTime;

      // Record delivery attempt
      await this.deliveryTracker.recordAttempt(
        deliveryId,
        'email',
        result.provider,
        result.success ? 'delivered' : 'failed',
        {
          messageId: result.messageId,
          providerResponse: result,
          recipientCount: emailData.to.length
        },
        result.error?.code,
        result.error?.message,
        responseTime,
        result.metadata?.cost || 0.001 // Default cost estimate
      );

      // Trigger webhooks for email events
      if (result.success && result.messageId) {
        await this.webhookService.deliverWebhookEvent({
          eventType: 'email.sent',
          source: 'email',
          sourceId: result.messageId,
          payload: {
            to: emailData.to,
            from: emailData.from,
            subject: emailData.subject,
            messageId: result.messageId,
            provider: result.provider,
            timestamp: result.timestamp,
            deliveryId,
          },
        });
      }

      // Update result with delivery tracking info
      const enhancedResult: EmailResult = {
        ...result,
        metadata: {
          ...result.metadata,
          deliveryId,
          responseTime,
          retryCount: 0 // Will be updated by delivery tracker
        }
      };

      this.logger.logEmailEvent(result.success ? 'send_success' : 'send_failure', emailData, {
        provider: result.provider,
        messageId: result.messageId,
        error: result.error,
        deliveryId,
        responseTime,
      });

      return enhancedResult;

    } catch (error: unknown) { // Explicitly type error as unknown
      const errorMessage = (error as Error).message;

      // Record failed delivery attempt
      if (deliveryId) {
        await this.deliveryTracker.recordAttempt(
          deliveryId,
          'email',
          'system',
          'failed',
          { error: errorMessage },
          'SERVICE_ERROR',
          errorMessage
        );
      }

      this.logger.logEmailError('send_error', emailData, { error });
      return {
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: `Email service error: ${errorMessage}`, // Cast to Error to access message
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
   * Send email using template
   */
  async sendTemplatedEmail(
    templateId: string,
    templateData: Record<string, any>,
    emailData: EmailSendRequest,
    options?: TemplateRenderOptions
  ): Promise<EmailResult> {
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
          metadata: undefined,
          timestamp: new Date(),
        };
      }

      // Render template
      const rendered = await this.templateEngine.renderTemplate(templateId, templateData, options);

      if (rendered.errors && rendered.errors.length > 0) {
        this.logger.warn(`Template rendered with errors: ${templateId}`, { errors: rendered.errors });
      }

      // Build final email data
      const finalEmailData: EmailData = {
        to: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        from: emailData.from || this.getDefaultFromAddress(),
        subject: rendered.subject || emailData.subject || 'No Subject',
        html: rendered.html,
        text: rendered.text,
        attachments: undefined,
        headers: this.buildComplianceHeaders(),
        tags: undefined,
        metadata: {
          templateId,
          templateData,
          ...emailData.metadata,
        },
        templateId: undefined,
        templateData: undefined,
        priority: emailData.priority || 'normal',
        campaignId: emailData.campaignId,
        batchId: undefined,
      };

      return this.sendEmail(finalEmailData);

    } catch (error) {
      this.logger.logEmailError('templated_send_error', emailData, { error, templateId });
      return {
        success: false,
        error: {
          code: 'TEMPLATE_ERROR',
          message: `Template rendering failed: ${error}`,
          provider: 'system',
          retryable: true,
        },
        provider: 'system',
        metadata: undefined,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send emails in batch
   */
  async sendBatchEmails(emails: EmailData[]): Promise<EmailResult[]> {
    if (emails.length === 0) {
      return [];
    }

    if (emails.length > this.config.batchConfig.size) {
      // Split into smaller batches
      const batches: EmailData[][] = [];
      for (let i = 0; i < emails.length; i += this.config.batchConfig.size) {
        batches.push(emails.slice(i, i + this.config.batchConfig.size));
      }

      const results: EmailResult[] = [];
      for (const batch of batches) {
        const batchResults = await this.sendBatchEmails(batch);
        results.push(...batchResults);

        // Delay between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await this.delay(this.config.batchConfig.delay);
        }
      }

      return results;
    }

    // Process single batch
    const results: EmailResult[] = [];

    // Use Promise.allSettled for better error handling
    const promises = emails.map(async (emailData, index) => {
      try {
        // Add delay for rate limiting
        if (index > 0) {
          await this.delay(100);
        }

        return await this.sendEmail(emailData);
      } catch (error) {
        this.logger.error(`Batch email error at index ${index}`, { error, emailData });
        return {
          success: false,
          error: {
            code: 'BATCH_ERROR',
            message: `Batch processing error: ${(error as Error).message}`,
            provider: 'system',
            retryable: true,
          },
          provider: 'system',
          metadata: undefined,
          timestamp: new Date(),
        };
      }
    });

    const settledResults = await Promise.allSettled(promises);

    for (const result of settledResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          error: {
            code: 'BATCH_ERROR',
            message: `Batch processing error: ${(result.reason as Error).message}`,
            provider: 'system',
            retryable: true,
          },
          provider: 'system',
          metadata: undefined,
          timestamp: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Create and send campaign
   */
  async createCampaign(request: CampaignCreateRequest): Promise<ApiResponse> {
    try {
      // Validate campaign data
      const validationErrors = this.validateCampaignRequest(request);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Campaign validation failed: ${validationErrors.join(', ')}`,
          },
        };
      }

      // TODO: Implement campaign creation and scheduling
      // This would involve:
      // 1. Creating campaign record in database
      // 2. Setting up scheduling if needed
      // 3. Processing recipient list
      // 4. Queuing emails for sending

      this.logger.info('Campaign creation not fully implemented yet', { request });

      return {
        success: true,
        data: {
          campaignId: 'temp-id',
          status: 'created',
          estimatedRecipients: request.recipientList.length,
        },
      };

    } catch (error: unknown) { // Explicitly type error as unknown
      this.logger.error('Failed to create campaign', { error, request });
      return {
        success: false,
        error: {
          code: 'CAMPAIGN_ERROR',
          message: `Campaign creation failed: ${(error as Error).message}`,
        },
      };
    }
  }

  /**
   * Register an email template
   */
  registerTemplate(template: EmailTemplate): ApiResponse {
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
          message: `Template registration failed: ${error}`,
        },
      };
    }
  }

  /**
   * Send email with priority-based routing
   */
  async sendPriorityEmail(context: NotificationContext, emailData: EmailData): Promise<EmailResult> {
    try {
      // Determine routing based on context
      const routing = await this.priorityRouter.determineRouting(context);

      this.logger.info('Priority email routing determined', {
        userId: context.userId,
        eventType: context.eventType,
        priority: routing.priority,
        channels: routing.channels,
        confidence: routing.confidence,
        reasoning: routing.reasoning
      });

      // Check if email is in the selected channels
      if (!routing.channels.includes('email')) {
        return {
          success: false,
          error: {
            code: 'CHANNEL_NOT_SELECTED',
            message: `Email not selected for priority ${routing.priority} - using channels: ${routing.channels.join(', ')}`,
            provider: 'priority_router',
            retryable: false,
          },
          provider: 'priority_router',
          metadata: undefined,
          timestamp: new Date(),
        };
      }

      // Apply priority to email data
      const priorityEmailData: EmailData = {
        ...emailData,
        priority: routing.priority,
        metadata: {
          ...emailData.metadata,
          routingPriority: routing.priority,
          routingChannels: routing.channels,
          routingReasoning: routing.reasoning,
          routingConfidence: routing.confidence,
          originalContext: context,
        }
      };

      // Send the email
      return await this.sendEmail(priorityEmailData);

    } catch (error) {
      this.logger.error('Failed to send priority email', { error, context, emailData });
      return {
        success: false,
        error: {
          code: 'PRIORITY_ROUTING_ERROR',
          message: `Priority routing failed: ${(error as Error).message}`,
          provider: 'priority_router',
          retryable: true,
        },
        provider: 'priority_router',
        metadata: undefined,
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
      const providersHealth = await this.providerManager.checkAllProvidersHealth();
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
        suppression: this.suppressionService.getSuppressionStats(),
        preferences: {
          total: (await this.preferenceService.getAllUserPreferences()).length,
          queued: this.preferenceService.getUserNotificationQueue('').length,
        },
        limits: this.config.limits,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: 'error',
        error: (error as Error).message, // Cast error to Error to access message
        timestamp: new Date(),
      };
    }
  }

  private async applyCompliance(emailData: EmailData): Promise<EmailData> {
    const compliantData = { ...emailData };

    // Add compliance headers
    compliantData.headers = {
      ...compliantData.headers,
      ...this.buildComplianceHeaders(),
    };

    // Add unsubscribe information if required
    if (this.config.compliance.canSpamEnabled) {
      // Ensure unsubscribe URL is present in HTML content
      if (compliantData.html && !compliantData.html.includes('unsubscribe')) {
        compliantData.html += this.buildUnsubscribeFooter();
      }

      if (compliantData.text && !compliantData.text.includes('unsubscribe')) {
        compliantData.text += this.buildUnsubscribeTextFooter();
      }
    }

    return compliantData;
  }

  private buildComplianceHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.compliance.canSpamEnabled) {
      headers['List-Unsubscribe'] = `<${this.config.compliance.defaultUnsubscribeUrl}>`;
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }

    if (this.config.compliance.gdprEnabled) {
      headers['X-GDPR-Consent'] = 'explicit';
    }

    // Add tracking headers if enabled
    if (this.config.tracking.enabled) {
      headers['X-Email-Tracking'] = 'enabled';
      headers['Return-Path'] = this.config.tracking.webhookUrl;
    }

    return headers;
  }

  private buildUnsubscribeFooter(): string {
    return `
      <br><br>
      <p style="font-size: 12px; color: #666;">
        ${this.config.compliance.physicalAddress}<br>
        <a href="${this.config.compliance.defaultUnsubscribeUrl}">Unsubscribe</a> |
        <a href="https://${this.config.tracking.domain}/privacy">Privacy Policy</a>
      </p>
    `;
  }

  private buildUnsubscribeTextFooter(): string {
    return `

${this.config.compliance.physicalAddress}
Unsubscribe: ${this.config.compliance.defaultUnsubscribeUrl}
Privacy Policy: https://${this.config.tracking.domain}/privacy
`;
  }

  private getDefaultFromAddress(): string {
    return process.env.DEFAULT_FROM_EMAIL || 'noreply@coinet.com';
  }

  private validateCampaignRequest(request: CampaignCreateRequest): string[] {
    const errors: string[] = [];

    if (!request.name) {
      errors.push('Campaign name is required');
    }

    if (!request.templateId) {
      errors.push('Template ID is required');
    }

    if (!request.recipientList || request.recipientList.length === 0) {
      errors.push('Recipient list is required');
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of request.recipientList) {
      if (!emailRegex.test(email)) {
        errors.push(`Invalid email address: ${email}`);
      }
    }

    return errors;
  }

  private async setupDefaultTemplates(): Promise<void> {
    // Welcome email template
    const welcomeTemplate = this.templateEngine.createTemplateFromContent(
      'Welcome Email',
      'Welcome to {{platformName}}, {{firstName}}!',
      `
        <h1>Welcome to {{platformName}}!</h1>
        <p>Hello {{firstName}},</p>
        <p>Welcome to {{platformName}}! We're excited to have you on board.</p>
        <p>Your account has been successfully created and you can now access all features.</p>
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        {{> signature}}
      `,
      `
        Welcome to {{platformName}}, {{firstName}}!

        Hello {{firstName}},

        Welcome to {{platformName}}! We're excited to have you on board.

        Your account has been successfully created and you can now access all features.

        If you have any questions, please don't hesitate to contact our support team.

        {{> signature}}
      `,
      [
        { name: 'platformName', type: 'string', required: true, description: 'Name of the platform' },
        { name: 'firstName', type: 'string', required: true, description: 'User first name' }
      ],
      'en',
      'onboarding'
    );

    this.templateEngine.registerTemplate(welcomeTemplate);

    // Notification template
    const notificationTemplate = this.templateEngine.createTemplateFromContent(
      'Notification Email',
      '{{subject}}',
      `
        <div style="font-family: Arial, sans-serif;">
          <h2>{{title}}</h2>
          <p>{{message}}</p>
          {{#if actionUrl}}
            <p><a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">{{actionText}}</a></p>
          {{/if}}
          {{> footer}}
        </div>
      `,
      `
        {{title}}

        {{message}}

        {{#if actionUrl}}
        {{actionText}}: {{actionUrl}}
        {{/if}}

        {{> footer}}
      `,
      [
        { name: 'subject', type: 'string', required: false, description: 'Email subject' },
        { name: 'title', type: 'string', required: true, description: 'Notification title' },
        { name: 'message', type: 'string', required: true, description: 'Notification message' },
        { name: 'actionUrl', type: 'string', required: false, description: 'Action button URL' },
        { name: 'actionText', type: 'string', required: false, description: 'Action button text' }
      ],
      'en',
      'notifications'
    );

    this.templateEngine.registerTemplate(notificationTemplate);
  }

  private startMonitoring(): void {
    // Monitor provider health every interval
    setInterval(async () => {
      try {
        const healthStatus = await this.getHealthStatus();

        // Check for alert thresholds
        if (healthStatus.providers.healthy < healthStatus.providers.configured) {
          this.logger.warn('Some email providers are unhealthy', { healthStatus });
        }

      } catch (error) {
        this.logger.error('Monitoring check failed', { error });
      }
    }, this.config.monitoring.metricsInterval * 1000);

    this.logger.info(`Email service monitoring started (interval: ${this.config.monitoring.metricsInterval}s)`);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
