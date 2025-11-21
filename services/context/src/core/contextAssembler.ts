// =============================================================================
// COINET AI CONTEXT ASSEMBLER - CORE ENGINE
// Intelligent context aggregation and assembly for AI reasoning
// =============================================================================

import { EventEmitter } from 'events';
import { z } from 'zod';

// =============================================================================
// TYPE DEFINITIONS AND SCHEMAS
// =============================================================================

// Market Context Schema
const MarketContextSchema = z.object({
  symbol: z.string(),
  currentPrice: z.number(),
  priceChange24h: z.number(),
  priceChangePercent24h: z.number(),
  volume24h: z.number(),
  marketCap: z.number().optional(),
  high24h: z.number(),
  low24h: z.number(),
  technicalIndicators: z.object({
    rsi: z.number().optional(),
    macd: z.object({
      value: z.number(),
      signal: z.number(),
      histogram: z.number(),
    }).optional(),
    bollinger: z.object({
      upper: z.number(),
      middle: z.number(),
      lower: z.number(),
    }).optional(),
    support: z.number().optional(),
    resistance: z.number().optional(),
  }).optional(),
  orderBook: z.object({
    bestBid: z.number(),
    bestAsk: z.number(),
    spread: z.number(),
    spreadPercent: z.number(),
  }).optional(),
  timestamp: z.number(),
});

// News Context Schema
const NewsContextSchema = z.object({
  title: z.string(),
  content: z.string(),
  source: z.string(),
  publishedAt: z.number(),
  sentiment: z.object({
    score: z.number().min(-1).max(1),
    label: z.enum(['positive', 'negative', 'neutral']),
    confidence: z.number().min(0).max(1),
  }),
  relevantSymbols: z.array(z.string()),
  topics: z.array(z.string()),
  importance: z.number().min(0).max(1),
});

// Social Context Schema
const SocialContextSchema = z.object({
  platform: z.enum(['twitter', 'reddit', 'telegram', 'discord']),
  content: z.string(),
  author: z.object({
    username: z.string(),
    followers: z.number().optional(),
    influence: z.number().min(0).max(1).optional(),
  }),
  sentiment: z.object({
    score: z.number().min(-1).max(1),
    label: z.enum(['positive', 'negative', 'neutral']),
    confidence: z.number().min(0).max(1),
  }),
  engagement: z.object({
    likes: z.number().default(0),
    shares: z.number().default(0),
    comments: z.number().default(0),
  }),
  symbols: z.array(z.string()),
  timestamp: z.number(),
});

// On-Chain Context Schema
const OnChainContextSchema = z.object({
  symbol: z.string(),
  network: z.string(),
  metrics: z.object({
    activeAddresses: z.number().optional(),
    transactionCount: z.number().optional(),
    transactionVolume: z.number().optional(),
    averageTransactionValue: z.number().optional(),
    whaleActivity: z.object({
      largeTransactions: z.number(),
      totalValue: z.number(),
    }).optional(),
    networkHealth: z.object({
      hashRate: z.number().optional(),
      difficulty: z.number().optional(),
      blockTime: z.number().optional(),
    }).optional(),
  }),
  timestamp: z.number(),
});

// Assembled Context Schema
const AssembledContextSchema = z.object({
  symbol: z.string(),
  timestamp: z.number(),
  timeframe: z.enum(['5m', '15m', '1h', '4h', '1d']),
  market: MarketContextSchema,
  news: z.array(NewsContextSchema),
  social: z.array(SocialContextSchema),
  onChain: OnChainContextSchema.optional(),
  aggregatedSentiment: z.object({
    overall: z.number().min(-1).max(1),
    news: z.number().min(-1).max(1),
    social: z.number().min(-1).max(1),
    confidence: z.number().min(0).max(1),
    trend: z.enum(['bullish', 'bearish', 'neutral']),
  }),
  marketConditions: z.object({
    volatility: z.enum(['low', 'medium', 'high']),
    volume: z.enum(['low', 'medium', 'high']),
    trend: z.enum(['uptrend', 'downtrend', 'sideways']),
    momentum: z.enum(['strong_bullish', 'bullish', 'neutral', 'bearish', 'strong_bearish']),
  }),
  importance: z.number().min(0).max(1),
  completeness: z.number().min(0).max(1),
});

// Type exports
export type MarketContext = z.infer<typeof MarketContextSchema>;
export type NewsContext = z.infer<typeof NewsContextSchema>;
export type SocialContext = z.infer<typeof SocialContextSchema>;
export type OnChainContext = z.infer<typeof OnChainContextSchema>;
export type AssembledContext = z.infer<typeof AssembledContextSchema>;

