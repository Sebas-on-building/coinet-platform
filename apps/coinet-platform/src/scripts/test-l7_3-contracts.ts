/**
 * L7.3 — Universal Contracts Certification Test Suite
 *
 * Bands per §7.3.9.2:
 *   A — Validation subject contracts
 *   B — Validation output contracts
 *   C — Contradiction bundles
 *   D — Confidence assessments
 *   E — Compatibility and replay
 *   F — Invariants and audit
 */

import {
  L7ValidationSubjectClass,
  L7MaterialityClass,
  L7ValidationClass,
  L7ValidationModifier,
  L7ConfidenceBand,
  L7ContradictionFamily,
  L7ContradictionSeverity,
  L7RestrictionRight,
  L7RestrictionReasonCode,
  L7ValidationIntent,
  L7StalenessPolicyClass,
  L7RuntimeStatusClass,
  L7ReplayIdentityMode,
  L7MaterializationReadinessState,
  L7ContractCompatibilityClass,
  L7ContractSurface,
  ALL_VALIDATION_INTENTS,
  ALL_STALENESS_POLICY_CLASSES,
  ALL_RUNTIME_STATUS_CLASSES,
  ALL_REPLAY_IDENTITY_MODES,
  ALL_MATERIALIZATION_READINESS_STATES,
  ALL_CONTRACT_COMPATIBILITY_CLASSES,
  ALL_CONTRACT_SURFACES,
  L7_CURRENT_CONTRACT_VERSIONS,
  classifyValidationContractDelta,
  compareValidationContractVersions,
  isLegalContractUpgrade,
  cleanlinessIsClean,
  isReadyState,
  L7ValidationSubjectContract,
  L7ValidationOutputContract,
  L7ContradictionBundleContract,
  L7ConfidenceAssessmentContract,
  L7ClaimRestrictionProfileContract,
  L7_SUBJECT_CONTRACT_REQUIRED_FIELDS,
  L7_OUTPUT_CONTRACT_REQUIRED_FIELDS,
  L7_CONTRADICTION_BUNDLE_CONTRACT_REQUIRED_FIELDS,
  L7_CONFIDENCE_CONTRACT_REQUIRED_FIELDS,
  L7_RESTRICTION_CONTRACT_REQUIRED_FIELDS,
  outputRequiresContradictionBundle,
  outputViolatesCleanliness,
  capChainIsLegal,
  computeRecordHighestSeverity,
  computeRecordDominantFamily,
  restrictionIsConsistentWithState,
} from '../l7/contracts';

import {
  L7ContractViolationCode,
  ALL_CONTRACT_VIOLATION_CODES,
  L7ContractError,
  validateValidationSubjectContractV3,
  validateValidationOutputContract,
  validateContradictionBundleContract,
  validateConfidenceAssessmentContract,
  validateRestrictionProfileContract,
  validateValidationContractCompatibility,
  canonicalJson,
  fnv1a64Hex,
  canonicalValidationReplayHash,
  isValidationMaterializationReady,
} from '../l7/validation';

import {
  resetContractAuditLog,
  emitContractAuditRecord,
  emitMalformedContractViolation,
  emitCompatibilityViolation,
  emitReplayAnomaly,
  emitCleanlinessViolation,
  getContractAuditLog,
  getContractViolationsByCode,
  getContractCriticalViolations,
  hasAnyContractViolations,
  getContractViolationCount,
} from '../l7/constitution';

import {
  runAllL7_3Invariants,
  checkInvariantA_subjectContractComplete,
  checkInvariantB_outputLinkage,
  checkInvariantC_contradictionBundlesTyped,
  checkInvariantD_confidenceFactors,
  checkInvariantE_restrictionProfilesUnambiguous,
  checkInvariantF_noHiddenCleanliness,
  checkInvariantG_compatibilityAndMaterialization,
} from '../l7/invariants';

