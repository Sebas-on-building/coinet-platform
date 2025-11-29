import { EmailService } from './EmailService';
import { SmsService } from './SmsService';
import { BotService } from './BotService';
import { PriorityNotificationService } from './priority/PriorityNotificationService';
import { AlertGroupingService, AlertGroup, GroupedAlert } from './grouping/AlertGroupingService';
import { NotificationContext, RoutingDecision } from './priority/PriorityRouter';
import { DeliveryTracker, NotificationDelivery, DeliveryAttempt } from './delivery/DeliveryTracker';
import { PreferenceService } from './preferences/PreferenceService';
import { PerformanceOptimizer } from './performance/PerformanceOptimizer';
import { AdvancedCacheManager } from './cache/AdvancedCacheManager';
import * as GlobalDeliveryOptimizerModule from './delivery/GlobalDeliveryOptimizer';
import { Logger } from '@/utils/Logger';

export interface CoordinatedNotification {
  id: string;
  context: NotificationContext;
  routing: RoutingDecision;
  alertGroup?: AlertGroup | undefined;
  digest?: {
    title: string;
    summary: string;
    detailsUrl: string;
    priority: string;
  };
  notificationData: MultiChannelNotification;
  status: 'pending' | 'sent' | 'failed' | 'grouped';
  sentChannels: string[];
  failedChannels: string[];
  createdAt: Date;
  sentAt?: Date;
}

export interface MultiChannelNotification {
  context: NotificationContext;
  emailData?: any;
  smsData?: any;
  botData?: any;
}

export class NotificationCoordinator {
  private static instance: NotificationCoordinator;
  private logger: Logger;
  private emailService: EmailService;
  private smsService: SmsService;
  private botService: BotService;
  private priorityNotificationService: PriorityNotificationService;
  private alertGroupingService: AlertGroupingService;
  private deliveryTracker: DeliveryTracker;
  private preferenceService: PreferenceService;
  private performanceOptimizer: PerformanceOptimizer;
  private cacheManager: AdvancedCacheManager;
  private globalDeliveryOptimizer: GlobalDeliveryOptimizerModule.GlobalDeliveryOptimizer;

  // Coordinated notifications (in production, use database)
  private coordinatedNotifications: Map<string, CoordinatedNotification> = new Map();

  private constructor() {
    this.logger = Logger.getInstance();
    this.emailService = EmailService.getInstance();
    this.smsService = SmsService.getInstance();
    this.botService = BotService.getInstance();
    this.priorityNotificationService = PriorityNotificationService.getInstance();
    this.alertGroupingService = AlertGroupingService.getInstance();
    this.deliveryTracker = DeliveryTracker.getInstance();
    this.preferenceService = PreferenceService.getInstance();
    this.performanceOptimizer = PerformanceOptimizer.getInstance();
    this.cacheManager = AdvancedCacheManager.getInstance();
    this.globalDeliveryOptimizer = GlobalDeliveryOptimizerModule.GlobalDeliveryOptimizer.getInstance();
  }

  static getInstance(): NotificationCoordinator {
    if (!NotificationCoordinator.instance) {
      NotificationCoordinator.instance = new NotificationCoordinator();
    }
    return NotificationCoordinator.instance;
  }

