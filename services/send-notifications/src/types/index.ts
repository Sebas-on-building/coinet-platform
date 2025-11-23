/**
 * =========================================
 * NOTIFICATION SYSTEM TYPES
 * =========================================
 * Divine world-class type definitions for notification routing and delivery
 * Comprehensive interfaces for channels, preferences, providers, and delivery
 */

import { z } from 'zod';

// =========================================
// CORE NOTIFICATION TYPES
// =========================================

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

/**
 * Notification channels
 */
export enum NotificationChannel {
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
  WEBHOOK = 'webhook',
  TELEGRAM = 'telegram',
  DISCORD = 'discord',
  SLACK = 'slack',
  IN_APP = 'in_app'
}

/**
 * Notification status
 */
export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

/**
 * Notification event types
 */
export enum NotificationEventType {
  ALERT_TRIGGERED = 'alert_triggered',
  ALERT_RESOLVED = 'alert_resolved',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  SECURITY_ALERT = 'security_alert',
  MARKET_UPDATE = 'market_update',
  PORTFOLIO_CHANGE = 'portfolio_change',
  CUSTOM = 'custom'
}

// =========================================
// ALERT EVENT DEFINITION
// =========================================

/**
 * Alert event that triggers notifications
 */
export interface AlertEvent {
  /** Event ID */
  id: string;

  /** Event type */
  type: NotificationEventType;

  /** Alert rule ID that triggered this */
  alertRuleId: string;

  /** User ID */
  userId: string;

  /** Alert severity */
  severity: NotificationPriority;

  /** Alert title */
  title: string;

  /** Alert message */
  message: string;

  /** Alert data/metadata */
  data: Record<string, any>;

  /** Alert timestamp */
  timestamp: number;

  /** Alert source (exchange, symbol, etc.) */
  source: {
    exchange?: string;
    symbol?: string;
    assetType?: string;
    signalType?: string;
  };

  /** Alert metrics */
  metrics: {
    confidence?: number;
    impact?: number;
    urgency?: number;
  };

  /** Alert tags for categorization */
  tags: string[];

  /** Event TTL (time to live) */
  ttl?: number;

  /** Event priority override */
  priority?: NotificationPriority;
}

/**
 * Batch of alert events
 */
export interface AlertEventBatch {
  /** Batch ID */
  batchId: string;

  /** Events in batch */
  events: AlertEvent[];

  /** Batch timestamp */
  timestamp: number;

  /** Batch priority (highest in batch) */
  priority: NotificationPriority;

  /** Batch processing metadata */
  metadata: {
    source: string;
    totalEvents: number;
    deduplicated: boolean;
  };
}

// =========================================
// USER PREFERENCES
// =========================================

/**
 * User notification preferences for a specific channel
 */
export interface ChannelPreferences {
  /** Channel type */
  channel: NotificationChannel;

  /** Whether channel is enabled */
  enabled: boolean;

  /** Minimum priority to trigger this channel */
  minPriority: NotificationPriority;

  /** Quiet hours configuration */
  quietHours?: {
    enabled: boolean;
    timezone: string;
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
    daysOfWeek: number[]; // 0-6, 0 = Sunday
  };

  /** Rate limiting preferences */
  rateLimit?: {
    maxPerHour: number;
    maxPerDay: number;
    burstLimit: number;
  };

  /** Content preferences */
  content?: {
    includeMetrics: boolean;
    includeSource: boolean;
    maxLength: number;
    format: 'text' | 'markdown' | 'html';
  };

  /** Provider-specific settings */
  providerSettings: Record<string, any>;
}

/**
 * Complete user notification preferences
 */
export interface UserNotificationPreferences {
  /** User ID */
  userId: string;

  /** Global preferences */
  global: {
    /** Default timezone */
    timezone: string;

    /** Emergency contact override */
    emergencyContact?: string;

    /** Do not disturb mode */
    doNotDisturb?: {
      enabled: boolean;
      until?: number; // timestamp
    };
  };

  /** Channel-specific preferences */
  channels: ChannelPreferences[];

  /** Event type filters */
  eventFilters: {
    /** Enabled event types */
    enabledTypes: NotificationEventType[];

    /** Disabled event types */
    disabledTypes: NotificationEventType[];

    /** Custom filters by severity */
    severityFilters: Record<NotificationPriority, boolean>;
  };

  /** Preferences last updated */
  updatedAt: number;
}

// =========================================
// NOTIFICATION PROVIDERS
// =========================================

/**
 * Base provider configuration
 */
export interface ProviderConfig {
  /** Provider name */
  name: string;