let passed = 0;
let failed = 0;
function assert(cond: boolean, label: string): void {
  if (cond) passed++;
  else { failed++; console.error(`  ✗ FAIL: ${label}`); }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function makeSubjectContract(o: Partial<L7ValidationSubjectContract> = {}): L7ValidationSubjectContract {
  const base: L7ValidationSubjectContract = {
    validation_subject_id: 'vsub_x',
    claim_family: 'price_strength',
    claim_name: 'price_strength_state',
    claim_version: '1.0.0',
    subject_template_id: 'tpl_price_strength_state_1_0_0',
    subject_contract_version: '7.3.0',
    schema_version: '7.3.0',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    subject_class: L7ValidationSubjectClass.STATE_CLAIM,
    hybrid_subject_classes: [],
    materiality_class: L7MaterialityClass.STANDARD,
    validation_intent: L7ValidationIntent.SUPPORT_CONFIRMATION,
    required_support_inputs: [
      { ref: 'feature://price/momentum', family: 'PRICE_FAMILY', required: true, staleness_critical: true, evidence_only: false },
    ],
    required_challenge_inputs: [
      { ref: 'feature://price/funding_overheated', family: 'FUNDING_FAMILY', required: true, staleness_critical: false, evidence_only: false },
    ],
    optional_context_inputs: [],
    evidence_only_inputs: [],
    support_minimums: { support: 1, challenge: 0 },
    challenge_minimums: { support: 0, challenge: 1 },
    as_of: '2026-04-17T00:00:00Z',
    validation_window: {
      kind: 'ROLLING_WINDOW',
      anchor_ts: '2026-04-17T00:00:00Z',
      lookback_seconds: 3600,
      lookforward_seconds: 0,
      calendar_tag: null,
      event_anchor_ref: null,
      timezone: 'UTC',
    },
    freshness_budget_seconds: 600,
    staleness_policy: L7StalenessPolicyClass.DOWNGRADE,
    confirmation_rules: [{ rule_id: 'cf.basic', rule_version: '1.0.0' }],
    contradiction_rules: [{ rule_id: 'ct.basic', rule_version: '1.0.0' }],
    incompleteness_rules: [{ rule_id: 'ic.basic', rule_version: '1.0.0' }],
    ambiguity_rules: [{ rule_id: 'am.basic', rule_version: '1.0.0' }],
    degradation_rules: [{ rule_id: 'dg.basic', rule_version: '1.0.0' }],
    confidence_derivation_spec: {
      policy_id: 'pol_default',
      policy_version: '1.0.0',
      required_factors: [
        'source_trust_component',
        'freshness_component',
        'feature_completeness_component',
        'cross_source_agreement_component',
        'regime_compatibility_component',
        'historical_reliability_component',
        'contradiction_penalty_component',
      ],
      factor_weights: {
        source_trust_component: 0.2,
        freshness_component: 0.2,
        feature_completeness_component: 0.15,
        cross_source_agreement_component: 0.15,
        regime_compatibility_component: 0.1,
        historical_reliability_component: 0.1,
        contradiction_penalty_component: 0.1,
      },
      caps: ['CAP_INSUFFICIENT_SUPPORT'],
      materiality_modifier: 1.0,
    },
    restriction_derivation_spec: {
      policy_id: 'restr_default',
      policy_version: '1.0.0',
      deny_final_judgment_if_below_confidence: 0.4,
      require_contradiction_disclosure_if_severity_at_least: L7ContradictionSeverity.MATERIAL,
      downgrade_to_evidence_only_if_staleness_material: true,
      require_additional_confirmation_if_support_incomplete: true,
    },
    materialization_policy: 'EAGER',
    evidence_pack_policy: 'OPTIONAL',
    evidence_requirements: {
      min_support_surfaces: 1,
      min_challenge_surfaces: 1,
      required_support_patterns: [],
      required_challenge_patterns: [],
      evidence_pack_policy: 'OPTIONAL',
    },
    regime_assumption_profile: { declared: false, regime_tags: [], compatibility_mode: 'NONE' },
    expected_risk_overhang_types: [],
    ambiguity_tolerance_profile: { max_stale_seconds: 600, max_missing_required_surfaces: 0, max_ambiguity_score: 0.5, max_degradation_score: 0.5 },
    incompleteness_tolerance_profile: { max_stale_seconds: 600, max_missing_required_surfaces: 0, max_ambiguity_score: 0.5, max_degradation_score: 0.5 },
    degradation_tolerance_profile: { max_stale_seconds: 600, max_missing_required_surfaces: 0, max_ambiguity_score: 0.5, max_degradation_score: 0.5 },
    staleness_tolerance_profile: { max_stale_seconds: 600, max_missing_required_surfaces: 0, max_ambiguity_score: 0.5, max_degradation_score: 0.5 },
    subject_replay_mode_eligibility: ['LIVE', 'REPLAY', 'REPAIR'],
    subject_materialization_mode_eligibility: ['EAGER', 'ON_DEMAND'],
    lineage_refs: { trace_id: 'tr_1', manifest_id: 'mf_1', upstream_refs: [] },
    created_by: 'test',
    created_at: '2026-04-17T00:00:00Z',
    description: 'BTC price strength state',
  };
  return { ...base, ...o };
}

function makeRestriction(o: Partial<L7ClaimRestrictionProfileContract> = {}): L7ClaimRestrictionProfileContract {
  const base: L7ClaimRestrictionProfileContract = {
    restriction_profile_id: 'rp_1',
    validation_subject_id: 'vsub_x',
    restriction_contract_version: '7.3.0',
    schema_version: '7.3.0',
    downstream_use_rights: [
      L7RestrictionRight.USABLE_FOR_REGIME_INPUT,
      L7RestrictionRight.USABLE_FOR_SCENARIO_WEIGHTING,
    ],
    requires_contradiction_disclosure: false,
    requires_additional_confirmation: false,
    allowed_for_regime_input: true,
    allowed_for_scenario_weighting: true,
    allowed_for_deterministic_scoring: false,
    allowed_for_final_judgment: false,
    evidence_only_mode: false,
    restriction_reasons: [L7RestrictionReasonCode.CONFIRMED_NO_RISK],
    lineage_refs: { trace_id: 'tr_1', manifest_id: 'mf_1' },
    compute_run_id: 'run_1',
    replay_hash: 'rh_aaaa',
  };
  return { ...base, ...o };
}

function makeOutput(o: Partial<L7ValidationOutputContract> = {}): L7ValidationOutputContract {
  const base: L7ValidationOutputContract = {
    validation_result_id: 'vres_1',
    validation_subject_id: 'vsub_x',
    subject_contract_ref: 'tpl_price_strength_state_1_0_0',
    validation_contract_version: '7.3.0',
    schema_version: '7.3.0',
    claim_family: 'price_strength',
    claim_version: '1.0.0',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    as_of: '2026-04-17T00:00:00Z',
    validation_class: L7ValidationClass.CONFIRMED,
    validation_modifiers: [],
    validation_status: L7RuntimeStatusClass.CLEAN,
    support_strength_score: 0.8,
    contradiction_severity_score: 0,
    incompleteness_score: 0,
    staleness_score: 0,
    ambiguity_score: 0,
    degradation_score: 0,
    confidence_score: 0.7,
    confidence_band: L7ConfidenceBand.HIGH,
    confidence_assessment_ref: 'conf_1',
    contradiction_bundle_ref: null,
    support_refs: ['feature://price/momentum'],
    evidence_pack_ref: null,
    input_snapshot_ref: 'snap_1',
    restriction_profile: makeRestriction(),
    restriction_profile_ref: null,
    materialization_mode: 'EAGER',
    replay_mode_flag: L7ReplayIdentityMode.LIVE,
    repair_mode_flag: false,
    late_data_class: 'NONE',
    compute_run_id: 'run_1',
    replay_hash: 'rh_zzzz',
    runtime_integrity_flags: {
      input_snapshot_hash_match: true,
      contract_version_match: true,
      replay_hash_stable: true,
      evidence_refs_resolvable: true,
      subject_contract_resolvable: true,
    },
    lineage_refs: { trace_id: 'tr_1', manifest_id: 'mf_1' },
  };
  return { ...base, ...o };
}

function makeBundle(o: Partial<L7ContradictionBundleContract> = {}): L7ContradictionBundleContract {
  const recs = [
    {
      contradiction_record_id: 'cr_1',
      family: L7ContradictionFamily.PRICE_FLOW_DIVERGENCE,
      severity: L7ContradictionSeverity.MATERIAL,
      support_ref: 'feature://price/momentum',
      challenge_ref: 'feature://flows/outflow',
      temporal_status: 'CURRENT' as const,
      hard_contradiction: true,
      blocked_confirmation: true,
      capped_confidence_only: false,
      evidence_refs: ['ev_1'],
      lineage_refs: { trace_id: 'tr_1', upstream_refs: ['feature://flows/outflow'] },
      rationale: 'price up but outflows large',
      detected_at: '2026-04-17T00:00:00Z',
    },
  ];
  const base: L7ContradictionBundleContract = {
    contradiction_bundle_id: 'cb_1',
    validation_subject_id: 'vsub_x',
    contradiction_contract_version: '7.3.0',
    schema_version: '7.3.0',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    as_of: '2026-04-17T00:00:00Z',
    contradiction_records: recs,
    contradiction_cluster_count: 1,
    cluster_summary: [
      {
        cluster_id: 'cl_1',
        family: L7ContradictionFamily.PRICE_FLOW_DIVERGENCE,
        record_count: 1,
        highest_severity: L7ContradictionSeverity.MATERIAL,
        aggregate_penalty: 0.2,
      },
    ],
    highest_severity: L7ContradictionSeverity.MATERIAL,
    dominant_contradiction_family: L7ContradictionFamily.PRICE_FLOW_DIVERGENCE,
    blocked_confirmation_surfaces: ['feature://price/momentum'],
    stale_support_refs: [],
    missing_support_refs: [],
    challenge_surface_refs: ['feature://flows/outflow'],
    bundle_materiality_class: L7MaterialityClass.STANDARD,
    aggregate_penalty_score: 0.2,
    critical_contradiction_flag: false,
    degraded_evidence_flag: false,
    materialization_mode: 'EAGER',
    lineage_refs: { trace_id: 'tr_1', manifest_id: 'mf_1' },
    compute_run_id: 'run_1',
    replay_hash: 'rh_bbbb',
  };
  return { ...base, ...o };
}

function makeConfidence(o: Partial<L7ConfidenceAssessmentContract> = {}): L7ConfidenceAssessmentContract {
  const base: L7ConfidenceAssessmentContract = {
    confidence_assessment_id: 'conf_1',
    validation_subject_id: 'vsub_x',
    subject_contract_ref: 'tpl_price_strength_state_1_0_0',
    confidence_contract_version: '7.3.0',
    schema_version: '7.3.0',
    confidence_policy_version: '1.0.0',
    raw_score: 0.7,
    capped_score: 0.7,
    confidence_score: 0.7,
    confidence_band: L7ConfidenceBand.HIGH,
    materiality_modifier: 1.0,
    components: {
      source_trust_component: 0.8,
      freshness_component: 0.7,
      feature_completeness_component: 0.7,
      cross_source_agreement_component: 0.6,
      regime_compatibility_component: 0.7,
      historical_reliability_component: 0.7,
      contradiction_penalty_component: 0.0,
    },
    component_weights: {
      source_trust_weight: 0.2,
      freshness_weight: 0.2,
      feature_completeness_weight: 0.15,
      cross_source_agreement_weight: 0.15,
      regime_compatibility_weight: 0.1,
      historical_reliability_weight: 0.1,
      contradiction_penalty_weight: 0.1,
    },
    cap_chain: [],
    restriction_profile_ref: 'rp_1',
    rationale_codes: ['CONFIRMED_HIGH'],
    lineage_refs: { trace_id: 'tr_1', manifest_id: 'mf_1' },
    compute_run_id: 'run_1',
    replay_hash: 'rh_cccc',
  };
  return { ...base, ...o };
}

console.log('━'.repeat(72));
console.log('L7.3 — Universal Contracts Certification Suite');
console.log('━'.repeat(72));

// ─────────────────────────────────────────────────────────────────────────
// Band A — Validation subject contracts
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[Band A] Validation subject contracts');

assert(ALL_VALIDATION_INTENTS.length === 10, 'A.1 — 10 validation intents registered');
assert(ALL_STALENESS_POLICY_CLASSES.length === 4, 'A.2 — 4 staleness policy classes registered');
assert(L7_SUBJECT_CONTRACT_REQUIRED_FIELDS.length >= 20, 'A.3 — subject contract has comprehensive required-fields list');

// Valid subject accepted
{
  const r = validateValidationSubjectContractV3(makeSubjectContract());
  assert(r.valid && r.violations.length === 0, 'A.4 — fully populated subject contract accepted');
}

// Each missing required field is rejected
{
  const fieldsToBlank: (keyof L7ValidationSubjectContract)[] = [
    'validation_subject_id', 'claim_family', 'claim_name', 'claim_version',
    'subject_template_id', 'subject_contract_version', 'schema_version',
    'scope_type', 'scope_id', 'subject_class', 'materiality_class', 'validation_intent',
    'as_of',
  ];
  for (let i = 0; i < fieldsToBlank.length; i++) {
    const f = fieldsToBlank[i];
    const subj = makeSubjectContract({ [f]: undefined as unknown as never });
    const r = validateValidationSubjectContractV3(subj);
    assert(!r.valid, `A.5.${i} — missing '${String(f)}' rejected`);
  }
}

// Empty support / challenge inputs rejected
{
  const r1 = validateValidationSubjectContractV3(makeSubjectContract({ required_support_inputs: [] }));
  assert(
    !r1.valid && r1.violations.some(v => v.code === L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_SUPPORT_INPUTS),
    'A.6 — empty required_support_inputs rejected',
  );
  const r2 = validateValidationSubjectContractV3(makeSubjectContract({ required_challenge_inputs: [] }));
  assert(
    !r2.valid && r2.violations.some(v => v.code === L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_CHALLENGE_INPUTS),
    'A.7 — empty required_challenge_inputs rejected',
  );
}

// Bad validation intent rejected
{
  const r = validateValidationSubjectContractV3(makeSubjectContract({ validation_intent: 'NONSENSE' as unknown as L7ValidationIntent }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_INTENT),
    'A.8 — unregistered validation_intent rejected',
  );
}

// Bad staleness policy rejected
{
  const r = validateValidationSubjectContractV3(makeSubjectContract({ staleness_policy: 'BOGUS' as unknown as L7StalenessPolicyClass }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_STALENESS_POLICY),
    'A.9 — unregistered staleness_policy rejected',
  );
}

// Missing rule refs rejected
{
  const r = validateValidationSubjectContractV3(makeSubjectContract({
    confirmation_rules: [],
    contradiction_rules: [],
  }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_RULE_REFS),
    'A.10 — empty confirmation/contradiction rules rejected',
  );
}

// Missing confidence/restriction derivation specs rejected
{
  const r = validateValidationSubjectContractV3(makeSubjectContract({
    confidence_derivation_spec: undefined as unknown as never,
  }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_CONFIDENCE_SPEC),
    'A.11 — missing confidence_derivation_spec rejected',
  );
  const r2 = validateValidationSubjectContractV3(makeSubjectContract({
    restriction_derivation_spec: undefined as unknown as never,
  }));
  assert(
    !r2.valid && r2.violations.some(v => v.code === L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_RESTRICTION_SPEC),
    'A.12 — missing restriction_derivation_spec rejected',
  );
}

// Missing version rejected
{
  const r = validateValidationSubjectContractV3(makeSubjectContract({
    subject_contract_version: '' as never,
    schema_version: '' as never,
  }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_VERSION),
    'A.13 — missing subject_contract_version / schema_version rejected',
  );
}

// Missing lineage rejected
{
  const r = validateValidationSubjectContractV3(makeSubjectContract({
    lineage_refs: { trace_id: '', manifest_id: '', upstream_refs: [] },
  }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_LINEAGE),
    'A.14 — missing lineage_refs rejected',
  );
}

// Illegal scope for subject class rejected
{
  const r = validateValidationSubjectContractV3(makeSubjectContract({
    subject_class: L7ValidationSubjectClass.NARRATIVE_CLAIM,
    scope_type: 'ASSET',
  }));
  assert(!r.valid, 'A.15 — illegal scope_type for subject_class rejected');
}

// All known intents accepted
{
  let allOk = true;
  for (const intent of ALL_VALIDATION_INTENTS) {
    const r = validateValidationSubjectContractV3(makeSubjectContract({ validation_intent: intent }));
    if (!r.valid) allOk = false;
  }
  assert(allOk, 'A.16 — every registered intent accepts a sound subject contract');
}

// ─────────────────────────────────────────────────────────────────────────
// Band B — Validation output contracts
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[Band B] Validation output contracts');

assert(ALL_RUNTIME_STATUS_CLASSES.length === 6, 'B.1 — 6 runtime status classes registered');
assert(ALL_REPLAY_IDENTITY_MODES.length === 4, 'B.2 — 4 replay identity modes registered');
assert(L7_OUTPUT_CONTRACT_REQUIRED_FIELDS.length >= 20, 'B.3 — output contract has comprehensive required-fields list');

// Valid output accepted
{
  const r = validateValidationOutputContract(makeOutput());
  assert(r.valid && r.violations.length === 0, 'B.4 — fully populated output contract accepted');
}

// Missing subject linkage rejected
{
  const r = validateValidationOutputContract(makeOutput({ validation_subject_id: '', subject_contract_ref: '' }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.OUTPUT_CONTRACT_MISSING_SUBJECT_LINK),
    'B.5 — missing subject linkage rejected',
  );
}

// Contradiction implied but bundle missing rejected
{
  const r = validateValidationOutputContract(makeOutput({
    contradiction_severity_score: 0.5,
    contradiction_bundle_ref: null,
  }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.OUTPUT_CONTRACT_MISSING_CONTRADICTION_BUNDLE),
    'B.6 — contradiction severity > 0 but no bundle rejected',
  );
  const r2 = validateValidationOutputContract(makeOutput({
    validation_class: L7ValidationClass.CONFLICTING,
    contradiction_bundle_ref: null,
  }));
  assert(
    !r2.valid && r2.violations.some(v => v.code === L7ContractViolationCode.OUTPUT_CONTRACT_MISSING_CONTRADICTION_BUNDLE),
    'B.7 — CONFLICTING class without bundle rejected',
  );
  assert(outputRequiresContradictionBundle({
    contradiction_severity_score: 0,
    validation_class: L7ValidationClass.CONFIRMED,
    validation_modifiers: [L7ValidationModifier.UNRESOLVED_CONTRADICTION_PRESENT],
  }), 'B.8 — modifier UNRESOLVED_CONTRADICTION_PRESENT requires bundle');
}

// Missing confidence/restriction linkage rejected
{
  const r = validateValidationOutputContract(makeOutput({ confidence_assessment_ref: '' as never }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.OUTPUT_CONTRACT_MISSING_CONFIDENCE_LINK),
    'B.9 — missing confidence_assessment_ref rejected',
  );
  const r2 = validateValidationOutputContract(makeOutput({ restriction_profile: null, restriction_profile_ref: null }));
  assert(
    !r2.valid && r2.violations.some(v => v.code === L7ContractViolationCode.OUTPUT_CONTRACT_MISSING_RESTRICTION_PROFILE),
    'B.10 — missing restriction profile (no embed, no ref) rejected',
  );
}

// Cleanliness violation rejected
{
  const r = validateValidationOutputContract(makeOutput({
    validation_status: L7RuntimeStatusClass.CLEAN,
    staleness_score: 0.5,
  }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.OUTPUT_CONTRACT_HIDDEN_CLEANLINESS),
    'B.11 — CLEAN status with material staleness rejected',
  );
  const r2 = validateValidationOutputContract(makeOutput({
    validation_status: L7RuntimeStatusClass.CLEAN,
    validation_modifiers: [L7ValidationModifier.STALE_SUPPORT_PRESENT],
  }));
  assert(
    !r2.valid && r2.violations.some(v => v.code === L7ContractViolationCode.OUTPUT_CONTRACT_HIDDEN_CLEANLINESS),
    'B.12 — CLEAN status with STALE_SUPPORT_PRESENT modifier rejected',
  );
}

// Score out of range rejected
{
  const r = validateValidationOutputContract(makeOutput({ confidence_score: 1.5 }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.OUTPUT_CONTRACT_SCORE_OUT_OF_RANGE),
    'B.13 — confidence_score > 1 rejected',
  );
  const r2 = validateValidationOutputContract(makeOutput({ support_strength_score: -0.1 }));
  assert(
    !r2.valid && r2.violations.some(v => v.code === L7ContractViolationCode.OUTPUT_CONTRACT_SCORE_OUT_OF_RANGE),
    'B.14 — negative support_strength_score rejected',
  );
}

// Band-score mismatch rejected
{
  const r = validateValidationOutputContract(makeOutput({
    confidence_score: 0.1,
    confidence_band: L7ConfidenceBand.HIGH,
  }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.OUTPUT_CONTRACT_BAND_SCORE_MISMATCH),
    'B.15 — confidence_band does not match confidence_score rejected',
  );
}

// Runtime integrity flags broken rejected
{
  const r = validateValidationOutputContract(makeOutput({
    runtime_integrity_flags: {
      input_snapshot_hash_match: false,
      contract_version_match: true,
      replay_hash_stable: true,
      evidence_refs_resolvable: true,
      subject_contract_resolvable: true,
    },
  }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.OUTPUT_CONTRACT_RUNTIME_INTEGRITY_VIOLATION),
    'B.16 — broken runtime integrity flag rejected',
  );
}

// Cleanliness helper agrees with validator
{
  assert(!outputViolatesCleanliness(makeOutput()), 'B.17 — clean output is clean');
  assert(outputViolatesCleanliness(makeOutput({
    validation_status: L7RuntimeStatusClass.CLEAN,
    contradiction_severity_score: 0.6,
  })), 'B.18 — CLEAN with contradiction violates cleanliness');
}

// ─────────────────────────────────────────────────────────────────────────
// Band C — Contradiction bundles
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[Band C] Contradiction bundles');

assert(L7_CONTRADICTION_BUNDLE_CONTRACT_REQUIRED_FIELDS.length >= 12, 'C.1 — bundle contract required-fields list comprehensive');

// Valid bundle accepted
{
  const r = validateContradictionBundleContract(makeBundle());
  assert(r.valid && r.violations.length === 0, 'C.2 — fully populated bundle accepted');
}

// Severity mismatch rejected
{
  const r = validateContradictionBundleContract(makeBundle({
    highest_severity: L7ContradictionSeverity.SEVERE,
  }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.CONTRADICTION_CONTRACT_SEVERITY_MISMATCH),
    'C.3 — declared highest_severity != derived rejected',
  );
}

// Dominant family mismatch rejected
{
  const r = validateContradictionBundleContract(makeBundle({
    dominant_contradiction_family: L7ContradictionFamily.SIGNAL_STALENESS,
  }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.CONTRADICTION_CONTRACT_DOMINANT_FAMILY_MISMATCH),
    'C.4 — declared dominant family != derived rejected',
  );
}

// Cluster count mismatch rejected
{
  const r = validateContradictionBundleContract(makeBundle({ contradiction_cluster_count: 99 }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.CONTRADICTION_CONTRACT_CLUSTER_COUNT_MISMATCH),
    'C.5 — cluster_count vs cluster_summary mismatch rejected',
  );
}

// Untyped record rejected
{
  const bad = makeBundle();
  const recs = [
    { ...bad.contradiction_records[0], family: 'BOGUS' as unknown as L7ContradictionFamily },
  ];
  const r = validateContradictionBundleContract({ ...bad, contradiction_records: recs });
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.CONTRADICTION_CONTRACT_UNTYPED_RECORD),
    'C.6 — record with unregistered family rejected',
  );
}