// =============================================================================
// DATA SOURCE INTERFACES
// =============================================================================

export interface IMarketDataProvider {
  getMarketData(symbol: string, timeframe: string): Promise<MarketContext>;
  subscribeToUpdates(symbol: string, callback: (data: MarketContext) => void): void;
}

export interface INewsProvider {
  getRecentNews(symbol: string, limit: number): Promise<NewsContext[]>;
  subscribeToNews(symbol: string, callback: (news: NewsContext) => void): void;
}

export interface ISocialProvider {
  getSocialMentions(symbol: string, limit: number): Promise<SocialContext[]>;
  subscribeToMentions(symbol: string, callback: (mention: SocialContext) => void): void;
}

export interface IOnChainProvider {
  getOnChainMetrics(symbol: string): Promise<OnChainContext>;
  subscribeToMetrics(symbol: string, callback: (metrics: OnChainContext) => void): void;
}

// =============================================================================
// CONTEXT ASSEMBLER CONFIGURATION
// =============================================================================

export interface ContextAssemblerConfig {
  // Data freshness requirements
  maxMarketDataAge: number; // milliseconds
  maxNewsAge: number; // milliseconds
  maxSocialAge: number; // milliseconds
  maxOnChainAge: number; // milliseconds
  
  // Content limits
  maxNewsItems: number;
  maxSocialMentions: number;
  
  // Quality thresholds
  minNewsRelevance: number; // 0-1
  minSocialInfluence: number; // 0-1
  minSentimentConfidence: number; // 0-1
  
  // Context completeness requirements
  requireMarketData: boolean;
  requireNews: boolean;
  requireSocial: boolean;
  requireOnChain: boolean;
  
  // Caching configuration
  enableCaching: boolean;
  cacheTtl: number; // milliseconds
  cacheSize: number; // max items
}

// =============================================================================
// CONTEXT ASSEMBLER CORE CLASS
// =============================================================================

export class ContextAssembler extends EventEmitter {
  private config: ContextAssemblerConfig;
  private marketDataProvider: IMarketDataProvider;
  private newsProvider: INewsProvider;
  private socialProvider: ISocialProvider;
  private onChainProvider: IOnChainProvider;
  
  // Context cache
  private contextCache = new Map<string, { context: AssembledContext; timestamp: number }>();
  
  // Active subscriptions
  private activeSubscriptions = new Map<string, Set<string>>();
  
  constructor(
    config: ContextAssemblerConfig,
    providers: {
      market: IMarketDataProvider;
      news: INewsProvider;
      social: ISocialProvider;
      onChain: IOnChainProvider;
    }
  ) {
    super();
    this.config = config;
    this.marketDataProvider = providers.market;
    this.newsProvider = providers.news;
    this.socialProvider = providers.social;
    this.onChainProvider = providers.onChain;
    
    // Setup cache cleanup
    if (this.config.enableCaching) {
      setInterval(() => this.cleanupCache(), 60000); // Every minute
    }
  }
  
  // =============================================================================
  // PUBLIC API METHODS
  // =============================================================================
  
  /**
   * Assemble comprehensive context for a given symbol and timeframe
   */
  async assembleContext(
    symbol: string, 
    timeframe: '5m' | '15m' | '1h' | '4h' | '1d' = '1h'
  ): Promise<AssembledContext> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = `${symbol}:${timeframe}`;
      const cached = this.getCachedContext(cacheKey);
      if (cached) {
        this.emit('contextAssembled', { symbol, timeframe, source: 'cache', duration: Date.now() - startTime });
        return cached;
      }
      
      // Gather data from all sources in parallel
      const [_marketData, _newsData, _socialData, _onChainData] = await Promise.allSettled([
        this.getMarketContext(symbol, timeframe),
        this.getNewsContext(symbol),
        this.getSocialContext(symbol),
        this.getOnChainContext(symbol),
      ]);
      
      // Process successful results
      const _market = _marketData.status === 'fulfilled' ? _marketData.value : null;
      const _news = _newsData.status === 'fulfilled' ? _newsData.value : [];
      const _social = _socialData.status === 'fulfilled' ? _socialData.value : [];
      const _onChain = _onChainData.status === 'fulfilled' ? _onChainData.value : undefined;
      
      // Validate minimum requirements
      if (!_market && this.config.requireMarketData) {
        throw new Error(`Market data required but not available for ${symbol}`);
      }
      
      if (_news.length === 0 && this.config.requireNews) {
        throw new Error(`News data required but not available for ${symbol}`);
      }
      
