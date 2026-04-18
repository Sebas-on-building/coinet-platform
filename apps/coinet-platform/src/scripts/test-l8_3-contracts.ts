/**
 * L8.3 — Universal Regime Contracts and Output Law
 * Certification Test Suite
 *
 * 5 Bands (§8.3.10.2):
 *   A — Subject contracts
 *   B — Output contracts
 *   C — Confidence / transition / multiplier contracts
 *   D — Cleanliness and legality (output readiness)
 *   E — Compatibility and invariants (INV-8.3-A..G)
 */

import {
  // L8.2 enums reused by contracts
  L8RegimeFamily,
  L8MacroRegimeClass,
  L8TokenRegimeClass,
  L8CryptoStructureRegimeClass,
  L8RegimeCoexistenceClass,
  L8RegimeConfidenceBand,
  L8TransitionRiskClass,

  // L8.3 contracts
  L8_SUBJECT_CONTRACT_REQUIRED_FIELDS,
  L8_OUTPUT_CONTRACT_REQUIRED_FIELDS,
  L8_CONFIDENCE_CONTRACT_REQUIRED_FIELDS,
  L8_TRANSITION_CONTRACT_REQUIRED_FIELDS,
  L8_MULTIPLIER_CONTRACT_REQUIRED_FIELDS,
  L8_REGIME_CONFIDENCE_FACTOR_NAMES,
  L8_REQUIRED_MULTIPLIER_DIMENSION_NAMES,
  L8_MULTIPLIER_MIN, L8_MULTIPLIER_MAX,
  ALL_L8_SCOPE_GRANULARITIES,
  ALL_L8_INPUT_FAMILIES,
  ALL_L8_STALENESS_POLICIES,
  ALL_L8_MATERIALIZATION_POLICIES,
  ALL_L8_EVIDENCE_PACK_POLICIES,
  ALL_L8_INSTABILITY_REASONS,
  resolveL8RegimeConfidenceBand,
  resolveL8TransitionRiskClass,
  transitionIsHighRisk,
  l8CapChainIsLegal,
  multiplierIsScoreShaped,
  multiplierDescriptionHasActionBias,
  listMissingOrOorMultiplierDimensions,
  outputViolatesCleanliness,
  outputIsMaterialAmbiguous, outputIsMaterialStale,
  outputIsMaterialDegraded, outputIsHighTransition,

  // Versioning
  L8ContractCompatibilityClass,
  ALL_L8_CONTRACT_COMPATIBILITY_CLASSES,
  L8ContractSurface, ALL_L8_CONTRACT_SURFACES,
  classifyL8ContractDelta,
  compareL8ContractVersions,
  isLegalL8ContractUpgrade,
  L8_CURRENT_CONTRACT_VERSIONS,
  buildL8ContractReplayHash, l8ContractFnv1aHex,
} from '../l8/contracts';

import {
  // L8.3 validators
  L8RegimeContractViolationCode,
  ALL_L8_REGIME_CONTRACT_VIOLATION_CODES,
  validateRegimeSubjectContract,
  validateRegimeOutputContract,
  validateRegimeConfidenceContract,
  validateRegimeTransitionContract,
  validateRegimeMultiplierContract,
  validateRegimeContractCompatibility,
  validateRegimeOutputReadiness,
  L8RegimeOutputReadinessClass,
  ALL_L8_REGIME_OUTPUT_READINESS_CLASSES,
} from '../l8/validation';

import {
  // L8.3 audit
  resetL8ContractAuditLog,
  emitL8ContractAuditRecord,
  getL8ContractAuditLog,
  getL8ContractCriticalViolations,
  getL8ContractViolationsByCode,
  getL8ContractViolationsBySurface,
  hasAnyL8ContractViolations,
  getL8ContractViolationCount,
  emitL8SubjectContractViolation,
  emitL8OutputContractViolation,
  emitL8ConfidenceContractViolation,
  emitL8TransitionContractViolation,
  emitL8MultiplierContractViolation,
  emitL8CleanlinessViolation,
  emitL8CompatibilityViolation,
  emitL8MultiplierScoreOverrideViolation,
} from '../l8/constitution';

import {
  checkAllL83Invariants,
  checkINV_83_A, checkINV_83_B, checkINV_83_C, checkINV_83_D,
  checkINV_83_E, checkINV_83_F, checkINV_83_G,
  buildL8GreenContractBundle,
  l8GreenReadinessClass,
} from '../l8/invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}

function resetAll(): void { resetL8ContractAuditLog(); }

// ═══════════════════════════════════════════════════════════════
// BAND A — Subject Contracts
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Subject Contracts ═══');
resetAll();

const g = buildL8GreenContractBundle();
const subjectOk = validateRegimeSubjectContract(g.subject);
assert(subjectOk.valid, 'A.01 green subject passes');

// Enum sanity
assert(ALL_L8_SCOPE_GRANULARITIES.length === 8, 'A.02 8 scope granularities');
assert(ALL_L8_INPUT_FAMILIES.length === 10, 'A.03 10 input families');
assert(ALL_L8_STALENESS_POLICIES.length === 4, 'A.04 4 staleness policies');
assert(ALL_L8_MATERIALIZATION_POLICIES.length === 4,
  'A.05 4 materialization policies');
assert(ALL_L8_EVIDENCE_PACK_POLICIES.length === 3,
  'A.06 3 evidence-pack policies');

// Required-fields constant
assert(L8_SUBJECT_CONTRACT_REQUIRED_FIELDS.length >= 25,
  `A.07 ≥25 subject required fields (got ${L8_SUBJECT_CONTRACT_REQUIRED_FIELDS.length})`);

// Identity law
const noSubjectId = validateRegimeSubjectContract({
  ...g.subject, regime_subject_id: '',
});
assert(!noSubjectId.valid, 'A.08 missing regime_subject_id blocked');
assert(noSubjectId.issues.some(i =>
  i.code === L8RegimeContractViolationCode.SUBJECT_MISSING_IDENTITY),
  'A.09 SUBJECT_MISSING_IDENTITY surfaced');

