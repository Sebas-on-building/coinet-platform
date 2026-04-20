/**
 * L9.2 — Sequence Doctrine, Temporal Object Model, and Sequence Families
 * Certification Test Suite
 *
 * 5 Bands (§9.2.10.2):
 *   A — Object registration and legality (families / states / output classes)
 *   B — Object completeness (subject, chain, assessment, sub-objects, replay)
 *   C — Coexistence and ambiguity law
 *   D — Semantic integrity (no judgment / scenario / recommendation leakage)
 *   E — Audit + INV-9.2-A..G invariants
 */

import {
  // Family
  L9SequenceFamily, ALL_L9_SEQUENCE_FAMILIES, L9_SEQUENCE_FAMILY_DESCRIPTORS,
  ALL_L9_SEQUENCE_SCOPE_TYPES,
  getL9SequenceFamilyDescriptor, isL9RegisteredSequenceFamily,
  l9FamilyAllowsScope, l9FamiliesMayCoexist,
  l9FamilyRequiresPostEventAnchor, l9FamilyRequiresRegimeConditioning,
  // State
  L9SequenceState, ALL_L9_SEQUENCE_STATES, L9_SEQUENCE_STATE_DESCRIPTORS,
  getL9SequenceStateDescriptor, isL9RegisteredSequenceState,
  getL9SequenceStatesForFamily, l9StateBelongsToFamily, l9StateAllowsScope,
  l9StateRequiresPostEventAnchor, l9StateAllowsCleanSingle,
  getL9SequenceDominance,
  // Subject
  L9SequenceSubject, buildL9SequenceSubjectId, buildL9SequenceReplayHash,
  // Event link
  L9OrderingRelation, ALL_L9_ORDERING_RELATIONS,
  L9RelationQualityClass, ALL_L9_RELATION_QUALITY_CLASSES,
  // Lead-lag
  L9LagClass, ALL_L9_LAG_CLASSES,
  L9LagSupportStrength, ALL_L9_LAG_SUPPORT_STRENGTHS,
  L9LagContradictionPosture, ALL_L9_LAG_CONTRADICTION_POSTURES,
  // Chain
  L9ChainIntegrityFlag, ALL_L9_CHAIN_INTEGRITY_FLAGS,
  L9CausalConfidenceClass, ALL_L9_CAUSAL_CONFIDENCE_CLASSES,
  // Phase
  L9PhaseClass, ALL_L9_PHASE_CLASSES,
  L9PhaseProgressionClass, ALL_L9_PHASE_PROGRESSION_CLASSES,
  // Change point
  L9ChangePointClass, ALL_L9_CHANGE_POINT_CLASSES,
  L9ChangePointSeverity, ALL_L9_CHANGE_POINT_SEVERITIES,
  // Decay
  L9DecayClass, ALL_L9_DECAY_CLASSES,
  L9DecayReasonCode, ALL_L9_DECAY_REASON_CODES,
  // Post-event window
  L9PostEventWindowClass, ALL_L9_POST_EVENT_WINDOW_CLASSES,
  L9PostEventWindowState, ALL_L9_POST_EVENT_WINDOW_STATES,
  // Coexistence
  L9SequenceCoexistenceClass, ALL_L9_SEQUENCE_COEXISTENCE_CLASSES,
  L9_SEQUENCE_COEXISTENCE_RULES, getL9CoexistenceRule, decideL9Coexistence,
  l9IsIllegalIntraFamilyPair,
  // Assessment
  L9SequenceAssessment, buildL9SequenceAssessmentId,
  canonicalizeL9SequenceAssessmentForHash,
  L9SequenceConfidenceBand, ALL_L9_SEQUENCE_CONFIDENCE_BANDS,
  // Restriction profile
  L9SequenceRelianceBand, ALL_L9_SEQUENCE_RELIANCE_BANDS,
  L9AllowedDownstreamUse, ALL_L9_ALLOWED_DOWNSTREAM_USES,
  L9SequenceNarrowingReason, ALL_L9_SEQUENCE_NARROWING_REASONS,
  // Output class / object violation codes
  L9SequenceOutputClass, ALL_L9_SEQUENCE_OUTPUT_CLASSES,
  L9_SEQUENCE_OUTPUT_CLASS_DESCRIPTORS,
  L9SequenceObjectViolationCode, ALL_L9_SEQUENCE_OBJECT_VIOLATION_CODES,
  getL9SequenceOutputClassDescriptor, isL9RegisteredSequenceOutputClass,
} from '../l9/contracts';

import {
  L9SequenceFamilyRegistry, getDefaultL9SequenceFamilyRegistry,
  L9SequenceStateRegistry, getDefaultL9SequenceStateRegistry,
  L9SequenceCoexistenceRegistry, getDefaultL9SequenceCoexistenceRegistry,
  L9SequenceOutputClassRegistry, getDefaultL9SequenceOutputClassRegistry,
} from '../l9/registry';

import {
  validateL9SequenceFamily,
  validateL9IntraFamilyCoexistence,
  validateL9CrossFamilyCoexistence,
  validateL9SequenceAssessment,
  validateL9SequenceOutput,
  l9BandForConfidenceScore, l9DecayClassForScore,
} from '../l9/validation';

import {
  resetL9ObjectAuditLog, emitL9ObjectAuditRecord,
  getL9ObjectAuditLog, getL9ObjectCriticalViolations,
  getL9ObjectViolationsByCode, hasAnyL9ObjectViolations,
  getL9ObjectViolationCount,
  emitL9SubjectViolation, emitL9FamilyViolation, emitL9StateViolation,
  emitL9CoexistenceViolation, emitL9AssessmentViolation,
  emitL9OutputObjectViolation,
} from '../l9/constitution';

import {
  checkAllL92Invariants,
  checkINV_92_A, checkINV_92_B, checkINV_92_C, checkINV_92_D,
  checkINV_92_E, checkINV_92_F, checkINV_92_G,
} from '../l9/invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}

function resetAll(): void {
  resetL9ObjectAuditLog();
}

// ═══════════════════════════════════════════════════════════════
// BAND A — Object Registration and Legality
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Object Registration and Legality ═══');
resetAll();

// Families
assert(ALL_L9_SEQUENCE_FAMILIES.length === 6, 'A.01 six canonical sequence families');
assert(ALL_L9_SEQUENCE_FAMILIES.includes(L9SequenceFamily.ACCUMULATION_TO_EXPANSION),
  'A.02 ACCUMULATION_TO_EXPANSION present');
