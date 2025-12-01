/**
 * 🐋 Whale Query API Router - Phase 4 Divine Integration
 * 
 * REST API endpoints for querying whale data.
 * 
 * ENDPOINTS:
 * GET /api/whales/recent      - Recent whale transfers across chains
 * GET /api/whales/token/:symbol - Whale activity for specific token
 * GET /api/whales/address/:address - Check if address is known whale
 * GET /api/whales/summary     - Overall whale activity summary
 */

import express, { Router, Request, Response } from 'express';
import { createLogger } from '../utils/logger';
import { AlchemyClientManager } from '../clients/AlchemyClient';
import { CacheManager } from '../cache/CacheManager';
import { DatabaseManager } from '../database/DatabaseManager';
import { TransferProcessor } from '../processors/TransferProcessor';
import { Chain, NormalizedTransfer } from '../types';

const logger = createLogger({ component: 'WhaleQueryRouter' });

// In-memory cache for recent transfers (when DB is unavailable)
interface InMemoryTransfer {
  chain: string;
  hash: string;
  from: string;
  to: string;
  value: number;
  valueUSD: number;
  token: string;
  tokenSymbol: string;
  timestamp: Date;
  isWhale: boolean;
  category: string;
}

class WhaleQueryService {
  private recentTransfers: InMemoryTransfer[] = [];
  private readonly MAX_MEMORY_TRANSFERS = 1000;
  private cache: CacheManager | null = null;
  private db: DatabaseManager | null = null;
  private alchemyClients: AlchemyClientManager | null = null;

  setDependencies(
    cache: CacheManager | null,
    db: DatabaseManager | null,
    alchemyClients: AlchemyClientManager | null
  ) {
    this.cache = cache;
    this.db = db;
    this.alchemyClients = alchemyClients;
  }

  /**
   * Add a transfer to memory cache
   */
  addTransfer(transfer: InMemoryTransfer): void {
    this.recentTransfers.unshift(transfer);
    if (this.recentTransfers.length > this.MAX_MEMORY_TRANSFERS) {
      this.recentTransfers = this.recentTransfers.slice(0, this.MAX_MEMORY_TRANSFERS);
    }
  }

  /**
   * Get recent whale transfers
   */
  async getRecentTransfers(options: {
    chain?: string;
    limit?: number;
    minValueUSD?: number;
    whalesOnly?: boolean;
  } = {}): Promise<InMemoryTransfer[]> {
    const { chain, limit = 50, minValueUSD = 100000, whalesOnly = true } = options;

    let transfers = this.recentTransfers;

    // Filter by chain
    if (chain) {
      transfers = transfers.filter(t => t.chain.toLowerCase() === chain.toLowerCase());
    }

    // Filter by minimum value
    transfers = transfers.filter(t => t.valueUSD >= minValueUSD);

    // Filter whales only
    if (whalesOnly) {
      transfers = transfers.filter(t => t.isWhale);
    }

    // Apply limit
    return transfers.slice(0, limit);
  }

  /**
   * Get whale activity for a specific token
   */
  async getTokenActivity(symbol: string): Promise<{
    symbol: string;
    transfers24h: number;
    volumeUSD24h: number;
    netFlow: 'accumulating' | 'distributing' | 'neutral';
    topBuyers: string[];
    topSellers: string[];
    lastActivity: Date | null;
  }> {
    const symbolUpper = symbol.toUpperCase();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Filter transfers for this token in last 24h
    const tokenTransfers = this.recentTransfers.filter(t => 
      t.tokenSymbol.toUpperCase() === symbolUpper &&
      t.timestamp >= oneDayAgo
    );

    // Calculate metrics
    const transfers24h = tokenTransfers.length;
    const volumeUSD24h = tokenTransfers.reduce((sum, t) => sum + t.valueUSD, 0);

    // Determine net flow (simplified - would need address classification)
    const buyVolume = tokenTransfers
      .filter(t => t.category === 'accumulation')
      .reduce((sum, t) => sum + t.valueUSD, 0);
    const sellVolume = tokenTransfers
      .filter(t => t.category === 'distribution')
      .reduce((sum, t) => sum + t.valueUSD, 0);

    let netFlow: 'accumulating' | 'distributing' | 'neutral' = 'neutral';
    if (buyVolume > sellVolume * 1.2) netFlow = 'accumulating';
    else if (sellVolume > buyVolume * 1.2) netFlow = 'distributing';

    // Get unique addresses
    const buyers = [...new Set(tokenTransfers.filter(t => t.category === 'accumulation').map(t => t.to))];
    const sellers = [...new Set(tokenTransfers.filter(t => t.category === 'distribution').map(t => t.from))];

    return {
      symbol: symbolUpper,
      transfers24h,
      volumeUSD24h,
      netFlow,
      topBuyers: buyers.slice(0, 5),
      topSellers: sellers.slice(0, 5),
      lastActivity: tokenTransfers[0]?.timestamp || null,
    };
  }

