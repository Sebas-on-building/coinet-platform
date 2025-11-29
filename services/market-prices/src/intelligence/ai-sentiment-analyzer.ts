/**
 * ============================================
 * AI-ENHANCED SENTIMENT ANALYZER
 * ============================================
 * 
 * Advanced Sentiment Analysis with:
 * - NLP-based Text Analysis
 * - Keyword & Entity Extraction
 * - Trend Detection & Prediction
 * - Multi-source Correlation
 * - Real-time Scoring Updates
 * 
 * Accuracy Target: >85% sentiment prediction accuracy
 */

import { EventEmitter } from 'eventemitter3';
import { NormalizedNewsArticle, CryptoPanicSentiment } from '../types/cryptopanic.types';
import { logger } from '../utils/logger';

/**
 * Sentiment analysis configuration
 */
export interface SentimentAnalyzerConfig {
  enableNlp: boolean;
  enableTrendDetection: boolean;
  enablePrediction: boolean;
  minConfidence: number;
  windowSize: number;        // Number of articles to consider for trends
  predictionHorizon: number; // Hours to predict ahead
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SentimentAnalyzerConfig = {
  enableNlp: true,
  enableTrendDetection: true,
  enablePrediction: true,
  minConfidence: 0.6,
  windowSize: 100,
  predictionHorizon: 24,
};

/**
 * Sentiment keywords by category
 */
const SENTIMENT_KEYWORDS = {
  strongPositive: [
    'moon', 'breakout', 'surge', 'soar', 'skyrocket', 'bullish', 'rally',
    'all-time high', 'ath', 'massive gains', 'explosion', 'pumping', 'breakthrough',
    'adoption', 'partnership', 'institutional', 'approved', 'launch', 'milestone',
  ],
  positive: [
    'rise', 'gain', 'up', 'growth', 'increase', 'profit', 'green', 'recover',
    'support', 'accumulate', 'buy', 'invest', 'opportunity', 'upgrade',
    'optimistic', 'confidence', 'momentum', 'strength', 'bullish signal',
  ],
  neutral: [
    'stable', 'unchanged', 'sideways', 'consolidate', 'range', 'flat',
    'mixed', 'uncertain', 'volatile', 'wait', 'watch', 'analyze',
  ],
  negative: [
    'drop', 'fall', 'down', 'decline', 'loss', 'red', 'dip', 'correction',
    'sell', 'dump', 'resistance', 'bearish', 'weak', 'concern', 'risk',
    'warning', 'cautious', 'pressure', 'downtrend',
  ],
  strongNegative: [
    'crash', 'plunge', 'collapse', 'catastrophe', 'disaster', 'panic',
    'liquidation', 'rekt', 'scam', 'hack', 'exploit', 'rug pull', 'fraud',
    'ban', 'shutdown', 'lawsuit', 'investigation', 'sec action', 'death spiral',
  ],
};

/**
 * Entity types for extraction
 */
export type EntityType = 'token' | 'protocol' | 'chain' | 'person' | 'company' | 'event';

/**
 * Extracted entity
 */
export interface ExtractedEntity {
  text: string;
  type: EntityType;
  sentiment: number;
  confidence: number;
  mentions: number;
}

/**
 * Enhanced sentiment result
 */
export interface EnhancedSentimentResult {
  // Core sentiment
  sentiment: CryptoPanicSentiment;
  score: number;          // -100 to 100
  confidence: number;     // 0 to 1
  
  // NLP analysis
  nlp: {
    keyPhrases: string[];
    entities: ExtractedEntity[];
    topics: string[];
    emotion: 'fear' | 'greed' | 'neutral' | 'fomo' | 'fud';
    emotionIntensity: number; // 0 to 100
  };
  
  // Market indicators
  market: {
    momentum: 'bullish' | 'bearish' | 'neutral';
    strength: number;      // 0 to 100
    urgency: number;       // 0 to 100
    reliability: number;   // 0 to 100
  };
  
  // Prediction
  prediction: {
    direction: 'up' | 'down' | 'sideways';
    magnitude: 'small' | 'medium' | 'large';
    confidence: number;
    timeframe: string;
  } | null;
  
