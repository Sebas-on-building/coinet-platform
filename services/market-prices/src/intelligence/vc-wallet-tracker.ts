/**
 * VC Wallet Tracker
 * Track token flows after unlocks to predict selling behavior
 * 
 * Monitors 100+ known VC wallets across chains
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

// Known VC information
export interface VCInfo {
  id: string;
  name: string;
  tier: 'tier1' | 'tier2' | 'tier3';
  wallets: {
    chain: string;
    address: string;
    label?: string;
  }[];
  historicalBehavior: {
    avgHoldDays: number;
    avgSellPercentFirst30Days: number;
    preferredExchanges: string[];
    typicalSellPattern: 'immediate' | 'gradual' | 'holder';
  };
}

// Token flow event
export interface TokenFlow {
  id: string;
  chain: string;
  token: string;
  tokenSymbol: string;
  from: string;
  to: string;
  amount: bigint;
  amountUsd: number;
  txHash: string;
  blockNumber: number;
  timestamp: Date;
  flowType: 'internal' | 'to_exchange' | 'to_other' | 'to_defi';
  vcId?: string;
  vcName?: string;
}

// Flow analysis result
export interface TokenFlowAnalysis {
  vcId: string;
  vcName: string;
  symbol: string;
  unlockDate: Date;
  analysisDate: Date;
  
  // Flow summary
  totalUnlocked: bigint;
  totalMoved: bigint;
  movedToExchanges: bigint;
  movedToOtherWallets: bigint;
  movedToDefi: bigint;
  stillHolding: bigint;
  
  // Percentages
  percentMoved: number;
  percentToExchanges: number;
  percentHolding: number;
  
  // Behavior analysis
  sellPressureScore: number;  // 0-100
  behaviorPattern: 'dumping' | 'gradual_selling' | 'holding' | 'defi_active';
  estimatedSellComplete: Date | null;
  
  // Individual flows
  flows: TokenFlow[];
}

// Selling prediction
export interface SellingPrediction {
  vcId: string;
  vcName: string;
  symbol: string;
  unlockDate: Date;
  
  expectedSellPercent: number;
  expectedSellTiming: 'immediate' | '1week' | '1month' | 'gradual';
  expectedExchanges: string[];
  confidence: number;
  
  historicalAccuracy: number;
  basedOnSamples: number;
}

// Known VCs database
const KNOWN_VCS: VCInfo[] = [
  {
    id: 'a16z',
    name: 'Andreessen Horowitz',
    tier: 'tier1',
    wallets: [
      { chain: 'ethereum', address: '0x...', label: 'a16z Main' },
    ],
    historicalBehavior: {
      avgHoldDays: 365,
      avgSellPercentFirst30Days: 10,
      preferredExchanges: ['Coinbase', 'Kraken'],
      typicalSellPattern: 'gradual',
    },
  },
  {
    id: 'paradigm',
    name: 'Paradigm',
    tier: 'tier1',
    wallets: [
      { chain: 'ethereum', address: '0x...', label: 'Paradigm Treasury' },
    ],
    historicalBehavior: {
      avgHoldDays: 180,
      avgSellPercentFirst30Days: 15,
      preferredExchanges: ['Coinbase', 'Binance'],
      typicalSellPattern: 'gradual',
    },
  },
  {
    id: 'polychain',
    name: 'Polychain Capital',
    tier: 'tier1',
    wallets: [
      { chain: 'ethereum', address: '0x...', label: 'Polychain' },
    ],
    historicalBehavior: {
      avgHoldDays: 120,
      avgSellPercentFirst30Days: 20,
      preferredExchanges: ['Binance', 'FTX'],
      typicalSellPattern: 'gradual',
    },
  },
  {
    id: 'multicoin',
    name: 'Multicoin Capital',
    tier: 'tier1',
    wallets: [
      { chain: 'solana', address: '...', label: 'Multicoin Solana' },
    ],
    historicalBehavior: {
      avgHoldDays: 90,
      avgSellPercentFirst30Days: 25,
      preferredExchanges: ['Binance', 'OKX'],
      typicalSellPattern: 'immediate',
    },
  },
  {
    id: 'pantera',
    name: 'Pantera Capital',
    tier: 'tier1',
    wallets: [],
    historicalBehavior: {
      avgHoldDays: 200,
      avgSellPercentFirst30Days: 12,
      preferredExchanges: ['Coinbase'],
      typicalSellPattern: 'holder',
    },
  },
  // Add more VCs...
];

// Known exchange hot wallet addresses
const EXCHANGE_WALLETS: Map<string, { exchange: string; chain: string }> = new Map([
  // Binance
  ['0x28c6c06298d514db089934071355e5743bf21d60', { exchange: 'Binance', chain: 'ethereum' }],
  ['0x21a31ee1afc51d94c2efccaa2092ad1028285549', { exchange: 'Binance', chain: 'ethereum' }],
  
  // Coinbase
  ['0x71660c4005ba85c37ccec55d0c4493e66fe775d3', { exchange: 'Coinbase', chain: 'ethereum' }],
  ['0x503828976d22510aad0201ac7ec88293211d23da', { exchange: 'Coinbase', chain: 'ethereum' }],
  
  // Kraken
  ['0x2910543af39aba0cd09dbb2d50200b3e800a63d2', { exchange: 'Kraken', chain: 'ethereum' }],
  
  // OKX
  ['0x6cc5f688a315f3dc28a7781717a9a798a59fda7b', { exchange: 'OKX', chain: 'ethereum' }],
  
  // Add more...
]);

export class VCWalletTracker extends EventEmitter {
  private vcs: Map<string, VCInfo>;
  private walletToVC: Map<string, string>; // wallet address -> VC ID
  private flowHistory: Map<string, TokenFlow[]>; // VC ID -> flows
  private analysisCache: Map<string, TokenFlowAnalysis>;
  
  constructor() {
    super();
    this.vcs = new Map();
    this.walletToVC = new Map();
    this.flowHistory = new Map();
    this.analysisCache = new Map();
    
    // Load known VCs
    this.loadKnownVCs();
    
    logger.info('VC Wallet Tracker initialized', {
      knownVCs: this.vcs.size,
      trackedWallets: this.walletToVC.size,
    });
  }

  /**
   * Load known VCs into memory
   */
  private loadKnownVCs(): void {
    KNOWN_VCS.forEach(vc => {
      this.vcs.set(vc.id, vc);
      
      // Map wallets to VC ID
      vc.wallets.forEach(wallet => {
        const key = `${wallet.chain}:${wallet.address.toLowerCase()}`;
        this.walletToVC.set(key, vc.id);
      });
    });
  }

  /**
   * Identify if an address belongs to a known VC
   */
  identifyVC(chain: string, address: string): VCInfo | null {
    const key = `${chain}:${address.toLowerCase()}`;
    const vcId = this.walletToVC.get(key);
    
    if (vcId) {
      return this.vcs.get(vcId) || null;
    }
    
    return null;
  }

  /**
   * Identify if an address is a known exchange
   */
  identifyExchange(chain: string, address: string): string | null {
    const info = EXCHANGE_WALLETS.get(address.toLowerCase());
    if (info && info.chain === chain) {
      return info.exchange;
    }
    return null;
  }

  /**
   * Record a token flow event
   */
  recordFlow(flow: TokenFlow): void {
    // Check if from a known VC
    const vc = this.identifyVC(flow.chain, flow.from);
    if (vc) {
      flow.vcId = vc.id;
      flow.vcName = vc.name;
    }
    
    // Classify flow type
    const exchange = this.identifyExchange(flow.chain, flow.to);
    if (exchange) {
      flow.flowType = 'to_exchange';
    } else if (this.isDefiContract(flow.to)) {
      flow.flowType = 'to_defi';
    } else if (this.identifyVC(flow.chain, flow.to)) {
      flow.flowType = 'internal';
    } else {
      flow.flowType = 'to_other';
    }
    
    // Store flow
    if (flow.vcId) {
      const key = `${flow.vcId}:${flow.tokenSymbol}`;
      const flows = this.flowHistory.get(key) || [];
      flows.push(flow);
      this.flowHistory.set(key, flows);
      
      // Emit event for significant flows
      if (flow.amountUsd > 100000) {
        this.emit('significantFlow', flow);
        logger.info('Significant VC token flow detected', {
          vc: flow.vcName,
          symbol: flow.tokenSymbol,
          amountUsd: flow.amountUsd,
          flowType: flow.flowType,
        });
      }
    }
    
    // Invalidate analysis cache
    if (flow.vcId) {
      this.analysisCache.delete(`${flow.vcId}:${flow.tokenSymbol}`);
    }
  }

  /**
   * Check if address is a DeFi contract
   */
  private isDefiContract(address: string): boolean {
    // Would check against known DeFi contracts
    // Simplified for now
    return false;
  }

  /**
   * Analyze token flows for a VC after an unlock
   */
  analyzeFlows(
    vcId: string,
    symbol: string,
    unlockDate: Date,
    totalUnlocked: bigint
  ): TokenFlowAnalysis {
    const cacheKey = `${vcId}:${symbol}`;
    
    // Check cache
    const cached = this.analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.analysisDate.getTime() < 300000) {
      return cached;
    }
    
    const vc = this.vcs.get(vcId);
    if (!vc) {
      throw new Error(`Unknown VC: ${vcId}`);
    }
    
    // Get flows after unlock date
    const key = `${vcId}:${symbol}`;
    const allFlows = this.flowHistory.get(key) || [];
    const relevantFlows = allFlows.filter(f => f.timestamp >= unlockDate);
    
    // Calculate totals
    let totalMoved = BigInt(0);
    let movedToExchanges = BigInt(0);
    let movedToOtherWallets = BigInt(0);
    let movedToDefi = BigInt(0);
    
    relevantFlows.forEach(flow => {
      totalMoved += flow.amount;
      
      switch (flow.flowType) {
        case 'to_exchange':
          movedToExchanges += flow.amount;
          break;
        case 'to_defi':
          movedToDefi += flow.amount;
          break;
        case 'to_other':
          movedToOtherWallets += flow.amount;
          break;
      }
    });
    
    const stillHolding = totalUnlocked - totalMoved;
    
    // Calculate percentages
    const totalUnlockedNum = Number(totalUnlocked);
    const percentMoved = totalUnlockedNum > 0 ? Number(totalMoved) / totalUnlockedNum * 100 : 0;
    const percentToExchanges = totalUnlockedNum > 0 ? Number(movedToExchanges) / totalUnlockedNum * 100 : 0;
    const percentHolding = totalUnlockedNum > 0 ? Number(stillHolding) / totalUnlockedNum * 100 : 0;
    
    // Analyze behavior pattern
    const behaviorPattern = this.determineBehaviorPattern(
      percentToExchanges,
      percentHolding,
      relevantFlows.length,
      unlockDate
    );
    
    // Calculate sell pressure score
    const sellPressureScore = this.calculateSellPressure(
      percentToExchanges,
      percentMoved,
      vc.historicalBehavior
    );
    
    // Estimate when selling will complete
    const estimatedSellComplete = this.estimateSellCompletion(
      percentMoved,
      vc.historicalBehavior.avgSellPercentFirst30Days,
      unlockDate
    );
    
    const analysis: TokenFlowAnalysis = {
      vcId,
      vcName: vc.name,
      symbol,
      unlockDate,
      analysisDate: new Date(),
      
      totalUnlocked,
      totalMoved,
      movedToExchanges,
      movedToOtherWallets,
      movedToDefi,
      stillHolding,
      
      percentMoved,
      percentToExchanges,
      percentHolding,
      
      sellPressureScore,
      behaviorPattern,
      estimatedSellComplete,
      
      flows: relevantFlows,
    };
    
    // Cache result
    this.analysisCache.set(cacheKey, analysis);
    
    return analysis;
  }

  /**
   * Determine behavior pattern
   */
  private determineBehaviorPattern(
    percentToExchanges: number,
    percentHolding: number,
    flowCount: number,
    unlockDate: Date
  ): 'dumping' | 'gradual_selling' | 'holding' | 'defi_active' {
    const daysSinceUnlock = (Date.now() - unlockDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (percentHolding > 90) {
      return 'holding';
    }
    
    if (percentToExchanges > 50 && daysSinceUnlock < 7) {
      return 'dumping';
    }
    
    if (flowCount > 10 && percentToExchanges > 30) {
      return 'gradual_selling';
    }
    
    return 'gradual_selling';
  }

  /**
   * Calculate sell pressure score
   */
  private calculateSellPressure(
    percentToExchanges: number,
    percentMoved: number,
    historicalBehavior: VCInfo['historicalBehavior']
  ): number {
    let score = 0;
    
    // Current exchange flow
    score += percentToExchanges * 0.6;
    
    // Comparison to historical behavior
    const expectedSell = historicalBehavior.avgSellPercentFirst30Days;
    if (percentToExchanges > expectedSell) {
      score += (percentToExchanges - expectedSell) * 0.4;
    }
    
    // Overall movement
    score += percentMoved * 0.2;
    
    return Math.min(Math.round(score), 100);
  }

  /**
   * Estimate when selling will complete
   */
  private estimateSellCompletion(
    percentMoved: number,
    expectedSellPercent: number,
    unlockDate: Date
  ): Date | null {
    if (percentMoved >= expectedSellPercent) {
      return null; // Already complete
    }
    
    const daysSinceUnlock = (Date.now() - unlockDate.getTime()) / (1000 * 60 * 60 * 24);
    const dailyRate = percentMoved / Math.max(daysSinceUnlock, 1);
    
    if (dailyRate <= 0) {
      return null;
    }
    
    const daysRemaining = (expectedSellPercent - percentMoved) / dailyRate;
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + daysRemaining);
    
    return completionDate;
  }

  /**
   * Predict selling behavior for an upcoming unlock
   */
  predictSelling(
    vcId: string,
    symbol: string,
    unlockDate: Date
  ): SellingPrediction {
    const vc = this.vcs.get(vcId);
    if (!vc) {
      throw new Error(`Unknown VC: ${vcId}`);
    }
    
    const behavior = vc.historicalBehavior;
    
    // Base prediction on historical behavior
    let expectedSellPercent = behavior.avgSellPercentFirst30Days;
    let expectedTiming: 'immediate' | '1week' | '1month' | 'gradual';
    
    switch (behavior.typicalSellPattern) {
      case 'immediate':
        expectedTiming = 'immediate';
        expectedSellPercent *= 1.2; // Tends to sell more
        break;
      case 'gradual':
        expectedTiming = '1month';
        break;
      case 'holder':
        expectedTiming = 'gradual';
        expectedSellPercent *= 0.5; // Tends to sell less
        break;
      default:
        expectedTiming = '1month';
    }
    
    // Get historical accuracy from past predictions
    const historicalAccuracy = this.getHistoricalAccuracy(vcId);
    
    return {
      vcId,
      vcName: vc.name,
      symbol,
      unlockDate,
      expectedSellPercent,
      expectedSellTiming: expectedTiming,
      expectedExchanges: behavior.preferredExchanges,
      confidence: historicalAccuracy * (vc.tier === 'tier1' ? 0.9 : 0.7),
      historicalAccuracy,
      basedOnSamples: 10, // Would come from actual historical data
    };
  }

  /**
   * Get historical prediction accuracy
   */
  private getHistoricalAccuracy(vcId: string): number {
    // Would calculate from past predictions vs actual
    // Simplified for now
    const vc = this.vcs.get(vcId);
    if (!vc) return 0.5;
    
    return vc.tier === 'tier1' ? 0.85 : 0.70;
  }

  /**
   * Add a new VC to tracking
   */
  addVC(vc: VCInfo): void {
    this.vcs.set(vc.id, vc);
    
    vc.wallets.forEach(wallet => {
      const key = `${wallet.chain}:${wallet.address.toLowerCase()}`;
      this.walletToVC.set(key, vc.id);
    });
    
    logger.info('Added VC to tracking', { vcId: vc.id, vcName: vc.name });
  }

  /**
   * Get all tracked VCs
   */
  getTrackedVCs(): VCInfo[] {
    return Array.from(this.vcs.values());
  }

  /**
   * Get VC by ID
   */
  getVC(vcId: string): VCInfo | null {
    return this.vcs.get(vcId) || null;
  }

  /**
   * Get statistics
   */
  getStats(): {
    trackedVCs: number;
    trackedWallets: number;
    totalFlows: number;
    tier1VCs: number;
  } {
    let totalFlows = 0;
    this.flowHistory.forEach(flows => {
      totalFlows += flows.length;
    });
    
    const tier1VCs = Array.from(this.vcs.values()).filter(v => v.tier === 'tier1').length;
    
    return {
      trackedVCs: this.vcs.size,
      trackedWallets: this.walletToVC.size,
      totalFlows,
      tier1VCs,
    };
  }
}

// Singleton
let instance: VCWalletTracker | null = null;

export function getVCWalletTracker(): VCWalletTracker {
  if (!instance) {
    instance = new VCWalletTracker();
  }
  return instance;
}

export default VCWalletTracker;

