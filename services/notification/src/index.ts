import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { EmailService } from './services/EmailService';
import { SmsService } from './services/SmsService';
import { WebhookService } from './services/WebhookService';
import { BotService } from './services/BotService';
import { PreferenceService } from './services/preferences/PreferenceService';
import { TimeZoneService } from './services/preferences/TimeZoneService';
import { HolidayService } from './services/preferences/HolidayService';
import { PriorityRouter } from './services/priority/PriorityRouter';
import { PriorityNotificationService } from './services/priority/PriorityNotificationService';
import { AlertGroupingService } from './services/grouping/AlertGroupingService';
import { NotificationCoordinator } from './services/NotificationCoordinator';
import { WebSocketManager } from './services/websocket/WebSocketManager';
import { MarketDataPipeline } from './services/market/MarketDataPipeline';
import { BlockchainNodeManager } from './services/blockchain/BlockchainNodeManager';
import { TransactionMonitor } from './services/blockchain/TransactionMonitor';
import { SocialMediaAPIManager } from './services/social/SocialMediaAPIManager';
import { SentimentAnalysisService } from './services/social/SentimentAnalysisService';
import { DeFiMetricsCollector } from './services/defi/DeFiMetricsCollector';
import { NotificationTestSuite } from './testing/NotificationTestSuite';
import { LoadTestSimulator } from './testing/LoadTestSimulator';
import { Logger } from './utils/Logger';
import { UnsubscribeRequest } from './types';
import { WebhookEndpoint } from './types';

const app = express();
const logger = Logger.getInstance();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Initialize Services
let emailService: EmailService;
let smsService: SmsService;
let webhookService: WebhookService;
let botService: BotService;
let preferenceService: PreferenceService;
let timeZoneService: TimeZoneService;
let holidayService: HolidayService;
let priorityRouter: PriorityRouter;
let priorityNotificationService: PriorityNotificationService;
let alertGroupingService: AlertGroupingService;
let notificationCoordinator: NotificationCoordinator;
let notificationTestSuite: NotificationTestSuite;
let loadTestSimulator: LoadTestSimulator;
let webSocketManager: WebSocketManager;
let marketDataPipeline: MarketDataPipeline;
let blockchainNodeManager: BlockchainNodeManager;
let transactionMonitor: TransactionMonitor;
let socialMediaManager: SocialMediaAPIManager;
let sentimentAnalysisService: SentimentAnalysisService;
let defiMetricsCollector: DeFiMetricsCollector;

try {
  // Initialize Email Service
  const emailProviders: any[] = [];

  // Add SES provider if credentials are available
  if (process.env.AWS_SES_ACCESS_KEY_ID && process.env.AWS_SES_SECRET_ACCESS_KEY) {
    emailProviders.push({
      name: 'aws-ses-primary',
      type: 'ses' as const,
      region: process.env.AWS_SES_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
      priority: 1,
    });
  }

  // Add SendGrid provider if API key is available
  if (process.env.SENDGRID_API_KEY) {
    emailProviders.push({
      name: 'sendgrid-backup',
      type: 'sendgrid' as const,
      apiKey: process.env.SENDGRID_API_KEY,
      priority: 2,
    });
  }

  emailService = EmailService.getInstance({
    providers: emailProviders,
  });

  // Initialize SMS Service
  const smsProviders: any[] = [];

  // Add Twilio provider if credentials are available
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    smsProviders.push({
      name: 'twilio-primary',
      type: 'twilio' as const,
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_PHONE_NUMBER,
      priority: 1,
    });
  }

  // Add Nexmo provider if credentials are available
  if (process.env.NEXMO_API_KEY && process.env.NEXMO_API_SECRET && process.env.NEXMO_PHONE_NUMBER) {
    smsProviders.push({
      name: 'nexmo-backup',
      type: 'nexmo' as const,
      apiKey: process.env.NEXMO_API_KEY,
      apiSecret: process.env.NEXMO_API_SECRET,
      fromNumber: process.env.NEXMO_PHONE_NUMBER,
      priority: 2,
    });
  }

  smsService = SmsService.getInstance({
    providers: smsProviders,
  });

  // Initialize Webhook Service
  webhookService = WebhookService.getInstance();

  // Initialize Bot Service
  botService = BotService.getInstance();
  // Bot service initialization will be handled asynchronously

  // Initialize Preference Services
  preferenceService = PreferenceService.getInstance();
  timeZoneService = TimeZoneService.getInstance();
  holidayService = HolidayService.getInstance();

  // Initialize Priority Services
  priorityRouter = PriorityRouter.getInstance();
  priorityNotificationService = PriorityNotificationService.getInstance();

  // Initialize Grouping Services
  alertGroupingService = AlertGroupingService.getInstance();
  notificationCoordinator = NotificationCoordinator.getInstance();

  // Initialize Testing Services
  notificationTestSuite = NotificationTestSuite.getInstance();
  loadTestSimulator = new LoadTestSimulator();

  // Initialize WebSocket Services
  webSocketManager = WebSocketManager.getInstance();
  marketDataPipeline = MarketDataPipeline.getInstance();

  // Initialize Blockchain Services
  blockchainNodeManager = BlockchainNodeManager.getInstance();
  transactionMonitor = TransactionMonitor.getInstance();

  // Initialize Social Media Services
  socialMediaManager = SocialMediaAPIManager.getInstance();
  sentimentAnalysisService = SentimentAnalysisService.getInstance();

  // Initialize DeFi Metrics Collector
  const defiProviders = [
    {
      name: 'defillama-primary',
      type: 'defillama' as const,
      baseUrl: 'https://api.llama.fi',
      rateLimit: { requestsPerMinute: 60, requestsPerHour: 1000 },
      reliability: 0.95,
      isHealthy: true
    },
    {
      name: 'thegraph-primary',
      type: 'thegraph' as const,
      baseUrl: 'https://api.thegraph.com/subgraphs/name',
      rateLimit: { requestsPerMinute: 100, requestsPerHour: 5000 },
      reliability: 0.90,
      isHealthy: true
    }
  ];

  const defiConfig = {
    updateInterval: 300000, // 5 minutes
    cacheTtl: 300, // 5 minutes
    maxRetries: 3,
    timeout: 10000,
    batchSize: 50,
    providers: defiProviders,
    validation: {
      enableCrossValidation: true,
      tolerancePercentage: 10,
      requiredProviders: 1
    }
  };

  defiMetricsCollector = new DeFiMetricsCollector(defiConfig);
  await defiMetricsCollector.initialize();

  // Connect DeFi alerts to notification coordinator
  defiMetricsCollector.on('defi_alert', async (alert) => {
    try {
      logger.info('🚨 Processing DeFi alert', { alert: alert.type, protocol: alert.protocol });

      // Convert DeFi alert to notification format
      const notificationData = {
        context: {
          source: 'defi_metrics',
          priority: alert.severity as any,
          category: 'defi',
          confidence: 0.9,
          marketImpact: alert.severity === 'critical' ? 0.9 : alert.severity === 'high' ? 0.7 : 0.5
        },
        defiData: {
          title: alert.title,
          content: alert.description,
          protocol: alert.protocol,
          alertType: alert.type,
          severity: alert.severity,
          data: alert.data
        }
      };

      // Route through priority notification service
      await priorityNotificationService.sendPriorityNotification(notificationData, 'defi');

    } catch (error) {
      logger.error('❌ Failed to process DeFi alert', { error, alert });
    }
  });

} catch (error) {
  logger.error('Failed to initialize services', { error });
  process.exit(1);
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthStatus = await emailService.getHealthStatus();
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
    return;
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'error',
      error: 'Health check failed',
      timestamp: new Date(),
    });
    return;
  }
});

// Email sending endpoints
app.post('/email/send', async (req, res) => {
  try {
    const { to, cc, bcc, from, subject, html, text, templateId, templateData, priority, campaignId, metadata } = req.body;

    if (!to || !Array.isArray(to) || to.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Email recipients (to) are required',
        },
      });
    }

    const emailData = {
      to,
      cc: cc || undefined,
      bcc: bcc || undefined,
      from: from || undefined,
      subject: subject || '',
      html: html || undefined,
      text: text || undefined,
      priority: priority || 'normal',
      campaignId: campaignId || undefined,
      metadata: metadata || undefined,
      attachments: undefined,
      headers: undefined,
      tags: undefined,
      templateId: undefined,
      templateData: undefined,
      batchId: undefined,
    };

    let result;
    if (templateId && templateData) {
      const sendRequest = {
        to,
        cc,
        bcc,
        from,
        subject,
        html,
        text,
        priority,
        campaignId,
        metadata,
      };
      result = await emailService.sendTemplatedEmail(templateId, templateData, sendRequest);
    } else {
      result = await emailService.sendEmail(emailData);
    }

    if (result.success) {
      res.status(200).json({
        success: true,
        data: {
          messageId: result.messageId,
          provider: result.provider,
          timestamp: result.timestamp,
        },
      });
      return;
    } else {
      const statusCode = result.error?.retryable ? 500 : 400;
      res.status(statusCode).json({
        success: false,
        error: result.error,
      });
      return;
    }

  } catch (error) {
    logger.error('Email send request failed', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }
});

// Batch email sending
app.post('/email/batch', async (req, res) => {
  try {
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Email batch (emails array) is required',
        },
      });
    }

    if (emails.length > 1000) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BATCH_TOO_LARGE',
          message: 'Batch size cannot exceed 1000 emails',
        },
      });
    }

    const results = await emailService.sendBatchEmails(emails);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.status(200).json({
      success: true,
      data: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
        results,
      },
    });
    return;

  } catch (error) {
    logger.error('Batch email send failed', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }
});

// Template management endpoints
app.post('/templates', async (req, res) => {
  try {
    const { name, subject, htmlContent, textContent, variables, locale, category } = req.body;

    if (!name || !subject || !htmlContent) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Template name, subject, and HTML content are required',
        },
      });
    }

    const template = emailService['templateEngine'].createTemplateFromContent(
      name,
      subject,
      htmlContent,
      textContent || '',
      variables || [],
      locale || 'en',
      category || 'general'
    );

    const result = emailService.registerTemplate(template);

    if (result.success) {
      res.status(201).json(result);
      return;
    } else {
      res.status(400).json(result);
      return;
    }

  } catch (error) {
    logger.error('Template creation failed', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }
});