  // Metadata
  analyzedAt: Date;
  processingTimeMs: number;
}

/**
 * Token sentiment aggregation
 */
export interface TokenSentimentAggregation {
  symbol: string;
  articleCount: number;
  avgSentiment: number;
  sentimentTrend: 'improving' | 'declining' | 'stable';
  dominantEmotion: string;
  keyTopics: string[];
  prediction: {
    direction: 'up' | 'down' | 'sideways';
    confidence: number;
  };
  lastUpdated: Date;
}

/**
 * Trend detection result
 */
export interface TrendDetectionResult {
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  duration: string;
  keyDrivers: string[];
  reversal: {
    probability: number;
    triggers: string[];
  };
}

/**
 * AI Sentiment Analyzer
 */
export class AiSentimentAnalyzer extends EventEmitter {
  private config: SentimentAnalyzerConfig;
  
  // Historical data for trend analysis
  private articleHistory: NormalizedNewsArticle[] = [];
  private sentimentHistory: EnhancedSentimentResult[] = [];
  private tokenAggregations: Map<string, TokenSentimentAggregation> = new Map();
  
  // Model state (simple rule-based for now, can be replaced with real ML)
  private emotionPatterns: Map<string, number> = new Map();
  private trendWeights: Map<string, number> = new Map();

  constructor(config?: Partial<SentimentAnalyzerConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize patterns
    this.initializePatterns();
    
    logger.info('AI Sentiment Analyzer initialized', {
      enableNlp: this.config.enableNlp,
      enableTrendDetection: this.config.enableTrendDetection,
      enablePrediction: this.config.enablePrediction,
    });
  }

  /**
   * Initialize pattern weights
   */
  private initializePatterns(): void {
    // Emotion pattern weights
    this.emotionPatterns.set('fear', 0);
    this.emotionPatterns.set('greed', 0);
    this.emotionPatterns.set('fomo', 0);
    this.emotionPatterns.set('fud', 0);
    
    // Trend weights
    this.trendWeights.set('bullish', 0);
    this.trendWeights.set('bearish', 0);
    this.trendWeights.set('neutral', 0);
  }