assert(!validateRegimeSubjectContract({
  ...g.subject, regime_template_id: '',
}).valid, 'A.10 missing template blocked');
assert(!validateRegimeSubjectContract({
  ...g.subject, regime_version: '',
}).valid, 'A.11 missing regime_version blocked');

// Family legality
const fakeFamily = validateRegimeSubjectContract({
  ...g.subject,
  regime_family: 'FAKE_FAMILY' as L8RegimeFamily,
});
assert(!fakeFamily.valid, 'A.12 unregistered family blocked');
assert(fakeFamily.issues.some(i =>
  i.code === L8RegimeContractViolationCode.SUBJECT_MISSING_FAMILY),
  'A.13 SUBJECT_MISSING_FAMILY surfaced');

// Versioning
assert(!validateRegimeSubjectContract({
  ...g.subject, subject_contract_version: 'not-semver',
}).valid, 'A.14 non-semver contract version blocked');
assert(!validateRegimeSubjectContract({
  ...g.subject, schema_version: '',
}).valid, 'A.15 missing schema_version blocked');
assert(!validateRegimeSubjectContract({
  ...g.subject, policy_version: '',
}).valid, 'A.16 missing policy_version blocked');

// Scope
assert(!validateRegimeSubjectContract({
  ...g.subject, scope_id: '',
}).valid, 'A.17 missing scope_id blocked');
assert(!validateRegimeSubjectContract({
  ...g.subject,
  scope_granularity: '' as typeof g.subject.scope_granularity,
}).valid, 'A.18 missing scope_granularity blocked');

// Family + scope legality
assert(!validateRegimeSubjectContract({
  ...g.subject, scope_type: 'CHAIN',
}).valid, 'A.19 MACRO family + CHAIN scope blocked');

// Allowed class set
assert(!validateRegimeSubjectContract({
  ...g.subject, allowed_regime_class_set: [],
}).valid, 'A.20 empty allowed_regime_class_set blocked');
assert(!validateRegimeSubjectContract({
  ...g.subject,
  allowed_regime_class_set: [L8TokenRegimeClass.EARLY_ACCUMULATION],
}).valid, 'A.21 cross-family allowed class blocked');

// Inputs
assert(!validateRegimeSubjectContract({
  ...g.subject, required_validation_inputs: [],
}).valid, 'A.22 empty required_validation_inputs blocked');
assert(!validateRegimeSubjectContract({
  ...g.subject, required_feature_inputs: [],
}).valid, 'A.23 empty required_feature_inputs blocked');
const mixedInputs = validateRegimeSubjectContract({
  ...g.subject,
  required_validation_inputs: [
    {
      ref: 'l6:current_feature_state/x',
      family: 'L6_FEATURE',
      required: true,
      staleness_critical: true,
      evidence_only: false,
      context_only: false,
    },
  ],
});
assert(!mixedInputs.valid,
  'A.24 non-L7 family in required_validation_inputs blocked');
assert(mixedInputs.issues.some(i =>
  i.code === L8RegimeContractViolationCode.SUBJECT_INPUT_FAMILY_MIX),
  'A.25 SUBJECT_INPUT_FAMILY_MIX surfaced');

const evidenceOnlyRequired = validateRegimeSubjectContract({
  ...g.subject,
  required_validation_inputs: [
    {
      ref: 'l7:validation_assessment/x',
      family: 'L7_VALIDATION',
      required: true,
      staleness_critical: false,
      evidence_only: true,
      context_only: false,
    },
  ],
});
assert(!evidenceOnlyRequired.valid,
  'A.26 evidence_only flag on required input blocked');

// Temporal
assert(!validateRegimeSubjectContract({
  ...g.subject, as_of: 'bogus',
}).valid, 'A.27 bad as_of blocked');
assert(!validateRegimeSubjectContract({
  ...g.subject,
  freshness_budget_seconds: -1,
}).valid, 'A.28 negative freshness_budget_seconds blocked');
assert(!validateRegimeSubjectContract({
  ...g.subject,
  staleness_policy: '' as typeof g.subject.staleness_policy,
}).valid, 'A.29 missing staleness_policy blocked');

// Classification rules
assert(!validateRegimeSubjectContract({
  ...g.subject, regime_selection_rules: [],
}).valid, 'A.30 empty regime_selection_rules blocked');

// Confidence / multiplier derivation
assert(!validateRegimeSubjectContract({
  ...g.subject,
  confidence_derivation_spec: {
    ...g.subject.confidence_derivation_spec,
    required_factors: [],
  },
}).valid, 'A.31 empty required_factors blocked');
assert(!validateRegimeSubjectContract({
  ...g.subject,
  multiplier_derivation_spec: {
    ...g.subject.multiplier_derivation_spec,
    forbid_final_score_shape: false as unknown as true,
  },
}).valid, 'A.32 forbid_final_score_shape=false blocked');
assert(!validateRegimeSubjectContract({
  ...g.subject,
  required_multiplier_dimensions: [],
}).valid, 'A.33 empty required_multiplier_dimensions blocked');

// Persistence / evidence
assert(!validateRegimeSubjectContract({
  ...g.subject,
  materialization_policy:
    '' as typeof g.subject.materialization_policy,
}).valid, 'A.34 missing materialization_policy blocked');
assert(!validateRegimeSubjectContract({
  ...g.subject,
  evidence_pack_policy:
    '' as typeof g.subject.evidence_pack_policy,
}).valid, 'A.35 missing evidence_pack_policy blocked');

// Restriction / validation consumption policy
assert(!validateRegimeSubjectContract({
  ...g.subject,
  restriction_consumption_policy: {
    required: true,
    expected_rights: [],
    block_on_missing_profile: true,
  },
}).valid, 'A.36 required restriction policy with empty rights blocked');
assert(!validateRegimeSubjectContract({
  ...g.subject,
  validation_consumption_policy: {
    required: true,
    min_validation_refs: 0,
    block_on_restricted_outputs: true,
  },
}).valid, 'A.37 required validation policy with 0 min refs blocked');