  /** Provider type */
  type: NotificationChannel;

  /** Provider credentials/API keys */
  credentials: Record<string, string>;

  /** Provider settings */
  settings: Record<string, any>;

  /** Provider rate limits */
  rateLimits: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
    burstLimit: number;
  };

  /** Provider retry configuration */
  retryConfig: {
    maxRetries: number;
    baseDelay: number; // milliseconds
    maxDelay: number; // milliseconds
    backoffMultiplier: number;
  };

  /** Provider health status */
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastChecked: number;
    errorRate: number;
    averageResponseTime: number;
  };
}

/**
 * Provider response
 */
export interface ProviderResponse {
  /** Provider name */
  provider: string;

  /** Response status */
  status: 'success' | 'error' | 'rate_limited' | 'timeout';

  /** Response message */
  message: string;

  /** Provider-specific response data */
  data?: Record<string, any>;

  /** Response timestamp */
  timestamp: number;

  /** Response time in milliseconds */
  responseTime: number;

  /** Retry count for this request */
  retryCount: number;
}

// =========================================
// NOTIFICATION MESSAGE
// =========================================

/**
 * Notification message content
 */
export interface NotificationMessage {
  /** Message ID */
  id: string;

  /** Event that triggered this notification */
  eventId: string;

  /** User ID */
  userId: string;

  /** Channel */
  channel: NotificationChannel;

  /** Priority */
  priority: NotificationPriority;

  /** Subject/title */
  subject: string;

  /** Message body */
  body: string;

  /** Message format */
  format: 'text' | 'markdown' | 'html' | 'json';

  /** Message metadata */
  metadata: {
    alertRuleId?: string;
    exchange?: string;
    symbol?: string;
    assetType?: string;
    signalType?: string;
    confidence?: number;
    impact?: number;
    urgency?: number;
    tags?: string[];
    userEmail?: string;
    userPhone?: string;
    phone?: string;
    webhookUrl?: string;
    webhookType?: string;
  };

  /** Message actions (buttons, links, etc.) */
  actions?: Array<{
    label: string;
    url?: string;
    action?: string;
    style?: 'primary' | 'secondary' | 'destructive';
  }>;

  /** Message attachments */
  attachments?: Array<{
    type: 'image' | 'file' | 'chart';
    url: string;
    filename?: string;
    size?: number;
  }>;

  /** Message expiry */
  expiresAt?: number;

  /** Message template used */
  template?: string;

  /** Message personalization data */
  personalization?: Record<string, any>;
}

/**
 * Notification delivery result
 */
export interface NotificationDelivery {
  /** Delivery ID */
  id: string;

  /** Message ID */
  messageId: string;

  /** Event ID */
  eventId: string;

  /** User ID */
  userId: string;

  /** Channel */
  channel: NotificationChannel;

  /** Provider used */
  provider: string;

  /** Delivery status */
  status: NotificationStatus;

  /** Delivery timestamp */
  deliveredAt?: number;

  /** Response from provider */
  providerResponse?: ProviderResponse;

  /** Retry attempts made */
  retryAttempts: number;

  /** Total processing time */
  processingTime: number;

  /** Error details (if failed) */
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };

  /** Rate limiting info */
  rateLimit?: {
    hitLimit: boolean;
    remaining: number;
    resetTime: number;
  };
}

// =========================================
// RATE LIMITING
// =========================================

/**
 * Rate limiting configuration
 */
export interface RateLimitingConfig {
  /** Global rate limits */
  global: {
    maxRequestsPerSecond: number;
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
  };

  /** Per-user rate limits */
  perUser: {
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
    burstLimit: number;
  };

  /** Per-channel rate limits */
  perChannel: Record<NotificationChannel, {
    maxRequestsPerSecond: number;
    maxRequestsPerMinute: number;
    burstLimit: number;
  }>;

  /** Per-provider rate limits */
  perProvider: Record<string, {
    maxRequestsPerSecond: number;
    maxRequestsPerMinute: number;
    burstLimit: number;
  }>;

  /** Adaptive rate limiting */
  adaptive: {
    enabled: boolean;
    adjustmentFactor: number;
    cooldownPeriod: number;
    maxAdjustment: number;
  };
}

/**
 * Rate limiting result
 */
export interface RateLimitingResult {
  /** Whether request is allowed */
  allowed: boolean;

  /** Remaining requests in current window */
  remaining: number;

  /** When the limit resets */
  resetTime: number;

  /** Rate limit hit reason */
  reason?: string;

