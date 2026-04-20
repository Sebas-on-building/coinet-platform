/**
 * L9.3 — Universal Contract-and-Emission Law
 * Certification Test Suite
 *
 * 5 Bands (§9.3.10.2):
 *   A — Subject contracts (identity, inputs, temporal, rules, policies)
 *   B — Output + sub-object contracts (lead-lag, chain, phase, decay,
 *        post-event, restriction)
 *   C — Cleanliness + restriction law (§9.3.3.5, §9.3.6.4, §9.3.8)
 *   D — Replay identity + compatibility classification (§9.3.7)
 *   E — Audit + INV-9.3-A..G invariants
 */

import {
  // Versioning + surfaces
  L9ContractCompatibilityClass, ALL_L9_CONTRACT_COMPATIBILITY_CLASSES,
  L9ContractSurface, ALL_L9_CONTRACT_SURFACES,
  L9_CURRENT_CONTRACT_VERSIONS,
  buildL9ContractReplayHash, l9ContractFnv1aHex,
  compareL9ContractVersions, classifyL9ContractDelta,
  isLegalL9ContractUpgrade,
  // Materialization + readiness
  L9SequenceReadinessClass, ALL_L9_SEQUENCE_READINESS_CLASSES,
  L9_OUTPUT_CLEANLINESS_THRESHOLDS,
  ALL_L9_SEQUENCE_STALENESS_POLICIES,
  ALL_L9_SEQUENCE_MATERIALIZATION_POLICIES,
  ALL_L9_SEQUENCE_EVIDENCE_PACK_POLICIES,
  ALL_L9_SEQUENCE_LATE_DATA_CLASSES,
  ALL_L9_SEQUENCE_REPLAY_IDENTITY_MODES,
  // L9.3 contract field registries
  L9_SUBJECT_CONTRACT_REQUIRED_FIELDS,
  // Ontology referenced from fixtures
  L9SequenceFamily, L9SequenceState,
  L9SequenceCoexistenceClass,
  L9SequenceRelianceBand, L9AllowedDownstreamUse,
  L9LagSupportStrength, L9LagContradictionPosture,
  L9ChainIntegrityFlag,
} from '../l9/contracts';

import {
  L9SequenceContractViolationCode,
  ALL_L9_SEQUENCE_CONTRACT_VIOLATION_CODES,
  validateL9SequenceSubjectContract,
  validateL9SequenceOutputContract,
  validateL9LeadLagContract,
  validateL9SequenceChainContract,
  validateL9PhaseStateContract,
  validateL9DecayProfileContract,
  validateL9PostEventWindowContract,
  validateL9SequenceRestrictionProfileContract,
  validateL9ContractCompatibility,
  evaluateL9SequenceOutputReadiness,
} from '../l9/validation';

import {
  resetL9ContractAuditLog, emitL9ContractAuditRecord,
  getL9ContractAuditLog, getL9ContractCriticalViolations,
  getL9ContractViolationsByCode, getL9ContractViolationsBySurface,
  hasAnyL9ContractViolations, getL9ContractViolationCount,
  emitL9SubjectContractViolation, emitL9OutputContractViolation,
  emitL9LeadLagContractViolation, emitL9ChainContractViolation,
  emitL9PhaseContractViolation, emitL9DecayContractViolation,
  emitL9PostEventContractViolation, emitL9RestrictionContractViolation,
  emitL9CompatibilityViolation, emitL9ReadinessViolation,
} from '../l9/constitution';

import {
  cannedSubject, cannedOutput, cannedLeadLag, cannedChain,
  cannedPhase, cannedDecay, cannedPostEvent, cannedRestriction,
  checkAllL93Invariants,
  checkINV_93_A, checkINV_93_B, checkINV_93_C, checkINV_93_D,
  checkINV_93_E, checkINV_93_F, checkINV_93_G,
} from '../l9/invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}

function resetAll(): void {
  resetL9ContractAuditLog();
}

// ═══════════════════════════════════════════════════════════════
// BAND A — Subject Contracts
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Subject Contracts ═══');
resetAll();

// Green baseline passes
const greenSubject = validateL9SequenceSubjectContract(cannedSubject());
assert(greenSubject.valid, 'A.01 canonical subject fixture passes');
assert(greenSubject.issues.length === 0,
  'A.02 canonical subject fixture has zero issues');

// Identity
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ sequence_subject_id: '' })).valid,
  'A.03 missing sequence_subject_id rejects');
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ sequence_template_id: '' })).valid,
  'A.04 missing sequence_template_id rejects');
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ sequence_version: '' })).valid,
  'A.05 missing sequence_version rejects');
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ subject_contract_version: '' })).valid,
  'A.06 missing subject_contract_version rejects');
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ schema_version: '' })).valid,
  'A.07 missing schema_version rejects');
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ policy_version: '' })).valid,
  'A.08 missing policy_version rejects');

// Non-semver version rejects
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ subject_contract_version: 'not-semver' })).valid,
  'A.09 non-semver subject_contract_version rejects');

// Scope
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ scope_id: '' })).valid,
  'A.10 missing scope_id rejects');
assert(!validateL9SequenceSubjectContract(
  cannedSubject({
    sequence_family: L9SequenceFamily.OVERHANG_AND_DIGESTION,
    scope_type: 'MARKET',
    // OVERHANG_AND_DIGESTION disallows MARKET scope
    required_regime_inputs: [],
    regime_consumption_policy: {
      required: false, min_regime_refs: 0, block_on_unstable_regime: false,
    },
    allowed_sequence_state_set: [L9SequenceState.POST_SHOCK_DIGESTION],
    post_event_window_spec: {
      required: true, max_anchor_age_seconds: 86_400,
      allowed_window_classes: ['SHOCK_DIGESTION'],
    },
  })).valid,
  'A.11 scope illegal for family rejects');

// Inputs
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ required_validation_inputs: [] })).valid,
  'A.12 empty required_validation_inputs rejects');
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ required_event_inputs: [] })).valid,
  'A.13 empty required_event_inputs rejects');
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ required_feature_inputs: [] })).valid,
  'A.14 empty required_feature_inputs rejects');

