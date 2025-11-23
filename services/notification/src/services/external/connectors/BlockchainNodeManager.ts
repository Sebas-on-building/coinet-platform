/**
 * =========================================
 * ELITE BLOCKCHAIN NODE MANAGER
 * =========================================
 * World-class blockchain node connection manager handling multiple
 * blockchain networks (Ethereum, BSC, Solana, Polygon) with RPC
 * subscriptions, reorganization detection, and failover strategies.
 */

import { EventEmitter } from 'events';
import * as WebSocket from 'ws';
import { Logger } from '../../../utils/Logger';

// Custom error classes for better error handling
export class BlockchainConnectionError extends Error {
  constructor(message: string, public chain: string, public code?: string) {
    super(message);
    this.name = 'BlockchainConnectionError';
  }
}

export class BlockchainReorgError extends Error {
  constructor(message: string, public chain: string, public depth: number) {
    super(message);
    this.name = 'BlockchainReorgError';
  }
}

export class BlockchainTimeoutError extends Error {
  constructor(message: string, public chain: string, public timeout: number) {
    super(message);
    this.name = 'BlockchainTimeoutError';
  }
}

// Type guard for error type checking
function isBlockchainError(error: unknown): error is BlockchainConnectionError | BlockchainReorgError | BlockchainTimeoutError {
  return error instanceof BlockchainConnectionError ||
         error instanceof BlockchainReorgError ||
         error instanceof BlockchainTimeoutError;
}

// Union type for operation results
type BlockchainOperationResult<T> = { success: true; data: T } | { success: false; error: string };

export interface BlockchainConfig {
  enabled: boolean;
  chains: {
    ethereum: { rpcUrls: string[]; subscriptions: string[] };
    bsc: { rpcUrls: string[]; subscriptions: string[] };
    solana: { rpcUrls: string[]; subscriptions: string[] };
    polygon: { rpcUrls: string[]; subscriptions: string[] };
  };
  maxConnectionsPerChain: number;
  blockReorgTolerance: number;
  rpcTimeout: number;
  subscriptionRetryDelay: number;
  healthCheckInterval: number;
}

export interface BlockchainConnection {
  id: string;
  chain: string;
  rpcUrl: string;
  wsUrl?: string;
  ws?: WebSocket;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastBlock: number;
  lastSync: Date;
  subscriptions: string[];
  errorCount: number;
  reconnectAttempts: number;
  averageResponseTime: number;
}

export interface BlockchainMetrics {
  activeNodes: number;
  blocksProcessed: number;
  transactionsProcessed: number;
  reorganizations: number;
  averageBlockTime: number;
  rpcResponseTime: number;
  chainHealth: Record<string, boolean>;
  subscriptionStatus: Record<string, boolean>;
}

export interface BlockData {
  chain: string;
  blockNumber: number;
  hash: string;
  parentHash: string;
  timestamp: Date;
  transactions: number;
  gasUsed: number;
  gasLimit: number;
  difficulty?: number;
  size: number;
  miner?: string;
}

export interface TransactionData {
  chain: string;
  hash: string;
  blockNumber: number;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasLimit: string;
  status: boolean;
  timestamp: Date;
}

export interface ReorgData {
  chain: string;
  oldBlock: number;
  newBlock: number;
  depth: number;
  timestamp: Date;
  affectedTransactions: string[];
}

export class BlockchainNodeManager extends EventEmitter {
  private static instance: BlockchainNodeManager;
  private logger: Logger;
  private config: BlockchainConfig;
  private connections: Map<string, BlockchainConnection> = new Map();
  private chainBlocks: Map<string, number> = new Map();
  private subscriptionManagers: Map<string, any> = new Map();
  private isRunning: boolean = false;
  private metrics: BlockchainMetrics;

  constructor(config: BlockchainConfig) {
    super();
    this.logger = Logger.getInstance();
    this.config = config;
    this.metrics = this.initializeMetrics();
  }

  static getInstance(config: BlockchainConfig): BlockchainNodeManager {
    if (!BlockchainNodeManager.instance) {
      BlockchainNodeManager.instance = new BlockchainNodeManager(config);
    }
    return BlockchainNodeManager.instance;
  }

  private initializeMetrics(): BlockchainMetrics {
    return {
      activeNodes: 0,
      blocksProcessed: 0,
      transactionsProcessed: 0,
      reorganizations: 0,
      averageBlockTime: 0,
      rpcResponseTime: 0,
      chainHealth: {},
      subscriptionStatus: {}
    };
  }

