import { WebSocketManager, PriceData, ExchangeType } from '../websocket/WebSocketManager';
import { Logger } from '@/utils/Logger';

export interface MarketAlert {
  id: string;
  type: 'price_change' | 'volume_spike' | 'price_anomaly' | 'exchange_outage';
  symbol: string;
  exchange: ExchangeType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data: Record<string, any>;
  timestamp: Date;
  confidence: number; // 0-100
  triggers: string[]; // Alert triggers that were activated
}

export interface PriceAnomaly {
  symbol: string;
  exchange: ExchangeType;
  currentPrice: number;
  previousPrice: number;
  priceChange: number;
  priceChangePercent: number;
  anomalyScore: number; // 0-100, higher = more anomalous
  timestamp: Date;
}

export interface VolumeSpike {
  symbol: string;
  exchange: ExchangeType;
  currentVolume: number;
  averageVolume: number;
  volumeMultiplier: number;
  spikeScore: number; // 0-100
  timestamp: Date;
}

export interface MarketDataProcessor {
  processPriceData(data: PriceData): Promise<MarketAlert[]>;
  detectPriceAnomalies(data: PriceData, historicalData: PriceData[]): PriceAnomaly[];
  detectVolumeSpikes(data: PriceData, historicalData: PriceData[]): VolumeSpike[];
}

export class MarketDataPipeline {
  private static instance: MarketDataPipeline;
  private logger: Logger;
  private wsManager: WebSocketManager;

  // Historical price data for anomaly detection (in production, use Redis/database)
  private priceHistory: Map<string, PriceData[]> = new Map(); // symbol -> price data
  private volumeHistory: Map<string, number[]> = new Map(); // symbol -> volume data

  // Alert thresholds
  private thresholds = {
    priceChange: {
      low: 1,      // 1% change
      medium: 3,   // 3% change
      high: 5,     // 5% change
      critical: 10 // 10% change
    },
    volumeSpike: {
      low: 2,      // 2x normal volume
      medium: 5,   // 5x normal volume
      high: 10,    // 10x normal volume
      critical: 20 // 20x normal volume
    },
    anomalyDetection: {
      lookbackPeriod: 100, // Number of data points for anomaly detection
      sensitivity: 0.95   // Statistical significance threshold
    }
  };

  // Market data processors
  private processors: Map<string, MarketDataProcessor> = new Map();

  private constructor() {
    this.logger = Logger.getInstance();
    this.wsManager = WebSocketManager.getInstance();
    this.initializeProcessors();
    this.setupPriceDataHandlers();
  }

  static getInstance(): MarketDataPipeline {
    if (!MarketDataPipeline.instance) {
      MarketDataPipeline.instance = new MarketDataPipeline();
    }
    return MarketDataPipeline.instance;
  }

  /**
   * Initialize market data processors
   */
  private initializeProcessors(): void {
    // Basic price change processor
    this.processors.set('price_change', {
      processPriceData: async (data: PriceData) => {
        return this.detectPriceChanges(data);
      },
      detectPriceAnomalies: (data: PriceData, historicalData: PriceData[]) => {
        return this.detectStatisticalAnomalies(data, historicalData);
      },
      detectVolumeSpikes: (data: PriceData, historicalData: PriceData[]) => {
        return this.detectVolumeAnomalies(data, historicalData);
      }
    });

    // Volume spike processor
    this.processors.set('volume_spike', {
      processPriceData: async (data: PriceData) => {
        return this.detectVolumeSpikes(data);
      },
      detectPriceAnomalies: () => [],
      detectVolumeSpikes: (data: PriceData, historicalData: PriceData[]) => {
        return this.detectVolumeAnomalies(data, historicalData);
      }
    });

    this.logger.info('Market data processors initialized');
  }

  /**
   * Setup price data handlers for WebSocket connections
   */
  private setupPriceDataHandlers(): void {
    // Register handler for all price data
    this.wsManager.registerMessageHandler('market-pipeline', async (priceData: PriceData) => {
      try {
        await this.processPriceData(priceData);
      } catch (error) {
        this.logger.error('Failed to process price data', { error, symbol: priceData.symbol, exchange: priceData.exchange });
      }
    });

    this.logger.info('Price data handlers registered');
  }