// Judgment leak in description
assert(!validateRegimeSubjectContract({
  ...g.subject,
  description: 'buy signal regime environment',
}).valid, 'A.38 judgment-leak description blocked');
assert(!validateRegimeSubjectContract({
  ...g.subject,
  created_by: 'best_trade_bot',
}).valid, 'A.39 forbidden created_by blocked');

// Lineage policy + refs
assert(!validateRegimeSubjectContract({
  ...g.subject,
  lineage_refs: {
    trace_id: '', manifest_id: '', upstream_refs: [],
  },
}).valid, 'A.40 missing lineage trace/manifest blocked');

// ═══════════════════════════════════════════════════════════════
// BAND B — Output Contracts
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Output Contracts ═══');
resetAll();

assert(validateRegimeOutputContract(g.output).valid, 'B.01 green output passes');
assert(L8_OUTPUT_CONTRACT_REQUIRED_FIELDS.length >= 25,
  `B.02 ≥25 output required fields (got ${L8_OUTPUT_CONTRACT_REQUIRED_FIELDS.length})`);

// Identity + versioning
assert(!validateRegimeOutputContract({
  ...g.output, regime_result_id: '',
}).valid, 'B.03 missing result id blocked');
assert(!validateRegimeOutputContract({
  ...g.output, subject_contract_ref: '',
}).valid, 'B.04 missing subject_contract_ref blocked');
assert(!validateRegimeOutputContract({
  ...g.output, output_contract_version: '',
}).valid, 'B.05 missing contract version blocked');
assert(!validateRegimeOutputContract({
  ...g.output, policy_version: '',
}).valid, 'B.06 missing policy_version blocked');

// Family / primary / secondary
assert(!validateRegimeOutputContract({
  ...g.output, regime_family: 'FAKE_FAMILY' as L8RegimeFamily,
}).valid, 'B.07 unregistered family blocked');
assert(!validateRegimeOutputContract({
  ...g.output, primary_regime: undefined as unknown as typeof g.output.primary_regime,
}).valid, 'B.08 missing primary regime blocked');
assert(!validateRegimeOutputContract({
  ...g.output,
  primary_regime: L8TokenRegimeClass.EARLY_ACCUMULATION,
}).valid, 'B.09 primary from different family blocked');
assert(!validateRegimeOutputContract({
  ...g.output,
  secondary_regime: L8MacroRegimeClass.RISK_ON,
  secondary_regime_confidence: 0.3,
  coexistence_class: L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
}).valid, 'B.10 secondary equals primary blocked');
assert(!validateRegimeOutputContract({
  ...g.output,
  secondary_regime: L8TokenRegimeClass.EARLY_ACCUMULATION,
  secondary_regime_confidence: 0.3,
  coexistence_class: L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
}).valid, 'B.11 secondary from different family blocked');
assert(!validateRegimeOutputContract({
  ...g.output,
  secondary_regime: null,
  secondary_regime_confidence: 0.3,
}).valid, 'B.12 dangling secondary_confidence blocked');

// Scope + time
assert(!validateRegimeOutputContract({
  ...g.output, scope_id: '',
}).valid, 'B.13 missing scope_id blocked');
assert(!validateRegimeOutputContract({
  ...g.output, as_of: 'nope',
}).valid, 'B.14 bad as_of blocked');

// Confidence score + band
assert(!validateRegimeOutputContract({
  ...g.output, regime_confidence_score: 1.5,
}).valid, 'B.15 confidence > 1 blocked');
assert(!validateRegimeOutputContract({
  ...g.output, regime_confidence_score: -0.1,
}).valid, 'B.16 negative confidence blocked');
assert(!validateRegimeOutputContract({
  ...g.output,
  regime_confidence_score: 0.1,
  regime_confidence_band: L8RegimeConfidenceBand.FULL,
}).valid, 'B.17 band inconsistent with score blocked');
assert(!validateRegimeOutputContract({
  ...g.output, confidence_profile_ref: '',
}).valid, 'B.18 missing confidence_profile_ref blocked');

// Transition score + class + ref
assert(!validateRegimeOutputContract({
  ...g.output, transition_risk_score: 2,
}).valid, 'B.19 transition score OOR blocked');
assert(!validateRegimeOutputContract({
  ...g.output,
  transition_risk_score: 0.9,
  transition_risk_class: L8TransitionRiskClass.STABLE,
}).valid, 'B.20 transition class inconsistent blocked');
assert(!validateRegimeOutputContract({
  ...g.output, transition_profile_ref: '',
}).valid, 'B.21 missing transition_profile_ref blocked');

// Multiplier linkage
assert(!validateRegimeOutputContract({
  ...g.output, multiplier_profile_ref: '',
}).valid, 'B.22 missing multiplier_profile_ref blocked');

// Validation / evidence refs
assert(!validateRegimeOutputContract({
  ...g.output, validation_refs: [],
}).valid, 'B.23 empty validation_refs blocked');
assert(!validateRegimeOutputContract({
  ...g.output, evidence_pack_ref: '',
}).valid, 'B.24 missing evidence_pack_ref blocked');
assert(!validateRegimeOutputContract({
  ...g.output, input_snapshot_ref: '',
}).valid, 'B.25 missing input_snapshot_ref blocked');

// Scores OOR
assert(!validateRegimeOutputContract({
  ...g.output, ambiguity_score: 2,
}).valid, 'B.26 ambiguity score OOR blocked');
assert(!validateRegimeOutputContract({
  ...g.output, support_strength_score: -1,
}).valid, 'B.27 support strength OOR blocked');

// Materialization + replay
assert(!validateRegimeOutputContract({
  ...g.output,
  materialization_mode:
    '' as typeof g.output.materialization_mode,
}).valid, 'B.28 missing materialization mode blocked');
assert(!validateRegimeOutputContract({
  ...g.output, compute_run_id: '',
}).valid, 'B.29 missing run id blocked');
assert(!validateRegimeOutputContract({
  ...g.output, replay_hash: '',
}).valid, 'B.30 missing replay_hash blocked');

// Lineage
assert(!validateRegimeOutputContract({
  ...g.output,
  lineage_refs: { trace_id: '', manifest_id: '', upstream_refs: [] },
}).valid, 'B.31 missing lineage blocked');

