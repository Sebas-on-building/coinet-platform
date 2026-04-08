/**
 * L3.1 — Canonical Entity Ontology: Registry and Validation
 *
 * The single source of truth for all canonical object definitions,
 * invariants, and validation. No canonical object may enter the
 * system without passing through this registry's validators.
 */

import {
  L31_ONTOLOGY_VERSION,
  type CanonicalObjectType,
  type CanonicalObjectBase,
  type AssetObject,
  type PairObject,
  type ProtocolObject,
  type EntityObject,
  type ChainObject,
  type AnyCanonicalObject,
  type LifecycleState,
  type ConfidenceBand,
  CANONICAL_ID_PREFIXES,
  extractObjectTypeFromId,
} from './canonical-entity-types';
import type { NarrativeTopicObject } from './narrative-topic-types';
import { isLegalTransition } from './entity-lifecycle-types';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export type ValidationViolation = {
  field: string;
  rule: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
};

export type ValidationResult = {
  valid: boolean;
  objectType: CanonicalObjectType | 'UNKNOWN';
  violations: ValidationViolation[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// REQUIRED FIELDS BY OBJECT TYPE
// ═══════════════════════════════════════════════════════════════════════════════

const GLOBAL_REQUIRED_FIELDS: readonly string[] = [
  'canonicalId',
  'objectType',
  'lifecycleState',
  'confidenceState',
  'identityAnchors',
  'allowedAliases',
  'providerClaimRefs',
  'versionHistory',
  'audit',
];

const ASSET_REQUIRED_FIELDS: readonly string[] = [
  'assetId',
  'canonicalNames',
  'canonicalSymbolSet',
  'primaryContracts',
  'chainRepresentationSet',
  'assetKind',
  'protocolAffiliationIds',
  'sectorHints',
  'categoryHints',
  'supplyIdentityAnchors',
  'unresolvedFlags',
];

const PAIR_REQUIRED_FIELDS: readonly string[] = [
  'pairId',
  'baseAssetId',
  'quoteAssetId',
  'scope',
  'pairIdentityAnchors',
  'invertibilityRules',
  'unresolvedFlags',
];

const PROTOCOL_REQUIRED_FIELDS: readonly string[] = [
  'protocolId',
  'canonicalName',
  'deployedChainIds',
  'controlledContracts',
  'assetAffiliationIds',
  'treasuryAnchors',
  'governanceAnchors',
  'sector',
  'mergerSplitRenameHistory',
  'unresolvedFlags',
];

const ENTITY_REQUIRED_FIELDS: readonly string[] = [
  'entityId',
  'entityKind',
  'addressSet',
  'clusterConfidence',
  'labelProvenance',
  'attributionClaimsBundle',
  'contestedFlags',
  'unresolvedFlags',
];

const CHAIN_REQUIRED_FIELDS: readonly string[] = [
  'chainId',
  'canonicalName',
  'chainFamily',
  'nativeAssetId',
  'ecosystemAliases',
  'bridgeRelationships',
  'executionModelTags',
  'unresolvedFlags',
];

const NARRATIVE_REQUIRED_FIELDS: readonly string[] = [
  'topicId',
  'canonicalTitle',
  'aliasPhraseSet',
  'topicClass',
  'relations',
  'status',
  'ambiguityMarkers',
  'overlapMarkers',
  'unresolvedFlags',
];

const TYPE_SPECIFIC_FIELDS: Record<CanonicalObjectType, readonly string[]> = {
  ASSET: ASSET_REQUIRED_FIELDS,
  PAIR: PAIR_REQUIRED_FIELDS,
  PROTOCOL: PROTOCOL_REQUIRED_FIELDS,
  ENTITY: ENTITY_REQUIRED_FIELDS,
  CHAIN: CHAIN_REQUIRED_FIELDS,
  NARRATIVE_TOPIC: NARRATIVE_REQUIRED_FIELDS,
};

// ═══════════════════════════════════════════════════════════════════════════════
// VALID ENUM VALUES
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_OBJECT_TYPES: ReadonlySet<string> = new Set([
  'ASSET', 'PAIR', 'PROTOCOL', 'ENTITY', 'CHAIN', 'NARRATIVE_TOPIC',
]);

const VALID_LIFECYCLE_STATES: ReadonlySet<string> = new Set([
  'ACTIVE', 'DEPRECATED', 'MERGED', 'SPLIT', 'ARCHIVED', 'CONTESTED', 'UNKNOWN',
]);

const VALID_CONFIDENCE_BANDS: ReadonlySet<string> = new Set([
  'HIGH', 'MEDIUM', 'LOW', 'UNRESOLVED',
]);

const VALID_ASSET_KINDS: ReadonlySet<string> = new Set([
  'NATIVE', 'TOKEN', 'WRAPPED', 'BRIDGED', 'SYNTHETIC',
  'LP_TOKEN', 'STABLECOIN', 'GOVERNANCE_TOKEN', 'MEME_TOKEN', 'UNKNOWN',
]);

const VALID_PAIR_MARKET_TYPES: ReadonlySet<string> = new Set([
  'SPOT', 'PERPETUAL', 'OPTION', 'POOL',
]);

const VALID_PROTOCOL_SECTORS: ReadonlySet<string> = new Set([
  'DEX', 'LENDING', 'DERIVATIVES', 'RESTAKING', 'BRIDGE',
  'STABLECOIN', 'GAMING', 'SOCIAL', 'INFRA', 'AI', 'MEME', 'UNKNOWN',
]);

const VALID_ENTITY_KINDS: ReadonlySet<string> = new Set([
  'WALLET', 'CLUSTER', 'EXCHANGE', 'FUND', 'TEAM',
  'CONTRACT_SYSTEM', 'MARKET_MAKER', 'TREASURY', 'UNKNOWN',
]);

const VALID_EXECUTION_MODELS: ReadonlySet<string> = new Set([
  'EVM', 'SOLANA_VM', 'BITCOIN_UTXO', 'MOVE_VM',
  'COSMOS_SDK', 'ROLLUP', 'APPCHAIN', 'UNKNOWN',
]);

const VALID_TOPIC_CLASSES: ReadonlySet<string> = new Set([
  'MACRO', 'SECTOR', 'TOKEN_SPECIFIC', 'EVENT_SPECIFIC',
  'MEMETIC', 'REGULATORY', 'TECHNICAL', 'UNKNOWN',
]);

const VALID_TOPIC_STATUSES: ReadonlySet<string> = new Set([
  'ACTIVE', 'DECAYING', 'ARCHIVED', 'CONTESTED',
]);

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL BASE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateBase(obj: Record<string, unknown>): ValidationViolation[] {
  const v: ValidationViolation[] = [];

  for (const field of GLOBAL_REQUIRED_FIELDS) {
    if (obj[field] === undefined || obj[field] === null) {
      v.push({ field, rule: 'REQUIRED_FIELD', message: `Missing required field: ${field}`, severity: 'ERROR' });
    }
  }

  if (typeof obj['canonicalId'] === 'string') {
    const inferred = extractObjectTypeFromId(obj['canonicalId'] as string);
    if (inferred && obj['objectType'] && inferred !== obj['objectType']) {
      v.push({
        field: 'canonicalId',
        rule: 'ID_TYPE_MISMATCH',
        message: `Canonical ID prefix implies ${inferred} but objectType is ${obj['objectType'] as string}`,
        severity: 'ERROR',
      });
    }
  }

  if (obj['objectType'] && !VALID_OBJECT_TYPES.has(obj['objectType'] as string)) {
    v.push({ field: 'objectType', rule: 'INVALID_ENUM', message: `Invalid objectType: ${obj['objectType'] as string}`, severity: 'ERROR' });
  }

  if (obj['lifecycleState'] && !VALID_LIFECYCLE_STATES.has(obj['lifecycleState'] as string)) {
    v.push({ field: 'lifecycleState', rule: 'INVALID_ENUM', message: `Invalid lifecycleState: ${obj['lifecycleState'] as string}`, severity: 'ERROR' });
  }

  if (obj['confidenceState'] && !VALID_CONFIDENCE_BANDS.has(obj['confidenceState'] as string)) {
    v.push({ field: 'confidenceState', rule: 'INVALID_ENUM', message: `Invalid confidenceState: ${obj['confidenceState'] as string}`, severity: 'ERROR' });
  }

  if (obj['providerClaimRefs'] && !Array.isArray(obj['providerClaimRefs'])) {
    v.push({ field: 'providerClaimRefs', rule: 'MUST_BE_ARRAY', message: 'providerClaimRefs must be an array', severity: 'ERROR' });
  }

  const audit = obj['audit'] as Record<string, unknown> | undefined;
  if (audit && typeof audit === 'object') {
    for (const af of ['createdAt', 'updatedAt', 'createdBy', 'lastMutationId', 'sourceRefs']) {
      if (audit[af] === undefined || audit[af] === null) {
        v.push({ field: `audit.${af}`, rule: 'REQUIRED_FIELD', message: `Missing required audit field: ${af}`, severity: 'ERROR' });
      }
    }
    if (audit['replayGeneration'] === undefined || typeof audit['replayGeneration'] !== 'number') {
      v.push({ field: 'audit.replayGeneration', rule: 'REQUIRED_FIELD', message: 'Missing or invalid audit.replayGeneration', severity: 'ERROR' });
    }
  }

  const vh = obj['versionHistory'] as Record<string, unknown> | undefined;
  if (vh && typeof vh === 'object') {
    if (typeof vh['currentVersion'] !== 'number') {
      v.push({ field: 'versionHistory.currentVersion', rule: 'REQUIRED_FIELD', message: 'Missing or invalid versionHistory.currentVersion', severity: 'ERROR' });
    }
    if (typeof vh['versionChainRootId'] !== 'string') {
      v.push({ field: 'versionHistory.versionChainRootId', rule: 'REQUIRED_FIELD', message: 'Missing versionHistory.versionChainRootId', severity: 'ERROR' });
    }
  }

  return v;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSET VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateAsset(obj: Record<string, unknown>): ValidationViolation[] {
  const v: ValidationViolation[] = [];

  for (const field of ASSET_REQUIRED_FIELDS) {
    if (obj[field] === undefined || obj[field] === null) {
      v.push({ field, rule: 'REQUIRED_FIELD', message: `Missing required asset field: ${field}`, severity: 'ERROR' });
    }
  }

  const names = obj['canonicalNames'];
  if (Array.isArray(names) && names.length === 0) {
    v.push({ field: 'canonicalNames', rule: 'ASSET_NAME_REQUIRED', message: 'Asset must have at least one canonical name', severity: 'ERROR' });
  }

  const symbols = obj['canonicalSymbolSet'];
  if (Array.isArray(symbols) && symbols.length === 0) {
    v.push({ field: 'canonicalSymbolSet', rule: 'ASSET_SYMBOL_REQUIRED', message: 'Asset must have at least one canonical symbol', severity: 'ERROR' });
  }

  if (obj['assetKind'] && !VALID_ASSET_KINDS.has(obj['assetKind'] as string)) {
    v.push({ field: 'assetKind', rule: 'INVALID_ENUM', message: `Invalid assetKind: ${obj['assetKind'] as string}`, severity: 'ERROR' });
  }

  const kind = obj['assetKind'] as string | undefined;
  const derivativeKinds = new Set(['WRAPPED', 'BRIDGED', 'SYNTHETIC']);
  if (kind && derivativeKinds.has(kind)) {
    if (!obj['rootAssetId'] && !(obj['unresolvedFlags'] as string[] | undefined)?.includes('MISSING_ROOT_ASSET_RELATION')) {
      v.push({
        field: 'rootAssetId',
        rule: 'DERIVATIVE_REQUIRES_ROOT',
        message: `${kind} asset must have rootAssetId or explicit MISSING_ROOT_ASSET_RELATION unresolved flag`,
        severity: 'ERROR',
      });
    }
  }

  const reps = obj['chainRepresentationSet'];
  if (Array.isArray(reps)) {
    for (let i = 0; i < reps.length; i++) {
      const rep = reps[i] as Record<string, unknown>;
      if (!rep['chainId']) {
        v.push({
          field: `chainRepresentationSet[${i}].chainId`,
          rule: 'CHAIN_REP_REQUIRES_CHAIN',
          message: 'Chain representation must have chainId',
          severity: 'ERROR',
        });
      }
    }
  }

  const contracts = obj['primaryContracts'];
  if (Array.isArray(contracts)) {
    for (let i = 0; i < contracts.length; i++) {
      const c = contracts[i] as Record<string, unknown>;
      if (!c['chainId']) {
        v.push({
          field: `primaryContracts[${i}].chainId`,
          rule: 'CONTRACT_REQUIRES_CHAIN',
          message: 'Contract must have chainId',
          severity: 'ERROR',
        });
      }
    }
  }

  const affiliations = obj['protocolAffiliationIds'];
  if (Array.isArray(affiliations)) {
    for (let i = 0; i < affiliations.length; i++) {
      const aff = affiliations[i] as string;
      if (typeof aff === 'string' && !aff.startsWith('proto_')) {
        v.push({
          field: `protocolAffiliationIds[${i}]`,
          rule: 'AFFILIATION_MUST_REF_PROTOCOL',
          message: 'Protocol affiliation must reference canonical protocol ID (proto_ prefix)',
          severity: 'WARNING',
        });
      }
    }
  }

  return v;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAIR VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validatePair(obj: Record<string, unknown>): ValidationViolation[] {
  const v: ValidationViolation[] = [];

  for (const field of PAIR_REQUIRED_FIELDS) {
    if (obj[field] === undefined || obj[field] === null) {
      v.push({ field, rule: 'REQUIRED_FIELD', message: `Missing required pair field: ${field}`, severity: 'ERROR' });
    }
  }

  if (obj['baseAssetId'] && obj['quoteAssetId'] && obj['baseAssetId'] === obj['quoteAssetId']) {
    if (!(obj['unresolvedFlags'] as string[] | undefined)?.includes('SELF_PAIR_EXCEPTION')) {
      v.push({
        field: 'baseAssetId/quoteAssetId',
        rule: 'PAIR_SELF_REFERENCE',
        message: 'Base and quote cannot be same canonical asset unless SELF_PAIR_EXCEPTION flag set',
        severity: 'ERROR',
      });
    }
  }

  const scope = obj['scope'] as Record<string, unknown> | undefined;
  if (scope && typeof scope === 'object') {
    if (!scope['marketType'] || !VALID_PAIR_MARKET_TYPES.has(scope['marketType'] as string)) {
      v.push({ field: 'scope.marketType', rule: 'INVALID_ENUM', message: 'Missing or invalid scope.marketType', severity: 'ERROR' });
    }

    const mt = scope['marketType'] as string;
    if (mt === 'POOL' && !scope['poolAddress'] && !scope['chainId']) {
      if (!(obj['unresolvedFlags'] as string[] | undefined)?.includes('MISSING_POOL_ANCHOR')) {
        v.push({
          field: 'scope.poolAddress',
          rule: 'POOL_PAIR_REQUIRES_ANCHOR',
          message: 'Pool-type pair must have pool address/chain or MISSING_POOL_ANCHOR flag',
          severity: 'ERROR',
        });
      }
    }

    if ((mt === 'PERPETUAL' || mt === 'OPTION')) {
      const anchors = obj['pairIdentityAnchors'] as Array<Record<string, unknown>> | undefined;
      const hasDerivAnchor = anchors?.some(a => a['anchorType'] === 'DERIVATIVE_CONTRACT_ID');
      if (!hasDerivAnchor && !(obj['unresolvedFlags'] as string[] | undefined)?.includes('MISSING_DERIVATIVE_ANCHOR')) {
        v.push({
          field: 'pairIdentityAnchors',
          rule: 'DERIVATIVE_PAIR_REQUIRES_ANCHOR',
          message: 'Derivative pair must have derivative contract anchor or MISSING_DERIVATIVE_ANCHOR flag',
          severity: 'ERROR',
        });
      }
    }
  }

  return v;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateProtocol(obj: Record<string, unknown>): ValidationViolation[] {
  const v: ValidationViolation[] = [];

  for (const field of PROTOCOL_REQUIRED_FIELDS) {
    if (obj[field] === undefined || obj[field] === null) {
      v.push({ field, rule: 'REQUIRED_FIELD', message: `Missing required protocol field: ${field}`, severity: 'ERROR' });
    }
  }

  if (!obj['canonicalName'] || (typeof obj['canonicalName'] === 'string' && obj['canonicalName'].length === 0)) {
    v.push({ field: 'canonicalName', rule: 'PROTOCOL_NAME_REQUIRED', message: 'Protocol must have canonical name', severity: 'ERROR' });
  }

  if (obj['sector'] && !VALID_PROTOCOL_SECTORS.has(obj['sector'] as string)) {
    v.push({ field: 'sector', rule: 'INVALID_ENUM', message: `Invalid protocol sector: ${obj['sector'] as string}`, severity: 'ERROR' });
  }

  const contracts = obj['controlledContracts'];
  if (Array.isArray(contracts)) {
    for (let i = 0; i < contracts.length; i++) {
      const c = contracts[i] as Record<string, unknown>;
      if (!c['chainId']) {
        v.push({
          field: `controlledContracts[${i}].chainId`,
          rule: 'CONTRACT_REQUIRES_CHAIN',
          message: 'Controlled contract must have chainId',
          severity: 'ERROR',
        });
      }
    }
  }

  const history = obj['mergerSplitRenameHistory'];
  if (Array.isArray(history) && history.length > 0) {
    const vh = obj['versionHistory'] as Record<string, unknown> | undefined;
    if (!vh || (Array.isArray(vh['previousVersionIds']) && vh['previousVersionIds'].length === 0)) {
      v.push({
        field: 'mergerSplitRenameHistory',
        rule: 'HISTORY_REQUIRES_VERSION_CHAIN',
        message: 'Merger/split/rename history requires version chain references',
        severity: 'WARNING',
      });
    }
  }

  return v;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateEntity(obj: Record<string, unknown>): ValidationViolation[] {
  const v: ValidationViolation[] = [];

  for (const field of ENTITY_REQUIRED_FIELDS) {
    if (obj[field] === undefined || obj[field] === null) {
      v.push({ field, rule: 'REQUIRED_FIELD', message: `Missing required entity field: ${field}`, severity: 'ERROR' });
    }
  }

  if (obj['entityKind'] && !VALID_ENTITY_KINDS.has(obj['entityKind'] as string)) {
    v.push({ field: 'entityKind', rule: 'INVALID_ENUM', message: `Invalid entityKind: ${obj['entityKind'] as string}`, severity: 'ERROR' });
  }

  const kind = obj['entityKind'] as string | undefined;
  const clusterKinds = new Set(['CLUSTER', 'EXCHANGE', 'FUND', 'TEAM', 'MARKET_MAKER']);
  if (kind && clusterKinds.has(kind)) {
    const provenance = obj['labelProvenance'];
    if (!Array.isArray(provenance) || provenance.length === 0) {
      v.push({
        field: 'labelProvenance',
        rule: 'CLUSTER_REQUIRES_PROVENANCE',
        message: `${kind} entity must have at least one label provenance record`,
        severity: 'ERROR',
      });
    }
  }

  const institutionalKinds = new Set(['EXCHANGE', 'FUND', 'TEAM', 'MARKET_MAKER']);
  if (kind && institutionalKinds.has(kind)) {
    const claims = obj['attributionClaimsBundle'];
    if (!Array.isArray(claims) || claims.length === 0) {
      v.push({
        field: 'attributionClaimsBundle',
        rule: 'INSTITUTIONAL_REQUIRES_ATTRIBUTION',
        message: `${kind} entity must have at least one attribution claim`,
        severity: 'ERROR',
      });
    }
  }

  const contested = obj['contestedFlags'];
  if (Array.isArray(contested) && contested.length > 0) {
    if (obj['lifecycleState'] !== 'CONTESTED' && obj['confidenceState'] !== 'UNRESOLVED') {
      v.push({
        field: 'contestedFlags',
        rule: 'CONTESTED_FLAGS_REQUIRE_STATE',
        message: 'Entity with contested flags should be CONTESTED lifecycle or UNRESOLVED confidence',
        severity: 'WARNING',
      });
    }
  }

  return v;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateChain(obj: Record<string, unknown>): ValidationViolation[] {
  const v: ValidationViolation[] = [];

  for (const field of CHAIN_REQUIRED_FIELDS) {
    if (obj[field] === undefined || obj[field] === null) {
      v.push({ field, rule: 'REQUIRED_FIELD', message: `Missing required chain field: ${field}`, severity: 'ERROR' });
    }
  }

  if (!obj['canonicalName'] || (typeof obj['canonicalName'] === 'string' && obj['canonicalName'].length === 0)) {
    v.push({ field: 'canonicalName', rule: 'CHAIN_NAME_REQUIRED', message: 'Chain must have canonical name', severity: 'ERROR' });
  }

  if (!obj['nativeAssetId'] || (typeof obj['nativeAssetId'] === 'string' && obj['nativeAssetId'].length === 0)) {
    v.push({ field: 'nativeAssetId', rule: 'CHAIN_NATIVE_ASSET_REQUIRED', message: 'Chain must have native asset reference', severity: 'ERROR' });
  }

  const tags = obj['executionModelTags'];
  if (Array.isArray(tags)) {
    for (let i = 0; i < tags.length; i++) {
      if (!VALID_EXECUTION_MODELS.has(tags[i] as string)) {
        v.push({
          field: `executionModelTags[${i}]`,
          rule: 'INVALID_ENUM',
          message: `Invalid execution model tag: ${tags[i] as string}`,
          severity: 'ERROR',
        });
      }
    }
  }

  const bridges = obj['bridgeRelationships'];
  if (Array.isArray(bridges)) {
    for (let i = 0; i < bridges.length; i++) {
      const b = bridges[i] as Record<string, unknown>;
      if (!b['relatedChainId']) {
        v.push({
          field: `bridgeRelationships[${i}].relatedChainId`,
          rule: 'BRIDGE_REQUIRES_RELATED_CHAIN',
          message: 'Bridge relationship must have relatedChainId',
          severity: 'ERROR',
        });
      }
    }
  }

  return v;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NARRATIVE TOPIC VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateNarrativeTopic(obj: Record<string, unknown>): ValidationViolation[] {
  const v: ValidationViolation[] = [];

  for (const field of NARRATIVE_REQUIRED_FIELDS) {
    if (obj[field] === undefined || obj[field] === null) {
      v.push({ field, rule: 'REQUIRED_FIELD', message: `Missing required narrative topic field: ${field}`, severity: 'ERROR' });
    }
  }

  const phrases = obj['aliasPhraseSet'];
  if (Array.isArray(phrases) && phrases.length === 0) {
    v.push({ field: 'aliasPhraseSet', rule: 'TOPIC_ALIAS_REQUIRED', message: 'Narrative topic must have at least one alias phrase', severity: 'ERROR' });
  }

  if (obj['topicClass'] && !VALID_TOPIC_CLASSES.has(obj['topicClass'] as string)) {
    v.push({ field: 'topicClass', rule: 'INVALID_ENUM', message: `Invalid topicClass: ${obj['topicClass'] as string}`, severity: 'ERROR' });
  }

  if (obj['status'] && !VALID_TOPIC_STATUSES.has(obj['status'] as string)) {
    v.push({ field: 'status', rule: 'INVALID_ENUM', message: `Invalid topic status: ${obj['status'] as string}`, severity: 'ERROR' });
  }

  return v;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-TYPE FORBIDDEN COMBINATIONS
// ═══════════════════════════════════════════════════════════════════════════════

function validateCrossTypeInvariants(obj: Record<string, unknown>): ValidationViolation[] {
  const v: ValidationViolation[] = [];
  const id = obj['canonicalId'] as string | undefined;

  if (id && obj['objectType']) {
    const expected = CANONICAL_ID_PREFIXES[obj['objectType'] as CanonicalObjectType];
    if (expected && !id.startsWith(`${expected}_`)) {
      v.push({
        field: 'canonicalId',
        rule: 'ID_PREFIX_MISMATCH',
        message: `ID prefix must be ${expected}_ for type ${obj['objectType'] as string}`,
        severity: 'ERROR',
      });
    }
  }

  if (Array.isArray(obj['providerClaimRefs'])) {
    const claims = obj['providerClaimRefs'] as Array<Record<string, unknown>>;
    for (let i = 0; i < claims.length; i++) {
      const c = claims[i];
      if (!c['providerId'] || !c['providerObjectId'] || !c['claimType']) {
        v.push({
          field: `providerClaimRefs[${i}]`,
          rule: 'CLAIM_REQUIRES_FIELDS',
          message: 'Provider claim must have providerId, providerObjectId, and claimType',
          severity: 'ERROR',
        });
      }
    }
  }

  if (Array.isArray(obj['allowedAliases'])) {
    const aliases = obj['allowedAliases'] as Array<Record<string, unknown>>;
    for (let i = 0; i < aliases.length; i++) {
      const a = aliases[i];
      if (!a['alias'] || !a['aliasType'] || !a['normalizedAlias']) {
        v.push({
          field: `allowedAliases[${i}]`,
          rule: 'ALIAS_REQUIRES_FIELDS',
          message: 'Alias must have alias, aliasType, and normalizedAlias',
          severity: 'ERROR',
        });
      }
    }
  }

  return v;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATION ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function validateObject(candidate: unknown): ValidationResult {
  if (!candidate || typeof candidate !== 'object') {
    return {
      valid: false,
      objectType: 'UNKNOWN',
      violations: [{ field: 'root', rule: 'NOT_OBJECT', message: 'Candidate is not an object', severity: 'ERROR' }],
    };
  }

  const obj = candidate as Record<string, unknown>;
  const violations: ValidationViolation[] = [];

  violations.push(...validateBase(obj));
  violations.push(...validateCrossTypeInvariants(obj));

  const ot = obj['objectType'] as CanonicalObjectType | undefined;

  switch (ot) {
    case 'ASSET':
      violations.push(...validateAsset(obj));
      break;
    case 'PAIR':
      violations.push(...validatePair(obj));
      break;
    case 'PROTOCOL':
      violations.push(...validateProtocol(obj));
      break;
    case 'ENTITY':
      violations.push(...validateEntity(obj));
      break;
    case 'CHAIN':
      violations.push(...validateChain(obj));
      break;
    case 'NARRATIVE_TOPIC':
      violations.push(...validateNarrativeTopic(obj));
      break;
    default:
      if (ot) {
        violations.push({ field: 'objectType', rule: 'UNKNOWN_TYPE', message: `Unrecognized objectType: ${ot}`, severity: 'ERROR' });
      }
  }

  const errors = violations.filter(v => v.severity === 'ERROR');

  return {
    valid: errors.length === 0,
    objectType: ot ?? 'UNKNOWN',
    violations,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY API
// ═══════════════════════════════════════════════════════════════════════════════

export function getRequiredFields(objectType: CanonicalObjectType): readonly string[] {
  return [...GLOBAL_REQUIRED_FIELDS, ...TYPE_SPECIFIC_FIELDS[objectType]];
}

export function getAllObjectTypes(): readonly CanonicalObjectType[] {
  return ['ASSET', 'PAIR', 'PROTOCOL', 'ENTITY', 'CHAIN', 'NARRATIVE_TOPIC'];
}

export function getIdPrefix(objectType: CanonicalObjectType): string {
  return CANONICAL_ID_PREFIXES[objectType];
}

export function validateLifecycleTransition(
  from: LifecycleState,
  to: LifecycleState,
): { legal: boolean; reason?: string } {
  if (!isLegalTransition(from, to)) {
    return { legal: false, reason: `Transition ${from} → ${to} is not legal` };
  }
  return { legal: true };
}

export function getOntologyVersion(): string {
  return L31_ONTOLOGY_VERSION;
}