  /** Suggested delay before retry */
  retryAfter?: number;
}

// =========================================
// ROUTING DECISIONS
// =========================================

/**
 * Routing decision for a notification
 */
export interface RoutingDecision {
  /** Event ID */
  eventId: string;

  /** User ID */
  userId: string;

  /** Channels selected for delivery */
  selectedChannels: Array<{
    channel: NotificationChannel;
    priority: NotificationPriority;
    reason: string;
    estimatedDeliveryTime: number;
  }>;

  /** Channels filtered out */
  filteredChannels: Array<{
    channel: NotificationChannel;
    reason: string;
  }>;

  /** Routing timestamp */
  routedAt: number;

  /** Routing processing time */
  processingTime: number;

  /** User preferences used */
  preferencesSnapshot: Partial<UserNotificationPreferences>;

  /** Routing rules applied */
  rulesApplied: string[];
}

// =========================================
// NOTIFICATION LOGS
// =========================================

/**
 * Notification log entry
 */
export interface NotificationLogEntry {
  /** Log entry ID */
  id: string;

  /** Event that triggered notification */
  eventId: string;

  /** Alert rule ID */
  alertRuleId: string;

  /** User ID */
  userId: string;

  /** Notification message */
  message: NotificationMessage;

  /** Routing decision */
  routingDecision: RoutingDecision;

  /** Delivery results */
  deliveries: NotificationDelivery[];

  /** Overall status */
  status: NotificationStatus;

  /** Processing start time */
  startedAt: number;

  /** Processing end time */
  completedAt?: number;

  /** Total processing time */
  totalTime: number;

  /** Error summary (if any) */
  errorSummary?: {
    totalFailures: number;
    errorCodes: Record<string, number>;
    lastError: string | undefined;
  };

  /** Performance metrics */
  metrics: {
    routingTime: number;
    deliveryTime: number;
    totalTime: number;
    retryCount: number;
    cacheHits: number;
  };

  /** Log metadata */
  metadata: {
    source: string;
    version: string;
    environment: string;
  };
}

// =========================================
// PROVIDER INTERFACES
// =========================================

/**
 * Base notification provider interface
 */
export interface INotificationProvider {
  /** Provider name */
  readonly name: string;

  /** Provider type */
  readonly type: NotificationChannel;

  /** Initialize provider */
  initialize(): Promise<void>;

  /** Send notification */
  send(message: NotificationMessage): Promise<ProviderResponse>;

  /** Check provider health */
  healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    errorRate: number;
  }>;

  /** Get provider configuration */
  getConfig(): ProviderConfig;

  /** Update provider configuration */
  updateConfig(config: Partial<ProviderConfig>): Promise<void>;
}

/**
 * Email provider interface
 */
export interface IEmailProvider extends INotificationProvider {
  /** Send email with attachments */
  sendEmail(message: NotificationMessage, attachments?: Buffer[]): Promise<ProviderResponse>;
}

/**
 * SMS provider interface */
export interface ISMSSProvider extends INotificationProvider {
  /** Send SMS */
  sendSMS(phoneNumber: string, message: string): Promise<ProviderResponse>;
}

/**
 * Push notification provider interface */
export interface IPushProvider extends INotificationProvider {
  /** Send push notification to device */
  sendPush(deviceToken: string, message: NotificationMessage): Promise<ProviderResponse>;
}

/**
 * Webhook provider interface */
export interface IWebhookProvider extends INotificationProvider {
  /** Send webhook */
  sendWebhook(url: string, payload: any): Promise<ProviderResponse>;
}

/**
 * Bot provider interface (Telegram, Discord, Slack) */
export interface IBotProvider extends INotificationProvider {
  /** Send message to chat/channel */
  sendMessage(chatId: string, message: NotificationMessage): Promise<ProviderResponse>;
}

// =========================================
// STORAGE INTERFACES
// =========================================

/**
 * User preferences storage interface
 */
export interface IUserPreferencesStorage {
  /** Get user preferences */
  getUserPreferences(userId: string): Promise<UserNotificationPreferences | null>;

  /** Update user preferences */
  updateUserPreferences(preferences: UserNotificationPreferences): Promise<void>;

  /** Get preferences for multiple users */
  getBulkUserPreferences(userIds: string[]): Promise<Map<string, UserNotificationPreferences>>;

  /** Check if user has preferences */
  hasUserPreferences(userId: string): Promise<boolean>;
}

/**
 * Notification logs storage interface
 */
export interface INotificationLogsStorage {
  /** Log notification delivery */
  logDelivery(logEntry: NotificationLogEntry): Promise<void>;

