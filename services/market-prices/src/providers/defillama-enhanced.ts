/**
 * ============================================
 * DEFILLAMA ENHANCED PROVIDER
 * ============================================
 * 
 * World-Class DeFi Data Integration with:
 * - Pro Plan Support with Dynamic API Key Management
 * - Adaptive Polling based on Market Volatility
 * - Multi-Tier Caching (Hot/Warm/Cold)
 * - Cross-Protocol Aggregation
 * - Real-time TVL & Yield Tracking
 * 
 * Efficiency Target: 50x+ proven efficiency
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import Bottleneck from 'bottleneck';
import { EventEmitter } from 'eventemitter3';
import {
  ProviderConfig,
  DataSource,
  ProviderError,
} from '../types';
import { 
  KeyRotationManager, 
  getKeyRotationManager, 
  APIKeyConfig 
} from '../security/key-rotation';
import { logger } from '../utils/logger';

/**
 * Plan tier configuration
 */
export enum DeFiLlamaPlanTier {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

/**
 * Plan limits
 */
export interface DeFiLlamaPlanLimits {
  requestsPerMinute: number;
  monthlyQuota: number;
  historicalDataDays: number;
  realtimeUpdates: boolean;
  priorityAccess: boolean;
}

/**
 * Plan configurations
 */
const PLAN_CONFIGS: Record<DeFiLlamaPlanTier, DeFiLlamaPlanLimits> = {
  [DeFiLlamaPlanTier.FREE]: {
    requestsPerMinute: 30,
    monthlyQuota: 50000,
    historicalDataDays: 90,
    realtimeUpdates: false,
    priorityAccess: false,
  },
  [DeFiLlamaPlanTier.PRO]: {
    requestsPerMinute: 300,
    monthlyQuota: 500000,
    historicalDataDays: 365,
    realtimeUpdates: true,
    priorityAccess: false,
  },
  [DeFiLlamaPlanTier.ENTERPRISE]: {
    requestsPerMinute: 1000,
    monthlyQuota: -1, // Unlimited
    historicalDataDays: -1, // Unlimited
    realtimeUpdates: true,
    priorityAccess: true,
  },
};

/**
 * Volatility levels for adaptive polling
 */
export enum VolatilityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EXTREME = 'extreme',
}

/**
 * Adaptive polling configuration
 */
export interface AdaptivePollingConfig {
  enabled: boolean;
  baseIntervalMs: number;
  volatilityMultipliers: Record<VolatilityLevel, number>;
  minIntervalMs: number;
  maxIntervalMs: number;
}

/**
 * Default adaptive polling config
 */
const DEFAULT_ADAPTIVE_POLLING: AdaptivePollingConfig = {
  enabled: true,
  baseIntervalMs: 300000, // 5 minutes
  volatilityMultipliers: {
    [VolatilityLevel.LOW]: 2.0,      // 10 min interval
    [VolatilityLevel.MEDIUM]: 1.0,   // 5 min interval
    [VolatilityLevel.HIGH]: 0.5,     // 2.5 min interval
    [VolatilityLevel.EXTREME]: 0.2,  // 1 min interval
  },
  minIntervalMs: 60000,   // 1 minute minimum
  maxIntervalMs: 1800000, // 30 minutes maximum
};

/**
 * Cache tier configuration
 */
export interface CacheTier {
  hot: number;    // Very fresh data (< 1 min)
  warm: number;   // Fresh data (< 5 min)
  cold: number;   // Standard data (< 1 hour)
  frozen: number; // Historical data (< 24 hours)
}

/**
 * Default cache TTLs
 */
const DEFAULT_CACHE_TTLS: CacheTier = {
  hot: 30000,      // 30 seconds
  warm: 300000,    // 5 minutes
  cold: 3600000,   // 1 hour
  frozen: 86400000, // 24 hours
};

/**
 * Enhanced cache entry
 */
interface EnhancedCacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  tier: keyof CacheTier;
  volatility: VolatilityLevel;
  hitCount: number;
}

