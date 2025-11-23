import { SmsStatus, SmsEvent } from '@/types';
import { Logger } from '@/utils/Logger';

export interface SmsDeliveryMetrics {
  totalMessages: number;
  sent: number;
  delivered: number;
  failed: number;
  undelivered: number;
  deliveryRate: number;
  averageDeliveryTime: number;
  bounceRate: number;
  optOutRate: number;
}

export class SmsStatusTracker {
  private static instance: SmsStatusTracker;
  private logger: Logger;

  // In-memory storage for SMS status (in production, use database)
  private smsStatuses: Map<string, SmsStatus[]> = new Map();
  private smsEvents: Map<string, SmsEvent[]> = new Map();

  // Performance metrics
  private deliveryMetrics: SmsDeliveryMetrics = {
    totalMessages: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    undelivered: 0,
    deliveryRate: 0,
    averageDeliveryTime: 0,
    bounceRate: 0,
    optOutRate: 0,
  };

  private constructor() {
    this.logger = Logger.getInstance();
    this.startMetricsCalculation();
  }

  static getInstance(): SmsStatusTracker {
    if (!SmsStatusTracker.instance) {
      SmsStatusTracker.instance = new SmsStatusTracker();
    }
    return SmsStatusTracker.instance;
  }

  /**
   * Record SMS status update from provider webhook
   */
  async recordStatusUpdate(
    messageId: string,
    provider: string,
    status: SmsStatus['status'],
    timestamp: Date = new Date(),
    errorCode?: string,
    errorMessage?: string,
    webhookData?: Record<string, any>
  ): Promise<void> {
    const smsStatus: SmsStatus = {
      id: `${messageId}-${status}-${Date.now()}`,
      messageId,
      status,
      timestamp,
      provider,
    };

    if (errorCode) {
      smsStatus.errorCode = errorCode;
    }

    if (errorMessage) {
      smsStatus.errorMessage = errorMessage;
    }

    // Update status history
    const statuses = this.smsStatuses.get(messageId) || [];
    statuses.push(smsStatus);
    this.smsStatuses.set(messageId, statuses);

    // Create event record
    const smsEvent: SmsEvent = {
      id: `${messageId}-${status}-${timestamp.getTime()}`,
      type: this.mapStatusToEventType(status),
      smsId: messageId,
      messageId,
      provider,
      destination: 'unknown', // Would need to be extracted from message data
      timestamp,
    };

    if (webhookData) {
      smsEvent.metadata = webhookData;
      smsEvent.webhookData = webhookData;
    }

    if (errorCode) {
      smsEvent.errorCode = errorCode;
    }

    if (errorMessage) {
      smsEvent.errorMessage = errorMessage;
    }

    const events = this.smsEvents.get(messageId) || [];
    events.push(smsEvent);
    this.smsEvents.set(messageId, events);

    // Update metrics
    this.updateMetrics(smsEvent);

    this.logger.info('SMS status updated', {
      messageId,
      provider,
      status,
      errorCode,
      errorMessage,
    });
  }

  /**
   * Get status history for a message
   */
  getMessageStatusHistory(messageId: string): SmsStatus[] {
    return this.smsStatuses.get(messageId) || [];
  }

  /**
   * Get events for a message
   */
  getMessageEvents(messageId: string): SmsEvent[] {
    return this.smsEvents.get(messageId) || [];
  }

  /**
   * Get current status for a message
   */
  getCurrentMessageStatus(messageId: string): SmsStatus | null {
    const statuses = this.getMessageStatusHistory(messageId);
    if (statuses.length === 0) {
      return null;
    }

    // Return the most recent status
    return statuses[statuses.length - 1] || null;
  }

  /**
   * Check if message was successfully delivered
   */
  isMessageDelivered(messageId: string): boolean {
    const currentStatus = this.getCurrentMessageStatus(messageId);
    return currentStatus?.status === 'delivered';
  }

  /**
   * Check if message failed
   */
  isMessageFailed(messageId: string): boolean {
    const currentStatus = this.getCurrentMessageStatus(messageId);
    return currentStatus?.status === 'failed' || currentStatus?.status === 'undelivered';
  }