// Regime-conditioned family must declare regime inputs
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ required_regime_inputs: [] })).valid,
  'A.15 regime-conditioned family missing regime inputs rejects');

// Input family-mix consistency: validation_inputs must be L7_* family,
// and may not be evidence_only. Placing an L6_EVENT ref there should trip
// SUBJECT_INPUT_FAMILY_MIX.
const mixReport = validateL9SequenceSubjectContract(cannedSubject({
  required_validation_inputs: [{
    ref: 'l6_evt_1',
    family: 'L6_EVENT' as unknown as 'L7_VALIDATION',
    required: true,
    staleness_critical: true,
    evidence_only: false,
    context_only: false,
  }],
}));
assert(!mixReport.valid, 'A.16 wrong input family mix rejects');
assert(mixReport.issues.some(i =>
  i.code === L9SequenceContractViolationCode.SUBJECT_INPUT_FAMILY_MIX),
  'A.17 SUBJECT_INPUT_FAMILY_MIX emitted');

// Temporal
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ as_of: '' })).valid,
  'A.18 missing as_of rejects');
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ as_of: 'not-iso' })).valid,
  'A.19 non-ISO as_of rejects');
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ sequence_window: {
    window_id: '', as_of: '', lookback_seconds: 0,
    lookforward_seconds: 0, granularity: 'HOUR',
  }})).valid,
  'A.20 empty sequence_window rejects');
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ lead_lag_window: {
    window_id: '', as_of: '', lookback_seconds: 0, max_lag_ms: 0,
  }})).valid,
  'A.21 empty lead_lag_window rejects');
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ freshness_budget_seconds: 0 })).valid,
  'A.22 zero freshness_budget_seconds rejects');
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ freshness_budget_seconds: -1 })).valid,
  'A.23 negative freshness_budget_seconds rejects');

// Family-required post-event spec (shock family)
const postEventSubject = cannedSubject({
  sequence_family: L9SequenceFamily.SHOCK_AND_RECOVERY,
  scope_type: 'ASSET',
  required_regime_inputs: [],
  regime_consumption_policy: {
    required: false, min_regime_refs: 0, block_on_unstable_regime: false,
  },
  allowed_sequence_state_set: [L9SequenceState.POST_SHOCK_DIGESTION],
  post_event_window_spec: {
    required: false, max_anchor_age_seconds: 86_400,
    allowed_window_classes: [],
  },
});
const peRep = validateL9SequenceSubjectContract(postEventSubject);
assert(!peRep.valid, 'A.24 post-event family without spec rejects');
assert(peRep.issues.some(i =>
  i.code === L9SequenceContractViolationCode.SUBJECT_POST_EVENT_SPEC_INCOMPLETE ||
  i.code === L9SequenceContractViolationCode.SUBJECT_MISSING_POST_EVENT_WINDOW_SPEC),
  'A.25 SUBJECT_POST_EVENT_SPEC_INCOMPLETE emitted');

// Sequence / rule law
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ sequence_selection_rules: [] })).valid,
  'A.26 empty sequence_selection_rules rejects');
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ lead_lag_rules: [] })).valid,
  'A.27 empty lead_lag_rules rejects');
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ phase_rules: [] })).valid,
  'A.28 empty phase_rules rejects');
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ decay_rules: [] })).valid,
  'A.29 empty decay_rules rejects');

// Confidence / restriction / persistence
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ confidence_derivation_spec: {
    policy_id: '', policy_version: '', required_factors: [],
    factor_weights: {}, caps: [],
    consumes_l7_confidence: false, consumes_l8_regime: false,
  }})).valid, 'A.30 empty confidence_derivation_spec rejects');
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ restriction_derivation_spec: {
    policy_id: '', policy_version: '', default_reliance_band: '',
    required_narrowing_reasons: [],
    forbid_decisive_when_ambiguous: true,
  }})).valid, 'A.31 empty restriction_derivation_spec rejects');

// Policies: `required: true` with empty supporting arrays must reject.
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ restriction_consumption_policy: {
    required: true, expected_rights: [], block_on_missing_profile: true,
  }})).valid, 'A.32 required restriction_consumption_policy with empty rights rejects');
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ validation_consumption_policy: {
    required: true, min_validation_refs: 0,
    block_on_restricted_outputs: true,
  }})).valid, 'A.33 required validation_consumption_policy with min=0 rejects');

// Allowed state set — state wrong family
assert(!validateL9SequenceSubjectContract(
  cannedSubject({
    allowed_sequence_state_set: [L9SequenceState.LEVERAGE_CROWDING_PHASE],
  })).valid,
  'A.34 allowed state not in family rejects');

// Lineage
assert(!validateL9SequenceSubjectContract(
  cannedSubject({ lineage_refs: {
    trace_id: '', manifest_id: '', upstream_refs: [],
  }})).valid, 'A.35 empty lineage_refs rejects');

// Required-fields registry matches contract shape
assert(L9_SUBJECT_CONTRACT_REQUIRED_FIELDS.includes('sequence_window'),
  'A.36 required-fields registry includes sequence_window');
assert(L9_SUBJECT_CONTRACT_REQUIRED_FIELDS.includes('lineage_policy'),
  'A.37 required-fields registry includes lineage_policy');
assert(L9_SUBJECT_CONTRACT_REQUIRED_FIELDS.length >= 30,
  'A.38 ≥30 required subject fields registered');

// Subject judgment leak
const subjJudgLeak = validateL9SequenceSubjectContract(
  cannedSubject({ description: 'Buy_signal generator for this asset' }));
assert(!subjJudgLeak.valid, 'A.39 description judgment leak rejects');
assert(subjJudgLeak.issues.some(i =>
  i.code === L9SequenceContractViolationCode.SUBJECT_JUDGMENT_LEAK),
  'A.40 SUBJECT_JUDGMENT_LEAK emitted');

// Enum inventories
assert(ALL_L9_SEQUENCE_STALENESS_POLICIES.length === 4,
  'A.41 4 staleness policies');
assert(ALL_L9_SEQUENCE_MATERIALIZATION_POLICIES.length === 4,
  'A.42 4 materialization policies');
