/**
 * ============================================
 * FUSION ENGINE
 * ============================================
 * 
 * Core engine that fuses data from all Coinet services
 * into a unified intelligence stream.
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface FusionConfig {
  enablePredictiveAI: boolean;
  enableWhaleCorrelation: boolean;
  enableSentimentFusion: boolean;
  enableLiquidityAnalysis: boolean;
  cacheTimeoutMs: number;
  correlationWindowMs: number;
}

export interface PriceData {
  symbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  timestamp: Date;
  source: 'coingecko' | 'cmc' | 'defillama' | 'dexscreener';
}

export interface WhaleActivity {
  txHash: string;
  from: string;
  to: string;
  value: number;
  valueUsd: number;
  token: string;
  tokenSymbol: string;
  type: 'transfer' | 'swap' | 'mint' | 'burn';
  timestamp: Date;
  isKnownWallet: boolean;
  walletLabel?: string;
}

export interface TokenUnlockEvent {
  token: string;
  symbol: string;
  unlockDate: Date;
  amount: number;
  valueUsd: number;
  percentOfSupply: number;
  type: 'cliff' | 'linear' | 'team' | 'investor';
  impactPrediction: 'high' | 'medium' | 'low';
}

export interface SentimentData {
  symbol: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  score: number; // -100 to 100
  newsCount: number;
  topHeadlines: string[];
  socialMentions: number;
  timestamp: Date;
}

export interface LiquidityData {
  symbol: string;
  totalLiquidity: number;
  dexLiquidity: number;
  cexLiquidity: number;
  bidDepth: number;
  askDepth: number;
  slippage1Pct: number;
  timestamp: Date;
}

export interface FusedIntelligence {
  symbol: string;
  timestamp: Date;
  
  // Core data
  price: PriceData;
  sentiment?: SentimentData;
  liquidity?: LiquidityData;
  
  // Activity
  recentWhaleActivity: WhaleActivity[];
  upcomingUnlocks: TokenUnlockEvent[];
  
  // AI predictions
  predictions: {
    priceDirection: 'up' | 'down' | 'neutral';
    confidence: number;
    reasoning: string[];
    riskLevel: 'high' | 'medium' | 'low';
    correlatedEvents: CorrelatedEvent[];
  };
  
  // Alerts
  alerts: FusionAlert[];
}

export interface CorrelatedEvent {
  type: 'whale_activity' | 'unlock' | 'sentiment_shift' | 'liquidity_change';
  description: string;
  impactScore: number; // 0-100
  timestamp: Date;
}

export interface FusionAlert {
  id: string;
  type: 'whale_accumulation' | 'whale_distribution' | 'unlock_imminent' | 'sentiment_flip' | 'liquidity_crisis' | 'price_divergence';
  severity: 'critical' | 'high' | 'medium' | 'low';
  symbol: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

// =============================================================================
// FUSION ENGINE
// =============================================================================

export class FusionEngine extends EventEmitter {
  private config: FusionConfig;
  private priceCache: Map<string, PriceData> = new Map();
  private whaleCache: Map<string, WhaleActivity[]> = new Map();
  private sentimentCache: Map<string, SentimentData> = new Map();
  private liquidityCache: Map<string, LiquidityData> = new Map();
  private unlockCache: Map<string, TokenUnlockEvent[]> = new Map();
  private alertHistory: FusionAlert[] = [];

  constructor(config: Partial<FusionConfig> = {}) {
    super();
    this.config = {
      enablePredictiveAI: true,
      enableWhaleCorrelation: true,
      enableSentimentFusion: true,
      enableLiquidityAnalysis: true,
      cacheTimeoutMs: 30000,
      correlationWindowMs: 3600000, // 1 hour
      ...config,
    };
    
    logger.info('FusionEngine initialized', {
      component: 'FusionEngine',
      config: this.config,
    });
  }

  // ===========================================================================
  // DATA INGESTION
  // ===========================================================================

  /**
   * Ingest price data from any source
   */
  ingestPrice(data: PriceData): void {
    this.priceCache.set(data.symbol, data);
    this.emit('price:update', data);
    this.checkCorrelations(data.symbol);
  }

  /**
   * Ingest whale activity
   */
  ingestWhaleActivity(activity: WhaleActivity): void {
    const symbol = activity.tokenSymbol;
    const existing = this.whaleCache.get(symbol) || [];
    existing.push(activity);
    
    // Keep last 100 activities per token
    if (existing.length > 100) {
      existing.shift();
    }
    
    this.whaleCache.set(symbol, existing);
    this.emit('whale:activity', activity);
    this.checkCorrelations(symbol);
  }

  /**
   * Ingest sentiment data
   */
  ingestSentiment(data: SentimentData): void {
    const previous = this.sentimentCache.get(data.symbol);
    this.sentimentCache.set(data.symbol, data);
    
    // Check for sentiment flip
    if (previous && previous.sentiment !== data.sentiment) {
      this.createAlert({
        type: 'sentiment_flip',
        severity: 'medium',
        symbol: data.symbol,
        message: `Sentiment flipped from ${previous.sentiment} to ${data.sentiment}`,
        data: { previous: previous.sentiment, current: data.sentiment, score: data.score },
      });
    }
    
    this.emit('sentiment:update', data);
    this.checkCorrelations(data.symbol);
  }

  /**
   * Ingest liquidity data
   */
  ingestLiquidity(data: LiquidityData): void {
    const previous = this.liquidityCache.get(data.symbol);
    this.liquidityCache.set(data.symbol, data);
    
    // Check for liquidity crisis (>30% drop)
    if (previous && data.totalLiquidity < previous.totalLiquidity * 0.7) {
      this.createAlert({
        type: 'liquidity_crisis',
        severity: 'critical',
        symbol: data.symbol,
        message: `Liquidity dropped ${((1 - data.totalLiquidity / previous.totalLiquidity) * 100).toFixed(1)}%`,
        data: { previous: previous.totalLiquidity, current: data.totalLiquidity },
      });
    }
    
    this.emit('liquidity:update', data);
    this.checkCorrelations(data.symbol);
  }

  /**
   * Ingest unlock events
   */
  ingestUnlockEvent(event: TokenUnlockEvent): void {
    const symbol = event.symbol;
    const existing = this.unlockCache.get(symbol) || [];
    existing.push(event);
    this.unlockCache.set(symbol, existing);
    
    // Alert for imminent unlocks (within 24h)
    const hoursUntilUnlock = (event.unlockDate.getTime() - Date.now()) / 3600000;
    if (hoursUntilUnlock <= 24 && hoursUntilUnlock > 0) {
      this.createAlert({
        type: 'unlock_imminent',
        severity: event.impactPrediction === 'high' ? 'critical' : 'high',
        symbol: event.symbol,
        message: `Token unlock in ${hoursUntilUnlock.toFixed(1)} hours: ${event.percentOfSupply.toFixed(2)}% of supply`,
        data: { ...event, unlockDate: event.unlockDate.toISOString() },
      });
    }
    
    this.emit('unlock:event', event);
  }

  // ===========================================================================
  // CORRELATION DETECTION
  // ===========================================================================

  /**
   * Check for cross-API correlations
   */
  private checkCorrelations(symbol: string): void {
    if (!this.config.enableWhaleCorrelation) return;

    const price = this.priceCache.get(symbol);
    const whales = this.whaleCache.get(symbol) || [];
    const sentiment = this.sentimentCache.get(symbol);
    const liquidity = this.liquidityCache.get(symbol);
    const unlocks = this.unlockCache.get(symbol) || [];

    // Correlation: Whale accumulation + price pump
    const recentWhales = whales.filter(w => 
      Date.now() - w.timestamp.getTime() < this.config.correlationWindowMs
    );
    
    const accumulation = recentWhales.filter(w => 
      w.type === 'transfer' && w.isKnownWallet
    );
    
    if (accumulation.length >= 3 && price && price.priceChange24h > 5) {
      this.createAlert({
        type: 'whale_accumulation',
        severity: 'high',
        symbol,
        message: `Whale accumulation detected: ${accumulation.length} transfers, price up ${price.priceChange24h.toFixed(1)}%`,
        data: { transfers: accumulation.length, priceChange: price.priceChange24h },
      });
    }

    // Correlation: Whale distribution + price drop
    const distribution = recentWhales.filter(w => 
      w.type === 'transfer' && w.valueUsd > 100000
    );
    
    if (distribution.length >= 3 && price && price.priceChange24h < -5) {
      this.createAlert({
        type: 'whale_distribution',
        severity: 'high',
        symbol,
        message: `Whale distribution detected: ${distribution.length} large transfers, price down ${Math.abs(price.priceChange24h).toFixed(1)}%`,
        data: { transfers: distribution.length, priceChange: price.priceChange24h },
      });
    }

    // Emit correlation event for external handlers
    this.emit('correlation:detected', {
      symbol,
      price,
      recentWhales,
      sentiment,
      liquidity,
      upcomingUnlocks: unlocks.filter(u => u.unlockDate.getTime() > Date.now()),
    });
  }

  // ===========================================================================
  // FUSED INTELLIGENCE
  // ===========================================================================

  /**
   * Get fused intelligence for a symbol
   */
  async getFusedIntelligence(symbol: string): Promise<FusedIntelligence | null> {
    const price = this.priceCache.get(symbol);
    if (!price) {
      return null;
    }

    const sentiment = this.sentimentCache.get(symbol);
    const liquidity = this.liquidityCache.get(symbol);
    const whales = this.whaleCache.get(symbol) || [];
    const unlocks = this.unlockCache.get(symbol) || [];

    // Filter recent whale activity
    const recentWhales = whales
      .filter(w => Date.now() - w.timestamp.getTime() < this.config.correlationWindowMs)
      .slice(-10);

    // Filter upcoming unlocks
    const upcomingUnlocks = unlocks
      .filter(u => u.unlockDate.getTime() > Date.now())
      .sort((a, b) => a.unlockDate.getTime() - b.unlockDate.getTime())
      .slice(0, 5);

    // Generate predictions
    const predictions = this.generatePredictions(symbol, price, sentiment, liquidity, recentWhales, upcomingUnlocks);

    // Get relevant alerts
    const alerts = this.alertHistory
      .filter(a => a.symbol === symbol && Date.now() - a.timestamp.getTime() < 86400000)
      .slice(-10);

    return {
      symbol,
      timestamp: new Date(),
      price,
      sentiment,
      liquidity,
      recentWhaleActivity: recentWhales,
      upcomingUnlocks,
      predictions,
      alerts,
    };
  }

  /**
   * Generate AI predictions based on fused data
   */
  private generatePredictions(
    symbol: string,
    price: PriceData,
    sentiment: SentimentData | undefined,
    liquidity: LiquidityData | undefined,
    whales: WhaleActivity[],
    unlocks: TokenUnlockEvent[],
  ): FusedIntelligence['predictions'] {
    const reasoning: string[] = [];
    const correlatedEvents: CorrelatedEvent[] = [];
    let bullishScore = 0;
    let bearishScore = 0;
    let riskScore = 0;

    // Price momentum
    if (price.priceChange24h > 5) {
      bullishScore += 20;
      reasoning.push(`Price up ${price.priceChange24h.toFixed(1)}% in 24h`);
    } else if (price.priceChange24h < -5) {
      bearishScore += 20;
      reasoning.push(`Price down ${Math.abs(price.priceChange24h).toFixed(1)}% in 24h`);
    }

    // Sentiment analysis
    if (sentiment) {
      if (sentiment.sentiment === 'bullish' && sentiment.score > 50) {
        bullishScore += 15;
        reasoning.push(`Strong bullish sentiment (score: ${sentiment.score})`);
      } else if (sentiment.sentiment === 'bearish' && sentiment.score < -50) {
        bearishScore += 15;
        reasoning.push(`Strong bearish sentiment (score: ${sentiment.score})`);
      }
    }

    // Whale activity
    const recentAccumulation = whales.filter(w => w.type === 'transfer' && w.isKnownWallet).length;
    const recentDistribution = whales.filter(w => w.type === 'transfer' && w.valueUsd > 100000).length;
    
    if (recentAccumulation >= 3) {
      bullishScore += 25;
      reasoning.push(`${recentAccumulation} whale accumulation events detected`);
      correlatedEvents.push({
        type: 'whale_activity',
        description: `Whale accumulation: ${recentAccumulation} transfers`,
        impactScore: Math.min(100, recentAccumulation * 20),
        timestamp: new Date(),
      });
    }
    
    if (recentDistribution >= 3) {
      bearishScore += 25;
      riskScore += 20;
      reasoning.push(`${recentDistribution} large whale transfers (potential distribution)`);
      correlatedEvents.push({
        type: 'whale_activity',
        description: `Whale distribution: ${recentDistribution} large transfers`,
        impactScore: Math.min(100, recentDistribution * 20),
        timestamp: new Date(),
      });
    }

    // Upcoming unlocks
    const imminentUnlocks = unlocks.filter(u => 
      u.unlockDate.getTime() - Date.now() < 7 * 24 * 3600000
    );
    
    if (imminentUnlocks.length > 0) {
      const totalUnlockPct = imminentUnlocks.reduce((sum, u) => sum + u.percentOfSupply, 0);
      if (totalUnlockPct > 5) {
        bearishScore += 20;
        riskScore += 30;
        reasoning.push(`${totalUnlockPct.toFixed(1)}% of supply unlocking within 7 days`);
        correlatedEvents.push({
          type: 'unlock',
          description: `Upcoming unlock: ${totalUnlockPct.toFixed(1)}% of supply`,
          impactScore: Math.min(100, totalUnlockPct * 10),
          timestamp: imminentUnlocks[0].unlockDate,
        });
      }
    }

    // Liquidity analysis
    if (liquidity) {
      if (liquidity.slippage1Pct > 2) {
        riskScore += 20;
        reasoning.push(`High slippage (${liquidity.slippage1Pct.toFixed(2)}% for 1% trade)`);
      }
      if (liquidity.totalLiquidity < 100000) {
        riskScore += 30;
        reasoning.push(`Low liquidity ($${(liquidity.totalLiquidity / 1000).toFixed(0)}K)`);
      }
    }

    // Calculate final direction
    const netScore = bullishScore - bearishScore;
    let priceDirection: 'up' | 'down' | 'neutral';
    if (netScore > 15) {
      priceDirection = 'up';
    } else if (netScore < -15) {
      priceDirection = 'down';
    } else {
      priceDirection = 'neutral';
    }

    // Calculate confidence
    const totalSignals = bullishScore + bearishScore;
    const confidence = Math.min(95, 50 + Math.abs(netScore));

    // Calculate risk level
    let riskLevel: 'high' | 'medium' | 'low';
    if (riskScore > 50) {
      riskLevel = 'high';
    } else if (riskScore > 25) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    return {
      priceDirection,
      confidence,
      reasoning,
      riskLevel,
      correlatedEvents,
    };
  }

  // ===========================================================================
  // ALERTS
  // ===========================================================================

  /**
   * Create and emit an alert
   */
  private createAlert(params: Omit<FusionAlert, 'id' | 'timestamp'>): void {
    const alert: FusionAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...params,
    };

    this.alertHistory.push(alert);
    
    // Keep last 1000 alerts
    if (this.alertHistory.length > 1000) {
      this.alertHistory.shift();
    }

    this.emit('alert', alert);
    
    logger.info('Fusion alert created', {
      component: 'FusionEngine',
      alertType: alert.type,
      severity: alert.severity,
      symbol: alert.symbol,
    });
  }

  /**
   * Get recent alerts
   */
  getAlerts(options: {
    symbol?: string;
    type?: FusionAlert['type'];
    severity?: FusionAlert['severity'];
    limit?: number;
  } = {}): FusionAlert[] {
    let alerts = [...this.alertHistory];

    if (options.symbol) {
      alerts = alerts.filter(a => a.symbol === options.symbol);
    }
    if (options.type) {
      alerts = alerts.filter(a => a.type === options.type);
    }
    if (options.severity) {
      alerts = alerts.filter(a => a.severity === options.severity);
    }

    return alerts.slice(-(options.limit || 100)).reverse();
  }

  // ===========================================================================
  // STATS
  // ===========================================================================

  /**
   * Get fusion engine stats
   */
  getStats(): Record<string, unknown> {
    return {
      priceCacheSize: this.priceCache.size,
      whaleCacheSize: this.whaleCache.size,
      sentimentCacheSize: this.sentimentCache.size,
      liquidityCacheSize: this.liquidityCache.size,
      unlockCacheSize: this.unlockCache.size,
      alertCount: this.alertHistory.length,
      config: this.config,
    };
  }
}

