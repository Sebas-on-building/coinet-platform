/**
 * ============================================
 * WHALE SHADOW MODE
 * ============================================
 * 
 * Real-time monitoring of top whales:
 * - Tracks top N whales per chain
 * - Monitors for activity patterns
 * - Generates predictions on activity
 * - Sends alerts on significant moves
 * - Shadow trading recommendations
 */

import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import { Chain, WhaleTier } from '../types';
import { WhalePredictor, WhalePrediction, getWhalePredictor } from './WhalePredictor';
import { HistoricalDataCollector, getHistoricalDataCollector } from './HistoricalDataCollector';
import { WhaleFusionEngine, getWhaleFusionEngine } from '../clients/WhaleFusionEngine';

// =============================================================================
// TYPES
// =============================================================================

export interface ShadowConfig {
  maxWhalesPerChain: number;
  monitoringIntervalMs: number;
  predictionIntervalMs: number;
  alertThreshold: number; // Probability threshold for alerts
  enableAutoTracking: boolean;
  chains: Chain[];
}

export interface TrackedWhale {
  address: string;
  chain: Chain;
  tier: WhaleTier;
  addedAt: Date;
  lastActivityAt: Date;
  totalValueTracked: number;
  transferCount: number;
  accuracy: number; // Prediction accuracy for this whale
  isActive: boolean;
  tags: string[];
  notes?: string;
}

export interface ShadowAlert {
  id: string;
  whale: TrackedWhale;
  prediction: WhalePrediction;
  alertType: 'IMMINENT_MOVE' | 'LARGE_TRANSFER' | 'PATTERN_CHANGE' | 'UNUSUAL_ACTIVITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  recommendation: string;
  createdAt: Date;
  acknowledged: boolean;
}

export interface ShadowStats {
  totalTrackedWhales: number;
  activeWhales: number;
  totalAlerts: number;
  alertsLast24h: number;
  avgPredictionAccuracy: number;
  lastScanTime: Date | null;
}

const DEFAULT_CONFIG: ShadowConfig = {
  maxWhalesPerChain: 100,
  monitoringIntervalMs: 60000, // 1 minute
  predictionIntervalMs: 300000, // 5 minutes
  alertThreshold: 0.7,
  enableAutoTracking: true,
  chains: [Chain.ETHEREUM, Chain.POLYGON, Chain.ARBITRUM],
};

// =============================================================================
// MAIN CLASS
// =============================================================================

export class WhaleShadowMode extends EventEmitter {
  private logger: any;
  private config: ShadowConfig;
  
  // Dependencies
  private predictor: WhalePredictor;
  private dataCollector: HistoricalDataCollector;
  private fusionEngine: WhaleFusionEngine | null = null;
  
  // Tracked whales
  private trackedWhales: Map<string, TrackedWhale> = new Map();
  
  // Alerts
  private alerts: ShadowAlert[] = [];
  private alertHandlers: Array<(alert: ShadowAlert) => void> = [];
  
  // Monitoring state
  private isRunning: boolean = false;
  private monitoringTimer: NodeJS.Timeout | null = null;
  private predictionTimer: NodeJS.Timeout | null = null;
  
  // Stats
  private stats: ShadowStats = {
    totalTrackedWhales: 0,
    activeWhales: 0,
    totalAlerts: 0,
    alertsLast24h: 0,
    avgPredictionAccuracy: 0,
    lastScanTime: null,
  };

  constructor(config?: Partial<ShadowConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = createLogger({ component: 'WhaleShadowMode' });
    
    // Initialize dependencies
    this.predictor = getWhalePredictor();
    this.dataCollector = getHistoricalDataCollector();
    
    try {
      this.fusionEngine = getWhaleFusionEngine();
    } catch {
      this.logger.warn('WhaleFusionEngine not available, using limited mode');
    }

    this.logger.info('WhaleShadowMode initialized', {
      maxWhalesPerChain: this.config.maxWhalesPerChain,
      chains: this.config.chains,
    });
  }

  // ===========================================================================
  // WHALE TRACKING
  // ===========================================================================

