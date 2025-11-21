import { WebSocketService } from "./websocket";
import { api } from "./api";
import type {
  EnhancedTechnicalIndicator,
  EnhancedMarketMetric,
  EnhancedSocialMetrics,
  EnhancedOnChainMetrics,
  EnhancedPortfolioAnalytics,
  EnhancedSmartOrderRouter,
  MarketImpactAnalysis,
  ExecutionStrategy,
} from "../types/analytics";

// Create a new WebSocketService instance
const webSocketService = new WebSocketService();

class AnalyticsService {
  private websocket: WebSocketService;
  private technicalCache: Map<string, EnhancedTechnicalIndicator[]> = new Map();
  private marketMetricsCache: Map<string, EnhancedMarketMetric[]> = new Map();
  private socialMetricsCache: Map<string, EnhancedSocialMetrics> = new Map();
  private onChainMetricsCache: Map<string, EnhancedOnChainMetrics> = new Map();

  constructor(websocketService: WebSocketService) {
    this.websocket = websocketService;
    this.initializeWebSockets();
  }

  private initializeWebSockets() {
    // Subscribe to real-time data streams
    this.websocket.on("technical_update", this.handleTechnicalUpdate);
    this.websocket.on("market_update", this.handleMarketUpdate);
    this.websocket.on("blockchain_update", this.handleOnChainUpdate);
  }

  // Technical Analysis Methods
  async getTechnicalIndicators(
    symbol: string,
  ): Promise<EnhancedTechnicalIndicator[]> {
    const cacheKey = `${symbol}-technical`;
    if (this.technicalCache.has(cacheKey)) {
      return this.technicalCache.get(cacheKey)!;
    }

    try {
      const result = await api.get<EnhancedTechnicalIndicator[]>(
        `/analytics/technical/${symbol}`,
      );
      this.technicalCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Failed to fetch technical indicators:", error);
      return [];
    }
  }

  async getMarketMetrics(symbol: string): Promise<EnhancedMarketMetric[]> {
    const cacheKey = `${symbol}-market`;
    if (this.marketMetricsCache.has(cacheKey)) {
      return this.marketMetricsCache.get(cacheKey)!;
    }

    try {
      const result = await api.get<EnhancedMarketMetric[]>(
        `/analytics/market/${symbol}`,
      );
      this.marketMetricsCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Failed to fetch market metrics:", error);
      return [];
    }
  }

  // Social Sentiment Analysis
  async getSocialMetrics(symbol: string): Promise<EnhancedSocialMetrics> {
    if (this.socialMetricsCache.has(symbol)) {
      return this.socialMetricsCache.get(symbol)!;
    }

    try {
      const result = await api.get<EnhancedSocialMetrics>(
        `/analytics/social/${symbol}`,
      );
      this.socialMetricsCache.set(symbol, result);
      return result;
    } catch (error) {
      console.error("Failed to fetch social metrics:", error);
      return this.getMockSocialMetrics();
    }
  }

  async getInfluencerAnalysis(symbol: string) {
    return api.get(`/analytics/social/influencers/${symbol}`);
  }

  async getNewsImpactAnalysis(symbol: string) {
    return api.get(`/analytics/social/news-impact/${symbol}`);
  }

  // On-Chain Analytics
  async getOnChainMetrics(symbol: string): Promise<EnhancedOnChainMetrics> {
    if (this.onChainMetricsCache.has(symbol)) {
      return this.onChainMetricsCache.get(symbol)!;
    }

    try {
      const result = await api.get<EnhancedOnChainMetrics>(
        `/analytics/onchain/${symbol}`,
      );
      this.onChainMetricsCache.set(symbol, result);
      return result;
    } catch (error) {
      console.error("Failed to fetch on-chain metrics:", error);
      return this.getMockOnChainMetrics();
    }
  }

  async getWhaleActivityAnalysis(symbol: string) {
    return api.get(`/analytics/onchain/whale-activity/${symbol}`);
  }

  async getDeFiProtocolAnalysis(protocol: string) {
    return api.get(`/analytics/defi/protocol/${protocol}`);
  }

  // Portfolio Analytics
  async getPortfolioAnalytics(
    portfolioId: string,
  ): Promise<EnhancedPortfolioAnalytics> {
    return api.get(`/analytics/portfolio/${portfolioId}`);
  }

  async getOptimizationSuggestions(portfolioId: string) {
    return api.get(`/analytics/portfolio/optimize/${portfolioId}`);
  }

  async getTaxHarvestingOpportunities(portfolioId: string) {
    return api.get(`/analytics/portfolio/tax-harvest/${portfolioId}`);
  }

