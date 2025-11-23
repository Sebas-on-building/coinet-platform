import { NewsItem } from "../types/news";
import {
  NewsCorrelationService,
  NewsImpactPrediction,
} from "../services/news/NewsCorrelationService";
import { NewsAggregationService } from "../services/news/NewsAggregationService";
import { MarketDataService } from "../services/marketData";

/**
 * Price prediction result for a group of news
 */
export interface GroupPredictionResult {
  category: string;
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
      expected_price: number;
      current_price: number;
      historical_accuracy: number;
    };
  };
  supporting_events: Array<{
    title: string;
    similarity_score: number;
    actual_impact: string;
  }>;
  chart_data?: any; // For visualization
  market_context_analysis?: {
    // NEW: Market context analysis
    current_market_sentiment: "bullish" | "bearish" | "neutral";
    volatility_factor: number;
    market_condition_adjustment: number;
    liquidity_impact: "high" | "medium" | "low";
    sector_trends: {
      [sector: string]: {
        trend: "up" | "down" | "neutral";
        strength: number;
      };
    };
  };
  confidence_intervals?: {
    // NEW: Statistical confidence intervals
    magnitude: {
      lower: number;
      upper: number;
    };
    probability: number;
  };
}

/**
 * Category correlation with price data
 */
export interface CategoryPriceCorrelation {
  category: string;
  correlation_score: number;
  avg_price_impact: {
    [timeframe: string]: number;
  };
  sample_size: number;
  top_affected_assets: Array<{
    symbol: string;
    avg_impact: number;
    reliability: number;
  }>;
}

/**
 * Result of analyzed news group
 */
export interface AnalyzedNewsGroup {
  category: string;
  news_count: number;
  sentiment_distribution: {
    bullish: number;
    bearish: number;
    neutral: number;
  };
  key_assets: Array<{
    symbol: string;
    mentions: number;
    avg_sentiment: number;
  }>;
  predictions: GroupPredictionResult;
  historical_correlations: CategoryPriceCorrelation;
  temporal_patterns?: {
    time_of_day_impact: number;
    day_of_week_factor: number;
    seasonality_score: number;
  };
  cross_asset_correlation?: {
    [asset: string]: {
      correlated_assets: Array<{
        symbol: string;
        correlation: number;
      }>;
    };
  };
}

/**
 * NewsImpactPredictor - Analyze historical correlations and predict market impact
 */
export class NewsImpactPredictor {
  private correlationService: NewsCorrelationService;
  private newsService: NewsAggregationService;
  private marketDataService: MarketDataService;

  // NEW: Configuration for prediction algorithms
  private config = {
    minSimilarEvents: 5,
    minConfidence: 0.4,
    similarityThreshold: 0.6,
    volatilityImpactFactor: 0.7,
    marketContextWeight: 0.3,
    outlierRemovalEnabled: true,
    confidenceIntervalLevel: 0.95,
    useHistoricalVolatility: true,
    adaptiveWeighting: true,
  };

  constructor() {
    this.correlationService = NewsCorrelationService.getInstance();
    this.newsService = NewsAggregationService.getInstance();
    this.marketDataService = new MarketDataService();
  }

  /**
   * Predict market impact for a single news item
   */
  public predictImpact(newsItem: NewsItem): NewsImpactPrediction {
    return this.correlationService.predictNewsImpact(newsItem);
  }

  /**
   * Track a news item for correlation analysis
   */
  public trackNewsItem(newsItem: NewsItem): void {
    this.correlationService.trackNewsEvent(newsItem);
  }

  /**
   * Analyze correlations between news categories and price movements
   */
  public getCategoryCorrelations(): CategoryPriceCorrelation[] {
    const categoryStats = this.correlationService.getCategoryCorrelations();

    return categoryStats.map((stat) => ({
      category: stat.category,
      correlation_score: stat.avg_correlation,
      avg_price_impact: stat.avg_price_impact,
      sample_size: stat.count,
      top_affected_assets: Object.entries(stat.top_assets)
        .map(([symbol, data]) => ({
          symbol,
          avg_impact: data.avg_impact,
          reliability: Math.min(data.count / 10, 1),
        }))
        .sort((a, b) => b.avg_impact - a.avg_impact)
        .slice(0, 5),
    }));
  }

