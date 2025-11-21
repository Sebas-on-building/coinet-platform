/**
 * =========================================
 * DEFI PROTOCOL METRICS TYPES
 * =========================================
 * Type definitions for the DeFi protocol metrics monitoring service
 */

export type ProtocolType =
  | 'lending'
  | 'dex'
  | 'yield-farming'
  | 'liquid-staking'
  | 'synthetic-assets'
  | 'insurance'
  | 'options'
  | 'perpetual'
  | 'cross-chain'
  | 'privacy'
  | 'gaming'
  | 'nft';

export type BlockchainNetwork =
  | 'ethereum'
  | 'polygon'
  | 'bsc'
  | 'arbitrum'
  | 'optimism'
  | 'avalanche'
  | 'fantom'
  | 'solana'
  | 'base'
  | 'celo'
  | 'harmony'
  | 'moonbeam';

export interface ProtocolInfo {
  id: string;
  name: string;
  type: ProtocolType;
  network: BlockchainNetwork;
  contractAddress: string;
  tokenSymbol: string;
  tokenAddress: string;
  website?: string;
  description?: string;
  launchDate: Date;
  isActive: boolean;
}

export interface TVLMetrics {
  protocol: ProtocolInfo;
  totalValueLocked: number; // USD value
  totalValueLockedChange24h: number; // Percentage change
  totalValueLockedChange7d: number;  // Percentage change
  tvlRank: number; // Global ranking
  dominantToken: string; // Token with highest TVL share
  tokenDistribution: Record<string, number>; // Token -> percentage
  timestamp: Date;
  source: 'defillama' | 'dune' | 'protocol-api' | 'on-chain';
}

export interface YieldMetrics {
  protocol: ProtocolInfo;
  poolId: string;
  poolName: string;
  apy: number; // Annual percentage yield
  apyChange24h: number; // Change in APY
  baseApy: number; // Base APY without rewards
  rewardApy: number; // Additional reward APY
  impermanentLoss?: number; // IL risk estimate
  volume24h: number; // Trading volume
  fees24h: number; // Fees generated
  timestamp: Date;
  source: 'defillama' | 'protocol-api' | 'on-chain';
}

export interface LendingMetrics {
  protocol: ProtocolInfo;
  poolId: string;
  asset: string;
  supplyApy: number; // Supply interest rate
  borrowApy: number; // Borrow interest rate
  totalSupplied: number; // Total supplied amount
  totalBorrowed: number; // Total borrowed amount
  utilizationRate: number; // Utilization percentage
  supplyChange24h: number; // Supply change %
  borrowChange24h: number; // Borrow change %
  liquidationThreshold?: number; // Liquidation threshold
  timestamp: Date;
  source: 'defillama' | 'protocol-api' | 'on-chain';
}

export interface LiquidityMetrics {
  protocol: ProtocolInfo;
  poolId: string;
  pair: string; // Token pair (e.g., "ETH-USDC")
  reserve0: number; // Reserve of token0
  reserve1: number; // Reserve of token1
  volume24h: number; // 24h trading volume
  fees24h: number; // 24h fees collected
  impermanentLoss?: number; // IL calculation
  priceRatio: number; // Current price ratio
  priceRatioChange24h: number; // Price ratio change
  liquidityScore: number; // Liquidity concentration score
  timestamp: Date;
  source: 'defillama' | 'protocol-api' | 'on-chain';
}

export interface GovernanceMetrics {
  protocol: ProtocolInfo;
  proposalId: string;
  title: string;
  description: string;
  status: 'active' | 'passed' | 'failed' | 'executed' | 'cancelled';
  startDate: Date;
  endDate: Date;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  quorum: number; // Required quorum percentage
  turnout: number; // Actual turnout percentage
  tokenHolders: number; // Total token holders
  votingPower: number; // Total voting power
  creator: string; // Proposal creator address
  timestamp: Date;
  source: 'snapshot' | 'protocol-api' | 'on-chain';
}