app.get('/templates', async (req, res) => {
  try {
    const templates = emailService['templateEngine'].getAllTemplates();

    res.status(200).json({
      success: true,
      data: templates,
    });
    return;

  } catch (error) {
    logger.error('Template retrieval failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }
});

// Campaign management endpoints
app.post('/campaigns', async (req, res) => {
  try {
    const { name, description, templateId, recipientList, schedule, priority, segmentation, throttling, tracking, compliance } = req.body;

    if (!name || !templateId || !recipientList) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Campaign name, template ID, and recipient list are required',
        },
      });
    }

    const campaignRequest = {
      name,
      description,
      templateId,
      recipientList,
      schedule,
      priority: priority || 'normal',
      segmentation,
      throttling,
      tracking,
      compliance,
    };

    const result = await emailService.createCampaign(campaignRequest);

    if (result.success) {
      res.status(201).json(result);
      return;
    } else {
      res.status(400).json(result);
      return;
    }

  } catch (error) {
    logger.error('Campaign creation failed', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }
});

// Provider health and stats endpoints
app.get('/providers/health', async (req, res) => {
  try {
    const health = emailService['providerManager'].getAllProvidersHealth();

    res.status(200).json({
      success: true,
      data: health,
    });
    return;

  } catch (error) {
    logger.error('Provider health check failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }
});

app.get('/providers/stats', async (req, res) => {
  try {
    const stats = await emailService['providerManager'].getProviderStats();

    res.status(200).json({
      success: true,
      data: Object.fromEntries(stats),
    });
    return;

  } catch (error) {
    logger.error('Provider stats retrieval failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }
});

// Suppression management endpoints
app.get('/suppression/stats', async (req, res) => {
  try {
    const stats = emailService['suppressionService'].getSuppressionStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
    return;

  } catch (error) {
    logger.error('Suppression stats retrieval failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }
});

app.post('/suppression/check', async (req, res) => {
  try {
    const { emails, campaignId } = req.body;

    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Emails array is required',
        },
      });
    }

    const results = await emailService['suppressionService'].checkMultipleSuppressions(emails, campaignId);

    res.status(200).json({
      success: true,
      data: Object.fromEntries(results),
    });
    return;

  } catch (error) {
    logger.error('Suppression check failed', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }
});

app.post('/suppression/add', async (req, res) => {
  try {
    const { email, type, reason, source, expiresAt } = req.body;

    if (!email || !type) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Email and type are required',
        },
      });
    }

    const success = await emailService['suppressionService'].addToSuppression(
      email,
      type,
      reason,
      source,
      expiresAt ? new Date(expiresAt) : undefined
    );

    res.status(200).json({
      success: true,
      data: { added: success },
    });
    return;

  } catch (error) {
    logger.error('Suppression add failed', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }
});

app.delete('/suppression/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { type } = req.query;

    const success = await emailService['suppressionService'].removeFromSuppression(
      email,
      type as string
    );

    res.status(200).json({
      success: true,
      data: { removed: success },
    });
    return;

  } catch (error) {
    logger.error('Suppression removal failed', { error, params: req.params, query: req.query });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }
});

// Email event webhook endpoints
app.post('/webhooks/email-events', async (req, res) => {
  try {
    const { provider, events, signature } = req.body;

    if (!provider || !events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Provider and events array are required',
        },
      });
    }

    // Verify webhook signature if provided
    if (signature && !await verifyWebhookSignature(req.body, signature, provider)) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Webhook signature verification failed',
        },
      });
    }

    // Process each event
    for (const event of events) {
      await emailService['suppressionService'].handleEmailEvent({
        id: event.id || `event-${Date.now()}-${Math.random()}`,
        type: event.type,
        email: event.email,
        campaignId: event.campaignId,
        templateId: event.templateId,
        provider,
        messageId: event.messageId,
        timestamp: new Date(event.timestamp || Date.now()),
        metadata: event.metadata,
        url: event.url,
        userAgent: event.userAgent,
        ipAddress: event.ipAddress,
      });

      // Send to bot subscribers
      await botService.handleNotificationEvent({
        eventType: `email.${event.type}`,
        source: 'email',
        sourceId: event.messageId || event.id || `event-${Date.now()}`,
        payload: {
          email: event.email,
          type: event.type,
          provider,
          messageId: event.messageId,
          campaignId: event.campaignId,
          templateId: event.templateId,
          metadata: event.metadata,
        },
        timestamp: new Date(event.timestamp || Date.now()),
      });
    }

    res.status(200).json({
      success: true,
      data: { processed: events.length },
    });
    return;

  } catch (error) {
    logger.error('Email events webhook processing failed', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }
});

// Unsubscribe webhook endpoint
app.post('/webhooks/unsubscribe', async (req, res) => {
  try {
    const { email, campaignId, reason, ipAddress, userAgent } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Email is required',
        },
      });
    }

    const unsubscribeRequest: UnsubscribeRequest = {
      email,
      campaignId,
      reason,
      timestamp: new Date(),
      ipAddress,
      userAgent,
    };

    const success = await emailService['suppressionService'].handleUnsubscribe(unsubscribeRequest);

    res.status(200).json({
      success: true,
      data: { processed: success },
    });
    return;

  } catch (error) {
    logger.error('Unsubscribe webhook processing failed', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }
});

// Unsubscribe page endpoint
app.get('/unsubscribe', async (req, res) => {
  try {
    const { email, campaign } = req.query;

    if (!email) {
      return res.status(400).send(`
        <html>
          <body>
            <h1>Unsubscribe</h1>
            <p>Email parameter is required.</p>
          </body>
        </html>
      `);
    }

    const unsubscribeRequest: UnsubscribeRequest = {
      email: email as string,
      campaignId: campaign as string,
      reason: 'User clicked unsubscribe link',
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    const success = await emailService['suppressionService'].handleUnsubscribe(unsubscribeRequest);

    if (success) {
      res.status(200).send(`
        <html>
          <body>
            <h1>Unsubscribe Successful</h1>
            <p>You have been successfully unsubscribed from our mailing list.</p>
            <p>You will no longer receive emails from us.</p>
          </body>
        </html>
      `);
      return;
    } else {
      res.status(500).send(`
        <html>
          <body>
            <h1>Unsubscribe Error</h1>
            <p>There was an error processing your unsubscribe request. Please try again later.</p>
          </body>
        </html>
      `);
      return;
    }

  } catch (error) {
    logger.error('Unsubscribe page error', { error, query: req.query });
    res.status(500).send(`
      <html>
        <body>
          <h1>Unsubscribe Error</h1>
          <p>There was an error processing your unsubscribe request. Please try again later.</p>
        </body>
      </html>
    `);
    return;
  }
});

// SMS API Endpoints

// SMS sending endpoints
app.post('/sms/send', async (req, res) => {
  try {
    const { to, body, from, templateId, templateData, priority, campaignId, fallbackConfig, userId, metadata, maxLength } = req.body;

    if (!to || !body) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'SMS recipient (to) and message body are required',
        },
      });
    }

    const smsRequest = {
      to,
      body,
      from,
      templateId,
      templateData,
      priority: priority || 'normal',
      campaignId,
      fallbackConfig,
      userId,
      metadata,
      maxLength,
    };

    let result;
    if (templateId && templateData) {
      result = await smsService.sendTemplatedSms(templateId, templateData, smsRequest);
    } else {
      const smsData = {
        to,
        from,
        body,
        priority: priority || 'normal',
        campaignId,
        metadata,
        maxLength,
      };
      result = await smsService.sendSms(smsData);
    }

    if (result.success) {
      res.status(200).json({
        success: true,
        data: {
          messageId: result.messageId,
          provider: result.provider,
          timestamp: result.timestamp,
        },
      });
      return;
    } else {
      const statusCode = result.error?.retryable ? 500 : 400;
      res.status(statusCode).json({
        success: false,
        error: result.error,
      });
      return;
    }

  } catch (error) {
    logger.error('SMS send request failed', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }
});

// SMS batch sending
app.post('/sms/batch', async (req, res) => {
  try {
    const { smsList } = req.body;

    if (!smsList || !Array.isArray(smsList) || smsList.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'SMS batch (smsList array) is required',
        },
      });
    }

    if (smsList.length > 1000) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BATCH_TOO_LARGE',
          message: 'Batch size cannot exceed 1000 SMS messages',
        },
      });
    }

    const results = await smsService.sendBulkSms(smsList);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.status(200).json({
      success: true,
      data: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
        results,
      },
    });
    return;

  } catch (error) {
    logger.error('SMS batch send failed', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }
});

// SMS template management endpoints
app.post('/sms/templates', async (req, res) => {
  try {
    const { name, body, variables, locale, category, maxLength } = req.body;

    if (!name || !body) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'SMS template name and body are required',
        },
      });
    }

    const template = smsService['templateEngine'].createTemplateFromContent(
      name,
      body,
      variables || [],
      locale || 'en',
      category || 'general',
      maxLength
    );

    const result = smsService.registerTemplate(template);

    if (result.success) {
      res.status(201).json(result);
      return;
    } else {
      res.status(400).json(result);
      return;
    }

  } catch (error) {
    logger.error('SMS template creation failed', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }
});

app.get('/sms/templates', async (req, res) => {
  try {
    const templates = smsService['templateEngine'].getAllTemplates();

    res.status(200).json({
      success: true,
      data: templates,
    });
    return;

  } catch (error) {
    logger.error('SMS template retrieval failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }
});

// SMS status tracking endpoints
app.get('/sms/status/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Message ID is required',
        },
      });
    }

    const status = await smsService.getMessageStatus(messageId);

    if (status) {
      res.status(200).json({
        success: true,
        data: status,
      });
      return;
    } else {
      res.status(404).json({
        success: false,
        error: {
          code: 'MESSAGE_NOT_FOUND',
          message: 'SMS message not found',
        },
      });
      return;
    }

  } catch (error) {
    logger.error('SMS status retrieval failed', { error, messageId: req.params.messageId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }
});

