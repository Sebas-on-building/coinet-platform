/**
 * ============================================
 * CROSS-API CORRELATOR
 * ============================================
 * 
 * Detects correlations across all Coinet data sources:
 * - Price changes ↔ Whale activity
 * - Sentiment shifts ↔ Price movements
 * - Token unlocks ↔ Sell pressure
 * - Liquidity changes ↔ Volatility
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface CorrelationEvent {
  id: string;
  timestamp: Date;
  type: CorrelationType;
  symbols: string[];
  strength: number; // 0-100
  direction: 'positive' | 'negative' | 'inverse';
  description: string;
  sources: DataSource[];
  data: Record<string, unknown>;
}

export type CorrelationType = 
  | 'price_whale'           // Price ↔ Whale activity
  | 'price_sentiment'       // Price ↔ Sentiment
  | 'price_unlock'          // Price ↔ Token unlock
  | 'price_liquidity'       // Price ↔ Liquidity
  | 'whale_sentiment'       // Whale ↔ Sentiment
  | 'whale_unlock'          // Whale ↔ Unlock (pre-positioning)
  | 'multi_asset'           // Multiple assets moving together
  | 'sector_rotation';      // Sector-wide movement

export type DataSource = 
  | 'coingecko'
  | 'coinmarketcap'
  | 'defillama'
  | 'dexscreener'
  | 'alchemy'
  | 'quicknode'
  | 'cryptopanic'
  | 'internal_unlocks';

export interface CorrelationWindow {
  startTime: Date;
  endTime: Date;
  events: CorrelationEvent[];
}

export interface AssetCorrelation {
  asset1: string;
  asset2: string;
  correlation: number; // -1 to 1
  sampleSize: number;
  period: string;
  significance: 'high' | 'medium' | 'low';
}

// =============================================================================
// CROSS-API CORRELATOR
// =============================================================================

export class CrossApiCorrelator extends EventEmitter {
  private correlationHistory: CorrelationEvent[] = [];
  private assetCorrelations: Map<string, AssetCorrelation[]> = new Map();
  private eventBuffer: Map<string, Array<{ type: string; data: unknown; timestamp: Date }>> = new Map();

  private config = {
    correlationWindowMs: 3600000,  // 1 hour
    minCorrelationStrength: 0.6,   // Minimum correlation to report
    bufferSize: 100,               // Events per symbol
    significanceThreshold: 0.7,    // Statistical significance
  };

  constructor() {
    super();
    logger.info('CrossApiCorrelator initialized', { component: 'CrossApiCorrelator' });
  }

  // ===========================================================================
  // EVENT INGESTION
  // ===========================================================================

  /**
   * Record a price event
   */
  recordPriceEvent(symbol: string, data: {
    price: number;
    change: number;
    volume: number;
    source: DataSource;
  }): void {
    this.addToBuffer(symbol, 'price', data);
    this.checkCorrelations(symbol);
  }

  /**
   * Record a whale event
   */
  recordWhaleEvent(symbol: string, data: {
    txHash: string;
    valueUsd: number;
    direction: 'in' | 'out';
    walletType: string;
    source: DataSource;
  }): void {
    this.addToBuffer(symbol, 'whale', data);
    this.checkCorrelations(symbol);
  }

  /**
   * Record a sentiment event
   */
  recordSentimentEvent(symbol: string, data: {
    score: number;
    change: number;
    newsCount: number;
    source: DataSource;
  }): void {
    this.addToBuffer(symbol, 'sentiment', data);
    this.checkCorrelations(symbol);
  }

  /**
   * Record a liquidity event
   */
  recordLiquidityEvent(symbol: string, data: {
    totalLiquidity: number;
    change: number;
    source: DataSource;
  }): void {
    this.addToBuffer(symbol, 'liquidity', data);
    this.checkCorrelations(symbol);
  }

  /**
   * Record an unlock event
   */
  recordUnlockEvent(symbol: string, data: {
    amount: number;
    percentOfSupply: number;
    unlockDate: Date;
    source: DataSource;
  }): void {
    this.addToBuffer(symbol, 'unlock', data);
    this.checkCorrelations(symbol);
  }

  private addToBuffer(symbol: string, type: string, data: unknown): void {
    const buffer = this.eventBuffer.get(symbol) || [];
    buffer.push({ type, data, timestamp: new Date() });
    
    if (buffer.length > this.config.bufferSize) {
      buffer.shift();
    }
    
    this.eventBuffer.set(symbol, buffer);
  }

  // ===========================================================================
  // CORRELATION DETECTION
  // ===========================================================================

  /**
   * Check for correlations in recent events
   */
  private checkCorrelations(symbol: string): void {
    const buffer = this.eventBuffer.get(symbol);
    if (!buffer || buffer.length < 5) return;

    const now = Date.now();
    const windowStart = now - this.config.correlationWindowMs;
    
    const recentEvents = buffer.filter(e => e.timestamp.getTime() > windowStart);
    
    // Check price-whale correlation
    this.checkPriceWhaleCorrelation(symbol, recentEvents);
    
    // Check price-sentiment correlation
    this.checkPriceSentimentCorrelation(symbol, recentEvents);
    
    // Check whale-unlock correlation (pre-positioning)
    this.checkWhaleUnlockCorrelation(symbol, recentEvents);
  }

  /**
   * Check for price-whale correlation
   */
  private checkPriceWhaleCorrelation(
    symbol: string,
    events: Array<{ type: string; data: unknown; timestamp: Date }>
  ): void {
    const priceEvents = events.filter(e => e.type === 'price');
    const whaleEvents = events.filter(e => e.type === 'whale');

    if (priceEvents.length < 2 || whaleEvents.length < 2) return;

    // Calculate if whale activity preceded price movement
    const recentPrice = priceEvents[priceEvents.length - 1].data as { change: number };
    const whaleVolumeIn = whaleEvents
      .filter(e => (e.data as { direction: string }).direction === 'in')
      .reduce((sum, e) => sum + (e.data as { valueUsd: number }).valueUsd, 0);
    const whaleVolumeOut = whaleEvents
      .filter(e => (e.data as { direction: string }).direction === 'out')
      .reduce((sum, e) => sum + (e.data as { valueUsd: number }).valueUsd, 0);

    const netWhaleFlow = whaleVolumeIn - whaleVolumeOut;
    const priceChange = recentPrice.change;

    // Strong correlation: whale flow direction matches price direction
    if ((netWhaleFlow > 100000 && priceChange > 3) || (netWhaleFlow < -100000 && priceChange < -3)) {
      const strength = Math.min(100, Math.abs(netWhaleFlow) / 10000 + Math.abs(priceChange) * 5);
      
      if (strength > this.config.minCorrelationStrength * 100) {
        this.createCorrelation({
          type: 'price_whale',
          symbols: [symbol],
          strength,
          direction: 'positive',
          description: `Whale ${netWhaleFlow > 0 ? 'accumulation' : 'distribution'} ($${(Math.abs(netWhaleFlow) / 1e6).toFixed(1)}M) correlated with ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}% price move`,
          sources: ['alchemy', 'coingecko'],
          data: { netWhaleFlow, priceChange },
        });
      }
    }
  }

  /**
   * Check for price-sentiment correlation
   */
  private checkPriceSentimentCorrelation(
    symbol: string,
    events: Array<{ type: string; data: unknown; timestamp: Date }>
  ): void {
    const priceEvents = events.filter(e => e.type === 'price');
    const sentimentEvents = events.filter(e => e.type === 'sentiment');

    if (priceEvents.length < 1 || sentimentEvents.length < 1) return;

    const recentPrice = priceEvents[priceEvents.length - 1].data as { change: number };
    const recentSentiment = sentimentEvents[sentimentEvents.length - 1].data as { score: number; change: number };

    // Check if sentiment change aligns with price change
    if ((recentSentiment.change > 20 && recentPrice.change > 5) || 
        (recentSentiment.change < -20 && recentPrice.change < -5)) {
      const strength = Math.min(100, Math.abs(recentSentiment.change) + Math.abs(recentPrice.change) * 3);
      
      this.createCorrelation({
        type: 'price_sentiment',
        symbols: [symbol],
        strength,
        direction: 'positive',
        description: `Sentiment shift (${recentSentiment.change > 0 ? '+' : ''}${recentSentiment.change}) aligned with price ${recentPrice.change > 0 ? 'increase' : 'decrease'}`,
        sources: ['cryptopanic', 'coingecko'],
        data: { sentimentChange: recentSentiment.change, priceChange: recentPrice.change },
      });
    }
  }

  /**
   * Check for whale-unlock correlation (pre-positioning)
   */
  private checkWhaleUnlockCorrelation(
    symbol: string,
    events: Array<{ type: string; data: unknown; timestamp: Date }>
  ): void {
    const whaleEvents = events.filter(e => e.type === 'whale');
    const unlockEvents = events.filter(e => e.type === 'unlock');

    if (whaleEvents.length < 2 || unlockEvents.length < 1) return;

    const recentUnlock = unlockEvents[unlockEvents.length - 1].data as { 
      unlockDate: Date; 
      percentOfSupply: number 
    };
    
    const daysToUnlock = (recentUnlock.unlockDate.getTime() - Date.now()) / 86400000;
    
    // Check if whales are positioning before unlock
    if (daysToUnlock > 0 && daysToUnlock < 7) {
      const recentWhaleVolume = whaleEvents
        .reduce((sum, e) => sum + (e.data as { valueUsd: number }).valueUsd, 0);

      if (recentWhaleVolume > 500000) {
        const strength = Math.min(100, recentWhaleVolume / 50000 + (recentUnlock.percentOfSupply * 5));
        
        this.createCorrelation({
          type: 'whale_unlock',
          symbols: [symbol],
          strength,
          direction: 'positive',
          description: `$${(recentWhaleVolume / 1e6).toFixed(1)}M whale activity detected ${daysToUnlock.toFixed(0)} days before ${recentUnlock.percentOfSupply.toFixed(1)}% supply unlock`,
          sources: ['alchemy', 'internal_unlocks'],
          data: { whaleVolume: recentWhaleVolume, daysToUnlock, unlockPercent: recentUnlock.percentOfSupply },
        });
      }
    }
  }

  // ===========================================================================
  // MULTI-ASSET CORRELATIONS
  // ===========================================================================

  /**
   * Calculate correlation between two assets
   */
  calculateAssetCorrelation(
    asset1: string,
    asset2: string,
    priceHistory1: number[],
    priceHistory2: number[]
  ): AssetCorrelation {
    if (priceHistory1.length !== priceHistory2.length || priceHistory1.length < 10) {
      return {
        asset1,
        asset2,
        correlation: 0,
        sampleSize: 0,
        period: 'N/A',
        significance: 'low',
      };
    }

    // Calculate returns
    const returns1 = this.calculateReturns(priceHistory1);
    const returns2 = this.calculateReturns(priceHistory2);

    // Calculate Pearson correlation
    const correlation = this.pearsonCorrelation(returns1, returns2);
    
    let significance: 'high' | 'medium' | 'low';
    if (Math.abs(correlation) > 0.8) {
      significance = 'high';
    } else if (Math.abs(correlation) > 0.5) {
      significance = 'medium';
    } else {
      significance = 'low';
    }

    const result: AssetCorrelation = {
      asset1,
      asset2,
      correlation,
      sampleSize: priceHistory1.length,
      period: `${priceHistory1.length} samples`,
      significance,
    };

    // Store correlation
    const key = `${asset1}-${asset2}`;
    const existing = this.assetCorrelations.get(asset1) || [];
    existing.push(result);
    this.assetCorrelations.set(asset1, existing);

    return result;
  }

  private calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0);
    const sumX2 = x.reduce((acc, val) => acc + val * val, 0);
    const sumY2 = y.reduce((acc, val) => acc + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;
    return numerator / denominator;
  }

  /**
   * Detect sector rotation
   */
  detectSectorRotation(sectorPrices: Record<string, number[]>): {
    rotating: boolean;
    fromSector?: string;
    toSector?: string;
    strength: number;
  } {
    const sectors = Object.keys(sectorPrices);
    if (sectors.length < 2) {
      return { rotating: false, strength: 0 };
    }

    // Calculate recent performance for each sector
    const performance: Record<string, number> = {};
    for (const sector of sectors) {
      const prices = sectorPrices[sector];
      if (prices.length >= 2) {
        performance[sector] = (prices[prices.length - 1] - prices[0]) / prices[0] * 100;
      }
    }

    // Find best and worst performing sectors
    const sorted = Object.entries(performance).sort((a, b) => b[1] - a[1]);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    if (best[1] > 5 && worst[1] < -5) {
      return {
        rotating: true,
        fromSector: worst[0],
        toSector: best[0],
        strength: Math.min(100, (best[1] - worst[1]) * 3),
      };
    }

    return { rotating: false, strength: 0 };
  }

  // ===========================================================================
  // CORRELATION MANAGEMENT
  // ===========================================================================

  private createCorrelation(params: Omit<CorrelationEvent, 'id' | 'timestamp'>): void {
    const event: CorrelationEvent = {
      id: `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...params,
    };

    this.correlationHistory.push(event);
    
    // Keep last 1000 correlations
    if (this.correlationHistory.length > 1000) {
      this.correlationHistory.shift();
    }

    this.emit('correlation', event);
    
    logger.info('Correlation detected', {
      component: 'CrossApiCorrelator',
      type: event.type,
      symbols: event.symbols,
      strength: event.strength,
    });
  }

  /**
   * Get recent correlations
   */
  getCorrelations(options: {
    type?: CorrelationType;
    symbol?: string;
    minStrength?: number;
    limit?: number;
  } = {}): CorrelationEvent[] {
    let correlations = [...this.correlationHistory];

    if (options.type) {
      correlations = correlations.filter(c => c.type === options.type);
    }
    if (options.symbol) {
      correlations = correlations.filter(c => c.symbols.includes(options.symbol!));
    }
    if (options.minStrength) {
      correlations = correlations.filter(c => c.strength >= options.minStrength!);
    }

    return correlations.slice(-(options.limit || 100)).reverse();
  }

  /**
   * Get stats
   */
  getStats(): Record<string, unknown> {
    return {
      totalCorrelations: this.correlationHistory.length,
      symbolsTracked: this.eventBuffer.size,
      assetCorrelations: this.assetCorrelations.size,
      recentCorrelations: this.correlationHistory.slice(-10).map(c => ({
        type: c.type,
        symbols: c.symbols,
        strength: c.strength,
      })),
    };
  }
}