  /**
   * Process and send notification with priority routing and grouping
   */
  async processNotification(
    context: NotificationContext,
    notificationData: MultiChannelNotification
  ): Promise<CoordinatedNotification> {
    const notificationId = `coord-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.logger.info('Processing coordinated notification', {
        notificationId,
        userId: context.userId,
        eventType: context.eventType,
        priority: context.priority
      });

      // Step 1: Check if alert should be grouped
      const alert: Omit<GroupedAlert, 'similarityScore' | 'included'> = {
        id: notificationId,
        timestamp: new Date(),
        source: context.metadata?.source || 'system',
        eventType: context.eventType,
        priority: context.priority || 'medium',
        data: context.metadata || {}
      };

      const groupingResult = await this.alertGroupingService.processAlert(alert);

      // Step 2: Determine priority routing
      const routing = await this.priorityNotificationService['priorityRouter'].determineRouting(context);

      // Step 3: Create coordinated notification record
      const coordinatedNotification: CoordinatedNotification = {
        id: notificationId,
        context,
        routing,
        alertGroup: groupingResult.group,
        notificationData: {
          context,
          emailData: notificationData.emailData,
          smsData: notificationData.smsData,
          botData: notificationData.botData
        },
        status: 'pending',
        sentChannels: [],
        failedChannels: [],
        createdAt: new Date()
      };

      this.coordinatedNotifications.set(notificationId, coordinatedNotification);

      // Step 4: Handle grouping logic
      if (groupingResult.shouldGroup && groupingResult.group) {
        // Group is ready for digest creation
        const digest = await this.alertGroupingService.createDigest(groupingResult.group);

        coordinatedNotification.digest = digest;
        coordinatedNotification.status = 'grouped';

        // Send digest instead of individual notifications
        await this.sendDigestNotification(coordinatedNotification);

      } else {
        // Send individual notification
        await this.sendIndividualNotification(coordinatedNotification);
      }

      // Step 5: Apply performance optimizations for 10M+ users
      await this.performanceOptimizer.processNotification(coordinatedNotification);

      return coordinatedNotification;

    } catch (error) {
      this.logger.error('Failed to process coordinated notification', {
        error: error instanceof Error ? error.message : String(error),
        notificationId,
        context
      });

      // Create failed notification record
      const failedNotification: CoordinatedNotification = {
        id: notificationId,
        context,
        routing: {
          priority: 'medium',
          channels: ['email'],
          reasoning: 'Processing failed - using fallback',
          confidence: 50,
          shouldEscalate: false,
          requireConfirmation: false
        },
        notificationData,
        status: 'failed',
        sentChannels: [],
        failedChannels: ['system'],
        createdAt: new Date()
      };

      this.coordinatedNotifications.set(notificationId, failedNotification);
      return failedNotification;
    }
  }

  /**
   * Send digest notification for grouped alerts
   */
  private async sendDigestNotification(coordinatedNotification: CoordinatedNotification): Promise<void> {
    if (!coordinatedNotification.digest) {
      this.logger.error('No digest available for grouped notification', { notificationId: coordinatedNotification.id });
      return;
    }

    try {
      const { digest, context, routing } = coordinatedNotification;

      // Create digest-specific notification data
      const digestNotificationData = {
        emailData: this.createDigestEmailData(digest, context),
        smsData: this.createDigestSmsData(digest, context),
        botData: this.createDigestBotData(digest, context)
      };

      // Send via priority notification service
      const result = await this.priorityNotificationService.sendPriorityNotification(context, {
        context,
        ...digestNotificationData
      });

      // Update coordinated notification status
      coordinatedNotification.status = result.success ? 'sent' : 'failed';
      coordinatedNotification.sentChannels = result.success ? routing.channels : [];
      coordinatedNotification.failedChannels = result.errors.map(e => e.channel);
      coordinatedNotification.sentAt = new Date();

      if (result.success) {
        this.logger.info('Digest notification sent successfully', {
          notificationId: coordinatedNotification.id,
          channels: routing.channels,
          cost: result.totalCost
        });
      } else {
        this.logger.warn('Digest notification failed', {
          notificationId: coordinatedNotification.id,
          errors: result.errors
        });
      }

    } catch (error) {
      this.logger.error('Failed to send digest notification', {
        error: error instanceof Error ? error.message : String(error),
        notificationId: coordinatedNotification.id
      });
      coordinatedNotification.status = 'failed';
      coordinatedNotification.failedChannels.push('digest_system');
    }
  }

  /**
   * Send individual notification
   */
  private async sendIndividualNotification(coordinatedNotification: CoordinatedNotification): Promise<void> {
    try {
      const { context, notificationData, routing } = coordinatedNotification;

      // Send via priority notification service
      const result = await this.priorityNotificationService.sendPriorityNotification(context, {
        context,
        emailData: notificationData.emailData,
        smsData: notificationData.smsData,
        botData: notificationData.botData
      });

      // Update coordinated notification status
      coordinatedNotification.status = result.success ? 'sent' : 'failed';
      coordinatedNotification.sentChannels = result.success ? routing.channels : [];
      coordinatedNotification.failedChannels = result.errors.map(e => e.channel);
      coordinatedNotification.sentAt = new Date();

      if (result.success) {
        this.logger.info('Individual notification sent successfully', {
          notificationId: coordinatedNotification.id,
          channels: routing.channels,
          cost: result.totalCost
        });
      } else {
        this.logger.warn('Individual notification failed', {
          notificationId: coordinatedNotification.id,
          errors: result.errors
        });
      }

    } catch (error) {
      this.logger.error('Failed to send individual notification', {
        error: error instanceof Error ? error.message : String(error),
        notificationId: coordinatedNotification.id
      });
      coordinatedNotification.status = 'failed';
      coordinatedNotification.failedChannels.push('individual_system');
    }
  }

  /**
   * Create digest email data
   */
  private createDigestEmailData(digest: any, context: NotificationContext): any {
    return {
      to: [context.userId], // In production, resolve user email
      subject: digest.title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${digest.title}</h2>
          <p><strong>Summary:</strong> ${digest.summary}</p>
          <p><strong>Priority:</strong> ${digest.priority.toUpperCase()}</p>
          <p><strong>Time Range:</strong> ${digest.metadata.timeRange.start.toLocaleString()} - ${digest.metadata.timeRange.end.toLocaleString()}</p>
          <p><strong>Sources:</strong> ${digest.metadata.sources.join(', ')}</p>
          <p><strong>Confidence:</strong> ${digest.metadata.confidence}%</p>
          <br>
          <p><a href="${digest.detailsUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a></p>
        </div>
      `,
      text: `
        ${digest.title}

        Summary: ${digest.summary}
        Priority: ${digest.priority.toUpperCase()}
        Time Range: ${digest.metadata.timeRange.start.toLocaleString()} - ${digest.metadata.timeRange.end.toLocaleString()}
        Sources: ${digest.metadata.sources.join(', ')}
        Confidence: ${digest.metadata.confidence}%

        View Details: ${digest.detailsUrl}
      `,
      priority: digest.priority,
      metadata: {
        isDigest: true,
        groupId: digest.metadata.groupId,
        alertCount: digest.metadata.alertCount
      }
    };
  }

  /**
   * Create digest SMS data
   */
  private createDigestSmsData(digest: any, context: NotificationContext): any {
    const maxLength = 160; // SMS character limit
    const summary = digest.summary.length > maxLength - 50 ?
      digest.summary.substring(0, maxLength - 50) + '...' : digest.summary;

    return {
      to: context.userId, // In production, resolve user phone
      body: `${digest.title}\n\n${summary}\n\nPriority: ${digest.priority}\nView: ${digest.detailsUrl}`,
      priority: digest.priority,
      metadata: {
        isDigest: true,
        groupId: digest.metadata.groupId,
        alertCount: digest.metadata.alertCount
      }
    };
  }

  /**
   * Create digest bot data
   */
  private createDigestBotData(digest: any, context: NotificationContext): any {
    return {
      content: `🚨 **${digest.title}**\n\n${digest.summary}\n\n**Priority:** ${digest.priority.toUpperCase()}\n**Sources:** ${digest.metadata.sources.join(', ')}\n**Confidence:** ${digest.metadata.confidence}%\n\n[View Details](${digest.detailsUrl})`,
      platform: 'discord', // Default to Discord, could be configurable
      messageType: 'notification',
      priority: digest.priority,
      formatting: {
        markdown: true,
        embeds: true
      },
      metadata: {
        isDigest: true,
        groupId: digest.metadata.groupId,
        alertCount: digest.metadata.alertCount
      }
    };
  }

  /**
   * Get coordinated notification by ID
   */
  getCoordinatedNotification(notificationId: string): CoordinatedNotification | undefined {
    return this.coordinatedNotifications.get(notificationId);
  }

  /**
   * Get all coordinated notifications for user
   */
  getUserCoordinatedNotifications(userId: string): CoordinatedNotification[] {
    return Array.from(this.coordinatedNotifications.values())
      .filter(notification => notification.context.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get active alert groups
   */
  getActiveAlertGroups(type?: string): AlertGroup[] {
    return this.alertGroupingService.getActiveGroups(type);
  }

  /**
   * Force complete an alert group
   */
  completeAlertGroup(groupId: string): boolean {
    return this.alertGroupingService.completeGroup(groupId);
  }

  /**
   * Get alert grouping performance metrics
   */
  getGroupingPerformance(): any {
    return this.alertGroupingService.getPerformanceMetrics();
  }

  /**
   * Record grouping feedback
   */
  recordGroupingFeedback(groupId: string, accurate: boolean): void {
    this.alertGroupingService.recordFeedback(groupId, accurate);
  }

  /**
   * Update grouping heuristics
   */
  updateGroupingHeuristics(heuristics: Partial<any>): void {
    this.alertGroupingService.updateHeuristics(heuristics);
  }

  /**
   * Get delivery by ID
   */
  getDelivery(deliveryId: string): NotificationDelivery | undefined {
    return this.deliveryTracker.getDelivery(deliveryId);
  }

  /**
   * Get deliveries for user
   */
  getUserDeliveries(userId: string, limit?: number): NotificationDelivery[] {
    return this.deliveryTracker.getUserDeliveries(userId, limit);
  }

  /**
   * Get delivery attempts for notification
   */
  getDeliveryAttempts(deliveryId: string): DeliveryAttempt[] {
    return this.deliveryTracker.getDeliveryAttempts(deliveryId);
  }

  /**
   * Get delivery analytics
   */
  getDeliveryAnalytics(): any {
    return this.deliveryTracker.getAnalytics();
  }

  /**
   * Get delivery statistics by channel
   */
  getChannelDeliveryStats(): Record<string, any> {
    return this.deliveryTracker.getChannelStats();
  }

  /**
   * Get delivery statistics by provider
   */
  getProviderDeliveryStats(): Record<string, any> {
    return this.deliveryTracker.getProviderStats();
  }

  /**
   * Update retry configuration for channel
   */
  updateRetryConfig(channel: string, config: Partial<any>): void {
    this.deliveryTracker.updateRetryConfig(channel as any, config);
  }

  /**
   * Get retry configuration for channel
   */
  getRetryConfig(channel: string): any {
    return this.deliveryTracker.getRetryConfig(channel as any);
  }

  /**
   * Get notification coordinator statistics
   */
  getCoordinatorStats(): any {
    const notifications = Array.from(this.coordinatedNotifications.values());

    return {
      totalNotifications: notifications.length,
      sentNotifications: notifications.filter(n => n.status === 'sent').length,
      failedNotifications: notifications.filter(n => n.status === 'failed').length,
      groupedNotifications: notifications.filter(n => n.status === 'grouped').length,
      averageChannelsPerNotification: notifications.reduce((sum, n) => sum + n.sentChannels.length, 0) / notifications.length || 0,
      activeGroups: this.alertGroupingService.getActiveGroups().length,
      performance: this.alertGroupingService.getPerformanceMetrics(),
      delivery: this.deliveryTracker.getAnalytics(),
      timestamp: new Date()
    };
  }

  /**
   * Cleanup old coordinated notifications
   */
  cleanupOldNotifications(daysToKeep: number = 7): void {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [notificationId, notification] of this.coordinatedNotifications.entries()) {
      if (notification.createdAt < cutoffDate) {
        this.coordinatedNotifications.delete(notificationId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.info(`Cleaned up ${cleanedCount} old coordinated notifications`);
    }
  }

  /**
   * Cleanup old delivery records
   */
  cleanupOldRecords(daysToKeep: number = 30): number {
    return this.deliveryTracker.cleanupOldRecords(daysToKeep);
  }
}