assert(ALL_L9_SEQUENCE_EVIDENCE_PACK_POLICIES.length === 3,
  'A.43 3 evidence-pack policies');
assert(ALL_L9_SEQUENCE_LATE_DATA_CLASSES.length === 4,
  'A.44 4 late-data classes');
assert(ALL_L9_SEQUENCE_REPLAY_IDENTITY_MODES.length === 4,
  'A.45 4 replay-identity modes');

// ═══════════════════════════════════════════════════════════════
// BAND B — Output + Sub-Object Contracts
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Output and Sub-Object Contracts ═══');
resetAll();

// Output baseline
const greenOutput = validateL9SequenceOutputContract(cannedOutput());
assert(greenOutput.valid, 'B.01 canonical output fixture passes');
assert(greenOutput.issues.length === 0,
  'B.02 canonical output fixture has zero issues');

// Missing identity / family / state
assert(!validateL9SequenceOutputContract(
  cannedOutput({ sequence_result_id: '' })).valid,
  'B.03 missing sequence_result_id rejects');
assert(!validateL9SequenceOutputContract(
  cannedOutput({ sequence_subject_id: '' })).valid,
  'B.04 missing sequence_subject_id rejects');
assert(!validateL9SequenceOutputContract(
  cannedOutput({ primary_sequence_state: '' as unknown as L9SequenceState })
).valid, 'B.05 missing primary_sequence_state rejects');
assert(!validateL9SequenceOutputContract(
  cannedOutput({ ordered_signal_refs: [] })).valid,
  'B.06 empty ordered_signal_refs rejects');
assert(!validateL9SequenceOutputContract(
  cannedOutput({ lead_lag_profile_ref: '' })).valid,
  'B.07 missing lead_lag_profile_ref rejects');
assert(!validateL9SequenceOutputContract(
  cannedOutput({ sequence_chain_ref: '' })).valid,
  'B.08 missing sequence_chain_ref rejects');
assert(!validateL9SequenceOutputContract(
  cannedOutput({ phase_state_ref: '' })).valid,
  'B.09 missing phase_state_ref rejects');
assert(!validateL9SequenceOutputContract(
  cannedOutput({ decay_profile_ref: '' })).valid,
  'B.10 missing decay_profile_ref rejects');
assert(!validateL9SequenceOutputContract(
  cannedOutput({ restriction_profile_ref: '' })).valid,
  'B.11 missing restriction_profile_ref rejects');
assert(!validateL9SequenceOutputContract(
  cannedOutput({ replay_hash: '' })).valid,
  'B.12 missing replay_hash rejects');

// Secondary = primary
assert(!validateL9SequenceOutputContract(cannedOutput({
  secondary_sequence_state: L9SequenceState.VALIDATED_EXPANSION,
  coexistence_class: L9SequenceCoexistenceClass.PRIMARY_PLUS_SECONDARY,
})).valid, 'B.13 secondary == primary rejects');

// Score out of range
assert(!validateL9SequenceOutputContract(
  cannedOutput({ sequence_confidence_score: 1.5 })).valid,
  'B.14 confidence > 1 rejects');
assert(!validateL9SequenceOutputContract(
  cannedOutput({ ambiguity_score: -0.1 })).valid,
  'B.15 ambiguity < 0 rejects');
assert(!validateL9SequenceOutputContract(
  cannedOutput({ staleness_score: 2 })).valid,
  'B.16 staleness > 1 rejects');

// ─── Lead-lag sub-object ───
const greenLL = validateL9LeadLagContract(cannedLeadLag());
assert(greenLL.valid, 'B.17 canonical lead-lag passes');
assert(!validateL9LeadLagContract(cannedLeadLag({
  leading_signal_ref: '',
})).valid, 'B.18 LL missing leading ref rejects');
assert(!validateL9LeadLagContract(cannedLeadLag({
  lagging_signal_ref: '',
})).valid, 'B.19 LL missing lagging ref rejects');
assert(!validateL9LeadLagContract(cannedLeadLag({
  leading_signal_ref: 'sig_x',
  lagging_signal_ref: 'sig_x',
})).valid, 'B.20 LL leading == lagging rejects');
assert(!validateL9LeadLagContract(cannedLeadLag({
  lag_duration_ms: -10,
})).valid, 'B.21 LL negative duration rejects');
assert(!validateL9LeadLagContract(cannedLeadLag({
  decay_adjustment: 2,
})).valid, 'B.22 LL decay_adjustment OOR rejects');

// Lead-lag clean while contradiction
const llCW = validateL9LeadLagContract(cannedLeadLag({
  support_strength: L9LagSupportStrength.STRONG_SUPPORT,
  contradiction_posture: L9LagContradictionPosture.DECISIVE,
}));
assert(!llCW.valid, 'B.23 LL clean-while-contradiction rejects');
assert(llCW.issues.some(i =>
  i.code === L9SequenceContractViolationCode.LEAD_LAG_CLEAN_WHILE_CONTRADICTION),
  'B.24 LEAD_LAG_CLEAN_WHILE_CONTRADICTION emitted');

// Lead-lag causal overclaim
const llCO = validateL9LeadLagContract(cannedLeadLag({
  causal_restraint_flag: false as unknown as true,
}));
assert(llCO.issues.some(i =>
  i.code === L9SequenceContractViolationCode.LEAD_LAG_CAUSAL_OVERCLAIM),
  'B.25 LEAD_LAG_CAUSAL_OVERCLAIM emitted');

// ─── Chain sub-object ───
const greenChain = validateL9SequenceChainContract(cannedChain());
assert(greenChain.valid, 'B.26 canonical chain passes');
assert(!validateL9SequenceChainContract(cannedChain({
  ordered_node_refs: [],
})).valid, 'B.27 chain missing ordered_node_refs rejects');
assert(!validateL9SequenceChainContract(cannedChain({
  ordered_event_refs: [],
})).valid, 'B.28 chain missing ordered_event_refs rejects');
assert(!validateL9SequenceChainContract(cannedChain({
  sequence_completeness_score: 2,
})).valid, 'B.29 chain completeness > 1 rejects');
assert(!validateL9SequenceChainContract(cannedChain({
  chain_start_at: '2026-05-01T00:00:00Z', // after end
  chain_end_at: '2026-04-10T00:00:00Z',
})).valid, 'B.30 chain start > end rejects');
assert(!validateL9SequenceChainContract(cannedChain({
  replay_hash: '',
})).valid, 'B.31 chain missing replay_hash rejects');

