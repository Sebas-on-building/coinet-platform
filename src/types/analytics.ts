// Enhanced Technical Analysis Types
export interface TechnicalIndicatorResult {
  value: number;
  signal: "buy" | "sell" | "neutral";
  confidence: number;
}

export interface BacktestResult {
  win_rate: number;
  profit_factor: number;
  max_drawdown: number;
  sharpe_ratio: number;
  trades: number;
}

export interface EnhancedTechnicalIndicator {
  name: string;
  value: number;
  signal?: "buy" | "sell" | "neutral";
  timestamp: number;
  metadata?: Record<string, any>;
  current: {
    value: number;
    signal: "buy" | "sell" | "neutral";
    confidence: number;
  };
  backtest_results: {
    win_rate: number;
    profit_factor: number;
    max_drawdown: number;
  };
}

// Enhanced Market Analysis Types
export interface MarketRegime {
  current: "trending" | "ranging" | "volatile";
  confidence: number;
  duration: number;
  historical_patterns: {
    pattern: string;
    similarity: number;
    expected_outcome: string;
  }[];
}

export interface LiquidityAnalysis {
  depth: number;
  spread: number;
  slippage_impact: number;
  orderbook_imbalance: number;
  market_impact_estimate: number;
}

export interface HistoricalVolatility {
  daily: number;
  weekly: number;
  monthly: number;
  volatility_regime: "low" | "medium" | "high";
}

export interface EnhancedMarketMetric {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  timestamp: number;
  trend: "up" | "down" | "neutral";
  label: string;
  historical_volatility: HistoricalVolatility;
  market_regime: MarketRegime;
  liquidity_analysis: LiquidityAnalysis;
}

// Enhanced Social Sentiment Types
export interface SentimentBreakdown {
  overall_score: number;
  sources: {
    twitter: number;
    reddit: number;
    news: number;
    github: number;
    telegram: number;
    discord: number;
  };
  momentum: number;
  change_24h: number;
}

export interface TopicAnalysis {
  topic: string;
  sentiment: number;
  volume: number;
  key_terms: string[];
  trending_score: number;
}

export interface InfluencerMetrics {
  user: string;
  platform: string;
  followers: number;
  sentiment_impact: number;
  reliability_score: number;
  recent_posts: {
    content: string;
    timestamp: number;
    engagement: {
      likes: number;
      comments: number;
      shares: number;
    };
    sentiment: number;
    price_impact: number;
  }[];
}

export interface NewsAnalytics {
  source: string;
  reliability_score: number;
  sentiment_accuracy: number;
  article_count_24h: number;
  topics: {
    name: string;
    volume: number;
    sentiment: number;
    impact_score: number;
  }[];
}

export interface EnhancedSocialMetrics {
  sentiment: {
    score: number;
    change: number;
    volume: number;
  };
  mentions: {
    total: number;
    change: number;
    sources: Record<string, number>;
  };
  influencers: {
    active: number;
    reach: number;
    engagement: number;
  };
  topics: Array<{
    name: string;
    mentions: number;
    sentiment: number;
  }>;
  timestamp: number;
  sentiment_analysis: SentimentBreakdown;
  correlation_analysis: {
    price_correlation: number;
    volume_correlation: number;
    sentiment_lead_lag: number;
  };
  topic_modeling: TopicAnalysis[];
  influencer_tracking: InfluencerMetrics[];
}

// Enhanced On-Chain Analytics Types
export interface NetworkMetrics {
  active_addresses: number;
  new_addresses: number;
  transaction_volume: number;
  average_transaction_value: number;
  fee_metrics: {
    average: number;
    median: number;
    percentiles: number[];
    gas_price_prediction: {
      fast: number;
      standard: number;
      slow: number;
    };
  };
  network_utilization: number;
}

export interface WhaleActivity {
  address: string;
  amount: number;
  direction: "in" | "out";
  timestamp: number;
  historical_behavior: {
    accuracy: number;
    average_holding_time: number;
    profit_loss: number;
  };
  related_addresses: string[];
}

export interface ConcentrationMetrics {
  gini_coefficient: number;
  top_holders_percentage: number;
  distribution_analysis: {
    bracket: string;
    holders: number;
    total_balance: number;
    percentage: number;
  }[];
}