  /**
   * Initialize blockchain connections
   */
  async initialize(): Promise<BlockchainOperationResult<void>> {
    if (this.isRunning) {
      const error = new BlockchainConnectionError('Blockchain Node Manager is already running', 'all');
      this.logger.error('❌ Initialization failed', { error: error.message });
      return { success: false, error: error.message };
    }

    this.logger.info('🚀 Initializing Blockchain Node Manager...');

    try {
      // Initialize connections for each configured chain
      await this.initializeChainConnections();

      this.isRunning = true;
      this.logger.info('✅ Blockchain Node Manager initialized successfully');

      // Start health monitoring
      this.startHealthMonitoring();

      return { success: true, data: undefined };

    } catch (error: unknown) {
      const errorMessage = isBlockchainError(error) ? error.message : String(error);
      this.logger.error('❌ Failed to initialize Blockchain Node Manager', { error: errorMessage });

      if (isBlockchainError(error)) {
        throw error;
      } else {
        throw new BlockchainConnectionError(`Initialization failed: ${errorMessage}`, 'all');
      }
    }
  }

  /**
   * Initialize connections for all configured chains
   */
  private async initializeChainConnections(): Promise<void> {
    const chains = Object.keys(this.config.chains) as Array<keyof typeof this.config.chains>;

    for (const chain of chains) {
      const chainConfig = this.config.chains[chain];
      await this.connectToChain(chain, chainConfig.rpcUrls, chainConfig.subscriptions);
    }
  }

  /**
   * Connect to a specific blockchain
   */
  private async connectToChain(chain: string, rpcUrls: string[], subscriptions: string[]): Promise<void> {
    // Use round-robin for RPC endpoint selection
    const rpcUrl = this.selectRpcEndpoint(rpcUrls);

    const connection: BlockchainConnection = {
      id: `${chain}-${Date.now()}`,
      chain,
      rpcUrl,
      status: 'connecting',
      lastBlock: 0,
      lastSync: new Date(),
      subscriptions,
      errorCount: 0,
      reconnectAttempts: 0,
      averageResponseTime: 0
    };

    this.connections.set(connection.id, connection);
    this.metrics.chainHealth[chain] = false;

    // Establish RPC connection and subscriptions
    await this.establishRpcConnection(connection);

    // Set up WebSocket subscription if available
    if (this.hasWebSocketSupport(chain)) {
      await this.establishWebSocketConnection(connection);
    }
  }

  /**
   * Select RPC endpoint using load balancing
   */
  private selectRpcEndpoint(rpcUrls: string[]): string {
    // Simple round-robin for now, could be enhanced with latency-based selection
    if (rpcUrls.length === 0) {
      throw new Error('No RPC endpoints available');
    }
    const endpoint = rpcUrls[0];
    if (!endpoint) {
      throw new Error('Invalid RPC endpoint');
    }
    return endpoint;
  }

  /**
   * Establish RPC connection
   */
  private async establishRpcConnection(connection: BlockchainConnection): Promise<void> {
    try {
      // Test RPC connection with timeout
      const isHealthy = await this.testRpcConnection(connection.rpcUrl);

      if (!isHealthy) {
        throw new BlockchainConnectionError(`RPC connection test failed for ${connection.chain}`, connection.chain);
      }

      // Get latest block number with retry logic
      const latestBlock = await this.getLatestBlockNumber(connection.rpcUrl, connection.chain);
      connection.lastBlock = latestBlock;
      this.chainBlocks.set(connection.chain, latestBlock);

      connection.status = 'connected';
      connection.lastSync = new Date();
      this.metrics.activeNodes++;
      this.metrics.chainHealth[connection.chain] = true;

      this.logger.info(`✅ Connected to ${connection.chain} RPC at ${connection.rpcUrl}`);

      // Set up subscription polling if WebSocket not available
      if (!this.hasWebSocketSupport(connection.chain)) {
        this.startSubscriptionPolling(connection);
      }

    } catch (error: unknown) {
      const errorMessage = isBlockchainError(error) ? error.message : String(error);
      this.logger.error(`❌ Failed to establish RPC connection for ${connection.chain}`, { error: errorMessage });

      if (error instanceof BlockchainConnectionError) {
        throw error;
      } else {
        throw new BlockchainConnectionError(`RPC connection failed: ${errorMessage}`, connection.chain);
      }
    }
  }

