/**
 * =========================================
 * ETHEREUM CLIENT
 * =========================================
 * Ethereum blockchain client with WebSocket and RPC support
 * for real-time transaction monitoring and block subscription
 */

import { EventEmitter } from 'events';
import Web3 from 'web3';
import { ChainConfig, RPCProvider, ChainClient, TransactionData, BlockData, TransactionType } from '../../types';
import { Logger } from '../../utils/Logger';
import { safeCast } from '../../utils/TypeUtils'; // Import safeCast

export class EthereumClient extends EventEmitter implements ChainClient {
  private config: ChainConfig;
  private providers: RPCProvider[];
  private web3: Web3 | null = null;
  private wsProvider: any = null;
  private logger: Logger;
  private isConnectedState: boolean = false; // Internal state to manage connection status
  private currentBlock: number = 0;
  private subscriptions: Map<string, any> = new Map();

  constructor(config: ChainConfig, providers: RPCProvider[]) {
    super();
    this.config = config;
    this.providers = providers;
    this.logger = new Logger('EthereumClient');
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.isConnectedState;
  }

  /**
   * Get current block number
   */
  getCurrentBlock(): number {
    return this.currentBlock;
  }

  /**
   * Initialize the Ethereum client
   */
  async initialize(): Promise<void> {
    try {
      // Find best available provider
      const bestProvider = this.findBestProvider();

      if (!bestProvider) {
        throw new Error('No healthy providers available');
      }

      // Initialize Web3 with HTTP provider for RPC calls
      this.web3 = new Web3(bestProvider.url);

      // Initialize WebSocket provider for real-time subscriptions
      const wsUrl = this.config.wsUrls[0]; // Use first WebSocket URL
      if (wsUrl) {
        this.wsProvider = new Web3.providers.WebsocketProvider(wsUrl, {
          timeout: 30000,
          // reconnect property is not supported by Web3.providers.WebsocketProvider
        } as any); // Cast to any to bypass strict type checking for the WebSocketProvider options

        this.web3.setProvider(this.wsProvider);

        // Handle WebSocket connection events
        this.wsProvider.on('connect', () => {
          this.logger.info('Ethereum WebSocket connected');
          this.isConnectedState = true; // Update internal state
          this.emit('connected');
        });

        this.wsProvider.on('error', (error: any) => {
          this.logger.error('Ethereum WebSocket error', error);
          this.isConnectedState = false; // Update internal state
          this.emit('error', error);
        });

        this.wsProvider.on('end', () => {
          this.logger.warn('Ethereum WebSocket disconnected');
          this.isConnectedState = false; // Update internal state
          this.emit('disconnected');
          // Attempt to re-initialize or reconnect if needed, possibly using a reconnection manager
        });
      }

      // Test connection
      await this.testConnection();

      // Get current block number
      this.currentBlock = safeCast<number>(await this.web3.eth.getBlockNumber(), 'number', 'blockNumber');

      this.isConnectedState = true; // Update internal state
      this.logger.info('✅ Ethereum client initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Ethereum client', error);
      throw error;
    }
  }

  /**
   * Subscribe to new blocks
   */
  async subscribeToBlocks(): Promise<any> {
    if (!this.web3 || !this.wsProvider) {
      throw new Error('Client not initialized');
    }

    const subscriptionId = `blocks_${Date.now()}`;

    try {
      const subscription = await this.web3.eth.subscribe('newBlockHeaders'); // Await the subscription

      subscription.on('data', (blockHeader: any) => {
        this.handleNewBlock(blockHeader);
      });

      subscription.on('error', (error: any) => {
        this.logger.error('Block subscription error', error);
        this.emit('error', error);
      });

      this.subscriptions.set(subscriptionId, subscription);
      this.logger.info('📦 Subscribed to new Ethereum blocks');

      return {
        id: subscriptionId,
        unsubscribe: async () => {
          await subscription.unsubscribe();
          this.subscriptions.delete(subscriptionId);
        }
      };

    } catch (error: any) {
      this.logger.error('Failed to subscribe to blocks', error);
      throw error;
    }
  }

  /**
   * Subscribe to transactions
   */
  async subscribeToTransactions(options: any): Promise<any> {
    if (!this.web3 || !this.wsProvider) {
      throw new Error('Client not initialized');
    }

    const subscriptionId = `transactions_${Date.now()}`;

    try {
      const subscription = await this.web3.eth.subscribe('pendingTransactions'); // Await the subscription

      subscription.on('data', async (txHash: string) => {
        try {
          const tx = await this.web3!.eth.getTransaction(txHash);
          if (tx) {
            await this.handleNewTransaction(tx);
          }
        } catch (error: any) {
          this.logger.error(`Failed to get transaction ${txHash}`, error);
        }
      });

      subscription.on('error', (error: any) => {
        this.logger.error('Transaction subscription error', error);
        this.emit('error', error);
      });

      this.subscriptions.set(subscriptionId, subscription);
      this.logger.info('💰 Subscribed to Ethereum transactions');

      return {
        id: subscriptionId,
        unsubscribe: async () => {
          await subscription.unsubscribe();
          this.subscriptions.delete(subscriptionId);
        }
      };

    } catch (error: any) {
      this.logger.error('Failed to subscribe to transactions', error);
      throw error;
    }
  }

