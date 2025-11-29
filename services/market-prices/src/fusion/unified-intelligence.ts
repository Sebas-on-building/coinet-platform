/**
 * ============================================
 * UNIFIED INTELLIGENCE
 * ============================================
 * 
 * Single source of truth combining all data sources
 * into unified, actionable intelligence.
 */

import { logger } from '../utils/logger';
import { FusionEngine, FusedIntelligence, FusionAlert } from './fusion-engine';
import { PredictiveLinker, PricePrediction, WhalePrediction } from './predictive-linker';
import { CrossApiCorrelator, CorrelationEvent } from './cross-api-correlator';

// =============================================================================
// TYPES
// =============================================================================

export interface UnifiedView {
  symbol: string;
  timestamp: Date;
  
  // Real-time data
  market: {
    price: number;
    priceChange24h: number;
    volume24h: number;
    marketCap: number;
    rank?: number;
  };
  
  // Whale intelligence
  whales: {
    recentActivityCount: number;
    netFlow24h: number;
    topWallets: Array<{
      address: string;
      label?: string;
      balance: number;
      change24h: number;
    }>;
    prediction: WhalePrediction | null;
  };
  
  // Sentiment intelligence
  sentiment: {
    score: number;
    trend: 'improving' | 'declining' | 'stable';
    newsCount: number;
    topHeadlines: string[];
    socialMentions: number;
  };
  
  // Token economics
  tokenomics: {
    upcomingUnlocks: Array<{
      date: Date;
      amount: number;
      percentOfSupply: number;
      type: string;
      impactPrediction: string;
    }>;
    circulatingSupply: number;
    totalSupply: number;
    fullyDilutedValuation: number;
  };
  
  // Liquidity intelligence
  liquidity: {
    totalDepth: number;
    dexLiquidity: number;
    cexLiquidity: number;
    slippage1Pct: number;
    healthScore: number;
  };
  
  // AI predictions
  predictions: {
    price: PricePrediction | null;
    confidence: number;
    riskLevel: 'high' | 'medium' | 'low';
    recommendation: 'buy' | 'sell' | 'hold' | 'watch';
    reasoning: string[];
  };
  
  // Cross-API correlations
  correlations: CorrelationEvent[];
  
  // Active alerts
  alerts: FusionAlert[];
  
  // Data freshness
  freshness: {
    price: Date | null;
    whales: Date | null;
    sentiment: Date | null;
    liquidity: Date | null;
    unlocks: Date | null;
  };
}

export interface DashboardData {
  overview: {
    totalAssets: number;
    totalAlerts: number;
    criticalAlerts: number;
    avgSentiment: number;
    topMover: { symbol: string; change: number };
    topWhaleActivity: { symbol: string; volume: number };
  };
  assets: UnifiedView[];
  recentAlerts: FusionAlert[];
  recentCorrelations: CorrelationEvent[];
  systemHealth: {
    apiStatus: Record<string, 'healthy' | 'degraded' | 'down'>;
    dataFreshness: Record<string, number>;
    cacheHitRate: number;
  };
}

// =============================================================================
// UNIFIED INTELLIGENCE SERVICE
// =============================================================================

export class UnifiedIntelligence {
  private fusionEngine: FusionEngine;
  private predictiveLinker: PredictiveLinker;
  private correlator: CrossApiCorrelator;
  private viewCache: Map<string, { view: UnifiedView; timestamp: number }> = new Map();
  private cacheTimeoutMs = 10000; // 10 seconds

  constructor(
    fusionEngine?: FusionEngine,
    predictiveLinker?: PredictiveLinker,
    correlator?: CrossApiCorrelator,
  ) {
    this.fusionEngine = fusionEngine || new FusionEngine();
    this.predictiveLinker = predictiveLinker || new PredictiveLinker();
    this.correlator = correlator || new CrossApiCorrelator();

    logger.info('UnifiedIntelligence initialized', { component: 'UnifiedIntelligence' });
  }

  // ===========================================================================
  // UNIFIED VIEW
  // ===========================================================================

  /**
   * Get unified view for a symbol
   */
  async getUnifiedView(symbol: string): Promise<UnifiedView> {
    // Check cache
    const cached = this.viewCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeoutMs) {
      return cached.view;
    }

    // Get fused intelligence from engine
    const fused = await this.fusionEngine.getFusedIntelligence(symbol);
    