// Coexistence
assert(!validateRegimeOutputContract({
  ...g.output,
  coexistence_class: '' as typeof g.output.coexistence_class,
}).valid, 'B.32 missing coexistence_class blocked');

// ═══════════════════════════════════════════════════════════════
// BAND C — Confidence / Transition / Multiplier Contracts
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Confidence / Transition / Multiplier ═══');
resetAll();

// Confidence positive path
assert(validateRegimeConfidenceContract(g.confidence).valid,
  'C.01 green confidence passes');
assert(L8_CONFIDENCE_CONTRACT_REQUIRED_FIELDS.length >= 14,
  `C.02 ≥14 confidence required fields (got ${L8_CONFIDENCE_CONTRACT_REQUIRED_FIELDS.length})`);
assert(L8_REGIME_CONFIDENCE_FACTOR_NAMES.length === 8,
  'C.03 8 confidence factors');

// Factor missing / OOR
assert(!validateRegimeConfidenceContract({
  ...g.confidence,
  factor_breakdown: { ...g.confidence.factor_breakdown, support_breadth: NaN },
}).valid, 'C.04 NaN factor blocked');
assert(!validateRegimeConfidenceContract({
  ...g.confidence,
  factor_breakdown: { ...g.confidence.factor_breakdown, freshness: 1.5 },
}).valid, 'C.05 factor OOR blocked');

// Band inconsistent with capped score
assert(!validateRegimeConfidenceContract({
  ...g.confidence,
  confidence_score_capped: 0.05,
  confidence_score_raw: 0.05,
  confidence_band: L8RegimeConfidenceBand.HIGH,
}).valid, 'C.06 band inconsistent blocked');

// Cap chain illegal (capped < raw without any applied cap)
assert(!validateRegimeConfidenceContract({
  ...g.confidence,
  confidence_score_raw: 0.8,
  confidence_score_capped: 0.4,
  confidence_band: L8RegimeConfidenceBand.MODERATE,
  cap_chain: [],
}).valid, 'C.07 cap chain illegal when unexplained capping blocked');

// Cap chain legal when applied
assert(validateRegimeConfidenceContract({
  ...g.confidence,
  confidence_score_raw: 0.8,
  confidence_score_capped: 0.4,
  confidence_band: L8RegimeConfidenceBand.MODERATE,
  cap_chain: [
    {
      cap_id: 'transition',
      cap_reason: 'TRANSITION_HIGH',
      max_after_cap: 0.4,
      applied: true,
    },
  ],
}).valid, 'C.08 legal cap chain passes');

// Required caps when context says so
assert(!validateRegimeConfidenceContract(g.confidence, {
  ambiguity_score: 0,
  restriction_required: false,
  staleness_material: true,
  transition_high: true,
}).valid, 'C.09 required caps absent blocked');

// Restriction required but no refs
assert(!validateRegimeConfidenceContract({
  ...g.confidence, l7_restriction_profile_refs: [],
}, {
  ambiguity_score: 0,
  restriction_required: true,
  staleness_material: false,
  transition_high: false,
}).valid, 'C.10 restriction required but no refs blocked');

// Clean-while-ambiguous
assert(!validateRegimeConfidenceContract(g.confidence, {
  ambiguity_score: 0.7,
  restriction_required: false,
  staleness_material: false,
  transition_high: false,
}).valid, 'C.11 confidence clean while ambiguous blocked');

// Transition positive path
assert(validateRegimeTransitionContract(g.transition).valid,
  'C.12 green transition passes');
assert(L8_TRANSITION_CONTRACT_REQUIRED_FIELDS.length >= 10,
  'C.13 ≥10 transition required fields');

assert(!validateRegimeTransitionContract({
  ...g.transition, transition_risk_score: 2,
}).valid, 'C.14 transition score OOR blocked');
assert(!validateRegimeTransitionContract({
  ...g.transition,
  transition_risk_score: 0.9,
  transition_risk_class: L8TransitionRiskClass.STABLE,
}).valid, 'C.15 class inconsistent blocked');
assert(!validateRegimeTransitionContract({
  ...g.transition,
  transition_risk_score: 0.9,
  transition_risk_class: L8TransitionRiskClass.CRITICAL,
  instability_reasons: [],
}).valid, 'C.16 high risk without instability reasons blocked');

// Stable while ambiguous
assert(!validateRegimeTransitionContract(g.transition, {
  ambiguity_score: 0.7,
}).valid, 'C.17 transition stable while ambiguous blocked');

// Coexistence / replay identity
assert(!validateRegimeTransitionContract({
  ...g.transition,
  coexistence_class: '' as typeof g.transition.coexistence_class,
}).valid, 'C.18 missing coexistence blocked');
assert(!validateRegimeTransitionContract({
  ...g.transition, replay_hash: '',
}).valid, 'C.19 missing replay hash blocked');

// Multiplier positive path
assert(validateRegimeMultiplierContract(g.multiplier).valid,
  'C.20 green multiplier passes');
assert(L8_MULTIPLIER_CONTRACT_REQUIRED_FIELDS.length >= 12,
  'C.21 ≥12 multiplier required fields');
assert(L8_REQUIRED_MULTIPLIER_DIMENSION_NAMES.length === 7,
  'C.22 7 multiplier dimensions');

// OOR dimension
assert(!validateRegimeMultiplierContract({
  ...g.multiplier,
  dimensions: { ...g.multiplier.dimensions, leverage_risk_multiplier: -1 },
}).valid, 'C.23 negative multiplier blocked');
assert(!validateRegimeMultiplierContract({
  ...g.multiplier,
  dimensions: { ...g.multiplier.dimensions, trend_amplification: 10 },
}).valid, 'C.24 OOR multiplier blocked');

// Collapsed → score-shaped
assert(!validateRegimeMultiplierContract({
  ...g.multiplier,
  dimensions: {
    trend_amplification: 2.5,
    momentum_trust_multiplier: 2.5,
    breakout_skepticism_multiplier: 2.5,
    leverage_risk_multiplier: 2.5,
    liquidity_fragility_multiplier: 2.5,
    narrative_sensitivity_multiplier: 2.5,
    risk_overhang_sensitivity_multiplier: 2.5,
  },
}).valid, 'C.25 collapsed uniform multiplier blocked');

