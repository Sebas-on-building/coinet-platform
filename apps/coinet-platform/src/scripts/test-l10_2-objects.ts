/**
 * L10.2 — Hypothesis Doctrine, Object Model, and Output Classes
 * Certification Test Suite
 *
 * 5 Bands (§10.2.20):
 *   A — Doctrine and registration
 *   B — Object completeness
 *   C — Competition object law
 *   D — Semantic integrity
 *   E — Audit + INV-10.2-A..G invariants
 */

import {
  // Materiality / window
  L10MaterialityClass, ALL_L10_MATERIALITY_CLASSES,
  L10_MATERIALITY_DESCRIPTORS, getL10MaterialityDescriptor, isL10RegisteredMateriality,
  L10HypothesisWindow, isLegalL10Window,
  // Subject class / family
  L10HypothesisSubjectClass, ALL_L10_HYPOTHESIS_SUBJECT_CLASSES,
  L10HypothesisFamilyClass, ALL_L10_HYPOTHESIS_FAMILY_CLASSES,
  L10_HYPOTHESIS_FAMILY_DESCRIPTORS,
  isL10RegisteredHypothesisFamily, isL10RegisteredSubjectClass,
  l10FamilyAllowsScope, getL10HypothesisFamilyDescriptor,
  // Output class
  L10HypothesisOutputClass, ALL_L10_HYPOTHESIS_OUTPUT_CLASSES,
  L10_HYPOTHESIS_OUTPUT_CLASS_DESCRIPTORS,
  getL10HypothesisOutputClassDescriptor, isL10RegisteredHypothesisOutputClass,
  l10ObjectOutputClassesAlignWithConstitution,
  // Subject / candidate / sub-objects
  L10HypothesisSubject, buildL10HypothesisSubjectId, buildL10HypothesisReplayHash,
  L10HypothesisCandidate, buildL10HypothesisCandidateId,
  L10HypothesisSupportSet, L10HypothesisContradictionSet,
  L10HypothesisConfirmationSet, L10HypothesisInvalidationSet,
  // Assessment / ranking / spread / shift / restriction
  L10HypothesisAssessment, L10HypothesisConfidenceBand,
  L10HypothesisReadinessClass, buildL10HypothesisAssessmentId,
  canonicalizeL10HypothesisAssessmentForHash, l10ConfidenceBandForScore,
  L10HypothesisRanking, L10RankingStabilityClass, buildL10HypothesisRankingId,
  L10HypothesisSpreadProfile, L10SpreadClass, l10SpreadClassForGap,
  L10HypothesisShiftConditionSet,
  L10HypothesisRestrictionProfile, L10RestrictionRight, L10BlockedUse,
  L10RelianceBand, L10_MANDATORY_BLOCKED_USES,
} from '../l10/contracts';

import {
  L10HypothesisSubjectClassRegistry, getDefaultL10HypothesisSubjectClassRegistry,
  L10HypothesisFamilyRegistry, getDefaultL10HypothesisFamilyRegistry,
  L10HypothesisOutputClassRegistry, getDefaultL10HypothesisOutputClassRegistry,
  L10HypothesisRestrictionRightRegistry, getDefaultL10HypothesisRestrictionRightRegistry,
  L10HypothesisSubjectRegistry, getDefaultL10HypothesisSubjectRegistry,
} from '../l10/registry';

import {
  L10ObjectViolationCode, ALL_L10_OBJECT_VIOLATION_CODES,
  checkL10ObjectLeak, L10_OBJECT_LEAK_PATTERNS,
  validateL10HypothesisSubject,
  validateL10HypothesisCandidate,
  validateL10HypothesisSupportSet,
  validateL10HypothesisContradictionSet,
  validateL10HypothesisConfirmationSet,
  validateL10HypothesisInvalidationSet,
  validateL10HypothesisAssessment,
  validateL10HypothesisRanking,
  validateL10HypothesisSpreadProfile,
  validateL10HypothesisShiftConditionSet,
  validateL10HypothesisRestrictionProfile,
} from '../l10/validation';

import {
  emitL10ObjectAudit, getL10ObjectAuditLog, clearL10ObjectAuditLog,
  filterL10ObjectAuditBySeverity, filterL10ObjectAuditByCode,
  L10ObjectAuditSeverity, severityFor,
} from '../l10/constitution';

import {
  checkAllL102Invariants,
  checkINV_102_A, checkINV_102_B, checkINV_102_C, checkINV_102_D,
  checkINV_102_E, checkINV_102_F, checkINV_102_G,
} from '../l10/invariants/l10_2-invariants';

// ═══════════════════════════════════════════════════════════════
// Harness
// ═══════════════════════════════════════════════════════════════
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.log(`  ✗ ${label}`); }
}

function resetAll(): void {
  clearL10ObjectAuditLog();
}

// ═══════════════════════════════════════════════════════════════
// Builders
// ═══════════════════════════════════════════════════════════════
function buildWindow(overrides: Partial<L10HypothesisWindow> = {}): L10HypothesisWindow {
  return {
    window_start: '2026-01-01T00:00:00Z',
    window_end: '2026-01-02T00:00:00Z',
    granularity: 'HOUR',
    freshness_budget_ms: 5 * 60 * 1000,
    staleness_policy: 'STRICT',
    ...overrides,
  };
}

function buildValidSubject(overrides: Partial<L10HypothesisSubject> = {}): L10HypothesisSubject {
  const base: L10HypothesisSubject = {
    hypothesis_subject_id: 'hsub_fixed_a',
    subject_class: L10HypothesisSubjectClass.TOKEN_EXPLANATION,
    subject_version: 'v1',
    scope_type: 'TOKEN',
    scope_id: 'tok_abc',
    scope_granularity: 'POINT',
    as_of: '2026-01-01T12:00:00Z',
    window: buildWindow(),
    materiality: L10MaterialityClass.MATERIAL,
    hypothesis_family_set: [
      L10HypothesisFamilyClass.GENUINE_EARLY_ACCUMULATION,
      L10HypothesisFamilyClass.NARRATIVE_ONLY_REFLEXIVE_PUMP,
    ],
    required_validation_inputs: ['val_1'],
    required_regime_inputs: ['reg_1'],
    required_sequence_inputs: ['seq_1'],
    required_feature_inputs: ['feat_1'],
    required_event_inputs: ['evt_1'],
    historical_inputs: ['hist_1'],
    evidence_only_inputs: ['ev_only_1'],
    candidate_generation_rules: ['rule_family_expand', 'rule_regime_condition'],
    candidate_template_allowlist: [],
    candidate_template_blocklist: [],
    competition_policy: {
      min_competition_size: 2,
      requires_secondary: true,
      single_story_collapse_forbidden: true,
    },
    restriction_consumption_requirements: ['restrict_l7'],
    sequence_posture_requirements: ['l9_regime_conditioning'],
    regime_posture_requirements: ['l8_regime_posture'],
    input_snapshot_ref: 'snap_1',
    lineage_refs: { trace_id: 'tr_1', manifest_id: 'mf_1', upstream_refs: ['u_1'] },
    lineage_policy: 'STRICT',
    created_by: 'system',
    created_at: '2026-01-01T12:00:00Z',
    description: 'Accumulation versus reflexive pump explanation for asset',
  };
  return { ...base, ...overrides };
}