// Blocked surfaces missing rejected
{
  const r = validateContradictionBundleContract(makeBundle({ blocked_confirmation_surfaces: [] }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.CONTRADICTION_CONTRACT_BLOCKED_SURFACES_MISSING),
    'C.7 — blocked_confirmation true but no surfaces rejected',
  );
}

// Stale-record without stale_support_refs rejected
{
  const bad = makeBundle();
  const recs = [{ ...bad.contradiction_records[0], temporal_status: 'STALE' as const }];
  const r = validateContradictionBundleContract({ ...bad, contradiction_records: recs, stale_support_refs: [] });
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.CONTRADICTION_CONTRACT_STALE_REFS_MISSING),
    'C.8 — STALE record but no stale_support_refs rejected',
  );
}

// Missing version rejected
{
  const r = validateContradictionBundleContract(makeBundle({
    contradiction_contract_version: '' as never,
    schema_version: '' as never,
  }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.CONTRADICTION_CONTRACT_MISSING_VERSION),
    'C.9 — missing bundle version rejected',
  );
}

// Missing lineage / replay_hash rejected
{
  const r = validateContradictionBundleContract(makeBundle({
    lineage_refs: { trace_id: '', manifest_id: '' },
    replay_hash: '' as never,
  }));
  assert(
    !r.valid &&
      r.violations.some(v => v.code === L7ContractViolationCode.CONTRADICTION_CONTRACT_MISSING_LINEAGE) &&
      r.violations.some(v => v.code === L7ContractViolationCode.CONTRADICTION_CONTRACT_MISSING_REPLAY_HASH),
    'C.10 — missing bundle lineage and replay_hash rejected',
  );
}

