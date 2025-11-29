/**
 * =========================================
 * SOLANA CLIENT
 * =========================================
 * Solana blockchain client with WebSocket and RPC support
 */

import { EventEmitter } from 'events';
import { Connection, PublicKey, ConfirmedSignatureInfo, TransactionSignature, VersionedTransactionResponse, GetVersionedTransactionConfig, ParsedTransactionWithMeta, ParsedMessage } from '@solana/web3.js';
import { ChainConfig, RPCProvider, ChainClient, TransactionData, BlockData, TransactionType } from '../../types';
import { Logger } from '../../utils/Logger';
import { safeCast } from '../../utils/TypeUtils'; // Import safeCast

export class SolanaClient extends EventEmitter implements ChainClient {
  private config: ChainConfig;
  private providers: RPCProvider[];
  private connection: Connection | null = null;
  private logger: Logger;
  private isConnectedState: boolean = false; // Internal state
  private currentBlock: number = 0; // Use currentBlock to align with ChainClient interface
  private subscriptions: Map<string, number> = new Map(); // subscription ID mapping

  constructor(config: ChainConfig, providers: RPCProvider[]) {
    super();
    this.config = config;
    this.providers = providers;
    this.logger = new Logger('SolanaClient');
  }

  /**
   * Initialize the Solana client
   */
  async initialize(): Promise<void> {
    try {
      // Find best available provider
      const bestProvider = this.findBestProvider();

      if (!bestProvider) {
        throw new Error('No healthy providers available');
      }

      // Initialize Solana connection
      this.connection = new Connection(bestProvider.url, {
        commitment: 'confirmed',
        wsEndpoint: this.config.wsUrls[0] || '' // Ensure wsEndpoint is always a string
      });

      // Test connection
      await this.testConnection();

      // Get current slot and map to currentBlock
      this.currentBlock = await this.connection.getSlot();

      this.isConnectedState = true; // Update internal state
      this.logger.info('✅ Solana client initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Solana client', error);
      throw error;
    }
  }

