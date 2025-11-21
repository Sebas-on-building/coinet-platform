import { Logger } from '../../utils/Logger';
import { SelfHealingNodeCluster } from './SelfHealingNodeCluster';
import { PredictiveTransactionSandbox } from './PredictiveTransactionSandbox';
import { CrossChainInteroperabilityLayer } from './CrossChainInteroperabilityLayer';
import { ZeroKnowledgeProofVerifier } from './ZeroKnowledgeProofVerifier';
import { AutomatedAnomalyDetector } from './AutomatedAnomalyDetector';

export type BlockchainType = 'ethereum' | 'bsc' | 'polygon' | 'solana' | 'avalanche' | 'arbitrum' | 'optimism';

export interface RPCProvider {
  name: string;
  url: string;
  type: 'http' | 'websocket';
  apiKey?: string;
  rateLimit?: {
    requestsPerSecond: number;
    burstLimit: number;
  };
  priority: number; // 1 = primary, 2 = backup, etc.
  isActive: boolean;
  lastUsed: Date;
  errorCount: number;
  responseTime: number;
}

export interface BlockchainNode {
  id: string;
  blockchain: BlockchainType;
  type: 'full' | 'light' | 'third_party';
  providers: RPCProvider[];
  subscriptions: Set<string>; // Active subscription IDs
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'syncing';
  lastBlock: number;
  lastSyncTime: Date;
  connectionCount: number;
  errorCount: number;
  uptime: number; // milliseconds since connection established
  metadata?: Record<string, any>;
}

export interface TransactionData {
  hash: string;
  blockNumber: number;
  blockHash: string;
  from: string;
  to?: string;
  value: string;
  gasPrice: string;
  gasLimit: string;
  gasUsed?: string;
  status: boolean;
  timestamp: Date;
  logs?: LogData[];
  blockchain: BlockchainType;
}

export interface LogData {
  address: string;
  topics: string[];
  data: string;
  logIndex: number;
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  removed: boolean;
}

export interface BlockData {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: Date;
  transactions: string[];
  gasUsed: string;
  gasLimit: string;
  blockchain: BlockchainType;
  reorganized: boolean; // Flag for chain reorganizations
}

export interface NodeMetrics {
  totalConnections: number;
  activeConnections: number;
  failedConnections: number;
  averageResponseTime: number;
  totalTransactions: number;
  totalBlocks: number;
  totalLogs: number;
  reorgCount: number;
  lastUpdated: Date;
}

export interface SubscriptionConfig {
  type: 'newHeads' | 'logs' | 'newPendingTransactions' | 'syncing';
  filter?: {
    address?: string;
    topics?: string[];
    fromBlock?: string;
    toBlock?: string;
  };
  blockchain: BlockchainType;
}

export class BlockchainNodeManager {
  private static instance: BlockchainNodeManager;
  private logger: Logger;

  // Active blockchain nodes
  private nodes: Map<string, BlockchainNode> = new Map();

  // RPC provider configurations
  private providerConfigs: Map<BlockchainType, RPCProvider[]> = new Map();

  // Active subscriptions
  private subscriptions: Map<string, SubscriptionConfig> = new Map();

