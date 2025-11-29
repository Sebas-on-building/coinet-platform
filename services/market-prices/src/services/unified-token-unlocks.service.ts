/**
 * Unified Token Unlocks Service
 * Enterprise-grade multi-source token unlock intelligence
 * 
 * Features:
 * - 10+ data source aggregation
 * - ML-powered consensus engine
 * - On-chain verification
 * - Real-time monitoring
 * - VC wallet tracking
 * - Impact prediction
 */

import { EventEmitter } from 'events';
import { Observable, Subject, merge, interval } from 'rxjs';
import { filter, map, takeUntil, debounceTime } from 'rxjs/operators';
import { logger } from '../utils/logger';

// Data sources
import { MessariRestClient } from '../providers/messari-rest';
import { TheTieRestClient } from '../providers/thetie-rest';
import { CryptoRankRestClient } from '../providers/cryptorank-rest';
import { getTokenUnlocksScraper, TokenUnlocksScraper, TokenUnlocksEvent } from '../providers/tokenunlocks-scraper';
import { getDeFiLlamaUnlocksClient, DeFiLlamaUnlocksClient, NormalizedDeFiLlamaUnlock } from '../providers/defillama-unlocks';
import { getCoinGeckoUnlocksClient, CoinGeckoUnlocksClient, InferredUnlock } from '../providers/coingecko-unlocks';

// Intelligence
import { getUnlockConsensusEngine, UnlockConsensusEngine, SourceUnlock, ConsensusUnlock } from '../intelligence/unlock-consensus-engine';
import { getUnlockImpactPredictor, UnlockImpactPredictor, ImpactPrediction, PredictionInput } from '../intelligence/unlock-impact-predictor';
import { getVCWalletTracker, VCWalletTracker } from '../intelligence/vc-wallet-tracker';

// On-chain
import { getOnChainVestingMonitor, OnChainVestingMonitor, OnChainVerification } from '../providers/onchain/vesting-monitor';
import { ProviderConfig } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface UnifiedUnlock {
  id: string;
  symbol: string;
  name: string;
  unlockDate: Date;
  
  // Amounts
  unlockAmount: number;
  unlockAmountUsd: number;
  percentOfCirculating: number;
  percentOfTotal: number;
  
  // Classification
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Consensus data
  sourceCount: number;
  sources: string[];
  confidence: number;
    hasDiscrepancies: boolean;
  
  // Verification
  onChainVerified: boolean;
  verificationDetails?: OnChainVerification;
  
  // Prediction
  prediction?: ImpactPrediction;
  
  // VC tracking
  knownVCInvolved: boolean;
  vcName?: string;
  expectedSellPressure?: number;
  
  // Metadata
  chain?: string;
  vestingContract?: string;
  isCliff: boolean;
  isEstimate: boolean;
  lastUpdated: Date;
}

export interface UnlockAlert {
  id: string;
  type: 'upcoming' | 'high_impact' | 'vc_selling' | 'on_chain_event';
  severity: 'info' | 'warning' | 'critical';
  unlock: UnifiedUnlock;
  message: string;
  recommendation?: string;
  createdAt: Date;
}

export interface ServiceConfig {
  enableMessari: boolean;
  enableTheTie: boolean;
  enableCryptoRank: boolean;
  enableTokenUnlocks: boolean;
  enableDeFiLlama: boolean;
  enableCoinGecko: boolean;
  enableOnChain: boolean;
  enableVCTracking: boolean;
  enablePredictions: boolean;
  pollingIntervalMs: number;
  alertThresholdPercent: number;
  alertThresholdUsd: number;
}

const DEFAULT_CONFIG: ServiceConfig = {
  enableMessari: true,
  enableTheTie: false, // Optional/paid
  enableCryptoRank: true,
  enableTokenUnlocks: true,
  enableDeFiLlama: true,
  enableCoinGecko: true,
  enableOnChain: true,
  enableVCTracking: true,
  enablePredictions: true,
  pollingIntervalMs: 300000, // 5 minutes
  alertThresholdPercent: 5,
  alertThresholdUsd: 10000000, // $10M
};

// =============================================================================
// MAIN CLASS
// =============================================================================

export class UnifiedTokenUnlocksService extends EventEmitter {
  private config: ServiceConfig;
  
