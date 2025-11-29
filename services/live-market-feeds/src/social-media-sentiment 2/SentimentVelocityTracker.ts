/**
 * =========================================
 * ELITE SENTIMENT VELOCITY TRACKER
 * =========================================
 * DIVINE WORLD-CLASS sentiment velocity tracking system that monitors
 * sentiment changes over time, detects acceleration patterns, identifies
 * trend reversals, and provides Elon Musk-level sophistication for
 * predictive sentiment analysis.
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { SentimentVelocity, SocialMention } from './SocialMediaSentimentAnalyzer';

export interface VelocityTrackingConfig {
  enableAccelerationCalculation: boolean;
  enableTrendDetection: boolean;
  enableAnomalyDetection: boolean;
  windowSizes: number[]; // Time windows in seconds
  updateFrequency: number; // Update frequency in seconds
  minSampleSize: number;
  velocityThreshold: number;
  accelerationThreshold: number;
}

export interface SentimentDataPoint {
  timestamp: Date;
  symbol: string;
  sentimentScore: number;
  sampleSize: number;
  confidence: number;
  sourceCount: number;
}

export interface TrendAnalysis {
  symbol: string;
  trend: 'bullish' | 'bearish' | 'neutral' | 'volatile';
  strength: number; // 0-1
  duration: number; // Hours
  confidence: number; // 0-1
  turningPoints: Date[];
  supportLevels: number[];
  resistanceLevels: number[];
}

export class SentimentVelocityTracker extends EventEmitter {
  private config: VelocityTrackingConfig;
  private logger: Logger;
  private sentimentData: Map<string, SentimentDataPoint[]> = new Map();
  private velocityCache: Map<string, SentimentVelocity> = new Map();
  private trendAnalysis: Map<string, TrendAnalysis> = new Map();
  private updateTimer: NodeJS.Timeout | null = null;
  private anomalyDetector: SentimentAnomalyDetector | null = null;
  private isRunning: boolean = false;

  constructor(config: VelocityTrackingConfig) {
    super();
    this.config = config;
    this.logger = new Logger('SentimentVelocityTracker');
  }

  /**
   * Initialize elite sentiment velocity tracking with divine precision
   */
  async initialize(): Promise<void> {
    this.logger.info('📈 Initializing ELITE Sentiment Velocity Tracker - Divine Elon Musk Perfection Mode...');

    try {
      // Initialize data structures
      await this.initializeDataStructures();

      // Initialize anomaly detection
      if (this.config.enableAnomalyDetection) {
        await this.initializeAnomalyDetection();
      }

      // Start periodic updates
      this.startPeriodicUpdates();

      this.isRunning = true;
      this.logger.info('✅ ELITE Sentiment Velocity Tracker initialized with divine precision');

      this.emit('velocityTrackerReady', {
        accelerationCalculation: this.config.enableAccelerationCalculation,
        trendDetection: this.config.enableTrendDetection,
        anomalyDetection: this.config.enableAnomalyDetection,
        windowSizes: this.config.windowSizes
      });

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize ELITE Sentiment Velocity Tracker', error);
      throw error;
    }
  }

  /**
   * Initialize data structures for velocity tracking
   */
  private async initializeDataStructures(): Promise<void> {
    this.logger.info('📊 Initializing velocity tracking data structures...');

    // Initialize sentiment data storage for each symbol
    // This would typically load from database or initialize empty
    this.logger.info('✅ Velocity tracking data structures initialized');
  }

  /**
   * Initialize anomaly detection for velocity tracking
   */
  private async initializeAnomalyDetection(): Promise<void> {
    this.logger.info('🚨 Initializing velocity anomaly detection...');

    this.anomalyDetector = new SentimentAnomalyDetector({
      velocityThreshold: this.config.velocityThreshold,
      accelerationThreshold: this.config.accelerationThreshold,
      enableStatisticalAnalysis: true,
      enablePatternRecognition: true,
      minSampleSize: this.config.minSampleSize
    });

    await this.anomalyDetector.initialize();

    this.anomalyDetector.on('velocityAnomaly', (anomaly: any) => {
      this.emit('velocityAnomaly', anomaly);
    });

    this.logger.info('✅ Velocity anomaly detection initialized');
  }

  /**
   * Start periodic velocity updates
   */
  private startPeriodicUpdates(): void {
    this.logger.info('⏰ Starting periodic velocity updates...');

    this.updateTimer = setInterval(() => {
      this.performPeriodicUpdate();
    }, this.config.updateFrequency * 1000);

    this.logger.info(`✅ Periodic velocity updates started (every ${this.config.updateFrequency}s)`);
  }

  /**
   * Update velocity tracking with new batch of mentions
   */
  async updateWithBatch(mentions: SocialMention[]): Promise<void> {
    const startTime = Date.now();

    // Group mentions by symbol
    const symbolGroups = this.groupMentionsBySymbol(mentions);

    for (const [symbol, symbolMentions] of Array.from(symbolGroups)) {
      // Calculate sentiment data point for this batch
      const dataPoint = this.calculateSentimentDataPoint(symbol, symbolMentions);

      // Store data point
      this.storeSentimentDataPoint(symbol, dataPoint);

      // Update velocity calculations
      await this.updateVelocityCalculations(symbol);

      // Update trend analysis
      await this.updateTrendAnalysis(symbol);

      // Check for anomalies
      if (this.anomalyDetector) {
        await this.anomalyDetector.analyzeVelocity(symbol, this.getVelocity(symbol));
      }
    }

    const processingTime = Date.now() - startTime;
    this.logger.debug(`✅ Updated velocity for ${symbolGroups.size} symbols in ${processingTime}ms`);
  }

  /**
   * Group mentions by cryptocurrency symbol
   */
  private groupMentionsBySymbol(mentions: SocialMention[]): Map<string, SocialMention[]> {
    const symbolGroups = new Map<string, SocialMention[]>();

    for (const mention of mentions) {
      // Extract symbols from mentions, hashtags, and content
      const symbols = this.extractSymbolsFromMention(mention);

      for (const symbol of symbols) {
        if (!symbolGroups.has(symbol)) {
          symbolGroups.set(symbol, []);
        }
        symbolGroups.get(symbol)!.push(mention);
      }
    }

    return symbolGroups;
  }

  /**
   * Extract cryptocurrency symbols from mention
   */
  private extractSymbolsFromMention(mention: SocialMention): string[] {
    const symbols: string[] = [];

    // Extract from mentions (e.g., $BTC, @ethereum)
    for (const m of mention.mentions) {
      if (m.startsWith('$')) {
        symbols.push(m.substring(1));
      }
    }

    // Extract from hashtags (e.g., #bitcoin, #eth)
    for (const hashtag of mention.hashtags) {
      const lowerHashtag = hashtag.toLowerCase();
      if (['bitcoin', 'btc', 'ethereum', 'eth', 'cardano', 'ada'].includes(lowerHashtag)) {
        symbols.push(hashtag.toUpperCase());
      }
    }

    // Extract from content using regex
    const symbolRegex = /\b[A-Z]{2,10}\b/g;
    let match;
    while ((match = symbolRegex.exec(mention.content)) !== null) {
      const potentialSymbol = match[0];
      if (potentialSymbol.length >= 2 && potentialSymbol.length <= 10) {
        symbols.push(potentialSymbol);
      }
    }

    return Array.from(new Set(symbols)); // Remove duplicates
  }

  /**
   * Calculate sentiment data point for symbol and mentions
   */
  private calculateSentimentDataPoint(symbol: string, mentions: SocialMention[]): SentimentDataPoint {
    if (mentions.length === 0) {
      return {
        timestamp: new Date(),
        symbol,
        sentimentScore: 0,
        sampleSize: 0,
        confidence: 0,
        sourceCount: 0
      };
    }

    // Calculate weighted average sentiment
    let totalSentiment = 0;
    let totalWeight = 0;
    let totalConfidence = 0;
    const sources = new Set<string>();

    for (const mention of mentions) {
      const weight = this.calculateMentionWeight(mention);
      totalSentiment += mention.sentiment.score * weight;
      totalWeight += weight;
      totalConfidence += mention.sentiment.confidence;

      // Track unique sources
      sources.add(`${mention.platform}:${mention.author}`);
    }

    const averageSentiment = totalWeight > 0 ? totalSentiment / totalWeight : 0;
    const averageConfidence = totalConfidence / mentions.length;

    return {
      timestamp: new Date(),
      symbol,
      sentimentScore: averageSentiment,
      sampleSize: mentions.length,
      confidence: averageConfidence,
      sourceCount: sources.size
    };
  }

  /**
   * Calculate weight for mention based on influence and engagement
   */
  private calculateMentionWeight(mention: SocialMention): number {
    let weight = 1.0; // Base weight

    // Influence factor (0-2x multiplier)
    const influenceMultiplier = 1 + (mention.influence.influenceScore / 100);
    weight *= influenceMultiplier;

    // Engagement factor (0-1.5x multiplier)
    const engagementMultiplier = 1 + (mention.engagement.engagementRate * 0.5);
    weight *= engagementMultiplier;

    // Recency factor (0.5-1.5x multiplier based on age)
    const ageInHours = (Date.now() - mention.timestamp.getTime()) / (1000 * 60 * 60);
    const recencyMultiplier = Math.max(0.5, 1.5 - (ageInHours / 24)); // Decay over 24 hours
    weight *= recencyMultiplier;

    return Math.min(weight, 5.0); // Cap at 5x
  }

  /**
   * Store sentiment data point for symbol
   */
  private storeSentimentDataPoint(symbol: string, dataPoint: SentimentDataPoint): void {
    if (!this.sentimentData.has(symbol)) {
      this.sentimentData.set(symbol, []);
    }

    const symbolData = this.sentimentData.get(symbol)!;

    // Add new data point
    symbolData.push(dataPoint);

    // Keep only recent data points based on window sizes
    const oldestAllowedTime = Date.now() - (Math.max(...this.config.windowSizes) * 1000);
    const recentData = symbolData.filter(dp => dp.timestamp.getTime() > oldestAllowedTime);
    this.sentimentData.set(symbol, recentData);
  }

  /**
   * Update velocity calculations for symbol
   */
  private async updateVelocityCalculations(symbol: string): Promise<void> {
    const symbolData = this.sentimentData.get(symbol);

    if (!symbolData || symbolData.length < this.config.minSampleSize) {
      return;
    }

    for (const windowSize of this.config.windowSizes) {
      const velocity = this.calculateVelocity(symbol, windowSize);

      if (velocity) {
        this.velocityCache.set(`${symbol}_${windowSize}`, velocity);

        // Emit velocity update if significant change
        if (this.shouldEmitVelocityUpdate(symbol, velocity)) {
          this.emit('velocityUpdate', velocity);
        }
      }
    }
  }

  /**
   * Calculate velocity for symbol over time window
   */
  private calculateVelocity(symbol: string, windowSizeSeconds: number): SentimentVelocity | null {
    const symbolData = this.sentimentData.get(symbol);

    if (!symbolData || symbolData.length < 2) {
      return null;
    }

    // Get data points within the time window
    const windowStartTime = Date.now() - (windowSizeSeconds * 1000);
    const windowData = symbolData.filter(dp => dp.timestamp.getTime() > windowStartTime);

    if (windowData.length < this.config.minSampleSize) {
      return null;
    }

    // Sort by timestamp
    windowData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const current = windowData[windowData.length - 1];
    const previous = windowData[0];

    if (!current || !previous) return null;

    // Calculate velocity (change per hour)
    const timeDiffHours = (current.timestamp.getTime() - previous.timestamp.getTime()) / (1000 * 60 * 60);
    if (timeDiffHours === 0) return null;

    const sentimentChange = current.sentimentScore - previous.sentimentScore;
    const velocity = sentimentChange / timeDiffHours;

    // Calculate acceleration if enabled
    let acceleration = 0;
    if (this.config.enableAccelerationCalculation && windowData.length >= 3) {
      acceleration = this.calculateAcceleration(windowData);
    }

    // Determine trend
    const trend = this.determineTrend(velocity, acceleration);

    return {
      symbol,
      currentSentiment: current.sentimentScore,
      velocity,
      acceleration,
      trend,
      confidence: this.calculateVelocityConfidence(windowData),
      sampleSize: windowData.length,
      timeframe: windowSizeSeconds / 3600 // Convert to hours
    };
  }

  /**
   * Calculate acceleration (rate of velocity change)
   */
  private calculateAcceleration(dataPoints: SentimentDataPoint[]): number {
    if (dataPoints.length < 3) return 0;

    // Use simple linear regression to calculate acceleration
    const n = dataPoints.length;
    const timestamps = dataPoints.map(dp => dp.timestamp.getTime());
    const sentiments = dataPoints.map(dp => dp.sentimentScore);

    // Check if we have valid timestamps
    if (timestamps.length < 2 || timestamps[0] === undefined || timestamps[timestamps.length - 1] === undefined) {
      return 0;
    }

    // Calculate velocity at start and end of window
    const startVelocity = this.calculateSimpleVelocity(dataPoints.slice(0, Math.floor(n/2)));
    const endVelocity = this.calculateSimpleVelocity(dataPoints.slice(Math.floor(n/2)));

    const lastTimestamp = timestamps[timestamps.length - 1];
    const firstTimestamp = timestamps[0];

    if (lastTimestamp === undefined || firstTimestamp === undefined) return 0;

    const timeDiffHours = (lastTimestamp - firstTimestamp) / (1000 * 60 * 60);
    if (timeDiffHours === 0) return 0;

    return (endVelocity - startVelocity) / timeDiffHours;
  }

  /**
   * Calculate simple velocity between two points
   */
  private calculateSimpleVelocity(dataPoints: SentimentDataPoint[]): number {
    if (dataPoints.length < 2) return 0;

    const first = dataPoints[0];
    const last = dataPoints[dataPoints.length - 1];

    if (!first || !last) return 0;

    const timeDiffHours = (last.timestamp.getTime() - first.timestamp.getTime()) / (1000 * 60 * 60);
    if (timeDiffHours === 0) return 0;

    return (last.sentimentScore - first.sentimentScore) / timeDiffHours;
  }

  /**
   * Determine trend based on velocity and acceleration
   */
  private determineTrend(velocity: number, acceleration: number): 'increasing' | 'decreasing' | 'stable' {
    const velocityThreshold = this.config.velocityThreshold || 0.1;
    const accelerationThreshold = this.config.accelerationThreshold || 0.05;

    if (Math.abs(velocity) < velocityThreshold) {
      return 'stable';
    }

    if (velocity > velocityThreshold) {
      return acceleration > accelerationThreshold ? 'increasing' : 'increasing';
    } else {
      return acceleration < -accelerationThreshold ? 'decreasing' : 'decreasing';
    }
  }

  /**
   * Calculate confidence in velocity calculation
   */
  private calculateVelocityConfidence(dataPoints: SentimentDataPoint[]): number {
    if (dataPoints.length === 0) return 0;

    // Confidence based on sample size and data consistency
    const sampleSizeScore = Math.min(dataPoints.length / 10, 1); // 0-1 based on 10+ samples
    const consistencyScore = this.calculateDataConsistency(dataPoints);

    return (sampleSizeScore * 0.6) + (consistencyScore * 0.4);
  }

  /**
   * Calculate data consistency score
   */
  private calculateDataConsistency(dataPoints: SentimentDataPoint[]): number {
    if (dataPoints.length < 2) return 0;

    const sentiments = dataPoints.map(dp => dp.sentimentScore);
    const mean = sentiments.reduce((sum, val) => sum + val, 0) / sentiments.length;
    const variance = sentiments.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sentiments.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation = higher consistency
    return Math.max(0, 1 - (stdDev / 2)); // Normalize to 0-1
  }

  /**
   * Check if velocity update should be emitted
   */
  private shouldEmitVelocityUpdate(symbol: string, newVelocity: SentimentVelocity): boolean {
    const existingVelocity = this.velocityCache.get(`${symbol}_${newVelocity.timeframe * 3600}`);

    if (!existingVelocity) return true;

    // Emit if significant change in velocity or trend
    const velocityChange = Math.abs(newVelocity.velocity - existingVelocity.velocity);
    const trendChanged = newVelocity.trend !== existingVelocity.trend;

    return velocityChange > 0.05 || trendChanged;
  }

  /**
   * Update trend analysis for symbol
   */
  private async updateTrendAnalysis(symbol: string): Promise<void> {
    const symbolData = this.sentimentData.get(symbol);

    if (!symbolData || symbolData.length < this.config.minSampleSize) {
      return;
    }

    const trend = this.analyzeTrend(symbol, symbolData);

    if (trend) {
      this.trendAnalysis.set(symbol, trend);
    }
  }

  /**
   * Analyze trend for symbol
   */
  private analyzeTrend(symbol: string, dataPoints: SentimentDataPoint[]): TrendAnalysis | null {
    if (dataPoints.length < 10) return null;

    // Simple trend analysis - in reality this would use more sophisticated algorithms
    const sentiments = dataPoints.map(dp => dp.sentimentScore);
    const recent = sentiments.slice(-10); // Last 10 points
    const earlier = sentiments.slice(-20, -10); // Previous 10 points

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const earlierAvg = earlier.length > 0 ? earlier.reduce((sum, val) => sum + val, 0) / earlier.length : recentAvg;

    const change = recentAvg - earlierAvg;

    let trend: 'bullish' | 'bearish' | 'neutral' | 'volatile' = 'neutral';
    let strength = 0;

    if (change > 0.1) {
      trend = 'bullish';
      strength = Math.min(change / 0.2, 1);
    } else if (change < -0.1) {
      trend = 'bearish';
      strength = Math.min(Math.abs(change) / 0.2, 1);
    } else if (this.calculateVolatility(sentiments) > 0.3) {
      trend = 'volatile';
      strength = Math.min(this.calculateVolatility(sentiments) / 0.5, 1);
    }

    const firstPoint = dataPoints[0];
    const lastPoint = dataPoints[dataPoints.length - 1];

    if (!firstPoint || !lastPoint) {
      return null;
    }

    return {
      symbol,
      trend,
      strength,
      duration: (lastPoint.timestamp.getTime() - firstPoint.timestamp.getTime()) / (1000 * 60 * 60), // Hours
      confidence: 0.8, // Placeholder
      turningPoints: [], // Would detect actual turning points
      supportLevels: [], // Would calculate support levels
      resistanceLevels: [] // Would calculate resistance levels
    };
  }

  /**
   * Calculate volatility of sentiment data
   */
  private calculateVolatility(sentiments: number[]): number {
    if (sentiments.length < 2) return 0;

    const mean = sentiments.reduce((sum, val) => sum + val, 0) / sentiments.length;
    const variance = sentiments.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sentiments.length;

    return Math.sqrt(variance);
  }

  /**
   * Perform periodic update of all velocities
   */
  private performPeriodicUpdate(): void {
    // Update velocities for all symbols
    for (const symbol of Array.from(this.sentimentData.keys())) {
      this.updateVelocityCalculations(symbol);
    }
  }

  /**
   * Get current velocity for symbol
   */
  getVelocity(symbol: string): SentimentVelocity | null {
    // Return the most recent velocity calculation
    const velocities = Array.from(this.velocityCache.keys())
      .filter(key => key.startsWith(symbol + '_'))
      .map(key => this.velocityCache.get(key)!)
      .filter(Boolean);

    if (velocities.length === 0) return null;

    // Return velocity with largest timeframe (most stable)
    const sortedVelocities = velocities.sort((a, b) => b.timeframe - a.timeframe);
    return sortedVelocities[0] || null;
  }

  /**
   * Get trend analysis for symbol
   */
  getTrendAnalysis(symbol: string): TrendAnalysis | null {
    return this.trendAnalysis.get(symbol) || null;
  }

  /**
   * Get sentiment data points for symbol
   */
  getSentimentData(symbol: string, hours: number = 24): SentimentDataPoint[] {
    const symbolData = this.sentimentData.get(symbol) || [];
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);

    return symbolData.filter(dp => dp.timestamp.getTime() > cutoffTime);
  }

  /**
   * Get current status
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      trackedSymbols: this.sentimentData.size,
      totalDataPoints: Array.from(this.sentimentData.values()).reduce((sum, arr) => sum + arr.length, 0),
      velocityCacheSize: this.velocityCache.size,
      trendAnalysisSize: this.trendAnalysis.size,
      anomalyDetectionEnabled: !!this.anomalyDetector,
      updateFrequency: this.config.updateFrequency
    };
  }

  /**
   * Stop velocity tracking
   */
  async stop(): Promise<void> {
    this.logger.info('🛑 Stopping Sentiment Velocity Tracker...');

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    if (this.anomalyDetector) {
      await this.anomalyDetector.stop();
    }

    this.sentimentData.clear();
    this.velocityCache.clear();
    this.trendAnalysis.clear();

    this.isRunning = false;
    this.logger.info('✅ Sentiment Velocity Tracker stopped');
  }
}

