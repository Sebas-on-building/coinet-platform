/**
 * ============================================
 * DEFI-SPECIFIC PROMETHEUS METRICS
 * ============================================
 * 
 * Comprehensive metrics for DeFi data providers:
 * - DexScreener request tracking
 * - DeFiLlama API metrics
 * - CryptoPanic news metrics
 * - Sentiment analysis accuracy
 * - Token discovery metrics
 * - Aggregation performance
 * 
 * Integrates with the main Prometheus metrics collector.
 */

import { logger } from '../utils/logger';
import { getPrometheusMetrics, PrometheusMetrics } from './prometheus-metrics';

/**
 * DeFi Metrics Registry
 */
export class DefiMetrics {
  private metrics: PrometheusMetrics;
  private readonly PREFIX = 'defi';

  constructor() {
    this.metrics = getPrometheusMetrics();
    this.registerAllMetrics();
    logger.info('DeFi metrics registered');
  }

  /**
   * Register all DeFi-specific metrics
   */
  private registerAllMetrics(): void {
    // DexScreener metrics
    this.registerDexScreenerMetrics();
    
    // DeFiLlama metrics
    this.registerDeFiLlamaMetrics();
    
    // CryptoPanic metrics
    this.registerCryptoPanicMetrics();
    
    // Sentiment analysis metrics
    this.registerSentimentMetrics();
    
    // Token discovery metrics
    this.registerTokenDiscoveryMetrics();
    
    // Aggregation metrics
    this.registerAggregationMetrics();
    
    // Alert thresholds
    this.registerAlertMetrics();
  }

  /**
   * DexScreener metrics
   */
  private registerDexScreenerMetrics(): void {
    this.metrics.register({
      name: 'dexscreener_requests_total',
      help: 'Total DexScreener API requests',
      type: 'counter',
      labels: ['endpoint', 'status', 'tier'],
    });

    this.metrics.register({
      name: 'dexscreener_request_duration_seconds',
      help: 'DexScreener request duration',
      type: 'histogram',
      labels: ['endpoint'],
    });

    this.metrics.register({
      name: 'dexscreener_pairs_tracked',
      help: 'Number of DEX pairs being tracked',
      type: 'gauge',
      labels: ['chain'],
    });

    this.metrics.register({
      name: 'dexscreener_websocket_connections',
      help: 'Active DexScreener WebSocket connections',
      type: 'gauge',
    });

    this.metrics.register({
      name: 'dexscreener_websocket_messages_total',
      help: 'Total DexScreener WebSocket messages',
      type: 'counter',
      labels: ['type'],
    });

    this.metrics.register({
      name: 'dexscreener_cache_hit_ratio',
      help: 'DexScreener cache hit ratio',
      type: 'gauge',
    });

    this.metrics.register({
      name: 'dexscreener_rate_limit_remaining',
      help: 'Remaining rate limit for DexScreener',
      type: 'gauge',
      labels: ['tier'],
    });
  }

  /**
   * DeFiLlama metrics
   */
  private registerDeFiLlamaMetrics(): void {
    this.metrics.register({
      name: 'defillama_requests_total',
      help: 'Total DeFiLlama API requests',
      type: 'counter',
      labels: ['endpoint', 'status'],
    });

    this.metrics.register({
      name: 'defillama_request_duration_seconds',
      help: 'DeFiLlama request duration',
      type: 'histogram',
      labels: ['endpoint'],
    });

    this.metrics.register({
      name: 'defillama_protocols_tracked',
      help: 'Number of DeFi protocols being tracked',
      type: 'gauge',
    });

    this.metrics.register({
      name: 'defillama_tvl_total_usd',
      help: 'Total TVL tracked in USD',
      type: 'gauge',
    });

    this.metrics.register({
      name: 'defillama_cache_hit_ratio',
      help: 'DeFiLlama cache hit ratio',
      type: 'gauge',
    });

    this.metrics.register({
      name: 'defillama_polling_interval_seconds',
      help: 'Current adaptive polling interval',
      type: 'gauge',
    });

    this.metrics.register({
      name: 'defillama_stale_data_age_seconds',
      help: 'Age of the oldest data in cache',
      type: 'gauge',
    });
  }

  /**
   * CryptoPanic metrics
   */
  private registerCryptoPanicMetrics(): void {
    this.metrics.register({
      name: 'cryptopanic_requests_total',
      help: 'Total CryptoPanic API requests',
      type: 'counter',
      labels: ['filter', 'status'],
    });

    this.metrics.register({
      name: 'cryptopanic_news_fetched_total',
      help: 'Total news items fetched',
      type: 'counter',
      labels: ['filter'],
    });

    this.metrics.register({
      name: 'cryptopanic_news_processing_time_seconds',
      help: 'News processing time',
      type: 'histogram',
    });

    this.metrics.register({
      name: 'cryptopanic_cache_hit_ratio',
      help: 'CryptoPanic cache hit ratio',
      type: 'gauge',
    });

    this.metrics.register({
      name: 'cryptopanic_rate_limit_remaining',
      help: 'Remaining daily API calls',
      type: 'gauge',
    });
  }