// Final-score wording
assert(!validateRegimeMultiplierContract({
  ...g.multiplier, description: 'final score for this regime',
}).valid, 'C.26 final-score wording blocked');

// Action-bias wording
assert(!validateRegimeMultiplierContract({
  ...g.multiplier,
  description: 'buy when regime flips to bullish',
}).valid, 'C.27 action-bias wording blocked');

// Restriction required but missing
assert(!validateRegimeMultiplierContract(
  { ...g.multiplier, restriction_consumption_refs: [] },
  { restriction_required: true },
).valid, 'C.28 restriction required but missing blocked');

// Anchor / derivation / replay
assert(!validateRegimeMultiplierContract({
  ...g.multiplier,
  primary_regime: '' as unknown as typeof g.multiplier.primary_regime,
}).valid, 'C.29 missing primary_regime anchor blocked');
assert(!validateRegimeMultiplierContract({
  ...g.multiplier, derivation_spec_ref: '',
}).valid, 'C.30 missing derivation_spec_ref blocked');
assert(!validateRegimeMultiplierContract({
  ...g.multiplier, replay_hash: '',
}).valid, 'C.31 missing replay_hash blocked');

// Helpers coverage
assert(multiplierIsScoreShaped({
  dimensions: {
    trend_amplification: 2, momentum_trust_multiplier: 2,
    breakout_skepticism_multiplier: 2, leverage_risk_multiplier: 2,
    liquidity_fragility_multiplier: 2, narrative_sensitivity_multiplier: 2,
    risk_overhang_sensitivity_multiplier: 2,
  },
  description: 'ok',
}), 'C.32 collapsed detected as score-shaped');
assert(!multiplierIsScoreShaped({
  dimensions: g.multiplier.dimensions, description: 'ok',
}), 'C.33 varied multipliers not score-shaped');
assert(multiplierDescriptionHasActionBias('buy when regime flips'),
  'C.34 action-bias detected');
assert(!multiplierDescriptionHasActionBias('governed interpretive profile'),
  'C.35 clean description OK');
assert(listMissingOrOorMultiplierDimensions({
  dimensions: { ...g.multiplier.dimensions, liquidity_fragility_multiplier: 10 },
}).length === 1, 'C.36 missing-or-OOR lists OOR dimensions');

// Resolver helpers
assert(resolveL8RegimeConfidenceBand(0.2) === L8RegimeConfidenceBand.LOW,
  'C.37 band resolver LOW');
assert(resolveL8RegimeConfidenceBand(0.3) === L8RegimeConfidenceBand.MODERATE,
  'C.38 band resolver MODERATE');
assert(resolveL8RegimeConfidenceBand(0.9) === L8RegimeConfidenceBand.FULL,
  'C.39 band resolver FULL');
assert(resolveL8TransitionRiskClass(0.05) === L8TransitionRiskClass.STABLE,
  'C.40 transition resolver STABLE');
assert(resolveL8TransitionRiskClass(0.9) === L8TransitionRiskClass.CRITICAL,
  'C.41 transition resolver CRITICAL');
assert(resolveL8TransitionRiskClass(NaN) === 'UNRESOLVED',
  'C.42 transition resolver UNRESOLVED');

// High-risk detection
assert(transitionIsHighRisk({ transition_risk_class: L8TransitionRiskClass.HIGH }),
  'C.43 transitionIsHighRisk(HIGH)');
assert(!transitionIsHighRisk({ transition_risk_class: L8TransitionRiskClass.STABLE }),
  'C.44 transitionIsHighRisk(STABLE)');

// Cap-chain helper
assert(l8CapChainIsLegal({
  confidence_score_raw: 0.5,
  confidence_score_capped: 0.5,
  cap_chain: [],
}), 'C.45 equal raw/capped legal');
assert(!l8CapChainIsLegal({
  confidence_score_raw: 0.5,
  confidence_score_capped: 0.7,
  cap_chain: [],
}), 'C.46 capped > raw illegal');

// Helpers enum coverage
assert(ALL_L8_INSTABILITY_REASONS.length >= 10,
  'C.47 ≥10 instability reasons');
assert(L8_MULTIPLIER_MIN === 0 && L8_MULTIPLIER_MAX === 3,
  'C.48 multiplier bounds 0..3');

// Contract bundle contract version refs
assert(L8_CURRENT_CONTRACT_VERSIONS.subject_contract_version.startsWith('8.3'),
  'C.49 subject version tagged 8.3.x');
assert(L8_CURRENT_CONTRACT_VERSIONS.output_contract_version.startsWith('8.3'),
  'C.50 output version tagged 8.3.x');

// Hash helpers deterministic
const h1 = l8ContractFnv1aHex('macro-test');
const h2 = l8ContractFnv1aHex('macro-test');
assert(h1 === h2 && /^[0-9a-f]{8}$/.test(h1),
  'C.51 fnv1a deterministic + hex');
assert(buildL8ContractReplayHash('abc').startsWith('rhash_'),
  'C.52 replay hash prefix');

// ═══════════════════════════════════════════════════════════════
// BAND D — Cleanliness and Output Readiness
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Cleanliness and Output Readiness ═══');
resetAll();