  /**
   * Get delivery metrics for time period
   */
  getDeliveryMetrics(
    startDate?: Date,
    endDate?: Date,
    provider?: string
  ): SmsDeliveryMetrics {
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    const end = endDate || new Date();

    const filteredEvents = Array.from(this.smsEvents.values())
      .flat()
      .filter(event => {
        const eventTime = event.timestamp;
        return eventTime >= start && eventTime <= end &&
               (!provider || event.provider === provider);
      });

    const metrics: SmsDeliveryMetrics = {
      totalMessages: filteredEvents.length,
      sent: filteredEvents.filter(e => e.type === 'sent').length,
      delivered: filteredEvents.filter(e => e.type === 'delivered').length,
      failed: filteredEvents.filter(e => e.type === 'failed').length,
      undelivered: filteredEvents.filter(e => e.type === 'undelivered').length,
      deliveryRate: 0,
      averageDeliveryTime: 0,
      bounceRate: 0,
      optOutRate: 0,
    };

    // Calculate rates
    if (metrics.totalMessages > 0) {
      metrics.deliveryRate = (metrics.delivered / metrics.totalMessages) * 100;
      metrics.bounceRate = (metrics.failed / metrics.totalMessages) * 100;
      metrics.optOutRate = (filteredEvents.filter(e => e.type === 'opted-out').length / metrics.totalMessages) * 100;
    }

    // Calculate average delivery time (simplified)
    const deliveredEvents = filteredEvents.filter(e => e.type === 'delivered');
    if (deliveredEvents.length > 0) {
      // This is a simplified calculation - in reality, you'd track send time vs delivery time
      metrics.averageDeliveryTime = 30; // seconds (placeholder)
    }

    return metrics;
  }

  /**
   * Get provider performance comparison
   */
  getProviderPerformance(startDate?: Date, endDate?: Date): Map<string, SmsDeliveryMetrics> {
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const providerMetrics = new Map<string, SmsDeliveryMetrics>();

    // Get unique providers
    const providers = Array.from(new Set(
      Array.from(this.smsEvents.values()).flat().map(event => event.provider)
    ));

    for (const provider of providers) {
      providerMetrics.set(provider, this.getDeliveryMetrics(start, end, provider));
    }

    return providerMetrics;
  }

  /**
   * Handle webhook from SMS provider
   */
  async handleProviderWebhook(
    provider: string,
    webhookData: Record<string, any>
  ): Promise<void> {
    try {
      switch (provider) {
        case 'twilio':
          await this.handleTwilioWebhook(webhookData);
          break;
        case 'nexmo':
          await this.handleNexmoWebhook(webhookData);
          break;
        default:
          this.logger.warn(`Unknown SMS provider for webhook: ${provider}`);
      }
    } catch (error) {
      this.logger.error('Failed to handle SMS provider webhook', { error, provider, webhookData });
    }
  }

  private async handleTwilioWebhook(webhookData: Record<string, any>): Promise<void> {
    const messageId = webhookData.MessageSid || webhookData.SmsSid;
    const status = this.mapTwilioWebhookStatus(webhookData.MessageStatus);

    if (messageId && status) {
      await this.recordStatusUpdate(
        messageId,
        'twilio',
        status,
        new Date(),
        webhookData.ErrorCode?.toString(),
        webhookData.ErrorMessage,
        webhookData
      );
    }
  }

  private async handleNexmoWebhook(webhookData: Record<string, any>): Promise<void> {
    const messageId = webhookData.messageId;
    const status = this.mapNexmoWebhookStatus(webhookData.status);

    if (messageId && status) {
      await this.recordStatusUpdate(
        messageId,
        'nexmo',
        status,
        new Date(),
        webhookData.err_code?.toString() || undefined, // Make optional
        webhookData.error_text || undefined, // Make optional
        webhookData
      );
    }
  }

  private mapTwilioWebhookStatus(twilioStatus: string): SmsStatus['status'] | undefined { // Change return type to allow undefined
    switch (twilioStatus) {
      case 'queued':
        return 'queued';
      case 'sent':
        return 'sent';
      case 'delivered':
        return 'delivered';
      case 'failed':
        return 'failed';
      case 'undelivered':
        return 'undelivered';
      default:
        return undefined; // Return undefined instead of null
    }
  }

  private mapNexmoWebhookStatus(nexmoStatus: string): SmsStatus['status'] | undefined { // Change return type to allow undefined
    switch (nexmoStatus) {
      case '0':
        return 'sent';
      case '1':
      case '2':
      case '3':
        return 'sent';
      case '4':
        return 'delivered';
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
      case '10':
      case '11':
      case '12':
      case '13':
      case '14':
      case '15':
      case '16':
        return 'failed';
      default:
        return undefined; // Return undefined instead of null
    }
  }

  private mapStatusToEventType(status: SmsStatus['status']): SmsEvent['type'] {
    switch (status) {
      case 'queued':
      case 'sent':
        return 'sent';
      case 'delivered':
        return 'delivered';
      case 'failed':
        return 'failed';
      case 'undelivered':
        return 'undelivered';
      default:
        return 'sent';
    }
  }