  /**
   * Sentiment analysis metrics
   */
  private registerSentimentMetrics(): void {
    this.metrics.register({
      name: 'sentiment_analyses_total',
      help: 'Total sentiment analyses performed',
      type: 'counter',
      labels: ['source'],
    });

    this.metrics.register({
      name: 'sentiment_accuracy',
      help: 'Sentiment analysis accuracy (0-1)',
      type: 'gauge',
      labels: ['source'],
    });

    this.metrics.register({
      name: 'sentiment_processing_time_seconds',
      help: 'Sentiment processing time',
      type: 'histogram',
    });

    this.metrics.register({
      name: 'sentiment_positive_ratio',
      help: 'Ratio of positive sentiment (0-1)',
      type: 'gauge',
      labels: ['currency'],
    });

    this.metrics.register({
      name: 'sentiment_negative_ratio',
      help: 'Ratio of negative sentiment (0-1)',
      type: 'gauge',
      labels: ['currency'],
    });

    this.metrics.register({
      name: 'sentiment_neutral_ratio',
      help: 'Ratio of neutral sentiment (0-1)',
      type: 'gauge',
      labels: ['currency'],
    });

    this.metrics.register({
      name: 'sentiment_confidence_avg',
      help: 'Average sentiment confidence score',
      type: 'gauge',
      labels: ['source'],
    });
  }

  /**
   * Token discovery metrics
   */
  private registerTokenDiscoveryMetrics(): void {
    this.metrics.register({
      name: 'token_discovery_scans_total',
      help: 'Total token discovery scans',
      type: 'counter',
      labels: ['chain'],
    });

    this.metrics.register({
      name: 'token_discovery_new_tokens_total',
      help: 'New tokens discovered',
      type: 'counter',
      labels: ['chain', 'risk_level'],
    });

    this.metrics.register({
      name: 'token_discovery_scan_duration_seconds',
      help: 'Token discovery scan duration',
      type: 'histogram',
      labels: ['chain'],
    });

    this.metrics.register({
      name: 'token_discovery_active_tokens',
      help: 'Number of active tokens being monitored',
      type: 'gauge',
      labels: ['chain'],
    });

    this.metrics.register({
      name: 'token_discovery_filtered_tokens',
      help: 'Tokens filtered out (low quality)',
      type: 'counter',
      labels: ['chain', 'reason'],
    });

    this.metrics.register({
      name: 'token_discovery_risk_score_avg',
      help: 'Average risk score of discovered tokens',
      type: 'gauge',
      labels: ['chain'],
    });
  }

  /**
   * Aggregation metrics
   */
  private registerAggregationMetrics(): void {
    this.metrics.register({
      name: 'defi_aggregation_requests_total',
      help: 'Total aggregation requests',
      type: 'counter',
      labels: ['type'],
    });

    this.metrics.register({
      name: 'defi_aggregation_latency_seconds',
      help: 'Aggregation latency',
      type: 'histogram',
      labels: ['type'],
    });

    this.metrics.register({
      name: 'defi_aggregation_sources_used',
      help: 'Number of data sources used in aggregation',
      type: 'gauge',
      labels: ['type'],
    });

    this.metrics.register({
      name: 'defi_aggregation_data_freshness_seconds',
      help: 'Age of aggregated data',
      type: 'gauge',
      labels: ['source'],
    });

    this.metrics.register({
      name: 'defi_unified_score_avg',
      help: 'Average unified DeFi score',
      type: 'gauge',
    });

    this.metrics.register({
      name: 'defi_market_overview_duration_seconds',
      help: 'Time to generate market overview',
      type: 'histogram',
    });
  }

  /**
   * Alert threshold metrics
   */
  private registerAlertMetrics(): void {
    this.metrics.register({
      name: 'alert_cache_hit_rate_below_threshold',
      help: 'Whether cache hit rate is below threshold (1=alert, 0=ok)',
      type: 'gauge',
      labels: ['source'],
    });

    this.metrics.register({
      name: 'alert_error_rate_above_threshold',
      help: 'Whether error rate is above threshold (1=alert, 0=ok)',
      type: 'gauge',
      labels: ['source'],
    });

    this.metrics.register({
      name: 'alert_latency_above_threshold',
      help: 'Whether latency is above threshold (1=alert, 0=ok)',
      type: 'gauge',
      labels: ['source'],
    });

    this.metrics.register({
      name: 'alert_stale_data',
      help: 'Whether data is stale (1=alert, 0=ok)',
      type: 'gauge',
      labels: ['source'],
    });

    this.metrics.register({
      name: 'alerts_triggered_total',
      help: 'Total alerts triggered',
      type: 'counter',
      labels: ['type', 'severity'],
    });
  }