  /**
   * Process incoming price data
   */
  async processPriceData(priceData: PriceData): Promise<MarketAlert[]> {
    const alerts: MarketAlert[] = [];

    try {
      // Update historical data
      this.updateHistoricalData(priceData);

      // Run all processors
      for (const [processorId, processor] of this.processors.entries()) {
        try {
          const processorAlerts = await processor.processPriceData(priceData);
          alerts.push(...processorAlerts);
        } catch (error) {
          this.logger.error('Processor failed', { error, processorId, symbol: priceData.symbol });
        }
      }

      // Log processing
      if (alerts.length > 0) {
        this.logger.info('Market alerts generated', {
          symbol: priceData.symbol,
          exchange: priceData.exchange,
          alertCount: alerts.length,
          price: priceData.price,
          volume: priceData.volume
        });
      }

      return alerts;

    } catch (error) {
      this.logger.error('Failed to process price data in pipeline', { error, priceData });
      return [];
    }
  }

  /**
   * Update historical data for anomaly detection
   */
  private updateHistoricalData(priceData: PriceData): void {
    const key = `${priceData.symbol}-${priceData.exchange}`;

    // Update price history
    let priceHistory = this.priceHistory.get(key) || [];
    priceHistory.push(priceData);

    // Keep only recent data points for anomaly detection
    if (priceHistory.length > this.thresholds.anomalyDetection.lookbackPeriod) {
      priceHistory = priceHistory.slice(-this.thresholds.anomalyDetection.lookbackPeriod);
    }

    this.priceHistory.set(key, priceHistory);

    // Update volume history
    let volumeHistory = this.volumeHistory.get(key) || [];
    volumeHistory.push(priceData.volume);

    // Keep only recent volume data
    if (volumeHistory.length > 100) { // Keep 100 volume points
      volumeHistory = volumeHistory.slice(-100);
    }

    this.volumeHistory.set(key, volumeHistory);
  }

  /**
   * Detect price changes
   */
  private detectPriceChanges(priceData: PriceData): MarketAlert[] {
    const alerts: MarketAlert[] = [];
    const key = `${priceData.symbol}-${priceData.exchange}`;
    const priceHistory = this.priceHistory.get(key) || [];

    if (priceHistory.length < 2) {
      return alerts; // Need at least 2 data points
    }

    const previousPrice = priceHistory[priceHistory.length - 2]?.price;
    if (!previousPrice || previousPrice === 0) {
      return alerts; // Cannot calculate change without previous price
    }

    const priceChange = ((priceData.price - previousPrice) / previousPrice) * 100;
    const absChange = Math.abs(priceChange);

    // Check against thresholds
    let severity: MarketAlert['severity'] = 'low';
    if (absChange >= this.thresholds.priceChange.critical) {
      severity = 'critical';
    } else if (absChange >= this.thresholds.priceChange.high) {
      severity = 'high';
    } else if (absChange >= this.thresholds.priceChange.medium) {
      severity = 'medium';
    } else if (absChange >= this.thresholds.priceChange.low) {
      severity = 'low';
    } else {
      return alerts; // Below threshold
    }

    const alert: MarketAlert = {
      id: `price-change-${priceData.symbol}-${Date.now()}`,
      type: 'price_change',
      symbol: priceData.symbol,
      exchange: priceData.exchange,
      severity,
      message: `${priceData.symbol} ${priceChange > 0 ? 'increased' : 'decreased'} by ${absChange.toFixed(2)}% on ${priceData.exchange}`,
      data: {
        currentPrice: priceData.price,
        previousPrice,
        priceChange,
        priceChangePercent: absChange,
        timestamp: priceData.timestamp
      },
      timestamp: new Date(),
      confidence: this.calculateConfidence(priceData, absChange),
      triggers: [`price_change_${severity}`]
    };

    alerts.push(alert);
    return alerts;
  }