  /**
   * Get impact correlations for a specific asset
   */
  public getAssetCategoryCorrelations(
    asset: string,
  ): CategoryPriceCorrelation[] {
    const assetData = this.correlationService.getAssetCorrelations(asset);

    if (!assetData) return [];

    return Array.from(assetData.entries()).map(([category, impacts]) => {
      // Calculate average impact
      const avgImpact =
        impacts.reduce((sum, val) => sum + val, 0) / impacts.length;

      // Calculate correlation score (simplified)
      const categoryEvents =
        this.correlationService.getCategoryHistory(category);
      const correlationScore =
        categoryEvents.reduce(
          (sum, event) => sum + event.correlation_score,
          0,
        ) / Math.max(categoryEvents.length, 1);

      return {
        category,
        correlation_score: correlationScore,
        avg_price_impact: {
          "24h": avgImpact,
        },
        sample_size: impacts.length,
        top_affected_assets: [
          {
            symbol: asset,
            avg_impact: avgImpact,
            reliability: Math.min(impacts.length / 10, 1),
          },
        ],
      };
    });
  }

  /**
   * Analyze a group of news items and predict their collective market impact
   */
  public async analyzeNewsGroup(
    newsItems: NewsItem[],
  ): Promise<AnalyzedNewsGroup[]> {
    // Group news by category
    const categorizedNews = new Map<string, NewsItem[]>();

    for (const item of newsItems) {
      if (!categorizedNews.has(item.category)) {
        categorizedNews.set(item.category, []);
      }
      categorizedNews.get(item.category)!.push(item);
    }

    // Analyze each category
    const results: AnalyzedNewsGroup[] = [];

    for (const [category, items] of categorizedNews.entries()) {
      // Get sentiment distribution
      const sentimentCount = {
        bullish: 0,
        bearish: 0,
        neutral: 0,
      };

      items.forEach((item) => {
        sentimentCount[item.impact.market_sentiment]++;
      });

      // Count asset mentions
      const assetMentions = new Map<
        string,
        { mentions: number; totalSentiment: number }
      >();

      items.forEach((item) => {
        item.impact.affected_assets.forEach((asset) => {
          if (!assetMentions.has(asset)) {
            assetMentions.set(asset, { mentions: 0, totalSentiment: 0 });
          }
          const data = assetMentions.get(asset)!;
          data.mentions++;
          data.totalSentiment += item.impact.score;
          assetMentions.set(asset, data);
        });
      });

      // Convert to sorted array
      const keyAssets = Array.from(assetMentions.entries())
        .map(([symbol, data]) => ({
          symbol,
          mentions: data.mentions,
          avg_sentiment: data.totalSentiment / data.mentions,
        }))
        .sort((a, b) => b.mentions - a.mentions);

      // Get category correlations
      const categoryCorrelations = this.correlationService
        .getCategoryCorrelations()
        .find((stat) => stat.category === category);

      // Generate collective prediction
      const predictions = await this.predictCollectiveImpact(
        category,
        items,
        keyAssets,
      );

      // Add to results
      results.push({
        category,
        news_count: items.length,
        sentiment_distribution: {
          bullish: sentimentCount.bullish / items.length,
          bearish: sentimentCount.bearish / items.length,
          neutral: sentimentCount.neutral / items.length,
        },
        key_assets: keyAssets,
        predictions,
        historical_correlations: {
          category,
          correlation_score: categoryCorrelations?.avg_correlation || 0,
          avg_price_impact: categoryCorrelations?.avg_price_impact || {
            "1h": 0,
            "4h": 0,
            "24h": 0,
            "7d": 0,
          },
          sample_size: categoryCorrelations?.count || 0,
          top_affected_assets: Object.entries(
            categoryCorrelations?.top_assets || {},
          )
            .map(([symbol, data]) => ({
              symbol,
              avg_impact: data.avg_impact,
              reliability: Math.min(data.count / 10, 1),
            }))
            .sort((a, b) => b.avg_impact - a.avg_impact)
            .slice(0, 5),
        },
      });
    }

    return results;
  }