assert(ALL_L9_SEQUENCE_FAMILIES.includes(L9SequenceFamily.NARRATIVE_LED),
  'A.03 NARRATIVE_LED present');
assert(ALL_L9_SEQUENCE_FAMILIES.includes(L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY),
  'A.04 LEVERAGE_AND_REFLEXIVITY present');
assert(ALL_L9_SEQUENCE_FAMILIES.includes(L9SequenceFamily.OVERHANG_AND_DIGESTION),
  'A.05 OVERHANG_AND_DIGESTION present');
assert(ALL_L9_SEQUENCE_FAMILIES.includes(L9SequenceFamily.ECOSYSTEM_ROTATION),
  'A.06 ECOSYSTEM_ROTATION present');
assert(ALL_L9_SEQUENCE_FAMILIES.includes(L9SequenceFamily.SHOCK_AND_RECOVERY),
  'A.07 SHOCK_AND_RECOVERY present');
assert(L9_SEQUENCE_FAMILY_DESCRIPTORS.length === ALL_L9_SEQUENCE_FAMILIES.length,
  'A.08 descriptors cover all families');
assert(isL9RegisteredSequenceFamily('ACCUMULATION_TO_EXPANSION'),
  'A.09 isL9RegisteredSequenceFamily true');
assert(!isL9RegisteredSequenceFamily('FAKE_FAMILY'), 'A.10 fake family rejected');
assert(getL9SequenceFamilyDescriptor(L9SequenceFamily.OVERHANG_AND_DIGESTION)?.requiresPostEventAnchor === true,
  'A.11 OVERHANG_AND_DIGESTION requires post-event anchor');
assert(l9FamilyRequiresPostEventAnchor(L9SequenceFamily.SHOCK_AND_RECOVERY),
  'A.12 SHOCK_AND_RECOVERY requires post-event anchor');
assert(!l9FamilyRequiresPostEventAnchor(L9SequenceFamily.ACCUMULATION_TO_EXPANSION),
  'A.13 ACCUMULATION_TO_EXPANSION does not require anchor');
assert(l9FamilyRequiresRegimeConditioning(L9SequenceFamily.NARRATIVE_LED),
  'A.14 NARRATIVE_LED requires regime conditioning');
assert(l9FamilyAllowsScope(L9SequenceFamily.ECOSYSTEM_ROTATION, 'CHAIN'),
  'A.15 ECOSYSTEM_ROTATION allows CHAIN');
assert(!l9FamilyAllowsScope(L9SequenceFamily.OVERHANG_AND_DIGESTION, 'MARKET'),
  'A.16 OVERHANG_AND_DIGESTION forbids MARKET scope');
assert(l9FamiliesMayCoexist(L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY),
  'A.17 accumulation + leverage coexist');
assert(l9FamiliesMayCoexist(L9SequenceFamily.OVERHANG_AND_DIGESTION,
  L9SequenceFamily.SHOCK_AND_RECOVERY),
  'A.18 overhang + shock coexist');
assert(ALL_L9_SEQUENCE_SCOPE_TYPES.includes('TOKEN'), 'A.19 TOKEN scope registered');
assert(ALL_L9_SEQUENCE_SCOPE_TYPES.includes('NARRATIVE_CLUSTER'), 'A.20 NARRATIVE_CLUSTER scope');

// States
assert(ALL_L9_SEQUENCE_STATES.length >= 14, 'A.21 ≥14 canonical states');
assert(ALL_L9_SEQUENCE_STATES.includes(L9SequenceState.PRE_NARRATIVE_ACCUMULATION),
  'A.22 PRE_NARRATIVE_ACCUMULATION present');
assert(ALL_L9_SEQUENCE_STATES.includes(L9SequenceState.VALIDATED_EXPANSION),
  'A.23 VALIDATED_EXPANSION present');
assert(ALL_L9_SEQUENCE_STATES.includes(L9SequenceState.LEVERAGE_CROWDING_PHASE),
  'A.24 LEVERAGE_CROWDING_PHASE present');
assert(ALL_L9_SEQUENCE_STATES.includes(L9SequenceState.POST_SHOCK_DIGESTION),
  'A.25 POST_SHOCK_DIGESTION present');
assert(ALL_L9_SEQUENCE_STATES.includes(L9SequenceState.DISTRIBUTION_UNDER_HYPE),
  'A.26 DISTRIBUTION_UNDER_HYPE present');
assert(ALL_L9_SEQUENCE_STATES.includes(L9SequenceState.REACCUMULATION_ATTEMPT),
  'A.27 REACCUMULATION_ATTEMPT present');
assert(ALL_L9_SEQUENCE_STATES.includes(L9SequenceState.CROWDING_WITHOUT_CONFIRMATION),
  'A.28 CROWDING_WITHOUT_CONFIRMATION present');
assert(ALL_L9_SEQUENCE_STATES.includes(L9SequenceState.ROTATION_VALIDATED),
  'A.29 ROTATION_VALIDATED present');
assert(isL9RegisteredSequenceState('VALIDATED_EXPANSION'),
  'A.30 isL9RegisteredSequenceState VALIDATED_EXPANSION');
assert(!isL9RegisteredSequenceState('FAKE_STATE'), 'A.31 fake state rejected');

// Every registered state maps to a registered family, and every family has ≥1 state
for (const d of L9_SEQUENCE_STATE_DESCRIPTORS) {
  assert(isL9RegisteredSequenceFamily(d.family),
    `A.32 state ${d.state} maps to registered family`);
}
for (const f of ALL_L9_SEQUENCE_FAMILIES) {
  assert(getL9SequenceStatesForFamily(f).length >= 1,
    `A.33 family ${f} has ≥1 state`);
}
assert(l9StateBelongsToFamily(L9SequenceState.VALIDATED_EXPANSION,
  L9SequenceFamily.ACCUMULATION_TO_EXPANSION),
  'A.34 VALIDATED_EXPANSION ∈ ACCUMULATION_TO_EXPANSION');
assert(!l9StateBelongsToFamily(L9SequenceState.VALIDATED_EXPANSION,
  L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY),
  'A.35 VALIDATED_EXPANSION ∉ LEVERAGE_AND_REFLEXIVITY');
assert(l9StateAllowsScope(L9SequenceState.POST_SHOCK_DIGESTION, 'TOKEN'),
  'A.36 POST_SHOCK_DIGESTION allows TOKEN');
assert(l9StateRequiresPostEventAnchor(L9SequenceState.POST_SHOCK_DIGESTION),
  'A.37 POST_SHOCK_DIGESTION requires anchor');
