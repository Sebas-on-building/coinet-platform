/**
 * Token Unlocks Prometheus Metrics
 * 
 * Comprehensive monitoring for the token unlocks system:
 * - Prediction accuracy
 * - Verification success rates
 * - Source reliability
 * - Latency tracking
 * - Error rates
 * 
 * Integrates with existing Prometheus metrics system
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { getPrometheusMetrics, PrometheusMetrics } from './prometheus-metrics';

// =============================================================================
// TYPES
// =============================================================================

export interface PredictionMetric {
  tokenSymbol: string;
  predictedImpact: number;
  actualImpact: number;
  confidence: number;
  timeHorizon: '1h' | '24h' | '7d' | '30d';
  timestamp: Date;
}

export interface VerificationMetric {
  chain: string;
  contractAddress: string;
  success: boolean;
  latencyMs: number;
  source: string;
  timestamp: Date;
}

export interface SourceMetric {
  source: string;
  requestsTotal: number;
  successTotal: number;
  errorsTotal: number;
  avgLatencyMs: number;
  reliability: number;
  lastUpdated: Date;
}

export interface ConsensusMetric {
  tokenSymbol: string;
  sourcesUsed: number;
  agreementRate: number;
  anomaliesDetected: number;
  confidenceScore: number;
  timestamp: Date;
}

export interface UnlockMetricConfig {
  predictionBuckets: number[];
  latencyBuckets: number[];
  enableDetailedMetrics: boolean;
  retentionHours: number;
}

// =============================================================================
// MAIN CLASS
// =============================================================================

export class UnlockMetrics extends EventEmitter {
  private prometheus: PrometheusMetrics;
  private config: UnlockMetricConfig;
  
  // In-memory metrics storage for calculations
  private predictionHistory: PredictionMetric[] = [];
  private verificationHistory: VerificationMetric[] = [];
  private sourceMetrics: Map<string, SourceMetric> = new Map();
  private consensusHistory: ConsensusMetric[] = [];
  
  // Metric prefixes
  private readonly PREFIX = 'coinet_unlock';

  constructor(config?: Partial<UnlockMetricConfig>) {
    super();
    this.prometheus = getPrometheusMetrics();
    this.config = {
      predictionBuckets: config?.predictionBuckets || [-0.5, -0.2, -0.1, -0.05, 0, 0.05, 0.1, 0.2, 0.5],
      latencyBuckets: config?.latencyBuckets || [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
      enableDetailedMetrics: config?.enableDetailedMetrics !== false,
      retentionHours: config?.retentionHours || 24,
    };

    this.registerMetrics();
    this.startCleanupInterval();
    
    logger.info('UnlockMetrics initialized');
  }

  // ===========================================================================
  // METRIC REGISTRATION
  // ===========================================================================

  private registerMetrics(): void {
    // Prediction Accuracy Metrics
    this.prometheus.register({
      name: `${this.PREFIX}_prediction_accuracy`,
      type: 'gauge',
      help: 'Prediction accuracy by time horizon (0-1)',
      labels: ['time_horizon'],
    });

    this.prometheus.register({
      name: `${this.PREFIX}_prediction_total`,
      type: 'counter',
      help: 'Total predictions made',
      labels: ['time_horizon', 'direction'],
    });

    this.prometheus.register({
      name: `${this.PREFIX}_prediction_correct_total`,
      type: 'counter',
      help: 'Total correct predictions',
      labels: ['time_horizon'],
    });

    this.prometheus.register({
      name: `${this.PREFIX}_prediction_mae`,
      type: 'gauge',
      help: 'Mean Absolute Error of predictions',
      labels: ['time_horizon'],
    });

    this.prometheus.register({
      name: `${this.PREFIX}_prediction_confidence_avg`,
      type: 'gauge',
      help: 'Average confidence of predictions',
      labels: ['time_horizon'],
    });

    // Verification Metrics
    this.prometheus.register({
      name: `${this.PREFIX}_verification_total`,
      type: 'counter',
      help: 'Total verifications attempted',
      labels: ['chain', 'result'],
    });

    this.prometheus.register({
      name: `${this.PREFIX}_verification_success_rate`,
      type: 'gauge',
      help: 'Verification success rate by chain',
      labels: ['chain'],
    });

    this.prometheus.register({
      name: `${this.PREFIX}_verification_latency_ms`,
      type: 'histogram',
      help: 'Verification latency in milliseconds',
      labels: ['chain'],
    });

    // Source Reliability Metrics
    this.prometheus.register({
      name: `${this.PREFIX}_source_reliability`,
      type: 'gauge',
      help: 'Source reliability score (0-1)',
      labels: ['source'],
    });

    this.prometheus.register({
      name: `${this.PREFIX}_source_requests_total`,
      type: 'counter',
      help: 'Total requests to source',
      labels: ['source', 'status'],
    });

    this.prometheus.register({
      name: `${this.PREFIX}_source_latency_avg_ms`,
      type: 'gauge',
      help: 'Average source latency in milliseconds',
      labels: ['source'],
    });

    // Consensus Metrics
    this.prometheus.register({
      name: `${this.PREFIX}_consensus_sources_used`,
      type: 'histogram',
      help: 'Number of sources used in consensus',
      labels: ['token'],
    });

    this.prometheus.register({
      name: `${this.PREFIX}_consensus_agreement_rate`,
      type: 'gauge',
      help: 'Agreement rate between sources',
    });

    this.prometheus.register({
      name: `${this.PREFIX}_consensus_anomalies_total`,
      type: 'counter',
      help: 'Total anomalies detected in consensus',
      labels: ['source'],
    });

    this.prometheus.register({
      name: `${this.PREFIX}_consensus_confidence`,
      type: 'gauge',
      help: 'Consensus confidence score',
    });

    // Flow Metrics
    this.prometheus.register({
      name: `${this.PREFIX}_flow_volume_usd`,
      type: 'counter',
      help: 'Total flow volume in USD',
      labels: ['direction', 'token'],
    });

    this.prometheus.register({
      name: `${this.PREFIX}_flow_to_exchange_ratio`,
      type: 'gauge',
      help: 'Ratio of flows going to exchanges',
      labels: ['token'],
    });

    // Real-time Metrics
    this.prometheus.register({
      name: `${this.PREFIX}_realtime_events_total`,
      type: 'counter',
      help: 'Total real-time events processed',
      labels: ['chain', 'type'],
    });

    this.prometheus.register({
      name: `${this.PREFIX}_realtime_latency_ms`,
      type: 'histogram',
      help: 'Real-time event processing latency',
      labels: ['chain'],
    });

    this.prometheus.register({
      name: `${this.PREFIX}_realtime_subscriptions_active`,
      type: 'gauge',
      help: 'Number of active real-time subscriptions',
      labels: ['chain'],
    });

    // Cache Metrics
    this.prometheus.register({
      name: `${this.PREFIX}_cache_hit_rate`,
      type: 'gauge',
      help: 'Cache hit rate',
      labels: ['cache_type'],
    });

    this.prometheus.register({
      name: `${this.PREFIX}_cache_size`,
      type: 'gauge',
      help: 'Current cache size',
      labels: ['cache_type'],
    });

    // Error Metrics
    this.prometheus.register({
      name: `${this.PREFIX}_errors_total`,
      type: 'counter',
      help: 'Total errors by type',
      labels: ['error_type', 'component'],
    });

    logger.debug('Unlock metrics registered');
  }

  // ===========================================================================
  // PREDICTION METRICS
  // ===========================================================================

  /**
   * Record a prediction
   */
  recordPrediction(metric: PredictionMetric): void {
    // Store for accuracy calculation
    this.predictionHistory.push(metric);

    // Increment counter
    const direction = metric.predictedImpact < 0 ? 'bearish' : 
                     metric.predictedImpact > 0 ? 'bullish' : 'neutral';
    
    this.prometheus.incCounter(`${this.PREFIX}_prediction_total`, {
      time_horizon: metric.timeHorizon,
      direction,
    });

    // Update confidence average
    const horizonPredictions = this.predictionHistory.filter(
      p => p.timeHorizon === metric.timeHorizon
    );
    const avgConfidence = horizonPredictions.reduce(
      (sum, p) => sum + p.confidence, 0
    ) / horizonPredictions.length;

    this.prometheus.setGauge(`${this.PREFIX}_prediction_confidence_avg`, avgConfidence, {
      time_horizon: metric.timeHorizon,
    });

    this.emit('prediction', metric);
  }

  /**
   * Record prediction outcome (for accuracy calculation)
   */
  recordPredictionOutcome(
    tokenSymbol: string,
    timeHorizon: PredictionMetric['timeHorizon'],
    actualImpact: number
  ): void {
    // Find matching predictions
    const predictions = this.predictionHistory.filter(
      p => p.tokenSymbol === tokenSymbol && 
           p.timeHorizon === timeHorizon &&
           !p.actualImpact
    );

    if (predictions.length === 0) return;

    const prediction = predictions[predictions.length - 1];
    prediction.actualImpact = actualImpact;

    // Calculate accuracy metrics
    const error = Math.abs(prediction.predictedImpact - actualImpact);
    const directionCorrect = 
      (prediction.predictedImpact < 0 && actualImpact < 0) ||
      (prediction.predictedImpact > 0 && actualImpact > 0) ||
      (prediction.predictedImpact === 0 && Math.abs(actualImpact) < 0.01);

    if (directionCorrect) {
      this.prometheus.incCounter(`${this.PREFIX}_prediction_correct_total`, {
        time_horizon: timeHorizon,
      });
    }

    // Update accuracy gauge
    const completedPredictions = this.predictionHistory.filter(
      p => p.timeHorizon === timeHorizon && p.actualImpact !== undefined
    );
    const correctCount = completedPredictions.filter(p => {
      const dir = (p.predictedImpact < 0 && p.actualImpact! < 0) ||
                  (p.predictedImpact > 0 && p.actualImpact! > 0);
      return dir;
    }).length;

    const accuracy = completedPredictions.length > 0 
      ? correctCount / completedPredictions.length 
      : 0;

    this.prometheus.setGauge(`${this.PREFIX}_prediction_accuracy`, accuracy, {
      time_horizon: timeHorizon,
    });

    // Calculate MAE
    const mae = completedPredictions.reduce(
      (sum, p) => sum + Math.abs(p.predictedImpact - p.actualImpact!), 0
    ) / completedPredictions.length;

    this.prometheus.setGauge(`${this.PREFIX}_prediction_mae`, mae, {
      time_horizon: timeHorizon,
    });

    this.emit('prediction_outcome', { prediction, actualImpact, directionCorrect });
  }

  /**
   * Get prediction accuracy summary
   */
  getPredictionAccuracy(): Record<string, { accuracy: number; mae: number; count: number }> {
    const timeHorizons: PredictionMetric['timeHorizon'][] = ['1h', '24h', '7d', '30d'];
    const result: Record<string, { accuracy: number; mae: number; count: number }> = {};

    for (const horizon of timeHorizons) {
      const predictions = this.predictionHistory.filter(
        p => p.timeHorizon === horizon && p.actualImpact !== undefined
      );

      if (predictions.length === 0) {
        result[horizon] = { accuracy: 0, mae: 0, count: 0 };
        continue;
      }

      const correct = predictions.filter(p => {
        const dir = (p.predictedImpact < 0 && p.actualImpact! < 0) ||
                    (p.predictedImpact > 0 && p.actualImpact! > 0);
        return dir;
      }).length;

      const mae = predictions.reduce(
        (sum, p) => sum + Math.abs(p.predictedImpact - p.actualImpact!), 0
      ) / predictions.length;

      result[horizon] = {
        accuracy: correct / predictions.length,
        mae,
        count: predictions.length,
      };
    }

    return result;
  }

  // ===========================================================================
  // VERIFICATION METRICS
  // ===========================================================================

  /**
   * Record a verification attempt
   */
  recordVerification(metric: VerificationMetric): void {
    this.verificationHistory.push(metric);

    // Increment counter
    this.prometheus.incCounter(`${this.PREFIX}_verification_total`, {
      chain: metric.chain,
      result: metric.success ? 'success' : 'failure',
    });

    // Record latency histogram
    this.prometheus.observeHistogram(
      `${this.PREFIX}_verification_latency_ms`,
      metric.latencyMs,
      { chain: metric.chain }
    );

    // Update success rate
    const chainVerifications = this.verificationHistory.filter(
      v => v.chain === metric.chain
    );
    const successRate = chainVerifications.filter(v => v.success).length / 
                       chainVerifications.length;

    this.prometheus.setGauge(`${this.PREFIX}_verification_success_rate`, successRate, {
      chain: metric.chain,
    });

    this.emit('verification', metric);
  }

  /**
   * Get verification summary by chain
   */
  getVerificationSummary(): Record<string, { 
    total: number; 
    success: number; 
    successRate: number; 
    avgLatencyMs: number 
  }> {
    const chains = [...new Set(this.verificationHistory.map(v => v.chain))];
    const result: Record<string, any> = {};

    for (const chain of chains) {
      const verifications = this.verificationHistory.filter(v => v.chain === chain);
      const successful = verifications.filter(v => v.success);

      result[chain] = {
        total: verifications.length,
        success: successful.length,
        successRate: successful.length / verifications.length,
        avgLatencyMs: verifications.reduce((sum, v) => sum + v.latencyMs, 0) / verifications.length,
      };
    }

    return result;
  }

  // ===========================================================================
  // SOURCE METRICS
  // ===========================================================================

  /**
   * Record source request
   */
  recordSourceRequest(
    source: string,
    success: boolean,
    latencyMs: number
  ): void {
    // Get or create source metric
    let metric = this.sourceMetrics.get(source);
    if (!metric) {
      metric = {
        source,
        requestsTotal: 0,
        successTotal: 0,
        errorsTotal: 0,
        avgLatencyMs: 0,
        reliability: 1.0,
        lastUpdated: new Date(),
      };
      this.sourceMetrics.set(source, metric);
    }

    // Update metrics
    metric.requestsTotal++;
    if (success) {
      metric.successTotal++;
    } else {
      metric.errorsTotal++;
    }

    // Rolling average latency
    metric.avgLatencyMs = (metric.avgLatencyMs * 0.9) + (latencyMs * 0.1);
    metric.reliability = metric.successTotal / metric.requestsTotal;
    metric.lastUpdated = new Date();

    // Update Prometheus
    this.prometheus.incCounter(`${this.PREFIX}_source_requests_total`, {
      source,
      status: success ? 'success' : 'error',
    });

    this.prometheus.setGauge(`${this.PREFIX}_source_reliability`, metric.reliability, {
      source,
    });

    this.prometheus.setGauge(`${this.PREFIX}_source_latency_avg_ms`, metric.avgLatencyMs, {
      source,
    });

    this.emit('source_request', { source, success, latencyMs });
  }

  /**
   * Get source reliability rankings
   */
  getSourceReliability(): SourceMetric[] {
    return Array.from(this.sourceMetrics.values())
      .sort((a, b) => b.reliability - a.reliability);
  }

  // ===========================================================================
  // CONSENSUS METRICS
  // ===========================================================================

  /**
   * Record consensus calculation
   */
  recordConsensus(metric: ConsensusMetric): void {
    this.consensusHistory.push(metric);

    // Observe sources used histogram
    this.prometheus.observeHistogram(
      `${this.PREFIX}_consensus_sources_used`,
      metric.sourcesUsed,
      { token: metric.tokenSymbol }
    );

    // Update agreement rate gauge
    this.prometheus.setGauge(
      `${this.PREFIX}_consensus_agreement_rate`,
      metric.agreementRate
    );

    // Update confidence gauge
    this.prometheus.setGauge(
      `${this.PREFIX}_consensus_confidence`,
      metric.confidenceScore
    );

    this.emit('consensus', metric);
  }

  /**
   * Record anomaly detection
   */
  recordAnomaly(source: string): void {
    this.prometheus.incCounter(`${this.PREFIX}_consensus_anomalies_total`, {
      source,
    });

    this.emit('anomaly', { source, timestamp: new Date() });
  }

  // ===========================================================================
  // REAL-TIME METRICS
  // ===========================================================================

  /**
   * Record real-time event
   */
  recordRealtimeEvent(
    chain: string,
    type: string,
    latencyMs: number
  ): void {
    this.prometheus.incCounter(`${this.PREFIX}_realtime_events_total`, {
      chain,
      type,
    });

    this.prometheus.observeHistogram(
      `${this.PREFIX}_realtime_latency_ms`,
      latencyMs,
      { chain }
    );

    this.emit('realtime_event', { chain, type, latencyMs });
  }

  /**
   * Update active subscriptions count
   */
  updateSubscriptionCount(chain: string, count: number): void {
    this.prometheus.setGauge(`${this.PREFIX}_realtime_subscriptions_active`, count, {
      chain,
    });
  }

  // ===========================================================================
  // CACHE METRICS
  // ===========================================================================

  /**
   * Update cache metrics
   */
  updateCacheMetrics(
    cacheType: 'lru' | 'redis' | 'prediction',
    hitRate: number,
    size: number
  ): void {
    this.prometheus.setGauge(`${this.PREFIX}_cache_hit_rate`, hitRate, {
      cache_type: cacheType,
    });

    this.prometheus.setGauge(`${this.PREFIX}_cache_size`, size, {
      cache_type: cacheType,
    });
  }

  // ===========================================================================
  // ERROR METRICS
  // ===========================================================================

  /**
   * Record error
   */
  recordError(errorType: string, component: string): void {
    this.prometheus.incCounter(`${this.PREFIX}_errors_total`, {
      error_type: errorType,
      component,
    });

    this.emit('error', { errorType, component, timestamp: new Date() });
  }

  // ===========================================================================
  // SUMMARY & HEALTH
  // ===========================================================================

  /**
   * Get comprehensive metrics summary
   */
  getSummary(): {
    prediction: Record<string, any>;
    verification: Record<string, any>;
    sources: SourceMetric[];
    consensus: { avgAgreement: number; avgConfidence: number; totalAnomalies: number };
    health: { status: string; issues: string[] };
  } {
    const predictionAccuracy = this.getPredictionAccuracy();
    const verificationSummary = this.getVerificationSummary();
    const sourceReliability = this.getSourceReliability();

    // Consensus summary
    const recentConsensus = this.consensusHistory.slice(-100);
    const avgAgreement = recentConsensus.length > 0
      ? recentConsensus.reduce((sum, c) => sum + c.agreementRate, 0) / recentConsensus.length
      : 0;
    const avgConfidence = recentConsensus.length > 0
      ? recentConsensus.reduce((sum, c) => sum + c.confidenceScore, 0) / recentConsensus.length
      : 0;

    // Health assessment
    const issues: string[] = [];
    const avgPredictionAccuracy = Object.values(predictionAccuracy)
      .reduce((sum, p) => sum + p.accuracy, 0) / Object.keys(predictionAccuracy).length;

    if (avgPredictionAccuracy < 0.8) {
      issues.push(`Prediction accuracy below 80%: ${(avgPredictionAccuracy * 100).toFixed(1)}%`);
    }
    if (avgAgreement < 0.9) {
      issues.push(`Consensus agreement below 90%: ${(avgAgreement * 100).toFixed(1)}%`);
    }

    const lowReliabilitySources = sourceReliability.filter(s => s.reliability < 0.9);
    if (lowReliabilitySources.length > 0) {
      issues.push(`Low reliability sources: ${lowReliabilitySources.map(s => s.source).join(', ')}`);
    }

    return {
      prediction: predictionAccuracy,
      verification: verificationSummary,
      sources: sourceReliability,
      consensus: {
        avgAgreement,
        avgConfidence,
        totalAnomalies: this.consensusHistory.reduce((sum, c) => sum + c.anomaliesDetected, 0),
      },
      health: {
        status: issues.length === 0 ? 'healthy' : issues.length < 3 ? 'degraded' : 'unhealthy',
        issues,
      },
    };
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // Every hour
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.config.retentionHours * 60 * 60 * 1000;

    this.predictionHistory = this.predictionHistory.filter(
      p => p.timestamp.getTime() > cutoff
    );
    this.verificationHistory = this.verificationHistory.filter(
      v => v.timestamp.getTime() > cutoff
    );
    this.consensusHistory = this.consensusHistory.filter(
      c => c.timestamp.getTime() > cutoff
    );

    logger.debug('Unlock metrics cleaned up', {
      predictions: this.predictionHistory.length,
      verifications: this.verificationHistory.length,
      consensus: this.consensusHistory.length,
    });
  }
}

// Singleton
let instance: UnlockMetrics | null = null;

export function getUnlockMetrics(config?: Partial<UnlockMetricConfig>): UnlockMetrics {
  if (!instance) {
    instance = new UnlockMetrics(config);
  }
  return instance;
}

export function resetUnlockMetrics(): void {
  instance = null;
}

export default UnlockMetrics;

