import { supabase } from '@/integrations/supabase/client';
import type { AdvancedAlert, AlertTrigger, NotificationChannel, NotificationPreferences } from '@/types/advancedAlerts';

export class SmartRoutingEngine {
  private static instance: SmartRoutingEngine;
  private escalationQueue: Map<string, EscalationEntry> = new Map();
  private userPreferencesCache: Map<string, NotificationPreferences> = new Map();

  static getInstance(): SmartRoutingEngine {
    if (!SmartRoutingEngine.instance) {
      SmartRoutingEngine.instance = new SmartRoutingEngine();
    }
    return SmartRoutingEngine.instance;
  }

  // ====== MAIN ROUTING LOGIC ======

  async routeAlertTrigger(alert: AdvancedAlert, trigger: AlertTrigger): Promise<void> {
    // Get user preferences
    const preferences = await this.getUserPreferences(alert.user_id);
    
    // Check quiet hours
    if (this.isQuietTime(preferences) && !this.shouldOverrideQuietHours(alert, preferences)) {
      await this.queueForDigest(alert, trigger, preferences);
      return;
    }

    // Check daily limits
    if (await this.exceedsDailyLimits(alert.user_id, preferences)) {
      await this.queueForDigest(alert, trigger, preferences);
      return;
    }

    // Determine optimal channels based on urgency and context
    const selectedChannels = this.selectOptimalChannels(alert, trigger, preferences);
    
    // Send notifications
    await this.sendNotifications(alert, trigger, selectedChannels, preferences);
    
    // Set up escalation if needed
    if (alert.routing.escalation && alert.priority === 'critical') {
      this.scheduleEscalation(alert, trigger, preferences);
    }
  }

  // ====== CHANNEL SELECTION ======

  private selectOptimalChannels(
    alert: AdvancedAlert, 
    trigger: AlertTrigger, 
    preferences: NotificationPreferences
  ): NotificationChannel[] {
    const channels: NotificationChannel[] = [];
    const tier = alert.routing.tier;
    const confidence = trigger.confidence_score;

    // Base channels from alert configuration
    const requestedChannels = alert.routing.channels;
    
    // Filter based on user preferences
    const availableChannels = requestedChannels.filter(channel => {
      switch (channel) {
        case 'in_app':
          return preferences.channels.in_app;
        case 'push':
          return preferences.channels.push;
        case 'email':
          return preferences.channels.email;
        case 'sms':
          return preferences.channels.sms;
        default:
          return true; // Custom channels like telegram, discord
      }
    });

    // Smart channel selection based on tier and confidence
    if (tier === 'critical' && confidence > 0.8) {
      // High confidence critical alerts use all available channels
      channels.push(...availableChannels);
    } else if (tier === 'important' && confidence > 0.7) {
      // Important alerts use primary channels
      channels.push(...availableChannels.filter(c => ['in_app', 'push', 'telegram'].includes(c)));
    } else if (tier === 'informational') {
      // Informational alerts use minimal channels
      channels.push(...availableChannels.filter(c => ['in_app'].includes(c)));
    }

    // Ensure at least one channel
    if (channels.length === 0 && availableChannels.length > 0) {
      channels.push(availableChannels[0]);
    }

    return channels;
  }

  // ====== NOTIFICATION DELIVERY ======

  private async sendNotifications(
    alert: AdvancedAlert, 
    trigger: AlertTrigger, 
    channels: NotificationChannel[],
    preferences: NotificationPreferences
  ): Promise<void> {
    const notificationData = this.prepareNotificationData(alert, trigger);
    
    // Send to each channel in parallel
    const sendPromises = channels.map(channel => 
      this.sendToChannel(channel, notificationData, preferences)
    );

    try {
      await Promise.allSettled(sendPromises);
      
      // Log successful delivery
      await this.logDelivery(trigger.id, channels, 'success');
    } catch (error) {
      console.error('Error sending notifications:', error);
      await this.logDelivery(trigger.id, channels, 'error', error);
    }
  }

  private prepareNotificationData(alert: AdvancedAlert, trigger: AlertTrigger) {
    const confidence = Math.round(trigger.confidence_score * 100);
    const edgeDecay = trigger.context_pack.edge_decay_minutes;
    
    return {
      title: `${alert.priority.toUpperCase()}: ${alert.name}`,
      message: trigger.context_pack.summary,
      confidence: `${confidence}% confidence`,
      edgeTimer: edgeDecay > 60 ? `${Math.round(edgeDecay / 60)}h edge` : `${edgeDecay}m edge`,
      data: {
        alertId: alert.id,
        triggerId: trigger.id,
        priority: alert.priority,
        confidence: trigger.confidence_score,
        contextPack: trigger.context_pack
      }
    };
  }