  // Smart Order Router
  async analyzeTradeRoute(params: {
    fromToken: string;
    toToken: string;
    amount: string;
    slippageTolerance: number;
  }): Promise<EnhancedSmartOrderRouter> {
    return api.post("/analytics/trade/route", params);
  }

  async simulateMarketImpact(params: {
    token: string;
    amount: string;
    side: "buy" | "sell";
  }): Promise<MarketImpactAnalysis> {
    return api.post("/analytics/trade/market-impact", params);
  }

  async getOptimalExecutionStrategy(params: {
    token: string;
    amount: string;
    side: "buy" | "sell";
    timeframe: string;
  }): Promise<ExecutionStrategy> {
    return api.post("/analytics/trade/execution-strategy", params);
  }

  // Event Handlers
  private handleTechnicalUpdate = (update: any) => {
    const { symbol, timeframe, indicators } = update;
    const cacheKey = `${symbol}-${timeframe}`;
    this.technicalCache.set(cacheKey, indicators);
  };

  private handleMarketUpdate = (update: any) => {
    const { symbol, metrics } = update;
    this.marketMetricsCache.set(symbol, metrics);
  };

  private handleOnChainUpdate = (update: any) => {
    const { symbol, metrics } = update;
    this.onChainMetricsCache.set(symbol, metrics);
  };

  // Cache Management
  clearCache() {
    this.technicalCache.clear();
    this.marketMetricsCache.clear();
    this.socialMetricsCache.clear();
    this.onChainMetricsCache.clear();
  }

  /**
   * Get mock social metrics for development
   */
  private getMockSocialMetrics(): EnhancedSocialMetrics {
    // Implementation of mock data generation
    return {
      sentiment: {
        score: 0.65,
        change: 0.05,
        volume: 15000,
      },
      mentions: {
        total: 25000,
        change: 0.12,
        sources: {
          twitter: 12000,
          reddit: 8000,
          news: 5000,
        },
      },
      influencers: {
        active: 120,
        reach: 5000000,
        engagement: 0.023,
      },
      topics: [
        { name: "price", mentions: 8500, sentiment: 0.7 },
        { name: "regulation", mentions: 5200, sentiment: 0.4 },
        { name: "technology", mentions: 4800, sentiment: 0.8 },
      ],
      timestamp: Date.now(),
      sentiment_analysis: {
        overall_score: 0.68,
        sources: {
          twitter: 0.72,
          reddit: 0.65,
          news: 0.62,
          github: 0.74,
          telegram: 0.68,
          discord: 0.7,
        },
        momentum: 0.15,
        change_24h: 0.07,
      },
      correlation_analysis: {
        price_correlation: 0.65,
        volume_correlation: 0.58,
        sentiment_lead_lag: 2.5,
      },
      topic_modeling: [],
      influencer_tracking: [],
    };
  }

  /**
   * Get mock on-chain metrics for development
   */
  private getMockOnChainMetrics(): EnhancedOnChainMetrics {
    // Implementation of mock data generation
    return {
      transactions: {
        count: 2500000,
        volume: 12500,
        avgValue: 5,
        change: 0.03,
      },
      addresses: {
        active: 850000,
        new: 25000,
        total: 50000000,
      },
      fees: {
        total: 120,
        average: 0.0045,
        median: 0.003,
      },
      mining: {
        hashrate: 175000000,
        difficulty: 28500000000000,
        rewards: 6.25,
      },
      defi: {
        tvl: 25000000000,
        volume: 3500000000,
        users: 1500000,
      },
      timestamp: Date.now(),
      network_health: {
        active_addresses: 850000,
        new_addresses: 25000,
        transaction_volume: 12500,
        average_transaction_value: 5,
        fee_metrics: {
          average: 0.0045,
          median: 0.003,
          percentiles: [0.0015, 0.003, 0.0045, 0.006, 0.012],
          gas_price_prediction: {
            fast: 0.006,
            standard: 0.004,
            slow: 0.002,
          },
        },
        network_utilization: 0.65,
      },
      whale_tracking: {
        movements: [],
        concentration_metrics: {
          gini_coefficient: 0.78,
          top_holders_percentage: 42.5,
          distribution_analysis: [],
        },
        predictive_metrics: {
          price_impact_probability: 0.35,
          expected_movement: "up",
        },
      },
      defi_metrics: {
        total_value_locked: 25000000000,
        total_volume_24h: 3500000000,
        unique_users_24h: 1500000,
        protocol_breakdown: [],
      },
    };
  }
}

export const analyticsService = new AnalyticsService(webSocketService);