// Chain clean while damaged (low completeness)
const chDamaged = validateL9SequenceChainContract(cannedChain({
  sequence_completeness_score: 0.2,
  chain_integrity_flags: [L9ChainIntegrityFlag.MISSING_INITIATOR],
}));
assert(chDamaged.issues.some(i =>
  i.code === L9SequenceContractViolationCode.CHAIN_CLEAN_WHILE_DAMAGED),
  'B.32 CHAIN_CLEAN_WHILE_DAMAGED emitted');

// ─── Phase sub-object ───
const greenPhase = validateL9PhaseStateContract(cannedPhase());
assert(greenPhase.valid, 'B.33 canonical phase passes');
assert(!validateL9PhaseStateContract(cannedPhase({
  phase_progression_score: 2,
})).valid, 'B.34 phase score > 1 rejects');
assert(!validateL9PhaseStateContract(cannedPhase({
  phase_support_refs: [],
})).valid, 'B.35 phase missing support_refs rejects');
assert(!validateL9PhaseStateContract(cannedPhase({
  phase_started_at: '',
})).valid, 'B.36 phase missing started_at rejects');
assert(!validateL9PhaseStateContract(cannedPhase({
  replay_hash: '',
})).valid, 'B.37 phase missing replay_hash rejects');

// ─── Decay sub-object ───
const greenDecay = validateL9DecayProfileContract(cannedDecay());
assert(greenDecay.valid, 'B.38 canonical decay passes');
assert(!validateL9DecayProfileContract(cannedDecay({
  decay_score: 2,
})).valid, 'B.39 decay score > 1 rejects');
assert(!validateL9DecayProfileContract(cannedDecay({
  decaying_signal_refs: [],
  surviving_signal_refs: [],
})).valid, 'B.40 decay missing both signal refs rejects');
assert(!validateL9DecayProfileContract(cannedDecay({
  decay_reason_codes: [],
})).valid, 'B.41 decay missing reason codes rejects');
assert(!validateL9DecayProfileContract(cannedDecay({
  time_burden_ms: -10,
})).valid, 'B.42 decay negative time_burden_ms rejects');

// ─── Post-event sub-object ───
const greenPE = validateL9PostEventWindowContract(cannedPostEvent());
assert(greenPE.valid, 'B.43 canonical post-event passes');
assert(!validateL9PostEventWindowContract(cannedPostEvent({
  anchor_event_ref: '',
})).valid, 'B.44 post-event missing anchor rejects');
assert(!validateL9PostEventWindowContract(cannedPostEvent({
  window_start: '2026-05-01T00:00:00Z',
  window_end: '2026-04-10T00:00:00Z',
})).valid, 'B.45 post-event start > end rejects');

// ─── Restriction sub-object ───
const greenR = validateL9SequenceRestrictionProfileContract(cannedRestriction());
assert(greenR.valid, 'B.46 canonical restriction passes');
assert(!validateL9SequenceRestrictionProfileContract(cannedRestriction({
  allowed_downstream_uses: [],
})).valid, 'B.47 restriction missing allowed_uses rejects');
assert(!validateL9SequenceRestrictionProfileContract(cannedRestriction({
  blocked_uses: [],
})).valid, 'B.48 restriction missing blocked_uses rejects');

// Allowed/blocked overlap
const rOverlap = validateL9SequenceRestrictionProfileContract(cannedRestriction({
  allowed_downstream_uses: [L9AllowedDownstreamUse.AUDIT_REFERENCE],
  blocked_uses: [L9AllowedDownstreamUse.AUDIT_REFERENCE],
}));
assert(rOverlap.issues.some(i =>
  i.code === L9SequenceContractViolationCode.RESTRICTION_ALLOWED_AND_BLOCKED_OVERLAP),
  'B.49 RESTRICTION_ALLOWED_AND_BLOCKED_OVERLAP emitted');

// Restriction decisive while ambiguous
const rDecisive = validateL9SequenceRestrictionProfileContract(
  cannedRestriction({
    reliance_band: L9SequenceRelianceBand.DECISIVE,
    narrowing_reasons: [],
  }),
  { ambiguity_score: 0.8 },
);
assert(rDecisive.issues.some(i =>
  i.code === L9SequenceContractViolationCode.RESTRICTION_DECISIVE_WHILE_AMBIGUOUS),
  'B.50 RESTRICTION_DECISIVE_WHILE_AMBIGUOUS emitted');

// ═══════════════════════════════════════════════════════════════
// BAND C — Cleanliness and Restriction Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Cleanliness and Restriction Law ═══');
resetAll();

// Cleanliness thresholds registered
assert(L9_OUTPUT_CLEANLINESS_THRESHOLDS.ambiguityMaterial > 0 &&
  L9_OUTPUT_CLEANLINESS_THRESHOLDS.ambiguityMaterial <= 1,
  'C.01 ambiguityMaterial threshold in (0,1]');
assert(L9_OUTPUT_CLEANLINESS_THRESHOLDS.decayMaterial > 0 &&
  L9_OUTPUT_CLEANLINESS_THRESHOLDS.decayMaterial <= 1,
  'C.02 decayMaterial threshold in (0,1]');

// CLEAN_SINGLE while ambiguous
const caRep = validateL9SequenceOutputContract(cannedOutput({
  coexistence_class: L9SequenceCoexistenceClass.CLEAN_SINGLE,
  ambiguity_score: 0.9,
}));
assert(caRep.issues.some(i =>
  i.code === L9SequenceContractViolationCode.CLEAN_WHILE_AMBIGUOUS),
  'C.03 CLEAN_WHILE_AMBIGUOUS emitted');

// CLEAN_SINGLE while stale
const csRep = validateL9SequenceOutputContract(cannedOutput({
  staleness_score: 0.9,
}));
assert(csRep.issues.some(i =>
  i.code === L9SequenceContractViolationCode.CLEAN_WHILE_STALE),
  'C.04 CLEAN_WHILE_STALE emitted');