  private updateMetrics(event: SmsEvent): void {
    this.deliveryMetrics.totalMessages++;

    switch (event.type) {
      case 'sent':
        this.deliveryMetrics.sent++;
        break;
      case 'delivered':
        this.deliveryMetrics.delivered++;
        break;
      case 'failed':
        this.deliveryMetrics.failed++;
        break;
      case 'undelivered':
        this.deliveryMetrics.undelivered++;
        break;
    }

    // Recalculate rates
    if (this.deliveryMetrics.totalMessages > 0) {
      this.deliveryMetrics.deliveryRate = (this.deliveryMetrics.delivered / this.deliveryMetrics.totalMessages) * 100;
      this.deliveryMetrics.bounceRate = (this.deliveryMetrics.failed / this.deliveryMetrics.totalMessages) * 100;
    }
  }

  private startMetricsCalculation(): void {
    // Recalculate metrics every 5 minutes
    setInterval(() => {
      this.calculateMetrics();
    }, 5 * 60 * 1000);

    this.logger.info('Started SMS status tracker metrics calculation');
  }

  private calculateMetrics(): void {
    // This would be more sophisticated in a real implementation
    // For now, we update metrics based on current events

    const allEvents = Array.from(this.smsEvents.values()).flat();
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentEvents = allEvents.filter(event => event.timestamp >= last24Hours);

    this.deliveryMetrics = {
      totalMessages: recentEvents.length,
      sent: recentEvents.filter(e => e.type === 'sent').length,
      delivered: recentEvents.filter(e => e.type === 'delivered').length,
      failed: recentEvents.filter(e => e.type === 'failed').length,
      undelivered: recentEvents.filter(e => e.type === 'undelivered').length,
      deliveryRate: 0,
      averageDeliveryTime: 0,
      bounceRate: 0,
      optOutRate: 0,
    };

    if (this.deliveryMetrics.totalMessages > 0) {
      this.deliveryMetrics.deliveryRate = (this.deliveryMetrics.delivered / this.deliveryMetrics.totalMessages) * 100;
      this.deliveryMetrics.bounceRate = (this.deliveryMetrics.failed / this.deliveryMetrics.totalMessages) * 100;
    }

    this.logger.debug('Recalculated SMS delivery metrics', this.deliveryMetrics);
  }

  /**
   * Get all SMS events for analytics
   */
  getAllEvents(
    startDate?: Date,
    endDate?: Date,
    provider?: string
  ): SmsEvent[] {
    let events = Array.from(this.smsEvents.values()).flat();

    if (startDate) {
      events = events.filter(event => event.timestamp >= startDate);
    }

    if (endDate) {
      events = events.filter(event => event.timestamp <= endDate);
    }

    if (provider) {
      events = events.filter(event => event.provider === provider);
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get SMS events by type
   */
  getEventsByType(type: SmsEvent['type']): SmsEvent[] {
    return Array.from(this.smsEvents.values())
      .flat()
      .filter(event => event.type === type)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clean up old records
   */
  cleanupOldRecords(daysToKeep: number = 90): void {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    // Clean up old statuses
    for (const [messageId, statuses] of this.smsStatuses.entries()) {
      const filtered = statuses.filter(status => status.timestamp >= cutoffDate);
      if (filtered.length !== statuses.length) {
        if (filtered.length === 0) {
          this.smsStatuses.delete(messageId);
        } else {
          this.smsStatuses.set(messageId, filtered);
        }
      }
    }

    // Clean up old events
    for (const [messageId, events] of this.smsEvents.entries()) {
      const filtered = events.filter(event => event.timestamp >= cutoffDate);
      if (filtered.length !== events.length) {
        if (filtered.length === 0) {
          this.smsEvents.delete(messageId);
        } else {
          this.smsEvents.set(messageId, filtered);
        }
      }
    }

    this.logger.info(`Cleaned up old SMS records (older than ${daysToKeep} days)`);
  }

  /**
   * Export SMS data for compliance/reporting
   */
  exportSmsData(
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json'
  ): string {
    const events = this.getAllEvents(startDate, endDate);

    if (format === 'csv') {
      // Simple CSV export
      const headers = ['id', 'type', 'messageId', 'provider', 'destination', 'timestamp', 'errorCode', 'errorMessage'];
      const csvRows = [
        headers.join(','),
        ...events.map(event => [
          event.id,
          event.type,
          event.messageId,
          event.provider,
          event.destination,
          event.timestamp.toISOString(),
          event.errorCode || '',
          event.errorMessage || '',
        ].join(','))
      ];

      return csvRows.join('\n');
    } else {
      return JSON.stringify(events, null, 2);
    }
  }
}