function buildValidCandidate(overrides: Partial<L10HypothesisCandidate> = {}): L10HypothesisCandidate {
  const base: L10HypothesisCandidate = {
    hypothesis_candidate_id: 'hcan_a',
    hypothesis_subject_id: 'hsub_fixed_a',
    hypothesis_family: L10HypothesisFamilyClass.GENUINE_EARLY_ACCUMULATION,
    hypothesis_template_id: 'tpl_accum_v1',
    template_version: 'v1',
    hypothesis_name: 'GenuineEarlyAccumulationCandidate',
    candidate_class: 'PRIMARY_CANDIDATE',
    required_support_domains: ['onchain_supply', 'liquidity'],
    required_challenge_domains: ['funding', 'basis'],
    required_confirmation_domains: ['breadth'],
    invalidation_domains: ['shock', 'unlock'],
    regime_conditioning_requirements: ['regime_env_1'],
    sequence_conditioning_requirements: ['sequence_state_1'],
    required_restriction_consumption: ['restrict_l7'],
    required_regime_consumption: ['l8'],
    required_sequence_consumption: ['l9'],
    candidate_priority_seed: 1,
    competition_group: 'cg_1',
    negative_evidence_tolerance: 0.2,
    evidence_threshold_profile: {
      min_support_strength: 0.4,
      max_contradiction_pressure: 0.6,
      min_coverage: 0.5,
    },
    lineage_refs: ['lin_1'],
    description: 'Accumulation structure candidate bound to governed lower-layer inputs',
  };
  return { ...base, ...overrides };
}

function buildValidSupportSet(overrides: Partial<L10HypothesisSupportSet> = {}): L10HypothesisSupportSet {
  return {
    support_set_id: 'hsup_a',
    hypothesis_candidate_id: 'hcan_a',
    supporting_refs: ['ev_1', 'ev_2'],
    support_domains: ['onchain_supply'],
    support_strength_score: 0.7,
    support_coverage_score: 0.8,
    stale_support_refs: [],
    degraded_support_refs: [],
    missing_expected_support_refs: [],
    lineage_refs: ['lin_1'],
    ...overrides,
  };
}

function buildValidContradictionSet(overrides: Partial<L10HypothesisContradictionSet> = {}): L10HypothesisContradictionSet {
  return {
    contradiction_set_id: 'hcon_a',
    hypothesis_candidate_id: 'hcan_a',
    contradiction_refs: ['cev_1'],
    contradiction_domains: ['funding'],
    contradiction_pressure_score: 0.3,
    blocking_contradiction_refs: [],
    narrowing_contradiction_refs: ['cev_1'],
    decayed_contradiction_refs: [],
    lineage_refs: ['lin_1'],
    ...overrides,
  };
}

function buildValidConfirmationSet(overrides: Partial<L10HypothesisConfirmationSet> = {}): L10HypothesisConfirmationSet {
  return {
    confirmation_set_id: 'hcnf_a',
    hypothesis_candidate_id: 'hcan_a',
    required_confirmation_refs: ['conf_1', 'conf_2'],
    present_confirmation_refs: ['conf_1'],
    missing_confirmation_refs: ['conf_2'],
    confirmation_gap_score: 0.5,
    lineage_refs: ['lin_1'],
    ...overrides,
  };
}

function buildValidInvalidationSet(overrides: Partial<L10HypothesisInvalidationSet> = {}): L10HypothesisInvalidationSet {
  return {
    invalidation_set_id: 'hinv_a',
    hypothesis_candidate_id: 'hcan_a',
    invalidation_signal_refs: ['inv_1', 'inv_2'],
    active_invalidation_refs: [],
    potential_invalidation_refs: ['inv_1', 'inv_2'],
    invalidation_risk_score: 0.2,
    lineage_refs: ['lin_1'],
    ...overrides,
  };
}

function buildValidAssessment(overrides: Partial<L10HypothesisAssessment> = {}): L10HypothesisAssessment {
  const base: L10HypothesisAssessment = {
    hypothesis_assessment_id: 'hassess_a',
    hypothesis_subject_id: 'hsub_fixed_a',
    hypothesis_candidate_id: 'hcan_a',
    hypothesis_family: L10HypothesisFamilyClass.GENUINE_EARLY_ACCUMULATION,
    hypothesis_template_id: 'tpl_accum_v1',
    hypothesis_name: 'GenuineEarlyAccumulationAssessment',
    subject_class: L10HypothesisSubjectClass.TOKEN_EXPLANATION,
    scope_type: 'TOKEN',
    scope_id: 'tok_abc',
    as_of: '2026-01-01T12:00:00Z',
    support_set_ref: 'hsup_a',
    contradiction_set_ref: 'hcon_a',
    confirmation_set_ref: 'hcnf_a',
    invalidation_set_ref: 'hinv_a',
    supporting_evidence_refs: ['ev_1'],
    contradicting_evidence_refs: ['cev_1'],
    required_confirmation_refs: ['conf_1'],
    invalidation_signal_refs: ['inv_1'],
    hypothesis_confidence_score: 0.7,
    hypothesis_confidence_band: L10HypothesisConfidenceBand.MODERATE,
    support_strength_score: 0.7,
    contradiction_pressure_score: 0.3,
    confirmation_gap_score: 0.5,
    invalidation_risk_score: 0.2,
    rank_position: 0,
    rank_spread_to_next: 0.2,
    restriction_profile_ref: 'hrest_a',
    shift_condition_set_ref: 'hshift_a',
    evidence_pack_ref: 'epk_a',
    input_snapshot_ref: 'snap_1',
    compute_run_id: 'run_a',
    replay_hash: 'hhash_a',
    lineage_refs: ['lin_1'],
    policy_version: 'pv1',
    readiness_class: L10HypothesisReadinessClass.READY,
    causal_restraint_flags: {
      hypothesis_is_explanation_candidate: true,
      not_final_judgment_disclaimer: 'Explanation candidate only; not final judgment',
      scenario_excluded: true,
      recommendation_excluded: true,
      judgment_excluded: true,
      score_is_not_probability_of_truth: true,
    },
    materialization_mode: 'LIVE',
    created_by: 'system',
    created_at: '2026-01-01T12:00:00Z',
    description: 'Accumulation candidate assessment with governed lower-layer evidence',
  };
  return { ...base, ...overrides };
}

function buildValidRanking(overrides: Partial<L10HypothesisRanking> = {}): L10HypothesisRanking {
  return {
    hypothesis_ranking_id: 'hrank_a',
    hypothesis_subject_id: 'hsub_fixed_a',
    as_of: '2026-01-01T12:00:00Z',
    ordered_hypothesis_assessment_refs: ['hassess_a', 'hassess_b'],
    primary_hypothesis_ref: 'hassess_a',
    secondary_hypothesis_ref: 'hassess_b',
    competition_size: 2,
    ranking_stability_class: L10RankingStabilityClass.STABLE,
    spread_profile_ref: 'hspread_a',
    shift_condition_set_ref: 'hshift_a',
    evidence_pack_ref: 'epk_r',
    input_snapshot_ref: 'snap_1',
    compute_run_id: 'run_a',
    replay_hash: 'hhash_r',
    lineage_refs: ['lin_1'],
    policy_version: 'pv1',
    ...overrides,
  };
}

function buildValidSpread(overrides: Partial<L10HypothesisSpreadProfile> = {}): L10HypothesisSpreadProfile {
  return {
    spread_profile_id: 'hspread_a',
    hypothesis_subject_id: 'hsub_fixed_a',
    hypothesis_ranking_ref: 'hrank_a',
    as_of: '2026-01-01T12:00:00Z',
    primary_hypothesis_ref: 'hassess_a',
    secondary_hypothesis_ref: 'hassess_b',
    confidence_spread: 0.4,
    spread_class: L10SpreadClass.WIDE,
    ranking_stability_class: L10RankingStabilityClass.STABLE,
    narrow_spread_flag: false,
    evidence_pack_ref: 'epk_s',
    replay_hash: 'hhash_s',
    lineage_refs: ['lin_1'],
    ...overrides,
  };
}