assert(!l9StateAllowsCleanSingle(L9SequenceState.LATE_STAGE_REFLEXIVITY),
  'A.38 LATE_STAGE_REFLEXIVITY forbids CLEAN_SINGLE');
assert(l9StateAllowsCleanSingle(L9SequenceState.VALIDATED_EXPANSION),
  'A.39 VALIDATED_EXPANSION allows CLEAN_SINGLE');
assert(getL9SequenceDominance(L9SequenceState.PRE_NARRATIVE_ACCUMULATION) === 'EARLY',
  'A.40 PRE_NARRATIVE_ACCUMULATION dominance EARLY');
assert(getL9SequenceDominance(L9SequenceState.POST_SHOCK_DIGESTION) === 'POST_EVENT',
  'A.41 POST_SHOCK_DIGESTION dominance POST_EVENT');

// Output classes
assert(ALL_L9_SEQUENCE_OUTPUT_CLASSES.length === 7, 'A.42 seven L9 output classes');
assert(ALL_L9_SEQUENCE_OUTPUT_CLASSES.includes(L9SequenceOutputClass.SEQUENCE_ASSESSMENT),
  'A.43 SEQUENCE_ASSESSMENT registered');
assert(ALL_L9_SEQUENCE_OUTPUT_CLASSES.includes(L9SequenceOutputClass.SEQUENCE_CHAIN),
  'A.44 SEQUENCE_CHAIN registered');
assert(ALL_L9_SEQUENCE_OUTPUT_CLASSES.includes(L9SequenceOutputClass.LEAD_LAG_PROFILE),
  'A.45 LEAD_LAG_PROFILE registered');
assert(ALL_L9_SEQUENCE_OUTPUT_CLASSES.includes(L9SequenceOutputClass.PHASE_STATE),
  'A.46 PHASE_STATE registered');
assert(ALL_L9_SEQUENCE_OUTPUT_CLASSES.includes(L9SequenceOutputClass.DECAY_PROFILE),
  'A.47 DECAY_PROFILE registered');
assert(ALL_L9_SEQUENCE_OUTPUT_CLASSES.includes(L9SequenceOutputClass.SEQUENCE_RESTRICTION_PROFILE),
  'A.48 SEQUENCE_RESTRICTION_PROFILE registered');
assert(ALL_L9_SEQUENCE_OUTPUT_CLASSES.includes(L9SequenceOutputClass.SEQUENCE_EVIDENCE_READ_SURFACE),
  'A.49 SEQUENCE_EVIDENCE_READ_SURFACE registered');
assert(isL9RegisteredSequenceOutputClass('SEQUENCE_ASSESSMENT'),
  'A.50 isL9RegisteredSequenceOutputClass true');
assert(!isL9RegisteredSequenceOutputClass('JUDGMENT'),
  'A.51 JUDGMENT is not a registered L9 output class');
assert(getL9SequenceOutputClassDescriptor(L9SequenceOutputClass.SEQUENCE_ASSESSMENT)!.requiresRestrictionProfile,
  'A.52 SEQUENCE_ASSESSMENT requires restriction profile');
assert(L9_SEQUENCE_OUTPUT_CLASS_DESCRIPTORS.every(d => d.requiresEvidence && d.requiresLineage),
  'A.53 every output class is evidence+lineage-bound');

// Registries
const famReg = new L9SequenceFamilyRegistry();
assert(famReg.list().length === 6, 'A.54 family registry lists 6');
assert(famReg.isRegistered(L9SequenceFamily.NARRATIVE_LED), 'A.55 famReg NARRATIVE_LED');
assert(getDefaultL9SequenceFamilyRegistry().list().length === 6,
  'A.56 default family registry');
const stateReg = new L9SequenceStateRegistry();
assert(stateReg.list().length === L9_SEQUENCE_STATE_DESCRIPTORS.length,
  'A.57 state registry size');
assert(stateReg.belongsToFamily(L9SequenceState.POST_SHOCK_DIGESTION,
  L9SequenceFamily.OVERHANG_AND_DIGESTION),
  'A.58 stateReg belongsToFamily');
const coexReg = getDefaultL9SequenceCoexistenceRegistry();
assert(coexReg.list().length === L9_SEQUENCE_COEXISTENCE_RULES.length,
  'A.59 coexistence registry size');
const outReg = new L9SequenceOutputClassRegistry();
assert(outReg.list().length === 7, 'A.60 output-class registry size');
assert(outReg.requiresRestrictionProfile(L9SequenceOutputClass.SEQUENCE_ASSESSMENT),
  'A.61 outReg requiresRestrictionProfile for assessment');
assert(!outReg.requiresRestrictionProfile(L9SequenceOutputClass.SEQUENCE_CHAIN),
  'A.62 outReg chain does not require restriction profile');
assert(getDefaultL9SequenceOutputClassRegistry().list().length === 7,
  'A.63 default output-class registry');

// validateL9SequenceFamily — good/bad
assert(validateL9SequenceFamily({
  family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  sequenceState: L9SequenceState.VALIDATED_EXPANSION,
  scope_type: 'TOKEN',
}).valid, 'A.64 good family+state+scope passes');
assert(!validateL9SequenceFamily({
  family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  sequenceState: L9SequenceState.LEVERAGE_CROWDING_PHASE,
  scope_type: 'TOKEN',
}).valid, 'A.65 state not in family rejects');
assert(!validateL9SequenceFamily({
  family: L9SequenceFamily.OVERHANG_AND_DIGESTION,
  sequenceState: L9SequenceState.POST_SHOCK_DIGESTION,
  scope_type: 'MARKET',
}).valid, 'A.66 family scope illegal rejects');

// Sub-object enums registered
assert(ALL_L9_ORDERING_RELATIONS.length === 4, 'A.67 4 ordering relations');
assert(ALL_L9_ORDERING_RELATIONS.includes(L9OrderingRelation.AMBIGUOUS),
  'A.68 AMBIGUOUS ordering relation exists');
assert(ALL_L9_RELATION_QUALITY_CLASSES.includes(L9RelationQualityClass.CONTRADICTORY),
  'A.69 CONTRADICTORY quality class');
assert(ALL_L9_LAG_CLASSES.includes(L9LagClass.BEYOND_WINDOW),
  'A.70 BEYOND_WINDOW lag class');
assert(ALL_L9_LAG_SUPPORT_STRENGTHS.includes(L9LagSupportStrength.NON_SUPPORTIVE),
  'A.71 NON_SUPPORTIVE lag support');