  /**
   * Add whale to tracking
   */
  trackWhale(
    address: string,
    chain: Chain,
    options?: {
      tier?: WhaleTier;
      tags?: string[];
      notes?: string;
    }
  ): TrackedWhale {
    const key = `${chain}:${address}`;
    
    if (this.trackedWhales.has(key)) {
      this.logger.debug('Whale already tracked', { address: address.slice(0, 10) + '...' });
      return this.trackedWhales.get(key)!;
    }

    const whale: TrackedWhale = {
      address,
      chain,
      tier: options?.tier || WhaleTier.WHALE,
      addedAt: new Date(),
      lastActivityAt: new Date(),
      totalValueTracked: 0,
      transferCount: 0,
      accuracy: 0,
      isActive: true,
      tags: options?.tags || [],
      notes: options?.notes,
    };

    this.trackedWhales.set(key, whale);
    this.stats.totalTrackedWhales = this.trackedWhales.size;
    this.stats.activeWhales = Array.from(this.trackedWhales.values()).filter(w => w.isActive).length;

    this.logger.info('Whale added to tracking', {
      address: address.slice(0, 10) + '...',
      chain,
      tier: whale.tier,
    });

    this.emit('whale_tracked', whale);
    return whale;
  }

  /**
   * Remove whale from tracking
   */
  untrackWhale(address: string, chain: Chain): boolean {
    const key = `${chain}:${address}`;
    const removed = this.trackedWhales.delete(key);
    
    if (removed) {
      this.stats.totalTrackedWhales = this.trackedWhales.size;
      this.logger.info('Whale removed from tracking', { address: address.slice(0, 10) + '...' });
      this.emit('whale_untracked', { address, chain });
    }
    
    return removed;
  }

  /**
   * Get tracked whale
   */
  getTrackedWhale(address: string, chain: Chain): TrackedWhale | undefined {
    return this.trackedWhales.get(`${chain}:${address}`);
  }

  /**
   * Get all tracked whales
   */
  getAllTrackedWhales(): TrackedWhale[] {
    return Array.from(this.trackedWhales.values());
  }

  /**
   * Auto-discover top whales
   */
  async autoDiscoverWhales(chain: Chain, count: number = 50): Promise<TrackedWhale[]> {
    this.logger.info('Auto-discovering whales', { chain, count });

    // In production, this would query for top holders/traders
    // For now, generate mock addresses
    const discovered: TrackedWhale[] = [];

    for (let i = 0; i < count; i++) {
      const address = `0x${i.toString(16).padStart(40, '0')}`;
      const tier = i < 10 ? WhaleTier.MEGA_WHALE : 
                   i < 30 ? WhaleTier.LARGE_WHALE : 
                   WhaleTier.WHALE;

      const whale = this.trackWhale(address, chain, {
        tier,
        tags: ['auto-discovered'],
      });
      discovered.push(whale);
    }

    this.logger.info('Whales auto-discovered', { chain, count: discovered.length });
    return discovered;
  }

  // ===========================================================================
  // MONITORING
  // ===========================================================================

  /**
   * Start shadow mode monitoring
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('Shadow mode already running');
      return;
    }

    this.isRunning = true;

    // Start monitoring timer
    this.monitoringTimer = setInterval(
      () => this.runMonitoringCycle(),
      this.config.monitoringIntervalMs
    );

    // Start prediction timer
    this.predictionTimer = setInterval(
      () => this.runPredictionCycle(),
      this.config.predictionIntervalMs
    );

    this.logger.info('Shadow mode started', {
      monitoringInterval: this.config.monitoringIntervalMs,
      predictionInterval: this.config.predictionIntervalMs,
    });

    this.emit('started');
  }

  /**
   * Stop shadow mode monitoring
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    if (this.predictionTimer) {
      clearInterval(this.predictionTimer);
      this.predictionTimer = null;
    }

    this.logger.info('Shadow mode stopped');
    this.emit('stopped');
  }

  /**
   * Run monitoring cycle
   */
  private async runMonitoringCycle(): Promise<void> {
    const startTime = Date.now();
    this.logger.debug('Running monitoring cycle');

    try {
      const activeWhales = Array.from(this.trackedWhales.values()).filter(w => w.isActive);

      for (const whale of activeWhales) {
        await this.checkWhaleActivity(whale);
      }

      this.stats.lastScanTime = new Date();

      this.logger.debug('Monitoring cycle complete', {
        whalesChecked: activeWhales.length,
        durationMs: Date.now() - startTime,
      });

    } catch (error: any) {
      this.logger.error('Monitoring cycle failed', { error: error.message });
    }
  }

