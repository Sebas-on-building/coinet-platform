/**
 * Cryptographic Integrity Doctrine — Sections 3-7 of the spec.
 *
 * Defines:
 *  - Scope boundaries (in/out)
 *  - Allowed claims with required evidence strength
 *  - Forbidden claims with explicit rationale
 *  - Claim boundary: structural fragility, not event certainty
 *  - Truth model: 5 truth dimensions
 *  - Entity applicability rules
 */

import type { CryptoEntityType, FragilityClass, EvidenceMode, UncertaintyState } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — SCOPE BOUNDARIES
// ═══════════════════════════════════════════════════════════════════════════════

export const IN_SCOPE = [
  'signature_systems',
  'key_exposure_pathways',
  'address_account_exposure_properties',
  'validator_key_security_structures',
  'admin_governance_key_structures',
  'trusted_setup_dependency',
  'post_quantum_readiness',
  'dormant_vulnerable_supply',
  'cryptographic_attack_surfaces',
  'evidence_quality_and_uncertainty',
] as const;

export const OUT_OF_SCOPE = [
  'exact_exploit_execution',
  'adversarial_playbooks',
  'offensive_attack_design',
  'exact_crqc_arrival_dates',
  'sensational_event_prediction',
  'unsupported_exploitability_claims',
  'broad_software_security_unrelated_to_crypto_structure',
] as const;