// CLEAN_SINGLE while degraded
const cdRep = validateL9SequenceOutputContract(cannedOutput({
  degradation_score: 0.9,
}));
assert(cdRep.issues.some(i =>
  i.code === L9SequenceContractViolationCode.CLEAN_WHILE_DEGRADED),
  'C.05 CLEAN_WHILE_DEGRADED emitted');

// CLEAN_SINGLE while decay high
const cdecRep = validateL9SequenceOutputContract(cannedOutput({
  sequence_decay_score: 0.8,
}));
assert(cdecRep.issues.some(i =>
  i.code === L9SequenceContractViolationCode.CLEAN_WHILE_DECAY_HIGH),
  'C.06 CLEAN_WHILE_DECAY_HIGH emitted');

// CLEAN_SINGLE while chain incomplete
const ciRep = validateL9SequenceOutputContract(cannedOutput({
  sequence_completeness_score: 0.3,
}));
assert(ciRep.issues.some(i =>
  i.code === L9SequenceContractViolationCode.CLEAN_WHILE_CHAIN_INCOMPLETE),
  'C.07 CLEAN_WHILE_CHAIN_INCOMPLETE emitted');

// Output missing causal restraint disclaimer
const crRep = validateL9SequenceOutputContract(cannedOutput({
  causal_restraint_flags: {
    chain_is_temporal_only: true,
    adjacency_is_not_causality_disclaimer: '',
    hypothesis_excluded: true,
    judgment_excluded: true,
    scenario_excluded: true,
    recommendation_excluded: true,
  },
}));
assert(crRep.issues.some(i =>
  i.code === L9SequenceContractViolationCode.OUTPUT_MISSING_CAUSAL_RESTRAINT),
  'C.08 OUTPUT_MISSING_CAUSAL_RESTRAINT emitted');

// Readiness orchestrator — CLEAN_EMISSION happy path
const cleanReport = evaluateL9SequenceOutputReadiness({
  subject: cannedSubject(),
  output: cannedOutput(),
  chain: cannedChain(),
  phase: cannedPhase(),
  decay: cannedDecay(),
  restriction: cannedRestriction(),
  leadLagRelations: [cannedLeadLag()],
  postEventWindows: [],
});
assert(cleanReport.valid,
  `C.09 canonical bundle reaches CLEAN_EMISSION (got issues=${cleanReport.issues.length})`);
assert(cleanReport.readinessClass === L9SequenceReadinessClass.CLEAN_EMISSION,
  `C.10 readiness is CLEAN_EMISSION (got ${cleanReport.readinessClass})`);

// BLOCKED_EMISSION — output missing primary state
const blockedReport = evaluateL9SequenceOutputReadiness({
  subject: cannedSubject(),
  output: cannedOutput({
    primary_sequence_state: '' as unknown as L9SequenceState,
  }),
  chain: cannedChain(),
  phase: cannedPhase(),
  decay: cannedDecay(),
  restriction: cannedRestriction(),
  leadLagRelations: [cannedLeadLag()],
  postEventWindows: [],
});
assert(blockedReport.readinessClass === L9SequenceReadinessClass.BLOCKED_EMISSION,
  'C.11 missing primary state → BLOCKED_EMISSION');

// DEGRADED_EMISSION — chain damage
const degradedReport = evaluateL9SequenceOutputReadiness({
  subject: cannedSubject(),
  output: cannedOutput({
    chain_integrity_flags: [L9ChainIntegrityFlag.CONTRADICTION_PRESENT],
    sequence_completeness_score: 0.3,
    sequence_decay_score: 0.1,
    staleness_score: 0.1,
    degradation_score: 0.1,
  }),
  chain: cannedChain({
    sequence_completeness_score: 0.3,
    chain_integrity_flags: [L9ChainIntegrityFlag.CONTRADICTION_PRESENT],
  }),
  phase: cannedPhase(),
  decay: cannedDecay(),
  restriction: cannedRestriction(),
  leadLagRelations: [cannedLeadLag()],
  postEventWindows: [],
});
assert(degradedReport.readinessClass === L9SequenceReadinessClass.DEGRADED_EMISSION,
  `C.12 chain damaged → DEGRADED_EMISSION (got ${degradedReport.readinessClass})`);

// CAPPED_EMISSION — evidence-only reliance band
const cappedReport = evaluateL9SequenceOutputReadiness({
  subject: cannedSubject(),
  output: cannedOutput(),
  chain: cannedChain(),
  phase: cannedPhase(),
  decay: cannedDecay(),
  restriction: cannedRestriction({
    reliance_band: L9SequenceRelianceBand.EVIDENCE_ONLY,
    narrowing_reasons: [],
  }),
  leadLagRelations: [cannedLeadLag()],
  postEventWindows: [],
});
assert(cappedReport.readinessClass === L9SequenceReadinessClass.CAPPED_EMISSION,
  `C.13 evidence-only reliance → CAPPED_EMISSION (got ${cappedReport.readinessClass})`);

// Regime consumption required but absent
const regReport = evaluateL9SequenceOutputReadiness({
  subject: cannedSubject(),
  output: cannedOutput({ regime_refs: [] }),
  chain: cannedChain(),
  phase: cannedPhase(),
  decay: cannedDecay(),
  restriction: cannedRestriction(),
  leadLagRelations: [cannedLeadLag()],
  postEventWindows: [],
});
assert(regReport.issues.some(i =>
  i.code === L9SequenceContractViolationCode.REGIME_POSTURE_REQUIRED ||
  i.code === L9SequenceContractViolationCode.OUTPUT_MISSING_REGIME_REFS),
  'C.14 regime consumption required → violation');
assert(regReport.readinessClass === L9SequenceReadinessClass.BLOCKED_EMISSION,
  'C.15 regime missing → BLOCKED_EMISSION');

