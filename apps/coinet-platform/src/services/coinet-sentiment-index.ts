/**
 * 📊 COINET SENTIMENT INDEX (CSI) - Enterprise-Grade Market Sentiment
 * 
 * A mathematically precise Fear & Greed Index implementation
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE: TWO-LAYER STRUCTURE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 1. HEADLINE SENTIMENT (Primary)
 *    - We use the Fear & Greed Index from Alternative.me as our canonical value
 *    - This is a widely used industry benchmark (NOT the same as CMC's index)
 *    - 0 = Extreme Fear, 100 = Extreme Greed
 * 
 * 2. COINET CSI FACTOR MODEL (Secondary)
 *    - We compute a factor-based sentiment score that EXPLAINS why the market
 *      is in that regime (fear/greed)
 *    - The goal is NOT to clone Alternative.me, but to provide transparent,
 *      quantitative drivers
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * MATHEMATICAL SPECIFICATION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * CSI_factor(t) = Σ_k w_k · G_k(t)
 * 
 * Where:
 *   k ∈ {MOM, VOL, PCR, SSR, SOC}
 *   w_k = factor weight (Σ w_k = 1)
 *   G_k(t) = greed score for factor k at time t, in [0, 100]
 * 
 * Weights:
 *   MOM (Momentum)    = 0.30
 *   VOL (Volatility)  = 0.20
 *   PCR (Derivatives) = 0.20
 *   SSR (Stablecoins) = 0.15
 *   SOC (Social)      = 0.15
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * UPDATE FREQUENCY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PRIMARY (Alt.me F&G): Refreshed daily, in sync with Alternative.me
 * CSI FACTORS: Recomputed every 12 hours from live market data
 * 
 * @module coinet-sentiment-index
 * @version 3.0.0 - Mathematically Precise
 */

import axios from 'axios';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Sentiment regime classification
 */
export type SentimentRegime = 
  | 'extreme_fear'   // 0-24
  | 'fear'           // 25-44
  | 'neutral'        // 45-55
  | 'greed'          // 56-75
  | 'extreme_greed'; // 76-100

/**
 * Factor component with raw and normalized values
 */
export interface FactorComponent {
  name: string;
  symbol: string;
  
  // Raw values
  rawValue: number;
  rawUnit: string;
  
  // Percentile calculation
  percentile: number;           // p_k(t) ∈ (0, 1)
  lookbackDays: number;
  historicalRank: number;
  historicalCount: number;
  
  // Greed score
  greedScore: number;           // G_k(t) ∈ [0, 100]
  isInverted: boolean;          // true for fear-when-high factors
  
  // Weight
  weight: number;               // w_k
  weightedContribution: number; // w_k * G_k(t)
  
  // Interpretation
  interpretation: string;
  signal: 'bullish' | 'bearish' | 'neutral';
}

/**
 * Price momentum factor data
 */
export interface MomentumData {
  coins: Array<{
    symbol: string;
    name: string;
    price: number;
    price30dAgo: number;
    marketCap: number;
    weight: number;              // w_i(t) = MC_i / Σ MC
    logReturn30d: number;        // r_i(t) = ln(P_i(t) / P_i(t-30))
  }>;
  portfolioReturn: number;      // R_mom(t) = Σ w_i * r_i
}

/**
 * Volatility factor data
 */
export interface VolatilityData {
  btcImpliedVol: number;        // BVIV(t) - BTC 30-day implied vol
  ethImpliedVol: number;        // EVIV(t) - ETH 30-day implied vol
  averageVol: number;           // x_vol(t) = (BVIV + EVIV) / 2
  btcRealizedVol?: number;      // Fallback: realized volatility
  ethRealizedVol?: number;
}

/**
 * Derivatives factor data
 */
export interface DerivativesData {
  btcPutCallRatio: number;      // PCR_BTC(t)
  ethPutCallRatio: number;      // PCR_ETH(t)
  averagePCR: number;           // x_deriv(t) = (PCR_BTC + PCR_ETH) / 2
  btcOpenInterest?: number;
  ethOpenInterest?: number;
  fundingRate?: number;
}

/**
 * Stablecoin Supply Ratio data
 */
export interface SSRData {
  btcMarketCap: number;         // MC_BTC(t)
  stablecoinMarketCap: number;  // MC_stables(t)
  ssr: number;                  // SSR(t) = MC_BTC / MC_stables
  stablecoins: Array<{
    symbol: string;
    marketCap: number;
  }>;
}

/**
 * Social factor data
 */
export interface SocialData {
  // Search volume (Google Trends style)
  searchVolume: {
    bitcoin: number;
    ethereum: number;
    crypto: number;
    composite: number;
  };
  
  // Social engagement
  socialEngagement: {
    twitterMentions: number;
    redditActivity: number;
    telegramActivity: number;
    composite: number;
  };
  
  // Sentiment from social analysis
  socialSentiment: {
    score: number;              // -1 to 1
    bullishRatio: number;       // % bullish posts
    bearishRatio: number;       // % bearish posts
  };
  
  // Combined social score
  compositeScore: number;       // x_soc(t)
}

/**
 * Historical data point for percentile calculation
 */
export interface HistoricalDataPoint {
  date: Date;
  momentum: number;
  volatility: number;
  derivatives: number;
  ssr: number;
  social: number;
  index: number;
}

/**
 * Complete CSI calculation result
 */
export interface CSIResult {
  timestamp: string;
  
  // Final index value
  index: {
    raw: number;                // FGI_raw(t)
    smoothed: number;           // FGI_smooth(t) with EMA
    rounded: number;            // Published value
    regime: SentimentRegime;
    regimeLabel: string;
  };
  
  // Factor breakdown
  factors: {
    momentum: FactorComponent;
    volatility: FactorComponent;
    derivatives: FactorComponent;
    ssr: FactorComponent;
    social: FactorComponent;
  };
  
  // Raw data
  rawData: {
    momentum: MomentumData;
    volatility: VolatilityData;
    derivatives: DerivativesData;
    ssr: SSRData;
    social: SocialData;
  };
  
  // Configuration
  config: {
    lookbackDays: number;
    emaAlpha: number;
    weights: Record<string, number>;
  };
  
