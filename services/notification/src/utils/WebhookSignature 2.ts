import * as crypto from 'crypto';
import { WebhookSignature } from '@/types';
import { Logger } from './Logger';

export class WebhookSignatureUtil {
  private static instance: WebhookSignatureUtil;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  static getInstance(): WebhookSignatureUtil {
    if (!WebhookSignatureUtil.instance) {
      WebhookSignatureUtil.instance = new WebhookSignatureUtil();
    }
    return WebhookSignatureUtil.instance;
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  generateSignature(payload: string, secret: string, algorithm: 'hmac-sha256' | 'hmac-sha512' = 'hmac-sha256'): string {
    try {
      const hmac = crypto.createHmac(algorithm.replace('hmac-', ''), secret);
      hmac.update(payload);
      return hmac.digest('hex');
    } catch (error) {
      this.logger.error('Failed to generate webhook signature', { error, algorithm });
      throw new Error(`Failed to generate signature: ${error}`);
    }
  }

  /**
   * Verify HMAC signature for webhook payload
   */
  verifySignature(payload: string, signature: string, secret: string, algorithm: 'hmac-sha256' | 'hmac-sha512' = 'hmac-sha256'): boolean {
    try {
      const expectedSignature = this.generateSignature(payload, secret, algorithm);
      return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
    } catch (error) {
      this.logger.error('Failed to verify webhook signature', { error, algorithm });
      return false;
    }
  }

  /**
   * Generate signature for webhook endpoint
   */
  generateWebhookSignature(
    webhookId: string,
    eventType: string,
    payload: Record<string, any>,
    timestamp: Date = new Date()
  ): { signature: string; timestamp: number; algorithm: string } {
    // Create a canonical payload for signing
    const canonicalPayload = {
      webhookId,
      eventType,
      timestamp: timestamp.getTime(),
      payload,
    };

    const payloadString = JSON.stringify(canonicalPayload, Object.keys(canonicalPayload).sort());

    // Use a default secret or generate one based on webhook ID
    const secret = process.env.WEBHOOK_MASTER_SECRET || `webhook-secret-${webhookId}`;
    const signature = this.generateSignature(payloadString, secret);

    return {
      signature,
      timestamp: timestamp.getTime(),
      algorithm: 'hmac-sha256',
    };
  }

  /**
   * Verify webhook signature from headers
   */
  verifyWebhookSignature(
    payload: Record<string, any>,
    headers: Record<string, string>,
    webhookId: string
  ): boolean {
    try {
      const signature = headers['x-webhook-signature'];
      const timestamp = headers['x-webhook-timestamp'];
      const algorithm = headers['x-webhook-algorithm'] || 'hmac-sha256';

      if (!signature || !timestamp) {
        this.logger.warn('Missing webhook signature or timestamp', { headers });
        return false;
      }

      // Check timestamp freshness (within 5 minutes)
      const timestampNum = parseInt(timestamp);
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5 minutes

      if (now - timestampNum > maxAge) {
        this.logger.warn('Webhook signature timestamp too old', {
          timestamp: timestampNum,
          now,
          age: now - timestampNum
        });
        return false;
      }

      const canonicalPayload = {
        webhookId,
        eventType: payload.eventType,
        timestamp: timestampNum,
        payload,
      };

      const payloadString = JSON.stringify(canonicalPayload, Object.keys(canonicalPayload).sort());
      const secret = process.env.WEBHOOK_MASTER_SECRET || `webhook-secret-${webhookId}`;

      return this.verifySignature(payloadString, signature, secret, algorithm as 'hmac-sha256' | 'hmac-sha512');

    } catch (error) {
      this.logger.error('Failed to verify webhook signature from headers', { error, headers });
      return false;
    }
  }

  /**
   * Generate idempotency key for webhook delivery
   */
  generateIdempotencyKey(webhookId: string, eventId: string): string {
    const timestamp = Date.now();
    const data = `${webhookId}-${eventId}-${timestamp}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate secure webhook secret
   */
  generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create signed webhook payload
   */
  createSignedPayload(
    webhookId: string,
    eventType: string,
    payload: Record<string, any>,
    customSecret?: string
  ): { payload: Record<string, any>; signature: string; timestamp: number; algorithm: string } {
    const timestamp = Date.now();
    const canonicalPayload = {
      webhookId,
      eventType,
      timestamp,
      payload,
    };

    const payloadString = JSON.stringify(canonicalPayload, Object.keys(canonicalPayload).sort());
    const secret = customSecret || process.env.WEBHOOK_MASTER_SECRET || `webhook-secret-${webhookId}`;
    const signature = this.generateSignature(payloadString, secret);

    return {
      payload: canonicalPayload,
      signature,
      timestamp,
      algorithm: 'hmac-sha256',
    };
  }

  /**
   * Verify signed webhook payload
   */
  verifySignedPayload(
    signedPayload: { payload: Record<string, any>; signature: string; timestamp: number; algorithm: string },
    webhookId: string,
    customSecret?: string
  ): boolean {
    try {
      const { payload, signature, timestamp, algorithm } = signedPayload;

      // Verify timestamp freshness
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5 minutes

      if (now - timestamp > maxAge) {
        this.logger.warn('Signed payload timestamp too old', {
          timestamp,
          now,
          age: now - timestamp
        });
        return false;
      }

      const canonicalPayload = {
        webhookId,
        eventType: payload.eventType,
        timestamp,
        payload: payload.payload,
      };

      const payloadString = JSON.stringify(canonicalPayload, Object.keys(canonicalPayload).sort());
      const secret = customSecret || process.env.WEBHOOK_MASTER_SECRET || `webhook-secret-${webhookId}`;

      return this.verifySignature(payloadString, signature, secret, algorithm as 'hmac-sha256' | 'hmac-sha512');

    } catch (error) {
      this.logger.error('Failed to verify signed payload', { error });
      return false;
    }
  }

  /**
   * Extract signature from webhook headers
   */
  extractSignatureFromHeaders(headers: Record<string, string>): {
    signature?: string;
    timestamp?: number;
    algorithm?: string;
  } {
    const result: {
      signature?: string;
      timestamp?: number;
      algorithm?: string;
    } = {
      algorithm: headers['x-webhook-algorithm'] || headers['x-algorithm'] || 'hmac-sha256',
    };

    const sig = headers['x-webhook-signature'] || headers['x-signature'] || headers['signature'];
    if (sig) {
      result.signature = sig;
    }

    const ts = headers['x-webhook-timestamp'];
    if (ts) {
      result.timestamp = parseInt(ts);
    }

    return result;
  }

  /**
   * Create webhook headers for delivery
   */
  createWebhookHeaders(
    webhookId: string,
    eventType: string,
    payload: Record<string, any>,
    signature: string,
    timestamp: number,
    algorithm: string = 'hmac-sha256'
  ): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': timestamp.toString(),
      'X-Webhook-Algorithm': algorithm,
      'X-Webhook-ID': webhookId,
      'X-Webhook-Event': eventType,
      'User-Agent': 'Coinet-NotificationService/1.0',
    };
  }

  /**
   * Validate webhook URL
   */
  validateWebhookUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);

      // Only allow HTTPS for production security
      if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
        return false;
      }

      // Check for localhost in production
      if (process.env.NODE_ENV === 'production' && (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate webhook delivery headers
   */
  generateDeliveryHeaders(
    webhookId: string,
    eventType: string,
    payload: Record<string, any>
  ): Record<string, string> {
    const signed = this.createSignedPayload(webhookId, eventType, payload);

    return {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signed.signature,
      'X-Webhook-Timestamp': signed.timestamp.toString(),
      'X-Webhook-Algorithm': signed.algorithm,
      'X-Webhook-ID': webhookId,
      'X-Webhook-Event': eventType,
      'X-Idempotency-Key': this.generateIdempotencyKey(webhookId, `${eventType}-${Date.now()}`),
      'User-Agent': 'Coinet-NotificationService/1.0',
    };
  }

  /**
   * Create retry signature for webhook delivery
   */
  createRetrySignature(
    webhookId: string,
    eventType: string,
    payload: Record<string, any>,
    attemptNumber: number
  ): string {
    const retryPayload = {
      webhookId,
      eventType,
      payload,
      attempt: attemptNumber,
      timestamp: Date.now(),
    };

    const payloadString = JSON.stringify(retryPayload, Object.keys(retryPayload).sort());
    const secret = process.env.WEBHOOK_MASTER_SECRET || `webhook-secret-${webhookId}`;

    return this.generateSignature(payloadString, secret);
  }
}
