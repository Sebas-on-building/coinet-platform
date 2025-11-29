import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { WebhookEndpoint, WebhookDelivery, WebhookRetryPolicy } from '@/types';
import { WebhookSignatureUtil } from '@/utils/WebhookSignature';
import { Logger } from '@/utils/Logger';

export interface DeliveryAttempt {
  attemptNumber: number;
  timestamp: Date;
  statusCode?: number;
  responseTime: number;
  error?: string;
  success: boolean;
}

export interface DeliveryResult {
  success: boolean;
  attempts: DeliveryAttempt[];
  finalError?: string;
  deliveredAt?: Date;
}

export class WebhookDeliveryManager {
  private static instance: WebhookDeliveryManager;
  private logger: Logger;
  private signatureUtil: WebhookSignatureUtil;
  private activeDeliveries: Map<string, DeliveryAttempt[]> = new Map();
  private axiosInstances: Map<string, AxiosInstance> = new Map();

  private constructor() {
    this.logger = Logger.getInstance();
    this.signatureUtil = WebhookSignatureUtil.getInstance();
  }

  static getInstance(): WebhookDeliveryManager {
    if (!WebhookDeliveryManager.instance) {
      WebhookDeliveryManager.instance = new WebhookDeliveryManager();
    }
    return WebhookDeliveryManager.instance;
  }

  /**
   * Deliver webhook with retry logic and exponential backoff
   */
  async deliverWebhook(
    webhookEndpoint: WebhookEndpoint,
    eventType: string,
    payload: Record<string, any>,
    deliveryId: string,
    maxRetries?: number
  ): Promise<DeliveryResult> {
    const maxRetryAttempts = maxRetries || webhookEndpoint.maxRetries || webhookEndpoint.retryPolicy?.maxRetries || 3;
    const attempts: DeliveryAttempt[] = [];

    for (let attempt = 1; attempt <= maxRetryAttempts; attempt++) {
      const attemptResult = await this.attemptDelivery(webhookEndpoint, eventType, payload, deliveryId, attempt);

      attempts.push(attemptResult);

      if (attemptResult.success) {
        this.logger.info('Webhook delivered successfully', {
          webhookId: webhookEndpoint.id,
          eventType,
          deliveryId,
          attempt,
        });

        return {
          success: true,
          attempts,
          deliveredAt: attemptResult.timestamp,
        };
      }

      // If this is the last attempt, break
      if (attempt === maxRetryAttempts) {
        break;
      }

      // Calculate delay for next retry
      const delay = this.calculateRetryDelay(attempt, webhookEndpoint.retryPolicy);
      this.logger.warn('Webhook delivery failed, retrying', {
        webhookId: webhookEndpoint.id,
        eventType,
        deliveryId,
        attempt,
        delay,
        error: attemptResult.error,
      });

      await this.delay(delay);
    }

    const finalError = attempts[attempts.length - 1]?.error || 'All delivery attempts failed';

    this.logger.error('Webhook delivery failed after all retries', {
      webhookId: webhookEndpoint.id,
      eventType,
      deliveryId,
      attempts: attempts.length,
      finalError,
    });

    return {
      success: false,
      attempts,
      finalError,
    };
  }

