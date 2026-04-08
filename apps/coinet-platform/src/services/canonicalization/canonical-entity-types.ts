/**
 * L3.1 — Canonical Entity Ontology: Type System
 *
 * Defines the internal object model Coinet is allowed to reason on.
 * No provider object, symbol, label, contract string, or metric label
 * may become internal reality unless attached to a canonical object
 * defined here.
 *
 * Six canonical types: Asset, Pair, Protocol, Entity, Chain, NarrativeTopic.
 * NarrativeTopic has its own extended file (narrative-topic-types.ts).
 */

import { v4 as uuidv4 } from 'uuid';

export const L31_ONTOLOGY_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED ENUMS AND PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════════

export type CanonicalObjectType =
  | 'ASSET'
  | 'PAIR'
  | 'PROTOCOL'
  | 'ENTITY'
  | 'CHAIN'
  | 'NARRATIVE_TOPIC';

export const CANONICAL_ID_PREFIXES: Record<CanonicalObjectType, string> = {
  ASSET: 'ast',
  PAIR: 'pair',
  PROTOCOL: 'proto',
  ENTITY: 'ent',
  CHAIN: 'chain',
  NARRATIVE_TOPIC: 'topic',
};

export function generateCanonicalId(objectType: CanonicalObjectType): string {
  return `${CANONICAL_ID_PREFIXES[objectType]}_${uuidv4().replace(/-/g, '')}`;
}

export function extractObjectTypeFromId(canonicalId: string): CanonicalObjectType | null {
  const prefix = canonicalId.split('_')[0];
  for (const [type, p] of Object.entries(CANONICAL_ID_PREFIXES)) {
    if (p === prefix) return type as CanonicalObjectType;
  }
  return null;
}

export type ConfidenceBand =
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'UNRESOLVED';

export type LifecycleState =
  | 'ACTIVE'
  | 'DEPRECATED'
  | 'MERGED'
  | 'SPLIT'
  | 'ARCHIVED'
  | 'CONTESTED'
  | 'UNKNOWN';

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT AND VERSION METADATA
// ═══════════════════════════════════════════════════════════════════════════════

export type MutationOrigin =
  | 'SYSTEM'
  | 'MIGRATION'
  | 'RECONCILIATION'
  | 'MANUAL_REVIEW';

export type AuditMetadata = {
  createdAt: string;
  updatedAt: string;
  createdBy: MutationOrigin;
  lastMutationId: string;
  replayGeneration: number;
  sourceRefs: string[];
};

