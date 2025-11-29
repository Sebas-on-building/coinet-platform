/**
 * ============================================
 * TOKEN AUTO-DISCOVERY SERVICE
 * ============================================
 * 
 * Automated New Token Detection with:
 * - Multi-chain Scanning (Ethereum, BSC, Polygon, etc.)
 * - Configurable Discovery Intervals
 * - Liquidity & Volume Filtering
 * - Risk Assessment Integration
 * - Real-time Alerting
 * 
 * Efficiency Target: Early detection of promising tokens
 */

import { EventEmitter } from 'eventemitter3';
import { DexScreenerEnhancedClient, DexScreenerPair, DexScreenerPlanTier } from '../providers/dexscreener-enhanced';
import { logger } from '../utils/logger';

/**
 * Discovery filter configuration
 */
export interface DiscoveryFilter {
  minLiquidityUsd: number;
  minVolume24h: number;
  maxAgeHours: number;
  excludeDexIds?: string[];
  includeDexIds?: string[];
  excludeTokenSymbols?: string[];
  minBuySellRatio?: number;
  maxBuySellRatio?: number;
}

/**
 * Discovery schedule configuration
 */
export interface DiscoverySchedule {
  enabled: boolean;
  intervalMs: number;
  chains: string[];
  filters: DiscoveryFilter;
  maxTokensPerScan: number;
}

/**
 * Discovered token with analysis
 */
export interface DiscoveredToken {
  token: {
    address: string;
    symbol: string;
    name: string;
  };
  chainId: string;
  discoveredAt: Date;
  pairs: DexScreenerPair[];
  analysis: TokenAnalysis;
  alerts: TokenAlert[];
}

/**
 * Token analysis
 */
export interface TokenAnalysis {
  totalLiquidity: number;
  totalVolume24h: number;
  pairCount: number;
  bestPair: DexScreenerPair | null;
  avgBuyPressure: number;
  avgSellPressure: number;
  momentum: 'bullish' | 'bearish' | 'neutral';
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  flags: string[];
}

/**
 * Token alert
 */
export interface TokenAlert {
  type: 'new_token' | 'liquidity_spike' | 'volume_spike' | 'high_momentum' | 'risk_warning';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
}

/**
 * Discovery statistics
 */
export interface DiscoveryStatistics {
  totalScans: number;
  tokensDiscovered: number;
  tokensFiltered: number;
  lastScanAt: Date | null;
  lastScanDurationMs: number;
  chainStats: Record<string, {
    scans: number;
    discovered: number;
    filtered: number;
  }>;
  averageScanDurationMs: number;
}

/**
 * Default discovery filter
 */
const DEFAULT_FILTER: DiscoveryFilter = {
  minLiquidityUsd: 10000,
  minVolume24h: 5000,
  maxAgeHours: 24,
  excludeTokenSymbols: ['SCAM', 'HONEYPOT', 'RUG'],
  minBuySellRatio: 0.3,
  maxBuySellRatio: 3.0,
};

/**
 * Default discovery schedule
 */
const DEFAULT_SCHEDULE: DiscoverySchedule = {
  enabled: true,
  intervalMs: 300000, // 5 minutes
  chains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'solana'],
  filters: DEFAULT_FILTER,
  maxTokensPerScan: 100,
};

/**
 * Token Auto-Discovery Service
 */
export class TokenDiscoveryService extends EventEmitter {
  private dexScreener: DexScreenerEnhancedClient;
  private schedule: DiscoverySchedule;
  private scanTimer?: NodeJS.Timeout;
  private isScanning: boolean = false;
  
  // Discovered tokens cache
  private discoveredTokens: Map<string, DiscoveredToken> = new Map();
  private seenTokens: Set<string> = new Set();
  
  // Statistics
  private statistics: DiscoveryStatistics;
  private scanDurations: number[] = [];

  constructor(
    dexScreener: DexScreenerEnhancedClient,
    schedule?: Partial<DiscoverySchedule>
  ) {
    super();
    this.dexScreener = dexScreener;
    this.schedule = { ...DEFAULT_SCHEDULE, ...schedule };
    this.statistics = this.initializeStatistics();
    
    logger.info('Token Discovery Service initialized', {
      enabled: this.schedule.enabled,
      intervalMs: this.schedule.intervalMs,
      chains: this.schedule.chains,
      minLiquidity: this.schedule.filters.minLiquidityUsd,
    });
  }

