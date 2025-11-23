import { UserPreference, NotificationQueue, ApiResponse } from '@/types';
import { TimeZoneService } from './TimeZoneService';
import { HolidayService } from './HolidayService';
import { Logger } from '@/utils/Logger';

export interface QuietHoursCheck {
  isQuietHours: boolean;
  reason?: string;
  canOverride: boolean;
  overrideReason?: string;
  suggestedDeliveryTime?: Date;
}

export interface NotificationDecision {
  shouldSend: boolean;
  reason: string;
  queueForLater?: boolean;
  scheduledFor?: Date;
  overrideRequired?: boolean;
}

export class PreferenceService {
  private static instance: PreferenceService;
  private logger: Logger;
  private timeZoneService: TimeZoneService;
  private holidayService: HolidayService;

  // In-memory storage for demo - in production, use database
  private preferences: Map<string, UserPreference> = new Map();
  private notificationQueue: Map<string, NotificationQueue> = new Map();

  private constructor() {
    this.logger = Logger.getInstance();
    this.timeZoneService = TimeZoneService.getInstance();
    this.holidayService = HolidayService.getInstance();
  }

  static getInstance(): PreferenceService {
    if (!PreferenceService.instance) {
      PreferenceService.instance = new PreferenceService();
    }
    return PreferenceService.instance;
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  async checkNotificationDelivery(
    userId: string,
    notificationType: 'email' | 'sms' | 'discord' | 'telegram',
    eventType: string,
    priority: 'low' | 'normal' | 'high' | 'critical' | 'medium',
    channelId?: string
  ): Promise<NotificationDecision> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(userId, notificationType, channelId);

      if (!preferences || !preferences.isActive) {
        return {
          shouldSend: true,
          reason: 'No active preferences found - allowing notification',
        };
      }

      // Check if quiet hours are enabled
      if (!preferences.quietHours.enabled) {
        return {
          shouldSend: true,
          reason: 'Quiet hours disabled - allowing notification',
        };
      }

      // Get current time in user's timezone
      const userNow = this.timeZoneService.getCurrentTimeInTimezone(preferences.quietHours.timezone);

      // Check if current day is in quiet hours days
      const currentDayOfWeek = userNow.getDay();
      if (!preferences.quietHours.daysOfWeek.includes(currentDayOfWeek)) {
        return {
          shouldSend: true,
          reason: `Current day (${this.getDayName(currentDayOfWeek)}) not in quiet hours - allowing notification`,
        };
      }

      // Check if current time is within quiet hours
      const isQuietHours = this.timeZoneService.isWithinQuietHours(
        preferences.quietHours.timezone,
        preferences.quietHours.startTime,
        preferences.quietHours.endTime
      );

      if (!isQuietHours) {
        return {
          shouldSend: true,
          reason: 'Current time not in quiet hours - allowing notification',
        };
      }

      // Check if it's a holiday that should extend quiet hours
      const holiday = this.holidayService.getHolidayInfo(userNow);
      if (holiday && this.holidayService.shouldExtendQuietHours(holiday)) {
        const adjustedEndTime = this.holidayService.getHolidayAdjustedQuietHoursEnd(
          holiday,
          preferences.quietHours.endTime
        );

        const isExtendedQuietHours = this.timeZoneService.isWithinQuietHours(
          preferences.quietHours.timezone,
          preferences.quietHours.startTime,
          adjustedEndTime
        );

        if (isExtendedQuietHours) {
          return this.handleQuietHoursNotification(priority, preferences, true, holiday.name);
        }
      }

      // Check if current time is in exception period
      for (const exception of preferences.quietHours.exceptions) {
        if (this.isExceptionActive(exception, userNow)) {
          return {
            shouldSend: true,
            reason: `Exception active: ${exception} - allowing notification`,
          };
        }
      }

      return this.handleQuietHoursNotification(priority, preferences, false);

    } catch (error) {
      this.logger.error('Failed to check notification delivery preferences', {
        error,
        userId,
        notificationType,
        eventType,
        priority
      });

      // Default to allowing notification if check fails
      return {
        shouldSend: true,
        reason: 'Preference check failed - allowing notification for reliability',
      };
    }
  }

  /**
   * Handle notification during quiet hours based on priority and overrides
   */
  private handleQuietHoursNotification(
    priority: 'low' | 'normal' | 'high' | 'critical' | 'medium',
    preferences: UserPreference,
    isHoliday: boolean,
    holidayName?: string
  ): NotificationDecision {
    const priorityOverrides = preferences.priorityOverrides;

    switch (priority) {
      case 'critical':
        if (priorityOverrides.critical) {
          return {
            shouldSend: true,
            reason: 'Critical alert override enabled - sending immediately',
          };
        }
        break;

      case 'high':
        if (priorityOverrides.high) {
          return {
            shouldSend: true,
            reason: 'High priority alert override enabled - sending immediately',
          };
        }
        break;

      case 'normal':
        if (priorityOverrides.normal) {
          return {
            shouldSend: true,
            reason: 'Normal priority alert override enabled - sending immediately',
          };
        }
        break;

      case 'low':
        if (priorityOverrides.low) {
          return {
            shouldSend: true,
            reason: 'Low priority alert override enabled - sending immediately',
          };
        }
        break;
    }

    // Calculate when to retry
    const timeUntilEnd = this.timeZoneService.getTimeUntilQuietHoursEnd(
      preferences.quietHours.timezone,
      preferences.quietHours.endTime
    );

    const retryTime = new Date(Date.now() + timeUntilEnd);

    return {
      shouldSend: false,
      reason: isHoliday
        ? `Quiet hours active during ${holidayName} holiday - queuing for later delivery`
        : 'Quiet hours active - queuing for later delivery',
      queueForLater: true,
      scheduledFor: retryTime,
      overrideRequired: true,
    };
  }

  /**
   * Queue notification for later delivery
   */
  async queueNotification(
    userId: string,
    notificationType: 'email' | 'sms' | 'discord' | 'telegram',
    eventType: string,
    eventData: Record<string, any>,
    priority: 'low' | 'normal' | 'high' | 'critical' | 'medium',
    scheduledFor: Date,
    channelId?: string
  ): Promise<string> {
    const queueId = `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const queueItem: NotificationQueue = {
      id: queueId,
      userId,
      notificationType,
      eventType,
      eventData,
      priority,
      scheduledFor,
      attempts: 0,
      maxAttempts: 3,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (channelId) {
      queueItem.channelId = channelId;
    }

    this.notificationQueue.set(queueId, queueItem);

    this.logger.info('Notification queued for later delivery', {
      queueId,
      userId,
      notificationType,
      eventType,
      priority,
      scheduledFor,
    });

    return queueId;
  }

  /**
   * Process queued notifications that are ready for delivery
   */
  async processQueuedNotifications(): Promise<number> {
    const now = new Date();
    let processedCount = 0;

    for (const [queueId, queueItem] of this.notificationQueue.entries()) {
      if (queueItem.status === 'pending' && queueItem.scheduledFor <= now) {
        try {
          // Here we would call the appropriate notification service
          // For now, we'll just mark as delivered
          queueItem.status = 'delivered';
          queueItem.updatedAt = new Date();

          processedCount++;

          this.logger.info('Queued notification delivered', {
            queueId,
            userId: queueItem.userId,
            notificationType: queueItem.notificationType,
            eventType: queueItem.eventType,
          });

        } catch (error) {
          queueItem.attempts++;
          queueItem.lastError = (error as Error).message;
          queueItem.updatedAt = new Date();

          if (queueItem.attempts >= queueItem.maxAttempts) {
            queueItem.status = 'failed';
            this.logger.error('Queued notification delivery failed after max attempts', {
              queueId,
              attempts: queueItem.attempts,
            });
          }
        }
      }
    }

    if (processedCount > 0) {
      this.logger.info(`Processed ${processedCount} queued notifications`);
    }

    return processedCount;
  }

  /**
   * Create or update user preferences
   */
  async createOrUpdatePreferences(preferences: Omit<UserPreference, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse> {
    try {
      const preferenceId = `pref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newPreferences: UserPreference = {
        ...preferences,
        id: preferenceId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.preferences.set(preferenceId, newPreferences);

      this.logger.info('User preferences created/updated', {
        preferenceId,
        userId: preferences.userId,
        notificationType: preferences.notificationType,
      });

      return {
        success: true,
        data: { preferenceId },
      };

    } catch (error) {
      this.logger.error('Failed to create/update user preferences', { error, preferences });
      return {
        success: false,
        error: {
          code: 'PREFERENCE_ERROR',
          message: `Failed to save preferences: ${error}`,
        },
      };
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(
    userId: string,
    notificationType?: 'email' | 'sms' | 'discord' | 'telegram' | 'all',
    channelId?: string
  ): Promise<UserPreference | null> {
    // Look for specific preferences first, then fall back to 'all' type
    const searchTypes = notificationType ? [notificationType] : ['email', 'sms', 'discord', 'telegram', 'all'];

    for (const type of searchTypes) {
      for (const [id, pref] of this.preferences.entries()) {
        if (pref.userId === userId && pref.notificationType === type && pref.isActive) {
          // Check if channel-specific preference matches
          if (channelId && pref.channelId && pref.channelId !== channelId) {
            continue;
          }

          // For non-channel-specific requests, prefer general preferences
          if (!channelId && pref.channelId) {
            continue;
          }

          return pref;
        }
      }
    }

    return null;
  }

  /**
   * Get all user preferences
   */
  async getAllUserPreferences(userId?: string): Promise<UserPreference[]> {
    const preferences: UserPreference[] = [];

    for (const pref of this.preferences.values()) {
      if (pref.isActive && (!userId || pref.userId === userId)) {
        preferences.push(pref);
      }
    }

    return preferences.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Delete user preferences
   */
  async deleteUserPreferences(userId: string, preferenceId?: string): Promise<ApiResponse> {
    try {
      let deletedCount = 0;

      if (preferenceId) {
        const preference = this.preferences.get(preferenceId);
        if (preference && preference.userId === userId) {
          this.preferences.delete(preferenceId);
          deletedCount = 1;
        }
      } else {
        // Delete all preferences for user
        for (const [id, pref] of this.preferences.entries()) {
          if (pref.userId === userId) {
            this.preferences.delete(id);
            deletedCount++;
          }
        }
      }

      this.logger.info('User preferences deleted', { userId, preferenceId, deletedCount });

      return {
        success: true,
        data: { deletedCount },
      };

    } catch (error) {
      this.logger.error('Failed to delete user preferences', { error, userId, preferenceId });
      return {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: `Failed to delete preferences: ${error}`,
        },
      };
    }
  }

  /**
   * Get notification queue for user
   */
  getUserNotificationQueue(userId: string, status?: NotificationQueue['status']): NotificationQueue[] {
    const queue: NotificationQueue[] = [];

    for (const queueItem of this.notificationQueue.values()) {
      if (queueItem.userId === userId && (!status || queueItem.status === status)) {
        queue.push(queueItem);
      }
    }

    return queue.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  }

  /**
   * Cancel queued notification
   */
  async cancelQueuedNotification(queueId: string, userId: string): Promise<ApiResponse> {
    try {
      const queueItem = this.notificationQueue.get(queueId);

      if (!queueItem || queueItem.userId !== userId) {
        return {
          success: false,
          error: {
            code: 'QUEUE_ITEM_NOT_FOUND',
            message: 'Queued notification not found or access denied',
          },
        };
      }

      if (queueItem.status !== 'pending') {
        return {
          success: false,
          error: {
            code: 'CANNOT_CANCEL',
            message: 'Cannot cancel notification that is not pending',
          },
        };
      }

      queueItem.status = 'cancelled';
      queueItem.updatedAt = new Date();

      this.logger.info('Queued notification cancelled', { queueId, userId });

      return {
        success: true,
        data: { cancelled: true },
      };

    } catch (error) {
      this.logger.error('Failed to cancel queued notification', { error, queueId, userId });
      return {
        success: false,
        error: {
          code: 'CANCEL_ERROR',
          message: `Failed to cancel notification: ${error}`,
        },
      };
    }
  }

  /**
   * Check if exception is currently active
   */
  private isExceptionActive(exception: string, date: Date): boolean {
    // Check if exception is a holiday
    const holiday = this.holidayService.getHolidayInfo(date);
    if (holiday && holiday.name === exception) {
      return true;
    }

    // Check if exception is a date range or specific date
    // This would need more sophisticated date parsing
    return false;
  }

  /**
   * Get day name from day number
   */
  private getDayName(dayNumber: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber] || 'Unknown';
  }

  /**
   * Clean up old queue items
   */
  cleanupOldQueueItems(daysToKeep: number = 7): void {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    for (const [queueId, queueItem] of this.notificationQueue.entries()) {
      if (queueItem.createdAt < cutoffDate && ['delivered', 'failed', 'cancelled'].includes(queueItem.status)) {
        this.notificationQueue.delete(queueId);
      }
    }

    this.logger.info(`Cleaned up old notification queue items (older than ${daysToKeep} days)`);
  }
}
