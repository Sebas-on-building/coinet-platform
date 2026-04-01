/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  L1.1 CRYPTOGRAPHIC INTEGRITY — CANONICAL TYPE SYSTEM                        ║
 * ║                                                                               ║
 * ║  Every field emitted by this sub-layer carries:                              ║
 * ║    value · confidence · freshness · degradation_state ·                      ║
 * ║    evidence_mode · source_origin · last_verified_timestamp                   ║
 * ║                                                                               ║
 * ║  No naked uncited values. No decorative metadata.                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

export const CI_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 11.1 CORE STRUCTURE ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export type SignatureSchemeFamily =
  | 'ECDSA'
  | 'Schnorr'
  | 'EdDSA'
  | 'BLS'
  | 'lattice_based'
  | 'hash_based'
  | 'hybrid'
  | 'unknown';

export type SignatureSchemeVariant =
  | 'secp256k1_ecdsa'
  | 'secp256k1_schnorr'
  | 'ed25519'
  | 'bls12_381'
  | 'sr25519'
  | 'dilithium_hybrid'
  | 'falcon_hybrid'
  | 'sphincs_plus'
  | 'other'
  | 'unknown';

export type AddressOrAccountModel =
  | 'utxo_hidden_until_spend'
  | 'utxo_always_exposed'
  | 'account_public_key_bound'
  | 'smart_contract_account'
  | 'validator_key_set'
  | 'admin_multisig'
  | 'unknown';

export type PublicKeyExposureModel =
  | 'hidden_until_spend'
  | 'always_exposed'
  | 'conditionally_exposed'
  | 'account_level_visible'
  | 'setup_dependent'
  | 'unknown';

// ═══════════════════════════════════════════════════════════════════════════════
// 11.2 EXPOSURE AND VULNERABILITY ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export type KeyExposureState =
  | 'not_exposed'
  | 'exposed_current'
  | 'exposed_historical'
  | 'partially_exposed'
  | 'inferred_exposed'
  | 'unresolved';

export type ExposureSurfaceClass =
  | 'narrow'
  | 'moderate'
  | 'broad'
  | 'systemic'
  | 'unresolved';

// ═══════════════════════════════════════════════════════════════════════════════
// 11.3 ARCHITECTURE-RISK ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export type TrustedSetupDependency =
  | 'none'
  | 'historical'
  | 'active'
  | 'indirect'
  | 'uncertain';

export type ValidatorKeyModel =
  | 'single_key'
  | 'rotating_key'
  | 'threshold_key'
  | 'multisig_controlled'
  | 'distributed_validator_set'
  | 'unknown';

export type AdminKeyModel =
  | 'none'
  | 'multisig'
  | 'threshold'
  | 'dao_gated'
  | 'single_operator'
  | 'opaque'
  | 'unknown';

// ═══════════════════════════════════════════════════════════════════════════════
// 11.4 PQC READINESS ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export type PqcSupportStatus =
  | 'none'
  | 'research_only'
  | 'proposed'
  | 'partial'
  | 'hybrid'
  | 'deployed'
  | 'unknown';

export type PqcMigrationStage =
  | 'no_path'
  | 'conceptual'
  | 'governance_discussion'
  | 'implementation_in_progress'
  | 'testnet'
  | 'mainnet_partial'
  | 'mainnet_live'
  | 'operationally_adopted'
  | 'unresolved';

export type MigrationVelocity =
  | 'stalled'
  | 'slow'
  | 'moderate'
  | 'fast'
  | 'unknown';

export type UpgradeDependencyRisk =
  | 'low'
  | 'moderate'
  | 'high'
  | 'critical'
  | 'unresolved';

// ═══════════════════════════════════════════════════════════════════════════════
// 11.5 METADATA ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export type DegradationState =
  | 'healthy'
  | 'partial'
  | 'stale'
  | 'conflicting'
  | 'degraded'
  | 'unresolved';

export type EvidenceMode =
  | 'direct'
  | 'inferred'
  | 'reconciled'
  | 'modeled';

export type UncertaintyState =
  | 'known'
  | 'inferred'
  | 'stale'
  | 'degraded'
  | 'unresolved'
  | 'conflicting';

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY APPLICABILITY
// ═══════════════════════════════════════════════════════════════════════════════

export type CryptoEntityType =
  | 'asset'
  | 'protocol'
  | 'chain'
  | 'wallet'
  | 'entity'
  | 'ecosystem_cluster';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 12 — MANDATORY FIELD ENVELOPE
// Every field must carry these metadata dimensions.
// ═══════════════════════════════════════════════════════════════════════════════

