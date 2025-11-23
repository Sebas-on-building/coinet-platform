/**
 * Webhook Server for real-time whale alerts from Alchemy
 */

import express, { Express, Request, Response } from 'express';
import crypto from 'crypto';
import {
  WebhookEvent,
  AlchemyTransfer,
  Chain,
  ServiceConfig,
} from '../types';
import { createLogger } from '../utils/logger';
import { TransferProcessor } from '../processors/TransferProcessor';

export class WebhookServer {
  private app: Express;
  private logger: any;
  private config: ServiceConfig['webhook'];
  private processor: TransferProcessor;
  private metrics: {
    received: number;
    processed: number;
    failed: number;
    invalidSignature: number;
  };

  constructor(config: ServiceConfig['webhook'], processor: TransferProcessor) {
    this.logger = createLogger({ component: 'WebhookServer' });
    this.config = config;
    this.processor = processor;
    this.app = express();
    this.metrics = {
      received: 0,
      processed: 0,
      failed: 0,
      invalidSignature: 0,
    };

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Parse JSON bodies
    this.app.use(express.json({ limit: '10mb' }));

    // Request logging
    this.app.use((req, _res, next) => {
      this.logger.debug('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
      next();
    });

    // Error handling
    this.app.use((err: any, req: Request, res: Response, _next: any) => {
      this.logger.error('Request error', {
        error: err.message,
        path: req.path,
      });
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        metrics: this.metrics,
      });
    });

    // Webhook endpoint
    this.app.post(this.config.path, async (req, res) => {
      try {
        this.metrics.received++;

        // Verify signature
        if (!this.verifySignature(req)) {
          this.metrics.invalidSignature++;
          this.logger.warn('Invalid webhook signature', {
            path: req.path,
            ip: req.ip,
          });
          return res.status(401).json({ error: 'Invalid signature' });
        }

        // Process webhook
        const event = req.body as WebhookEvent;
        await this.handleWebhook(event);

        this.metrics.processed++;
        return res.status(200).json({ success: true });
      } catch (error: any) {
        this.metrics.failed++;
        this.logger.error('Webhook processing error', {
          error: error.message,
        });
        return res.status(500).json({ error: 'Processing failed' });
      }
    });

    // Metrics endpoint
    this.app.get('/metrics', (_req, res) => {
      res.json(this.metrics);
    });
  }

  /**
   * Verify webhook signature
   */
  private verifySignature(req: Request): boolean {
    const signature = req.headers['x-alchemy-signature'] as string;
    if (!signature) return false;

    try {
      const body = JSON.stringify(req.body);
      const hmac = crypto.createHmac('sha256', this.config.secret);
      hmac.update(body);
      const computedSignature = hmac.digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedSignature)
      );
    } catch (error) {
      this.logger.error('Signature verification error', { error });
      return false;
    }
  }

  /**
   * Handle incoming webhook
   */
  private async handleWebhook(event: WebhookEvent): Promise<void> {
    this.logger.info('Processing webhook event', {
      id: event.id,
      type: event.type,
      network: event.event.network,
      activityCount: event.event.activity.length,
    });

    // Map network to chain
    const chain = this.mapNetworkToChain(event.event.network);
    if (!chain) {
      this.logger.warn('Unknown network', { network: event.event.network });
      return;
    }

    // Process transfers
    const transfers = event.event.activity as AlchemyTransfer[];
    await this.processor.processAndPersist(transfers, chain);

    this.logger.info('Webhook processed successfully', {
      id: event.id,
      chain,
      transfers: transfers.length,
    });
  }

  /**
   * Map Alchemy network to Chain enum
   */
  private mapNetworkToChain(network: string): Chain | null {
    const mapping: Record<string, Chain> = {
      'ETH_MAINNET': Chain.ETHEREUM,
      'MATIC_MAINNET': Chain.POLYGON,
      'ARB_MAINNET': Chain.ARBITRUM,
      'OPT_MAINNET': Chain.OPTIMISM,
      'BASE_MAINNET': Chain.BASE,
    };
    return mapping[network] || null;
  }

  /**
   * Start webhook server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.config.port, () => {
        this.logger.info('Webhook server started', {
          port: this.config.port,
          path: this.config.path,
        });
        resolve();
      });
    });
  }

  /**
   * Stop webhook server
   */
  async stop(): Promise<void> {
    // Express doesn't have a built-in close method, would need to track server instance
    this.logger.info('Webhook server stopped');
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }
}

export default WebhookServer;

