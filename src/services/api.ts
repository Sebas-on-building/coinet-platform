import axios from "axios";

// Types
export interface SimpleCoinData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  market_cap_rank: number;
}

export interface OnChainData {
  active_addresses: number;
  transaction_volume: number;
  gas_used: number;
  hash_rate: number;
}

export interface SocialData {
  twitter_followers: number;
  twitter_mentions: number;
  reddit_subscribers: number;
  reddit_active_users: number;
  telegram_members: number;
  sentiment_score: number;
}

export interface TokenomicsData {
  market_cap: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  holders: number;
  fully_diluted_valuation: number;
  distribution: {
    category: string;
    amount: number;
    percentage: number;
  }[];
}

export interface TechnicalAnalysisData {
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  moving_averages: {
    ma200: number;
    ma50: number;
    ma20: number;
  };
  bollinger_bands: {
    upper: number;
    middle: number;
    lower: number;
  };
}

export interface MarketMetricsData {
  volatility_index: number;
  correlation: {
    spx: number;
    gold: number;
    nasdaq: number;
  };
  options_data: {
    total_volume: number;
    put_call_ratio: number;
    open_interest: number;
  };
  funding_rates: {
    binance: number;
    bybit: number;
    ftx: number;
  };
}

export interface AlertConfig {
  type: "price" | "volume" | "indicator";
  condition: "above" | "below" | "crosses";
  value: number;
  timeframe: string;
  notification: "email" | "push" | "both";
}

export interface CoinData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
}

export interface TradingSignal {
  asset: string;
  direction: "buy" | "sell" | "hold";
  confidence: number;
  timeframe: string;
  price_target: number;
  stop_loss: number;
  supporting_metrics: {
    technical: number;
    sentiment: number;
    onchain: number;
    fundamental: number;
  };
  reasoning: string[];
  timestamp: string;
}

export interface AIAnalysisResult {
  signal: TradingSignal;
  metrics: {
    price_momentum: number;
    volume_analysis: number;
    social_sentiment: number;
    market_correlation: number;
    whale_activity: number;
    technical_indicators: {
      rsi: number;
      macd: number;
      bollinger: number;
    };
  };
}

export interface RiskMetrics {
  valueAtRisk: {
    daily: number;
    weekly: number;
    monthly: number;
    confidence: number;
    historical: { date: string; value: number }[];
    conditionalVar: number;
    componentVar: { asset: string; value: number; percentage: number }[];
  };
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  beta: number;
  alpha: number;
  treynorRatio: number;
  informationRatio: number;
  calmarRatio: number;
  trackingError: number;
  downCapture: number;
  upCapture: number;
  correlationMatrix: {
    asset1: string;
    asset2: string;
    correlation: number;
    covariance: number;
    betweenReturn: number;
  }[];
  stressTests: {
    scenario: string;
    impact: number;
    description: string;
    affectedAssets: string[];
    probabilityScore: number;
    recoveryEstimate: {
      timeframe: string;
      percentage: number;
    };
    historicalPrecedent: {
      date: string;
      description: string;
      recovery: {
        duration: string;
        percentage: number;
      };
    };
  }[];
  riskContribution: {
    asset: string;
    contribution: number;
    volatility: number;
    tailRisk: number;
    liquidityScore: number;
    concentrationRisk: number;
    counterpartyRisk: {
      score: number;
      factors: string[];
    };
  }[];
  optimalPortfolio: {
    weights: {
      asset: string;
      current: number;
      suggested: number;
      reason: string[];
    }[];
    expectedReturn: number;
    expectedRisk: number;
    sharpeRatio: number;
    turnover: number;
    rebalancingCost: number;
  };
  riskDecomposition: {
    market: number;
    size: number;
    value: number;
    momentum: number;
    volatility: number;
    other: number;
  };
  scenarioAnalysis: {
    name: string;
    probability: number;
    impact: {
      portfolio: number;
      byAsset: { asset: string; impact: number }[];
    };
    triggers: string[];
    hedgingSuggestions: {
      instrument: string;
      allocation: number;
      cost: number;
      effectiveness: number;
    }[];
  }[];
  liquidityAnalysis: {
    portfolioScore: number;
    timeToLiquidate: { percentage: number; days: number; slippage: number }[];
    assetScores: {
      asset: string;
      score: number;
      averageVolume: number;
      daysToLiquidate: number;
    }[];
  };
}

export interface PortfolioAsset {
  symbol: string;
  amount: number;
  value_usd: number;
  weight: number;
  risk_score: number;
}

export interface SentimentData {
  overall_score: number;
  change_24h: number;
  social_metrics: {
    twitter: {
      followers: number;
      engagement_rate: number;
      sentiment_score: number;
      trending_hashtags: string[];
      influential_tweets: {
        author: string;
        followers: number;
        text: string;
        sentiment: number;
        engagement: number;
        timestamp: string;
      }[];
    };
    reddit: {
      active_users: number;
      post_count_24h: number;
      sentiment_score: number;
      top_posts: {
        title: string;
        upvotes: number;
        comments: number;
        sentiment: number;
        url: string;
      }[];
    };
    news: {
      article_count_24h: number;
      sentiment_score: number;
      top_articles: {
        title: string;
        source: string;
        sentiment: number;
        url: string;
        timestamp: string;
      }[];
    };
  };
  market_impact: {
    price_correlation: number;
    volume_correlation: number;
    predicted_impact: number;
  };
  word_cloud: {
    word: string;
    weight: number;
    sentiment: number;
  }[];
}

