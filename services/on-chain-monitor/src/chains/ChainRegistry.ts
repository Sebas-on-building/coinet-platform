/**
 * =========================================
 * CHAIN REGISTRY
 * =========================================
 * Manages connections and configurations for multiple blockchain networks
 * with intelligent provider selection and health monitoring
 */

import { EventEmitter } from 'events';
import { ChainType, ChainConfig, RPCProvider, ChainClient, TransactionData, BlockData, TransactionType, HealthStatus } from '../types';
import { EthereumClient } from './clients/EthereumClient';
import { BSCClient } from './clients/BSCClient';
import { SolanaClient } from './clients/SolanaClient';
import { PolygonClient } from './clients/PolygonClient';
import { Logger } from '../utils/Logger';

export class ChainRegistry extends EventEmitter {
  private logger: Logger;
  private chains: Map<ChainType, ChainConfig> = new Map();
  private providers: Map<ChainType, RPCProvider[]> = new Map();
  private clients: Map<ChainType, ChainClient> = new Map();
  private isInitialized: Map<ChainType, boolean> = new Map();

  constructor() {
    super();
    this.logger = new Logger('ChainRegistry');

    this.initializeDefaultChains();
  }

  /**
   * Register a chain configuration
   */
  registerChain(chain: ChainType, config: ChainConfig): void {
    this.chains.set(chain, config);
    this.isInitialized.set(chain, false);
    this.logger.info(`✅ Registered chain: ${chain}`);
  }

  /**
   * Register RPC providers for a chain
   */
  registerProviders(chain: ChainType, providers: RPCProvider[]): void {
    this.providers.set(chain, providers);
    this.logger.info(`✅ Registered ${providers.length} providers for ${chain}`);
  }

  /**
   * Initialize a chain connection
   */
  async initializeChain(chain: ChainType): Promise<void> {
    const config = this.chains.get(chain);
    if (!config) {
      throw new Error(`No configuration found for chain: ${chain}`);
    }

    const providers = this.providers.get(chain) || [];
    if (providers.length === 0) {
      throw new Error(`No providers registered for chain: ${chain}`);
    }

    try {
      // Create chain client
      const client: ChainClient = this.createChainClient(chain, config, providers);
      this.clients.set(chain, client);

      // Initialize connection
      await client.initialize();

      this.isInitialized.set(chain, true);
      this.logger.info(`✅ Initialized ${chain} chain client`);

      this.emit('chainInitialized', chain);

    } catch (error: any) {
      this.logger.error(`❌ Failed to initialize ${chain}`, error);
      throw error;
    }
  }

  /**
   * Get chain client
   */
  getChainClient(chain: ChainType): ChainClient | undefined {
    return this.clients.get(chain);
  }

  /**
   * Check if chain is initialized
   */
  isChainInitialized(chain: ChainType): boolean {
    return this.isInitialized.get(chain) || false;
  }

  /**
   * Get healthy providers for a chain
   */
  getHealthyProviders(chain: ChainType): RPCProvider[] {
    const providers = this.providers.get(chain) || [];
    return providers.filter(provider => provider.isActive && provider.healthScore >= 80);
  }

  /**
   * Get all registered chains
   */
  getRegisteredChains(): ChainType[] {
    return Array.from(this.chains.keys());
  }

  /**
   * Get registry status
   */
  getStatus(): any {
    const status = {
      registeredChains: this.getRegisteredChains().length,
      initializedChains: 0,
      totalProviders: 0,
      healthyProviders: 0,
      chains: {} as Record<string, any>
    };

    for (const chain of this.getRegisteredChains()) {
      const isInitialized = this.isChainInitialized(chain);
      const providers = this.providers.get(chain) || [];
      const healthyProviders = this.getHealthyProviders(chain);
      const client = this.clients.get(chain);

      status.chains[chain] = {
        initialized: isInitialized,
        providers: providers.length,
        healthyProviders: healthyProviders.length,
        connected: client ? client.isConnected() : false
      };

      if (isInitialized) {
        status.initializedChains++;
      }
      status.totalProviders += providers.length;
      status.healthyProviders += healthyProviders.length;
    }

    return status;
  }