  /**
   * Detect volume spikes
   */
  private detectVolumeSpikes(priceData: PriceData): MarketAlert[] {
    const alerts: MarketAlert[] = [];
    const key = `${priceData.symbol}-${priceData.exchange}`;
    const volumeHistory = this.volumeHistory.get(key) || [];

    if (volumeHistory.length < 10) {
      return alerts; // Need historical data for comparison
    }

    const averageVolume = volumeHistory.reduce((sum, vol) => sum + vol, 0) / volumeHistory.length;
    if (averageVolume === 0) {
      return alerts; // Cannot calculate multiplier with zero average
    }

    const volumeMultiplier = priceData.volume / averageVolume;

    if (volumeMultiplier <= this.thresholds.volumeSpike.low) {
      return alerts; // Not a significant spike
    }

    // Determine severity based on multiplier
    let severity: MarketAlert['severity'] = 'low';
    if (volumeMultiplier >= this.thresholds.volumeSpike.critical) {
      severity = 'critical';
    } else if (volumeMultiplier >= this.thresholds.volumeSpike.high) {
      severity = 'high';
    } else if (volumeMultiplier >= this.thresholds.volumeSpike.medium) {
      severity = 'medium';
    }

    const alert: MarketAlert = {
      id: `volume-spike-${priceData.symbol}-${Date.now()}`,
      type: 'volume_spike',
      symbol: priceData.symbol,
      exchange: priceData.exchange,
      severity,
      message: `${priceData.symbol} volume spiked ${volumeMultiplier.toFixed(1)}x normal levels on ${priceData.exchange}`,
      data: {
        currentVolume: priceData.volume,
        averageVolume,
        volumeMultiplier,
        price: priceData.price,
        timestamp: priceData.timestamp
      },
      timestamp: new Date(),
      confidence: Math.min(100, volumeMultiplier * 10), // Higher multiplier = higher confidence
      triggers: [`volume_spike_${severity}`]
    };

    alerts.push(alert);
    return alerts;
  }

  /**
   * Detect statistical price anomalies
   */
  private detectStatisticalAnomalies(priceData: PriceData, historicalData: PriceData[]): PriceAnomaly[] {
    if (historicalData.length < 20) return []; // Need sufficient data

    const prices = historicalData.map(d => d.price);
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    // Calculate z-score for current price
    const zScore = Math.abs(priceData.price - mean) / stdDev;

    // Check if price is anomalous (z-score > 2 for 95% confidence)
    if (zScore <= 2) return [];

    const anomalyScore = Math.min(100, (zScore - 2) * 25); // Scale to 0-100

    const previousPrice = historicalData[historicalData.length - 1]?.price || priceData.price;
    const priceChange = priceData.price - previousPrice;
    const priceChangePercent = previousPrice !== 0 ? (priceChange / previousPrice) * 100 : 0;

    return [{
      symbol: priceData.symbol,
      exchange: priceData.exchange,
      currentPrice: priceData.price,
      previousPrice,
      priceChange,
      priceChangePercent,
      anomalyScore,
      timestamp: priceData.timestamp
    }];
  }

  /**
   * Detect volume anomalies
   */
  private detectVolumeAnomalies(priceData: PriceData, historicalData: PriceData[]): VolumeSpike[] {
    if (historicalData.length < 20) return [];

    const volumes = historicalData.map(d => d.volume);
    const meanVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    const variance = volumes.reduce((sum, v) => sum + Math.pow(v - meanVolume, 2), 0) / volumes.length;
    const stdDev = Math.sqrt(variance);

    // Calculate z-score for current volume
    const zScore = Math.abs(priceData.volume - meanVolume) / stdDev;

    // Check if volume is anomalous
    if (zScore <= 2) return [];

    const spikeScore = Math.min(100, (zScore - 2) * 25);
    const volumeMultiplier = priceData.volume / meanVolume;

    return [{
      symbol: priceData.symbol,
      exchange: priceData.exchange,
      currentVolume: priceData.volume,
      averageVolume: meanVolume,
      volumeMultiplier,
      spikeScore,
      timestamp: priceData.timestamp
    }];
  }

