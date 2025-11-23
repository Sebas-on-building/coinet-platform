// Email Service Core Types
export interface EmailProvider {
  name: string;
  type: 'ses' | 'sendgrid' | 'smtp' | 'mailgun';
  config: EmailProviderConfig;
  priority: number; // Lower number = higher priority for fallback
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  } | undefined;
  healthCheck(): Promise<boolean>;
  sendEmail(emailData: EmailData): Promise<EmailResult>;
  getHealthInfo(): { status: boolean; lastCheck: Date; name: string; type: string };
}

export interface EmailProviderConfig {
  name?: string;
  type?: 'ses' | 'sendgrid' | 'smtp' | 'mailgun';
  priority?: number;
  rateLimit?: { maxRequests: number; windowMs: number };
  region?: string;
  apiKey?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

export interface EmailData {
  to: string[];
  cc: string[] | undefined;
  bcc: string[] | undefined;
  from: string;
  subject: string;
  html: string | undefined;
  text: string | undefined;
  attachments: EmailAttachment[] | undefined;
  headers: Record<string, string> | undefined;
  tags: Record<string, string> | undefined;
  metadata: Record<string, any> | undefined;
  templateId: string | undefined;
  templateData: Record<string, any> | undefined;
  priority: 'low' | 'normal' | 'high' | 'critical' | 'medium';
  campaignId: string | undefined;
  batchId: string | undefined;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: string;
  cid?: string; // Content-ID for inline images
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: EmailError;
  metadata: Record<string, any> | undefined;
  timestamp: Date;
}

export interface EmailError {
  code: string;
  message: string;
  provider: string;
  retryable: boolean;
}

// Template System Types
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: TemplateVariable[];
  locale: string;
  category: string;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags?: string[];
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

// Campaign & Batch Types
export interface EmailCampaign {
  id: string;
  name: string;
  description?: string;
  templateId: string;
  recipientList: string[];
  schedule?: CampaignSchedule;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'critical' | 'medium';
  segmentation?: SegmentationRule;
  throttling?: ThrottlingConfig;
  tracking?: TrackingConfig;
  compliance?: ComplianceConfig;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  stats?: CampaignStats;
}

export interface CampaignSchedule {
  startDate: Date;
  endDate?: Date;
  timezone: string;
  recurring?: {
    pattern: 'daily' | 'weekly' | 'monthly';
    interval: number; // e.g., every 2 weeks
    daysOfWeek?: number[]; // 0-6, Sunday = 0
    dayOfMonth?: number; // 1-31
  };
}

export interface SegmentationRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'gt' | 'lt' | 'gte' | 'lte';
  value: any;
  logic?: 'AND' | 'OR';
  rules?: SegmentationRule[]; // For nested rules
}

export interface ThrottlingConfig {
  rate: number; // emails per minute
  burst: number; // burst capacity
  window: number; // time window in seconds
}

export interface TrackingConfig {
  trackOpens: boolean;
  trackClicks: boolean;
  trackBounces: boolean;
  trackComplaints: boolean;
  trackUnsubscribes: boolean;
  customTracking?: Record<string, boolean>;
}

export interface ComplianceConfig {
  canSpam: boolean;
  gdpr: boolean;
  unsubscribeRequired: boolean;
  physicalAddress?: string;
  permissionReminder?: string;
}

// Batch Processing Types
export interface EmailBatch {
  id: string;
  campaignId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalEmails: number;
  processedEmails: number;
  successfulEmails: number;
  failedEmails: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface BatchConfig {
  size: number; // emails per batch
  delay: number; // delay between batches in ms
  maxConcurrency: number;
  retryAttempts: number;
  retryDelay: number; // delay between retries in ms
}

// Metrics & Analytics Types
export interface EmailMetrics {
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalComplained: number;
  totalOpened: number;
  totalClicked: number;
  totalUnsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  complaintRate: number;
  unsubscribeRate: number;
  period: {
    start: Date;
    end: Date;
  };
  byProvider: Record<string, ProviderMetrics>;
  byCampaign: Record<string, CampaignMetrics>;
}

export interface ProviderMetrics {
  sent: number;
  delivered: number;
  bounced: number;
  complained: number;
  reputation: number; // 0-100 score
}

export interface CampaignMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  conversionRate: number;
}

