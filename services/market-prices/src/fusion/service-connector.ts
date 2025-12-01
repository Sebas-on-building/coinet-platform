/**
 * ============================================
 * CROSS-SERVICE CONNECTOR
 * ============================================
 * 
 * Connects market-prices to other Coinet services:
 * - alchemy-whales: Real-time whale tracking
 * - cryptopanic: News sentiment
 * - defillama: TVL and liquidity
 * 
 * Divine Integration: All services fused into one.
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { 
  FusionEngine, 
  WhaleActivity, 
  SentimentData, 
  LiquidityData,
  TokenUnlockEvent,
  PriceData
} from './fusion-engine';

// =============================================================================
// TYPES
// =============================================================================

export interface ServiceEndpoint {
  url: string;
  healthPath: string;
  apiKey?: string;
  timeout: number;
}

export interface ServiceConfig {
  alchemyWhales: ServiceEndpoint;
  cryptoPanic?: ServiceEndpoint;
  defiLlama?: ServiceEndpoint;
  pollIntervalMs: number;
  retryAttempts: number;
  retryDelayMs: number;
}

export interface WhaleServiceResponse {
  success: boolean;
  data: {
    transfers: Array<{
      txHash: string;
      from: string;
      to: string;
      value: string;
      valueUsd: number;
      token: string;
      tokenSymbol: string;
      category: string;
      timestamp: string;
      isWhale: boolean;
      walletLabel?: string;
    }>;
    metrics?: {
      totalTransfers: number;
      whaleTransfers: number;
    };
  };
}

export interface SentimentServiceResponse {
  success: boolean;
  data: {
    results: Array<{
      title: string;
      url: string;
      source: { title: string };
      currencies: Array<{ code: string }>;
      votes: { positive: number; negative: number };
      published_at: string;
    }>;
  };
}

// =============================================================================
// SERVICE CONNECTOR
// =============================================================================

export class ServiceConnector extends EventEmitter {
  private config: ServiceConfig;
  private fusionEngine: FusionEngine;
  private pollInterval: NodeJS.Timeout | null = null;
  private serviceStatus: Map<string, 'healthy' | 'degraded' | 'down'> = new Map();
  private lastFetch: Map<string, number> = new Map();

  constructor(fusionEngine: FusionEngine, config?: Partial<ServiceConfig>) {
    super();
    this.fusionEngine = fusionEngine;
    
    // Default configuration - uses environment variables for Railway deployment
    this.config = {
      alchemyWhales: {
        url: process.env.ALCHEMY_WHALES_URL || 'https://alchemy-whales-production.up.railway.app',
        healthPath: '/api/health',
        timeout: 10000,
      },
      cryptoPanic: {
        url: 'https://cryptopanic.com/api/v1',
        healthPath: '/posts/',
        apiKey: process.env.CRYPTOPANIC_API_KEY,
        timeout: 5000,
      },
      defiLlama: {
        url: 'https://api.llama.fi',
        healthPath: '/protocols',
        timeout: 5000,
      },
      pollIntervalMs: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelayMs: 1000,
      ...config,
    };

    logger.info('ServiceConnector initialized', {
      component: 'ServiceConnector',
      alchemyWhalesUrl: this.config.alchemyWhales.url,
    });
  }

  // ===========================================================================
  // SERVICE HEALTH
  // ===========================================================================

  /**
   * Check health of all connected services
   */
  async checkHealth(): Promise<Record<string, 'healthy' | 'degraded' | 'down'>> {
    const results: Record<string, 'healthy' | 'degraded' | 'down'> = {};

    // Check alchemy-whales
    try {
      const response = await this.fetchWithTimeout(
        `${this.config.alchemyWhales.url}${this.config.alchemyWhales.healthPath}`,
        this.config.alchemyWhales.timeout
      );
      results.alchemyWhales = response.ok ? 'healthy' : 'degraded';
    } catch {
      results.alchemyWhales = 'down';
    }

    // Check DeFiLlama (always available)
    if (this.config.defiLlama) {
      try {
        const response = await this.fetchWithTimeout(
          `${this.config.defiLlama.url}${this.config.defiLlama.healthPath}`,
          this.config.defiLlama.timeout
        );
        results.defiLlama = response.ok ? 'healthy' : 'degraded';
      } catch {
        results.defiLlama = 'down';
      }
    }

    // Check CryptoPanic (if API key available)
    if (this.config.cryptoPanic?.apiKey) {
      try {
        const response = await this.fetchWithTimeout(
          `${this.config.cryptoPanic.url}/posts/?auth_token=${this.config.cryptoPanic.apiKey}&public=true`,
          this.config.cryptoPanic.timeout
        );
        results.cryptoPanic = response.ok ? 'healthy' : 'degraded';
      } catch {
        results.cryptoPanic = 'down';
      }
    }

    // Update internal status
    Object.entries(results).forEach(([service, status]) => {
      this.serviceStatus.set(service, status);
    });

    return results;
  }

  // ===========================================================================
  // WHALE DATA FETCHING
  // ===========================================================================

  /**
   * Fetch whale transfers for a symbol from alchemy-whales service
   */
  async fetchWhaleData(symbol: string): Promise<WhaleActivity[]> {
    const url = `${this.config.alchemyWhales.url}/api/transfers?symbol=${symbol}&limit=50`;
    
    try {
      const response = await this.fetchWithRetry(url, this.config.alchemyWhales.timeout);
      
      if (!response.ok) {
        // Log as debug since whale endpoints may not exist yet
        logger.debug('Whale service returned error (endpoint may not exist)', { status: response.status, symbol });
        return [];
      }

      const data = await response.json() as WhaleServiceResponse;
      
      if (!data.success || !data.data?.transfers) {
        return [];
      }

      // Transform to WhaleActivity format
      const whaleActivities: WhaleActivity[] = data.data.transfers.map(t => ({
        txHash: t.txHash,
        from: t.from,
        to: t.to,
        value: parseFloat(t.value),
        valueUsd: t.valueUsd,
        token: t.token,
        tokenSymbol: t.tokenSymbol || symbol,
        type: this.mapTransferType(t.category),
        timestamp: new Date(t.timestamp),
        isKnownWallet: t.isWhale,
        walletLabel: t.walletLabel,
      }));

      // Ingest into fusion engine
      whaleActivities.forEach(activity => {
        this.fusionEngine.ingestWhaleActivity(activity);
      });

      this.lastFetch.set(`whale:${symbol}`, Date.now());
      this.emit('whale:fetched', { symbol, count: whaleActivities.length });

      return whaleActivities;
    } catch (error: any) {
      logger.error('Failed to fetch whale data', { symbol, error: error.message });
      return [];
    }
  }

  /**
   * Fetch recent whale transfers (all symbols)
   */
  async fetchRecentWhales(limit: number = 100): Promise<WhaleActivity[]> {
    const url = `${this.config.alchemyWhales.url}/api/whales/recent?limit=${limit}`;
    
    try {
      const response = await this.fetchWithRetry(url, this.config.alchemyWhales.timeout);
      
      if (!response.ok) {
        return [];
      }

      const data = await response.json() as { success: boolean; data?: any[] };
      
      if (!data.success || !data.data) {
        return [];
      }

      const whaleActivities: WhaleActivity[] = data.data.map((t: any) => ({
        txHash: t.txHash || t.tx_hash,
        from: t.from || t.from_address,
        to: t.to || t.to_address,
        value: parseFloat(t.value || '0'),
        valueUsd: t.valueUsd || t.value_usd || 0,
        token: t.token || t.token_address,
        tokenSymbol: t.tokenSymbol || t.token_symbol || 'UNKNOWN',
        type: this.mapTransferType(t.category || t.type),
        timestamp: new Date(t.timestamp || t.created_at),
        isKnownWallet: t.isWhale || t.is_whale || false,
        walletLabel: t.walletLabel || t.wallet_label,
      }));

      // Ingest into fusion engine
      whaleActivities.forEach(activity => {
        this.fusionEngine.ingestWhaleActivity(activity);
      });

      return whaleActivities;
    } catch (error: any) {
      logger.error('Failed to fetch recent whales', { error: error.message });
      return [];
    }
  }

  /**
   * Get whale profile from alchemy-whales
   */
  async getWhaleProfile(address: string): Promise<any | null> {
    const url = `${this.config.alchemyWhales.url}/api/whales/${address}`;
    
    try {
      const response = await this.fetchWithRetry(url, this.config.alchemyWhales.timeout);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json() as { success: boolean; data?: any };
      return data.success ? data.data || null : null;
    } catch {
      return null;
    }
  }

  // ===========================================================================
  // SENTIMENT DATA FETCHING
  // ===========================================================================

  /**
   * Fetch sentiment data from CryptoPanic
   */
  async fetchSentiment(symbol: string): Promise<SentimentData | null> {
    if (!this.config.cryptoPanic?.apiKey) {
      return this.generateMockSentiment(symbol);
    }

    const url = `${this.config.cryptoPanic!.url}/posts/?auth_token=${this.config.cryptoPanic!.apiKey}&currencies=${symbol}&public=true`;
    
    try {
      const response = await this.fetchWithRetry(url, this.config.cryptoPanic!.timeout);
      
      if (!response.ok) {
        return this.generateMockSentiment(symbol);
      }

      const data = await response.json() as SentimentServiceResponse;
      
      if (!data.success || !data.data?.results) {
        return this.generateMockSentiment(symbol);
      }

      // Calculate sentiment from news votes
      const results = data.data.results.slice(0, 20);
      let totalPositive = 0;
      let totalNegative = 0;
      
      results.forEach(r => {
        totalPositive += r.votes.positive;
        totalNegative += r.votes.negative;
      });

      const total = totalPositive + totalNegative;
      const score = total > 0 ? ((totalPositive - totalNegative) / total) * 100 : 0;

      const sentimentData: SentimentData = {
        symbol,
        sentiment: score > 20 ? 'bullish' : score < -20 ? 'bearish' : 'neutral',
        score,
        newsCount: results.length,
        topHeadlines: results.slice(0, 5).map(r => r.title),
        socialMentions: results.length * 10, // Estimate
        timestamp: new Date(),
      };

      // Ingest into fusion engine
      this.fusionEngine.ingestSentiment(sentimentData);
      this.lastFetch.set(`sentiment:${symbol}`, Date.now());

      return sentimentData;
    } catch (error: any) {
      logger.warn('Failed to fetch sentiment', { symbol, error: error.message });
      return this.generateMockSentiment(symbol);
    }
  }

  private generateMockSentiment(symbol: string): SentimentData {
    // Generate realistic mock sentiment based on symbol
    const mockScores: Record<string, number> = {
      BTC: 35,
      ETH: 28,
      SOL: 45,
      DOGE: -5,
      XRP: 15,
    };
    
    const score = mockScores[symbol] || Math.random() * 40 - 10;

    return {
      symbol,
      sentiment: score > 20 ? 'bullish' : score < -20 ? 'bearish' : 'neutral',
      score,
      newsCount: Math.floor(Math.random() * 50) + 10,
      topHeadlines: [
        `${symbol} shows strong momentum amid market recovery`,
        `Institutional interest in ${symbol} continues to grow`,
        `Analysts predict ${score > 0 ? 'bullish' : 'bearish'} outlook for ${symbol}`,
      ],
      socialMentions: Math.floor(Math.random() * 5000) + 1000,
      timestamp: new Date(),
    };
  }

  // ===========================================================================
  // LIQUIDITY DATA FETCHING
  // ===========================================================================

  /**
   * Fetch liquidity data from DeFiLlama
   */
  async fetchLiquidity(symbol: string): Promise<LiquidityData | null> {
    if (!this.config.defiLlama) {
      return null;
    }

    // DeFiLlama uses protocol names, not symbols - map common ones
    const protocolMap: Record<string, string> = {
      ETH: 'ethereum',
      BTC: 'bitcoin',
      SOL: 'solana',
      AVAX: 'avalanche',
      MATIC: 'polygon',
    };

    const protocol = protocolMap[symbol.toUpperCase()];
    if (!protocol) {
      return this.generateMockLiquidity(symbol);
    }

    try {
      const response = await this.fetchWithRetry(
        `${this.config.defiLlama.url}/tvl/${protocol}`,
        this.config.defiLlama.timeout
      );
      
      if (!response.ok) {
        return this.generateMockLiquidity(symbol);
      }

      const tvl = await response.json() as number | null | undefined;
      const tvlValue = typeof tvl === 'number' ? tvl : 0;

      const liquidityData: LiquidityData = {
        symbol,
        totalLiquidity: tvlValue,
        dexLiquidity: tvlValue * 0.4,
        cexLiquidity: tvlValue * 0.6,
        bidDepth: tvlValue * 0.05,
        askDepth: tvlValue * 0.05,
        slippage1Pct: 0.1 + Math.random() * 0.5,
        timestamp: new Date(),
      };

      // Ingest into fusion engine
      this.fusionEngine.ingestLiquidity(liquidityData);
      this.lastFetch.set(`liquidity:${symbol}`, Date.now());

      return liquidityData;
    } catch (error: any) {
      logger.warn('Failed to fetch liquidity', { symbol, error: error.message });
      return this.generateMockLiquidity(symbol);
    }
  }

  private generateMockLiquidity(symbol: string): LiquidityData {
    const baseLiquidity: Record<string, number> = {
      BTC: 50000000000,
      ETH: 30000000000,
      SOL: 5000000000,
      DOGE: 1000000000,
    };

    const total = baseLiquidity[symbol] || 100000000;

    return {
      symbol,
      totalLiquidity: total,
      dexLiquidity: total * 0.4,
      cexLiquidity: total * 0.6,
      bidDepth: total * 0.05,
      askDepth: total * 0.05,
      slippage1Pct: 0.1 + Math.random() * 0.3,
      timestamp: new Date(),
    };
  }

  // ===========================================================================
  // UNLOCK DATA FETCHING
  // ===========================================================================

  /**
   * Fetch token unlock events
   */
  async fetchUnlocks(symbol: string): Promise<TokenUnlockEvent[]> {
    // In a real implementation, this would fetch from Messari or The Tie
    // For now, generate realistic mock data based on known token unlocks
    const mockUnlocks: Record<string, TokenUnlockEvent[]> = {
      SOL: [
        {
          token: 'SOL',
          symbol: 'SOL',
          unlockDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
          amount: 5000000,
          valueUsd: 700000000,
          percentOfSupply: 0.89,
          type: 'linear',
          impactPrediction: 'medium',
        },
      ],
      ARB: [
        {
          token: 'ARB',
          symbol: 'ARB',
          unlockDate: new Date(Date.now() + 14 * 24 * 3600 * 1000),
          amount: 100000000,
          valueUsd: 100000000,
          percentOfSupply: 2.5,
          type: 'cliff',
          impactPrediction: 'high',
        },
      ],
    };

    const unlocks = mockUnlocks[symbol] || [];

    // Ingest into fusion engine
    unlocks.forEach(unlock => {
      this.fusionEngine.ingestUnlockEvent(unlock);
    });

    return unlocks;
  }

  // ===========================================================================
  // UNIFIED FETCH
  // ===========================================================================

  /**
   * Fetch all data for a symbol from all connected services
   */
  async fetchAllForSymbol(symbol: string): Promise<{
    whales: WhaleActivity[];
    sentiment: SentimentData | null;
    liquidity: LiquidityData | null;
    unlocks: TokenUnlockEvent[];
  }> {
    const [whales, sentiment, liquidity, unlocks] = await Promise.all([
      this.fetchWhaleData(symbol),
      this.fetchSentiment(symbol),
      this.fetchLiquidity(symbol),
      this.fetchUnlocks(symbol),
    ]);

    logger.info('Fetched all data for symbol', {
      component: 'ServiceConnector',
      symbol,
      whaleCount: whales.length,
      hasSentiment: !!sentiment,
      hasLiquidity: !!liquidity,
      unlockCount: unlocks.length,
    });

    return { whales, sentiment, liquidity, unlocks };
  }

  // ===========================================================================
  // POLLING
  // ===========================================================================

  /**
   * Start polling all services for updates
   */
  startPolling(symbols: string[]): void {
    if (this.pollInterval) {
      this.stopPolling();
    }

    logger.info('Starting service polling', {
      component: 'ServiceConnector',
      symbols,
      intervalMs: this.config.pollIntervalMs,
    });

    // Initial fetch
    this.pollAllSymbols(symbols);

    // Set up interval
    this.pollInterval = setInterval(() => {
      this.pollAllSymbols(symbols);
    }, this.config.pollIntervalMs);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      logger.info('Stopped service polling', { component: 'ServiceConnector' });
    }
  }

  private async pollAllSymbols(symbols: string[]): Promise<void> {
    try {
      // Fetch recent whales (all symbols at once)
      await this.fetchRecentWhales(100);

      // Fetch per-symbol data
      for (const symbol of symbols) {
        await this.fetchAllForSymbol(symbol);
      }

      this.emit('poll:complete', { symbols, timestamp: Date.now() });
    } catch (error: any) {
      logger.error('Poll failed', { error: error.message });
      this.emit('poll:error', { error: error.message });
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private mapTransferType(category: string): WhaleActivity['type'] {
    switch (category?.toLowerCase()) {
      case 'swap':
        return 'swap';
      case 'mint':
        return 'mint';
      case 'burn':
        return 'burn';
      default:
        return 'transfer';
    }
  }

  private async fetchWithTimeout(url: string, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, { signal: controller.signal });
      return response;
    } finally {
      clearTimeout(id);
    }
  }

  private async fetchWithRetry(url: string, timeout: number): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        return await this.fetchWithTimeout(url, timeout);
      } catch (error: any) {
        lastError = error;
        if (attempt < this.config.retryAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs * (attempt + 1)));
        }
      }
    }
    
    throw lastError || new Error('Fetch failed after retries');
  }

  // ===========================================================================
  // STATUS
  // ===========================================================================

  getStatus(): {
    services: Record<string, 'healthy' | 'degraded' | 'down' | 'unknown'>;
    lastFetch: Record<string, number>;
    isPolling: boolean;
  } {
    const services: Record<string, 'healthy' | 'degraded' | 'down' | 'unknown'> = {};
    
    ['alchemyWhales', 'cryptoPanic', 'defiLlama'].forEach(service => {
      services[service] = this.serviceStatus.get(service) || 'unknown';
    });

    return {
      services,
      lastFetch: Object.fromEntries(this.lastFetch),
      isPolling: this.pollInterval !== null,
    };
  }
}

