import { NewsItem } from "../../types/news";
import { MarketDataService } from "../marketData";
import fs from "fs";
import path from "path";

/**
 * Market context data for more accurate correlation analysis
 */
interface MarketContext {
  timestamp: string;
  overall_sentiment: "bullish" | "bearish" | "neutral";
  volatility_index: number;
  market_trend: "uptrend" | "downtrend" | "sideways";
  trading_volume: "high" | "medium" | "low";
  market_fear_index?: number;
  bitcoin_dominance?: number;
  total_market_cap?: number;
  sector_performance?: {
    // Added sector performance tracking
    [sector: string]: number; // % change over last 24 hours
  };
  liquidity_metrics?: {
    // Added liquidity metrics
    overall_liquidity: number;
    bid_ask_spread_avg: number;
  };
  global_economic_indicators?: {
    // Added economic indicators
    stock_market_correlation: number;
    interest_rate_impact: number;
    forex_volatility: number;
  };
}

/**
 * News event with associated price data for correlation analysis
 */
interface NewsCorrelationEvent {
  news_id: string;
  timestamp: string;
  title: string;
  category: string;
  subcategories: string[];
  impact_score: number;
  sentiment: "bullish" | "bearish" | "neutral";
  affected_assets: string[];
  price_data: {
    [asset: string]: {
      pre_news: number;
      post_1h: number;
      post_4h: number;
      post_24h: number;
      post_7d: number;
      percent_change_1h: number;
      percent_change_4h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      volume_change_percent: number;
    };
  };
  correlation_score: number;
  accuracy_score: number;
  market_context?: MarketContext;
  weighted_correlation?: number; // Adjusted correlation based on market context
  confidence_interval?: {
    // Statistical confidence interval
    lower: number;
    upper: number;
  };
  statistical_significance?: number; // p-value or similar measure
}

/**
 * Category correlation stats
 */
interface CategoryCorrelation {
  category: string;
  count: number;
  avg_correlation: number;
  avg_price_impact: {
    [timeframe: string]: number;
  };
  top_assets: {
    [asset: string]: {
      count: number;
      avg_impact: number;
    };
  };
  market_condition_impact?: {
    // How different market conditions affect correlations
    bull_market_multiplier: number;
    bear_market_multiplier: number;
    high_volatility_impact: number;
    low_volatility_impact: number;
  };
  statistical_significance?: number; // Overall significance of this category's correlations
  seasonality_factors?: {
    // Seasonal patterns in correlations
    day_of_week: number[];
    month: number[];
    market_hours: number;
  };
}

/**
 * Result of impact prediction
 */
export interface NewsImpactPrediction {
  overall_prediction: {
    direction: "up" | "down" | "neutral";
    confidence: number;
    expected_magnitude: number;
    timeframe: "1h" | "4h" | "24h" | "7d";
  };
  asset_predictions: {
    [asset: string]: {
      direction: "up" | "down" | "neutral";
      confidence: number;
      expected_magnitude: number;
      timeframe: "1h" | "4h" | "24h" | "7d";
      historical_accuracy: number;
    };
  };
  similar_events: Array<{
    news_id: string;
    title: string;
    similarity_score: number;
    actual_impact: {
      [asset: string]: {
        percent_change: number;
        timeframe: string;
      };
    };
  }>;
}

/**
 * NewsCorrelationService - Tracks and analyzes correlations between news events and price movements
 */
export class NewsCorrelationService {
  private static instance: NewsCorrelationService;
  private marketDataService: MarketDataService;
  private storagePath: string;
  private eventData: NewsCorrelationEvent[] = [];
  private categoryStats: Map<string, CategoryCorrelation> = new Map();
  private assetCategoryImpact: Map<string, Map<string, number[]>> = new Map();

  // Statistical parameters
  private confidenceLevel: number = 0.95; // 95% confidence interval
  private significanceThreshold: number = 0.05; // p-value threshold
  private minimumSampleSize: number = 10; // Minimum sample size for reliable statistics
  private outlierDetectionEnabled: boolean = true; // Flag for outlier detection
  private seasonalityAnalysisEnabled: boolean = true; // Flag for seasonality analysis

  // Market context cache
  private marketContextCache: Map<string, MarketContext> = new Map();

  private constructor() {
    this.marketDataService = new MarketDataService();
    this.storagePath = path.join(process.cwd(), "data", "news-correlation");

    // Ensure directory exists
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }

    // Load historical data
    this.loadData();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): NewsCorrelationService {
    if (!NewsCorrelationService.instance) {
      NewsCorrelationService.instance = new NewsCorrelationService();
    }
    return NewsCorrelationService.instance;
  }

  /**
   * Load historical correlation data from storage
   */
  private loadData(): void {
    try {
      const dataPath = path.join(this.storagePath, "correlation-events.json");
      if (fs.existsSync(dataPath)) {
        const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
        this.eventData = data;
        console.log(`Loaded ${this.eventData.length} news correlation events`);

        // Calculate category statistics
        this.calculateCategoryStatistics();
      }
    } catch (error) {
      console.error("Error loading news correlation data:", error);
    }
  }

  /**
   * Save correlation data to storage
   */
  private saveData(): void {
    try {
      const dataPath = path.join(this.storagePath, "correlation-events.json");
      fs.writeFileSync(
        dataPath,
        JSON.stringify(this.eventData, null, 2),
        "utf-8",
      );
    } catch (error) {
      console.error("Error saving news correlation data:", error);
    }
  }

  /**
   * Calculate statistics for each news category with advanced metrics
   */
  private calculateCategoryStatistics(): void {
    this.categoryStats.clear();
    this.assetCategoryImpact.clear();

    // Group events by market condition for advanced analysis
    const bullMarketEvents: NewsCorrelationEvent[] = [];
    const bearMarketEvents: NewsCorrelationEvent[] = [];
    const highVolatilityEvents: NewsCorrelationEvent[] = [];
    const lowVolatilityEvents: NewsCorrelationEvent[] = [];

    // Additional groupings for more nuanced analysis
    const liquidityGroups: { [key: string]: NewsCorrelationEvent[] } = {
      high: [],
      medium: [],
      low: [],
    };

    const timeOfDayGroups: { [key: string]: NewsCorrelationEvent[] } = {
      asianSession: [],
      europeanSession: [],
      americanSession: [],
    };

    // Organize events by market context
    for (const event of this.eventData) {
      // Skip events without market context
      if (!event.market_context) continue;

      // Group by market trend
      if (event.market_context.market_trend === "uptrend") {
        bullMarketEvents.push(event);
      } else if (event.market_context.market_trend === "downtrend") {
        bearMarketEvents.push(event);
      }

      // Group by volatility
      if (event.market_context.volatility_index > 0.6) {
        highVolatilityEvents.push(event);
      } else if (event.market_context.volatility_index < 0.3) {
        lowVolatilityEvents.push(event);
      }

      // Group by liquidity if available
      if (event.market_context.liquidity_metrics) {
        const liquidity =
          event.market_context.liquidity_metrics.overall_liquidity;
        if (liquidity > 0.7) {
          liquidityGroups.high.push(event);
        } else if (liquidity > 0.3) {
          liquidityGroups.medium.push(event);
        } else {
          liquidityGroups.low.push(event);
        }
      }

      // Group by time of day (market session)
      const eventHour = new Date(event.timestamp).getUTCHours();
      if (eventHour >= 0 && eventHour < 8) {
        timeOfDayGroups.asianSession.push(event);
      } else if (eventHour >= 8 && eventHour < 16) {
        timeOfDayGroups.europeanSession.push(event);
      } else {
        timeOfDayGroups.americanSession.push(event);
      }
    }

    // Process each event
    this.eventData.forEach((event) => {
      // Update category stats
      if (!this.categoryStats.has(event.category)) {
        this.categoryStats.set(event.category, {
          category: event.category,
          count: 0,
          avg_correlation: 0,
          avg_price_impact: {
            "1h": 0,
            "4h": 0,
            "24h": 0,
            "7d": 0,
          },
          top_assets: {},
          market_condition_impact: {
            bull_market_multiplier: 1.0,
            bear_market_multiplier: 1.0,
            high_volatility_impact: 1.0,
            low_volatility_impact: 1.0,
          },
          statistical_significance: 0.5, // Default value
          seasonality_factors: {
            day_of_week: Array(7).fill(1.0),
            month: Array(12).fill(1.0),
            market_hours: 1.0,
          },
        });
      }

      const categoryData = this.categoryStats.get(event.category)!;
      categoryData.count++;

      // Use weighted correlation if available, otherwise use basic correlation score
      const correlationScore =
        event.weighted_correlation !== undefined
          ? event.weighted_correlation
          : event.correlation_score;

      categoryData.avg_correlation =
        (categoryData.avg_correlation * (categoryData.count - 1) +
          correlationScore) /
        categoryData.count;

      // Process asset impacts for this category with enhanced metrics
      Object.entries(event.price_data).forEach(([asset, data]) => {
        // Update per-category top assets
        if (!categoryData.top_assets[asset]) {
          categoryData.top_assets[asset] = {
            count: 0,
            avg_impact: 0,
          };
        }
        categoryData.top_assets[asset].count++;
        categoryData.top_assets[asset].avg_impact =
          (categoryData.top_assets[asset].avg_impact *
            (categoryData.top_assets[asset].count - 1) +
            data.percent_change_24h) /
          categoryData.top_assets[asset].count;

        // Update category price impacts
        categoryData.avg_price_impact["1h"] +=
          data.percent_change_1h / categoryData.count;
        categoryData.avg_price_impact["4h"] +=
          data.percent_change_4h / categoryData.count;
        categoryData.avg_price_impact["24h"] +=
          data.percent_change_24h / categoryData.count;
        categoryData.avg_price_impact["7d"] +=
          data.percent_change_7d / categoryData.count;

        // Update asset-category map
        if (!this.assetCategoryImpact.has(asset)) {
          this.assetCategoryImpact.set(asset, new Map());
        }
        if (!this.assetCategoryImpact.get(asset)!.has(event.category)) {
          this.assetCategoryImpact.get(asset)!.set(event.category, []);
        }
        this.assetCategoryImpact
          .get(asset)!
          .get(event.category)!
          .push(data.percent_change_24h);
      });

      this.categoryStats.set(event.category, categoryData);
    });

    // Second pass - calculate market condition multipliers
    this.categoryStats.forEach((categoryData, category) => {
      if (categoryData.count > 5) {
        // Only if we have enough data
        // Calculate bull market multiplier
        const bullMarketCategory = bullMarketEvents.filter(
          (e) => e.category === category,
        );
        if (bullMarketCategory.length > 0) {
          const bullAvgCorrelation =
            bullMarketCategory.reduce(
              (sum, e) => sum + e.correlation_score,
              0,
            ) / bullMarketCategory.length;
          categoryData.market_condition_impact!.bull_market_multiplier =
            categoryData.avg_correlation !== 0
              ? bullAvgCorrelation / categoryData.avg_correlation
              : 1.0;
        }

        // Calculate bear market multiplier
        const bearMarketCategory = bearMarketEvents.filter(
          (e) => e.category === category,
        );
        if (bearMarketCategory.length > 0) {
          const bearAvgCorrelation =
            bearMarketCategory.reduce(
              (sum, e) => sum + e.correlation_score,
              0,
            ) / bearMarketCategory.length;
          categoryData.market_condition_impact!.bear_market_multiplier =
            categoryData.avg_correlation !== 0
              ? bearAvgCorrelation / categoryData.avg_correlation
              : 1.0;
        }

        // Calculate volatility impacts
        const highVolatilityCategory = highVolatilityEvents.filter(
          (e) => e.category === category,
        );
        if (highVolatilityCategory.length > 0) {
          const highVolCorrelation =
            highVolatilityCategory.reduce(
              (sum, e) => sum + e.correlation_score,
              0,
            ) / highVolatilityCategory.length;
          categoryData.market_condition_impact!.high_volatility_impact =
            categoryData.avg_correlation !== 0
              ? highVolCorrelation / categoryData.avg_correlation
              : 1.0;
        }

        const lowVolatilityCategory = lowVolatilityEvents.filter(
          (e) => e.category === category,
        );
        if (lowVolatilityCategory.length > 0) {
          const lowVolCorrelation =
            lowVolatilityCategory.reduce(
              (sum, e) => sum + e.correlation_score,
              0,
            ) / lowVolatilityCategory.length;
          categoryData.market_condition_impact!.low_volatility_impact =
            categoryData.avg_correlation !== 0
              ? lowVolCorrelation / categoryData.avg_correlation
              : 1.0;
        }

        // Calculate statistical significance based on sample size and correlation strength
        categoryData.statistical_significance =
          this.calculateStatisticalSignificance(
            categoryData.avg_correlation,
            categoryData.count,
          );

        // Calculate day of week seasonality
        const dayOfWeekCounts = Array(7).fill(0);
        const dayOfWeekCorrelations = Array(7).fill(0);

        this.eventData
          .filter((e) => e.category === category)
          .forEach((event) => {
            const date = new Date(event.timestamp);
            const dayOfWeek = date.getDay();
            dayOfWeekCounts[dayOfWeek]++;
            dayOfWeekCorrelations[dayOfWeek] += event.correlation_score;
          });

        for (let i = 0; i < 7; i++) {
          if (dayOfWeekCounts[i] > 0) {
            const avgCorrelation =
              dayOfWeekCorrelations[i] / dayOfWeekCounts[i];
            categoryData.seasonality_factors!.day_of_week[i] =
              categoryData.avg_correlation !== 0
                ? avgCorrelation / categoryData.avg_correlation
                : 1.0;
          }
        }

        // Update the category data
        this.categoryStats.set(category, categoryData);
      }
    });
  }

  /**
   * Track a news item and its market impact over time with enhanced market context
   */
  public async trackNewsEvent(
    newsItem: NewsItem,
  ): Promise<NewsCorrelationEvent> {
    const timestamp = new Date(newsItem.published_at).getTime();

    // Get current market context
    const marketContext = await this.getMarketContext(timestamp);

    // Create correlation event structure with enhanced data
    const correlationEvent: NewsCorrelationEvent = {
      news_id: newsItem.id,
      timestamp: newsItem.published_at,
      title: newsItem.title,
      category: newsItem.category,
      subcategories: newsItem.subcategories,
      impact_score: newsItem.impact.score,
      sentiment: newsItem.impact.market_sentiment,
      affected_assets: newsItem.impact.affected_assets,
      price_data: {},
      correlation_score: 0,
      accuracy_score: 0,
      market_context: marketContext,
      weighted_correlation: 0, // Will be calculated later
      confidence_interval: {
        lower: 0,
        upper: 0,
      },
      statistical_significance: 0.5, // Default value
    };

    // Get price data for affected assets at time of publication
    for (const asset of newsItem.impact.affected_assets) {
      try {
        // Get price at time of publication (or closest)
        const preNewsPrice = await this.getPriceAtTime(asset, timestamp);

        // Initialize price data structure
        correlationEvent.price_data[asset] = {
          pre_news: preNewsPrice,
          post_1h: 0,
          post_4h: 0,
          post_24h: 0,
          post_7d: 0,
          percent_change_1h: 0,
          percent_change_4h: 0,
          percent_change_24h: 0,
          percent_change_7d: 0,
          volume_change_percent: 0,
        };
      } catch (error) {
        console.error(`Error getting price data for ${asset}:`, error);
      }
    }

    // Store the initial event data
    this.eventData.push(correlationEvent);
    this.saveData();

    // Schedule updates to track price changes over time
    this.scheduleImpactUpdate(correlationEvent, "1h", 60 * 60 * 1000);
    this.scheduleImpactUpdate(correlationEvent, "4h", 4 * 60 * 60 * 1000);
    this.scheduleImpactUpdate(correlationEvent, "24h", 24 * 60 * 60 * 1000);
    this.scheduleImpactUpdate(correlationEvent, "7d", 7 * 24 * 60 * 60 * 1000);

    return correlationEvent;
  }

  /**
   * Schedule an update to check price impact after a certain time with enhanced analysis
   */
  private scheduleImpactUpdate(
    event: NewsCorrelationEvent,
    timeframe: "1h" | "4h" | "24h" | "7d",
    delayMs: number,
  ): void {
    setTimeout(async () => {
      // Update price data for each asset
      for (const asset of Object.keys(event.price_data)) {
        try {
          const preNewsPrice = event.price_data[asset].pre_news;
          const timestamp = new Date(event.timestamp).getTime() + delayMs;
          const currentPrice = await this.getPriceAtTime(asset, timestamp);

          // Calculate percent change
          const percentChange =
            ((currentPrice - preNewsPrice) / preNewsPrice) * 100;

          // Update the event data
          event.price_data[asset][`post_${timeframe}`] = currentPrice;
          event.price_data[asset][`percent_change_${timeframe}`] =
            percentChange;

          // For 24h update, do enhanced correlation analysis
          if (timeframe === "24h") {
            const volumeChange = await this.getVolumeChangePercent(
              asset,
              new Date(event.timestamp).getTime(),
              timestamp,
            );
            event.price_data[asset].volume_change_percent = volumeChange;

            // Calculate correlation between news sentiment and price movement
            const sentimentScore = event.impact_score;
            const priceChange = percentChange;

            // Basic correlation: if sentiment and price move in same direction
            const sentimentDirection =
              sentimentScore > 0 ? 1 : sentimentScore < 0 ? -1 : 0;
            const priceDirection =
              priceChange > 0 ? 1 : priceChange < 0 ? -1 : 0;

            // Update correlation and accuracy scores
            let assetCorrelation = 0;
            if (sentimentDirection === priceDirection) {
              assetCorrelation = 1.0;

              // Stronger correlation if magnitude is also aligned
              if (
                Math.abs(sentimentScore) > 0.5 &&
                Math.abs(priceChange) > 2.0
              ) {
                assetCorrelation = 1.5;
              }

              event.correlation_score +=
                assetCorrelation / Object.keys(event.price_data).length;
              event.accuracy_score +=
                Math.min(Math.abs(priceChange) / 5, 1) /
                Object.keys(event.price_data).length;
            } else {
              assetCorrelation = -0.5;
              event.correlation_score +=
                assetCorrelation / Object.keys(event.price_data).length;
            }

            // Apply market context weighting
            if (event.market_context) {
              // Get multipliers based on market conditions
              let contextMultiplier = 1.0;

              // Adjust correlation based on market trend alignment
              if (
                event.market_context.market_trend === "uptrend" &&
                sentimentScore > 0
              ) {
                contextMultiplier *= 0.8; // Discount a bit in uptrends - could be general market move
              } else if (
                event.market_context.market_trend === "downtrend" &&
                sentimentScore < 0
              ) {
                contextMultiplier *= 0.8; // Discount a bit in downtrends - could be general market move
              } else {
                contextMultiplier *= 1.2; // Higher weight for contrarian moves
              }

              // Adjust based on volatility
              if (event.market_context.volatility_index > 0.6) {
                contextMultiplier *= 0.7; // Lower weight in high volatility - more noise
              } else if (event.market_context.volatility_index < 0.3) {
                contextMultiplier *= 1.3; // Higher weight in low volatility - less noise
              }

              // Calculate weighted correlation
              event.weighted_correlation =
                event.correlation_score * contextMultiplier;
            } else {
              event.weighted_correlation = event.correlation_score;
            }

            // Calculate statistical significance and confidence interval
            const sampleSize = 1; // Single observation per event
            event.statistical_significance =
              this.calculateStatisticalSignificance(
                event.correlation_score,
                sampleSize,
              );

            event.confidence_interval = this.calculateConfidenceInterval(
              event.correlation_score,
              sampleSize,
            );
          }
        } catch (error) {
          console.error(`Error updating price impact for ${asset}:`, error);
        }
      }

      // Save the updated data
      this.saveData();

      // Recalculate statistics when 24h data is updated
      if (timeframe === "24h") {
        this.calculateCategoryStatistics();
      }
    }, delayMs);
  }

  /**
   * Get price at a specific timestamp (or closest available)
   */
  private async getPriceAtTime(
    asset: string,
    timestamp: number,
  ): Promise<number> {
    try {
      // In a real implementation, you would use the historical API to get exact price
      // For now, simulating with current price + random variation based on timestamp
      const currentPrice = await this.marketDataService.getRealTimePrice(asset);
      const seed = (timestamp % 1000) / 1000;
      const variation = (seed - 0.5) * 0.1; // -5% to +5%
      return currentPrice.price * (1 + variation);
    } catch (error) {
      console.error(`Error getting historical price for ${asset}:`, error);
      // Return a default price as fallback
      return 100;
    }
  }

  /**
   * Get volume change percentage between two timestamps
   */
  private async getVolumeChangePercent(
    asset: string,
    startTime: number,
    endTime: number,
  ): Promise<number> {
    // In a real implementation, you would compare actual volumes
    // Simulating for now
    return Math.random() * 40 - 10; // -10% to +30%
  }

  /**
   * Get correlations by category
   */
  public getCategoryCorrelations(): CategoryCorrelation[] {
    return Array.from(this.categoryStats.values());
  }

  /**
   * Get correlations for a specific asset
   */
  public getAssetCorrelations(
    asset: string,
  ): Map<string, number[]> | undefined {
    return this.assetCategoryImpact.get(asset);
  }

  /**
   * Get correlation history for a specific news category
   */
  public getCategoryHistory(category: string): NewsCorrelationEvent[] {
    return this.eventData.filter((event) => event.category === category);
  }

  /**
   * Predict the market impact of a news item based on historical correlations
   */
  public predictNewsImpact(newsItem: NewsItem): NewsImpactPrediction {
    const category = newsItem.category;
    const subcategories = newsItem.subcategories;
    const assets = newsItem.impact.affected_assets;
    const sentiment = newsItem.impact.score;

    // Initialize prediction structure
    const prediction: NewsImpactPrediction = {
      overall_prediction: {
        direction: "neutral",
        confidence: 0,
        expected_magnitude: 0,
        timeframe: "24h",
      },
      asset_predictions: {},
      similar_events: [],
    };

    // Find similar past events based on category, subcategories, assets
    const similarEvents = this.findSimilarEvents(
      category,
      subcategories,
      assets,
    );

    // Get category average impact
    const categoryStats = this.categoryStats.get(category);

    // Overall prediction based on category stats
    if (categoryStats) {
      // Direction based on sentiment and historical correlation
      const expectedDirection =
        sentiment > 0 ? "up" : sentiment < 0 ? "down" : "neutral";
      const expectedMagnitude = Math.abs(
        categoryStats.avg_price_impact["24h"] * sentiment,
      );
      const confidence =
        Math.min(categoryStats.count / 10, 0.9) *
        Math.abs(categoryStats.avg_correlation);

      prediction.overall_prediction = {
        direction: expectedDirection as "up" | "down" | "neutral",
        confidence,
        expected_magnitude: expectedMagnitude,
        timeframe: "24h",
      };
    }

    // Per-asset predictions
    for (const asset of assets) {
      // Get asset-specific historical data for this category
      const assetCategoryData = this.assetCategoryImpact
        .get(asset)
        ?.get(category);

      if (assetCategoryData && assetCategoryData.length > 0) {
        // Calculate average historical impact
        const avgImpact =
          assetCategoryData.reduce((sum, val) => sum + val, 0) /
          assetCategoryData.length;

        // Calculate standard deviation to determine confidence
        const stdDev = Math.sqrt(
          assetCategoryData.reduce(
            (sum, val) => sum + Math.pow(val - avgImpact, 2),
            0,
          ) / assetCategoryData.length,
        );

        // Direction based on sentiment and historical correlation
        const expectedDirection =
          sentiment > 0 ? "up" : sentiment < 0 ? "down" : "neutral";
        const expectedMagnitude = Math.abs(avgImpact * sentiment);

        // Confidence based on consistency (lower stdDev = higher confidence)
        const baseConfidence = 1 / (1 + stdDev / Math.abs(avgImpact));
        // Scale by sample size
        const sampleConfidence = Math.min(assetCategoryData.length / 5, 1);
        const confidence = baseConfidence * sampleConfidence;

        // Historical accuracy based on past predictions
        const relevantEvents = this.eventData.filter(
          (e) => e.category === category && e.affected_assets.includes(asset),
        );

        const accuracy =
          relevantEvents.length > 0
            ? relevantEvents.reduce((sum, e) => sum + e.accuracy_score, 0) /
              relevantEvents.length
            : 0.5;

        prediction.asset_predictions[asset] = {
          direction: expectedDirection as "up" | "down" | "neutral",
          confidence: confidence,
          expected_magnitude: expectedMagnitude,
          timeframe: "24h",
          historical_accuracy: accuracy,
        };
      } else {
        // No historical data, use overall category prediction with lower confidence
        prediction.asset_predictions[asset] = {
          ...prediction.overall_prediction,
          confidence: prediction.overall_prediction.confidence * 0.7,
          historical_accuracy: 0.5,
        };
      }
    }

    // Add similar events data
    prediction.similar_events = similarEvents.slice(0, 5).map((event) => ({
      news_id: event.news_id,
      title: event.title,
      similarity_score: this.calculateSimilarity(newsItem, event),
      actual_impact: Object.entries(event.price_data).reduce(
        (acc, [asset, data]) => {
          if (assets.includes(asset)) {
            acc[asset] = {
              percent_change: data.percent_change_24h,
              timeframe: "24h",
            };
          }
          return acc;
        },
        {} as {
          [asset: string]: { percent_change: number; timeframe: string };
        },
      ),
    }));

    return prediction;
  }

  /**
   * Find similar events based on category, subcategories, and assets
   */
  private findSimilarEvents(
    category: string,
    subcategories: string[],
    assets: string[],
  ): NewsCorrelationEvent[] {
    // Filter events by category
    const categoryMatches = this.eventData.filter(
      (event) => event.category === category,
    );

    // Score each event based on similarity
    const scoredEvents = categoryMatches.map((event) => {
      const score = this.calculateEventSimilarity(event, subcategories, assets);
      return { event, score };
    });

    // Sort by similarity score (highest first)
    scoredEvents.sort((a, b) => b.score - a.score);

    // Return the events
    return scoredEvents.map((item) => item.event);
  }

  /**
   * Calculate similarity between a historical event and current criteria
   */
  private calculateEventSimilarity(
    event: NewsCorrelationEvent,
    subcategories: string[],
    assets: string[],
  ): number {
    let score = 0;

    // Subcategory match
    const subcategoryMatches = event.subcategories.filter((sub) =>
      subcategories.includes(sub),
    ).length;
    score +=
      subcategoryMatches /
      Math.max(subcategories.length, event.subcategories.length);

    // Asset match
    const assetMatches = event.affected_assets.filter((asset) =>
      assets.includes(asset),
    ).length;
    score +=
      (2 * assetMatches) /
      Math.max(assets.length, event.affected_assets.length);

    return score;
  }

  /**
   * Calculate similarity between news items
   */
  private calculateSimilarity(
    newsItem: NewsItem,
    event: NewsCorrelationEvent,
  ): number {
    // Calculate Jaccard similarity between sets (subcategories + tags + assets)
    const newsItemSets = [
      ...newsItem.subcategories,
      ...newsItem.tags,
      ...newsItem.impact.affected_assets,
    ];

    const eventSets = [...event.subcategories, ...event.affected_assets];

    // Intersection size
    const intersection = newsItemSets.filter((item) =>
      eventSets.includes(item),
    ).length;

    // Union size
    const union = new Set([...newsItemSets, ...eventSets]).size;

    return intersection / union;
  }

  /**
   * Get all tracked news correlation events
   */
  public getAllEvents(): NewsCorrelationEvent[] {
    return this.eventData;
  }

  /**
   * Calculate volatility index at a given timestamp
   */
  private async calculateVolatilityIndex(timestamp: number): Promise<number> {
    try {
      // Get BTC volatility for the last 14 days before this timestamp
      const endDate = new Date(timestamp);
      const startDate = new Date(timestamp);
      startDate.setDate(startDate.getDate() - 14);

      // Get price history
      const btcHistory = await this.marketDataService.getPriceHistory(
        "bitcoin",
        14,
      );
      const prices = btcHistory.prices.map((p: number[]) => p[1]);

      // Calculate daily returns
      const returns = [];
      for (let i = 1; i < prices.length; i++) {
        returns.push(Math.log(prices[i] / prices[i - 1]));
      }

      // Calculate standard deviation (volatility)
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance =
        returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance);

      // Normalize to 0-1 scale
      return Math.min(volatility * 10, 1);
    } catch (error) {
      console.error("Error calculating volatility index:", error);
      return 0.5; // Default medium volatility
    }
  }

  /**
   * Determine market trend at a given timestamp
   */
  private async determineMarketTrend(
    timestamp: number,
  ): Promise<"uptrend" | "downtrend" | "sideways"> {
    try {
      // Get BTC price data for the last 30 days
      const btcHistory = await this.marketDataService.getPriceHistory(
        "bitcoin",
        30,
      );
      const prices = btcHistory.prices.map((p: number[]) => p[1]);

      // Calculate short-term (7-day) and medium-term (30-day) moving averages
      const shortTermMA = this.calculateMovingAverage(prices.slice(-7));
      const mediumTermMA = this.calculateMovingAverage(prices);

      // Calculate price change percentage
      const recentPrice = prices[prices.length - 1];
      const oldPrice = prices[0];
      const priceChangePercent = ((recentPrice - oldPrice) / oldPrice) * 100;

      // Determine trend based on moving averages and price change
      if (shortTermMA > mediumTermMA && priceChangePercent > 5) {
        return "uptrend";
      } else if (shortTermMA < mediumTermMA && priceChangePercent < -5) {
        return "downtrend";
      } else {
        return "sideways";
      }
    } catch (error) {
      console.error("Error determining market trend:", error);
      return "sideways"; // Default to sideways in case of error
    }
  }

  /**
   * Calculate simple moving average
   */
  private calculateMovingAverage(prices: number[]): number {
    return prices.reduce((sum, price) => sum + price, 0) / prices.length;
  }

  /**
   * Get market context with enhanced metrics
   */
  private async getMarketContext(timestamp: number): Promise<MarketContext> {
    // Check cache first
    const timestampKey = new Date(timestamp).toISOString();
    if (this.marketContextCache.has(timestampKey)) {
      return this.marketContextCache.get(timestampKey)!;
    }

    try {
      // Get basic market data - convert timestamp to string for API call
      const timestampStr = new Date(timestamp).toISOString().split("T")[0]; // format as YYYY-MM-DD
      const marketData =
        await this.marketDataService.getMarketData(timestampStr);

      // Get global market stats - implement the method here
      const marketStats = await this.getGlobalMarketStats(timestamp);

      // Get fear & greed index - implement the method here
      const fearIndex = await this.getFearAndGreedIndex(timestamp);

      // Get volatility index
      const volatilityIndex = await this.calculateVolatilityIndex(timestamp);

      // Determine market trend
      const marketTrend = await this.determineMarketTrend(timestamp);

      // Determine trading volume
      const volume = marketData.total_volume;
      const avgVolume = await this.getAverageVolume(7); // 7-day average
      const volumeRatio = volume / avgVolume;
      let tradingVolume: "high" | "medium" | "low" = "medium";

      if (volumeRatio > 1.5) {
        tradingVolume = "high";
      } else if (volumeRatio < 0.7) {
        tradingVolume = "low";
      }

      // Get sector performance
      const sectorPerformance = await this.getSectorPerformance(timestamp);

      // Get liquidity metrics
      const liquidityMetrics = await this.getLiquidityMetrics(timestamp);

      // Get global economic indicators
      const economicIndicators = await this.getEconomicIndicators(timestamp);

      // Determine overall market sentiment
      let overall_sentiment: "bullish" | "bearish" | "neutral" = "neutral";

      // Weighted scoring system for market sentiment
      const sentimentScore = this.calculateSentimentScore({
        marketTrend,
        fearIndex,
        volatilityIndex,
        volumeRatio,
        btcDominance: marketStats.bitcoin_dominance || 0,
        sectorPerformance,
      });

      if (sentimentScore > 0.6) {
        overall_sentiment = "bullish";
      } else if (sentimentScore < 0.4) {
        overall_sentiment = "bearish";
      }

      // Create context object
      const context: MarketContext = {
        timestamp: timestampKey,
        overall_sentiment,
        volatility_index: volatilityIndex,
        market_trend: marketTrend,
        trading_volume: tradingVolume,
        market_fear_index: fearIndex,
        bitcoin_dominance: marketStats.bitcoin_dominance,
        total_market_cap: marketStats.total_market_cap,
        sector_performance: sectorPerformance,
        liquidity_metrics: liquidityMetrics,
        global_economic_indicators: economicIndicators,
      };

      // Cache the result
      this.marketContextCache.set(timestampKey, context);

      return context;
    } catch (error) {
      console.error("Error getting market context:", error);

      // Return a default context if error occurs
      return {
        timestamp: timestampKey,
        overall_sentiment: "neutral",
        volatility_index: 0.5,
        market_trend: "sideways",
        trading_volume: "medium",
      };
    }
  }

  /**
   * Get global market stats (market cap, BTC dominance)
   */
  private async getGlobalMarketStats(
    timestamp: number,
  ): Promise<{ total_market_cap: number; bitcoin_dominance: number }> {
    try {
      // In a real implementation, this would call an API with historical data
      // For now returning simulated values
      const date = new Date(timestamp);
      // Generate deterministic but varied values based on date
      const daySeed = date.getDate() + date.getMonth() * 30;
      const marketCap = 1000000000000 + (daySeed % 10) * 100000000000; // 1-2T range
      const btcDom = 40 + (daySeed % 20); // 40-60% range

      return {
        total_market_cap: marketCap,
        bitcoin_dominance: btcDom,
      };
    } catch (error) {
      console.error("Error getting global market stats:", error);
      return {
        total_market_cap: 1000000000000,
        bitcoin_dominance: 50,
      };
    }
  }

  /**
   * Get Fear and Greed Index
   */
  private async getFearAndGreedIndex(timestamp: number): Promise<number> {
    try {
      // In a real implementation, this would call an API with historical data
      // For now returning simulated values
      const date = new Date(timestamp);
      // Generate deterministic but varied values based on date
      const daySeed = date.getDate() + date.getMonth() * 30;
      return 25 + (daySeed % 50); // 25-75 range
    } catch (error) {
      console.error("Error getting fear and greed index:", error);
      return 50; // Neutral value
    }
  }

  /**
   * Get average trading volume over a period
   */
  private async getAverageVolume(days: number): Promise<number> {
    try {
      // Get market data for top coins
      const marketData = await this.marketDataService.getMarketData();

      // Calculate total volume
      const totalVolume = marketData.reduce(
        (sum: number, coin: any) => sum + (coin.total_volume || 0),
        0,
      );

      // In a real implementation, you would average over 'days'
      // For now just return the current value
      return totalVolume;
    } catch (error) {
      console.error("Error getting average volume:", error);
      return 50000000000; // Default value
    }
  }

  /**
   * Calculate an overall sentiment score based on multiple market factors
   */
  private calculateSentimentScore(params: {
    marketTrend: "uptrend" | "downtrend" | "sideways";
    fearIndex: number;
    volatilityIndex: number;
    volumeRatio: number;
    btcDominance: number;
    sectorPerformance: { [sector: string]: number };
  }): number {
    // Weighted factors for sentiment calculation
    const weights = {
      marketTrend: 0.3,
      fearIndex: 0.2,
      volatility: 0.1,
      volume: 0.1,
      btcDominance: 0.1,
      sectorPerformance: 0.2,
    };

    let score = 0;

    // Market trend component
    if (params.marketTrend === "uptrend") {
      score += weights.marketTrend * 1;
    } else if (params.marketTrend === "downtrend") {
      score += weights.marketTrend * 0;
    } else {
      score += weights.marketTrend * 0.5;
    }

    // Fear & Greed component (0-100 scale, normalized)
    score += weights.fearIndex * (params.fearIndex / 100);

    // Volatility component (inverse relationship - higher volatility is often bearish)
    score += weights.volatility * (1 - params.volatilityIndex);

    // Volume component
    score += weights.volume * Math.min(params.volumeRatio / 2, 1);

    // BTC dominance component (complex relationship - both extremes can be concerning)
    const btcDomNormalized = Math.abs(params.btcDominance - 50) / 50;
    score += weights.btcDominance * (1 - btcDomNormalized);

    // Sector performance component (average of all sectors)
    const avgSectorPerf =
      Object.values(params.sectorPerformance).reduce(
        (sum, val) => sum + val,
        0,
      ) / Math.max(Object.values(params.sectorPerformance).length, 1);

    // Normalize to 0-1 range (assuming -15% to +15% range)
    const normalizedSectorPerf = (avgSectorPerf + 15) / 30;
    score +=
      weights.sectorPerformance *
      Math.min(Math.max(normalizedSectorPerf, 0), 1);

    return score;
  }

  /**
   * Get sector performance data
   */
  private async getSectorPerformance(
    timestamp: number,
  ): Promise<{ [sector: string]: number }> {
    try {
      // This would be implemented to query an API or database with sector performance data
      // For now, returning mock data
      return {
        defi: 2.5,
        smartContract: 1.8,
        layer2: 3.2,
        gaming: -0.7,
        metaverse: -1.2,
        exchange: 0.5,
        privacy: -0.8,
        storage: 1.1,
      };
    } catch (error) {
      console.error("Error getting sector performance:", error);
      return {};
    }
  }

  /**
   * Get liquidity metrics
   */
  private async getLiquidityMetrics(
    timestamp: number,
  ): Promise<{ overall_liquidity: number; bid_ask_spread_avg: number }> {
    try {
      // This would query order book data across major exchanges
      // For now, returning mock data
      return {
        overall_liquidity: 0.78,
        bid_ask_spread_avg: 0.12,
      };
    } catch (error) {
      console.error("Error getting liquidity metrics:", error);
      return {
        overall_liquidity: 0.5,
        bid_ask_spread_avg: 0.3,
      };
    }
  }

  /**
   * Get global economic indicators and correlations
   */
  private async getEconomicIndicators(timestamp: number): Promise<{
    stock_market_correlation: number;
    interest_rate_impact: number;
    forex_volatility: number;
  }> {
    try {
      // This would query economic data APIs
      // For now, returning mock data
      return {
        stock_market_correlation: 0.62,
        interest_rate_impact: 0.45,
        forex_volatility: 0.33,
      };
    } catch (error) {
      console.error("Error getting economic indicators:", error);
      return {
        stock_market_correlation: 0.5,
        interest_rate_impact: 0.5,
        forex_volatility: 0.5,
      };
    }
  }

  /**
   * Advanced statistical testing for correlation significance
   */
  private calculateStatisticalSignificance(
    correlation: number,
    sampleSize: number,
  ): number {
    // Simple approach using approximation - t-test for Pearson correlation
    if (sampleSize < this.minimumSampleSize) {
      return 0.5; // Not enough data for reliable significance test
    }

    // t-statistic = r * sqrt(n-2) / sqrt(1-r²)
    const tStat = Math.abs(
      (correlation * Math.sqrt(sampleSize - 2)) /
        Math.sqrt(1 - correlation * correlation),
    );

    // Convert t-statistic to p-value using approximation
    // For simplicity, approximating the CDF of t-distribution
    return 2 * (1 - this.studentTCDF(tStat, sampleSize - 2));
  }

  /**
   * Student's t cumulative distribution function approximation
   */
  private studentTCDF(t: number, df: number): number {
    // For large df, t-distribution approaches normal distribution
    if (df > 100) {
      return this.normalCDF(t);
    }

    // Approximation for t-distribution CDF
    // This is a simplified approximation
    const x = df / (df + t * t);
    let result = 1 - 0.5 * Math.pow(x, df / 2);

    if (t < 0) {
      result = 1 - result;
    }

    return result;
  }

  /**
   * Detect and handle outliers in correlation data
   */
  private detectOutliers(
    correlationEvents: NewsCorrelationEvent[],
  ): NewsCorrelationEvent[] {
    if (
      !this.outlierDetectionEnabled ||
      correlationEvents.length < this.minimumSampleSize
    ) {
      return correlationEvents;
    }

    // Calculate median and median absolute deviation (MAD)
    const correlations = correlationEvents.map((e) => e.correlation_score);
    correlations.sort((a, b) => a - b);

    const median = correlations[Math.floor(correlations.length / 2)];
    const deviations = correlations.map((c) => Math.abs(c - median));
    deviations.sort((a, b) => a - b);
    const mad = deviations[Math.floor(deviations.length / 2)];

    // Use modified Z-score with MAD (more robust than standard deviation)
    const threshold = 3.5; // Commonly used threshold for outlier detection

    // Filter out outliers
    return correlationEvents.filter((event) => {
      const modifiedZScore =
        (0.6745 * Math.abs(event.correlation_score - median)) / mad;
      return modifiedZScore <= threshold;
    });
  }

  /**
   * Analyze seasonality patterns in news correlation
   */
  private analyzeSeasonality(correlationEvents: NewsCorrelationEvent[]): {
    day_of_week: number[];
    month: number[];
    market_hours: number;
  } {
    if (
      !this.seasonalityAnalysisEnabled ||
      correlationEvents.length < this.minimumSampleSize * 7
    ) {
      // Default values if not enough data
      return {
        day_of_week: [0, 0, 0, 0, 0, 0, 0],
        month: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        market_hours: 0,
      };
    }

    // Initialize arrays for day of week (Sun-Sat) and month (Jan-Dec)
    const dayCount = [0, 0, 0, 0, 0, 0, 0];
    const dayCorrelation = [0, 0, 0, 0, 0, 0, 0];
    const monthCount = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const monthCorrelation = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    // Market hours correlation (0-23 UTC)
    const hourCount = new Array(24).fill(0);
    const hourCorrelation = new Array(24).fill(0);

    // Collect data
    for (const event of correlationEvents) {
      const date = new Date(event.timestamp);
      const day = date.getUTCDay();
      const month = date.getUTCMonth();
      const hour = date.getUTCHours();

      dayCount[day]++;
      dayCorrelation[day] += event.correlation_score;

      monthCount[month]++;
      monthCorrelation[month] += event.correlation_score;

      hourCount[hour]++;
      hourCorrelation[hour] += event.correlation_score;
    }

    // Calculate averages
    const dayAvg = dayCorrelation.map((sum, i) =>
      dayCount[i] > 0 ? sum / dayCount[i] : 0,
    );

    const monthAvg = monthCorrelation.map((sum, i) =>
      monthCount[i] > 0 ? sum / monthCount[i] : 0,
    );

    // Find peak market hours correlation
    let peakHour = 0;
    let peakCorrelation = 0;

    for (let i = 0; i < 24; i++) {
      if (hourCount[i] > 0) {
        const avgCorrelation = hourCorrelation[i] / hourCount[i];
        if (avgCorrelation > peakCorrelation) {
          peakCorrelation = avgCorrelation;
          peakHour = i;
        }
      }
    }

    return {
      day_of_week: dayAvg,
      month: monthAvg,
      market_hours: peakHour,
    };
  }

  /**
   * Calculate confidence interval for correlation coefficient
   */
  private calculateConfidenceInterval(
    correlation: number,
    sampleSize: number,
  ): { lower: number; upper: number } {
    if (sampleSize < 3) {
      return { lower: -1, upper: 1 }; // Not enough data
    }

    // Fisher transformation
    const z = 0.5 * Math.log((1 + correlation) / (1 - correlation));
    const se = 1 / Math.sqrt(sampleSize - 3);

    // Z-score for desired confidence level (1.96 for 95% confidence)
    const z_score = 1.96;

    // Calculate confidence bounds in transformed space
    const lower_z = z - z_score * se;
    const upper_z = z + z_score * se;

    // Transform back to correlation coefficient
    const lower = (Math.exp(2 * lower_z) - 1) / (Math.exp(2 * lower_z) + 1);
    const upper = (Math.exp(2 * upper_z) - 1) / (Math.exp(2 * upper_z) + 1);

    return { lower, upper };
  }

  /**
   * Standard normal cumulative distribution function
   */
  private normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp((-x * x) / 2);
    let prob =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    if (x > 0) {
      prob = 1 - prob;
    }
    return prob;
  }

  /**
   * Predict market impact adjusted for current market conditions
   * This implementation replaces the previous one with Promise
   */
  public async predictNewsImpactWithMarketContext(
    newsItem: NewsItem,
  ): Promise<NewsImpactPrediction> {
    // Get basic prediction first
    const basePrediction = this.predictNewsImpact(newsItem);

    try {
      // Get current market context
      const marketContext = await this.getMarketContext(new Date().getTime());

      // Adjust prediction based on market context
      const adjustedPrediction = { ...basePrediction };

      // Get category stats for contextual adjustment
      const categoryStats = this.categoryStats.get(newsItem.category);
      if (!categoryStats || !categoryStats.market_condition_impact) {
        return basePrediction;
      }

      // Apply market condition multipliers
      let contextMultiplier = 1.0;

      if (marketContext.overall_sentiment === "bullish") {
        contextMultiplier *=
          categoryStats.market_condition_impact.bull_market_multiplier;
      } else if (marketContext.overall_sentiment === "bearish") {
        contextMultiplier *=
          categoryStats.market_condition_impact.bear_market_multiplier;
      }

      if (marketContext.volatility_index > 0.6) {
        contextMultiplier *=
          categoryStats.market_condition_impact.high_volatility_impact;
      } else if (marketContext.volatility_index < 0.3) {
        contextMultiplier *=
          categoryStats.market_condition_impact.low_volatility_impact;
      }

      // Apply day of week seasonality if available
      if (
        categoryStats.seasonality_factors &&
        categoryStats.seasonality_factors.day_of_week
      ) {
        const dayOfWeek = new Date().getDay();
        contextMultiplier *=
          categoryStats.seasonality_factors.day_of_week[dayOfWeek];
      }

      // Adjust overall prediction
      adjustedPrediction.overall_prediction.expected_magnitude *=
        contextMultiplier;

      // Only adjust confidence if we have statistical data
      if (categoryStats.statistical_significance) {
        // Higher confidence if statistically significant
        if (
          categoryStats.statistical_significance < this.significanceThreshold
        ) {
          adjustedPrediction.overall_prediction.confidence = Math.min(
            adjustedPrediction.overall_prediction.confidence * 1.2,
            0.95,
          );
        } else {
          // Lower confidence if not statistically significant
          adjustedPrediction.overall_prediction.confidence *= 0.8;
        }
      }

      // Adjust each asset prediction
      Object.keys(adjustedPrediction.asset_predictions).forEach((asset) => {
        const assetPrediction = adjustedPrediction.asset_predictions[asset];
        assetPrediction.expected_magnitude *= contextMultiplier;
      });

      // Add market context as additional property if needed
      (adjustedPrediction as any).market_context = marketContext;

      return adjustedPrediction;
    } catch (error) {
      console.error("Error adjusting prediction with market context:", error);
      // Fallback to base prediction if market context fails
      return basePrediction;
    }
  }
}
