/**
 * =========================================
 * CRYPTOPANIC SENTIMENT ANALYZER SERVICE
 * =========================================
 * Advanced sentiment analysis with ML-grade scoring
 * Analyzes panic scores, sentiment trends, and market impact
 */

import {
  NormalizedNewsArticle,
  CryptoPanicSentiment,
  SentimentAnalysis,
} from '../types/cryptopanic.types';
import { logger } from '../utils/logger';

export interface SentimentAnalyzerConfig {
  enableAdvancedAnalysis?: boolean;
  sentimentKeywords?: {
    bullish: string[];
    bearish: string[];
    neutral: string[];
  };
  protocolImpactWeights?: Record<string, number>;
}

export class CryptoPanicSentimentAnalyzer {
  private config: SentimentAnalyzerConfig;
  private sentimentHistory: Map<string, SentimentAnalysis[]>;

  constructor(config: SentimentAnalyzerConfig = {}) {
    this.config = {
      enableAdvancedAnalysis: true,
      sentimentKeywords: this.getDefaultSentimentKeywords(),
      protocolImpactWeights: this.getDefaultProtocolWeights(),
      ...config,
    };

    this.sentimentHistory = new Map();

    logger.info('CryptoPanic Sentiment Analyzer initialized');
  }

  /**
   * Get default sentiment keywords
   */
  private getDefaultSentimentKeywords() {
    return {
      bullish: [
        'surge',
        'soar',
        'rally',
        'breakout',
        'moon',
        'pump',
        'bullish',
        'gains',
        'profit',
        'growth',
        'adoption',
        'partnership',
        'integration',
        'launch',
        'upgrade',
        'milestone',
        'record high',
        'all-time high',
        'ath',
        'breakthrough',
        'innovation',
        'expansion',
        'accumulation',
        'institutional',
        'whale buy',
      ],
      bearish: [
        'crash',
        'plunge',
        'dump',
        'bearish',
        'losses',
        'decline',
        'drop',
        'fall',
        'collapse',
        'sell-off',
        'correction',
        'fud',
        'hack',
        'exploit',
        'vulnerability',
        'scam',
        'rug pull',
        'liquidation',
        'delisting',
        'lawsuit',
        'regulation',
        'ban',
        'warning',
        'concerns',
        'investigation',
      ],
      neutral: [
        'analysis',
        'report',
        'update',
        'announcement',
        'statement',
        'opinion',
        'discussion',
        'review',
        'overview',
        'data',
        'metrics',
        'statistics',
      ],
    };
  }

  /**
   * Get default protocol impact weights
   */
  private getDefaultProtocolWeights(): Record<string, number> {
    return {
      uniswap: 1.5,
      aave: 1.4,
      compound: 1.3,
      makerdao: 1.3,
      curve: 1.2,
      lido: 1.3,
      gmx: 1.1,
      // Default weight is 1.0
    };
  }

  /**
   * Analyze text for sentiment keywords
   */
  private analyzeTextSentiment(text: string): {
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    signals: { bullish: string[]; bearish: string[]; neutral: string[] };
  } {
    const lowercaseText = text.toLowerCase();
    const signals = {
      bullish: [] as string[],
      bearish: [] as string[],
      neutral: [] as string[],
    };

    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;

    // Count bullish keywords
    for (const keyword of this.config.sentimentKeywords!.bullish) {
      if (lowercaseText.includes(keyword)) {
        bullishCount++;
        signals.bullish.push(keyword);
      }
    }

    // Count bearish keywords
    for (const keyword of this.config.sentimentKeywords!.bearish) {
      if (lowercaseText.includes(keyword)) {
        bearishCount++;
        signals.bearish.push(keyword);
      }
    }

    // Count neutral keywords
    for (const keyword of this.config.sentimentKeywords!.neutral) {
      if (lowercaseText.includes(keyword)) {
        neutralCount++;
        signals.neutral.push(keyword);
      }
    }

    return { bullishCount, bearishCount, neutralCount, signals };
  }

