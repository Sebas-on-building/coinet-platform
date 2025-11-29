/**
 * Dynamic VC Wallet Database
 * 
 * Features:
 * - Load VC data from JSON/CSV files
 * - REST API for CRUD operations
 * - Real-time wallet discovery
 * - Historical behavior tracking
 * - Tier classification and scoring
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../utils/logger';

// VC information structure
export interface VCInfo {
  id: string;
  name: string;
  aliases: string[];
  tier: 'tier1' | 'tier2' | 'tier3';
  description?: string;
  website?: string;
  twitter?: string;
  
  // Wallets across chains
  wallets: VCWallet[];
  
  // Historical behavior patterns
  behavior: VCBehavior;
  
  // Portfolio info
  portfolio: VCPortfolio;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  dataSource: 'manual' | 'api' | 'discovered';
  verified: boolean;
}

export interface VCWallet {
  id: string;
  chain: string;
  address: string;
  label?: string;
  type: 'main' | 'trading' | 'cold' | 'vesting' | 'multisig';
  discoveredAt: Date;
  lastActivity?: Date;
  verified: boolean;
}

export interface VCBehavior {
  avgHoldDays: number;
  avgSellPercentFirst7Days: number;
  avgSellPercentFirst30Days: number;
  avgSellPercentFirst90Days: number;
  preferredExchanges: string[];
  typicalSellPattern: 'immediate' | 'gradual' | 'holder' | 'strategic';
  liquidityPreference: 'cex' | 'dex' | 'otc' | 'mixed';
  activityScore: number;  // 0-100
  reliabilityScore: number;  // How predictable their behavior is
}

export interface VCPortfolio {
  estimatedAum: number;
  publicInvestments: number;
  knownTokens: string[];
  focusSectors: string[];
  investmentStage: ('seed' | 'series_a' | 'series_b' | 'growth')[];
}

// Database query options
export interface VCQueryOptions {
  tier?: 'tier1' | 'tier2' | 'tier3';
  chain?: string;
  minActivityScore?: number;
  hasWalletOnChain?: string;
  investsIn?: string;
  sortBy?: 'name' | 'tier' | 'activityScore' | 'aum';
  limit?: number;
  offset?: number;
}

// Database statistics
export interface VCDatabaseStats {
  totalVCs: number;
  totalWallets: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  chainCoverage: Record<string, number>;
  lastUpdated: Date;
  verifiedCount: number;
}

// Initial VC data (comprehensive list)
const INITIAL_VCS: Partial<VCInfo>[] = [
  {
    id: 'a16z',
    name: 'Andreessen Horowitz',
    aliases: ['a16z crypto', 'a16z'],
    tier: 'tier1',
    description: 'Leading venture capital firm with crypto focus',
    website: 'https://a16z.com',
    twitter: '@a16z',
    wallets: [
      { id: 'a16z-eth-1', chain: 'ethereum', address: '0x05e793ce0c6027323ac150f6d45c2344d28b6019', label: 'a16z Main', type: 'main', discoveredAt: new Date(), verified: true },
      { id: 'a16z-eth-2', chain: 'ethereum', address: '0x7686640f09123394cd8dc3032e9927767ae29c8d', label: 'a16z Treasury', type: 'cold', discoveredAt: new Date(), verified: true },
    ],
    behavior: {
      avgHoldDays: 730,
      avgSellPercentFirst7Days: 0,
      avgSellPercentFirst30Days: 5,
      avgSellPercentFirst90Days: 15,
      preferredExchanges: ['Coinbase', 'Kraken'],
      typicalSellPattern: 'holder',
      liquidityPreference: 'cex',
      activityScore: 95,
      reliabilityScore: 90,
    },
    portfolio: {
      estimatedAum: 7_000_000_000,
      publicInvestments: 100,
      knownTokens: ['SOL', 'NEAR', 'FLOW', 'MINA', 'OP'],
      focusSectors: ['L1', 'DeFi', 'Gaming', 'Infrastructure'],
      investmentStage: ['seed', 'series_a', 'series_b'],
    },
  },
  {
    id: 'paradigm',
    name: 'Paradigm',
    aliases: ['Paradigm Capital'],
    tier: 'tier1',
    description: 'Research-driven technology investment firm',
    website: 'https://paradigm.xyz',
    twitter: '@paradigm',
    wallets: [
      { id: 'paradigm-eth-1', chain: 'ethereum', address: '0x8bc9bea6d6b9c1e0b01b3f8c1c8b8f1aef4a7cad', label: 'Paradigm Main', type: 'main', discoveredAt: new Date(), verified: true },
    ],
    behavior: {
      avgHoldDays: 500,
      avgSellPercentFirst7Days: 2,
      avgSellPercentFirst30Days: 10,
      avgSellPercentFirst90Days: 25,
      preferredExchanges: ['Coinbase', 'Binance', 'FTX'],
      typicalSellPattern: 'gradual',
      liquidityPreference: 'mixed',
      activityScore: 90,
      reliabilityScore: 85,
    },
    portfolio: {
      estimatedAum: 2_500_000_000,
      publicInvestments: 50,
      knownTokens: ['UNI', 'DYDX', 'OP', 'BLUR', 'STARK'],
      focusSectors: ['DeFi', 'L2', 'MEV', 'Infrastructure'],
      investmentStage: ['seed', 'series_a'],
    },
  },
  {
    id: 'polychain',
    name: 'Polychain Capital',
    aliases: ['Polychain'],
    tier: 'tier1',
    website: 'https://polychain.capital',
    wallets: [
      { id: 'polychain-eth-1', chain: 'ethereum', address: '0x3d30b1ab88d487b0f3061f40de76845bec3f1e94', label: 'Polychain', type: 'main', discoveredAt: new Date(), verified: true },
    ],
    behavior: {
      avgHoldDays: 365,
      avgSellPercentFirst7Days: 5,
      avgSellPercentFirst30Days: 15,
      avgSellPercentFirst90Days: 30,
      preferredExchanges: ['Binance', 'Coinbase'],
      typicalSellPattern: 'gradual',
      liquidityPreference: 'cex',
      activityScore: 85,
      reliabilityScore: 80,
    },
    portfolio: {
      estimatedAum: 1_000_000_000,
      publicInvestments: 80,
      knownTokens: ['ATOM', 'FIL', 'DOT', 'NEAR', 'AVAX'],
      focusSectors: ['L1', 'Infrastructure', 'DeFi'],
      investmentStage: ['seed', 'series_a', 'series_b'],
    },
  },
  {
    id: 'multicoin',
    name: 'Multicoin Capital',
    aliases: ['Multicoin'],
    tier: 'tier1',
    website: 'https://multicoin.capital',
    wallets: [
      { id: 'multicoin-sol-1', chain: 'solana', address: 'Gc9GVzd3iNqV3VVmh7KpL5x8BnLpqYP5wNZcVnYDuKqe', label: 'Multicoin Solana', type: 'main', discoveredAt: new Date(), verified: true },
    ],
    behavior: {
      avgHoldDays: 180,
      avgSellPercentFirst7Days: 10,
      avgSellPercentFirst30Days: 25,
      avgSellPercentFirst90Days: 45,
      preferredExchanges: ['Binance', 'OKX', 'Bybit'],
      typicalSellPattern: 'immediate',
      liquidityPreference: 'cex',
      activityScore: 80,
      reliabilityScore: 75,
    },
    portfolio: {
      estimatedAum: 500_000_000,
      publicInvestments: 60,
      knownTokens: ['SOL', 'HNT', 'RENDER', 'PYTH'],
      focusSectors: ['Solana', 'DePIN', 'Infrastructure'],
      investmentStage: ['seed', 'series_a'],
    },
  },
  {
    id: 'pantera',
    name: 'Pantera Capital',
    aliases: ['Pantera'],
    tier: 'tier1',
    website: 'https://panteracapital.com',
    wallets: [],
    behavior: {
      avgHoldDays: 600,
      avgSellPercentFirst7Days: 0,
      avgSellPercentFirst30Days: 8,
      avgSellPercentFirst90Days: 20,
      preferredExchanges: ['Coinbase'],
      typicalSellPattern: 'holder',
      liquidityPreference: 'otc',
      activityScore: 70,
      reliabilityScore: 90,
    },
    portfolio: {
      estimatedAum: 4_000_000_000,
      publicInvestments: 120,
      knownTokens: ['SOL', 'MATIC', 'INJ', 'NEAR'],
      focusSectors: ['L1', 'DeFi', 'Infrastructure'],
      investmentStage: ['seed', 'series_a', 'series_b', 'growth'],
    },
  },
  {
    id: 'dragonfly',
    name: 'Dragonfly',
    aliases: ['Dragonfly Capital'],
    tier: 'tier1',
    website: 'https://dragonfly.xyz',
    wallets: [
      { id: 'dragonfly-eth-1', chain: 'ethereum', address: '0x1a9c8182c09f50c8318d769245beA52c32BE35BC', label: 'Dragonfly', type: 'main', discoveredAt: new Date(), verified: true },
    ],
    behavior: {
      avgHoldDays: 400,
      avgSellPercentFirst7Days: 3,
      avgSellPercentFirst30Days: 12,
      avgSellPercentFirst90Days: 28,
      preferredExchanges: ['Coinbase', 'Binance'],
      typicalSellPattern: 'strategic',
      liquidityPreference: 'mixed',
      activityScore: 85,
      reliabilityScore: 85,
    },
    portfolio: {
      estimatedAum: 3_000_000_000,
      publicInvestments: 70,
      knownTokens: ['NEAR', 'AVAX', 'MATIC', 'ARB'],
      focusSectors: ['L1', 'L2', 'DeFi', 'Gaming'],
      investmentStage: ['seed', 'series_a'],
    },
  },
  {
    id: 'jump',
    name: 'Jump Crypto',
    aliases: ['Jump Trading', 'Jump Capital'],
    tier: 'tier1',
    website: 'https://jumpcrypto.com',
    wallets: [
      { id: 'jump-eth-1', chain: 'ethereum', address: '0x9507c04b10486547584c37bcbd931b2a4fee9a41', label: 'Jump Main', type: 'trading', discoveredAt: new Date(), verified: true },
      { id: 'jump-sol-1', chain: 'solana', address: '6FEVkH18ySfgRB7rPC3Ye4WhXvLAgzKJBYPwPMycNLGt', label: 'Jump Solana', type: 'trading', discoveredAt: new Date(), verified: true },
    ],
    behavior: {
      avgHoldDays: 90,
      avgSellPercentFirst7Days: 15,
      avgSellPercentFirst30Days: 35,
      avgSellPercentFirst90Days: 60,
      preferredExchanges: ['Binance', 'FTX', 'OKX'],
      typicalSellPattern: 'immediate',
      liquidityPreference: 'cex',
      activityScore: 95,
      reliabilityScore: 70,
    },
    portfolio: {
      estimatedAum: 2_000_000_000,
      publicInvestments: 40,
      knownTokens: ['SOL', 'WORMHOLE', 'PYTH', 'JTO'],
      focusSectors: ['Trading', 'Infrastructure', 'Solana'],
      investmentStage: ['seed', 'series_a', 'series_b'],
    },
  },
  // Tier 2 VCs
  {
    id: 'framework',
    name: 'Framework Ventures',
    aliases: ['Framework'],
    tier: 'tier2',
    wallets: [],
    behavior: {
      avgHoldDays: 300,
      avgSellPercentFirst7Days: 5,
      avgSellPercentFirst30Days: 15,
      avgSellPercentFirst90Days: 35,
      preferredExchanges: ['Binance', 'Coinbase'],
      typicalSellPattern: 'gradual',
      liquidityPreference: 'cex',
      activityScore: 75,
      reliabilityScore: 80,
    },
    portfolio: {
      estimatedAum: 500_000_000,
      publicInvestments: 45,
      knownTokens: ['SNX', 'AAVE', 'YFI', 'MKR'],
      focusSectors: ['DeFi'],
      investmentStage: ['seed', 'series_a'],
    },
  },
  {
    id: 'delphi',
    name: 'Delphi Digital',
    aliases: ['Delphi Ventures', 'Delphi Labs'],
    tier: 'tier2',
    wallets: [],
    behavior: {
      avgHoldDays: 250,
      avgSellPercentFirst7Days: 8,
      avgSellPercentFirst30Days: 20,
      avgSellPercentFirst90Days: 40,
      preferredExchanges: ['Binance', 'OKX'],
      typicalSellPattern: 'gradual',
      liquidityPreference: 'cex',
      activityScore: 80,
      reliabilityScore: 75,
    },
    portfolio: {
      estimatedAum: 200_000_000,
      publicInvestments: 35,
      knownTokens: ['AXS', 'LUNA', 'ASTRO'],
      focusSectors: ['Gaming', 'DeFi', 'L1'],
      investmentStage: ['seed'],
    },
  },
  {
    id: 'electric',
    name: 'Electric Capital',
    aliases: ['Electric'],
    tier: 'tier2',
    wallets: [],
    behavior: {
      avgHoldDays: 500,
      avgSellPercentFirst7Days: 2,
      avgSellPercentFirst30Days: 8,
      avgSellPercentFirst90Days: 20,
      preferredExchanges: ['Coinbase'],
      typicalSellPattern: 'holder',
      liquidityPreference: 'otc',
      activityScore: 65,
      reliabilityScore: 85,
    },
    portfolio: {
      estimatedAum: 1_000_000_000,
      publicInvestments: 55,
      knownTokens: ['AVAX', 'DYDX', 'NEAR'],
      focusSectors: ['Infrastructure', 'L1', 'Developer Tools'],
      investmentStage: ['seed', 'series_a'],
    },
  },
];

export class DynamicVCDatabase extends EventEmitter {
  private vcs: Map<string, VCInfo> = new Map();
  private walletIndex: Map<string, string> = new Map(); // wallet -> VC ID
  private dataDir: string;
  private lastSaveTime: Date = new Date();

  constructor(dataDir?: string) {
    super();
    this.dataDir = dataDir || path.join(process.cwd(), 'data', 'vc-database');
    this.initialize();
  }

  /**
   * Initialize database with default and persisted data
   */
  private async initialize(): Promise<void> {
    // Load initial VCs
    this.loadInitialVCs();

    // Try to load from persistent storage
    await this.loadFromDisk();

    logger.info('VC Database initialized', {
      totalVCs: this.vcs.size,
      totalWallets: this.walletIndex.size,
    });
  }

  /**
   * Load initial VCs into memory
   */
  private loadInitialVCs(): void {
    INITIAL_VCS.forEach(vcData => {
      const vc = this.createVCFromPartial(vcData);
      this.vcs.set(vc.id, vc);
      
      // Index wallets
      vc.wallets.forEach(wallet => {
        const key = `${wallet.chain}:${wallet.address.toLowerCase()}`;
        this.walletIndex.set(key, vc.id);
      });
    });
  }

  /**
   * Create full VCInfo from partial data
   */
  private createVCFromPartial(data: Partial<VCInfo>): VCInfo {
    return {
      id: data.id || this.generateId(data.name || 'unknown'),
      name: data.name || 'Unknown VC',
      aliases: data.aliases || [],
      tier: data.tier || 'tier3',
      description: data.description,
      website: data.website,
      twitter: data.twitter,
      wallets: (data.wallets || []).map(w => ({
        ...w,
        discoveredAt: w.discoveredAt || new Date(),
        verified: w.verified ?? false,
      })),
      behavior: data.behavior || {
        avgHoldDays: 180,
        avgSellPercentFirst7Days: 10,
        avgSellPercentFirst30Days: 25,
        avgSellPercentFirst90Days: 50,
        preferredExchanges: [],
        typicalSellPattern: 'gradual',
        liquidityPreference: 'mixed',
        activityScore: 50,
        reliabilityScore: 50,
      },
      portfolio: data.portfolio || {
        estimatedAum: 0,
        publicInvestments: 0,
        knownTokens: [],
        focusSectors: [],
        investmentStage: [],
      },
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
      dataSource: data.dataSource || 'manual',
      verified: data.verified ?? false,
    };
  }

  /**
   * Generate ID from name
   */
  private generateId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  /**
   * Load data from disk
   */
  async loadFromDisk(): Promise<void> {
    try {
      const vcFile = path.join(this.dataDir, 'vcs.json');
      if (fs.existsSync(vcFile)) {
        const data = JSON.parse(fs.readFileSync(vcFile, 'utf-8'));
        data.forEach((vcData: any) => {
          const vc = this.createVCFromPartial({
            ...vcData,
            createdAt: new Date(vcData.createdAt),
            updatedAt: new Date(vcData.updatedAt),
            wallets: vcData.wallets.map((w: any) => ({
              ...w,
              discoveredAt: new Date(w.discoveredAt),
              lastActivity: w.lastActivity ? new Date(w.lastActivity) : undefined,
            })),
          });
          this.vcs.set(vc.id, vc);
          vc.wallets.forEach(wallet => {
            const key = `${wallet.chain}:${wallet.address.toLowerCase()}`;
            this.walletIndex.set(key, vc.id);
          });
        });
        logger.debug('Loaded VCs from disk', { count: data.length });
      }
    } catch (error: any) {
      logger.debug('No persisted VC data found', { error: error.message });
    }
  }

  /**
   * Save data to disk
   */
  async saveToDisk(): Promise<void> {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      const vcFile = path.join(this.dataDir, 'vcs.json');
      const data = Array.from(this.vcs.values());
      fs.writeFileSync(vcFile, JSON.stringify(data, null, 2));
      
      this.lastSaveTime = new Date();
      logger.debug('Saved VCs to disk', { count: data.length });
    } catch (error: any) {
      logger.error('Failed to save VCs to disk', { error: error.message });
    }
  }

  // ==================== CRUD Operations ====================

  /**
   * Add a new VC
   */
  addVC(data: Partial<VCInfo>): VCInfo {
    const vc = this.createVCFromPartial(data);
    
    if (this.vcs.has(vc.id)) {
      throw new Error(`VC with id ${vc.id} already exists`);
    }

    this.vcs.set(vc.id, vc);
    
    // Index wallets
    vc.wallets.forEach(wallet => {
      const key = `${wallet.chain}:${wallet.address.toLowerCase()}`;
      this.walletIndex.set(key, vc.id);
    });

    this.emit('vcAdded', vc);
    this.autoSave();
    
    logger.info('VC added', { id: vc.id, name: vc.name });
    return vc;
  }

  /**
   * Update an existing VC
   */
  updateVC(id: string, updates: Partial<VCInfo>): VCInfo {
    const existing = this.vcs.get(id);
    if (!existing) {
      throw new Error(`VC with id ${id} not found`);
    }

    // Remove old wallet index entries
    existing.wallets.forEach(wallet => {
      const key = `${wallet.chain}:${wallet.address.toLowerCase()}`;
      this.walletIndex.delete(key);
    });

    const updated: VCInfo = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID change
      updatedAt: new Date(),
      wallets: updates.wallets || existing.wallets,
    };

    this.vcs.set(id, updated);

    // Re-index wallets
    updated.wallets.forEach(wallet => {
      const key = `${wallet.chain}:${wallet.address.toLowerCase()}`;
      this.walletIndex.set(key, id);
    });

    this.emit('vcUpdated', updated);
    this.autoSave();

    logger.info('VC updated', { id, name: updated.name });
    return updated;
  }

  /**
   * Delete a VC
   */
  deleteVC(id: string): boolean {
    const vc = this.vcs.get(id);
    if (!vc) return false;

    // Remove wallet index entries
    vc.wallets.forEach(wallet => {
      const key = `${wallet.chain}:${wallet.address.toLowerCase()}`;
      this.walletIndex.delete(key);
    });

    this.vcs.delete(id);
    this.emit('vcDeleted', id);
    this.autoSave();

    logger.info('VC deleted', { id });
    return true;
  }

  /**
   * Get VC by ID
   */
  getVC(id: string): VCInfo | null {
    return this.vcs.get(id) || null;
  }

  /**
   * Get VC by wallet address
   */
  getVCByWallet(chain: string, address: string): VCInfo | null {
    const key = `${chain}:${address.toLowerCase()}`;
    const vcId = this.walletIndex.get(key);
    return vcId ? this.vcs.get(vcId) || null : null;
  }

  /**
   * Query VCs with filters
   */
  queryVCs(options: VCQueryOptions = {}): VCInfo[] {
    let results = Array.from(this.vcs.values());

    // Filter by tier
    if (options.tier) {
      results = results.filter(vc => vc.tier === options.tier);
    }

    // Filter by chain
    if (options.chain) {
      results = results.filter(vc =>
        vc.wallets.some(w => w.chain === options.chain)
      );
    }

    // Filter by activity score
    if (options.minActivityScore !== undefined) {
      results = results.filter(vc =>
        vc.behavior.activityScore >= options.minActivityScore!
      );
    }

    // Filter by wallet on chain
    if (options.hasWalletOnChain) {
      results = results.filter(vc =>
        vc.wallets.some(w => w.chain === options.hasWalletOnChain)
      );
    }

    // Filter by investment
    if (options.investsIn) {
      results = results.filter(vc =>
        vc.portfolio.knownTokens.includes(options.investsIn!)
      );
    }

    // Sort
    if (options.sortBy) {
      results.sort((a, b) => {
        switch (options.sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'tier':
            return a.tier.localeCompare(b.tier);
          case 'activityScore':
            return b.behavior.activityScore - a.behavior.activityScore;
          case 'aum':
            return b.portfolio.estimatedAum - a.portfolio.estimatedAum;
          default:
            return 0;
        }
      });
    }

    // Pagination
    if (options.offset) {
      results = results.slice(options.offset);
    }
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  // ==================== Wallet Operations ====================

  /**
   * Add wallet to a VC
   */
  addWallet(vcId: string, wallet: Omit<VCWallet, 'id' | 'discoveredAt'>): VCWallet {
    const vc = this.vcs.get(vcId);
    if (!vc) {
      throw new Error(`VC with id ${vcId} not found`);
    }

    const newWallet: VCWallet = {
      ...wallet,
      id: `${vcId}-${wallet.chain}-${Date.now()}`,
      discoveredAt: new Date(),
      verified: wallet.verified ?? false,
    };

    vc.wallets.push(newWallet);
    vc.updatedAt = new Date();

    const key = `${wallet.chain}:${wallet.address.toLowerCase()}`;
    this.walletIndex.set(key, vcId);

    this.emit('walletAdded', { vcId, wallet: newWallet });
    this.autoSave();

    logger.info('Wallet added to VC', { vcId, chain: wallet.chain, address: wallet.address });
    return newWallet;
  }

  /**
   * Remove wallet from a VC
   */
  removeWallet(vcId: string, walletId: string): boolean {
    const vc = this.vcs.get(vcId);
    if (!vc) return false;

    const walletIndex = vc.wallets.findIndex(w => w.id === walletId);
    if (walletIndex === -1) return false;

    const wallet = vc.wallets[walletIndex];
    const key = `${wallet.chain}:${wallet.address.toLowerCase()}`;
    this.walletIndex.delete(key);

    vc.wallets.splice(walletIndex, 1);
    vc.updatedAt = new Date();

    this.emit('walletRemoved', { vcId, walletId });
    this.autoSave();

    return true;
  }

  // ==================== Behavior Updates ====================

  /**
   * Update VC behavior based on observed activity
   */
  updateBehavior(vcId: string, observedBehavior: Partial<VCBehavior>): void {
    const vc = this.vcs.get(vcId);
    if (!vc) return;

    // Exponential moving average for behavior updates
    const alpha = 0.1;

    if (observedBehavior.avgHoldDays !== undefined) {
      vc.behavior.avgHoldDays = alpha * observedBehavior.avgHoldDays +
        (1 - alpha) * vc.behavior.avgHoldDays;
    }

    if (observedBehavior.avgSellPercentFirst7Days !== undefined) {
      vc.behavior.avgSellPercentFirst7Days = alpha * observedBehavior.avgSellPercentFirst7Days +
        (1 - alpha) * vc.behavior.avgSellPercentFirst7Days;
    }

    if (observedBehavior.avgSellPercentFirst30Days !== undefined) {
      vc.behavior.avgSellPercentFirst30Days = alpha * observedBehavior.avgSellPercentFirst30Days +
        (1 - alpha) * vc.behavior.avgSellPercentFirst30Days;
    }

    vc.updatedAt = new Date();
    this.autoSave();

    this.emit('behaviorUpdated', { vcId, behavior: vc.behavior });
  }

  // ==================== Statistics ====================

  /**
   * Get database statistics
   */
  getStats(): VCDatabaseStats {
    const chainCoverage: Record<string, number> = {};
    let verifiedCount = 0;

    this.vcs.forEach(vc => {
      if (vc.verified) verifiedCount++;
      vc.wallets.forEach(wallet => {
        chainCoverage[wallet.chain] = (chainCoverage[wallet.chain] || 0) + 1;
      });
    });

    return {
      totalVCs: this.vcs.size,
      totalWallets: this.walletIndex.size,
      tier1Count: this.queryVCs({ tier: 'tier1' }).length,
      tier2Count: this.queryVCs({ tier: 'tier2' }).length,
      tier3Count: this.queryVCs({ tier: 'tier3' }).length,
      chainCoverage,
      lastUpdated: this.lastSaveTime,
      verifiedCount,
    };
  }

  /**
   * Auto-save with debouncing
   */
  private autoSaveTimeout: NodeJS.Timeout | null = null;
  private autoSave(): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    this.autoSaveTimeout = setTimeout(() => {
      this.saveToDisk();
    }, 5000);
  }

  /**
   * Export to JSON
   */
  exportToJSON(): string {
    return JSON.stringify(Array.from(this.vcs.values()), null, 2);
  }

  /**
   * Import from JSON
   */
  importFromJSON(json: string): number {
    const data = JSON.parse(json) as Partial<VCInfo>[];
    let imported = 0;

    data.forEach(vcData => {
      try {
        if (this.vcs.has(vcData.id || '')) {
          this.updateVC(vcData.id!, vcData);
        } else {
          this.addVC(vcData);
        }
        imported++;
      } catch (error: any) {
        logger.warn('Failed to import VC', { id: vcData.id, error: error.message });
      }
    });

    return imported;
  }

  /**
   * Export to CSV
   */
  exportToCSV(): string {
    const headers = ['id', 'name', 'tier', 'wallets_count', 'activity_score', 'aum'];
    const rows = Array.from(this.vcs.values()).map(vc => [
      vc.id,
      vc.name,
      vc.tier,
      vc.wallets.length.toString(),
      vc.behavior.activityScore.toString(),
      vc.portfolio.estimatedAum.toString(),
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

// Singleton
let instance: DynamicVCDatabase | null = null;

export function getDynamicVCDatabase(): DynamicVCDatabase {
  if (!instance) {
    instance = new DynamicVCDatabase();
  }
  return instance;
}

export function resetDynamicVCDatabase(): void {
  instance = null;
}

export default DynamicVCDatabase;

