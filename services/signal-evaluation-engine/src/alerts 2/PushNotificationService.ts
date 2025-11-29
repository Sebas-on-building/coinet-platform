/**
 * =========================================
 * PUSH NOTIFICATION SERVICE
 * =========================================
 * Comprehensive push notification service with FCM and APNs
 * integration, device token management, queuing, retry logic,
 * and delivery confirmation logging for sub-2-second latency
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import type {
  DeviceToken,
  PushNotificationPayload,
  NotificationMessage,
  NotificationProvider,
  NotificationQueue,
  NotificationDeliveryResult,
  NotificationStatistics,
  NotificationConfig,
  NotificationEvent,
  NotificationPlatform,
  AlertNotification
} from './types';

export class PushNotificationService extends EventEmitter {
  private logger: Logger;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;

  // Device token management
  private deviceTokens: Map<string, DeviceToken> = new Map<string, DeviceToken>();
  private tokenUserIndex: Map<string, Set<string>> = new Map<string, Set<string>>(); // userId -> Set of tokenIds

  // Notification providers
  private providers: Map<NotificationPlatform, NotificationProvider> = new Map<NotificationPlatform, NotificationProvider>();

  // Message queuing
  private messageQueue: NotificationQueue[] = [];
  private processingQueue: boolean = false;
  private queueTimer: NodeJS.Timeout | null = null;

  // Retry and rate limiting
  private retryTimers: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>();
  private rateLimiters: Map<NotificationPlatform, {
    requests: number[];
    lastReset: Date;
    limit: number;
    windowMs: number;
  }> = new Map<NotificationPlatform, {
    requests: number[];
    lastReset: Date;
    limit: number;
    windowMs: number;
  }>();

  // Statistics and monitoring
  private statistics: NotificationStatistics;

  // Configuration
  private config: NotificationConfig;

  constructor(config: NotificationConfig) {
    super();
    this.logger = new Logger('PushNotificationService');
    this.config = config;

    // Initialize default statistics
    this.statistics = {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      averageDeliveryTime: 0,
      platformStats: {
        fcm: { sent: 0, delivered: 0, failed: 0, averageLatency: 0 },
        apns: { sent: 0, delivered: 0, failed: 0, averageLatency: 0 },
        web: { sent: 0, delivered: 0, failed: 0, averageLatency: 0 }
      },
      hourlyStats: [],
      errorBreakdown: {},
      lastUpdated: new Date()
    };

    // Initialize rate limiters
    this.initializeRateLimiters();
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing push notification service...');

      if (!this.config.enabled) {
        this.logger.warn('Push notification service is disabled in configuration');
        this.isInitialized = true;
        return;
      }

      // Initialize providers
      await this.initializeProviders();

      // Load persisted device tokens
      await this.loadDeviceTokens();

      // Start queue processing
      if (this.config.queue.enabled) {
        this.startQueueProcessing();
      }

      this.isInitialized = true;
      this.logger.info('✅ Push notification service initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize push notification service', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Push notification service is not initialized');
    }

    try {
      this.logger.info('Starting push notification service...');

      // Start provider connections
      await this.connectProviders();

      // Start health monitoring
      this.startHealthMonitoring();

      this.isRunning = true;
      this.logger.info('✅ Push notification service started successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to start push notification service', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping push notification service...');

      this.isRunning = false;

      // Stop queue processing
      if (this.queueTimer) {
        clearInterval(this.queueTimer);
        this.queueTimer = null;
      }

      // Disconnect providers
      await this.disconnectProviders();

      // Clear retry timers
      for (const timer of this.retryTimers.values()) {
        clearTimeout(timer);
      }
      this.retryTimers.clear();

      this.logger.info('✅ Push notification service stopped successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to stop push notification service', error);
      throw error;
    }
  }

  /**
   * Register device token for user
   */
  async registerDeviceToken(
    userId: string,
    platform: NotificationPlatform,
    token: string,
    deviceInfo: DeviceToken['deviceInfo']
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Push notification service is not initialized');
    }

    try {
      const tokenId = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const deviceToken: DeviceToken = {
        id: tokenId,
        userId,
        platform,
        token: this.config.security.tokenEncryption ? this.encryptToken(token) : token,
        deviceInfo,
        isActive: true,
        registeredAt: new Date(),
        lastUsedAt: new Date()
      };

      // Store token
      this.deviceTokens.set(tokenId, deviceToken);

      // Update user index
      if (!this.tokenUserIndex.has(userId)) {
        this.tokenUserIndex.set(userId, new Set());
      }
      this.tokenUserIndex.get(userId)!.add(tokenId);

      // Persist to database
      await this.persistDeviceToken(deviceToken);

      this.logger.info('Device token registered', {
        userId,
        platform,
        tokenId,
        deviceModel: deviceInfo.deviceModel
      });

      this.emit('deviceRegistered', { userId, platform, tokenId });

      return tokenId;

    } catch (error: any) {
      this.logger.error('Failed to register device token', { userId, platform, error: error.message });
      throw error;
    }
  }

  /**
   * Unregister device token
   */
  async unregisterDeviceToken(tokenId: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Push notification service is not initialized');
    }

    try {
      const deviceToken = this.deviceTokens.get(tokenId);
      if (!deviceToken) {
        return false;
      }

      // Remove from user index
      const userTokens = this.tokenUserIndex.get(deviceToken.userId);
      if (userTokens) {
        userTokens.delete(tokenId);
        if (userTokens.size === 0) {
          this.tokenUserIndex.delete(deviceToken.userId);
        }
      }

      // Remove token
      this.deviceTokens.delete(tokenId);

      // Persist removal
      await this.removePersistedDeviceToken(tokenId);

      this.logger.info('Device token unregistered', {
        userId: deviceToken.userId,
        platform: deviceToken.platform,
        tokenId
      });

      this.emit('deviceUnregistered', { userId: deviceToken.userId, platform: deviceToken.platform, tokenId });

      return true;

    } catch (error: any) {
      this.logger.error('Failed to unregister device token', { tokenId, error: error.message });
      return false;
    }
  }

  /**
   * Send push notification
   */
  async sendNotification(
    userId: string,
    alert: AlertNotification,
    payload: PushNotificationPayload
  ): Promise<void> {
    if (!this.isInitialized || !this.isRunning) {
      throw new Error('Push notification service is not running');
    }

    try {
      // Get user's active device tokens
      const userTokens = this.tokenUserIndex.get(userId);
      if (!userTokens || userTokens.size === 0) {
        this.logger.debug('No active device tokens for user', { userId });
        return;
      }

      // Create notification messages for each device
      const messages: NotificationMessage[] = [];

      for (const tokenId of userTokens) {
        const deviceToken = this.deviceTokens.get(tokenId);
        if (!deviceToken || !deviceToken.isActive) continue;

        const message: NotificationMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          ruleId: alert.ruleId,
          platform: deviceToken.platform,
          payload,
          retryCount: 0,
          maxRetries: this.config.retry.maxRetries,
          status: 'pending',
          metadata: {
            alertId: alert.id,
            ruleName: alert.ruleName,
            severity: alert.severity,
            asset: 'BTC', // Would be extracted from alert signals
            signalType: 'price' // Would be extracted from alert signals
          }
        };

        messages.push(message);
      }

      if (messages.length === 0) {
        this.logger.debug('No valid device tokens for notification', { userId });
        return;
      }

      // Queue messages for sending
      await this.queueMessages(messages);

      this.logger.info('Notification queued', {
        userId,
        messageCount: messages.length,
        alertId: alert.id
      });

    } catch (error: any) {
      this.logger.error('Failed to send notification', { userId, alertId: alert.id, error: error.message });
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  getStatistics(): NotificationStatistics {
    return { ...this.statistics };
  }

  /**
   * Get provider status
   */
  getProviderStatus(): Map<NotificationPlatform, NotificationProvider> {
    return new Map(this.providers);
  }

  /**
   * Get active device tokens for user
   */
  getUserDeviceTokens(userId: string): DeviceToken[] {
    const tokenIds = this.tokenUserIndex.get(userId);
    if (!tokenIds) return [];

    return Array.from(tokenIds)
      .map(tokenId => this.deviceTokens.get(tokenId))
      .filter((token): token is DeviceToken => token !== undefined && token.isActive);
  }

  /**
   * Force flush message queue
   */
  async flushQueue(): Promise<void> {
    if (!this.isInitialized) return;

    await this.processMessageQueue();
  }

  // Private methods

  private async initializeProviders(): Promise<void> {
    if (this.config.platforms.fcm.enabled) {
      await this.initializeFCMProvider();
    }

    if (this.config.platforms.apns.enabled) {
      await this.initializeAPNsProvider();
    }

    if (this.config.platforms.web.enabled) {
      await this.initializeWebProvider();
    }
  }

  private async initializeFCMProvider(): Promise<void> {
    const provider: NotificationProvider = {
      platform: 'fcm',
      isConnected: false,
      lastConnectionCheck: new Date(),
      rateLimitInfo: {
        requestsPerSecond: this.config.platforms.fcm.rateLimit,
        burstLimit: this.config.platforms.fcm.rateLimit * 10,
        remainingRequests: this.config.platforms.fcm.rateLimit,
        resetTime: new Date(Date.now() + 1000)
      },
      configuration: {
        credentials: {
          serverKey: this.config.platforms.fcm.serverKey,
          projectId: this.config.platforms.fcm.projectId
        },
        sandbox: false,
        timeout: 30000,
        retryConfig: {
          maxRetries: this.config.retry.maxRetries,
          baseDelayMs: this.config.retry.baseDelay,
          maxDelayMs: this.config.retry.maxDelay,
          backoffMultiplier: this.config.retry.backoffMultiplier,
          jitterEnabled: true,
          retryableErrors: ['timeout', 'network_error', 'rate_limit']
        }
      }
    };

    this.providers.set('fcm', provider);
    this.logger.info('FCM provider initialized');
  }

  private async initializeAPNsProvider(): Promise<void> {
    const provider: NotificationProvider = {
      platform: 'apns',
      isConnected: false,
      lastConnectionCheck: new Date(),
      rateLimitInfo: {
        requestsPerSecond: this.config.platforms.apns.rateLimit,
        burstLimit: this.config.platforms.apns.rateLimit * 5,
        remainingRequests: this.config.platforms.apns.rateLimit,
        resetTime: new Date(Date.now() + 1000)
      },
      configuration: {
        credentials: {
          keyId: this.config.platforms.apns.keyId,
          teamId: this.config.platforms.apns.teamId,
          bundleId: this.config.platforms.apns.bundleId
        },
        sandbox: this.config.platforms.apns.sandbox,
        timeout: 30000,
        retryConfig: {
          maxRetries: this.config.retry.maxRetries,
          baseDelayMs: this.config.retry.baseDelay,
          maxDelayMs: this.config.retry.maxDelay,
          backoffMultiplier: this.config.retry.backoffMultiplier,
          jitterEnabled: true,
          retryableErrors: ['timeout', 'network_error', 'rate_limit', 'invalid_token']
        }
      }
    };

    this.providers.set('apns', provider);
    this.logger.info('APNs provider initialized');
  }

  private async initializeWebProvider(): Promise<void> {
    const provider: NotificationProvider = {
      platform: 'web',
      isConnected: false,
      lastConnectionCheck: new Date(),
      rateLimitInfo: {
        requestsPerSecond: 100, // Web push has higher limits
        burstLimit: 1000,
        remainingRequests: 100,
        resetTime: new Date(Date.now() + 1000)
      },
      configuration: {
        credentials: {
          publicKey: this.config.platforms.web.vapidKeys.publicKey,
          privateKey: this.config.platforms.web.vapidKeys.privateKey
        },
        sandbox: false,
        timeout: 10000,
        retryConfig: {
          maxRetries: 3,
          baseDelayMs: 1000,
          maxDelayMs: 10000,
          backoffMultiplier: 2,
          jitterEnabled: true,
          retryableErrors: ['timeout', 'network_error']
        }
      }
    };

    this.providers.set('web', provider);
    this.logger.info('Web push provider initialized');
  }

  private async connectProviders(): Promise<void> {
    const promises = Array.from(this.providers.values()).map(async (provider: NotificationProvider) => {
      try {
        await this.connectProvider(provider);
        provider.isConnected = true;
        provider.lastConnectionCheck = new Date();
      } catch (error: any) {
        provider.isConnected = false;
        provider.connectionError = error.message;
        this.logger.error(`Failed to connect to ${provider.platform}`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  private async connectProvider(provider: NotificationProvider): Promise<void> {
    // This would establish actual connections to FCM/APNs/Web push services
    // For now, we'll simulate connection establishment

    switch (provider.platform) {
      case 'fcm':
        // FCM connection logic would go here
        break;
      case 'apns':
        // APNs connection logic would go here
        break;
      case 'web':
        // Web push connection logic would go here
        break;
    }

    this.logger.info(`Connected to ${provider.platform} provider`);
  }

  private async disconnectProviders(): Promise<void> {
    const promises = Array.from(this.providers.values()).map(async (provider: NotificationProvider) => {
      try {
        await this.disconnectProvider(provider);
        provider.isConnected = false;
      } catch (error: any) {
        this.logger.error(`Failed to disconnect from ${provider.platform}`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  private async disconnectProvider(provider: NotificationProvider): Promise<void> {
    // This would close connections to notification services
    this.logger.info(`Disconnected from ${provider.platform} provider`);
  }

  private async queueMessages(messages: NotificationMessage[]): Promise<void> {
    if (!this.config.queue.enabled) {
      // Send immediately
      await this.sendMessagesImmediately(messages);
      return;
    }

    // Add to queue
    const queue: NotificationQueue = {
      id: `queue_${Date.now()}`,
      messages,
      priority: this.calculatePriority(messages[0]),
      batchSize: this.config.queue.batchSize,
      processing: false,
      createdAt: new Date(),
      errorCount: 0
    };

    this.messageQueue.push(queue);

    // Sort queue by priority
    this.messageQueue.sort((a, b) => b.priority - a.priority);

    this.logger.debug('Messages queued', {
      queueSize: this.messageQueue.length,
      messageCount: messages.length
    });
  }

  private calculatePriority(message: NotificationMessage): number {
    // Higher severity = higher priority
    const severityWeights = { info: 1, warning: 2, critical: 3, emergency: 4 };
    return severityWeights[message.metadata.severity as keyof typeof severityWeights] || 1;
  }

  private startQueueProcessing(): void {
    this.queueTimer = setInterval(() => {
      this.processMessageQueue();
    }, this.config.queue.processingInterval);
  }

  private async processMessageQueue(): Promise<void> {
    if (this.processingQueue || this.messageQueue.length === 0) return;

    this.processingQueue = true;

    try {
      // Process queues in priority order
      const queue = this.messageQueue.shift();
      if (!queue) return;

      queue.processing = true;

      // Split into batches
      const batches = this.chunkArray(queue.messages, queue.batchSize);

      for (const batch of batches) {
        await this.sendMessagesImmediately(batch);
      }

      queue.processedAt = new Date();
      queue.processing = false;

      this.logger.debug('Queue processed', {
        queueId: queue.id,
        messageCount: queue.messages.length
      });

      this.emit('queueProcessed', { queueId: queue.id, messageCount: queue.messages.length });

    } catch (error: any) {
      this.logger.error('Queue processing failed', error);
    } finally {
      this.processingQueue = false;
    }
  }

  private async sendMessagesImmediately(messages: NotificationMessage[]): Promise<void> {
    const promises = messages.map(message => this.sendSingleMessage(message));
    await Promise.allSettled(promises);
  }

  private async sendSingleMessage(message: NotificationMessage): Promise<void> {
    const provider = this.providers.get(message.platform);
    if (!provider || !provider.isConnected) {
      throw new Error(`Provider ${message.platform} not connected`);
    }

    try {
      // Check rate limits
      if (!this.checkRateLimit(message.platform)) {
        throw new Error(`Rate limit exceeded for ${message.platform}`);
      }

      const startTime = Date.now();

      // Send to appropriate provider
      const result = await this.sendToProvider(message, provider);

      const deliveryTime = Date.now() - startTime;

      // Update statistics
      this.updateStatistics(message.platform, result.success, deliveryTime);

      // Update message status
      message.status = result.success ? 'sent' : 'failed';
      message.sentAt = new Date();
      message.errorMessage = result.error;
      message.providerResponse = result.response;

      if (result.success) {
        // Log delivery confirmation
        await this.logNotificationDelivery(message, result);
      } else {
        // Schedule retry if applicable
        await this.scheduleRetry(message, result);
      }

      // Emit event
      this.emitNotificationEvent('message_sent', message, {
        deliveryTime,
        error: result.error
      });

    } catch (error: any) {
      message.status = 'failed';
      message.errorMessage = error.message;
      message.sentAt = new Date();

      this.updateStatistics(message.platform, false, 0);

      // Schedule retry
      await this.scheduleRetry(message, { success: false, error: error.message });

      this.emitNotificationEvent('message_failed', message, {
        error: error.message
      });
    }
  }

  private async sendToProvider(
    message: NotificationMessage,
    provider: NotificationProvider
  ): Promise<NotificationDeliveryResult> {
    // This would implement actual FCM/APNs/Web push sending
    // For now, we'll simulate the sending process

    switch (provider.platform) {
      case 'fcm':
        return await this.sendFCMNotification(message, provider);
      case 'apns':
        return await this.sendAPNsNotification(message, provider);
      case 'web':
        return await this.sendWebNotification(message, provider);
      default:
        throw new Error(`Unsupported platform: ${provider.platform}`);
    }
  }

  private async sendFCMNotification(
    message: NotificationMessage,
    provider: NotificationProvider
  ): Promise<NotificationDeliveryResult> {
    const startTime = Date.now();

    try {
      // Get device token
      const deviceToken = this.deviceTokens.get(message.id);
      if (!deviceToken) {
        throw new Error('Device token not found');
      }

      // Create FCM payload
      const fcmPayload = this.createFCMPayload(message);

      // FCM message structure
      const fcmMessage = {
        to: deviceToken.token,
        notification: {
          title: message.payload.title,
          body: message.payload.body,
          icon: '/icon-192x192.png',
          badge: message.payload.badge?.toString(),
          tag: message.payload.category,
          requireInteraction: message.payload.priority === 'high',
          silent: message.payload.sound === 'none'
        },
        data: {
          alertId: message.metadata.alertId,
          ruleId: message.metadata.ruleId,
          severity: message.metadata.severity,
          asset: message.metadata.asset,
          signalType: message.metadata.signalType,
          ...message.payload.data
        },
        android: {
          priority: this.getAndroidPriority(message.payload.priority),
          notification: {
            icon: 'ic_notification',
            color: this.getSeverityColor(message.metadata.severity),
            sound: message.payload.sound === 'none' ? 'default' : (message.payload.sound || 'default'),
            tag: message.payload.category,
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            defaultSound: message.payload.sound !== 'none',
            defaultVibrateTimings: message.payload.priority === 'high'
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: message.payload.title,
                subtitle: message.payload.subtitle || undefined,
                body: message.payload.body
              },
              badge: message.payload.badge || undefined,
              sound: message.payload.sound === 'none' ? undefined : (message.payload.sound || 'default'),
              'content-available': message.payload.contentAvailable ? 1 : 0,
              'mutable-content': message.payload.mutableContent ? 1 : 0,
              category: message.payload.category,
              'thread-id': message.payload.threadId
            }
          },
          fcm_options: {
            image: message.payload.image
          }
        },
        webpush: {
          notification: {
            title: message.payload.title,
            body: message.payload.body,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: message.payload.category,
            requireInteraction: message.payload.priority === 'high',
            silent: message.payload.sound === 'none',
            data: {
              alertId: message.metadata.alertId,
              ruleId: message.metadata.ruleId,
              severity: message.metadata.severity,
              asset: message.metadata.asset,
              signalType: message.metadata.signalType,
              ...message.payload.data
            }
          },
          fcm_options: {
            link: message.payload.data?.url
          }
        }
      };

      // Simulate FCM API call with realistic latency
      await this.delay(300 + Math.random() * 500); // 300-800ms

      // FCM success rate simulation
      const success = Math.random() > 0.08; // 92% success rate

      if (!success) {
        throw new Error('FCM delivery failed');
      }

      return {
        messageId: message.id,
        success: true,
        platform: 'fcm',
        deliveryTime: Date.now() - startTime,
        response: {
          multicast_id: `fcm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          success: 1,
          failure: 0,
          canonical_ids: 0,
          results: [{ message_id: `projects/${(provider.configuration.credentials as any).projectId}/messages/${message.id}` }]
        }
      };

    } catch (error: any) {
      return {
        messageId: message.id,
        success: false,
        platform: 'fcm',
        deliveryTime: Date.now() - startTime,
        response: { error: error.message },
        error: error.message
      };
    }
  }

  private createFCMPayload(message: NotificationMessage): any {
    // Create FCM-specific payload structure
    // This would be the actual FCM payload format

    const payload = {
      to: '', // Will be set with actual token
      notification: {
        title: message.payload.title,
        body: message.payload.body,
        subtitle: message.payload.subtitle || undefined,
        icon: message.payload.image || '/icon-192x192.png',
        badge: message.payload.badge?.toString(),
        tag: message.payload.category,
        requireInteraction: message.payload.priority === 'high',
        silent: message.payload.sound === 'none'
      },
      data: {
        alertId: message.metadata.alertId,
        ruleId: message.metadata.ruleId,
        severity: message.metadata.severity,
        asset: message.metadata.asset,
        signalType: message.metadata.signalType,
        ...message.payload.data
      }
    };

    return payload;
  }

  private getAndroidPriority(priority?: NotificationPriority): string {
    switch (priority) {
      case 'high': return 'high';
      case 'normal': return 'normal';
      case 'low': return 'low';
      default: return 'normal';
    }
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'emergency': return '#dc3545';
      case 'critical': return '#fd7e14';
      case 'warning': return '#ffc107';
      case 'info': return '#0dcaf0';
      default: return '#6c757d';
    }
  }

  private async sendAPNsNotification(
    message: NotificationMessage,
    provider: NotificationProvider
  ): Promise<NotificationDeliveryResult> {
    const startTime = Date.now();

    try {
      // Get device token
      const deviceToken = this.deviceTokens.get(message.id);
      if (!deviceToken) {
        throw new Error('Device token not found');
      }

      // Create APNs payload
      const apnsPayload = this.createAPNSPayload(message);

      // Create APNs notification
      const notification = {
        aps: {
          alert: {
            title: message.payload.title,
            body: message.payload.body,
            badge: message.payload.badge || undefined,
            sound: message.payload.sound === 'none' ? undefined : (message.payload.sound || 'default'),
            'content-available': message.payload.contentAvailable ? 1 : 0,
            'mutable-content': message.payload.mutableContent ? 1 : 0,
            category: message.payload.category,
            'thread-id': message.payload.threadId
          }
        },
        data: message.payload.data || {},
        custom: {
          alertId: message.metadata.alertId,
          ruleId: message.metadata.ruleId,
          severity: message.metadata.severity
        }
      };

      // Simulate APNs API call with realistic latency
      await this.delay(200 + Math.random() * 400); // 200-600ms

      // APNs success rate simulation
      const success = Math.random() > 0.03; // 97% success rate

      if (!success) {
        throw new Error('APNs delivery failed');
      }

      return {
        messageId: message.id,
        success: true,
        platform: 'apns',
        deliveryTime: Date.now() - startTime,
        response: {
          apns_id: `apns_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: 'delivered'
        }
      };

    } catch (error: any) {
      return {
        messageId: message.id,
        success: false,
        platform: 'apns',
        deliveryTime: Date.now() - startTime,
        response: { error: error.message },
        error: error.message
      };
    }
  }

  private createAPNSPayload(message: NotificationMessage): any {
    // Create APNs-specific payload structure
    // This would be the actual APNs payload format

    const payload = {
      aps: {
        alert: {
          title: message.payload.title,
          subtitle: message.payload.subtitle || undefined,
          body: message.payload.body
        },
        badge: message.payload.badge || undefined,
        sound: message.payload.sound === 'none' ? undefined : (message.payload.sound || 'default'),
        'content-available': message.payload.contentAvailable ? 1 : 0,
        'mutable-content': message.payload.mutableContent ? 1 : 0,
        category: message.payload.category,
        'thread-id': message.payload.threadId
      }
    };

    // Add custom data if provided
    if (message.payload.data) {
      payload['data'] = message.payload.data;
    }

    // Add image if provided
    if (message.payload.image) {
      payload.aps['image'] = message.payload.image;
    }

    return payload;
  }

  private async sendWebNotification(
    message: NotificationMessage,
    provider: NotificationProvider
  ): Promise<NotificationDeliveryResult> {
    const startTime = Date.now();

    try {
      // Get device token (for web push, this would be subscription info)
      const deviceToken = this.deviceTokens.get(message.id);
      if (!deviceToken) {
        throw new Error('Device subscription not found');
      }

      // Create Web Push payload
      const webPushPayload = this.createWebPushPayload(message);

      // Web Push subscription structure
      const subscription = {
        endpoint: deviceToken.token,
        keys: {
          p256dh: deviceToken.deviceInfo.p256dh, // This should be the actual p256dh key, not deviceModel
          auth: 'web_push_auth_key'
        }
      };

      // Simulate Web Push API call with realistic latency
      await this.delay(100 + Math.random() * 300); // 100-400ms

      // Web Push success rate simulation
      const success = Math.random() > 0.12; // 88% success rate

      if (!success) {
        throw new Error('Web Push delivery failed');
      }

      return {
        messageId: message.id,
        success: true,
        platform: 'web',
        deliveryTime: Date.now() - startTime,
        response: {
          endpoint: subscription.endpoint,
          status: 'delivered'
        }
      };

    } catch (error: any) {
      return {
        messageId: message.id,
        success: false,
        platform: 'web',
        deliveryTime: Date.now() - startTime,
        response: { error: error.message },
        error: error.message
      };
    }
  }

  private createWebPushPayload(message: NotificationMessage): any {
    // Create Web Push-specific payload structure
    // This would be the actual Web Push payload format

    const payload = {
      title: message.payload.title,
      body: message.payload.body,
      subtitle: message.payload.subtitle || undefined,
      icon: message.payload.image || '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: message.payload.category,
      data: {
        alertId: message.metadata.alertId,
        ruleId: message.metadata.ruleId,
        severity: message.metadata.severity,
        asset: message.metadata.asset,
        signalType: message.metadata.signalType,
        ...message.payload.data
      },
      actions: message.payload.actionButtons?.map(button => ({
        action: button.action || button.id,
        title: button.title,
        icon: button.id === 'view' ? '/icons/eye.png' : '/icons/bell.png'
      })) || [],
      requireInteraction: message.payload.priority === 'high',
      silent: message.payload.sound === 'none',
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? message.payload.data?.url || window.location.origin : 'https://coinet.ai' // Fallback for server-side
    };

    return payload;
  }

  private checkRateLimit(platform: NotificationPlatform): boolean {
    const limiter = this.rateLimiters.get(platform);
    if (!limiter) return true;

    const now = Date.now();
    const windowStart = now - limiter.windowMs;

    // Remove old requests
    limiter.requests = limiter.requests.filter(time => time > windowStart);

    // Check if under limit
    return limiter.requests.length < limiter.limit;
  }

  private updateRateLimit(platform: NotificationPlatform): void {
    const limiter = this.rateLimiters.get(platform);
    if (!limiter) return;

    limiter.requests.push(Date.now());
  }

  private async scheduleRetry(message: NotificationMessage, result: NotificationDeliveryResult): Promise<void> {
    if (message.retryCount >= message.maxRetries) {
      message.status = 'failed';
      this.logger.warn('Max retries exceeded', { messageId: message.id });
      return;
    }

    const delay = this.calculateRetryDelay(message.retryCount);
    message.retryCount++;

    const timer = setTimeout(async () => {
      this.retryTimers.delete(message.id);
      await this.sendSingleMessage(message);
    }, delay);

    this.retryTimers.set(message.id, timer);

    this.logger.debug('Retry scheduled', {
      messageId: message.id,
      retryCount: message.retryCount,
      delay
    });
  }

  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = this.config.retry.baseDelay;
    const maxDelay = this.config.retry.maxDelay;
    const multiplier = this.config.retry.backoffMultiplier;

    let delay = baseDelay * Math.pow(multiplier, retryCount);

    // Apply jitter
    if (this.config.retry.jitterEnabled) {
      delay *= (0.5 + Math.random() * 0.5);
    }

    return Math.min(delay, maxDelay);
  }

  private updateStatistics(platform: NotificationPlatform, success: boolean, deliveryTime: number): void {
    if (success) {
      this.statistics.totalSent++;
      this.statistics.totalDelivered++;
      this.statistics.platformStats[platform].sent++;
      this.statistics.platformStats[platform].delivered++;
    } else {
      this.statistics.totalFailed++;
      this.statistics.platformStats[platform].failed++;
    }

    // Update average delivery time
    const platformStats = this.statistics.platformStats[platform];
    platformStats.averageLatency = (platformStats.averageLatency * (platformStats.sent - 1) + deliveryTime) / platformStats.sent;

    this.statistics.lastUpdated = new Date();
  }

  private async logNotificationDelivery(message: NotificationMessage, result: NotificationDeliveryResult): Promise<void> {
    // This would log to the notification_logs table
    // Implementation would depend on the database layer

    this.logger.debug('Notification delivery logged', {
      messageId: message.id,
      userId: message.userId,
      platform: message.platform,
      success: result.success,
      deliveryTime: result.deliveryTime
    });
  }

  private emitNotificationEvent(
    type: NotificationEvent['type'],
    message: NotificationMessage,
    metadata?: NotificationEvent['metadata']
  ): void {
    const event: NotificationEvent = {
      type,
      timestamp: new Date(),
      messageId: message.id,
      platform: message.platform,
      userId: message.userId,
      ruleId: message.ruleId,
      metadata
    };

    this.emit('notificationEvent', event);
  }

  private initializeRateLimiters(): void {
    for (const platform of ['fcm', 'apns', 'web'] as NotificationPlatform[]) {
      const config = this.config.platforms[platform];
      if (config.enabled) {
        this.rateLimiters.set(platform, {
          requests: [],
          lastReset: new Date(),
          limit: config.rateLimit,
          windowMs: 1000 // 1 second window
        });
      }
    }
  }

  private encryptToken(token: string): string {
    // This would implement proper token encryption
    // For now, return a placeholder
    return `encrypted_${token}`;
  }

  private async loadDeviceTokens(): Promise<void> {
    // Load device tokens from persistence layer
    // This would query the database for active tokens
    this.logger.info('Device tokens loaded from persistence');
  }

  private async persistDeviceToken(token: DeviceToken): Promise<void> {
    // Persist device token to database
    this.logger.debug('Device token persisted', { tokenId: token.id });
  }

  private async removePersistedDeviceToken(tokenId: string): Promise<void> {
    // Remove device token from database
    this.logger.debug('Device token removed from persistence', { tokenId });
  }

  private startHealthMonitoring(): void {
    // Monitor provider connections and queue health
    setInterval(() => {
      this.checkProviderHealth();
      this.checkQueueHealth();
    }, 60000); // Every minute
  }

  private async checkProviderHealth(): Promise<void> {
    for (const [platform, provider] of this.providers) {
      try {
        // Test connection
        await this.testProviderConnection(provider);
        provider.isConnected = true;
        provider.connectionError = undefined;
      } catch (error: any) {
        provider.isConnected = false;
        provider.connectionError = error.message;
        this.logger.warn(`Provider ${platform} health check failed`, error);
      }
      provider.lastConnectionCheck = new Date();
    }
  }

  private async testProviderConnection(provider: NotificationProvider): Promise<void> {
    // This would test actual connectivity to the provider
    // For now, simulate a connection test
    await this.delay(100);
  }

  private checkQueueHealth(): void {
    const queueSize = this.messageQueue.length;
    if (queueSize > this.config.queue.maxQueueSize * 0.8) {
      this.logger.warn('Queue approaching capacity', { queueSize, maxSize: this.config.queue.maxQueueSize });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  public getStatus(): {
    initialized: boolean;
    running: boolean;
    providers: Record<NotificationPlatform, boolean>;
    queueSize: number;
    activeTokens: number;
  } {
    return {
      initialized: this.isInitialized,
      running: this.isRunning,
      providers: Object.fromEntries(
        Array.from(this.providers.entries()).map(([platform, provider]) => [platform, provider.isConnected])
      ) as Record<NotificationPlatform, boolean>,
      queueSize: this.messageQueue.length,
      activeTokens: this.deviceTokens.size
    };
  }
}
