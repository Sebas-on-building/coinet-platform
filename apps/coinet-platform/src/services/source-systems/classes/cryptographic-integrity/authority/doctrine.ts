/**
 * L1.2 Cryptographic Integrity Authority Doctrine
 *
 * Encodes the seven core doctrine rules as runtime-enforceable logic:
 *  3.1 Authority is domain-specific
 *  3.2 Authority follows reality hierarchy
 *  3.3 Behavior beats intention
 *  3.4 Deployment beats proposal
 *  3.5 Conflict must be preserved when material
 *  3.6 Authority does not remove uncertainty
 *  3.7 Fallback must be explicit
 */

import type { AuthorityLevel, CryptoTruthDomain, SourceType, TrustClass } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// 3.2 REALITY HIERARCHY
// deployed reality > observable behavior > code > docs > proposals > statements > research > inference
// ═══════════════════════════════════════════════════════════════════════════════

export const REALITY_HIERARCHY: SourceType[] = [
  'deployed_reality',
  'onchain_observation',
  'code_repository',
  'specification',
  'proposal',
  'statement',
  'research',
  'inference',
];

export const REALITY_HIERARCHY_WEIGHT: Record<SourceType, number> = {
  deployed_reality: 1.0,
  onchain_observation: 0.95,
  code_repository: 0.9,
  specification: 0.82,
  proposal: 0.65,
  statement: 0.55,
  research: 0.5,
  inference: 0.35,
  security_report: 0.75,
  indexing_system: 0.88,
  governance_action: 0.92,
};

export const AUTHORITY_LEVEL_WEIGHT: Record<AuthorityLevel, number> = {
  primary: 1.0,
  secondary: 0.8,
  supporting: 0.6,
  speculative: 0.35,
};

export const TRUST_CLASS_WEIGHT: Record<TrustClass, number> = {
  verified: 1.0,
  audited: 0.92,
  official: 0.82,
  third_party: 0.72,
  heuristic: 0.55,
  modeled: 0.45,
  unknown: 0.3,
};

export const DOMAIN_FRESHNESS_THRESHOLD_HOURS: Record<CryptoTruthDomain, Record<AuthorityLevel, number>> = {
  protocol_structure: { primary: 24 * 30, secondary: 24 * 60, supporting: 24 * 120, speculative: 24 * 180 },
  onchain_exposure: { primary: 24, secondary: 48, supporting: 72, speculative: 96 },
  pqc_readiness: { primary: 24 * 14, secondary: 24 * 30, supporting: 24 * 60, speculative: 24 * 90 },
  vulnerability_modeling: { primary: 24 * 30, secondary: 24 * 60, supporting: 24 * 90, speculative: 24 * 120 },
  dormant_supply: { primary: 24 * 7, secondary: 24 * 14, supporting: 24 * 30, speculative: 24 * 45 },
  governance_upgrade: { primary: 24 * 14, secondary: 24 * 30, supporting: 24 * 60, speculative: 24 * 90 },
};

export const DOMAIN_AUTHORITY_ORDER: Record<CryptoTruthDomain, AuthorityLevel[]> = {
  protocol_structure: ['primary', 'secondary', 'supporting', 'speculative'],
  onchain_exposure: ['primary', 'secondary', 'supporting', 'speculative'],
  pqc_readiness: ['primary', 'secondary', 'supporting', 'speculative'],
  vulnerability_modeling: ['primary', 'secondary', 'supporting', 'speculative'],
  dormant_supply: ['primary', 'secondary', 'supporting', 'speculative'],
  governance_upgrade: ['primary', 'secondary', 'supporting', 'speculative'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3.3 BEHAVIOR BEATS INTENTION — explicit override rules
// ═══════════════════════════════════════════════════════════════════════════════

export type OverrideRuleId =
  | 'onchain_overrides_protocol_claims'
  | 'deployed_code_overrides_proposals'
  | 'activation_overrides_roadmap'
  | 'shipped_code_overrides_approved_proposal'
  | 'active_feature_overrides_merged_inactive'
  | 'operational_use_overrides_testnet';

export interface DoctrineOverrideRule {
  id: OverrideRuleId;
  stronger: SourceType[];
  weaker: SourceType[];
  description: string;
}

export const DOCTRINE_OVERRIDE_RULES: DoctrineOverrideRule[] = [
  {
    id: 'onchain_overrides_protocol_claims',
    stronger: ['onchain_observation', 'deployed_reality'],
    weaker: ['statement', 'specification'],
    description: 'On-chain behavior overrides protocol documentation claims',
  },
  {
    id: 'deployed_code_overrides_proposals',
    stronger: ['deployed_reality', 'code_repository'],
    weaker: ['proposal', 'statement'],
    description: 'Deployed or merged code overrides governance proposals',
  },
  {
    id: 'activation_overrides_roadmap',
    stronger: ['deployed_reality'],
    weaker: ['statement', 'research'],
    description: 'Actual activation overrides roadmap statements',
  },
  {
    id: 'shipped_code_overrides_approved_proposal',
    stronger: ['deployed_reality', 'code_repository'],
    weaker: ['proposal'],
    description: 'Shipped code > approved but undeployed proposal',
  },
  {
    id: 'active_feature_overrides_merged_inactive',
    stronger: ['deployed_reality'],
    weaker: ['code_repository'],
    description: 'Operationally active feature > merged but inactive code',
  },
  {
    id: 'operational_use_overrides_testnet',
    stronger: ['deployed_reality'],
    weaker: ['deployed_reality'],
    description: 'Mainnet operational use > testnet demonstration',
  },
];

export function shouldOverride(strongerType: SourceType, weakerType: SourceType): DoctrineOverrideRule | null {
  return DOCTRINE_OVERRIDE_RULES.find(rule =>
    rule.stronger.includes(strongerType) && rule.weaker.includes(weakerType),
  ) ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3.5 CONFLICT CONFIDENCE PENALTY SCHEDULE
// ═══════════════════════════════════════════════════════════════════════════════

export const CONFLICT_CONFIDENCE_PENALTY: Record<string, number> = {
  structural: 0.20,
  temporal: 0.12,
  interpretive: 0.08,
  none: 0,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3.7 FALLBACK CONFIDENCE PENALTY BY DEPTH
// ═══════════════════════════════════════════════════════════════════════════════

export const FALLBACK_PENALTY_SCHEDULE: Record<AuthorityLevel, number> = {
  primary: 0,
  secondary: 0.12,
  supporting: 0.25,
  speculative: 0.40,
};

// ═══════════════════════════════════════════════════════════════════════════════
// STRONG-INFERENCE PROHIBITION THRESHOLD
// When overall authority confidence falls below this, strong inference is blocked
// ═══════════════════════════════════════════════════════════════════════════════

export const STRONG_INFERENCE_MIN_CONFIDENCE = 0.45 as const;
export const UNRESOLVED_PROHIBITION_MESSAGE =
  'Insufficient authority quality to support strong inference — mark as unresolved' as const;