// Suppression & Opt-out Types
export interface SuppressionList {
  id: string;
  name: string;
  type: 'bounce' | 'complaint' | 'unsubscribe' | 'manual';
  emails: string[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | undefined;
  source: string | undefined;
  reason: string | undefined;
}

export interface UnsubscribeRequest {
  email: string;
  campaignId: string | undefined;
  reason: string | undefined;
  timestamp: Date;
  ipAddress: string | undefined;
  userAgent: string | undefined;
}

// Event Types
export interface EmailEvent {
  id: string;
  type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed';
  email: string;
  campaignId?: string;
  templateId?: string;
  provider: string;
  messageId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  url?: string; // For click events
  userAgent?: string;
  ipAddress?: string;
}

export interface SmsEvent {
  id: string;
  type: 'sent' | 'delivered' | 'failed' | 'undelivered' | 'bounced' | 'opted-out';
  smsId: string;
  messageId: string;
  provider: string;
  destination: string;
  timestamp: Date;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  webhookData?: Record<string, any>;
}

export interface EventWebhook {
  provider: string;
  events: EmailEvent[];
  timestamp: Date;
  signature?: string;
}

// SMS Service Types
export interface SmsProvider {
  name: string;
  type: 'twilio' | 'nexmo' | 'aws-sns';
  config: SmsProviderConfig;
  priority: number;
  rateLimit: { maxRequests: number; windowMs: number } | undefined;
  healthCheck(): Promise<boolean>;
  sendSms(smsData: SmsData): Promise<SmsResult>;
  getHealthInfo(): { status: boolean; lastCheck: Date; name: string; type: string };
}

export interface SmsProviderConfig {
  name?: string;
  type?: 'twilio' | 'nexmo' | 'aws-sns';
  priority?: number;
  rateLimit?: { maxRequests: number; windowMs: number };
  accountSid?: string;
  authToken?: string;
  apiKey?: string;
  apiSecret?: string;
  fromNumber?: string;
  region?: string;
}

export interface SmsData {
  to: string;
  from?: string; // Made optional
  body: string;
  priority: 'low' | 'normal' | 'high' | 'critical' | 'medium';
  campaignId?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  metadata?: Record<string, any>;
  maxLength?: number;
  scheduledAt?: Date;
}

export interface SmsResult {
  success: boolean;
  messageId?: string; // Make optional
  provider: string;
  error?: SmsError;
  metadata?: Record<string, any>; // Make optional
  timestamp: Date;
  status?: SmsStatus;
}

export interface SmsError {
  code: string;
  message: string;
  provider: string;
  retryable: boolean;
}

export interface SmsStatus {
  id: string;
  messageId?: string; // Make optional
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  timestamp: Date;
  errorCode?: string; // Make optional
  errorMessage?: string; // Make optional
  provider: string;
}

export interface SmsTemplate {
  id: string;
  name: string;
  body: string;
  variables: SmsTemplateVariable[];
  locale: string;
  category: string;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  maxLength?: number; // Ensure maxLength is optional
  tags?: string[];
}

export interface SmsTemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  required: boolean;
  description?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

export interface SmsRateLimit {
  destination: string;
  provider: string;
  count: number;
  windowStart: Date;
  windowMs: number;
}

export interface SmsUserPreference {
  userId: string;
  phoneNumber?: string;
  smsEnabled: boolean;
  promotionalSms: boolean;
  transactionalSms: boolean;
  preferredProviders: string[];
  rateLimitOverrides?: {
    maxPerHour?: number;
    maxPerDay?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SmsFallbackConfig {
  enabled: boolean;
  channels: ('push' | 'email')[];
  conditions: {
    maxRetries?: number;
    timeoutMs?: number;
    errorCodes?: string[];
  };
}

export interface SmsCampaign {
  id: string;
  name: string;
  description?: string;
  templateId: string;
  recipientList: string[];
  scheduledAt?: Date;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'critical' | 'medium';
  type: 'promotional' | 'transactional';
  fallbackConfig?: SmsFallbackConfig;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SmsMetrics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  averageDeliveryTime: number;
  costEstimate: number;
  providerBreakdown: Record<string, SmsProviderMetrics>;
}

export interface SmsProviderMetrics {
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
  averageDeliveryTime: number;
  cost: number;
}

// Webhook Integration Types
export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  secret: string | undefined; // Make optional
  events: ('email.sent' | 'email.delivered' | 'email.bounced' | 'email.opened' | 'email.clicked' | 'sms.sent' | 'sms.delivered' | 'sms.failed')[];
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  retryPolicy?: WebhookRetryPolicy;
  transformationTemplate?: string;
  headers?: Record<string, string>;
  timeout?: number;
  maxRetries?: number;
}

export interface WebhookRetryPolicy {
  enabled: boolean;
  maxRetries: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors: string[];
  exponentialBackoff: boolean;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  eventType: string;
  payload: Record<string, any>;
  signature: string;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  attempts: number;
  nextRetryAt?: Date; // Make optional
  lastError?: string;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookTransformationTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: Record<string, any>;
  outputFormat: 'json' | 'xml' | 'form-data';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface WebhookEvent {
  id: string;
  type: 'email.sent' | 'email.delivered' | 'email.bounced' | 'email.opened' | 'email.clicked' | 'sms.sent' | 'sms.delivered' | 'sms.failed';
  source: 'email' | 'sms';
  sourceId: string; // Email message ID or SMS message ID
  payload: Record<string, any>;
  timestamp: Date;
  metadata?: Record<string, any>; // Make optional
}

export interface WebhookSignature {
  algorithm?: 'hmac-sha256' | 'hmac-sha512'; // Make optional
  header?: string; // Make optional
  secret: string;
}

export interface WebhookMetrics {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageDeliveryTime: number;
  deliveryRate: number;
  retryRate: number;
  endpointPerformance: Record<string, {
    totalAttempts: number;
    successfulAttempts: number;
    averageResponseTime: number;
    errorRate: number;
  }>;
}

export interface SmsServiceConfig {
  providers: SmsProviderConfig[];
  defaultProvider: string;
  fallbackEnabled: boolean;
  maxRetries: number;
  retryDelay: number;
  rateLimiting: {
    enabled: boolean;
    defaultLimits: {
      maxPerMinute: number;
      maxPerHour: number;
      maxPerDay: number;
      maxPerMonth: number;
    };
    providerLimits: {
      maxPerMinute: number;
      maxPerHour: number;
      maxPerDay: number;
      maxPerMonth: number;
    };
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    alertThresholds: {
      failureRate: number;
      deliveryRate: number;
    };
  };
}

// Configuration Types
export interface EmailServiceConfig {
  providers: EmailProviderConfig[];
  defaultProvider: string;
  fallbackEnabled: boolean;
  maxRetries: number;
  retryDelay: number;
  batchConfig: BatchConfig;
  tracking: {
    enabled: boolean;
    domain: string;
    webhookUrl: string;
  };
  compliance: {
    canSpamEnabled: boolean;
    gdprEnabled: boolean;
    defaultUnsubscribeUrl: string;
    physicalAddress: string;
  };
  limits: {
    maxEmailsPerHour: number;
    maxEmailsPerDay: number;
    maxRecipientsPerEmail: number;
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number; // seconds
    alertThresholds: {
      bounceRate: number;
      complaintRate: number;
      deliveryRate: number;
    };
  };
}

// Database Models Types (for MongoDB/Mongoose)
export interface IEmailTemplate extends Omit<EmailTemplate, 'id'> {
  _id: string;
}

export interface IEmailCampaign extends Omit<EmailCampaign, 'id'> {
  _id: string;
}

export interface IEmailBatch extends Omit<EmailBatch, 'id'> {
  _id: string;
}

export interface IEmailEvent extends Omit<EmailEvent, 'id'> {
  _id: string;
}

export interface ISuppressionList extends Omit<SuppressionList, 'id'> {
  _id: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EmailSendRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  from?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  subject?: string;
  html?: string;
  text?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  campaignId?: string;
  schedule?: Date;
  metadata?: Record<string, any>;
}

export interface CampaignCreateRequest {
  name: string;
  description?: string;
  templateId: string;
  recipientList: string[];
  schedule?: CampaignSchedule;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  segmentation?: SegmentationRule;
  throttling?: ThrottlingConfig;
  tracking?: TrackingConfig;
  compliance?: ComplianceConfig;
}

// Stats and Reporting Types
export interface CampaignStats {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalComplained: number;
  totalUnsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  complaintRate: number;
  unsubscribeRate: number;
  averageDeliveryTime: number; // in milliseconds
  lastUpdated: Date;
}

export interface ProviderStats {
  name: string;
  sent: number;
  delivered: number;
  bounced: number;
  complained: number;
  reputation: number;
  averageDeliveryTime: number;
  errorRate: number;
  lastUsed: Date;
  status: 'active' | 'inactive' | 'degraded' | 'failed';
}

// Bot Integration Types
export interface BotProvider {
  name: string;
  type: 'discord' | 'telegram';
  config: BotProviderConfig;
  priority: number;
  rateLimit: { maxRequests: number; windowMs: number } | undefined;
  sendMessage(messageData: BotMessageData): Promise<BotMessageResult>;
  healthCheck(): Promise<boolean>;
  getHealthInfo(): { status: boolean; lastCheck: Date; name: string; type: string };
}

export interface BotProviderConfig {
  name?: string;
  type?: 'discord' | 'telegram';
  priority?: number;
  rateLimit?: { maxRequests: number; windowMs: number };
  token?: string;
  webhookUrl?: string;
  botUsername?: string;
  channelId?: string;
  chatId?: string;
}

export interface BotMessageData {
  content: string;
  platform: 'discord' | 'telegram';
  channelId?: string;
  chatId?: string;
  userId?: string;
  messageType: 'alert' | 'notification' | 'command_response';
  metadata?: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'critical' | 'medium';
  formatting: {
    markdown: boolean;
    embeds?: boolean;
    mentions?: string[];
  };
}

export interface BotMessageResult {
  success: boolean;
  messageId?: string;
  platform: string;
  error?: BotError;
  timestamp: Date;
}

export interface BotError {
  code: string;
  message: string;
  platform: string;
  retryable: boolean;
}

export interface BotSubscription {
  id: string;
  userId: string;
  platform: 'discord' | 'telegram';
  channelId?: string;
  chatId?: string;
  eventTypes: string[];
  filters: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BotCommand {
  name: string;
  description: string;
  usage: string;
  aliases?: string[];
  permissions?: string[];
}

export interface BotInteraction {
  id: string;
  userId: string;
  platform: 'discord' | 'telegram';
  command: string;
  parameters: Record<string, any>;
  response?: string;
  timestamp: Date;
  success: boolean;
}

export interface BotMetrics {
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  averageResponseTime: number;
  commandsExecuted: number;
  subscriptionsActive: number;
  platformStats: Record<string, any>;
}

// User Preferences and Quiet Hours Types
export interface UserPreference {
  id: string;
  userId: string;
  notificationType: 'email' | 'sms' | 'discord' | 'telegram' | 'all';
  channelId?: string; // For Discord/Telegram specific channels
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM format (24-hour)
    endTime: string; // HH:MM format (24-hour)
    timezone: string; // IANA timezone identifier
    daysOfWeek: number[]; // 0-6 (Sunday = 0)
    exceptions: string[]; // Holiday names or special dates
  };
  priorityOverrides: {
    critical: boolean; // Allow critical alerts during quiet hours
    high: boolean; // Allow high priority alerts during quiet hours
    normal: boolean; // Allow normal priority alerts during quiet hours
    low: boolean; // Allow low priority alerts during quiet hours
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationQueue {
  id: string;
  userId: string;
  notificationType: 'email' | 'sms' | 'discord' | 'telegram';
  channelId?: string;
  eventType: string;
  eventData: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'critical' | 'medium';
  scheduledFor: Date; // When to retry delivery
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  status: 'pending' | 'delivered' | 'failed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface HolidayConfig {
  name: string;
  date: string; // YYYY-MM-DD format
  type: 'national' | 'religious' | 'custom';
  country?: string;
  region?: string;
  isActive: boolean;
}

export interface TimezoneConfig {
  identifier: string; // IANA timezone identifier
  displayName: string;
  offset: number; // UTC offset in hours
  isActive: boolean;
}

// Priority-based Routing Types
export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';

export type NotificationChannel = 'email' | 'sms' | 'discord' | 'telegram' | 'push' | 'in_app';

export interface ChannelConfig {
  channel: NotificationChannel;
  enabled: boolean;
  fallbackChannels: NotificationChannel[];
  costWeight: number; // 1-10 scale (1 = cheapest, 10 = most expensive)
  reliabilityWeight: number; // 1-10 scale (1 = least reliable, 10 = most reliable)
  urgencyWeight: number; // 1-10 scale (1 = least urgent, 10 = most urgent)
}

export interface PriorityConfig {
  priority: NotificationPriority;
  channels: ChannelConfig[];
  maxChannels: number;
  requireConfirmation: boolean;
  escalationDelay: number; // milliseconds
  autoEscalate: boolean;
}

export interface NotificationContext {
  userId: string;
  eventType: string;
  priority?: NotificationPriority;
  confidence?: number; // 0-100 confidence score
  marketImpact?: number; // 0-100 market impact score
  estimatedValue?: number; // monetary value of notification
  urgency?: number; // 0-100 urgency score
  category?: string; // notification category (e.g., 'security', 'financial', 'system')
  metadata?: Record<string, any>;
}

export interface RoutingDecision {
  priority: NotificationPriority;
  channels: NotificationChannel[];
  reasoning: string;
  confidence: number;
  shouldEscalate: boolean;
  escalationDelay?: number;
  requireConfirmation: boolean;
}

export interface UserPriorityOverride {
  userId: string;
  eventType?: string;
  category?: string;
  priorityMappings: Record<string, NotificationPriority>;
  channelPreferences: Record<NotificationPriority, NotificationChannel[]>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Alert Grouping Types
export interface AlertGroup {
  id: string;
  groupType: 'price_movement' | 'signal' | 'volume_spike' | 'exchange_issue' | 'general';
  title: string;
  summary: string;
  alerts: GroupedAlert[];
  firstAlertTime: Date;
  lastAlertTime: Date;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'normal';
  confidence: number; // 0-100 confidence that these alerts are related
  status: 'active' | 'completed' | 'expired';
  detailsUrl?: string;
  metadata?: Record<string, any>;
}

export interface GroupedAlert {
  id: string;
  timestamp: Date;
  source: string; // exchange, signal provider, etc.
  eventType: string;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'normal';
  data: Record<string, any>;
  similarityScore: number; // 0-100 how similar to group
  included: boolean; // whether included in final digest
}

export interface GroupingHeuristics {
  timeWindow: number; // milliseconds - how close alerts must be in time
  similarityThreshold: number; // 0-100 - minimum similarity to group
  maxGroupSize: number; // maximum alerts in a group
  groupExpiry: number; // milliseconds - when to close groups
  minAlertsForDigest: number; // minimum alerts needed for digest creation
  deduplicationWindow: number; // milliseconds - prevent duplicate alerts
}

export interface GroupingPerformance {
  totalAlerts: number;
  groupedAlerts: number;
  standaloneAlerts: number;
  averageGroupSize: number;
  groupingAccuracy: number; // 0-100 based on user feedback
  falsePositiveRate: number; // percentage of incorrect groupings
  userFatigueReduction: number; // estimated reduction in notifications sent
  lastUpdated: Date;
}

// Delivery Tracking Types
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'expired' | 'cancelled';

export type DeliveryChannel = 'email' | 'sms' | 'discord' | 'telegram' | 'push' | 'in_app';

export interface DeliveryAttempt {
  id: string;
  notificationId: string;
  channel: DeliveryChannel;
  provider: string;
  timestamp: Date;
  status: DeliveryStatus;
  responseData?: Record<string, any>;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  responseTime?: number;
  cost?: number;
  metadata?: Record<string, any>;
}

export interface NotificationDelivery {
  id: string;
  userId: string;
  eventType: string;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'normal';
  channels: DeliveryChannel[];
  status: 'pending' | 'partial' | 'complete' | 'failed';
  attempts: DeliveryAttempt[];
  firstAttemptAt: Date;
  lastAttemptAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  totalCost: number;
  totalRetries: number;
  escalationLevel: number;
  groupId?: string; // For grouped notifications
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitter: boolean; // Add random jitter to prevent thundering herd
  retryableErrors: string[]; // Error codes that should trigger retries
  escalationThreshold: number; // After N failures, escalate to alternative channels
}

export interface DeliveryAnalytics {
  totalNotifications: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageDeliveryTime: number;
  averageRetries: number;
  channelSuccessRates: Record<DeliveryChannel, number>;
  providerSuccessRates: Record<string, number>;
  costPerNotification: number;
  retrySuccessRate: number;
  escalationRate: number;
  lastUpdated: Date;
}

// WebSocket Price Feed Types
export type ExchangeType = 'binance' | 'coinbase' | 'kraken' | 'bitfinex' | 'bitstamp';

// ============================================================================
// ENHANCED WEBSOCKET PRICE FEED TYPES (5.1)
// ============================================================================

export interface ExchangeConfig {
  name: ExchangeType;
  wsUrl: string;
  backupUrls?: string[];
  heartbeatInterval: number; // milliseconds
  reconnectDelay: number; // milliseconds
  maxReconnectAttempts: number;
  messageBufferSize: number; // messages to buffer during disconnection
  subscriptions: string[]; // symbols or channels to subscribe to
  rateLimit?: {
    requestsPerSecond: number;
    burstLimit: number;
  };
  connectionStrategy?: 'predictive' | 'round_robin' | 'failover';
  compression?: 'none' | 'zlib' | 'snappy';
  securityProtocols?: string[]; // E.g., ['quantum-safe-tls', 's-2-0-s']
}

export interface WebSocketConnection {
  id: string;
  exchange: ExchangeType;
  ws: any; // WebSocket instance
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting' | 'degraded';
  lastHeartbeat: Date | null;
  reconnectAttempts: number;
  messageBuffer: any[];
  subscriptions: Set<string>;
  latency: number; // milliseconds
  totalMessages: number;
  errorCount: number;
  uptime: number; // milliseconds since first connection
  metadata?: Record<string, any>;
  currentUrl: string; // The URL currently connected to
  reconnectionHistory: { timestamp: Date; success: boolean; delay: number }[];
  bufferUsage: number; // 0-100 percentage
  compressionRatio: number; // Ratio of compressed size to original size
  effectiveSendRate: number; // Messages per second after rate limiting
}

export interface PriceData {
  symbol: string;
  exchange: ExchangeType;
  price: number;
  volume: number;
  timestamp: Date;
  bid?: number;
  ask?: number;
  high24h?: number;
  low24h?: number;
  change24h?: number;
  changePercent24h?: number;
}

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  failedConnections: number;
  averageLatency: number;
  totalMessagesProcessed: number;
  messagesPerSecond: number;
  uptimePercentage: number;
  errorRate: number;
  lastUpdated: Date;
  bufferOverflows: number; // New metric
  compressionSavings: number; // New metric (percentage)
  failoverCount: number; // New metric
  predictiveReconnects: number; // New metric
}

// Market Data Pipeline Types
export interface MarketAlert {
  id: string;
  type: 'price_change' | 'volume_spike' | 'price_anomaly' | 'exchange_outage';
  symbol: string;
  exchange: ExchangeType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data: Record<string, any>;
  timestamp: Date;
  confidence: number; // 0-100
  triggers: string[]; // Alert triggers that were activated
}

export interface PriceAnomaly {
  symbol: string;
  exchange: ExchangeType;
  currentPrice: number;
  previousPrice: number;
  priceChange: number;
  priceChangePercent: number;
  anomalyScore: number; // 0-100, higher = more anomalous
  timestamp: Date;
}

export interface VolumeSpike {
  symbol: string;
  exchange: ExchangeType;
  currentVolume: number;
  averageVolume: number;
  volumeMultiplier: number;
  spikeScore: number; // 0-100
  timestamp: Date;
}

export interface MarketDataProcessor {
  processPriceData(data: PriceData): Promise<MarketAlert[]>;
  detectPriceAnomalies(data: PriceData, historicalData: PriceData[]): PriceAnomaly[];
  detectVolumeSpikes(data: PriceData, historicalData: PriceData[]): VolumeSpike[];
}

// Blockchain Node Connection Types
export type BlockchainType = 'ethereum' | 'bsc' | 'polygon' | 'solana' | 'avalanche' | 'arbitrum' | 'optimism';

export interface RPCProvider {
  name: string;
  url: string;
  type: 'http' | 'websocket';
  apiKey?: string;
  rateLimit?: {
    requestsPerSecond: number;
    burstLimit: number;
  };
  priority: number; // 1 = primary, 2 = backup, etc.
  isActive: boolean;
  lastUsed: Date;
  errorCount: number;
  responseTime: number;
}

export interface BlockchainNode {
  id: string;
  blockchain: BlockchainType;
  type: 'full' | 'light' | 'third_party';
  providers: RPCProvider[];
  subscriptions: Set<string>; // Active subscription IDs
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'syncing';
  lastBlock: number;
  lastSyncTime: Date;
  connectionCount: number;
  errorCount: number;
  metadata?: Record<string, any>;
}

export interface TransactionData {
  hash: string;
  blockNumber: number;
  blockHash: string;
  from: string;
  to?: string;
  value: string;
  gasPrice: string;
  gasLimit: string;
  gasUsed?: string;
  status: boolean;
  timestamp: Date;
  logs?: LogData[];
  blockchain: BlockchainType;
}

export interface LogData {
  address: string;
  topics: string[];
  data: string;
  logIndex: number;
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  removed: boolean;
}

export interface BlockData {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: Date;
  transactions: string[];
  gasUsed: string;
  gasLimit: string;
  blockchain: BlockchainType;
  reorganized: boolean; // Flag for chain reorganizations
}

export interface NodeMetrics {
  totalConnections: number;
  activeConnections: number;
  failedConnections: number;
  averageResponseTime: number;
  totalTransactions: number;
  totalBlocks: number;
  totalLogs: number;
  reorgCount: number;
  lastUpdated: Date;
}

export interface SubscriptionConfig {
  type: 'newHeads' | 'logs' | 'newPendingTransactions' | 'syncing';
  filter?: {
    address?: string;
    topics?: string[];
    fromBlock?: string;
    toBlock?: string;
  };
  blockchain: BlockchainType;
}

// Transaction Monitoring Types
export interface TransactionAlert {
  id: string;
  type: 'large_transfer' | 'contract_interaction' | 'failed_transaction' | 'suspicious_address' | 'token_transfer';
  blockchain: string;
  transaction: TransactionData;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  confidence: number;
  triggers: string[];
  timestamp: Date;
}

export interface AddressMonitor {
  address: string;
  blockchain: string;
  type: 'wallet' | 'contract' | 'exchange';
  labels?: string[];
  riskScore?: number; // 0-100
  monitoringEnabled: boolean;
}

export interface TransactionFilter {
  minValue?: string; // Minimum transaction value in wei
  maxValue?: string; // Maximum transaction value in wei
  addresses?: string[]; // Specific addresses to monitor
  contractAddresses?: string[]; // Contract addresses to monitor
  tokenAddresses?: string[]; // Token contract addresses
  excludeAddresses?: string[]; // Addresses to exclude
  includeFailed?: boolean; // Include failed transactions
  includePending?: boolean; // Include pending transactions
}

// Social Media API Types
export type SocialMediaPlatform = 'twitter' | 'reddit' | 'telegram' | 'discord';

export interface SocialMediaMessage {
  id: string;
  platform: SocialMediaPlatform;
  author: string;
  content: string;
  timestamp: Date;
  channel?: string; // For Telegram/Discord channels
  metadata: {
    likes?: number;
    retweets?: number;
    replies?: number;
    views?: number;
    score?: number; // Reddit score
    subreddit?: string; // Reddit subreddit
    hashtags?: string[];
    mentions?: string[];
    urls?: string[];
    sentiment?: number; // -1 to 1 sentiment score
    language?: string;
    location?: string;
  };
  rawData: Record<string, any>; // Original API response
}

export interface SocialMediaConfig {
  platform: SocialMediaPlatform;
  apiKey?: string | undefined;
  apiSecret?: string | undefined;
  accessToken?: string | undefined;
  bearerToken?: string | undefined;
  botToken?: string | undefined; // For Telegram/Discord bots
  rateLimits: {
    requestsPerHour: number;
    requestsPerMinute: number;
    burstLimit: number;
  };
  enabledChannels: string[]; // Specific channels/subreddits to monitor
  keywords: string[]; // Keywords to filter for
  languages: string[];
  sentimentAnalysis: boolean;
  caching: {
    enabled: boolean;
    ttl: number; // Time to live in seconds
    maxSize: number; // Maximum cache size
  };
  deduplication: {
    enabled: boolean;
    window: number; // Time window in seconds
    similarityThreshold: number; // 0-100 similarity threshold
  };
}

export interface SocialMediaMetrics {
  totalMessages: number;
  messagesPerSecond: number;
  platformBreakdown: Record<SocialMediaPlatform, number>;
  cacheHitRate: number;
  duplicatePreventionRate: number;
  averageProcessingTime: number;
  errorRate: number;
  lastUpdated: Date;
}

export interface SocialMediaFilter {
  keywords: string[];
  excludeKeywords: string[];
  minFollowers?: number;
  minEngagement?: number;
  languages: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  platforms: SocialMediaPlatform[];
}

// Sentiment Analysis Types
export interface SentimentResult {
  score: number; // -1 to 1 sentiment score
  magnitude: number; // 0 to 1 emotional intensity
  confidence: number; // 0-100 confidence in analysis
  keywords: string[]; // Key sentiment-bearing words
  entities: string[]; // Detected entities (people, organizations, etc.)
  language: string;
  processingTime: number; // milliseconds
}

export interface SentimentAlert {
  id: string;
  type: 'sentiment_shift' | 'viral_content' | 'crisis_detection' | 'trend_emergence';
  platform: string;
  content: string;
  sentiment: SentimentResult;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  triggers: string[];
}

export interface SentimentMetrics {
  totalAnalyses: number;
  averageSentiment: number;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
  processingTime: number;
  accuracy: number;
  lastUpdated: Date;
}

export interface SentimentConfig {
  model: 'vader' | 'textblob' | 'transformers' | 'custom';
  languages: string[];
  minConfidence: number;
  realtimeAnalysis: boolean;
  batchSize: number;
  cacheResults: boolean;
  cacheTtl: number;
}

// ============================================================================
// DEFI PROTOCOL METRICS TYPES (5.5)
// ============================================================================

export interface DeFiProtocol {
  id: string;
  name: string;
  slug: string;
  chain: string;
  category: string;
  tvlUSD: number;
  volumeUSD: number;
  change1h?: number;
  change24h?: number;
  change7d?: number;
  tokens: DeFiToken[];
  pools?: DeFiPool[];
  governance?: DeFiGovernance;
  audits?: DeFiAudit[];
  risks?: DeFiRisk[];
  lastUpdated: Date;
}

export interface DeFiToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  price: number;
  priceChange24h?: number;
  volume24h?: number;
  marketCap?: number;
}

export interface DeFiPool {
  id: string;
  name: string;
  pair: string;
  tvlUSD: number;
  volume24h: number;
  apy: number;
  fees24h: number;
}

export interface DeFiGovernance {
  proposals: DeFiProposal[];
  totalProposals: number;
  activeProposals: number;
  governanceToken?: string;
  quorum?: number;
  votingPeriod?: number;
}

export interface DeFiProposal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'passed' | 'failed' | 'pending';
  startDate: Date;
  endDate: Date;
  votesFor: number;
  votesAgainst: number;
  quorum: number;
  creator: string;
}

export interface DeFiAudit {
  auditor: string;
  date: Date;
  score: number;
  reportUrl?: string;
  issues: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeFiRisk {
  category: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation?: string;
}

export interface TokenUnlock {
  token: string;
  project: string;
  unlockDate: Date;
  unlockAmount: number;
  unlockValueUSD: number;
  percentageOfSupply: number;
  category: 'team' | 'investor' | 'public' | 'foundation' | 'governance';
  isUpcoming: boolean;
}

export interface YieldOpportunity {
  protocol: string;
  pool: string;
  chain: string;
  apy: number;
  tvlUSD: number;
  risk: 'low' | 'medium' | 'high';
  impermanentLoss: number;
  assets: string[];
  rewards: string[];
}

export interface DeFiMetrics {
  totalTVL: number;
  totalVolume24h: number;
  protocolsCount: number;
  chainsCount: number;
  topProtocols: DeFiProtocol[];
  topYieldOpportunities: YieldOpportunity[];
  upcomingUnlocks: TokenUnlock[];
  riskDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  lastUpdated: Date;
}

export interface DeFiProvider {
  name: string;
  type: 'defillama' | 'thegraph' | 'protocol_api' | 'custom';
  baseUrl: string;
  apiKey?: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  reliability: number; // 0-1 score
  lastHealthCheck?: Date;
  isHealthy: boolean;
}

export interface DeFiMetricsCollectorConfig {
  updateInterval: number; // milliseconds
  cacheTtl: number; // seconds
  maxRetries: number;
  timeout: number;
  batchSize: number;
  providers: DeFiProvider[];
  validation: {
    enableCrossValidation: boolean;
    tolerancePercentage: number;
    requiredProviders: number;
  };
}

export interface DeFiMetricsAlert {
  id: string;
  type: 'tvl_change' | 'volume_spike' | 'new_protocol' | 'governance_event' | 'risk_change' | 'unlock_event';
  protocol: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  data: any;
  timestamp: Date;
  expiresAt?: Date;
  isActive: boolean;
}

