/**
 * Transfer Processor - Normalizes and enriches transfer data
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AlchemyTransfer,
  NormalizedTransfer,
  Chain,
  TransferCategory,
  TransferDirection,
  WhaleTier,
  EntityLabel,
  ServiceConfig,
} from '../types';
import { createLogger } from '../utils/logger';
import { normalizeAddress } from '../utils/validation';
import { CacheManager } from '../cache/CacheManager';
import { DatabaseManager } from '../database/DatabaseManager';

export class TransferProcessor {
  private logger: any;
  private cache: CacheManager;
  private db: DatabaseManager;
  private whaleThresholds: ServiceConfig['whaleThresholds'];
  private priceCache: Map<string, { price: number; timestamp: number }>;

  constructor(
    cache: CacheManager,
    db: DatabaseManager,
    whaleThresholds: ServiceConfig['whaleThresholds']
  ) {
    this.logger = createLogger({ component: 'TransferProcessor' });
    this.cache = cache;
    this.db = db;
    this.whaleThresholds = whaleThresholds;
    this.priceCache = new Map();
  }

  /**
   * Normalize and enrich a single transfer
   */
  async normalizeTransfer(
    transfer: AlchemyTransfer,
    chain: Chain
  ): Promise<NormalizedTransfer> {
    // Calculate USD value
    const valueUsd = await this.calculateValueUsd(transfer, chain);

    // Determine whale tier
    const whaleTier = this.determineWhaleTier(valueUsd);

    // Determine direction (simplified)
    const direction = TransferDirection.OUTGOING; // Could be enhanced with context

    // Get entity labels
    const fromEntity = await this.getEntityLabel(transfer.from, chain);
    const toEntity = transfer.to ? await this.getEntityLabel(transfer.to, chain) : null;

    // Build normalized transfer
    const normalized: NormalizedTransfer = {
      id: uuidv4(),
      chain,
      blockNumber: parseInt(transfer.blockNum, 16),
      blockTimestamp: new Date(transfer.metadata.blockTimestamp),
      transactionHash: transfer.hash,
      from: normalizeAddress(transfer.from),
      to: transfer.to ? normalizeAddress(transfer.to) : null,
      value: transfer.value?.toString() || '0',
      valueUsd,
      category: transfer.category,
      direction,
      asset: {
        address: transfer.rawContract.address,
        symbol: transfer.asset || null,
        decimals: transfer.rawContract.decimal ? parseInt(transfer.rawContract.decimal, 16) : null,
        name: null, // TODO: fetch from metadata
      },
      tokenId: transfer.tokenId || transfer.erc721TokenId || null,
      whaleTier,
      fromEntity,
      toEntity,
      metadata: {
        erc1155Metadata: transfer.erc1155Metadata,
        rawValue: transfer.rawContract.value,
      },
    };

    // Cache whale address if applicable
    if (whaleTier) {
      await this.cache.trackWhale(normalized.from, chain);
      if (normalized.to) {
        await this.cache.trackWhale(normalized.to, chain);
      }
    }

    return normalized;
  }

  /**
   * Batch normalize transfers
   */
  async batchNormalizeTransfers(
    transfers: AlchemyTransfer[],
    chain: Chain
  ): Promise<NormalizedTransfer[]> {
    this.logger.info('Starting batch normalization', {
      count: transfers.length,
      chain,
    });

    const normalized: NormalizedTransfer[] = [];
    const batchSize = 50;

    for (let i = 0; i < transfers.length; i += batchSize) {
      const batch = transfers.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(transfer => this.normalizeTransfer(transfer, chain))
      );
      normalized.push(...results);

      this.logger.debug('Batch normalized', {
        processed: normalized.length,
        total: transfers.length,
      });
    }

    this.logger.info('Batch normalization completed', {
      total: normalized.length,
      whales: normalized.filter(t => t.whaleTier).length,
    });

    return normalized;
  }

  /**
   * Calculate USD value of transfer
   */
  private async calculateValueUsd(
    transfer: AlchemyTransfer,
    chain: Chain
  ): Promise<number> {
    // For native token transfers
    if (!transfer.rawContract.address || transfer.category === TransferCategory.EXTERNAL) {
      const nativeSymbol = this.getNativeSymbol(chain);
      const price = await this.getTokenPrice(nativeSymbol);
      const value = transfer.value || 0;
      return value * price;
    }

    // For ERC-20 tokens
    if (transfer.category === TransferCategory.ERC20 && transfer.asset) {
      const price = await this.getTokenPrice(transfer.asset);
      const decimals = transfer.rawContract.decimal
        ? parseInt(transfer.rawContract.decimal, 16)
        : 18;
      const rawValue = transfer.rawContract.value
        ? parseInt(transfer.rawContract.value, 16)
        : 0;
      const value = rawValue / Math.pow(10, decimals);
      return value * price;
    }

    // For NFTs, would need marketplace data
    // For now, return 0
    return 0;
  }

  /**
   * Get token price in USD
   */
  private async getTokenPrice(symbol: string): Promise<number> {
    // Check in-memory cache first
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
      return cached.price;
    }

    // Check Redis cache
    const redisCached = await this.cache.getCachedPrice(symbol);
    if (redisCached !== null) {
      this.priceCache.set(symbol, { price: redisCached, timestamp: Date.now() });
      return redisCached;
    }

    // Fetch from price API (simplified - would use CoinGecko or similar)
    try {
      const price = await this.fetchPriceFromAPI(symbol);
      
      // Cache in both memory and Redis
      this.priceCache.set(symbol, { price, timestamp: Date.now() });
      await this.cache.cachePrice(symbol, price);
      
      return price;
    } catch (error) {
      this.logger.warn('Failed to fetch price', { symbol, error });
      return 0;
    }
  }

  /**
   * Fetch price from external API (placeholder)
   */
  private async fetchPriceFromAPI(symbol: string): Promise<number> {
    // TODO: Integrate with CoinGecko or market-prices service
    // For now, return dummy prices for common tokens
    const dummyPrices: Record<string, number> = {
      ETH: 2000,
      WETH: 2000,
      BTC: 40000,
      USDT: 1,
      USDC: 1,
      DAI: 1,
      MATIC: 0.8,
      ARB: 1.2,
      OP: 1.5,
    };

    return dummyPrices[symbol.toUpperCase()] || 0;
  }

  /**
   * Get native token symbol for chain
   */
  private getNativeSymbol(chain: Chain): string {
    const symbols: Record<Chain, string> = {
      [Chain.ETHEREUM]: 'ETH',
      [Chain.POLYGON]: 'MATIC',
      [Chain.ARBITRUM]: 'ETH',
      [Chain.OPTIMISM]: 'ETH',
      [Chain.BASE]: 'ETH',
    };
    return symbols[chain];
  }

  /**
   * Determine whale tier based on USD value
   */
  private determineWhaleTier(valueUsd: number): WhaleTier | null {
    if (valueUsd >= this.whaleThresholds.megaWhale) {
      return WhaleTier.MEGA_WHALE;
    }
    if (valueUsd >= this.whaleThresholds.largeWhale) {
      return WhaleTier.LARGE_WHALE;
    }
    if (valueUsd >= this.whaleThresholds.whale) {
      return WhaleTier.WHALE;
    }
    return null;
  }

  /**
   * Get entity label for address
   */
  private async getEntityLabel(address: string, chain: Chain): Promise<EntityLabel | null> {
    const normalized = normalizeAddress(address);

    // Check cache first
    const cached = await this.cache.getCachedEntityLabel(normalized, chain);
    if (cached) {
      return cached;
    }

    // Check database
    const fromDb = await this.db.getEntityLabel(normalized, chain);
    if (fromDb) {
      // Cache for future lookups
      await this.cache.cacheEntityLabel(fromDb, chain);
      return fromDb;
    }

    // TODO: Integrate with Arkham/Nansen if enabled
    
    return null;
  }

  /**
   * Process and persist transfers
   */
  async processAndPersist(
    transfers: AlchemyTransfer[],
    chain: Chain
  ): Promise<{ normalized: number; persisted: number; whales: number }> {
    // Normalize transfers
    const normalized = await this.batchNormalizeTransfers(transfers, chain);

    // Filter whale transfers
    const whales = normalized.filter(t => t.whaleTier !== null);

    // Persist to database
    const persisted = await this.db.bulkInsertTransfers(normalized);

    // Update metrics
    await this.cache.incrementMetric(`transfers:${chain}`);
    await this.cache.incrementMetric(`whales:${chain}:${whales.length}`);

    this.logger.info('Transfers processed and persisted', {
      chain,
      normalized: normalized.length,
      persisted,
      whales: whales.length,
    });

    return {
      normalized: normalized.length,
      persisted,
      whales: whales.length,
    };
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return {
      priceCacheSize: this.priceCache.size,
      priceCache: Array.from(this.priceCache.entries()).map(([symbol, data]) => ({
        symbol,
        price: data.price,
        age: Date.now() - data.timestamp,
      })),
    };
  }
}

export default TransferProcessor;