  /**
   * Initialize statistics
   */
  private initializeStatistics(): DiscoveryStatistics {
    const chainStats: Record<string, any> = {};
    for (const chain of this.schedule.chains) {
      chainStats[chain] = { scans: 0, discovered: 0, filtered: 0 };
    }
    
    return {
      totalScans: 0,
      tokensDiscovered: 0,
      tokensFiltered: 0,
      lastScanAt: null,
      lastScanDurationMs: 0,
      chainStats,
      averageScanDurationMs: 0,
    };
  }

  /**
   * Start discovery service
   */
  start(): void {
    if (this.scanTimer) {
      logger.warn('Token discovery already running');
      return;
    }
    
    if (!this.schedule.enabled) {
      logger.info('Token discovery disabled');
      return;
    }
    
    logger.info('Starting Token Discovery Service');
    
    // Initial scan
    this.runScan();
    
    // Schedule periodic scans
    this.scanTimer = setInterval(() => {
      this.runScan();
    }, this.schedule.intervalMs);
    
    this.emit('started', { schedule: this.schedule });
  }

  /**
   * Stop discovery service
   */
  stop(): void {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = undefined;
      logger.info('Token Discovery Service stopped');
      this.emit('stopped');
    }
  }

  /**
   * Run a discovery scan
   */
  async runScan(): Promise<DiscoveredToken[]> {
    if (this.isScanning) {
      logger.debug('Scan already in progress, skipping');
      return [];
    }
    
    this.isScanning = true;
    const startTime = Date.now();
    const discoveredTokens: DiscoveredToken[] = [];
    
    try {
      logger.info('Starting token discovery scan', {
        chains: this.schedule.chains,
      });
      
      for (const chainId of this.schedule.chains) {
        try {
          const chainDiscoveries = await this.scanChain(chainId);
          discoveredTokens.push(...chainDiscoveries);
          
          this.statistics.chainStats[chainId].scans++;
          this.statistics.chainStats[chainId].discovered += chainDiscoveries.length;
        } catch (error) {
          logger.error(`Failed to scan chain ${chainId}`, { error });
        }
      }
      
      // Update statistics
      const scanDuration = Date.now() - startTime;
      this.updateStatistics(scanDuration, discoveredTokens.length);
      
      // Emit events for new discoveries
      for (const token of discoveredTokens) {
        // Check if truly new
        const tokenKey = `${token.chainId}:${token.token.address}`;
        if (!this.seenTokens.has(tokenKey)) {
          this.seenTokens.add(tokenKey);
          this.discoveredTokens.set(tokenKey, token);
          
          // Emit appropriate alerts
          for (const alert of token.alerts) {
            this.emit(alert.type, { token, alert });
          }
          
          this.emit('token_discovered', token);
        }
      }
      
      logger.info('Token discovery scan complete', {
        discovered: discoveredTokens.length,
        duration: `${scanDuration}ms`,
      });
      
      this.emit('scan_complete', {
        discovered: discoveredTokens.length,
        duration: scanDuration,
      });
      
    } catch (error) {
      logger.error('Token discovery scan failed', { error });
      this.emit('scan_error', { error });
    } finally {
      this.isScanning = false;
    }
    
    return discoveredTokens;
  }

  /**
   * Scan a specific chain for new tokens
   */
  private async scanChain(chainId: string): Promise<DiscoveredToken[]> {
    const discoveries: DiscoveredToken[] = [];
    
    try {
      // Get new tokens from DexScreener
      const response = await this.dexScreener.getNewTokens(
        chainId,
        this.schedule.filters.minLiquidityUsd
      );
      
      const pairs = response.pairs || [];
      
      logger.debug(`Found ${pairs.length} pairs on ${chainId}`);
      
      // Group pairs by base token
      const tokenPairs = new Map<string, DexScreenerPair[]>();
      
      for (const pair of pairs) {
        const tokenKey = pair.baseToken.address.toLowerCase();
        
        if (!tokenPairs.has(tokenKey)) {
          tokenPairs.set(tokenKey, []);
        }
        tokenPairs.get(tokenKey)!.push(pair);
      }
      
      // Analyze and filter tokens
      let processedCount = 0;
      
      for (const [tokenAddress, pairs] of tokenPairs.entries()) {
        if (processedCount >= this.schedule.maxTokensPerScan) {
          break;
        }
        
        const firstPair = pairs[0];
        
        // Apply filters
        if (!this.passesFilters(pairs)) {
          this.statistics.tokensFiltered++;
          this.statistics.chainStats[chainId].filtered++;
          continue;
        }
        
        // Analyze token
        const analysis = this.analyzeToken(pairs);
        const alerts = this.generateAlerts(pairs, analysis);
        
        const discoveredToken: DiscoveredToken = {
          token: {
            address: tokenAddress,
            symbol: firstPair.baseToken.symbol,
            name: firstPair.baseToken.name,
          },
          chainId,
          discoveredAt: new Date(),
          pairs,
          analysis,
          alerts,
        };
        
        discoveries.push(discoveredToken);
        processedCount++;
      }
      
    } catch (error) {
      logger.error(`Chain scan error for ${chainId}`, { error });
    }
    
    return discoveries;
  }

  /**
   * Check if token passes filters
   */
  private passesFilters(pairs: DexScreenerPair[]): boolean {
    const filters = this.schedule.filters;
    
    // Calculate totals
    const totalLiquidity = pairs.reduce((sum, p) => sum + (p.liquidity?.usd || 0), 0);
    const totalVolume = pairs.reduce((sum, p) => sum + (p.volume?.h24 || 0), 0);
    
    // Liquidity filter
    if (totalLiquidity < filters.minLiquidityUsd) {
      return false;
    }
    
    // Volume filter
    if (totalVolume < filters.minVolume24h) {
      return false;
    }
    
    // Age filter
    const oldestPair = pairs.reduce((oldest, p) => {
      const age = p.pairCreatedAt || Date.now();
      return age < oldest ? age : oldest;
    }, Date.now());
    
    const ageHours = (Date.now() - oldestPair) / (1000 * 60 * 60);
    if (ageHours > filters.maxAgeHours) {
      return false;
    }
    
    // Symbol filter
    if (filters.excludeTokenSymbols) {
      const symbol = pairs[0].baseToken.symbol.toUpperCase();
      if (filters.excludeTokenSymbols.some(s => symbol.includes(s))) {
        return false;
      }
    }
    
    // DEX filter
    if (filters.excludeDexIds && filters.excludeDexIds.length > 0) {
      if (pairs.every(p => filters.excludeDexIds!.includes(p.dexId))) {
        return false;
      }
    }
    
    // Buy/sell ratio filter
    const totalBuys = pairs.reduce((sum, p) => sum + (p.txns?.h24?.buys || 0), 0);
    const totalSells = pairs.reduce((sum, p) => sum + (p.txns?.h24?.sells || 0), 0);
    
    if (totalSells > 0) {
      const ratio = totalBuys / totalSells;
      if (filters.minBuySellRatio && ratio < filters.minBuySellRatio) {
        return false;
      }
      if (filters.maxBuySellRatio && ratio > filters.maxBuySellRatio) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Analyze token from pairs data
   */
  private analyzeToken(pairs: DexScreenerPair[]): TokenAnalysis {
    const totalLiquidity = pairs.reduce((sum, p) => sum + (p.liquidity?.usd || 0), 0);
    const totalVolume = pairs.reduce((sum, p) => sum + (p.volume?.h24 || 0), 0);
    
    // Find best pair (highest liquidity)
    const bestPair = pairs.reduce((best, current) => {
      const bestLiq = best.liquidity?.usd || 0;
      const currentLiq = current.liquidity?.usd || 0;
      return currentLiq > bestLiq ? current : best;
    });
    
    // Calculate buy/sell pressure
    const totalBuys = pairs.reduce((sum, p) => sum + (p.txns?.h24?.buys || 0), 0);
    const totalSells = pairs.reduce((sum, p) => sum + (p.txns?.h24?.sells || 0), 0);
    const totalTxns = totalBuys + totalSells;
    
    const avgBuyPressure = totalTxns > 0 ? (totalBuys / totalTxns) * 100 : 50;
    const avgSellPressure = totalTxns > 0 ? (totalSells / totalTxns) * 100 : 50;
    
    // Determine momentum
    let momentum: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (avgBuyPressure > 60) momentum = 'bullish';
    else if (avgSellPressure > 60) momentum = 'bearish';
    
    // Calculate risk score (0-100)
    const riskScore = this.calculateRiskScore(pairs, totalLiquidity, totalVolume);
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    if (riskScore < 25) riskLevel = 'low';
    else if (riskScore < 50) riskLevel = 'medium';
    else if (riskScore < 75) riskLevel = 'high';
    else riskLevel = 'extreme';
    
    // Generate flags
    const flags = this.generateFlags(pairs, totalLiquidity, totalVolume);
    
    return {
      totalLiquidity,
      totalVolume24h: totalVolume,
      pairCount: pairs.length,
      bestPair,
      avgBuyPressure,
      avgSellPressure,
      momentum,
      riskScore,
      riskLevel,
      flags,
    };
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(
    pairs: DexScreenerPair[],
    totalLiquidity: number,
    totalVolume: number
  ): number {
    let score = 0;
    
    // Low liquidity risk
    if (totalLiquidity < 50000) score += 30;
    else if (totalLiquidity < 100000) score += 15;
    
    // Low volume risk
    if (totalVolume < 10000) score += 20;
    else if (totalVolume < 50000) score += 10;
    
    // Single pair risk
    if (pairs.length === 1) score += 15;
    
    // Very new token risk
    const oldestPair = pairs.reduce((oldest, p) => {
      const age = p.pairCreatedAt || Date.now();
      return age < oldest ? age : oldest;
    }, Date.now());
    
    const ageHours = (Date.now() - oldestPair) / (1000 * 60 * 60);
    if (ageHours < 1) score += 25;
    else if (ageHours < 6) score += 15;
    else if (ageHours < 24) score += 5;
    
    // Suspicious activity
    const totalBuys = pairs.reduce((sum, p) => sum + (p.txns?.h24?.buys || 0), 0);
    const totalSells = pairs.reduce((sum, p) => sum + (p.txns?.h24?.sells || 0), 0);
    
    if (totalSells === 0 && totalBuys > 0) score += 20; // No sells is suspicious
    
    return Math.min(100, score);
  }

  /**
   * Generate risk flags
   */
  private generateFlags(
    pairs: DexScreenerPair[],
    totalLiquidity: number,
    totalVolume: number
  ): string[] {
    const flags: string[] = [];
    
    if (totalLiquidity < 50000) flags.push('low_liquidity');
    if (totalVolume < 10000) flags.push('low_volume');
    if (pairs.length === 1) flags.push('single_pair');
    
    const oldestPair = pairs.reduce((oldest, p) => {
      const age = p.pairCreatedAt || Date.now();
      return age < oldest ? age : oldest;
    }, Date.now());
    
    const ageHours = (Date.now() - oldestPair) / (1000 * 60 * 60);
    if (ageHours < 1) flags.push('very_new');
    else if (ageHours < 6) flags.push('new_token');
    
    const totalBuys = pairs.reduce((sum, p) => sum + (p.txns?.h24?.buys || 0), 0);
    const totalSells = pairs.reduce((sum, p) => sum + (p.txns?.h24?.sells || 0), 0);
    
    if (totalSells === 0 && totalBuys > 0) flags.push('no_sells');
    if (totalBuys / (totalSells || 1) > 5) flags.push('high_buy_pressure');
    
    // Check price changes
    const avgPriceChange = pairs.reduce((sum, p) => sum + (p.priceChange?.h1 || 0), 0) / pairs.length;
    if (avgPriceChange > 50) flags.push('price_surge');
    else if (avgPriceChange < -50) flags.push('price_dump');
    
    return flags;
  }

  /**
   * Generate alerts for token
   */
  private generateAlerts(pairs: DexScreenerPair[], analysis: TokenAnalysis): TokenAlert[] {
    const alerts: TokenAlert[] = [];
    const now = new Date();
    
    // New token alert
    alerts.push({
      type: 'new_token',
      severity: 'info',
      message: `New token discovered: ${pairs[0].baseToken.symbol} with $${analysis.totalLiquidity.toLocaleString()} liquidity`,
      timestamp: now,
    });
    
    // High momentum alert
    if (analysis.momentum === 'bullish' && analysis.avgBuyPressure > 70) {
      alerts.push({
        type: 'high_momentum',
        severity: 'info',
        message: `High buy pressure detected: ${analysis.avgBuyPressure.toFixed(1)}% buys`,
        timestamp: now,
      });
    }
    
    // Volume spike alert
    if (analysis.totalVolume24h > analysis.totalLiquidity * 2) {
      alerts.push({
        type: 'volume_spike',
        severity: 'warning',
        message: `High volume/liquidity ratio: $${analysis.totalVolume24h.toLocaleString()} volume on $${analysis.totalLiquidity.toLocaleString()} liquidity`,
        timestamp: now,
      });
    }
    
    // Risk warning
    if (analysis.riskLevel === 'high' || analysis.riskLevel === 'extreme') {
      alerts.push({
        type: 'risk_warning',
        severity: analysis.riskLevel === 'extreme' ? 'critical' : 'warning',
        message: `${analysis.riskLevel.toUpperCase()} risk detected: ${analysis.flags.join(', ')}`,
        timestamp: now,
      });
    }
    
    return alerts;
  }

  /**
   * Update statistics
   */
  private updateStatistics(scanDuration: number, discovered: number): void {
    this.statistics.totalScans++;
    this.statistics.tokensDiscovered += discovered;
    this.statistics.lastScanAt = new Date();
    this.statistics.lastScanDurationMs = scanDuration;
    
    this.scanDurations.push(scanDuration);
    if (this.scanDurations.length > 100) {
      this.scanDurations.shift();
    }
    
    this.statistics.averageScanDurationMs = 
      this.scanDurations.reduce((a, b) => a + b, 0) / this.scanDurations.length;
  }

  /**
   * Get discovered tokens
   */
  getDiscoveredTokens(options?: {
    chainId?: string;
    minLiquidity?: number;
    maxRisk?: 'low' | 'medium' | 'high' | 'extreme';
    limit?: number;
  }): DiscoveredToken[] {
    let tokens = Array.from(this.discoveredTokens.values());
    
    // Apply filters
    if (options?.chainId) {
      tokens = tokens.filter(t => t.chainId === options.chainId);
    }
    
    if (options?.minLiquidity) {
      tokens = tokens.filter(t => t.analysis.totalLiquidity >= options.minLiquidity!);
    }
    
    if (options?.maxRisk) {
      const riskOrder = ['low', 'medium', 'high', 'extreme'];
      const maxRiskIndex = riskOrder.indexOf(options.maxRisk);
      tokens = tokens.filter(t => riskOrder.indexOf(t.analysis.riskLevel) <= maxRiskIndex);
    }
    
    // Sort by discovery time (newest first)
    tokens.sort((a, b) => b.discoveredAt.getTime() - a.discoveredAt.getTime());
    
    // Apply limit
    if (options?.limit) {
      tokens = tokens.slice(0, options.limit);
    }
    
    return tokens;
  }

  /**
   * Get statistics
   */
  getStatistics(): DiscoveryStatistics {
    return { ...this.statistics };
  }

  /**
   * Update schedule
   */
  updateSchedule(schedule: Partial<DiscoverySchedule>): void {
    const wasEnabled = this.schedule.enabled;
    this.schedule = { ...this.schedule, ...schedule };
    
    // Restart if interval changed and was running
    if (this.scanTimer) {
      this.stop();
      if (this.schedule.enabled) {
        this.start();
      }
    } else if (this.schedule.enabled && !wasEnabled) {
      this.start();
    }
    
    logger.info('Discovery schedule updated', { schedule: this.schedule });
  }

  /**
   * Clear discovered tokens cache
   */
  clearCache(): void {
    this.discoveredTokens.clear();
    this.seenTokens.clear();
    logger.info('Discovery cache cleared');
  }

  /**
   * Destroy service
   */
  destroy(): void {
    this.stop();
    this.clearCache();
    this.removeAllListeners();
    logger.info('Token Discovery Service destroyed');
  }
}

export default TokenDiscoveryService;