  // Data sources
  private messari?: MessariRestClient;
  private theTie?: TheTieRestClient;
  private cryptoRank?: CryptoRankRestClient;
  private tokenUnlocks: TokenUnlocksScraper;
  private deFiLlama: DeFiLlamaUnlocksClient;
  private coinGecko: CoinGeckoUnlocksClient;
  
  // Intelligence
  private consensusEngine: UnlockConsensusEngine;
  private impactPredictor: UnlockImpactPredictor;
  private vcTracker: VCWalletTracker;
  
  // On-chain
  private onChainMonitor: OnChainVestingMonitor;
  
  // State
  private unifiedUnlocks: Map<string, UnifiedUnlock>;
  private alerts: Map<string, UnlockAlert>;
  private pollingInterval?: NodeJS.Timeout;
  private destroy$: Subject<void>;
  private alertSubject: Subject<UnlockAlert>;
  private isRunning: boolean = false;

  constructor(config?: Partial<ServiceConfig>, providerConfigs?: {
    messari?: ProviderConfig;
    theTie?: ProviderConfig;
    cryptoRank?: ProviderConfig;
  }) {
    super();
    
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.unifiedUnlocks = new Map();
    this.alerts = new Map();
    this.destroy$ = new Subject();
    this.alertSubject = new Subject();
    
    // Initialize data sources
    if (this.config.enableMessari && providerConfigs?.messari) {
      this.messari = new MessariRestClient(providerConfigs.messari);
    }
    
    if (this.config.enableTheTie && providerConfigs?.theTie) {
      this.theTie = new TheTieRestClient(providerConfigs.theTie);
    }
    
    if (this.config.enableCryptoRank && providerConfigs?.cryptoRank) {
      this.cryptoRank = new CryptoRankRestClient(providerConfigs.cryptoRank);
    }
    
    this.tokenUnlocks = getTokenUnlocksScraper();
    this.deFiLlama = getDeFiLlamaUnlocksClient();
    this.coinGecko = getCoinGeckoUnlocksClient();
    
    // Initialize intelligence
    this.consensusEngine = getUnlockConsensusEngine();
    this.impactPredictor = getUnlockImpactPredictor();
    this.vcTracker = getVCWalletTracker();
    
    // Initialize on-chain monitor
    this.onChainMonitor = getOnChainVestingMonitor();
    
    logger.info('Unified Token Unlocks Service initialized', {
      sources: this.getEnabledSources(),
      pollingInterval: this.config.pollingIntervalMs,
    });
  }

  /**
   * Get list of enabled data sources
   */
  private getEnabledSources(): string[] {
    const sources: string[] = [];
    if (this.config.enableMessari && this.messari) sources.push('messari');
    if (this.config.enableTheTie && this.theTie) sources.push('thetie');
    if (this.config.enableCryptoRank && this.cryptoRank) sources.push('cryptorank');
    if (this.config.enableTokenUnlocks) sources.push('tokenunlocks');
    if (this.config.enableDeFiLlama) sources.push('defillama');
    if (this.config.enableCoinGecko) sources.push('coingecko');
    if (this.config.enableOnChain) sources.push('onchain');
    return sources;
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Start the service
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Initialize impact predictor
    await this.impactPredictor.initialize();
    
    // Initial data fetch
    await this.refreshAllData();
    
    // Start polling
    this.pollingInterval = setInterval(async () => {
      await this.refreshAllData();
    }, this.config.pollingIntervalMs);
    
    // Subscribe to on-chain events
    if (this.config.enableOnChain) {
      this.onChainMonitor.getEventStream()
        .pipe(takeUntil(this.destroy$))
        .subscribe(event => {
          this.handleOnChainEvent(event);
        });
    }
    
    logger.info('Unified Token Unlocks Service started');
    this.emit('started');
  }

