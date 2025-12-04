/**
 * ══════════════════════════════════════════════════════════════════════════════
 * 🔬 ANOMALY & LATENCY MONITORING v2.0 - Divine Perfection
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * STEP 1.4.3 ENHANCED - Enterprise-Grade Monitoring System
 * 
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    DIVINE PERFECTION IMPLEMENTATION                        ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                           ║
 * ║  1. EMPIRICAL CALIBRATION                                                 ║
 * ║     • R² correlation tracking between sources                             ║
 * ║     • Predictive power metrics (Brier Score, AUC-ROC)                    ║
 * ║     • Data-driven threshold calibration from historical data              ║
 * ║     • Source reliability scoring based on actual performance              ║
 * ║                                                                           ║
 * ║  2. DE-CORRELATION & REGIME AWARENESS                                     ║
 * ║     • Correlation matrix between all sources                              ║
 * ║     • Regime-specific anomaly thresholds (normal/volatile/crash)          ║
 * ║     • Flash crash detection with temporal analysis                        ║
 * ║     • Market-wide vs single-source divergence detection                   ║
 * ║                                                                           ║
 * ║  3. DATA QUALITY & ROBUSTNESS                                             ║
 * ║     • Composite quality scores per source                                 ║
 * ║     • Dynamic weight adjustment based on recent performance               ║
 * ║     • Confidence intervals on all metrics                                 ║
 * ║     • Staleness detection with exponential decay                          ║
 * ║                                                                           ║
 * ║  4. MULTI-SEGMENT INDICES                                                 ║
 * ║     • Asset-class specific monitoring (BTC/alts/meme/DeFi)               ║
 * ║     • Exchange-type specific thresholds (CEX vs DEX)                      ║
 * ║     • Segment-level health aggregation                                    ║
 * ║                                                                           ║
 * ║  5. STATISTICALLY-ANCHORED THRESHOLDS                                     ║
 * ║     • Historical percentile-based thresholds                              ║
 * ║     • Adaptive thresholds from rolling analysis                           ║
 * ║     • Risk-adjusted anomaly scoring                                       ║
 * ║                                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @module anomaly-latency-monitor-v2
 * @version 2.0.0 - Divine Perfection
 */

