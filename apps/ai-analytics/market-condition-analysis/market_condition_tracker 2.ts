/**
 * =========================================
 * MARKET CONDITION TRACKING SERVICE
 * =========================================
 * Divine world-class market condition monitoring system
 * Tracks volatility indices, macroeconomic events, liquidity metrics, and trading volumes
 * Provides real-time market regime detection and correlation analysis
 */

import { EventEmitter } from 'events';
import { Logger } from '../../../services/signal-evaluation-engine/src/utils/Logger';
import { MetricsCollector } from '../../../services/signal-evaluation-engine/src/monitoring/MetricsCollector';
import { Pool } from 'pg';

export interface MarketCondition {
  timestamp: Date;
  regime: MarketRegime;
  volatility: {
    vix: number; // VIX index
    realizedVolatility: number; // 30-day realized volatility
    intradayVolatility: number; // Intraday volatility
    impliedVolatility: number; // Options implied volatility
  };
  macroeconomic: {
    interestRates: number; // Federal funds rate or equivalent
    inflation: number; // CPI or inflation rate
    unemployment: number; // Unemployment rate
    gdpGrowth: number; // GDP growth rate
  };
  liquidity: {
    bidAskSpread: number; // Average bid-ask spread
    marketDepth: number; // Market depth score
    orderBookImbalance: number; // Order book imbalance ratio
    fundingRates: number; // Funding rates for perpetuals
  };
  volume: {
    totalVolume24h: number; // 24h total volume
    volumeProfile: number; // Volume concentration score
    largeTrades: number; // Number of large trades (> $100k)
    institutionalFlow: number; // Institutional trading activity
  };
  sentiment: {
    fearGreedIndex: number; // Fear & Greed index (0-100)
    socialSentiment: number; // Social media sentiment score
    newsSentiment: number; // News sentiment score
    whaleActivity: number; // Large holder activity
  };
  metadata: {
    source: string;
    confidence: number;
    lastUpdated: Date;
  };
}

export type MarketRegime = 'bull' | 'bear' | 'sideways' | 'volatile' | 'stable' | 'crash' | 'recovery';

export interface MarketConditionConfig {
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  tracking: {
    updateInterval: number; // milliseconds
    dataRetentionDays: number;
    enableRealTimeUpdates: boolean;
    enableHistoricalBackfill: boolean;
  };
  dataSources: {
    volatility: string[]; // API endpoints or data sources
    macroeconomic: string[];
    liquidity: string[];
    volume: string[];
    sentiment: string[];
  };
  regimeDetection: {
    lookbackWindow: number; // days
    confidenceThreshold: number;
    minDataPoints: number;
    regimeStabilityThreshold: number;
  };
}

export class MarketConditionTracker extends EventEmitter {
  private logger: Logger;
  private metrics: MetricsCollector;
  private db: Pool;
  private config: MarketConditionConfig;
  private isInitialized: boolean = false;
  private updateInterval?: NodeJS.Timeout;

  // Market condition data cache
  private currentConditions: MarketCondition | null = null;
  private historicalConditions: Map<string, MarketCondition[]> = new Map();

  // Data source managers
  private volatilityTracker: ExternalDataTracker;
  private macroeconomicTracker: ExternalDataTracker;
  private liquidityTracker: ExternalDataTracker;
  private volumeTracker: ExternalDataTracker;
  private sentimentTracker: ExternalDataTracker;

  constructor(config: MarketConditionConfig) {
    super();
    this.logger = new Logger('MarketConditionTracker');
    this.metrics = new MetricsCollector();
    this.config = config;
    this.db = new Pool(config.database);

    // Initialize data trackers
    this.volatilityTracker = new ExternalDataTracker(config.dataSources.volatility);
    this.macroeconomicTracker = new ExternalDataTracker(config.dataSources.macroeconomic);
    this.liquidityTracker = new ExternalDataTracker(config.dataSources.liquidity);
    this.volumeTracker = new ExternalDataTracker(config.dataSources.volume);
    this.sentimentTracker = new ExternalDataTracker(config.dataSources.sentiment);

    this.initializeDatabase();
  }