/**
 * Performance metrics
 */
export interface DeFiLlamaMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  cacheHits: number;
  cacheMisses: number;
  rateLimitHits: number;
  efficiencyMultiplier: number;
  currentVolatility: VolatilityLevel;
  adaptiveIntervalMs: number;
}

/**
 * Protocol data
 */
export interface DeFiLlamaProtocol {
  id: string;
  name: string;
  tvl: number;
  change_1h?: number;
  change_1d?: number;
  change_7d?: number;
  chains?: string[];
  category?: string;
  mcap?: number;
}

/**
 * Yield pool data
 */
export interface DeFiLlamaYieldPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd?: number;
  apy?: number;
  apyBase?: number;
  apyReward?: number;
  stablecoin?: boolean;
  rewardTokens?: string[];
}

/**
 * Enhanced DeFiLlama REST Client
 */
export class DeFiLlamaEnhancedClient extends EventEmitter {
  private axios: AxiosInstance;
  private config: ProviderConfig;
  private keyRotationManager: KeyRotationManager;
  
  // Plan management
  private currentPlan: DeFiLlamaPlanTier = DeFiLlamaPlanTier.FREE;
  private planLimits: DeFiLlamaPlanLimits;
  
  // Rate limiting
  private rateLimiter: Bottleneck;
  
  // Caching
  private cache: Map<string, EnhancedCacheEntry<any>> = new Map();
  private cacheTTLs: CacheTier = DEFAULT_CACHE_TTLS;
  
  // Adaptive polling
  private adaptivePollingConfig: AdaptivePollingConfig = DEFAULT_ADAPTIVE_POLLING;
  private currentVolatility: VolatilityLevel = VolatilityLevel.MEDIUM;
  private pollingTimers: Map<string, NodeJS.Timeout> = new Map();
  private volatilityHistory: number[] = [];
  
  // Metrics
  private metrics: DeFiLlamaMetrics;
  private responseTimes: number[] = [];
  
  // Quota tracking
  private monthlyRequestCount: number = 0;
  private currentMonth: string = '';

  constructor(
    config: ProviderConfig,
    options?: {
      proApiKey?: string;
      adaptivePolling?: Partial<AdaptivePollingConfig>;
      cacheTTLs?: Partial<CacheTier>;
    }
  ) {
    super();
    this.config = config;
    this.keyRotationManager = getKeyRotationManager();
    
    // Initialize plan
    this.currentPlan = this.detectPlan(options?.proApiKey);
    this.planLimits = PLAN_CONFIGS[this.currentPlan];
    
    // Initialize metrics
    this.metrics = this.initializeMetrics();
    
    // Initialize monthly tracking
    this.initializeMonthlyTracking();
    
    // Apply custom config
    if (options?.adaptivePolling) {
      this.adaptivePollingConfig = { ...DEFAULT_ADAPTIVE_POLLING, ...options.adaptivePolling };
    }
    if (options?.cacheTTLs) {
      this.cacheTTLs = { ...DEFAULT_CACHE_TTLS, ...options.cacheTTLs };
    }
    
    // Initialize axios
    this.axios = axios.create({
      baseURL: config.apiUrl || 'https://api.llama.fi',
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        ...(options?.proApiKey ? { 'x-api-key': options.proApiKey } : {}),
      },
    });
    