  private async sendToChannel(
    channel: NotificationChannel, 
    data: any, 
    preferences: NotificationPreferences
  ): Promise<void> {
    switch (channel) {
      case 'in_app':
        await this.sendInAppNotification(data);
        break;
      case 'push':
        await this.sendPushNotification(data, preferences);
        break;
      case 'email':
        await this.sendEmailNotification(data);
        break;
      case 'sms':
        await this.sendSMSNotification(data);
        break;
      case 'telegram':
        await this.sendTelegramNotification(data, preferences);
        break;
      case 'discord':
        await this.sendDiscordNotification(data, preferences);
        break;
      case 'webhook':
        await this.sendWebhookNotification(data);
        break;
    }
  }

  private async sendInAppNotification(data: any): Promise<void> {
    // In-app notifications are handled by the UI components
    // This would typically trigger a real-time update
    console.log('In-app notification:', data.title);
  }

  private async sendPushNotification(data: any, preferences: NotificationPreferences): Promise<void> {
    // Implementation would use push notification service
    console.log('Push notification:', data.title);
  }

  private async sendEmailNotification(data: any): Promise<void> {
    // Implementation would use email service
    console.log('Email notification:', data.title);
  }

  private async sendSMSNotification(data: any): Promise<void> {
    // Implementation would use SMS service
    console.log('SMS notification:', data.title);
  }

  private async sendTelegramNotification(data: any, preferences: NotificationPreferences): Promise<void> {
    // Implementation would use Telegram Bot API
    console.log('Telegram notification:', data.title);
  }

  private async sendDiscordNotification(data: any, preferences: NotificationPreferences): Promise<void> {
    // Implementation would use Discord webhook
    console.log('Discord notification:', data.title);
  }

  private async sendWebhookNotification(data: any): Promise<void> {
    // Implementation would send to user-configured webhook URLs
    console.log('Webhook notification:', data.title);
  }

  // ====== ESCALATION LOGIC ======

  private scheduleEscalation(
    alert: AdvancedAlert, 
    trigger: AlertTrigger, 
    preferences: NotificationPreferences
  ): void {
    if (!alert.routing.escalation) return;

    const escalationEntry: EscalationEntry = {
      alertId: alert.id,
      triggerId: trigger.id,
      scheduledTime: Date.now() + (alert.routing.escalation.delay_minutes * 60 * 1000),
      escalationChannels: alert.routing.escalation.escalate_to,
      originalChannels: alert.routing.channels
    };

    this.escalationQueue.set(trigger.id, escalationEntry);

    // Schedule the escalation
    setTimeout(() => {
      this.processEscalation(trigger.id);
    }, alert.routing.escalation.delay_minutes * 60 * 1000);
  }

  private async processEscalation(triggerId: string): Promise<void> {
    const escalation = this.escalationQueue.get(triggerId);
    if (!escalation) return;

    // Check if user has already acknowledged the alert
    const { data: triggerData } = await supabase
      .from('alert_triggers')
      .select('viewed_at, action_taken')
      .eq('id', triggerId)
      .single();

    if (triggerData?.viewed_at || triggerData?.action_taken) {
      // User has already seen/acted on the alert, no need to escalate
      this.escalationQueue.delete(triggerId);
      return;
    }

    // Get the original alert and trigger data
    const { data: alertData } = await supabase
      .from('alerts')
      .select('*')
      .eq('id', escalation.alertId)
      .single();

    if (!alertData) return;

    // Get user preferences
    const preferences = await this.getUserPreferences(alertData.user_id);

    // Send escalation notifications
    const escalationData = {
      title: `ESCALATED: ${alertData.name}`,
      message: `This critical alert requires immediate attention`,
      isEscalation: true
    };

    await Promise.all(
      escalation.escalationChannels.map(channel =>
        this.sendToChannel(channel, escalationData, preferences)
      )
    );

    this.escalationQueue.delete(triggerId);
  }

  // ====== QUIET HOURS & LIMITS ======

