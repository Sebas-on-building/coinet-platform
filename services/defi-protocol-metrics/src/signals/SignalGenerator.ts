/**
 * =========================================
 * SIGNAL GENERATOR
 * =========================================
 * Signal generation for DeFi protocol metrics based on thresholds and anomalies
 */

import { Logger } from '../utils/Logger';
import type {
  DeFiSignal,
  TVLMetrics,
  YieldMetrics,
  LendingMetrics,
  LiquidityMetrics,
  AnomalyDetection,
  ProtocolInfo
} from '../types';

export interface SignalThresholds {
  tvlChange: number;
  yieldChange: number;
  lendingChange: number;
  liquidityChange: number;
  anomalyThreshold: number;
}

export class SignalGenerator {
  private logger: Logger;
  private thresholds: SignalThresholds;
  private isInitialized: boolean = false;
  private signals: DeFiSignal[] = [];

  constructor(thresholds: SignalThresholds) {
    this.logger = new Logger('SignalGenerator');
    this.thresholds = thresholds;
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Signal Generator...');

      this.isInitialized = true;
      this.logger.info('✅ Signal Generator initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Signal Generator', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.signals = [];
      this.isInitialized = false;
      this.logger.info('✅ Signal Generator stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop Signal Generator', error);
      throw error;
    }
  }

  async processMetrics(metricType: string, metrics: any): Promise<void> {
    try {
      const signal = await this.generateSignalFromMetrics(metricType, metrics);

      if (signal) {
        this.signals.push(signal);
        this.emit('signal', signal);

        this.logger.info(`Signal generated: ${signal.type} for ${signal.protocol.name} (${signal.severity})`);
      }

    } catch (error: any) {
      this.logger.error(`Failed to process ${metricType} metrics for signals`, error);
    }
  }

  async generateAnomalySignal(anomaly: AnomalyDetection): Promise<DeFiSignal | null> {
    try {
      const severity = this.mapAnomalySeverityToSignalSeverity(anomaly.severity);

      const signal: DeFiSignal = {
        id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'anomaly',
        protocol: anomaly.protocol,
        severity,
        title: `Anomaly Detected: ${anomaly.protocol.name} ${anomaly.metricType}`,
        description: anomaly.description,
        data: anomaly,
        impact: {
          tokens: this.estimateAffectedTokens(anomaly.protocol),
          users: this.estimateAffectedUsers(anomaly.protocol),
          tvl: anomaly.currentValue,
          volume: 0 // Would be estimated based on protocol
        },
        timestamp: new Date(),
        source: 'anomaly-detection'
      };

      return signal;

    } catch (error: any) {
      this.logger.error('Failed to generate anomaly signal', error);
      return null;
    }
  }

  getRecentSignals(limit: number = 50): DeFiSignal[] {
    return this.signals.slice(-limit);
  }

  getStatus(): string {
    return this.isInitialized ? `Active (${this.signals.length} signals)` : 'Not Initialized';
  }

  private async generateSignalFromMetrics(metricType: string, metrics: any): Promise<DeFiSignal | null> {
    try {
      let shouldGenerate = false;
      let signalType: DeFiSignal['type'];
      let severity: DeFiSignal['severity'] = 'info';
      let title = '';
      let description = '';

      switch (metricType) {
        case 'tvl':
          shouldGenerate = this.shouldGenerateTVLSignal(metrics);
          signalType = 'tvl_change';
          title = `TVL Change: ${metrics.protocol.name}`;
          description = `TVL changed by ${(metrics.totalValueLockedChange24h * 100).toFixed(2)}% in 24h`;
          severity = this.determineTVLSeverity(metrics.totalValueLockedChange24h);
          break;

        case 'yield':
          shouldGenerate = this.shouldGenerateYieldSignal(metrics);
          signalType = 'yield_change';
          title = `Yield Change: ${metrics.protocol.name} ${metrics.poolName}`;
          description = `APY changed by ${(metrics.apyChange24h * 100).toFixed(2)}% in 24h`;
          severity = this.determineYieldSeverity(metrics.apyChange24h);
          break;

        case 'lending':
          shouldGenerate = this.shouldGenerateLendingSignal(metrics);
          signalType = 'lending_change';
          title = `Lending Rate Change: ${metrics.protocol.name}`;
          description = `Lending rates changed significantly`;
          severity = this.determineLendingSeverity(metrics);
          break;

        case 'liquidity':
          shouldGenerate = this.shouldGenerateLiquiditySignal(metrics);
          signalType = 'liquidity_change';
          title = `Liquidity Change: ${metrics.protocol.name} ${metrics.pair}`;
          description = `Pool liquidity changed significantly`;
          severity = this.determineLiquiditySeverity(metrics);
          break;

        default:
          return null;
      }

      if (!shouldGenerate) {
        return null;
      }

      const signal: DeFiSignal = {
        id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: signalType,
        protocol: metrics.protocol,
        severity,
        title,
        description,
        data: metrics,
  impact: {
    tokens: this.estimateAffectedTokens(metrics.protocol),
    users: this.estimateAffectedUsers(metrics.protocol),
    tvl: this.getTVLFromMetrics(metrics),
    volume: this.getVolumeFromMetrics(metrics)
  },
        timestamp: new Date(),
        source: 'api'
      };

      return signal;

    } catch (error: any) {
      this.logger.error('Failed to generate signal from metrics', error);
      return null;
    }
  }