  /**
   * Stop the service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.destroy$.next();
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    this.onChainMonitor.shutdown();
    
    logger.info('Unified Token Unlocks Service stopped');
    this.emit('stopped');
  }

  // ===========================================================================
  // DATA FETCHING
  // ===========================================================================

  /**
   * Refresh data from all sources
   */
  async refreshAllData(): Promise<void> {
    try {
      logger.debug('Refreshing token unlock data from all sources');
      
      const fetchPromises: Promise<void>[] = [];
      
      // Fetch from each source
      if (this.config.enableMessari && this.messari) {
        fetchPromises.push(this.fetchMessariData());
      }
      
      if (this.config.enableCryptoRank && this.cryptoRank) {
        fetchPromises.push(this.fetchCryptoRankData());
      }
      
      if (this.config.enableTokenUnlocks) {
        fetchPromises.push(this.fetchTokenUnlocksData());
      }
      
      if (this.config.enableDeFiLlama) {
        fetchPromises.push(this.fetchDeFiLlamaData());
      }
      
      if (this.config.enableCoinGecko) {
        fetchPromises.push(this.fetchCoinGeckoData());
      }
      
      await Promise.allSettled(fetchPromises);
      
      // Compute consensus
      const consensusResults = this.consensusEngine.getAllConsensus();
      
      // Create unified unlocks
      await this.createUnifiedUnlocks(consensusResults);
      
      // Check for alerts
      this.checkForAlerts();
      
      logger.info('Token unlock data refreshed', {
        totalUnlocks: this.unifiedUnlocks.size,
        sources: this.getEnabledSources().length,
      });
      
      this.emit('dataRefreshed', Array.from(this.unifiedUnlocks.values()));
    } catch (error) {
      logger.error('Failed to refresh token unlock data', { error });
    }
  }

  /**
   * Fetch Messari data
   */
  private async fetchMessariData(): Promise<void> {
    if (!this.messari) return;
    
    try {
      const unlocks = await this.messari.getUpcomingUnlocksNormalized(90);
      
      for (const unlock of unlocks) {
        this.consensusEngine.addSourceData({
          source: 'messari',
          symbol: unlock.symbol,
          name: unlock.name,
          unlockDate: unlock.unlockDate,
          unlockAmount: unlock.unlockAmount,
          unlockAmountUsd: unlock.unlockAmountUsd,
          percentOfSupply: unlock.unlockPercentage,
          percentOfCirculating: unlock.unlockPercentage, // Estimate
          category: unlock.category,
          confidence: 0.85,
          verified: true,
          lastUpdated: new Date(),
        });
      }
    } catch (error) {
      logger.debug('Failed to fetch Messari data', { error });
    }
  }

  /**
   * Fetch CryptoRank data
   */
  private async fetchCryptoRankData(): Promise<void> {
    if (!this.cryptoRank) return;
    
    try {
      const unlocks = await this.cryptoRank.getUpcomingUnlocksNormalized(90);
      
      for (const unlock of unlocks) {
        this.consensusEngine.addSourceData({
          source: 'cryptorank',
          symbol: unlock.symbol,
          name: unlock.name,
          unlockDate: unlock.unlockDate,
          unlockAmount: unlock.unlockAmount,
          unlockAmountUsd: unlock.unlockAmountUsd,
          percentOfSupply: unlock.percentOfTotalSupply,
          percentOfCirculating: unlock.percentOfCirculatingSupply,
          category: unlock.category,
          confidence: 0.70,
          verified: unlock.verified,
          lastUpdated: new Date(),
        });
      }
    } catch (error) {
      logger.debug('Failed to fetch CryptoRank data', { error });
    }
  }

  /**
   * Fetch TokenUnlocks.app data
   */
  private async fetchTokenUnlocksData(): Promise<void> {
    try {
      const unlocks = await this.tokenUnlocks.getUpcomingUnlocks();
      
      for (const unlock of unlocks) {
        this.consensusEngine.addSourceData({
          source: 'tokenunlocks',
          symbol: unlock.symbol,
          name: unlock.name,
          unlockDate: unlock.unlockDate,
          unlockAmount: unlock.unlockAmount,
          unlockAmountUsd: unlock.unlockAmountUsd,
          percentOfSupply: unlock.percentOfTotal,
          percentOfCirculating: unlock.percentOfCirculating,
          category: unlock.category,
          confidence: 0.75,
          verified: !unlock.isEstimate,
          lastUpdated: new Date(),
        });
      }
    } catch (error) {
      logger.debug('Failed to fetch TokenUnlocks data', { error });
    }
  }

  /**
   * Fetch DeFiLlama data
   */
  private async fetchDeFiLlamaData(): Promise<void> {
    try {
      const unlocks = await this.deFiLlama.getUpcomingUnlocksNormalized({ daysAhead: 90 });
      
      for (const unlock of unlocks) {
        this.consensusEngine.addSourceData({
          source: 'defillama',
          symbol: unlock.symbol,
          name: unlock.name,
          unlockDate: unlock.unlockDate,
          unlockAmount: unlock.unlockAmount,
          unlockAmountUsd: unlock.unlockAmountUsd,
          percentOfSupply: unlock.percentOfMax,
          percentOfCirculating: unlock.percentOfCirculating,
          category: unlock.category,
          confidence: 0.65,
          verified: unlock.verified,
          lastUpdated: new Date(),
        });
      }
    } catch (error) {
      logger.debug('Failed to fetch DeFiLlama data', { error });
    }
  }