  /**
   * Predict collective impact of multiple news items in the same category
   */
  private async predictCollectiveImpact(
    category: string,
    newsItems: NewsItem[],
    keyAssets: Array<{
      symbol: string;
      mentions: number;
      avg_sentiment: number;
    }>,
  ): Promise<GroupPredictionResult> {
    // Get individual predictions for each news item
    const predictions = newsItems.map((item) =>
      this.correlationService.predictNewsImpact(item),
    );

    // Aggregate predictions
    const assetPredictions: {
      [asset: string]: Array<{
        direction: "up" | "down" | "neutral";
        magnitude: number;
        confidence: number;
      }>;
    } = {};

    // Collect all predictions for each asset
    predictions.forEach((prediction) => {
      Object.entries(prediction.asset_predictions).forEach(([asset, data]) => {
        if (!assetPredictions[asset]) {
          assetPredictions[asset] = [];
        }

        const direction = data.direction;
        const magnitude = data.expected_magnitude;
        const confidence = data.confidence;

        assetPredictions[asset].push({
          direction,
          magnitude,
          confidence,
        });
      });
    });

    // Calculate weighted predictions for each asset
    const weightedAssetPredictions: {
      [asset: string]: {
        direction: "up" | "down" | "neutral";
        confidence: number;
        expected_magnitude: number;
        expected_price: number;
        current_price: number;
        historical_accuracy: number;
      };
    } = {};

    for (const asset of Object.keys(assetPredictions)) {
      const assetData = assetPredictions[asset];

      // Count directions weighted by confidence
      let upWeight = 0;
      let downWeight = 0;
      let totalMagnitude = 0;
      let totalConfidence = 0;

      assetData.forEach((pred) => {
        const weight = pred.confidence;
        totalConfidence += weight;

        if (pred.direction === "up") {
          upWeight += weight;
          totalMagnitude += pred.magnitude * weight;
        } else if (pred.direction === "down") {
          downWeight += weight;
          totalMagnitude -= pred.magnitude * weight;
        }
      });

      // Determine overall direction
      let direction: "up" | "down" | "neutral";
      if (upWeight > downWeight * 1.25) {
        direction = "up";
      } else if (downWeight > upWeight * 1.25) {
        direction = "down";
      } else {
        direction = "neutral";
      }

      // Calculate expected magnitude
      const expectedMagnitude =
        totalConfidence > 0 ? Math.abs(totalMagnitude) / totalConfidence : 0;

      // Get current price (simulated here)
      const currentPrice = 100 + Math.random() * 1000;

      // Calculate expected price
      const changePercent =
        direction === "up"
          ? expectedMagnitude
          : direction === "down"
            ? -expectedMagnitude
            : 0;
      const expectedPrice = currentPrice * (1 + changePercent / 100);

      // Get historical accuracy (average from individual predictions)
      const historicalAccuracy =
        assetData.reduce(
          (sum, _, index) =>
            sum +
            (predictions[index].asset_predictions[asset]?.historical_accuracy ||
              0.5),
          0,
        ) / assetData.length;

      weightedAssetPredictions[asset] = {
        direction,
        confidence: totalConfidence / assetData.length,
        expected_magnitude: expectedMagnitude,
        expected_price: expectedPrice,
        current_price: currentPrice,
        historical_accuracy: historicalAccuracy,
      };
    }

    // Calculate overall prediction across all assets
    let overallUpWeight = 0;
    let overallDownWeight = 0;
    let overallMagnitude = 0;
    let assetCount = 0;

    Object.values(weightedAssetPredictions).forEach((prediction) => {
      assetCount++;
      if (prediction.direction === "up") {
        overallUpWeight += prediction.confidence;
        overallMagnitude +=
          prediction.expected_magnitude * prediction.confidence;
      } else if (prediction.direction === "down") {
        overallDownWeight += prediction.confidence;
        overallMagnitude -=
          prediction.expected_magnitude * prediction.confidence;
      }
    });

    // Determine overall market direction
    let overallDirection: "up" | "down" | "neutral";
    if (overallUpWeight > overallDownWeight * 1.25) {
      overallDirection = "up";
    } else if (overallDownWeight > overallUpWeight * 1.25) {
      overallDirection = "down";
    } else {
      overallDirection = "neutral";
    }

    // Calculate overall magnitude and confidence
    const totalWeight = overallUpWeight + overallDownWeight;
    const overallMagnitudeValue =
      totalWeight > 0 ? Math.abs(overallMagnitude) / totalWeight : 0;
    const overallConfidence =
      assetCount > 0 ? (overallUpWeight + overallDownWeight) / assetCount : 0;

    // Get most similar historical events for context
    const similarEvents = this.getSimilarEvents(category, newsItems);

    return {
      category,
      overall_prediction: {
        direction: overallDirection,
        confidence: overallConfidence,
        expected_magnitude: overallMagnitudeValue,
        timeframe: "24h",
      },
      asset_predictions: weightedAssetPredictions,
      supporting_events: similarEvents.slice(0, 5).map((event) => ({
        title: event.title,
        similarity_score: this.calculateContentSimilarity(
          newsItems.map((item) => item.title + " " + item.content).join(" "),
          event.title,
        ),
        actual_impact: this.formatImpactSummary(event),
      })),
    };
  }

