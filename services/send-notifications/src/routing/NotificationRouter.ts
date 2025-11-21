/**
 * =========================================
 * NOTIFICATION ROUTER
 * =========================================
 * Divine world-class notification routing engine
 * Intelligent channel selection based on user preferences, priority, and context
 */

// Note: Logger import would be uncommented when Logger is implemented
// import { Logger } from '@/utils/Logger';
import {
  AlertEvent,
  UserNotificationPreferences,
  NotificationChannel,
  NotificationPriority,
  NotificationEventType,
  RoutingDecision,
  ChannelPreferences,
  IUserPreferencesStorage,
  INotificationCache
} from '@/types';

/**
 * Notification routing engine
 */
export class NotificationRouter {
  private logger: any; // Logger
  private preferencesStorage: IUserPreferencesStorage;
  private cache: INotificationCache;

  constructor(
    preferencesStorage: IUserPreferencesStorage,
    cache: INotificationCache
  ) {
    // this.logger = new Logger('NotificationRouter'); // Commented out until Logger implemented
    this.preferencesStorage = preferencesStorage;
    this.cache = cache;
  }

  /**
   * Route alert event to appropriate notification channels
   */
  async routeEvent(event: AlertEvent): Promise<RoutingDecision> {
    const startTime = Date.now();

    // Note: Logger calls commented out until Logger is implemented
    // this.logger.debug('Routing notification event', {
    //   eventId: event.id,
    //   userId: event.userId,
    //   type: event.type,
    //   severity: event.severity,
    // });

    try {
      // Get user preferences (with caching)
      const preferences = await this.getUserPreferences(event.userId);

      // Check if event should be filtered
      if (!this.shouldProcessEvent(event, preferences)) {
        return this.createFilteredDecision(event, 'Event filtered by user preferences', startTime);
      }

      // Check quiet hours and do-not-disturb
      if (this.isInQuietHours(event, preferences)) {
        return this.createFilteredDecision(event, 'Event in quiet hours', startTime);
      }

      // Select appropriate channels
      const { selectedChannels, filteredChannels } = this.selectChannels(event, preferences);

      if (selectedChannels.length === 0) {
        return this.createFilteredDecision(event, 'No suitable channels available', startTime);
      }

      // Create routing decision
      const decision: RoutingDecision = {
        eventId: event.id,
        userId: event.userId,
        selectedChannels,
        filteredChannels,
        routedAt: Date.now(),
        processingTime: Date.now() - startTime,
        preferencesSnapshot: preferences,
        rulesApplied: this.getAppliedRules(event, preferences),
      };

    // Note: Logger calls commented out until Logger is implemented
    // this.logger.info('Notification event routed', {
    //   eventId: event.id,
    //   userId: event.userId,
    //   selectedChannels: selectedChannels.map(c => c.channel),
    //   filteredChannels: filteredChannels.map(c => c.channel),
    //   processingTime: decision.processingTime,
    // });

      return decision;

    } catch (error: any) {
      // Note: Logger calls commented out until Logger is implemented
      // this.logger.error('Failed to route notification event', {
      //   eventId: event.id,
      //   userId: event.userId,
      //   error: error.message,
      // });

      return this.createFilteredDecision(event, `Routing error: ${error.message}`, startTime);
    }
  }

  /**
   * Get user preferences with caching
   */
  private async getUserPreferences(userId: string): Promise<UserNotificationPreferences> {
    // Try cache first
    const cached = this.cache.getUserPreferences(userId);
    if (cached) {
      // Note: Logger calls commented out until Logger is implemented
      // this.logger.debug('Using cached user preferences', { userId });
      return cached;
    }

    // Fetch from storage
    const preferences = await this.preferencesStorage.getUserPreferences(userId);

    if (!preferences) {
      // Return default preferences
      const defaultPreferences = this.createDefaultPreferences(userId);
      await this.preferencesStorage.updateUserPreferences(defaultPreferences);
      this.cache.setUserPreferences(userId, defaultPreferences, 300); // 5 minute TTL
      return defaultPreferences;
    }

    // Cache preferences
    this.cache.setUserPreferences(userId, preferences, 300);

    return preferences;
  }

