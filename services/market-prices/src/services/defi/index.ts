/**
 * ============================================
 * DEFI SERVICES INDEX
 * ============================================
 * 
 * Exports all DeFi-related services:
 * - Token Auto-Discovery Service
 * - Unified DeFi Aggregator
 * 
 * World-Class DeFi Data Integration
 */

// Token Discovery
export { 
  TokenDiscoveryService,
  type DiscoveryFilter,
  type DiscoverySchedule,
  type DiscoveredToken,
  type TokenAnalysis,
  type TokenAlert,
  type DiscoveryStatistics,
} from '../token-discovery.service';

// DeFi Aggregator
export { 
  DefiAggregator,
  type UnifiedTokenData,
  type UnifiedProtocolData,
  type MarketOverview,
  type DefiAggregatorConfig,
  type AggregatorMetrics,
} from '../defi-aggregator';