      if (_social.length === 0 && this.config.requireSocial) {
        throw new Error(`Social data required but not available for ${symbol}`);
      }
      
      // Calculate aggregated sentiment
      const aggregatedSentiment = this.calculateAggregatedSentiment(_news, _social);
      
      // Determine market conditions
      const marketConditions = this.analyzeMarketConditions(_market, _news, _social);
      
      // Calculate importance and completeness scores
      const importance = this.calculateImportanceScore(_market, _news, _social, _onChain);
      const completeness = this.calculateCompletenessScore(_market, _news, _social, _onChain);
      
      // Assemble the final context
      const assembledContext: AssembledContext = {
        symbol,
        timestamp: Date.now(),
        timeframe,
        market: _market!,
        news: _news,
        social: _social,
        onChain: _onChain,
        aggregatedSentiment,
        marketConditions,
        importance,
        completeness,
      };
      
      // Validate the assembled context
      const validatedContext = AssembledContextSchema.parse(assembledContext);
      
      // Cache the result
      if (this.config.enableCaching) {
        this.cacheContext(cacheKey, validatedContext);
      }
      
      // Emit success event
      this.emit('contextAssembled', { 
        symbol, 
        timeframe, 
        source: 'live', 
        duration: Date.now() - startTime,
        completeness,
        importance
      });
      