// outputViolatesCleanliness helpers
const vcAmb = outputViolatesCleanliness({
  coexistence_class: L8RegimeCoexistenceClass.CLEAN_SINGLE,
  ambiguity_score: 0.6,
  staleness_score: 0,
  degradation_score: 0,
  transition_risk_score: 0,
  transition_risk_class: L8TransitionRiskClass.STABLE,
  regime_confidence_band: L8RegimeConfidenceBand.HIGH,
});
assert(vcAmb.cleanWhileAmbiguous, 'D.01 cleanWhileAmbiguous detected');
const vcStale = outputViolatesCleanliness({
  coexistence_class: L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
  ambiguity_score: 0,
  staleness_score: 0.7,
  degradation_score: 0,
  transition_risk_score: 0,
  transition_risk_class: L8TransitionRiskClass.STABLE,
  regime_confidence_band: L8RegimeConfidenceBand.HIGH,
});
assert(vcStale.cleanWhileStale, 'D.02 cleanWhileStale detected');
const vcDeg = outputViolatesCleanliness({
  coexistence_class: L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
  ambiguity_score: 0,
  staleness_score: 0,
  degradation_score: 0.7,
  transition_risk_score: 0,
  transition_risk_class: L8TransitionRiskClass.STABLE,
  regime_confidence_band: L8RegimeConfidenceBand.FULL,
});
assert(vcDeg.cleanWhileDegraded, 'D.03 cleanWhileDegraded detected');
const vcTrans = outputViolatesCleanliness({
  coexistence_class: L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
  ambiguity_score: 0,
  staleness_score: 0,
  degradation_score: 0,
  transition_risk_score: 0.9,
  transition_risk_class: L8TransitionRiskClass.STABLE,
  regime_confidence_band: L8RegimeConfidenceBand.MODERATE,
});
assert(vcTrans.cleanWhileTransitionHigh,
  'D.04 cleanWhileTransitionHigh detected');

assert(outputIsMaterialAmbiguous({ ambiguity_score: 0.5 }),
  'D.05 material ambiguity');
assert(outputIsMaterialStale({ staleness_score: 0.5 }), 'D.06 material stale');
assert(outputIsMaterialDegraded({ degradation_score: 0.5 }),
  'D.07 material degraded');
assert(outputIsHighTransition({ transition_risk_score: 0.8 }),
  'D.08 high transition');

// Output contract cleanliness paths
assert(!validateRegimeOutputContract({
  ...g.output,
  ambiguity_score: 0.7,
  coexistence_class: L8RegimeCoexistenceClass.CLEAN_SINGLE,
}).valid, 'D.09 clean-while-ambiguous blocked in output validator');

// Ambiguity escalation rule
const escalateAmb = validateRegimeOutputContract({
  ...g.output,
  ambiguity_score: 0.7,
  coexistence_class: L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
  secondary_regime: L8MacroRegimeClass.TRANSITION,
  secondary_regime_confidence: 0.4,
});
assert(!escalateAmb.valid, 'D.10 PRIMARY_PLUS_SECONDARY + high ambiguity blocked');
assert(escalateAmb.issues.some(i =>
  i.code === L8RegimeContractViolationCode.AMBIGUITY_POSTURE_REQUIRED),
  'D.11 AMBIGUITY_POSTURE_REQUIRED surfaced');

// Output readiness — green bundle
const readyReport = validateRegimeOutputReadiness(g);
assert(readyReport.emissible, 'D.12 green bundle emissible');
assert(readyReport.readiness_class ===
  L8RegimeOutputReadinessClass.CLEAN_EMISSION,
  'D.13 green bundle CLEAN_EMISSION');
assert(readyReport.issues.length === 0, 'D.14 no issues on green');
assert(l8GreenReadinessClass() === L8RegimeOutputReadinessClass.CLEAN_EMISSION,
  'D.15 readiness helper agrees');

// Readiness — modifier required (material staleness but within block thresholds)
const modReady = validateRegimeOutputReadiness({
  ...g,
  output: { ...g.output, ambiguity_score: 0.35 },
});
assert(!modReady.emissible,
  'D.16 material ambiguity on CLEAN_SINGLE bundle is not emissible');
assert(modReady.readiness_class ===
  L8RegimeOutputReadinessClass.BLOCKED_EMISSION,
  'D.17 blocked emission class');

// Readiness — degraded bundle
const degReady = validateRegimeOutputReadiness({
  ...g,
  output: { ...g.output, degradation_score: 0.1, staleness_score: 0.1 },
});
assert(degReady.emissible, 'D.18 benign bundle emissible');
assert(degReady.readiness_class ===
  L8RegimeOutputReadinessClass.CLEAN_EMISSION,
  'D.19 benign bundle stays CLEAN');

// Readiness — capped confidence path
const cappedBundle = {
  ...g,
  confidence: {
    ...g.confidence,
    confidence_score_raw: 0.8,
    confidence_score_capped: 0.4,
    confidence_band: L8RegimeConfidenceBand.MODERATE,
    cap_chain: [
      {
        cap_id: 'transition',
        cap_reason: 'TRANSITION_HIGH' as const,
        max_after_cap: 0.4,
        applied: true,
      },
    ],
  },
  output: {
    ...g.output,
    regime_confidence_score: 0.4,
    regime_confidence_band: L8RegimeConfidenceBand.MODERATE,
  },
};
const cappedReady = validateRegimeOutputReadiness(cappedBundle);
assert(cappedReady.emissible, 'D.20 capped-confidence bundle emissible');
assert(cappedReady.readiness_class ===
  L8RegimeOutputReadinessClass.CAPPED_CONFIDENCE,
  'D.21 capped-confidence class');

// Readiness — blocked on subject violation
const blockedReady = validateRegimeOutputReadiness({
  ...g,
  subject: { ...g.subject, regime_subject_id: '' },
});
assert(!blockedReady.emissible, 'D.22 subject violation blocks emission');
assert(blockedReady.readiness_class ===
  L8RegimeOutputReadinessClass.BLOCKED_EMISSION,
  'D.23 blocked class surfaced');
assert(blockedReady.issues.some(i => i.surface === 'SUBJECT'),
  'D.24 subject issue surface reported');

// ═══════════════════════════════════════════════════════════════
// BAND E — Compatibility, Audit, and Invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Compatibility, Audit, and Invariants ═══');
resetAll();

// Compatibility enum surface
assert(ALL_L8_CONTRACT_COMPATIBILITY_CLASSES.length === 5,
  'E.01 5 compatibility classes');
assert(ALL_L8_CONTRACT_SURFACES.length === 5, 'E.02 5 contract surfaces');
assert(ALL_L8_REGIME_CONTRACT_VIOLATION_CODES.length >= 40,
  `E.03 ≥40 contract violation codes (got ${ALL_L8_REGIME_CONTRACT_VIOLATION_CODES.length})`);
assert(ALL_L8_REGIME_OUTPUT_READINESS_CLASSES.length === 5,
  'E.04 5 readiness classes');