export type VersionHistoryRef = {
  currentVersion: number;
  versionChainRootId: string;
  previousVersionIds: string[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER CLAIMS AND ALIASES (never final truth, always wrapped)
// ═══════════════════════════════════════════════════════════════════════════════

export type ProviderClaimRef = {
  providerId: string;
  providerObjectId: string;
  claimType: string;
  observedAt?: string;
  confidence?: ConfidenceBand;
};

export type AliasType =
  | 'SYMBOL'
  | 'NAME'
  | 'TICKER'
  | 'ADDRESS_LABEL'
  | 'PROVIDER_LABEL'
  | 'TOPIC_PHRASE'
  | 'POOL_LABEL'
  | 'PROTOCOL_NAME';

export type AliasRecord = {
  alias: string;
  aliasType: AliasType;
  normalizedAlias: string;
  chainScope?: string;
  sourceRefs: string[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL OBJECT BASE — shared contract for all six types
// ═══════════════════════════════════════════════════════════════════════════════

export type CanonicalObjectBase = {
  canonicalId: string;
  objectType: CanonicalObjectType;
  lifecycleState: LifecycleState;
  confidenceState: ConfidenceBand;
  identityAnchors: string[];
  allowedAliases: AliasRecord[];
  providerClaimRefs: ProviderClaimRef[];
  versionHistory: VersionHistoryRef;
  audit: AuditMetadata;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1. ASSET CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

export type AssetKind =
  | 'NATIVE'
  | 'TOKEN'
  | 'WRAPPED'
  | 'BRIDGED'
  | 'SYNTHETIC'
  | 'LP_TOKEN'
  | 'STABLECOIN'
  | 'GOVERNANCE_TOKEN'
  | 'MEME_TOKEN'
  | 'UNKNOWN';

export type ChainRepresentationKind =
  | 'PRIMARY'
  | 'WRAPPED'
  | 'BRIDGED'
  | 'DERIVATIVE';

export type AssetChainRepresentation = {
  chainId: string;
  contractAddress?: string;
  tokenStandard?: string;
  representationKind: ChainRepresentationKind;
  decimals?: number;
  symbolOnChain?: string;
  sourceRefs: string[];
};

export type SupplyAnchorType =
  | 'TOTAL_SUPPLY'
  | 'CIRCULATING_SUPPLY'
  | 'FLOAT'
  | 'MAX_SUPPLY';

export type SupplyAnchor = {
  anchorType: SupplyAnchorType;
  value?: string;
  unit: 'TOKEN_UNITS';
  sourceRefs: string[];
};

export type AssetObject = CanonicalObjectBase & {
  objectType: 'ASSET';
  assetId: string;
  canonicalNames: string[];
  canonicalSymbolSet: string[];
  primaryContracts: { chainId: string; address: string }[];
  chainRepresentationSet: AssetChainRepresentation[];
  assetKind: AssetKind;
  protocolAffiliationIds: string[];
  sectorHints: string[];
  categoryHints: string[];
  supplyIdentityAnchors: SupplyAnchor[];
  rootAssetId?: string;
  unresolvedFlags: string[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. PAIR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

export type PairMarketType =
  | 'SPOT'
  | 'PERPETUAL'
  | 'OPTION'
  | 'POOL';

export type PairScope = {
  venueId?: string;
  poolAddress?: string;
  chainId?: string;
  marketType: PairMarketType;
};

export type PairAnchorType =
  | 'VENUE_SYMBOL'
  | 'POOL_ADDRESS'
  | 'EXCHANGE_MARKET_ID'
  | 'DERIVATIVE_CONTRACT_ID';

export type PairIdentityAnchor = {
  anchorType: PairAnchorType;
  value: string;
  chainId?: string;
  sourceRefs: string[];
};

export type InvertibilityRule = {
  invertible: boolean;
  canonicalDirection: 'BASE_QUOTE';
  inversePairId?: string;
};

export type PairObject = CanonicalObjectBase & {
  objectType: 'PAIR';
  pairId: string;
  baseAssetId: string;
  quoteAssetId: string;
  scope: PairScope;
  pairIdentityAnchors: PairIdentityAnchor[];
  invertibilityRules: InvertibilityRule;
  unresolvedFlags: string[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. PROTOCOL CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

export type ProtocolSector =
  | 'DEX'
  | 'LENDING'
  | 'DERIVATIVES'
  | 'RESTAKING'
  | 'BRIDGE'
  | 'STABLECOIN'
  | 'GAMING'
  | 'SOCIAL'
  | 'INFRA'
  | 'AI'
  | 'MEME'
  | 'UNKNOWN';

export type ControlledContractRef = {
  chainId: string;
  contractAddress: string;
  role?: string;
  sourceRefs: string[];
};

export type GovernanceAnchorType =
  | 'DAO'
  | 'MULTISIG'
  | 'TOKEN'
  | 'FOUNDATION'
  | 'TREASURY';

export type GovernanceAnchor = {
  anchorType: GovernanceAnchorType;
  referenceId: string;
  sourceRefs: string[];
};

export type ProtocolObject = CanonicalObjectBase & {
  objectType: 'PROTOCOL';
  protocolId: string;
  canonicalName: string;
  deployedChainIds: string[];
  controlledContracts: ControlledContractRef[];
  assetAffiliationIds: string[];
  treasuryAnchors: GovernanceAnchor[];
  governanceAnchors: GovernanceAnchor[];
  sector: ProtocolSector;
  mergerSplitRenameHistory: string[];
  unresolvedFlags: string[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. ENTITY (WALLET / ACTOR) CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

export type EntityKind =
  | 'WALLET'
  | 'CLUSTER'
  | 'EXCHANGE'
  | 'FUND'
  | 'TEAM'
  | 'CONTRACT_SYSTEM'
  | 'MARKET_MAKER'
  | 'TREASURY'
  | 'UNKNOWN';

export type AddressRecord = {
  chainId: string;
  address: string;
  addressType?: string;
  sourceRefs: string[];
};

export type LabelProvenance = {
  providerId: string;
  label: string;
  labelType: string;
  confidence?: ConfidenceBand;
  sourceRefs: string[];
};

export type AttributionClaim = {
  claimId: string;
  claimantProviderId: string;
  claimedEntityKind: EntityKind;
  claimText: string;
  confidence?: ConfidenceBand;
  contested: boolean;
  sourceRefs: string[];
};

export type EntityObject = CanonicalObjectBase & {
  objectType: 'ENTITY';
  entityId: string;
  entityKind: EntityKind;
  addressSet: AddressRecord[];
  clusterConfidence: ConfidenceBand;
  labelProvenance: LabelProvenance[];
  attributionClaimsBundle: AttributionClaim[];
  contestedFlags: string[];
  unresolvedFlags: string[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. CHAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

export type ExecutionModelTag =
  | 'EVM'
  | 'SOLANA_VM'
  | 'BITCOIN_UTXO'
  | 'MOVE_VM'
  | 'COSMOS_SDK'
  | 'ROLLUP'
  | 'APPCHAIN'
  | 'UNKNOWN';

export type BridgeRelationship = {
  relatedChainId: string;
  bridgeType?: string;
  sourceRefs: string[];
};

export type ChainObject = CanonicalObjectBase & {
  objectType: 'CHAIN';
  chainId: string;
  canonicalName: string;
  chainFamily: string;
  nativeAssetId: string;
  ecosystemAliases: string[];
  bridgeRelationships: BridgeRelationship[];
  executionModelTags: ExecutionModelTag[];
  unresolvedFlags: string[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// UNION TYPE — any canonical object
// ═══════════════════════════════════════════════════════════════════════════════

export type AnyCanonicalObject =
  | AssetObject
  | PairObject
  | ProtocolObject
  | EntityObject
  | ChainObject;