  /**
   * Check if event should be processed based on user preferences
   */
  private shouldProcessEvent(
    event: AlertEvent,
    preferences: UserNotificationPreferences
  ): boolean {
    // Check if event type is enabled
    if (!preferences.eventFilters.enabledTypes.includes(event.type)) {
      return false;
    }

    // Check if event type is explicitly disabled
    if (preferences.eventFilters.disabledTypes.includes(event.type)) {
      return false;
    }

    // Check severity filter
    if (!preferences.eventFilters.severityFilters[event.severity]) {
      return false;
    }

    // Check do-not-disturb mode
    if (preferences.global.doNotDisturb?.enabled) {
      const now = Date.now();
      if (!preferences.global.doNotDisturb.until || now < preferences.global.doNotDisturb.until) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if event is in quiet hours
   */
  private isInQuietHours(
    event: AlertEvent,
    preferences: UserNotificationPreferences
  ): boolean {
    // Check global do-not-disturb first
    if (preferences.global.doNotDisturb?.enabled) {
      return true;
    }

    // Check channel-specific quiet hours
    for (const channelPref of preferences.channels) {
      if (channelPref.quietHours?.enabled) {
        if (this.isInChannelQuietHours(event.timestamp, channelPref.quietHours)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if timestamp is in channel quiet hours
   */
  private isInChannelQuietHours(timestamp: number, quietHours: any): boolean {
    const date = new Date(timestamp);
    const dayOfWeek = date.getDay(); // 0 = Sunday
    const hour = date.getHours();
    const minute = date.getMinutes();
    const currentTime = hour * 60 + minute;

    // Check if current day is in quiet hours days
    if (!quietHours.daysOfWeek.includes(dayOfWeek)) {
      return false;
    }

    // Parse start and end times
    const [startHour, startMinute] = quietHours.startTime.split(':').map(Number);
    const [endHour, endMinute] = quietHours.endTime.split(':').map(Number);

    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    // Handle overnight quiet hours (e.g., 22:00 to 06:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * Select appropriate channels for event
   */
  private selectChannels(
    event: AlertEvent,
    preferences: UserNotificationPreferences
  ): {
    selectedChannels: Array<{
      channel: NotificationChannel;
      priority: NotificationPriority;
      reason: string;
      estimatedDeliveryTime: number;
    }>;
    filteredChannels: Array<{
      channel: NotificationChannel;
      reason: string;
    }>;
  } {
    const selectedChannels: Array<{
      channel: NotificationChannel;
      priority: NotificationPriority;
      reason: string;
      estimatedDeliveryTime: number;
    }> = [];

    const filteredChannels: Array<{
      channel: NotificationChannel;
      reason: string;
    }> = [];

    // Get event priority (use event priority or rule severity)
    const eventPriority = event.priority || event.severity;

    for (const channelPref of preferences.channels) {
      if (!channelPref.enabled) {
        filteredChannels.push({
          channel: channelPref.channel,
          reason: 'Channel disabled by user',
        });
        continue;
      }

      // Check minimum priority requirement
      if (!this.isPriorityAboveMinimum(eventPriority, channelPref.minPriority)) {
        filteredChannels.push({
          channel: channelPref.channel,
          reason: `Priority ${eventPriority} below minimum ${channelPref.minPriority}`,
        });
        continue;
      }

      // Check rate limits (simplified)
      const rateLimitExceeded = this.checkRateLimit(event.userId, channelPref.channel, eventPriority);
      if (rateLimitExceeded) {
        filteredChannels.push({
          channel: channelPref.channel,
          reason: 'Rate limit exceeded',
        });
        continue;
      }

      // Channel is suitable
      selectedChannels.push({
        channel: channelPref.channel,
        priority: eventPriority,
        reason: `Priority ${eventPriority} meets minimum requirement ${channelPref.minPriority}`,
        estimatedDeliveryTime: this.estimateDeliveryTime(channelPref.channel),
      });
    }

    return { selectedChannels, filteredChannels };
  }

  /**
   * Check if priority is above minimum required
   */
  private isPriorityAboveMinimum(
    eventPriority: NotificationPriority,
    minPriority: NotificationPriority
  ): boolean {
    const priorityLevels = {
      [NotificationPriority.LOW]: 1,
      [NotificationPriority.NORMAL]: 2,
      [NotificationPriority.HIGH]: 3,
      [NotificationPriority.URGENT]: 4,
      [NotificationPriority.CRITICAL]: 5,
    };

    return priorityLevels[eventPriority] >= priorityLevels[minPriority];
  }

  /**
   * Check rate limit for user/channel/priority combination
   */
  private checkRateLimit(
    userId: string,
    channel: NotificationChannel,
    priority: NotificationPriority
  ): boolean {
    // Simplified rate limiting check
    // In real implementation, would check Redis counters
    const cacheKey = `rate_limit:${userId}:${channel}:${priority}`;

    const currentCount = this.cache.getRateLimitState(cacheKey)?.count || 0;
    const maxPerHour = 10; // Simplified

    return currentCount >= maxPerHour;
  }

  /**
   * Estimate delivery time for channel
   */
  private estimateDeliveryTime(channel: NotificationChannel): number {
    const deliveryTimes = {
      [NotificationChannel.PUSH]: 100, // 100ms
      [NotificationChannel.IN_APP]: 50, // 50ms
      [NotificationChannel.WEBHOOK]: 200, // 200ms
      [NotificationChannel.EMAIL]: 5000, // 5 seconds
      [NotificationChannel.SMS]: 3000, // 3 seconds
      [NotificationChannel.TELEGRAM]: 500, // 500ms
      [NotificationChannel.DISCORD]: 800, // 800ms
      [NotificationChannel.SLACK]: 1000, // 1 second
    };

    return deliveryTimes[channel] || 1000;
  }

  /**
   * Get applied routing rules
   */
  private getAppliedRules(
    event: AlertEvent,
    preferences: UserNotificationPreferences
  ): string[] {
    const rules: string[] = [];

    if (!preferences.eventFilters.enabledTypes.includes(event.type)) {
      rules.push('event_type_filter');
    }

    if (preferences.global.doNotDisturb?.enabled) {
      rules.push('do_not_disturb');
    }

    if (this.isInQuietHours(event, preferences)) {
      rules.push('quiet_hours');
    }

    rules.push('priority_filter');
    rules.push('rate_limiting');

    return rules;
  }

  /**
   * Create filtered decision
   */
  private createFilteredDecision(
    event: AlertEvent,
    reason: string,
    startTime: number
  ): RoutingDecision {
    return {
      eventId: event.id,
      userId: event.userId,
      selectedChannels: [],
      filteredChannels: [
        {
          channel: NotificationChannel.EMAIL, // Default fallback
          reason,
        },
      ],
      routedAt: Date.now(),
      processingTime: Date.now() - startTime,
      preferencesSnapshot: {},
      rulesApplied: ['filter_applied'],
    };
  }

  /**
   * Create default user preferences
   */
  private createDefaultPreferences(userId: string): UserNotificationPreferences {
    return {
      userId,
      global: {
        timezone: 'UTC',
      },
      channels: [
        {
          channel: NotificationChannel.EMAIL,
          enabled: true,
          minPriority: NotificationPriority.NORMAL,
          providerSettings: {},
        },
        {
          channel: NotificationChannel.PUSH,
          enabled: true,
          minPriority: NotificationPriority.HIGH,
          providerSettings: {},
        },
      ],
      eventFilters: {
        enabledTypes: [
          NotificationEventType.ALERT_TRIGGERED,
          NotificationEventType.ALERT_RESOLVED,
        ],
        disabledTypes: [],
        severityFilters: {
          [NotificationPriority.LOW]: false,
          [NotificationPriority.NORMAL]: true,
          [NotificationPriority.HIGH]: true,
          [NotificationPriority.URGENT]: true,
          [NotificationPriority.CRITICAL]: true,
        },
      },
      updatedAt: Date.now(),
    };
  }

  /**
   * Clear user preferences cache
   */
  async clearUserCache(userId: string): Promise<void> {
    this.cache.invalidateUser(userId);
    // Note: Logger calls commented out until Logger is implemented
    // this.logger.debug('Cleared user preferences cache', { userId });
  }

  /**
   * Get routing statistics
   */
  getRoutingStats(): {
    totalRouted: number;
    averageRoutingTime: number;
    channelDistribution: Record<NotificationChannel, number>;
    filterReasons: Record<string, number>;
  } {
    // In real implementation, would track these metrics
    return {
      totalRouted: 0,
      averageRoutingTime: 0,
      channelDistribution: {} as Record<NotificationChannel, number>,
      filterReasons: {},
    };
  }
}