export interface CommunityMetrics {
  total_holders: number;
  active_wallets_24h: number;
  new_wallets_24h: number;
  average_holding_time: number;
  whale_concentration: number;
  github_stats: {
    stars: number;
    forks: number;
    commits_24h: number;
    active_contributors: number;
  };
}

export interface DeFiProtocol {
  name: string;
  type: "lending" | "dex" | "yield" | "bridge";
  tvl: number;
  apy: number;
  volume_24h: number;
  risk_score: number;
  supported_assets: string[];
  features: string[];
  security: {
    audit_status: "audited" | "in_progress" | "not_audited";
    audit_firm?: string;
    insurance_coverage: boolean;
    total_incidents: number;
  };
}

export interface LendingOpportunity {
  protocol: string;
  asset: string;
  supply_apy: number;
  borrow_apy: number;
  total_supplied: number;
  total_borrowed: number;
  utilization_rate: number;
  collateral_factor: number;
  liquidation_threshold: number;
}

export interface YieldOpportunity {
  protocol: string;
  pool_name: string;
  assets: string[];
  apy: number;
  tvl: number;
  risk_level: "low" | "medium" | "high";
  rewards_tokens: string[];
  min_deposit: number;
  fees: {
    deposit: number;
    withdrawal: number;
    performance: number;
  };
}

export interface SwapRoute {
  protocol: string;
  path: string[];
  portion: number;
  amount_out: number;
  price_impact: number;
  gas_estimate: number;
}

export interface SecurityMetrics {
  protocol: string;
  tvl: number;
  audit_status: {
    last_audit: string;
    auditor: string;
    score: number;
    critical_findings: number;
    resolved_findings: number;
    pending_findings: number;
  };
  insurance: {
    coverage_amount: number;
    coverage_ratio: number;
    provider: string;
    premium: number;
  };
  risk_metrics: {
    centralization_risk: number;
    complexity_score: number;
    admin_keys: number;
    timelock_delay: number;
    upgradeable_contracts: number;
  };
  monitoring: {
    anomaly_score: number;
    recent_events: {
      timestamp: string;
      type: "high_volume" | "unusual_tx" | "price_impact" | "governance";
      description: string;
      severity: "low" | "medium" | "high";
    }[];
    active_alerts: {
      type: string;
      description: string;
      threshold: number;
      current_value: number;
    }[];
  };
  security_score: number;
}

interface Route {
  protocol: string;
  path: string[];
  portion: number;
  expectedOutput: number;
  priceImpact: number;
  gasEstimate: number;
}

interface SwapParams {
  fromToken: string;
  toToken: string;
  amount: number;
  route: Route;
  slippageTolerance: number;
}

interface WhaleActivity {
  timestamp: string;
  from: string;
  to: string;
  amount: number;
  type: "transfer" | "swap" | "stake" | "unstake";
  token: string;
  value_usd: number;
}

interface NetworkMetrics {
  active_addresses: number;
  new_addresses: number;
  transaction_count: number;
  average_transaction_value: number;
  total_value_locked: number;
  gas_used: number;
  average_gas_price: number;
  miner_revenue: number;
  network_hash_rate: number;
  difficulty: number;
}

interface TradeMetrics {
  totalTrades: number;
  totalVolume: number;
  averageSize: number;
  successRate: number;
  averageSlippage: number;
  totalFees: number;
  profitLoss: number;
  bestTrade: number;
  worstTrade: number;
}

interface Trade {
  id: string;
  timestamp: string;
  pair: string;
  side: "buy" | "sell";
  type: "market" | "limit" | "stop";
  amount: number;
  price: number;
  total: number;
  fee: number;
  status: "completed" | "pending" | "failed";
  route: {
    protocol: string;
    path: string[];
    priceImpact: number;
    gasCost: number;
  };
}

// Add these interfaces before the ApiService class
interface VolatilityResponse {
  index: number;
}

interface CorrelationResponse {
  data: {
    spx: number;
    gold: number;
    nasdaq: number;
  };
}

interface OptionsResponse {
  data: {
    total_volume: number;
    put_call_ratio: number;
    open_interest: number;
  };
}

interface FundingResponse {
  rates: {
    binance: number;
    bybit: number;
    ftx: number;
  };
}

interface TwitterSentimentResponse {
  data: {
    sentiment: number;
    volume: number;
    trending: string[];
  };
}

interface RedditSentimentResponse {
  data: {
    sentiment: number;
    active_users: number;
    posts: any[];
  };
}