  // Node metrics
  private metrics: NodeMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    failedConnections: 0,
    averageResponseTime: 0,
    totalTransactions: 0,
    totalBlocks: 0,
    totalLogs: 0,
    reorgCount: 0,
    lastUpdated: new Date()
  };

  // Chain reorganization tracking
  private blockHistory: Map<BlockchainType, Map<number, string>> = new Map();

  // Enhanced features for divine world-class perfection
  private selfHealingCluster!: SelfHealingNodeCluster;
  private transactionSandbox!: PredictiveTransactionSandbox;
  private crossChainLayer!: CrossChainInteroperabilityLayer;
  private zkpVerifier!: ZeroKnowledgeProofVerifier;
  private anomalyDetector!: AutomatedAnomalyDetector;

  private constructor() {
    this.logger = Logger.getInstance();
    this.initializeProviderConfigs();
    this.initializeEnhancedFeatures();
  }

  static getInstance(): BlockchainNodeManager {
    if (!BlockchainNodeManager.instance) {
      BlockchainNodeManager.instance = new BlockchainNodeManager();
    }
    return BlockchainNodeManager.instance;
  }

  /**
   * Initialize RPC provider configurations for each blockchain
   */
  private initializeProviderConfigs(): void {
    const configs: Array<{ blockchain: BlockchainType; providers: RPCProvider[] }> = [
      {
        blockchain: 'ethereum',
        providers: [
          {
            name: 'infura-mainnet',
            url: 'https://mainnet.infura.io/v3/YOUR_API_KEY',
            type: 'http',
            apiKey: 'YOUR_API_KEY',
            rateLimit: { requestsPerSecond: 100, burstLimit: 1000 },
            priority: 1,
            isActive: true,
            lastUsed: new Date(),
            errorCount: 0,
            responseTime: 0
          },
          {
            name: 'alchemy-mainnet',
            url: 'https://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY',
            type: 'websocket',
            apiKey: 'YOUR_API_KEY',
            rateLimit: { requestsPerSecond: 200, burstLimit: 2000 },
            priority: 2,
            isActive: true,
            lastUsed: new Date(),
            errorCount: 0,
            responseTime: 0
          }
        ]
      },
      {
        blockchain: 'bsc',
        providers: [
          {
            name: 'bsc-dataseed1',
            url: 'https://bsc-dataseed1.binance.org',
            type: 'http',
            rateLimit: { requestsPerSecond: 50, burstLimit: 500 },
            priority: 1,
            isActive: true,
            lastUsed: new Date(),
            errorCount: 0,
            responseTime: 0
          },
          {
            name: 'bsc-dataseed2',
            url: 'https://bsc-dataseed2.binance.org',
            type: 'http',
            rateLimit: { requestsPerSecond: 50, burstLimit: 500 },
            priority: 2,
            isActive: true,
            lastUsed: new Date(),
            errorCount: 0,
            responseTime: 0
          }
        ]
      },
      {
        blockchain: 'polygon',
        providers: [
          {
            name: 'polygon-rpc',
            url: 'https://polygon-rpc.com',
            type: 'http',
            rateLimit: { requestsPerSecond: 100, burstLimit: 1000 },
            priority: 1,
            isActive: true,
            lastUsed: new Date(),
            errorCount: 0,
            responseTime: 0
          },
          {
            name: 'maticvigil',
            url: 'https://rpc-mainnet.maticvigil.com',
            type: 'websocket',
            rateLimit: { requestsPerSecond: 150, burstLimit: 1500 },
            priority: 2,
            isActive: true,
            lastUsed: new Date(),
            errorCount: 0,
            responseTime: 0
          }
        ]
      },
      {
        blockchain: 'solana',
        providers: [
          {
            name: 'solana-mainnet',
            url: 'https://api.mainnet-beta.solana.com',
            type: 'http',
            rateLimit: { requestsPerSecond: 100, burstLimit: 1000 },
            priority: 1,
            isActive: true,
            lastUsed: new Date(),
            errorCount: 0,
            responseTime: 0
          },
          {
            name: 'helius',
            url: 'https://mainnet.helius-rpc.com/YOUR_API_KEY',
            type: 'websocket',
            apiKey: 'YOUR_API_KEY',
            rateLimit: { requestsPerSecond: 200, burstLimit: 2000 },
            priority: 2,
            isActive: true,
            lastUsed: new Date(),
            errorCount: 0,
            responseTime: 0
          }
        ]
      },
      {
        blockchain: 'avalanche',
        providers: [
          {
            name: 'avalanche-mainnet',
            url: 'https://api.avax.network/ext/bc/C/rpc',
            type: 'http',
            rateLimit: { requestsPerSecond: 50, burstLimit: 500 },
            priority: 1,
            isActive: true,
            lastUsed: new Date(),
            errorCount: 0,
            responseTime: 0
          },
          {
            name: 'infura-avalanche',
            url: 'https://avalanche-mainnet.infura.io/v3/YOUR_API_KEY',
            type: 'websocket',
            apiKey: 'YOUR_API_KEY',
            rateLimit: { requestsPerSecond: 100, burstLimit: 1000 },
            priority: 2,
            isActive: true,
            lastUsed: new Date(),
            errorCount: 0,
            responseTime: 0
          }
        ]
      },
      {
        blockchain: 'arbitrum',
        providers: [
          {
            name: 'arbitrum-one',
            url: 'https://arb1.arbitrum.io/rpc',
            type: 'http',
            rateLimit: { requestsPerSecond: 100, burstLimit: 1000 },
            priority: 1,
            isActive: true,
            lastUsed: new Date(),
            errorCount: 0,
            responseTime: 0
          },
          {
            name: 'infura-arbitrum',
            url: 'https://arbitrum-mainnet.infura.io/v3/YOUR_API_KEY',
            type: 'websocket',
            apiKey: 'YOUR_API_KEY',
            rateLimit: { requestsPerSecond: 150, burstLimit: 1500 },
            priority: 2,
            isActive: true,
            lastUsed: new Date(),
            errorCount: 0,
            responseTime: 0
          }
        ]
      },
      {
        blockchain: 'optimism',
        providers: [
          {
            name: 'optimism-mainnet',
            url: 'https://mainnet.optimism.io',
            type: 'http',
            rateLimit: { requestsPerSecond: 100, burstLimit: 1000 },
            priority: 1,
            isActive: true,
            lastUsed: new Date(),
            errorCount: 0,
            responseTime: 0
          },
          {
            name: 'infura-optimism',
            url: 'https://optimism-mainnet.infura.io/v3/YOUR_API_KEY',
            type: 'websocket',
            apiKey: 'YOUR_API_KEY',
            rateLimit: { requestsPerSecond: 150, burstLimit: 1500 },
            priority: 2,
            isActive: true,
            lastUsed: new Date(),
            errorCount: 0,
            responseTime: 0
          }
        ]
      }
    ];

    for (const config of configs) {
      this.providerConfigs.set(config.blockchain, config.providers);
    }

    this.logger.info('Blockchain provider configurations initialized');
  }

  /**
   * Connect to blockchain node
   */
  async connectBlockchain(blockchain: BlockchainType): Promise<string> {
    const providers = this.providerConfigs.get(blockchain);
    if (!providers || providers.length === 0) {
      throw new Error(`No providers configured for blockchain: ${blockchain}`);
    }

    const nodeId = `${blockchain}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const node: BlockchainNode = {
      id: nodeId,
      blockchain,
      type: 'third_party', // Default to third-party for demo
      providers: [...providers],
      subscriptions: new Set(),
      status: 'connecting',
      lastBlock: 0,
      lastSyncTime: new Date(),
      connectionCount: 0,
      errorCount: 0,
      uptime: 0
    };

    this.nodes.set(nodeId, node);
    this.metrics.totalConnections++;

    try {
      await this.establishNodeConnection(node);
      return nodeId;
    } catch (error) {
      this.logger.error('Failed to establish blockchain node connection', { error, blockchain, nodeId });
      node.status = 'error';
      this.metrics.failedConnections++;
      throw error;
    }
  }

  /**
   * Establish connection to blockchain node
   */
  private async establishNodeConnection(node: BlockchainNode): Promise<void> {
    try {
      // Sort providers by priority and health
      const sortedProviders = node.providers
        .filter(p => p.isActive)
        .sort((a, b) => a.priority - b.priority);

      if (sortedProviders.length === 0) {
        throw new Error(`No active providers available for ${node.blockchain}`);
      }

      const primaryProvider = sortedProviders[0]!;

      // Test connection with eth_blockNumber
      const blockNumber = await this.makeRPCRequest(node.blockchain, primaryProvider, {
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: Math.floor(Math.random() * 10000)
      });

      node.lastBlock = parseInt(blockNumber.result, 16);
      node.status = 'connected';
      node.lastSyncTime = new Date();
      node.connectionCount++;
      node.uptime = Date.now();

      this.metrics.activeConnections++;

      this.logger.info('Blockchain node connection established', {
        nodeId: node.id,
        blockchain: node.blockchain,
        provider: primaryProvider!.name,
        lastBlock: node.lastBlock
      });

      // Start block monitoring
      this.startBlockMonitoring(node);

    } catch (error) {
      this.logger.error('Failed to establish node connection', { error, blockchain: node.blockchain });
      node.status = 'error';
      node.errorCount++;
      throw error;
    }
  }

  /**
   * Start monitoring new blocks
   */
  private startBlockMonitoring(node: BlockchainNode): void {
    // In production, this would establish WebSocket subscriptions
    // For demo, we'll simulate block monitoring
    setInterval(async () => {
      try {
        await this.checkForNewBlocks(node);
      } catch (error) {
        this.logger.error('Block monitoring error', { error, nodeId: node.id, blockchain: node.blockchain });
      }
    }, 12000); // Check every 12 seconds (simulate block time)
  }

  /**
   * Check for new blocks
   */
  private async checkForNewBlocks(node: BlockchainNode): Promise<void> {
    try {
      const providers = node.providers.filter(p => p.isActive).sort((a, b) => a.priority - b.priority);
      const provider = providers[0];

      if (!provider) return;

      const blockNumber = await this.makeRPCRequest(node.blockchain, provider, {
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: Math.floor(Math.random() * 10000)
      });

      const currentBlock = parseInt(blockNumber.result, 16);

      if (currentBlock > node.lastBlock) {
        // New block detected
        const blockHash = await this.getBlockHash(node.blockchain, provider, currentBlock);
        const blockData = await this.getBlockData(node.blockchain, provider, currentBlock);

        // Check for chain reorganization
        const previousBlockHash = this.getBlockHashFromHistory(node.blockchain, currentBlock - 1);

        if (previousBlockHash && blockData.parentHash !== previousBlockHash) {
          this.handleChainReorganization(node, blockData);
        }

        // Update block history
        this.updateBlockHistory(node.blockchain, currentBlock, blockHash);

        // Process block transactions and logs
        await this.processBlock(node, blockData);

        node.lastBlock = currentBlock;
        node.lastSyncTime = new Date();

        this.logger.info('New block processed', {
          nodeId: node.id,
          blockchain: node.blockchain,
          blockNumber: currentBlock,
          transactionCount: blockData.transactions.length
        });
      }

    } catch (error) {
      this.logger.error('Failed to check for new blocks', { error, nodeId: node.id, blockchain: node.blockchain });
    }
  }

  /**
   * Process new block data
   */
  private async processBlock(node: BlockchainNode, blockData: any): Promise<void> {
    try {
      // Process transactions
      for (const txHash of blockData.transactions) {
        try {
          const txData = await this.getTransaction(node.blockchain, node.providers[0]!, txHash);
          if (txData) {
            this.metrics.totalTransactions++;
            await this.processTransaction(node, txData);
          }
        } catch (error) {
          this.logger.error('Failed to process transaction', { error, txHash, nodeId: node.id });
        }
      }

      // Process logs (would be done via subscriptions in production)
      this.metrics.totalBlocks++;

    } catch (error) {
      this.logger.error('Failed to process block', { error, blockNumber: blockData.number, nodeId: node.id });
    }
  }

  /**
   * Process individual transaction
   */
  private async processTransaction(node: BlockchainNode, txData: any): Promise<void> {
    try {
      const transaction: TransactionData = {
        hash: txData.hash,
        blockNumber: parseInt(txData.blockNumber, 16),
        blockHash: txData.blockHash,
        from: txData.from,
        to: txData.to,
        value: txData.value,
        gasPrice: txData.gasPrice,
        gasLimit: txData.gas,
        gasUsed: txData.gasUsed,
        status: true, // Simplified for demo
        timestamp: new Date(),
        blockchain: node.blockchain
      };

      // Process transaction logs
      if (txData.logs && txData.logs.length > 0) {
        transaction.logs = txData.logs.map((log: any) => ({
          address: log.address,
          topics: log.topics,
          data: log.data,
          logIndex: parseInt(log.logIndex, 16),
          transactionHash: log.transactionHash,
          blockNumber: parseInt(log.blockNumber, 16),
          blockHash: log.blockHash,
          removed: false
        }));

        this.metrics.totalLogs += txData.logs.length;
      }

      // Trigger transaction handlers
      await this.triggerTransactionHandlers(transaction);

    } catch (error) {
      this.logger.error('Failed to process transaction', { error, txHash: txData.hash });
    }
  }

  /**
   * Trigger transaction event handlers
   */
  private async triggerTransactionHandlers(transaction: TransactionData): Promise<void> {
    // In production, this would trigger notification events
    this.logger.info('Transaction processed', {
      hash: transaction.hash,
      from: transaction.from,
      to: transaction.to,
      value: transaction.value,
      blockchain: transaction.blockchain
    });

    // Could trigger alerts based on transaction patterns
    // - Large value transfers
    // - Contract interactions
    // - Failed transactions
    // - Suspicious addresses
  }

  /**
   * Handle chain reorganization
   */
  private handleChainReorganization(node: BlockchainNode, newBlockData: any): void {
    this.metrics.reorgCount++;

    this.logger.warn('Chain reorganization detected', {
      nodeId: node.id,
      blockchain: node.blockchain,
      blockNumber: newBlockData.number,
      expectedParent: this.getBlockHashFromHistory(node.blockchain, newBlockData.number - 1),
      actualParent: newBlockData.parentHash
    });

    // In production, this would:
    // 1. Remove transactions from reorganized blocks
    // 2. Reprocess transactions from the correct chain
    // 3. Trigger reorganization alerts
    // 4. Update block history
  }

  /**
   * Subscribe to blockchain events
   */
  async subscribeToEvents(blockchain: BlockchainType, config: SubscriptionConfig): Promise<string> {
    const subscriptionId = `sub-${blockchain}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const node = Array.from(this.nodes.values()).find(n => n.blockchain === blockchain && n.status === 'connected');

      if (!node) {
        throw new Error(`No active node available for blockchain: ${blockchain}`);
      }

      // In production, this would establish WebSocket subscriptions
      // For demo, we'll simulate subscription
      node.subscriptions.add(subscriptionId);

      this.subscriptions.set(subscriptionId, config);

      this.logger.info('Blockchain subscription created', {
        subscriptionId,
        blockchain,
        type: config.type,
        filter: config.filter
      });

      return subscriptionId;

    } catch (error) {
      this.logger.error('Failed to create blockchain subscription', { error, blockchain, config });
      throw error;
    }
  }

  /**
   * Unsubscribe from blockchain events
   */
  async unsubscribeFromEvents(subscriptionId: string): Promise<boolean> {
    try {
      const config = this.subscriptions.get(subscriptionId);
      if (!config) return false;

      const node = Array.from(this.nodes.values()).find(n => n.blockchain === config.blockchain && n.status === 'connected');
      if (node) {
        node.subscriptions.delete(subscriptionId);
      }

      this.subscriptions.delete(subscriptionId);

      this.logger.info('Blockchain subscription removed', { subscriptionId, blockchain: config.blockchain });
      return true;

    } catch (error) {
      this.logger.error('Failed to remove blockchain subscription', { error, subscriptionId });
      return false;
    }
  }

  /**
   * Make RPC request with provider failover
   */
  private async makeRPCRequest(blockchain: BlockchainType, provider: RPCProvider, payload: any): Promise<any> {
    const startTime = Date.now();

    try {
      const response = await fetch(provider.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(provider.apiKey && { 'Authorization': `Bearer ${provider.apiKey}` })
        },
        body: JSON.stringify(payload)
      });

      const responseTime = Date.now() - startTime;
      provider.responseTime = responseTime;
      provider.lastUsed = new Date();

      if (!response.ok) {
        provider.errorCount++;
        throw new Error(`RPC request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if ((result as any).error) {
        provider.errorCount++;
        throw new Error(`RPC error: ${(result as any).error.message}`);
      }

      return result;

    } catch (error) {
      provider.errorCount++;
      this.logger.error('RPC request failed', {
        error,
        blockchain,
        provider: provider.name,
        url: provider.url
      });
      throw error;
    }
  }

  /**
   * Get block hash
   */
  private async getBlockHash(blockchain: BlockchainType, provider: RPCProvider, blockNumber: number): Promise<string> {
    const response = await this.makeRPCRequest(blockchain, provider, {
      jsonrpc: '2.0',
      method: 'eth_getBlockByNumber',
      params: [`0x${blockNumber.toString(16)}`, false],
      id: Math.floor(Math.random() * 10000)
    });

    return response.result?.hash || '';
  }

  /**
   * Get block data with transactions
   */
  private async getBlockData(blockchain: BlockchainType, provider: RPCProvider, blockNumber: number): Promise<any> {
    const response = await this.makeRPCRequest(blockchain, provider, {
      jsonrpc: '2.0',
      method: 'eth_getBlockByNumber',
      params: [`0x${blockNumber.toString(16)}`, true],
      id: Math.floor(Math.random() * 10000)
    });

    return response.result;
  }

  /**
   * Get transaction data
   */
  private async getTransaction(blockchain: BlockchainType, provider: RPCProvider, txHash: string): Promise<any> {
    const response = await this.makeRPCRequest(blockchain, provider, {
      jsonrpc: '2.0',
      method: 'eth_getTransactionByHash',
      params: [txHash],
      id: Math.floor(Math.random() * 10000)
    });

    return response.result;
  }

  /**
   * Update block history for reorganization detection
   */
  private updateBlockHistory(blockchain: BlockchainType, blockNumber: number, blockHash: string): void {
    let history = this.blockHistory.get(blockchain) || new Map();
    history.set(blockNumber, blockHash);
    this.blockHistory.set(blockchain, history);
  }

  /**
   * Get block hash from history
   */
  private getBlockHashFromHistory(blockchain: BlockchainType, blockNumber: number): string | undefined {
    return this.blockHistory.get(blockchain)?.get(blockNumber);
  }

  /**
   * Get node by ID
   */
  getNode(nodeId: string): BlockchainNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): BlockchainNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get nodes by blockchain
   */
  getNodesByBlockchain(blockchain: BlockchainType): BlockchainNode[] {
    return Array.from(this.nodes.values()).filter(node => node.blockchain === blockchain);
  }

  /**
   * Get node metrics
   */
  getNodeMetrics(): NodeMetrics {
    this.updateMetricsSummary();
    return { ...this.metrics };
  }

  /**
   * Update metrics summary
   */
  private updateMetricsSummary(): void {
    const nodes = Array.from(this.nodes.values());
    const activeNodes = nodes.filter(node => node.status === 'connected');

    this.metrics.activeConnections = activeNodes.length;
    this.metrics.failedConnections = nodes.filter(node => node.status === 'error').length;

    if (activeNodes.length > 0) {
      this.metrics.averageResponseTime = activeNodes.reduce((sum, node) => {
        return sum + node.providers.reduce((providerSum, provider) => providerSum + provider.responseTime, 0) / node.providers.length;
      }, 0) / activeNodes.length;
    }

    this.metrics.lastUpdated = new Date();
  }

  /**
   * Get supported blockchains
   */
  getSupportedBlockchains(): BlockchainType[] {
    return Array.from(this.providerConfigs.keys());
  }

  /**
   * Add custom RPC provider
   */
  addRPCProvider(blockchain: BlockchainType, provider: RPCProvider): void {
    const providers = this.providerConfigs.get(blockchain) || [];
    providers.push(provider);
    this.providerConfigs.set(blockchain, providers);

    this.logger.info('RPC provider added', { blockchain, provider: provider.name });
  }

  /**
   * Remove RPC provider
   */
  removeRPCProvider(blockchain: BlockchainType, providerName: string): boolean {
    const providers = this.providerConfigs.get(blockchain);
    if (!providers) return false;

    const index = providers.findIndex(p => p.name === providerName);
    if (index === -1) return false;

    providers.splice(index, 1);
    this.providerConfigs.set(blockchain, providers);

    this.logger.info('RPC provider removed', { blockchain, provider: providerName });
    return true;
  }

  /**
   * Disconnect node
   */
  async disconnectNode(nodeId: string): Promise<boolean> {
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    try {
      // Close all subscriptions
      for (const subscriptionId of Array.from(node.subscriptions)) {
        await this.unsubscribeFromEvents(subscriptionId);
      }

      node.status = 'disconnected';
      this.nodes.delete(nodeId);

      this.logger.info('Blockchain node disconnected', { nodeId, blockchain: node.blockchain });
      return true;

    } catch (error) {
      this.logger.error('Failed to disconnect blockchain node', { error, nodeId });
      return false;
    }
  }

  /**
   * Get blockchain statistics
   */
  getBlockchainStats(): Record<BlockchainType, any> {
    const stats: Record<string, any> = {};

    for (const [blockchain, providers] of Array.from(this.providerConfigs.entries())) {
      const nodes = this.getNodesByBlockchain(blockchain);

      stats[blockchain] = {
        providers: providers.length,
        activeProviders: providers.filter(p => p.isActive).length,
        activeNodes: nodes.filter(n => n.status === 'connected').length,
        lastBlock: nodes.length > 0 ? Math.max(...nodes.map(n => n.lastBlock)) : 0,
        totalTransactions: this.metrics.totalTransactions,
        totalBlocks: this.metrics.totalBlocks,
        reorgCount: this.metrics.reorgCount
      };
    }

    return stats;
  }

  /**
   * Test RPC provider health
   */
  async testProviderHealth(blockchain: BlockchainType): Promise<Record<string, { status: string; responseTime: number; errorCount: number }>> {
    const providers = this.providerConfigs.get(blockchain) || [];
    const health: Record<string, any> = {};

    for (const provider of providers.filter(p => p.isActive)) {
      try {
        const startTime = Date.now();
        await this.makeRPCRequest(blockchain, provider, {
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: Math.floor(Math.random() * 10000)
        });
        const responseTime = Date.now() - startTime;

        health[provider.name] = {
          status: 'healthy',
          responseTime,
          errorCount: provider.errorCount
        };

      } catch (error) {
        health[provider.name] = {
          status: 'error',
          responseTime: 0,
          errorCount: provider.errorCount + 1,
          error: (error as Error).message
        };
      }
    }

    return health;
  }

  /**
   * Initialize enhanced features
   */
  private initializeEnhancedFeatures(): void {
    this.selfHealingCluster = new SelfHealingNodeCluster(this);
    this.transactionSandbox = new PredictiveTransactionSandbox(this);
    this.crossChainLayer = new CrossChainInteroperabilityLayer(this);
    this.zkpVerifier = new ZeroKnowledgeProofVerifier(this);
    this.anomalyDetector = new AutomatedAnomalyDetector(this);

    this.logger.info('Enhanced blockchain monitoring features initialized');
  }

  /**
   * Get self-healing node cluster
   */
  getSelfHealingCluster(): SelfHealingNodeCluster {
    return this.selfHealingCluster;
  }

  /**
   * Get predictive transaction sandbox
   */
  getTransactionSandbox(): PredictiveTransactionSandbox {
    return this.transactionSandbox;
  }

  /**
   * Get cross-chain interoperability layer
   */
  getCrossChainLayer(): CrossChainInteroperabilityLayer {
    return this.crossChainLayer;
  }

  /**
   * Get zero-knowledge proof verifier
   */
  getZKPVerifier(): ZeroKnowledgeProofVerifier {
    return this.zkpVerifier;
  }

  /**
   * Get automated anomaly detector
   */
  getAnomalyDetector(): AutomatedAnomalyDetector {
    return this.anomalyDetector;
  }

  /**
   * Cleanup old nodes and metrics
   */
  cleanupOldRecords(daysToKeep: number = 7): number {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [nodeId, node] of Array.from(this.nodes.entries())) {
      if (node.lastSyncTime < cutoffDate && node.status !== 'connected') {
        this.nodes.delete(nodeId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.info(`Cleaned up ${cleanedCount} old blockchain nodes`);
    }

    return cleanedCount;
  }
}