// Validation consumption required but absent
const valReport = evaluateL9SequenceOutputReadiness({
  subject: cannedSubject(),
  output: cannedOutput({ validation_refs: [] }),
  chain: cannedChain(),
  phase: cannedPhase(),
  decay: cannedDecay(),
  restriction: cannedRestriction(),
  leadLagRelations: [cannedLeadLag()],
  postEventWindows: [],
});
assert(valReport.issues.some(i =>
  i.code === L9SequenceContractViolationCode.VALIDATION_POSTURE_REQUIRED ||
  i.code === L9SequenceContractViolationCode.OUTPUT_MISSING_VALIDATION_REFS),
  'C.16 validation consumption required → violation');

// Cross-subject identity mismatch in readiness bundle
const misalignReport = evaluateL9SequenceOutputReadiness({
  subject: cannedSubject(),
  output: cannedOutput({ sequence_subject_id: 'seq_sub_OTHER' }),
  chain: cannedChain(),
  phase: cannedPhase(),
  decay: cannedDecay(),
  restriction: cannedRestriction(),
  leadLagRelations: [cannedLeadLag()],
  postEventWindows: [],
});
assert(misalignReport.issues.some(i =>
  i.code === L9SequenceContractViolationCode.OUTPUT_MISSING_SUBJECT_REF),
  'C.17 subject-ref mismatch → OUTPUT_MISSING_SUBJECT_REF');

// Family mismatch between subject and output
const famMismatch = evaluateL9SequenceOutputReadiness({
  subject: cannedSubject(),
  output: cannedOutput({
    sequence_family: L9SequenceFamily.NARRATIVE_LED,
  }),
  chain: cannedChain(),
  phase: cannedPhase(),
  decay: cannedDecay(),
  restriction: cannedRestriction(),
  leadLagRelations: [cannedLeadLag()],
  postEventWindows: [],
});
assert(famMismatch.issues.some(i =>
  i.code === L9SequenceContractViolationCode.OUTPUT_MISSING_FAMILY),
  'C.18 family mismatch → OUTPUT_MISSING_FAMILY');

// ═══════════════════════════════════════════════════════════════
// BAND D — Replay Identity + Compatibility
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Replay Identity and Compatibility ═══');
resetAll();

// Deterministic FNV / replay-hash builder
const h1 = l9ContractFnv1aHex('sample');
const h2 = l9ContractFnv1aHex('sample');
const h3 = l9ContractFnv1aHex('samplE');
assert(h1 === h2, 'D.01 FNV-1a deterministic');
assert(h1 !== h3, 'D.02 FNV-1a diverges on change');
assert(/^[0-9a-f]{8}$/.test(h1), 'D.03 FNV-1a 8-hex format');
assert(buildL9ContractReplayHash('x').startsWith('srhash_'),
  'D.04 buildL9ContractReplayHash prefix');
assert(buildL9ContractReplayHash('x') === buildL9ContractReplayHash('x'),
  'D.05 replay hash deterministic');

// Version compare
assert(compareL9ContractVersions('9.3.0', '9.3.1') === -1,
  'D.06 compareL9ContractVersions -1');
assert(compareL9ContractVersions('9.4.0', '9.3.9') === 1,
  'D.07 compareL9ContractVersions +1');
assert(compareL9ContractVersions('9.3.0', '9.3.0') === 0,
  'D.08 compareL9ContractVersions 0');
assert(compareL9ContractVersions('garbage', '9.3.0') === 0,
  'D.09 non-semver treated as non-monotonic');

// Contract compatibility classes exhaustive
assert(ALL_L9_CONTRACT_COMPATIBILITY_CLASSES.length === 5,
  'D.10 5 compatibility classes');
assert(ALL_L9_CONTRACT_COMPATIBILITY_CLASSES.includes(
  L9ContractCompatibilityClass.ADDITIVE_SAFE),
  'D.11 ADDITIVE_SAFE present');
assert(ALL_L9_CONTRACT_COMPATIBILITY_CLASSES.includes(
  L9ContractCompatibilityClass.PROHIBITED),
  'D.12 PROHIBITED present');

// Surfaces exhaustive
assert(ALL_L9_CONTRACT_SURFACES.length === 8,
  'D.13 8 contract surfaces (subject, output, LL, chain, phase, decay, PE, restriction)');
assert(ALL_L9_CONTRACT_SURFACES.includes(L9ContractSurface.SUBJECT),
  'D.14 SUBJECT surface registered');
assert(ALL_L9_CONTRACT_SURFACES.includes(L9ContractSurface.RESTRICTION),
  'D.15 RESTRICTION surface registered');

// Readiness classes exhaustive
assert(ALL_L9_SEQUENCE_READINESS_CLASSES.length === 5,
  'D.16 5 readiness classes');
assert(ALL_L9_SEQUENCE_READINESS_CLASSES.includes(
  L9SequenceReadinessClass.CLEAN_EMISSION),
  'D.17 CLEAN_EMISSION registered');
assert(ALL_L9_SEQUENCE_READINESS_CLASSES.includes(
  L9SequenceReadinessClass.BLOCKED_EMISSION),
  'D.18 BLOCKED_EMISSION registered');

// Contract versioning defaults
assert(L9_CURRENT_CONTRACT_VERSIONS.subject_contract_version === '9.3.0',
  'D.19 subject contract version defaults 9.3.0');
assert(L9_CURRENT_CONTRACT_VERSIONS.policy_version.startsWith('l9.3-'),
  'D.20 policy_version namespaced');

// classifyL9ContractDelta matrix
assert(classifyL9ContractDelta({
  surface: L9ContractSurface.OUTPUT, from: '9.3.0', to: '9.4.0',
  added_fields: [], removed_fields: [],
  semantically_changed_fields: [], changed_enum_vocabularies: [],
  changed_default_policies: [], prohibited_change: true,
}) === L9ContractCompatibilityClass.PROHIBITED,
  'D.21 prohibited_change → PROHIBITED');
assert(classifyL9ContractDelta({
  surface: L9ContractSurface.OUTPUT, from: '9.3.0', to: '9.4.0',
  added_fields: [], removed_fields: [],
  semantically_changed_fields: ['primary_sequence_state'],
  changed_enum_vocabularies: [], changed_default_policies: [],
  prohibited_change: false,
}) === L9ContractCompatibilityClass.BREAKING_SEMANTIC,
  'D.22 semantic change → BREAKING_SEMANTIC');