  /** Get notification logs for user */
  getUserLogs(userId: string, options?: {
    limit?: number;
    offset?: number;
    startDate?: number;
    endDate?: number;
    status?: NotificationStatus;
  }): Promise<NotificationLogEntry[]>;

  /** Get notification logs for event */
  getEventLogs(eventId: string): Promise<NotificationLogEntry[]>;

  /** Get delivery statistics */
  getDeliveryStats(options?: {
    userId?: string;
    channel?: NotificationChannel;
    startDate?: number;
    endDate?: number;
  }): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    averageDeliveryTime: number;
    successRate: number;
    channelBreakdown: Record<NotificationChannel, number>;
  }>;

  /** Clean up old logs */
  cleanupLogs(olderThan: number): Promise<number>;
}

// =========================================
// RATE LIMITING INTERFACES
// =========================================

/**
 * Rate limiter interface
 */
export interface IRateLimiter {
  /** Check if request is allowed */
  checkLimit(key: string, limit: number, windowMs: number): Promise<RateLimitingResult>;

  /** Increment counter for key */
  increment(key: string, windowMs: number): Promise<void>;

  /** Get current count for key */
  getCount(key: string, windowMs: number): Promise<number>;

  /** Reset counter for key */
  reset(key: string): Promise<void>;

  /** Get rate limiting statistics */
  getStats(): {
    totalRequests: number;
    blockedRequests: number;
    averageResponseTime: number;
  };
}

// =========================================
// CACHE INTERFACES
// =========================================

/**
 * Notification cache interface
 */
export interface INotificationCache {
  /** Cache user preferences */
  setUserPreferences(userId: string, preferences: UserNotificationPreferences, ttl: number): void;

  /** Get cached user preferences */
  getUserPreferences(userId: string): UserNotificationPreferences | undefined;

  /** Cache provider health status */
  setProviderHealth(provider: string, health: any, ttl: number): void;

  /** Get cached provider health */
  getProviderHealth(provider: string): any;

  /** Cache rate limiting state */
  setRateLimitState(key: string, state: any, ttl: number): void;

  /** Get cached rate limiting state */
  getRateLimitState(key: string): any;

  /** Invalidate cache for user */
  invalidateUser(userId: string): void;

  /** Invalidate cache for provider */
  invalidateProvider(provider: string): void;

  /** Get cache statistics */
  getStats(): {
    hits: number;
    misses: number;
    hitRatio: number;
    size: number;
  };
}

// =========================================
// CONFIGURATION
// =========================================

/**
 * Service configuration
 */

// =========================================
// ZOD SCHEMAS
// =========================================

export const NotificationPrioritySchema = z.nativeEnum(NotificationPriority);
export const NotificationChannelSchema = z.nativeEnum(NotificationChannel);
export const NotificationStatusSchema = z.nativeEnum(NotificationStatus);
export const NotificationEventTypeSchema = z.nativeEnum(NotificationEventType);

// Export type inference
export const SendNotificationsConfigSchema = z.object({
  port: z.number(),
  host: z.string(),
  environment: z.enum(['development', 'staging', 'production']),
  redis: z.object({
    host: z.string(),
    port: z.number(),
    password: z.string().optional(),
    db: z.number(),
  }),
  database: z.object({
    url: z.string(),
    type: z.enum(['mongodb', 'postgresql', 'redis']),
  }),
  providers: z.object({
    email: z.any().optional(),
    sms: z.any().optional(),
    push: z.any().optional(),
    webhook: z.any().optional(),
    telegram: z.any().optional(),
    discord: z.any().optional(),
    slack: z.any().optional(),
  }),
  rateLimiting: z.any(),
  retry: z.object({
    maxRetries: z.number(),
    baseDelay: z.number(),
    maxDelay: z.number(),
    backoffMultiplier: z.number(),
    jitter: z.boolean(),
  }),
  batch: z.object({
    maxSize: z.number(),
    maxWaitTime: z.number(),
    processingConcurrency: z.number(),
  }),
  performance: z.object({
    maxProcessingTime: z.number(),
    cacheTTL: z.number(),
    healthCheckInterval: z.number(),
  }),
  observability: z.object({
    metrics: z.object({
      enabled: z.boolean(),
      port: z.number(),
      path: z.string(),
    }),
    logging: z.object({
      level: z.string(),
      structured: z.boolean(),
      retentionDays: z.number(),
    }),
  }),
});

export type SendNotificationsConfig = z.infer<typeof SendNotificationsConfigSchema>;