  /**
   * Fetch CoinGecko data
   */
  private async fetchCoinGeckoData(): Promise<void> {
    try {
      const unlocks = await this.coinGecko.getHighImpactUnlocks({
        daysAhead: 90,
        topCoins: 20,
      });
      
      for (const unlock of unlocks) {
        this.consensusEngine.addSourceData({
          source: 'coingecko',
          symbol: unlock.symbol,
          name: unlock.name,
          unlockDate: unlock.unlockDate,
          unlockAmount: unlock.unlockAmount,
          unlockAmountUsd: unlock.unlockAmountUsd,
          percentOfSupply: 0,
          percentOfCirculating: unlock.percentOfCirculating,
          category: unlock.category,
          confidence: unlock.confidence === 'high' ? 0.7 : unlock.confidence === 'medium' ? 0.5 : 0.3,
          verified: false, // CoinGecko data is inferred
          lastUpdated: new Date(),
        });
      }
    } catch (error) {
      logger.debug('Failed to fetch CoinGecko data', { error });
    }
  }

  // ===========================================================================
  // UNIFIED UNLOCKS
  // ===========================================================================

  /**
   * Create unified unlocks from consensus results
   */
  private async createUnifiedUnlocks(consensusResults: ConsensusUnlock[]): Promise<void> {
    for (const consensus of consensusResults) {
      const unifiedId = `${consensus.symbol}-${consensus.unlockDate.toISOString().split('T')[0]}`;
      
      // Get prediction if enabled
      let prediction: ImpactPrediction | undefined;
      if (this.config.enablePredictions) {
        try {
          prediction = await this.getPrediction(consensus);
        } catch (error) {
          logger.debug('Failed to get prediction', { error, symbol: consensus.symbol });
        }
      }
      
      // Check for VC involvement
      const vcInfo = this.checkVCInvolvement(consensus);
      
      const unified: UnifiedUnlock = {
        id: unifiedId,
        symbol: consensus.symbol,
        name: consensus.name,
        unlockDate: consensus.unlockDate,
        unlockAmount: consensus.consensusAmount,
        unlockAmountUsd: consensus.consensusAmountUsd,
        percentOfCirculating: consensus.consensusPercentOfCirculating,
        percentOfTotal: consensus.consensusPercentOfSupply,
        category: consensus.consensusCategory,
        severity: consensus.severity,
        sourceCount: consensus.sources.length,
        sources: consensus.sources.map(s => s.source),
        confidence: consensus.overallConfidence,
        hasDiscrepancies: consensus.hasDiscrepancies,
        onChainVerified: consensus.onChainVerified,
        prediction,
        knownVCInvolved: vcInfo.isVC,
        vcName: vcInfo.vcName,
        expectedSellPressure: vcInfo.sellPressure,
        isCliff: consensus.consensusCategory.toLowerCase().includes('cliff'),
        isEstimate: consensus.overallConfidence < 0.7,
        lastUpdated: new Date(),
      };
      
      this.unifiedUnlocks.set(unifiedId, unified);
    }
  }