assert(classifyL9ContractDelta({
  surface: L9ContractSurface.SUBJECT, from: '9.3.0', to: '9.3.1',
  added_fields: [], removed_fields: ['sequence_window'],
  semantically_changed_fields: [], changed_enum_vocabularies: [],
  changed_default_policies: [], prohibited_change: false,
}) === L9ContractCompatibilityClass.MIGRATION_REQUIRED,
  'D.23 removed required field → MIGRATION_REQUIRED');
assert(classifyL9ContractDelta({
  surface: L9ContractSurface.OUTPUT, from: '9.3.0', to: '9.3.1',
  added_fields: [], removed_fields: [],
  semantically_changed_fields: [],
  changed_enum_vocabularies: ['L9SequenceState'],
  changed_default_policies: [], prohibited_change: false,
}) === L9ContractCompatibilityClass.MIGRATION_REQUIRED,
  'D.24 enum vocabulary change → MIGRATION_REQUIRED');
assert(classifyL9ContractDelta({
  surface: L9ContractSurface.OUTPUT, from: '9.3.0', to: '9.3.1',
  added_fields: [], removed_fields: [],
  semantically_changed_fields: [], changed_enum_vocabularies: [],
  changed_default_policies: ['default_reliance_band'],
  prohibited_change: false,
}) === L9ContractCompatibilityClass.BACKWARD_COMPATIBLE,
  'D.25 default-policy change → BACKWARD_COMPATIBLE');
assert(classifyL9ContractDelta({
  surface: L9ContractSurface.OUTPUT, from: '9.3.0', to: '9.3.1',
  added_fields: ['new_optional_field'], removed_fields: [],
  semantically_changed_fields: [], changed_enum_vocabularies: [],
  changed_default_policies: [], prohibited_change: false,
}) === L9ContractCompatibilityClass.ADDITIVE_SAFE,
  'D.26 additive change → ADDITIVE_SAFE');

// isLegalL9ContractUpgrade
assert(isLegalL9ContractUpgrade({
  surface: L9ContractSurface.OUTPUT, from: '9.3.0', to: '9.3.1',
  added_fields: ['x'], removed_fields: [],
  semantically_changed_fields: [], changed_enum_vocabularies: [],
  changed_default_policies: [], prohibited_change: false,
}), 'D.27 additive upgrade legal');
assert(!isLegalL9ContractUpgrade({
  surface: L9ContractSurface.OUTPUT, from: '9.3.0', to: '9.4.0',
  added_fields: [], removed_fields: [],
  semantically_changed_fields: [], changed_enum_vocabularies: [],
  changed_default_policies: [], prohibited_change: true,
}), 'D.28 prohibited upgrade illegal');
assert(!isLegalL9ContractUpgrade({
  surface: L9ContractSurface.OUTPUT, from: '9.3.0', to: '9.4.0',
  added_fields: [], removed_fields: [],
  semantically_changed_fields: ['primary_sequence_state'],
  changed_enum_vocabularies: [], changed_default_policies: [],
  prohibited_change: false,
}, {}), 'D.29 breaking without allowBreaking illegal');
assert(isLegalL9ContractUpgrade({
  surface: L9ContractSurface.OUTPUT, from: '9.3.0', to: '9.4.0',
  added_fields: [], removed_fields: [],
  semantically_changed_fields: ['primary_sequence_state'],
  changed_enum_vocabularies: [], changed_default_policies: [],
  prohibited_change: false,
}, { allowBreaking: true }), 'D.30 breaking with allowBreaking legal');

// validateL9ContractCompatibility — mismatch, non-monotonic, removal
const mismatch = validateL9ContractCompatibility({
  delta: {
    surface: L9ContractSurface.OUTPUT, from: '9.3.0', to: '9.4.0',
    added_fields: [], removed_fields: [],
    semantically_changed_fields: ['primary_sequence_state'],
    changed_enum_vocabularies: [], changed_default_policies: [],
    prohibited_change: false,
  },
  declaredClass: L9ContractCompatibilityClass.ADDITIVE_SAFE,
});
assert(mismatch.issues.some(i =>
  i.code === L9SequenceContractViolationCode.COMPATIBILITY_CLASSIFICATION_MISMATCH),
  'D.31 declared < actual → classification mismatch');
const nonMono = validateL9ContractCompatibility({
  delta: {
    surface: L9ContractSurface.OUTPUT, from: '9.4.0', to: '9.3.0',
    added_fields: [], removed_fields: [],
    semantically_changed_fields: [], changed_enum_vocabularies: [],
    changed_default_policies: [], prohibited_change: false,
  },
  declaredClass: L9ContractCompatibilityClass.ADDITIVE_SAFE,
});
assert(nonMono.issues.some(i =>
  i.code === L9SequenceContractViolationCode.COMPATIBILITY_NON_MONOTONIC_VERSION),
  'D.32 non-monotonic version rejects');
const removal = validateL9ContractCompatibility({
  delta: {
    surface: L9ContractSurface.SUBJECT, from: '9.3.0', to: '9.3.1',
    added_fields: [], removed_fields: ['sequence_window'],
    semantically_changed_fields: [], changed_enum_vocabularies: [],
    changed_default_policies: [], prohibited_change: false,
  },
  declaredClass: L9ContractCompatibilityClass.MIGRATION_REQUIRED,
  migrationApproved: false,
});
assert(removal.issues.some(i =>
  i.code === L9SequenceContractViolationCode.COMPATIBILITY_REQUIRED_FIELD_REMOVED),
  'D.33 removing required field without migration approval rejects');
const removalApproved = validateL9ContractCompatibility({
  delta: {
    surface: L9ContractSurface.SUBJECT, from: '9.3.0', to: '9.3.1',
    added_fields: [], removed_fields: ['sequence_window'],
    semantically_changed_fields: [], changed_enum_vocabularies: [],
    changed_default_policies: [], prohibited_change: false,
  },
  declaredClass: L9ContractCompatibilityClass.MIGRATION_REQUIRED,
  migrationApproved: true,
});
assert(removalApproved.issues.every(i =>
  i.code !== L9SequenceContractViolationCode.COMPATIBILITY_REQUIRED_FIELD_REMOVED),
  'D.34 removing required field with migration approval passes removal gate');
