/**
 * Prometheus Metrics Collector
 */

import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';
import { createLogger } from '../utils/logger';

export class MetricsCollector {
  private registry: Registry;
  private logger: any;

  // Counters
  public transfersTotal: Counter;
  public transfersByChain: Counter;
  public transfersByCategory: Counter;
  public whaleTransfersTotal: Counter;
  public apiRequestsTotal: Counter;
  public apiErrorsTotal: Counter;
  public rateLimitHitsTotal: Counter;
  public webhookEventsTotal: Counter;
  public notificationsSentTotal: Counter;
  public notificationsFailedTotal: Counter;

  // Gauges
  public activeConnections: Gauge;
  public queuedJobs: Gauge;
  public cacheHitRate: Gauge;
  public circuitBreakerState: Gauge;

  // Histograms
  public apiLatency: Histogram;
  public processingLatency: Histogram;
  public webhookLatency: Histogram;
  public dbQueryLatency: Histogram;

  constructor() {
    this.logger = createLogger({ component: 'MetricsCollector' });
    this.registry = new Registry();

    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register: this.registry, prefix: 'alchemy_whales_' });

    // Initialize counters
    this.transfersTotal = new Counter({
      name: 'alchemy_whales_transfers_total',
      help: 'Total number of transfers processed',
      registers: [this.registry],
    });

    this.transfersByChain = new Counter({
      name: 'alchemy_whales_transfers_by_chain_total',
      help: 'Total number of transfers by chain',
      labelNames: ['chain'],
      registers: [this.registry],
    });

    this.transfersByCategory = new Counter({
      name: 'alchemy_whales_transfers_by_category_total',
      help: 'Total number of transfers by category',
      labelNames: ['category'],
      registers: [this.registry],
    });

    this.whaleTransfersTotal = new Counter({
      name: 'alchemy_whales_whale_transfers_total',
      help: 'Total number of whale transfers',
      labelNames: ['tier'],
      registers: [this.registry],
    });

    this.apiRequestsTotal = new Counter({
      name: 'alchemy_whales_api_requests_total',
      help: 'Total number of API requests',
      labelNames: ['chain', 'status'],
      registers: [this.registry],
    });

    this.apiErrorsTotal = new Counter({
      name: 'alchemy_whales_api_errors_total',
      help: 'Total number of API errors',
      labelNames: ['chain', 'type'],
      registers: [this.registry],
    });

    this.rateLimitHitsTotal = new Counter({
      name: 'alchemy_whales_rate_limit_hits_total',
      help: 'Total number of rate limit hits',
      labelNames: ['chain'],
      registers: [this.registry],
    });

    this.webhookEventsTotal = new Counter({
      name: 'alchemy_whales_webhook_events_total',
      help: 'Total number of webhook events received',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.notificationsSentTotal = new Counter({
      name: 'alchemy_whales_notifications_sent_total',
      help: 'Total number of notifications sent',
      labelNames: ['tier'],
      registers: [this.registry],
    });

    this.notificationsFailedTotal = new Counter({
      name: 'alchemy_whales_notifications_failed_total',
      help: 'Total number of failed notifications',
      registers: [this.registry],
    });

    // Initialize gauges
    this.activeConnections = new Gauge({
      name: 'alchemy_whales_active_connections',
      help: 'Number of active connections',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.queuedJobs = new Gauge({
      name: 'alchemy_whales_queued_jobs',
      help: 'Number of queued jobs',
      labelNames: ['chain'],
      registers: [this.registry],
    });

    this.cacheHitRate = new Gauge({
      name: 'alchemy_whales_cache_hit_rate',
      help: 'Cache hit rate percentage',
      registers: [this.registry],
    });

    this.circuitBreakerState = new Gauge({
      name: 'alchemy_whales_circuit_breaker_state',
      help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
      labelNames: ['chain'],
      registers: [this.registry],
    });

    // Initialize histograms
    this.apiLatency = new Histogram({
      name: 'alchemy_whales_api_latency_seconds',
      help: 'API request latency in seconds',
      labelNames: ['chain', 'endpoint'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.processingLatency = new Histogram({
      name: 'alchemy_whales_processing_latency_seconds',
      help: 'Transfer processing latency in seconds',
      labelNames: ['chain'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.webhookLatency = new Histogram({
      name: 'alchemy_whales_webhook_latency_seconds',
      help: 'Webhook processing latency in seconds',
      buckets: [0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });

    this.dbQueryLatency = new Histogram({
      name: 'alchemy_whales_db_query_latency_seconds',
      help: 'Database query latency in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });

    this.logger.info('Metrics collector initialized');
  }

  /**
   * Get Prometheus metrics
   */
  async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }

  /**
   * Get metrics as JSON
   */
  async getMetricsJSON(): Promise<any> {
    const metrics = await this.registry.getMetricsAsJSON();
    return metrics;
  }

  /**
   * Record transfer processed
   */
  recordTransfer(chain: string, category: string, whaleTier?: string): void {
    this.transfersTotal.inc();
    this.transfersByChain.inc({ chain });
    this.transfersByCategory.inc({ category });
    
    if (whaleTier) {
      this.whaleTransfersTotal.inc({ tier: whaleTier });
    }
  }

  /**
   * Record API request
   */
  recordAPIRequest(chain: string, status: 'success' | 'error'): void {
    this.apiRequestsTotal.inc({ chain, status });
  }

  /**
   * Record API error
   */
  recordAPIError(chain: string, type: string): void {
    this.apiErrorsTotal.inc({ chain, type });
  }

  /**
   * Record rate limit hit
   */
  recordRateLimitHit(chain: string): void {
    this.rateLimitHitsTotal.inc({ chain });
  }

  /**
   * Record webhook event
   */
  recordWebhookEvent(status: 'received' | 'processed' | 'failed'): void {
    this.webhookEventsTotal.inc({ status });
  }

  /**
   * Record notification
   */
  recordNotification(tier: string, success: boolean): void {
    if (success) {
      this.notificationsSentTotal.inc({ tier });
    } else {
      this.notificationsFailedTotal.inc();
    }
  }

  /**
   * Update cache hit rate
   */
  updateCacheHitRate(rate: number): void {
    this.cacheHitRate.set(rate);
  }

  /**
   * Update circuit breaker state
   */
  updateCircuitBreakerState(chain: string, state: 'closed' | 'open' | 'half_open'): void {
    const stateMap = { closed: 0, open: 1, half_open: 2 };
    this.circuitBreakerState.set({ chain }, stateMap[state]);
  }

  /**
   * Time API request
   */
  timeAPIRequest(chain: string, endpoint: string): () => void {
    const end = this.apiLatency.startTimer({ chain, endpoint });
    return end;
  }

  /**
   * Time processing
   */
  timeProcessing(chain: string): () => void {
    const end = this.processingLatency.startTimer({ chain });
    return end;
  }

  /**
   * Time webhook
   */
  timeWebhook(): () => void {
    const end = this.webhookLatency.startTimer();
    return end;
  }

  /**
   * Time database query
   */
  timeDBQuery(operation: string): () => void {
    const end = this.dbQueryLatency.startTimer({ operation });
    return end;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.registry.clear();
    this.logger.info('Metrics reset');
  }
}

export default MetricsCollector;