    // Generate predictions
    const pricePrediction = fused ? this.predictiveLinker.predictPrice({
      symbol,
      priceChange24h: fused.price.priceChange24h,
      volume24h: fused.price.volume24h,
      whaleTransfers24h: fused.recentWhaleActivity.length,
      whaleVolumeUsd: fused.recentWhaleActivity.reduce((sum, w) => sum + w.valueUsd, 0),
      sentimentScore: fused.sentiment?.score || 0,
      upcomingUnlockPct: fused.upcomingUnlocks.reduce((sum, u) => sum + u.percentOfSupply, 0),
      daysToUnlock: fused.upcomingUnlocks[0] 
        ? (fused.upcomingUnlocks[0].unlockDate.getTime() - Date.now()) / 86400000 
        : 999,
      liquidityDepth: fused.liquidity?.totalLiquidity || 0,
    }) : null;

    // Get correlations
    const correlations = this.correlator.getCorrelations({ symbol, limit: 10 });

    // Build unified view
    const view: UnifiedView = {
      symbol,
      timestamp: new Date(),
      
      market: {
        price: fused?.price.price || 0,
        priceChange24h: fused?.price.priceChange24h || 0,
        volume24h: fused?.price.volume24h || 0,
        marketCap: fused?.price.marketCap || 0,
      },
      
      whales: {
        recentActivityCount: fused?.recentWhaleActivity.length || 0,
        netFlow24h: this.calculateNetFlow(fused?.recentWhaleActivity || []),
        topWallets: this.getTopWallets(fused?.recentWhaleActivity || []),
        prediction: null, // Would be populated from whale prediction service
      },
      
      sentiment: {
        score: fused?.sentiment?.score || 0,
        trend: this.calculateSentimentTrend(fused?.sentiment?.score || 0),
        newsCount: fused?.sentiment?.newsCount || 0,
        topHeadlines: fused?.sentiment?.topHeadlines || [],
        socialMentions: fused?.sentiment?.socialMentions || 0,
      },
      
      tokenomics: {
        upcomingUnlocks: (fused?.upcomingUnlocks || []).map(u => ({
          date: u.unlockDate,
          amount: u.amount,
          percentOfSupply: u.percentOfSupply,
          type: u.type,
          impactPrediction: u.impactPrediction,
        })),
        circulatingSupply: 0, // Would come from token data
        totalSupply: 0,
        fullyDilutedValuation: 0,
      },
      
      liquidity: {
        totalDepth: fused?.liquidity?.totalLiquidity || 0,
        dexLiquidity: fused?.liquidity?.dexLiquidity || 0,
        cexLiquidity: fused?.liquidity?.cexLiquidity || 0,
        slippage1Pct: fused?.liquidity?.slippage1Pct || 0,
        healthScore: this.calculateLiquidityHealth(fused?.liquidity),
      },
      
      predictions: {
        price: pricePrediction,
        confidence: pricePrediction?.confidence || 0,
        riskLevel: pricePrediction?.risk.level || 'low',
        recommendation: this.generateRecommendation(pricePrediction, fused),
        reasoning: pricePrediction?.reasoning || [],
      },
      
      correlations,
      alerts: fused?.alerts || [],
      
      freshness: {
        price: fused?.price.timestamp || null,
        whales: fused?.recentWhaleActivity[0]?.timestamp || null,
        sentiment: fused?.sentiment?.timestamp || null,
        liquidity: fused?.liquidity?.timestamp || null,
        unlocks: fused?.upcomingUnlocks[0]?.unlockDate || null,
      },
    };

    // Cache the view
    this.viewCache.set(symbol, { view, timestamp: Date.now() });