// Helpers compute consistent values
{
  const recs = makeBundle().contradiction_records;
  assert(computeRecordHighestSeverity(recs) === L7ContradictionSeverity.MATERIAL, 'C.11 — computeRecordHighestSeverity correct');
  assert(computeRecordDominantFamily(recs) === L7ContradictionFamily.PRICE_FLOW_DIVERGENCE, 'C.12 — computeRecordDominantFamily correct');
}

// ─────────────────────────────────────────────────────────────────────────
// Band D — Confidence assessments
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[Band D] Confidence assessments');

assert(L7_CONFIDENCE_CONTRACT_REQUIRED_FIELDS.length >= 14, 'D.1 — confidence contract required-fields list comprehensive');

// Valid confidence accepted
{
  const r = validateConfidenceAssessmentContract(makeConfidence());
  assert(r.valid && r.violations.length === 0, 'D.2 — fully populated confidence accepted');
}

// Score out of range rejected
{
  const r = validateConfidenceAssessmentContract(makeConfidence({
    raw_score: 0.7, capped_score: 0.7, confidence_score: 1.5,
  }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.CONFIDENCE_CONTRACT_SCORE_OUT_OF_RANGE),
    'D.3 — score > 1 rejected',
  );
}

// Band mismatch rejected
{
  const r = validateConfidenceAssessmentContract(makeConfidence({
    raw_score: 0.1, capped_score: 0.1, confidence_score: 0.1,
    confidence_band: L7ConfidenceBand.VERY_HIGH,
  }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.CONFIDENCE_CONTRACT_BAND_MISMATCH),
    'D.4 — band/score mismatch rejected',
  );
}