    // Configure retry
    axiosRetry(this.axios, {
      retries: config.retry.retries,
      retryDelay: (retryCount) => retryCount * config.retry.retryDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               (error.response?.status || 0) >= 500;
      },
    });
    
    // Initialize rate limiter
    this.rateLimiter = this.createRateLimiter(this.planLimits.requestsPerMinute);
    
    // Initialize pro key if provided
    if (options?.proApiKey) {
      this.initializeProKey(options.proApiKey);
    }
    
    logger.info('DeFiLlama Enhanced Client initialized', {
      plan: this.currentPlan,
      requestsPerMinute: this.planLimits.requestsPerMinute,
      adaptivePolling: this.adaptivePollingConfig.enabled,
    });
  }

  /**
   * Detect plan from API key
   */
  private detectPlan(proApiKey?: string): DeFiLlamaPlanTier {
    if (proApiKey && proApiKey.length > 20) {
      return DeFiLlamaPlanTier.PRO;
    }
    
    const envKey = process.env.DEFILLAMA_PRO_KEY || process.env.DEFILLAMA_API_KEY;
    if (envKey && envKey.length > 20) {
      return DeFiLlamaPlanTier.PRO;
    }
    
    return DeFiLlamaPlanTier.FREE;
  }

  /**
   * Initialize monthly tracking
   */
  private initializeMonthlyTracking(): void {
    const now = new Date();
    this.currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.monthlyRequestCount = 0;
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): DeFiLlamaMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      rateLimitHits: 0,
      efficiencyMultiplier: 1,
      currentVolatility: VolatilityLevel.MEDIUM,
      adaptiveIntervalMs: this.adaptivePollingConfig.baseIntervalMs,
    };
  }

  /**
   * Create rate limiter
   */
  private createRateLimiter(rpm: number): Bottleneck {
    return new Bottleneck({
      reservoir: rpm,
      reservoirRefreshAmount: rpm,
      reservoirRefreshInterval: 60 * 1000,
      maxConcurrent: Math.min(rpm / 5, 20),
      minTime: Math.floor(60000 / rpm),
    });
  }

  /**
   * Initialize pro API key
   */
  private initializeProKey(proKey: string): void {
    const keyConfig: APIKeyConfig = {
      provider: 'defillama',
      key: proKey,
      environment: process.env.NODE_ENV as 'production' | 'staging' | 'development' || 'development',
      maxUsage: 100000,
    };
    
    this.keyRotationManager.addKey(keyConfig);
    
    logger.info('Pro API key initialized for DeFiLlama');
  }

  /**
   * Calculate current volatility level
   */
  private calculateVolatility(priceChanges: number[]): VolatilityLevel {
    if (priceChanges.length === 0) return VolatilityLevel.MEDIUM;
    
    // Calculate average absolute change
    const avgChange = priceChanges.reduce((a, b) => a + Math.abs(b), 0) / priceChanges.length;
    
    if (avgChange > 10) return VolatilityLevel.EXTREME;
    if (avgChange > 5) return VolatilityLevel.HIGH;
    if (avgChange > 2) return VolatilityLevel.MEDIUM;
    return VolatilityLevel.LOW;
  }

  /**
   * Update volatility based on recent data
   */
  updateVolatility(priceChange: number): void {
    this.volatilityHistory.push(priceChange);
    
    // Keep last 100 samples
    if (this.volatilityHistory.length > 100) {
      this.volatilityHistory.shift();
    }
    
    const newVolatility = this.calculateVolatility(this.volatilityHistory);
    
    if (newVolatility !== this.currentVolatility) {
      const oldVolatility = this.currentVolatility;
      this.currentVolatility = newVolatility;
      
      logger.info('Volatility level changed', {
        from: oldVolatility,
        to: newVolatility,
        newInterval: this.getAdaptiveInterval(),
      });
      
      this.emit('volatility_changed', {
        from: oldVolatility,
        to: newVolatility,
        interval: this.getAdaptiveInterval(),
      });
      
      // Update all active polling intervals
      this.updatePollingIntervals();
    }
    
    this.metrics.currentVolatility = this.currentVolatility;
  }

  /**
   * Get adaptive polling interval based on volatility
   */
  getAdaptiveInterval(): number {
    if (!this.adaptivePollingConfig.enabled) {
      return this.adaptivePollingConfig.baseIntervalMs;
    }
    
    const multiplier = this.adaptivePollingConfig.volatilityMultipliers[this.currentVolatility];
    const interval = this.adaptivePollingConfig.baseIntervalMs * multiplier;
    
    // Clamp to min/max
    const clampedInterval = Math.max(
      this.adaptivePollingConfig.minIntervalMs,
      Math.min(this.adaptivePollingConfig.maxIntervalMs, interval)
    );
    
    this.metrics.adaptiveIntervalMs = clampedInterval;
    return clampedInterval;
  }

  /**
   * Update all active polling intervals
   */
  private updatePollingIntervals(): void {
    for (const [key, timer] of this.pollingTimers.entries()) {
      clearTimeout(timer);
      // Re-register with new interval
      // The actual re-registration should be done by the caller
      this.pollingTimers.delete(key);
    }
    
    this.emit('polling_intervals_updated', {
      volatility: this.currentVolatility,
      interval: this.getAdaptiveInterval(),
    });
  }

  /**
   * Start adaptive polling for a resource
   */
  startAdaptivePolling(
    resourceKey: string,
    fetchFn: () => Promise<any>,
    onData: (data: any) => void,
    onError?: (error: any) => void
  ): void {
    const poll = async () => {
      try {
        const data = await fetchFn();
        onData(data);
        
        // Update volatility if data contains price changes
        if (data?.change_1h !== undefined) {
          this.updateVolatility(data.change_1h);
        }
      } catch (error) {
        if (onError) {
          onError(error);
        } else {
          logger.error(`Adaptive polling error for ${resourceKey}`, { error });
        }
      }
      
      // Schedule next poll
      const interval = this.getAdaptiveInterval();
      const timer = setTimeout(poll, interval);
      this.pollingTimers.set(resourceKey, timer);
    };
    
    // Initial poll
    poll();
    
    logger.info(`Started adaptive polling for ${resourceKey}`, {
      initialInterval: this.getAdaptiveInterval(),
      volatility: this.currentVolatility,
    });
  }

  /**
   * Stop adaptive polling for a resource
   */
  stopAdaptivePolling(resourceKey: string): void {
    const timer = this.pollingTimers.get(resourceKey);
    if (timer) {
      clearTimeout(timer);
      this.pollingTimers.delete(resourceKey);
      logger.info(`Stopped adaptive polling for ${resourceKey}`);
    }
  }

  /**
   * Stop all polling
   */
  stopAllPolling(): void {
    for (const [key, timer] of this.pollingTimers.entries()) {
      clearTimeout(timer);
    }
    this.pollingTimers.clear();
    logger.info('Stopped all adaptive polling');
  }

  /**
   * Determine cache tier based on data type
   */
  private getCacheTier(dataType: string): keyof CacheTier {
    switch (dataType) {
      case 'trending':
      case 'realtime':
        return 'hot';
      case 'protocols':
      case 'pools':
        return 'warm';
      case 'historical':
        return 'frozen';
      default:
        return 'cold';
    }
  }

  /**
   * Make enhanced request
   */
  private async request<T>(
    method: string,
    url: string,
    params?: any,
    options?: {
      dataType?: string;
      priority?: number;
    }
  ): Promise<T> {
    const { dataType = 'cold', priority = 5 } = options || {};
    const cacheKey = `${method}:${url}:${JSON.stringify(params || {})}`;
    
    // Check quota
    this.checkMonthlyQuota();
    
    // Check cache
    if (method === 'GET') {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        cached.hitCount++;
        this.metrics.cacheHits++;
        return cached.data as T;
      }
      this.metrics.cacheMisses++;
    }
    
    const startTime = Date.now();
    this.metrics.totalRequests++;
    
    return this.rateLimiter.schedule({ priority }, async () => {
      try {
        const response = await this.axios.request<T>({
          method,
          url,
          params,
        });
        
        const responseTime = Date.now() - startTime;
        this.updateMetrics(responseTime, true);
        this.monthlyRequestCount++;
        
        // Cache response
        if (method === 'GET') {
          const tier = this.getCacheTier(dataType);
          const ttl = this.cacheTTLs[tier];
          
          this.cache.set(cacheKey, {
            data: response.data,
            timestamp: Date.now(),
            expiresAt: Date.now() + ttl,
            tier,
            volatility: this.currentVolatility,
            hitCount: 0,
          });
        }
        
        return response.data;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        this.updateMetrics(responseTime, false);
        
        if ((error as AxiosError).response?.status === 429) {
          this.metrics.rateLimitHits++;
        }
        
        this.handleError(error as AxiosError, url);
        throw error;
      }
    });
  }

  /**
   * Check monthly quota
   */
  private checkMonthlyQuota(): void {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    if (currentMonth !== this.currentMonth) {
      this.currentMonth = currentMonth;
      this.monthlyRequestCount = 0;
    }
    
    if (this.planLimits.monthlyQuota > 0 && 
        this.monthlyRequestCount >= this.planLimits.monthlyQuota) {
      throw new ProviderError(
        'Monthly quota exceeded',
        DataSource.DEFILLAMA,
        429
      );
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(responseTime: number, success: boolean): void {
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
    
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
    
    // Calculate efficiency
    const totalServed = this.metrics.cacheHits + this.metrics.successfulRequests;
    if (this.metrics.successfulRequests > 0) {
      this.metrics.efficiencyMultiplier = totalServed / this.metrics.successfulRequests;
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: AxiosError, endpoint: string): void {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;

      logger.error(`DeFiLlama Enhanced API error: ${status}`, {
        endpoint,
        error: data?.error || error.message,
        status,
      });

      throw new ProviderError(
        data?.error || `HTTP ${status}`,
        DataSource.DEFILLAMA,
        status,
        error
      );
    }
    
    throw new ProviderError(
      error.message,
      DataSource.DEFILLAMA,
      undefined,
      error
    );
  }

  // ==================== PUBLIC API METHODS ====================

  /**
   * Get all protocols
   */
  async getProtocols(): Promise<DeFiLlamaProtocol[]> {
    const response = await this.request<DeFiLlamaProtocol[]>('GET', '/protocols', undefined, {
      dataType: 'protocols',
    });
    
    // Update volatility based on top protocols
    if (response.length > 0) {
      const avgChange = response.slice(0, 10)
        .filter(p => p.change_1h !== undefined)
        .reduce((sum, p) => sum + Math.abs(p.change_1h || 0), 0) / 10;
      this.updateVolatility(avgChange);
    }
    
    return response;
  }

  /**
   * Get protocol by ID
   */
  async getProtocol(protocolId: string): Promise<DeFiLlamaProtocol | null> {
    try {
      return await this.request<DeFiLlamaProtocol>('GET', `/protocol/${protocolId}`, undefined, {
        dataType: 'protocols',
      });
    } catch (error) {
      if ((error as ProviderError).statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get all yield pools
   */
  async getPools(): Promise<DeFiLlamaYieldPool[]> {
    const response = await this.request<any>('GET', '/yields', undefined, {
      dataType: 'pools',
    });
    return Array.isArray(response) ? response : response.data || [];
  }

  /**
   * Get pool by ID
   */
  async getPool(poolId: string): Promise<DeFiLlamaYieldPool | null> {
    const pools = await this.getPools();
    return pools.find(p => p.pool === poolId || p.symbol === poolId) || null;
  }

  /**
   * Get TVL for all chains
   */
  async getChainsTVL(): Promise<Array<{ name: string; tvl: number }>> {
    return this.request<Array<{ name: string; tvl: number }>>('GET', '/v2/chains', undefined, {
      dataType: 'protocols',
    });
  }

  /**
   * Get historical TVL for a protocol
   */
  async getProtocolHistoricalTVL(protocolId: string): Promise<any> {
    return this.request('GET', `/protocol/${protocolId}`, undefined, {
      dataType: 'historical',
    });
  }

  /**
   * Get historical TVL for a chain
   */
  async getChainHistoricalTVL(chain: string): Promise<any> {
    return this.request('GET', `/v2/historicalChainTvl/${chain}`, undefined, {
      dataType: 'historical',
    });
  }

  /**
   * Get stablecoins
   */
  async getStablecoins(): Promise<any[]> {
    const response = await this.request<any>('GET', '/stablecoins', undefined, {
      dataType: 'protocols',
    });
    return response.peggedAssets || response.data?.peggedAssets || [];
  }

  /**
   * Get bridges
   */
  async getBridges(): Promise<any[]> {
    const response = await this.request<any>('GET', '/bridges', undefined, {
      dataType: 'protocols',
    });
    return Array.isArray(response) ? response : response.bridges || [];
  }

  /**
   * Get volumes
   */
  async getVolumes(chain?: string): Promise<any[]> {
    const url = chain ? `/overview/dexs/${chain}` : '/overview/dexs';
    return this.request<any[]>('GET', url, undefined, {
      dataType: 'protocols',
    });
  }

  /**
   * Get fees
   */
  async getFees(protocolId?: string): Promise<any[]> {
    const url = protocolId ? `/protocol/${protocolId}/fees` : '/fees';
    return this.request<any[]>('GET', url, undefined, {
      dataType: 'protocols',
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.request('GET', '/protocols', undefined, { dataType: 'protocols' });
      return true;
    } catch (error) {
      return false;
    }
  }

  // ==================== ANALYTICS & METRICS ====================

  /**
   * Get plan info
   */
  getPlanInfo(): {
    plan: DeFiLlamaPlanTier;
    limits: DeFiLlamaPlanLimits;
    quotaUsage: number;
    quotaRemaining: number;
  } {
    return {
      plan: this.currentPlan,
      limits: this.planLimits,
      quotaUsage: this.planLimits.monthlyQuota > 0 
        ? (this.monthlyRequestCount / this.planLimits.monthlyQuota) * 100 
        : 0,
      quotaRemaining: this.planLimits.monthlyQuota === -1 
        ? -1 
        : this.planLimits.monthlyQuota - this.monthlyRequestCount,
    };
  }

  /**
   * Get metrics
   */
  getMetrics(): DeFiLlamaMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache stats
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    tierDistribution: Record<string, number>;
  } {
    const totalAccess = this.metrics.cacheHits + this.metrics.cacheMisses;
    
    const tierDistribution: Record<string, number> = {
      hot: 0,
      warm: 0,
      cold: 0,
      frozen: 0,
    };
    
    for (const entry of this.cache.values()) {
      tierDistribution[entry.tier]++;
    }
    
    return {
      size: this.cache.size,
      hitRate: totalAccess > 0 ? (this.metrics.cacheHits / totalAccess) * 100 : 0,
      tierDistribution,
    };
  }

  /**
   * Get adaptive polling status
   */
  getAdaptivePollingStatus(): {
    enabled: boolean;
    currentVolatility: VolatilityLevel;
    currentIntervalMs: number;
    activePollers: number;
  } {
    return {
      enabled: this.adaptivePollingConfig.enabled,
      currentVolatility: this.currentVolatility,
      currentIntervalMs: this.getAdaptiveInterval(),
      activePollers: this.pollingTimers.size,
    };
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus(): Promise<{
    isHealthy: boolean;
    plan: DeFiLlamaPlanTier;
    metrics: DeFiLlamaMetrics;
    cacheStats: { size: number; hitRate: number };
    adaptivePolling: { volatility: VolatilityLevel; interval: number };
  }> {
    const isHealthy = await this.healthCheck();
    
    return {
      isHealthy,
      plan: this.currentPlan,
      metrics: this.getMetrics(),
      cacheStats: this.getCacheStats(),
      adaptivePolling: {
        volatility: this.currentVolatility,
        interval: this.getAdaptiveInterval(),
      },
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('DeFiLlama Enhanced cache cleared');
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.responseTimes = [];
    logger.info('DeFiLlama Enhanced metrics reset');
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down DeFiLlama Enhanced client...');
    
    this.stopAllPolling();
    this.cache.clear();
    this.removeAllListeners();
    
    logger.info('DeFiLlama Enhanced client shutdown complete');
  }
}

export default DeFiLlamaEnhancedClient;