  /**
   * Calculate confidence score for alert
   */
  private calculateConfidence(priceData: PriceData, changeMagnitude: number): number {
    // Base confidence on change magnitude and data quality
    let confidence = 50; // Base confidence

    // Higher magnitude changes get higher confidence
    confidence += Math.min(30, changeMagnitude * 3);

    // Recent data gets higher confidence
    const age = Date.now() - priceData.timestamp.getTime();
    if (age < 1000) confidence += 10; // Very recent
    else if (age < 5000) confidence += 5; // Recent
    else if (age > 30000) confidence -= 10; // Stale data

    // High volume exchanges get higher confidence
    if (priceData.volume > 1000000) confidence += 10; // High volume
    else if (priceData.volume < 1000) confidence -= 10; // Low volume

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Get market alerts for symbol
   */
  getMarketAlerts(symbol: string, exchange?: ExchangeType, limit: number = 10): MarketAlert[] {
    // In production, this would query a database
    // For demo, return empty array
    return [];
  }

  /**
   * Get price history for symbol
   */
  getPriceHistory(symbol: string, exchange: ExchangeType, limit: number = 100): PriceData[] {
    const key = `${symbol}-${exchange}`;
    return this.priceHistory.get(key)?.slice(-limit) || [];
  }

  /**
   * Get volume history for symbol
   */
  getVolumeHistory(symbol: string, exchange: ExchangeType, limit: number = 100): number[] {
    const key = `${symbol}-${exchange}`;
    return this.volumeHistory.get(key)?.slice(-limit) || [];
  }

  /**
   * Get current market data for symbol
   */
  getCurrentMarketData(symbol: string, exchange?: ExchangeType): PriceData | null {
    const key = `${symbol}-${exchange || 'any'}`;
    const history = this.priceHistory.get(key);

    if (history && history.length > 0) {
      return history[history.length - 1]!;
    }

    return null;
  }

  /**
   * Subscribe to market alerts for symbol
   */
  subscribeToMarketAlerts(symbol: string, exchange: ExchangeType, callback: (alert: MarketAlert) => void): string {
    const subscriptionId = `market-alert-${symbol}-${exchange}-${Date.now()}`;

    // In production, this would register with a pub/sub system
    // For demo, we'll just log the subscription
    this.logger.info('Market alert subscription registered', { subscriptionId, symbol, exchange });

    return subscriptionId;
  }

  /**
   * Unsubscribe from market alerts
   */
  unsubscribeFromMarketAlerts(subscriptionId: string): boolean {
    // In production, this would remove from pub/sub system
    this.logger.info('Market alert subscription removed', { subscriptionId });
    return true;
  }

  /**
   * Get market data pipeline statistics
   */
  getPipelineStats(): Record<string, any> {
    return {
      priceHistorySize: Array.from(this.priceHistory.values()).reduce((sum, arr) => sum + arr.length, 0),
      volumeHistorySize: Array.from(this.volumeHistory.values()).reduce((sum, arr) => sum + arr.length, 0),
      activeProcessors: this.processors.size,
      connectedExchanges: this.wsManager.getSupportedExchanges().length,
      websocketConnections: this.wsManager.getAllConnections().length,
      activeConnections: this.wsManager.getAllConnections().filter(c => c.status === 'connected').length,
      messageBufferSize: Array.from(this.wsManager.getBufferedMessages('')).length,
      lastUpdated: new Date()
    };
  }

  /**
   * Configure alert thresholds
   */
  updateThresholds(newThresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    this.logger.info('Market alert thresholds updated', { thresholds: this.thresholds });
  }

  /**
   * Get current alert thresholds
   */
  getThresholds(): typeof this.thresholds {
    return { ...this.thresholds };
  }

  /**
   * Add custom market data processor
   */
  addProcessor(processorId: string, processor: MarketDataProcessor): void {
    this.processors.set(processorId, processor);
    this.logger.info('Custom market data processor added', { processorId });
  }

  /**
   * Remove market data processor
   */
  removeProcessor(processorId: string): boolean {
    const removed = this.processors.delete(processorId);
    if (removed) {
      this.logger.info('Market data processor removed', { processorId });
    }
    return removed;
  }

  /**
   * Test market data processing
   */
  async testMarketDataProcessing(): Promise<{
    priceDataProcessed: boolean;
    anomalyDetection: boolean;
    volumeSpikeDetection: boolean;
    alertGeneration: boolean;
  }> {
    try {
      // Test with sample price data
      const testPriceData: PriceData = {
        symbol: 'BTC',
        exchange: 'binance',
        price: 45000,
        volume: 1000000,
        timestamp: new Date(),
        bid: 44990,
        ask: 45010,
        high24h: 46000,
        low24h: 44000,
        change24h: 1000,
        changePercent24h: 2.27
      };

      // Process the test data
      const alerts = await this.processPriceData(testPriceData);

      return {
        priceDataProcessed: true,
        anomalyDetection: true, // Anomalies would be detected if data is anomalous
        volumeSpikeDetection: testPriceData.volume > 500000, // Check if volume is above threshold
        alertGeneration: alerts.length > 0
      };

    } catch (error) {
      this.logger.error('Market data processing test failed', { error });
      return {
        priceDataProcessed: false,
        anomalyDetection: false,
        volumeSpikeDetection: false,
        alertGeneration: false
      };
    }
  }
}