// SMS provider management endpoints
app.get('/sms/providers/health', async (req, res) => {
  try {
    const health = smsService['providerManager'].getAllProvidersHealth();

    res.status(200).json({
      success: true,
      data: health,
    });
    return;

  } catch (error) {
    logger.error('SMS provider health check failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }
});

app.get('/sms/providers/stats', async (req, res) => {
  try {
    const stats = await smsService['providerManager'].getProviderStats();

    res.status(200).json({
      success: true,
      data: Object.fromEntries(stats),
    });
    return;

  } catch (error) {
    logger.error('SMS provider stats retrieval failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }
});

// SMS webhook endpoints for status updates
app.post('/sms/webhooks/status', async (req, res) => {
  try {
    const { provider } = req.query;

    if (!provider) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Provider parameter is required',
        },
      });
    }

    await smsService.handleProviderWebhook(provider as string, req.body);

    // Send SMS events to bot subscribers
    const webhookData = req.body;
    if (webhookData.messageId) {
      await botService.handleNotificationEvent({
        eventType: `sms.${webhookData.status || 'unknown'}`,
        source: 'sms',
        sourceId: webhookData.messageId,
        payload: {
          messageId: webhookData.messageId,
          status: webhookData.status,
          provider: provider as string,
          to: webhookData.to,
          from: webhookData.from,
          body: webhookData.body,
          errorCode: webhookData.errorCode,
          errorMessage: webhookData.errorMessage,
        },
        timestamp: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      data: { processed: true },
    });
    return;

  } catch (error) {
    logger.error('SMS webhook processing failed', { error, body: req.body, query: req.query });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }
});

// Health endpoint (combined with all services)
app.get('/health', async (req, res) => {
  try {
    const [emailHealth, smsHealth, webhookHealth, botHealth] = await Promise.all([
      emailService.getHealthStatus(),
      smsService.getHealthStatus(),
      webhookService.getHealthStatus(),
      botService.getHealthStatus(),
    ]);

    const overallStatus = emailHealth.status === 'healthy' && smsHealth.status === 'healthy' && webhookHealth.status === 'healthy' && botHealth.status === 'healthy' ? 'healthy' : 'degraded';

    res.status(overallStatus === 'healthy' ? 200 : 503).json({
      status: overallStatus,
      services: {
        email: emailHealth,
        sms: smsHealth,
        webhook: webhookHealth,
        bots: botHealth,
      },
      timestamp: new Date(),
    });
    return;

  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'error',
      error: 'Health check failed',
      timestamp: new Date(),
    });
    return;
  }
});

// Webhook API Endpoints

