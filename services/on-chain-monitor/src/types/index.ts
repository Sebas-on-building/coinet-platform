/**
 * =========================================
 * ON-CHAIN MONITORING TYPES
 * =========================================
 * Core type definitions for on-chain transaction monitoring
 */

import { EventEmitter } from 'events';

export type ChainType = 'ethereum' | 'bsc' | 'solana' | 'polygon' | 'arbitrum' | 'optimism' | 'avalanche';

export type TransactionType = 'transfer' | 'contract_call' | 'dex_trade' | 'bridge' | 'mint' | 'burn' | 'approval';

export type DataType = 'transactions' | 'blocks' | 'logs';

export type WhaleType = 'institutional' | 'whale' | 'smart_money' | 'dex_trader' | 'bridge_user';

export interface ChainConfig {
  chainId: number;
  name: string;
  type: ChainType;
  rpcUrls: string[];
  wsUrls: string[];
  blockTime: number; // seconds
  confirmations: number;
  nativeToken: string;
  explorerUrl: string;
  supportsEIP1559: boolean;
}

export interface RPCProvider {
  id: string;
  url: string;
  type: 'full_node' | 'rpc_provider' | 'infura' | 'alchemy' | 'quicknode';
  apiKey?: string;
  rateLimit: number; // requests per second
  priority: number; // 1 = highest priority
  isActive: boolean;
  healthScore: number; // 0-100
  lastHealthCheck: Date;
}

export interface TransactionData {
  // Core transaction fields
  hash: string;
  chainId: number;
  blockNumber: number;
  blockHash: string;
  transactionIndex: number;
  from: string;
  to: string | null;
  value: string;
  gasPrice: string;
  gasLimit: string;
  gasUsed: string;
  nonce: number;
  timestamp: Date;

  // Transaction type and metadata
  type: TransactionType;
  status: 'success' | 'failed' | 'pending';
  confirmations: number;

  // Value and volume
  amount: string; // Wei or native token amount
  usdValue?: number; // USD value at time of transaction

  // Contract interaction
  contractAddress: string | undefined | null; // Changed to allow undefined or null
  methodName?: string;
  inputData?: string;

  // Token transfer details
  tokenAddress?: string;
  tokenSymbol?: string;
  tokenName?: string;
  tokenDecimals?: number;

  // DEX trade details
  dexName?: string;
  pairAddress?: string;
  side?: 'buy' | 'sell';

  // Bridge details
  bridgeName?: string;
  sourceChain?: string;
  destinationChain?: string;

  // Enriched metadata
  contractName?: string;
  contractVerified?: boolean;
  whaleScore?: number; // 0-100
  whaleType?: WhaleType;

  // Raw transaction data
  raw: any;

  // Processing metadata
  processedAt: Date;
  enrichmentLevel: 'basic' | 'standard' | 'enhanced';
}

export interface BlockData {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: Date;
  transactions: string[]; // transaction hashes
  gasUsed: string;
  gasLimit: string;
  size: number;
  difficulty?: string;
  totalDifficulty?: string;
  miner: string;
  extraData: string;
  chainId: number;
}

export interface WhaleCluster {
  id: string;
  addresses: string[];
  type: WhaleType;
  score: number; // 0-100
  totalVolume: string;
  transactionCount: number;
  firstSeen: Date;
  lastSeen: Date;
  tags: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ChainMetrics {
  chainId: number;
  totalTransactions: number;
  totalBlocks: number;
  averageBlockTime: number;
  averageGasPrice: string;
  totalGasUsed: string;
  activeWhales: number;
  whaleVolume: string;
  reorgCount: number;
  lastBlock: number;
  lastUpdate: Date;
}

export interface NodeHealth {
  providerId: string;
  isHealthy: boolean;
  responseTime: number;
  blockHeight: number;
  syncStatus: 'synced' | 'syncing' | 'behind';
  lastCheck: Date;
  errorMessage?: string;
}

export interface ProcessingMetrics {
  totalTransactions: number;
  totalBlocks: number;
  averageLatency: number;
  errorRate: number;
  enrichmentRate: number;
  whaleDetectionRate: number;
  cacheHitRate: number;
  uptime: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  checks: Record<string, boolean>;
  issues: string[];
}

export interface ChainClient extends EventEmitter {
  initialize(): Promise<void>;
  subscribeToBlocks(): Promise<any>;
  subscribeToTransactions(options?: any): Promise<any>;
  isConnected(): boolean;
  getCurrentBlock(): number;
  getHealth(): Promise<any>;
}