const prohibited = validateL9ContractCompatibility({
  delta: {
    surface: L9ContractSurface.OUTPUT, from: '9.3.0', to: '9.4.0',
    added_fields: [], removed_fields: [],
    semantically_changed_fields: [], changed_enum_vocabularies: [],
    changed_default_policies: [], prohibited_change: true,
  },
  declaredClass: L9ContractCompatibilityClass.PROHIBITED,
});
assert(prohibited.issues.some(i =>
  i.code === L9SequenceContractViolationCode.COMPATIBILITY_PROHIBITED),
  'D.35 prohibited delta emits COMPATIBILITY_PROHIBITED');

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit and Invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit and Invariants ═══');
resetAll();

// Audit empty after reset
assert(getL9ContractAuditLog().length === 0,
  'E.01 contract audit log empty after reset');
assert(!hasAnyL9ContractViolations(), 'E.02 no violations after reset');
assert(getL9ContractViolationCount() === 0,
  'E.03 violation count 0 after reset');

// Specialized emitters
emitL9SubjectContractViolation(
  L9SequenceContractViolationCode.SUBJECT_MISSING_IDENTITY,
  'test-subj', 'subject identity missing');
emitL9OutputContractViolation(
  L9SequenceContractViolationCode.OUTPUT_MISSING_PRIMARY_STATE,
  'test-out', 'primary state missing');
emitL9LeadLagContractViolation(
  L9SequenceContractViolationCode.LEAD_LAG_MISSING_ENDPOINTS,
  'test-ll', 'endpoints missing');
emitL9ChainContractViolation(
  L9SequenceContractViolationCode.CHAIN_MISSING_ORDERED_NODES,
  'test-ch', 'nodes missing');
emitL9PhaseContractViolation(
  L9SequenceContractViolationCode.PHASE_MISSING_CLASS,
  'test-ph', 'phase class missing');
emitL9DecayContractViolation(
  L9SequenceContractViolationCode.DECAY_MISSING_CLASS,
  'test-dc', 'decay class missing');
emitL9PostEventContractViolation(
  L9SequenceContractViolationCode.POST_EVENT_MISSING_ANCHOR,
  'test-pe', 'anchor missing');
emitL9RestrictionContractViolation(
  L9SequenceContractViolationCode.RESTRICTION_MISSING_BAND,
  'test-rs', 'reliance band missing');
emitL9CompatibilityViolation(
  L9SequenceContractViolationCode.COMPATIBILITY_PROHIBITED,
  'test-cc', 'prohibited upgrade');
emitL9ReadinessViolation(
  L9SequenceContractViolationCode.REGIME_POSTURE_REQUIRED,
  'test-rd', 'regime missing');

assert(getL9ContractViolationCount() === 10,
  'E.04 10 specialized emitters recorded');
assert(getL9ContractCriticalViolations().length >= 3,
  'E.05 critical violations present (output + restriction + compatibility)');
assert(getL9ContractViolationsByCode(
  L9SequenceContractViolationCode.OUTPUT_MISSING_PRIMARY_STATE).length === 1,
  'E.06 violations-by-code lookup works');
assert(getL9ContractViolationsBySurface(L9ContractSurface.LEAD_LAG).length === 1,
  'E.07 violations-by-surface lookup works');
assert(getL9ContractViolationsBySurface('COMPATIBILITY').length === 1,
  'E.08 COMPATIBILITY surface tracked');
assert(getL9ContractViolationsBySurface('READINESS').length === 1,
  'E.09 READINESS surface tracked');

// Raw record emission
emitL9ContractAuditRecord({
  violationCode: L9SequenceContractViolationCode.OUTPUT_JUDGMENT_LEAK,
  surface: L9ContractSurface.OUTPUT,
  source: 'test-raw',
  detail: 'direct emit',
  context: { extra: 1 },
  severity: 'INFO',
});
assert(getL9ContractViolationCount() === 11,
  'E.10 raw emission recorded');
const raw = getL9ContractAuditLog()[getL9ContractAuditLog().length - 1];
assert(raw.severity === 'INFO' && raw.source === 'test-raw',
  'E.11 raw emission preserves fields');
assert(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(raw.timestamp),
  'E.12 raw emission stamps ISO timestamp');

resetL9ContractAuditLog();
assert(getL9ContractAuditLog().length === 0,
  'E.13 reset clears contract audit log');

// Violation-code registry surface
assert(ALL_L9_SEQUENCE_CONTRACT_VIOLATION_CODES.length >= 80,
  `E.14 ≥80 contract violation codes (got ${ALL_L9_SEQUENCE_CONTRACT_VIOLATION_CODES.length})`);
assert(ALL_L9_SEQUENCE_CONTRACT_VIOLATION_CODES.every(c =>
  typeof c === 'string' && c.startsWith('L9C_')),
  'E.15 every contract code uses L9C_ prefix');

// Invariants
const invAll = checkAllL93Invariants();
assert(invAll.length === 7, 'E.16 7 L9.3 invariants');
assert(invAll.every(r => r.holds),
  `E.17 every L9.3 invariant holds: ${
    invAll.filter(r => !r.holds).map(r => `${r.id}(${r.evidence})`).join(', ')
    || 'ok'
  }`);
assert(checkINV_93_A().holds, 'E.18 INV-9.3-A holds');
assert(checkINV_93_B().holds, 'E.19 INV-9.3-B holds');
assert(checkINV_93_C().holds, 'E.20 INV-9.3-C holds');
assert(checkINV_93_D().holds, 'E.21 INV-9.3-D holds');
assert(checkINV_93_E().holds, 'E.22 INV-9.3-E holds');
assert(checkINV_93_F().holds, 'E.23 INV-9.3-F holds');
assert(checkINV_93_G().holds, 'E.24 INV-9.3-G holds');

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(64));
console.log(`L9.3 CONTRACTS — passed=${passed} failed=${failed}`);
console.log('═'.repeat(64));
if (failed > 0) {
  console.error(`\n✗ L9.3 contract-layer certification FAILED — ${failed} assertion(s):`);
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log('✓ Layer 9.3 universal contract-and-emission law green.');
