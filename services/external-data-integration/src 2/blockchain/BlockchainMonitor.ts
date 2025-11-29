/**
 * =========================================
 * BLOCKCHAIN MONITOR
 * =========================================
 * Advanced blockchain monitoring with RPC failover and subscription management
 */

import Web3 from 'web3';
import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';

export interface BlockchainNode {
  id: string;
  name: string;
  url: string;
  chainId: number;
  type: 'full' | 'archive' | 'light';
  apiKey?: string;
  priority: number; // Higher = more preferred
  rateLimit?: {
    requestsPerSecond: number;
    burstLimit: number;
  };
  healthCheckInterval: number;
  maxReconnectAttempts: number;
}

export interface TransactionData {
  hash: string;
  blockNumber: number;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasLimit: string;
  gasUsed?: string;
  status: boolean;
  timestamp: Date;
  logs?: LogData[];
  contractAddress?: string;
  methodName?: string;
  decodedInput?: any;
}

export interface LogData {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
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
  miner: string;
  difficulty?: string;
  totalDifficulty?: string;
  size: number;
  uncles: string[];
}

export interface RPCHealth {
  nodeId: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  responseTime: number;
  blockNumber: number;
  lastBlock: Date;
  syncStatus: 'synced' | 'syncing' | 'behind' | 'unknown';
  peerCount: number;
  errors: number;
  uptime: number;
  requestsPerSecond: number;
}

export interface BlockchainMonitorConfig {
  nodes: BlockchainNode[];
  subscriptions: {
    newBlocks: boolean;
    pendingTransactions: boolean;
    logs: {
      enabled: boolean;
      addresses?: string[];
      topics?: string[];
    };
  };
  polling: {
    blockInterval: number;
    healthCheckInterval: number;
  };
  bufferSize: number;
  maxLatency: number;
  failoverThreshold: number;
}

export class BlockchainMonitor extends EventEmitter {
  private logger: Logger;
  private config: BlockchainMonitorConfig;
  private web3Instances: Map<string, Web3> = new Map();
  private subscriptions: Map<string, any> = new Map();
  private nodeHealth: Map<string, RPCHealth> = new Map();
  private transactionBuffer: TransactionData[] = [];
  private blockBuffer: BlockData[] = [];
  private isRunning: boolean = false;
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private healthCheckTimers: Map<string, NodeJS.Timeout> = new Map();

  // Performance tracking
  private totalTransactions: number = 0;
  private totalBlocks: number = 0;
  private startTime: number = Date.now();
  private requestLatencies: number[] = [];

  constructor(config: BlockchainMonitorConfig) {
    super();
    this.logger = new Logger('BlockchainMonitor');

    this.config = {
      subscriptions: {
        newBlocks: true,
        pendingTransactions: false,
        logs: {
          enabled: false,
          addresses: [],
          topics: []
        }
      },
      polling: {
        blockInterval: 12000, // 12 seconds (Ethereum block time)
        healthCheckInterval: 30000 // 30 seconds
      },
      bufferSize: 10000,
      maxLatency: 5000, // 5 seconds max latency
      failoverThreshold: 3, // 3 consecutive failures trigger failover
      ...config
    };
  }