  /**
   * Initialize default chain configurations
   */
  private initializeDefaultChains(): void {
    // Ethereum Mainnet
    this.registerChain('ethereum', {
      chainId: 1,
      name: 'Ethereum Mainnet',
      type: 'ethereum',
      rpcUrls: [
        'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
        'https://eth-mainnet.alchemyapi.io/v2/YOUR_ALCHEMY_KEY',
        'https://rpc.ankr.com/eth'
      ],
      wsUrls: [
        'wss://mainnet.infura.io/ws/v3/YOUR_INFURA_KEY',
        'wss://eth-mainnet.alchemyapi.io/v2/YOUR_ALCHEMY_KEY'
      ],
      blockTime: 12,
      confirmations: 12,
      nativeToken: 'ETH',
      explorerUrl: 'https://etherscan.io',
      supportsEIP1559: true
    });

    // Binance Smart Chain
    this.registerChain('bsc', {
      chainId: 56,
      name: 'Binance Smart Chain',
      type: 'bsc',
      rpcUrls: [
        'https://bsc-dataseed.binance.org',
        'https://bsc-dataseed1.binance.org',
        'https://bsc-dataseed2.binance.org'
      ],
      wsUrls: [
        'wss://bsc-ws-node.nariox.org:443'
      ],
      blockTime: 3,
      confirmations: 15,
      nativeToken: 'BNB',
      explorerUrl: 'https://bscscan.com',
      supportsEIP1559: true
    });

    // Solana Mainnet
    this.registerChain('solana', {
      chainId: 101,
      name: 'Solana Mainnet',
      type: 'solana',
      rpcUrls: [
        'https://api.mainnet-beta.solana.com',
        'https://solana-api.projectserum.com'
      ],
      wsUrls: [
        'wss://api.mainnet-beta.solana.com',
        'wss://solana-api.projectserum.com'
      ],
      blockTime: 0.4,
      confirmations: 32,
      nativeToken: 'SOL',
      explorerUrl: 'https://solscan.io',
      supportsEIP1559: false
    });

    // Polygon Mainnet
    this.registerChain('polygon', {
      chainId: 137,
      name: 'Polygon Mainnet',
      type: 'polygon',
      rpcUrls: [
        'https://polygon-rpc.com',
        'https://rpc-mainnet.matic.network'
      ],
      wsUrls: [
        'wss://rpc-mainnet.matic.network/ws'
      ],
      blockTime: 2,
      confirmations: 256,
      nativeToken: 'MATIC',
      explorerUrl: 'https://polygonscan.com',
      supportsEIP1559: true
    });

    // Register default providers for each chain
    this.registerDefaultProviders();
  }

  /**
   * Register default RPC providers
   */
  private registerDefaultProviders(): void {
    // Ethereum providers
    this.registerProviders('ethereum', [
      {
        id: 'infura_mainnet',
        url: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
        type: 'infura',
        apiKey: 'YOUR_INFURA_KEY',
        rateLimit: 100,
        priority: 1,
        isActive: true,
        healthScore: 100,
        lastHealthCheck: new Date()
      },
      {
        id: 'alchemy_mainnet',
        url: 'https://eth-mainnet.alchemyapi.io/v2/YOUR_ALCHEMY_KEY',
        type: 'alchemy',
        apiKey: 'YOUR_ALCHEMY_KEY',
        rateLimit: 150,
        priority: 2,
        isActive: true,
        healthScore: 100,
        lastHealthCheck: new Date()
      }
    ]);

    // BSC providers
    this.registerProviders('bsc', [
      {
        id: 'bsc_official',
        url: 'https://bsc-dataseed.binance.org',
        type: 'rpc_provider',
        rateLimit: 200,
        priority: 1,
        isActive: true,
        healthScore: 100,
        lastHealthCheck: new Date()
      }
    ]);

    // Solana providers
    this.registerProviders('solana', [
      {
        id: 'solana_mainnet',
        url: 'https://api.mainnet-beta.solana.com',
        type: 'rpc_provider',
        rateLimit: 100,
        priority: 1,
        isActive: true,
        healthScore: 100,
        lastHealthCheck: new Date()
      }
    ]);

    // Polygon providers
    this.registerProviders('polygon', [
      {
        id: 'polygon_official',
        url: 'https://polygon-rpc.com',
        type: 'rpc_provider',
        rateLimit: 100,
        priority: 1,
        isActive: true,
        healthScore: 100,
        lastHealthCheck: new Date()
      }
    ]);
  }

