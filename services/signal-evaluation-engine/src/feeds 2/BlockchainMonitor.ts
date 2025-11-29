/**
 * =========================================
 * BLOCKCHAIN TRANSACTION MONITOR
 * =========================================
 * High-performance RPC connections to blockchain nodes
 * with transaction monitoring and whale detection
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import type {
  BlockchainConfig,
  BlockUpdate,
  TransactionUpdate,
  LogEntry,
  TokenTransfer,
  DEXTrade,
  FeedHealth
} from './types';

interface RpcResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

export class BlockchainMonitor extends EventEmitter {
  private logger: Logger;
  public config: BlockchainConfig; // Changed to public to allow access from FeedManager
  private isInitialized: boolean = false;
  private isConnected: boolean = false;

  // RPC connection management
  private rpcUrls: string[];
  private currentRpcIndex: number = 0;
  private activeConnections: Map<string, any> = new Map(); // WebSocket connections for newHeads subscriptions

  // Transaction and block tracking
  private lastBlockNumber: number = 0;
  private processedTransactions: Set<string> = new Set();
  private pendingTransactions: Map<string, TransactionUpdate> = new Map();

  // Performance monitoring
  private blockCount: number = 0;
  private transactionCount: number = 0;
  private errorCount: number = 0;
  private startTime: Date = new Date();
  private lastBlockTime: Date = new Date();

  // Caching for transaction decoding
  private contractCache: Map<string, any> = new Map();
  private methodCache: Map<string, any> = new Map();

  // Whale detection
  private whaleAddresses: Set<string> = new Set();
  private whaleThresholds: Map<string, number> = new Map(); // token address -> threshold

  constructor(config: BlockchainConfig) {
    super();
    this.logger = new Logger(`BlockchainMonitor:${config.name}`);
    this.config = config;
    this.rpcUrls = [...config.rpcUrls]; // Copy array to avoid mutation
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing blockchain monitor...');

      // Reset state
      this.blockCount = 0;
      this.transactionCount = 0;
      this.errorCount = 0;
      this.startTime = new Date();
      this.lastBlockTime = new Date();
      this.processedTransactions.clear();
      this.pendingTransactions.clear();

      // Initialize whale detection
      this.initializeWhaleDetection();

      this.isInitialized = true;
      this.logger.info('✅ Blockchain monitor initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize blockchain monitor', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Blockchain monitor is not initialized');
    }

    try {
      this.logger.info('Starting blockchain monitoring...');
      await this.connectToRPC();
      await this.subscribeToNewHeads();
      this.startBlockPolling();
      this.logger.info('✅ Blockchain monitoring started successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to start blockchain monitoring', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping blockchain monitoring...');

      // Close all WebSocket connections
      for (const [url, connection] of this.activeConnections) {
        if (connection && connection.close) {
          connection.close();
        }
      }
      this.activeConnections.clear();

      this.isConnected = false;
      this.isInitialized = false;

      this.logger.info('✅ Blockchain monitoring stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop blockchain monitoring', error);
      throw error;
    }
  }

  /**
   * Subscribe to new block headers
   */
  async subscribeToNewHeads(): Promise<void> {
    const subscriptionPayload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_subscribe',
      params: ['newHeads']
    };

    try {
      const connection = await this.getWebSocketConnection();
      connection.send(JSON.stringify(subscriptionPayload));

      this.logger.info('Subscribed to new block headers');
    } catch (error: any) {
      this.logger.error('Failed to subscribe to newHeads', error);
      throw error;
    }
  }

  /**
   * Subscribe to pending transactions
   */
  async subscribeToPendingTransactions(): Promise<void> {
    const subscriptionPayload = {
      jsonrpc: '2.0',
      id: 2,
      method: 'eth_subscribe',
      params: ['newPendingTransactions']
    };

    try {
      const connection = await this.getWebSocketConnection();
      connection.send(JSON.stringify(subscriptionPayload));

      this.logger.info('Subscribed to pending transactions');
    } catch (error: any) {
      this.logger.error('Failed to subscribe to pending transactions', error);
      throw error;
    }
  }

  /**
   * Get latest block information
   */
  async getLatestBlock(): Promise<BlockUpdate> {
    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'eth_getBlockByNumber',
      params: ['latest', false]
    };

    try {
      const response = await this.makeRPCRequest(payload);
      const block = response.result as {
        number: string;
        hash: string;
        timestamp: string;
        transactions: string | string[];
        gasUsed: string;
        gasLimit: string;
        parentHash: string;
        difficulty?: string;
        totalDifficulty?: string;
      };

      const blockUpdate: BlockUpdate = {
        chain: this.config.name,
        blockNumber: parseInt(block.number, 16),
        blockHash: block.hash,
        timestamp: new Date(parseInt(block.timestamp, 16) * 1000),
        transactions: typeof block.transactions === 'string' ? parseInt(block.transactions, 16) : block.transactions.length,
        gasUsed: parseInt(block.gasUsed, 16),
        gasLimit: parseInt(block.gasLimit, 16),
        parentHash: block.parentHash,
        difficulty: block.difficulty ? parseInt(block.difficulty, 16) : undefined,
        totalDifficulty: block.totalDifficulty ? parseInt(block.totalDifficulty, 16) : undefined
      };

      return blockUpdate;
    } catch (error: any) {
      this.logger.error('Failed to get latest block', error);
      throw error;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(txHash: string): Promise<TransactionUpdate | null> {
    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'eth_getTransactionByHash',
      params: [txHash]
    };

    try {
      const response = await this.makeRPCRequest(payload);
      const tx = response.result;

      if (!tx) return null;

      // Get transaction receipt for additional data
      const receiptPayload = {
        jsonrpc: '2.0',
        id: Date.now() + 1,
        method: 'eth_getTransactionReceipt',
        params: [txHash]
      };

      const receiptResponse = await this.makeRPCRequest(receiptPayload);
      const receipt = receiptResponse.result;

      const transactionUpdate: TransactionUpdate = {
        chain: this.config.name,
        hash: tx.hash,
        blockNumber: parseInt(tx.blockNumber, 16),
        blockHash: tx.blockHash,
        timestamp: await this.getBlockTimestamp(tx.blockNumber),
        from: tx.from,
        to: tx.to,
        value: tx.value,
        gasPrice: tx.gasPrice,
        gasUsed: receipt ? receipt.gasUsed : '0',
        gasLimit: tx.gasLimit,
        status: receipt ? receipt.status === '0x1' : true,
        logs: receipt ? receipt.logs.map(this.parseLogEntry) : [],
        contractAddress: receipt ? receipt.contractAddress : undefined,
        methodName: await this.decodeTransactionInput(tx.input, tx.to),
        decodedInput: await this.decodeTransactionData(tx.input, tx.to)
      };

      return transactionUpdate;
    } catch (error: any) {
      this.logger.error('Failed to get transaction', { txHash, error: error.message });
      return null;
    }
  }

  /**
   * Process new block
   */
  async processNewBlock(blockUpdate: BlockUpdate): Promise<void> {
    this.blockCount++;
    this.lastBlockTime = new Date();

    // Update last block number
    this.lastBlockNumber = blockUpdate.blockNumber;

    // Emit block update
    this.emit('block', blockUpdate);

    // Process transactions in the block
    await this.processBlockTransactions(blockUpdate);

    this.logger.debug('Processed new block', {
      blockNumber: blockUpdate.blockNumber,
      transactionCount: blockUpdate.transactions
    });
  }

  /**
   * Process transactions in a block
   */
  private async processBlockTransactions(blockUpdate: BlockUpdate): Promise<void> {
    try {
      // Get full block with transactions
      const payload = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'eth_getBlockByNumber',
        params: [`0x${blockUpdate.blockNumber.toString(16)}`, true]
      };

      const response = await this.makeRPCRequest(payload);
      const block = response.result;

      if (!block || !block.transactions) return;

      // Process each transaction
      for (const tx of block.transactions) {
        const txHash = tx.hash;
        const transactionUpdate = await this.parseTransaction(tx, blockUpdate);

        if (transactionUpdate && !this.processedTransactions.has(txHash)) {
          this.processedTransactions.add(txHash);
          this.transactionCount++;

          // Emit transaction update
          this.emit('transaction', transactionUpdate);

          // Check for token transfers and DEX trades
          await this.processTransactionEvents(transactionUpdate);

          // Check for whale activity
          this.checkWhaleActivity(transactionUpdate);
        }
      }

      // Clean up old processed transactions (keep last 1000)
      if (this.processedTransactions.size > 1000) {
        const transactionsArray = Array.from(this.processedTransactions);
        this.processedTransactions = new Set(transactionsArray.slice(-500));
      }

    } catch (error: any) {
      this.logger.error('Failed to process block transactions', {
        blockNumber: blockUpdate.blockNumber,
        error: error.message
      });
    }
  }

  /**
   * Parse transaction data
   */
  private async parseTransaction(tx: any, blockUpdate: BlockUpdate): Promise<TransactionUpdate | null> {
    try {
      const transactionUpdate: TransactionUpdate = {
        chain: this.config.name,
        hash: tx.hash,
        blockNumber: blockUpdate.blockNumber,
        blockHash: blockUpdate.blockHash,
        timestamp: blockUpdate.timestamp,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        gasPrice: tx.gasPrice,
        gasUsed: '0', // Will be updated from receipt
        gasLimit: tx.gasLimit,
        status: true, // Assume success unless receipt shows otherwise
        logs: [],
        methodName: await this.decodeTransactionInput(tx.input, tx.to),
        decodedInput: await this.decodeTransactionData(tx.input, tx.to)
      };

      return transactionUpdate;
    } catch (error: any) {
      this.logger.error('Failed to parse transaction', { txHash: tx.hash, error: error.message });
      return null;
    }
  }

  /**
   * Process transaction events (transfers, DEX trades)
   */
  private async processTransactionEvents(transaction: TransactionUpdate): Promise<void> {
    try {
      // Process logs for token transfers and DEX trades
      for (const log of transaction.logs) {
        // Check for ERC-20 transfers
        if (this.isTokenTransfer(log)) {
          const transfer = await this.parseTokenTransfer(log, transaction);
          if (transfer) {
            this.emit('tokenTransfer', transfer);
          }
        }

        // Check for DEX trades (simplified detection)
        if (this.isDEXTrade(log)) {
          const trade = await this.parseDEXTrade(log, transaction);
          if (trade) {
            this.emit('dexTrade', trade);
          }
        }
      }
    } catch (error: any) {
      this.logger.error('Failed to process transaction events', {
        txHash: transaction.hash,
        error: error.message
      });
    }
  }

  /**
   * Check if log entry is a token transfer
   */
  private isTokenTransfer(log: LogEntry): boolean {
    // ERC-20 Transfer event signature
    const transferSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    return log.topics[0] === transferSignature && log.topics.length >= 3;
  }

  /**
   * Parse token transfer from log
   */
  private async parseTokenTransfer(log: LogEntry, transaction: TransactionUpdate): Promise<TokenTransfer | null> {
    try {
      const tokenAddress = log.address;
      const from = '0x' + log.topics[1].slice(-40);
      const to = '0x' + log.topics[2].slice(-40);
      const amount = log.data;

      // Get token metadata (cached)
      const tokenInfo = await this.getTokenInfo(tokenAddress);

      const transfer: TokenTransfer = {
        chain: this.config.name,
        transactionHash: transaction.hash,
        blockNumber: transaction.blockNumber,
        from,
        to,
        tokenAddress,
        tokenSymbol: tokenInfo?.symbol,
        tokenName: tokenInfo?.name,
        amount,
        decimals: tokenInfo?.decimals || 18,
        timestamp: transaction.timestamp
      };

      return transfer;
    } catch (error: any) {
      this.logger.error('Failed to parse token transfer', {
        txHash: transaction.hash,
        logIndex: log.logIndex,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Check if log entry is a DEX trade
   */
  private isDEXTrade(log: LogEntry): boolean {
    // Common DEX event signatures (simplified)
    const dexSignatures = [
      '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1', // Uniswap V2 Swap
      '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822'  // Uniswap V3 Swap
    ];

    return dexSignatures.includes(log.topics[0]);
  }

  /**
   * Parse DEX trade from log
   */
  private async parseDEXTrade(log: LogEntry, transaction: TransactionUpdate): Promise<DEXTrade | null> {
    try {
      // Simplified DEX trade parsing
      const exchange = 'uniswap'; // Would detect based on contract address
      const pairAddress = log.address;
      const amount0In = log.data.slice(2, 66); // First 32 bytes
      const amount1In = log.data.slice(66, 130); // Next 32 bytes
      const amount0Out = log.data.slice(130, 194);
      const amount1Out = log.data.slice(194, 258);

      // Determine token in/out based on amounts
      const tokenIn = amount0In !== '0' ? 'token0' : 'token1';
      const tokenOut = amount0Out !== '0' ? 'token0' : 'token1';

      const trade: DEXTrade = {
        chain: this.config.name,
        transactionHash: transaction.hash,
        blockNumber: transaction.blockNumber,
        exchange,
        pairAddress,
        tokenIn,
        tokenOut,
        amountIn: amount0In !== '0' ? amount0In : amount1In,
        amountOut: amount0Out !== '0' ? amount0Out : amount1Out,
        price: 0, // Would calculate based on amounts
        timestamp: transaction.timestamp,
        maker: transaction.from,
        taker: transaction.from // Simplified
      };

      return trade;
    } catch (error: any) {
      this.logger.error('Failed to parse DEX trade', {
        txHash: transaction.hash,
        logIndex: log.logIndex,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Decode transaction input data
   */
  private async decodeTransactionInput(input: string, to?: string): Promise<string | undefined> {
    if (!input || input === '0x') return undefined;

    try {
      // Check cache first
      const cacheKey = `${to}_${input.slice(0, 10)}`;
      if (this.methodCache.has(cacheKey)) {
        return this.methodCache.get(cacheKey);
      }

      // Decode method signature (first 4 bytes)
      const methodSignature = input.slice(0, 10);

      // Simplified method name resolution
      const methodName = await this.resolveMethodName(methodSignature, to);

      if (methodName) {
        this.methodCache.set(cacheKey, methodName);
      }

      return methodName;
    } catch (error: any) {
      this.logger.error('Failed to decode transaction input', { input: input.slice(0, 20), error: error.message });
      return undefined;
    }
  }

  /**
   * Decode full transaction data
   */
  private async decodeTransactionData(input: string, to?: string): Promise<any> {
    // Simplified transaction data decoding
    // In production, would use proper ABI decoding
    return {
      method: await this.decodeTransactionInput(input, to),
      params: input.slice(10) // Remove method signature
    };
  }

  /**
   * Resolve method name from signature
   */
  private async resolveMethodName(signature: string, contractAddress?: string): Promise<string | undefined> {
    // Simplified method resolution
    // In production, would maintain ABI database or use external service
    const commonMethods: Record<string, string> = {
      '0xa9059cbb': 'transfer', // ERC-20 transfer
      '0x70a08231': 'balanceOf', // ERC-20 balanceOf
      '0x095ea7b3': 'approve', // ERC-20 approve
      '0x23b872dd': 'transferFrom', // ERC-20 transferFrom
      '0x7ff36ab5': 'swapExactETHForTokens', // Uniswap swap
      '0x18cbafe5': 'swapExactTokensForETH' // Uniswap swap
    };

    return commonMethods[signature];
  }

  /**
   * Get token information
   */
  private async getTokenInfo(tokenAddress: string): Promise<any> {
    // Check cache first
    if (this.contractCache.has(tokenAddress)) {
      return this.contractCache.get(tokenAddress);
    }

    try {
      // Get token metadata
      const symbolPayload = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'eth_call',
        params: [{
          to: tokenAddress,
          data: '0x95d89b41' // symbol() method
        }, 'latest']
      };

      const namePayload = {
        jsonrpc: '2.0',
        id: Date.now() + 1,
        method: 'eth_call',
        params: [{
          to: tokenAddress,
          data: '0x06fdde03' // name() method
        }, 'latest']
      };

      const decimalsPayload = {
        jsonrpc: '2.0',
        id: Date.now() + 2,
        method: 'eth_call',
        params: [{
          to: tokenAddress,
          data: '0x313ce567' // decimals() method
        }, 'latest']
      };

      const [symbolResponse, nameResponse, decimalsResponse] = await Promise.all([
        this.makeRPCRequest(symbolPayload),
        this.makeRPCRequest(namePayload),
        this.makeRPCRequest(decimalsPayload)
      ]);

      const tokenInfo = {
        address: tokenAddress,
        symbol: this.decodeHexString(symbolResponse.result),
        name: this.decodeHexString(nameResponse.result),
        decimals: parseInt(decimalsResponse.result, 16)
      };

      this.contractCache.set(tokenAddress, tokenInfo);
      return tokenInfo;

    } catch (error: any) {
      this.logger.error('Failed to get token info', { tokenAddress, error: error.message });
      return null;
    }
  }

  /**
   * Decode hex string to UTF-8
   */
  private decodeHexString(hex: string): string {
    if (!hex || hex === '0x') return '';

    try {
      // Remove 0x prefix and decode
      const cleanHex = hex.replace('0x', '');
      const bytes = Buffer.from(cleanHex, 'hex');
      return bytes.toString('utf8').replace(/\0/g, ''); // Remove null bytes
    } catch {
      return '';
    }
  }

  /**
   * Get WebSocket connection for subscriptions
   */
  private async getWebSocketConnection(): Promise<any> {
    const rpcUrl = this.rpcUrls[this.currentRpcIndex];

    if (!this.activeConnections.has(rpcUrl)) {
      const WebSocket = require('ws');
      const connection = new WebSocket(rpcUrl.replace('http', 'ws').replace('https', 'wss'));

      await new Promise((resolve, reject) => {
        connection.on('open', () => resolve(connection));
        connection.on('error', reject);

        setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
      });

      this.activeConnections.set(rpcUrl, connection);
    }

    return this.activeConnections.get(rpcUrl);
  }

  /**
   * Make RPC request with retry logic
   */
  private async makeRPCRequest(payload: any, retryCount: number = 0): Promise<RpcResponse> {
    const rpcUrl = this.rpcUrls[this.currentRpcIndex];

    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as RpcResponse;

      if (result.error) {
        throw new Error(`RPC Error: ${result.error.message}`);
      }

      return result;

    } catch (error: any) {
      this.errorCount++;

      // Try next RPC endpoint if available
      if (retryCount < this.config.retryConfig.maxRetries && this.rpcUrls.length > 1) {
        this.currentRpcIndex = (this.currentRpcIndex + 1) % this.rpcUrls.length;
        await new Promise(resolve => setTimeout(resolve, this.config.retryConfig.baseDelay * Math.pow(2, retryCount)));
        return this.makeRPCRequest(payload, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Connect to RPC endpoint
   */
  private async connectToRPC(): Promise<void> {
    try {
      // Test connection with a simple RPC call
      const payload = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'eth_blockNumber',
        params: []
      };

      const response = await this.makeRPCRequest(payload);
      const blockNumber = parseInt(response.result, 16);

      this.lastBlockNumber = blockNumber;
      this.isConnected = true;

      this.logger.info('Connected to RPC endpoint', { blockNumber });

    } catch (error: any) {
      this.logger.error('Failed to connect to RPC', error);
      throw error;
    }
  }

  /**
   * Start block polling for blockchains without WebSocket subscriptions
   */
  private startBlockPolling(): void {
    setInterval(async () => {
      try {
        const latestBlock = await this.getLatestBlock();

        if (latestBlock.blockNumber > this.lastBlockNumber) {
          await this.processNewBlock(latestBlock);
        }
      } catch (error: any) {
        this.logger.error('Block polling failed', error);
      }
    }, this.config.blockTime * 1000);
  }

  /**
   * Get block timestamp
   */
  private async getBlockTimestamp(blockNumber: string): Promise<Date> {
    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'eth_getBlockByNumber',
      params: [blockNumber, false]
    };

    const response = await this.makeRPCRequest(payload);
    const block = response.result as any;

    return new Date(parseInt(block.timestamp, 16) * 1000);
  }

  /**
   * Parse log entry
   */
  private parseLogEntry(log: any): LogEntry {
    return {
      address: log.address,
      topics: log.topics,
      data: log.data,
      logIndex: parseInt(log.logIndex, 16),
      removed: log.removed || false,
      transactionHash: log.transactionHash,
      transactionIndex: parseInt(log.transactionIndex, 16),
      blockNumber: parseInt(log.blockNumber, 16),
      blockHash: log.blockHash
    };
  }

  /**
   * Initialize whale detection
   */
  private initializeWhaleDetection(): void {
    // Initialize with known whale addresses and thresholds
    // In production, would load from database or configuration
    this.whaleThresholds.set('0xa0b86a33e6c6bb2b0b0c0e0d8f0b8b8b8b8b8b8b8b8b8b8b8', 1000000); // Example
  }

  /**
   * Check for whale activity
   */
  private checkWhaleActivity(transaction: TransactionUpdate): void {
    const value = parseInt(transaction.value, 16) / 1e18; // Convert from wei

    // Check if transaction involves whale addresses
    if (this.whaleAddresses.has(transaction.from) || this.whaleAddresses.has(transaction.to || '')) {
      this.emit('whaleActivity', {
        type: 'whale_transaction',
        transaction,
        value,
        timestamp: transaction.timestamp
      });
    }

    // Check transaction value against thresholds
    for (const [tokenAddress, threshold] of this.whaleThresholds) {
      if (value >= threshold) {
        this.emit('largeTransaction', {
          transaction,
          value,
          threshold,
          timestamp: transaction.timestamp
        });
      }
    }
  }

  /**
   * Get current health status
   */
  getHealth(): FeedHealth {
    const now = new Date();
    const uptime = now.getTime() - this.startTime.getTime();
    const uptimeHours = uptime / (1000 * 60 * 60);

    return {
      feedType: 'blockchain',
      provider: this.config.name,
      status: this.calculateHealthStatus(),
      latency: this.calculateAverageLatency(),
      lastUpdate: this.lastBlockTime,
      errorRate: uptimeHours > 0 ? (this.errorCount / uptimeHours) : 0,
      throughput: uptimeHours > 0 ? (this.transactionCount / uptimeHours) : 0,
      uptime: 100, // Simplified
      reconnectCount: 0, // Would track actual reconnects
      bufferSize: this.pendingTransactions.size
    };
  }

  /**
   * Calculate average latency
   */
  private calculateAverageLatency(): number {
    // Simplified latency calculation
    return 500; // Placeholder - would track actual RPC response times
  }

  /**
   * Calculate health status
   */
  private calculateHealthStatus(): 'healthy' | 'degraded' | 'unhealthy' | 'offline' {
    if (!this.isConnected) {
      return 'offline';
    }

    const timeSinceLastBlock = Date.now() - this.lastBlockTime.getTime();
    const errorRate = this.errorCount / Math.max(1, this.transactionCount);

    if (timeSinceLastBlock > 60000) { // 1 minute
      return 'unhealthy';
    }

    if (errorRate > 0.1 || timeSinceLastBlock > 30000) { // 30 seconds
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get current status
   */
  getStatus(): string {
    return this.isConnected ? 'Connected' : 'Disconnected';
  }

  /**
   * Get monitoring statistics
   */
  getStats(): {
    connected: boolean;
    lastBlockNumber: number;
    transactionCount: number;
    errorCount: number;
    activeConnections: number;
    pendingTransactions: number;
    uptime: number;
  } {
    const uptime = Date.now() - this.startTime.getTime();

    return {
      connected: this.isConnected,
      lastBlockNumber: this.lastBlockNumber,
      transactionCount: this.transactionCount,
      errorCount: this.errorCount,
      activeConnections: this.activeConnections.size,
      pendingTransactions: this.pendingTransactions.size,
      uptime
    };
  }
}