function buildValidShift(overrides: Partial<L10HypothesisShiftConditionSet> = {}): L10HypothesisShiftConditionSet {
  return {
    shift_condition_set_id: 'hshift_a',
    hypothesis_subject_id: 'hsub_fixed_a',
    hypothesis_ranking_ref: 'hrank_a',
    as_of: '2026-01-01T12:00:00Z',
    current_primary_ref: 'hassess_a',
    current_secondary_ref: 'hassess_b',
    promotion_conditions_for_secondary: ['narrative_substance_confirmed'],
    reinforcement_conditions_for_primary: ['breadth_continues'],
    collapse_conditions_for_primary: ['supply_shock_repricing'],
    spread_narrowing_conditions: ['funding_stress_emerges'],
    evidence_pack_ref: 'epk_sh',
    replay_hash: 'hhash_sh',
    lineage_refs: ['lin_1'],
    ...overrides,
  };
}

function buildValidRestriction(overrides: Partial<L10HypothesisRestrictionProfile> = {}): L10HypothesisRestrictionProfile {
  return {
    hypothesis_restriction_profile_id: 'hrest_a',
    hypothesis_subject_id: 'hsub_fixed_a',
    as_of: '2026-01-01T12:00:00Z',
    reliance_band: L10RelianceBand.STANDARD,
    allowed_downstream_uses: [
      L10RestrictionRight.MAY_USE_FOR_MONITORING,
      L10RestrictionRight.MAY_USE_FOR_EXPLANATORY_CONTEXT,
    ],
    blocked_uses: [...L10_MANDATORY_BLOCKED_USES],
    required_disclosures: ['explanation_candidate_only'],
    narrowing_reasons: [],
    lineage_refs: ['lin_1'],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// BAND A — Doctrine and registration
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Doctrine and registration ═══');
resetAll();

assert(ALL_L10_MATERIALITY_CLASSES.length === 4, 'A.01 four materiality classes');
assert(L10_MATERIALITY_DESCRIPTORS.length === 4, 'A.02 four materiality descriptors');
assert(isL10RegisteredMateriality(L10MaterialityClass.MATERIAL), 'A.03 material registered');
assert(!isL10RegisteredMateriality('UNREAL'), 'A.04 bogus materiality rejected');
assert(getL10MaterialityDescriptor(L10MaterialityClass.CRITICAL)?.requiresShiftConditionSet === true,
  'A.05 critical requires shift conditions');

// Subject/family/output class registrations
assert(ALL_L10_HYPOTHESIS_SUBJECT_CLASSES.length === 8, 'A.06 eight subject classes');
assert(ALL_L10_HYPOTHESIS_FAMILY_CLASSES.length === 8, 'A.07 eight hypothesis families');
assert(L10_HYPOTHESIS_FAMILY_DESCRIPTORS.length === 8, 'A.08 eight family descriptors');
assert(ALL_L10_HYPOTHESIS_OUTPUT_CLASSES.length === 5, 'A.09 five output classes');
assert(L10_HYPOTHESIS_OUTPUT_CLASS_DESCRIPTORS.length === 5, 'A.10 five output descriptors');
assert(l10ObjectOutputClassesAlignWithConstitution(), 'A.11 output alignment with L10.1');
assert(isL10RegisteredHypothesisFamily(L10HypothesisFamilyClass.LEVERAGE_DRIVEN_SQUEEZE),
  'A.12 leverage squeeze registered');
assert(!isL10RegisteredHypothesisFamily('UNKNOWN_FAMILY'), 'A.13 unknown family rejected');
assert(isL10RegisteredSubjectClass(L10HypothesisSubjectClass.TOKEN_EXPLANATION),
  'A.14 token subject class registered');
assert(!isL10RegisteredSubjectClass('MYSTERY'), 'A.15 bogus subject class rejected');
assert(isL10RegisteredHypothesisOutputClass(L10HypothesisOutputClass.HYPOTHESIS_ASSESSMENT),
  'A.16 assessment output class registered');
assert(!isL10RegisteredHypothesisOutputClass('SCENARIO'), 'A.17 bogus output class rejected');
assert(getL10HypothesisOutputClassDescriptor(L10HypothesisOutputClass.HYPOTHESIS_ASSESSMENT)?.requiresRestrictionProfile === true,
  'A.18 assessment requires restriction');
assert(getL10HypothesisOutputClassDescriptor(L10HypothesisOutputClass.HYPOTHESIS_RANKING)?.requiresSpreadProfile === true,
  'A.19 ranking requires spread');

// Family/scope law
assert(l10FamilyAllowsScope(L10HypothesisFamilyClass.GENUINE_EARLY_ACCUMULATION, 'TOKEN'),
  'A.20 accumulation allows TOKEN');
assert(!l10FamilyAllowsScope(L10HypothesisFamilyClass.POST_UNLOCK_REDISTRIBUTION, 'MARKET'),
  'A.21 unlock rejects MARKET');
assert(getL10HypothesisFamilyDescriptor(L10HypothesisFamilyClass.POST_UNLOCK_REDISTRIBUTION)?.requiresPostEventAnchor === true,
  'A.22 unlock requires post-event anchor');

// Registries
const subjReg = getDefaultL10HypothesisSubjectClassRegistry();
const famReg = getDefaultL10HypothesisFamilyRegistry();
const outReg = getDefaultL10HypothesisOutputClassRegistry();
const restReg = getDefaultL10HypothesisRestrictionRightRegistry();
const subjectReg = getDefaultL10HypothesisSubjectRegistry();

assert(subjReg.size() === 8, 'A.23 subject registry size');
assert(famReg.size() === 8, 'A.24 family registry size');
assert(outReg.size() === 5, 'A.25 output registry size');
assert(restReg.allRights().length >= 5, 'A.26 restriction rights registered');
assert(restReg.mandatoryBlockedUses().length === L10_MANDATORY_BLOCKED_USES.length,
  'A.27 mandatory blocked uses registered');

// Duplicate rejection
let dupeRejected = false;
try {
  const r = new L10HypothesisSubjectClassRegistry();
  r.register({ subjectClass: L10HypothesisSubjectClass.TOKEN_EXPLANATION, legalScopeTypes: ['TOKEN'], description: 'x' });
  r.register({ subjectClass: L10HypothesisSubjectClass.TOKEN_EXPLANATION, legalScopeTypes: ['TOKEN'], description: 'x' });
} catch { dupeRejected = true; }
assert(dupeRejected, 'A.28 duplicate subject class rejected');

let famDupeRejected = false;
try {
  const r = new L10HypothesisFamilyRegistry();
  r.register(L10_HYPOTHESIS_FAMILY_DESCRIPTORS[0]);
  r.register(L10_HYPOTHESIS_FAMILY_DESCRIPTORS[0]);
} catch { famDupeRejected = true; }
assert(famDupeRejected, 'A.29 duplicate family rejected');

let outDupeRejected = false;
try {
  const r = new L10HypothesisOutputClassRegistry();
  r.register(L10_HYPOTHESIS_OUTPUT_CLASS_DESCRIPTORS[0]);
  r.register(L10_HYPOTHESIS_OUTPUT_CLASS_DESCRIPTORS[0]);
} catch { outDupeRejected = true; }
assert(outDupeRejected, 'A.30 duplicate output class rejected');

// Window legality
assert(isLegalL10Window(buildWindow()), 'A.31 valid window');
assert(!isLegalL10Window(buildWindow({ window_end: '2025-12-30T00:00:00Z' })),
  'A.32 end-before-start rejected');
assert(!isLegalL10Window(buildWindow({ freshness_budget_ms: -1 })), 'A.33 negative freshness rejected');

// Deterministic id/hash builders
const sid1 = buildL10HypothesisSubjectId({
  subject_class: L10HypothesisSubjectClass.TOKEN_EXPLANATION,
  scope_type: 'TOKEN',
  scope_id: 'tok_abc',
  window_start: '2026-01-01T00:00:00Z',
  window_end: '2026-01-02T00:00:00Z',
  subject_version: 'v1',
});
const sid2 = buildL10HypothesisSubjectId({
  subject_class: L10HypothesisSubjectClass.TOKEN_EXPLANATION,
  scope_type: 'TOKEN',
  scope_id: 'tok_abc',
  window_start: '2026-01-01T00:00:00Z',
  window_end: '2026-01-02T00:00:00Z',
  subject_version: 'v1',
});
assert(sid1 === sid2 && sid1.startsWith('hsub_'), 'A.34 subject id deterministic');

const aid = buildL10HypothesisAssessmentId({
  hypothesis_subject_id: 'hsub_a', hypothesis_candidate_id: 'hcan_a',
  as_of: '2026-01-01T12:00:00Z', compute_run_id: 'run_a',
});
assert(aid.startsWith('hassess_'), 'A.35 assessment id builder');
const rid = buildL10HypothesisRankingId({
  hypothesis_subject_id: 'hsub_a', as_of: '2026-01-01T12:00:00Z', compute_run_id: 'run_a',
});
assert(rid.startsWith('hrank_'), 'A.36 ranking id builder');
const cid = buildL10HypothesisCandidateId({
  hypothesis_subject_id: 'hsub_a',
  hypothesis_family: L10HypothesisFamilyClass.GENUINE_EARLY_ACCUMULATION,
  hypothesis_template_id: 'tpl_a', template_version: 'v1', candidate_priority_seed: 1,
});
assert(cid.startsWith('hcan_'), 'A.37 candidate id builder');
assert(buildL10HypothesisReplayHash('abc').startsWith('hhash_'), 'A.38 replay hash builder');

// Subject registry live registration
subjectReg.clear();
subjectReg.register(buildValidSubject());
assert(subjectReg.size() === 1, 'A.39 subject registry add');
let subjDupeRejected = false;
try { subjectReg.register(buildValidSubject()); } catch { subjDupeRejected = true; }
assert(subjDupeRejected, 'A.40 duplicate subject id rejected');

// Spread class resolver
assert(l10SpreadClassForGap(0.4) === L10SpreadClass.WIDE, 'A.41 WIDE resolver');
assert(l10SpreadClassForGap(0.2) === L10SpreadClass.MODERATE, 'A.42 MODERATE resolver');
assert(l10SpreadClassForGap(0.1) === L10SpreadClass.NARROW, 'A.43 NARROW resolver');
assert(l10SpreadClassForGap(0.01) === L10SpreadClass.TIED, 'A.44 TIED resolver');

// Confidence band resolver
assert(l10ConfidenceBandForScore(0.95) === L10HypothesisConfidenceBand.FULL, 'A.45 FULL band');
assert(l10ConfidenceBandForScore(0.8) === L10HypothesisConfidenceBand.HIGH, 'A.46 HIGH band');
assert(l10ConfidenceBandForScore(0.6) === L10HypothesisConfidenceBand.MODERATE, 'A.47 MODERATE band');
assert(l10ConfidenceBandForScore(0.2) === L10HypothesisConfidenceBand.LOW, 'A.48 LOW band');

// Object violation code set
assert(ALL_L10_OBJECT_VIOLATION_CODES.length > 40, 'A.49 object code set size');
assert(ALL_L10_OBJECT_VIOLATION_CODES.every(c => c.startsWith('L10O_')),
  'A.50 codes prefixed L10O_');

// ═══════════════════════════════════════════════════════════════
// BAND B — Object completeness
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Object completeness ═══');
resetAll();

// Valid subject passes
assert(validateL10HypothesisSubject(buildValidSubject()).valid, 'B.01 valid subject passes');

// Missing id
assert(!validateL10HypothesisSubject(buildValidSubject({ hypothesis_subject_id: '' })).valid,
  'B.02 subject missing id fails');

// Missing family set
const missingFamSet = validateL10HypothesisSubject(buildValidSubject({ hypothesis_family_set: [] }));
assert(!missingFamSet.valid, 'B.03 empty family_set fails');
assert(missingFamSet.issues.some(i => i.code === L10ObjectViolationCode.SUBJECT_MISSING_FAMILY_SET),
  'B.04 missing family set code');

// Illegal scope for family
const badScope = validateL10HypothesisSubject(buildValidSubject({
  scope_type: 'MARKET',
  subject_class: L10HypothesisSubjectClass.MARKET_EXPLANATION,
  hypothesis_family_set: [L10HypothesisFamilyClass.POST_UNLOCK_REDISTRIBUTION],
}));
assert(!badScope.valid, 'B.05 scope illegal for family rejected');
assert(badScope.issues.some(i => i.code === L10ObjectViolationCode.SUBJECT_FAMILY_SCOPE_ILLEGAL),
  'B.06 family/scope code');

// Missing lineage
const noLineage = validateL10HypothesisSubject(buildValidSubject({
  lineage_refs: { trace_id: '', manifest_id: '', upstream_refs: [] },
}));
assert(!noLineage.valid, 'B.07 missing lineage fails');
assert(noLineage.issues.some(i => i.code === L10ObjectViolationCode.SUBJECT_MISSING_LINEAGE),
  'B.08 missing-lineage code');

// Pre-selected candidate
const preselected = validateL10HypothesisSubject(buildValidSubject({
  candidate_template_allowlist: ['tpl_1'],
  candidate_generation_rules: ['rule_1'],
}));
assert(!preselected.valid, 'B.09 pre-selected candidate rejected');
assert(preselected.issues.some(i => i.code === L10ObjectViolationCode.SUBJECT_PRESELECTED_CANDIDATE),
  'B.10 pre-selected code');

// Candidate valid
assert(validateL10HypothesisCandidate(buildValidCandidate()).valid, 'B.11 valid candidate passes');
// Missing template
assert(!validateL10HypothesisCandidate(buildValidCandidate({ hypothesis_template_id: '' })).valid,
  'B.12 missing template fails');
// Missing support domains
assert(!validateL10HypothesisCandidate(buildValidCandidate({ required_support_domains: [] })).valid,
  'B.13 missing support domains fails');
// Name leak
const nameLeak = validateL10HypothesisCandidate(buildValidCandidate({
  hypothesis_name: 'FinalJudgmentCandidate',
  description: 'Judgment is decided',
}));
assert(!nameLeak.valid, 'B.14 judgment-name leak rejected');
assert(nameLeak.issues.some(i => i.code === L10ObjectViolationCode.CANDIDATE_NAME_LEAKS_SEMANTICS),
  'B.15 name-leak code');
// Finality semantics
const finalityCand = validateL10HypothesisCandidate(buildValidCandidate({
  description: 'Scenario confirmed and guaranteed outcome',
}));
assert(finalityCand.issues.some(i => i.code === L10ObjectViolationCode.CANDIDATE_CARRIES_FINALITY),
  'B.16 candidate finality code');

// Sub-object valid instances
assert(validateL10HypothesisSupportSet(buildValidSupportSet()).valid, 'B.17 valid support set');
assert(validateL10HypothesisContradictionSet(buildValidContradictionSet()).valid,
  'B.18 valid contradiction set');
assert(validateL10HypothesisConfirmationSet(buildValidConfirmationSet()).valid,
  'B.19 valid confirmation set');
assert(validateL10HypothesisInvalidationSet(buildValidInvalidationSet()).valid,
  'B.20 valid invalidation set');

// Support claimed without refs
const supClaimed = validateL10HypothesisSupportSet(buildValidSupportSet({ supporting_refs: [] }));
assert(!supClaimed.valid, 'B.21 support claim without refs fails');
assert(supClaimed.issues.some(i => i.code === L10ObjectViolationCode.SUPPORT_CLAIMED_WITHOUT_REFS),
  'B.22 support-claim code');

// Hidden staleness (low coverage, no stale/degraded/missing)
const hiddenStale = validateL10HypothesisSupportSet(buildValidSupportSet({
  support_coverage_score: 0.3,
}));
assert(hiddenStale.issues.some(i => i.code === L10ObjectViolationCode.SUPPORT_HIDDEN_STALENESS),
  'B.23 hidden staleness detected');

// Contradiction claimed but no refs
const contClaim = validateL10HypothesisContradictionSet(buildValidContradictionSet({
  contradiction_refs: [],
  contradiction_domains: [],
  contradiction_pressure_score: 0.5,
  narrowing_contradiction_refs: [],
}));
assert(!contClaim.valid, 'B.24 contradiction claimed without refs fails');
assert(contClaim.issues.some(i => i.code === L10ObjectViolationCode.CONTRADICTION_CLAIMED_WITHOUT_REFS),
  'B.25 contradiction-claim code');

// Contradiction blocking/narrowing not separated
const contBlock = validateL10HypothesisContradictionSet(buildValidContradictionSet({
  narrowing_contradiction_refs: [],
  blocking_contradiction_refs: [],
}));
assert(contBlock.issues.some(i => i.code === L10ObjectViolationCode.CONTRADICTION_BLOCKING_NOT_SEPARATED),
  'B.26 contradiction-blocking-not-separated');

// Confirmation required not surfaced
const confEmpty = validateL10HypothesisConfirmationSet(buildValidConfirmationSet({
  required_confirmation_refs: [], present_confirmation_refs: [], missing_confirmation_refs: [],
}));
assert(!confEmpty.valid, 'B.27 confirmation required empty fails');
assert(confEmpty.issues.some(i => i.code === L10ObjectViolationCode.CONFIRMATION_REQUIRED_NOT_SURFACED),
  'B.28 confirmation-required code');

// Confirmation present/missing not separated
const confSep = validateL10HypothesisConfirmationSet(buildValidConfirmationSet({
  present_confirmation_refs: [], missing_confirmation_refs: [],
}));
assert(confSep.issues.some(i => i.code === L10ObjectViolationCode.CONFIRMATION_PRESENT_MISSING_NOT_SEPARATED),
  'B.29 confirmation-not-separated');

// Invalidation active/potential not separated
const invSep = validateL10HypothesisInvalidationSet(buildValidInvalidationSet({
  active_invalidation_refs: [], potential_invalidation_refs: [],
}));
assert(invSep.issues.some(i => i.code === L10ObjectViolationCode.INVALIDATION_ACTIVE_POTENTIAL_NOT_SEPARATED),
  'B.30 invalidation-not-separated');

// Invalidation risk claimed without refs
const invRisk = validateL10HypothesisInvalidationSet(buildValidInvalidationSet({
  invalidation_signal_refs: [], active_invalidation_refs: [], potential_invalidation_refs: [],
  invalidation_risk_score: 0.4,
}));
assert(invRisk.issues.some(i => i.code === L10ObjectViolationCode.INVALIDATION_RISK_CLAIMED_WITHOUT_REFS),
  'B.31 invalidation-risk-without-refs');

// Out-of-range scores
assert(validateL10HypothesisSupportSet(buildValidSupportSet({ support_strength_score: 1.5 }))
  .issues.some(i => i.code === L10ObjectViolationCode.SUPPORT_STRENGTH_OUT_OF_RANGE),
  'B.32 support strength OOR');
assert(validateL10HypothesisContradictionSet(buildValidContradictionSet({ contradiction_pressure_score: -0.1 }))
  .issues.some(i => i.code === L10ObjectViolationCode.CONTRADICTION_PRESSURE_OUT_OF_RANGE),
  'B.33 contradiction pressure OOR');
assert(validateL10HypothesisConfirmationSet(buildValidConfirmationSet({ confirmation_gap_score: 2 }))
  .issues.some(i => i.code === L10ObjectViolationCode.CONFIRMATION_GAP_OUT_OF_RANGE),
  'B.34 confirmation gap OOR');
assert(validateL10HypothesisInvalidationSet(buildValidInvalidationSet({ invalidation_risk_score: NaN }))
  .issues.some(i => i.code === L10ObjectViolationCode.INVALIDATION_RISK_OUT_OF_RANGE),
  'B.35 invalidation risk OOR');

// Missing lineage variants
assert(validateL10HypothesisSupportSet(buildValidSupportSet({ lineage_refs: [] }))
  .issues.some(i => i.code === L10ObjectViolationCode.SUPPORT_MISSING_LINEAGE), 'B.36 support missing lineage');
assert(validateL10HypothesisContradictionSet(buildValidContradictionSet({ lineage_refs: [] }))
  .issues.some(i => i.code === L10ObjectViolationCode.CONTRADICTION_MISSING_LINEAGE), 'B.37 contradiction missing lineage');
assert(validateL10HypothesisConfirmationSet(buildValidConfirmationSet({ lineage_refs: [] }))
  .issues.some(i => i.code === L10ObjectViolationCode.CONFIRMATION_MISSING_LINEAGE), 'B.38 confirmation missing lineage');
assert(validateL10HypothesisInvalidationSet(buildValidInvalidationSet({ lineage_refs: [] }))
  .issues.some(i => i.code === L10ObjectViolationCode.INVALIDATION_MISSING_LINEAGE), 'B.39 invalidation missing lineage');

// Assessment valid
assert(validateL10HypothesisAssessment(buildValidAssessment()).valid, 'B.40 valid assessment passes');

// Assessment missing subject
assert(!validateL10HypothesisAssessment(buildValidAssessment({ hypothesis_subject_id: '' })).valid,
  'B.41 assessment missing subject fails');
// Assessment missing support-set ref (first-class object dropping)
const nSup = validateL10HypothesisAssessment(buildValidAssessment({ support_set_ref: '' }));
assert(nSup.issues.some(i => i.code === L10ObjectViolationCode.ASSESSMENT_MISSING_SUPPORT_OBJECT),
  'B.42 assessment missing support object');
const nCon = validateL10HypothesisAssessment(buildValidAssessment({ contradiction_set_ref: '' }));
assert(nCon.issues.some(i => i.code === L10ObjectViolationCode.ASSESSMENT_MISSING_CONTRADICTION_OBJECT),
  'B.43 assessment missing contradiction object');
const nCnf = validateL10HypothesisAssessment(buildValidAssessment({ confirmation_set_ref: '' }));
assert(nCnf.issues.some(i => i.code === L10ObjectViolationCode.ASSESSMENT_MISSING_CONFIRMATION_OBJECT),
  'B.44 assessment missing confirmation object');
const nInv = validateL10HypothesisAssessment(buildValidAssessment({ invalidation_set_ref: '' }));
assert(nInv.issues.some(i => i.code === L10ObjectViolationCode.ASSESSMENT_MISSING_INVALIDATION_OBJECT),
  'B.45 assessment missing invalidation object');

// Assessment missing ranking posture
assert(validateL10HypothesisAssessment(buildValidAssessment({ rank_position: -1 }))
  .issues.some(i => i.code === L10ObjectViolationCode.ASSESSMENT_MISSING_RANK_POSITION),
  'B.46 missing rank position');
assert(validateL10HypothesisAssessment(buildValidAssessment({
  rank_spread_to_next: null as unknown as number,
})).issues.some(i => i.code === L10ObjectViolationCode.ASSESSMENT_MISSING_RANK_SPREAD),
  'B.47 missing rank spread');

// Assessment missing restriction / replay / lineage / policy
assert(validateL10HypothesisAssessment(buildValidAssessment({ restriction_profile_ref: '' }))
  .issues.some(i => i.code === L10ObjectViolationCode.ASSESSMENT_MISSING_RESTRICTION_PROFILE),
  'B.48 missing restriction profile');
assert(validateL10HypothesisAssessment(buildValidAssessment({ replay_hash: '' }))
  .issues.some(i => i.code === L10ObjectViolationCode.ASSESSMENT_MISSING_REPLAY_HASH),
  'B.49 missing replay hash');
assert(validateL10HypothesisAssessment(buildValidAssessment({ lineage_refs: [] }))
  .issues.some(i => i.code === L10ObjectViolationCode.ASSESSMENT_MISSING_LINEAGE),
  'B.50 missing lineage');

// Band consistency (score 0.2 with band HIGH)
assert(validateL10HypothesisAssessment(buildValidAssessment({
  hypothesis_confidence_score: 0.2,
  hypothesis_confidence_band: L10HypothesisConfidenceBand.HIGH,
})).issues.some(i => i.code === L10ObjectViolationCode.ASSESSMENT_CONFIDENCE_BAND_INCONSISTENT),
  'B.51 confidence band inconsistent');

// Causal restraint missing
assert(validateL10HypothesisAssessment(buildValidAssessment({
  causal_restraint_flags: undefined as unknown as never,
})).issues.some(i => i.code === L10ObjectViolationCode.ASSESSMENT_MISSING_CAUSAL_RESTRAINT),
  'B.52 missing causal restraint');

// Canonical hash stable for same input
const hashA = canonicalizeL10HypothesisAssessmentForHash(buildValidAssessment());
const hashB = canonicalizeL10HypothesisAssessmentForHash(buildValidAssessment());
assert(hashA === hashB, 'B.53 canonical hash deterministic');

// Registry duplicate output class rejected earlier; here verify get()
assert(outReg.get(L10HypothesisOutputClass.HYPOTHESIS_SPREAD_PROFILE)?.requiresRankingRef === true,
  'B.54 spread profile descriptor consistent');

// Subject class registry lookup
assert(subjReg.get(L10HypothesisSubjectClass.PROTOCOL_EXPLANATION)?.legalScopeTypes.includes('PROTOCOL') === true,
  'B.55 protocol subject class lookup');

// ═══════════════════════════════════════════════════════════════
// BAND C — Competition object law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Competition object law ═══');
resetAll();

// Valid ranking passes
assert(validateL10HypothesisRanking({
  ranking: buildValidRanking(), availablePlausibleCompetitors: 2,
}).valid, 'C.01 valid ranking passes');

// Primary not first
const primaryNotFirst = validateL10HypothesisRanking({
  ranking: buildValidRanking({
    ordered_hypothesis_assessment_refs: ['hassess_b', 'hassess_a'],
  }),
  availablePlausibleCompetitors: 2,
});
assert(!primaryNotFirst.valid, 'C.02 primary not first rejected');
assert(primaryNotFirst.issues.some(i => i.code === L10ObjectViolationCode.RANKING_PRIMARY_NOT_FIRST),
  'C.03 primary-not-first code');

// Secondary missing when competition size > 1
const secMissing = validateL10HypothesisRanking({
  ranking: buildValidRanking({ secondary_hypothesis_ref: null, competition_size: 2 }),
  availablePlausibleCompetitors: 2,
});
assert(secMissing.issues.some(i => i.code === L10ObjectViolationCode.RANKING_MISSING_SECONDARY_WHEN_COMPETITION),
  'C.04 secondary required when competing');

// Missing spread profile ref
const missingSpread = validateL10HypothesisRanking({
  ranking: buildValidRanking({ spread_profile_ref: '' }),
  availablePlausibleCompetitors: 2,
});
assert(missingSpread.issues.some(i => i.code === L10ObjectViolationCode.RANKING_MISSING_SPREAD_PROFILE),
  'C.05 ranking needs spread');

// Single-story collapse rejected
const collapse = validateL10HypothesisRanking({
  ranking: buildValidRanking({
    ordered_hypothesis_assessment_refs: ['hassess_a'],
    secondary_hypothesis_ref: null,
    competition_size: 1,
  }),
  availablePlausibleCompetitors: 3,
});
assert(!collapse.valid, 'C.06 single-story collapse rejected');
assert(collapse.issues.some(i => i.code === L10ObjectViolationCode.RANKING_SINGLE_STORY_COLLAPSE),
  'C.07 collapse code');

// Missing ordered refs
assert(validateL10HypothesisRanking({
  ranking: buildValidRanking({
    ordered_hypothesis_assessment_refs: [], primary_hypothesis_ref: '',
  }),
  availablePlausibleCompetitors: 1,
}).issues.some(i => i.code === L10ObjectViolationCode.RANKING_MISSING_ORDERED_REFS),
  'C.08 missing ordered refs');

// Valid spread passes
assert(validateL10HypothesisSpreadProfile({
  spread: buildValidSpread(), competitionSize: 2,
}).valid, 'C.09 valid spread passes');

// Spread narrow flag hidden
const narrow = validateL10HypothesisSpreadProfile({
  spread: buildValidSpread({
    confidence_spread: 0.1,
    spread_class: L10SpreadClass.NARROW,
    narrow_spread_flag: false,
  }),
  competitionSize: 2,
});
assert(!narrow.valid, 'C.10 narrow hidden rejected');
assert(narrow.issues.some(i => i.code === L10ObjectViolationCode.SPREAD_NARROW_FLAG_HIDDEN),
  'C.11 narrow-flag-hidden code');

// Spread class inconsistent
const classMismatch = validateL10HypothesisSpreadProfile({
  spread: buildValidSpread({
    confidence_spread: 0.4, spread_class: L10SpreadClass.NARROW, narrow_spread_flag: true,
  }),
  competitionSize: 2,
});
assert(classMismatch.issues.some(i => i.code === L10ObjectViolationCode.SPREAD_CLASS_INCONSISTENT),
  'C.12 spread class inconsistent');

// Spread missing secondary when competing
const spreadNoSec = validateL10HypothesisSpreadProfile({
  spread: buildValidSpread({ secondary_hypothesis_ref: null }),
  competitionSize: 2,
});
assert(spreadNoSec.issues.some(i => i.code === L10ObjectViolationCode.SPREAD_MISSING_SECONDARY_WHEN_COMPETITION),
  'C.13 spread secondary required');

// Spread magnitude OOR
const magOor = validateL10HypothesisSpreadProfile({
  spread: buildValidSpread({ confidence_spread: 1.5 }),
  competitionSize: 2,
});
assert(magOor.issues.some(i => i.code === L10ObjectViolationCode.SPREAD_MAGNITUDE_OUT_OF_RANGE),
  'C.14 spread magnitude OOR');

// Shift-condition valid
assert(validateL10HypothesisShiftConditionSet({
  shift: buildValidShift(), competitionSize: 2,
}).valid, 'C.15 valid shift-condition set passes');

// Shift missing reinforcement
assert(validateL10HypothesisShiftConditionSet({
  shift: buildValidShift({ reinforcement_conditions_for_primary: [] }),
  competitionSize: 2,
}).issues.some(i => i.code === L10ObjectViolationCode.SHIFT_MISSING_REINFORCEMENT_CONDITIONS),
  'C.16 shift missing reinforcement');

// Shift missing promotion when competing
assert(validateL10HypothesisShiftConditionSet({
  shift: buildValidShift({ promotion_conditions_for_secondary: [] }),
  competitionSize: 2,
}).issues.some(i => i.code === L10ObjectViolationCode.SHIFT_MISSING_PROMOTION_CONDITIONS),
  'C.17 shift missing promotion');

// Shift missing collapse
assert(validateL10HypothesisShiftConditionSet({
  shift: buildValidShift({ collapse_conditions_for_primary: [] }),
  competitionSize: 2,
}).issues.some(i => i.code === L10ObjectViolationCode.SHIFT_MISSING_COLLAPSE_CONDITIONS),
  'C.18 shift missing collapse');

// Shift missing primary
assert(validateL10HypothesisShiftConditionSet({
  shift: buildValidShift({ current_primary_ref: '' }),
  competitionSize: 2,
}).issues.some(i => i.code === L10ObjectViolationCode.SHIFT_MISSING_PRIMARY),
  'C.19 shift missing primary');

// Shift missing secondary when competing
assert(validateL10HypothesisShiftConditionSet({
  shift: buildValidShift({ current_secondary_ref: null }),
  competitionSize: 2,
}).issues.some(i => i.code === L10ObjectViolationCode.SHIFT_MISSING_SECONDARY_WHEN_COMPETITION),
  'C.20 shift missing secondary');

// Restriction valid
assert(validateL10HypothesisRestrictionProfile({
  profile: buildValidRestriction(), rankingCompetitionClose: false,
}).valid, 'C.21 valid restriction profile passes');

// Missing mandatory blocked uses
const dropped = validateL10HypothesisRestrictionProfile({
  profile: buildValidRestriction({
    blocked_uses: [L10BlockedUse.MAY_NOT_BE_USED_AS_JUDGMENT],
  }),
  rankingCompetitionClose: false,
});
assert(dropped.issues.some(i => i.code === L10ObjectViolationCode.RESTRICTION_MISSING_MANDATORY_BLOCKED_USES),
  'C.22 mandatory blocked uses missing rejected');

// Narrowing required for close competition
const closeCompNoReason = validateL10HypothesisRestrictionProfile({
  profile: buildValidRestriction({ narrowing_reasons: [] }),
  rankingCompetitionClose: true,
});
assert(closeCompNoReason.issues.some(i => i.code === L10ObjectViolationCode.RESTRICTION_MISSING_NARROWING_REASONS),
  'C.23 narrowing reasons required');

// Missing allowed uses
assert(validateL10HypothesisRestrictionProfile({
  profile: buildValidRestriction({ allowed_downstream_uses: [] }),
  rankingCompetitionClose: false,
}).issues.some(i => i.code === L10ObjectViolationCode.RESTRICTION_MISSING_ALLOWED_USES),
  'C.24 allowed uses required');

// Competition size helper
assert(buildValidRanking().competition_size === 2, 'C.25 competition size on ranking');

// ═══════════════════════════════════════════════════════════════
// BAND D — Semantic integrity
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Semantic integrity ═══');
resetAll();

assert(checkL10ObjectLeak('This is the final judgment').leaks === true, 'D.01 judgment leak');
assert(checkL10ObjectLeak('We recommend buying now').leaks === true, 'D.02 recommendation leak');
assert(checkL10ObjectLeak('scenario confirmed and set').leaks === true, 'D.03 scenario-finality leak');
assert(checkL10ObjectLeak('This is definitive and proven').leaks === true, 'D.04 fake-certainty leak');
assert(checkL10ObjectLeak('token pumped because of narrative').leaks === true, 'D.05 causal-proof leak');

assert(checkL10ObjectLeak('Post-unlock redistribution candidate').leaks === false,
  'D.06 clean name passes');
assert(checkL10ObjectLeak('Genuine early accumulation candidate').leaks === false,
  'D.07 accumulation candidate clean');

assert(L10_OBJECT_LEAK_PATTERNS.length >= 5, 'D.08 leak patterns registered');

// Candidate with recommendation in name
const recCandidate = validateL10HypothesisCandidate(buildValidCandidate({
  hypothesis_name: 'RecommendationBuyCandidate',
}));
assert(recCandidate.issues.some(i => i.code === L10ObjectViolationCode.CANDIDATE_NAME_LEAKS_SEMANTICS),
  'D.09 candidate recommendation name rejected');

// Assessment with recommendation leak
const recAssess = validateL10HypothesisAssessment(buildValidAssessment({
  hypothesis_name: 'BuyAssessment',
}));
assert(recAssess.issues.some(i => i.code === L10ObjectViolationCode.ASSESSMENT_NAME_LEAKS_SEMANTICS),
  'D.10 assessment recommendation name rejected');

// Assessment with fake certainty
const fc = validateL10HypothesisAssessment(buildValidAssessment({
  hypothesis_name: 'GuaranteedOutcomeAssessment',
}));
assert(fc.issues.some(i => i.code === L10ObjectViolationCode.ASSESSMENT_NAME_LEAKS_SEMANTICS),
  'D.11 fake certainty assessment rejected');

// Support/contradiction/confirmation/invalidation remain separate objects
// (checked via the enum code partitioning)
const codeFams = {
  support: ALL_L10_OBJECT_VIOLATION_CODES.filter(c => c.startsWith('L10O_SUPPORT_')).length,
  contradiction: ALL_L10_OBJECT_VIOLATION_CODES.filter(c => c.startsWith('L10O_CONTRADICTION_')).length,
  confirmation: ALL_L10_OBJECT_VIOLATION_CODES.filter(c => c.startsWith('L10O_CONFIRMATION_')).length,
  invalidation: ALL_L10_OBJECT_VIOLATION_CODES.filter(c => c.startsWith('L10O_INVALIDATION_')).length,
};
assert(codeFams.support >= 4, 'D.12 support codes isolated');
assert(codeFams.contradiction >= 4, 'D.13 contradiction codes isolated');
assert(codeFams.confirmation >= 4, 'D.14 confirmation codes isolated');
assert(codeFams.invalidation >= 4, 'D.15 invalidation codes isolated');

// No object output surface collapses to another
const outSet = new Set(L10_HYPOTHESIS_OUTPUT_CLASS_DESCRIPTORS.map(d => d.outputClass));
assert(outSet.size === L10_HYPOTHESIS_OUTPUT_CLASS_DESCRIPTORS.length,
  'D.16 output classes distinct');

// Assessment with description leaking causal proof
const desclk = validateL10HypothesisCandidate(buildValidCandidate({
  description: 'token moved because of unlock proof',
}));
assert(desclk.issues.some(i => i.code === L10ObjectViolationCode.CANDIDATE_NAME_LEAKS_SEMANTICS),
  'D.17 candidate description causal-proof leak');

// Restriction with unregistered right
const badRight = validateL10HypothesisRestrictionProfile({
  profile: buildValidRestriction({
    allowed_downstream_uses: ['NOT_A_RIGHT' as unknown as L10RestrictionRight],
  }),
  rankingCompetitionClose: false,
});
assert(badRight.issues.some(i => i.code === L10ObjectViolationCode.RESTRICTION_UNREGISTERED_RIGHT),
  'D.18 unregistered restriction right rejected');

// Restriction with unregistered blocked use
const badBlocked = validateL10HypothesisRestrictionProfile({
  profile: buildValidRestriction({
    blocked_uses: [...L10_MANDATORY_BLOCKED_USES, 'X' as unknown as L10BlockedUse],
  }),
  rankingCompetitionClose: false,
});
assert(badBlocked.issues.some(i => i.code === L10ObjectViolationCode.RESTRICTION_UNREGISTERED_BLOCKED_USE),
  'D.19 unregistered blocked use rejected');

// Restriction band unregistered
const badBand = validateL10HypothesisRestrictionProfile({
  profile: buildValidRestriction({
    reliance_band: 'UNKNOWN_BAND' as unknown as L10RelianceBand,
  }),
  rankingCompetitionClose: false,
});
assert(badBand.issues.some(i => i.code === L10ObjectViolationCode.RESTRICTION_BAND_UNREGISTERED),
  'D.20 unregistered band rejected');

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit and invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit and invariants ═══');
resetAll();

// Audit determinism
const badSub = buildValidSubject({ hypothesis_family_set: [] });
const report1 = validateL10HypothesisSubject(badSub);
emitL10ObjectAudit('HypothesisSubject', badSub.hypothesis_subject_id, report1);
assert(getL10ObjectAuditLog().length === report1.issues.length, 'E.01 audit log records issues');

// Severity mapping
assert(severityFor(L10ObjectViolationCode.OUTPUT_JUDGMENT_LEAK) === L10ObjectAuditSeverity.CRITICAL,
  'E.02 judgment leak = CRITICAL');
assert(severityFor(L10ObjectViolationCode.SUBJECT_MISSING_ID) === L10ObjectAuditSeverity.HIGH,
  'E.03 missing = HIGH');
assert(severityFor(L10ObjectViolationCode.SUPPORT_STRENGTH_OUT_OF_RANGE) === L10ObjectAuditSeverity.WARNING,
  'E.04 OOR = WARNING');
assert(severityFor(L10ObjectViolationCode.RANKING_SINGLE_STORY_COLLAPSE) === L10ObjectAuditSeverity.CRITICAL,
  'E.05 single-story collapse = CRITICAL');
assert(severityFor(L10ObjectViolationCode.CANDIDATE_NAME_LEAKS_SEMANTICS) === L10ObjectAuditSeverity.CRITICAL,
  'E.06 name leak = CRITICAL');

// Filter by severity
clearL10ObjectAuditLog();
emitL10ObjectAudit('HypothesisCandidate', 'hcan_bad', validateL10HypothesisCandidate(buildValidCandidate({
  hypothesis_name: 'FinalJudgmentCandidate',
})));
assert(filterL10ObjectAuditBySeverity(L10ObjectAuditSeverity.CRITICAL).length >= 1,
  'E.07 critical filter works');

// Filter by code
clearL10ObjectAuditLog();
emitL10ObjectAudit('HypothesisRanking', 'hrank_collapse', validateL10HypothesisRanking({
  ranking: buildValidRanking({
    ordered_hypothesis_assessment_refs: ['hassess_a'],
    secondary_hypothesis_ref: null, competition_size: 1,
  }),
  availablePlausibleCompetitors: 3,
}));
assert(filterL10ObjectAuditByCode(L10ObjectViolationCode.RANKING_SINGLE_STORY_COLLAPSE).length === 1,
  'E.08 code filter works');

// Clean subject produces no audit records
clearL10ObjectAuditLog();
emitL10ObjectAudit('HypothesisSubject', 'hsub_clean', validateL10HypothesisSubject(buildValidSubject()));
assert(getL10ObjectAuditLog().length === 0, 'E.09 clean subject no audits');

// All invariants
clearL10ObjectAuditLog();
const inv = checkAllL102Invariants();
assert(inv.length === 7, 'E.10 7 L10.2 invariants');
assert(inv.every(r => r.holds),
  `E.11 all invariants hold: ${inv.filter(r => !r.holds).map(r => `${r.id}=${r.evidence}`).join('; ')}`);

assert(checkINV_102_A().holds, `E.A ${checkINV_102_A().evidence}`);
assert(checkINV_102_B().holds, `E.B ${checkINV_102_B().evidence}`);
assert(checkINV_102_C().holds, `E.C ${checkINV_102_C().evidence}`);
assert(checkINV_102_D().holds, `E.D ${checkINV_102_D().evidence}`);
assert(checkINV_102_E().holds, `E.E ${checkINV_102_E().evidence}`);
assert(checkINV_102_F().holds, `E.F ${checkINV_102_F().evidence}`);
assert(checkINV_102_G().holds, `E.G ${checkINV_102_G().evidence}`);

// Crafted offenders fail precisely
const offender = validateL10HypothesisAssessment(buildValidAssessment({
  hypothesis_name: 'BuyRecommendationVerdict',
  support_set_ref: '', contradiction_set_ref: '', confirmation_set_ref: '', invalidation_set_ref: '',
  replay_hash: '', lineage_refs: [], restriction_profile_ref: '',
}));
assert(!offender.valid, 'E.19 crafted offender fails');
const codes = offender.issues.map(i => i.code);
assert(codes.includes(L10ObjectViolationCode.ASSESSMENT_NAME_LEAKS_SEMANTICS), 'E.20 offender carries leak');
assert(codes.includes(L10ObjectViolationCode.ASSESSMENT_MISSING_SUPPORT_OBJECT), 'E.21 offender missing support');
assert(codes.includes(L10ObjectViolationCode.ASSESSMENT_MISSING_CONTRADICTION_OBJECT), 'E.22 offender missing contradiction');
assert(codes.includes(L10ObjectViolationCode.ASSESSMENT_MISSING_CONFIRMATION_OBJECT), 'E.23 offender missing confirmation');
assert(codes.includes(L10ObjectViolationCode.ASSESSMENT_MISSING_INVALIDATION_OBJECT), 'E.24 offender missing invalidation');
assert(codes.includes(L10ObjectViolationCode.ASSESSMENT_MISSING_REPLAY_HASH), 'E.25 offender missing replay');
assert(codes.includes(L10ObjectViolationCode.ASSESSMENT_MISSING_LINEAGE), 'E.26 offender missing lineage');
assert(codes.includes(L10ObjectViolationCode.ASSESSMENT_MISSING_RESTRICTION_PROFILE), 'E.27 offender missing restriction');

// Crafted offender — narrow spread hidden
const narrowOffender = validateL10HypothesisSpreadProfile({
  spread: buildValidSpread({
    confidence_spread: 0.02, spread_class: L10SpreadClass.TIED, narrow_spread_flag: false,
  }),
  competitionSize: 2,
});
assert(!narrowOffender.valid, 'E.28 narrow offender fails');
assert(narrowOffender.issues.some(i => i.code === L10ObjectViolationCode.SPREAD_NARROW_FLAG_HIDDEN),
  'E.29 narrow offender carries SPREAD_NARROW_FLAG_HIDDEN');

// Mandatory blocked uses offender
const restOffender = validateL10HypothesisRestrictionProfile({
  profile: buildValidRestriction({ blocked_uses: [] }),
  rankingCompetitionClose: false,
});
assert(restOffender.issues.some(i => i.code === L10ObjectViolationCode.RESTRICTION_MISSING_BLOCKED_USES),
  'E.30 restriction blocked uses empty');
assert(restOffender.issues.some(i => i.code === L10ObjectViolationCode.RESTRICTION_MISSING_MANDATORY_BLOCKED_USES),
  'E.31 restriction missing mandatory uses');

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`L10.2 certification: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════════════════════════');
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