  /**
   * Run prediction cycle
   */
  private async runPredictionCycle(): Promise<void> {
    const startTime = Date.now();
    this.logger.debug('Running prediction cycle');

    try {
      const activeWhales = Array.from(this.trackedWhales.values()).filter(w => w.isActive);
      const predictions: WhalePrediction[] = [];

      for (const whale of activeWhales) {
        const prediction = await this.predictor.predict(whale.address, whale.chain);
        predictions.push(prediction);

        // Check if alert threshold met
        if (prediction.probability >= this.config.alertThreshold) {
          this.generateAlert(whale, prediction);
        }
      }

      this.logger.debug('Prediction cycle complete', {
        predictionsGenerated: predictions.length,
        durationMs: Date.now() - startTime,
      });

      this.emit('predictions_updated', predictions);

    } catch (error: any) {
      this.logger.error('Prediction cycle failed', { error: error.message });
    }
  }

  /**
   * Check whale activity
   */
  private async checkWhaleActivity(whale: TrackedWhale): Promise<void> {
    try {
      // Collect latest data
      await this.dataCollector.collectForWhale(whale.address, whale.chain);

      const data = this.dataCollector.getWhaleData(whale.address, whale.chain);
      if (data && data.transfers.length > 0) {
        const latestTransfer = data.transfers[data.transfers.length - 1];
        whale.lastActivityAt = new Date(latestTransfer.metadata?.blockTimestamp || Date.now());
        whale.transferCount = data.transfers.length;
        whale.totalValueTracked = data.transfers.reduce((sum, t) => sum + (t.value || 0), 0);
      }

    } catch (error: any) {
      this.logger.debug('Failed to check whale activity', {
        whale: whale.address.slice(0, 10) + '...',
        error: error.message,
      });
    }
  }

  // ===========================================================================
  // ALERTS
  // ===========================================================================

  /**
   * Generate alert
   */
  private generateAlert(whale: TrackedWhale, prediction: WhalePrediction): ShadowAlert {
    const alert: ShadowAlert = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      whale,
      prediction,
      alertType: this.determineAlertType(prediction),
      severity: this.determineSeverity(prediction, whale),
      message: this.generateAlertMessage(whale, prediction),
      recommendation: this.generateRecommendation(prediction),
      createdAt: new Date(),
      acknowledged: false,
    };

    this.alerts.push(alert);
    this.stats.totalAlerts = this.alerts.length;
    this.stats.alertsLast24h = this.alerts.filter(a => 
      Date.now() - a.createdAt.getTime() < 24 * 60 * 60 * 1000
    ).length;

    this.logger.info('Alert generated', {
      alertId: alert.id,
      whale: whale.address.slice(0, 10) + '...',
      type: alert.alertType,
      severity: alert.severity,
    });

    // Notify handlers
    for (const handler of this.alertHandlers) {
      try {
        handler(alert);
      } catch (error) {
        this.logger.error('Alert handler failed', { error });
      }
    }