// Webhook endpoint registration
app.post('/webhooks/endpoints', async (req, res) => {
  try {
    const { name, url, events, retryPolicy, transformationTemplate, headers, timeout, maxRetries } = req.body;

    if (!name || !url || !events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Webhook name, URL, and events array are required',
        },
      });
    }

    const webhookEndpoint: Omit<WebhookEndpoint, 'id' | 'createdAt' | 'updatedAt' | 'secret' | 'status'> = {
      name,
      url,
      events: events as (WebhookEndpoint['events'][number])[], // Cast to specific event types
      retryPolicy,
      transformationTemplate,
      headers,
      timeout,
      maxRetries,
      createdBy: 'system', // In real implementation, get from authenticated user
    };

    const result = await webhookService.registerWebhookEndpoint({
      ...webhookEndpoint,
      status: 'active',
      secret: webhookService['signatureUtil'].generateWebhookSecret(),
    });

    if (result.success) {
      res.status(201).json(result);
      return;
    } else {
      res.status(400).json(result);
      return;
    }

  } catch (error: unknown) { // Explicitly type error
    logger.error('Webhook endpoint registration failed', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get webhook endpoints
app.get('/webhooks/endpoints', async (req, res) => {
  try {
    const endpoints = webhookService.getAllWebhookEndpoints();

    res.status(200).json({
      success: true,
      data: endpoints,
    });
    return;

  } catch (error: unknown) { // Explicitly type error
    logger.error('Webhook endpoints retrieval failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get webhook endpoint by ID
app.get('/webhooks/endpoints/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;

    if (!webhookId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Webhook ID is required',
        },
      });
    }

    const endpoint = webhookService.getWebhookEndpoint(webhookId);

    if (!endpoint) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Webhook endpoint not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: endpoint,
    });
    return;

  } catch (error: unknown) { // Explicitly type error
    logger.error('Webhook endpoint retrieval failed', { error, webhookId: req.params.webhookId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Update webhook endpoint
app.put('/webhooks/endpoints/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const updates = req.body;

    if (!webhookId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Webhook ID is required',
        },
      });
    }

    const result = await webhookService.updateWebhookEndpoint(webhookId, updates);

    if (result.success) {
      res.status(200).json(result);
      return;
    } else {
      res.status(400).json(result);
      return;
    }

  } catch (error: unknown) { // Explicitly type error
    logger.error('Webhook endpoint update failed', { error, webhookId: req.params.webhookId, updates: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Delete webhook endpoint
app.delete('/webhooks/endpoints/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;

    if (!webhookId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Webhook ID is required',
        },
      });
    }

    const result = await webhookService.deleteWebhookEndpoint(webhookId);

    if (result.success) {
      res.status(200).json(result);
      return;
    } else {
      res.status(400).json(result);
      return;
    }

  } catch (error: unknown) { // Explicitly type error
    logger.error('Webhook endpoint deletion failed', { error, webhookId: req.params.webhookId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get webhook deliveries
app.get('/webhooks/deliveries', async (req, res) => {
  try {
    const { webhookId, eventType, limit = 100 } = req.query;

    const deliveries = webhookService.getWebhookDeliveries(
      webhookId as string | undefined,
      eventType as string | undefined
    ).slice(0, parseInt(limit as string));

    res.status(200).json({
      success: true,
      data: deliveries,
    });
    return;

  } catch (error: unknown) { // Explicitly type error
    logger.error('Webhook deliveries retrieval failed', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get webhook delivery by ID
app.get('/webhooks/deliveries/:deliveryId', async (req, res) => {
  try {
    const { deliveryId } = req.params;

    if (!deliveryId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Delivery ID is required',
        },
      });
    }

    const delivery = webhookService.getWebhookDelivery(deliveryId);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Webhook delivery not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: delivery,
    });
    return;

  } catch (error: unknown) { // Explicitly type error
    logger.error('Webhook delivery retrieval failed', { error, deliveryId: req.params.deliveryId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Replay webhook delivery
app.post('/webhooks/deliveries/:deliveryId/replay', async (req, res) => {
  try {
    const { deliveryId } = req.params;

    if (!deliveryId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Delivery ID is required',
        },
      });
    }

    const result = await webhookService.replayWebhookDelivery(deliveryId);

    if (result.success) {
      res.status(200).json(result);
      return;
    } else {
      res.status(400).json(result);
      return;
    }

  } catch (error: unknown) { // Explicitly type error
    logger.error('Webhook delivery replay failed', { error, deliveryId: req.params.deliveryId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get webhook metrics
app.get('/webhooks/metrics', async (req, res) => {
  try {
    const { endpointId } = req.query;

    const metrics = webhookService.getWebhookMetrics(endpointId as string | undefined);

    res.status(200).json({
      success: true,
      data: metrics,
    });
    return;

  } catch (error: unknown) { // Explicitly type error
    logger.error('Webhook metrics retrieval failed', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Webhook transformation templates
app.post('/webhooks/templates', async (req, res) => {
  try {
    const { name, description, template, outputFormat, variables } = req.body;

    if (!name || !template || !outputFormat) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Template name, content, and output format are required',
        },
      });
    }

    const transformationTemplate = webhookService['transformationEngine'].createTemplateFromContent(
      name,
      description || '',
      template,
      outputFormat,
      variables || {}
    );

    const validation = webhookService['transformationEngine'].validateTemplate(transformationTemplate);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Template validation failed: ${validation.errors.join(', ')}`,
        },
      });
    }

    webhookService['transformationEngine'].registerTemplate(transformationTemplate);

    res.status(201).json({
      success: true,
      data: { templateId: transformationTemplate.id },
    });
    return;

  } catch (error: unknown) { // Explicitly type error
    logger.error('Webhook transformation template creation failed', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

app.get('/webhooks/templates', async (req, res) => {
  try {
    const templates = webhookService['transformationEngine'].getAllTemplates();

    res.status(200).json({
      success: true,
      data: templates,
    });
    return;

  } catch (error: unknown) { // Explicitly type error
    logger.error('Webhook transformation templates retrieval failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Webhook verification endpoint (for external services to verify webhooks)
app.post('/webhooks/verify/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const { payload } = req.body;

    if (!webhookId || !payload) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Webhook ID and payload are required',
        },
      });
    }

    const result = await webhookService.handleIncomingWebhook(webhookId, payload, req.headers as Record<string, string>);

    if (result.success) {
      res.status(200).json(result);
      return;
    } else {
      res.status(400).json(result);
      return;
    }

  } catch (error: unknown) { // Explicitly type error
    logger.error('Webhook verification failed', { error, webhookId: req.params.webhookId, payload: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Bot API Endpoints

// Subscribe to bot notifications
app.post('/bots/subscribe', async (req, res) => {
  try {
    const { userId, platform, eventTypes, channelId, chatId, filters } = req.body;

    if (!userId || !platform || !eventTypes || !Array.isArray(eventTypes)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'User ID, platform, and event types array are required',
        },
      });
    }

    if (!['discord', 'telegram'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PLATFORM',
          message: 'Platform must be discord or telegram',
        },
      });
    }

    const result = await botService.subscribeUser(
      userId,
      platform,
      eventTypes,
      channelId,
      chatId,
      filters
    );

    if (result.success) {
      res.status(201).json(result);
      return;
    } else {
      res.status(400).json(result);
      return;
    }

  } catch (error) {
    logger.error('Bot subscription failed', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Unsubscribe from bot notifications
app.post('/bots/unsubscribe', async (req, res) => {
  try {
    const { userId, platform, eventTypes } = req.body;

    if (!userId || !platform) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'User ID and platform are required',
        },
      });
    }

    const result = await botService.unsubscribeUser(userId, platform, eventTypes);

    if (result.success) {
      res.status(200).json(result);
      return;
    } else {
      res.status(400).json(result);
      return;
    }

  } catch (error) {
    logger.error('Bot unsubscription failed', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get user subscriptions
app.get('/bots/subscriptions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'User ID is required',
        },
      });
    }

    const subscriptions = await botService.getUserSubscriptions(userId);

    res.status(200).json({
      success: true,
      data: subscriptions,
    });
    return;

  } catch (error) {
    logger.error('Failed to get user subscriptions', { error, userId: req.params.userId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get bot metrics
app.get('/bots/metrics', async (req, res) => {
  try {
    const metrics = botService.getBotMetrics();

    res.status(200).json({
      success: true,
      data: metrics,
    });
    return;

  } catch (error) {
    logger.error('Failed to get bot metrics', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Send direct message via bot
app.post('/bots/send', async (req, res) => {
  try {
    const { platform, content, channelId, chatId, priority = 'normal', formatting = { markdown: true } } = req.body;

    if (!platform || !content) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Platform and content are required',
        },
      });
    }

    if (!['discord', 'telegram'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PLATFORM',
          message: 'Platform must be discord or telegram',
        },
      });
    }

    const result = await botService.sendDirectMessage(platform, {
      content,
      channelId,
      chatId,
      messageType: 'notification',
      priority,
      formatting,
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        data: {
          messageId: result.messageId,
          platform: result.platform,
          timestamp: result.timestamp,
        },
      });
      return;
    } else {
      const statusCode = result.error?.retryable ? 500 : 400;
      res.status(statusCode).json({
        success: false,
        error: result.error,
      });
      return;
    }

  } catch (error) {
    logger.error('Direct bot message failed', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Preferences API Endpoints

// Get user preferences
app.get('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { notificationType, channelId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'User ID is required',
        },
      });
    }

    const preferences = await preferenceService.getUserPreferences(
      userId,
      notificationType as 'email' | 'sms' | 'discord' | 'telegram' | 'all',
      channelId as string
    );

    res.status(200).json({
      success: true,
      data: preferences,
    });
    return;

  } catch (error) {
    logger.error('Failed to get user preferences', { error, userId: req.params.userId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Create or update user preferences
app.post('/preferences', async (req, res) => {
  try {
    const { userId, notificationType, channelId, quietHours, priorityOverrides, isActive } = req.body;

    if (!userId || !notificationType) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'User ID and notification type are required',
        },
      });
    }

    const result = await preferenceService.createOrUpdatePreferences({
      userId,
      notificationType,
      channelId,
      quietHours,
      priorityOverrides,
      isActive: isActive !== undefined ? isActive : true,
    });

    if (result.success) {
      res.status(201).json(result);
      return;
    } else {
      res.status(400).json(result);
      return;
    }

  } catch (error) {
    logger.error('Failed to create/update user preferences', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Delete user preferences
app.delete('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { preferenceId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'User ID is required',
        },
      });
    }

    const result = await preferenceService.deleteUserPreferences(userId, preferenceId as string);

    if (result.success) {
      res.status(200).json(result);
      return;
    } else {
      res.status(400).json(result);
      return;
    }

  } catch (error) {
    logger.error('Failed to delete user preferences', { error, userId: req.params.userId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get notification queue for user
app.get('/queue/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'User ID is required',
        },
      });
    }

    const queue = preferenceService.getUserNotificationQueue(userId, status as any);

    res.status(200).json({
      success: true,
      data: queue,
    });
    return;

  } catch (error) {
    logger.error('Failed to get notification queue', { error, userId: req.params.userId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Cancel queued notification
app.post('/queue/:queueId/cancel', async (req, res) => {
  try {
    const { queueId } = req.params;
    const { userId } = req.body;

    if (!queueId || !userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Queue ID and user ID are required',
        },
      });
    }

    const result = await preferenceService.cancelQueuedNotification(queueId, userId);

    if (result.success) {
      res.status(200).json(result);
      return;
    } else {
      res.status(400).json(result);
      return;
    }

  } catch (error) {
    logger.error('Failed to cancel queued notification', { error, queueId: req.params.queueId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Process queued notifications (admin endpoint)
app.post('/admin/process-queue', async (req, res) => {
  try {
    const processedCount = await preferenceService.processQueuedNotifications();

    res.status(200).json({
      success: true,
      data: {
        processed: processedCount,
        message: `Processed ${processedCount} queued notifications`,
      },
    });
    return;

  } catch (error) {
    logger.error('Failed to process queued notifications', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get all user preferences (admin endpoint)
app.get('/admin/preferences', async (req, res) => {
  try {
    const { userId } = req.query;
    const preferences = await preferenceService.getAllUserPreferences(userId as string);

    res.status(200).json({
      success: true,
      data: preferences,
    });
    return;

  } catch (error) {
    logger.error('Failed to get all user preferences', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get holidays
app.get('/holidays', async (req, res) => {
  try {
    const { year, country } = req.query;
    const holidays = year
      ? holidayService.getHolidaysForYear(parseInt(year as string), country as string)
      : holidayService.getAllHolidays(country as string);

    res.status(200).json({
      success: true,
      data: holidays,
    });
    return;

  } catch (error) {
    logger.error('Failed to get holidays', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get timezones
app.get('/timezones', async (req, res) => {
  try {
    const timezones = timeZoneService.getAvailableTimezones();

    res.status(200).json({
      success: true,
      data: timezones,
    });
    return;

  } catch (error) {
    logger.error('Failed to get timezones', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Priority-based Routing API Endpoints

// Determine priority routing for a notification
app.post('/priority/routing', async (req, res) => {
  try {
    const context = req.body;

    if (!context.userId || !context.eventType) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'User ID and event type are required',
        },
      });
    }

    const routing = await priorityRouter.determineRouting(context);

    res.status(200).json({
      success: true,
      data: routing,
    });
    return;

  } catch (error) {
    logger.error('Failed to determine priority routing', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Send priority notification
app.post('/priority/send', async (req, res) => {
  try {
    const { context, notificationData } = req.body;

    if (!context || !notificationData) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Context and notification data are required',
        },
      });
    }

    const result = await priorityNotificationService.sendPriorityNotification(context, notificationData);

    res.status(result.success ? 200 : 207).json({
      success: result.success,
      data: result,
    });
    return;

  } catch (error) {
    logger.error('Failed to send priority notification', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Set user priority override
app.post('/priority/override', async (req, res) => {
  try {
    const override = req.body;

    if (!override.userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'User ID is required',
        },
      });
    }

    priorityNotificationService.setUserPriorityOverride(override);

    res.status(200).json({
      success: true,
      data: { message: 'Priority override set successfully' },
    });
    return;

  } catch (error) {
    logger.error('Failed to set priority override', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Remove user priority override
app.delete('/priority/override/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'User ID is required',
        },
      });
    }

    const removed = priorityNotificationService.removeUserPriorityOverride(userId);

    if (removed) {
      res.status(200).json({
        success: true,
        data: { message: 'Priority override removed successfully' },
      });
      return;
    } else {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No priority override found for user',
        },
      });
      return;
    }

  } catch (error) {
    logger.error('Failed to remove priority override', { error, userId: req.params.userId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get priority configurations
app.get('/priority/config', async (req, res) => {
  try {
    const { priority } = req.query;
    const configs = priorityNotificationService.getRoutingConfig(priority as string);

    res.status(200).json({
      success: true,
      data: configs,
    });
    return;

  } catch (error) {
    logger.error('Failed to get priority configurations', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get available channels for priority
app.get('/priority/channels/:priority', async (req, res) => {
  try {
    const { priority } = req.params;

    if (!priority) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Priority is required',
        },
      });
    }

    const channels = priorityNotificationService.getAvailableChannels(priority);

    res.status(200).json({
      success: true,
      data: channels,
    });
    return;

  } catch (error) {
    logger.error('Failed to get available channels', { error, priority: req.params.priority });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get channel cost information
app.get('/priority/costs', async (req, res) => {
  try {
    const costs: Record<string, number> = {};

    // Get all priority levels
    const priorities = ['critical', 'high', 'medium', 'low'];

    for (const priority of priorities) {
      const config = priorityNotificationService.getRoutingConfig(priority);
      if (config instanceof Map) {
        // This is the full map, get specific priority
        const priorityConfig = config.get(priority as any);
        if (priorityConfig) {
          costs[priority] = priorityConfig.channels.reduce((sum, ch) => sum + ch.costWeight, 0);
        }
      }
    }

    res.status(200).json({
      success: true,
      data: costs,
    });
    return;

  } catch (error) {
    logger.error('Failed to get channel costs', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Admin: Get priority routing statistics
app.get('/admin/priority/stats', async (req, res) => {
  try {
    // This would be implemented to provide analytics on priority routing usage
    const stats = {
      totalRoutingDecisions: 0,
      channelUsage: {},
      priorityDistribution: {},
      costSavings: 0,
      timestamp: new Date(),
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
    return;

  } catch (error) {
    logger.error('Failed to get priority statistics', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Admin: Configure priority routing
app.post('/admin/priority/config', async (req, res) => {
  try {
    const { priority, config } = req.body;

    if (!priority || !config) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Priority and configuration are required',
        },
      });
    }

    // This would allow admins to modify priority routing configurations
    // For now, return success
    res.status(200).json({
      success: true,
      data: { message: 'Priority configuration updated (not fully implemented)' },
    });
    return;

  } catch (error) {
    logger.error('Failed to configure priority routing', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Alert Grouping API Endpoints

// Process alert for grouping
app.post('/grouping/alert', async (req, res) => {
  try {
    const alert = req.body;

    if (!alert.id || !alert.source || !alert.eventType) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Alert ID, source, and event type are required',
        },
      });
    }

    const result = await alertGroupingService.processAlert(alert);

    res.status(200).json({
      success: true,
      data: result,
    });
    return;

  } catch (error) {
    logger.error('Failed to process alert for grouping', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Create digest from group
app.post('/grouping/digest/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Group ID is required',
        },
      });
    }

    const group = alertGroupingService.getGroup(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Alert group not found',
        },
      });
    }

    const digest = await alertGroupingService.createDigest(group);

    res.status(200).json({
      success: true,
      data: digest,
    });
    return;

  } catch (error) {
    logger.error('Failed to create digest', { error, groupId: req.params.groupId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get active alert groups
app.get('/grouping/groups', async (req, res) => {
  try {
    const { type } = req.query;
    const groups = alertGroupingService.getActiveGroups(type as string);

    res.status(200).json({
      success: true,
      data: groups,
    });
    return;

  } catch (error) {
    logger.error('Failed to get active alert groups', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Force complete alert group
app.post('/grouping/complete/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Group ID is required',
        },
      });
    }

    const completed = alertGroupingService.completeGroup(groupId);

    if (completed) {
      res.status(200).json({
        success: true,
        data: { message: 'Alert group completed successfully' },
      });
      return;
    } else {
      res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Alert group not found or already completed',
        },
      });
      return;
    }

  } catch (error) {
    logger.error('Failed to complete alert group', { error, groupId: req.params.groupId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get grouping performance metrics
app.get('/grouping/performance', async (req, res) => {
  try {
    const performance = alertGroupingService.getPerformanceMetrics();

    res.status(200).json({
      success: true,
      data: performance,
    });
    return;

  } catch (error) {
    logger.error('Failed to get grouping performance', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Record grouping feedback
app.post('/grouping/feedback/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { accurate } = req.body;

    if (!groupId || typeof accurate !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Group ID and accurate feedback are required',
        },
      });
    }

    alertGroupingService.recordFeedback(groupId, accurate);

    res.status(200).json({
      success: true,
      data: { message: 'Feedback recorded successfully' },
    });
    return;

  } catch (error) {
    logger.error('Failed to record grouping feedback', { error, groupId: req.params.groupId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Update grouping heuristics
app.post('/grouping/heuristics', async (req, res) => {
  try {
    const heuristics = req.body;

    if (!heuristics || Object.keys(heuristics).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Heuristics data is required',
        },
      });
    }

    alertGroupingService.updateHeuristics(heuristics);

    res.status(200).json({
      success: true,
      data: { message: 'Grouping heuristics updated successfully' },
    });
    return;

  } catch (error) {
    logger.error('Failed to update grouping heuristics', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Process coordinated notification
app.post('/coordinator/send', async (req, res) => {
  try {
    const { context, notificationData } = req.body;

    if (!context || !notificationData) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Context and notification data are required',
        },
      });
    }

    const result = await notificationCoordinator.processNotification(context, notificationData);

    res.status(200).json({
      success: true,
      data: result,
    });
    return;

  } catch (error) {
    logger.error('Failed to process coordinated notification', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get coordinated notification
app.get('/coordinator/notification/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Notification ID is required',
        },
      });
    }

    const notification = notificationCoordinator.getCoordinatedNotification(notificationId);

    if (notification) {
      res.status(200).json({
        success: true,
        data: notification,
      });
      return;
    } else {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'Coordinated notification not found',
        },
      });
      return;
    }

  } catch (error) {
    logger.error('Failed to get coordinated notification', { error, notificationId: req.params.notificationId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get user coordinated notifications
app.get('/coordinator/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'User ID is required',
        },
      });
    }

    const notifications = notificationCoordinator.getUserCoordinatedNotifications(userId);

    res.status(200).json({
      success: true,
      data: notifications,
    });
    return;

  } catch (error) {
    logger.error('Failed to get user coordinated notifications', { error, userId: req.params.userId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get coordinator statistics
app.get('/coordinator/stats', async (req, res) => {
  try {
    const stats = notificationCoordinator.getCoordinatorStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
    return;

  } catch (error) {
    logger.error('Failed to get coordinator statistics', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Admin: Get all alert groups
app.get('/admin/grouping/groups', async (req, res) => {
  try {
    const groups = alertGroupingService.getAllGroups();

    res.status(200).json({
      success: true,
      data: groups,
    });
    return;

  } catch (error) {
    logger.error('Failed to get all alert groups', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Admin: Cleanup old notifications
app.post('/admin/coordinator/cleanup', async (req, res) => {
  try {
    const { daysToKeep } = req.body || { daysToKeep: 7 };
    notificationCoordinator.cleanupOldNotifications(daysToKeep);

    res.status(200).json({
      success: true,
      data: { message: `Cleanup completed for notifications older than ${daysToKeep} days` },
    });
    return;

  } catch (error) {
    logger.error('Failed to cleanup old notifications', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Delivery Tracking API Endpoints

// Get delivery by ID
app.get('/delivery/:deliveryId', async (req, res) => {
  try {
    const { deliveryId } = req.params;

    if (!deliveryId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Delivery ID is required',
        },
      });
    }

    const delivery = notificationCoordinator.getDelivery(deliveryId);

    if (delivery) {
      res.status(200).json({
        success: true,
        data: delivery,
      });
      return;
    } else {
      res.status(404).json({
        success: false,
        error: {
          code: 'DELIVERY_NOT_FOUND',
          message: 'Delivery not found',
        },
      });
      return;
    }

  } catch (error) {
    logger.error('Failed to get delivery', { error, deliveryId: req.params.deliveryId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get user deliveries
app.get('/delivery/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'User ID is required',
        },
      });
    }

    const deliveries = notificationCoordinator.getUserDeliveries(userId, limit ? parseInt(limit as string) : undefined);

    res.status(200).json({
      success: true,
      data: deliveries,
    });
    return;

  } catch (error) {
    logger.error('Failed to get user deliveries', { error, userId: req.params.userId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get delivery attempts for notification
app.get('/delivery/:deliveryId/attempts', async (req, res) => {
  try {
    const { deliveryId } = req.params;

    if (!deliveryId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Delivery ID is required',
        },
      });
    }

    const attempts = notificationCoordinator.getDeliveryAttempts(deliveryId);

    res.status(200).json({
      success: true,
      data: attempts,
    });
    return;

  } catch (error) {
    logger.error('Failed to get delivery attempts', { error, deliveryId: req.params.deliveryId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get delivery analytics
app.get('/delivery/analytics', async (req, res) => {
  try {
    const analytics = notificationCoordinator.getDeliveryAnalytics();

    res.status(200).json({
      success: true,
      data: analytics,
    });
    return;

  } catch (error) {
    logger.error('Failed to get delivery analytics', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get channel delivery statistics
app.get('/delivery/channels/stats', async (req, res) => {
  try {
    const stats = notificationCoordinator.getChannelDeliveryStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
    return;

  } catch (error) {
    logger.error('Failed to get channel delivery stats', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get provider delivery statistics
app.get('/delivery/providers/stats', async (req, res) => {
  try {
    const stats = notificationCoordinator.getProviderDeliveryStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
    return;

  } catch (error) {
    logger.error('Failed to get provider delivery stats', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Update retry configuration for channel
app.post('/delivery/retry-config/:channel', async (req, res) => {
  try {
    const { channel } = req.params;
    const config = req.body;

    if (!channel || !config) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Channel and configuration are required',
        },
      });
    }

    notificationCoordinator.updateRetryConfig(channel, config);

    res.status(200).json({
      success: true,
      data: { message: 'Retry configuration updated successfully' },
    });
    return;

  } catch (error) {
    logger.error('Failed to update retry configuration', { error, channel: req.params.channel, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get retry configuration for channel
app.get('/delivery/retry-config/:channel', async (req, res) => {
  try {
    const { channel } = req.params;

    if (!channel) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Channel is required',
        },
      });
    }

    const config = notificationCoordinator.getRetryConfig && notificationCoordinator.getRetryConfig(channel as any);

    res.status(200).json({
      success: true,
      data: config,
    });
    return;

  } catch (error) {
    logger.error('Failed to get retry configuration', { error, channel: req.params.channel });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Admin: Get all deliveries (with pagination)
app.get('/admin/deliveries', async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, status } = req.query;

    // This would implement pagination and filtering
    // For now, return a placeholder
    res.status(200).json({
      success: true,
      data: {
        deliveries: [],
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: 0
        }
      },
    });
    return;

  } catch (error) {
    logger.error('Failed to get deliveries for admin', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Admin: Cleanup old delivery records
app.post('/admin/delivery/cleanup', async (req, res) => {
  try {
    const { daysToKeep } = req.body || { daysToKeep: 30 };
    const cleanedCount = notificationCoordinator.cleanupOldRecords && notificationCoordinator.cleanupOldRecords(daysToKeep);

    res.status(200).json({
      success: true,
      data: { message: `Cleanup completed. ${cleanedCount || 0} records removed.` },
    });
    return;

  } catch (error) {
    logger.error('Failed to cleanup old delivery records', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Testing and Verification API Endpoints

// Run full test suite
app.post('/test/suite', async (req, res) => {
  try {
    const results = await notificationTestSuite.runFullTestSuite();

    res.status(200).json({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          passed: results.filter(r => r.status === 'passed').length,
          failed: results.filter(r => r.status === 'failed').length,
          successRate: ((results.filter(r => r.status === 'passed').length / results.length) * 100).toFixed(1) + '%'
        }
      },
    });
    return;

  } catch (error) {
    logger.error('Failed to run test suite', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'TEST_ERROR',
        message: `Test suite execution failed: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Run load test scenario
app.post('/test/load', async (req, res) => {
  try {
    const config = req.body;

    if (!config.duration || !config.concurrency) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Duration and concurrency are required for load testing',
        },
      });
    }

    const metrics = await notificationTestSuite.runLoadTest(config);

    res.status(200).json({
      success: true,
      data: {
        metrics,
        evaluation: {
          meetsThroughput: metrics.throughput >= 1000,
          meetsLatency: metrics.averageLatency <= 2000,
          meetsSuccessRate: (metrics.successfulDeliveries / metrics.totalNotifications) >= 0.95
        }
      },
    });
    return;

  } catch (error) {
    logger.error('Failed to run load test', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'LOAD_TEST_ERROR',
        message: `Load test execution failed: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Run comprehensive system test
app.post('/test/comprehensive', async (req, res) => {
  try {
    const results = await loadTestSimulator.runComprehensiveTest();

    res.status(200).json({
      success: true,
      data: results,
    });
    return;

  } catch (error) {
    logger.error('Failed to run comprehensive test', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'COMPREHENSIVE_TEST_ERROR',
        message: `Comprehensive test execution failed: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Verify system requirements
app.get('/test/requirements', async (req, res) => {
  try {
    const verification = await notificationTestSuite.verifySystemRequirements();

    res.status(200).json({
      success: true,
      data: verification,
    });
    return;

  } catch (error) {
    logger.error('Failed to verify system requirements', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'REQUIREMENTS_VERIFICATION_ERROR',
        message: `Requirements verification failed: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get test results
app.get('/test/results', async (req, res) => {
  try {
    const results = notificationTestSuite.getTestResults();
    const loadMetrics = notificationTestSuite.getLoadTestMetrics();

    res.status(200).json({
      success: true,
      data: {
        testResults: results,
        loadTestMetrics: loadMetrics,
        summary: {
          totalTests: results.length,
          passedTests: results.filter(r => r.status === 'passed').length,
          failedTests: results.filter(r => r.status === 'failed').length,
          lastTestRun: null
        }
      },
    });
    return;

  } catch (error) {
    logger.error('Failed to get test results', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'RESULTS_ERROR',
        message: `Failed to retrieve test results: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Generate test report
app.get('/test/report', async (req, res) => {
  try {
    const testResults = notificationTestSuite.getTestResults();
    const loadTestResults = { overall: { passed: 0, failed: 0, recommendations: [] } }; // Placeholder
    const extensibilityResults = { extensible: true, newChannels: [], newPreferences: [], recommendations: [] }; // Placeholder

    const report = loadTestSimulator.generateComprehensiveReport(testResults, loadTestResults, extensibilityResults);

    res.status(200).json({
      success: true,
      data: {
        report,
        format: 'text',
        generatedAt: new Date()
      },
    });
    return;

  } catch (error) {
    logger.error('Failed to generate test report', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'REPORT_ERROR',
        message: `Failed to generate test report: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Admin: Run system health check
app.get('/admin/health', async (req, res) => {
  try {
    const healthChecks = await Promise.all([
      emailService.getHealthStatus(),
      smsService.getHealthStatus(),
      botService.getHealthStatus(),
      notificationCoordinator.getCoordinatorStats(),
      defiMetricsCollector.getProviderHealth()
    ]);

    const overallHealth = {
      status: healthChecks.every(check => check.status === 'healthy') ? 'healthy' :
              healthChecks.some(check => check.status === 'error') ? 'error' : 'degraded',
      services: {
        email: healthChecks[0],
        sms: healthChecks[1],
        bot: healthChecks[2],
        coordinator: healthChecks[3],
        defi: healthChecks[4]
      },
      timestamp: new Date(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      loadAverage: process.cpuUsage()
    };

    res.status(overallHealth.status === 'healthy' ? 200 : overallHealth.status === 'error' ? 500 : 207).json({
      success: true,
      data: overallHealth,
    });
    return;

  } catch (error) {
    logger.error('Failed to perform health check', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_ERROR',
        message: `Health check failed: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Admin: Get system performance metrics
app.get('/admin/performance', async (req, res) => {
  try {
    const performance = {
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        loadAverage: require('os').loadavg()
      },
      services: await Promise.all([
        emailService.getHealthStatus(),
        smsService.getHealthStatus(),
        botService.getHealthStatus()
      ]),
      coordinator: notificationCoordinator.getCoordinatorStats(),
      timestamp: new Date()
    };

    res.status(200).json({
      success: true,
      data: performance,
    });
    return;

  } catch (error) {
    logger.error('Failed to get performance metrics', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'PERFORMANCE_ERROR',
        message: `Failed to retrieve performance metrics: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Admin: Force system cleanup
app.post('/admin/cleanup', async (req, res) => {
  try {
    const { notificationsDays = 7, deliveriesDays = 30 } = req.body;

    const results = {
      notifications: 0,
      deliveries: 0,
      groups: 0
    };

    // Cleanup old notifications
    if (notificationCoordinator.cleanupOldNotifications) {
      notificationCoordinator.cleanupOldNotifications(notificationsDays);
      results.notifications = 1; // Placeholder count
    }

    // Cleanup old deliveries
    if (notificationCoordinator.cleanupOldRecords) {
      results.deliveries = notificationCoordinator.cleanupOldRecords(deliveriesDays);
    }

    // Cleanup old groups (placeholder)
    results.groups = 0;

    res.status(200).json({
      success: true,
      data: {
        message: `Cleanup completed`,
        results
      },
    });
    return;

  } catch (error) {
    logger.error('Failed to perform system cleanup', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'CLEANUP_ERROR',
        message: `System cleanup failed: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Admin: Get system configuration
app.get('/admin/config', async (req, res) => {
  try {
    const config = {
      services: {
        email: emailService.getHealthStatus(),
        sms: smsService.getHealthStatus(),
        bot: botService.getHealthStatus()
      },
      features: {
        priorityRouting: true,
        alertGrouping: true,
        deliveryTracking: true,
        quietHours: true,
        retryLogic: true,
        channelEscalation: true,
        loadTesting: true,
        extensibility: true,
        webSocketConnections: true,
        marketDataPipeline: true,
        blockchainMonitoring: true,
        socialMediaSentiment: true,
        defiMetricsCollection: true
      },
      limits: {
        maxConcurrentGroups: 1000,
        maxRetriesPerChannel: 5,
        maxEscalationLevel: 3,
        cleanupInterval: 3600000 // 1 hour
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      },
      timestamp: new Date()
    };

    res.status(200).json({
      success: true,
      data: config,
    });
    return;

  } catch (error) {
    logger.error('Failed to get system configuration', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIG_ERROR',
        message: `Failed to retrieve system configuration: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// WebSocket Connection Management API Endpoints

// Connect to exchange WebSocket
app.post('/websocket/connect/:exchange', async (req, res) => {
  try {
    const { exchange } = req.params;

    if (!exchange) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Exchange parameter is required',
        },
      });
    }

    const connectionId = await webSocketManager.connectExchange(exchange as any);

    res.status(200).json({
      success: true,
      data: { connectionId, exchange, status: 'connecting' },
    });
    return;

  } catch (error) {
    logger.error('Failed to connect to exchange WebSocket', { error, exchange: req.params.exchange });
    res.status(500).json({
      success: false,
      error: {
        code: 'CONNECTION_ERROR',
        message: `Failed to establish WebSocket connection: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get WebSocket connection status
app.get('/websocket/connections', async (req, res) => {
  try {
    const connections = webSocketManager.getAllConnections();

    res.status(200).json({
      success: true,
      data: connections,
    });
    return;

  } catch (error) {
    logger.error('Failed to get WebSocket connections', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'CONNECTION_ERROR',
        message: `Failed to retrieve WebSocket connections: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get connection metrics
app.get('/websocket/metrics', async (req, res) => {
  try {
    const metrics = webSocketManager.getConnectionMetrics();

    res.status(200).json({
      success: true,
      data: metrics,
    });
    return;

  } catch (error) {
    logger.error('Failed to get WebSocket metrics', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: `Failed to retrieve WebSocket metrics: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Disconnect WebSocket connection
app.post('/websocket/disconnect/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;

    if (!connectionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Connection ID is required',
        },
      });
    }

    const disconnected = webSocketManager.disconnect(connectionId);

    if (disconnected) {
      res.status(200).json({
        success: true,
        data: { message: 'WebSocket connection disconnected successfully' },
      });
      return;
    } else {
      res.status(404).json({
        success: false,
        error: {
          code: 'CONNECTION_NOT_FOUND',
          message: 'WebSocket connection not found',
        },
      });
      return;
    }

  } catch (error) {
    logger.error('Failed to disconnect WebSocket connection', { error, connectionId: req.params.connectionId });
    res.status(500).json({
      success: false,
      error: {
        code: 'DISCONNECT_ERROR',
        message: `Failed to disconnect WebSocket: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get supported exchanges
app.get('/websocket/exchanges', async (req, res) => {
  try {
    const exchanges = webSocketManager.getSupportedExchanges();

    res.status(200).json({
      success: true,
      data: exchanges,
    });
    return;

  } catch (error) {
    logger.error('Failed to get supported exchanges', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'EXCHANGES_ERROR',
        message: `Failed to retrieve supported exchanges: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Enhanced WebSocket Manager API Endpoints

// Get WebSocket connection statistics
app.get('/websocket/stats', async (req, res) => {
  try {
    const stats = webSocketManager.getConnectionStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
    return;

  } catch (error) {
    logger.error('Failed to get WebSocket stats', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: `Failed to retrieve WebSocket statistics: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get WebSocket connection metrics
app.get('/websocket/metrics', async (req, res) => {
  try {
    const metrics = webSocketManager.getConnectionMetrics();

    res.status(200).json({
      success: true,
      data: metrics,
    });
    return;

  } catch (error) {
    logger.error('Failed to get WebSocket metrics', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: `Failed to retrieve WebSocket metrics: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Set compression algorithm
app.post('/websocket/compression/:algorithm', async (req, res) => {
  try {
    const { algorithm } = req.params;

    if (!['none', 'zlib', 'snappy'].includes(algorithm)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ALGORITHM',
          message: 'Invalid compression algorithm. Use: none, zlib, snappy',
        },
      });
    }

    webSocketManager.setCompressionAlgorithm(algorithm as any);

    res.status(200).json({
      success: true,
      data: { message: `Compression algorithm set to ${algorithm}` },
    });
    return;

  } catch (error) {
    logger.error('Failed to set compression algorithm', { error, algorithm: req.params.algorithm });
    res.status(500).json({
      success: false,
      error: {
        code: 'COMPRESSION_ERROR',
        message: `Failed to set compression algorithm: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get compression statistics
app.get('/websocket/compression/stats', async (req, res) => {
  try {
    const stats = webSocketManager.getCompressionStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
    return;

  } catch (error) {
    logger.error('Failed to get compression stats', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'COMPRESSION_STATS_ERROR',
        message: `Failed to retrieve compression statistics: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Force failover for specific connection
app.post('/websocket/failover/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const success = await webSocketManager.forceFailover(connectionId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONNECTION_NOT_FOUND',
          message: `Connection with ID '${connectionId}' not found`,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: { message: `Failover initiated for connection ${connectionId}` },
    });
    return;

  } catch (error) {
    logger.error('Failed to force failover', { error, connectionId: req.params.connectionId });
    res.status(500).json({
      success: false,
      error: {
        code: 'FAILOVER_ERROR',
        message: `Failed to initiate failover: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Market Data Pipeline API Endpoints

// Get market alerts for symbol
app.get('/market/alerts/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { exchange, limit } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Symbol is required',
        },
      });
    }

    const alerts = marketDataPipeline.getMarketAlerts(symbol, exchange as any, limit ? parseInt(limit as string) : undefined);

    res.status(200).json({
      success: true,
      data: alerts,
    });
    return;

  } catch (error) {
    logger.error('Failed to get market alerts', { error, symbol: req.params.symbol });
    res.status(500).json({
      success: false,
      error: {
        code: 'MARKET_DATA_ERROR',
        message: `Failed to retrieve market alerts: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get price history for symbol
app.get('/market/history/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { exchange, limit } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Symbol is required',
        },
      });
    }

    const history = marketDataPipeline.getPriceHistory(symbol, exchange as any, limit ? parseInt(limit as string) : undefined);

    res.status(200).json({
      success: true,
      data: history,
    });
    return;

  } catch (error) {
    logger.error('Failed to get price history', { error, symbol: req.params.symbol });
    res.status(500).json({
      success: false,
      error: {
        code: 'MARKET_DATA_ERROR',
        message: `Failed to retrieve price history: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get current market data for symbol
app.get('/market/current/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { exchange } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Symbol is required',
        },
      });
    }

    const currentData = marketDataPipeline.getCurrentMarketData(symbol, exchange as any);

    if (currentData) {
      res.status(200).json({
        success: true,
        data: currentData,
      });
      return;
    } else {
      res.status(404).json({
        success: false,
        error: {
          code: 'NO_DATA',
          message: 'No current market data available for symbol',
        },
      });
      return;
    }

  } catch (error) {
    logger.error('Failed to get current market data', { error, symbol: req.params.symbol });
    res.status(500).json({
      success: false,
      error: {
        code: 'MARKET_DATA_ERROR',
        message: `Failed to retrieve current market data: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Subscribe to market alerts for symbol
app.post('/market/subscribe/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { exchange } = req.body;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Symbol is required',
        },
      });
    }

    const subscriptionId = marketDataPipeline.subscribeToMarketAlerts(symbol, exchange as any, (alert) => {
      // This would trigger notifications through the notification system
      logger.info('Market alert received', { alert, symbol, exchange });
    });

    res.status(200).json({
      success: true,
      data: { subscriptionId, symbol, exchange },
    });
    return;

  } catch (error) {
    logger.error('Failed to subscribe to market alerts', { error, symbol: req.params.symbol });
    res.status(500).json({
      success: false,
      error: {
        code: 'SUBSCRIPTION_ERROR',
        message: `Failed to subscribe to market alerts: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get market data pipeline statistics
app.get('/market/pipeline/stats', async (req, res) => {
  try {
    const stats = marketDataPipeline.getPipelineStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
    return;

  } catch (error) {
    logger.error('Failed to get pipeline statistics', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'PIPELINE_ERROR',
        message: `Failed to retrieve pipeline statistics: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Update alert thresholds
app.post('/market/thresholds', async (req, res) => {
  try {
    const thresholds = req.body;

    if (!thresholds || Object.keys(thresholds).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Thresholds data is required',
        },
      });
    }

    marketDataPipeline.updateThresholds(thresholds);

    res.status(200).json({
      success: true,
      data: { message: 'Market alert thresholds updated successfully' },
    });
    return;

  } catch (error) {
    logger.error('Failed to update market thresholds', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'THRESHOLDS_ERROR',
        message: `Failed to update market thresholds: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get current alert thresholds
app.get('/market/thresholds', async (req, res) => {
  try {
    const thresholds = marketDataPipeline.getThresholds();

    res.status(200).json({
      success: true,
      data: thresholds,
    });
    return;

  } catch (error) {
    logger.error('Failed to get market thresholds', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'THRESHOLDS_ERROR',
        message: `Failed to retrieve market thresholds: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Test market data processing
app.post('/market/test', async (req, res) => {
  try {
    const testResults = await marketDataPipeline.testMarketDataProcessing();

    res.status(200).json({
      success: true,
      data: testResults,
    });
    return;

  } catch (error) {
    logger.error('Failed to test market data processing', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'TEST_ERROR',
        message: `Market data processing test failed: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Social Media API Endpoints

// Start monitoring social media platform
app.post('/social/monitor/:platform', async (req, res) => {
  try {
    const { platform } = req.params;

    if (!platform) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Platform parameter is required',
        },
      });
    }

    const streamId = await socialMediaManager.startMonitoring(platform as any);

    res.status(200).json({
      success: true,
      data: { streamId, platform, status: 'started' },
    });
    return;

  } catch (error) {
    logger.error('Failed to start social media monitoring', { error, platform: req.params.platform });
    res.status(500).json({
      success: false,
      error: {
        code: 'MONITORING_ERROR',
        message: `Failed to start social media monitoring: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get social media metrics
app.get('/social/metrics', async (req, res) => {
  try {
    const metrics = socialMediaManager.getSocialMediaMetrics();

    res.status(200).json({
      success: true,
      data: metrics,
    });
    return;

  } catch (error) {
    logger.error('Failed to get social media metrics', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: `Failed to retrieve social media metrics: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Stop social media monitoring
app.post('/social/stop/:streamId', async (req, res) => {
  try {
    const { streamId } = req.params;

    if (!streamId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Stream ID is required',
        },
      });
    }

    const stopped = await socialMediaManager.stopMonitoring(streamId);

    if (stopped) {
      res.status(200).json({
        success: true,
        data: { message: 'Social media monitoring stopped successfully' },
      });
      return;
    } else {
      res.status(404).json({
        success: false,
        error: {
          code: 'STREAM_NOT_FOUND',
          message: 'Social media stream not found',
        },
      });
      return;
    }

  } catch (error) {
    logger.error('Failed to stop social media monitoring', { error, streamId: req.params.streamId });
    res.status(500).json({
      success: false,
      error: {
        code: 'STOP_ERROR',
        message: `Failed to stop social media monitoring: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get supported social media platforms
app.get('/social/platforms', async (req, res) => {
  try {
    const platforms = socialMediaManager.getSupportedPlatforms();

    res.status(200).json({
      success: true,
      data: platforms,
    });
    return;

  } catch (error) {
    logger.error('Failed to get supported platforms', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'PLATFORMS_ERROR',
        message: `Failed to retrieve supported platforms: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Sentiment Analysis API Endpoints

// Analyze sentiment for message
app.post('/sentiment/analyze', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.content) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Message content is required',
        },
      });
    }

    const sentiment = await sentimentAnalysisService.analyzeSentiment(message);

    res.status(200).json({
      success: true,
      data: sentiment,
    });
    return;

  } catch (error) {
    logger.error('Failed to analyze sentiment', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYSIS_ERROR',
        message: `Failed to analyze sentiment: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get sentiment metrics
app.get('/sentiment/metrics', async (req, res) => {
  try {
    const metrics = sentimentAnalysisService.getSentimentMetrics();

    res.status(200).json({
      success: true,
      data: metrics,
    });
    return;

  } catch (error) {
    logger.error('Failed to get sentiment metrics', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: `Failed to retrieve sentiment metrics: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Update sentiment configuration
app.post('/sentiment/config', async (req, res) => {
  try {
    const config = req.body;

    if (!config || Object.keys(config).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Configuration data is required',
        },
      });
    }

    sentimentAnalysisService.updateConfig(config);

    res.status(200).json({
      success: true,
      data: { message: 'Sentiment configuration updated successfully' },
    });
    return;

  } catch (error) {
    logger.error('Failed to update sentiment configuration', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIG_ERROR',
        message: `Failed to update sentiment configuration: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get sentiment configuration
app.get('/sentiment/config', async (req, res) => {
  try {
    const config = sentimentAnalysisService.getConfig();

    res.status(200).json({
      success: true,
      data: config,
    });
    return;

  } catch (error) {
    logger.error('Failed to get sentiment configuration', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIG_ERROR',
        message: `Failed to retrieve sentiment configuration: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Test sentiment analysis
app.post('/sentiment/test', async (req, res) => {
  try {
    const testResults = await sentimentAnalysisService.testSentimentAnalysis();

    res.status(200).json({
      success: true,
      data: testResults,
    });
    return;

  } catch (error) {
    logger.error('Failed to test sentiment analysis', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'TEST_ERROR',
        message: `Sentiment analysis test failed: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Stop all social media monitoring
app.post('/social/stop-all', async (req, res) => {
  try {
    await socialMediaManager.stopAllMonitoring();

    res.status(200).json({
      success: true,
      data: { message: 'All social media monitoring stopped successfully' },
    });
    return;

  } catch (error) {
    logger.error('Failed to stop all social media monitoring', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'STOP_ALL_ERROR',
        message: `Failed to stop all social media monitoring: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get social media statistics
app.get('/social/stats', async (req, res) => {
  try {
    const stats = socialMediaManager.getMessageStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
    return;

  } catch (error) {
    logger.error('Failed to get social media statistics', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: `Failed to retrieve social media statistics: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// DeFi Protocol Metrics API Endpoints

// Get DeFi metrics overview
app.get('/defi/metrics', async (req, res) => {
  try {
    const metrics = defiMetricsCollector.getMetrics();

    if (!metrics) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'DeFi metrics not yet available. Please try again later.',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        totalTVL: metrics.totalTVL,
        totalVolume24h: metrics.totalVolume24h,
        protocolsCount: metrics.protocolsCount,
        chainsCount: metrics.chainsCount,
        topProtocols: metrics.topProtocols.slice(0, 10),
        riskDistribution: metrics.riskDistribution,
        categoryDistribution: metrics.categoryDistribution,
        lastUpdated: metrics.lastUpdated,
        nextUpdate: new Date(Date.now() + 300000) // 5 minutes from now
      },
    });
    return;

  } catch (error) {
    logger.error('Failed to get DeFi metrics', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: `Failed to retrieve DeFi metrics: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get specific protocol metrics
app.get('/defi/protocol/:protocolId', async (req, res) => {
  try {
    const { protocolId } = req.params;
    const protocol = defiMetricsCollector.getProtocolMetrics(protocolId);

    if (!protocol) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROTOCOL_NOT_FOUND',
          message: `Protocol with ID '${protocolId}' not found`,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: protocol,
    });
    return;

  } catch (error) {
    logger.error('Failed to get protocol metrics', { error, protocolId: req.params.protocolId });
    res.status(500).json({
      success: false,
      error: {
        code: 'PROTOCOL_ERROR',
        message: `Failed to retrieve protocol metrics: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get yield opportunities
app.get('/defi/yield-opportunities', async (req, res) => {
  try {
    const minAPY = req.query.minAPY ? parseFloat(req.query.minAPY as string) : undefined;
    const opportunities = defiMetricsCollector.getYieldOpportunities(minAPY);

    res.status(200).json({
      success: true,
      data: opportunities,
    });
    return;

  } catch (error) {
    logger.error('Failed to get yield opportunities', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'YIELD_ERROR',
        message: `Failed to retrieve yield opportunities: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get upcoming token unlocks
app.get('/defi/token-unlocks', async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : undefined;
    const unlocks = defiMetricsCollector.getUpcomingUnlocks(days);

    res.status(200).json({
      success: true,
      data: unlocks,
    });
    return;

  } catch (error) {
    logger.error('Failed to get token unlocks', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'UNLOCKS_ERROR',
        message: `Failed to retrieve token unlocks: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get DeFi provider health status
app.get('/defi/health', async (req, res) => {
  try {
    const health = defiMetricsCollector.getProviderHealth();

    res.status(200).json({
      success: true,
      data: health,
    });
    return;

  } catch (error) {
    logger.error('Failed to get DeFi provider health', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_ERROR',
        message: `Failed to retrieve DeFi provider health: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Force metrics refresh
app.post('/defi/refresh', async (req, res) => {
  try {
    await defiMetricsCollector.collectAllMetrics();

    res.status(200).json({
      success: true,
      data: { message: 'DeFi metrics refreshed successfully' },
    });
    return;

  } catch (error) {
    logger.error('Failed to refresh DeFi metrics', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'REFRESH_ERROR',
        message: `Failed to refresh DeFi metrics: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Blockchain Node Management API Endpoints

// Connect to blockchain node
app.post('/blockchain/connect/:blockchain', async (req, res) => {
  try {
    const { blockchain } = req.params;

    if (!blockchain) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Blockchain parameter is required',
        },
      });
    }

    const nodeId = await blockchainNodeManager.connectBlockchain(blockchain as any);

    res.status(200).json({
      success: true,
      data: { nodeId, blockchain, status: 'connecting' },
    });
    return;

  } catch (error) {
    logger.error('Failed to connect to blockchain node', { error, blockchain: req.params.blockchain });
    res.status(500).json({
      success: false,
      error: {
        code: 'CONNECTION_ERROR',
        message: `Failed to establish blockchain connection: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get blockchain node status
app.get('/blockchain/nodes', async (req, res) => {
  try {
    const nodes = blockchainNodeManager.getAllNodes();

    res.status(200).json({
      success: true,
      data: nodes,
    });
    return;

  } catch (error) {
    logger.error('Failed to get blockchain nodes', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'NODE_ERROR',
        message: `Failed to retrieve blockchain nodes: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get blockchain metrics
app.get('/blockchain/metrics', async (req, res) => {
  try {
    const metrics = blockchainNodeManager.getNodeMetrics();

    res.status(200).json({
      success: true,
      data: metrics,
    });
    return;

  } catch (error) {
    logger.error('Failed to get blockchain metrics', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: `Failed to retrieve blockchain metrics: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Disconnect blockchain node
app.post('/blockchain/disconnect/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;

    if (!nodeId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Node ID is required',
        },
      });
    }

    const disconnected = await blockchainNodeManager.disconnectNode(nodeId);

    if (disconnected) {
      res.status(200).json({
        success: true,
        data: { message: 'Blockchain node disconnected successfully' },
      });
      return;
    } else {
      res.status(404).json({
        success: false,
        error: {
          code: 'NODE_NOT_FOUND',
          message: 'Blockchain node not found',
        },
      });
      return;
    }

  } catch (error) {
    logger.error('Failed to disconnect blockchain node', { error, nodeId: req.params.nodeId });
    res.status(500).json({
      success: false,
      error: {
        code: 'DISCONNECT_ERROR',
        message: `Failed to disconnect blockchain node: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get supported blockchains
app.get('/blockchain/supported', async (req, res) => {
  try {
    const blockchains = blockchainNodeManager.getSupportedBlockchains();

    res.status(200).json({
      success: true,
      data: blockchains,
    });
    return;

  } catch (error) {
    logger.error('Failed to get supported blockchains', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'BLOCKCHAIN_ERROR',
        message: `Failed to retrieve supported blockchains: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Subscribe to blockchain events
app.post('/blockchain/subscribe', async (req, res) => {
  try {
    const { blockchain, type, filter } = req.body;

    if (!blockchain || !type) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Blockchain and subscription type are required',
        },
      });
    }

    const subscriptionId = await blockchainNodeManager.subscribeToEvents(blockchain, {
      type: type as any,
      filter,
      blockchain: blockchain as any
    });

    res.status(200).json({
      success: true,
      data: { subscriptionId, blockchain, type },
    });
    return;

  } catch (error) {
    logger.error('Failed to subscribe to blockchain events', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'SUBSCRIPTION_ERROR',
        message: `Failed to create blockchain subscription: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Unsubscribe from blockchain events
app.post('/blockchain/unsubscribe/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Subscription ID is required',
        },
      });
    }

    const unsubscribed = await blockchainNodeManager.unsubscribeFromEvents(subscriptionId);

    if (unsubscribed) {
      res.status(200).json({
        success: true,
        data: { message: 'Blockchain subscription removed successfully' },
      });
      return;
    } else {
      res.status(404).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_NOT_FOUND',
          message: 'Blockchain subscription not found',
        },
      });
      return;
    }

  } catch (error) {
    logger.error('Failed to unsubscribe from blockchain events', { error, subscriptionId: req.params.subscriptionId });
    res.status(500).json({
      success: false,
      error: {
        code: 'UNSUBSCRIBE_ERROR',
        message: `Failed to remove blockchain subscription: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Transaction Monitoring API Endpoints

// Add address to monitoring
app.post('/transaction/monitor/address', async (req, res) => {
  try {
    const { address, blockchain, type, labels } = req.body;

    if (!address || !blockchain || !type) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Address, blockchain, and type are required',
        },
      });
    }

    transactionMonitor.addMonitoredAddress(address, blockchain, type, labels);

    res.status(200).json({
      success: true,
      data: { message: 'Address added to monitoring successfully' },
    });
    return;

  } catch (error) {
    logger.error('Failed to add address to monitoring', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'MONITORING_ERROR',
        message: `Failed to add address to monitoring: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Remove address from monitoring
app.delete('/transaction/monitor/address/:address/:blockchain', async (req, res) => {
  try {
    const { address, blockchain } = req.params;

    if (!address || !blockchain) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Address and blockchain are required',
        },
      });
    }

    const removed = transactionMonitor.removeMonitoredAddress(address, blockchain);

    if (removed) {
      res.status(200).json({
        success: true,
        data: { message: 'Address removed from monitoring successfully' },
      });
      return;
    } else {
      res.status(404).json({
        success: false,
        error: {
          code: 'ADDRESS_NOT_FOUND',
          message: 'Address not found in monitoring',
        },
      });
      return;
    }

  } catch (error) {
    logger.error('Failed to remove address from monitoring', { error, address: req.params.address, blockchain: req.params.blockchain });
    res.status(500).json({
      success: false,
      error: {
        code: 'MONITORING_ERROR',
        message: `Failed to remove address from monitoring: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get monitored addresses
app.get('/transaction/monitor/addresses', async (req, res) => {
  try {
    const addresses = transactionMonitor.getMonitoredAddresses();

    res.status(200).json({
      success: true,
      data: addresses,
    });
    return;

  } catch (error) {
    logger.error('Failed to get monitored addresses', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'MONITORING_ERROR',
        message: `Failed to retrieve monitored addresses: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get transaction history for address
app.get('/transaction/history/:address/:blockchain', async (req, res) => {
  try {
    const { address, blockchain } = req.params;
    const { limit } = req.query;

    if (!address || !blockchain) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Address and blockchain are required',
        },
      });
    }

    const history = transactionMonitor.getTransactionHistory(address, blockchain, limit ? parseInt(limit as string) : undefined);

    res.status(200).json({
      success: true,
      data: history,
    });
    return;

  } catch (error) {
    logger.error('Failed to get transaction history', { error, address: req.params.address, blockchain: req.params.blockchain });
    res.status(500).json({
      success: false,
      error: {
        code: 'HISTORY_ERROR',
        message: `Failed to retrieve transaction history: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get monitoring statistics
app.get('/transaction/monitor/stats', async (req, res) => {
  try {
    const stats = transactionMonitor.getMonitoringStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
    return;

  } catch (error) {
    logger.error('Failed to get monitoring statistics', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: `Failed to retrieve monitoring statistics: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Update transaction thresholds
app.post('/transaction/thresholds', async (req, res) => {
  try {
    const thresholds = req.body;

    if (!thresholds || Object.keys(thresholds).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Thresholds data is required',
        },
      });
    }

    transactionMonitor.updateThresholds(thresholds);

    res.status(200).json({
      success: true,
      data: { message: 'Transaction monitoring thresholds updated successfully' },
    });
    return;

  } catch (error) {
    logger.error('Failed to update transaction thresholds', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: {
        code: 'THRESHOLDS_ERROR',
        message: `Failed to update transaction thresholds: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get current thresholds
app.get('/transaction/thresholds', async (req, res) => {
  try {
    const thresholds = transactionMonitor.getThresholds();

    res.status(200).json({
      success: true,
      data: thresholds,
    });
    return;

  } catch (error) {
    logger.error('Failed to get transaction thresholds', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'THRESHOLDS_ERROR',
        message: `Failed to retrieve transaction thresholds: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Test transaction monitoring
app.post('/transaction/test', async (req, res) => {
  try {
    const testResults = await transactionMonitor.testTransactionMonitoring();

    res.status(200).json({
      success: true,
      data: testResults,
    });
    return;

  } catch (error) {
    logger.error('Failed to test transaction monitoring', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'TEST_ERROR',
        message: `Transaction monitoring test failed: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Get blockchain statistics
app.get('/blockchain/stats', async (req, res) => {
  try {
    const stats = blockchainNodeManager.getBlockchainStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
    return;

  } catch (error) {
    logger.error('Failed to get blockchain statistics', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: `Failed to retrieve blockchain statistics: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Test RPC provider health
app.get('/blockchain/health/:blockchain', async (req, res) => {
  try {
    const { blockchain } = req.params;

    if (!blockchain) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Blockchain is required',
        },
      });
    }

    const health = await blockchainNodeManager.testProviderHealth(blockchain as any);

    res.status(200).json({
      success: true,
      data: health,
    });
    return;

  } catch (error) {
    logger.error('Failed to test provider health', { error, blockchain: req.params.blockchain });
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_ERROR',
        message: `Failed to test provider health: ${(error as Error).message}`,
      },
    });
    return;
  }
});

// Global error handler
app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error, url: req.url, method: req.method });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: `An unexpected error occurred: ${(error as Error).message}`,
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

const PORT = process.env.PORT || 4005;

// Webhook signature verification
const verifyWebhookSignature = async (payload: any, signature: string, provider: string): Promise<boolean> => {
  try {
    // This would implement provider-specific signature verification
    // For now, we'll implement basic HMAC verification for common providers

    switch (provider) {
      case 'sendgrid':
        // SendGrid uses HMAC-SHA256 with the request body and a secret
        const sendgridSecret = process.env.SENDGRID_WEBHOOK_SECRET;
        if (!sendgridSecret) return false;

        const crypto = require('crypto');
        const expectedSignature = crypto
          .createHmac('sha256', sendgridSecret)
          .update(JSON.stringify(payload))
          .digest('hex');

        return signature === expectedSignature;

      case 'ses':
        // AWS SES doesn't typically use webhook signatures for email events
        // Events are verified via SNS message signatures
        return true;

      default:
        // For unknown providers, we'll skip signature verification
        logger.warn(`Unknown provider for signature verification: ${provider}`);
        return true;
    }
  } catch (error: unknown) { // Explicitly type error
    logger.error('Webhook signature verification failed', { error, provider });
    return false;
  }
};

app.listen(PORT, async () => {
  logger.info(`NotificationService running on port ${PORT}`, {
    nodeEnv: process.env.NODE_ENV,
    emailProviders: emailService['providerManager'].getProviders().map(p => p.name),
    smsProviders: smsService['providerManager'].getProviders().map(p => p.name),
  });

  // Initialize bot service asynchronously after server starts
  try {
    await botService.initialize();
    const botMetrics = botService.getBotMetrics();
    logger.info('Bot service initialized', {
      bots: botMetrics.platformStats,
    });
  } catch (error) {
    logger.error('Failed to initialize bot service', { error });
  }
});

export default app;
