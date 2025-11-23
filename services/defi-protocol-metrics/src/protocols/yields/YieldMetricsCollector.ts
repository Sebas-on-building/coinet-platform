/**
 * =========================================
 * YIELD METRICS COLLECTOR
 * =========================================
 * Yield farming and staking metrics collection across DeFi protocols
 */

import { Logger } from '../../utils/Logger';
import type { ProtocolInfo, YieldMetrics, DataProvider } from '../../types';

export class YieldMetricsCollector {
  private logger: Logger;
  private protocols: ProtocolInfo[];
  private dataProviders: DataProvider[];
  private isInitialized: boolean = false;
  private cache: Map<string, YieldMetrics[]> = new Map();
  private rateLimiter: Map<string, { count: number; resetTime: Date }> = new Map();

  constructor(protocols: ProtocolInfo[], dataProviders: DataProvider[] = []) {
    this.logger = new Logger('YieldMetricsCollector');
    this.protocols = protocols;
    this.dataProviders = dataProviders;
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Yield Metrics Collector...');

      // Initialize rate limiting
      for (const provider of this.dataProviders) {
        this.rateLimiter.set(provider.id, {
          count: 0,
          resetTime: new Date(Date.now() + 60000)
        });
      }

      this.isInitialized = true;
      this.logger.info('✅ Yield Metrics Collector initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Yield Metrics Collector', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.cache.clear();
      this.rateLimiter.clear();
      this.isInitialized = false;
      this.logger.info('✅ Yield Metrics Collector stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop Yield Metrics Collector', error);
      throw error;
    }
  }

  async collectMetrics(protocolId: string): Promise<void> {
    const protocol = this.protocols.find(p => p.id === protocolId);
    if (!protocol) {
      throw new Error(`Protocol ${protocolId} not found`);
    }

    try {
      this.logger.debug(`Collecting yield metrics for ${protocol.name}`);

      const provider = this.selectDataProvider(protocol);
      if (!provider) {
        throw new Error(`No suitable data provider found for ${protocol.name}`);
      }

      if (!this.checkRateLimit(provider.id)) {
        this.logger.rateLimit(provider.name, 'rate_limit');
        return;
      }

      const yieldData = await this.fetchYieldData(protocol, provider);
      const metrics = this.processYieldMetrics(protocol, yieldData);

      this.cache.set(protocolId, metrics);
      this.emit('metrics', metrics[0]); // Emit first pool as example

      this.logger.debug(`Yield metrics collected for ${protocol.name}: ${metrics.length} pools`);

    } catch (error: any) {
      this.logger.error(`Failed to collect yield metrics for ${protocolId}`, error);
      throw error;
    }
  }

  async getMetrics(protocolId: string): Promise<YieldMetrics[] | null> {
    return this.cache.get(protocolId) || null;
  }

  getStatus(): string {
    return this.isInitialized ? `Active (${this.cache.size} protocols)` : 'Not Initialized';
  }

  private selectDataProvider(protocol: ProtocolInfo): DataProvider | null {
    const availableProviders = this.dataProviders.filter(p =>
      p.supportedProtocols.includes(protocol.id) && p.supportedMetrics.includes('yields')
    );

    if (availableProviders.length === 0) {
      return null;
    }

    // Sort by reliability
    availableProviders.sort((a, b) => b.reliability - a.reliability);
    return availableProviders[0];
  }

  private checkRateLimit(providerId: string): boolean {
    const limitInfo = this.rateLimiter.get(providerId);
    if (!limitInfo) return true;

    const now = new Date();
    if (now >= limitInfo.resetTime) {
      limitInfo.count = 0;
      limitInfo.resetTime = new Date(now.getTime() + 60000);
      return true;
    }

    const provider = this.dataProviders.find(p => p.id === providerId);
    if (!provider) return true;

    return limitInfo.count < provider.rateLimit.requestsPerMinute;
  }

  private async fetchYieldData(protocol: ProtocolInfo, provider: DataProvider): Promise<any> {
    try {
      const limitInfo = this.rateLimiter.get(provider.id);
      if (limitInfo) {
        limitInfo.count++;
        provider.lastUsed = new Date();
      }

      // Fetch from DeFi Llama yields endpoint
      if (provider.id === 'defillama') {
        return await this.fetchFromDefiLlama(protocol);
      }

      // Fetch from protocol-specific API
      return await this.fetchFromProtocolAPI(protocol, provider);

    } catch (error: any) {
      this.logger.error(`Failed to fetch yield data from ${provider.name}`, error);
      throw error;
    }
  }

  private async fetchFromDefiLlama(protocol: ProtocolInfo): Promise<any> {
    const response = await fetch(`https://yields.llama.fi/pools`);
    if (!response.ok) {
      throw new Error(`DeFi Llama yields API error: ${response.status}`);
    }
    const data = await response.json() as any;

    // Filter pools for this protocol
    return data.data.filter((pool: any) => pool.project === protocol.id);
  }

  private async fetchFromProtocolAPI(protocol: ProtocolInfo, provider: DataProvider): Promise<any> {
    // Implementation depends on protocol's yield API
    throw new Error(`Protocol yield API not implemented for ${protocol.name}`);
  }

  private processYieldMetrics(protocol: ProtocolInfo, rawData: any[]): YieldMetrics[] {
    const currentTime = new Date();
    const metrics: YieldMetrics[] = [];

    for (const pool of rawData) {
      try {
        const metric: YieldMetrics = {
          protocol,
          poolId: pool.pool,
          poolName: pool.symbol || `${pool.token0}/${pool.token1}`,
          apy: pool.apy || 0,
          apyChange24h: 0, // Would be calculated from historical data
          baseApy: pool.apyBase || 0,
          rewardApy: pool.apyReward || 0,
          impermanentLoss: pool.ilRisk || 0,
          volume24h: pool.volumeUSD1d || 0,
          fees24h: 0, // Would be calculated
          timestamp: currentTime,
          source: 'defillama'
        };

        metrics.push(metric);

      } catch (error: any) {
        this.logger.error(`Failed to process yield metrics for pool ${pool.pool}`, error);
      }
    }

    return metrics;
  }

  // Event emitter for metrics
  private emit(event: string, data: any): void {
    // This will be connected to the main service's event system
  }

  on(event: string, listener: (...args: any[]) => void): void {
    // Event listener setup - will be connected to main service
  }
}
