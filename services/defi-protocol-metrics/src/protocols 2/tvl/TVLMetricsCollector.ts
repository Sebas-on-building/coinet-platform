/**
 * =========================================
 * TVL METRICS COLLECTOR
 * =========================================
 * Total Value Locked metrics collection across DeFi protocols
 */

import { Logger } from '../../utils/Logger';
import type { ProtocolInfo, TVLMetrics, DataProvider } from '../../types';

export class TVLMetricsCollector {
  private logger: Logger;
  private protocols: ProtocolInfo[];
  private dataProviders: DataProvider[];
  private isInitialized: boolean = false;
  private cache: Map<string, TVLMetrics> = new Map();
  private rateLimiter: Map<string, { count: number; resetTime: Date }> = new Map();

  constructor(protocols: ProtocolInfo[], dataProviders: DataProvider[] = []) {
    this.logger = new Logger('TVLMetricsCollector');
    this.protocols = protocols;
    this.dataProviders = dataProviders;
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing TVL Metrics Collector...');

      // Initialize rate limiting for each provider
      for (const provider of this.dataProviders) {
        this.rateLimiter.set(provider.id, {
          count: 0,
          resetTime: new Date(Date.now() + 60000) // 1 minute from now
        });
      }

      // Test data providers
      for (const provider of this.dataProviders) {
        try {
          await this.testProviderConnection(provider);
          this.logger.info(`✅ Provider ${provider.name} connection test successful`);
        } catch (error: any) {
          this.logger.error(`❌ Provider ${provider.name} connection test failed`, error);
        }
      }

      this.isInitialized = true;
      this.logger.info('✅ TVL Metrics Collector initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize TVL Metrics Collector', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.cache.clear();
      this.rateLimiter.clear();
      this.isInitialized = false;
      this.logger.info('✅ TVL Metrics Collector stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop TVL Metrics Collector', error);
      throw error;
    }
  }

  async collectMetrics(protocolId: string): Promise<void> {
    const protocol = this.protocols.find(p => p.id === protocolId);
    if (!protocol) {
      throw new Error(`Protocol ${protocolId} not found`);
    }

    try {
      this.logger.debug(`Collecting TVL metrics for ${protocol.name}`);

      // Find appropriate data provider
      const provider = this.selectDataProvider(protocol);
      if (!provider) {
        throw new Error(`No suitable data provider found for ${protocol.name}`);
      }

      // Check rate limits
      if (!this.checkRateLimit(provider.id)) {
        this.logger.rateLimit(provider.name, 'rate_limit');
        return;
      }

      // Fetch TVL data
      const tvlData = await this.fetchTVLData(protocol, provider);

      // Process and cache metrics
      const metrics = this.processTVLMetrics(protocol, tvlData);
      this.cache.set(protocolId, metrics);

      // Emit metrics event
      this.emit('metrics', metrics);

      this.logger.debug(`TVL metrics collected for ${protocol.name}: $${metrics.totalValueLocked.toLocaleString()}`);

    } catch (error: any) {
      this.logger.error(`Failed to collect TVL metrics for ${protocolId}`, error);
      throw error;
    }
  }

  async getMetrics(protocolId: string): Promise<TVLMetrics | null> {
    return this.cache.get(protocolId) || null;
  }

  async getAllMetrics(): Promise<TVLMetrics[]> {
    return Array.from(this.cache.values());
  }

  getStatus(): string {
    return this.isInitialized ? `Active (${this.cache.size} protocols)` : 'Not Initialized';
  }

  private selectDataProvider(protocol: ProtocolInfo): DataProvider | null {
    // Select the best available provider for this protocol
    const availableProviders = this.dataProviders.filter(p =>
      p.supportedProtocols.includes(protocol.id) && p.supportedMetrics.includes('tvl')
    );

    if (availableProviders.length === 0) {
      return null;
    }

    // Sort by reliability and last used time
    availableProviders.sort((a, b) => {
      const scoreA = a.reliability - (Date.now() - a.lastUsed.getTime()) / 1000000;
      const scoreB = b.reliability - (Date.now() - b.lastUsed.getTime()) / 1000000;
      return scoreB - scoreA;
    });

    return availableProviders[0];
  }