  /**
   * Attempt single webhook delivery
   */
  private async attemptDelivery(
    webhookEndpoint: WebhookEndpoint,
    eventType: string,
    payload: Record<string, any>,
    deliveryId: string,
    attemptNumber: number
  ): Promise<DeliveryAttempt> {
    const startTime = Date.now();
    const attempt: DeliveryAttempt = {
      attemptNumber,
      timestamp: new Date(),
      responseTime: 0, // Initialize responseTime
      success: false,
    };

    try {
      // Get or create axios instance for this endpoint
      const axiosInstance = this.getAxiosInstance(webhookEndpoint);

      // Prepare signed payload
      const signedPayload = this.signatureUtil.createSignedPayload(
        webhookEndpoint.id,
        eventType,
        payload,
        webhookEndpoint.secret
      );

      // Prepare headers
      const headers = {
        ...this.signatureUtil.createWebhookHeaders(
          webhookEndpoint.id,
          eventType,
          payload,
          signedPayload.signature,
          signedPayload.timestamp,
          signedPayload.algorithm
        ),
        ...webhookEndpoint.headers,
        'X-Delivery-ID': deliveryId,
        'X-Attempt-Number': attemptNumber.toString(),
      };

      // Make the HTTP request
      const response: AxiosResponse = await axiosInstance.post(
        webhookEndpoint.url,
        signedPayload.payload,
        {
          headers,
          timeout: webhookEndpoint.timeout || 30000, // 30 seconds default
        }
      );

      const responseTime = Date.now() - startTime;

      attempt.statusCode = response.status;
      attempt.responseTime = responseTime;
      attempt.success = response.status >= 200 && response.status < 300;

      if (attempt.success) {
        this.logger.debug('Webhook delivery successful', {
          webhookId: webhookEndpoint.id,
          deliveryId,
          attemptNumber,
          statusCode: response.status,
          responseTime,
        });
      } else {
        attempt.error = `HTTP ${response.status}: ${response.statusText}`;
        this.logger.warn('Webhook delivery returned error status', {
          webhookId: webhookEndpoint.id,
          deliveryId,
          attemptNumber,
          statusCode: response.status,
          responseTime,
        });
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      attempt.responseTime = responseTime;
      attempt.error = error.message || 'Unknown delivery error';

      this.logger.error('Webhook delivery failed', {
        webhookId: webhookEndpoint.id,
        deliveryId,
        attemptNumber,
        error: attempt.error,
        responseTime,
      });
    }

    return attempt;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number, retryPolicy?: WebhookRetryPolicy): number {
    const baseDelay = retryPolicy?.initialDelay || 1000; // 1 second default
    const maxDelay = retryPolicy?.maxDelay || 300000; // 5 minutes default
    const multiplier = retryPolicy?.backoffMultiplier || 2;
    const exponentialBackoff = retryPolicy?.exponentialBackoff !== false; // Default to true

    let delay: number;

    if (exponentialBackoff) {
      delay = baseDelay * Math.pow(multiplier, attempt - 1);
    } else {
      delay = baseDelay * attempt;
    }

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    delay += jitter;

    // Cap at max delay
    return Math.min(delay, maxDelay);
  }

  /**
   * Get or create axios instance for webhook endpoint
   */
  private getAxiosInstance(webhookEndpoint: WebhookEndpoint): AxiosInstance {
    const cacheKey = `${webhookEndpoint.id}-${webhookEndpoint.url}`;

    if (this.axiosInstances.has(cacheKey)) {
      return this.axiosInstances.get(cacheKey)!;
    }

    const instance = axios.create({
      timeout: webhookEndpoint.timeout || 30000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    });

    // Add response interceptor for logging
    instance.interceptors.response.use(
      (response) => {
        this.logger.debug('Webhook response received', {
          webhookId: webhookEndpoint.id,
          status: response.status,
          headers: response.headers,
        });
        return response;
      },
      (error) => {
        this.logger.error('Webhook request failed', {
          webhookId: webhookEndpoint.id,
          error: error.message,
          config: error.config,
        });
        return Promise.reject(error);
      }
    );

    this.axiosInstances.set(cacheKey, instance);
    return instance;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any, retryPolicy?: WebhookRetryPolicy): boolean {
    if (!retryPolicy || !retryPolicy.retryableErrors) {
      // Default retryable errors
      return error.code === 'ECONNRESET' ||
             error.code === 'ETIMEDOUT' ||
             error.code === 'ENOTFOUND' ||
             (error.response && error.response.status >= 500);
    }

    // Check against configured retryable errors
    const errorCode = error.code || (error.response && error.response.status?.toString());
    return retryPolicy.retryableErrors.includes(errorCode);
  }

  /**
   * Track delivery attempt
   */
  trackDeliveryAttempt(
    webhookId: string,
    deliveryId: string,
    attempt: DeliveryAttempt
  ): void {
    const key = `${webhookId}-${deliveryId}`;
    const attempts = this.activeDeliveries.get(key) || [];
    attempts.push(attempt);
    this.activeDeliveries.set(key, attempts);
  }

  /**
   * Get delivery attempts for a webhook
   */
  getDeliveryAttempts(webhookId: string, deliveryId: string): DeliveryAttempt[] {
    const key = `${webhookId}-${deliveryId}`;
    return this.activeDeliveries.get(key) || [];
  }

  /**
   * Clean up old delivery attempts
   */
  cleanupOldDeliveries(maxAge: number = 24 * 60 * 60 * 1000): void { // 24 hours default
    const cutoffTime = Date.now() - maxAge;

    for (const [key, attempts] of this.activeDeliveries.entries()) {
      const filtered = attempts.filter(attempt => attempt.timestamp.getTime() > cutoffTime);
      if (filtered.length !== attempts.length) {
        if (filtered.length === 0) {
          this.activeDeliveries.delete(key);
        } else {
          this.activeDeliveries.set(key, filtered);
        }
      }
    }

    this.logger.debug('Cleaned up old webhook delivery attempts');
  }

  /**
   * Validate webhook endpoint configuration
   */
  validateWebhookEndpoint(webhookEndpoint: WebhookEndpoint): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate URL
    if (!this.signatureUtil.validateWebhookUrl(webhookEndpoint.url)) {
      errors.push('Invalid webhook URL - must be HTTPS in production');
    }

    // Validate events array
    if (!webhookEndpoint.events || webhookEndpoint.events.length === 0) {
      errors.push('At least one event type must be specified');
    }

    // Validate retry policy
    if (webhookEndpoint.retryPolicy) {
      if (webhookEndpoint.retryPolicy.maxRetries < 0) {
        errors.push('Max retries must be non-negative');
      }
      if (webhookEndpoint.retryPolicy.initialDelay < 0) {
        errors.push('Initial delay must be non-negative');
      }
      if (webhookEndpoint.retryPolicy.maxDelay < webhookEndpoint.retryPolicy.initialDelay) {
        errors.push('Max delay must be greater than or equal to initial delay');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Start cleanup task for old deliveries
   */
  startCleanupTask(interval: number = 60 * 60 * 1000): void { // 1 hour default
    setInterval(() => {
      this.cleanupOldDeliveries();
    }, interval);

    this.logger.info('Started webhook delivery cleanup task');
  }

  /**
   * Get delivery statistics
   */
  getDeliveryStatistics(): {
    activeDeliveries: number;
    totalAttempts: number;
    averageResponseTime: number;
  } {
    const allAttempts = Array.from(this.activeDeliveries.values()).flat();
    const totalAttempts = allAttempts.length;

    if (totalAttempts === 0) {
      return {
        activeDeliveries: 0,
        totalAttempts: 0,
        averageResponseTime: 0,
      };
    }

    const successfulAttempts = allAttempts.filter(attempt => attempt.success);
    const averageResponseTime = successfulAttempts.reduce((sum, attempt) => sum + attempt.responseTime, 0) / successfulAttempts.length;

    return {
      activeDeliveries: this.activeDeliveries.size,
      totalAttempts,
      averageResponseTime: Math.round(averageResponseTime),
    };
  }
}
