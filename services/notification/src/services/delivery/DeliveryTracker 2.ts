import { Logger } from '@/utils/Logger';

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

export class DeliveryTracker {
  private static instance: DeliveryTracker;
  private logger: Logger;

  // In-memory storage for demo - in production, use database
  private deliveries: Map<string, NotificationDelivery> = new Map();
  private attempts: Map<string, DeliveryAttempt> = new Map();

  // Default retry configuration
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 300000, // 5 minutes
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: [
      'TIMEOUT',
      'RATE_LIMITED',
      'TEMPORARY_FAILURE',
      'NETWORK_ERROR',
      'PROVIDER_ERROR'
    ],
    escalationThreshold: 2 // Escalate after 2 failures on primary channel
  };

  // Channel-specific retry configurations
  private channelRetryConfigs: Map<DeliveryChannel, RetryConfig> = new Map();

  // Analytics tracking
  private analytics: DeliveryAnalytics = {
    totalNotifications: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    averageDeliveryTime: 0,
    averageRetries: 0,
    channelSuccessRates: {} as Record<DeliveryChannel, number>,
    providerSuccessRates: {},
    costPerNotification: 0,
    retrySuccessRate: 0,
    escalationRate: 0,
    lastUpdated: new Date()
  };

  private constructor() {
    this.logger = Logger.getInstance();
    this.initializeChannelConfigs();
  }

  static getInstance(): DeliveryTracker {
    if (!DeliveryTracker.instance) {
      DeliveryTracker.instance = new DeliveryTracker();
    }
    return DeliveryTracker.instance;
  }

  /**
   * Initialize channel-specific retry configurations
   */
  private initializeChannelConfigs(): void {
    // Email - moderate retry, longer delays
    this.channelRetryConfigs.set('email', {
      maxRetries: 3,
      initialDelay: 5000, // 5 seconds
      maxDelay: 600000, // 10 minutes
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: ['BOUNCE', 'COMPLAINT', 'TIMEOUT', 'RATE_LIMITED'],
      escalationThreshold: 2
    });

    // SMS - aggressive retry, shorter delays (expensive channel)
    this.channelRetryConfigs.set('sms', {
      maxRetries: 5,
      initialDelay: 1000, // 1 second
      maxDelay: 60000, // 1 minute
      backoffMultiplier: 1.5,
      jitter: true,
      retryableErrors: ['DELIVERY_FAILED', 'INVALID_NUMBER', 'CARRIER_ERROR', 'TIMEOUT'],
      escalationThreshold: 3
    });

    // Discord/Telegram - moderate retry
    this.channelRetryConfigs.set('discord', {
      maxRetries: 3,
      initialDelay: 2000,
      maxDelay: 300000,
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: ['RATE_LIMITED', 'CHANNEL_ERROR', 'TIMEOUT'],
      escalationThreshold: 2
    });

    this.channelRetryConfigs.set('telegram', {
      maxRetries: 3,
      initialDelay: 2000,
      maxDelay: 300000,
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: ['RATE_LIMITED', 'CHANNEL_ERROR', 'TIMEOUT'],
      escalationThreshold: 2
    });

    // Push - minimal retry (usually instant)
    this.channelRetryConfigs.set('push', {
      maxRetries: 2,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: ['DEVICE_OFFLINE', 'TIMEOUT'],
      escalationThreshold: 1
    });

    this.logger.info('Delivery tracker channel configurations initialized');
  }

  /**
   * Create new delivery tracking record
   */
  async createDelivery(
    notificationId: string,
    userId: string,
    eventType: string,
    priority: 'critical' | 'high' | 'medium' | 'low' | 'normal',
    channels: DeliveryChannel[],
    groupId?: string,
    idempotencyKey?: string
  ): Promise<string> {
    const deliveryId = `delivery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const delivery: NotificationDelivery = {
      id: deliveryId,
      userId,
      eventType,
      priority,
      channels,
      status: 'pending',
      attempts: [],
      firstAttemptAt: new Date(),
      totalCost: 0,
      totalRetries: 0,
      escalationLevel: 0,
      ...(groupId && { groupId }),
      ...(idempotencyKey && { idempotencyKey }),
      metadata: {
        notificationId,
        createdAt: new Date()
      }
    };

    this.deliveries.set(deliveryId, delivery);
    this.analytics.totalNotifications++;

    this.logger.info('Delivery tracking created', {
      deliveryId,
      notificationId,
      userId,
      channels,
      priority
    });

    return deliveryId;
  }

  /**
   * Record delivery attempt
   */
  async recordAttempt(
    deliveryId: string,
    channel: DeliveryChannel,
    provider: string,
    status: DeliveryStatus,
    responseData?: Record<string, any>,
    errorCode?: string,
    errorMessage?: string,
    responseTime?: number,
    cost?: number
  ): Promise<void> {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) {
      this.logger.warn('Attempt recorded for unknown delivery', { deliveryId });
      return;
    }

    const attemptId = `attempt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const attempt: DeliveryAttempt = {
      id: attemptId,
      notificationId: deliveryId,
      channel,
      provider,
      timestamp: new Date(),
      status,
      ...(responseData && { responseData }),
      ...(errorCode && { errorCode }),
      ...(errorMessage && { errorMessage }),
      retryCount: delivery.attempts.length,
      ...(responseTime && { responseTime }),
      ...(cost && { cost }),
      metadata: {
        deliveryId,
        userId: delivery.userId,
        eventType: delivery.eventType
      }
    };

    delivery.attempts.push(attempt);
    delivery.lastAttemptAt = new Date();
    this.attempts.set(attemptId, attempt);

    // Update delivery status based on attempt result
    this.updateDeliveryStatus(delivery);

    // Log attempt details
    this.logger.info('Delivery attempt recorded', {
      attemptId,
      deliveryId,
      channel,
      provider,
      status,
      retryCount: attempt.retryCount,
      errorCode,
      responseTime
    });

    // Schedule retry if needed
    if (this.shouldRetry(attempt, delivery)) {
      await this.scheduleRetry(delivery, attempt);
    }

    // Escalate if needed
    if (this.shouldEscalate(delivery, attempt)) {
      await this.escalateDelivery(delivery);
    }
  }

  /**
   * Update delivery status based on latest attempt
   */
  private updateDeliveryStatus(delivery: NotificationDelivery): void {
    const latestAttempt = delivery.attempts[delivery.attempts.length - 1];

    if (!latestAttempt) return;

    // Check if all channels have completed
    const channelStatuses = new Map<DeliveryChannel, DeliveryStatus>();

    for (const attempt of delivery.attempts) {
      channelStatuses.set(attempt.channel, attempt.status);
    }

    // Determine overall status
    if (channelStatuses.size === 0) {
      delivery.status = 'pending';
    } else if (Array.from(channelStatuses.values()).every(status => status === 'delivered')) {
      delivery.status = 'complete';
      delivery.completedAt = new Date();
      this.analytics.successfulDeliveries++;
    } else if (Array.from(channelStatuses.values()).some(status => status === 'delivered')) {
      delivery.status = 'partial';
    } else if (Array.from(channelStatuses.values()).every(status => ['failed', 'expired'].includes(status))) {
      delivery.status = 'failed';
      delivery.failedAt = new Date();
      this.analytics.failedDeliveries++;
    } else {
      delivery.status = 'pending';
    }

    // Calculate total cost
    delivery.totalCost = delivery.attempts.reduce((sum, attempt) => sum + (attempt.cost || 0), 0);

    // Update analytics
    this.updateAnalytics(delivery, latestAttempt);
  }

  /**
   * Check if delivery should be retried
   */
  private shouldRetry(attempt: DeliveryAttempt, delivery: NotificationDelivery): boolean {
    const channelConfig = this.channelRetryConfigs.get(attempt.channel);
    if (!channelConfig) return false;

    // Check if we've exceeded max retries
    if (attempt.retryCount >= channelConfig.maxRetries) {
      return false;
    }

    // Check if error is retryable
    if (attempt.errorCode && !channelConfig.retryableErrors.includes(attempt.errorCode)) {
      return false;
    }

    // Check delivery status
    if (delivery.status === 'complete') {
      return false;
    }

    return true;
  }

  /**
   * Schedule retry with exponential backoff
   */
  private async scheduleRetry(delivery: NotificationDelivery, lastAttempt: DeliveryAttempt): Promise<void> {
    const channelConfig = this.channelRetryConfigs.get(lastAttempt.channel);
    if (!channelConfig) return;

    const delay = this.calculateRetryDelay(lastAttempt.retryCount, channelConfig);
    const retryTime = new Date(Date.now() + delay);

    // In production, this would be added to a job queue
    setTimeout(async () => {
      await this.executeRetry(delivery.id, lastAttempt.channel);
    }, delay);

    this.logger.info('Retry scheduled', {
      deliveryId: delivery.id,
      channel: lastAttempt.channel,
      retryCount: lastAttempt.retryCount + 1,
      scheduledFor: retryTime,
      delay
    });
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(retryCount: number, config: RetryConfig): number {
    let delay = config.initialDelay * Math.pow(config.backoffMultiplier, retryCount);

    // Cap at max delay
    delay = Math.min(delay, config.maxDelay);

    // Add jitter to prevent thundering herd
    if (config.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }

    return Math.max(delay, config.initialDelay);
  }

  /**
   * Execute retry (placeholder - in production, call actual notification service)
   */
  private async executeRetry(deliveryId: string, channel: DeliveryChannel): Promise<void> {
    this.logger.info('Executing retry', { deliveryId, channel });

    // In production, this would call the appropriate notification service
    // For now, we'll simulate a retry attempt
    await this.recordAttempt(
      deliveryId,
      channel,
      'retry-service',
      'sent', // Simulate success for demo
      { retried: true },
      undefined,
      undefined,
      150
    );
  }

  /**
   * Check if delivery should escalate to alternative channels
   */
  private shouldEscalate(delivery: NotificationDelivery, latestAttempt: DeliveryAttempt): boolean {
    const channelConfig = this.channelRetryConfigs.get(latestAttempt.channel);
    if (!channelConfig) return false;

    // Check if we've reached escalation threshold
    const channelAttempts = delivery.attempts.filter(a => a.channel === latestAttempt.channel);
    if (channelAttempts.length < channelConfig.escalationThreshold) {
      return false;
    }

    // Check if we have alternative channels available
    const availableChannels = delivery.channels.filter(ch =>
      !delivery.attempts.some(a => a.channel === ch && a.status === 'delivered')
    );

    return availableChannels.length > 0;
  }

  /**
   * Escalate delivery to alternative channels
   */
  private async escalateDelivery(delivery: NotificationDelivery): Promise<void> {
    delivery.escalationLevel++;

    // Find channels that haven't been tried successfully yet
    const availableChannels = delivery.channels.filter(channel => {
      const channelAttempts = delivery.attempts.filter(a => a.channel === channel);
      return channelAttempts.length === 0 || !channelAttempts.some(a => a.status === 'delivered');
    });

    if (availableChannels.length === 0) {
      this.logger.warn('No alternative channels available for escalation', { deliveryId: delivery.id });
      return;
    }

    // Escalate to next available channel
    const nextChannel = availableChannels[0];

    if (!nextChannel) {
      this.logger.warn('No available channels for escalation', { deliveryId: delivery.id });
      return;
    }

    this.logger.info('Escalating delivery to alternative channel', {
      deliveryId: delivery.id,
      fromChannel: delivery.attempts[delivery.attempts.length - 1]?.channel,
      toChannel: nextChannel,
      escalationLevel: delivery.escalationLevel
    });

    // In production, this would trigger sending via the alternative channel
    await this.recordAttempt(
      delivery.id,
      nextChannel,
      'escalation-service',
      'sent', // Simulate escalation attempt
      { escalated: true, escalationLevel: delivery.escalationLevel }
    );

    this.analytics.escalationRate = (this.analytics.escalationRate * (this.analytics.totalNotifications - 1) + 1) / this.analytics.totalNotifications;
  }

  /**
   * Check for idempotent operation (prevent duplicates)
   */
  checkIdempotency(idempotencyKey: string): boolean {
    // In production, check against database
    // For demo, we'll use a simple in-memory check
    return false; // Assume not duplicate for demo
  }

  /**
   * Get delivery by ID
   */
  getDelivery(deliveryId: string): NotificationDelivery | undefined {
    return this.deliveries.get(deliveryId);
  }

  /**
   * Get deliveries for user
   */
  getUserDeliveries(userId: string, limit?: number): NotificationDelivery[] {
    const userDeliveries = Array.from(this.deliveries.values())
      .filter(delivery => delivery.userId === userId)
      .sort((a, b) => b.firstAttemptAt.getTime() - a.firstAttemptAt.getTime());

    return limit ? userDeliveries.slice(0, limit) : userDeliveries;
  }

  /**
   * Get delivery attempts for notification
   */
  getDeliveryAttempts(deliveryId: string): DeliveryAttempt[] {
    return Array.from(this.attempts.values())
      .filter(attempt => attempt.notificationId === deliveryId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get delivery analytics
   */
  getAnalytics(): DeliveryAnalytics {
    this.updateAnalyticsSummary();
    return { ...this.analytics };
  }

  /**
   * Update analytics summary
   */
  private updateAnalyticsSummary(): void {
    const deliveries = Array.from(this.deliveries.values());

    if (deliveries.length === 0) return;

    // Calculate average delivery time
    const completedDeliveries = deliveries.filter(d => d.status === 'complete' && d.completedAt);
    if (completedDeliveries.length > 0) {
      const totalTime = completedDeliveries.reduce((sum, d) =>
        sum + (d.completedAt!.getTime() - d.firstAttemptAt.getTime()), 0
      );
      this.analytics.averageDeliveryTime = totalTime / completedDeliveries.length;
    }

    // Calculate average retries
    const deliveriesWithRetries = deliveries.filter(d => d.totalRetries > 0);
    if (deliveriesWithRetries.length > 0) {
      this.analytics.averageRetries = deliveriesWithRetries.reduce((sum, d) => sum + d.totalRetries, 0) / deliveriesWithRetries.length;
    }

    // Calculate channel success rates
    const channelStats = new Map<DeliveryChannel, { success: number, total: number }>();

    for (const attempt of this.attempts.values()) {
      const stats = channelStats.get(attempt.channel) || { success: 0, total: 0 };
      stats.total++;
      if (attempt.status === 'delivered') {
        stats.success++;
      }
      channelStats.set(attempt.channel, stats);
    }

    for (const [channel, stats] of channelStats.entries()) {
      this.analytics.channelSuccessRates[channel] = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;
    }

    // Calculate provider success rates
    const providerStats = new Map<string, { success: number, total: number }>();

    for (const attempt of this.attempts.values()) {
      const stats = providerStats.get(attempt.provider) || { success: 0, total: 0 };
      stats.total++;
      if (attempt.status === 'delivered') {
        stats.success++;
      }
      providerStats.set(attempt.provider, stats);
    }

    for (const [provider, stats] of providerStats.entries()) {
      this.analytics.providerSuccessRates[provider] = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;
    }

    // Calculate cost per notification
    if (deliveries.length > 0) {
      this.analytics.costPerNotification = deliveries.reduce((sum, d) => sum + d.totalCost, 0) / deliveries.length;
    }

    // Calculate retry success rate
    const retriedDeliveries = deliveries.filter(d => d.totalRetries > 0);
    if (retriedDeliveries.length > 0) {
      const successfulRetries = retriedDeliveries.filter(d => d.status === 'complete').length;
      this.analytics.retrySuccessRate = (successfulRetries / retriedDeliveries.length) * 100;
    }

    this.analytics.lastUpdated = new Date();
  }

  /**
   * Update analytics after delivery attempt
   */
  private updateAnalytics(delivery: NotificationDelivery, attempt: DeliveryAttempt): void {
    // Update retry statistics
    if (attempt.retryCount > 0) {
      delivery.totalRetries = attempt.retryCount;
    }

    // Update cost tracking
    if (attempt.cost) {
      delivery.totalCost += attempt.cost;
    }
  }

  /**
   * Get retry configuration for channel
   */
  getRetryConfig(channel: DeliveryChannel): RetryConfig | undefined {
    return this.channelRetryConfigs.get(channel);
  }

  /**
   * Update retry configuration for channel
   */
  updateRetryConfig(channel: DeliveryChannel, config: Partial<RetryConfig>): void {
    const current = this.channelRetryConfigs.get(channel);
    if (current) {
      Object.assign(current, config);
      this.logger.info('Retry configuration updated', { channel, config });
    }
  }

  /**
   * Get delivery statistics by channel
   */
  getChannelStats(): Record<DeliveryChannel, { total: number, successful: number, failed: number, avgResponseTime: number }> {
    const stats: Record<string, { total: number, successful: number, failed: number, avgResponseTime: number }> = {};

    for (const attempt of this.attempts.values()) {
      const channel = attempt.channel;
      if (!stats[channel]) {
        stats[channel] = { total: 0, successful: 0, failed: 0, avgResponseTime: 0 };
      }

      stats[channel].total++;

      if (attempt.status === 'delivered') {
        stats[channel].successful++;
      } else if (attempt.status === 'failed') {
        stats[channel].failed++;
      }

      if (attempt.responseTime) {
        const current = stats[channel].avgResponseTime * (stats[channel].total - 1) + attempt.responseTime;
        stats[channel].avgResponseTime = current / stats[channel].total;
      }
    }

    return stats as Record<DeliveryChannel, { total: number, successful: number, failed: number, avgResponseTime: number }>;
  }

  /**
   * Get delivery statistics by provider
   */
  getProviderStats(): Record<string, { total: number, successful: number, failed: number, avgResponseTime: number }> {
    const stats: Record<string, { total: number, successful: number, failed: number, avgResponseTime: number }> = {};

    for (const attempt of this.attempts.values()) {
      const provider = attempt.provider;
      if (!stats[provider]) {
        stats[provider] = { total: 0, successful: 0, failed: 0, avgResponseTime: 0 };
      }

      stats[provider].total++;

      if (attempt.status === 'delivered') {
        stats[provider].successful++;
      } else if (attempt.status === 'failed') {
        stats[provider].failed++;
      }

      if (attempt.responseTime) {
        const current = stats[provider].avgResponseTime * (stats[provider].total - 1) + attempt.responseTime;
        stats[provider].avgResponseTime = current / stats[provider].total;
      }
    }

    return stats;
  }

  /**
   * Clean up old delivery records
   */
  cleanupOldRecords(daysToKeep: number = 30): number {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    // Clean old deliveries
    for (const [deliveryId, delivery] of this.deliveries.entries()) {
      if (delivery.firstAttemptAt < cutoffDate) {
        this.deliveries.delete(deliveryId);
        cleanedCount++;
      }
    }

    // Clean old attempts
    for (const [attemptId, attempt] of this.attempts.entries()) {
      if (attempt.timestamp < cutoffDate) {
        this.attempts.delete(attemptId);
      }
    }

    if (cleanedCount > 0) {
      this.logger.info(`Cleaned up ${cleanedCount} old delivery records`);
    }

    return cleanedCount;
  }
}