  /**
   * Subscribe to new blocks (slots)
   */
  async subscribeToBlocks(): Promise<any> {
    if (!this.connection) {
      throw new Error('Client not initialized');
    }

    const subscriptionId = `blocks_${Date.now()}`;

    try {
      const subscriptionIdNum = this.connection.onSlotChange((slotInfo: any) => { // Explicitly type slotInfo
        this.handleNewSlot(slotInfo);
      });

      this.subscriptions.set(subscriptionId, subscriptionIdNum);
      this.logger.info('📦 Subscribed to new Solana slots');

      return {
        id: subscriptionId,
        unsubscribe: async () => {
          await this.connection!.removeSlotChangeListener(subscriptionIdNum);
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
    if (!this.connection) {
      throw new Error('Client not initialized');
    }

    const subscriptionId = `transactions_${Date.now()}`;

    try {
      // The onSignature method subscribes to all transactions, but it does not return a subscription ID to unsubscribe.
      // Instead, we will directly handle new signatures from the connection.
      // Solana's `onSignature` method is for *single* signatures, not a stream of pending transactions.
      // For a stream of transactions, we usually subscribe to new blocks and then fetch transactions from those blocks.
      // Since the ChainClient interface expects `subscribeToTransactions`, we'll simulate it by listening to new blocks and processing their transactions.
      
      // To fulfill the `subscribeToTransactions` requirement, we will subscribe to block confirmations and process transactions within those blocks.
      const blockSubscriptionId = await this.connection.onSlotChange((slotInfo: any) => {
        this.handleNewSlotForTransactions(slotInfo);
      });

      this.subscriptions.set(subscriptionId, blockSubscriptionId); // Store block subscription ID for unsubscribe
      this.logger.info('💰 Subscribed to Solana transactions via block changes');

      return {
        id: subscriptionId,
        unsubscribe: async () => {
          await this.connection!.removeSlotChangeListener(blockSubscriptionId);
          this.subscriptions.delete(subscriptionId);
        }
      };

    } catch (error: any) {
      this.logger.error('Failed to subscribe to transactions', error);
      throw error;
    }
  }

  /**
   * Handle new slot for transaction processing
   */
  private async handleNewSlotForTransactions(slotInfo: any): Promise<void> {
    try {
      const block = await this.connection!.getBlock(
        slotInfo.slot,
        { transactionDetails: 'signatures', rewards: false, commitment: 'confirmed', maxSupportedTransactionVersion: 0 } // Use GetVersionedBlockConfig
      ); 

      if (block && block.transactions) {
        for (const tx of block.transactions as any) { // Cast to any to bypass type issues
          if (tx.signature) {
            // Construct ConfirmedSignatureInfo object
            const signatureInfo: ConfirmedSignatureInfo = {
              signature: tx.signature,
              slot: tx.slot,
              err: tx.meta?.err || null,
              memo: tx.meta?.logMessages?.[0] || null, // Take first log message as memo if available
            };
            await this.handleNewSignature(tx.signature, signatureInfo); // Pass actual signature and constructed info
          }
        }
      }
    } catch (error: any) {
      this.logger.error(`Failed to handle new slot for transactions at slot ${slotInfo.slot}`, error);
    }
  }

  /**
   * Handle new slot
   */
  private async handleNewSlot(slotInfo: any): Promise<void> {
    try {
      this.currentBlock = slotInfo.slot;

      // Get block data for this slot
      const block = await this.connection!.getBlock(
        slotInfo.slot,
        { commitment: 'confirmed', maxSupportedTransactionVersion: 0 } // Use GetVersionedBlockConfig
      );

      if (!block) {
        this.logger.warn(`Received null block for slot ${slotInfo.slot}`);
        return;
      }

      const blockData: BlockData = {
        number: safeCast<number>(slotInfo.slot, 'number', 'slotInfo.slot'),
        hash: block.blockhash!,
        parentHash: block.previousBlockhash!,
        timestamp: new Date(safeCast<number>(block.blockTime!, 'number', 'block.blockTime') * 1000),
        transactions: block.transactions.map((tx: any) => tx.transaction.signatures[0]!),
        gasUsed: '0', // Solana doesn't have gas in the same way
        gasLimit: '0',
        size: safeCast<number>(block.transactions.length, 'number', 'block.transactions.length'),
        difficulty: '0',
        totalDifficulty: '0',
        miner: block.rewards?.[0]?.pubkey || '',
        extraData: '',
        chainId: this.config.chainId
      };

      this.emit('block', blockData);

    } catch (error: any) {
      this.logger.error('Failed to handle new slot', error);
    }
  }

  /**
   * Handle new signature
   */
  private async handleNewSignature(signature: TransactionSignature, signatureResult: ConfirmedSignatureInfo): Promise<void> {
    try {
      // Get transaction details
      const config: GetVersionedTransactionConfig = { commitment: 'confirmed', maxSupportedTransactionVersion: 0 };
      const tx: any = await this.connection!.getParsedTransaction(signature, config); // Cast to any to bypass type issues

      if (!tx || !tx.meta) {
        this.logger.warn(`Received null transaction for signature ${signature}`);
        return;
      }

      const transactionData: TransactionData = {
        hash: signature,
        chainId: this.config.chainId,
        blockNumber: safeCast<number>(tx.slot, 'number', 'tx.slot'),
        blockHash: tx.transaction?.message?.recentBlockhash?.toString() || '', // More robust access
        transactionIndex: 0, // Not directly available in ParsedTransactionWithMeta, default to 0
        from: safeCast<PublicKey>(tx.transaction?.message?.accountKeys?.[0], 'PublicKey', 'tx.transaction.message.accountKeys[0]').toString(),
        to: tx.transaction?.message?.instructions?.[0]?.programId?.toString() || null,
        value: '0',
        gasPrice: '0',
        gasLimit: '0',
        gasUsed: (tx.meta.computeUnitsConsumed || 0).toString(),
        nonce: 0,
        timestamp: new Date(safeCast<number>(tx.blockTime, 'number', 'tx.blockTime') * 1000),

        type: this.determineSolanaTransactionType(tx),
        status: tx.meta.err ? 'failed' : 'success',
        confirmations: this.currentBlock - safeCast<number>(tx.slot, 'number', 'tx.slot'),

        amount: '0',
        usdValue: 0,

        raw: tx,
        processedAt: new Date(),
        enrichmentLevel: 'basic',
        contractAddress: tx.transaction?.message?.instructions?.[0]?.programId?.toString() || undefined, // Set contractAddress here
      };

      this.emit('transaction', transactionData);

    } catch (error: any) {
      this.logger.error(`Failed to handle signature ${signature}`, error);
    }
  }

  /**
   * Determine Solana transaction type
   */
  private determineSolanaTransactionType(tx: any): TransactionType {
    const instructions = tx.transaction?.message?.instructions || []; // More robust access

    for (const instruction of instructions) {
      if (instruction.programId?.toString() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
        return 'transfer';
      }

      if (instruction.programId?.toString() === '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8') {
        return 'dex_trade';
      }
    }

    return 'contract_call';
  }

  /**
   * Test connection to provider
   */
  private async testConnection(): Promise<void> {
    if (!this.connection) {
      throw new Error('Connection not initialized');
    }

    try {
      const slot = await this.connection.getSlot();
      this.logger.debug(`Connected to Solana network at slot ${slot}`);
    } catch (error: any) {
      throw new Error(`Failed to connect to Solana network: ${error.message}`);
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
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.isConnectedState;
  }

  /**
   * Get current block number (slot in Solana)
   */
  getCurrentBlock(): number {
    return this.currentBlock;
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