  /**
   * Initialize database tables for market condition storage
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS market_conditions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
          regime VARCHAR(20) NOT NULL,
          volatility_data JSONB NOT NULL,
          macroeconomic_data JSONB NOT NULL,
          liquidity_data JSONB NOT NULL,
          volume_data JSONB NOT NULL,
          sentiment_data JSONB NOT NULL,
          metadata JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_market_conditions_timestamp ON market_conditions(timestamp);
        CREATE INDEX IF NOT EXISTS idx_market_conditions_regime ON market_conditions(regime);
        CREATE INDEX IF NOT EXISTS idx_market_conditions_created_at ON market_conditions(created_at);
      `);

      // Create market regime transitions table for analysis
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS market_regime_transitions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          from_regime VARCHAR(20) NOT NULL,
          to_regime VARCHAR(20) NOT NULL,
          transition_time TIMESTAMP WITH TIME ZONE NOT NULL,
          duration_minutes INTEGER NOT NULL,
          trigger_conditions JSONB,
          confidence DECIMAL(5,4) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_regime_transitions_time ON market_regime_transitions(transition_time);
        CREATE INDEX IF NOT EXISTS idx_regime_transitions_from_to ON market_regime_transitions(from_regime, to_regime);
      `);

      this.isInitialized = true;
      this.logger.info('✅ Market condition tracker database initialized');
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize market condition database', error);
      throw error;
    }
  }

  /**
   * Start market condition tracking
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Market condition tracker not initialized');
    }

    try {
      this.logger.info('Starting market condition tracking...');

      // Start periodic updates
      this.updateInterval = setInterval(async () => {
        try {
          await this.updateMarketConditions();
        } catch (error: any) {
          this.logger.error('Error updating market conditions', error);
        }
      }, this.config.tracking.updateInterval);

      // Perform initial update
      await this.updateMarketConditions();

      // Enable historical backfill if configured
      if (this.config.tracking.enableHistoricalBackfill) {
        this.performHistoricalBackfill();
      }

      this.logger.info('✅ Market condition tracking started');
      this.emit('started');
    } catch (error: any) {
      this.logger.error('❌ Failed to start market condition tracking', error);
      throw error;
    }
  }

  /**
   * Stop market condition tracking
   */
  async stop(): Promise<void> {
    try {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = undefined;
      }

      await this.db.end();
      this.isInitialized = false;

      this.logger.info('✅ Market condition tracking stopped');
      this.emit('stopped');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop market condition tracking', error);
      throw error;
    }
  }

  /**
   * Update current market conditions
   */
  private async updateMarketConditions(): Promise<void> {
    try {
      const timestamp = new Date();

      // Collect data from all sources
      const [volatilityData, macroeconomicData, liquidityData, volumeData, sentimentData] = await Promise.all([
        this.volatilityTracker.getCurrentData(),
        this.macroeconomicTracker.getCurrentData(),
        this.liquidityTracker.getCurrentData(),
        this.volumeTracker.getCurrentData(),
        this.sentimentTracker.getCurrentData()
      ]);

      // Detect current market regime
      const regime = await this.detectMarketRegime(volatilityData, macroeconomicData, liquidityData, volumeData, sentimentData);

      // Create market condition object
      const conditions: MarketCondition = {
        timestamp,
        regime,
        volatility: volatilityData,
        macroeconomic: macroeconomicData,
        liquidity: liquidityData,
        volume: volumeData,
        sentiment: sentimentData,
        metadata: {
          source: 'market_condition_tracker',
          confidence: this.calculateOverallConfidence(volatilityData, macroeconomicData, liquidityData, volumeData, sentimentData),
          lastUpdated: timestamp
        }
      };

      // Store in database
      await this.storeMarketConditions(conditions);

      // Update current conditions
      this.currentConditions = conditions;

      // Cache historical data
      this.cacheHistoricalConditions(conditions);

      // Emit update event
      this.emit('conditionsUpdated', conditions);

      this.logger.debug('Market conditions updated', {
        regime,
        timestamp: timestamp.toISOString(),
        confidence: conditions.metadata.confidence
      });

      // Update metrics
      this.metrics.recordMetric('market_conditions_updated', 1);
    } catch (error: any) {
      this.logger.error('Failed to update market conditions', error);
      this.metrics.recordMetric('market_conditions_update_errors', 1);
    }
  }

  /**
   * Detect current market regime based on multiple indicators
   */
  private async detectMarketRegime(
    volatility: any,
    macroeconomic: any,
    liquidity: any,
    volume: any,
    sentiment: any
  ): Promise<MarketRegime> {
    try {
      // Get historical data for regime detection
      const historicalData = await this.getHistoricalConditions(this.config.regimeDetection.lookbackWindow);

      if (historicalData.length < this.config.regimeDetection.minDataPoints) {
        return 'sideways'; // Default when insufficient data
      }

      // Calculate regime indicators
      const indicators = this.calculateRegimeIndicators(volatility, macroeconomic, liquidity, volume, sentiment, historicalData);

      // Apply regime detection logic
      return this.classifyMarketRegime(indicators);
    } catch (error: any) {
      this.logger.error('Failed to detect market regime', error);
      return 'sideways';
    }
  }

  /**
   * Calculate regime indicators from market data
   */
  private calculateRegimeIndicators(
    volatility: any,
    macroeconomic: any,
    liquidity: any,
    volume: any,
    sentiment: any,
    historicalData: MarketCondition[]
  ): any {
    // Calculate trend indicators
    const priceTrend = this.calculateTrendIndicator(historicalData.map(d => d.volatility.vix));
    const volumeTrend = this.calculateTrendIndicator(historicalData.map(d => d.volume.totalVolume24h));

    // Calculate volatility indicators
    const volatilityLevel = this.normalizeVolatility(volatility.vix, historicalData.map(d => d.volatility.vix));
    const volumeSpike = this.detectVolumeSpike(volume.totalVolume24h, historicalData.map(d => d.volume.totalVolume24h));

    // Calculate sentiment indicators
    const fearLevel = this.calculateFearLevel(sentiment.fearGreedIndex, sentiment.socialSentiment, sentiment.newsSentiment);

    // Calculate macroeconomic stress indicators
    const macroStress = this.calculateMacroStress(macroeconomic.inflation, macroeconomic.unemployment, macroeconomic.gdpGrowth);

    // Calculate liquidity stress indicators
    const liquidityStress = this.calculateLiquidityStress(liquidity.bidAskSpread, liquidity.marketDepth, liquidity.orderBookImbalance);

    return {
      priceTrend,
      volumeTrend,
      volatilityLevel,
      volumeSpike,
      fearLevel,
      macroStress,
      liquidityStress,
      recentRegime: historicalData.length > 0 ? historicalData[historicalData.length - 1].regime : 'sideways'
    };
  }

  /**
   * Classify market regime based on indicators
   */
  private classifyMarketRegime(indicators: any): MarketRegime {
    const {
      priceTrend,
      volumeTrend,
      volatilityLevel,
      volumeSpike,
      fearLevel,
      macroStress,
      liquidityStress,
      recentRegime
    } = indicators;

    // Bull market conditions
    if (priceTrend > 0.3 && volumeTrend > 0.2 && volatilityLevel < 0.6 && fearLevel < 0.4 && macroStress < 0.5 && liquidityStress < 0.5) {
      return 'bull';
    }

    // Bear market conditions
    if (priceTrend < -0.3 && volumeTrend > 0.2 && volatilityLevel > 0.7 && fearLevel > 0.6 && macroStress > 0.6) {
      return 'bear';
    }

    // Volatile market conditions
    if (volatilityLevel > 0.8 || volumeSpike > 0.7 || liquidityStress > 0.7) {
      return 'volatile';
    }

    // Crash conditions (extreme bear)
    if (priceTrend < -0.5 && volumeTrend > 0.5 && volatilityLevel > 0.9 && fearLevel > 0.8 && macroStress > 0.7) {
      return 'crash';
    }

    // Recovery conditions (improving from crash)
    if (recentRegime === 'crash' && priceTrend > 0.1 && volumeTrend > 0.1 && fearLevel < 0.6) {
      return 'recovery';
    }

    // Stable conditions (low volatility, balanced metrics)
    if (volatilityLevel < 0.4 && Math.abs(priceTrend) < 0.2 && fearLevel < 0.5 && macroStress < 0.4 && liquidityStress < 0.4) {
      return 'stable';
    }

    // Default to sideways
    return 'sideways';
  }

  /**
   * Calculate trend indicator using linear regression
   */
  private calculateTrendIndicator(values: number[]): number {
    if (values.length < 3) return 0;

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    // Linear regression: y = mx + b
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);

    const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const b = (sumY - m * sumX) / n;

    // Normalize to [-1, 1] range (trend strength and direction)
    const trend = m * (n - 1); // Scale by length
    return Math.max(-1, Math.min(1, trend));
  }

  /**
   * Normalize volatility to [0, 1] range
   */
  private normalizeVolatility(current: number, historical: number[]): number {
    if (historical.length === 0) return 0.5;

    const min = Math.min(...historical);
    const max = Math.max(...historical);

    if (max === min) return 0.5;

    return (current - min) / (max - min);
  }

  /**
   * Detect volume spike
   */
  private detectVolumeSpike(current: number, historical: number[]): number {
    if (historical.length === 0) return 0;

    const mean = historical.reduce((a, b) => a + b, 0) / historical.length;
    const std = Math.sqrt(historical.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / historical.length);

    if (std === 0) return 0;

    // Z-score of current volume
    const zScore = (current - mean) / std;

    // Convert to [0, 1] range (0 = normal, 1 = extreme spike)
    return Math.max(0, Math.min(1, (zScore - 1) / 3)); // Threshold at 1 std dev
  }

  /**
   * Calculate fear level composite indicator
   */
  private calculateFearLevel(fearGreedIndex: number, socialSentiment: number, newsSentiment: number): number {
    // Normalize fear & greed index to [0, 1] (0 = extreme fear, 1 = extreme greed)
    const normalizedFearGreed = fearGreedIndex / 100;

    // Invert sentiment scores (negative sentiment = fear)
    const normalizedSocial = (socialSentiment + 1) / 2; // Convert [-1, 1] to [0, 1]
    const normalizedNews = (newsSentiment + 1) / 2;

    // Weighted average (fear & greed has highest weight)
    return (normalizedFearGreed * 0.5 + normalizedSocial * 0.25 + normalizedNews * 0.25);
  }

  /**
   * Calculate macroeconomic stress indicator
   */
  private calculateMacroStress(inflation: number, unemployment: number, gdpGrowth: number): number {
    // Normalize inflation (higher inflation = more stress)
    const normalizedInflation = Math.max(0, Math.min(1, inflation / 0.1)); // 10% threshold

    // Normalize unemployment (higher unemployment = more stress)
    const normalizedUnemployment = Math.max(0, Math.min(1, unemployment / 0.15)); // 15% threshold

    // Normalize GDP growth (negative growth = stress)
    const normalizedGDP = Math.max(0, Math.min(1, (gdpGrowth + 0.05) / 0.1)); // -5% to +5% range

    // Weighted average
    return (normalizedInflation * 0.4 + normalizedUnemployment * 0.4 + (1 - normalizedGDP) * 0.2);
  }

  /**
   * Calculate liquidity stress indicator
   */
  private calculateLiquidityStress(bidAskSpread: number, marketDepth: number, orderBookImbalance: number): number {
    // Normalize bid-ask spread (higher spread = more stress)
    const normalizedSpread = Math.max(0, Math.min(1, bidAskSpread / 0.01)); // 1% threshold

    // Normalize market depth (lower depth = more stress)
    const normalizedDepth = Math.max(0, Math.min(1, (1 - marketDepth) / 0.8)); // 80% depth threshold

    // Normalize order book imbalance (extreme imbalance = stress)
    const normalizedImbalance = Math.abs(orderBookImbalance);

    // Weighted average
    return (normalizedSpread * 0.4 + normalizedDepth * 0.3 + normalizedImbalance * 0.3);
  }

  /**
   * Calculate overall confidence in market conditions
   */
  private calculateOverallConfidence(
    volatility: any,
    macroeconomic: any,
    liquidity: any,
    volume: any,
    sentiment: any
  ): number {
    // Individual data source confidences
    const volatilityConfidence = volatility.confidence || 0.8;
    const macroeconomicConfidence = macroeconomic.confidence || 0.7;
    const liquidityConfidence = liquidity.confidence || 0.9;
    const volumeConfidence = volume.confidence || 0.9;
    const sentimentConfidence = sentiment.confidence || 0.6;

    // Weighted average based on reliability
    return (
      volatilityConfidence * 0.25 +
      macroeconomicConfidence * 0.15 +
      liquidityConfidence * 0.25 +
      volumeConfidence * 0.25 +
      sentimentConfidence * 0.1
    );
  }

  /**
   * Store market conditions in database
   */
  private async storeMarketConditions(conditions: MarketCondition): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO market_conditions (
          timestamp, regime, volatility_data, macroeconomic_data,
          liquidity_data, volume_data, sentiment_data, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        conditions.timestamp,
        conditions.regime,
        JSON.stringify(conditions.volatility),
        JSON.stringify(conditions.macroeconomic),
        JSON.stringify(conditions.liquidity),
        JSON.stringify(conditions.volume),
        JSON.stringify(conditions.sentiment),
        JSON.stringify(conditions.metadata)
      ]);
    } catch (error: any) {
      this.logger.error('Failed to store market conditions', error);
    }
  }

  /**
   * Get historical market conditions
   */
  private async getHistoricalConditions(days: number): Promise<MarketCondition[]> {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { rows } = await this.db.query(`
        SELECT * FROM market_conditions
        WHERE timestamp >= $1
        ORDER BY timestamp DESC
      `, [cutoffDate]);

      return rows.map(row => ({
        timestamp: row.timestamp,
        regime: row.regime,
        volatility: row.volatility_data,
        macroeconomic: row.macroeconomic_data,
        liquidity: row.liquidity_data,
        volume: row.volume_data,
        sentiment: row.sentiment_data,
        metadata: row.metadata
      }));
    } catch (error: any) {
      this.logger.error('Failed to get historical conditions', error);
      return [];
    }
  }

  /**
   * Cache historical conditions for quick access
   */
  private cacheHistoricalConditions(conditions: MarketCondition): void {
    const dateKey = conditions.timestamp.toISOString().split('T')[0];

    if (!this.historicalConditions.has(dateKey)) {
      this.historicalConditions.set(dateKey, []);
    }

    const dayConditions = this.historicalConditions.get(dateKey)!;
    dayConditions.push(conditions);

    // Keep only recent data in memory
    if (dayConditions.length > 100) {
      dayConditions.splice(0, dayConditions.length - 100);
    }
  }

  /**
   * Perform historical backfill for missing data
   */
  private async performHistoricalBackfill(): Promise<void> {
    try {
      this.logger.info('Starting historical market data backfill...');

      // This would typically fetch historical data from APIs
      // For now, we'll simulate with placeholder logic

      this.logger.info('Historical backfill completed');
    } catch (error: any) {
      this.logger.error('Failed to perform historical backfill', error);
    }
  }

  /**
   * Get current market conditions
   */
  getCurrentConditions(): MarketCondition | null {
    return this.currentConditions;
  }

  /**
   * Get market conditions for a specific time range
   */
  async getConditionsForTimeRange(start: Date, end: Date): Promise<MarketCondition[]> {
    try {
      const { rows } = await this.db.query(`
        SELECT * FROM market_conditions
        WHERE timestamp BETWEEN $1 AND $2
        ORDER BY timestamp ASC
      `, [start, end]);

      return rows.map(row => ({
        timestamp: row.timestamp,
        regime: row.regime,
        volatility: row.volatility_data,
        macroeconomic: row.macroeconomic_data,
        liquidity: row.liquidity_data,
        volume: row.volume_data,
        sentiment: row.sentiment_data,
        metadata: row.metadata
      }));
    } catch (error: any) {
      this.logger.error('Failed to get conditions for time range', error);
      return [];
    }
  }

  /**
   * Get market regime distribution for a time period
   */
  async getRegimeDistribution(start: Date, end: Date): Promise<Record<MarketRegime, number>> {
    try {
      const { rows } = await this.db.query(`
        SELECT regime, COUNT(*) as count
        FROM market_conditions
        WHERE timestamp BETWEEN $1 AND $2
        GROUP BY regime
      `, [start, end]);

      const distribution: Record<MarketRegime, number> = {
        bull: 0,
        bear: 0,
        sideways: 0,
        volatile: 0,
        stable: 0,
        crash: 0,
        recovery: 0
      };

      for (const row of rows) {
        distribution[row.regime as MarketRegime] = parseInt(row.count);
      }

      return distribution;
    } catch (error: any) {
      this.logger.error('Failed to get regime distribution', error);
      return {
        bull: 0,
        bear: 0,
        sideways: 0,
        volatile: 0,
        stable: 0,
        crash: 0,
        recovery: 0
      };
    }
  }

  /**
   * Get system health status
   */
  getHealthStatus(): {
    initialized: boolean;
    lastUpdate: Date | null;
    dataSources: Record<string, boolean>;
    errorCount: number;
  } {
    return {
      initialized: this.isInitialized,
      lastUpdate: this.currentConditions?.timestamp || null,
      dataSources: {
        volatility: this.volatilityTracker.isHealthy(),
        macroeconomic: this.macroeconomicTracker.isHealthy(),
        liquidity: this.liquidityTracker.isHealthy(),
        volume: this.volumeTracker.isHealthy(),
        sentiment: this.sentimentTracker.isHealthy()
      },
      errorCount: this.metrics.getMetric('market_conditions_update_errors') || 0
    };
  }
}

/**
 * External data tracker for fetching market data from APIs
 */
class ExternalDataTracker {
  private dataSources: string[];
  private lastFetch: Date = new Date(0);
  private cachedData: any = null;
  private isHealthyFlag: boolean = true;

  constructor(dataSources: string[]) {
    this.dataSources = dataSources;
  }

  /**
   * Get current data from external sources
   */
  async getCurrentData(): Promise<any> {
    try {
      // In production, this would fetch from actual APIs
      // For now, return mock data with proper structure

      const mockData = {
        vix: 18.5,
        realizedVolatility: 0.25,
        intradayVolatility: 0.15,
        impliedVolatility: 0.22,
        confidence: 0.9
      };

      this.cachedData = mockData;
      this.lastFetch = new Date();
      this.isHealthyFlag = true;

      return mockData;
    } catch (error: any) {
      this.isHealthyFlag = false;
      throw error;
    }
  }

  /**
   * Check if data source is healthy
   */
  isHealthy(): boolean {
    return this.isHealthyFlag && (Date.now() - this.lastFetch.getTime()) < 300000; // 5 minutes
  }
}