export function isInScope(topic: string): boolean {
  return IN_SCOPE.some(s => topic.toLowerCase().includes(s.replace(/_/g, ' ')));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTIONS 5-6 — ALLOWED AND FORBIDDEN CLAIMS
// ═══════════════════════════════════════════════════════════════════════════════

export type ClaimCategory =
  | 'structural_exposure'
  | 'structural_fragility'
  | 'migration_posture'
  | 'attack_surface_class'
  | 'cryptographic_dependency'
  | 'confidence_bounded_vulnerability'
  | 'unresolved_or_degraded_state';

export interface AllowedClaim {
  category: ClaimCategory;
  description: string;
  requiredEvidenceStrength: 'weak' | 'medium' | 'strong';
  requiredEvidenceMode: EvidenceMode[];
  examples: string[];
}

export const ALLOWED_CLAIMS: AllowedClaim[] = [
  {
    category: 'structural_exposure',
    description: 'Factual statement about how cryptographic secrets or derivable attack pathways become visible',
    requiredEvidenceStrength: 'medium',
    requiredEvidenceMode: ['direct', 'reconciled'],
    examples: [
      'Public keys are exposed on-chain for all Ethereum accounts',
      'Bitcoin UTXO public keys are hidden until spend',
    ],
  },
  {
    category: 'structural_fragility',
    description: 'Classification of how resilient the cryptographic architecture is under specified conditions',
    requiredEvidenceStrength: 'medium',
    requiredEvidenceMode: ['direct', 'inferred', 'reconciled'],
    examples: [
      'ECDSA-based chains have structurally broader exposure surfaces than hash-based schemes',
      'Validator key rotation reduces single-point compromise risk',
    ],
  },
  {
    category: 'migration_posture',
    description: 'Assessment of where a system stands on post-quantum migration readiness',
    requiredEvidenceStrength: 'medium',
    requiredEvidenceMode: ['direct', 'inferred', 'reconciled'],
    examples: [
      'Ethereum has active PQC research but no deployed hybrid signatures',
      'NIST PQC finalists are being integrated into experimental chain forks',
    ],
  },
  {
    category: 'attack_surface_class',
    description: 'Structural classification of what attack classes the system is exposed to',
    requiredEvidenceStrength: 'medium',
    requiredEvidenceMode: ['direct', 'inferred', 'modeled'],
    examples: [
      'At-rest exposure: high for account-model chains where all public keys are visible',
      'On-spend susceptibility: conditional on transaction broadcast interception',
    ],
  },
  {
    category: 'cryptographic_dependency',
    description: 'Identification of which cryptographic primitives and trust assumptions the system depends on',
    requiredEvidenceStrength: 'weak',
    requiredEvidenceMode: ['direct', 'inferred'],
    examples: [
      'This chain uses secp256k1 ECDSA for transaction signing',
      'The proof system depends on a trusted setup ceremony from 2021',
    ],
  },
  {
    category: 'confidence_bounded_vulnerability',
    description: 'Bounded vulnerability assessment with explicit confidence and condition constraints',
    requiredEvidenceStrength: 'strong',
    requiredEvidenceMode: ['direct', 'reconciled', 'modeled'],
    examples: [
      'Under a cryptographically relevant quantum computer, exposed ECDSA keys would be derivable',
      'Dormant BTC in P2PKH with exposed public keys are conditionally vulnerable',
    ],
  },
  {
    category: 'unresolved_or_degraded_state',
    description: 'Honest declaration that cryptographic posture cannot be fully determined',
    requiredEvidenceStrength: 'weak',
    requiredEvidenceMode: ['direct', 'inferred', 'reconciled', 'modeled'],
    examples: [
      'Validator key model is opaque; no public documentation found',
      'PQC migration posture is unresolved; governance discussions are ongoing but no code merged',
    ],
  },
];

export interface ForbiddenClaim {
  category: string;
  description: string;
  rationale: string;
  examples: string[];
}

export const FORBIDDEN_CLAIMS: ForbiddenClaim[] = [
  {
    category: 'overclaim_future_events',
    description: 'Asserting certainty about future compromise or failure timing',
    rationale: 'Coinet models structural fragility, not event certainty',
    examples: [
      'This asset will be hacked',
      'This chain will fail by 2030',
      'Quantum will break this next year',
    ],
  },
  {
    category: 'invent_hidden_structure',
    description: 'Inferring undisclosed design from insufficient evidence',
    rationale: 'Missing evidence is not the same as assumed structure',
    examples: [
      'Infer validator key design from vague blog posts',
      'Assume migration readiness from marketing language',
      'Infer deployed PQC support from intent statements alone',
    ],
  },
  {
    category: 'collapse_evidence_weakness',
    description: 'Converting incomplete or conflicting data into false confidence',
    rationale: 'Uncertainty must be preserved, not smoothed away',
    examples: [
      'Convert sparse evidence into a clean fragility rating',
      'Compress conflicting sources into a single answer without contradiction disclosure',
      'Substitute missing source truth with aggressive heuristics',
    ],
  },
  {
    category: 'confuse_truth_classes',
    description: 'Blurring observed facts with scenarios or aspirations',
    rationale: 'Direct observation, inference, and scenario must remain distinct',
    examples: [
      'Present research assumptions as deployed reality',
      'Present governance aspiration as live system posture',
      'Blur observed exposure facts with modeled consequences',
    ],
  },
];

export function isClaimAllowed(category: ClaimCategory): AllowedClaim | undefined {
  return ALLOWED_CLAIMS.find(c => c.category === category);
}

export function isClaimForbidden(text: string): ForbiddenClaim | undefined {
  const lower = text.toLowerCase();
  return FORBIDDEN_CLAIMS.find(f =>
    f.examples.some(e => lower.includes(e.toLowerCase())),
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — CLAIM BOUNDARY DOCTRINE
// ═══════════════════════════════════════════════════════════════════════════════

export const CLAIM_BOUNDARY = {
  asserts: 'structural fragility',
  does_not_assert: 'event certainty',
  can_identify: [
    'structurally vulnerable cryptographic system under specified conditions',
    'exposure that exists today',
    'migration posture strength or weakness',
    'relative resilience compared to peers',
  ],
  cannot_guarantee: [
    'exploit realization',
    'exact timing of adversarial capability emergence',
    'specific hack or theft outcomes',
  ],
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8 — TRUTH MODEL (5 DIMENSIONS)
// ═══════════════════════════════════════════════════════════════════════════════

export type TruthDimensionId =
  | 'structural'
  | 'exposure'
  | 'temporal'
  | 'migration'
  | 'confidence';

export interface TruthDimension {
  id: TruthDimensionId;
  name: string;
  description: string;
  key_questions: string[];
}

export const TRUTH_DIMENSIONS: TruthDimension[] = [
  {
    id: 'structural',
    name: 'Structural Dimension',
    description: 'What cryptographic primitives, verification schemes, trust assumptions, and key models the system uses',
    key_questions: [
      'What signature scheme family and variant?',
      'What key management model for validators and admins?',
      'What proof system or trusted setup dependency?',
    ],
  },
  {
    id: 'exposure',
    name: 'Exposure Dimension',
    description: 'How cryptographic secrets or derivable attack pathways become visible, persistent, reusable, or externally inferable',
    key_questions: [
      'Are public keys exposed at rest or only on spend?',
      'Is address reuse prevalent?',
      'Are cross-chain exposure patterns present?',
    ],
  },
  {
    id: 'temporal',
    name: 'Temporal Dimension',
    description: 'Whether exposure or mitigation is current, historical, transitional, stale, planned, deployed, or partially active',
    key_questions: [
      'When was this posture last verified?',
      'Is exposure current or historical?',
      'Is migration ongoing or stalled?',
    ],
  },
  {
    id: 'migration',
    name: 'Migration Dimension',
    description: 'Where the system stands on its path from current to post-quantum-resilient cryptography',
    key_questions: [
      'Is there a concrete upgrade path?',
      'What stage has migration reached?',
      'What governance or infrastructure constraints exist?',
    ],
  },
  {
    id: 'confidence',
    name: 'Confidence Dimension',
    description: 'How strongly Coinet knows any of the above, based on source authority, freshness, agreement, completeness, and conflict state',
    key_questions: [
      'Is this direct evidence or inference?',
      'Do sources agree or conflict?',
      'How fresh is the underlying verification?',
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9 — DEGRADATION DOCTRINE
// ═══════════════════════════════════════════════════════════════════════════════

export type DegradationEffect =
  | 'lower_field_confidence'
  | 'lower_downstream_confidence'
  | 'wider_hypothesis_spread'
  | 'wider_scenario_spread'
  | 'contradiction_preservation'
  | 'unresolved_state_tagging'
  | 'explicit_blind_spot_disclosure'
  | 'score_penalties_for_uncertainty'
  | 'ai_language_softening';

export const ALL_DEGRADATION_EFFECTS: DegradationEffect[] = [
  'lower_field_confidence',
  'lower_downstream_confidence',
  'wider_hypothesis_spread',
  'wider_scenario_spread',
  'contradiction_preservation',
  'unresolved_state_tagging',
  'explicit_blind_spot_disclosure',
  'score_penalties_for_uncertainty',
  'ai_language_softening',
];

export const DEGRADATION_INVARIANT =
  'The system must never interpret missing cryptographic truth as neutral.' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10 — ENTITY APPLICABILITY
// ═══════════════════════════════════════════════════════════════════════════════

export interface EntityApplicabilityRule {
  entityType: CryptoEntityType;
  description: string;
  relevantFields: string[];
}

export const ENTITY_APPLICABILITY: EntityApplicabilityRule[] = [
  {
    entityType: 'asset',
    description: 'Token-level cryptographic dependency and exposure posture',
    relevantFields: ['signature_scheme_family', 'key_exposure_state', 'dormant_vulnerable_supply', 'pqc_support_status'],
  },
  {
    entityType: 'protocol',
    description: 'Application-level and verification-level trust assumptions and migration posture',
    relevantFields: ['trusted_setup_dependency', 'admin_key_model', 'pqc_migration_stage', 'upgrade_dependency_risk'],
  },
  {
    entityType: 'chain',
    description: 'Base-layer signature, validator, proof, and settlement security structure',
    relevantFields: ['signature_scheme_family', 'signature_scheme_variant', 'validator_key_model', 'public_key_exposure_model', 'pqc_support_status'],
  },
  {
    entityType: 'wallet',
    description: 'Observed exposure pathways, dormant vulnerability, reuse behavior, custody structure',
    relevantFields: ['key_exposure_state', 'address_reuse_rate', 'dormant_vulnerable_supply', 'cross_chain_exposure_risk'],
  },
  {
    entityType: 'entity',
    description: 'Operational risk posture across controlled wallets and infrastructure',
    relevantFields: ['key_exposure_state', 'admin_key_model', 'cross_chain_exposure_risk'],
  },
  {
    entityType: 'ecosystem_cluster',
    description: 'Aggregated cryptographic posture across protocols, assets, wallets, and infrastructure',
    relevantFields: ['overall_fragility_class', 'pqc_migration_stage', 'exposure_surface_class'],
  },
];

export function getApplicableFields(entityType: CryptoEntityType): string[] {
  return ENTITY_APPLICABILITY.find(r => r.entityType === entityType)?.relevantFields ?? [];
}