  /**
   * Establish WebSocket connection for real-time subscriptions
   */
  private async establishWebSocketConnection(connection: BlockchainConnection): Promise<void> {
    if (!connection.wsUrl) {
      connection.wsUrl = this.getWebSocketUrl(connection.rpcUrl, connection.chain);
    }

    try {
      // Close any existing WebSocket connection
      if (connection.ws) {
        connection.ws.close();
      }

      const ws = new (WebSocket as any)(connection.wsUrl);
      connection.ws = ws;

      ws.on('open', () => {
        this.handleWebSocketOpen(connection, ws);
      });

      ws.on('message', (data: WebSocket.RawData) => {
        this.handleWebSocketMessage(connection, data);
      });

      ws.on('error', (error: Error) => {
        this.handleWebSocketError(connection, error);
      });

      ws.on('close', (code: number, reason: Buffer) => {
        this.handleWebSocketClose(connection, code, reason);
      });

      // Set up subscription after connection is established
      setTimeout(() => {
        this.setupSubscriptions(connection, ws);
      }, 1000);

    } catch (error) {
      this.logger.error(`❌ Failed to establish WebSocket connection for ${connection.chain}`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Handle WebSocket connection open
   */
  private handleWebSocketOpen(connection: BlockchainConnection, ws: WebSocket): void {
    this.logger.info(`🔗 WebSocket connected for ${connection.chain}`);

    // Subscribe to configured topics
    for (const subscription of connection.subscriptions) {
      this.sendSubscription(ws, connection.chain, subscription);
    }
  }

  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage(connection: BlockchainConnection, data: WebSocket.RawData): void {
    try {
      const message = JSON.parse(data.toString());

      switch (message.method || message.type) {
        case 'eth_subscription':
          this.handleSubscriptionNotification(connection, message);
          break;
        case 'newHeads':
          this.handleNewBlock(connection, message);
          break;
        case 'logs':
          this.handleLogData(connection, message);
          break;
        default:
          this.logger.debug(`📨 Received WebSocket message for ${connection.chain}`, message);
      }

    } catch (error) {
      this.logger.error(`❌ Error processing WebSocket message for ${connection.chain}`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Handle WebSocket errors
   */
  private handleWebSocketError(connection: BlockchainConnection, error: Error): void {
    this.logger.error(`❌ WebSocket error for ${connection.chain}`, {
      error: error.message,
      connectionId: connection.id
    });

    connection.errorCount++;
    this.scheduleReconnection(connection);
  }

  /**
   * Handle WebSocket close
   */
  private handleWebSocketClose(connection: BlockchainConnection, code: number, reason: Buffer): void {
    this.logger.warn(`⚠️ WebSocket closed for ${connection.chain}`, {
      code,
      reason: reason.toString()
    });

    connection.status = 'disconnected';
    this.scheduleReconnection(connection);
  }

  /**
   * Handle subscription notifications
   */
  private handleSubscriptionNotification(connection: BlockchainConnection, message: any): void {
    // Handle subscription responses and notifications
    if (message.params && message.params.subscription) {
      const subscriptionId = message.params.subscription;

      switch (message.method) {
        case 'eth_subscription':
          this.processSubscriptionData(connection, message.params.result);
          break;
      }
    }
  }

  /**
   * Process subscription data based on type
   */
  private processSubscriptionData(connection: BlockchainConnection, data: any): void {
    // Route data based on subscription type
    if (data.blockNumber || data.number) {
      this.handleNewBlock(connection, { params: { result: data } });
    } else if (data.transactionHash || data.hash) {
      this.handleTransaction(connection, data);
    } else if (data.logIndex !== undefined) {
      this.handleLogData(connection, { params: { result: data } });
    }
  }

  /**
   * Handle new block notifications
   */
  private handleNewBlock(connection: BlockchainConnection, message: any): void {
    const blockData = this.normalizeBlockData(connection.chain, message.params.result);

    // Check for reorganizations
    const currentBlock = this.chainBlocks.get(connection.chain) || 0;
    if (blockData.blockNumber < currentBlock) {
      this.handleReorganization(connection, blockData, currentBlock);
    } else {
      this.chainBlocks.set(connection.chain, blockData.blockNumber);
      connection.lastBlock = blockData.blockNumber;
      connection.lastSync = new Date();

      this.metrics.blocksProcessed++;

      this.emit('block', blockData);
    }
  }

  /**
   * Handle transaction data
   */
  private handleTransaction(connection: BlockchainConnection, data: any): void {
    const txData = this.normalizeTransactionData(connection.chain, data);

    this.metrics.transactionsProcessed++;
    this.emit('transaction', txData);
  }

  /**
   * Handle log data
   */
  private handleLogData(connection: BlockchainConnection, message: any): void {
    // Process contract event logs
    const logs = message.params.result;

    if (Array.isArray(logs)) {
      for (const log of logs) {
        this.processLog(connection, log);
      }
    } else {
      this.processLog(connection, logs);
    }
  }

  /**
   * Process individual log entry
   */
  private processLog(connection: BlockchainConnection, log: any): void {
    // Extract contract events and relevant data
    const eventData = {
      chain: connection.chain,
      address: log.address,
      topics: log.topics,
      data: log.data,
      blockNumber: parseInt(log.blockNumber),
      transactionHash: log.transactionHash,
      logIndex: log.logIndex,
      timestamp: new Date()
    };

    this.emit('log', eventData);
  }

  /**
   * Handle blockchain reorganizations
   */
  private handleReorganization(connection: BlockchainConnection, newBlock: BlockData, oldBlock: number): void {
    const reorgDepth = oldBlock - newBlock.blockNumber;

    if (reorgDepth <= this.config.blockReorgTolerance) {
      this.logger.warn(`⚠️ Chain reorganization detected on ${connection.chain}`, {
        oldBlock,
        newBlock: newBlock.blockNumber,
        depth: reorgDepth
      });

      this.metrics.reorganizations++;

      const reorgData: ReorgData = {
        chain: connection.chain,
        oldBlock,
        newBlock: newBlock.blockNumber,
        depth: reorgDepth,
        timestamp: new Date(),
        affectedTransactions: []
      };

      this.emit('reorg', reorgData);
    } else {
      this.logger.error(`🚨 Deep reorganization detected on ${connection.chain}`, {
        oldBlock,
        newBlock: newBlock.blockNumber,
        depth: reorgDepth,
        tolerance: this.config.blockReorgTolerance
      });
    }
  }

  /**
   * Normalize block data across different chains
   */
  private normalizeBlockData(chain: string, blockData: any): BlockData {
    const normalized: BlockData = {
      chain,
      blockNumber: 0,
      hash: '',
      parentHash: '',
      timestamp: new Date(),
      transactions: 0,
      gasUsed: 0,
      gasLimit: 0,
      size: 0
    };

    switch (chain) {
      case 'ethereum':
      case 'bsc':
      case 'polygon':
        normalized.blockNumber = parseInt(blockData.number || blockData.blockNumber);
        normalized.hash = blockData.hash;
        normalized.parentHash = blockData.parentHash;
        normalized.timestamp = new Date(parseInt(blockData.timestamp) * 1000);
        normalized.transactions = Array.isArray(blockData.transactions) ? blockData.transactions.length : 0;
        normalized.gasUsed = parseInt(blockData.gasUsed || '0');
        normalized.gasLimit = parseInt(blockData.gasLimit || '0');
        if (blockData.difficulty) {
          normalized.difficulty = parseInt(blockData.difficulty);
        }
        normalized.size = parseInt(blockData.size || '0');
        break;

      case 'solana':
        normalized.blockNumber = parseInt(blockData.slot || blockData.blockNumber);
        normalized.hash = blockData.blockhash || blockData.hash;
        normalized.parentHash = blockData.previousBlockhash || '';
        normalized.timestamp = new Date(blockData.blockTime * 1000);
        normalized.transactions = blockData.transactions?.length || 0;
        break;
    }

    return normalized;
  }

  /**
   * Normalize transaction data
   */
  private normalizeTransactionData(chain: string, txData: any): TransactionData {
    return {
      chain,
      hash: txData.hash || txData.transactionHash,
      blockNumber: parseInt(txData.blockNumber || '0'),
      from: txData.from || '',
      to: txData.to || '',
      value: txData.value || '0',
      gasPrice: txData.gasPrice || '0',
      gasLimit: txData.gasLimit || '0',
      status: txData.status !== false,
      timestamp: new Date()
    };
  }

  /**
   * Test RPC connection health
   */
  private async testRpcConnection(rpcUrl: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.rpcTimeout);

      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_blockNumber',
          params: []
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get latest block number
   */
  private async getLatestBlockNumber(rpcUrl: string, chain: string): Promise<number> {
    const method = this.getBlockNumberMethod(chain);

    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method,
          params: []
        })
      });

      const data: any = await response.json();

      if (data.result) {
        return parseInt(data.result, 16);
      }

      throw new Error(`Failed to get block number: ${data.error?.message || 'Unknown error'}`);

    } catch (error) {
      this.logger.error(`❌ Failed to get latest block number for ${chain}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get block number method for different chains
   */
  private getBlockNumberMethod(chain: string): string {
    switch (chain) {
      case 'ethereum':
      case 'bsc':
      case 'polygon':
        return 'eth_blockNumber';
      case 'solana':
        return 'getSlot';
      default:
        return 'eth_blockNumber';
    }
  }

  /**
   * Check if chain supports WebSocket
   */
  private hasWebSocketSupport(chain: string): boolean {
    return ['ethereum', 'bsc', 'polygon'].includes(chain);
  }

  /**
   * Get WebSocket URL from RPC URL
   */
  private getWebSocketUrl(rpcUrl: string, chain: string): string {
    // Convert HTTP RPC URL to WebSocket URL
    return rpcUrl.replace('http', 'ws');
  }

  /**
   * Send subscription message
   */
  private sendSubscription(ws: WebSocket, chain: string, subscription: string): void {
    const subscriptionMessage = this.createSubscriptionMessage(chain, subscription);

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(subscriptionMessage));
      this.logger.debug(`📡 Subscribed to ${subscription} on ${chain}`);
    }
  }

  /**
   * Create subscription message for specific chain
   */
  private createSubscriptionMessage(chain: string, subscription: string): any {
    switch (chain) {
      case 'ethereum':
      case 'bsc':
      case 'polygon':
        return {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'eth_subscribe',
          params: [subscription]
        };
      case 'solana':
        return {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'slotSubscribe',
          params: []
        };
      default:
        return { type: 'subscribe', topic: subscription };
    }
  }

  /**
   * Start subscription polling for chains without WebSocket support
   */
  private startSubscriptionPolling(connection: BlockchainConnection): void {
    setInterval(async () => {
      try {
        // Poll for new blocks
        const latestBlock = await this.getLatestBlockNumber(connection.rpcUrl, connection.chain);

        if (latestBlock > connection.lastBlock) {
          // Fetch new block data
          const blockData = await this.getBlockData(connection.rpcUrl, connection.chain, latestBlock);
          this.handleNewBlock(connection, { params: { result: blockData } });
        }

      } catch (error) {
        this.logger.error(`❌ Polling error for ${connection.chain}`, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, 1000); // Poll every second
  }

  /**
   * Get block data by number
   */
  private async getBlockData(rpcUrl: string, chain: string, blockNumber: number): Promise<any> {
    const method = this.getBlockMethod(chain);

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params: [blockNumber.toString(16)]
      })
    });

    const data: any = await response.json();
    return data.result;
  }

  /**
   * Get block method for different chains
   */
  private getBlockMethod(chain: string): string {
    switch (chain) {
      case 'ethereum':
      case 'bsc':
      case 'polygon':
        return 'eth_getBlockByNumber';
      case 'solana':
        return 'getBlock';
      default:
        return 'eth_getBlockByNumber';
    }
  }

  /**
   * Set up subscriptions for WebSocket connection
   */
  private setupSubscriptions(connection: BlockchainConnection, ws: WebSocket): void {
    for (const subscription of connection.subscriptions) {
      this.sendSubscription(ws, connection.chain, subscription);
    }
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnection(connection: BlockchainConnection): void {
    if (connection.reconnectAttempts >= 5) {
      this.logger.error(`🚨 Max reconnection attempts reached for ${connection.chain}`);
      return;
    }

    connection.reconnectAttempts++;
    const delay = this.config.subscriptionRetryDelay * Math.pow(2, connection.reconnectAttempts - 1);

    this.logger.info(`🔄 Scheduling reconnection for ${connection.chain} in ${delay}ms`);

    setTimeout(() => {
      this.reconnect(connection);
    }, delay);
  }

  /**
   * Reconnect to blockchain node
   */
  private async reconnect(connection: BlockchainConnection): Promise<void> {
    try {
      connection.status = 'connecting';

      // Try next RPC URL if available
      const rpcUrls = this.config.chains[connection.chain as keyof typeof this.config.chains]?.rpcUrls || [];
      if (rpcUrls.length > 0) {
        const currentIndex = rpcUrls.indexOf(connection.rpcUrl);
        const nextIndex = (currentIndex + 1) % rpcUrls.length;
        const nextUrl = rpcUrls[nextIndex];
        if (nextUrl) {
          connection.rpcUrl = nextUrl;
        } else {
          throw new Error(`Invalid RPC URL index ${nextIndex} for chain ${connection.chain}`);
        }
      } else {
        throw new Error(`No RPC URLs available for chain ${connection.chain}`);
      }

      await this.establishRpcConnection(connection);

      if (this.hasWebSocketSupport(connection.chain)) {
        await this.establishWebSocketConnection(connection);
      }

    } catch (error) {
      this.logger.error(`❌ Reconnection failed for ${connection.chain}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      this.scheduleReconnection(connection);
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(() => {
      this.checkConnectionHealth();
      this.updateMetrics();
    }, this.config.healthCheckInterval);
  }

  /**
   * Check connection health
   */
  private checkConnectionHealth(): void {
    for (const [connectionId, connection] of Array.from(this.connections.entries())) {
      const timeSinceLastSync = Date.now() - connection.lastSync.getTime();

      // If no sync for more than 30 seconds, consider connection unhealthy
      if (timeSinceLastSync > 30000) {
        this.logger.warn(`⚠️ Connection health check failed for ${connection.chain}`);
        this.scheduleReconnection(connection);
      }
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    // Calculate average RPC response time
    const activeConnections = Array.from(this.connections.values())
      .filter(conn => conn.status === 'connected');

    if (activeConnections.length > 0) {
      const totalResponseTime = activeConnections.reduce((sum, conn) => sum + conn.averageResponseTime, 0);
      this.metrics.rpcResponseTime = totalResponseTime / activeConnections.length;
    }

    // Update chain health status
    for (const [chain, connected] of Object.entries(this.metrics.chainHealth)) {
      const connection = Array.from(this.connections.values())
        .find(conn => conn.chain === chain && conn.status === 'connected');

      this.metrics.chainHealth[chain] = !!connection;
    }
  }

  /**
   * Refresh all nodes
   */
  async refreshNodes(): Promise<void> {
    this.logger.info('🔄 Refreshing all blockchain nodes');

    for (const connection of Array.from(this.connections.values())) {
      if (connection.status === 'connected') {
        // Re-sync latest block
        try {
          const latestBlock = await this.getLatestBlockNumber(connection.rpcUrl, connection.chain);
          connection.lastBlock = latestBlock;
          connection.lastSync = new Date();
        } catch (error) {
          this.logger.error(`❌ Failed to refresh ${connection.chain}`, {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
  }

  /**
   * Stop all blockchain connections
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('🛑 Stopping Blockchain Node Manager...');

    for (const connection of Array.from(this.connections.values())) {
      if (connection.status === 'connected') {
        // Close WebSocket connections gracefully
        if (connection.ws && connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.close(1000, 'Service shutdown');
        }
      }
    }

    this.connections.clear();
    this.isRunning = false;
    this.logger.info('✅ Blockchain Node Manager stopped');
  }

  /**
   * Get current metrics
   */
  getMetrics(): BlockchainMetrics {
    return { ...this.metrics };
  }

  /**
   * Get connection details
   */
  getConnections(): BlockchainConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get current block numbers for all chains
   */
  getCurrentBlocks(): Record<string, number> {
    return Object.fromEntries(this.chainBlocks);
  }

  /**
   * Add new chain configuration
   */
  async addChain(chain: string, config: { rpcUrls: string[]; subscriptions: string[] }): Promise<void> {
    this.config.chains[chain as keyof typeof this.config.chains] = config;
    await this.connectToChain(chain, config.rpcUrls, config.subscriptions);
  }

  /**
   * Remove chain configuration
   */
  removeChain(chain: string): void {
    const connectionsToRemove = Array.from(this.connections.values())
      .filter(conn => conn.chain === chain);

    for (const connection of connectionsToRemove) {
      this.connections.delete(connection.id);
    }

    delete this.config.chains[chain as keyof typeof this.config.chains];
    delete this.metrics.chainHealth[chain];
  }
}