export interface TokenUnlockMetrics {
  protocol: ProtocolInfo;
  tokenSymbol: string;
  unlockDate: Date;
  unlockAmount: number; // Amount to be unlocked
  unlockValue: number; // USD value of unlock
  circulatingSupply: number; // Current circulating supply
  totalSupply: number; // Total supply
  unlockPercentage: number; // Percentage of total supply
  unlockFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'one-time';
  category: 'team' | 'investor' | 'foundation' | 'ecosystem' | 'public';
  cliffEnd?: Date; // End of cliff period
  vestingEnd?: Date; // End of vesting period
  timestamp: Date;
  source: 'protocol-api' | 'on-chain' | 'tokenomics';
}

export interface AnomalyDetection {
  metricType: 'tvl' | 'yield' | 'lending' | 'liquidity' | 'governance' | 'token-unlock';
  protocol: ProtocolInfo;
  currentValue: number;
  baseline: number;
  deviation: number; // Standard deviations from baseline
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  confidence: number; // 0-1 confidence in anomaly detection
}

export interface DeFiSignal {
  id: string;
  type: 'tvl_change' | 'yield_change' | 'lending_change' | 'liquidity_change' | 'governance' | 'token_unlock' | 'anomaly';
  protocol: ProtocolInfo;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  description: string;
  data: any; // Specific metrics data
  impact: {
    tokens: string[];
    users: number;
    tvl: number;
    volume: number;
  };
  timestamp: Date;
  expiresAt?: Date;
  source: 'api' | 'on-chain' | 'anomaly-detection';
}

export interface ProtocolHealth {
  protocol: ProtocolInfo;
  status: 'healthy' | 'degraded' | 'down' | 'maintenance';
  lastUpdate: Date;
  errorCount: number;
  responseTime: number; // milliseconds
  dataAge: number; // seconds since last data
  rateLimitHit: boolean;
  rateLimitReset?: Date;
}

export interface MetricsConfig {
  updateInterval: number; // milliseconds
  anomalyThreshold: number; // standard deviations
  minDataPoints: number; // for anomaly detection
  cacheTtl: number; // seconds
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  backfillDays: number;
}

export interface DataProvider {
  id: string;
  name: string;
  type: 'api' | 'rpc' | 'subgraph' | 'oracle';
  baseUrl: string;
  apiKey?: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  supportedProtocols: string[];
  supportedMetrics: string[];
  reliability: number; // 0-1 score
  lastUsed: Date;
  errorCount: number;
}

export interface AggregationWindow {
  start: Date;
  end: Date;
  duration: number; // milliseconds
}

export interface AggregatedMetrics {
  window: AggregationWindow;
  totalProtocols: number;
  totalTvl: number;
  avgYield: number;
  topPerformingProtocols: Array<{
    protocol: ProtocolInfo;
    tvl: number;
    yield: number;
    rank: number;
  }>;
  tvlChanges: {
    increased: number;
    decreased: number;
    stable: number;
  };
  yieldChanges: {
    increased: number;
    decreased: number;
    stable: number;
  };
  anomalies: AnomalyDetection[];
  timestamp: Date;
}

export interface HealthStatus {
  is_running: boolean;
  uptime_seconds: number;
  active_protocols: number;
  metrics_processed_total: number;
  metrics_per_second: number;
  avg_processing_latency_ms: number;
  error_rate: number;
  protocol_health: Record<string, ProtocolHealth>;
  memory_usage: {
    heap_used_mb: number;
    heap_total_mb: number;
    external_mb: number;
  };
}

export interface BackfillRequest {
  startDate: Date;
  endDate: Date;
  protocols?: string[];
  metrics?: string[];
  maxRecords?: number;
}

export interface BackfillResult {
  request: BackfillRequest;
  metrics: any[];
  totalFetched: number;
  duration: number;
  errors: string[];
}

export interface StreamingEvent {
  type: 'metrics' | 'anomaly' | 'signal' | 'health' | 'error';
  data: any;
  timestamp: Date;
  protocol?: string;
}

export interface ProcessingError {
  id: string;
  protocol: string;
  error_type: string;
  error_message: string;
  metric_type?: string;
  retry_count: number;
  timestamp: Date;
  will_retry: boolean;
}
