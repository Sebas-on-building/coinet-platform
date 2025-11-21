import {
  WebhookEndpoint,
  WebhookDelivery,
  WebhookTransformationTemplate,
  WebhookEvent,
  WebhookMetrics,
  ApiResponse,
} from '@/types';
import { WebhookSignatureUtil } from '@/utils/WebhookSignature';
import { WebhookDeliveryManager, DeliveryResult } from './webhooks/WebhookDeliveryManager';
import { WebhookTransformationEngine, TransformationResult } from './webhooks/WebhookTransformationEngine';
import { Logger } from '@/utils/Logger';

export interface WebhookEventData {
  eventType: string;
  source: 'email' | 'sms';
  sourceId: string;
  payload: Record<string, any>;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export class WebhookService {
  private static instance: WebhookService;
  private logger: Logger;
  private signatureUtil: WebhookSignatureUtil;
  private deliveryManager: WebhookDeliveryManager;
  private transformationEngine: WebhookTransformationEngine;

  // In-memory storage for webhook endpoints (in production, use database)
  private webhookEndpoints: Map<string, WebhookEndpoint> = new Map();
  private webhookDeliveries: Map<string, WebhookDelivery[]> = new Map();
  private webhookEvents: Map<string, WebhookEvent> = new Map();

  private constructor() {
    this.logger = Logger.getInstance();
    this.signatureUtil = WebhookSignatureUtil.getInstance();
    this.deliveryManager = WebhookDeliveryManager.getInstance();
    this.transformationEngine = WebhookTransformationEngine.getInstance();
    this.initialize();
  }

  static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  private async initialize(): Promise<void> {
    this.logger.info('Initializing WebhookService...');

    // Start cleanup tasks
    this.deliveryManager.startCleanupTask();

    this.logger.info('WebhookService initialized successfully');
  }

  /**
   * Register a webhook endpoint
   */
  async registerWebhookEndpoint(webhookEndpoint: Omit<WebhookEndpoint, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse> {
    try {
      // Validate webhook endpoint
      const validation = this.deliveryManager.validateWebhookEndpoint({
        ...webhookEndpoint,
        id: '', // Temporary ID for validation
      } as WebhookEndpoint);

      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Webhook endpoint validation failed: ${validation.errors.join(', ')}`,
          },
        };
      }

      // Generate webhook ID and secret
      const webhookId = `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const secret = this.signatureUtil.generateWebhookSecret();

      const newEndpoint: WebhookEndpoint = {
        ...webhookEndpoint,
        id: webhookId,
        secret,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: webhookEndpoint.createdBy,
      };

      this.webhookEndpoints.set(webhookId, newEndpoint);

      this.logger.info('Webhook endpoint registered', {
        webhookId,
        name: webhookEndpoint.name,
        events: webhookEndpoint.events,
      });

      return {
        success: true,
        data: {
          webhookId,
          secret, // Return secret only once for security
        },
      };

    } catch (error) {
      this.logger.error('Failed to register webhook endpoint', { error, webhookEndpoint });
      return {
        success: false,
        error: {
          code: 'REGISTRATION_ERROR',
          message: `Webhook endpoint registration failed: ${error}`,
        },
      };
    }
  }

  /**
   * Update webhook endpoint
   */
  async updateWebhookEndpoint(webhookId: string, updates: Partial<WebhookEndpoint>): Promise<ApiResponse> {
    try {
      const existing = this.webhookEndpoints.get(webhookId);
      if (!existing) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Webhook endpoint not found: ${webhookId}`,
          },
        };
      }

      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };

      this.webhookEndpoints.set(webhookId, updated);

      this.logger.info('Webhook endpoint updated', { webhookId, updates });

      return {
        success: true,
        data: { webhookId },
      };

    } catch (error) {
      this.logger.error('Failed to update webhook endpoint', { error, webhookId, updates });
      return {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: `Webhook endpoint update failed: ${error}`,
        },
      };
    }
  }

  /**
   * Delete webhook endpoint
   */
  async deleteWebhookEndpoint(webhookId: string): Promise<ApiResponse> {
    try {
      const deleted = this.webhookEndpoints.delete(webhookId);
      if (!deleted) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Webhook endpoint not found: ${webhookId}`,
          },
        };
      }

      this.logger.info('Webhook endpoint deleted', { webhookId });

      return {
        success: true,
        data: { webhookId },
      };

    } catch (error) {
      this.logger.error('Failed to delete webhook endpoint', { error, webhookId });
      return {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: `Webhook endpoint deletion failed: ${error}`,
        },
      };
    }
  }

  /**
   * Get webhook endpoint
   */
  getWebhookEndpoint(webhookId: string): WebhookEndpoint | null {
    return this.webhookEndpoints.get(webhookId) || null;
  }

  /**
   * Get all webhook endpoints
   */
  getAllWebhookEndpoints(): WebhookEndpoint[] {
    return Array.from(this.webhookEndpoints.values());
  }

  /**
   * Get webhook endpoints by event type
   */
  getWebhookEndpointsByEvent(eventType: string): WebhookEndpoint[] {
    return Array.from(this.webhookEndpoints.values()).filter(endpoint =>
      endpoint.events.includes(eventType as any) && endpoint.status === 'active'
    );
  }

  /**
   * Deliver webhook event
   */
  async deliverWebhookEvent(eventData: WebhookEventData): Promise<void> {
    try {
      // Create webhook event
      const eventId = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const webhookEvent: WebhookEvent = {
        id: eventId,
        type: eventData.eventType as any,
        source: eventData.source,
        sourceId: eventData.sourceId,
        payload: eventData.payload,
        timestamp: eventData.timestamp || new Date(),
      };

      if (eventData.metadata) {
        webhookEvent.metadata = eventData.metadata;
      }

      this.webhookEvents.set(eventId, webhookEvent);

      // Get relevant webhook endpoints
      const relevantEndpoints = this.getWebhookEndpointsByEvent(eventData.eventType);

      if (relevantEndpoints.length === 0) {
        this.logger.debug('No webhook endpoints found for event type', { eventType: eventData.eventType });
        return;
      }

      this.logger.info('Delivering webhook event', {
        eventId,
        eventType: eventData.eventType,
        endpointsCount: relevantEndpoints.length,
      });

      // Deliver to all relevant endpoints
      const deliveryPromises = relevantEndpoints.map(async (endpoint) => {
        return this.deliverToEndpoint(endpoint, webhookEvent);
      });

      await Promise.allSettled(deliveryPromises);

    } catch (error) {
      this.logger.error('Failed to deliver webhook event', { error, eventData });
    }
  }

  /**
   * Deliver webhook to specific endpoint
   */
  private async deliverToEndpoint(endpoint: WebhookEndpoint, webhookEvent: WebhookEvent): Promise<void> {
    try {
      const deliveryId = `delivery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Transform payload if transformation template is specified
      let payload = webhookEvent.payload;
      if (endpoint.transformationTemplate) {
        const transformation = await this.transformationEngine.transformPayload(
          endpoint.transformationTemplate,
          payload
        );
        payload = JSON.parse(transformation.transformedPayload);
      }

      // Deliver webhook
      const deliveryResult = await this.deliveryManager.deliverWebhook(
        endpoint,
        webhookEvent.type,
        payload,
        deliveryId
      );

      // Record delivery
      const delivery: WebhookDelivery = {
        id: deliveryId,
        webhookId: endpoint.id,
        eventId: webhookEvent.id,
        eventType: webhookEvent.type,
        payload,
        signature: this.signatureUtil.generateIdempotencyKey(endpoint.id, deliveryId),
        status: deliveryResult.success ? 'sent' : 'failed',
        attempts: deliveryResult.attempts.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (deliveryResult.finalError) {
        delivery.lastError = deliveryResult.finalError;
      }

      if (deliveryResult.deliveredAt) {
        delivery.deliveredAt = deliveryResult.deliveredAt;
      }

      if (!deliveryResult.success && deliveryResult.attempts.length > 0) {
        const lastAttempt = deliveryResult.attempts[deliveryResult.attempts.length - 1];
        if (lastAttempt) {
          delivery.nextRetryAt = lastAttempt.timestamp;
        }
      }

      const deliveries = this.webhookDeliveries.get(endpoint.id) || [];
      deliveries.push(delivery);
      this.webhookDeliveries.set(endpoint.id, deliveries);

      this.logger.info('Webhook delivery completed', {
        webhookId: endpoint.id,
        eventId: webhookEvent.id,
        deliveryId,
        success: deliveryResult.success,
        attempts: deliveryResult.attempts.length,
      });

    } catch (error) {
      this.logger.error('Failed to deliver webhook to endpoint', { error, endpoint, webhookEvent });
    }
  }

  /**
   * Handle incoming webhook from external service (for verification)
   */
  async handleIncomingWebhook(
    webhookId: string,
    payload: Record<string, any>,
    headers: Record<string, string>
  ): Promise<ApiResponse> {
    try {
      const endpoint = this.webhookEndpoints.get(webhookId);
      if (!endpoint) {
        return {
          success: false,
          error: {
            code: 'WEBHOOK_NOT_FOUND',
            message: `Webhook endpoint not found: ${webhookId}`,
          },
        };
      }

      // Verify webhook signature
      const isValidSignature = this.signatureUtil.verifyWebhookSignature(payload, headers, webhookId);
      if (!isValidSignature) {
        return {
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Webhook signature verification failed',
          },
        };
      }

      this.logger.info('Incoming webhook verified and processed', { webhookId, payload });

      return {
        success: true,
        data: { processed: true },
      };

    } catch (error) {
      this.logger.error('Failed to handle incoming webhook', { error, webhookId, payload });
      return {
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: `Webhook processing failed: ${error}`,
        },
      };
    }
  }

  /**
   * Get webhook delivery history
   */
  getWebhookDeliveries(webhookId?: string, eventType?: string): WebhookDelivery[] {
    let deliveries: WebhookDelivery[] = [];

    if (webhookId) {
      deliveries = this.webhookDeliveries.get(webhookId) || [];
    } else {
      // Get all deliveries
      for (const deliveryList of this.webhookDeliveries.values()) {
        deliveries.push(...deliveryList);
      }
    }

    if (eventType) {
      deliveries = deliveries.filter(delivery => delivery.eventType === eventType);
    }

    return deliveries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get webhook delivery by ID
   */
  getWebhookDelivery(deliveryId: string): WebhookDelivery | null {
    for (const deliveryList of this.webhookDeliveries.values()) {
      const delivery = deliveryList.find(d => d.id === deliveryId);
      if (delivery) {
        return delivery;
      }
    }
    return null;
  }

  /**
   * Replay failed webhook delivery
   */
  async replayWebhookDelivery(deliveryId: string): Promise<ApiResponse> {
    try {
      const delivery = this.getWebhookDelivery(deliveryId);
      if (!delivery) {
        return {
          success: false,
          error: {
            code: 'DELIVERY_NOT_FOUND',
            message: `Webhook delivery not found: ${deliveryId}`,
          },
        };
      }

      const endpoint = this.webhookEndpoints.get(delivery.webhookId);
      if (!endpoint) {
        return {
          success: false,
          error: {
            code: 'ENDPOINT_NOT_FOUND',
            message: `Webhook endpoint not found: ${delivery.webhookId}`,
          },
        };
      }

      // Get original event
      const webhookEvent = this.webhookEvents.get(delivery.eventId);
      if (!webhookEvent) {
        return {
          success: false,
          error: {
            code: 'EVENT_NOT_FOUND',
            message: `Webhook event not found: ${delivery.eventId}`,
          },
        };
      }

      // Re-deliver
      await this.deliverToEndpoint(endpoint, webhookEvent);

      this.logger.info('Webhook delivery replayed', { deliveryId });

      return {
        success: true,
        data: { deliveryId },
      };

    } catch (error) {
      this.logger.error('Failed to replay webhook delivery', { error, deliveryId });
      return {
        success: false,
        error: {
          code: 'REPLAY_ERROR',
          message: `Webhook delivery replay failed: ${error}`,
        },
      };
    }
  }

  /**
   * Get webhook metrics
   */
  getWebhookMetrics(endpointId?: string): WebhookMetrics {
    const deliveries = endpointId ? this.getWebhookDeliveries(endpointId) : this.getAllWebhookEndpoints().flatMap(e => this.getWebhookDeliveries(e.id));

    const totalDeliveries = deliveries.length;
    const successfulDeliveries = deliveries.filter(d => d.status === 'sent').length;
    const failedDeliveries = deliveries.filter(d => d.status === 'failed').length;

    // Calculate average delivery time
    const successfulDeliveriesWithTime = deliveries.filter(d => d.status === 'sent' && d.deliveredAt);
    const averageDeliveryTime = successfulDeliveriesWithTime.length > 0
      ? successfulDeliveriesWithTime.reduce((sum, d) =>
          sum + (d.deliveredAt!.getTime() - d.createdAt.getTime()), 0
        ) / successfulDeliveriesWithTime.length
      : 0;

    const deliveryRate = totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0;

    // Calculate endpoint performance
    const endpointPerformance: Record<string, any> = {};
    const endpointDeliveries = new Map<string, WebhookDelivery[]>();

    for (const delivery of deliveries) {
      const endpointDeliveriesList = endpointDeliveries.get(delivery.webhookId) || [];
      endpointDeliveriesList.push(delivery);
      endpointDeliveries.set(delivery.webhookId, endpointDeliveriesList);
    }

    for (const [endpointId, endpointDeliveryList] of endpointDeliveries) {
      const totalAttempts = endpointDeliveryList.reduce((sum, d) => sum + d.attempts, 0);
      const successfulAttempts = endpointDeliveryList.filter(d => d.status === 'sent').length;
      const averageResponseTime = successfulAttempts > 0 // Ensure successfulAttempts is greater than 0
        ? endpointDeliveryList
            .filter(d => d.status === 'sent')
            .reduce((sum, d) => sum + (d.deliveredAt!.getTime() - d.createdAt.getTime()), 0) / successfulAttempts
        : 0;

      endpointPerformance[endpointId] = {
        totalAttempts,
        successfulAttempts,
        averageResponseTime: Math.round(averageResponseTime),
        errorRate: totalAttempts > 0 ? ((totalAttempts - successfulAttempts) / totalAttempts) * 100 : 0, // Handle totalAttempts being 0
      };
    }

    return {
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      averageDeliveryTime: Math.round(averageDeliveryTime),
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      retryRate: totalDeliveries > 0 ? ((deliveries.filter(d => d.attempts > 1).length / totalDeliveries) * 100) : 0,
      endpointPerformance,
    };
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<any> {
    try {
      const deliveryStats = this.deliveryManager.getDeliveryStatistics();
      const endpoints = this.getAllWebhookEndpoints();

      return {
        status: 'healthy',
        endpoints: {
          total: endpoints.length,
          active: endpoints.filter(e => e.status === 'active').length,
          inactive: endpoints.filter(e => e.status === 'inactive').length,
        },
        deliveries: {
          active: deliveryStats.activeDeliveries,
          totalAttempts: deliveryStats.totalAttempts,
          averageResponseTime: deliveryStats.averageResponseTime,
        },
        timestamp: new Date(),
      };
    } catch (error: unknown) { // Explicitly type error
      return {
        status: 'error',
        error: (error as Error).message, // Cast error to Error to access message
        timestamp: new Date(),
      };
    }
  }
}