  private isQuietTime(preferences: NotificationPreferences): boolean {
    if (!preferences.quiet_hours_enabled || !preferences.quiet_hours_start || !preferences.quiet_hours_end) {
      return false;
    }

    const now = new Date();
    const userTime = new Date(now.toLocaleString("en-US", { timeZone: preferences.timezone }));
    const currentHour = userTime.getHours();
    const currentMinute = userTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const startTime = this.parseTimeToMinutes(preferences.quiet_hours_start);
    const endTime = this.parseTimeToMinutes(preferences.quiet_hours_end);

    // Handle overnight quiet hours (e.g., 22:00 to 06:00)
    if (startTime > endTime) {
      return currentTimeMinutes >= startTime || currentTimeMinutes <= endTime;
    } else {
      return currentTimeMinutes >= startTime && currentTimeMinutes <= endTime;
    }
  }

  private shouldOverrideQuietHours(alert: AdvancedAlert, preferences: NotificationPreferences): boolean {
    return preferences.priority_override && alert.priority === 'critical';
  }

  private async exceedsDailyLimits(userId: string, preferences: NotificationPreferences): Promise<boolean> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('alert_triggers')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .gte('triggered_at', todayStart.toISOString());

    return (count || 0) >= preferences.max_daily_alerts;
  }

  private async queueForDigest(
    alert: AdvancedAlert, 
    trigger: AlertTrigger, 
    preferences: NotificationPreferences
  ): Promise<void> {
    // Add to digest queue - would be processed by a separate digest service
    console.log(`Queued for digest: ${alert.name}`);
  }

  // ====== USER PREFERENCES ======

  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    // Check cache first
    let preferences = this.userPreferencesCache.get(userId);
    
    if (!preferences) {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data) {
        preferences = data as NotificationPreferences;
        this.userPreferencesCache.set(userId, preferences);
      } else {
        // Create default preferences
        preferences = this.getDefaultPreferences(userId);
        await this.saveUserPreferences(preferences);
      }
    }

    return preferences;
  }

  private getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      user_id: userId,
      channels: {
        in_app: true,
        email: false,
        push: true,
        sms: false
      },
      quiet_hours_enabled: false,
      timezone: 'UTC',
      priority_override: true,
      max_daily_alerts: 50,
      grouping_enabled: true,
      sound_enabled: true,
      sound_volume: 0.7,
      custom_sounds: {},
      auto_pause_threshold: 10,
      learning_rate: 0.1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  private async saveUserPreferences(preferences: NotificationPreferences): Promise<void> {
    await supabase
      .from('notification_preferences')
      .upsert([preferences]);
    
    this.userPreferencesCache.set(preferences.user_id, preferences);
  }

  // ====== UTILITY METHODS ======

  private parseTimeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private async logDelivery(
    triggerId: string, 
    channels: NotificationChannel[], 
    status: 'success' | 'error',
    error?: any
  ): Promise<void> {
    // Log delivery status for analytics
    console.log(`Notification delivery ${status} for trigger ${triggerId} via ${channels.join(', ')}`);
    if (error) {
      console.error('Delivery error:', error);
    }
  }

  // ====== PUBLIC API ======

  async updateUserPreferences(userId: string, updates: Partial<NotificationPreferences>): Promise<void> {
    const current = await this.getUserPreferences(userId);
    const updated = { ...current, ...updates, updated_at: new Date().toISOString() };
    await this.saveUserPreferences(updated);
  }

  async acknowledgeAlert(triggerId: string): Promise<void> {
    // Mark alert as viewed to prevent escalation
    await supabase
      .from('alert_triggers')
      .update({ 
        viewed_at: new Date().toISOString(),
        action_taken: 'viewed'
      })
      .eq('id', triggerId);

    // Remove from escalation queue if present
    this.escalationQueue.delete(triggerId);
  }

  async snoozeAlert(alertId: string, minutes: number): Promise<void> {
    // Temporarily disable the alert
    await supabase
      .from('alerts')
      .update({ status: 'paused' })
      .eq('id', alertId);

    // Schedule re-activation
    setTimeout(async () => {
      await supabase
        .from('alerts')
        .update({ status: 'active' })
        .eq('id', alertId);
    }, minutes * 60 * 1000);
  }
}

// ====== INTERFACES ======

interface EscalationEntry {
  alertId: string;
  triggerId: string;
  scheduledTime: number;
  escalationChannels: NotificationChannel[];
  originalChannels: NotificationChannel[];
}

// Export singleton
export const smartRoutingEngine = SmartRoutingEngine.getInstance();