export interface CitedField<T> {
  value: T;
  confidence: number;
  freshness: number;
  degradation_state: DegradationState;
  evidence_mode: EvidenceMode;
  source_origin: string[];
  last_verified_timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11.3 ATTACK SURFACE STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

export type AttackSurfaceLevel = 'none' | 'low' | 'moderate' | 'high' | 'critical' | 'unresolved';

export interface CryptographicAttackSurface {
  at_rest_exposure: CitedField<AttackSurfaceLevel>;
  on_spend_susceptibility: CitedField<AttackSurfaceLevel>;
  on_setup_dependency: CitedField<AttackSurfaceLevel>;
  validator_compromise_surface: CitedField<AttackSurfaceLevel>;
  admin_compromise_surface: CitedField<AttackSurfaceLevel>;
  cross_domain_surface: CitedField<AttackSurfaceLevel>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL CRYPTOGRAPHIC STATE — the full output of this sub-layer
// ═══════════════════════════════════════════════════════════════════════════════

export interface CryptographicIntegrityState {
  entity_id: string;
  entity_type: CryptoEntityType;
  entity_label?: string;
  version: string;
  timestamp: string;

  // 11.1 Core structure
  signature_scheme_family: CitedField<SignatureSchemeFamily>;
  signature_scheme_variant: CitedField<SignatureSchemeVariant>;
  address_or_account_model: CitedField<AddressOrAccountModel>;
  public_key_exposure_model: CitedField<PublicKeyExposureModel>;

  // 11.2 Exposure and vulnerability
  key_exposure_state: CitedField<KeyExposureState>;
  address_reuse_rate: CitedField<number | null>;
  exposure_confidence: CitedField<number>;
  dormant_vulnerable_supply: CitedField<DormantSupplyEstimate | null>;
  exposure_surface_class: CitedField<ExposureSurfaceClass>;
  cross_chain_exposure_risk: CitedField<boolean | null>;

  // 11.3 Architecture-risk
  trusted_setup_dependency: CitedField<TrustedSetupDependency>;
  validator_key_model: CitedField<ValidatorKeyModel>;
  admin_key_model: CitedField<AdminKeyModel>;
  cryptographic_attack_surface: CryptographicAttackSurface;

  // 11.4 PQC readiness
  pqc_support_status: CitedField<PqcSupportStatus>;
  pqc_migration_stage: CitedField<PqcMigrationStage>;
  migration_velocity: CitedField<MigrationVelocity>;
  upgrade_dependency_risk: CitedField<UpgradeDependencyRisk>;

  // Aggregate
  overall_fragility_class: CitedField<FragilityClass>;
  overall_uncertainty_state: UncertaintyState;
  field_coverage_rate: number;
  direct_evidence_rate: number;
}

export interface DormantSupplyEstimate {
  lower_bound_usd: number;
  base_estimate_usd: number;
  upper_bound_usd: number;
  coverage_pct: number;
  confidence_bucket: 'low' | 'medium' | 'high';
}

export type FragilityClass =
  | 'structurally_strong'
  | 'conditionally_resilient'
  | 'partially_fragile'
  | 'structurally_fragile'
  | 'critically_fragile'
  | 'unresolved';

// ═══════════════════════════════════════════════════════════════════════════════
// RUNTIME INTERMEDIATE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProtocolStructureParsed {
  scheme_family: SignatureSchemeFamily;
  scheme_variant: SignatureSchemeVariant;
  trusted_setup: TrustedSetupDependency;
  validator_model: ValidatorKeyModel;
  admin_model: AdminKeyModel;
  pqc_language_detected: boolean;
  pqc_status_parsed: PqcSupportStatus;
  evidence_excerpts: string[];
  parser_confidence: number;
  uncertainty_flags: string[];
}

export interface ExposureAnalysis {
  key_state: KeyExposureState;
  reuse_rate: number | null;
  exposure_surface: ExposureSurfaceClass;
  dormant_estimate: DormantSupplyEstimate | null;
  cross_chain_risk: boolean | null;
  exposure_pathways: string[];
  evidence_mode: EvidenceMode;
  confidence: number;
}

export interface SecurityClassification {
  attack_surface: CryptographicAttackSurface;
  fragility_class: FragilityClass;
  structural_notes: string[];
}

export interface PqcMigrationState {
  support_status: PqcSupportStatus;
  migration_stage: PqcMigrationStage;
  velocity: MigrationVelocity;
  upgrade_risk: UpgradeDependencyRisk;
  evidence_sources: string[];
  evidence_mode: EvidenceMode;
  confidence: number;
}

export interface CIDiagnosticMetrics {
  field_coverage_rate: number;
  direct_evidence_rate: number;
  inferred_evidence_rate: number;
  unresolved_field_rate: number;
  stale_field_rate: number;
  degradation_incidence_rate: number;
  source_disagreement_rate: number;
  completeness_score: number;
}