assert(ALL_L9_LAG_CONTRADICTION_POSTURES.includes(L9LagContradictionPosture.DECISIVE),
  'A.72 DECISIVE contradiction posture');
assert(ALL_L9_CHAIN_INTEGRITY_FLAGS.length >= 7, 'A.73 ≥7 chain integrity flags');
assert(ALL_L9_CAUSAL_CONFIDENCE_CLASSES.includes(L9CausalConfidenceClass.TEMPORAL_ONLY),
  'A.74 TEMPORAL_ONLY causal confidence class');
assert(ALL_L9_PHASE_CLASSES.length >= 10, 'A.75 ≥10 phase classes');
assert(ALL_L9_PHASE_PROGRESSION_CLASSES.length === 5,
  'A.76 5 phase progression classes');
assert(ALL_L9_CHANGE_POINT_CLASSES.length >= 10, 'A.77 ≥10 change-point classes');
assert(ALL_L9_CHANGE_POINT_SEVERITIES.includes(L9ChangePointSeverity.DECISIVE),
  'A.78 DECISIVE severity');
assert(ALL_L9_DECAY_CLASSES.length === 4, 'A.79 4 decay classes');
assert(ALL_L9_DECAY_REASON_CODES.includes(L9DecayReasonCode.TIME_BURDEN),
  'A.80 TIME_BURDEN decay reason');
assert(ALL_L9_POST_EVENT_WINDOW_CLASSES.length >= 5, 'A.81 ≥5 post-event classes');
assert(ALL_L9_POST_EVENT_WINDOW_STATES.includes(L9PostEventWindowState.STABILIZED),
  'A.82 STABILIZED window state');
assert(ALL_L9_SEQUENCE_COEXISTENCE_CLASSES.length === 5, 'A.83 5 coexistence classes');
assert(ALL_L9_SEQUENCE_CONFIDENCE_BANDS.length === 4, 'A.84 4 confidence bands');
assert(ALL_L9_SEQUENCE_RELIANCE_BANDS.length === 6, 'A.85 6 reliance bands');
assert(ALL_L9_ALLOWED_DOWNSTREAM_USES.includes(L9AllowedDownstreamUse.SCENARIO_INPUT),
  'A.86 SCENARIO_INPUT downstream use');
assert(ALL_L9_SEQUENCE_NARROWING_REASONS.includes(L9SequenceNarrowingReason.CAUSAL_RESTRAINT),
  'A.87 CAUSAL_RESTRAINT narrowing reason');
assert(ALL_L9_SEQUENCE_OBJECT_VIOLATION_CODES.length >= 40,
  'A.88 ≥40 object violation codes');

// ═══════════════════════════════════════════════════════════════
// BAND B — Object Completeness
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Object Completeness ═══');
resetAll();

// Deterministic ids
const subjectId = buildL9SequenceSubjectId({
  sequence_family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  scope_type: 'TOKEN',
  scope_id: 'TOKEN:ABC',
  window_start: '2026-04-01T00:00:00Z',
  window_end: '2026-04-10T00:00:00Z',
  sequence_template_id: 'tmpl_v1',
  sequence_version: '1.0.0',
});
assert(subjectId.startsWith('sseq_'), 'B.01 subject id prefix');
const subjectId2 = buildL9SequenceSubjectId({
  sequence_family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  scope_type: 'TOKEN',
  scope_id: 'TOKEN:ABC',
  window_start: '2026-04-01T00:00:00Z',
  window_end: '2026-04-10T00:00:00Z',
  sequence_template_id: 'tmpl_v1',
  sequence_version: '1.0.0',
});
assert(subjectId === subjectId2, 'B.02 subject id deterministic');

const assessmentId = buildL9SequenceAssessmentId({
  sequence_subject_id: subjectId,
  primary_sequence_state: L9SequenceState.VALIDATED_EXPANSION,
  secondary_sequence_state: null,
  as_of: '2026-04-10T00:00:00Z',
  compute_run_id: 'run_abc',
});
assert(assessmentId.startsWith('sassess_'), 'B.03 assessment id prefix');
assert(buildL9SequenceReplayHash('abc').startsWith('srhash_'),
  'B.04 replay hash prefix');

// Full well-formed assessment
function makeGoodAssessment(overrides: Partial<L9SequenceAssessment> = {}):
  L9SequenceAssessment {
  const base: L9SequenceAssessment = {
    sequence_assessment_id: assessmentId,
    sequence_subject_id: subjectId,
    sequence_template_id: 'tmpl_v1',
    sequence_version: '1.0.0',
    sequence_family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    primary_sequence_state: L9SequenceState.VALIDATED_EXPANSION,
    secondary_sequence_state: null,
    scope_type: 'TOKEN',
    scope_id: 'TOKEN:ABC',
    as_of: '2026-04-10T00:00:00Z',
    ordered_signal_refs: ['sig_1', 'sig_2', 'sig_3'],
    sequence_chain_ref: 'chain_1',
    lead_lag_relations: ['ll_1'],
    phase_state_ref: 'phase_1',
    phase_class: L9PhaseClass.VALIDATED,
    change_point_refs: ['cp_1'],
    post_event_window_refs: [],
    decay_profile_ref: 'decay_1',
    sequence_confidence_score: 0.8,
    sequence_confidence_band: L9SequenceConfidenceBand.HIGH,
    sequence_decay_score: 0.1,
    sequence_decay_class: L9DecayClass.FRESH,
    regime_refs: ['regime_1'],
    validation_refs: ['val_1'],
    contradiction_refs: [],
    restriction_profile_ref: 'srp_1',
    coexistence_class: L9SequenceCoexistenceClass.CLEAN_SINGLE,
    ambiguity_score: 0.1,
    sequence_completeness_score: 0.9,
    chain_integrity_flags: [],
    causal_restraint_flags: {
      chain_is_temporal_only: true,
      adjacency_is_not_causality_disclaimer: 'Temporal adjacency is not causality.',
      hypothesis_excluded: true,
      judgment_excluded: true,
      scenario_excluded: true,
      recommendation_excluded: true,
    },
    degradation_score: 0.05,
    staleness_score: 0.05,
    evidence_pack_ref: 'epk_1',
    input_snapshot_ref: 'ins_1',
    compute_run_id: 'run_abc',
    replay_hash: 'srhash_12345678',
    lineage_refs: ['lin_1'],
    policy_version: 'policy_v1',
    materialization_mode: 'LIVE',
    created_by: 'l9-runtime',
    created_at: '2026-04-10T00:00:00Z',
    description: 'validated expansion assessment',
  };
  return { ...base, ...overrides };
}