  /**
   * Find similar historical events
   */
  private getSimilarEvents(
    category: string,
    newsItems: NewsItem[],
  ): Array<any> {
    const allEvents = this.correlationService.getAllEvents();

    // Filter by category
    const categoryEvents = allEvents.filter(
      (event) => event.category === category,
    );

    // Extract all affected assets
    const affectedAssets = new Set<string>();
    newsItems.forEach((item) => {
      item.impact.affected_assets.forEach((asset) => {
        affectedAssets.add(asset);
      });
    });

    // Score events by asset overlap
    const scoredEvents = categoryEvents.map((event) => {
      const assetOverlap = event.affected_assets.filter((asset) =>
        affectedAssets.has(asset),
      ).length;

      const overlapScore =
        assetOverlap /
        Math.max(affectedAssets.size, event.affected_assets.length);

      return {
        event,
        score: overlapScore,
      };
    });

    // Sort by score
    scoredEvents.sort((a, b) => b.score - a.score);

    // Return top events
    return scoredEvents.map((item) => item.event);
  }

  /**
   * Calculate similarity between text content
   */
  private calculateContentSimilarity(
    content1: string,
    content2: string,
  ): number {
    // Simple word overlap calculation
    const words1 = new Set(
      content1
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3),
    );
    const words2 = new Set(
      content2
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3),
    );

    const intersection = new Set([...words1].filter((x) => words2.has(x)));

    return intersection.size / Math.max(words1.size, words2.size);
  }

  /**
   * Format impact summary for display
   */
  private formatImpactSummary(event: any): string {
    const impacts: string[] = [];

    Object.entries(event.price_data).forEach(([asset, data]: [string, any]) => {
      const change = data.percent_change_24h;
      impacts.push(`${asset}: ${change >= 0 ? "+" : ""}${change.toFixed(2)}%`);
    });

    return impacts.join(", ");
  }

  /**
   * Predict market impact with current market context
   */
  public async predictImpactWithContext(newsItem: NewsItem): Promise<
    NewsImpactPrediction & {
      market_context_analysis: any;
    }
  > {
    // Get base prediction
    const basePrediction = this.correlationService.predictNewsImpact(newsItem);

    // Get current market context
    const marketContext = await this.getCurrentMarketContext();

    // Adjust prediction based on market context
    const adjustedPrediction = this.adjustPredictionForMarketContext(
      basePrediction,
      marketContext,
    );

    return adjustedPrediction;
  }

  /**
   * Get current market context
   */
  private async getCurrentMarketContext() {
    // Get market sentiment
    const sentiment = await this.marketDataService.getMarketSentiment();

    // Get volatility metrics
    const volatility = await this.marketDataService.getVolatilityMetrics();

    // Get liquidity data
    const liquidity = await this.marketDataService.getLiquidityMetrics();

    // Get sector performance
    const sectorPerformance =
      await this.marketDataService.getSectorPerformance();

    return {
      sentiment,
      volatility,
      liquidity,
      sectorPerformance,
    };
  }

  /**
   * Adjust prediction based on market context
   */
  private adjustPredictionForMarketContext(
    prediction: NewsImpactPrediction,
    marketContext: any,
  ): NewsImpactPrediction & { market_context_analysis: any } {
    // Deep clone the prediction to avoid modifying the original
    const adjustedPrediction = JSON.parse(JSON.stringify(prediction));

    // Adjustment factors based on market conditions
    const volatilityFactor = this.calculateVolatilityAdjustment(
      marketContext.volatility,
    );
    const sentimentAlignment = this.calculateSentimentAlignment(
      prediction.overall_prediction.direction,
      marketContext.sentiment,
    );
    const liquidityImpact = this.calculateLiquidityImpact(
      marketContext.liquidity,
    );

    // Apply adjustments to overall prediction
    adjustedPrediction.overall_prediction.confidence *= sentimentAlignment;
    adjustedPrediction.overall_prediction.expected_magnitude *=
      volatilityFactor;

    // Apply adjustments to asset-specific predictions
    Object.keys(adjustedPrediction.asset_predictions).forEach((asset) => {
      const assetPred = adjustedPrediction.asset_predictions[asset];
      const sectorFactor = this.calculateSectorFactor(
        asset,
        marketContext.sectorPerformance,
      );

      // Apply sector-specific adjustment
      assetPred.confidence *= sentimentAlignment * sectorFactor;
      assetPred.expected_magnitude *= volatilityFactor * liquidityImpact;
    });

    // Add market context analysis
    const marketContextAnalysis = {
      current_market_sentiment: marketContext.sentiment.overall,
      volatility_factor: volatilityFactor,
      market_condition_adjustment: sentimentAlignment,
      liquidity_impact:
        liquidityImpact > 0.8
          ? "high"
          : liquidityImpact > 0.4
            ? "medium"
            : "low",
      sector_trends: this.formatSectorTrends(marketContext.sectorPerformance),
    };

    return {
      ...adjustedPrediction,
      market_context_analysis: marketContextAnalysis,
    };
  }

  /**
   * Calculate how volatility affects magnitude predictions
   */
  private calculateVolatilityAdjustment(volatilityMetrics: any): number {
    // Higher volatility generally means larger price movements
    const currentVolatility = volatilityMetrics.current;
    const averageVolatility = volatilityMetrics.average;

    // If current volatility is higher than average, increase expected magnitude
    if (currentVolatility > averageVolatility) {
      // Cap the increase at 2x
      return Math.min(currentVolatility / averageVolatility, 2);
    }

    // If lower than average, decrease slightly but don't go below 0.5x
    return Math.max(0.5, currentVolatility / averageVolatility);
  }

  /**
   * Calculate how well the predicted direction aligns with current market sentiment
   */
  private calculateSentimentAlignment(
    predictedDirection: "up" | "down" | "neutral",
    sentimentData: any,
  ): number {
    const marketSentiment = sentimentData.overall;

    // If prediction aligns with market sentiment, higher confidence
    if (
      (predictedDirection === "up" && marketSentiment === "bullish") ||
      (predictedDirection === "down" && marketSentiment === "bearish")
    ) {
      return 1.2; // 20% boost to confidence
    }

    // If prediction contradicts market sentiment, lower confidence
    if (
      (predictedDirection === "up" && marketSentiment === "bearish") ||
      (predictedDirection === "down" && marketSentiment === "bullish")
    ) {
      return 0.8; // 20% reduction in confidence
    }

    // Neutral cases
    return 1.0;
  }

  /**
   * Calculate how liquidity affects price impact
   */
  private calculateLiquidityImpact(liquidityMetrics: any): number {
    // Lower liquidity generally means higher price impact
    const overallLiquidity = liquidityMetrics.overall;

    // Inverse relationship - lower liquidity leads to higher impact
    return Math.min(1.5, 1 / (overallLiquidity + 0.5));
  }

  /**
   * Calculate sector-specific adjustment factor
   */
  private calculateSectorFactor(asset: string, sectorPerformance: any): number {
    // Map asset to its sector
    const sector = this.getAssetSector(asset);

    if (!sector || !sectorPerformance[sector]) {
      return 1.0; // No adjustment if sector unknown
    }

    // Strong sector performance generally increases confidence
    const sectorChange = sectorPerformance[sector];

    // Normalize to adjustment factor (0.8 to 1.2 range)
    return 1 + (sectorChange / 100) * 2; // +/- 20% adjustment for +/- 10% sector change
  }

  /**
   * Get sector for a given asset
   */
  private getAssetSector(asset: string): string | null {
    // This would be implemented based on asset classification system
    // Mock implementation:
    const sectorMap: { [key: string]: string } = {
      BTC: "currency",
      ETH: "smartContract",
      BNB: "exchange",
      SOL: "smartContract",
      XRP: "payments",
      ADA: "smartContract",
      AVAX: "smartContract",
      DOT: "interoperability",
      MATIC: "layer2",
      LINK: "oracle",
      UNI: "defi",
      AAVE: "defi",
      AXS: "gaming",
      SAND: "metaverse",
      FIL: "storage",
    };

    return sectorMap[asset] || null;
  }

  /**
   * Format sector trends for output
   */
  private formatSectorTrends(sectorPerformance: any): any {
    const result: any = {};

    Object.keys(sectorPerformance).forEach((sector) => {
      const change = sectorPerformance[sector];

      result[sector] = {
        trend: change > 1 ? "up" : change < -1 ? "down" : "neutral",
        strength: Math.abs(change) / 10, // normalize to 0-1 scale assuming +/- 10% as max
      };
    });

    return result;
  }
}