  async start(): Promise<void> {
    try {
      this.logger.info('Starting Blockchain Monitor...');
      this.isRunning = true;

      // Initialize all nodes
      for (const node of this.config.nodes) {
        await this.connectToNode(node);
      }

      // Start subscriptions for healthy nodes
      await this.startSubscriptions();

      // Start health monitoring
      this.startHealthMonitoring();

      // Start block polling
      this.startBlockPolling();

      this.logger.info(`✅ Blockchain Monitor started with ${this.config.nodes.length} nodes`);

    } catch (error: any) {
      this.logger.error('❌ Failed to start Blockchain Monitor', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping Blockchain Monitor...');
      this.isRunning = false;

      // Clear all timers
      for (const timer of this.reconnectTimers.values()) {
        clearTimeout(timer);
      }
      for (const timer of this.healthCheckTimers.values()) {
        clearTimeout(timer);
      }
      this.reconnectTimers.clear();
      this.healthCheckTimers.clear();

      // Unsubscribe from all subscriptions
      for (const [nodeId, subscription] of this.subscriptions.entries()) {
        try {
          if (subscription.unsubscribe) {
            await subscription.unsubscribe();
          }
        } catch (error) {
          this.logger.error(`Failed to unsubscribe from ${nodeId}`, error);
        }
      }
      this.subscriptions.clear();

      // Close all Web3 connections
      for (const [nodeId, web3] of this.web3Instances.entries()) {
        try {
          if (web3.currentProvider) {
            (web3.currentProvider as any).disconnect?.();
          }
        } catch (error) {
          this.logger.error(`Failed to disconnect from ${nodeId}`, error);
        }
      }
      this.web3Instances.clear();

      this.logger.info('✅ Blockchain Monitor stopped successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to stop Blockchain Monitor', error);
      throw error;
    }
  }

  /**
   * Get latest transactions from buffer
   */
  getRecentTransactions(limit: number = 100): TransactionData[] {
    return this.transactionBuffer.slice(-limit);
  }

  /**
   * Get latest blocks from buffer
   */
  getRecentBlocks(limit: number = 100): BlockData[] {
    return this.blockBuffer.slice(-limit);
  }

  /**
   * Get transactions for a specific address
   */
  getTransactionsForAddress(address: string, limit: number = 50): TransactionData[] {
    return this.transactionBuffer
      .filter(tx => tx.from.toLowerCase() === address.toLowerCase() || tx.to?.toLowerCase() === address.toLowerCase())
      .slice(-limit);
  }

  /**
   * Get RPC health for all nodes
   */
  getRPCHealth(): Record<string, RPCHealth> {
    const health: Record<string, RPCHealth> = {};

    for (const [nodeId, nodeHealth] of this.nodeHealth.entries()) {
      health[nodeId] = { ...nodeHealth };
    }

    return health;
  }

  /**
   * Get overall service health
   */
  getHealthStatus(): {
    isRunning: boolean;
    healthyNodes: number;
    totalNodes: number;
    transactionBufferSize: number;
    blockBufferSize: number;
    averageLatency: number;
    transactionsPerSecond: number;
    blocksPerSecond: number;
    uptime: number;
  } {
    const healthyNodes = Array.from(this.nodeHealth.values())
      .filter(h => h.status === 'healthy').length;

    const averageLatency = this.requestLatencies.length > 0
      ? this.requestLatencies.reduce((a, b) => a + b, 0) / this.requestLatencies.length
      : 0;

    const uptime = Date.now() - this.startTime;
    const transactionsPerSecond = this.totalTransactions / Math.max(1, uptime / 1000);
    const blocksPerSecond = this.totalBlocks / Math.max(1, uptime / 1000);

    return {
      isRunning: this.isRunning,
      healthyNodes,
      totalNodes: this.config.nodes.length,
      transactionBufferSize: this.transactionBuffer.length,
      blockBufferSize: this.blockBuffer.length,
      averageLatency,
      transactionsPerSecond,
      blocksPerSecond,
      uptime
    };
  }

  private async connectToNode(node: BlockchainNode): Promise<void> {
    try {
      this.logger.info(`Connecting to ${node.name} (${node.url})`);

      // Initialize health status
      this.nodeHealth.set(node.id, {
        nodeId: node.id,
        status: 'healthy',
        responseTime: 0,
        blockNumber: 0,
        lastBlock: new Date(),
        syncStatus: 'synced',
        peerCount: 0,
        errors: 0,
        uptime: 0,
        requestsPerSecond: 0
      });

      // Create Web3 instance with custom provider
      const provider = this.createProvider(node);
      const web3 = new Web3(provider);

      // Test connection
      await this.testConnection(node, web3);

      this.web3Instances.set(node.id, web3);

      this.logger.info(`✅ Connected to ${node.name}`);

    } catch (error: any) {
      this.logger.error(`Failed to connect to ${node.name}`, error);
      this.updateNodeHealth(node.id, 'unhealthy');
      this.scheduleReconnect(node);
    }
  }

  private createProvider(node: BlockchainNode): any {
    const url = node.apiKey ? `${node.url}/${node.apiKey}` : node.url;

    return new Web3.providers.HttpProvider(url, {
      timeout: 10000,
      keepAlive: true,
      withCredentials: false,
      agent: {
        keepAlive: true,
        keepAliveMsecs: 30000,
        maxSockets: 10,
        maxFreeSockets: 5
      }
    });
  }

  private async testConnection(node: BlockchainNode, web3: Web3): Promise<void> {
    try {
      const startTime = Date.now();

      // Get current block number
      const blockNumber = await web3.eth.getBlockNumber();
      const responseTime = Date.now() - startTime;

      // Get sync status if available
      let syncStatus: RPCHealth['syncStatus'] = 'synced';
      try {
        const syncStatusData = await web3.eth.getSyncing();
        if (syncStatusData !== false) {
          syncStatus = 'syncing';
        }
      } catch (error) {
        syncStatus = 'unknown';
      }

      // Update health
      this.updateNodeHealth(node.id, 'healthy', {
        responseTime,
        blockNumber,
        lastBlock: new Date(),
        syncStatus
      });

      this.logger.debug(`Connection test successful for ${node.name}: block ${blockNumber}, latency ${responseTime}ms`);

    } catch (error: any) {
      this.updateNodeHealth(node.id, 'unhealthy');
      throw error;
    }
  }

  private async startSubscriptions(): Promise<void> {
    const healthyNodes = this.getHealthyNodes();

    if (healthyNodes.length === 0) {
      this.logger.warn('No healthy nodes available for subscriptions');
      return;
    }

    // Use the highest priority healthy node for subscriptions
    const primaryNode = healthyNodes.sort((a, b) => b.priority - a.priority)[0];
    const web3 = this.web3Instances.get(primaryNode.id);

    if (!web3) return;

    try {
      // Subscribe to new blocks
      if (this.config.subscriptions.newBlocks) {
        const blockSubscription = await web3.eth.subscribe('newBlockHeaders');
        blockSubscription.on('data', (blockHeader) => {
          this.onNewBlock(primaryNode, blockHeader);
        });
        blockSubscription.on('error', (error) => {
          this.logger.error(`Block subscription error for ${primaryNode.name}`, error);
        });
        this.subscriptions.set(`${primaryNode.id}-blocks`, blockSubscription);
      }

      // Subscribe to pending transactions
      if (this.config.subscriptions.pendingTransactions) {
        const txSubscription = await web3.eth.subscribe('pendingTransactions');
        txSubscription.on('data', (txHash) => {
          this.onPendingTransaction(primaryNode, txHash);
        });
        txSubscription.on('error', (error) => {
          this.logger.error(`Pending transaction subscription error for ${primaryNode.name}`, error);
        });
        this.subscriptions.set(`${primaryNode.id}-pending`, txSubscription);
      }

      // Subscribe to logs
      if (this.config.subscriptions.logs.enabled) {
        const logSubscription = await web3.eth.subscribe('logs', {
          address: this.config.subscriptions.logs.addresses,
          topics: this.config.subscriptions.logs.topics
        });
        logSubscription.on('data', (log) => {
          this.onNewLog(primaryNode, log);
        });
        logSubscription.on('error', (error) => {
          this.logger.error(`Log subscription error for ${primaryNode.name}`, error);
        });
        this.subscriptions.set(`${primaryNode.id}-logs`, logSubscription);
      }

      this.logger.info(`✅ Subscriptions started for ${primaryNode.name}`);

    } catch (error: any) {
      this.logger.error(`Failed to start subscriptions for ${primaryNode.name}`, error);
      this.updateNodeHealth(primaryNode.id, 'degraded');
    }
  }

  private onNewBlock(node: BlockchainNode, blockHeader: any): void {
    try {
      this.logger.debug(`New block received from ${node.name}: ${blockHeader.number}`);

      // Fetch full block data
      this.fetchFullBlock(node, blockHeader);

      // Update health
      const health = this.nodeHealth.get(node.id);
      if (health) {
        health.blockNumber = parseInt(blockHeader.number);
        health.lastBlock = new Date();
      }

    } catch (error: any) {
      this.logger.error(`Failed to process new block from ${node.name}`, error);
    }
  }

  private async fetchFullBlock(node: BlockchainNode, blockHeader: any): Promise<void> {
    try {
      const web3 = this.web3Instances.get(node.id);
      if (!web3) return;

      const block = await web3.eth.getBlock(blockHeader.hash, true);
      const blockData: BlockData = {
        number: parseInt(block.number),
        hash: block.hash,
        parentHash: block.parentHash,
        timestamp: new Date(parseInt(block.timestamp) * 1000),
        transactions: block.transactions.map((tx: any) => tx.hash),
        gasUsed: block.gasUsed,
        gasLimit: block.gasLimit,
        miner: block.miner,
        size: parseInt(block.size),
        uncles: block.uncles || []
      };

      // Add to buffer
      this.blockBuffer.push(blockData);
      if (this.blockBuffer.length > this.config.bufferSize) {
        this.blockBuffer.shift();
      }

      this.totalBlocks++;

      // Emit block event
      this.emit('new-block', { block: blockData, node, timestamp: new Date() });

    } catch (error: any) {
      this.logger.error(`Failed to fetch full block ${blockHeader.hash}`, error);
    }
  }

  private async onPendingTransaction(node: BlockchainNode, txHash: string): Promise<void> {
    try {
      const web3 = this.web3Instances.get(node.id);
      if (!web3) return;

      // Fetch transaction details
      const tx = await web3.eth.getTransaction(txHash);
      if (tx) {
        const transactionData: TransactionData = {
          hash: tx.hash,
          blockNumber: 0, // Pending transaction
          from: tx.from,
          to: tx.to || '',
          value: tx.value,
          gasPrice: tx.gasPrice,
          gasLimit: tx.gas,
          status: true, // Pending
          timestamp: new Date(),
          logs: []
        };

        // Add to buffer
        this.transactionBuffer.push(transactionData);
        if (this.transactionBuffer.length > this.config.bufferSize) {
          this.transactionBuffer.shift();
        }

        this.totalTransactions++;

        // Emit transaction event
        this.emit('pending-transaction', { transaction: transactionData, node, timestamp: new Date() });
      }

    } catch (error: any) {
      this.logger.error(`Failed to fetch pending transaction ${txHash}`, error);
    }
  }

  private onNewLog(node: BlockchainNode, log: any): void {
    try {
      const logData: LogData = {
        address: log.address,
        topics: log.topics,
        data: log.data,
        blockNumber: parseInt(log.blockNumber),
        transactionHash: log.transactionHash,
        logIndex: parseInt(log.logIndex),
        removed: log.removed || false
      };

      // Emit log event
      this.emit('new-log', { log: logData, node, timestamp: new Date() });

    } catch (error: any) {
      this.logger.error(`Failed to process log from ${node.name}`, error);
    }
  }

  private startBlockPolling(): void {
    // Poll for new blocks from all healthy nodes
    setInterval(async () => {
      if (!this.isRunning) return;

      const healthyNodes = this.getHealthyNodes();

      for (const node of healthyNodes) {
        try {
          const web3 = this.web3Instances.get(node.id);
          if (!web3) continue;

          const latestBlockNumber = await web3.eth.getBlockNumber();
          const health = this.nodeHealth.get(node.id);

          if (health && latestBlockNumber > health.blockNumber) {
            // New blocks available, fetch them
            for (let blockNum = health.blockNumber + 1; blockNum <= latestBlockNumber; blockNum++) {
              const blockHeader = await web3.eth.getBlock(blockNum);
              await this.fetchFullBlock(node, blockHeader);
            }
          }

        } catch (error: any) {
          this.logger.error(`Failed to poll blocks from ${node.name}`, error);
          this.updateNodeHealth(node.id, 'degraded');
        }
      }
    }, this.config.polling.blockInterval);
  }

  private startHealthMonitoring(): void {
    // Health check each node periodically
    for (const node of this.config.nodes) {
      const timer = setInterval(() => {
        this.performHealthCheck(node);
      }, node.healthCheckInterval);

      this.healthCheckTimers.set(node.id, timer);
    }
  }

  private async performHealthCheck(node: BlockchainNode): Promise<void> {
    try {
      const web3 = this.web3Instances.get(node.id);
      if (!web3) {
        this.updateNodeHealth(node.id, 'offline');
        return;
      }

      const startTime = Date.now();
      const blockNumber = await web3.eth.getBlockNumber();
      const responseTime = Date.now() - startTime;

      this.requestLatencies.push(responseTime);
      if (this.requestLatencies.length > 100) {
        this.requestLatencies.shift();
      }

      // Check sync status
      let syncStatus: RPCHealth['syncStatus'] = 'synced';
      try {
        const syncData = await web3.eth.getSyncing();
        if (syncData !== false) {
          syncStatus = 'syncing';
        }
      } catch (error) {
        syncStatus = 'unknown';
      }

      // Determine health status based on response time and sync status
      let status: RPCHealth['status'] = 'healthy';
      if (responseTime > 2000) {
        status = 'degraded';
      }
      if (responseTime > 5000 || syncStatus === 'syncing') {
        status = 'unhealthy';
      }

      this.updateNodeHealth(node.id, status, {
        responseTime,
        blockNumber,
        lastBlock: new Date(),
        syncStatus
      });

    } catch (error: any) {
      this.logger.error(`Health check failed for ${node.name}`, error);
      this.updateNodeHealth(node.id, 'unhealthy');

      // Schedule reconnection if too many failures
      const health = this.nodeHealth.get(node.id);
      if (health && health.errors >= this.config.failoverThreshold) {
        this.scheduleReconnect(node);
      }
    }
  }

  private updateNodeHealth(nodeId: string, status: RPCHealth['status'], updates?: Partial<RPCHealth>): void {
    const health = this.nodeHealth.get(nodeId);
    if (!health) return;

    health.status = status;
    health.lastBlock = new Date();

    if (updates) {
      Object.assign(health, updates);
    }

    if (status === 'unhealthy' || status === 'offline') {
      health.errors++;
    }
  }

  private scheduleReconnect(node: BlockchainNode): void {
    const health = this.nodeHealth.get(node.id);
    if (!health) return;

    // Exponential backoff
    const baseDelay = 5000; // 5 seconds
    const maxDelay = baseDelay * Math.pow(2, Math.min(health.errors, 5)); // Max 160 seconds
    const delay = Math.min(maxDelay, 300000); // Max 5 minutes

    this.logger.info(`Scheduling reconnect to ${node.name} in ${Math.round(delay / 1000)}s`);

    const timer = setTimeout(() => {
      if (this.isRunning) {
        this.connectToNode(node);
      }
    }, delay);

    this.reconnectTimers.set(node.id, timer);
  }

  private getHealthyNodes(): BlockchainNode[] {
    return this.config.nodes.filter(node => {
      const health = this.nodeHealth.get(node.id);
      return health && health.status === 'healthy';
    });
  }

  getStatus(): string {
    const healthyCount = Array.from(this.nodeHealth.values())
      .filter(h => h.status === 'healthy').length;

    return this.isRunning ? `Running (${healthyCount}/${this.config.nodes.length} healthy)` : 'Stopped';
  }
}