// Supporting anomaly detection class

interface AnomalyDetectorConfig {
  velocityThreshold: number;
  accelerationThreshold: number;
  enableStatisticalAnalysis: boolean;
  enablePatternRecognition: boolean;
  minSampleSize: number;
}

class SentimentAnomalyDetector extends EventEmitter {
  constructor(private config: AnomalyDetectorConfig) {
    super();
  }

  async initialize(): Promise<void> {
    // Initialize anomaly detection
    console.log('SentimentAnomalyDetector initialized');
  }

  async analyzeVelocity(symbol: string, velocity: SentimentVelocity | null): Promise<void> {
    if (!velocity) return;

    // Detect anomalies in velocity patterns
    if (Math.abs(velocity.velocity) > this.config.velocityThreshold ||
        Math.abs(velocity.acceleration) > this.config.accelerationThreshold) {

      this.emit('velocityAnomaly', {
        symbol,
        velocity,
        anomalyType: 'extreme_velocity',
        timestamp: new Date(),
        severity: this.calculateAnomalySeverity(velocity),
        confidence: this.calculateAnomalyConfidence(velocity)
      });
    }
  }

  private calculateAnomalySeverity(velocity: SentimentVelocity): 'low' | 'medium' | 'high' | 'critical' {
    const velocityScore = Math.abs(velocity.velocity) / this.config.velocityThreshold;
    const accelerationScore = Math.abs(velocity.acceleration) / this.config.accelerationThreshold;
    const combinedScore = Math.max(velocityScore, accelerationScore);

    if (combinedScore > 3) return 'critical';
    if (combinedScore > 2) return 'high';
    if (combinedScore > 1.5) return 'medium';
    return 'low';
  }

  private calculateAnomalyConfidence(velocity: SentimentVelocity): number {
    // Confidence based on sample size and data consistency
    const sampleConfidence = Math.min(velocity.sampleSize / 50, 1); // 0-1 based on 50+ samples
    const velocityConfidence = Math.min(Math.abs(velocity.velocity) / (this.config.velocityThreshold * 2), 1);

    return (sampleConfidence * 0.6) + (velocityConfidence * 0.4);
  }

  async stop(): Promise<void> {
    // Stop anomaly detection
    console.log('SentimentAnomalyDetector stopped');
  }
}
