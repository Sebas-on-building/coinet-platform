/**
 * Core type definitions for Alchemy Whales Service
 */

import { z } from 'zod';

/**
 * Supported blockchain networks
 */
export enum Chain {
  ETHEREUM = 'ethereum',
  POLYGON = 'polygon',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  BASE = 'base',
}

/**
 * Transfer categories based on Alchemy classification
 */
export enum TransferCategory {
  EXTERNAL = 'external',      // EOA to EOA or EOA to contract
  INTERNAL = 'internal',      // Contract internal transfers
  ERC20 = 'erc20',            // ERC-20 token transfers
  ERC721 = 'erc721',          // ERC-721 NFT transfers
  ERC1155 = 'erc1155',        // ERC-1155 multi-token transfers
  SPECIALNFT = 'specialnft',  // Special NFT types
}

/**
 * Whale classification tiers
 */
export enum WhaleTier {
  WHALE = 'whale',              // $100K - $1M
  LARGE_WHALE = 'large_whale',  // $1M - $10M
  MEGA_WHALE = 'mega_whale',    // $10M+
}

/**
 * Transfer direction
 */
export enum TransferDirection {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing',
}

/**
 * Address entity types
 */
export enum EntityType {
  EOA = 'eoa',                    // Externally Owned Account
  CONTRACT = 'contract',          // Smart Contract
  EXCHANGE = 'exchange',          // Exchange wallet
  WHALE = 'whale',                // Known whale
  DEFI_PROTOCOL = 'defi_protocol',// DeFi protocol
  BRIDGE = 'bridge',              // Cross-chain bridge
  UNKNOWN = 'unknown',            // Unknown entity
}

/**
 * Alchemy Transfer API response structure
 */
export interface AlchemyTransfer {
  blockNum: string;
  hash: string;
  from: string;
  to: string | null;
  value: number | null;
  erc721TokenId: string | null;
  erc1155Metadata: Array<{
    tokenId: string;
    value: string;
  }> | null;
  tokenId: string | null;
  asset: string | null;
  category: TransferCategory;
  rawContract: {
    value: string | null;
    address: string | null;
    decimal: string | null;
  };
  metadata: {
    blockTimestamp: string;
  };
}

/**
 * Normalized transfer with USD value and enrichment
 */
export interface NormalizedTransfer {
  id: string;
  chain: Chain;
  blockNumber: number;
  blockTimestamp: Date;
  transactionHash: string;
  from: string;
  to: string | null;
  value: string;
  valueUsd: number;
  category: TransferCategory;
  direction: TransferDirection;
  asset: {
    address: string | null;
    symbol: string | null;
    decimals: number | null;
    name: string | null;
  };
  tokenId: string | null;
  whaleTier: WhaleTier | null;
  fromEntity: EntityLabel | null;
  toEntity: EntityLabel | null;
  metadata: Record<string, any>;
}

/**
 * Entity label information
 */
export interface EntityLabel {
  address: string;
  name: string | null;
  type: EntityType;
  labels: string[];
  metadata: {
    source?: string;          // arkham, nansen, internal
    confidence?: number;      // 0-1
    lastUpdated?: Date;
    isContract?: boolean;
    contractName?: string;
    isExchange?: boolean;
    exchangeName?: string;
  };
}

/**
 * Whale profile
 */
export interface WhaleProfile {
  address: string;
  chain: Chain;
  totalTransfers: number;
  totalValueUsd: number;
  largestTransferUsd: number;
  averageTransferUsd: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  tier: WhaleTier;
  labels: EntityLabel | null;
  behaviorScore: number;      // 0-100
  riskScore: number;          // 0-100
}

/**
 * Webhook event payload
 */
export interface WebhookEvent {
  id: string;
  type: 'ADDRESS_ACTIVITY' | 'DROPPED_TRANSACTION';
  createdAt: Date;
  event: {
    network: string;
    activity: AlchemyTransfer[];
  };
}

/**
 * Transfer query parameters
 */
export const TransferQuerySchema = z.object({
  address: z.string().optional(),
  chain: z.nativeEnum(Chain),
  fromBlock: z.string().or(z.number()).optional(),
  toBlock: z.string().or(z.number()).optional(),
  category: z.array(z.nativeEnum(TransferCategory)).optional(),
  minValueUsd: z.number().optional(),
  maxValueUsd: z.number().optional(),
  limit: z.number().min(1).max(1000).default(100),
  pageKey: z.string().optional(),
});

export type TransferQuery = z.infer<typeof TransferQuerySchema>;

/**
 * Whale alert configuration
 */
export interface WhaleAlertConfig {
  id: string;
  chains: Chain[];
  minValueUsd: number;
  categories: TransferCategory[];
  webhookUrl: string;
  webhookSecret: string;
  filters?: {
    excludeAddresses?: string[];
    includeAddresses?: string[];
    excludeContracts?: boolean;
  };
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  maxRequestsPerSecond: number;
  maxConcurrent: number;
  reservoir: number;
  reservoirRefreshAmount: number;
  reservoirRefreshInterval: number;
  minTime: number;
  highWater?: number;
  strategy?: 'leak' | 'overflow';
}

/**
 * Service configuration
 */
export interface ServiceConfig {
  alchemy: {
    apiKeys: {
      [key in Chain]: string;
    };
  };
  rateLimit: RateLimiterConfig;
  whaleThresholds: {
    whale: number;
    largeWhale: number;
    megaWhale: number;
  };
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl: boolean;
    poolMin: number;
    poolMax: number;
  };
  redis: {
    host: string;
    port: number;
    password: string;
    db: number;
    keyPrefix: string;
  };
  webhook: {
    port: number;
    path: string;
    secret: string;
  };
  metrics: {
    port: number;
    path: string;
  };
  performance: {
    batchSize: number;
    batchIntervalMs: number;
    maxBlockRange: number;
    enableAsyncBatching: boolean;
  };
  features: {
    enableNotifications: boolean;
    enableEntityLabeling: boolean;
    notificationServiceUrl?: string;
  };
}

/**
 * Metrics data
 */
export interface ServiceMetrics {
  transfers: {
    total: number;
    byChain: Record<Chain, number>;
    byCategory: Record<TransferCategory, number>;
    whales: number;
  };
  api: {
    requests: number;
    errors: number;
    rateLimited: number;
    averageLatency: number;
  };
  webhooks: {
    received: number;
    processed: number;
    failed: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
}

/**
 * Error types
 */
export class AlchemyError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AlchemyError';
  }
}

export class RateLimitError extends AlchemyError {
  constructor(message: string, public retryAfter?: number) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public errors: z.ZodError) {
    super(message);
    this.name = 'ValidationError';
  }
}