export interface DeFiProtocolMetrics {
  name: string;
  type: "lending" | "dex" | "yield" | "bridge";
  tvl: number;
  volume_24h: number;
  apy: number;
  risk_score: number;
  security: {
    audit_status: "audited" | "in_progress" | "not_audited";
    audit_firms: string[];
    insurance_coverage: boolean;
    total_incidents: number;
    vulnerability_score: number;
  };
  metrics: {
    unique_users: number;
    transactions: number;
    revenue: number;
    growth_rate: number;
  };
}

export interface EnhancedOnChainMetrics {
  transactions: {
    count: number;
    volume: number;
    avgValue: number;
    change: number;
  };
  addresses: {
    active: number;
    new: number;
    total: number;
  };
  fees: {
    total: number;
    average: number;
    median: number;
  };
  mining: {
    hashrate: number;
    difficulty: number;
    rewards: number;
  };
  defi: {
    tvl: number;
    volume: number;
    users: number;
  };
  timestamp: number;
  network_health: NetworkMetrics;
  whale_tracking: {
    movements: WhaleActivity[];
    concentration_metrics: ConcentrationMetrics;
    predictive_metrics: {
      price_impact_probability: number;
      expected_movement: "up" | "down" | "neutral";
    };
  };
  defi_metrics: {
    total_value_locked: number;
    total_volume_24h: number;
    unique_users_24h: number;
    protocol_breakdown: DeFiProtocolMetrics[];
  };
}

// Enhanced Portfolio Analytics Types
export interface RiskMetrics {
  value_at_risk: {
    daily: number;
    weekly: number;
    monthly: number;
    confidence_level: number;
    stressed_var: number;
  };
  correlation_matrix: {
    [asset: string]: {
      [correlatedAsset: string]: number;
    };
  };
  tail_risk: {
    expected_shortfall: number;
    max_drawdown: number;
    recovery_time: number;
    stress_test_results: {
      scenario: string;
      impact: number;
    }[];
  };
}

export interface PerformanceAttribution {
  asset_contribution: {
    symbol: string;
    absolute_return: number;
    relative_contribution: number;
    risk_adjusted_return: number;
    sharpe_ratio: number;
  }[];
  factor_analysis: {
    factor: string;
    exposure: number;
    contribution: number;
    risk_contribution: number;
  }[];
  style_analysis: {
    style: string;
    exposure: number;
    r_squared: number;
  }[];
}

export interface PortfolioOptimization {
  rebalancing: {
    suggested_weights: {
      [asset: string]: number;
    };
    expected_improvement: {
      risk_reduction: number;
      return_increase: number;
      cost_estimate: number;
    };
    constraints_analysis: {
      constraint: string;
      status: "satisfied" | "violated";
      margin: number;
    }[];
  };
  tax_harvesting: {
    opportunities: {
      asset: string;
      loss_harvest: number;
      tax_savings: number;
      suggested_replacement: string;
      wash_sale_window: number;
    }[];
  };
}

export interface EnhancedPortfolioAnalytics {
  risk_metrics: RiskMetrics;
  performance_attribution: PerformanceAttribution;
  optimization_suggestions: PortfolioOptimization;
}

// Enhanced Smart Order Router Types
export interface RouteOptimization {
  split_routes: {
    dex: string;
    percentage: number;
    expected_output: number;
    price_impact: number;
    confidence: number;
  }[];
  gas_optimization: {
    estimated_savings: number;
    alternative_routes: {
      path: string[];
      gas_cost: number;
      output_difference: number;
      execution_time: number;
    }[];
  };
}

export interface MarketImpactAnalysis {
  simulation_results: {
    slippage: number;
    price_after_execution: number;
    volume_impact: number;
    recovery_time: number;
  };
  liquidity_analysis: {
    depth_chart: {
      price: number;
      cumulative_volume: number;
      side: "bid" | "ask";
    }[];
    orderbook_imbalance: number;
    volatility_adjustment: number;
  };
}

export interface ExecutionStrategy {
  type: "twap" | "vwap" | "adaptive";
  parameters: {
    interval?: number;
    window_size?: number;
    urgency_level?: number;
    target_participation_rate?: number;
  };
  estimates: {
    expected_price: number;
    completion_time: number;
    price_deviation_limit: number;
    cost_estimate: number;
  };
}

export interface EnhancedSmartOrderRouter {
  route_optimization: RouteOptimization;
  market_impact: MarketImpactAnalysis;
  execution_strategies: {
    recommended: ExecutionStrategy;
    alternatives: ExecutionStrategy[];
  };
  risk_analysis: {
    slippage_probability: number;
    front_running_risk: number;
    settlement_risk: number;
    smart_contract_risk: number;
  };
}