  private shouldGenerateTVLSignal(metrics: TVLMetrics): boolean {
    const change = Math.abs(metrics.totalValueLockedChange24h);
    return change >= this.thresholds.tvlChange / 100; // Convert percentage to decimal
  }

  private shouldGenerateYieldSignal(metrics: YieldMetrics): boolean {
    const change = Math.abs(metrics.apyChange24h);
    return change >= this.thresholds.yieldChange / 100;
  }

  private shouldGenerateLendingSignal(metrics: LendingMetrics): boolean {
    const supplyChange = Math.abs(metrics.supplyChange24h);
    const borrowChange = Math.abs(metrics.borrowChange24h);
    return supplyChange >= this.thresholds.lendingChange / 100 ||
           borrowChange >= this.thresholds.lendingChange / 100;
  }

  private shouldGenerateLiquiditySignal(metrics: LiquidityMetrics): boolean {
    // Check for significant liquidity changes
    const totalLiquidity = metrics.reserve0 + metrics.reserve1;
    const changeThreshold = totalLiquidity * (this.thresholds.liquidityChange / 100);
    const currentChange = Math.abs(metrics.reserve0 - (metrics.reserve0 * (1 + metrics.priceRatioChange24h)));

    return currentChange >= changeThreshold;
  }

  private determineTVLSeverity(change: number): DeFiSignal['severity'] {
    const absChange = Math.abs(change);
    if (absChange > 0.15) return 'emergency'; // 15%+ change
    if (absChange > 0.10) return 'critical';  // 10%+ change
    if (absChange > 0.05) return 'warning';   // 5%+ change
    return 'info';
  }

  private determineYieldSeverity(change: number): DeFiSignal['severity'] {
    const absChange = Math.abs(change);
    if (absChange > 0.10) return 'emergency'; // 10%+ APY change
    if (absChange > 0.05) return 'critical';  // 5%+ APY change
    if (absChange > 0.02) return 'warning';   // 2%+ APY change
    return 'info';
  }

  private determineLendingSeverity(metrics: LendingMetrics): DeFiSignal['severity'] {
    const supplyChange = Math.abs(metrics.supplyChange24h);
    const borrowChange = Math.abs(metrics.borrowChange24h);

    if (supplyChange > 0.20 || borrowChange > 0.20) return 'emergency';
    if (supplyChange > 0.15 || borrowChange > 0.15) return 'critical';
    if (supplyChange > 0.10 || borrowChange > 0.10) return 'warning';
    return 'info';
  }

  private determineLiquiditySeverity(metrics: LiquidityMetrics): DeFiSignal['severity'] {
    const totalLiquidity = metrics.reserve0 + metrics.reserve1;
    const changePercent = Math.abs(metrics.priceRatioChange24h);

    if (changePercent > 0.50) return 'emergency'; // 50%+ price change
    if (changePercent > 0.30) return 'critical';  // 30%+ price change
    if (changePercent > 0.20) return 'warning';   // 20%+ price change
    return 'info';
  }

  private mapAnomalySeverityToSignalSeverity(anomalySeverity: string): DeFiSignal['severity'] {
    switch (anomalySeverity) {
      case 'critical': return 'emergency';
      case 'high': return 'critical';
      case 'medium': return 'warning';
      default: return 'info';
    }
  }

  private extractTokensFromMetrics(metrics: any): string[] {
    // Extract token symbols from various metric types
    if (metrics.dominantToken) return [metrics.dominantToken];
    if (metrics.asset) return [metrics.asset];
    if (metrics.pair) return metrics.pair.split('-');
    return [];
  }

  private estimateAffectedTokens(protocol: ProtocolInfo): string[] {
    // Return the protocol's token symbol and related tokens
    return [protocol.tokenSymbol];
  }

  private estimateAffectedUsers(protocol: ProtocolInfo): number {
    // Estimate based on protocol type and TVL
    // This would be more sophisticated in practice
    switch (protocol.type) {
      case 'lending': return Math.floor(Math.random() * 50000) + 10000; // 10k-60k users
      case 'dex': return Math.floor(Math.random() * 100000) + 50000;    // 50k-150k users
      case 'yield-farming': return Math.floor(Math.random() * 20000) + 5000; // 5k-25k users
      default: return Math.floor(Math.random() * 10000) + 1000; // 1k-11k users
    }
  }

  private getTVLFromMetrics(metrics: any): number {
    return metrics.totalValueLocked || metrics.reserve0 + metrics.reserve1 || 0;
  }

  private getVolumeFromMetrics(metrics: any): number {
    return metrics.volume24h || metrics.fees24h * 100 || 0; // Estimate volume from fees
  }

  // Event emitter for signals
  private emit(event: string, data: any): void {
    // This will be connected to the main service's event system
  }

  on(event: string, listener: (...args: any[]) => void): void {
    // Event listener setup - will be connected to main service
  }
}
