/**
 * Canonical Intelligence Platform — public API.
 *
 * This is the single import point for entity resolution across the platform.
 * All engines (OmniScore, Evidence Pack, Judgment, Chat) should use this
 * instead of ad-hoc resolver implementations.
 */

export { registry } from './registry';
export { resolve, resolveMany, resolveByCoingeckoId } from './resolver';
export type {
  CanonicalEntity,
  AssetEntity,
  ProtocolEntity,
  ChainEntity,
  WalletEntity,
  NarrativeEntity,
  SectorEntity,
  EntityKind,
  ProviderIds,
  ContractAddress,
  ResolutionInput,
  ResolutionResult,
} from './types';