interface NewsSentimentResponse {
  data: {
    sentiment: number;
    articles: any[];
    impact: number;
  };
}

// API Configuration
const COINGECKO_API = "https://api.coingecko.com/api/v3";
const ETHERSCAN_API = "https://api.etherscan.io/api";
const TWITTER_API = "https://api.twitter.com/2";
const BINANCE_API = "https://api.binance.com/api/v3";
const TRADINGVIEW_API = "https://scanner.tradingview.com/crypto/scan";

class ApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl =
      process.env.NEXT_PUBLIC_API_URL || "https://api.coinet.example.com";
    this.apiKey = process.env.NEXT_PUBLIC_API_KEY || "demo-key";
  }

  public async get<T>(
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<T> {
    try {
      // In development mode, always use mock data to avoid network errors
      if (process.env.NODE_ENV === "development") {
        console.log(`[DEV] Using mock data for endpoint: ${endpoint}`);
        return this.getMockData<T>(endpoint);
      }

      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        // Add timeout to prevent hanging requests
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      console.error(`API request failed: GET ${endpoint}`, error);
      // Return mock data on error for graceful degradation
      return this.getMockData<T>(endpoint);
    }
  }

  public async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await axios.post(`${this.baseUrl}${endpoint}`, data, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  }

  public async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await axios.put(`${this.baseUrl}${endpoint}`, data, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  }

  public async delete<T>(endpoint: string): Promise<T> {
    const response = await axios.delete(`${this.baseUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  }

  async getCoinData(coinId: string): Promise<CoinData> {
    try {
      // Use mock implementation for demo purposes
      // const response = await fetch(`${this.baseUrl}/coins/${coinId}`);
      // if (!response.ok) {
      //   throw new Error(`Failed to fetch coin data: ${response.statusText}`);
      // }
      // return await response.json();

      // Return mock data instead
      return {
        id: coinId,
        symbol: coinId.toUpperCase(),
        name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
        current_price: 45000 + Math.random() * 1000,
        market_cap: 850000000000,
        market_cap_rank: 1,
        total_volume: 25000000000,
        high_24h: 46000,
        low_24h: 44000,
        price_change_24h: 500,
        price_change_percentage_24h: 1.2,
        circulating_supply: 19000000,
        total_supply: 21000000,
        max_supply: 21000000,
        ath: 69000,
        ath_change_percentage: -34.5,
        ath_date: "2021-11-10T00:00:00.000Z",
        atl: 67.81,
        atl_change_percentage: 66000,
        atl_date: "2013-07-06T00:00:00.000Z",
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching coin data:", error);
      // Return fallback/mock data
      return {
        id: coinId,
        symbol: coinId.toUpperCase(),
        name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
        current_price: 45000,
        market_cap: 850000000000,
        market_cap_rank: 1,
        total_volume: 25000000000,
        high_24h: 46000,
        low_24h: 44000,
        price_change_24h: 500,
        price_change_percentage_24h: 1.2,
        circulating_supply: 19000000,
        total_supply: 21000000,
        max_supply: 21000000,
        ath: 69000,
        ath_change_percentage: -34.5,
        ath_date: "2021-11-10T00:00:00.000Z",
        atl: 67.81,
        atl_change_percentage: 66000,
        atl_date: "2013-07-06T00:00:00.000Z",
        last_updated: new Date().toISOString(),
      };
    }
  }

  async getMarketData(
    vs_currency = "usd",
    per_page = 100,
    page = 1,
  ): Promise<CoinData[]> {
    const response = await fetch(
      `${this.baseUrl}/coins/markets?vs_currency=${vs_currency}&order=market_cap_desc&per_page=${per_page}&page=${page}&sparkline=false`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch market data: ${response.statusText}`);
    }
    const data = await response.json();
    return data.map(this.transformCoinData);
  }

  private transformCoinData(data: any): CoinData {
    return {
      id: data.id,
      symbol: data.symbol,
      name: data.name,
      current_price: data.current_price,
      market_cap: data.market_cap,
      market_cap_rank: data.market_cap_rank,
      total_volume: data.total_volume,
      high_24h: data.high_24h,
      low_24h: data.low_24h,
      price_change_24h: data.price_change_24h,
      price_change_percentage_24h: data.price_change_percentage_24h,
      circulating_supply: data.circulating_supply,
      total_supply: data.total_supply,
      max_supply: data.max_supply,
      ath: data.ath,
      ath_change_percentage: data.ath_change_percentage,
      ath_date: data.ath_date,
      atl: data.atl,
      atl_change_percentage: data.atl_change_percentage,
      atl_date: data.atl_date,
      last_updated: data.last_updated,
    };
  }

  // Price and Market Data
  async getPriceHistory(coinId: string, days: number = 7) {
    return this.get(
      `${COINGECKO_API}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`,
    );
  }

  // On-Chain Data
  async getOnChainMetrics(chain: string): Promise<NetworkMetrics> {
    // In a real implementation, this would fetch data from blockchain APIs
    // For now, we'll return mock data
    return {
      active_addresses: 850000,
      new_addresses: 25000,
      transaction_count: 1200000,
      average_transaction_value: 0.5,
      total_value_locked: 45000000000,
      gas_used: 80000000000,
      average_gas_price: 25,
      miner_revenue: 1500000,
      network_hash_rate: 350000000,
      difficulty: 48000000000000,
    };
  }

  // Social Data
  async getSocialMetrics(coinId: string): Promise<SocialData> {
    // Implementation will depend on social media APIs
    // This is a placeholder that would normally use Twitter API and others
    return this.get(`${TWITTER_API}/tweets/search/recent?query=${coinId}`);
  }

  // Tokenomics Data
  async getTokenomics(token: string): Promise<TokenomicsData> {
    // In a real implementation, this would fetch data from CoinGecko/Token contracts
    // For now, we'll return mock data
    return {
      market_cap: 800000000000,
      circulating_supply: 19500000,
      total_supply: 21000000,
      max_supply: 21000000,
      holders: 450000,
      fully_diluted_valuation: 860000000000,
      distribution: [
        {
          category: "Circulating Supply",
          amount: 19500000,
          percentage: 92.86,
        },
        {
          category: "Mining Reserve",
          amount: 1500000,
          percentage: 7.14,
        },
        {
          category: "Team & Advisors",
          amount: 0,
          percentage: 0,
        },
        {
          category: "Development Fund",
          amount: 0,
          percentage: 0,
        },
      ],
    };
  }

  // Trading/Execution Data
  async getTradeHistory(timeframe: "1d" | "7d" | "30d"): Promise<Trade[]> {
    // In a real implementation, this would fetch from your trading platform's API
    // For now, we'll return mock data
    return Array(20)
      .fill(null)
      .map((_, i) => ({
        id: `trade-${i}`,
        timestamp: new Date(
          Date.now() - Math.random() * 86400000 * 7,
        ).toISOString(),
        pair: ["BTC/USDT", "ETH/USDT", "SOL/USDT"][
          Math.floor(Math.random() * 3)
        ],
        side: Math.random() > 0.5 ? "buy" : "sell",
        type: ["market", "limit", "stop"][Math.floor(Math.random() * 3)] as
          | "market"
          | "limit"
          | "stop",
        amount: Math.random() * 10,
        price: Math.random() * 50000,
        total: Math.random() * 500000,
        fee: Math.random() * 100,
        status: ["completed", "pending", "failed"][
          Math.floor(Math.random() * 3)
        ] as "completed" | "pending" | "failed",
        route: {
          protocol: ["Uniswap", "Curve", "1inch"][
            Math.floor(Math.random() * 3)
          ],
          path: ["USDT", "WETH", "WBTC"].slice(
            0,
            Math.floor(Math.random() * 2) + 2,
          ),
          priceImpact: Math.random() * 2,
          gasCost: Math.random() * 50,
        },
      }));
  }

  // Advanced Technical Analysis
  async getTechnicalAnalysis(
    coinId: string,
    timeframe: string,
  ): Promise<TechnicalAnalysisData> {
    // Implementation would integrate with TradingView API or similar
    return this.get(
      `${TRADINGVIEW_API}/analysis?symbol=${coinId}&timeframe=${timeframe}`,
    );
  }

  // Advanced Market Metrics
  async getMarketMetrics(coinId: string): Promise<MarketMetricsData> {
    // Implementation would aggregate data from multiple sources
    const [volatility, correlation, options, funding] = await Promise.all([
      this.get<VolatilityResponse>(`${BINANCE_API}/volatility/${coinId}`),
      this.get<CorrelationResponse>(`${COINGECKO_API}/correlation/${coinId}`),
      this.get<OptionsResponse>(`${BINANCE_API}/options/${coinId}`),
      this.get<FundingResponse>(`${BINANCE_API}/funding/${coinId}`),
    ]);

    return {
      volatility_index: volatility.index,
      correlation: correlation.data,
      options_data: options.data,
      funding_rates: funding.rates,
    };
  }

  // Portfolio Analytics
  async getPortfolioAnalytics(addresses: string[]) {
    // Implementation would analyze wallet addresses and their holdings
    return Promise.all(
      addresses.map((address) =>
        this.get(`${ETHERSCAN_API}/account/portfolio?address=${address}`),
      ),
    );
  }

  // Custom Alerts
  async setAlert(config: AlertConfig) {
    // Implementation would set up custom price/indicator alerts
    return this.post("/alerts", config);
  }

  // Historical Analysis
  async getHistoricalAnalysis(coinId: string, timeframe: string) {
    // Implementation would provide detailed historical performance metrics
    return this.get(
      `${COINGECKO_API}/coins/${coinId}/historical_analysis?timeframe=${timeframe}`,
    );
  }

  // Market Sentiment Analysis
  async getDetailedSentiment(coinId: string) {
    // Implementation would provide comprehensive sentiment analysis
    const [twitter, reddit, news] = await Promise.all([
      this.get<TwitterSentimentResponse>(`${TWITTER_API}/sentiment/${coinId}`),
      this.get<RedditSentimentResponse>(`${COINGECKO_API}/reddit/${coinId}`),
      this.get<NewsSentimentResponse>(`${COINGECKO_API}/news/${coinId}`),
    ]);

    return {
      twitter_sentiment: twitter.data,
      reddit_sentiment: reddit.data,
      news_sentiment: news.data,
    };
  }

  // AI Trading Signals
  async getAISignals(assets: string[]): Promise<TradingSignal[]> {
    // In a real implementation, this would call your AI model endpoint
    // For now, we'll return mock data
    return assets.map((asset) => ({
      asset,
      direction: Math.random() > 0.5 ? "buy" : "sell",
      confidence: Math.floor(Math.random() * 30) + 70, // 70-100
      timeframe: "4h",
      price_target: Math.floor(Math.random() * 5000) + 45000,
      stop_loss: Math.floor(Math.random() * 5000) + 40000,
      supporting_metrics: {
        technical: Math.floor(Math.random() * 20) + 80,
        sentiment: Math.floor(Math.random() * 20) + 80,
        onchain: Math.floor(Math.random() * 20) + 80,
        fundamental: Math.floor(Math.random() * 20) + 80,
      },
      reasoning: [
        "Strong accumulation by whales",
        "Positive funding rates",
        "Bullish RSI divergence",
        "Increased social sentiment",
      ],
      timestamp: new Date().toISOString(),
    }));
  }

  async getDetailedAIAnalysis(asset: string): Promise<AIAnalysisResult> {
    // This would integrate with your AI model for detailed analysis
    const signal = (await this.getAISignals([asset]))[0];

    return {
      signal,
      metrics: {
        price_momentum: Math.random() * 100,
        volume_analysis: Math.random() * 100,
        social_sentiment: Math.random() * 100,
        market_correlation: Math.random() * 100,
        whale_activity: Math.random() * 100,
        technical_indicators: {
          rsi: Math.random() * 100,
          macd: Math.random() * 100,
          bollinger: Math.random() * 100,
        },
      },
    };
  }

  // Risk Management APIs
  async getRiskMetrics(
    timeframe: "1d" | "1w" | "1m",
    confidenceLevel: number,
  ): Promise<RiskMetrics> {
    // In a real implementation, this would calculate actual risk metrics
    // For now, we'll return mock data
    return {
      valueAtRisk: {
        daily: 5000 * (confidenceLevel === 0.99 ? 1.5 : 1),
        weekly: 12000 * (confidenceLevel === 0.99 ? 1.5 : 1),
        monthly: 25000 * (confidenceLevel === 0.99 ? 1.5 : 1),
        confidence: confidenceLevel,
        historical: [
          { date: "2024-03-01", value: 4800 },
          { date: "2024-03-02", value: 5100 },
          { date: "2024-03-03", value: 4950 },
        ],
        conditionalVar: 6500,
        componentVar: [
          { asset: "BTC", value: 2500, percentage: 0.45 },
          { asset: "ETH", value: 2000, percentage: 0.35 },
          { asset: "SOL", value: 1000, percentage: 0.2 },
        ],
      },
      sharpeRatio: 1.8,
      sortinoRatio: 2.1,
      maxDrawdown: -15.3,
      beta: 0.85,
      alpha: 12.5,
      treynorRatio: 0.95,
      informationRatio: 1.2,
      calmarRatio: 1.5,
      trackingError: 3.2,
      downCapture: 0.75,
      upCapture: 0.85,
      correlationMatrix: [
        {
          asset1: "BTC",
          asset2: "ETH",
          correlation: 0.85,
          covariance: 0.012,
          betweenReturn: 0.65,
        },
        {
          asset1: "BTC",
          asset2: "SOL",
          correlation: 0.65,
          covariance: 0.008,
          betweenReturn: 0.45,
        },
        {
          asset1: "ETH",
          asset2: "SOL",
          correlation: 0.72,
          covariance: 0.009,
          betweenReturn: 0.55,
        },
      ],
      stressTests: [
        {
          scenario: "Market Crash",
          impact: -25.5,
          description: "Simulates a severe market downturn similar to May 2021",
          affectedAssets: ["BTC", "ETH", "SOL"],
          probabilityScore: 0.15,
          recoveryEstimate: {
            timeframe: "3-6 months",
            percentage: 85,
          },
          historicalPrecedent: {
            date: "2021-05-19",
            description: "China crypto ban and Tesla Bitcoin suspension",
            recovery: {
              duration: "4 months",
              percentage: 82,
            },
          },
        },
        {
          scenario: "Regulatory Crackdown",
          impact: -15.2,
          description:
            "Simulates increased regulatory pressure on crypto markets",
          affectedAssets: ["BTC", "ETH"],
          probabilityScore: 0.25,
          recoveryEstimate: {
            timeframe: "1-2 months",
            percentage: 92,
          },
          historicalPrecedent: {
            date: "2021-09-24",
            description: "China crypto trading ban",
            recovery: {
              duration: "2 months",
              percentage: 95,
            },
          },
        },
        {
          scenario: "DeFi Exploit",
          impact: -8.5,
          description: "Simulates a major DeFi protocol security breach",
          affectedAssets: ["ETH", "SOL"],
          probabilityScore: 0.2,
          recoveryEstimate: {
            timeframe: "2-4 weeks",
            percentage: 95,
          },
          historicalPrecedent: {
            date: "2022-03-29",
            description: "Ronin Bridge Exploit",
            recovery: {
              duration: "3 weeks",
              percentage: 92,
            },
          },
        },
      ],
      riskContribution: [
        {
          asset: "BTC",
          contribution: 0.45,
          volatility: 65.2,
          tailRisk: 12.5,
          liquidityScore: 95,
          concentrationRisk: 0.45,
          counterpartyRisk: {
            score: 0.2,
            factors: ["Exchange concentration", "Mining pool distribution"],
          },
        },
        {
          asset: "ETH",
          contribution: 0.35,
          volatility: 75.8,
          tailRisk: 15.2,
          liquidityScore: 92,
          concentrationRisk: 0.35,
          counterpartyRisk: {
            score: 0.25,
            factors: ["Staking concentration", "DeFi exposure"],
          },
        },
        {
          asset: "SOL",
          contribution: 0.2,
          volatility: 85.4,
          tailRisk: 18.5,
          liquidityScore: 85,
          concentrationRisk: 0.2,
          counterpartyRisk: {
            score: 0.35,
            factors: ["Validator concentration", "Network stability"],
          },
        },
      ],
      optimalPortfolio: {
        weights: [
          {
            asset: "BTC",
            current: 0.45,
            suggested: 0.4,
            reason: ["High correlation with ETH", "Reduce concentration risk"],
          },
          {
            asset: "ETH",
            current: 0.35,
            suggested: 0.35,
            reason: ["Optimal exposure", "Good risk-adjusted returns"],
          },
          {
            asset: "SOL",
            current: 0.2,
            suggested: 0.25,
            reason: ["Diversification benefits", "Strong momentum"],
          },
        ],
        expectedReturn: 15.5,
        expectedRisk: 12.8,
        sharpeRatio: 1.95,
        turnover: 0.1,
        rebalancingCost: 250,
      },
      riskDecomposition: {
        market: 0.45,
        size: 0.15,
        value: 0.12,
        momentum: 0.18,
        volatility: 0.08,
        other: 0.02,
      },
      scenarioAnalysis: [
        {
          name: "Fed Rate Hike",
          probability: 0.65,
          impact: {
            portfolio: -8.5,
            byAsset: [
              { asset: "BTC", impact: -10.2 },
              { asset: "ETH", impact: -7.8 },
              { asset: "SOL", impact: -6.5 },
            ],
          },
          triggers: [
            "Inflation above 4%",
            "Strong employment data",
            "Hawkish Fed comments",
          ],
          hedgingSuggestions: [
            {
              instrument: "Inverse ETF",
              allocation: 0.1,
              cost: 150,
              effectiveness: 0.85,
            },
            {
              instrument: "Put Options",
              allocation: 0.05,
              cost: 250,
              effectiveness: 0.92,
            },
          ],
        },
      ],
      liquidityAnalysis: {
        portfolioScore: 92,
        timeToLiquidate: [
          { percentage: 25, days: 1, slippage: 0.2 },
          { percentage: 50, days: 2, slippage: 0.5 },
          { percentage: 100, days: 5, slippage: 1.2 },
        ],
        assetScores: [
          {
            asset: "BTC",
            score: 95,
            averageVolume: 25000000000,
            daysToLiquidate: 1,
          },
          {
            asset: "ETH",
            score: 92,
            averageVolume: 15000000000,
            daysToLiquidate: 2,
          },
          {
            asset: "SOL",
            score: 85,
            averageVolume: 2000000000,
            daysToLiquidate: 3,
          },
        ],
      },
    };
  }

  async getPortfolioAssets(): Promise<PortfolioAsset[]> {
    // In a real implementation, this would fetch actual portfolio data
    // For now, we'll return mock data
    return [
      {
        symbol: "BTC",
        amount: 1.5,
        value_usd: 45000,
        weight: 0.45,
        risk_score: 7.5,
      },
      {
        symbol: "ETH",
        amount: 15,
        value_usd: 35000,
        weight: 0.35,
        risk_score: 8.2,
      },
      {
        symbol: "SOL",
        amount: 250,
        value_usd: 20000,
        weight: 0.2,
        risk_score: 8.8,
      },
    ];
  }

  // Social & Sentiment Analysis APIs
  async getSentimentData(
    asset: string,
    timeframe: "1h" | "24h" | "7d",
  ): Promise<SentimentData> {
    // In a real implementation, this would fetch data from social media APIs and news sources
    // For now, we'll return mock data
    return {
      overall_score: 75,
      change_24h: 5.2,
      social_metrics: {
        twitter: {
          followers: 2500000,
          engagement_rate: 3.8,
          sentiment_score: 82,
          trending_hashtags: [
            "#Bitcoin",
            "#BTC",
            "#Crypto",
            "#ToTheMoon",
            "#HODL",
          ],
          influential_tweets: [
            {
              author: "CryptoAnalyst",
              followers: 150000,
              text: "Bitcoin showing strong fundamentals with increasing institutional adoption. Bullish signal confirmed! 🚀",
              sentiment: 0.85,
              engagement: 12000,
              timestamp: new Date().toISOString(),
            },
            // Add more tweets as needed
          ],
        },
        reddit: {
          active_users: 125000,
          post_count_24h: 850,
          sentiment_score: 78,
          top_posts: [
            {
              title: "Major institutional investment in Bitcoin announced",
              upvotes: 5200,
              comments: 1200,
              sentiment: 0.92,
              url: "https://reddit.com/r/cryptocurrency/post1",
            },
            // Add more posts as needed
          ],
        },
        news: {
          article_count_24h: 342,
          sentiment_score: 71,
          top_articles: [
            {
              title:
                "Bitcoin Adoption Soars as Major Retailers Embrace Crypto Payments",
              source: "CryptoNews",
              sentiment: 0.88,
              url: "https://cryptonews.com/article1",
              timestamp: new Date().toISOString(),
            },
            // Add more articles as needed
          ],
        },
      },
      market_impact: {
        price_correlation: 0.65,
        volume_correlation: 0.58,
        predicted_impact: 2.5,
      },
      word_cloud: [
        { word: "adoption", weight: 0.85, sentiment: 1 },
        { word: "institutional", weight: 0.75, sentiment: 1 },
        { word: "regulation", weight: 0.65, sentiment: -0.5 },
        // Add more words as needed
      ],
    };
  }

  async getCommunityMetrics(asset: string): Promise<CommunityMetrics> {
    // In a real implementation, this would fetch data from blockchain explorers and GitHub API
    // For now, we'll return mock data
    return {
      total_holders: 950000,
      active_wallets_24h: 125000,
      new_wallets_24h: 2500,
      average_holding_time: 185,
      whale_concentration: 35.8,
      github_stats: {
        stars: 65000,
        forks: 12500,
        commits_24h: 45,
        active_contributors: 125,
      },
    };
  }

  // DeFi Integration APIs
  async getDefiProtocols(): Promise<DeFiProtocol[]> {
    // In a real implementation, this would fetch data from various DeFi protocols
    // For now, we'll return mock data
    return [
      {
        name: "Aave V3",
        type: "lending",
        tvl: 5200000000,
        apy: 4.2,
        volume_24h: 320000000,
        risk_score: 2,
        supported_assets: ["USDC", "ETH", "WBTC", "DAI"],
        features: ["flash loans", "isolation mode", "efficiency mode"],
        security: {
          audit_status: "audited",
          audit_firm: "OpenZeppelin",
          insurance_coverage: true,
          total_incidents: 0,
        },
      },
      {
        name: "Uniswap V3",
        type: "dex",
        tvl: 3800000000,
        apy: 15.8,
        volume_24h: 850000000,
        risk_score: 3,
        supported_assets: ["ETH", "USDC", "WBTC"],
        features: ["concentrated liquidity", "multiple fee tiers"],
        security: {
          audit_status: "audited",
          audit_firm: "Trail of Bits",
          insurance_coverage: false,
          total_incidents: 0,
        },
      },
      // Add more protocols as needed
    ];
  }

  async getLendingOpportunities(asset: string): Promise<LendingOpportunity[]> {
    // In a real implementation, this would fetch data from lending protocols
    // For now, we'll return mock data
    return [
      {
        protocol: "Aave V3",
        asset,
        supply_apy: 4.2,
        borrow_apy: 5.8,
        total_supplied: 850000000,
        total_borrowed: 520000000,
        utilization_rate: 0.65,
        collateral_factor: 0.8,
        liquidation_threshold: 0.85,
      },
      {
        protocol: "Compound V3",
        asset,
        supply_apy: 3.8,
        borrow_apy: 5.2,
        total_supplied: 620000000,
        total_borrowed: 380000000,
        utilization_rate: 0.58,
        collateral_factor: 0.75,
        liquidation_threshold: 0.8,
      },
      // Add more opportunities as needed
    ];
  }

  async getYieldOpportunities(asset: string): Promise<YieldOpportunity[]> {
    // In a real implementation, this would fetch data from yield aggregators
    // For now, we'll return mock data
    return [
      {
        protocol: "Yearn Finance",
        pool_name: `${asset} Optimal`,
        assets: [asset],
        apy: 8.5,
        tvl: 250000000,
        risk_level: "medium",
        rewards_tokens: ["YFI"],
        min_deposit: 100,
        fees: {
          deposit: 0,
          withdrawal: 0.1,
          performance: 20,
        },
      },
      {
        protocol: "Convex Finance",
        pool_name: `${asset}-ETH LP`,
        assets: [asset, "ETH"],
        apy: 12.8,
        tvl: 180000000,
        risk_level: "high",
        rewards_tokens: ["CVX", "CRV"],
        min_deposit: 1000,
        fees: {
          deposit: 0,
          withdrawal: 0,
          performance: 16,
        },
      },
      // Add more opportunities as needed
    ];
  }

  async getBestSwapRoutes(
    fromToken: string,
    toToken: string,
    amount: number,
  ): Promise<SwapRoute[]> {
    // In a real implementation, this would fetch data from DEX aggregators
    // For now, we'll return mock data
    return [
      {
        protocol: "Uniswap V3",
        path: [fromToken, toToken],
        portion: 0.7,
        amount_out: amount * 1800,
        price_impact: 0.15,
        gas_estimate: 120000,
      },
      {
        protocol: "SushiSwap",
        path: [fromToken, toToken],
        portion: 0.3,
        amount_out: amount * 1795,
        price_impact: 0.08,
        gas_estimate: 110000,
      },
      // Add more routes as needed
    ];
  }

  async getProtocolSecurityMetrics(protocol: string): Promise<SecurityMetrics> {
    // In a real implementation, this would fetch data from security monitoring services
    // For now, we'll return mock data
    return {
      protocol: protocol.toUpperCase(),
      tvl: 5200000000,
      audit_status: {
        last_audit: "2024-02-15",
        auditor: "OpenZeppelin",
        score: 92,
        critical_findings: 0,
        resolved_findings: 12,
        pending_findings: 2,
      },
      insurance: {
        coverage_amount: 100000000,
        coverage_ratio: 0.85,
        provider: "Nexus Mutual",
        premium: 2.5,
      },
      risk_metrics: {
        centralization_risk: 25,
        complexity_score: 45,
        admin_keys: 3,
        timelock_delay: 172800, // 48 hours
        upgradeable_contracts: 5,
      },
      monitoring: {
        anomaly_score: 15,
        recent_events: [
          {
            timestamp: new Date().toISOString(),
            type: "high_volume",
            description: "Unusual spike in transaction volume detected",
            severity: "medium",
          },
          {
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            type: "governance",
            description: "New governance proposal submitted",
            severity: "low",
          },
        ],
        active_alerts: [
          {
            type: "Utilization Rate",
            description: "Pool utilization approaching maximum threshold",
            threshold: 80,
            current_value: 75.5,
          },
          {
            type: "Price Impact",
            description: "Large trades may cause significant slippage",
            threshold: 1,
            current_value: 0.85,
          },
        ],
      },
      security_score: 85,
    };
  }

  async getGasPrice(): Promise<number> {
    // In a real implementation, this would fetch from an Ethereum node
    // For now, we'll return a mock value
    return 25 * 1e9; // 25 gwei
  }

  async executeSwap(params: SwapParams): Promise<{ txHash: string }> {
    // In a real implementation, this would execute the swap through smart contracts
    // For now, we'll return a mock transaction hash
    return {
      txHash: `0x${Array(64)
        .fill(0)
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join("")}`,
    };
  }

  async getWhaleActivity(
    chain: string,
    timeframe: "24h" | "7d" | "30d",
  ): Promise<WhaleActivity[]> {
    // In a real implementation, this would fetch data from blockchain explorers
    // For now, we'll return mock data
    return Array(10)
      .fill(null)
      .map(() => ({
        timestamp: new Date(
          Date.now() - Math.random() * 86400000,
        ).toISOString(),
        from: `0x${Array(40)
          .fill(0)
          .map(() => Math.floor(Math.random() * 16).toString(16))
          .join("")}`,
        to: `0x${Array(40)
          .fill(0)
          .map(() => Math.floor(Math.random() * 16).toString(16))
          .join("")}`,
        amount: Math.floor(Math.random() * 1000),
        type: ["transfer", "swap", "stake", "unstake"][
          Math.floor(Math.random() * 4)
        ] as "transfer" | "swap" | "stake" | "unstake",
        token: ["ETH", "USDC", "WBTC"][Math.floor(Math.random() * 3)],
        value_usd: Math.floor(Math.random() * 1000000),
      }));
  }

  async getTradeMetrics(timeframe: "1d" | "7d" | "30d"): Promise<TradeMetrics> {
    // In a real implementation, this would calculate actual metrics
    // For now, we'll return mock data
    return {
      totalTrades: 156,
      totalVolume: 2500000,
      averageSize: 16025.64,
      successRate: 98.7,
      averageSlippage: 0.15,
      totalFees: 3750,
      profitLoss: 125000,
      bestTrade: 45000,
      worstTrade: -12000,
    };
  }

  // Helper method to generate mock data based on endpoint
  private getMockData<T>(endpoint: string): T {
    // Mock data implementations based on endpoint patterns
    // This allows the demo to work without real API connections
    if (endpoint.includes("/coins/")) {
      return this.getCoinData(
        endpoint.split("/").pop() || "bitcoin",
      ) as unknown as T;
    }

    // Default fallback
    return {} as T;
  }
}

export const api = new ApiService();