const good = makeGoodAssessment();
const goodReport = validateL9SequenceAssessment({
  assessment: good,
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
});
assert(goodReport.valid, 'B.05 good assessment passes');
assert(goodReport.issues.length === 0, 'B.06 good assessment produces zero issues');

// Missing subject
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({ sequence_subject_id: '' }),
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.07 missing subject rejects');

// Missing primary state — cast through unknown to simulate runtime nullish data
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({
    primary_sequence_state: '' as unknown as L9SequenceState,
  }),
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.08 missing primary state rejects');

// Ordered refs empty
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({ ordered_signal_refs: [] }),
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.09 empty ordered_signal_refs rejects');

// Chain ref missing
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({ sequence_chain_ref: '' }),
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.10 missing chain ref rejects');

// Lead-lag missing
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({ lead_lag_relations: [] }),
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.11 missing lead-lag rejects');

// Phase missing
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({ phase_state_ref: '' }),
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.12 missing phase ref rejects');

// Decay missing
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({ decay_profile_ref: '' }),
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.13 missing decay ref rejects');

// Missing restriction profile
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({ restriction_profile_ref: '' }),
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.14 missing restriction profile rejects');

// Missing replay hash
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({ replay_hash: '' }),
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.15 missing replay hash rejects');

// Missing lineage
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({ lineage_refs: [] }),
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.16 missing lineage rejects');

// Missing policy version
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({ policy_version: '' }),
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.17 missing policy_version rejects');

// Missing evidence pack
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({ evidence_pack_ref: '' }),
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.18 missing evidence_pack_ref rejects');

// Missing compute run id
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({ compute_run_id: '' }),
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.19 missing compute_run_id rejects');

// Broken causal restraint
const brokenRestraint = makeGoodAssessment({
  causal_restraint_flags: {
    chain_is_temporal_only: true,
    adjacency_is_not_causality_disclaimer: '',
    hypothesis_excluded: true,
    judgment_excluded: false as unknown as true,
    scenario_excluded: true,
    recommendation_excluded: true,
  },
});
assert(!validateL9SequenceAssessment({
  assessment: brokenRestraint,
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.20 broken causal restraint rejects');

// Score out of range
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({ sequence_confidence_score: 1.5 }),
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.21 confidence > 1 rejects');

// Band inconsistent with score
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({
    sequence_confidence_score: 0.3,
    sequence_confidence_band: L9SequenceConfidenceBand.FULL,
  }),
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.22 confidence band inconsistent rejects');

// Decay class inconsistent with score
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({
    sequence_decay_score: 0.9,
    sequence_decay_class: L9DecayClass.FRESH,
  }),
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.23 decay class inconsistent rejects');

// Ambiguity/staleness/degradation range
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({ ambiguity_score: -0.1 }),
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.24 ambiguity < 0 rejects');
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({ staleness_score: 2 }),
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.25 staleness > 1 rejects');
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({ degradation_score: 2 }),
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.26 degradation > 1 rejects');

// Regime refs required for regime-conditioned family
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({ regime_refs: [] }),
  postEventAnchorPresent: false,
  regimeRefsPresent: false,
}).valid, 'B.27 missing regime refs (required) rejects');

// Post-event state without anchor — use POST_SHOCK_DIGESTION
const postEventAssess = makeGoodAssessment({
  sequence_family: L9SequenceFamily.OVERHANG_AND_DIGESTION,
  primary_sequence_state: L9SequenceState.POST_SHOCK_DIGESTION,
  scope_type: 'TOKEN',
  post_event_window_refs: [],
  regime_refs: [],
});
assert(!validateL9SequenceAssessment({
  assessment: postEventAssess,
  postEventAnchorPresent: false,
  regimeRefsPresent: false,
}).valid, 'B.28 POST_SHOCK_DIGESTION without anchor rejects');
// With anchor present AND post_event_window_refs → passes
const postEventWithAnchor = makeGoodAssessment({
  sequence_family: L9SequenceFamily.OVERHANG_AND_DIGESTION,
  primary_sequence_state: L9SequenceState.POST_SHOCK_DIGESTION,
  scope_type: 'TOKEN',
  post_event_window_refs: ['pew_1'],
  regime_refs: [],
});
assert(validateL9SequenceAssessment({
  assessment: postEventWithAnchor,
  postEventAnchorPresent: true,
  regimeRefsPresent: false,
}).valid, 'B.29 POST_SHOCK_DIGESTION with anchor passes');

// Secondary equals primary
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({
    secondary_sequence_state: L9SequenceState.VALIDATED_EXPANSION,
    coexistence_class: L9SequenceCoexistenceClass.PRIMARY_PLUS_SECONDARY,
  }),
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.30 secondary == primary rejects');

// Secondary wrong family
assert(!validateL9SequenceAssessment({
  assessment: makeGoodAssessment({
    secondary_sequence_state: L9SequenceState.LEVERAGE_CROWDING_PHASE,
    coexistence_class: L9SequenceCoexistenceClass.PRIMARY_PLUS_SECONDARY,
  }),
  postEventAnchorPresent: false,
  regimeRefsPresent: true,
}).valid, 'B.31 secondary wrong family rejects');

// Band / decay helpers
assert(l9BandForConfidenceScore(0.95) === L9SequenceConfidenceBand.FULL,
  'B.32 band helper FULL');
assert(l9BandForConfidenceScore(0.8) === L9SequenceConfidenceBand.HIGH,
  'B.33 band helper HIGH');
assert(l9BandForConfidenceScore(0.6) === L9SequenceConfidenceBand.MODERATE,
  'B.34 band helper MODERATE');
assert(l9BandForConfidenceScore(0.2) === L9SequenceConfidenceBand.LOW,
  'B.35 band helper LOW');
assert(l9DecayClassForScore(0.8) === L9DecayClass.DEPRECATED,
  'B.36 decay helper DEPRECATED');
assert(l9DecayClassForScore(0.1) === L9DecayClass.FRESH,
  'B.37 decay helper FRESH');

// Canonicalization
const canon = canonicalizeL9SequenceAssessmentForHash(good);
assert(canon.includes(L9SequenceFamily.ACCUMULATION_TO_EXPANSION),
  'B.38 canonicalization includes family');
assert(canon.includes(L9SequenceState.VALIDATED_EXPANSION),
  'B.39 canonicalization includes primary state');

