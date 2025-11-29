/**
 * Whale Tracking Clients Index
 * 
 * Exports all provider clients and the WhaleFusion Engine
 */

// Individual provider clients
export { ChainAlchemyClient, AlchemyClientManager } from './AlchemyClient';
export { ChainQuickNodeClient, QuickNodeClientManager } from './QuickNodeClient';
export { InfuraClient, type InfuraConfig, type InfuraProviderStats } from './InfuraClient';
export { MoralisClient, type MoralisConfig, type MoralisProviderStats } from './MoralisClient';

// WhaleFusion Engine (multi-provider fusion)
export {
  WhaleFusionEngine,
  getWhaleFusionEngine,
  resetWhaleFusionEngine,
  type ProviderName,
  type ProviderStats,
  type FusionConfig,
  type FusionMetrics,
  type TransferQuery,
  type FusionResult,
} from './WhaleFusionEngine';

// Default export
import { WhaleFusionEngine } from './WhaleFusionEngine';
import { AlchemyClientManager } from './AlchemyClient';
import { QuickNodeClientManager } from './QuickNodeClient';

export default {
  WhaleFusionEngine,
  AlchemyClientManager,
  QuickNodeClientManager,
};