// Classifier
assert(
  classifyL8ContractDelta({
    surface: L8ContractSurface.OUTPUT,
    from: '8.3.0', to: '8.4.0',
    added_fields: ['new_field'],
    removed_fields: [],
    semantically_changed_fields: [],
    changed_enum_vocabularies: [],
    changed_default_policies: [],
    prohibited_change: false,
  }) === L8ContractCompatibilityClass.ADDITIVE_SAFE,
  'E.05 additive classifies as ADDITIVE_SAFE',
);
assert(
  classifyL8ContractDelta({
    surface: L8ContractSurface.OUTPUT,
    from: '8.3.0', to: '8.4.0',
    added_fields: [],
    removed_fields: [],
    semantically_changed_fields: [],
    changed_enum_vocabularies: [],
    changed_default_policies: ['multiplier-cap'],
    prohibited_change: false,
  }) === L8ContractCompatibilityClass.BACKWARD_COMPATIBLE,
  'E.06 default-policy change classifies as BACKWARD_COMPATIBLE',
);
assert(
  classifyL8ContractDelta({
    surface: L8ContractSurface.OUTPUT,
    from: '8.3.0', to: '8.4.0',
    added_fields: [],
    removed_fields: ['some_field'],
    semantically_changed_fields: [],
    changed_enum_vocabularies: [],
    changed_default_policies: [],
    prohibited_change: false,
  }) === L8ContractCompatibilityClass.MIGRATION_REQUIRED,
  'E.07 field removal classifies as MIGRATION_REQUIRED',
);
assert(
  classifyL8ContractDelta({
    surface: L8ContractSurface.OUTPUT,
    from: '8.3.0', to: '8.4.0',
    added_fields: [],
    removed_fields: [],
    semantically_changed_fields: ['primary_regime'],
    changed_enum_vocabularies: [],
    changed_default_policies: [],
    prohibited_change: false,
  }) === L8ContractCompatibilityClass.BREAKING_SEMANTIC,
  'E.08 semantic change classifies as BREAKING_SEMANTIC',
);
assert(
  classifyL8ContractDelta({
    surface: L8ContractSurface.OUTPUT,
    from: '8.3.0', to: '8.4.0',
    added_fields: [],
    removed_fields: [],
    semantically_changed_fields: [],
    changed_enum_vocabularies: [],
    changed_default_policies: [],
    prohibited_change: true,
  }) === L8ContractCompatibilityClass.PROHIBITED,
  'E.09 prohibited wins over all',
);

// Comparator
assert(compareL8ContractVersions('8.3.0', '8.3.0') === 0, 'E.10 cmp equal');
assert(compareL8ContractVersions('8.3.0', '8.3.1') === -1, 'E.11 cmp lt');
assert(compareL8ContractVersions('8.4.0', '8.3.0') === 1, 'E.12 cmp gt');
assert(compareL8ContractVersions('bad', '8.3.0') === 0,
  'E.13 cmp non-semver returns 0');

// Upgrade legality
assert(isLegalL8ContractUpgrade({
  surface: L8ContractSurface.OUTPUT,
  from: '8.3.0', to: '8.4.0',
  added_fields: ['x'], removed_fields: [],
  semantically_changed_fields: [], changed_enum_vocabularies: [],
  changed_default_policies: [], prohibited_change: false,
}), 'E.14 additive upgrade legal');
assert(!isLegalL8ContractUpgrade({
  surface: L8ContractSurface.OUTPUT,
  from: '8.3.0', to: '8.4.0',
  added_fields: [], removed_fields: [],
  semantically_changed_fields: ['x'], changed_enum_vocabularies: [],
  changed_default_policies: [], prohibited_change: false,
}), 'E.15 breaking upgrade illegal without opt');
assert(isLegalL8ContractUpgrade({
  surface: L8ContractSurface.OUTPUT,
  from: '8.3.0', to: '8.4.0',
  added_fields: [], removed_fields: [],
  semantically_changed_fields: ['x'], changed_enum_vocabularies: [],
  changed_default_policies: [], prohibited_change: false,
}, { allowBreaking: true }), 'E.16 breaking upgrade legal with opt');

// Compatibility validator reports
const compBreaking = validateRegimeContractCompatibility({
  delta: {
    surface: L8ContractSurface.OUTPUT,
    from: '8.3.0', to: '8.4.0',
    added_fields: [],
    removed_fields: [],
    semantically_changed_fields: ['primary_regime'],
    changed_enum_vocabularies: [],
    changed_default_policies: [],
    prohibited_change: false,
  },
  declared_classification: L8ContractCompatibilityClass.ADDITIVE_SAFE,
  allow_breaking: false,
  allow_migration_required: false,
});
assert(!compBreaking.valid, 'E.17 breaking + no allow blocked');
assert(compBreaking.issues.some(i =>
  i.code === L8RegimeContractViolationCode.COMPATIBILITY_CLASSIFICATION_MISMATCH),
  'E.18 classification mismatch surfaced');
assert(compBreaking.issues.some(i =>
  i.code === L8RegimeContractViolationCode.COMPATIBILITY_BREAKING_SEMANTIC_UNAPPROVED),
  'E.19 breaking-semantic-unapproved surfaced');

const compNonMono = validateRegimeContractCompatibility({
  delta: {
    surface: L8ContractSurface.OUTPUT,
    from: '8.3.0', to: '8.2.0',
    added_fields: ['x'],
    removed_fields: [],
    semantically_changed_fields: [],
    changed_enum_vocabularies: [],
    changed_default_policies: [],
    prohibited_change: false,
  },
  declared_classification: L8ContractCompatibilityClass.ADDITIVE_SAFE,
  allow_breaking: false,
  allow_migration_required: false,
});
assert(!compNonMono.valid, 'E.20 non-monotonic version blocked');
assert(compNonMono.issues.some(i =>
  i.code === L8RegimeContractViolationCode.COMPATIBILITY_NON_MONOTONIC_VERSION),
  'E.21 non-monotonic code surfaced');