// ═══════════════════════════════════════════════════════════════
// BAND C — Coexistence and Ambiguity Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Coexistence and Ambiguity Law ═══');
resetAll();

assert(L9_SEQUENCE_COEXISTENCE_RULES.length >= 7, 'C.01 ≥7 coexistence rules');

// Clean single passes for a clean-single-eligible state with no secondary
const clean = validateL9IntraFamilyCoexistence({
  family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  primary: L9SequenceState.VALIDATED_EXPANSION,
  secondary: null,
  declaredClass: L9SequenceCoexistenceClass.CLEAN_SINGLE,
  postEventAnchorPresent: false,
});
assert(clean.valid, 'C.02 clean single passes for eligible state');

// Clean-single forbidden on dirty state
const dirtyCS = validateL9IntraFamilyCoexistence({
  family: L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
  primary: L9SequenceState.LATE_STAGE_REFLEXIVITY,
  secondary: null,
  declaredClass: L9SequenceCoexistenceClass.CLEAN_SINGLE,
  postEventAnchorPresent: false,
});
assert(!dirtyCS.valid, 'C.03 CLEAN_SINGLE on clean-single-forbidden state rejects');
assert(dirtyCS.issues.some(i =>
  i.code === L9SequenceObjectViolationCode.COEXISTENCE_STATE_FORBIDS_CLEAN_SINGLE),
  'C.04 clean-single-forbidden emits COEXISTENCE_STATE_FORBIDS_CLEAN_SINGLE');

// Secondary present but CLEAN_SINGLE → fake clean single
const fakeCS = validateL9IntraFamilyCoexistence({
  family: L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
  primary: L9SequenceState.LEVERAGE_CROWDING_PHASE,
  secondary: L9SequenceState.LATE_STAGE_REFLEXIVITY,
  declaredClass: L9SequenceCoexistenceClass.CLEAN_SINGLE,
  postEventAnchorPresent: false,
});
assert(!fakeCS.valid, 'C.05 fake clean single rejects');
assert(fakeCS.issues.some(i =>
  i.code === L9SequenceObjectViolationCode.COEXISTENCE_FAKE_CLEAN_SINGLE),
  'C.06 fake clean single emits COEXISTENCE_FAKE_CLEAN_SINGLE');

// ALLOWED pair with PRIMARY_PLUS_SECONDARY passes
const allowedPair = validateL9IntraFamilyCoexistence({
  family: L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
  primary: L9SequenceState.LEVERAGE_CROWDING_PHASE,
  secondary: L9SequenceState.LATE_STAGE_REFLEXIVITY,
  declaredClass: L9SequenceCoexistenceClass.PRIMARY_PLUS_SECONDARY,
  postEventAnchorPresent: false,
});
assert(allowedPair.valid, 'C.07 ALLOWED pair with PRIMARY_PLUS_SECONDARY passes');

// TRANSITION_ONLY pair must declare TRANSITIONAL_OVERLAP
const trans = validateL9IntraFamilyCoexistence({
  family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  primary: L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
  secondary: L9SequenceState.EARLY_NARRATIVE_IGNITION,
  declaredClass: L9SequenceCoexistenceClass.PRIMARY_PLUS_SECONDARY,
  postEventAnchorPresent: false,
});
assert(!trans.valid, 'C.08 TRANSITION_ONLY pair as PRIMARY_PLUS_SECONDARY rejects');
assert(trans.issues.some(i =>
  i.code === L9SequenceObjectViolationCode.COEXISTENCE_MISSING_TRANSITION),
  'C.09 COEXISTENCE_MISSING_TRANSITION emitted');
const transOk = validateL9IntraFamilyCoexistence({
  family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  primary: L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
  secondary: L9SequenceState.EARLY_NARRATIVE_IGNITION,
  declaredClass: L9SequenceCoexistenceClass.TRANSITIONAL_OVERLAP,
  postEventAnchorPresent: false,
});
assert(transOk.valid, 'C.10 TRANSITION_ONLY pair with TRANSITIONAL_OVERLAP passes');

// AMBIGUITY_ONLY pair must declare AMBIGUOUS_MULTI_STATE
const ambig = validateL9IntraFamilyCoexistence({
  family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  primary: L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
  secondary: L9SequenceState.STRUCTURAL_CONFIRMATION_GAP,
  declaredClass: L9SequenceCoexistenceClass.PRIMARY_PLUS_SECONDARY,
  postEventAnchorPresent: false,
});
assert(!ambig.valid, 'C.11 AMBIGUITY_ONLY pair as PRIMARY_PLUS_SECONDARY rejects');
assert(ambig.issues.some(i =>
  i.code === L9SequenceObjectViolationCode.COEXISTENCE_MISSING_AMBIGUITY),
  'C.12 COEXISTENCE_MISSING_AMBIGUITY emitted');
const ambigOk = validateL9IntraFamilyCoexistence({
  family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  primary: L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
  secondary: L9SequenceState.STRUCTURAL_CONFIRMATION_GAP,
  declaredClass: L9SequenceCoexistenceClass.AMBIGUOUS_MULTI_STATE,
  postEventAnchorPresent: false,
});
assert(ambigOk.valid, 'C.13 AMBIGUITY_ONLY pair with AMBIGUOUS_MULTI_STATE passes');

// ILLEGAL pair always blocked
const illegalRule = L9_SEQUENCE_COEXISTENCE_RULES.find(r => r.kind === 'ILLEGAL');
assert(illegalRule !== undefined, 'C.14 at least one ILLEGAL rule exists');
for (const cls of ALL_L9_SEQUENCE_COEXISTENCE_CLASSES) {
  const d = decideL9Coexistence(illegalRule!.family,
    illegalRule!.pair[0], illegalRule!.pair[1], cls);
  assert(!d.allowed, `C.15.${cls} ILLEGAL pair blocked regardless of declared class`);
}
assert(l9IsIllegalIntraFamilyPair(illegalRule!.family,
  illegalRule!.pair[0], illegalRule!.pair[1]),
  'C.16 l9IsIllegalIntraFamilyPair true');

// Secondary == primary always illegal
const selfPair = decideL9Coexistence(
  L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  L9SequenceState.VALIDATED_EXPANSION,
  L9SequenceState.VALIDATED_EXPANSION,
  L9SequenceCoexistenceClass.PRIMARY_PLUS_SECONDARY,
);
assert(!selfPair.allowed, 'C.17 secondary == primary always illegal');