  /**
   * Analyze a single article with enhanced sentiment
   */
  async analyze(article: NormalizedNewsArticle): Promise<EnhancedSentimentResult> {
    const startTime = Date.now();
    
    // Extract text for analysis
    const text = `${article.title} ${article.description || ''}`.toLowerCase();
    
    // Basic sentiment scoring
    const { score, confidence } = this.calculateSentimentScore(text);
    
    // Determine sentiment level
    let sentiment: CryptoPanicSentiment = CryptoPanicSentiment.NEUTRAL;
    if (score > 30) sentiment = CryptoPanicSentiment.POSITIVE;
    else if (score < -30) sentiment = CryptoPanicSentiment.NEGATIVE;
    
    // NLP analysis
    const nlpResult = this.config.enableNlp 
      ? this.performNlpAnalysis(text, article)
      : this.getDefaultNlpResult();
    
    // Market indicators
    const marketIndicators = this.calculateMarketIndicators(article, score, nlpResult);
    
    // Prediction (if enabled)
    const prediction = this.config.enablePrediction
      ? this.generatePrediction(article, score, nlpResult)
      : null;
    
    const result: EnhancedSentimentResult = {
      sentiment,
      score,
      confidence,
      nlp: nlpResult,
      market: marketIndicators,
      prediction,
      analyzedAt: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
    
    // Update history for trend detection
    this.updateHistory(article, result);
    
    // Emit event
    this.emit('analyzed', { article, result });
    
    return result;
  }

  /**
   * Calculate sentiment score from text
   */
  private calculateSentimentScore(text: string): { score: number; confidence: number } {
    let score = 0;
    let matches = 0;
    
    // Strong positive keywords (+40 each)
    for (const keyword of SENTIMENT_KEYWORDS.strongPositive) {
      if (text.includes(keyword)) {
        score += 40;
        matches++;
      }
    }
    
    // Positive keywords (+20 each)
    for (const keyword of SENTIMENT_KEYWORDS.positive) {
      if (text.includes(keyword)) {
        score += 20;
        matches++;
      }
    }
    
    // Negative keywords (-20 each)
    for (const keyword of SENTIMENT_KEYWORDS.negative) {
      if (text.includes(keyword)) {
        score -= 20;
        matches++;
      }
    }
    
    // Strong negative keywords (-40 each)
    for (const keyword of SENTIMENT_KEYWORDS.strongNegative) {
      if (text.includes(keyword)) {
        score -= 40;
        matches++;
      }
    }
    
    // Clamp score to -100 to 100
    score = Math.max(-100, Math.min(100, score));
    
    // Calculate confidence based on matches
    const confidence = Math.min(1, matches * 0.15 + 0.4);
    
    return { score, confidence };
  }

  /**
   * Perform NLP analysis on text
   */
  private performNlpAnalysis(
    text: string,
    article: NormalizedNewsArticle
  ): EnhancedSentimentResult['nlp'] {
    // Extract key phrases (simple n-gram extraction)
    const keyPhrases = this.extractKeyPhrases(text);
    
    // Extract entities
    const entities = this.extractEntities(text, article);
    
    // Detect topics
    const topics = this.detectTopics(text, article);
    
    // Determine emotion
    const { emotion, intensity } = this.detectEmotion(text);
    
    return {
      keyPhrases,
      entities,
      topics,
      emotion,
      emotionIntensity: intensity,
    };
  }

  /**
   * Extract key phrases from text
   */
  private extractKeyPhrases(text: string): string[] {
    const phrases: string[] = [];
    
    // Simple extraction: look for important patterns
    const patterns = [
      /(?:breaking|urgent|alert)[:\s]+([\w\s]+)/gi,
      /(?:just announced|reported)[:\s]+([\w\s]+)/gi,
      /([\w\s]+)(?:partnership|collaboration)/gi,
      /([\w\s]+)(?:launches?|releases?|unveils?)/gi,
      /(?:up|down|gained|lost)\s+(\d+%)/gi,
    ];
    
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          phrases.push(match[1].trim());
        }
      }
    }
    
    // Also include high-value keywords found
    for (const keyword of [...SENTIMENT_KEYWORDS.strongPositive, ...SENTIMENT_KEYWORDS.strongNegative]) {
      if (text.includes(keyword)) {
        phrases.push(keyword);
      }
    }
    