  // ===== DexScreener Recording Methods =====

  recordDexScreenerRequest(endpoint: string, status: 'success' | 'error', tier: string, durationMs: number): void {
    this.metrics.incCounter('dexscreener_requests_total', { endpoint, status, tier });
    this.metrics.observeHistogram('dexscreener_request_duration_seconds', durationMs / 1000, { endpoint });
  }

  setDexScreenerPairsTracked(chain: string, count: number): void {
    this.metrics.setGauge('dexscreener_pairs_tracked', count, { chain });
  }

  setDexScreenerWebSocketConnections(count: number): void {
    this.metrics.setGauge('dexscreener_websocket_connections', count);
  }

  recordDexScreenerWebSocketMessage(type: string): void {
    this.metrics.incCounter('dexscreener_websocket_messages_total', { type });
  }

  setDexScreenerCacheHitRatio(ratio: number): void {
    this.metrics.setGauge('dexscreener_cache_hit_ratio', ratio);
  }

  setDexScreenerRateLimitRemaining(tier: string, remaining: number): void {
    this.metrics.setGauge('dexscreener_rate_limit_remaining', remaining, { tier });
  }

  // ===== DeFiLlama Recording Methods =====

  recordDeFiLlamaRequest(endpoint: string, status: 'success' | 'error', durationMs: number): void {
    this.metrics.incCounter('defillama_requests_total', { endpoint, status });
    this.metrics.observeHistogram('defillama_request_duration_seconds', durationMs / 1000, { endpoint });
  }

  setDeFiLlamaProtocolsTracked(count: number): void {
    this.metrics.setGauge('defillama_protocols_tracked', count);
  }

  setDeFiLlamaTotalTVL(tvl: number): void {
    this.metrics.setGauge('defillama_tvl_total_usd', tvl);
  }

  setDeFiLlamaCacheHitRatio(ratio: number): void {
    this.metrics.setGauge('defillama_cache_hit_ratio', ratio);
  }

  setDeFiLlamaPollingInterval(seconds: number): void {
    this.metrics.setGauge('defillama_polling_interval_seconds', seconds);
  }

  setDeFiLlamaStaleDataAge(seconds: number): void {
    this.metrics.setGauge('defillama_stale_data_age_seconds', seconds);
  }

  // ===== CryptoPanic Recording Methods =====

  recordCryptoPanicRequest(filter: string, status: 'success' | 'error'): void {
    this.metrics.incCounter('cryptopanic_requests_total', { filter, status });
  }

  recordCryptoPanicNewsFetched(filter: string, count: number): void {
    for (let i = 0; i < count; i++) {
      this.metrics.incCounter('cryptopanic_news_fetched_total', { filter });
    }
  }

  recordCryptoPanicProcessingTime(durationSeconds: number): void {
    this.metrics.observeHistogram('cryptopanic_news_processing_time_seconds', durationSeconds);
  }

  setCryptoPanicCacheHitRatio(ratio: number): void {
    this.metrics.setGauge('cryptopanic_cache_hit_ratio', ratio);
  }

  setCryptoPanicRateLimitRemaining(remaining: number): void {
    this.metrics.setGauge('cryptopanic_rate_limit_remaining', remaining);
  }

  // ===== Sentiment Recording Methods =====

  recordSentimentAnalysis(source: string): void {
    this.metrics.incCounter('sentiment_analyses_total', { source });
  }

  setSentimentAccuracy(source: string, accuracy: number): void {
    this.metrics.setGauge('sentiment_accuracy', accuracy, { source });
  }

  recordSentimentProcessingTime(durationSeconds: number): void {
    this.metrics.observeHistogram('sentiment_processing_time_seconds', durationSeconds);
  }

  setSentimentRatios(currency: string, positive: number, negative: number, neutral: number): void {
    this.metrics.setGauge('sentiment_positive_ratio', positive, { currency });
    this.metrics.setGauge('sentiment_negative_ratio', negative, { currency });
    this.metrics.setGauge('sentiment_neutral_ratio', neutral, { currency });
  }

  setSentimentConfidence(source: string, confidence: number): void {
    this.metrics.setGauge('sentiment_confidence_avg', confidence, { source });
  }