// Factors incomplete rejected
{
  const r = validateConfidenceAssessmentContract(makeConfidence({
    components: {
      source_trust_component: 0.8,
      freshness_component: 0.7,
      feature_completeness_component: 0.7,
      cross_source_agreement_component: 0.6,
      regime_compatibility_component: 0.7,
      historical_reliability_component: 0.7,
      contradiction_penalty_component: undefined as unknown as number,
    },
  }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.CONFIDENCE_CONTRACT_FACTORS_INCOMPLETE),
    'D.5 — incomplete component factors rejected',
  );
}

// Weights incomplete rejected
{
  const w = makeConfidence().component_weights;
  const r = validateConfidenceAssessmentContract(makeConfidence({
    component_weights: { ...w, contradiction_penalty_weight: undefined as unknown as number },
  }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.CONFIDENCE_CONTRACT_WEIGHTS_INCOMPLETE),
    'D.6 — incomplete weights rejected',
  );
}

// Cap chain illegal rejected (capped > raw)
{
  const r = validateConfidenceAssessmentContract(makeConfidence({
    raw_score: 0.5, capped_score: 0.7, confidence_score: 0.7,
  }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.CONFIDENCE_CONTRACT_CAP_CHAIN_ILLEGAL),
    'D.7 — capped > raw rejected',
  );
}

// Cap applied but cap_chain absent rejected
{
  const r = validateConfidenceAssessmentContract(makeConfidence({
    raw_score: 0.9, capped_score: 0.5, confidence_score: 0.5,
    cap_chain: [],
  }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.CONFIDENCE_CONTRACT_CAP_CHAIN_ILLEGAL),
    'D.8 — capped < raw without cap_chain rejected',
  );
}

// Cap applied and cap_chain explains it accepted
{
  const r = validateConfidenceAssessmentContract(makeConfidence({
    raw_score: 0.9,
    capped_score: 0.5,
    confidence_score: 0.5,
    confidence_band: L7ConfidenceBand.MODERATE,
    cap_chain: [{ cap_code: 'CAP_X', applied: true, max_after_cap: 0.5, reason: 'capped' }],
  }));
  assert(r.valid, 'D.9 — capped < raw with explaining cap_chain accepted');
}

// Contradiction present but penalty zero rejected
{
  const r = validateConfidenceAssessmentContract(
    makeConfidence({
      components: {
        source_trust_component: 0.8,
        freshness_component: 0.7,
        feature_completeness_component: 0.7,
        cross_source_agreement_component: 0.6,
        regime_compatibility_component: 0.7,
        historical_reliability_component: 0.7,
        contradiction_penalty_component: 0,
      },
    }),
    { contradictionPresent: true },
  );
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.CONFIDENCE_CONTRACT_PENALTY_MISSING),
    'D.10 — contradiction present but contradiction_penalty_component=0 rejected',
  );
}

// Missing rationale codes rejected
{
  const r = validateConfidenceAssessmentContract(makeConfidence({ rationale_codes: [] }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.CONFIDENCE_CONTRACT_RATIONALE_MISSING),
    'D.11 — empty rationale_codes rejected',
  );
}

// Missing restriction profile ref rejected
{
  const r = validateConfidenceAssessmentContract(makeConfidence({ restriction_profile_ref: null }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.CONFIDENCE_CONTRACT_RESTRICTION_LINK_MISSING),
    'D.12 — missing restriction_profile_ref rejected',
  );
}

// Missing version rejected
{
  const r = validateConfidenceAssessmentContract(makeConfidence({
    confidence_contract_version: '' as never,
    schema_version: '' as never,
    confidence_policy_version: '' as never,
  }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.CONFIDENCE_CONTRACT_MISSING_VERSION),
    'D.13 — missing confidence version rejected',
  );
}

// capChainIsLegal helper smoke
{
  assert(capChainIsLegal({ raw_score: 0.5, capped_score: 0.5, confidence_score: 0.5, cap_chain: [] }), 'D.14 — capChainIsLegal: trivial pass');
  assert(!capChainIsLegal({ raw_score: 0.5, capped_score: 0.7, confidence_score: 0.7, cap_chain: [] }), 'D.15 — capChainIsLegal: capped>raw fails');
}