    return phrases.slice(0, 10);
  }

  /**
   * Extract entities from text
   */
  private extractEntities(
    text: string,
    article: NormalizedNewsArticle
  ): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    
    // Add tokens from article
    for (const token of article.tokens) {
      entities.push({
        text: token,
        type: 'token',
        sentiment: article.sentimentScore,
        confidence: 0.9,
        mentions: 1,
      });
    }
    
    // Add protocols
    for (const protocol of article.protocols) {
      entities.push({
        text: protocol,
        type: 'protocol',
        sentiment: article.sentimentScore,
        confidence: 0.8,
        mentions: 1,
      });
    }
    
    // Extract chain mentions
    const chains = ['ethereum', 'bitcoin', 'solana', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'bsc'];
    for (const chain of chains) {
      if (text.includes(chain)) {
        entities.push({
          text: chain,
          type: 'chain',
          sentiment: 0,
          confidence: 0.7,
          mentions: (text.match(new RegExp(chain, 'gi')) || []).length,
        });
      }
    }
    
    // Extract company mentions
    const companies = ['coinbase', 'binance', 'ftx', 'kraken', 'blackrock', 'fidelity', 'grayscale'];
    for (const company of companies) {
      if (text.includes(company)) {
        entities.push({
          text: company,
          type: 'company',
          sentiment: 0,
          confidence: 0.7,
          mentions: 1,
        });
      }
    }
    
    return entities;
  }

  /**
   * Detect topics from text
   */
  private detectTopics(text: string, article: NormalizedNewsArticle): string[] {
    const topics: string[] = [];
    
    // Topic categories
    const topicPatterns: Record<string, string[]> = {
      'price_action': ['price', 'rally', 'dump', 'surge', 'crash', 'dip', 'pump'],
      'regulation': ['sec', 'regulation', 'lawsuit', 'legal', 'court', 'ban', 'approve'],
      'defi': ['defi', 'yield', 'staking', 'lending', 'liquidity', 'tvl', 'apy'],
      'nft': ['nft', 'opensea', 'blur', 'collectible', 'mint'],
      'ethereum': ['ethereum', 'eth', 'merge', 'shanghai', 'layer 2'],
      'bitcoin': ['bitcoin', 'btc', 'halving', 'mining', 'lightning'],
      'exchange': ['exchange', 'cex', 'dex', 'listing', 'delisting'],
      'hack_exploit': ['hack', 'exploit', 'vulnerability', 'stolen', 'breach'],
      'adoption': ['adoption', 'institutional', 'mainstream', 'integration'],
      'tech': ['upgrade', 'fork', 'protocol', 'development', 'testnet'],
    };
    
    for (const [topic, keywords] of Object.entries(topicPatterns)) {
      if (keywords.some(kw => text.includes(kw))) {
        topics.push(topic);
      }
    }
    
    return topics;
  }

  /**
   * Detect emotion from text
   */
  private detectEmotion(text: string): {
    emotion: 'fear' | 'greed' | 'neutral' | 'fomo' | 'fud';
    intensity: number;
  } {
    // Emotion keywords
    const emotionPatterns = {
      fear: ['crash', 'panic', 'liquidation', 'collapse', 'disaster', 'plunge', 'worried'],
      greed: ['moon', 'lambo', 'millionaire', 'gains', 'rich', 'profit', '100x'],
      fomo: ['don\'t miss', 'last chance', 'buy now', 'before too late', 'hurry', 'get in'],
      fud: ['scam', 'fraud', 'warning', 'avoid', 'danger', 'ponzi', 'rug'],
    };
    
    let maxEmotion: 'fear' | 'greed' | 'neutral' | 'fomo' | 'fud' = 'neutral';
    let maxScore = 0;
    
    for (const [emotion, keywords] of Object.entries(emotionPatterns)) {
      let score = 0;
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          score += 20;
        }
      }
      
      if (score > maxScore) {
        maxScore = score;
        maxEmotion = emotion as any;
      }
    }
    
    const intensity = Math.min(100, maxScore);
    
    return { emotion: maxEmotion, intensity };
  }

  /**
   * Get default NLP result (when NLP is disabled)
   */
  private getDefaultNlpResult(): EnhancedSentimentResult['nlp'] {
    return {
      keyPhrases: [],
      entities: [],
      topics: [],
      emotion: 'neutral',
      emotionIntensity: 0,
    };
  }

  /**
   * Calculate market indicators
   */
  private calculateMarketIndicators(
    article: NormalizedNewsArticle,
    score: number,
    nlp: EnhancedSentimentResult['nlp']
  ): EnhancedSentimentResult['market'] {
    // Determine momentum
    let momentum: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (score > 30) momentum = 'bullish';
    else if (score < -30) momentum = 'bearish';
    
    // Calculate strength (based on engagement and sentiment intensity)
    const engagement = article.engagement;
    const totalEngagement = engagement.likes + engagement.comments + engagement.saves;
    const strength = Math.min(100, Math.abs(score) + Math.min(50, totalEngagement / 10));
    
    // Calculate urgency
    const urgencyKeywords = ['breaking', 'urgent', 'alert', 'just', 'now', 'emergency'];
    const hasUrgency = urgencyKeywords.some(kw => article.title.toLowerCase().includes(kw));
    const urgency = hasUrgency ? 80 : 30;
    
    // Calculate reliability (based on source and engagement)
    const reliability = Math.min(100, 50 + (totalEngagement > 100 ? 30 : 0) + (article.importance > 50 ? 20 : 0));
    
    return {
      momentum,
      strength,
      urgency,
      reliability,
    };
  }

  /**
   * Generate prediction based on analysis
   */
  private generatePrediction(
    article: NormalizedNewsArticle,
    score: number,
    nlp: EnhancedSentimentResult['nlp']
  ): EnhancedSentimentResult['prediction'] {
    if (!this.config.enablePrediction) {
      return null;
    }
    
    // Determine direction based on sentiment and emotion
    let direction: 'up' | 'down' | 'sideways' = 'sideways';
    if (score > 20 && (nlp.emotion === 'greed' || nlp.emotion === 'fomo')) {
      direction = 'up';
    } else if (score < -20 && (nlp.emotion === 'fear' || nlp.emotion === 'fud')) {
      direction = 'down';
    }
    
    // Determine magnitude
    let magnitude: 'small' | 'medium' | 'large' = 'small';
    if (Math.abs(score) > 60 || nlp.emotionIntensity > 60) {
      magnitude = 'large';
    } else if (Math.abs(score) > 30 || nlp.emotionIntensity > 30) {
      magnitude = 'medium';
    }
    
    // Calculate confidence
    const confidence = Math.min(0.95, 0.5 + (Math.abs(score) / 200) + (nlp.emotionIntensity / 200));
    
    return {
      direction,
      magnitude,
      confidence,
      timeframe: `${this.config.predictionHorizon}h`,
    };
  }

  /**
   * Update history for trend detection
   */
  private updateHistory(article: NormalizedNewsArticle, result: EnhancedSentimentResult): void {
    // Add to history
    this.articleHistory.push(article);
    this.sentimentHistory.push(result);
    
    // Keep only window size
    if (this.articleHistory.length > this.config.windowSize) {
      this.articleHistory.shift();
      this.sentimentHistory.shift();
    }
    
    // Update token aggregations
    for (const token of article.tokens) {
      this.updateTokenAggregation(token, result);
    }
    
    // Update emotion patterns
    this.emotionPatterns.set(result.nlp.emotion, 
      (this.emotionPatterns.get(result.nlp.emotion) || 0) + 1);
    
    // Update trend weights
    this.trendWeights.set(result.market.momentum,
      (this.trendWeights.get(result.market.momentum) || 0) + result.market.strength);
  }

  /**
   * Update token sentiment aggregation
   */
  private updateTokenAggregation(token: string, result: EnhancedSentimentResult): void {
    const existing = this.tokenAggregations.get(token);
    
    if (existing) {
      // Update existing aggregation
      const newCount = existing.articleCount + 1;
      const newAvg = (existing.avgSentiment * existing.articleCount + result.score) / newCount;
      
      // Determine trend
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (result.score > existing.avgSentiment + 10) trend = 'improving';
      else if (result.score < existing.avgSentiment - 10) trend = 'declining';
      
      existing.articleCount = newCount;
      existing.avgSentiment = newAvg;
      existing.sentimentTrend = trend;
      existing.dominantEmotion = result.nlp.emotion;
      existing.keyTopics = [...new Set([...existing.keyTopics, ...result.nlp.topics])].slice(0, 5);
      existing.prediction = result.prediction 
        ? { direction: result.prediction.direction, confidence: result.prediction.confidence }
        : existing.prediction;
      existing.lastUpdated = new Date();
      
    } else {
      // Create new aggregation
      this.tokenAggregations.set(token, {
        symbol: token,
        articleCount: 1,
        avgSentiment: result.score,
        sentimentTrend: 'stable',
        dominantEmotion: result.nlp.emotion,
        keyTopics: result.nlp.topics,
        prediction: result.prediction 
          ? { direction: result.prediction.direction, confidence: result.prediction.confidence }
          : { direction: 'sideways', confidence: 0.5 },
        lastUpdated: new Date(),
      });
    }
  }

  /**
   * Batch analyze multiple articles
   */
  async batchAnalyze(articles: NormalizedNewsArticle[]): Promise<EnhancedSentimentResult[]> {
    const results: EnhancedSentimentResult[] = [];
    
    for (const article of articles) {
      const result = await this.analyze(article);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Detect market trend from history
   */
  detectTrend(): TrendDetectionResult {
    if (this.sentimentHistory.length < 10) {
      return {
        trend: 'neutral',
        strength: 0,
        duration: 'insufficient_data',
        keyDrivers: [],
        reversal: { probability: 0.5, triggers: [] },
      };
    }
    
    // Calculate average sentiment over time windows
    const recent = this.sentimentHistory.slice(-10);
    const older = this.sentimentHistory.slice(-30, -10);
    
    const recentAvg = recent.reduce((sum, r) => sum + r.score, 0) / recent.length;
    const olderAvg = older.length > 0 
      ? older.reduce((sum, r) => sum + r.score, 0) / older.length 
      : 0;
    
    // Determine trend
    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (recentAvg > 20 && recentAvg > olderAvg) trend = 'bullish';
    else if (recentAvg < -20 && recentAvg < olderAvg) trend = 'bearish';
    
    // Calculate strength
    const strength = Math.min(100, Math.abs(recentAvg - olderAvg) + Math.abs(recentAvg));
    
    // Find key drivers (most mentioned topics)
    const topicCounts = new Map<string, number>();
    for (const result of recent) {
      for (const topic of result.nlp.topics) {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      }
    }
    const keyDrivers = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);
    
    // Calculate reversal probability
    const reversalProbability = strength > 70 ? 0.3 : 0.15;
    const reversalTriggers = trend === 'bullish' 
      ? ['regulation', 'hack', 'market_crash']
      : ['adoption', 'etf_approval', 'institutional'];
    
    return {
      trend,
      strength,
      duration: `${this.sentimentHistory.length} articles`,
      keyDrivers,
      reversal: {
        probability: reversalProbability,
        triggers: reversalTriggers,
      },
    };
  }

  /**
   * Get token sentiment aggregation
   */
  getTokenSentiment(token: string): TokenSentimentAggregation | null {
    return this.tokenAggregations.get(token.toUpperCase()) || null;
  }

  /**
   * Get all token aggregations
   */
  getAllTokenSentiments(): TokenSentimentAggregation[] {
    return Array.from(this.tokenAggregations.values());
  }

  /**
   * Get top tokens by sentiment
   */
  getTopTokens(options?: {
    limit?: number;
    sortBy?: 'sentiment' | 'articles' | 'trend';
  }): TokenSentimentAggregation[] {
    const { limit = 10, sortBy = 'sentiment' } = options || {};
    
    let tokens = Array.from(this.tokenAggregations.values());
    
    switch (sortBy) {
      case 'sentiment':
        tokens.sort((a, b) => b.avgSentiment - a.avgSentiment);
        break;
      case 'articles':
        tokens.sort((a, b) => b.articleCount - a.articleCount);
        break;
      case 'trend':
        const trendOrder = { improving: 0, stable: 1, declining: 2 };
        tokens.sort((a, b) => trendOrder[a.sentimentTrend] - trendOrder[b.sentimentTrend]);
        break;
    }
    
    return tokens.slice(0, limit);
  }

  /**
   * Get analyzer statistics
   */
  getStatistics(): {
    articlesAnalyzed: number;
    tokensTracked: number;
    currentTrend: TrendDetectionResult;
    emotionDistribution: Record<string, number>;
    avgProcessingTime: number;
  } {
    const avgProcessingTime = this.sentimentHistory.length > 0
      ? this.sentimentHistory.reduce((sum, r) => sum + r.processingTimeMs, 0) / this.sentimentHistory.length
      : 0;
    
    return {
      articlesAnalyzed: this.sentimentHistory.length,
      tokensTracked: this.tokenAggregations.size,
      currentTrend: this.detectTrend(),
      emotionDistribution: Object.fromEntries(this.emotionPatterns),
      avgProcessingTime,
    };
  }

  /**
   * Clear history and reset state
   */
  reset(): void {
    this.articleHistory = [];
    this.sentimentHistory = [];
    this.tokenAggregations.clear();
    this.initializePatterns();
    logger.info('AI Sentiment Analyzer reset');
  }

  /**
   * Destroy analyzer
   */
  destroy(): void {
    this.reset();
    this.removeAllListeners();
    logger.info('AI Sentiment Analyzer destroyed');
  }
}

export default AiSentimentAnalyzer;