  /**
   * Calculate confidence based on multiple factors
   */
  private calculateConfidence(
    article: NormalizedNewsArticle,
    textAnalysis: ReturnType<typeof this.analyzeTextSentiment>
  ): number {
    let confidence = 0.5; // Base confidence

    // Engagement increases confidence
    const totalEngagement =
      article.engagement.likes +
      article.engagement.comments +
      article.engagement.saves;
    const engagementBoost = Math.min(totalEngagement / 100, 0.2);
    confidence += engagementBoost;

    // Importance increases confidence
    const importanceBoost = (article.importance / 100) * 0.15;
    confidence += importanceBoost;

    // Clear keyword signals increase confidence
    const totalKeywords =
      textAnalysis.bullishCount + textAnalysis.bearishCount;
    if (totalKeywords > 0) {
      const keywordBoost = Math.min(totalKeywords / 10, 0.15);
      confidence += keywordBoost;
    }

    // Source reputation (can be enhanced with source ratings)
    // For now, we use a simple heuristic
    if (article.source.name.includes('CoinDesk') || 
        article.source.name.includes('CoinTelegraph') ||
        article.source.name.includes('Bloomberg')) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Determine token impact level
   */
  private determineTokenImpact(
    article: NormalizedNewsArticle,
    token: string
  ): 'high' | 'medium' | 'low' {
    // Check if token is mentioned in title (high impact)
    if (article.title.toLowerCase().includes(token.toLowerCase())) {
      return 'high';
    }

    // Check if token is in currencies list
    const inCurrencies = article.currencies.some(
      (c) => c.code.toLowerCase() === token.toLowerCase()
    );
    if (inCurrencies) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Calculate enhanced sentiment score with text analysis
   */
  private calculateEnhancedSentimentScore(
    article: NormalizedNewsArticle,
    textAnalysis: ReturnType<typeof this.analyzeTextSentiment>
  ): number {
    // Start with base sentiment score
    let score = article.sentimentScore;

    // Adjust based on keyword analysis
    const keywordDelta =
      (textAnalysis.bullishCount - textAnalysis.bearishCount) * 10;
    score += keywordDelta;

    // Apply protocol weight multiplier
    let maxProtocolWeight = 1.0;
    for (const protocol of article.protocols) {
      const weight =
        this.config.protocolImpactWeights![protocol] || 1.0;
      maxProtocolWeight = Math.max(maxProtocolWeight, weight);
    }
    score *= maxProtocolWeight;

    // Clamp to -100 to +100
    return Math.max(-100, Math.min(100, score));
  }

  /**
   * Analyze article sentiment
   */
  analyze(article: NormalizedNewsArticle): SentimentAnalysis {
    logger.debug(`Analyzing sentiment for article: ${article.id}`);

    // Analyze text
    const text = `${article.title} ${article.description || ''}`;
    const textAnalysis = this.analyzeTextSentiment(text);

    // Calculate enhanced sentiment score
    const enhancedSentimentScore = this.config.enableAdvancedAnalysis
      ? this.calculateEnhancedSentimentScore(article, textAnalysis)
      : article.sentimentScore;

    // Determine final sentiment
    const finalSentiment =
      enhancedSentimentScore > 20
        ? CryptoPanicSentiment.POSITIVE
        : enhancedSentimentScore < -20
        ? CryptoPanicSentiment.NEGATIVE
        : CryptoPanicSentiment.NEUTRAL;

    // Calculate confidence
    const confidence = this.calculateConfidence(article, textAnalysis);

    // Analyze token impacts
    const impactedTokens = article.tokens.map((token) => ({
      token,
      impact: this.determineTokenImpact(article, token),
      sentiment: finalSentiment,
    }));

    const analysis: SentimentAnalysis = {
      article,
      sentiment: finalSentiment,
      sentimentScore: enhancedSentimentScore,
      panicScore: article.panicScore,
      confidence,
      indicators: {
        bullishSignals: textAnalysis.signals.bullish,
        bearishSignals: textAnalysis.signals.bearish,
        neutralFactors: textAnalysis.signals.neutral,
      },
      impactedTokens,
    };

    // Store in history
    const tokenKey = article.tokens.join(',') || 'general';
    const history = this.sentimentHistory.get(tokenKey) || [];
    history.push(analysis);

    // Keep last 100 analyses per token
    if (history.length > 100) {
      history.shift();
    }
    this.sentimentHistory.set(tokenKey, history);

    return analysis;
  }

  /**
   * Analyze multiple articles
   */
  analyzeBatch(articles: NormalizedNewsArticle[]): SentimentAnalysis[] {
    return articles.map((article) => this.analyze(article));
  }

  /**
   * Get sentiment trend for token
   */
  getSentimentTrend(
    token: string,
    lookbackCount: number = 10
  ): {
    token: string;
    trend: 'bullish' | 'bearish' | 'neutral' | 'mixed';
    averageSentiment: number;
    averagePanic: number;
    articleCount: number;
    recentAnalyses: SentimentAnalysis[];
  } {
    const history = this.sentimentHistory.get(token) || [];
    const recent = history.slice(-lookbackCount);

    if (recent.length === 0) {
      return {
        token,
        trend: 'neutral',
        averageSentiment: 0,
        averagePanic: 0,
        articleCount: 0,
        recentAnalyses: [],
      };
    }

    const avgSentiment =
      recent.reduce((sum, a) => sum + a.sentimentScore, 0) / recent.length;

    const avgPanic =
      recent.reduce((sum, a) => sum + a.panicScore, 0) / recent.length;

    // Determine trend
    let trend: 'bullish' | 'bearish' | 'neutral' | 'mixed';
    const positiveCount = recent.filter(
      (a) => a.sentiment === CryptoPanicSentiment.POSITIVE
    ).length;
    const negativeCount = recent.filter(
      (a) => a.sentiment === CryptoPanicSentiment.NEGATIVE
    ).length;

    if (positiveCount > negativeCount * 1.5) {
      trend = 'bullish';
    } else if (negativeCount > positiveCount * 1.5) {
      trend = 'bearish';
    } else if (Math.abs(positiveCount - negativeCount) <= 1) {
      trend = 'mixed';
    } else {
      trend = 'neutral';
    }

    return {
      token,
      trend,
      averageSentiment: avgSentiment,
      averagePanic: avgPanic,
      articleCount: recent.length,
      recentAnalyses: recent,
    };
  }

  /**
   * Get market sentiment overview
   */
  getMarketSentimentOverview(): {
    overallSentiment: CryptoPanicSentiment;
    averageSentimentScore: number;
    averagePanicScore: number;
    totalArticles: number;
    sentimentDistribution: {
      positive: number;
      negative: number;
      neutral: number;
    };
    topBullishTokens: Array<{ token: string; score: number }>;
    topBearishTokens: Array<{ token: string; score: number }>;
  } {
    const allAnalyses = Array.from(this.sentimentHistory.values()).flat();

    if (allAnalyses.length === 0) {
      return {
        overallSentiment: CryptoPanicSentiment.NEUTRAL,
        averageSentimentScore: 0,
        averagePanicScore: 0,
        totalArticles: 0,
        sentimentDistribution: { positive: 0, negative: 0, neutral: 0 },
        topBullishTokens: [],
        topBearishTokens: [],
      };
    }

    const avgSentiment =
      allAnalyses.reduce((sum, a) => sum + a.sentimentScore, 0) /
      allAnalyses.length;

    const avgPanic =
      allAnalyses.reduce((sum, a) => sum + a.panicScore, 0) /
      allAnalyses.length;

    const overallSentiment =
      avgSentiment > 10
        ? CryptoPanicSentiment.POSITIVE
        : avgSentiment < -10
        ? CryptoPanicSentiment.NEGATIVE
        : CryptoPanicSentiment.NEUTRAL;

    const distribution = {
      positive: allAnalyses.filter(
        (a) => a.sentiment === CryptoPanicSentiment.POSITIVE
      ).length,
      negative: allAnalyses.filter(
        (a) => a.sentiment === CryptoPanicSentiment.NEGATIVE
      ).length,
      neutral: allAnalyses.filter(
        (a) => a.sentiment === CryptoPanicSentiment.NEUTRAL
      ).length,
    };

    // Calculate token sentiments
    const tokenSentiments = new Map<string, number[]>();
    for (const analysis of allAnalyses) {
      for (const token of analysis.article.tokens) {
        const scores = tokenSentiments.get(token) || [];
        scores.push(analysis.sentimentScore);
        tokenSentiments.set(token, scores);
      }
    }

    const tokenAverages = Array.from(tokenSentiments.entries())
      .map(([token, scores]) => ({
        token,
        score: scores.reduce((sum, s) => sum + s, 0) / scores.length,
      }))
      .sort((a, b) => b.score - a.score);

    return {
      overallSentiment,
      averageSentimentScore: avgSentiment,
      averagePanicScore: avgPanic,
      totalArticles: allAnalyses.length,
      sentimentDistribution: distribution,
      topBullishTokens: tokenAverages.slice(0, 10),
      topBearishTokens: tokenAverages.slice(-10).reverse(),
    };
  }

  /**
   * Detect panic events (high panic score with high confidence)
   */
  detectPanicEvents(
    minPanicScore: number = 70,
    minConfidence: number = 0.7
  ): SentimentAnalysis[] {
    const allAnalyses = Array.from(this.sentimentHistory.values()).flat();

    return allAnalyses
      .filter(
        (a) => a.panicScore >= minPanicScore && a.confidence >= minConfidence
      )
      .sort((a, b) => b.panicScore - a.panicScore);
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.sentimentHistory.clear();
    logger.info('Sentiment history cleared');
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalAnalyses: number;
    tokensTracked: number;
    averageConfidence: number;
  } {
    const allAnalyses = Array.from(this.sentimentHistory.values()).flat();

    const avgConfidence =
      allAnalyses.length > 0
        ? allAnalyses.reduce((sum, a) => sum + a.confidence, 0) /
          allAnalyses.length
        : 0;

    return {
      totalAnalyses: allAnalyses.length,
      tokensTracked: this.sentimentHistory.size,
      averageConfidence: avgConfidence,
    };
  }
}

export default CryptoPanicSentimentAnalyzer;