const compRemove = validateRegimeContractCompatibility({
  delta: {
    surface: L8ContractSurface.SUBJECT,
    from: '8.3.0', to: '8.4.0',
    added_fields: [],
    removed_fields: ['confidence_derivation_spec'],
    semantically_changed_fields: [],
    changed_enum_vocabularies: [],
    changed_default_policies: [],
    prohibited_change: false,
  },
  declared_classification: L8ContractCompatibilityClass.MIGRATION_REQUIRED,
  allow_breaking: false,
  allow_migration_required: true,
});
assert(compRemove.issues.some(i =>
  i.code ===
    L8RegimeContractViolationCode.COMPATIBILITY_REQUIRED_FIELD_REMOVED),
  'E.22 required-field-removed surfaced');

const compProhibited = validateRegimeContractCompatibility({
  delta: {
    surface: L8ContractSurface.MULTIPLIER,
    from: '8.3.0', to: '8.4.0',
    added_fields: [],
    removed_fields: [],
    semantically_changed_fields: [],
    changed_enum_vocabularies: [],
    changed_default_policies: [],
    prohibited_change: true,
  },
  declared_classification: L8ContractCompatibilityClass.PROHIBITED,
  allow_breaking: true,
  allow_migration_required: true,
});
assert(!compProhibited.valid, 'E.23 prohibited change never legal');
assert(compProhibited.issues.some(i =>
  i.code === L8RegimeContractViolationCode.COMPATIBILITY_PROHIBITED),
  'E.24 prohibited code surfaced');

// Audit surface — emission smoke
emitL8SubjectContractViolation('src',
  L8RegimeContractViolationCode.SUBJECT_MISSING_IDENTITY,
  'rsub_x', 'missing id');
emitL8OutputContractViolation('src',
  L8RegimeContractViolationCode.OUTPUT_MISSING_VALIDATION_REFS,
  'rstate_x', 'missing val');
emitL8ConfidenceContractViolation('src',
  L8RegimeContractViolationCode.CONFIDENCE_BAND_INCONSISTENT,
  'rstate_x', 'band');
emitL8TransitionContractViolation('src',
  L8RegimeContractViolationCode.TRANSITION_CLASS_INCONSISTENT,
  'rstate_x', 'trans');
emitL8MultiplierContractViolation('src',
  L8RegimeContractViolationCode.MULTIPLIER_MISSING_DIMENSION,
  'rstate_x', 'multiplier');
emitL8CleanlinessViolation('src',
  L8RegimeContractViolationCode.CLEAN_WHILE_AMBIGUOUS,
  'rstate_x', 'clean ambiguous');
emitL8CompatibilityViolation('src',
  L8RegimeContractViolationCode.COMPATIBILITY_PROHIBITED,
  '8.4.0', 'prohibited');
emitL8MultiplierScoreOverrideViolation('src',
  'rstate_x', 'score shaped');

assert(getL8ContractAuditLog().length === 8,
  `E.25 8 audit records (got ${getL8ContractAuditLog().length})`);
assert(getL8ContractViolationCount() === 8, 'E.26 violation count matches');
assert(hasAnyL8ContractViolations(), 'E.27 hasAnyL8ContractViolations true');
assert(getL8ContractCriticalViolations().length >= 3,
  `E.28 ≥3 critical audits (got ${getL8ContractCriticalViolations().length})`);
assert(getL8ContractViolationsByCode(
  L8RegimeContractViolationCode.CLEAN_WHILE_AMBIGUOUS).length === 1,
  'E.29 query by code works');
assert(getL8ContractViolationsBySurface('SUBJECT').length === 1,
  'E.30 query by surface works');

// Custom audit record
const custom = emitL8ContractAuditRecord({
  violationCode: L8RegimeContractViolationCode.MULTIPLIER_ACTION_BIAS,
  source: 'custom',
  contractSurface: 'MULTIPLIER',
  subjectId: null,
  outputId: 'r',
  contractVersion: '8.3.0',
  detail: 'action bias',
  context: {},
  severity: 'HIGH',
});
assert(custom.timestamp.length > 0, 'E.31 audit timestamp set');
assert(getL8ContractAuditLog().length === 9, 'E.32 custom appended');

resetAll();
assert(!hasAnyL8ContractViolations(), 'E.33 reset clears audit log');

// Invariants INV-8.3-A..G
const inv = checkAllL83Invariants();
assert(inv.length === 7, 'E.34 7 L8.3 invariants');
for (const r of inv) {
  assert(r.holds, `E.inv.${r.id} ${r.evidence}`);
}

const a = checkINV_83_A(); assert(a.holds, `E.A ${a.evidence}`);
const b = checkINV_83_B(); assert(b.holds, `E.B ${b.evidence}`);
const c = checkINV_83_C(); assert(c.holds, `E.C ${c.evidence}`);
const d = checkINV_83_D(); assert(d.holds, `E.D ${d.evidence}`);
const e = checkINV_83_E(); assert(e.holds, `E.E ${e.evidence}`);
const f = checkINV_83_F(); assert(f.holds, `E.F ${f.evidence}`);
const gInv = checkINV_83_G(); assert(gInv.holds, `E.G ${gInv.evidence}`);

// Family / primary mismatch — family stays macro but primary moves into
// another family. The output validator must block this even though each
// enum value is individually registered.
const mismatched = validateRegimeOutputContract({
  ...g.output,
  regime_family: L8RegimeFamily.MACRO,
  primary_regime: L8CryptoStructureRegimeClass.SPOT_LED_EXPANSION,
});
assert(!mismatched.valid,
  'E.35 primary/family mismatch blocked by output validator');
assert(mismatched.issues.some(i =>
  i.code === L8RegimeContractViolationCode.OUTPUT_MISSING_PRIMARY_REGIME),
  'E.36 family mismatch surfaces OUTPUT_MISSING_PRIMARY_REGIME');

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n================================================================');
console.log(`L8.3 CONTRACTS — passed=${passed} failed=${failed}`);
console.log('================================================================');
if (failed > 0) {
  for (const fl of failures) console.log(`  - ${fl}`);
  process.exit(1);
} else {
  console.log('\n✓ Layer 8 universal regime contracts and output law green.');
  process.exit(0);
}
