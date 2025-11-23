/**
 * =========================================
 * ANOMALY DETECTOR
 * =========================================
 * Statistical anomaly detection for DeFi protocol metrics
 */

import { Logger } from '../utils/Logger';
import type { MetricsConfig, AnomalyDetection, ProtocolInfo, TVLMetrics, YieldMetrics } from '../types';

export class AnomalyDetector {
  private logger: Logger;
  private config: MetricsConfig;
  private isInitialized: boolean = false;
  private historicalData: Map<string, number[]> = new Map();
  private anomalies: AnomalyDetection[] = [];

  constructor(config: MetricsConfig) {
    this.logger = new Logger('AnomalyDetector');
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Anomaly Detector...');

      // Initialize historical data storage
      this.historicalData.clear();

      this.isInitialized = true;
      this.logger.info('✅ Anomaly Detector initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Anomaly Detector', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.historicalData.clear();
      this.anomalies = [];
      this.isInitialized = false;
      this.logger.info('✅ Anomaly Detector stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop Anomaly Detector', error);
      throw error;
    }
  }

  async detectAnomalies(metricType: string, metrics: any): Promise<void> {
    try {
      const protocolId = metrics.protocol.id;
      const currentValue = this.extractMetricValue(metricType, metrics);

      if (currentValue === null) {
        return;
      }

      // Update historical data
      this.updateHistoricalData(protocolId, metricType, currentValue);

      // Check for anomalies
      const anomaly = this.detectAnomaly(protocolId, metricType, metrics, currentValue);

      if (anomaly) {
        this.anomalies.push(anomaly);
        this.emit('anomaly', anomaly);

        this.logger.debug(`Anomaly detected: ${protocolId} ${metricType} ${anomaly.deviation.toFixed(2)}σ`);
      }

    } catch (error: any) {
      this.logger.error(`Failed to detect anomalies for ${metricType}`, error);
    }
  }

  getRecentAnomalies(limit: number = 50): AnomalyDetection[] {
    return this.anomalies.slice(-limit);
  }

  getStatus(): string {
    return this.isInitialized ? `Active (${this.anomalies.length} anomalies)` : 'Not Initialized';
  }

  private updateHistoricalData(protocolId: string, metricType: string, value: number): void {
    const key = `${protocolId}_${metricType}`;

    if (!this.historicalData.has(key)) {
      this.historicalData.set(key, []);
    }

    const data = this.historicalData.get(key)!;
    data.push(value);

    // Keep only recent data points
    if (data.length > this.config.minDataPoints * 2) {
      data.splice(0, data.length - this.config.minDataPoints);
    }
  }

  private detectAnomaly(protocolId: string, metricType: string, metrics: any, currentValue: number): AnomalyDetection | null {
    const key = `${protocolId}_${metricType}`;
    const data = this.historicalData.get(key);

    if (!data || data.length < this.config.minDataPoints) {
      return null; // Not enough data for anomaly detection
    }

    // Calculate baseline statistics
    const baseline = this.calculateBaseline(data);

    // Calculate deviation from baseline
    const deviation = this.calculateDeviation(currentValue, baseline);

    if (Math.abs(deviation) > this.config.anomalyThreshold) {
      return {
        metricType: metricType as any,
        protocol: metrics.protocol,
        currentValue,
        baseline: baseline.mean,
        deviation,
        severity: this.determineSeverity(deviation),
        description: this.generateAnomalyDescription(metricType, deviation, baseline),
        timestamp: new Date(),
        confidence: this.calculateConfidence(data, currentValue, baseline)
      };
    }

    return null;
  }

  private calculateBaseline(data: number[]): { mean: number; std: number; median: number } {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const std = Math.sqrt(variance);

    // Calculate median
    const sorted = [...data].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    return { mean, std, median };
  }

  private calculateDeviation(currentValue: number, baseline: { mean: number; std: number }): number {
    return (currentValue - baseline.mean) / baseline.std;
  }

  private determineSeverity(deviation: number): 'low' | 'medium' | 'high' | 'critical' {
    const absDeviation = Math.abs(deviation);

    if (absDeviation > 5) return 'critical';
    if (absDeviation > 3) return 'high';
    if (absDeviation > 2) return 'medium';
    return 'low';
  }

  private generateAnomalyDescription(metricType: string, deviation: number, baseline: any): string {
    const direction = deviation > 0 ? 'increased' : 'decreased';
    const magnitude = Math.abs(deviation).toFixed(1);

    switch (metricType) {
      case 'tvl':
        return `TVL has ${direction} by ${magnitude} standard deviations from baseline`;
      case 'yield':
        return `Yield has ${direction} by ${magnitude} standard deviations from baseline`;
      case 'lending':
        return `Lending rate has ${direction} by ${magnitude} standard deviations from baseline`;
      case 'liquidity':
        return `Liquidity has ${direction} by ${magnitude} standard deviations from baseline`;
      default:
        return `${metricType} has ${direction} by ${magnitude} standard deviations from baseline`;
    }
  }

  private calculateConfidence(data: number[], currentValue: number, baseline: any): number {
    // Higher confidence for more data points and larger deviations
    const dataPointBonus = Math.min(0.3, data.length / this.config.minDataPoints * 0.3);
    const deviationBonus = Math.min(0.4, Math.abs(baseline.deviation) / 5 * 0.4);
    const stabilityBonus = this.calculateStabilityBonus(data);

    return Math.min(0.95, 0.3 + dataPointBonus + deviationBonus + stabilityBonus);
  }

  private calculateStabilityBonus(data: number[]): number {
    // Bonus for stable historical data (lower variance)
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const cv = Math.sqrt(variance) / Math.abs(mean); // Coefficient of variation

    // Lower CV = more stable = higher confidence
    return Math.max(0, 0.3 - cv * 0.3);
  }

  private extractMetricValue(metricType: string, metrics: any): number | null {
    switch (metricType) {
      case 'tvl':
        return metrics.totalValueLocked || null;
      case 'yield':
        return metrics.apy || null;
      case 'lending':
        return metrics.supplyApy || metrics.borrowApy || null;
      case 'liquidity':
        return metrics.reserve0 || metrics.reserve1 || null;
      default:
        return null;
    }
  }

  // Event emitter for anomalies
  private emit(event: string, data: any): void {
    // This will be connected to the main service's event system
  }

  on(event: string, listener: (...args: any[]) => void): void {
    // Event listener setup - will be connected to main service
  }
}