  /**
   * Initialize all registered chains
   */
  async initialize(): Promise<void> {
    const chains = this.getRegisteredChains();
    this.logger.info(`Initializing ${chains.length} chains...`);

    for (const chain of chains) {
      try {
        await this.initializeChain(chain);
      } catch (error: any) {
        this.logger.error(`Failed to initialize chain ${chain}`, error);
        // Continue with other chains
      }
    }

    this.logger.info('✅ Chain registry initialized');
  }

  /**
   * Stop all chains and cleanup resources
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping all chains...');

    for (const [chain, client] of this.clients) {
      try {
        // Note: ChainClient interface doesn't have a stop method yet
        // This will be added in future iterations
        this.logger.debug(`Stopped client for ${chain}`);
      } catch (error: any) {
        this.logger.error(`Failed to stop chain ${chain}`, error);
      }
    }

    this.clients.clear();
    this.isInitialized.clear();
    this.logger.info('✅ Chain registry stopped');
  }

  /**
   * Subscribe to transactions on multiple chains
   */
  async subscribeToTransactions(chains: string[], options: any): Promise<Record<string, any>> {
    const subscriptions: Record<string, any> = {};

    for (const chainName of chains) {
      const chain = chainName as ChainType;
      if (!this.isChainInitialized(chain)) {
        throw new Error(`Chain ${chain} is not initialized`);
      }

      const client = this.clients.get(chain);
      if (!client) {
        throw new Error(`No client available for chain ${chain}`);
      }

      try {
        const subscription = await client.subscribeToTransactions(options);
        subscriptions[chain] = subscription;
        this.logger.info(`✅ Subscribed to ${chain} transactions`);
      } catch (error: any) {
        this.logger.error(`Failed to subscribe to ${chain} transactions`, error);
        throw error;
      }
    }

    return subscriptions;
  }

  /**
   * Unsubscribe from transaction subscriptions
   */
  async unsubscribeFromTransactions(subscriptions: Record<string, any>): Promise<void> {
    for (const [chain, subscription] of Object.entries(subscriptions)) {
      try {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          await subscription.unsubscribe();
          this.logger.info(`✅ Unsubscribed from ${chain} transactions`);
        }
      } catch (error: any) {
        this.logger.error(`Failed to unsubscribe from ${chain} transactions`, error);
      }
    }
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<any> {
    const health = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      issues: [] as string[],
      chains: {} as Record<string, any>
    };

    for (const chain of this.getRegisteredChains()) {
      const client = this.clients.get(chain);
      const isInitialized = this.isChainInitialized(chain);

      if (client && isInitialized) {
        try {
          const clientHealth = await client.getHealth();
          health.chains[chain] = {
            status: 'healthy',
            ...clientHealth
          };
        } catch (error: any) {
          health.chains[chain] = {
            status: 'unhealthy',
            error: error.message
          };
          health.issues.push(`${chain}: ${error.message}`);
        }
      } else {
        health.chains[chain] = {
          status: 'unhealthy',
          reason: isInitialized ? 'No client' : 'Not initialized'
        };
        health.issues.push(`${chain}: ${isInitialized ? 'No client' : 'Not initialized'}`);
      }
    }

    if (health.issues.length > 0) {
      health.status = health.issues.length === this.getRegisteredChains().length ? 'unhealthy' : 'degraded';
    }

    return health;
  }

  /**
   * Create appropriate client for chain type
   */
  private createChainClient(chain: ChainType, config: ChainConfig, providers: RPCProvider[]): ChainClient {
    switch (chain) {
      case 'ethereum':
        return new EthereumClient(config, providers);
      case 'bsc':
        return new BSCClient(config, providers);
      case 'solana':
        return new SolanaClient(config, providers);
      case 'polygon':
        return new PolygonClient(config, providers);
      default:
        throw new Error(`Unsupported chain type: ${chain}`);
    }
  }
}