// No secondary declared with non-clean-single
const nonCleanNull = decideL9Coexistence(
  L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  L9SequenceState.VALIDATED_EXPANSION,
  null,
  L9SequenceCoexistenceClass.PRIMARY_PLUS_SECONDARY,
);
assert(!nonCleanNull.allowed, 'C.18 null secondary + non-clean-single rejects');

// Cross-family coexistence
const crossOk = validateL9CrossFamilyCoexistence({
  families: [
    L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
  ],
});
assert(crossOk.valid, 'C.19 allowed cross-family passes');

const crossDup = validateL9CrossFamilyCoexistence({
  families: [
    L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  ],
});
assert(!crossDup.valid, 'C.20 cross-family duplicate rejects');
assert(crossDup.issues.some(i =>
  i.code === L9SequenceObjectViolationCode.COEXISTENCE_CROSS_FAMILY_DUPLICATE),
  'C.21 cross-family duplicate emits specific code');

const crossIllegal = validateL9CrossFamilyCoexistence({
  families: [
    L9SequenceFamily.NARRATIVE_LED,
    L9SequenceFamily.OVERHANG_AND_DIGESTION,
  ],
});
assert(!crossIllegal.valid, 'C.22 illegal cross-family rejects (not declared coexist)');
assert(crossIllegal.issues.some(i =>
  i.code === L9SequenceObjectViolationCode.COEXISTENCE_CROSS_FAMILY_ILLEGAL),
  'C.23 cross-family illegal emits specific code');

// Anchor requirement via coexistence
const noAnchor = validateL9IntraFamilyCoexistence({
  family: L9SequenceFamily.OVERHANG_AND_DIGESTION,
  primary: L9SequenceState.POST_SHOCK_DIGESTION,
  secondary: null,
  declaredClass: L9SequenceCoexistenceClass.CLEAN_SINGLE,
  postEventAnchorPresent: false,
});
assert(!noAnchor.valid, 'C.24 post-event state without anchor rejects');
assert(noAnchor.issues.some(i =>
  i.code === L9SequenceObjectViolationCode.COEXISTENCE_MISSING_POST_EVENT_ANCHOR),
  'C.25 post-event anchor missing code emitted');

// ═══════════════════════════════════════════════════════════════
// BAND D — Semantic Integrity (Output Validator)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Semantic Integrity ═══');
resetAll();

const cleanOutput = validateL9SequenceOutput({
  outputClass: L9SequenceOutputClass.SEQUENCE_ASSESSMENT,
  outputName: 'ValidatedExpansionAssessment',
  outputDescription: 'Governed sequence assessment for validated expansion.',
  evidence_pack_ref: 'epk_1',
  lineage_refs: ['lin_1'],
  replay_hash: 'srhash_1',
  restriction_profile_ref: 'srp_1',
});
assert(cleanOutput.valid, 'D.01 clean output validates');

// Unregistered output class
const badClass = validateL9SequenceOutput({
  outputClass: 'JUDGMENT' as unknown as L9SequenceOutputClass,
  outputName: 'X',
  outputDescription: 'X',
  evidence_pack_ref: 'epk',
  lineage_refs: ['lin'],
  replay_hash: 'rh',
  restriction_profile_ref: 'srp',
});
assert(!badClass.valid, 'D.02 unregistered output class rejects');
assert(badClass.issues.some(i =>
  i.code === L9SequenceObjectViolationCode.OUTPUT_UNREGISTERED_CLASS),
  'D.03 OUTPUT_UNREGISTERED_CLASS emitted');

// Missing evidence
assert(!validateL9SequenceOutput({
  outputClass: L9SequenceOutputClass.SEQUENCE_ASSESSMENT,
  outputName: 'ValidatedExpansion',
  outputDescription: 'OK',
  evidence_pack_ref: '',
  lineage_refs: ['lin'],
  replay_hash: 'rh',
  restriction_profile_ref: 'srp',
}).valid, 'D.04 missing evidence_pack_ref rejects');

// Missing lineage
assert(!validateL9SequenceOutput({
  outputClass: L9SequenceOutputClass.SEQUENCE_ASSESSMENT,
  outputName: 'ValidatedExpansion',
  outputDescription: 'OK',
  evidence_pack_ref: 'epk',
  lineage_refs: [],
  replay_hash: 'rh',
  restriction_profile_ref: 'srp',
}).valid, 'D.05 empty lineage_refs rejects');

// Missing replay hash
assert(!validateL9SequenceOutput({
  outputClass: L9SequenceOutputClass.SEQUENCE_CHAIN,
  outputName: 'Chain',
  outputDescription: 'OK',
  evidence_pack_ref: 'epk',
  lineage_refs: ['lin'],
  replay_hash: '',
  restriction_profile_ref: null,
}).valid, 'D.06 missing replay_hash rejects');

// Missing restriction profile on SEQUENCE_ASSESSMENT
assert(!validateL9SequenceOutput({
  outputClass: L9SequenceOutputClass.SEQUENCE_ASSESSMENT,
  outputName: 'ValidatedExpansion',
  outputDescription: 'OK',
  evidence_pack_ref: 'epk',
  lineage_refs: ['lin'],
  replay_hash: 'rh',
  restriction_profile_ref: null,
}).valid, 'D.07 missing restriction profile on assessment rejects');

// Semantic leaks
const judgmentLeak = validateL9SequenceOutput({
  outputClass: L9SequenceOutputClass.SEQUENCE_ASSESSMENT,
  outputName: 'ExpansionJudgment',
  outputDescription: 'Final judgment on expansion.',
  evidence_pack_ref: 'epk',
  lineage_refs: ['lin'],
  replay_hash: 'rh',
  restriction_profile_ref: 'srp',
});
assert(!judgmentLeak.valid && judgmentLeak.issues.some(i =>
  i.code === L9SequenceObjectViolationCode.OUTPUT_JUDGMENT_LEAK),
  'D.08 judgment-leak rejected');

const scenarioLeak = validateL9SequenceOutput({
  outputClass: L9SequenceOutputClass.SEQUENCE_ASSESSMENT,
  outputName: 'ExpansionScenario',
  outputDescription: 'Scenario analysis on expansion.',
  evidence_pack_ref: 'epk',
  lineage_refs: ['lin'],
  replay_hash: 'rh',
  restriction_profile_ref: 'srp',
});
assert(!scenarioLeak.valid && scenarioLeak.issues.some(i =>
  i.code === L9SequenceObjectViolationCode.OUTPUT_SCENARIO_LEAK),
  'D.09 scenario-leak rejected');