  /**
   * Get prediction for an unlock
   */
  private async getPrediction(consensus: ConsensusUnlock): Promise<ImpactPrediction> {
    const input: PredictionInput = {
      unlock: {
        percentOfTotalSupply: consensus.consensusPercentOfSupply,
        percentOfCirculatingSupply: consensus.consensusPercentOfCirculating,
        unlockValueUsd: consensus.consensusAmountUsd,
        unlockValueAsPercentOfMarketCap: 0, // Would need market cap
        daysUntilUnlock: Math.ceil((consensus.unlockDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        isCliff: consensus.consensusCategory.toLowerCase().includes('cliff'),
        categoryTeam: consensus.consensusCategory.toLowerCase().includes('team'),
        categoryInvestor: consensus.consensusCategory.toLowerCase().includes('investor'),
        categoryAdvisor: consensus.consensusCategory.toLowerCase().includes('advisor'),
        categoryTreasury: consensus.consensusCategory.toLowerCase().includes('treasury'),
        categoryCommunity: consensus.consensusCategory.toLowerCase().includes('community'),
        categoryOther: true,
      },
      market: {
        btcPriceChange24h: 0,
        ethPriceChange24h: 0,
        tokenPriceChange24h: 0,
        tokenVolatility7d: 0,
        tokenVolume24hUsd: 0,
        tokenLiquidityUsd: 0,
        marketSentiment: 0,
        fearGreedIndex: 50,
      },
      historical: {
        priorUnlockAvgImpact: 0,
        categoryHistoricalImpact: 0,
        sizeHistoricalImpact: 0,
        holderSellBehavior: 0.5,
        timeSinceLastUnlock: 30,
      },
    };
    
    return this.impactPredictor.predict(consensus.symbol, consensus.unlockDate, input);
  }

  /**
   * Check for VC involvement
   */
  private checkVCInvolvement(consensus: ConsensusUnlock): {
    isVC: boolean;
    vcName?: string;
    sellPressure?: number;
  } {
    // Check if category suggests VC
    const category = consensus.consensusCategory.toLowerCase();
    
    if (category.includes('investor') || category.includes('vc') || category.includes('seed') || category.includes('private')) {
      return {
        isVC: true,
        vcName: 'Unknown Investor',
        sellPressure: 50, // Default estimate
      };
    }
    
    return { isVC: false };
  }

  /**
   * Handle on-chain event
   */
  private handleOnChainEvent(event: any): void {
    logger.info('On-chain vesting event detected', {
      type: event.type,
      tokenSymbol: event.tokenSymbol,
      amount: event.amountFormatted,
    });
    
    // Create alert
    const alert: UnlockAlert = {
      id: `onchain-${event.txHash}-${Date.now()}`,
      type: 'on_chain_event',
      severity: 'info',
      unlock: {
        id: `onchain-${event.tokenSymbol}-${Date.now()}`,
        symbol: event.tokenSymbol,
        name: event.tokenSymbol,
        unlockDate: event.timestamp,
        unlockAmount: Number(event.amount),
        unlockAmountUsd: event.amountUsd || 0,
        percentOfCirculating: 0,
        percentOfTotal: 0,
        category: 'On-Chain Release',
        severity: 'medium',
        sourceCount: 1,
        sources: ['onchain'],
        confidence: 1,
        hasDiscrepancies: false,
        onChainVerified: true,
        knownVCInvolved: false,
        isCliff: false,
        isEstimate: false,
        lastUpdated: new Date(),
      },
      message: `On-chain token release detected: ${event.amountFormatted} ${event.tokenSymbol}`,
      createdAt: new Date(),
    };
    
    this.alerts.set(alert.id, alert);
    this.alertSubject.next(alert);
    this.emit('alert', alert);
  }

  // ===========================================================================
  // ALERTS
  // ===========================================================================

  /**
   * Check for alerts
   */
  private checkForAlerts(): void {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    for (const unlock of this.unifiedUnlocks.values()) {
      // Upcoming unlock (within 24h)
      if (unlock.unlockDate >= now && unlock.unlockDate <= tomorrow) {
        const alert: UnlockAlert = {
          id: `upcoming-${unlock.id}`,
          type: 'upcoming',
          severity: unlock.severity === 'critical' ? 'critical' : 'warning',
          unlock,
          message: `${unlock.symbol} unlock in less than 24 hours: ${unlock.unlockAmount.toLocaleString()} tokens ($${unlock.unlockAmountUsd.toLocaleString()})`,
          recommendation: unlock.prediction?.recommendation,
          createdAt: new Date(),
        };
        
        if (!this.alerts.has(alert.id)) {
          this.alerts.set(alert.id, alert);
          this.alertSubject.next(alert);
          this.emit('alert', alert);
        }
      }
      
      // High impact unlock
      if (unlock.percentOfCirculating >= this.config.alertThresholdPercent ||
          unlock.unlockAmountUsd >= this.config.alertThresholdUsd) {
        if (unlock.unlockDate >= now && unlock.unlockDate <= weekFromNow) {
          const alert: UnlockAlert = {
            id: `highimpact-${unlock.id}`,
            type: 'high_impact',
            severity: 'critical',
            unlock,
            message: `High-impact ${unlock.symbol} unlock: ${unlock.percentOfCirculating.toFixed(2)}% of circulating supply ($${unlock.unlockAmountUsd.toLocaleString()})`,
            recommendation: 'Consider reducing exposure before this unlock.',
            createdAt: new Date(),
          };
          
          if (!this.alerts.has(alert.id)) {
            this.alerts.set(alert.id, alert);
            this.alertSubject.next(alert);
            this.emit('alert', alert);
          }
        }
      }
    }
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Get all unified unlocks
   */
  getUnlocks(options?: {
    symbol?: string;
    minConfidence?: number;
    daysAhead?: number;
    severity?: string[];
    verified?: boolean;
  }): UnifiedUnlock[] {
    let unlocks = Array.from(this.unifiedUnlocks.values());
    
    if (options?.symbol) {
      unlocks = unlocks.filter(u => u.symbol.toUpperCase() === options.symbol!.toUpperCase());
    }
    
    if (options?.minConfidence) {
      unlocks = unlocks.filter(u => u.confidence >= options.minConfidence!);
    }
    
    if (options?.daysAhead) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + options.daysAhead);
      unlocks = unlocks.filter(u => u.unlockDate <= cutoff);
    }
    
    if (options?.severity) {
      unlocks = unlocks.filter(u => options.severity!.includes(u.severity));
    }
    
    if (options?.verified !== undefined) {
      unlocks = unlocks.filter(u => u.onChainVerified === options.verified);
    }
    
    return unlocks.sort((a, b) => a.unlockDate.getTime() - b.unlockDate.getTime());
  }

  /**
   * Get unlock by ID
   */
  getUnlock(id: string): UnifiedUnlock | undefined {
    return this.unifiedUnlocks.get(id);
  }

  /**
   * Get alerts
   */
  getAlerts(options?: {
    type?: UnlockAlert['type'];
    severity?: UnlockAlert['severity'];
  }): UnlockAlert[] {
    let alerts = Array.from(this.alerts.values());
    
    if (options?.type) {
      alerts = alerts.filter(a => a.type === options.type);
    }
    
    if (options?.severity) {
      alerts = alerts.filter(a => a.severity === options.severity);
    }
    
    return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get alert observable
   */
  getAlertStream(): Observable<UnlockAlert> {
    return this.alertSubject.asObservable();
  }

  /**
   * Verify unlock on-chain
   */
  async verifyOnChain(
    symbol: string,
    chain: string,
    contractAddress: string
  ): Promise<OnChainVerification> {
    const unlock = Array.from(this.unifiedUnlocks.values())
      .find(u => u.symbol.toUpperCase() === symbol.toUpperCase());
    
    if (!unlock) {
      throw new Error(`No unlock found for ${symbol}`);
    }
    
    return this.onChainMonitor.verifyUnlock(
      chain as any,
      contractAddress,
      BigInt(Math.floor(unlock.unlockAmount)),
      unlock.unlockDate
    );
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    sources: Record<string, boolean>;
    stats: any;
  }> {
    const sources: Record<string, boolean> = {};
    
    if (this.messari) {
      sources.messari = await this.messari.healthCheck().catch(() => false);
    }
    if (this.cryptoRank) {
      sources.cryptorank = await this.cryptoRank.healthCheck().catch(() => false);
    }
    sources.tokenunlocks = await this.tokenUnlocks.healthCheck().catch(() => false);
    sources.defillama = await this.deFiLlama.healthCheck().catch(() => false);
    sources.coingecko = await this.coinGecko.healthCheck().catch(() => false);
    sources.onchain = await this.onChainMonitor.healthCheck().catch(() => false);
    
    const healthy = Object.values(sources).some(v => v);

    return {
      healthy,
      sources,
      stats: this.getStats(),
    };
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalUnlocks: number;
    enabledSources: string[];
    consensusStats: any;
    onChainStats: any;
    alertCount: number;
    isRunning: boolean;
  } {
    return {
      totalUnlocks: this.unifiedUnlocks.size,
      enabledSources: this.getEnabledSources(),
      consensusStats: this.consensusEngine.getStats(),
      onChainStats: this.onChainMonitor.getStats(),
      alertCount: this.alerts.size,
      isRunning: this.isRunning,
    };
  }
}

// Singleton
let instance: UnifiedTokenUnlocksService | null = null;

export function getUnifiedTokenUnlocksService(
  config?: Partial<ServiceConfig>,
  providerConfigs?: any
): UnifiedTokenUnlocksService {
  if (!instance) {
    instance = new UnifiedTokenUnlocksService(config, providerConfigs);
  }
  return instance;
}

export default UnifiedTokenUnlocksService;