      return validatedContext;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.emit('contextAssemblyError', { symbol, timeframe, error: errorMessage });
      throw error;
    }
  }
  
  /**
   * Subscribe to real-time context updates for a symbol
   */
  subscribeToContext(
    _symbol: string,
    _timeframe: '5m' | '15m' | '1h' | '4h' | '1d',
    _callback: (context: AssembledContext) => void
  ): string {
    const subscriptionId = `${_symbol}:${_timeframe}:${Date.now()}`;
    
    // Setup data source subscriptions
    this.marketDataProvider.subscribeToUpdates(_symbol, async (_marketData) => {
      try {
        const context = await this.assembleContext(_symbol, _timeframe);
        _callback(context);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        this.emit('subscriptionError', { subscriptionId, error: errorMessage });
      }
    });
    
    this.newsProvider.subscribeToNews(_symbol, async (_news) => {
      try {
        const context = await this.assembleContext(_symbol, _timeframe);
        _callback(context);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        this.emit('subscriptionError', { subscriptionId, error: errorMessage });
      }
    });
    
    this.socialProvider.subscribeToMentions(_symbol, async (_mention) => {
      try {
        const context = await this.assembleContext(_symbol, _timeframe);
        _callback(context);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        this.emit('subscriptionError', { subscriptionId, error: errorMessage });
      }
    });
    
    // Track active subscription
    const _key = `${_symbol}:${_timeframe}`;
    if (!this.activeSubscriptions.has(_key)) {
      this.activeSubscriptions.set(_key, new Set());
    }
    this.activeSubscriptions.get(_key)!.add(subscriptionId);
    
    return subscriptionId;
  }
  
  /**
   * Unsubscribe from context updates
   */
  unsubscribeFromContext(_subscriptionId: string): void {
    // Remove from active subscriptions
    for (const [_key, _subscriptions] of this.activeSubscriptions.entries()) {
      if (_subscriptions.has(_subscriptionId)) {
        _subscriptions.delete(_subscriptionId);
        if (_subscriptions.size === 0) {
          this.activeSubscriptions.delete(_key);
        }
        break;
      }
    }
  }
  
  /**
   * Get context assembly statistics
   */
  getStats(): {
    cacheSize: number;
    activeSubscriptions: number;
    totalSymbols: number;
  } {
    return {
      cacheSize: this.contextCache.size,
      activeSubscriptions: Array.from(this.activeSubscriptions.values())
        .reduce((total, _subs) => total + _subs.size, 0),
      totalSymbols: this.activeSubscriptions.size,
    };
  }
  
  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================
  
  private async getMarketContext(symbol: string, timeframe: string): Promise<MarketContext> {
    return await this.marketDataProvider.getMarketData(symbol, timeframe);
  }
  
  private async getNewsContext(symbol: string): Promise<NewsContext[]> {
    const news = await this.newsProvider.getRecentNews(symbol, this.config.maxNewsItems);
    const now = Date.now();
    
    return news
      .filter(_item => (now - _item.publishedAt) <= this.config.maxNewsAge)
      .filter(_item => _item.importance >= this.config.minNewsRelevance)
      .filter(_item => _item.sentiment.confidence >= this.config.minSentimentConfidence)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, this.config.maxNewsItems);
  }
  
  private async getSocialContext(symbol: string): Promise<SocialContext[]> {
    const social = await this.socialProvider.getSocialMentions(symbol, this.config.maxSocialMentions);
    const now = Date.now();
    
    return social
      .filter(_item => (now - _item.timestamp) <= this.config.maxSocialAge)
      .filter(_item => (_item.author.influence || 0) >= this.config.minSocialInfluence)
      .filter(_item => _item.sentiment.confidence >= this.config.minSentimentConfidence)
      .sort((a, b) => (b.author.influence || 0) - (a.author.influence || 0))
      .slice(0, this.config.maxSocialMentions);
  }
  
  private async getOnChainContext(symbol: string): Promise<OnChainContext | undefined> {
    try {
      const onChain = await this.onChainProvider.getOnChainMetrics(symbol);
      const now = Date.now();
      
      if ((now - onChain.timestamp) <= this.config.maxOnChainAge) {
        return onChain;
      }
    } catch (_error: unknown) {
      // On-chain data is optional, don't fail if unavailable
    }
    
    return undefined;
  }
  
  private calculateAggregatedSentiment(_news: NewsContext[], _social: SocialContext[]) {
    // Calculate weighted sentiment scores
    const newsSentiment = _news.length > 0 
      ? _news.reduce((sum, item) => sum + (item.sentiment.score * item.importance), 0) / 
        _news.reduce((sum, item) => sum + item.importance, 0)
      : 0;
    
    const socialSentiment = _social.length > 0
      ? _social.reduce((sum, item) => sum + (item.sentiment.score * (item.author.influence || 0.1)), 0) /
        _social.reduce((sum, item) => sum + (item.author.influence || 0.1), 0)
      : 0;
    
    // Combine with weights (news typically more reliable than social)
    const overall = (newsSentiment * 0.7) + (socialSentiment * 0.3);
    
    // Calculate confidence based on data availability and quality
    const newsConfidence = _news.length > 0 ? _news.reduce((sum, item) => sum + item.sentiment.confidence, 0) / _news.length : 0;
    const socialConfidence = _social.length > 0 ? _social.reduce((sum, item) => sum + item.sentiment.confidence, 0) / _social.length : 0;
    const confidence = (newsConfidence * 0.7) + (socialConfidence * 0.3);
    
    // Determine trend
    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (overall > 0.2) trend = 'bullish';
    else if (overall < -0.2) trend = 'bearish';
    
    return {
      overall,
      news: newsSentiment,
      social: socialSentiment,
      confidence,
      trend,
    };
  }
  
  private analyzeMarketConditions(
    _market: MarketContext | null,
    _news: NewsContext[],
    _social: SocialContext[]
  ) {
    if (!_market) {
      return {
        volatility: 'medium' as const,
        volume: 'medium' as const,
        trend: 'sideways' as const,
        momentum: 'neutral' as const,
      };
    }
    
    // Analyze volatility based on price change and technical indicators
    const priceChangeAbs = Math.abs(_market.priceChangePercent24h);
    let volatility: 'low' | 'medium' | 'high' = 'medium';
    if (priceChangeAbs < 2) volatility = 'low';
    else if (priceChangeAbs > 10) volatility = 'high';
    
    // Analyze volume (would need historical comparison in real implementation)
    const volume: 'low' | 'medium' | 'high' = 'medium';
    // This would typically compare current volume to historical averages
    
    // Analyze trend
    let trend: 'uptrend' | 'downtrend' | 'sideways' = 'sideways';
    if (_market.priceChangePercent24h > 5) trend = 'uptrend';
    else if (_market.priceChangePercent24h < -5) trend = 'downtrend';
    
    // Analyze momentum combining price action and sentiment
    const sentimentScore = _news.length > 0 
      ? _news.reduce((sum, item) => sum + item.sentiment.score, 0) / _news.length
      : 0;
    
    let momentum: 'strong_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong_bearish' = 'neutral';
    const combinedScore = (_market.priceChangePercent24h / 100) + (sentimentScore * 0.3);
    
    if (combinedScore > 0.1) momentum = 'strong_bullish';
    else if (combinedScore > 0.05) momentum = 'bullish';
    else if (combinedScore < -0.1) momentum = 'strong_bearish';
    else if (combinedScore < -0.05) momentum = 'bearish';
    
    return {
      volatility,
      volume,
      trend,
      momentum,
    };
  }
  
  private calculateImportanceScore(
    _market: MarketContext | null,
    _news: NewsContext[],
    _social: SocialContext[],
    _onChain: OnChainContext | undefined
  ): number {
    let score = 0;
    
    // Market data importance (price movement, volume)
    if (_market) {
      const priceChangeAbs = Math.abs(_market.priceChangePercent24h);
      score += Math.min(priceChangeAbs / 20, 0.4); // Max 0.4 from price movement
      
      // Volume importance (would need historical comparison)
      score += 0.1; // Placeholder
    }
    
    // News importance
    if (_news.length > 0) {
      const avgNewsImportance = _news.reduce((sum, item) => sum + item.importance, 0) / _news.length;
      score += avgNewsImportance * 0.3; // Max 0.3 from news
    }
    
    // Social importance (high engagement, influential authors)
    if (_social.length > 0) {
      const socialImportance = _social.reduce((sum, item) => {
        const engagementScore = (item.engagement.likes + item.engagement.shares + item.engagement.comments) / 1000;
        const influenceScore = item.author.influence || 0;
        return sum + Math.min(engagementScore + influenceScore, 1);
      }, 0) / _social.length;
      score += socialImportance * 0.2; // Max 0.2 from social
    }
    
    return Math.min(score, 1);
  }
  
  private calculateCompletenessScore(
    _market: MarketContext | null,
    _news: NewsContext[],
    _social: SocialContext[],
    _onChain: OnChainContext | undefined
  ): number {
    let score = 0;
    let maxScore = 0;
    
    // Market data completeness
    if (this.config.requireMarketData) {
      maxScore += 0.4;
      if (_market) {
        score += 0.3;
        if (_market.technicalIndicators) score += 0.05;
        if (_market.orderBook) score += 0.05;
      }
    }
    
    // News completeness
    if (this.config.requireNews) {
      maxScore += 0.3;
      if (_news.length > 0) {
        score += Math.min(_news.length / this.config.maxNewsItems, 1) * 0.3;
      }
    }
    
    // Social completeness
    if (this.config.requireSocial) {
      maxScore += 0.2;
      if (_social.length > 0) {
        score += Math.min(_social.length / this.config.maxSocialMentions, 1) * 0.2;
      }
    }
    
    // On-chain completeness
    if (this.config.requireOnChain) {
      maxScore += 0.1;
      if (_onChain) score += 0.1;
    }
    
    return maxScore > 0 ? score / maxScore : 1;
  }
  
  private getCachedContext(key: string): AssembledContext | null {
    if (!this.config.enableCaching) return null;
    
    const cached = this.contextCache.get(key);
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > this.config.cacheTtl) {
      this.contextCache.delete(key);
      return null;
    }
    
    return cached.context;
  }
  
  private cacheContext(key: string, context: AssembledContext): void {
    if (!this.config.enableCaching) return;
    
    // Implement LRU eviction if cache is full
    if (this.contextCache.size >= this.config.cacheSize) {
      const oldestKey = this.contextCache.keys().next().value;
      if (oldestKey) {
        this.contextCache.delete(oldestKey);
      }
    }
    
    this.contextCache.set(key, {
      context,
      timestamp: Date.now(),
    });
  }
  
  private cleanupCache(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [key, cached] of this.contextCache.entries()) {
      if (now - cached.timestamp > this.config.cacheTtl) {
        toDelete.push(key);
      }
    }
    
    toDelete.forEach(key => this.contextCache.delete(key));
    
    if (toDelete.length > 0) {
      this.emit('cacheCleanup', { removedItems: toDelete.length, cacheSize: this.contextCache.size });
    }
  }
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const DEFAULT_CONTEXT_ASSEMBLER_CONFIG: ContextAssemblerConfig = {
  // Data freshness (5 minutes for market, 1 hour for news, 30 minutes for social, 6 hours for on-chain)
  maxMarketDataAge: 5 * 60 * 1000,
  maxNewsAge: 60 * 60 * 1000,
  maxSocialAge: 30 * 60 * 1000,
  maxOnChainAge: 6 * 60 * 60 * 1000,
  
  // Content limits
  maxNewsItems: 10,
  maxSocialMentions: 20,
  
  // Quality thresholds
  minNewsRelevance: 0.3,
  minSocialInfluence: 0.1,
  minSentimentConfidence: 0.5,
  
  // Requirements (all optional by default for flexibility)
  requireMarketData: true,
  requireNews: false,
  requireSocial: false,
  requireOnChain: false,
  
  // Caching (5 minute TTL, 1000 item limit)
  enableCaching: true,
  cacheTtl: 5 * 60 * 1000,
  cacheSize: 1000,
}; 