    this.emit('alert', alert);
    return alert;
  }

  /**
   * Determine alert type
   */
  private determineAlertType(prediction: WhalePrediction): ShadowAlert['alertType'] {
    if (prediction.timeframe === 'immediate') {
      return 'IMMINENT_MOVE';
    }
    if (prediction.expectedValueRange.max > 1000000) {
      return 'LARGE_TRANSFER';
    }
    if (prediction.confidence < 0.5) {
      return 'UNUSUAL_ACTIVITY';
    }
    return 'PATTERN_CHANGE';
  }

  /**
   * Determine severity
   */
  private determineSeverity(
    prediction: WhalePrediction,
    whale: TrackedWhale
  ): ShadowAlert['severity'] {
    let score = 0;

    // Higher probability = higher severity
    if (prediction.probability > 0.9) score += 3;
    else if (prediction.probability > 0.8) score += 2;
    else if (prediction.probability > 0.7) score += 1;

    // Mega whales = higher severity
    if (whale.tier === WhaleTier.MEGA_WHALE) score += 2;
    else if (whale.tier === WhaleTier.LARGE_WHALE) score += 1;

    // Immediate timeframe = higher severity
    if (prediction.timeframe === 'immediate') score += 2;
    else if (prediction.timeframe === '1h') score += 1;

    // Large expected value = higher severity
    if (prediction.expectedValueRange.max > 10000000) score += 2;
    else if (prediction.expectedValueRange.max > 1000000) score += 1;

    if (score >= 7) return 'CRITICAL';
    if (score >= 5) return 'HIGH';
    if (score >= 3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(whale: TrackedWhale, prediction: WhalePrediction): string {
    const tierLabel = {
      [WhaleTier.MEGA_WHALE]: '🐋 MEGA WHALE',
      [WhaleTier.LARGE_WHALE]: '🐳 Large Whale',
      [WhaleTier.WHALE]: '🐟 Whale',
    }[whale.tier];

    const actionEmoji = {
      BUY: '🟢',
      SELL: '🔴',
      HOLD: '⚪',
      TRANSFER: '🔄',
    }[prediction.predictedAction];

    return `${tierLabel} ${whale.address.slice(0, 10)}... predicted to ${actionEmoji} ${prediction.predictedAction} ` +
           `with ${(prediction.probability * 100).toFixed(0)}% probability (${prediction.timeframe} timeframe)`;
  }

  /**
   * Generate recommendation
   */
  private generateRecommendation(prediction: WhalePrediction): string {
    const recommendations: Record<string, string> = {
      BUY: `Consider following this whale's buy. Expected tokens: ${prediction.expectedTokens.join(', ') || 'Unknown'}. ` +
           `Value range: $${prediction.expectedValueRange.min.toLocaleString()} - $${prediction.expectedValueRange.max.toLocaleString()}`,
      SELL: `Whale may be taking profits. Consider reducing exposure to their preferred tokens. ` +
            `Potential sell pressure: $${prediction.expectedValueRange.max.toLocaleString()}`,
      HOLD: `No immediate action expected. Continue monitoring.`,
      TRANSFER: `Whale moving funds. Could indicate preparation for trading or cold storage move.`,
    };

    return recommendations[prediction.predictedAction] || 'Monitor for updates.';
  }

  /**
   * Register alert handler
   */
  onAlert(handler: (alert: ShadowAlert) => void): void {
    this.alertHandlers.push(handler);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts(): ShadowAlert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Get alerts for whale
   */
  getAlertsForWhale(address: string, chain: Chain): ShadowAlert[] {
    return this.alerts.filter(a => 
      a.whale.address === address && a.whale.chain === chain
    );
  }

  // ===========================================================================
  // STATS & UTILITIES
  // ===========================================================================

  /**
   * Get stats
   */
  getStats(): ShadowStats {
    return {
      ...this.stats,
      avgPredictionAccuracy: this.predictor.getAccuracy(),
    };
  }

  /**
   * Get predictions for all tracked whales
   */
  async getAllPredictions(): Promise<WhalePrediction[]> {
    const predictions: WhalePrediction[] = [];
    const activeWhales = Array.from(this.trackedWhales.values()).filter(w => w.isActive);

    for (const whale of activeWhales) {
      const prediction = await this.predictor.predict(whale.address, whale.chain);
      predictions.push(prediction);
    }

    return predictions;
  }

  /**
   * Check if running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = [];
    this.stats.totalAlerts = 0;
    this.stats.alertsLast24h = 0;
    this.logger.info('All alerts cleared');
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let shadowModeInstance: WhaleShadowMode | null = null;

export function getWhaleShadowMode(config?: Partial<ShadowConfig>): WhaleShadowMode {
  if (!shadowModeInstance) {
    shadowModeInstance = new WhaleShadowMode(config);
  }
  return shadowModeInstance;
}

export function resetWhaleShadowMode(): void {
  if (shadowModeInstance) {
    shadowModeInstance.stop();
  }
  shadowModeInstance = null;
}

export default WhaleShadowMode;