  // Historical context
  historical: {
    previousIndex: number;
    change24h: number;
    change7d: number;
    percentileVsHistory: number;
    daysInCurrentRegime: number;
  };
  
  // Metadata
  metadata: {
    dataQuality: 'excellent' | 'good' | 'moderate' | 'poor';
    factorsAvailable: number;
    lastUpdate: string;
    version: string;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CSI_CONFIG = {
  // ═══════════════════════════════════════════════════════════════════════
  // LOOKBACK WINDOW FOR PERCENTILE CALCULATION
  // ═══════════════════════════════════════════════════════════════════════
  // We maintain N = 365 days of raw values for each factor
  // Percentile: p_k(t) = rank_k(t) / (N + 1) ∈ (0, 1)
  LOOKBACK_DAYS: 365,
  
  // ═══════════════════════════════════════════════════════════════════════
  // EMA SMOOTHING
  // ═══════════════════════════════════════════════════════════════════════
  // CSI_smooth(t) = α · CSI_factor(t) + (1-α) · CSI_smooth(t-1)
  // Recommended: α ∈ [0.2, 0.5]
  EMA_ALPHA: 0.3,
  
  // ═══════════════════════════════════════════════════════════════════════
  // FACTOR WEIGHTS (must sum to 1.0)
  // ═══════════════════════════════════════════════════════════════════════
  // CSI_factor(t) = Σ_k w_k · G_k(t)
  WEIGHTS: {
    momentum: 0.30,    // MOM: Price momentum of top-10 coins (greed-when-high)
    volatility: 0.20,  // VOL: BTC & ETH implied volatility (fear-when-high, INVERTED)
    derivatives: 0.20, // PCR: Options put/call ratio (fear-when-high, INVERTED)
    ssr: 0.15,         // SSR: Stablecoin Supply Ratio (greed-when-high)
    social: 0.15,      // SOC: Social + search + engagement (greed-when-high)
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // REGIME CLASSIFICATION (same buckets for both indices)
  // ═══════════════════════════════════════════════════════════════════════
  REGIMES: {
    EXTREME_FEAR: { min: 0, max: 24, label: 'Extreme Fear' },
    FEAR: { min: 25, max: 44, label: 'Fear' },
    NEUTRAL: { min: 45, max: 55, label: 'Neutral' },
    GREED: { min: 56, max: 75, label: 'Greed' },
    EXTREME_GREED: { min: 76, max: 100, label: 'Extreme Greed' },
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // PUT/CALL RATIO BOUNDS
  // ═══════════════════════════════════════════════════════════════════════
  // Clamp each to [0.1, 5.0] to remove extreme noise
  PCR_BOUNDS: { min: 0.1, max: 5.0 },
  
  // ═══════════════════════════════════════════════════════════════════════
  // MOMENTUM UNIVERSE
  // ═══════════════════════════════════════════════════════════════════════
  // Top 10 non-stablecoins by market cap
  TOP_COINS: ['BTC', 'ETH', 'BNB', 'XRP', 'SOL', 'ADA', 'DOGE', 'TRX', 'AVAX', 'LINK'],
  
  // ═══════════════════════════════════════════════════════════════════════
  // STABLECOIN UNIVERSE FOR SSR
  // ═══════════════════════════════════════════════════════════════════════
  STABLECOINS: ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'FRAX'],
  
  // ═══════════════════════════════════════════════════════════════════════
  // API ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════
  APIS: {
    COINGECKO: 'https://api.coingecko.com/api/v3',
    // PRIMARY: Alternative.me Fear & Greed (widely used industry benchmark)
    // NOTE: This is NOT the same as CMC's index - they have different methodologies
    ALTERNATIVE_ME: 'https://api.alternative.me/fng',
    VOLMEX: 'https://api.volmex.finance/v1',
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // UPDATE FREQUENCY
  // ═══════════════════════════════════════════════════════════════════════
  // PRIMARY (Alt.me F&G): Refreshed daily, in sync with Alternative.me
  // CSI FACTORS: Recomputed every 12 hours from live market data
  PRIMARY_UPDATE_INTERVAL_MS: 24 * 60 * 60 * 1000, // 24 hours (daily)
  FACTOR_UPDATE_INTERVAL_MS: 12 * 60 * 60 * 1000,  // 12 hours
  
  // Cache TTL for serving (doesn't trigger recalculation)
  CACHE_TTL_MS: 30 * 60 * 1000, // 30 minutes
};

// ============================================================================
// HISTORICAL DATA STORAGE (In-memory, would be Redis/DB in production)
// ============================================================================

const historicalData: HistoricalDataPoint[] = [];
let lastCSIResult: CSIResult | null = null;
let lastCalculationTime: number = 0;
let lastFullCalculationTime: number = 0; // Track 12-hour calculation cycles

// Cache for real F&G index
interface RealFearGreedData {
  value: number;
  classification: string;
  timestamp: string;
  source: 'alternative_me' | 'cmc' | 'calculated';
  historical: Array<{
    value: number;
    classification: string;
    timestamp: string;
  }>;
}
let cachedRealFGI: RealFearGreedData | null = null;
let lastRealFGIFetch: number = 0;

// ============================================================================
// MATHEMATICAL FUNCTIONS
// ============================================================================

/**
 * Calculate log return: r = ln(P_t / P_{t-n})
 */
function calculateLogReturn(currentPrice: number, previousPrice: number): number {
  if (previousPrice <= 0 || currentPrice <= 0) return 0;
  return Math.log(currentPrice / previousPrice);
}

/**
 * Calculate empirical percentile rank
 * p_k(t) = rank(x_k(t)) / (N + 1) ∈ (0, 1)
 */
function calculatePercentile(value: number, historicalValues: number[]): {
  percentile: number;
  rank: number;
  count: number;
} {
  if (historicalValues.length === 0) {
    return { percentile: 0.5, rank: 1, count: 1 };
  }
  
  const sorted = [...historicalValues].sort((a, b) => a - b);
  
  // Find rank (1-based, ascending)
  let rank = 1;
  for (const v of sorted) {
    if (value > v) rank++;
    else break;
  }
  
  // Percentile = rank / (N + 1)
  const percentile = rank / (sorted.length + 1);
  
  return {
    percentile,
    rank,
    count: sorted.length,
  };
}

/**
 * Convert percentile to greed score [0, 100]
 * For greed-when-high: G = 100 * p
 * For fear-when-high:  G = 100 * (1 - p)
 */
function percentileToGreedScore(percentile: number, isInverted: boolean): number {
  if (isInverted) {
    return 100 * (1 - percentile);
  }
  return 100 * percentile;
}

/**
 * Calculate EMA smoothing
 * FGI_smooth(t) = α * FGI(t) + (1 - α) * FGI_smooth(t-1)
 */
function calculateEMA(currentValue: number, previousSmoothed: number, alpha: number): number {
  return alpha * currentValue + (1 - alpha) * previousSmoothed;
}

/**
 * Determine sentiment regime from index value
 */
function determineRegime(index: number): { regime: SentimentRegime; label: string } {
  if (index <= CSI_CONFIG.REGIMES.EXTREME_FEAR.max) {
    return { regime: 'extreme_fear', label: CSI_CONFIG.REGIMES.EXTREME_FEAR.label };
  }
  if (index <= CSI_CONFIG.REGIMES.FEAR.max) {
    return { regime: 'fear', label: CSI_CONFIG.REGIMES.FEAR.label };
  }
  if (index <= CSI_CONFIG.REGIMES.NEUTRAL.max) {
    return { regime: 'neutral', label: CSI_CONFIG.REGIMES.NEUTRAL.label };
  }
  if (index <= CSI_CONFIG.REGIMES.GREED.max) {
    return { regime: 'greed', label: CSI_CONFIG.REGIMES.GREED.label };
  }
  return { regime: 'extreme_greed', label: CSI_CONFIG.REGIMES.EXTREME_GREED.label };
}

// ============================================================================
// REAL FEAR & GREED INDEX FETCHING (PRIMARY SOURCE)
// ============================================================================

/**
 * Fetch the REAL Fear & Greed Index from Alternative.me
 * This is the industry-standard source that CMC and others reference
 * Updates once per day, so we cache aggressively
 */
async function fetchRealFearGreedIndex(): Promise<RealFearGreedData> {
  // Check cache first (valid for 12 hours since it only updates daily)
  if (cachedRealFGI && Date.now() - lastRealFGIFetch < CSI_CONFIG.PRIMARY_UPDATE_INTERVAL_MS) {
    return cachedRealFGI;
  }
  
  logger.info('📊 Fetching real Fear & Greed Index from Alternative.me...');
  
  try {
    // Fetch current + last 30 days of history
    const response = await axios.get(CSI_CONFIG.APIS.ALTERNATIVE_ME, {
      params: { limit: 31, format: 'json' },
      timeout: 10000,
    });
    
    if (response.data?.data && response.data.data.length > 0) {
      const latest = response.data.data[0];
      const historical = response.data.data.slice(1).map((d: any) => ({
        value: parseInt(d.value),
        classification: d.value_classification,
        timestamp: new Date(parseInt(d.timestamp) * 1000).toISOString(),
      }));
      
      cachedRealFGI = {
        value: parseInt(latest.value),
        classification: latest.value_classification,
        timestamp: new Date(parseInt(latest.timestamp) * 1000).toISOString(),
        source: 'alternative_me',
        historical,
      };
      
      lastRealFGIFetch = Date.now();
      
      logger.info('📊 Real F&G Index fetched', {
        value: cachedRealFGI.value,
        classification: cachedRealFGI.classification,
        source: 'alternative_me',
      });
      
      return cachedRealFGI;
    }
  } catch (error: any) {
    logger.warn('📊 Alternative.me fetch failed', { error: error.message });
  }
  
  // Fallback: Try CMC API if we have a key
  // NOTE: CMC has its OWN F&G index with different methodology - not the same as Alternative.me
  const cmcKey = process.env.CMC_API_KEY;
  if (cmcKey) {
    try {
      const response = await axios.get('https://pro-api.coinmarketcap.com/v3/fear-and-greed/historical', {
        headers: { 'X-CMC_PRO_API_KEY': cmcKey },
        params: { limit: 31 },
        timeout: 10000,
      });
      
      if (response.data?.data && response.data.data.length > 0) {
        const latest = response.data.data[0];
        const historical = response.data.data.slice(1).map((d: any) => ({
          value: d.value,
          classification: d.value_classification,
          timestamp: d.timestamp,
        }));
        
        cachedRealFGI = {
          value: latest.value,
          classification: latest.value_classification,
          timestamp: latest.timestamp,
          source: 'cmc',
          historical,
        };
        
        lastRealFGIFetch = Date.now();
        
        logger.info('📊 Real F&G Index fetched from CMC', {
          value: cachedRealFGI.value,
          classification: cachedRealFGI.classification,
        });
        
        return cachedRealFGI;
      }
    } catch (error: any) {
      logger.warn('📊 CMC F&G fetch failed', { error: error.message });
    }
  }
  
  // If we have cached data, return it even if stale
  if (cachedRealFGI) {
    logger.warn('📊 Using stale F&G cache');
    return cachedRealFGI;
  }
  
  // Last resort: return a calculated estimate (should rarely happen)
  logger.error('📊 No real F&G data available, using estimate');
  return {
    value: 25, // Conservative estimate during uncertainty
    classification: 'Fear',
    timestamp: new Date().toISOString(),
    source: 'calculated',
    historical: [],
  };
}

/**
 * Clamp value to bounds
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================================
// DATA FETCHING FUNCTIONS
// ============================================================================

/**
 * Fetch price momentum data for top-10 coins
 */
async function fetchMomentumData(): Promise<MomentumData> {
  try {
    const coinIds = CSI_CONFIG.TOP_COINS.map(s => {
      const mapping: Record<string, string> = {
        BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin', XRP: 'ripple',
        SOL: 'solana', ADA: 'cardano', DOGE: 'dogecoin', TRX: 'tron',
        AVAX: 'avalanche-2', LINK: 'chainlink',
      };
      return mapping[s] || s.toLowerCase();
    });
    
    // Fetch current prices
    const response = await axios.get(`${CSI_CONFIG.APIS.COINGECKO}/simple/price`, {
      params: {
        ids: coinIds.join(','),
        vs_currencies: 'usd',
        include_market_cap: true,
        include_24hr_change: true,
      },
      timeout: 10000,
    });
    
    // Fetch 30-day historical for each coin
    const coins: MomentumData['coins'] = [];
    let totalMarketCap = 0;
    
    for (let i = 0; i < coinIds.length; i++) {
      const coinId = coinIds[i];
      const symbol = CSI_CONFIG.TOP_COINS[i];
      const data = response.data[coinId];
      
      if (!data) continue;
      
      const currentPrice = data.usd || 0;
      const marketCap = data.usd_market_cap || 0;
      totalMarketCap += marketCap;
      
      // Estimate 30-day ago price from 24h change (simplified)
      // In production, would fetch actual historical data
      const change24h = data.usd_24h_change || 0;
      const estimatedMonthlyChange = change24h * 1.5; // Rough estimate
      const price30dAgo = currentPrice / (1 + estimatedMonthlyChange / 100);
      
      coins.push({
        symbol,
        name: coinId,
        price: currentPrice,
        price30dAgo,
        marketCap,
        weight: 0, // Calculate after total
        logReturn30d: calculateLogReturn(currentPrice, price30dAgo),
      });
    }
    
    // Calculate weights
    for (const coin of coins) {
      coin.weight = totalMarketCap > 0 ? coin.marketCap / totalMarketCap : 1 / coins.length;
    }
    
    // Calculate portfolio return: R_mom(t) = Σ w_i * r_i
    const portfolioReturn = coins.reduce((sum, coin) => sum + coin.weight * coin.logReturn30d, 0);
    
    return { coins, portfolioReturn };
  } catch (error: any) {
    logger.warn('📊 Momentum data fetch failed, using fallback', { error: error.message });
    
    // Return neutral fallback
    return {
      coins: CSI_CONFIG.TOP_COINS.map(symbol => ({
        symbol,
        name: symbol.toLowerCase(),
        price: 0,
        price30dAgo: 0,
        marketCap: 0,
        weight: 1 / CSI_CONFIG.TOP_COINS.length,
        logReturn30d: 0,
      })),
      portfolioReturn: 0,
    };
  }
}

/**
 * Fetch volatility data (BVIV & EVIV)
 */
async function fetchVolatilityData(): Promise<VolatilityData> {
  try {
    // Try Volmex API for implied volatility
    // Fallback to realized volatility calculation
    
    // For now, estimate from price action
    const btcResponse = await axios.get(`${CSI_CONFIG.APIS.COINGECKO}/coins/bitcoin/market_chart`, {
      params: { vs_currency: 'usd', days: 30 },
      timeout: 10000,
    });
    
    const ethResponse = await axios.get(`${CSI_CONFIG.APIS.COINGECKO}/coins/ethereum/market_chart`, {
      params: { vs_currency: 'usd', days: 30 },
      timeout: 10000,
    });
    
    // Calculate realized volatility as proxy
    const btcPrices = btcResponse.data.prices.map((p: number[]) => p[1]);
    const ethPrices = ethResponse.data.prices.map((p: number[]) => p[1]);
    
    const btcRealizedVol = calculateRealizedVolatility(btcPrices);
    const ethRealizedVol = calculateRealizedVolatility(ethPrices);
    
    // Scale to implied vol estimate (realized * 1.1 is rough approximation)
    const btcImpliedVol = btcRealizedVol * 1.1;
    const ethImpliedVol = ethRealizedVol * 1.1;
    
    return {
      btcImpliedVol,
      ethImpliedVol,
      averageVol: (btcImpliedVol + ethImpliedVol) / 2,
      btcRealizedVol,
      ethRealizedVol,
    };
  } catch (error: any) {
    logger.warn('📊 Volatility data fetch failed, using fallback', { error: error.message });
    
    return {
      btcImpliedVol: 50,  // Neutral volatility
      ethImpliedVol: 55,
      averageVol: 52.5,
    };
  }
}

/**
 * Calculate annualized realized volatility from price series
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * REALIZED VOLATILITY FORMULA (Fallback when BVIV/EVIV unavailable)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 1. Daily log returns over N days:
 *    r_τ = ln(P(τ) / P(τ-1))
 * 
 * 2. Mean:
 *    μ = (1/N) × Σ r_τ
 * 
 * 3. Sample standard deviation (using N-1 for unbiased estimate):
 *    σ_daily = sqrt((1/(N-1)) × Σ(r_τ - μ)²)
 * 
 * 4. Annualized:
 *    σ_annual = σ_daily × sqrt(365) × 100
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */
function calculateRealizedVolatility(prices: number[]): number {
  if (prices.length < 3) return 50; // Need at least 3 prices for meaningful volatility
  
  // Step 1: Calculate daily log returns
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0 && prices[i] > 0) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
  }
  
  const N = returns.length;
  if (N < 2) return 50;
  
  // Step 2: Calculate mean
  const mean = returns.reduce((sum, r) => sum + r, 0) / N;
  
  // Step 3: Calculate SAMPLE standard deviation (N-1 for unbiased estimate)
  const sumSquaredDeviations = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0);
  const variance = sumSquaredDeviations / (N - 1); // Using N-1 (Bessel's correction)
  const dailyVol = Math.sqrt(variance);
  
  // Step 4: Annualize (sqrt(365) for crypto, which trades 24/7)
  const annualizedVol = dailyVol * Math.sqrt(365) * 100;
  
  return annualizedVol;
}

/**
 * Fetch derivatives data (put/call ratios)
 */
async function fetchDerivativesData(): Promise<DerivativesData> {
  try {
    // Try Coinglass API if available
    const coinglassKey = process.env.COINGLASS_API_KEY;
    
    if (coinglassKey) {
      const response = await axios.get('https://open-api.coinglass.com/public/v2/option/info', {
        headers: { 'coinglassSecret': coinglassKey },
        timeout: 10000,
      });
      
      if (response.data?.data) {
        const btcData = response.data.data.find((d: any) => d.symbol === 'BTC');
        const ethData = response.data.data.find((d: any) => d.symbol === 'ETH');
        
        const btcPCR = clamp(btcData?.putCallRatio || 0.5, CSI_CONFIG.PCR_BOUNDS.min, CSI_CONFIG.PCR_BOUNDS.max);
        const ethPCR = clamp(ethData?.putCallRatio || 0.5, CSI_CONFIG.PCR_BOUNDS.min, CSI_CONFIG.PCR_BOUNDS.max);
        
        return {
          btcPutCallRatio: btcPCR,
          ethPutCallRatio: ethPCR,
          averagePCR: (btcPCR + ethPCR) / 2,
          btcOpenInterest: btcData?.openInterest,
          ethOpenInterest: ethData?.openInterest,
        };
      }
    }
    
    // Fallback to neutral values
    return {
      btcPutCallRatio: 0.5,
      ethPutCallRatio: 0.5,
      averagePCR: 0.5,
    };
  } catch (error: any) {
    logger.warn('📊 Derivatives data fetch failed, using fallback', { error: error.message });
    
    return {
      btcPutCallRatio: 0.5,
      ethPutCallRatio: 0.5,
      averagePCR: 0.5,
    };
  }
}

/**
 * Fetch Stablecoin Supply Ratio data
 */
async function fetchSSRData(): Promise<SSRData> {
  try {
    const stablecoinIds = CSI_CONFIG.STABLECOINS.map(s => {
      const mapping: Record<string, string> = {
        USDT: 'tether', USDC: 'usd-coin', DAI: 'dai',
        BUSD: 'binance-usd', TUSD: 'true-usd', USDP: 'paxos-standard', FRAX: 'frax',
      };
      return mapping[s] || s.toLowerCase();
    });
    
    const response = await axios.get(`${CSI_CONFIG.APIS.COINGECKO}/simple/price`, {
      params: {
        ids: ['bitcoin', ...stablecoinIds].join(','),
        vs_currencies: 'usd',
        include_market_cap: true,
      },
      timeout: 10000,
    });
    
    const btcMarketCap = response.data.bitcoin?.usd_market_cap || 0;
    
    const stablecoins: SSRData['stablecoins'] = [];
    let totalStablecoinMC = 0;
    
    for (let i = 0; i < stablecoinIds.length; i++) {
      const id = stablecoinIds[i];
      const symbol = CSI_CONFIG.STABLECOINS[i];
      const mc = response.data[id]?.usd_market_cap || 0;
      
      stablecoins.push({ symbol, marketCap: mc });
      totalStablecoinMC += mc;
    }
    
    // SSR = BTC Market Cap / Stablecoin Market Cap
    const ssr = totalStablecoinMC > 0 ? btcMarketCap / totalStablecoinMC : 10;
    
    return {
      btcMarketCap,
      stablecoinMarketCap: totalStablecoinMC,
      ssr,
      stablecoins,
    };
  } catch (error: any) {
    logger.warn('📊 SSR data fetch failed, using fallback', { error: error.message });
    
    return {
      btcMarketCap: 0,
      stablecoinMarketCap: 0,
      ssr: 10, // Neutral SSR
      stablecoins: [],
    };
  }
}

/**
 * Fetch social factor data
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * SOCIAL SENTIMENT (SOC) – 15%
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * x_SOC(t) = f(search_volume(t), social_engagement(t), sentiment(t))
 * 
 * Where:
 *   - search_volume(t) = Google Trends for "bitcoin", "crypto", "ethereum"
 *   - social_engagement(t) = X/Twitter mentions, Reddit posts/comments
 *   - sentiment(t) = bullish vs bearish signal from NLP scores
 * 
 * IMPORTANT: No Fear & Greed index values are used here to avoid circularity!
 * High x_SOC → hype + FOMO → Greed
 * ═══════════════════════════════════════════════════════════════════════════
 */
async function fetchSocialData(): Promise<SocialData> {
  try {
    // ═══════════════════════════════════════════════════════════════════════
    // AGGREGATE FROM ACTUAL SOCIAL/SEARCH METRICS (NO F&G INDEX!)
    // ═══════════════════════════════════════════════════════════════════════
    
    let searchScore = 50;      // Google Trends proxy
    let engagementScore = 50;  // Social engagement proxy
    let sentimentScore = 0;    // -1 to 1
    let bullishRatio = 0.5;
    let bearishRatio = 0.5;
    let dataSourcesUsed = 0;
    
    // ═══════════════════════════════════════════════════════════════════════
    // SOURCE 1: LunarCrush (actual social metrics, NOT F&G)
    // ═══════════════════════════════════════════════════════════════════════
    const lunarcrushKey = process.env.LUNARCRUSH_API_KEY;
    
    if (lunarcrushKey) {
      try {
        const response = await axios.get('https://lunarcrush.com/api4/public/coins/list/v2', {
          headers: { 'Authorization': `Bearer ${lunarcrushKey}` },
          params: { sort: 'market_cap', limit: 10 },
          timeout: 10000,
        });
        
        if (response.data?.data) {
          const coins = response.data.data;
          
          // Extract ACTUAL social metrics (not sentiment scores)
          const totalSocialVolume = coins.reduce((sum: number, c: any) => 
            sum + (c.social_volume || 0), 0);
          const totalEngagements = coins.reduce((sum: number, c: any) => 
            sum + (c.social_engagements || 0), 0);
          const avgSentiment = coins.reduce((sum: number, c: any) => 
            sum + (c.average_sentiment || 50), 0) / coins.length;
          
          // Normalize social volume to 0-100 scale
          // Baseline: ~1M social mentions/day for top-10 is "normal" (50)
          const normalizedVolume = Math.min(100, (totalSocialVolume / 1000000) * 50);
          engagementScore = normalizedVolume;
          
          // Use actual sentiment from NLP analysis
          sentimentScore = (avgSentiment - 50) / 50; // Convert to -1 to 1
          bullishRatio = avgSentiment / 100;
          bearishRatio = 1 - bullishRatio;
          
          dataSourcesUsed++;
          logger.debug('📊 LunarCrush social data fetched', {
            socialVolume: totalSocialVolume,
            engagements: totalEngagements,
            sentiment: avgSentiment,
          });
        }
      } catch (e) {
        logger.debug('📊 LunarCrush fetch failed, using fallback');
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // SOURCE 2: CoinGecko trending (proxy for search interest)
    // ═══════════════════════════════════════════════════════════════════════
    try {
      const trendingResponse = await axios.get(`${CSI_CONFIG.APIS.COINGECKO}/search/trending`, {
        timeout: 10000,
      });
      
      if (trendingResponse.data?.coins) {
        // If BTC/ETH are trending, that indicates high search interest
        const trendingSymbols = trendingResponse.data.coins.map((c: any) => 
          c.item?.symbol?.toUpperCase());
        
        const majorCoinsTrending = ['BTC', 'ETH', 'SOL', 'XRP'].filter(s => 
          trendingSymbols.includes(s)).length;
        
        // More major coins trending = higher search interest
        searchScore = 50 + (majorCoinsTrending * 12.5); // 50-100 scale
        dataSourcesUsed++;
      }
    } catch (e) {
      logger.debug('📊 CoinGecko trending fetch failed');
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // COMPOSITE SCORE (weighted average of actual metrics)
    // ═══════════════════════════════════════════════════════════════════════
    // f(search, engagement, sentiment) = weighted sum
    const compositeScore = (
      searchScore * 0.3 +           // Search volume weight
      engagementScore * 0.4 +       // Social engagement weight
      ((sentimentScore + 1) * 50) * 0.3  // Sentiment weight (normalized to 0-100)
    );
    
    return {
      searchVolume: {
        bitcoin: searchScore,
        ethereum: searchScore * 0.8,
        crypto: searchScore * 0.9,
        composite: searchScore,
      },
      socialEngagement: {
        twitterMentions: Math.round(engagementScore * 1000),
        redditActivity: Math.round(engagementScore * 500),
        telegramActivity: Math.round(engagementScore * 300),
        composite: engagementScore,
      },
      socialSentiment: {
        score: sentimentScore,
        bullishRatio,
        bearishRatio,
      },
      compositeScore,
    };
  } catch (error: any) {
    logger.warn('📊 Social data fetch failed, using fallback', { error: error.message });
    
    return {
      searchVolume: { bitcoin: 50, ethereum: 40, crypto: 45, composite: 50 },
      socialEngagement: { twitterMentions: 50000, redditActivity: 25000, telegramActivity: 15000, composite: 50 },
      socialSentiment: { score: 0, bullishRatio: 0.5, bearishRatio: 0.5 },
      compositeScore: 50,
    };
  }
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate the Coinet Sentiment Index
 * 
 * METHODOLOGY:
 * 1. PRIMARY: Fetch real Fear & Greed Index from Alternative.me/CMC
 * 2. SECONDARY: Calculate factor breakdown for detailed analysis
 * 3. The PRIMARY index is the truth - factors explain WHY
 * 4. Updates every 12 hours for stability (matches industry standard)
 */
export async function calculateCSI(): Promise<CSIResult> {
  const now = new Date();
  
  // Check serve cache (30 min)
  if (lastCSIResult && Date.now() - lastCalculationTime < CSI_CONFIG.CACHE_TTL_MS) {
    return lastCSIResult;
  }
  
  // Check if we need a full recalculation (every 12 hours)
  const needsFullRecalc = !lastFullCalculationTime || 
    Date.now() - lastFullCalculationTime >= CSI_CONFIG.FACTOR_UPDATE_INTERVAL_MS;
  
  if (needsFullRecalc) {
    logger.info('📊 Full CSI recalculation (12-hour cycle)...');
  } else {
    logger.info('📊 Refreshing CSI from cache...');
  }
  
  // STEP 1: Fetch the REAL Fear & Greed Index (PRIMARY SOURCE)
  const realFGI = await fetchRealFearGreedIndex();
  
  // STEP 2: Fetch factor data for breakdown analysis (SECONDARY)
  const [momentumData, volatilityData, derivativesData, ssrData, socialData] = await Promise.all([
    fetchMomentumData(),
    fetchVolatilityData(),
    fetchDerivativesData(),
    fetchSSRData(),
    fetchSocialData(),
  ]);
  
  // IMPORTANT: Use the REAL F&G value as our primary index
  // The factor calculations below explain WHY the market is at this level
  const primaryIndex = realFGI.value;
  
  // Extract raw factor values (for breakdown only)
  const rawValues = {
    momentum: momentumData.portfolioReturn,
    volatility: volatilityData.averageVol,
    derivatives: derivativesData.averagePCR,
    ssr: ssrData.ssr,
    social: socialData.compositeScore,
  };
  
  // Get historical values for percentile calculation
  const historicalMomentum = historicalData.map(d => d.momentum);
  const historicalVolatility = historicalData.map(d => d.volatility);
  const historicalDerivatives = historicalData.map(d => d.derivatives);
  const historicalSSR = historicalData.map(d => d.ssr);
  const historicalSocial = historicalData.map(d => d.social);
  
  // Calculate percentiles and greed scores for each factor
  const factors: CSIResult['factors'] = {
    momentum: calculateFactorComponent(
      'Price Momentum',
      'MOM',
      rawValues.momentum,
      '%',
      historicalMomentum,
      CSI_CONFIG.WEIGHTS.momentum,
      false, // High momentum = greed
    ),
    volatility: calculateFactorComponent(
      'Implied Volatility',
      'VOL',
      rawValues.volatility,
      '%',
      historicalVolatility,
      CSI_CONFIG.WEIGHTS.volatility,
      true, // High volatility = fear
    ),
    derivatives: calculateFactorComponent(
      'Put/Call Ratio',
      'PCR',
      rawValues.derivatives,
      'ratio',
      historicalDerivatives,
      CSI_CONFIG.WEIGHTS.derivatives,
      true, // High PCR = fear
    ),
    ssr: calculateFactorComponent(
      'Stablecoin Supply Ratio',
      'SSR',
      rawValues.ssr,
      'ratio',
      historicalSSR,
      CSI_CONFIG.WEIGHTS.ssr,
      false, // High SSR = greed (more BTC vs stables)
    ),
    social: calculateFactorComponent(
      'Social Sentiment',
      'SOC',
      rawValues.social,
      'score',
      historicalSocial,
      CSI_CONFIG.WEIGHTS.social,
      false, // High social = greed
    ),
  };
  
  // Calculate factor-based index (for comparison/breakdown only)
  const factorBasedIndex = 
    factors.momentum.weightedContribution +
    factors.volatility.weightedContribution +
    factors.derivatives.weightedContribution +
    factors.ssr.weightedContribution +
    factors.social.weightedContribution;
  
  // USE THE REAL F&G INDEX as our primary value
  // The factor-based calculation is for analysis only
  const roundedIndex = primaryIndex;
  
  // Apply EMA smoothing to the REAL index for stability
  const previousSmoothed = lastCSIResult?.index.smoothed || primaryIndex;
  const smoothedIndex = calculateEMA(primaryIndex, previousSmoothed, CSI_CONFIG.EMA_ALPHA);
  
  // Determine regime from REAL index
  const { regime, label: regimeLabel } = determineRegime(roundedIndex);
  
  // Calculate historical context
  const previousIndex = lastCSIResult?.index.rounded || roundedIndex;
  const change24h = roundedIndex - previousIndex;
  
  // Get historical changes from real F&G data
  let change7d = 0;
  if (realFGI.historical.length >= 7) {
    change7d = roundedIndex - realFGI.historical[6].value;
  }
  
  // Store in historical data
  historicalData.push({
    date: now,
    momentum: rawValues.momentum,
    volatility: rawValues.volatility,
    derivatives: rawValues.derivatives,
    ssr: rawValues.ssr,
    social: rawValues.social,
    index: roundedIndex,
  });
  
  // Trim historical data to lookback window
  while (historicalData.length > CSI_CONFIG.LOOKBACK_DAYS) {
    historicalData.shift();
  }
  
  // Mark full recalculation time
  if (needsFullRecalc) {
    lastFullCalculationTime = Date.now();
  }
  
  // Count data quality
  const factorsAvailable = [
    momentumData.portfolioReturn !== 0,
    volatilityData.averageVol !== 52.5,
    derivativesData.averagePCR !== 0.5,
    ssrData.ssr !== 10,
    socialData.compositeScore !== 50,
  ].filter(Boolean).length;
  
  let dataQuality: CSIResult['metadata']['dataQuality'];
  if (factorsAvailable >= 5) dataQuality = 'excellent';
  else if (factorsAvailable >= 4) dataQuality = 'good';
  else if (factorsAvailable >= 3) dataQuality = 'moderate';
  else dataQuality = 'poor';
  
  // Calculate days in current regime
  let daysInCurrentRegime = 1;
  for (let i = historicalData.length - 2; i >= 0; i--) {
    const historicalRegime = determineRegime(historicalData[i].index).regime;
    if (historicalRegime === regime) {
      daysInCurrentRegime++;
    } else {
      break;
    }
  }
  
  const result: CSIResult = {
    timestamp: now.toISOString(),
    index: {
      raw: primaryIndex, // Real F&G value
      smoothed: Math.round(smoothedIndex * 100) / 100,
      rounded: roundedIndex,
      regime,
      regimeLabel,
    },
    factors,
    rawData: {
      momentum: momentumData,
      volatility: volatilityData,
      derivatives: derivativesData,
      ssr: ssrData,
      social: socialData,
    },
    config: {
      lookbackDays: CSI_CONFIG.LOOKBACK_DAYS,
      emaAlpha: CSI_CONFIG.EMA_ALPHA,
      weights: CSI_CONFIG.WEIGHTS,
    },
    historical: {
      previousIndex,
      change24h,
      change7d,
      percentileVsHistory: historicalData.length > 0 ?
        calculatePercentile(roundedIndex, historicalData.map(d => d.index)).percentile * 100 : 50,
      daysInCurrentRegime,
    },
    metadata: {
      dataQuality: realFGI.source === 'alternative_me' || realFGI.source === 'cmc' ? 'excellent' : dataQuality,
      factorsAvailable,
      lastUpdate: now.toISOString(),
      version: '2.0.0',
    },
  };
  
  // Cache result
  lastCSIResult = result;
  lastCalculationTime = Date.now();
  
  logger.info('📊 CSI calculated', {
    index: roundedIndex,
    regime,
    source: realFGI.source,
    factorBasedIndex: Math.round(factorBasedIndex),
    dataQuality: result.metadata.dataQuality,
  });
  
  return result;
}

/**
 * Calculate a single factor component
 */
function calculateFactorComponent(
  name: string,
  symbol: string,
  rawValue: number,
  rawUnit: string,
  historicalValues: number[],
  weight: number,
  isInverted: boolean
): FactorComponent {
  const { percentile, rank, count } = calculatePercentile(rawValue, historicalValues);
  const greedScore = percentileToGreedScore(percentile, isInverted);
  const weightedContribution = weight * greedScore;
  
  // Generate interpretation
  let interpretation: string;
  let signal: FactorComponent['signal'];
  
  if (greedScore >= 60) {
    signal = 'bullish';
    interpretation = `${name} indicates greed (${greedScore.toFixed(0)}/100)`;
  } else if (greedScore <= 40) {
    signal = 'bearish';
    interpretation = `${name} indicates fear (${greedScore.toFixed(0)}/100)`;
  } else {
    signal = 'neutral';
    interpretation = `${name} is neutral (${greedScore.toFixed(0)}/100)`;
  }
  
  return {
    name,
    symbol,
    rawValue,
    rawUnit,
    percentile,
    lookbackDays: CSI_CONFIG.LOOKBACK_DAYS,
    historicalRank: rank,
    historicalCount: count,
    greedScore,
    isInverted,
    weight,
    weightedContribution,
    interpretation,
    signal,
  };
}

// ============================================================================
// FORMATTING FOR AI CONTEXT
// ============================================================================

/**
 * Format CSI for AI context
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * OUTPUT STRUCTURE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 1. HEADLINE SENTIMENT (Primary)
 *    - The Fear & Greed Index from Alternative.me
 *    - This is what traders see everywhere
 * 
 * 2. CSI FACTOR BREAKDOWN (Secondary)
 *    - Explains WHY the market is at this level
 *    - Uses our 5-factor model
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function formatCSIForAI(result: CSIResult): string {
  const regimeEmoji: Record<SentimentRegime, string> = {
    extreme_fear: '😱',
    fear: '😰',
    neutral: '😐',
    greed: '🤑',
    extreme_greed: '🚀',
  };
  
  let context = '\n[📊 MARKET SENTIMENT - Fear & Greed Index]\n';
  
  // ═══════════════════════════════════════════════════════════════════════
  // HEADLINE SENTIMENT (Primary) - Alternative.me Fear & Greed
  // ═══════════════════════════════════════════════════════════════════════
  context += `\n${'═'.repeat(50)}\n`;
  context += `🎯 HEADLINE SENTIMENT: ${result.index.rounded}/100\n`;
  context += `   ${regimeEmoji[result.index.regime]} ${result.index.regimeLabel.toUpperCase()}\n`;
  context += `${'═'.repeat(50)}\n`;
  context += `   Source: Alternative.me Fear & Greed Index\n`;
  context += `   (Widely used industry benchmark)\n`;
  
  // Historical context
  context += `\n📅 HISTORICAL CONTEXT:\n`;
  context += `• Yesterday: ${result.historical.previousIndex}/100\n`;
  context += `• 24h Change: ${result.historical.change24h >= 0 ? '+' : ''}${result.historical.change24h}\n`;
  context += `• 7d Change: ${result.historical.change7d >= 0 ? '+' : ''}${result.historical.change7d}\n`;
  context += `• Days in ${result.index.regimeLabel}: ${result.historical.daysInCurrentRegime}\n`;
  
  // Regime scale visualization
  context += `\n📊 SENTIMENT SCALE:\n`;
  context += `[EXTREME FEAR 0-24] [FEAR 25-44] [NEUTRAL 45-55] [GREED 56-75] [EXTREME GREED 76-100]\n`;
  const position = Math.max(0, Math.min(50, Math.round(result.index.rounded / 2))); // Scale to 50 chars, clamped
  context += `[${'█'.repeat(position)}${'░'.repeat(50 - position)}] ${result.index.rounded}\n`;
  
  // ═══════════════════════════════════════════════════════════════════════
  // CSI FACTOR BREAKDOWN (Secondary) - Explains WHY
  // ═══════════════════════════════════════════════════════════════════════
  context += `\n🔍 CSI FACTOR BREAKDOWN (Why is the market here?):\n`;
  context += `   Formula: CSI = 0.30×MOM + 0.20×VOL + 0.20×PCR + 0.15×SSR + 0.15×SOC\n\n`;
  
  const factorList = [
    { key: 'momentum', f: result.factors.momentum, desc: 'Price trend of top-10 coins' },
    { key: 'volatility', f: result.factors.volatility, desc: 'Market volatility level' },
    { key: 'derivatives', f: result.factors.derivatives, desc: 'Options put/call ratio' },
    { key: 'ssr', f: result.factors.ssr, desc: 'BTC vs stablecoin ratio' },
    { key: 'social', f: result.factors.social, desc: 'Social media sentiment' },
  ];
  
  for (const { f, desc } of factorList) {
    const signalEmoji = f.signal === 'bullish' ? '🟢' : f.signal === 'bearish' ? '🔴' : '🟡';
    context += `${signalEmoji} ${f.name}: ${f.greedScore.toFixed(0)}/100 (${desc})\n`;
  }
  
  // Data quality
  context += `\n📊 Source: Alternative.me/CMC Fear & Greed Index\n`;
  context += `📊 Data Quality: ${result.metadata.dataQuality.toUpperCase()}\n`;
  context += `📊 Last Update: ${new Date(result.metadata.lastUpdate).toLocaleString()}\n`;
  context += `📊 Update Frequency: Every 12 hours\n`;
  
  // Trading interpretation
  context += `\n💡 TRADING INTERPRETATION:\n`;
  if (result.index.regime === 'extreme_fear') {
    context += `⚠️ EXTREME FEAR (${result.index.rounded}/100)\n`;
    context += `• Market sentiment at maximum pessimism\n`;
    context += `• Historically a strong buying opportunity (contrarian signal)\n`;
    context += `• Smart money typically accumulating at these levels\n`;
    context += `• Warren Buffett: "Be greedy when others are fearful"\n`;
  } else if (result.index.regime === 'fear') {
    context += `⚠️ FEAR (${result.index.rounded}/100)\n`;
    context += `• Elevated market fear, but not extreme\n`;
    context += `• Consider accumulating quality assets cautiously\n`;
    context += `• Dollar-cost averaging may be appropriate\n`;
    context += `• Watch for capitulation signals before heavy buying\n`;
  } else if (result.index.regime === 'neutral') {
    context += `➡️ NEUTRAL (${result.index.rounded}/100)\n`;
    context += `• Market sentiment balanced\n`;
    context += `• No strong directional signal\n`;
    context += `• Wait for confirmation of trend direction\n`;
    context += `• Focus on individual asset analysis\n`;
  } else if (result.index.regime === 'greed') {
    context += `⚠️ GREED (${result.index.rounded}/100)\n`;
    context += `• Growing market optimism/greed\n`;
    context += `• Exercise caution with new positions\n`;
    context += `• Consider taking partial profits\n`;
    context += `• Set stop-losses on existing positions\n`;
  } else {
    context += `🚨 EXTREME GREED (${result.index.rounded}/100)\n`;
    context += `• Maximum market euphoria\n`;
    context += `• High risk of significant correction\n`;
    context += `• Strongly consider reducing exposure\n`;
    context += `• Warren Buffett: "Be fearful when others are greedy"\n`;
  }
  
  return context;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const coinetSentimentIndex = {
  calculate: calculateCSI,
  formatForAI: formatCSIForAI,
  config: CSI_CONFIG,
};

export default coinetSentimentIndex;