  // ===== Token Discovery Recording Methods =====

  recordTokenDiscoveryScan(chain: string, durationSeconds: number): void {
    this.metrics.incCounter('token_discovery_scans_total', { chain });
    this.metrics.observeHistogram('token_discovery_scan_duration_seconds', durationSeconds, { chain });
  }

  recordNewTokenDiscovered(chain: string, riskLevel: string): void {
    this.metrics.incCounter('token_discovery_new_tokens_total', { chain, risk_level: riskLevel });
  }

  setActiveTokensCount(chain: string, count: number): void {
    this.metrics.setGauge('token_discovery_active_tokens', count, { chain });
  }

  recordFilteredToken(chain: string, reason: string): void {
    this.metrics.incCounter('token_discovery_filtered_tokens', { chain, reason });
  }

  setAverageRiskScore(chain: string, score: number): void {
    this.metrics.setGauge('token_discovery_risk_score_avg', score, { chain });
  }

  // ===== Aggregation Recording Methods =====

  recordAggregationRequest(type: string, durationSeconds: number, sourcesUsed: number): void {
    this.metrics.incCounter('defi_aggregation_requests_total', { type });
    this.metrics.observeHistogram('defi_aggregation_latency_seconds', durationSeconds, { type });
    this.metrics.setGauge('defi_aggregation_sources_used', sourcesUsed, { type });
  }

  setDataFreshness(source: string, ageSeconds: number): void {
    this.metrics.setGauge('defi_aggregation_data_freshness_seconds', ageSeconds, { source });
  }

  setUnifiedScoreAverage(score: number): void {
    this.metrics.setGauge('defi_unified_score_avg', score);
  }

  recordMarketOverviewDuration(durationSeconds: number): void {
    this.metrics.observeHistogram('defi_market_overview_duration_seconds', durationSeconds);
  }

  // ===== Alert Recording Methods =====

  checkAndRecordAlerts(metrics: {
    cacheHitRate?: number;
    errorRate?: number;
    latencyMs?: number;
    dataAgeSeconds?: number;
    source: string;
  }): void {
    const { cacheHitRate, errorRate, latencyMs, dataAgeSeconds, source } = metrics;

    // Cache hit rate alert (threshold: 90%)
    if (cacheHitRate !== undefined) {
      const belowThreshold = cacheHitRate < 0.9 ? 1 : 0;
      this.metrics.setGauge('alert_cache_hit_rate_below_threshold', belowThreshold, { source });
      if (belowThreshold) {
        this.metrics.incCounter('alerts_triggered_total', { type: 'cache_hit_rate', severity: 'warning' });
        logger.warn(`⚠️ Cache hit rate below 90% for ${source}: ${(cacheHitRate * 100).toFixed(1)}%`);
      }
    }

    // Error rate alert (threshold: 5%)
    if (errorRate !== undefined) {
      const aboveThreshold = errorRate > 0.05 ? 1 : 0;
      this.metrics.setGauge('alert_error_rate_above_threshold', aboveThreshold, { source });
      if (aboveThreshold) {
        this.metrics.incCounter('alerts_triggered_total', { type: 'error_rate', severity: 'critical' });
        logger.error(`🚨 Error rate above 5% for ${source}: ${(errorRate * 100).toFixed(1)}%`);
      }
    }

    // Latency alert (threshold: 2000ms)
    if (latencyMs !== undefined) {
      const aboveThreshold = latencyMs > 2000 ? 1 : 0;
      this.metrics.setGauge('alert_latency_above_threshold', aboveThreshold, { source });
      if (aboveThreshold) {
        this.metrics.incCounter('alerts_triggered_total', { type: 'latency', severity: 'warning' });
        logger.warn(`⚠️ Latency above 2000ms for ${source}: ${latencyMs}ms`);
      }
    }

    // Stale data alert (threshold: 300 seconds / 5 minutes)
    if (dataAgeSeconds !== undefined) {
      const isStale = dataAgeSeconds > 300 ? 1 : 0;
      this.metrics.setGauge('alert_stale_data', isStale, { source });
      if (isStale) {
        this.metrics.incCounter('alerts_triggered_total', { type: 'stale_data', severity: 'warning' });
        logger.warn(`⚠️ Stale data for ${source}: ${dataAgeSeconds}s old`);
      }
    }
  }
}

/**
 * Global instance
 */
let globalDefiMetrics: DefiMetrics | null = null;

export function getDefiMetrics(): DefiMetrics {
  if (!globalDefiMetrics) {
    globalDefiMetrics = new DefiMetrics();
  }
  return globalDefiMetrics;
}

export function resetDefiMetrics(): void {
  globalDefiMetrics = null;
}

export default DefiMetrics;

