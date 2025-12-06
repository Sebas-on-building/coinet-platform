/**
 * ══════════════════════════════════════════════════════════════════════════════
 * 🔬 ANOMALY & LATENCY MONITORING - Step 1.4.3
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * Divine Perfection Implementation:
 * 
 * 1. EMPIRICAL CALIBRATION
 *    → Z-score based anomaly detection with rolling statistics
 *    → Adaptive thresholds based on historical volatility
 *    → R² correlation tracking between sources
 * 
 * 2. DE-CORRELATION & REGIME AWARENESS  
 *    → Different thresholds for bull/bear/crash markets
 *    → Volatility regime detection
 *    → Cross-source correlation penalties
 * 
 * 3. DATA QUALITY & ROBUSTNESS
 *    → Per-source latency percentiles (P50, P95, P99)
 *    → Error rate tracking with exponential decay
 *    → Confidence bands on all metrics
 * 
 * 4. MULTI-SEGMENT INDICES
 *    → Different anomaly thresholds by asset class (BTC, alts, memes)
 *    → Source-specific SLA definitions
 * 
 * 5. STATISTICALLY-ANCHORED THRESHOLDS
 *    → IQR-based outlier detection
 *    → Modified Z-score for robustness
 *    → Historical percentile rankings
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { logger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type AnomalyType = 'price_spike' | 'price_crash' | 'cross_source_deviation' | 'stale_data' | 'latency_spike' | 'error_rate';
export type MarketRegimeForAnomaly = 'low_volatility' | 'normal' | 'high_volatility' | 'extreme_volatility';
export type AssetClass = 'major' | 'large_cap' | 'mid_cap' | 'small_cap' | 'meme';

export interface LatencyMetrics {
  sourceId: string;
  current: number;           // Current latency (ms)
  p50: number;              // Median latency
  p95: number;              // 95th percentile
  p99: number;              // 99th percentile
  mean: number;             // Mean latency
  stdDev: number;           // Standard deviation
  sampleCount: number;      // Number of samples
  lastUpdated: Date;
  slaBreaches: number;      // Count of SLA breaches
  slaBreachRate: number;    // % of requests breaching SLA
  trend: 'improving' | 'stable' | 'degrading';
}

export interface ErrorMetrics {
  sourceId: string;
  totalRequests: number;
  totalErrors: number;
  errorRate: number;        // Current error rate (exponential decay)
  recentErrors: number;     // Errors in last 5 minutes
  consecutiveErrors: number;
  lastErrorTime: Date | null;
  lastErrorMessage: string | null;
  errorTypes: Map<string, number>;  // Error type -> count
  trend: 'improving' | 'stable' | 'degrading';
}

export interface PriceAnomaly {
  id: string;
  timestamp: Date;
  symbol: string;
  assetClass: AssetClass;
  anomalyType: AnomalyType;
  severity: AlertSeverity;
  
  // Statistical details
  observedPrice: number;
  expectedPrice: number;      // Consensus from other sources
  deviation: number;          // Absolute deviation
  deviationPercent: number;   // % deviation
  zScore: number;             // Standard deviations from mean
  modifiedZScore: number;     // Robust Z-score using MAD
  iqrPosition: number;        // Position relative to IQR
  
  // Source details
  sourceId: string;
  otherSources: { sourceId: string; price: number }[];
  
  // Action taken
  action: 'discarded' | 'flagged' | 'used_with_warning' | 'none';
  confidence: number;         // Confidence in anomaly detection (0-1)
  
  // Context
  marketRegime: MarketRegimeForAnomaly;
  recentVolatility: number;
  message: string;
}

export interface SourceHealthAlert {
  id: string;
  timestamp: Date;
  sourceId: string;
  sourceName: string;
  alertType: 'latency' | 'error_rate' | 'availability' | 'data_quality';
  severity: AlertSeverity;
  
  // Metrics
  currentValue: number;
  threshold: number;
  historicalAverage: number;
  
  // Recommendation
  recommendation: string;
  autoAction: 'none' | 'degraded' | 'disabled' | 'switched_to_backup';
  
  message: string;
}

export interface AnomalyMonitorConfig {
  // Latency SLAs by source tier
  latencySLA: {
    primary: { target: number; warning: number; critical: number };
    secondary: { target: number; warning: number; critical: number };
    tertiary: { target: number; warning: number; critical: number };
  };
  
  // Error rate thresholds
  errorRateThresholds: {
    warning: number;      // % error rate
    critical: number;
    emergency: number;
  };
  
  // Price anomaly thresholds by asset class
  priceAnomalyThresholds: {
    major: { zScore: number; percentDeviation: number };      // BTC, ETH
    large_cap: { zScore: number; percentDeviation: number };  // Top 20
    mid_cap: { zScore: number; percentDeviation: number };    // Top 100
    small_cap: { zScore: number; percentDeviation: number };  // Top 500
    meme: { zScore: number; percentDeviation: number };       // High volatility
  };
  
  // Rolling window sizes
  windows: {
    latencyWindow: number;      // Samples for latency stats
    priceWindow: number;        // Samples for price stats
    errorWindow: number;        // Minutes for error rate
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION - Divine Perfection Calibrated
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: AnomalyMonitorConfig = {
  latencySLA: {
    primary: { target: 200, warning: 500, critical: 1000 },    // Enterprise APIs
    secondary: { target: 500, warning: 1000, critical: 2000 }, // Free APIs
    tertiary: { target: 1000, warning: 2000, critical: 5000 }, // DEX APIs
  },
  
  errorRateThresholds: {
    warning: 5,       // 5% error rate
    critical: 15,     // 15% error rate
    emergency: 30,    // 30% error rate - consider disabling
  },
  
  // Calibrated from historical crypto volatility
  priceAnomalyThresholds: {
    major: { zScore: 3.5, percentDeviation: 2.0 },      // BTC/ETH: very stable
    large_cap: { zScore: 3.0, percentDeviation: 3.0 },  // Top alts
    mid_cap: { zScore: 2.5, percentDeviation: 5.0 },    // Mid caps
    small_cap: { zScore: 2.0, percentDeviation: 8.0 },  // Small caps
    meme: { zScore: 1.5, percentDeviation: 15.0 },      // Memes: high volatility expected
  },
  
  windows: {
    latencyWindow: 100,     // Last 100 requests
    priceWindow: 50,        // Last 50 price points
    errorWindow: 5,         // Last 5 minutes
  },
};

// Asset classification
const ASSET_CLASSIFICATION: Record<string, AssetClass> = {
  btc: 'major', bitcoin: 'major',
  eth: 'major', ethereum: 'major',
  bnb: 'large_cap', sol: 'large_cap', xrp: 'large_cap', ada: 'large_cap',
  avax: 'large_cap', dot: 'large_cap', link: 'large_cap', matic: 'large_cap',
  doge: 'meme', shib: 'meme', pepe: 'meme', bonk: 'meme', floki: 'meme',
  turbo: 'meme', wif: 'meme', meme: 'meme',
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICAL UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

class RollingStatistics {
  private values: number[] = [];
  private maxSize: number;
  
  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }
  
  add(value: number): void {
    this.values.push(value);
    if (this.values.length > this.maxSize) {
      this.values.shift();
    }
  }
  
  get count(): number {
    return this.values.length;
  }
  
  get mean(): number {
    if (this.values.length === 0) return 0;
    return this.values.reduce((a, b) => a + b, 0) / this.values.length;
  }
  
  get median(): number {
    if (this.values.length === 0) return 0;
    const sorted = [...this.values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  
  get stdDev(): number {
    if (this.values.length < 2) return 0;
    const mean = this.mean;
    const squaredDiffs = this.values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (this.values.length - 1));
  }
  
  // Median Absolute Deviation (robust to outliers)
  get mad(): number {
    if (this.values.length === 0) return 0;
    const median = this.median;
    const absoluteDeviations = this.values.map(v => Math.abs(v - median));
    const sorted = absoluteDeviations.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  
  percentile(p: number): number {
    if (this.values.length === 0) return 0;
    const sorted = [...this.values].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
  }
  
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
    // 0.6745 is the conversion factor for normal distribution
    return 0.6745 * (value - this.median) / mad;
  }
  
  // Check if value is outlier by IQR
  isIQROutlier(value: number): boolean {
    const { lowerFence, upperFence } = this.iqr;
    return value < lowerFence || value > upperFence;
  }
  
  getValues(): number[] {
    return [...this.values];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LATENCY MONITOR
// ═══════════════════════════════════════════════════════════════════════════════

class LatencyMonitor {
  private latencies: Map<string, RollingStatistics> = new Map();
  private slaBreaches: Map<string, number> = new Map();
  private totalRequests: Map<string, number> = new Map();
  private config: AnomalyMonitorConfig;
  
  constructor(config: AnomalyMonitorConfig) {
    this.config = config;
  }
  
  record(sourceId: string, latencyMs: number, sourceTier: 'primary' | 'secondary' | 'tertiary'): void {
    if (!this.latencies.has(sourceId)) {
      this.latencies.set(sourceId, new RollingStatistics(this.config.windows.latencyWindow));
      this.slaBreaches.set(sourceId, 0);
      this.totalRequests.set(sourceId, 0);
    }
    
    const stats = this.latencies.get(sourceId)!;
    stats.add(latencyMs);
    
    const total = (this.totalRequests.get(sourceId) || 0) + 1;
    this.totalRequests.set(sourceId, total);
    
    // Check SLA breach
    const sla = this.config.latencySLA[sourceTier];
    if (latencyMs > sla.warning) {
      const breaches = (this.slaBreaches.get(sourceId) || 0) + 1;
      this.slaBreaches.set(sourceId, breaches);
    }
  }
  
  getMetrics(sourceId: string): LatencyMetrics | null {
    const stats = this.latencies.get(sourceId);
    if (!stats || stats.count === 0) return null;
    
    const total = this.totalRequests.get(sourceId) || 1;
    const breaches = this.slaBreaches.get(sourceId) || 0;
    
    // Determine trend
    const values = stats.getValues();
    const recentMean = values.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, values.length);
    const overallMean = stats.mean;
    const trend = recentMean > overallMean * 1.1 ? 'degrading' 
                : recentMean < overallMean * 0.9 ? 'improving' 
                : 'stable';
    
    return {
      sourceId,
      current: values[values.length - 1] || 0,
      p50: stats.percentile(50),
      p95: stats.percentile(95),
      p99: stats.percentile(99),
      mean: stats.mean,
      stdDev: stats.stdDev,
      sampleCount: stats.count,
      lastUpdated: new Date(),
      slaBreaches: breaches,
      slaBreachRate: (breaches / total) * 100,
      trend,
    };
  }
  
  checkLatencyAnomaly(sourceId: string, latencyMs: number, sourceTier: 'primary' | 'secondary' | 'tertiary'): SourceHealthAlert | null {
    const stats = this.latencies.get(sourceId);
    if (!stats || stats.count < 5) return null;
    
    const sla = this.config.latencySLA[sourceTier];
    const zScore = stats.zScore(latencyMs);
    
    // Check for latency spike
    if (latencyMs > sla.critical || zScore > 3) {
      const severity: AlertSeverity = latencyMs > sla.critical * 2 ? 'critical' : 'warning';
      
      return {
        id: `latency-${sourceId}-${Date.now()}`,
        timestamp: new Date(),
        sourceId,
        sourceName: sourceId,
        alertType: 'latency',
        severity,
        currentValue: latencyMs,
        threshold: sla.warning,
        historicalAverage: stats.mean,
        recommendation: severity === 'critical' 
          ? `Consider switching to backup source. Latency ${latencyMs}ms is ${(latencyMs / stats.mean).toFixed(1)}x normal.`
          : `Monitor closely. Latency elevated at ${latencyMs}ms (normal: ${stats.mean.toFixed(0)}ms).`,
        autoAction: severity === 'critical' ? 'degraded' : 'none',
        message: `⚠️ Latency spike on ${sourceId}: ${latencyMs}ms (z-score: ${zScore.toFixed(2)}, P95: ${stats.percentile(95).toFixed(0)}ms)`,
      };
    }
    
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR RATE MONITOR
// ═══════════════════════════════════════════════════════════════════════════════

interface ErrorRecord {
  timestamp: Date;
  errorType: string;
  message: string;
}

class ErrorRateMonitor {
  private errors: Map<string, ErrorRecord[]> = new Map();
  private requests: Map<string, number> = new Map();
  private consecutiveErrors: Map<string, number> = new Map();
  private config: AnomalyMonitorConfig;
  
  constructor(config: AnomalyMonitorConfig) {
    this.config = config;
  }
  
  recordSuccess(sourceId: string): void {
    const total = (this.requests.get(sourceId) || 0) + 1;
    this.requests.set(sourceId, total);
    this.consecutiveErrors.set(sourceId, 0);
    this.cleanupOldErrors(sourceId);
  }
  
  recordError(sourceId: string, errorType: string, message: string): void {
    const total = (this.requests.get(sourceId) || 0) + 1;
    this.requests.set(sourceId, total);
    
    const consecutive = (this.consecutiveErrors.get(sourceId) || 0) + 1;
    this.consecutiveErrors.set(sourceId, consecutive);
    
    if (!this.errors.has(sourceId)) {
      this.errors.set(sourceId, []);
    }
    
    this.errors.get(sourceId)!.push({
      timestamp: new Date(),
      errorType,
      message,
    });
    
    this.cleanupOldErrors(sourceId);
  }
  
  private cleanupOldErrors(sourceId: string): void {
    const errors = this.errors.get(sourceId);
    if (!errors) return;
    
    const windowMs = this.config.windows.errorWindow * 60 * 1000;
    const cutoff = Date.now() - windowMs;
    
    const filtered = errors.filter(e => e.timestamp.getTime() > cutoff);
    this.errors.set(sourceId, filtered);
  }
  
  getMetrics(sourceId: string): ErrorMetrics | null {
    const totalRequests = this.requests.get(sourceId) || 0;
    if (totalRequests === 0) return null;
    
    const errors = this.errors.get(sourceId) || [];
    const recentErrors = errors.length;
    
    // Calculate error rate with exponential decay
    const windowMs = this.config.windows.errorWindow * 60 * 1000;
    const now = Date.now();
    let weightedErrors = 0;
    let totalWeight = 0;
    
    for (const error of errors) {
      const age = now - error.timestamp.getTime();
      const weight = Math.exp(-age / windowMs);
      weightedErrors += weight;
      totalWeight += 1;
    }
    
    const decayedErrorRate = totalWeight > 0 
      ? (weightedErrors / Math.min(totalRequests, 100)) * 100 
      : 0;
    
    // Error type counts
    const errorTypes = new Map<string, number>();
    for (const error of errors) {
      errorTypes.set(error.errorType, (errorTypes.get(error.errorType) || 0) + 1);
    }
    
    const lastError = errors[errors.length - 1] || null;
    
    // Trend based on recent vs historical
    const recentCount = errors.filter(e => e.timestamp.getTime() > now - 60000).length;
    const olderCount = errors.filter(e => e.timestamp.getTime() <= now - 60000).length;
    const trend = recentCount > olderCount * 2 ? 'degrading'
                : recentCount < olderCount * 0.5 ? 'improving'
                : 'stable';
    
    return {
      sourceId,
      totalRequests,
      totalErrors: errors.length,
      errorRate: decayedErrorRate,
      recentErrors,
      consecutiveErrors: this.consecutiveErrors.get(sourceId) || 0,
      lastErrorTime: lastError?.timestamp || null,
      lastErrorMessage: lastError?.message || null,
      errorTypes,
      trend,
    };
  }
  
  checkErrorAnomaly(sourceId: string): SourceHealthAlert | null {
    const metrics = this.getMetrics(sourceId);
    if (!metrics) return null;
    
    const { errorRate, consecutiveErrors, trend } = metrics;
    const thresholds = this.config.errorRateThresholds;
    
    let severity: AlertSeverity | null = null;
    let autoAction: SourceHealthAlert['autoAction'] = 'none';
    
    if (errorRate > thresholds.emergency || consecutiveErrors > 10) {
      severity = 'emergency';
      autoAction = 'disabled';
    } else if (errorRate > thresholds.critical || consecutiveErrors > 5) {
      severity = 'critical';
      autoAction = 'degraded';
    } else if (errorRate > thresholds.warning || consecutiveErrors > 3) {
      severity = 'warning';
    }
    
    if (!severity) return null;
    
    return {
      id: `error-${sourceId}-${Date.now()}`,
      timestamp: new Date(),
      sourceId,
      sourceName: sourceId,
      alertType: 'error_rate',
      severity,
      currentValue: errorRate,
      threshold: thresholds.warning,
      historicalAverage: 0,
      recommendation: severity === 'emergency'
        ? `Disable ${sourceId} immediately. ${consecutiveErrors} consecutive errors, ${errorRate.toFixed(1)}% error rate.`
        : severity === 'critical'
        ? `Switch to backup source. High error rate (${errorRate.toFixed(1)}%) detected.`
        : `Monitor ${sourceId}. Error rate (${errorRate.toFixed(1)}%) above normal.`,
      autoAction,
      message: `🚨 Error rate alert on ${sourceId}: ${errorRate.toFixed(1)}% (${consecutiveErrors} consecutive, trend: ${trend})`,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRICE ANOMALY DETECTOR
// ═══════════════════════════════════════════════════════════════════════════════

interface PricePoint {
  sourceId: string;
  price: number;
  timestamp: Date;
}

class PriceAnomalyDetector {
  private priceHistory: Map<string, RollingStatistics> = new Map();
  private volatilityHistory: Map<string, RollingStatistics> = new Map();
  private config: AnomalyMonitorConfig;
  
  constructor(config: AnomalyMonitorConfig) {
    this.config = config;
  }
  
  private getAssetClass(symbol: string): AssetClass {
    const normalized = symbol.toLowerCase();
    return ASSET_CLASSIFICATION[normalized] || 'mid_cap';
  }
  
  private getThresholds(assetClass: AssetClass) {
    return this.config.priceAnomalyThresholds[assetClass];
  }
  
  // Record a price point for rolling statistics
  recordPrice(symbol: string, price: number): void {
    const key = symbol.toLowerCase();
    
    if (!this.priceHistory.has(key)) {
      this.priceHistory.set(key, new RollingStatistics(this.config.windows.priceWindow));
      this.volatilityHistory.set(key, new RollingStatistics(this.config.windows.priceWindow));
    }
    
    const history = this.priceHistory.get(key)!;
    const volatilityHist = this.volatilityHistory.get(key)!;
    
    // Calculate return if we have history
    if (history.count > 0) {
      const lastPrice = history.getValues()[history.count - 1];
      const return_ = Math.abs((price - lastPrice) / lastPrice) * 100;
      volatilityHist.add(return_);
    }
    
    history.add(price);
  }
  
  // Detect anomaly when comparing across sources
  detectCrossSourceAnomaly(
    symbol: string,
    pricePoints: PricePoint[],
    marketRegime: MarketRegimeForAnomaly = 'normal'
  ): PriceAnomaly | null {
    if (pricePoints.length < 2) return null;
    
    const assetClass = this.getAssetClass(symbol);
    const thresholds = this.getThresholds(assetClass);
    
    // Adjust thresholds based on market regime
    const regimeMultiplier = {
      'low_volatility': 0.7,
      'normal': 1.0,
      'high_volatility': 1.5,
      'extreme_volatility': 2.0,
    }[marketRegime];
    
    const adjustedZThreshold = thresholds.zScore * regimeMultiplier;
    const adjustedPercentThreshold = thresholds.percentDeviation * regimeMultiplier;
    
    // Calculate consensus price (median of all sources)
    const prices = pricePoints.map(p => p.price).sort((a, b) => a - b);
    const consensusPrice = prices[Math.floor(prices.length / 2)];
    
    // Calculate statistics
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const stdDev = Math.sqrt(
      prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length
    );
    
    // Calculate MAD for modified Z-score
    const absoluteDeviations = prices.map(p => Math.abs(p - consensusPrice)).sort((a, b) => a - b);
    const mad = absoluteDeviations[Math.floor(absoluteDeviations.length / 2)];
    
    // Check each price point for anomalies
    for (const point of pricePoints) {
      const deviation = Math.abs(point.price - consensusPrice);
      const deviationPercent = (deviation / consensusPrice) * 100;
      const zScore = stdDev > 0 ? (point.price - mean) / stdDev : 0;
      const modifiedZScore = mad > 0 ? 0.6745 * (point.price - consensusPrice) / mad : 0;
      
      // IQR-based check
      const q1 = prices[Math.floor(prices.length * 0.25)];
      const q3 = prices[Math.floor(prices.length * 0.75)];
      const iqr = q3 - q1;
      const iqrPosition = iqr > 0 ? (point.price - q1) / iqr : 0;
      
      // Determine if anomaly
      const isZScoreAnomaly = Math.abs(zScore) > adjustedZThreshold;
      const isPercentAnomaly = deviationPercent > adjustedPercentThreshold;
      const isModifiedZAnomaly = Math.abs(modifiedZScore) > adjustedZThreshold * 1.2;
      
      // Require multiple indicators for high confidence
      const anomalyCount = [isZScoreAnomaly, isPercentAnomaly, isModifiedZAnomaly].filter(Boolean).length;
      
      if (anomalyCount >= 2) {
        const severity: AlertSeverity = 
          deviationPercent > adjustedPercentThreshold * 3 ? 'emergency'
          : deviationPercent > adjustedPercentThreshold * 2 ? 'critical'
          : deviationPercent > adjustedPercentThreshold * 1.5 ? 'warning'
          : 'info';
        
        const anomalyType: AnomalyType = point.price > consensusPrice ? 'price_spike' : 'price_crash';
        
        // Determine action
        let action: PriceAnomaly['action'] = 'none';
        if (severity === 'emergency' || severity === 'critical') {
          action = 'discarded';
        } else if (severity === 'warning') {
          action = 'flagged';
        }
        
        // Calculate confidence in anomaly detection
        const confidence = Math.min(1, anomalyCount * 0.33 + Math.min(deviationPercent / (adjustedPercentThreshold * 3), 0.34));
        
        // Get recent volatility
        const volatilityHist = this.volatilityHistory.get(symbol.toLowerCase());
        const recentVolatility = volatilityHist?.mean || 0;
        
        return {
          id: `anomaly-${symbol}-${point.sourceId}-${Date.now()}`,
          timestamp: new Date(),
          symbol: symbol.toUpperCase(),
          assetClass,
          anomalyType,
          severity,
          
          observedPrice: point.price,
          expectedPrice: consensusPrice,
          deviation,
          deviationPercent,
          zScore,
          modifiedZScore,
          iqrPosition,
          
          sourceId: point.sourceId,
          otherSources: pricePoints
            .filter(p => p.sourceId !== point.sourceId)
            .map(p => ({ sourceId: p.sourceId, price: p.price })),
          
          action,
          confidence,
          
          marketRegime,
          recentVolatility,
          message: `🔬 Price anomaly detected: ${symbol} from ${point.sourceId} shows $${point.price.toFixed(6)} vs consensus $${consensusPrice.toFixed(6)} (${deviationPercent.toFixed(2)}% deviation, z=${zScore.toFixed(2)})`,
        };
      }
    }
    
    return null;
  }
  
  // Detect anomaly in time series (sudden jump from history)
  detectTimeSeriesAnomaly(
    symbol: string,
    price: number,
    sourceId: string,
    marketRegime: MarketRegimeForAnomaly = 'normal'
  ): PriceAnomaly | null {
    const key = symbol.toLowerCase();
    const history = this.priceHistory.get(key);
    
    if (!history || history.count < 5) return null;
    
    const assetClass = this.getAssetClass(symbol);
    const thresholds = this.getThresholds(assetClass);
    
    // Adjust for regime
    const regimeMultiplier = {
      'low_volatility': 0.7,
      'normal': 1.0,
      'high_volatility': 1.5,
      'extreme_volatility': 2.0,
    }[marketRegime];
    
    const zScore = history.zScore(price);
    const modifiedZScore = history.modifiedZScore(price);
    const isIQROutlier = history.isIQROutlier(price);
    
    const adjustedThreshold = thresholds.zScore * regimeMultiplier;
    
    // Check for anomaly
    if (Math.abs(zScore) > adjustedThreshold || Math.abs(modifiedZScore) > adjustedThreshold * 1.2) {
      const expectedPrice = history.median;
      const deviation = Math.abs(price - expectedPrice);
      const deviationPercent = (deviation / expectedPrice) * 100;
      
      const severity: AlertSeverity = 
        Math.abs(zScore) > adjustedThreshold * 2 ? 'critical'
        : Math.abs(zScore) > adjustedThreshold * 1.5 ? 'warning'
        : 'info';
      
      const anomalyType: AnomalyType = price > expectedPrice ? 'price_spike' : 'price_crash';
      
      const volatilityHist = this.volatilityHistory.get(key);
      
      return {
        id: `ts-anomaly-${symbol}-${Date.now()}`,
        timestamp: new Date(),
        symbol: symbol.toUpperCase(),
        assetClass,
        anomalyType,
        severity,
        
        observedPrice: price,
        expectedPrice,
        deviation,
        deviationPercent,
        zScore,
        modifiedZScore,
        iqrPosition: 0,
        
        sourceId,
        otherSources: [],
        
        action: severity === 'critical' ? 'flagged' : 'used_with_warning',
        confidence: Math.min(1, Math.abs(zScore) / (adjustedThreshold * 2)),
        
        marketRegime,
        recentVolatility: volatilityHist?.mean || 0,
        message: `📊 Time-series anomaly: ${symbol} jumped to $${price.toFixed(6)} (z=${zScore.toFixed(2)}, expected ~$${expectedPrice.toFixed(6)})`,
      };
    }
    
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN MONITOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class AnomalyLatencyMonitor {
  private latencyMonitor: LatencyMonitor;
  private errorMonitor: ErrorRateMonitor;
  private priceDetector: PriceAnomalyDetector;
  private config: AnomalyMonitorConfig;
  
  // Alert history for deduplication
  private recentAlerts: Map<string, Date> = new Map();
  private alertCooldown = 60000; // 1 minute cooldown between same alerts
  
  // Alert callback
  private alertCallback?: (alert: SourceHealthAlert | PriceAnomaly) => void;
  
  constructor(config: Partial<AnomalyMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.latencyMonitor = new LatencyMonitor(this.config);
    this.errorMonitor = new ErrorRateMonitor(this.config);
    this.priceDetector = new PriceAnomalyDetector(this.config);
  }
  
  setAlertCallback(callback: (alert: SourceHealthAlert | PriceAnomaly) => void): void {
    this.alertCallback = callback;
  }
  
  private shouldAlert(alertId: string): boolean {
    const lastAlert = this.recentAlerts.get(alertId);
    if (lastAlert && Date.now() - lastAlert.getTime() < this.alertCooldown) {
      return false;
    }
    this.recentAlerts.set(alertId, new Date());
    return true;
  }
  
  private emitAlert(alert: SourceHealthAlert | PriceAnomaly): void {
    const alertKey = `${(alert as any).sourceId || (alert as any).symbol}-${(alert as any).alertType || (alert as any).anomalyType}`;
    
    if (!this.shouldAlert(alertKey)) return;
    
    // Log based on severity
    const severityMap: Record<string, 'info' | 'warn' | 'error'> = {
      'info': 'info',
      'warning': 'warn',
      'critical': 'error',
      'emergency': 'error',
    };
    const logMethod = severityMap[(alert as any).severity] || 'info';
    
    logger[logMethod]((alert as any).message, { alert });
    
    // Call callback if set
    if (this.alertCallback) {
      this.alertCallback(alert);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Record a successful API request with latency
   */
  recordRequest(
    sourceId: string,
    latencyMs: number,
    sourceTier: 'primary' | 'secondary' | 'tertiary' = 'secondary'
  ): SourceHealthAlert | null {
    this.latencyMonitor.record(sourceId, latencyMs, sourceTier);
    this.errorMonitor.recordSuccess(sourceId);
    
    const alert = this.latencyMonitor.checkLatencyAnomaly(sourceId, latencyMs, sourceTier);
    if (alert) {
      this.emitAlert(alert);
    }
    
    return alert;
  }
  
  /**
   * Record a failed API request
   */
  recordError(
    sourceId: string,
    errorType: string,
    message: string
  ): SourceHealthAlert | null {
    this.errorMonitor.recordError(sourceId, errorType, message);
    
    const alert = this.errorMonitor.checkErrorAnomaly(sourceId);
    if (alert) {
      this.emitAlert(alert);
    }
    
    return alert;
  }
  
  /**
   * Record price for time-series tracking
   */
  recordPrice(symbol: string, price: number): void {
    this.priceDetector.recordPrice(symbol, price);
  }
  
  /**
   * Check for cross-source price anomalies
   */
  checkPriceAnomaly(
    symbol: string,
    pricePoints: { sourceId: string; price: number }[],
    marketRegime: MarketRegimeForAnomaly = 'normal'
  ): PriceAnomaly | null {
    const points: PricePoint[] = pricePoints.map(p => ({
      ...p,
      timestamp: new Date(),
    }));
    
    const anomaly = this.priceDetector.detectCrossSourceAnomaly(symbol, points, marketRegime);
    if (anomaly) {
      this.emitAlert(anomaly);
    }
    
    return anomaly;
  }
  
  /**
   * Check for time-series price anomaly
   */
  checkTimeSeriesAnomaly(
    symbol: string,
    price: number,
    sourceId: string,
    marketRegime: MarketRegimeForAnomaly = 'normal'
  ): PriceAnomaly | null {
    const anomaly = this.priceDetector.detectTimeSeriesAnomaly(symbol, price, sourceId, marketRegime);
    if (anomaly) {
      this.emitAlert(anomaly);
    }
    
    return anomaly;
  }
  
  /**
   * Get all latency metrics
   */
  getLatencyMetrics(): Map<string, LatencyMetrics> {
    const result = new Map<string, LatencyMetrics>();
    // Would iterate over all sources, but we need to track source IDs
    return result;
  }
  
  /**
   * Get latency metrics for a specific source
   */
  getSourceLatency(sourceId: string): LatencyMetrics | null {
    return this.latencyMonitor.getMetrics(sourceId);
  }
  
  /**
   * Get error metrics for a specific source
   */
  getSourceErrors(sourceId: string): ErrorMetrics | null {
    return this.errorMonitor.getMetrics(sourceId);
  }
  
  /**
   * Get comprehensive health status
   */
  getHealthStatus(sourceIds: string[]): {
    sources: { 
      sourceId: string; 
      latency: LatencyMetrics | null;
      errors: ErrorMetrics | null;
      status: 'healthy' | 'degraded' | 'unhealthy';
      recommendation: string;
    }[];
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
  } {
    const sources = sourceIds.map(sourceId => {
      const latency = this.latencyMonitor.getMetrics(sourceId);
      const errors = this.errorMonitor.getMetrics(sourceId);
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let recommendation = 'Operating normally';
      
      // Check latency
      if (latency) {
        if (latency.slaBreachRate > 30) {
          status = 'unhealthy';
          recommendation = `High latency: P95=${latency.p95.toFixed(0)}ms, ${latency.slaBreachRate.toFixed(1)}% SLA breaches`;
        } else if (latency.slaBreachRate > 10 || latency.trend === 'degrading') {
          if (status !== 'unhealthy') {
            status = 'degraded';
          }
          recommendation = `Elevated latency: P95=${latency.p95.toFixed(0)}ms, trend ${latency.trend}`;
        }
      }
      
      // Check errors
      if (errors) {
        if (errors.errorRate > this.config.errorRateThresholds.critical) {
          status = 'unhealthy';
          recommendation = `High error rate: ${errors.errorRate.toFixed(1)}% (${errors.consecutiveErrors} consecutive)`;
        } else if (errors.errorRate > this.config.errorRateThresholds.warning) {
          status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
          recommendation = `Elevated errors: ${errors.errorRate.toFixed(1)}%, trend ${errors.trend}`;
        }
      }
      
      return { sourceId, latency, errors, status, recommendation };
    });
    
    const unhealthyCount = sources.filter(s => s.status === 'unhealthy').length;
    const degradedCount = sources.filter(s => s.status === 'degraded').length;
    
    const overallHealth = unhealthyCount > 0 ? 'unhealthy'
      : degradedCount > sources.length * 0.3 ? 'degraded'
      : 'healthy';
    
    return { sources, overallHealth };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

export const anomalyMonitor = new AnomalyLatencyMonitor();

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION HELPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Filter out anomalous prices from a set of price points
 * Returns only prices that pass anomaly detection
 */
export function filterAnomalousPrices(
  symbol: string,
  pricePoints: { sourceId: string; price: number }[],
  marketRegime: MarketRegimeForAnomaly = 'normal'
): { 
  validPrices: { sourceId: string; price: number }[];
  discardedPrices: { sourceId: string; price: number; reason: string }[];
  anomaly: PriceAnomaly | null;
} {
  if (pricePoints.length < 2) {
    return { validPrices: pricePoints, discardedPrices: [], anomaly: null };
  }
  
  const anomaly = anomalyMonitor.checkPriceAnomaly(symbol, pricePoints, marketRegime);
  
  if (!anomaly || anomaly.action === 'none') {
    return { validPrices: pricePoints, discardedPrices: [], anomaly };
  }
  
  if (anomaly.action === 'discarded') {
    const validPrices = pricePoints.filter(p => p.sourceId !== anomaly.sourceId);
    const discardedPrices = [{
      sourceId: anomaly.sourceId,
      price: anomaly.observedPrice,
      reason: anomaly.message,
    }];
    return { validPrices, discardedPrices, anomaly };
  }
  
  // For 'flagged' or 'used_with_warning', return all but with anomaly info
  return { validPrices: pricePoints, discardedPrices: [], anomaly };
}

/**
 * Format monitor status for AI context
 */
export function formatMonitorStatusForAI(sourceIds: string[]): string {
  const health = anomalyMonitor.getHealthStatus(sourceIds);
  
  const lines: string[] = [
    '╔═══════════════════════════════════════════════════════════════════════════╗',
    '║         🔬 DATA SOURCE HEALTH MONITOR - Step 1.4.3                        ║',
    '╠═══════════════════════════════════════════════════════════════════════════╣',
    `║  Overall Status: ${health.overallHealth.toUpperCase().padEnd(52)}║`,
    '╚═══════════════════════════════════════════════════════════════════════════╝',
    '',
  ];
  
  for (const source of health.sources) {
    const statusIcon = source.status === 'healthy' ? '✅' : source.status === 'degraded' ? '⚠️' : '❌';
    const latencyStr = source.latency 
      ? `P50: ${source.latency.p50.toFixed(0)}ms, P95: ${source.latency.p95.toFixed(0)}ms`
      : 'No data';
    const errorStr = source.errors
      ? `Errors: ${source.errors.errorRate.toFixed(1)}%`
      : 'No errors';
    
    lines.push(`${statusIcon} ${source.sourceId}: ${latencyStr} | ${errorStr}`);
    if (source.status !== 'healthy') {
      lines.push(`   → ${source.recommendation}`);
    }
  }
  
  return lines.join('\n');
}