  /**
   * Handle new block
   */
  private async handleNewBlock(blockHeader: any): Promise<void> {
    try {
      // Get full block data
      const block = await this.web3!.eth.getBlock(blockHeader.number, true);

      if (!block) {
        this.logger.warn(`Received null block for number ${blockHeader.number}`);
        return;
      }

      const blockData: BlockData = {
        number: safeCast<number>(block.number, 'number', 'block.number'),
        hash: block.hash!,
        parentHash: block.parentHash!,
        timestamp: new Date(safeCast<number>(block.timestamp, 'number', 'block.timestamp') * 1000),
        transactions: block.transactions.map((tx: any) => tx.hash!),
        gasUsed: block.gasUsed!.toString(),
        gasLimit: block.gasLimit!.toString(),
        size: safeCast<number>(block.size!, 'number', 'block.size'),
        difficulty: block.difficulty?.toString() || '0',
        totalDifficulty: block.totalDifficulty?.toString() || '0',
        miner: block.miner!,
        extraData: block.extraData!,
        chainId: this.config.chainId
      };

      this.currentBlock = safeCast<number>(blockData.number, 'number', 'blockData.number');
      this.emit('block', blockData);

    } catch (error: any) {
      this.logger.error('Failed to handle new block', error);
    }
  }

  /**
   * Handle new transaction
   */
  private async handleNewTransaction(tx: any): Promise<void> {
    try {
      const receipt = await this.web3!.eth.getTransactionReceipt(tx.hash);
      if (!receipt) {
        this.logger.warn(`Received null receipt for transaction ${tx.hash}`);
        return;
      }
      const transactionData: TransactionData = {
        hash: tx.hash!,
        chainId: this.config.chainId,
        blockNumber: safeCast<number>(tx.blockNumber, 'number', 'tx.blockNumber'),
        blockHash: tx.blockHash!,
        transactionIndex: safeCast<number>(tx.transactionIndex, 'number', 'tx.transactionIndex'),
        from: tx.from!,
        to: tx.to || null,
        value: tx.value!.toString(),
        gasPrice: tx.gasPrice!.toString(),
        gasLimit: tx.gas!.toString(),
        gasUsed: receipt.gasUsed!.toString() || '0',
        nonce: safeCast<number>(tx.nonce, 'number', 'tx.nonce'),
        timestamp: new Date(safeCast<number>(tx.timestamp, 'number', 'tx.timestamp') * 1000 || Date.now()),
        type: this.determineTransactionType(tx, receipt),
        status: receipt.status ? 'success' : 'failed',
        confirmations: this.currentBlock - safeCast<number>(tx.blockNumber || 0, 'number', 'tx.blockNumber'),
        amount: tx.value!.toString(),
        usdValue: 0,
        contractAddress: receipt.contractAddress || undefined, // Set to undefined if null or empty string
        methodName: this.extractMethodName(tx.input!),
        inputData: tx.input!,
        raw: tx,
        processedAt: new Date(),
        enrichmentLevel: 'basic'
      } as TransactionData; // Explicitly cast to TransactionData
      this.emit('transaction', transactionData);
    } catch (error: any) {
      this.logger.error(`Failed to handle transaction ${tx.hash}`, error);
    }
  }

  /**
   * Determine transaction type
   */
  private determineTransactionType(tx: any, receipt?: any): TransactionType {
    // Contract creation
    if (!tx.to && receipt?.contractAddress) {
      return 'contract_call'; // Adjusted to contract_call as per schema
    }

    // Token transfer (ERC-20 transfer method signature: 0xa9059cbb)
    if (tx.to && tx.input?.startsWith('0xa9059cbb')) {
      return 'transfer';
    }

    // DEX trade (example for Uniswap V2/V3 swapExactTokensForETH: 0x18cbafe5)
    if (tx.to && (tx.input?.startsWith('0x18cbafe5') || tx.input?.startsWith('0xf340f1a'))) {
      return 'dex_trade';
    }

    // Simple transfer (to EOA or contract without specific method call)
    if (tx.to && tx.input === '0x') {
      return 'transfer';
    }

    // Generic contract call
    if (tx.to && tx.input !== '0x') {
      return 'contract_call';
    }

    return 'transfer'; // Default to transfer if type cannot be determined
  }

  /**
   * Extract method name from transaction input
   */
  private extractMethodName(input: string): string {
    if (!input || input === '0x') return '';

    // Extract method signature (first 4 bytes after 0x)
    const methodSignature = input.substring(0, 10);

    // This would ideally decode the method signature using ABI data
    // For now, return the signature itself or a placeholder
    return `method_${methodSignature}`;
  }

  /**
   * Test connection to provider
   */
  private async testConnection(): Promise<void> {
    if (!this.web3) {
      throw new Error('Web3 not initialized');
    }

    try {
      const blockNumber = await this.web3.eth.getBlockNumber();
      this.logger.debug(`Connected to Ethereum network at block ${blockNumber}`);
    } catch (error: any) {
      throw new Error(`Failed to connect to Ethereum network: ${error.message}`);
    }
  }

  /**
   * Find the best available provider
   */
  private findBestProvider(): RPCProvider | null {
    // Sort providers by priority and health score
    const sortedProviders = this.providers
      .filter(p => p.isActive)
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return b.healthScore - a.healthScore;
      });

    return sortedProviders[0] || null;
  }

  /**
   * Get client health status
   */
  async getHealth(): Promise<any> {
    return {
      isConnected: this.isConnectedState,
      currentBlock: this.currentBlock,
      providerCount: this.providers.length,
      activeSubscriptions: this.subscriptions.size,
      lastUpdate: new Date()
    };
  }
}