const recoLeak = validateL9SequenceOutput({
  outputClass: L9SequenceOutputClass.SEQUENCE_ASSESSMENT,
  outputName: 'BuyRecommendation',
  outputDescription: 'Recommends long target',
  evidence_pack_ref: 'epk',
  lineage_refs: ['lin'],
  replay_hash: 'rh',
  restriction_profile_ref: 'srp',
});
assert(!recoLeak.valid && recoLeak.issues.some(i =>
  i.code === L9SequenceObjectViolationCode.OUTPUT_RECOMMENDATION_LEAK),
  'D.10 recommendation-leak rejected');

const scoreLeak = validateL9SequenceOutput({
  outputClass: L9SequenceOutputClass.SEQUENCE_ASSESSMENT,
  outputName: 'FinalScoreSummary',
  outputDescription: 'Final-score of the setup',
  evidence_pack_ref: 'epk',
  lineage_refs: ['lin'],
  replay_hash: 'rh',
  restriction_profile_ref: 'srp',
});
assert(!scoreLeak.valid && scoreLeak.issues.some(i =>
  i.code === L9SequenceObjectViolationCode.OUTPUT_SCORE_LEAK),
  'D.11 score-leak rejected');

const hypLeak = validateL9SequenceOutput({
  outputClass: L9SequenceOutputClass.SEQUENCE_ASSESSMENT,
  outputName: 'ExpansionHypothesis',
  outputDescription: 'Candidate hypothesis on expansion.',
  evidence_pack_ref: 'epk',
  lineage_refs: ['lin'],
  replay_hash: 'rh',
  restriction_profile_ref: 'srp',
});
assert(!hypLeak.valid && hypLeak.issues.some(i =>
  i.code === L9SequenceObjectViolationCode.OUTPUT_HYPOTHESIS_LEAK),
  'D.12 hypothesis-leak rejected');

const actLeak = validateL9SequenceOutput({
  outputClass: L9SequenceOutputClass.SEQUENCE_ASSESSMENT,
  outputName: 'ActionableEntrySetup',
  outputDescription: 'Actionable entry trigger',
  evidence_pack_ref: 'epk',
  lineage_refs: ['lin'],
  replay_hash: 'rh',
  restriction_profile_ref: 'srp',
});
assert(!actLeak.valid && actLeak.issues.some(i =>
  i.code === L9SequenceObjectViolationCode.OUTPUT_ACTION_BIAS_LEAK),
  'D.13 action-bias-leak rejected');

// Registered state names must not themselves trip semantic leaks
for (const s of ALL_L9_SEQUENCE_STATES) {
  const r = validateL9SequenceOutput({
    outputClass: L9SequenceOutputClass.SEQUENCE_ASSESSMENT,
    outputName: String(s),
    outputDescription: 'Governed sequence state',
    evidence_pack_ref: 'epk',
    lineage_refs: ['lin'],
    replay_hash: 'rh',
    restriction_profile_ref: 'srp',
  });
  assert(r.issues.every(i => !i.code.toString().includes('LEAK')),
    `D.14 state "${s}" has no semantic leak`);
}

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit and Invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit and Invariants ═══');
resetAll();

// Object audit
assert(getL9ObjectAuditLog().length === 0, 'E.01 object audit log empty after reset');
assert(!hasAnyL9ObjectViolations(), 'E.02 no violations after reset');

emitL9SubjectViolation(
  L9SequenceObjectViolationCode.SUBJECT_MISSING_IDENTITY,
  'test-subject', 'subject missing identity',
);
assert(getL9ObjectViolationCount() === 1, 'E.03 one record emitted');
emitL9FamilyViolation(
  L9SequenceObjectViolationCode.FAMILY_UNREGISTERED,
  'test-family', 'unknown family',
);
emitL9StateViolation(
  L9SequenceObjectViolationCode.STATE_NOT_IN_FAMILY,
  'test-state', 'state/family mismatch',
);
emitL9CoexistenceViolation(
  L9SequenceObjectViolationCode.COEXISTENCE_ILLEGAL_COLLISION,
  'test-coex', 'illegal pair',
);
emitL9AssessmentViolation(
  L9SequenceObjectViolationCode.ASSESSMENT_MISSING_REPLAY_HASH,
  'test-assess', 'no replay hash',
);
emitL9OutputObjectViolation(
  L9SequenceObjectViolationCode.OUTPUT_JUDGMENT_LEAK,
  'test-output', 'judgment leak',
);
assert(getL9ObjectViolationCount() === 6, 'E.04 six records emitted');
assert(getL9ObjectCriticalViolations().length >= 4,
  'E.05 critical violations accounted for');
assert(getL9ObjectViolationsByCode(
  L9SequenceObjectViolationCode.OUTPUT_JUDGMENT_LEAK).length === 1,
  'E.06 violations-by-code lookup');
emitL9ObjectAuditRecord({
  violationCode: L9SequenceObjectViolationCode.ASSESSMENT_MISSING_ID,
  source: 'test',
  detail: 'info',
  context: {},
  severity: 'INFO',
});
assert(getL9ObjectViolationCount() === 7, 'E.07 raw emit works');

resetL9ObjectAuditLog();
assert(getL9ObjectAuditLog().length === 0, 'E.08 reset clears log');

// Invariants INV-9.2-A..G
const inv = checkAllL92Invariants();
assert(inv.length === 7, 'E.09 7 L9.2 invariants');
assert(inv.every(r => r.holds), `E.10 all L9.2 invariants hold: ${
  inv.filter(r => !r.holds).map(r => `${r.id}(${r.evidence})`).join(', ') || 'ok'
}`);

// Individual invariant checks
assert(checkINV_92_A().holds, 'E.11 INV-9.2-A holds');
assert(checkINV_92_B().holds, 'E.12 INV-9.2-B holds');
assert(checkINV_92_C().holds, 'E.13 INV-9.2-C holds');
assert(checkINV_92_D().holds, 'E.14 INV-9.2-D holds');
assert(checkINV_92_E().holds, 'E.15 INV-9.2-E holds');
assert(checkINV_92_F().holds, 'E.16 INV-9.2-F holds');
assert(checkINV_92_G().holds, 'E.17 INV-9.2-G holds');

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(64));
console.log(`L9.2 OBJECTS — passed=${passed} failed=${failed}`);
console.log('═'.repeat(64));
if (failed > 0) {
  console.error(`\n✗ L9.2 object-model certification FAILED — ${failed} assertion(s):`);
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log('✓ Layer 9.2 sequence-doctrine / object-model / families green.');