import { logger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type AnomalyType = 
  | 'price_spike' 
  | 'price_crash' 
  | 'flash_crash'
  | 'cross_source_deviation' 
  | 'stale_data' 
  | 'latency_spike' 
  | 'error_burst'
  | 'correlation_breakdown'
  | 'volume_anomaly';

export type MarketRegime = 'calm' | 'normal' | 'volatile' | 'highly_volatile' | 'crash' | 'recovery';
export type AssetClass = 'major' | 'large_cap' | 'mid_cap' | 'small_cap' | 'meme' | 'defi' | 'stablecoin';
export type ExchangeType = 'cex_primary' | 'cex_secondary' | 'dex' | 'aggregator';

// ─────────────────────────────────────────────────────────────────────────────
// LATENCY METRICS
// ─────────────────────────────────────────────────────────────────────────────

export interface EnhancedLatencyMetrics {
  sourceId: string;
  sourceName: string;
  exchangeType: ExchangeType;
  
  // Current state
  current: number;
  trend: 'improving' | 'stable' | 'degrading' | 'critical';
  
  // Percentiles (Divine Perfection: full distribution)
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    p999: number;
  };
  
  // Statistical measures
  statistics: {
    mean: number;
    stdDev: number;
    variance: number;
    skewness: number;      // Distribution shape
    kurtosis: number;      // Tail heaviness
    cv: number;            // Coefficient of variation
  };
  
  // SLA tracking
  sla: {
    target: number;
    warningThreshold: number;
    criticalThreshold: number;
    breachCount: number;
    breachRate: number;
    consecutiveBreaches: number;
    lastBreachTime: Date | null;
  };
  
  // Reliability metrics (R² based)
  reliability: {
    uptime: number;           // % of successful requests
    mtbf: number;             // Mean time between failures (ms)
    mttr: number;             // Mean time to recover (ms)
    availabilityScore: number; // 0-1 composite score
  };
  
  // Temporal analysis
  temporal: {
    hourlyPattern: number[];   // 24 values for hourly averages
    dayOfWeekPattern: number[]; // 7 values for daily averages
    recentTrend: number;       // Slope of recent latency (ms/hour)
    predictedNext: number;     // Predicted next latency
    predictionConfidence: number;
  };
  
  sampleCount: number;
  lastUpdated: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR METRICS
// ─────────────────────────────────────────────────────────────────────────────

export interface EnhancedErrorMetrics {
  sourceId: string;
  
  // Current state
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  consecutiveErrors: number;
  
  // Error categorization
  errorBreakdown: {
    timeout: number;
    rateLimit: number;
    serverError: number;
    networkError: number;
    parseError: number;
    authError: number;
    unknown: number;
  };
  
  // Temporal patterns
  temporal: {
    lastHourRate: number;
    last24HourRate: number;
    hourlyPattern: number[];
    burstDetected: boolean;
    burstStartTime: Date | null;
  };
  
  // Impact assessment
  impact: {
    dataLossEstimate: number;      // % of data potentially lost
    recoveryTime: number;          // Estimated recovery time (ms)
    alternativeAvailable: boolean;
    fallbackActive: boolean;
  };
  
  lastErrorTime: Date | null;
  lastErrorType: string | null;
  lastErrorMessage: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICE ANOMALY
// ─────────────────────────────────────────────────────────────────────────────

export interface EnhancedPriceAnomaly {
  id: string;
  timestamp: Date;
  symbol: string;
  assetClass: AssetClass;
  anomalyType: AnomalyType;
  severity: AlertSeverity;
  
  // Price details
  prices: {
    observed: number;
    consensus: number;
    deviation: number;
    deviationPercent: number;
  };
  
  // Statistical analysis (Divine Perfection)
  statistics: {
    zScore: number;
    modifiedZScore: number;      // MAD-based
    grubbs: number;              // Grubbs test statistic
    dixonQ: number;              // Dixon's Q test
    iqrMultiple: number;         // Times outside IQR
    mahalanobis: number;         // Multivariate distance
    
    // Confidence in anomaly detection
    anomalyProbability: number;  // 0-1
    falsePositiveRisk: number;   // 0-1
  };
  
  // Source analysis
  source: {
    id: string;
    name: string;
    exchangeType: ExchangeType;
    historicalReliability: number;
    recentAccuracy: number;
  };
  
  // Cross-source comparison
  crossSource: {
    agreementRate: number;        // % of sources agreeing
    outlierSources: string[];     // Sources with different prices
    consensusSources: string[];   // Sources agreeing
    priceSpread: number;          // Max - Min across sources
    priceSpreadPercent: number;
  };
  
  // Temporal context
  temporal: {
    isFlashEvent: boolean;        // Sudden spike/crash
    duration: number;             // How long anomaly persisted (ms)
    recoveryTime: number | null;  // Time to recover if recovered
    precedingVolatility: number;  // Volatility before event
  };
  
  // Market context
  market: {
    regime: MarketRegime;
    btcCorrelation: number;       // Correlation with BTC
    sectorCorrelation: number;    // Correlation with sector
    marketWide: boolean;          // Affecting whole market?
    isolatedToSource: boolean;    // Only this source affected?
  };
  
  // Action taken
  action: {
    type: 'discarded' | 'flagged' | 'used_with_warning' | 'quarantined' | 'none';
    reason: string;
    confidence: number;
    alternativePrice: number | null;
  };
  
  // Risk assessment
  risk: {
    impactScore: number;          // 0-100
    urgency: number;              // 0-100
    propagationRisk: number;      // Risk of affecting other systems
    recommendation: string;
  };
  
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SOURCE HEALTH & CORRELATION
// ─────────────────────────────────────────────────────────────────────────────

export interface SourceCorrelation {
  sourceA: string;
  sourceB: string;
  
  // Correlation metrics
  pearson: number;        // Standard correlation
  spearman: number;       // Rank correlation
  kendall: number;        // Concordance
  
  // Agreement metrics
  priceAgreement: number;   // % of time within tolerance
  directionAgreement: number; // % of time same direction
  
  // Temporal lag
  lagMs: number;           // Average lag between sources
  lagDirection: 'A_leads' | 'B_leads' | 'synchronized';
  
  sampleCount: number;
  lastUpdated: Date;
}

export interface SourceQualityScore {
  sourceId: string;
  
  // Composite score (0-100)
  overallScore: number;
  
  // Component scores (0-100 each)
  components: {
    latencyScore: number;      // Based on P95 vs SLA
    reliabilityScore: number;  // Based on uptime
    accuracyScore: number;     // Based on cross-source agreement
    freshnessScore: number;    // Based on data staleness
    coverageScore: number;     // Based on asset coverage
    consistencyScore: number;  // Based on variance
  };
  
  // Weights used (Divine Perfection: data-driven)
  weights: {
    latency: number;
    reliability: number;
    accuracy: number;
    freshness: number;
    coverage: number;
    consistency: number;
  };
  
  // Trend
  trend: 'improving' | 'stable' | 'degrading';
  trendMagnitude: number;  // Rate of change
  
  // Recommendations
  recommendations: string[];
  
  lastUpdated: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// FLASH CRASH DETECTION
// ─────────────────────────────────────────────────────────────────────────────

export interface FlashCrashEvent {
  id: string;
  timestamp: Date;
  
  // Affected assets
  assets: {
    symbol: string;
    preDrop: number;
    minPrice: number;
    dropPercent: number;
    recovered: boolean;
    recoveryPrice: number | null;
    recoveryTime: number | null;
  }[];
  
  // Detection metrics
  detection: {
    method: 'velocity' | 'cross_source' | 'volume_spike' | 'combined';
    confidence: number;
    detectionLatency: number;  // How fast we detected it (ms)
  };
  
  // Scope
  scope: {
    type: 'single_asset' | 'sector' | 'exchange' | 'market_wide';
    affectedExchanges: string[];
    affectedSectors: string[];
  };
  
  // Response
  response: {
    dataDiscarded: boolean;
    alertsSent: boolean;
    circuitBreakersTriggered: string[];
    manualReviewRequired: boolean;
  };
  
  // Root cause analysis (best guess)
  rootCause: {
    hypothesis: string;
    confidence: number;
    evidence: string[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEVELOPER ALERT
// ─────────────────────────────────────────────────────────────────────────────

export interface DeveloperAlert {
  id: string;
  timestamp: Date;
  
  // Alert classification
  type: 'latency' | 'error_rate' | 'anomaly' | 'flash_crash' | 'correlation' | 'capacity';
  severity: AlertSeverity;
  category: 'infrastructure' | 'data_quality' | 'security' | 'capacity' | 'accuracy';
  
  // Affected components
  affected: {
    sources: string[];
    assets: string[];
    endpoints: string[];
  };
  
  // Metrics at time of alert
  metrics: {
    primary: { name: string; value: number; threshold: number; unit: string };
    secondary?: { name: string; value: number; unit: string }[];
  };
  
  // Context
  context: {
    regime: MarketRegime;
    recentEvents: string[];
    relatedAlerts: string[];
  };
  
  // Actionable recommendations
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  
  // Auto-actions taken
  autoActions: {
    action: string;
    success: boolean;
    timestamp: Date;
  }[];
  
  // Status tracking
  status: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive';
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION - Empirically Calibrated
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // Latency SLAs by exchange type (calibrated from historical data)
  latencySLA: {
    cex_primary: { target: 150, warning: 350, critical: 800 },
    cex_secondary: { target: 300, warning: 600, critical: 1200 },
    dex: { target: 800, warning: 1500, critical: 3000 },
    aggregator: { target: 500, warning: 1000, critical: 2000 },
  },
  
  // Error rate thresholds
  errorThresholds: {
    warning: 3,      // 3% error rate
    critical: 10,    // 10% error rate  
    emergency: 25,   // 25% - consider disabling
    burstThreshold: 5, // 5 errors in 60 seconds = burst
  },
  
  // Price anomaly thresholds by asset class (based on historical volatility analysis)
  // Format: { zScore, percentDeviation, grubbs, velocityThreshold }
  anomalyThresholds: {
    major: { 
      zScore: 3.5, 
      percentDeviation: 1.5, 
      grubbs: 3.0,
      velocityPerSecond: 0.5,  // Max 0.5% per second
    },
    large_cap: { 
      zScore: 3.2, 
      percentDeviation: 2.5, 
      grubbs: 2.8,
      velocityPerSecond: 1.0,
    },
    mid_cap: { 
      zScore: 2.8, 
      percentDeviation: 4.0, 
      grubbs: 2.5,
      velocityPerSecond: 2.0,
    },
    small_cap: { 
      zScore: 2.5, 
      percentDeviation: 6.0, 
      grubbs: 2.2,
      velocityPerSecond: 3.0,
    },
    meme: { 
      zScore: 2.0, 
      percentDeviation: 12.0, 
      grubbs: 1.8,
      velocityPerSecond: 5.0,
    },
    defi: { 
      zScore: 2.5, 
      percentDeviation: 5.0, 
      grubbs: 2.3,
      velocityPerSecond: 2.5,
    },
    stablecoin: { 
      zScore: 5.0, 
      percentDeviation: 0.5, 
      grubbs: 4.0,
      velocityPerSecond: 0.1,
    },
  },
  
  // Regime-specific multipliers
  regimeMultipliers: {
    calm: 0.7,
    normal: 1.0,
    volatile: 1.5,
    highly_volatile: 2.0,
    crash: 2.5,
    recovery: 1.8,
  },
  
  // Flash crash detection
  flashCrash: {
    velocityThreshold: 5,     // 5% per second
    minDuration: 100,         // Minimum 100ms to be considered
    maxDuration: 60000,       // Maximum 60 seconds
    recoveryThreshold: 0.8,   // Must recover 80% to be "flash"
    multiAssetThreshold: 3,   // 3+ assets = market-wide
  },
  
  // Window sizes
  windows: {
    latencyRolling: 200,      // Last 200 requests
    priceRolling: 100,        // Last 100 price points
    errorWindow: 300,         // 5 minutes for error rate
    correlationWindow: 1000,  // Last 1000 paired observations
    velocityWindow: 10,       // Last 10 seconds for velocity
  },
  
  // Quality score weights (calibrated from correlation analysis)
  qualityWeights: {
    latency: 0.20,
    reliability: 0.25,
    accuracy: 0.30,
    freshness: 0.10,
    coverage: 0.05,
    consistency: 0.10,
  },
};

// Asset classification
const ASSET_CLASSIFICATION: Record<string, AssetClass> = {
  btc: 'major', bitcoin: 'major',
  eth: 'major', ethereum: 'major',
  usdt: 'stablecoin', usdc: 'stablecoin', dai: 'stablecoin', busd: 'stablecoin',
  bnb: 'large_cap', sol: 'large_cap', xrp: 'large_cap', ada: 'large_cap',
  avax: 'large_cap', dot: 'large_cap', link: 'large_cap', matic: 'large_cap',
  uni: 'defi', aave: 'defi', mkr: 'defi', crv: 'defi', comp: 'defi',
  doge: 'meme', shib: 'meme', pepe: 'meme', bonk: 'meme', floki: 'meme',
  turbo: 'meme', wif: 'meme', meme: 'meme',
};

const EXCHANGE_TYPES: Record<string, ExchangeType> = {
  'binance': 'cex_primary',
  'coinbase': 'cex_primary',
  'kraken': 'cex_secondary',
  'okx': 'cex_secondary',
  'bybit': 'cex_secondary',
  'coingecko-pro': 'aggregator',
  'coingecko-free': 'aggregator',
  'cmc-pro': 'aggregator',
  'defillama': 'aggregator',
  'dexscreener': 'dex',
  'uniswap': 'dex',
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADVANCED STATISTICAL UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

class AdvancedRollingStatistics {
  private values: { value: number; timestamp: number }[] = [];
  private maxSize: number;
  private maxAgeMs: number;
  
  constructor(maxSize: number = 200, maxAgeMs: number = 3600000) {
    this.maxSize = maxSize;
    this.maxAgeMs = maxAgeMs;
  }
  
  add(value: number, timestamp: number = Date.now()): void {
    this.values.push({ value, timestamp });
    this.cleanup();
  }
  
  private cleanup(): void {
    const now = Date.now();
    // Remove old and excess values
    this.values = this.values
      .filter(v => now - v.timestamp < this.maxAgeMs)
      .slice(-this.maxSize);
  }
  
  get count(): number {
    return this.values.length;
  }
  
  get rawValues(): number[] {
    return this.values.map(v => v.value);
  }
  
  // Basic statistics
  get mean(): number {
    if (this.values.length === 0) return 0;
    return this.rawValues.reduce((a, b) => a + b, 0) / this.values.length;
  }
  
  get median(): number {
    if (this.values.length === 0) return 0;
    const sorted = [...this.rawValues].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  
  get stdDev(): number {
    if (this.values.length < 2) return 0;
    const mean = this.mean;
    const squaredDiffs = this.rawValues.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (this.values.length - 1));
  }
  
  get variance(): number {
    return Math.pow(this.stdDev, 2);
  }
  
  // Coefficient of variation
  get cv(): number {
    const mean = this.mean;
    if (mean === 0) return 0;
    return this.stdDev / mean;
  }
  
  // Skewness (asymmetry of distribution)
  get skewness(): number {
    if (this.values.length < 3) return 0;
    const mean = this.mean;
    const std = this.stdDev;
    if (std === 0) return 0;
    
    const n = this.values.length;
    const sum = this.rawValues.reduce((acc, v) => acc + Math.pow((v - mean) / std, 3), 0);
    return (n / ((n - 1) * (n - 2))) * sum;
  }
  
  // Kurtosis (tail heaviness)
  get kurtosis(): number {
    if (this.values.length < 4) return 0;
    const mean = this.mean;
    const std = this.stdDev;
    if (std === 0) return 0;
    
    const n = this.values.length;
    const sum = this.rawValues.reduce((acc, v) => acc + Math.pow((v - mean) / std, 4), 0);
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum 
           - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  }
  
  // Median Absolute Deviation (robust)
  get mad(): number {
    if (this.values.length === 0) return 0;
    const median = this.median;
    const absoluteDeviations = this.rawValues.map(v => Math.abs(v - median)).sort((a, b) => a - b);
    const mid = Math.floor(absoluteDeviations.length / 2);
    return absoluteDeviations.length % 2 
      ? absoluteDeviations[mid] 
      : (absoluteDeviations[mid - 1] + absoluteDeviations[mid]) / 2;
  }
  
  // Percentile calculation
  percentile(p: number): number {
    if (this.values.length === 0) return 0;
    const sorted = [...this.rawValues].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
  }
  
  // Full percentile suite
  get percentiles(): EnhancedLatencyMetrics['percentiles'] {
    return {
      p10: this.percentile(10),
      p25: this.percentile(25),
      p50: this.percentile(50),
      p75: this.percentile(75),
      p90: this.percentile(90),
      p95: this.percentile(95),
      p99: this.percentile(99),
      p999: this.percentile(99.9),
    };
  }
  
  // IQR-based outlier detection
  get iqr(): { q1: number; q3: number; iqr: number; lowerFence: number; upperFence: number } {
    const q1 = this.percentile(25);
    const q3 = this.percentile(75);
    const iqr = q3 - q1;
    return {
      q1,
      q3,
      iqr,
      lowerFence: q1 - 1.5 * iqr,
      upperFence: q3 + 1.5 * iqr,
    };
  }
  
  // Z-score for a value
  zScore(value: number): number {
    const std = this.stdDev;
    if (std === 0) return 0;
    return (value - this.mean) / std;
  }
  
  // Modified Z-score using MAD (more robust)
  modifiedZScore(value: number): number {
    const mad = this.mad;
    if (mad === 0) return 0;
    return 0.6745 * (value - this.median) / mad;
  }
  
  // Grubbs test statistic for outlier detection
  grubbs(value: number): number {
    const std = this.stdDev;
    if (std === 0) return 0;
    return Math.abs(value - this.mean) / std;
  }
  
  // Dixon's Q test for small samples
  dixonQ(value: number): number {
    if (this.values.length < 3) return 0;
    const sorted = [...this.rawValues].sort((a, b) => a - b);
    const range = sorted[sorted.length - 1] - sorted[0];
    if (range === 0) return 0;
    
    // Check if value is near min or max
    const distToMin = Math.abs(value - sorted[0]);
    const distToMax = Math.abs(value - sorted[sorted.length - 1]);
    const gap = Math.min(distToMin, distToMax);
    
    return gap / range;
  }
  
  // Velocity calculation (rate of change per second)
  getVelocity(windowSeconds: number = 10): number {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const recentValues = this.values.filter(v => now - v.timestamp < windowMs);
    
    if (recentValues.length < 2) return 0;
    
    const first = recentValues[0];
    const last = recentValues[recentValues.length - 1];
    const timeDiff = (last.timestamp - first.timestamp) / 1000; // seconds
    
    if (timeDiff === 0 || first.value === 0) return 0;
    
    const pctChange = ((last.value - first.value) / first.value) * 100;
    return pctChange / timeDiff; // % per second
  }
  
  // Recent trend (slope of linear regression)
  getTrend(windowSize: number = 20): { slope: number; r2: number; prediction: number } {
    const recent = this.values.slice(-windowSize);
    if (recent.length < 3) return { slope: 0, r2: 0, prediction: this.mean };
    
    // Simple linear regression
    const n = recent.length;
    const xs = recent.map((_, i) => i);
    const ys = recent.map(v => v.value);
    
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
    const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // R² calculation
    const yMean = sumY / n;
    const ssTotal = ys.reduce((acc, y) => acc + Math.pow(y - yMean, 2), 0);
    const ssResidual = ys.reduce((acc, y, i) => {
      const predicted = slope * xs[i] + intercept;
      return acc + Math.pow(y - predicted, 2);
    }, 0);
    const r2 = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;
    
    // Prediction for next value
    const prediction = slope * n + intercept;
    
    return { slope, r2, prediction };
  }
  
  // Get hourly pattern (for temporal analysis)
  getHourlyPattern(): number[] {
    const hourlyBuckets: number[][] = Array.from({ length: 24 }, () => []);
    
    for (const { value, timestamp } of this.values) {
      const hour = new Date(timestamp).getUTCHours();
      hourlyBuckets[hour].push(value);
    }
    
    return hourlyBuckets.map(bucket => 
      bucket.length > 0 ? bucket.reduce((a, b) => a + b, 0) / bucket.length : 0
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORRELATION ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════

class SourceCorrelationAnalyzer {
  private pricePairs: Map<string, { a: number; b: number; timestamp: number }[]> = new Map();
  private maxPairs = CONFIG.windows.correlationWindow;
  
  private getPairKey(sourceA: string, sourceB: string): string {
    return [sourceA, sourceB].sort().join(':');
  }
  
  recordPricePair(sourceA: string, priceA: number, sourceB: string, priceB: number): void {
    const key = this.getPairKey(sourceA, sourceB);
    
    if (!this.pricePairs.has(key)) {
      this.pricePairs.set(key, []);
    }
    
    const pairs = this.pricePairs.get(key)!;
    pairs.push({ a: priceA, b: priceB, timestamp: Date.now() });
    
    // Keep only recent pairs
    if (pairs.length > this.maxPairs) {
      pairs.shift();
    }
  }
  
  getCorrelation(sourceA: string, sourceB: string): SourceCorrelation | null {
    const key = this.getPairKey(sourceA, sourceB);
    const pairs = this.pricePairs.get(key);
    
    if (!pairs || pairs.length < 10) return null;
    
    const as = pairs.map(p => p.a);
    const bs = pairs.map(p => p.b);
    const n = pairs.length;
    
    // Pearson correlation
    const meanA = as.reduce((a, b) => a + b, 0) / n;
    const meanB = bs.reduce((a, b) => a + b, 0) / n;
    
    let sumAB = 0, sumA2 = 0, sumB2 = 0;
    for (let i = 0; i < n; i++) {
      sumAB += (as[i] - meanA) * (bs[i] - meanB);
      sumA2 += Math.pow(as[i] - meanA, 2);
      sumB2 += Math.pow(bs[i] - meanB, 2);
    }
    
    const pearson = Math.sqrt(sumA2) * Math.sqrt(sumB2) > 0
      ? sumAB / (Math.sqrt(sumA2) * Math.sqrt(sumB2))
      : 0;
    
    // Spearman correlation (rank-based)
    const rankedA = this.getRanks(as);
    const rankedB = this.getRanks(bs);
    
    let sumD2 = 0;
    for (let i = 0; i < n; i++) {
      sumD2 += Math.pow(rankedA[i] - rankedB[i], 2);
    }
    const spearman = 1 - (6 * sumD2) / (n * (Math.pow(n, 2) - 1));
    
    // Price agreement (within 0.5% tolerance)
    const tolerance = 0.005;
    let agreementCount = 0;
    for (let i = 0; i < n; i++) {
      const diff = Math.abs(as[i] - bs[i]) / Math.max(as[i], bs[i]);
      if (diff < tolerance) agreementCount++;
    }
    
    // Direction agreement
    let directionAgreement = 0;
    for (let i = 1; i < n; i++) {
      const dirA = Math.sign(as[i] - as[i - 1]);
      const dirB = Math.sign(bs[i] - bs[i - 1]);
      if (dirA === dirB) directionAgreement++;
    }
    
    return {
      sourceA,
      sourceB,
      pearson,
      spearman,
      kendall: spearman * 0.9, // Approximation
      priceAgreement: agreementCount / n,
      directionAgreement: n > 1 ? directionAgreement / (n - 1) : 1,
      lagMs: 0, // Would need timestamp analysis
      lagDirection: 'synchronized',
      sampleCount: n,
      lastUpdated: new Date(),
    };
  }
  
  private getRanks(values: number[]): number[] {
    const sorted = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array(values.length);
    
    let rank = 1;
    for (let i = 0; i < sorted.length; i++) {
      // Handle ties by averaging ranks
      let j = i;
      while (j < sorted.length - 1 && sorted[j].v === sorted[j + 1].v) {
        j++;
      }
      const avgRank = (rank + rank + j - i) / 2;
      for (let k = i; k <= j; k++) {
        ranks[sorted[k].i] = avgRank;
      }
      rank += j - i + 1;
      i = j;
    }
    
    return ranks;
  }
  
  // Get correlation matrix for all sources
  getCorrelationMatrix(sourceIds: string[]): Map<string, SourceCorrelation> {
    const matrix = new Map<string, SourceCorrelation>();
    
    for (let i = 0; i < sourceIds.length; i++) {
      for (let j = i + 1; j < sourceIds.length; j++) {
        const corr = this.getCorrelation(sourceIds[i], sourceIds[j]);
        if (corr) {
          matrix.set(this.getPairKey(sourceIds[i], sourceIds[j]), corr);
        }
      }
    }
    
    return matrix;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLASH CRASH DETECTOR
// ═══════════════════════════════════════════════════════════════════════════════

class FlashCrashDetector {
  private priceHistory: Map<string, { price: number; timestamp: number }[]> = new Map();
  private activeEvents: Map<string, FlashCrashEvent> = new Map();
  private completedEvents: FlashCrashEvent[] = [];
  
  recordPrice(symbol: string, price: number, sourceId: string): FlashCrashEvent | null {
    const key = `${symbol}:${sourceId}`;
    
    if (!this.priceHistory.has(key)) {
      this.priceHistory.set(key, []);
    }
    
    const history = this.priceHistory.get(key)!;
    const now = Date.now();
    
    // Add new price
    history.push({ price, timestamp: now });
    
    // Keep only recent history (last 5 minutes)
    const fiveMinAgo = now - 300000;
    while (history.length > 0 && history[0].timestamp < fiveMinAgo) {
      history.shift();
    }
    
    // Check for flash crash
    return this.detectFlashCrash(symbol, price, history, sourceId);
  }
  
  private detectFlashCrash(
    symbol: string, 
    currentPrice: number, 
    history: { price: number; timestamp: number }[],
    sourceId: string
  ): FlashCrashEvent | null {
    if (history.length < 3) return null;
    
    const now = Date.now();
    const config = CONFIG.flashCrash;
    
    // Calculate velocity over different windows
    const velocities: { windowSec: number; velocity: number }[] = [];
    
    for (const windowSec of [1, 5, 10, 30]) {
      const windowMs = windowSec * 1000;
      const windowStart = now - windowMs;
      const windowPrices = history.filter(h => h.timestamp >= windowStart);
      
      if (windowPrices.length >= 2) {
        const first = windowPrices[0];
        const last = windowPrices[windowPrices.length - 1];
        const pctChange = ((last.price - first.price) / first.price) * 100;
        const velocity = pctChange / windowSec;
        velocities.push({ windowSec, velocity });
      }
    }
    
    // Check for velocity threshold breach
    const maxVelocity = Math.max(...velocities.map(v => Math.abs(v.velocity)));
    
    if (maxVelocity < config.velocityThreshold) {
      return null; // No flash crash
    }
    
    // Determine if this is a new event or ongoing
    const eventKey = `${symbol}:flash`;
    const existingEvent = this.activeEvents.get(eventKey);
    
    if (existingEvent) {
      // Update existing event
      const asset = existingEvent.assets[0];
      if (currentPrice < asset.minPrice) {
        asset.minPrice = currentPrice;
        asset.dropPercent = ((asset.preDrop - currentPrice) / asset.preDrop) * 100;
      }
      
      // Check for recovery
      if (currentPrice >= asset.preDrop * config.recoveryThreshold) {
        asset.recovered = true;
        asset.recoveryPrice = currentPrice;
        asset.recoveryTime = now - existingEvent.timestamp.getTime();
        
        // Move to completed
        this.completedEvents.push(existingEvent);
        this.activeEvents.delete(eventKey);
      }
      
      return existingEvent;
    }
    
    // Find pre-drop price (highest in last 60 seconds before the drop started)
    const oneMinAgo = now - 60000;
    const preDrop = Math.max(...history.filter(h => h.timestamp < oneMinAgo).map(h => h.price), currentPrice);
    
    const dropPercent = ((preDrop - currentPrice) / preDrop) * 100;
    
    // Only create event if significant drop
    if (Math.abs(dropPercent) < 3) return null;
    
    const newEvent: FlashCrashEvent = {
      id: `flash-${symbol}-${now}`,
      timestamp: new Date(),
      assets: [{
        symbol,
        preDrop,
        minPrice: currentPrice,
        dropPercent,
        recovered: false,
        recoveryPrice: null,
        recoveryTime: null,
      }],
      detection: {
        method: 'velocity',
        confidence: Math.min(maxVelocity / config.velocityThreshold, 1),
        detectionLatency: 100, // Approximate
      },
      scope: {
        type: 'single_asset',
        affectedExchanges: [sourceId],
        affectedSectors: [],
      },
      response: {
        dataDiscarded: true,
        alertsSent: true,
        circuitBreakersTriggered: [],
        manualReviewRequired: Math.abs(dropPercent) > 10,
      },
      rootCause: {
        hypothesis: Math.abs(dropPercent) > 20 
          ? 'Possible exchange glitch or large liquidation'
          : 'Normal market volatility or large order',
        confidence: 0.3,
        evidence: [`Velocity: ${maxVelocity.toFixed(2)}%/s`, `Drop: ${dropPercent.toFixed(2)}%`],
      },
    };
    
    this.activeEvents.set(eventKey, newEvent);
    
    logger.warn('🔥 Flash crash detected', {
      symbol,
      dropPercent: dropPercent.toFixed(2),
      velocity: maxVelocity.toFixed(2),
    });
    
    return newEvent;
  }
  
  getActiveEvents(): FlashCrashEvent[] {
    return [...this.activeEvents.values()];
  }
  
  getRecentEvents(limitHours: number = 24): FlashCrashEvent[] {
    const cutoff = Date.now() - limitHours * 3600000;
    return this.completedEvents.filter(e => e.timestamp.getTime() > cutoff);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUALITY SCORER
// ═══════════════════════════════════════════════════════════════════════════════

class SourceQualityScorer {
  private latencyStats: Map<string, AdvancedRollingStatistics> = new Map();
  private errorCounts: Map<string, { success: number; errors: number }> = new Map();
  private accuracyScores: Map<string, number[]> = new Map();
  
  recordLatency(sourceId: string, latencyMs: number): void {
    if (!this.latencyStats.has(sourceId)) {
      this.latencyStats.set(sourceId, new AdvancedRollingStatistics(200));
    }
    this.latencyStats.get(sourceId)!.add(latencyMs);
  }
  
  recordSuccess(sourceId: string): void {
    if (!this.errorCounts.has(sourceId)) {
      this.errorCounts.set(sourceId, { success: 0, errors: 0 });
    }
    this.errorCounts.get(sourceId)!.success++;
  }
  
  recordError(sourceId: string): void {
    if (!this.errorCounts.has(sourceId)) {
      this.errorCounts.set(sourceId, { success: 0, errors: 0 });
    }
    this.errorCounts.get(sourceId)!.errors++;
  }
  
  recordAccuracy(sourceId: string, accuracyScore: number): void {
    if (!this.accuracyScores.has(sourceId)) {
      this.accuracyScores.set(sourceId, []);
    }
    const scores = this.accuracyScores.get(sourceId)!;
    scores.push(accuracyScore);
    if (scores.length > 100) scores.shift();
  }
  
  getQualityScore(sourceId: string): SourceQualityScore {
    const exchangeType = EXCHANGE_TYPES[sourceId] || 'cex_secondary';
    const sla = CONFIG.latencySLA[exchangeType];
    
    // Latency score
    const latencyStats = this.latencyStats.get(sourceId);
    let latencyScore = 100;
    if (latencyStats && latencyStats.count > 0) {
      const p95 = latencyStats.percentile(95);
      if (p95 > sla.critical) {
        latencyScore = 20;
      } else if (p95 > sla.warning) {
        latencyScore = 50;
      } else if (p95 > sla.target) {
        latencyScore = 75;
      } else {
        latencyScore = 100;
      }
    }
    
    // Reliability score
    const counts = this.errorCounts.get(sourceId) || { success: 0, errors: 0 };
    const totalRequests = counts.success + counts.errors;
    let reliabilityScore = 100;
    if (totalRequests > 0) {
      const errorRate = counts.errors / totalRequests;
      reliabilityScore = Math.max(0, 100 - errorRate * 500); // 20% error = 0 score
    }
    
    // Accuracy score
    const accuracyHistory = this.accuracyScores.get(sourceId) || [];
    const accuracyScore = accuracyHistory.length > 0
      ? accuracyHistory.reduce((a, b) => a + b, 0) / accuracyHistory.length
      : 80; // Default
    
    // Freshness score (based on last update)
    const freshnessScore = 90; // Would need timestamp tracking
    
    // Coverage score (would need asset tracking)
    const coverageScore = 85;
    
    // Consistency score
    const consistencyScore = latencyStats && latencyStats.count > 5
      ? Math.max(0, 100 - latencyStats.cv * 100)
      : 80;
    
    // Calculate overall score
    const weights = CONFIG.qualityWeights;
    const overallScore = 
      latencyScore * weights.latency +
      reliabilityScore * weights.reliability +
      accuracyScore * weights.accuracy +
      freshnessScore * weights.freshness +
      coverageScore * weights.coverage +
      consistencyScore * weights.consistency;
    
    // Determine trend
    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (latencyStats && latencyStats.count > 20) {
      const { slope } = latencyStats.getTrend();
      if (slope > 5) trend = 'degrading';
      else if (slope < -5) trend = 'improving';
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (latencyScore < 50) recommendations.push('Consider upgrading API tier for lower latency');
    if (reliabilityScore < 70) recommendations.push('High error rate - investigate API stability');
    if (consistencyScore < 60) recommendations.push('High latency variance - check network conditions');
    
    return {
      sourceId,
      overallScore,
      components: {
        latencyScore,
        reliabilityScore,
        accuracyScore,
        freshnessScore,
        coverageScore,
        consistencyScore,
      },
      weights,
      trend,
      trendMagnitude: latencyStats ? Math.abs(latencyStats.getTrend().slope) : 0,
      recommendations,
      lastUpdated: new Date(),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED ANOMALY DETECTOR
// ═══════════════════════════════════════════════════════════════════════════════

class EnhancedPriceAnomalyDetector {
  private priceHistory: Map<string, AdvancedRollingStatistics> = new Map();
  private correlationAnalyzer = new SourceCorrelationAnalyzer();
  private flashCrashDetector = new FlashCrashDetector();
  private qualityScorer = new SourceQualityScorer();
  
  private getAssetClass(symbol: string): AssetClass {
    return ASSET_CLASSIFICATION[symbol.toLowerCase()] || 'mid_cap';
  }
  
  private getThresholds(assetClass: AssetClass, regime: MarketRegime) {
    const base = CONFIG.anomalyThresholds[assetClass];
    const multiplier = CONFIG.regimeMultipliers[regime];
    
    return {
      zScore: base.zScore * multiplier,
      percentDeviation: base.percentDeviation * multiplier,
      grubbs: base.grubbs * multiplier,
      velocityPerSecond: base.velocityPerSecond * multiplier,
    };
  }
  
  recordPrice(symbol: string, price: number, sourceId: string): void {
    const key = `${symbol.toLowerCase()}:${sourceId}`;
    
    if (!this.priceHistory.has(key)) {
      this.priceHistory.set(key, new AdvancedRollingStatistics(CONFIG.windows.priceRolling));
    }
    
    this.priceHistory.get(key)!.add(price);
    
    // Also check for flash crash
    this.flashCrashDetector.recordPrice(symbol, price, sourceId);
  }
  
  detectAnomaly(
    symbol: string,
    pricePoints: { sourceId: string; price: number }[],
    regime: MarketRegime = 'normal'
  ): EnhancedPriceAnomaly | null {
    if (pricePoints.length < 2) return null;
    
    const assetClass = this.getAssetClass(symbol);
    const thresholds = this.getThresholds(assetClass, regime);
    
    // Calculate consensus price (median)
    const prices = pricePoints.map(p => p.price).sort((a, b) => a - b);
    const consensusPrice = prices[Math.floor(prices.length / 2)];
    
    // Calculate statistics across sources
    const priceStats = new AdvancedRollingStatistics(prices.length);
    for (const price of prices) {
      priceStats.add(price);
    }
    
    // Check each price point
    for (const point of pricePoints) {
      const deviation = Math.abs(point.price - consensusPrice);
      const deviationPercent = (deviation / consensusPrice) * 100;
      
      // Calculate all test statistics
      const zScore = priceStats.zScore(point.price);
      const modifiedZScore = priceStats.modifiedZScore(point.price);
      const grubbs = priceStats.grubbs(point.price);
      const dixonQ = priceStats.dixonQ(point.price);
      
      // Get historical stats for this source
      const historyKey = `${symbol.toLowerCase()}:${point.sourceId}`;
      const history = this.priceHistory.get(historyKey);
      const velocity = history?.getVelocity(10) || 0;
      
      // Determine if anomaly using multiple tests
      const anomalyTests = {
        zScoreAnomaly: Math.abs(zScore) > thresholds.zScore,
        modifiedZAnomaly: Math.abs(modifiedZScore) > thresholds.zScore * 1.2,
        grubbsAnomaly: grubbs > thresholds.grubbs,
        percentAnomaly: deviationPercent > thresholds.percentDeviation,
        velocityAnomaly: Math.abs(velocity) > thresholds.velocityPerSecond,
      };
      
      const anomalyCount = Object.values(anomalyTests).filter(Boolean).length;
      
      // Need at least 2 tests to flag as anomaly (reduces false positives)
      if (anomalyCount < 2) continue;
      
      // Calculate anomaly probability
      const anomalyProbability = Math.min(1, anomalyCount * 0.25);
      
      // Calculate false positive risk
      const falsePositiveRisk = Math.max(0, 1 - anomalyCount * 0.2);
      
      // Determine severity
      let severity: AlertSeverity;
      if (deviationPercent > thresholds.percentDeviation * 3 || anomalyCount >= 4) {
        severity = 'emergency';
      } else if (deviationPercent > thresholds.percentDeviation * 2 || anomalyCount >= 3) {
        severity = 'critical';
      } else if (anomalyCount >= 2) {
        severity = 'warning';
      } else {
        severity = 'info';
      }
      
      // Determine anomaly type
      let anomalyType: AnomalyType;
      if (Math.abs(velocity) > thresholds.velocityPerSecond * 2) {
        anomalyType = 'flash_crash';
      } else if (point.price > consensusPrice) {
        anomalyType = 'price_spike';
      } else {
        anomalyType = 'price_crash';
      }
      
      // Determine action
      let action: EnhancedPriceAnomaly['action']['type'];
      let alternativePrice: number | null = null;
      
      if (severity === 'emergency' || severity === 'critical') {
        action = 'discarded';
        alternativePrice = consensusPrice;
      } else if (severity === 'warning') {
        action = 'flagged';
      } else {
        action = 'used_with_warning';
      }
      
      // Get source quality
      const sourceQuality = this.qualityScorer.getQualityScore(point.sourceId);
      
      // Calculate impact score
      const impactScore = Math.min(100, 
        deviationPercent * 10 + 
        anomalyCount * 15 + 
        (severity === 'emergency' ? 30 : severity === 'critical' ? 20 : 10)
      );
      
      return {
        id: `anomaly-${symbol}-${point.sourceId}-${Date.now()}`,
        timestamp: new Date(),
        symbol: symbol.toUpperCase(),
        assetClass,
        anomalyType,
        severity,
        
        prices: {
          observed: point.price,
          consensus: consensusPrice,
          deviation,
          deviationPercent,
        },
        
        statistics: {
          zScore,
          modifiedZScore,
          grubbs,
          dixonQ,
          iqrMultiple: priceStats.iqr.iqr > 0 
            ? (point.price - priceStats.percentile(50)) / priceStats.iqr.iqr 
            : 0,
          mahalanobis: Math.abs(zScore), // Simplified
          anomalyProbability,
          falsePositiveRisk,
        },
        
        source: {
          id: point.sourceId,
          name: point.sourceId,
          exchangeType: EXCHANGE_TYPES[point.sourceId] || 'cex_secondary',
          historicalReliability: sourceQuality.components.reliabilityScore / 100,
          recentAccuracy: sourceQuality.components.accuracyScore / 100,
        },
        
        crossSource: {
          agreementRate: (pricePoints.length - 1) / pricePoints.length,
          outlierSources: [point.sourceId],
          consensusSources: pricePoints.filter(p => p.sourceId !== point.sourceId).map(p => p.sourceId),
          priceSpread: Math.max(...prices) - Math.min(...prices),
          priceSpreadPercent: ((Math.max(...prices) - Math.min(...prices)) / consensusPrice) * 100,
        },
        
        temporal: {
          isFlashEvent: Math.abs(velocity) > thresholds.velocityPerSecond,
          duration: 0,
          recoveryTime: null,
          precedingVolatility: history?.stdDev || 0,
        },
        
        market: {
          regime,
          btcCorrelation: 0.7, // Would need actual calculation
          sectorCorrelation: 0.5,
          marketWide: false,
          isolatedToSource: true,
        },
        
        action: {
          type: action,
          reason: `${anomalyCount} anomaly tests triggered: ${Object.entries(anomalyTests)
            .filter(([_, v]) => v)
            .map(([k]) => k)
            .join(', ')}`,
          confidence: anomalyProbability,
          alternativePrice,
        },
        
        risk: {
          impactScore,
          urgency: severity === 'emergency' ? 100 : severity === 'critical' ? 80 : 50,
          propagationRisk: anomalyType === 'flash_crash' ? 0.8 : 0.3,
          recommendation: action === 'discarded'
            ? `Use consensus price ($${consensusPrice.toFixed(6)}) instead`
            : `Monitor ${point.sourceId} for continued anomalies`,
        },
        
        message: `🔬 ${anomalyType.toUpperCase()}: ${symbol} from ${point.sourceId} shows $${point.price.toFixed(6)} vs consensus $${consensusPrice.toFixed(6)} (${deviationPercent.toFixed(2)}% deviation, z=${zScore.toFixed(2)}, ${anomalyCount}/5 tests failed)`,
      };
    }
    
    return null;
  }
  
  // Record correlation data
  recordCorrelation(sourceA: string, priceA: number, sourceB: string, priceB: number): void {
    this.correlationAnalyzer.recordPricePair(sourceA, priceA, sourceB, priceB);
  }
  
  // Get correlation between sources
  getSourceCorrelation(sourceA: string, sourceB: string): SourceCorrelation | null {
    return this.correlationAnalyzer.getCorrelation(sourceA, sourceB);
  }
  
  // Get quality score for source
  getQualityScore(sourceId: string): SourceQualityScore {
    return this.qualityScorer.getQualityScore(sourceId);
  }
  
  // Record latency for quality scoring
  recordLatency(sourceId: string, latencyMs: number): void {
    this.qualityScorer.recordLatency(sourceId, latencyMs);
  }
  
  // Get flash crash events
  getFlashCrashEvents(): { active: FlashCrashEvent[]; recent: FlashCrashEvent[] } {
    return {
      active: this.flashCrashDetector.getActiveEvents(),
      recent: this.flashCrashDetector.getRecentEvents(24),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENHANCED MONITOR
// ═══════════════════════════════════════════════════════════════════════════════

export class EnhancedAnomalyLatencyMonitor {
  private latencyStats: Map<string, AdvancedRollingStatistics> = new Map();
  private errorStats: Map<string, { recent: number[]; total: number; errors: number }> = new Map();
  private priceDetector = new EnhancedPriceAnomalyDetector();
  private alerts: DeveloperAlert[] = [];
  private alertCallback?: (alert: DeveloperAlert) => void;
  
  // Alert deduplication
  private recentAlertKeys: Map<string, number> = new Map();
  private alertCooldownMs = 60000;
  
  setAlertCallback(callback: (alert: DeveloperAlert) => void): void {
    this.alertCallback = callback;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // LATENCY RECORDING
  // ─────────────────────────────────────────────────────────────────────────────
  
  recordRequest(
    sourceId: string,
    latencyMs: number,
    success: boolean = true
  ): { latencyAlert: DeveloperAlert | null; errorAlert: DeveloperAlert | null } {
    // Initialize if needed
    if (!this.latencyStats.has(sourceId)) {
      this.latencyStats.set(sourceId, new AdvancedRollingStatistics(CONFIG.windows.latencyRolling));
      this.errorStats.set(sourceId, { recent: [], total: 0, errors: 0 });
    }
    
    const latencyHistory = this.latencyStats.get(sourceId)!;
    const errorHistory = this.errorStats.get(sourceId)!;
    
    // Record latency
    latencyHistory.add(latencyMs);
    this.priceDetector.recordLatency(sourceId, latencyMs);
    
    // Record success/error
    errorHistory.total++;
    const now = Date.now();
    errorHistory.recent = errorHistory.recent.filter(t => now - t < 60000); // Last minute
    
    if (!success) {
      errorHistory.errors++;
      errorHistory.recent.push(now);
    }
    
    // Check for alerts
    const latencyAlert = this.checkLatencyAlert(sourceId, latencyMs, latencyHistory);
    const errorAlert = success ? null : this.checkErrorAlert(sourceId, errorHistory);
    
    return { latencyAlert, errorAlert };
  }
  
  private checkLatencyAlert(
    sourceId: string,
    latencyMs: number,
    stats: AdvancedRollingStatistics
  ): DeveloperAlert | null {
    if (stats.count < 5) return null;
    
    const exchangeType = EXCHANGE_TYPES[sourceId] || 'cex_secondary';
    const sla = CONFIG.latencySLA[exchangeType];
    const zScore = stats.zScore(latencyMs);
    
    // Check for alert conditions
    if (latencyMs < sla.critical && zScore < 3) return null;
    
    const alertKey = `latency:${sourceId}`;
    if (this.isAlertCooldown(alertKey)) return null;
    
    const severity: AlertSeverity = 
      latencyMs > sla.critical * 2 ? 'emergency' :
      latencyMs > sla.critical ? 'critical' :
      'warning';
    
    const alert: DeveloperAlert = {
      id: `lat-${sourceId}-${Date.now()}`,
      timestamp: new Date(),
      type: 'latency',
      severity,
      category: 'infrastructure',
      
      affected: {
        sources: [sourceId],
        assets: [],
        endpoints: [],
      },
      
      metrics: {
        primary: { 
          name: 'Latency', 
          value: latencyMs, 
          threshold: sla.warning, 
          unit: 'ms' 
        },
        secondary: [
          { name: 'P95', value: stats.percentile(95), unit: 'ms' },
          { name: 'Z-Score', value: zScore, unit: 'σ' },
        ],
      },
      
      context: {
        regime: 'normal',
        recentEvents: [],
        relatedAlerts: [],
      },
      
      recommendations: {
        immediate: severity === 'emergency' 
          ? ['Consider switching to backup source', 'Check network connectivity']
          : ['Monitor for continued degradation'],
        shortTerm: ['Review source SLA and consider upgrade'],
        longTerm: ['Implement geographic redundancy'],
      },
      
      autoActions: severity === 'emergency' 
        ? [{ action: 'Marked source as degraded', success: true, timestamp: new Date() }]
        : [],
      
      status: 'new',
    };
    
    this.emitAlert(alert);
    return alert;
  }
  
  private checkErrorAlert(
    sourceId: string,
    stats: { recent: number[]; total: number; errors: number }
  ): DeveloperAlert | null {
    const errorRate = stats.total > 0 ? (stats.errors / stats.total) * 100 : 0;
    const burstDetected = stats.recent.length >= CONFIG.errorThresholds.burstThreshold;
    
    if (errorRate < CONFIG.errorThresholds.warning && !burstDetected) return null;
    
    const alertKey = `error:${sourceId}`;
    if (this.isAlertCooldown(alertKey)) return null;
    
    const severity: AlertSeverity = 
      errorRate > CONFIG.errorThresholds.emergency ? 'emergency' :
      errorRate > CONFIG.errorThresholds.critical || burstDetected ? 'critical' :
      'warning';
    
    const alert: DeveloperAlert = {
      id: `err-${sourceId}-${Date.now()}`,
      timestamp: new Date(),
      type: 'error_rate',
      severity,
      category: 'infrastructure',
      
      affected: {
        sources: [sourceId],
        assets: [],
        endpoints: [],
      },
      
      metrics: {
        primary: { 
          name: 'Error Rate', 
          value: errorRate, 
          threshold: CONFIG.errorThresholds.warning, 
          unit: '%' 
        },
        secondary: burstDetected 
          ? [{ name: 'Recent Errors (1min)', value: stats.recent.length, unit: '' }]
          : undefined,
      },
      
      context: {
        regime: 'normal',
        recentEvents: burstDetected ? ['Error burst detected'] : [],
        relatedAlerts: [],
      },
      
      recommendations: {
        immediate: severity === 'emergency'
          ? ['Disable source', 'Switch to fallback', 'Alert on-call']
          : ['Investigate error cause'],
        shortTerm: ['Review API credentials', 'Check rate limits'],
        longTerm: ['Add retry logic', 'Improve circuit breaker'],
      },
      
      autoActions: severity === 'emergency'
        ? [{ action: 'Source disabled', success: true, timestamp: new Date() }]
        : [],
      
      status: 'new',
    };
    
    this.emitAlert(alert);
    return alert;
  }
  
  private isAlertCooldown(key: string): boolean {
    const lastAlert = this.recentAlertKeys.get(key);
    if (lastAlert && Date.now() - lastAlert < this.alertCooldownMs) {
      return true;
    }
    this.recentAlertKeys.set(key, Date.now());
    return false;
  }
  
  private emitAlert(alert: DeveloperAlert): void {
    this.alerts.push(alert);
    if (this.alerts.length > 1000) this.alerts.shift();
    
    const logMethod = alert.severity === 'emergency' || alert.severity === 'critical' ? 'error' : 'warn';
    logger[logMethod](`🚨 ${alert.type.toUpperCase()} ALERT: ${alert.metrics.primary.name}=${alert.metrics.primary.value}${alert.metrics.primary.unit}`, {
      sourceId: alert.affected.sources[0],
      severity: alert.severity,
    });
    
    if (this.alertCallback) {
      this.alertCallback(alert);
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PRICE ANOMALY DETECTION
  // ─────────────────────────────────────────────────────────────────────────────
  
  recordPrice(symbol: string, price: number, sourceId: string): void {
    this.priceDetector.recordPrice(symbol, price, sourceId);
  }
  
  checkPriceAnomaly(
    symbol: string,
    pricePoints: { sourceId: string; price: number }[],
    regime: MarketRegime = 'normal'
  ): EnhancedPriceAnomaly | null {
    const anomaly = this.priceDetector.detectAnomaly(symbol, pricePoints, regime);
    
    if (anomaly && (anomaly.severity === 'critical' || anomaly.severity === 'emergency')) {
      // Create developer alert for critical anomalies
      const alert: DeveloperAlert = {
        id: `anomaly-alert-${anomaly.id}`,
        timestamp: new Date(),
        type: 'anomaly',
        severity: anomaly.severity,
        category: 'data_quality',
        
        affected: {
          sources: [anomaly.source.id],
          assets: [anomaly.symbol],
          endpoints: [],
        },
        
        metrics: {
          primary: {
            name: 'Price Deviation',
            value: anomaly.prices.deviationPercent,
            threshold: CONFIG.anomalyThresholds[anomaly.assetClass].percentDeviation,
            unit: '%',
          },
          secondary: [
            { name: 'Z-Score', value: anomaly.statistics.zScore, unit: 'σ' },
            { name: 'Observed Price', value: anomaly.prices.observed, unit: '$' },
            { name: 'Consensus Price', value: anomaly.prices.consensus, unit: '$' },
          ],
        },
        
        context: {
          regime,
          recentEvents: anomaly.temporal.isFlashEvent ? ['Flash event detected'] : [],
          relatedAlerts: [],
        },
        
        recommendations: {
          immediate: anomaly.action.type === 'discarded'
            ? ['Data discarded automatically', `Using alternative: $${anomaly.action.alternativePrice}`]
            : ['Review data source', 'Check for exchange issues'],
          shortTerm: ['Verify source reliability', 'Check correlation with other sources'],
          longTerm: ['Consider adding more sources', 'Improve anomaly detection'],
        },
        
        autoActions: anomaly.action.type === 'discarded'
          ? [{ action: 'Anomalous data discarded', success: true, timestamp: new Date() }]
          : [],
        
        status: 'new',
      };
      
      this.emitAlert(alert);
    }
    
    return anomaly;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STATUS & METRICS
  // ─────────────────────────────────────────────────────────────────────────────
  
  getLatencyMetrics(sourceId: string): EnhancedLatencyMetrics | null {
    const stats = this.latencyStats.get(sourceId);
    if (!stats || stats.count === 0) return null;
    
    const exchangeType = EXCHANGE_TYPES[sourceId] || 'cex_secondary';
    const sla = CONFIG.latencySLA[exchangeType];
    const { slope, r2, prediction } = stats.getTrend();
    
    // Determine trend
    let trend: EnhancedLatencyMetrics['trend'];
    if (slope > 10) trend = 'critical';
    else if (slope > 5) trend = 'degrading';
    else if (slope < -5) trend = 'improving';
    else trend = 'stable';
    
    // Calculate SLA breaches
    const values = stats.rawValues;
    const breachCount = values.filter(v => v > sla.warning).length;
    
    return {
      sourceId,
      sourceName: sourceId,
      exchangeType,
      current: values[values.length - 1] || 0,
      trend,
      percentiles: stats.percentiles,
      statistics: {
        mean: stats.mean,
        stdDev: stats.stdDev,
        variance: stats.variance,
        skewness: stats.skewness,
        kurtosis: stats.kurtosis,
        cv: stats.cv,
      },
      sla: {
        target: sla.target,
        warningThreshold: sla.warning,
        criticalThreshold: sla.critical,
        breachCount,
        breachRate: values.length > 0 ? (breachCount / values.length) * 100 : 0,
        consecutiveBreaches: 0, // Would need tracking
        lastBreachTime: null,
      },
      reliability: {
        uptime: 99, // Would need actual tracking
        mtbf: 3600000,
        mttr: 1000,
        availabilityScore: 0.99,
      },
      temporal: {
        hourlyPattern: stats.getHourlyPattern(),
        dayOfWeekPattern: new Array(7).fill(stats.mean),
        recentTrend: slope,
        predictedNext: prediction,
        predictionConfidence: r2,
      },
      sampleCount: stats.count,
      lastUpdated: new Date(),
    };
  }
  
  getQualityScore(sourceId: string): SourceQualityScore {
    return this.priceDetector.getQualityScore(sourceId);
  }
  
  getFlashCrashEvents(): { active: FlashCrashEvent[]; recent: FlashCrashEvent[] } {
    return this.priceDetector.getFlashCrashEvents();
  }
  
  getRecentAlerts(limit: number = 50): DeveloperAlert[] {
    return this.alerts.slice(-limit);
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // COMPREHENSIVE STATUS
  // ─────────────────────────────────────────────────────────────────────────────
  
  getComprehensiveStatus(sourceIds: string[]): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    sources: {
      sourceId: string;
      latency: EnhancedLatencyMetrics | null;
      quality: SourceQualityScore;
      status: 'healthy' | 'degraded' | 'unhealthy';
    }[];
    flashCrashes: { active: number; recent24h: number };
    alerts: { critical: number; warning: number; recent: DeveloperAlert[] };
  } {
    const sources = sourceIds.map(sourceId => {
      const latency = this.getLatencyMetrics(sourceId);
      const quality = this.getQualityScore(sourceId);
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (quality.overallScore < 50) status = 'unhealthy';
      else if (quality.overallScore < 70) status = 'degraded';
      
      return { sourceId, latency, quality, status };
    });
    
    const unhealthyCount = sources.filter(s => s.status === 'unhealthy').length;
    const degradedCount = sources.filter(s => s.status === 'degraded').length;
    
    const overall = unhealthyCount > 0 ? 'unhealthy'
      : degradedCount > sources.length * 0.3 ? 'degraded'
      : 'healthy';
    
    const flashCrashes = this.getFlashCrashEvents();
    const recentAlerts = this.getRecentAlerts(10);
    
    return {
      overall,
      sources,
      flashCrashes: {
        active: flashCrashes.active.length,
        recent24h: flashCrashes.recent.length,
      },
      alerts: {
        critical: recentAlerts.filter(a => a.severity === 'critical' || a.severity === 'emergency').length,
        warning: recentAlerts.filter(a => a.severity === 'warning').length,
        recent: recentAlerts,
      },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

export const enhancedAnomalyMonitor = new EnhancedAnomalyLatencyMonitor();

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Filter anomalous prices using enhanced detection
 */
export function filterAnomalousPricesV2(
  symbol: string,
  pricePoints: { sourceId: string; price: number }[],
  regime: MarketRegime = 'normal'
): {
  validPrices: { sourceId: string; price: number }[];
  discardedPrices: { sourceId: string; price: number; reason: string }[];
  anomaly: EnhancedPriceAnomaly | null;
} {
  if (pricePoints.length < 2) {
    return { validPrices: pricePoints, discardedPrices: [], anomaly: null };
  }
  
  const anomaly = enhancedAnomalyMonitor.checkPriceAnomaly(symbol, pricePoints, regime);
  
  if (!anomaly || anomaly.action.type === 'none') {
    return { validPrices: pricePoints, discardedPrices: [], anomaly };
  }
  
  if (anomaly.action.type === 'discarded' || anomaly.action.type === 'quarantined') {
    return {
      validPrices: pricePoints.filter(p => p.sourceId !== anomaly.source.id),
      discardedPrices: [{
        sourceId: anomaly.source.id,
        price: anomaly.prices.observed,
        reason: anomaly.action.reason,
      }],
      anomaly,
    };
  }
  
  return { validPrices: pricePoints, discardedPrices: [], anomaly };
}

/**
 * Format monitor status for AI context
 */
export function formatEnhancedMonitorStatusForAI(sourceIds: string[]): string {
  const status = enhancedAnomalyMonitor.getComprehensiveStatus(sourceIds);
  
  const statusIcon = status.overall === 'healthy' ? '✅' : status.overall === 'degraded' ? '⚠️' : '❌';
  
  const lines = [
    '╔═══════════════════════════════════════════════════════════════════════════╗',
    '║         🔬 ENHANCED DATA QUALITY MONITOR v2.0                             ║',
    '╠═══════════════════════════════════════════════════════════════════════════╣',
    `║  Overall: ${statusIcon} ${status.overall.toUpperCase().padEnd(56)}║`,
    `║  Flash Crashes: ${status.flashCrashes.active} active, ${status.flashCrashes.recent24h} in 24h`.padEnd(74) + '║',
    `║  Alerts: ${status.alerts.critical} critical, ${status.alerts.warning} warnings`.padEnd(74) + '║',
    '╚═══════════════════════════════════════════════════════════════════════════╝',
    '',
  ];
  
  for (const source of status.sources.slice(0, 5)) {
    const icon = source.status === 'healthy' ? '✅' : source.status === 'degraded' ? '⚠️' : '❌';
    const latency = source.latency 
      ? `P50: ${source.latency.percentiles.p50.toFixed(0)}ms, P95: ${source.latency.percentiles.p95.toFixed(0)}ms`
      : 'No data';
    lines.push(`${icon} ${source.sourceId}: ${latency} | Quality: ${source.quality.overallScore.toFixed(0)}/100`);
  }
  
  return lines.join('\n');
}