  private checkRateLimit(providerId: string): boolean {
    const limitInfo = this.rateLimiter.get(providerId);
    if (!limitInfo) return true;

    const now = new Date();
    if (now >= limitInfo.resetTime) {
      // Reset counter
      limitInfo.count = 0;
      limitInfo.resetTime = new Date(now.getTime() + 60000);
      return true;
    }

    const provider = this.dataProviders.find(p => p.id === providerId);
    if (!provider) return true;

    return limitInfo.count < provider.rateLimit.requestsPerMinute;
  }

  private async fetchTVLData(protocol: ProtocolInfo, provider: DataProvider): Promise<any> {
    try {
      // Update rate limit counter
      const limitInfo = this.rateLimiter.get(provider.id);
      if (limitInfo) {
        limitInfo.count++;
        provider.lastUsed = new Date();
      }

      // Fetch from DeFi Llama API (primary source)
      if (provider.id === 'defillama') {
        return await this.fetchFromDefiLlama(protocol);
      }

      // Fetch from protocol-specific API
      if (provider.id === 'protocol-api') {
        return await this.fetchFromProtocolAPI(protocol, provider);
      }

      // Fallback to on-chain data
      return await this.fetchFromOnChain(protocol);

    } catch (error: any) {
      this.logger.error(`Failed to fetch TVL data from ${provider.name}`, error);
      throw error;
    }
  }

  private async fetchFromDefiLlama(protocol: ProtocolInfo): Promise<any> {
    const response = await fetch(`https://api.llama.fi/protocol/${protocol.id}`);
    if (!response.ok) {
      throw new Error(`DeFi Llama API error: ${response.status}`);
    }
    return await response.json();
  }

  private async fetchFromProtocolAPI(protocol: ProtocolInfo, provider: DataProvider): Promise<any> {
    // Implementation depends on protocol's API
    // This is a placeholder for protocol-specific API calls
    throw new Error(`Protocol API not implemented for ${protocol.name}`);
  }

  private async fetchFromOnChain(protocol: ProtocolInfo): Promise<any> {
    // On-chain TVL calculation
    // This would involve reading contract balances and calculating TVL
    // Implementation depends on the specific protocol's contracts
    throw new Error(`On-chain TVL calculation not implemented for ${protocol.name}`);
  }

  private processTVLMetrics(protocol: ProtocolInfo, rawData: any): TVLMetrics {
    const currentTime = new Date();

    // Calculate TVL from raw data
    let totalValueLocked = 0;
    const tokenDistribution: Record<string, number> = {};

    if (rawData.tvl && Array.isArray(rawData.tvl)) {
      // Use latest TVL data point
      const latestTVL = rawData.tvl[rawData.tvl.length - 1];
      totalValueLocked = latestTVL.totalLiquidityUSD || 0;

      // Calculate token distribution
      if (latestTVL.tokens) {
        const totalTokens = Object.values(latestTVL.tokens).reduce((sum: number, value: any) => sum + value, 0);
        for (const [token, value] of Object.entries(latestTVL.tokens)) {
          tokenDistribution[token] = (value as number / totalTokens) * 100;
        }
      }
    }

    // Calculate changes (simplified - would need historical data)
    const tvlChange24h = 0; // Would be calculated from historical data
    const tvlChange7d = 0;  // Would be calculated from historical data

    // Determine dominant token
    const dominantToken = Object.entries(tokenDistribution)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown';

    // Calculate global ranking (simplified)
    const tvlRank = 0; // Would be fetched from ranking service

    return {
      protocol,
      totalValueLocked,
      totalValueLockedChange24h: tvlChange24h,
      totalValueLockedChange7d: tvlChange7d,
      tvlRank,
      dominantToken,
      tokenDistribution,
      timestamp: currentTime,
      source: rawData.source || 'defillama'
    };
  }

  private async testProviderConnection(provider: DataProvider): Promise<void> {
    // Test basic connectivity
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${provider.baseUrl}/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Provider ${provider.name} health check failed: ${response.status}`);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Event emitter for metrics
  private emit(event: string, data: any): void {
    // This will be connected to the main service's event system
  }

  on(event: string, listener: (...args: any[]) => void): void {
    // Event listener setup - will be connected to main service
  }
}
