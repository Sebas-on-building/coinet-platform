/**
 * Sentiment Monitor
 * Real-time monitoring of sentiment shifts from news, social media, and market psychology
 */

import { DataPoint, DataSource, MonitoringConfig } from '../core/types';
import { EventEmitter } from 'events';

export interface SentimentData {
  symbol: string;
  text: string;
  source: 'twitter' | 'reddit' | 'news' | 'telegram' | 'discord';
  sentiment: number; // -1 to 1
  timestamp: Date;
  influence: number; // 0 to 1, higher = more influential
  metadata?: Record<string, unknown>;
}

export interface SentimentShift {
  symbol: string;
  previousSentiment: number;
  currentSentiment: number;
  change: number;
  velocity: number; // Rate of change
  timestamp: Date;
}

export class SentimentMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private sentimentCache: Map<string, SentimentData[]> = new Map();
  private aggregatedSentiment: Map<string, number> = new Map();
  private readonly sentimentWindow = 3600000; // 1 hour
  private readonly shiftThreshold = 0.3; // 30% change

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
  }

  /**
   * Process incoming sentiment data
   */
  async processSentiment(data: SentimentData): Promise<DataPoint[]> {
    const dataPoints: DataPoint[] = [];

    // Add to cache
    this.addToCache(data);

    // Calculate aggregated sentiment
    const aggregated = this.calculateAggregatedSentiment(data.symbol);
    
    // Check for sentiment shift
    const shift = this.detectSentimentShift(data.symbol, aggregated);
    if (shift) {
      this.emit('sentiment_shift', shift);
    }

    // Create sentiment data point
    dataPoints.push({
      timestamp: data.timestamp,
      source: DataSource.SENTIMENT,
      value: aggregated,
      metadata: {
        symbol: data.symbol,
        rawSentiment: data.sentiment,
        source: data.source,
        influence: data.influence,
        messageCount: this.sentimentCache.get(data.symbol)?.length || 0,
        sentimentDistribution: this.getSentimentDistribution(data.symbol)
      },
      symbol: data.symbol
    });

    // Calculate social volume
    const socialVolume = this.calculateSocialVolume(data.symbol);
    dataPoints.push({
      timestamp: data.timestamp,
      source: DataSource.SOCIAL_VOLUME,
      value: socialVolume,
      metadata: {
        symbol: data.symbol,
        bySource: this.getSocialVolumeBySource(data.symbol)
      },
      symbol: data.symbol
    });

    return dataPoints;
  }

  /**
   * Process batch of sentiment data
   */
  async processSentimentBatch(batch: SentimentData[]): Promise<DataPoint[]> {
    const dataPoints: DataPoint[] = [];

    for (const data of batch) {
      const points = await this.processSentiment(data);
      dataPoints.push(...points);
    }

    return dataPoints;
  }

  /**
   * Add sentiment data to cache
   */
  private addToCache(data: SentimentData): void {
    const key = data.symbol;
    
    if (!this.sentimentCache.has(key)) {
      this.sentimentCache.set(key, []);
    }

    const cache = this.sentimentCache.get(key)!;
    cache.push(data);

    // Remove old entries
    const cutoff = Date.now() - this.sentimentWindow;
    this.sentimentCache.set(
      key,
      cache.filter(s => s.timestamp.getTime() > cutoff)
    );
  }

  /**
   * Calculate aggregated sentiment (weighted by influence)
   */
  private calculateAggregatedSentiment(symbol: string): number {
    const sentiments = this.sentimentCache.get(symbol);
    if (!sentiments || sentiments.length === 0) return 0;

    let totalWeightedSentiment = 0;
    let totalWeight = 0;

    for (const data of sentiments) {
      const weight = data.influence * this.getSourceWeight(data.source);
      totalWeightedSentiment += data.sentiment * weight;
      totalWeight += weight;
    }

    return totalWeight === 0 ? 0 : totalWeightedSentiment / totalWeight;
  }

  /**
   * Get source weight (some sources are more reliable)
   */
  private getSourceWeight(source: SentimentData['source']): number {
    const weights = {
      news: 1.0,      // News articles are most reliable
      twitter: 0.7,   // Twitter has high volume but mixed quality
      reddit: 0.8,    // Reddit discussions are generally thoughtful
      telegram: 0.6,  // Telegram can have pump groups
      discord: 0.6    // Discord similar to Telegram
    };

    return weights[source] || 0.5;
  }

  /**
   * Detect sentiment shift
   */
  private detectSentimentShift(
    symbol: string,
    currentSentiment: number
  ): SentimentShift | null {
    const previousSentiment = this.aggregatedSentiment.get(symbol) || 0;
    this.aggregatedSentiment.set(symbol, currentSentiment);

    const change = currentSentiment - previousSentiment;
    const changePercent = Math.abs(change);

    if (changePercent < this.shiftThreshold) {
      return null;
    }

    // Calculate velocity (how fast sentiment is changing)
    const velocity = this.calculateSentimentVelocity(symbol);

    return {
      symbol,
      previousSentiment,
      currentSentiment,
      change,
      velocity,
      timestamp: new Date()
    };
  }

  /**
   * Calculate sentiment velocity (rate of change)
   */
  private calculateSentimentVelocity(symbol: string): number {
    const sentiments = this.sentimentCache.get(symbol);
    if (!sentiments || sentiments.length < 2) return 0;

    // Sort by timestamp
    const sorted = [...sentiments].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Calculate sentiment changes over time
    const changes: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const timeDiff = sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime();
      const sentimentDiff = sorted[i].sentiment - sorted[i - 1].sentiment;
      
      // Velocity = change per hour
      const velocity = (sentimentDiff / timeDiff) * 3600000;
      changes.push(velocity);
    }

    // Average velocity
    return changes.reduce((sum, v) => sum + v, 0) / changes.length;
  }

  /**
   * Get sentiment distribution (positive, neutral, negative)
   */
  private getSentimentDistribution(symbol: string): {
    positive: number;
    neutral: number;
    negative: number;
  } {
    const sentiments = this.sentimentCache.get(symbol);
    if (!sentiments || sentiments.length === 0) {
      return { positive: 0, neutral: 0, negative: 0 };
    }

    const distribution = {
      positive: 0,
      neutral: 0,
      negative: 0
    };

    for (const data of sentiments) {
      if (data.sentiment > 0.2) {
        distribution.positive++;
      } else if (data.sentiment < -0.2) {
        distribution.negative++;
      } else {
        distribution.neutral++;
      }
    }

    const total = sentiments.length;
    return {
      positive: distribution.positive / total,
      neutral: distribution.neutral / total,
      negative: distribution.negative / total
    };
  }

  /**
   * Calculate social volume (mentions/posts)
   */
  private calculateSocialVolume(symbol: string): number {
    const sentiments = this.sentimentCache.get(symbol);
    return sentiments ? sentiments.length : 0;
  }

  /**
   * Get social volume by source
   */
  private getSocialVolumeBySource(symbol: string): Record<string, number> {
    const sentiments = this.sentimentCache.get(symbol);
    if (!sentiments) return {};

    const bySource: Record<string, number> = {};

    for (const data of sentiments) {
      bySource[data.source] = (bySource[data.source] || 0) + 1;
    }

    return bySource;
  }

  /**
   * Get sentiment summary for symbol
   */
  getSentimentSummary(symbol: string): {
    currentSentiment: number;
    distribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
    socialVolume: number;
    velocity: number;
    topSources: Array<{ source: string; count: number }>;
  } | null {
    const sentiments = this.sentimentCache.get(symbol);
    if (!sentiments || sentiments.length === 0) return null;

    const bySource = this.getSocialVolumeBySource(symbol);
    const topSources = Object.entries(bySource)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      currentSentiment: this.aggregatedSentiment.get(symbol) || 0,
      distribution: this.getSentimentDistribution(symbol),
      socialVolume: this.calculateSocialVolume(symbol),
      velocity: this.calculateSentimentVelocity(symbol),
      topSources
    };
  }

  /**
   * Analyze sentiment trend
   */
  analyzeSentimentTrend(symbol: string): {
    trend: 'improving' | 'declining' | 'stable';
    confidence: number;
    recentChanges: number[];
  } | null {
    const sentiments = this.sentimentCache.get(symbol);
    if (!sentiments || sentiments.length < 5) return null;

    const sorted = [...sentiments].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Calculate recent sentiment values
    const recentChanges = sorted.slice(-10).map(s => s.sentiment);
    
    // Simple linear regression for trend
    const n = recentChanges.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = recentChanges;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Determine trend
    let trend: 'improving' | 'declining' | 'stable';
    if (slope > 0.01) {
      trend = 'improving';
    } else if (slope < -0.01) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    // Calculate confidence based on consistency
    const variance = y.reduce((sum, val) => {
      const predicted = slope * y.indexOf(val) + (sumY / n);
      return sum + Math.pow(val - predicted, 2);
    }, 0) / n;
    
    const confidence = Math.max(0, 1 - variance);

    return {
      trend,
      confidence,
      recentChanges
    };
  }

  /**
   * Clear cache for symbol
   */
  clearCache(symbol?: string): void {
    if (symbol) {
      this.sentimentCache.delete(symbol);
      this.aggregatedSentiment.delete(symbol);
    } else {
      this.sentimentCache.clear();
      this.aggregatedSentiment.clear();
    }
  }
}