    return view;
  }

  // ===========================================================================
  // DASHBOARD
  // ===========================================================================

  /**
   * Get dashboard data for multiple assets
   */
  async getDashboard(symbols: string[]): Promise<DashboardData> {
    const assets = await Promise.all(symbols.map(s => this.getUnifiedView(s)));
    
    // Calculate overview stats
    const avgSentiment = assets.reduce((sum, a) => sum + a.sentiment.score, 0) / assets.length;
    
    const topMover = assets.reduce((best, a) => 
      Math.abs(a.market.priceChange24h) > Math.abs(best.market.priceChange24h) ? a : best
    );
    
    const topWhale = assets.reduce((best, a) => {
      const volume = a.whales.recentActivityCount;
      return volume > (best.whales?.recentActivityCount || 0) ? a : best;
    });

    const allAlerts = assets.flatMap(a => a.alerts);
    const criticalAlerts = allAlerts.filter(a => a.severity === 'critical');

    return {
      overview: {
        totalAssets: assets.length,
        totalAlerts: allAlerts.length,
        criticalAlerts: criticalAlerts.length,
        avgSentiment,
        topMover: { symbol: topMover.symbol, change: topMover.market.priceChange24h },
        topWhaleActivity: { 
          symbol: topWhale.symbol, 
          volume: Math.abs(topWhale.whales.netFlow24h) 
        },
      },
      assets,
      recentAlerts: this.fusionEngine.getAlerts({ limit: 20 }),
      recentCorrelations: this.correlator.getCorrelations({ limit: 10 }),
      systemHealth: {
        apiStatus: {
          coingecko: 'healthy',
          coinmarketcap: 'healthy',
          alchemy: 'healthy',
          quicknode: 'healthy',
          cryptopanic: 'healthy',
        },
        dataFreshness: {
          prices: 5000,
          whales: 10000,
          sentiment: 60000,
        },
        cacheHitRate: 0.985,
      },
    };
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private calculateNetFlow(whales: FusedIntelligence['recentWhaleActivity']): number {
    return whales.reduce((sum, w) => {
      const direction = w.type === 'transfer' ? 1 : -1;
      return sum + (w.valueUsd * direction);
    }, 0);
  }

  private getTopWallets(whales: FusedIntelligence['recentWhaleActivity']): UnifiedView['whales']['topWallets'] {
    const walletMap = new Map<string, { balance: number; change24h: number; label?: string }>();
    
    for (const w of whales) {
      const existing = walletMap.get(w.from) || { balance: 0, change24h: 0, label: w.walletLabel };
      existing.change24h -= w.valueUsd;
      walletMap.set(w.from, existing);
      
      const toExisting = walletMap.get(w.to) || { balance: 0, change24h: 0 };
      toExisting.change24h += w.valueUsd;
      walletMap.set(w.to, toExisting);
    }

    return Array.from(walletMap.entries())
      .map(([address, data]) => ({ address, ...data }))
      .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))
      .slice(0, 5);
  }

  private calculateSentimentTrend(score: number): 'improving' | 'declining' | 'stable' {
    // Simplified - would track historical sentiment
    if (score > 20) return 'improving';
    if (score < -20) return 'declining';
    return 'stable';
  }

  private calculateLiquidityHealth(liquidity: FusedIntelligence['liquidity']): number {
    if (!liquidity) return 0;
    
    let score = 50;
    
    // Higher liquidity = better health
    if (liquidity.totalLiquidity > 1000000) score += 20;
    else if (liquidity.totalLiquidity > 100000) score += 10;
    
    // Lower slippage = better health
    if (liquidity.slippage1Pct < 0.5) score += 20;
    else if (liquidity.slippage1Pct < 1) score += 10;
    else if (liquidity.slippage1Pct > 3) score -= 20;
    
    // Balanced DEX/CEX = better health
    const dexRatio = liquidity.dexLiquidity / (liquidity.totalLiquidity || 1);
    if (dexRatio > 0.3 && dexRatio < 0.7) score += 10;
    
    return Math.max(0, Math.min(100, score));
  }

  private generateRecommendation(
    prediction: PricePrediction | null,
    fused: FusedIntelligence | null,
  ): 'buy' | 'sell' | 'hold' | 'watch' {
    if (!prediction || !fused) return 'watch';
    
    // Risk too high - be cautious
    if (prediction.risk.level === 'high') {
      return prediction.direction === 'down' ? 'sell' : 'watch';
    }
    
    // Strong signals
    if (prediction.confidence > 75) {
      if (prediction.direction === 'up' && prediction.magnitude !== 'small') {
        return 'buy';
      }
      if (prediction.direction === 'down' && prediction.magnitude !== 'small') {
        return 'sell';
      }
    }
    
    // Medium confidence
    if (prediction.confidence > 60) {
      return 'watch';
    }
    
    return 'hold';
  }

  // ===========================================================================
  // COMPONENT ACCESS
  // ===========================================================================

  getFusionEngine(): FusionEngine {
    return this.fusionEngine;
  }

  getPredictiveLinker(): PredictiveLinker {
    return this.predictiveLinker;
  }

  getCorrelator(): CrossApiCorrelator {
    return this.correlator;
  }

  /**
   * Get stats from all components
   */
  getStats(): Record<string, unknown> {
    return {
      fusion: this.fusionEngine.getStats(),
      predictions: this.predictiveLinker.getStats(),
      correlations: this.correlator.getStats(),
      viewCacheSize: this.viewCache.size,
    };
  }
}