  /**
   * Get overall whale activity summary
   */
  async getSummary(): Promise<{
    totalTransfers: number;
    totalVolumeUSD: number;
    activeChains: string[];
    topTokens: { symbol: string; volume: number; count: number }[];
    marketSentiment: 'bullish' | 'bearish' | 'neutral';
    lastUpdate: Date;
  }> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Recent transfers (last hour)
    const recentTransfers = this.recentTransfers.filter(t => t.timestamp >= oneHourAgo);

    // Total metrics
    const totalTransfers = recentTransfers.length;
    const totalVolumeUSD = recentTransfers.reduce((sum, t) => sum + t.valueUSD, 0);

    // Active chains
    const activeChains = [...new Set(recentTransfers.map(t => t.chain))];

    // Top tokens by volume
    const tokenVolumes = new Map<string, { volume: number; count: number }>();
    for (const t of recentTransfers) {
      const existing = tokenVolumes.get(t.tokenSymbol) || { volume: 0, count: 0 };
      tokenVolumes.set(t.tokenSymbol, {
        volume: existing.volume + t.valueUSD,
        count: existing.count + 1,
      });
    }

    const topTokens = Array.from(tokenVolumes.entries())
      .map(([symbol, data]) => ({ symbol, ...data }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    // Determine market sentiment from transfer categories
    const accumulations = recentTransfers.filter(t => t.category === 'accumulation').length;
    const distributions = recentTransfers.filter(t => t.category === 'distribution').length;

    let marketSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (accumulations > distributions * 1.3) marketSentiment = 'bullish';
    else if (distributions > accumulations * 1.3) marketSentiment = 'bearish';

    return {
      totalTransfers,
      totalVolumeUSD,
      activeChains,
      topTokens,
      marketSentiment,
      lastUpdate: now,
    };
  }

  /**
   * Check if address is a known whale
   */
  async isKnownWhale(address: string): Promise<{
    isWhale: boolean;
    confidence: number;
    totalTransfers: number;
    totalVolumeUSD: number;
    lastSeen: Date | null;
    chains: string[];
  }> {
    const addressLower = address.toLowerCase();

    // Check transfers involving this address
    const addressTransfers = this.recentTransfers.filter(t =>
      t.from.toLowerCase() === addressLower ||
      t.to.toLowerCase() === addressLower
    );

    const totalTransfers = addressTransfers.length;
    const totalVolumeUSD = addressTransfers.reduce((sum, t) => sum + t.valueUSD, 0);
    const chains = [...new Set(addressTransfers.map(t => t.chain))];
    const lastSeen = addressTransfers[0]?.timestamp || null;

    // Determine if whale based on activity
    const isWhale = totalVolumeUSD > 1000000 || totalTransfers > 10;
    const confidence = isWhale ? Math.min(0.9, 0.5 + (totalVolumeUSD / 10000000) * 0.4) : 0.3;

    return {
      isWhale,
      confidence,
      totalTransfers,
      totalVolumeUSD,
      lastSeen,
      chains,
    };
  }
}

// Singleton instance
export const whaleQueryService = new WhaleQueryService();

// Create router
export function createWhaleQueryRouter(): Router {
  const router = Router();

  /**
   * GET /api/whales/recent
   * Get recent whale transfers
   */
  router.get('/recent', async (req: Request, res: Response) => {
    try {
      const chain = req.query.chain as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const minValueUSD = parseInt(req.query.minValue as string) || 100000;
      const whalesOnly = req.query.whalesOnly !== 'false';

      const transfers = await whaleQueryService.getRecentTransfers({
        chain,
        limit: Math.min(limit, 100),
        minValueUSD,
        whalesOnly,
      });

      res.json({
        success: true,
        data: transfers,
        count: transfers.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to get recent transfers', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/whales/token/:symbol
   * Get whale activity for specific token
   */
  router.get('/token/:symbol', async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const activity = await whaleQueryService.getTokenActivity(symbol);

      res.json({
        success: true,
        data: activity,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to get token activity', { error: error.message, symbol: req.params.symbol });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/whales/address/:address
   * Check if address is known whale
   */
  router.get('/address/:address', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const whaleInfo = await whaleQueryService.isKnownWhale(address);

      res.json({
        success: true,
        data: whaleInfo,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to check whale address', { error: error.message, address: req.params.address });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/whales/summary
   * Get overall whale activity summary
   */
  router.get('/summary', async (req: Request, res: Response) => {
    try {
      const summary = await whaleQueryService.getSummary();

      res.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to get whale summary', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

export default createWhaleQueryRouter;