// Restriction profile contract checks
{
  const r = validateRestrictionProfileContract(makeRestriction());
  assert(r.valid && r.violations.length === 0, 'D.16 — clean restriction profile accepted');
}
{
  const r = validateRestrictionProfileContract(makeRestriction({
    downstream_use_rights: [L7RestrictionRight.USABLE_FOR_FINAL_JUDGMENT, L7RestrictionRight.EVIDENCE_ONLY],
    allowed_for_final_judgment: true,
    evidence_only_mode: true,
  }));
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.RESTRICTION_CONTRACT_RIGHTS_CONFLICT),
    'D.17 — conflicting rights rejected',
  );
}
{
  const r = validateRestrictionProfileContract(makeRestriction({
    requires_contradiction_disclosure: true,
    downstream_use_rights: [L7RestrictionRight.USABLE_FOR_REGIME_INPUT],
    allowed_for_regime_input: true,
    allowed_for_scenario_weighting: false,
  }));
  assert(
    !r.valid &&
      r.violations.some(v => v.code === L7ContractViolationCode.RESTRICTION_CONTRACT_DISCLOSURE_REQUIRED_BUT_MISSING),
    'D.18 — disclosure required but USABLE_WITH_CONTRADICTION_DISCLOSURE_ONLY missing rejected',
  );
}
{
  const r = validateRestrictionProfileContract(makeRestriction({
    downstream_use_rights: [L7RestrictionRight.USABLE_FOR_FINAL_JUDGMENT],
    allowed_for_regime_input: false,
    allowed_for_scenario_weighting: false,
    allowed_for_deterministic_scoring: false,
    allowed_for_final_judgment: true,
  }), {
    consistencyContext: {
      validation_class: L7ValidationClass.CONFIRMED,
      confidence_band: L7ConfidenceBand.LOW,
      highest_contradiction_severity: null,
      staleness_material: false,
      incompleteness_material: false,
    },
  });
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.RESTRICTION_CONTRACT_INCONSISTENT_WITH_CONFIDENCE),
    'D.19 — final judgment with LOW confidence inconsistent rejected',
  );
}
{
  const r = validateRestrictionProfileContract(makeRestriction({
    downstream_use_rights: [L7RestrictionRight.USABLE_FOR_FINAL_JUDGMENT],
    allowed_for_regime_input: false,
    allowed_for_scenario_weighting: false,
    allowed_for_deterministic_scoring: false,
    allowed_for_final_judgment: true,
  }), {
    consistencyContext: {
      validation_class: L7ValidationClass.CONFIRMED,
      confidence_band: L7ConfidenceBand.HIGH,
      highest_contradiction_severity: L7ContradictionSeverity.SEVERE,
      staleness_material: false,
      incompleteness_material: false,
    },
  });
  assert(
    !r.valid && r.violations.some(v => v.code === L7ContractViolationCode.RESTRICTION_CONTRACT_INCONSISTENT_WITH_CONTRADICTION),
    'D.20 — SEVERE contradiction without disclosure inconsistent rejected',
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Band E — Compatibility, replay identity, and materialization readiness
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[Band E] Compatibility, replay identity, materialization readiness');

assert(ALL_CONTRACT_COMPATIBILITY_CLASSES.length === 5, 'E.1 — 5 compatibility classes registered');
assert(ALL_CONTRACT_SURFACES.length === 5, 'E.2 — 5 contract surfaces registered');
assert(ALL_MATERIALIZATION_READINESS_STATES.length >= 7, 'E.3 — readiness state set comprehensive');

// Version comparison
{
  assert(compareValidationContractVersions('7.3.0', '7.3.0') === 0, 'E.4 — equal versions compare 0');
  assert(compareValidationContractVersions('7.3.0', '7.3.1') < 0, 'E.5 — patch ordering correct');
  assert(compareValidationContractVersions('7.4.0', '7.3.5') > 0, 'E.6 — minor ordering correct');
  assert(compareValidationContractVersions('8.0.0', '7.99.99') > 0, 'E.7 — major ordering correct');
}

// Compatibility classification
{
  assert(
    classifyValidationContractDelta({
      surface: L7ContractSurface.SUBJECT, from: '7.3.0', to: '7.3.1',
      added_fields: ['new_field'], removed_fields: [],
      semantically_changed_fields: [], changed_enum_vocabularies: [],
      changed_default_policies: [], prohibited_change: false,
    }) === L7ContractCompatibilityClass.ADDITIVE_SAFE,
    'E.8 — additive-only delta classified ADDITIVE_SAFE',
  );
  assert(
    classifyValidationContractDelta({
      surface: L7ContractSurface.SUBJECT, from: '7.3.0', to: '7.4.0',
      added_fields: [], removed_fields: ['old_field'],
      semantically_changed_fields: [], changed_enum_vocabularies: [],
      changed_default_policies: [], prohibited_change: false,
    }) === L7ContractCompatibilityClass.MIGRATION_REQUIRED,
    'E.9 — removed-field delta classified MIGRATION_REQUIRED',
  );
  assert(
    classifyValidationContractDelta({
      surface: L7ContractSurface.SUBJECT, from: '7.3.0', to: '8.0.0',
      added_fields: [], removed_fields: [],
      semantically_changed_fields: ['validation_intent'],
      changed_enum_vocabularies: [], changed_default_policies: [],
      prohibited_change: false,
    }) === L7ContractCompatibilityClass.BREAKING_SEMANTIC,
    'E.10 — semantic change delta classified BREAKING_SEMANTIC',
  );
  assert(
    classifyValidationContractDelta({
      surface: L7ContractSurface.SUBJECT, from: '7.3.0', to: '9.0.0',
      added_fields: [], removed_fields: [],
      semantically_changed_fields: [], changed_enum_vocabularies: [],
      changed_default_policies: [], prohibited_change: true,
    }) === L7ContractCompatibilityClass.PROHIBITED,
    'E.11 — prohibited change classified PROHIBITED',
  );
}

// Compatibility validator
{
  const r = validateValidationContractCompatibility({
    surface: L7ContractSurface.OUTPUT, from: '7.3.0', to: '7.3.1',
    added_fields: ['x'], removed_fields: [],
    semantically_changed_fields: [], changed_enum_vocabularies: [],
    changed_default_policies: [], prohibited_change: false,
  });
  assert(r.valid && r.compatibility_class === L7ContractCompatibilityClass.ADDITIVE_SAFE, 'E.12 — safe additive delta passes');

  const r2 = validateValidationContractCompatibility({
    surface: L7ContractSurface.OUTPUT, from: '7.3.0', to: '7.4.0',
    added_fields: [], removed_fields: ['old'],
    semantically_changed_fields: [], changed_enum_vocabularies: [],
    changed_default_policies: [], prohibited_change: false,
  });
  assert(
    !r2.valid && r2.violations.some(v => v.code === L7ContractViolationCode.COMPATIBILITY_MIGRATION_REQUIRED_NOT_FLAGGED),
    'E.13 — migration-required delta blocked unless flagged',
  );

  const r3 = validateValidationContractCompatibility({
    surface: L7ContractSurface.OUTPUT, from: '7.3.0', to: '7.4.0',
    added_fields: [], removed_fields: ['old'],
    semantically_changed_fields: [], changed_enum_vocabularies: [],
    changed_default_policies: [], prohibited_change: false,
  }, { allowMigrationRequired: true });
  assert(r3.valid, 'E.14 — migration-required delta passes when explicitly allowed');

  const r4 = validateValidationContractCompatibility({
    surface: L7ContractSurface.OUTPUT, from: '7.4.0', to: '7.3.0',
    added_fields: [], removed_fields: [],
    semantically_changed_fields: [], changed_enum_vocabularies: [],
    changed_default_policies: [], prohibited_change: false,
  });
  assert(
    !r4.valid && r4.violations.some(v => v.code === L7ContractViolationCode.COMPATIBILITY_VERSION_REGRESSION),
    'E.15 — version regression rejected',
  );
}

// isLegalContractUpgrade gates
{
  const breakingDelta = {
    surface: L7ContractSurface.SUBJECT, from: '7.3.0', to: '8.0.0',
    added_fields: [], removed_fields: [],
    semantically_changed_fields: ['materiality_class'],
    changed_enum_vocabularies: [], changed_default_policies: [], prohibited_change: false,
  };
  assert(!isLegalContractUpgrade(breakingDelta), 'E.16 — breaking semantic blocked by default');
  assert(isLegalContractUpgrade(breakingDelta, { allowBreaking: true }), 'E.17 — breaking semantic allowed when explicitly opted in');
  const prohibited = { ...breakingDelta, prohibited_change: true };
  assert(!isLegalContractUpgrade(prohibited, { allowBreaking: true }), 'E.18 — prohibited change never legal');
}

// Replay hash determinism
{
  const args = {
    subject_contract_ref: 'tpl_x',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    as_of: '2026-04-17T00:00:00Z',
    contract_versions: { ...L7_CURRENT_CONTRACT_VERSIONS },
    material_inputs_canonical: { a: 1, b: [1, 2, 3] },
    contradiction_bundle_id: 'cb_1',
    confidence_factor_signature: { factors: 7 },
    restriction_profile_id: 'rp_1',
    mode: L7ReplayIdentityMode.LIVE,
    compute_run_id: 'run_a',
  };
  const h1 = canonicalValidationReplayHash(args);
  const h2 = canonicalValidationReplayHash(args);
  assert(h1 === h2, 'E.19 — canonical replay hash deterministic across calls');
  const h3 = canonicalValidationReplayHash({ ...args, compute_run_id: 'run_b' });
  assert(h1 !== h3, 'E.20 — LIVE mode includes compute_run_id in hash');
  const h4 = canonicalValidationReplayHash({ ...args, mode: L7ReplayIdentityMode.REPLAY });
  const h5 = canonicalValidationReplayHash({ ...args, mode: L7ReplayIdentityMode.REPLAY, compute_run_id: 'run_z' });
  assert(h4 === h5, 'E.21 — REPLAY mode normalises compute_run_id');
  assert(h1.startsWith('rh_'), 'E.22 — replay hash carries rh_ prefix');
}

// Canonical JSON stability
{
  assert(canonicalJson({ b: 1, a: 2 }) === canonicalJson({ a: 2, b: 1 }), 'E.23 — canonicalJson key-order stable');
  assert(canonicalJson([{ b: 1, a: 2 }, { a: 3 }]) === '[{"a":2,"b":1},{"a":3}]', 'E.24 — canonicalJson nested key-order stable');
  assert(typeof fnv1a64Hex('hello') === 'string' && fnv1a64Hex('hello').length === 16, 'E.25 — fnv1a64Hex returns 16-char hex');
}

// Materialization readiness
{
  const subj = makeSubjectContract();
  const conf = makeConfidence();
  const restr = makeRestriction();
  const out = makeOutput();
  const state = isValidationMaterializationReady({
    output: out,
    subjectContract: subj,
    confidence: conf,
    contradiction: null,
    restriction: restr,
    evidenceRequired: false,
    cleanlinessViolation: false,
  });
  assert(isReadyState(state), 'E.26 — ready output reports READY/READY_WITH_MODIFIERS');

  const state2 = isValidationMaterializationReady({
    output: { ...out, replay_hash: '' as never },
    subjectContract: subj, confidence: conf, contradiction: null, restriction: restr,
    evidenceRequired: false, cleanlinessViolation: false,
  });
  assert(state2 === L7MaterializationReadinessState.NOT_READY_MISSING_REPLAY_HASH, 'E.27 — missing replay_hash blocks readiness');

  const state3 = isValidationMaterializationReady({
    output: { ...out, lineage_refs: { trace_id: '', manifest_id: '' } },
    subjectContract: subj, confidence: conf, contradiction: null, restriction: restr,
    evidenceRequired: false, cleanlinessViolation: false,
  });
  assert(state3 === L7MaterializationReadinessState.NOT_READY_MISSING_LINEAGE, 'E.28 — missing lineage blocks readiness');

  const state4 = isValidationMaterializationReady({
    output: out, subjectContract: null, confidence: conf,
    contradiction: null, restriction: restr,
    evidenceRequired: false, cleanlinessViolation: false,
  });
  assert(state4 === L7MaterializationReadinessState.NOT_READY_INCOMPLETE_CONTRACT, 'E.29 — missing subject contract blocks readiness');

  const state5 = isValidationMaterializationReady({
    output: { ...out, validation_modifiers: [L7ValidationModifier.PARTIAL_REGIME_COMPATIBILITY] },
    subjectContract: subj, confidence: conf, contradiction: null, restriction: restr,
    evidenceRequired: false, cleanlinessViolation: false,
  });
  assert(state5 === L7MaterializationReadinessState.READY_WITH_MODIFIERS, 'E.30 — modifier-only output reports READY_WITH_MODIFIERS');

  const state6 = isValidationMaterializationReady({
    output: { ...out, evidence_pack_ref: null },
    subjectContract: subj, confidence: conf, contradiction: null, restriction: restr,
    evidenceRequired: true, cleanlinessViolation: false,
  });
  assert(state6 === L7MaterializationReadinessState.NOT_READY_EVIDENCE_MISSING, 'E.31 — evidence required but absent blocks readiness');

  const state7 = isValidationMaterializationReady({
    output: out, subjectContract: subj, confidence: conf, contradiction: null, restriction: restr,
    evidenceRequired: false, cleanlinessViolation: true,
  });
  assert(state7 === L7MaterializationReadinessState.NOT_READY_CLEANLINESS_VIOLATION, 'E.32 — cleanliness violation blocks readiness');
}

// Cleanliness helper
{
  assert(cleanlinessIsClean({
    stalenessMaterial: false, incompletenessMaterial: false, ambiguityMaterial: false,
    degradationMaterial: false, unresolvedContradictionPresent: false, missingRequiredSupport: false,
  }), 'E.33 — cleanlinessIsClean true when all flags false');
  assert(!cleanlinessIsClean({
    stalenessMaterial: true, incompletenessMaterial: false, ambiguityMaterial: false,
    degradationMaterial: false, unresolvedContradictionPresent: false, missingRequiredSupport: false,
  }), 'E.34 — cleanlinessIsClean false when staleness material');
}

// Restriction-state consistency helper
{
  assert(restrictionIsConsistentWithState(makeRestriction({
    downstream_use_rights: [L7RestrictionRight.USABLE_FOR_REGIME_INPUT],
    allowed_for_regime_input: true,
  }), {
    validation_class: L7ValidationClass.CONFIRMED,
    confidence_band: L7ConfidenceBand.HIGH,
    highest_contradiction_severity: null,
    staleness_material: false, incompleteness_material: false,
  }), 'E.35 — restriction consistent with confirmed/high state');
}

// ─────────────────────────────────────────────────────────────────────────
// Band F — Invariants and audit
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[Band F] Invariants and audit');

assert(ALL_CONTRACT_VIOLATION_CODES.length >= 40, 'F.1 — contract violation vocabulary comprehensive');

// L7ContractError carries code + details
{
  const err = new L7ContractError(
    L7ContractViolationCode.OUTPUT_CONTRACT_HIDDEN_CLEANLINESS,
    'CLEAN with stale support',
    { score: 0.9 },
  );
  assert(err instanceof Error, 'F.2 — L7ContractError extends Error');
  assert(err.code === L7ContractViolationCode.OUTPUT_CONTRACT_HIDDEN_CLEANLINESS, 'F.3 — L7ContractError preserves code');
  assert((err.details as { score: number }).score === 0.9, 'F.4 — L7ContractError preserves details');
}

// Audit log behaviour
{
  resetContractAuditLog();
  assert(!hasAnyContractViolations(), 'F.5 — audit log empty after reset');

  emitMalformedContractViolation(
    'test', L7ContractViolationCode.OUTPUT_CONTRACT_INCOMPLETE_FIELD,
    'OUTPUT', 'vres_x', '7.3.0', 'missing replay_hash',
  );
  assert(getContractViolationCount() === 1, 'F.6 — emitMalformedContractViolation appends to log');
  assert(getContractViolationsByCode(L7ContractViolationCode.OUTPUT_CONTRACT_INCOMPLETE_FIELD).length === 1,
    'F.7 — getContractViolationsByCode filters');

  emitCompatibilityViolation(
    'test', L7ContractViolationCode.COMPATIBILITY_PROHIBITED_CHANGE,
    'SUBJECT', '7.3.0', '8.0.0', 'prohibited',
  );
  emitReplayAnomaly('test', L7ContractViolationCode.REPLAY_HASH_UNSTABLE, 'vres_y', 'unstable');
  emitCleanlinessViolation('test', 'vres_z', 'CLEAN with contradiction');
  assert(getContractCriticalViolations().length >= 3, 'F.8 — critical-severity emitters appear in critical filter');
  assert(getContractAuditLog().every(r => typeof r.timestamp === 'string'), 'F.9 — audit records carry timestamps');
}

// Invariants A..G — happy path
{
  resetContractAuditLog();
  const subj = makeSubjectContract();
  const out = makeOutput();
  const bundle = makeBundle();
  const conf = makeConfidence();
  const restr = makeRestriction();

  const a = checkInvariantA_subjectContractComplete([subj]);
  assert(a.satisfied, 'F.10 — INV-7.3-A satisfied for valid subject');

  const b = checkInvariantB_outputLinkage([out]);
  assert(b.satisfied, 'F.11 — INV-7.3-B satisfied for valid output linkage');

  const c = checkInvariantC_contradictionBundlesTyped([bundle]);
  assert(c.satisfied, 'F.12 — INV-7.3-C satisfied for typed bundle');

  const d = checkInvariantD_confidenceFactors([conf]);
  assert(d.satisfied, 'F.13 — INV-7.3-D satisfied for complete confidence');

  const e = checkInvariantE_restrictionProfilesUnambiguous([restr]);
  assert(e.satisfied, 'F.14 — INV-7.3-E satisfied for clear restriction');

  const f = checkInvariantF_noHiddenCleanliness([out]);
  assert(f.satisfied, 'F.15 — INV-7.3-F satisfied for clean output');

  const g = checkInvariantG_compatibilityAndMaterialization({
    outputs: [out],
    subjectsById: new Map([[subj.validation_subject_id, subj]]),
    confidencesById: new Map([[conf.confidence_assessment_id, conf]]),
    bundlesById: new Map([[bundle.contradiction_bundle_id, bundle]]),
    restrictionsById: new Map([[restr.restriction_profile_id, restr]]),
    deltas: [{
      surface: L7ContractSurface.OUTPUT, from: '7.3.0', to: '7.3.1',
      added_fields: ['x'], removed_fields: [],
      semantically_changed_fields: [], changed_enum_vocabularies: [],
      changed_default_policies: [], prohibited_change: false,
    }],
  });
  assert(g.satisfied, 'F.16 — INV-7.3-G satisfied with valid materialization & safe delta');
}

// Invariants — failure paths
{
  const badSubject = makeSubjectContract({ subject_contract_version: '' as never, schema_version: '' as never });
  assert(!checkInvariantA_subjectContractComplete([badSubject]).satisfied, 'F.17 — INV-7.3-A fails on incomplete subject');

  const badOut = makeOutput({ confidence_assessment_ref: '' as never });
  assert(!checkInvariantB_outputLinkage([badOut]).satisfied, 'F.18 — INV-7.3-B fails on missing confidence ref');

  const badBundle = makeBundle({ highest_severity: L7ContradictionSeverity.SEVERE });
  assert(!checkInvariantC_contradictionBundlesTyped([badBundle]).satisfied, 'F.19 — INV-7.3-C fails on severity mismatch');

  const badConf = makeConfidence({ rationale_codes: [] });
  assert(!checkInvariantD_confidenceFactors([badConf]).satisfied, 'F.20 — INV-7.3-D fails on empty rationale');

  const badRestr = makeRestriction({ downstream_use_rights: [], restriction_reasons: [] });
  assert(!checkInvariantE_restrictionProfilesUnambiguous([badRestr]).satisfied, 'F.21 — INV-7.3-E fails on empty rights');

  const dirtyOut = makeOutput({
    validation_status: L7RuntimeStatusClass.CLEAN,
    contradiction_severity_score: 0.6,
    contradiction_bundle_ref: 'cb_1',
  });
  assert(!checkInvariantF_noHiddenCleanliness([dirtyOut]).satisfied, 'F.22 — INV-7.3-F fails on hidden cleanliness violation');
}

// runAllL7_3Invariants returns 7 results
{
  const all = runAllL7_3Invariants({
    subjects: [makeSubjectContract()],
    outputs: [makeOutput()],
    bundles: [makeBundle()],
    confidences: [makeConfidence()],
    restrictions: [makeRestriction()],
    deltas: [],
  });
  assert(all.length === 7, 'F.23 — runAllL7_3Invariants returns 7 results');
  assert(all.every(r => r.satisfied), 'F.24 — all invariants green on happy path');
  const ids = all.map(r => r.invariant);
  assert(
    ids.includes('INV-7.3-A') && ids.includes('INV-7.3-B') && ids.includes('INV-7.3-C') &&
    ids.includes('INV-7.3-D') && ids.includes('INV-7.3-E') && ids.includes('INV-7.3-F') &&
    ids.includes('INV-7.3-G'),
    'F.25 — invariant ids cover A..G',
  );
}

// ── Summary ─────────────────────────────────────────────────────────────
console.log('\n' + '━'.repeat(72));
console.log(`L7.3 Certification: ${passed} passed, ${failed} failed`);
console.log('━'.repeat(72));
if (failed > 0) process.exit(1);
