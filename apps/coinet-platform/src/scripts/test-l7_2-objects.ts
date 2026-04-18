/**
 * L7.2 — Validation Doctrine, Object Model, and Output Classes
 * Certification Test Suite
 *
 * 5 Bands:
 *   A — Validation doctrine and subjectization
 *   B — Subject classes and contracts
 *   C — Output classes
 *   D — Registry and audit behavior
 *   E — Invariants and L7.1 integration
 */

import {
  L7MaterialityClass, ALL_MATERIALITY_CLASSES, MATERIALITY_POSTURES, getMaterialityPosture,
  L7ValidationWindow, validateValidationWindow,
  L7ValidationSubjectClass, ALL_VALIDATION_SUBJECT_CLASSES,
  SUBJECT_CLASS_DESCRIPTORS, getSubjectClassDescriptor,
  isRegisteredSubjectClass, subjectClassAllowsScope,
  L7ValidationOutputClass, ALL_VALIDATION_OUTPUT_CLASSES,
  L7ValidationClass, ALL_VALIDATION_CLASSES,
  L7ValidationModifier, ALL_VALIDATION_MODIFIERS,
  L7ObjectViolationCode, ALL_OBJECT_VIOLATION_CODES, L7ObjectError,
  REQUIRED_FIELDS_BY_OUTPUT,
  L7ValidationSubject, buildValidationSubjectId, buildSubjectTemplateId,
  L7ContradictionSeverity, ALL_CONTRADICTION_SEVERITIES,
  L7ContradictionFamily, ALL_CONTRADICTION_FAMILIES,
  L7ContradictionBundle, L7ContradictionRecord,
  computeHighestSeverity, computeDominantFamily, compareSeverity, buildContradictionBundleId,
  L7ConfidenceBand, ALL_CONFIDENCE_BANDS, CONFIDENCE_BAND_RANGES, bandForScore, bandMatchesScore,
  L7ConfidenceAssessment,
  L7ClaimRestrictionProfile, L7RestrictionRight, ALL_RESTRICTION_RIGHTS,
  L7RestrictionReasonCode, ALL_RESTRICTION_REASON_CODES,
  buildRestrictionProfileId, rightsAreInternallyConsistent,
  L7ValidationAssessment, buildValidationResultId, canonicalReplayHash,
  classRequiresContradictionBundle, modifiersRequireContradictionBundle,
  checkFlagConsistency,
} from '../l7/contracts';

import {
  ValidationSubjectClassRegistry, getDefaultSubjectClassRegistry,
  ValidationSubjectRegistry, getDefaultSubjectRegistry,
  ValidationOutputClassRegistry, getDefaultOutputClassRegistry, OUTPUT_CLASS_DESCRIPTORS,
  ContradictionFamilyRegistry, getDefaultContradictionFamilyRegistry, CONTRADICTION_FAMILY_DESCRIPTORS,
  RestrictionRightRegistry, getDefaultRestrictionRightRegistry, RESTRICTION_RIGHT_DESCRIPTORS,
} from '../l7/registry';

import {
  validateSubjectKind, classifySupportPatterns,
  validateValidationSubjectContract,
  validateValidationAssessment,
  validateContradictionBundle,
  validateConfidenceAssessment,
  validateClaimRestrictionProfile,
} from '../l7/validation';

import {
  resetObjectAuditLog, emitObjectAuditRecord, getObjectAuditLog,
  getObjectViolationsByCode, hasAnyObjectViolations, getObjectViolationCount,
  getObjectCriticalViolations,
  emitInvalidSubjectViolation, emitInvalidOutputViolation,
  emitContradictionLeakViolation, emitConfidenceFactorViolation,
  emitRestrictionClarityViolation, emitSubjectJudgmentLeakViolation,
} from '../l7/constitution';

import {
  runAllL7_2Invariants,
  checkINV_72_A, checkINV_72_B, checkINV_72_C, checkINV_72_D,
  checkINV_72_E, checkINV_72_F, checkINV_72_G,
} from '../l7/invariants';

let passed = 0;
let failed = 0;
function assert(cond: boolean, label: string): void {
  if (cond) passed++;
  else { failed++; console.error(`  ✗ FAIL: ${label}`); }
}

// ── Helpers ─────────────────────────────────────────────────────────────
function makeWindow(): L7ValidationWindow {
  return {
    kind: 'ROLLING_WINDOW',
    anchor_ts: '2026-04-17T00:00:00Z',
    lookback_seconds: 3600,
    lookforward_seconds: 0,
    calendar_tag: null,
    event_anchor_ref: null,
    timezone: 'UTC',
  };
}

function makeSubject(overrides: Partial<L7ValidationSubject> = {}): L7ValidationSubject {
  const base: L7ValidationSubject = {
    validation_subject_id: buildValidationSubjectId({
      claim_family: 'price_strength',
      claim_name: 'price_strength_state',
      claim_version: '1.0.0',
      scope_type: 'ASSET',
      scope_id: 'BTC',
      as_of: '2026-04-17T00:00:00Z',
    }),
    subject_class: L7ValidationSubjectClass.STATE_CLAIM,
    hybrid_subject_classes: [],
    claim_family: 'price_strength',
    claim_name: 'price_strength_state',
    claim_version: '1.0.0',
    subject_template_id: buildSubjectTemplateId('price_strength', 'price_strength_state', '1.0.0'),
    scope_type: 'ASSET',
    scope_id: 'BTC',
    as_of: '2026-04-17T00:00:00Z',
    validation_window: makeWindow(),
    supporting_primitive_refs: [
      'l6.feature.price.strength_score',
      'l6.feature.participation.active_wallets',
    ],
    required_confirmation_surfaces: ['l6.feature.price.strength_score'],
    required_challenge_surfaces: ['l6.feature.price.vol_regime', 'l6.feature.flow.netflow'],
    support_minimums: { support: 2, challenge: 1 },
    challenge_minimums: { support: 2, challenge: 1 },
    materiality_class: L7MaterialityClass.STANDARD,
    evidence_requirements: {
      min_support_surfaces: 2,
      min_challenge_surfaces: 1,
      required_support_patterns: ['PRICE_FAMILY', 'PARTICIPATION_FAMILY'],
      required_challenge_patterns: ['PRICE_FAMILY', 'FLOW_FAMILY'],
      evidence_pack_policy: 'REQUIRED',
    },
    subject_evidence_pack_policy: 'REQUIRED',
    expected_risk_overhang_types: [],
    regime_assumption_profile: { declared: false, regime_tags: [], compatibility_mode: 'NONE' },
    ambiguity_tolerance_profile: { max_stale_seconds: null, max_missing_required_surfaces: 0, max_ambiguity_score: 0.5, max_degradation_score: null },
    staleness_tolerance_profile: { max_stale_seconds: 3600, max_missing_required_surfaces: 0, max_ambiguity_score: null, max_degradation_score: null },
    incompleteness_tolerance_profile: { max_stale_seconds: null, max_missing_required_surfaces: 0, max_ambiguity_score: null, max_degradation_score: null },
    degradation_tolerance_profile: { max_stale_seconds: null, max_missing_required_surfaces: 0, max_ambiguity_score: null, max_degradation_score: 0.5 },
    subject_materialization_policy: 'ON_DEMAND',
    lineage_refs: { trace_id: 'trace-abc', manifest_id: 'mfst-xyz', upstream_refs: ['l6.manifest.price'] },
    created_by: 'test-harness',
    created_at: '2026-04-17T00:00:00Z',
    description: 'Tests whether price strength is materially true at present',
  };
  return { ...base, ...overrides };
}

function makeBundle(subjectId: string, overrides: Partial<L7ContradictionBundle> = {}): L7ContradictionBundle {
  const records: readonly L7ContradictionRecord[] = [
    {
      contradiction_record_id: 'cr-1',
      family: L7ContradictionFamily.PRICE_FLOW_DIVERGENCE,
      severity: L7ContradictionSeverity.MATERIAL,
      support_ref: 'l6.feature.price.strength_score',
      challenge_ref: 'l6.feature.flow.netflow',
      detected_at: '2026-04-17T00:00:00Z',
      stale_support: false,
      missing_support: false,
      evidence_ref: 'ev-1',
      rationale: 'price up, netflow out',
    },
  ];
  const base: L7ContradictionBundle = {
    contradiction_bundle_id: buildContradictionBundleId(subjectId, '2026-04-17T00:00:00Z', 'run-1'),
    validation_subject_id: subjectId,
    scope_type: 'ASSET',
    scope_id: 'BTC',
    as_of: '2026-04-17T00:00:00Z',
    contradiction_records: records,
    contradiction_cluster_count: 1,
    highest_severity: computeHighestSeverity(records),
    dominant_contradiction_family: computeDominantFamily(records),
    blocked_confirmation_surfaces: [],
    stale_support_refs: [],
    missing_support_refs: [],
    lineage_refs: { trace_id: 'trace-abc', manifest_id: 'mfst-xyz' },
    compute_run_id: 'run-1',
    replay_hash: canonicalReplayHash(records),
  };
  return { ...base, ...overrides };
}

function makeConfidence(subjectId: string, overrides: Partial<L7ConfidenceAssessment> = {}): L7ConfidenceAssessment {
  const components = {
    source_trust_component: 0.8,
    freshness_component: 0.7,
    feature_completeness_component: 0.7,
    cross_source_agreement_component: 0.6,
    regime_compatibility_component: 0.5,
    historical_reliability_component: 0.6,
    contradiction_penalty_component: -0.1,
  };
  const score = 0.55;
  const base: L7ConfidenceAssessment = {
    validation_subject_id: subjectId,
    confidence_score: score,
    confidence_band: bandForScore(score),
    components,
    cap_chain: [],
    restriction_profile_ref: null,
    rationale_codes: ['baseline'],
    lineage_refs: { trace_id: 'trace-abc', manifest_id: 'mfst-xyz' },
    compute_run_id: 'run-1',
    replay_hash: canonicalReplayHash(components),
  };
  return { ...base, ...overrides };
}

function makeRestriction(subjectId: string, overrides: Partial<L7ClaimRestrictionProfile> = {}): L7ClaimRestrictionProfile {
  const rights: readonly L7RestrictionRight[] = [
    L7RestrictionRight.USABLE_FOR_REGIME_INPUT,
    L7RestrictionRight.USABLE_FOR_SCENARIO_WEIGHTING,
  ];
  const base: L7ClaimRestrictionProfile = {
    restriction_profile_id: buildRestrictionProfileId(subjectId, 'run-1'),
    validation_subject_id: subjectId,
    downstream_use_rights: rights,
    requires_contradiction_disclosure: false,
    requires_additional_confirmation: false,
    allowed_for_regime_input: true,
    allowed_for_scenario_weighting: true,
    allowed_for_deterministic_scoring: false,
    allowed_for_final_judgment: false,
    evidence_only_mode: false,
    restriction_reasons: [L7RestrictionReasonCode.WEAK_SUPPORT],
    lineage_refs: { trace_id: 'trace-abc', manifest_id: 'mfst-xyz' },
    compute_run_id: 'run-1',
    replay_hash: canonicalReplayHash(rights),
  };
  return { ...base, ...overrides };
}

function makeAssessment(
  subjectId: string,
  overrides: Partial<L7ValidationAssessment> = {},
): L7ValidationAssessment {
  const base: L7ValidationAssessment = {
    validation_result_id: buildValidationResultId(subjectId, '2026-04-17T00:00:00Z', 'run-1'),
    validation_subject_id: subjectId,
    claim_family: 'price_strength',
    claim_version: '1.0.0',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    as_of: '2026-04-17T00:00:00Z',
    validation_class: L7ValidationClass.CONFIRMED,
    validation_modifiers: [],
    support_strength_score: 0.75,
    contradiction_bundle_ref: null,
    confidence_assessment_ref: null,
    restriction_profile_ref: null,
    staleness_flag: false,
    incompleteness_flag: false,
    ambiguity_flag: false,
    degradation_flag: false,
    evidence_pack_ref: 'ep-1',
    input_snapshot_ref: 'snap-1',
    compute_run_id: 'run-1',
    replay_hash: canonicalReplayHash({ subjectId, class: 'CONFIRMED' }),
    lineage_refs: { trace_id: 'trace-abc', manifest_id: 'mfst-xyz' },
  };
  return { ...base, ...overrides };
}

// ═══════════════════════════════════════════════════════════════
// BAND A — Validation doctrine and subjectization
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Validation doctrine and subjectization ═══');
resetObjectAuditLog();

assert(ALL_VALIDATION_SUBJECT_CLASSES.length === 9, 'A.1 — 9 subject classes');
assert(ALL_VALIDATION_OUTPUT_CLASSES.length === 4, 'A.2 — 4 output classes');
assert(ALL_VALIDATION_CLASSES.length === 7, 'A.3 — 7 validation classes');
assert(ALL_VALIDATION_MODIFIERS.length === 6, 'A.4 — 6 validation modifiers');
assert(ALL_MATERIALITY_CLASSES.length === 4, 'A.5 — 4 materiality classes');
assert(ALL_CONTRADICTION_SEVERITIES.length === 5, 'A.6 — 5 contradiction severities');
assert(ALL_CONTRADICTION_FAMILIES.length === 10, 'A.7 — 10 contradiction families');
assert(ALL_CONFIDENCE_BANDS.length === 5, 'A.8 — 5 confidence bands');
assert(ALL_RESTRICTION_RIGHTS.length === 8, 'A.9 — 8 restriction rights');
assert(ALL_RESTRICTION_REASON_CODES.length === 10, 'A.10 — 10 restriction reason codes');
assert(ALL_OBJECT_VIOLATION_CODES.length >= 35, 'A.11 — rich object violation catalogue');

// Loose-text opinions must be rejected as subjects
const looseLikeObjects = [
  { claim_name: '' },
  { claim_name: 'it looks really bullish to me today oh wow what a run' },
  { claim_name: 'price_strength_state', supporting_primitive_refs: [] },
  { claim_name: 'price_strength_state', supporting_primitive_refs: ['l6.feature.price.strength_score'], scope_type: '' },
];
for (let i = 0; i < looseLikeObjects.length; i++) {
  const s = makeSubject({ ...looseLikeObjects[i], validation_subject_id: `vsub_loose_${i}` } as Partial<L7ValidationSubject>);
  const kind = validateSubjectKind(s);
  assert(!kind.valid, `A.12.${i} — loose text subject rejected`);
}

// Structured subject is accepted
const goodSubject = makeSubject();
const goodKind = validateSubjectKind(goodSubject);
assert(goodKind.valid, 'A.13 — structured subject accepted by kind validator');

// Forbidden judgment/recommendation leak in naming
const leakSubject = makeSubject({ claim_name: 'buy_ready_validation', validation_subject_id: 'vsub_leak' });
const leakKind = validateSubjectKind(leakSubject);
assert(!leakKind.valid, 'A.14 — judgment-leak subject rejected by kind validator');
assert(leakKind.issues.some(i => i.code === L7ObjectViolationCode.SUBJECT_JUDGMENT_LEAK), 'A.15 — judgment leak code emitted');

// Materiality postures are addressable
for (const cls of ALL_MATERIALITY_CLASSES) {
  assert(getMaterialityPosture(cls).class === cls, `A.16.${cls} — materiality posture present`);
}
assert(MATERIALITY_POSTURES[L7MaterialityClass.CRITICAL].blocksOnUnresolvedContradiction, 'A.17 — CRITICAL blocks on contradiction');
assert(!MATERIALITY_POSTURES[L7MaterialityClass.LOW].blocksOnUnresolvedContradiction, 'A.18 — LOW does not block');

// Subjectization law — identity generator is deterministic
const id1 = buildValidationSubjectId({ claim_family: 'x', claim_name: 'y', claim_version: '1.0.0', scope_type: 'ASSET', scope_id: 'BTC', as_of: '2026-01-01T00:00:00Z' });
const id2 = buildValidationSubjectId({ claim_family: 'x', claim_name: 'y', claim_version: '1.0.0', scope_type: 'ASSET', scope_id: 'BTC', as_of: '2026-01-01T00:00:00Z' });
const id3 = buildValidationSubjectId({ claim_family: 'x', claim_name: 'y', claim_version: '1.0.0', scope_type: 'ASSET', scope_id: 'ETH', as_of: '2026-01-01T00:00:00Z' });
assert(id1 === id2, 'A.19 — subject id deterministic');
assert(id1 !== id3, 'A.20 — subject id changes with scope');

// Window validator
assert(validateValidationWindow(makeWindow()).valid, 'A.21 — valid rolling window');
assert(!validateValidationWindow({ ...makeWindow(), lookback_seconds: 0 }).valid, 'A.22 — invalid rolling window (no lookback)');
assert(!validateValidationWindow({ ...makeWindow(), kind: 'POINT_IN_TIME', lookback_seconds: 100 } as L7ValidationWindow).valid, 'A.23 — PIT with lookback rejected');
assert(!validateValidationWindow({ ...makeWindow(), kind: 'CALENDAR_WINDOW', calendar_tag: null } as L7ValidationWindow).valid, 'A.24 — calendar without tag rejected');
assert(!validateValidationWindow({ ...makeWindow(), timezone: '' } as L7ValidationWindow).valid, 'A.25 — missing timezone rejected');

// classifySupportPatterns recognises standard families
const patterns = classifySupportPatterns(['l6.feature.price.strength_score', 'l6.feature.flow.netflow', 'l6.event.unlock.pending']);
assert(patterns.includes('PRICE_FAMILY'), 'A.26 — price family classified');
assert(patterns.includes('FLOW_FAMILY'), 'A.27 — flow family classified');
assert(patterns.includes('EVENT_FAMILY'), 'A.28 — event family classified');

// ═══════════════════════════════════════════════════════════════
// BAND B — Subject classes and contracts
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Subject classes and contracts ═══');
resetObjectAuditLog();

for (const cls of ALL_VALIDATION_SUBJECT_CLASSES) {
  assert(isRegisteredSubjectClass(cls), `B.1.${cls} — registered`);
  assert(!!getSubjectClassDescriptor(cls), `B.2.${cls} — descriptor present`);
}

assert(!isRegisteredSubjectClass('FAKE_CLAIM'), 'B.3 — unregistered class rejected');
assert(SUBJECT_CLASS_DESCRIPTORS.length === 9, 'B.4 — 9 class descriptors');

const classReg = getDefaultSubjectClassRegistry();
assert(classReg.list().length === 9, 'B.5 — registry exposes 9 classes');
assert(subjectClassAllowsScope(L7ValidationSubjectClass.STATE_CLAIM, 'ASSET'), 'B.6 — STATE_CLAIM allows ASSET');
assert(!subjectClassAllowsScope(L7ValidationSubjectClass.NARRATIVE_CLAIM, 'PORTFOLIO'), 'B.7 — NARRATIVE_CLAIM does not allow PORTFOLIO');
assert(classReg.minSupportCount(L7ValidationSubjectClass.ALIGNMENT_CLAIM) === 3, 'B.8 — alignment requires >=3 support');

// Contract validator accepts a valid subject
const cvr_good = validateValidationSubjectContract(goodSubject);
assert(cvr_good.valid, `B.9 — valid subject passes contract validator (${cvr_good.issues.length} issues)`);

// Missing identity
const bad1 = validateValidationSubjectContract(makeSubject({ validation_subject_id: '' }));
assert(!bad1.valid, 'B.10 — missing validation_subject_id rejected');
assert(bad1.issues.some(i => i.code === L7ObjectViolationCode.SUBJECT_MISSING_IDENTITY), 'B.11 — identity code assigned');

// Missing version
const bad2 = validateValidationSubjectContract(makeSubject({ claim_version: '' }));
assert(!bad2.valid, 'B.12 — missing version rejected');
assert(bad2.issues.some(i => i.code === L7ObjectViolationCode.SUBJECT_MISSING_VERSION), 'B.13 — version code assigned');

// Missing scope
const bad3 = validateValidationSubjectContract(makeSubject({ scope_id: '' }));
assert(!bad3.valid, 'B.14 — missing scope rejected');
assert(bad3.issues.some(i => i.code === L7ObjectViolationCode.SUBJECT_MISSING_SCOPE), 'B.15 — scope code assigned');

// Bad as_of
const bad4 = validateValidationSubjectContract(makeSubject({ as_of: 'not-a-timestamp' }));
assert(!bad4.valid, 'B.16 — bad timestamp rejected');
assert(bad4.issues.some(i => i.code === L7ObjectViolationCode.SUBJECT_MISSING_TIME_ANCHOR), 'B.17 — time anchor code assigned');

// Missing window
const bad5 = validateValidationSubjectContract(makeSubject({
  validation_window: { ...makeWindow(), kind: 'CALENDAR_WINDOW', calendar_tag: null },
}));
assert(!bad5.valid, 'B.18 — invalid window rejected');
assert(bad5.issues.some(i => i.code === L7ObjectViolationCode.SUBJECT_INVALID_WINDOW), 'B.19 — window code assigned');

// Missing lineage
const bad6 = validateValidationSubjectContract(makeSubject({
  lineage_refs: { trace_id: '', manifest_id: '', upstream_refs: [] },
}));
assert(!bad6.valid, 'B.20 — missing lineage rejected');
assert(bad6.issues.some(i => i.code === L7ObjectViolationCode.SUBJECT_MISSING_LINEAGE), 'B.21 — lineage code assigned');

// Scope illegal for class
const bad7 = validateValidationSubjectContract(makeSubject({
  subject_class: L7ValidationSubjectClass.NARRATIVE_CLAIM,
  scope_type: 'PORTFOLIO',
  claim_name: 'narrative_breadth_state',
}));
assert(!bad7.valid, 'B.22 — scope illegal for class rejected');
assert(bad7.issues.some(i => i.code === L7ObjectViolationCode.SUBJECT_SCOPE_ILLEGAL_FOR_CLASS), 'B.23 — scope code assigned');

// Insufficient support
const bad8 = validateValidationSubjectContract(makeSubject({
  supporting_primitive_refs: ['l6.feature.price.strength_score'],
}));
assert(!bad8.valid, 'B.24 — insufficient support rejected');
assert(bad8.issues.some(i => i.code === L7ObjectViolationCode.SUBJECT_MISSING_SUPPORT), 'B.25 — missing support code assigned');

// Regime required but undeclared
const bad9 = validateValidationSubjectContract(makeSubject({
  regime_assumption_profile: { declared: false, regime_tags: [], compatibility_mode: 'REQUIRED' },
}));
assert(!bad9.valid, 'B.26 — undeclared required regime rejected');
assert(bad9.issues.some(i => i.code === L7ObjectViolationCode.SUBJECT_REGIME_UNDECLARED), 'B.27 — regime code assigned');

// Forbidden shortcut in description
const bad10 = validateValidationSubjectContract(makeSubject({
  description: 'Uses the price_only_state shortcut to infer STATE_CLAIM',
}));
assert(!bad10.valid, 'B.28 — forbidden shortcut rejected');
assert(bad10.issues.some(i => i.code === L7ObjectViolationCode.SUBJECT_FORBIDDEN_SHORTCUT), 'B.29 — forbidden shortcut code assigned');

// Hybrid subject — underdeclared
const bad11 = validateSubjectKind(makeSubject({
  hybrid_subject_classes: [L7ValidationSubjectClass.STATE_CLAIM],
}));
assert(!bad11.valid, 'B.30 — underdeclared hybrid rejected');
assert(bad11.issues.some(i => i.code === L7ObjectViolationCode.SUBJECT_UNDERDECLARED_HYBRID), 'B.31 — underdeclared hybrid code assigned');

// Hybrid subject — valid multi-class
const goodHybrid = validateSubjectKind(makeSubject({
  hybrid_subject_classes: [L7ValidationSubjectClass.FLOW_CLAIM],
  required_challenge_surfaces: ['l6.feature.price.vol_regime', 'l6.feature.flow.exchange_outflow'],
  supporting_primitive_refs: [
    'l6.feature.price.strength_score',
    'l6.feature.participation.active_wallets',
    'l6.feature.flow.netflow',
    'l6.feature.onchain.tx_count',
  ],
}));
assert(goodHybrid.valid, `B.32 — valid hybrid accepted (${goodHybrid.issues.length} issues)`);

// Subject registry template round-trip
const subjReg = new ValidationSubjectRegistry();
subjReg.register({
  subject_template_id: goodSubject.subject_template_id,
  claim_family: goodSubject.claim_family,
  claim_name: goodSubject.claim_name,
  claim_version: goodSubject.claim_version,
  subject_class: goodSubject.subject_class,
  hybrid_subject_classes: goodSubject.hybrid_subject_classes,
  legal_scope_types: ['ASSET', 'MARKET'],
  materiality_posture: L7MaterialityClass.STANDARD,
  evidence_profile: goodSubject.evidence_requirements,
  description: 'test template',
});
assert(subjReg.has(goodSubject.subject_template_id), 'B.33 — registry retains template');
assert(subjReg.templateMatchesSubject(goodSubject), 'B.34 — template matches subject');
assert(subjReg.versionsOf('price_strength', 'price_strength_state').includes('1.0.0'), 'B.35 — registry tracks versions');
let threw = false;
try {
  subjReg.register({
    subject_template_id: goodSubject.subject_template_id,
    claim_family: goodSubject.claim_family,
    claim_name: goodSubject.claim_name,
    claim_version: goodSubject.claim_version,
    subject_class: goodSubject.subject_class,
    hybrid_subject_classes: [],
    legal_scope_types: ['ASSET'],
    materiality_posture: L7MaterialityClass.STANDARD,
    evidence_profile: goodSubject.evidence_requirements,
    description: 'dup',
  });
} catch { threw = true; }
assert(threw, 'B.36 — duplicate template rejected');

// Default subject registry is an independent instance
assert(getDefaultSubjectRegistry() !== subjReg, 'B.37 — default subject registry is distinct instance');

// ═══════════════════════════════════════════════════════════════
// BAND C — Output classes
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Output classes ═══');
resetObjectAuditLog();

const outReg = getDefaultOutputClassRegistry();
assert(outReg.list().length === 4, 'C.1 — 4 output class descriptors');
for (const cls of ALL_VALIDATION_OUTPUT_CLASSES) {
  assert(outReg.isRegistered(cls), `C.2.${cls} — registered`);
  assert(outReg.requiredFields(cls).length >= 5, `C.3.${cls} — has required fields`);
  assert(outReg.downstreamConsumers(cls).length >= 1, `C.4.${cls} — has downstream consumers`);
}
assert(!outReg.isRegistered('FREEFORM_NARRATIVE'), 'C.5 — unregistered class rejected');
assert(OUTPUT_CLASS_DESCRIPTORS.length === 4, 'C.6 — module-level descriptors');

// ValidationAssessment validator
const goodAssess = makeAssessment(goodSubject.validation_subject_id);
const ar = validateValidationAssessment(goodAssess);
assert(ar.valid, `C.7 — valid assessment accepted (${ar.issues.length} issues)`);

// Missing identity
const badAssess1 = validateValidationAssessment(makeAssessment(goodSubject.validation_subject_id, { validation_result_id: '' }));
assert(!badAssess1.valid, 'C.8 — missing result id rejected');
assert(badAssess1.issues.some(i => i.code === L7ObjectViolationCode.ASSESSMENT_MISSING_IDENTITY), 'C.9 — assessment identity code');

// Missing subject link
const badAssess2 = validateValidationAssessment(makeAssessment(goodSubject.validation_subject_id, { validation_subject_id: '' }));
assert(!badAssess2.valid, 'C.10 — missing subject link rejected');
assert(badAssess2.issues.some(i => i.code === L7ObjectViolationCode.ASSESSMENT_MISSING_SUBJECT_LINK), 'C.11 — subject link code');

// Illegal class
const badAssess3 = validateValidationAssessment(makeAssessment(goodSubject.validation_subject_id, {
  validation_class: 'FINAL_SCENARIO_WINNER' as L7ValidationClass,
}));
assert(!badAssess3.valid, 'C.12 — illegal class rejected');
assert(badAssess3.issues.some(i => i.code === L7ObjectViolationCode.ASSESSMENT_ILLEGAL_CLASS), 'C.13 — illegal class code');

// Missing replay hash
const badAssess4 = validateValidationAssessment(makeAssessment(goodSubject.validation_subject_id, { replay_hash: '' }));
assert(!badAssess4.valid, 'C.14 — missing replay hash rejected');
assert(badAssess4.issues.some(i => i.code === L7ObjectViolationCode.ASSESSMENT_MISSING_REPLAY_HASH), 'C.15 — replay hash code');

// Contradiction required but absent
const badAssess5 = validateValidationAssessment(makeAssessment(goodSubject.validation_subject_id, {
  validation_class: L7ValidationClass.CONFLICTING,
  contradiction_bundle_ref: null,
}));
assert(!badAssess5.valid, 'C.16 — conflict without bundle rejected');
assert(badAssess5.issues.some(i => i.code === L7ObjectViolationCode.ASSESSMENT_CONTRADICTION_MISSING), 'C.17 — contradiction missing code');

// Flag inconsistency
const badAssess6 = validateValidationAssessment(makeAssessment(goodSubject.validation_subject_id, {
  staleness_flag: true,
  validation_modifiers: [], // modifier missing
}));
assert(!badAssess6.valid, 'C.18 — flag/modifier mismatch rejected');
assert(badAssess6.issues.some(i => i.code === L7ObjectViolationCode.ASSESSMENT_FLAG_INCONSISTENCY), 'C.19 — flag inconsistency code');

// support_strength_score out of range
const badAssess7 = validateValidationAssessment(makeAssessment(goodSubject.validation_subject_id, { support_strength_score: 1.7 }));
assert(!badAssess7.valid, 'C.20 — score out of range rejected');

// Helpers
assert(classRequiresContradictionBundle(L7ValidationClass.CONFLICTING), 'C.21 — CONFLICTING requires bundle');
assert(classRequiresContradictionBundle(L7ValidationClass.DEGRADED), 'C.22 — DEGRADED requires bundle');
assert(!classRequiresContradictionBundle(L7ValidationClass.CONFIRMED), 'C.23 — CONFIRMED does not require bundle');
assert(modifiersRequireContradictionBundle([L7ValidationModifier.UNRESOLVED_CONTRADICTION_PRESENT]), 'C.24 — unresolved modifier requires bundle');
assert(checkFlagConsistency(goodAssess).consistent, 'C.25 — good assessment is flag-consistent');

// Contradiction bundle validator
const goodBundle = makeBundle(goodSubject.validation_subject_id);
const br = validateContradictionBundle(goodBundle);
assert(br.valid, `C.26 — valid bundle accepted (${br.issues.length} issues)`);

// Bundle with no records rejected
const badBundle1 = validateContradictionBundle(makeBundle(goodSubject.validation_subject_id, { contradiction_records: [] }));
assert(!badBundle1.valid, 'C.27 — bundle with no records rejected');
assert(badBundle1.issues.some(i => i.code === L7ObjectViolationCode.CONTRADICTION_MISSING_RECORDS), 'C.28 — missing records code');

// Bundle with mismatched highest_severity
const badBundle2 = validateContradictionBundle(makeBundle(goodSubject.validation_subject_id, {
  highest_severity: L7ContradictionSeverity.INFO,
}));
assert(!badBundle2.valid, 'C.29 — mismatched highest severity rejected');

// Bundle with untyped (unregistered) family
const records3: readonly L7ContradictionRecord[] = [{
  contradiction_record_id: 'cr-x',
  family: 'FAKE_FAMILY' as L7ContradictionFamily,
  severity: L7ContradictionSeverity.MATERIAL,
  support_ref: 'a', challenge_ref: 'b',
  detected_at: '2026-04-17T00:00:00Z',
  stale_support: false, missing_support: false, evidence_ref: null, rationale: 'x',
}];
const badBundle3 = validateContradictionBundle({
  ...goodBundle,
  contradiction_records: records3,
  highest_severity: computeHighestSeverity(records3),
  dominant_contradiction_family: records3[0].family,
});
assert(!badBundle3.valid, 'C.30 — untyped family rejected');
assert(badBundle3.issues.some(i => i.code === L7ObjectViolationCode.CONTRADICTION_MISSING_FAMILY), 'C.31 — missing family code');

// Missing lineage
const badBundle4 = validateContradictionBundle({
  ...goodBundle,
  lineage_refs: { trace_id: '', manifest_id: '' },
});
assert(!badBundle4.valid, 'C.32 — missing bundle lineage rejected');
assert(badBundle4.issues.some(i => i.code === L7ObjectViolationCode.CONTRADICTION_MISSING_LINEAGE), 'C.33 — bundle lineage code');

// compareSeverity + dominant family
assert(compareSeverity(L7ContradictionSeverity.BLOCKING, L7ContradictionSeverity.INFO) > 0, 'C.34 — severity ordering');
assert(computeDominantFamily(goodBundle.contradiction_records) === L7ContradictionFamily.PRICE_FLOW_DIVERGENCE, 'C.35 — dominant family');

// Confidence assessment validator
const goodConf = makeConfidence(goodSubject.validation_subject_id);
const cr = validateConfidenceAssessment(goodConf);
assert(cr.valid, `C.36 — valid confidence accepted (${cr.issues.length} issues)`);

// Score out of range
const badConf1 = validateConfidenceAssessment(makeConfidence(goodSubject.validation_subject_id, { confidence_score: 1.5 }));
assert(!badConf1.valid, 'C.37 — confidence score > 1 rejected');
assert(badConf1.issues.some(i => i.code === L7ObjectViolationCode.CONFIDENCE_SCORE_OUT_OF_RANGE), 'C.38 — score range code');

// Band mismatch
const badConf2 = validateConfidenceAssessment(makeConfidence(goodSubject.validation_subject_id, {
  confidence_score: 0.9,
  confidence_band: L7ConfidenceBand.VERY_LOW,
}));
assert(!badConf2.valid, 'C.39 — mismatched band rejected');
assert(badConf2.issues.some(i => i.code === L7ObjectViolationCode.CONFIDENCE_BAND_MISMATCH), 'C.40 — band mismatch code');

// Missing factors
const badConf3 = validateConfidenceAssessment({
  ...goodConf,
  components: undefined as unknown as L7ConfidenceAssessment['components'],
});
assert(!badConf3.valid, 'C.41 — missing factors rejected');
assert(badConf3.issues.some(i => i.code === L7ObjectViolationCode.CONFIDENCE_MISSING_FACTORS), 'C.42 — factors code');

// Missing lineage
const badConf4 = validateConfidenceAssessment({
  ...goodConf,
  lineage_refs: { trace_id: '', manifest_id: '' },
});
assert(!badConf4.valid, 'C.43 — confidence missing lineage rejected');
assert(badConf4.issues.some(i => i.code === L7ObjectViolationCode.CONFIDENCE_MISSING_LINEAGE), 'C.44 — confidence lineage code');

assert(bandForScore(0.95) === L7ConfidenceBand.VERY_HIGH, 'C.45 — 0.95 → VERY_HIGH');
assert(bandForScore(0.1) === L7ConfidenceBand.VERY_LOW, 'C.46 — 0.1 → VERY_LOW');
assert(bandMatchesScore(L7ConfidenceBand.MODERATE, 0.5), 'C.47 — band matches score');
for (const b of ALL_CONFIDENCE_BANDS) {
  assert(CONFIDENCE_BAND_RANGES[b].max > CONFIDENCE_BAND_RANGES[b].min, `C.48.${b} — band range non-empty`);
}

// Restriction profile validator
const goodRestr = makeRestriction(goodSubject.validation_subject_id);
const rr = validateClaimRestrictionProfile(goodRestr);
assert(rr.valid, `C.49 — valid restriction accepted (${rr.issues.length} issues)`);

// Empty rights
const badRestr1 = validateClaimRestrictionProfile({
  ...goodRestr,
  downstream_use_rights: [],
  allowed_for_regime_input: false,
  allowed_for_scenario_weighting: false,
});
assert(!badRestr1.valid, 'C.50 — empty rights rejected');
assert(badRestr1.issues.some(i => i.code === L7ObjectViolationCode.RESTRICTION_MISSING_RIGHTS), 'C.51 — missing rights code');

// Missing reasons on non-permissive right
const badRestr2 = validateClaimRestrictionProfile({
  ...goodRestr,
  downstream_use_rights: [L7RestrictionRight.EVIDENCE_ONLY],
  allowed_for_regime_input: false,
  allowed_for_scenario_weighting: false,
  allowed_for_deterministic_scoring: false,
  allowed_for_final_judgment: false,
  evidence_only_mode: true,
  restriction_reasons: [],
});
assert(!badRestr2.valid, 'C.52 — EVIDENCE_ONLY without reasons rejected');
assert(badRestr2.issues.some(i => i.code === L7ObjectViolationCode.RESTRICTION_MISSING_REASONS), 'C.53 — missing reasons code');

// Inconsistent rights (flag says allowed, right list excludes it)
const badRestr3 = validateClaimRestrictionProfile({
  ...goodRestr,
  allowed_for_final_judgment: true, // inconsistent with rights list
});
assert(!badRestr3.valid, 'C.54 — inconsistent flags rejected');
assert(badRestr3.issues.some(i => i.code === L7ObjectViolationCode.RESTRICTION_INCONSISTENT_RIGHT), 'C.55 — inconsistent code');

// Conflicting rights (NOT_USABLE + any other)
const badRestr4 = validateClaimRestrictionProfile({
  ...goodRestr,
  downstream_use_rights: [L7RestrictionRight.NOT_USABLE, L7RestrictionRight.USABLE_FOR_REGIME_INPUT],
  allowed_for_regime_input: true,
  allowed_for_scenario_weighting: false,
});
assert(!badRestr4.valid, 'C.56 — NOT_USABLE + other rejected');

// Unregistered restriction right
const badRestr5 = validateClaimRestrictionProfile({
  ...goodRestr,
  downstream_use_rights: ['FAKE_RIGHT' as L7RestrictionRight],
  allowed_for_regime_input: false,
  allowed_for_scenario_weighting: false,
});
assert(!badRestr5.valid, 'C.57 — unregistered right rejected');
assert(badRestr5.issues.some(i => i.code === L7ObjectViolationCode.RESTRICTION_UNAUTHORISED_DOWNSTREAM), 'C.58 — unauthorised downstream code');

// Missing lineage
const badRestr6 = validateClaimRestrictionProfile({
  ...goodRestr,
  lineage_refs: { trace_id: '', manifest_id: '' },
});
assert(!badRestr6.valid, 'C.59 — restriction missing lineage rejected');
assert(badRestr6.issues.some(i => i.code === L7ObjectViolationCode.RESTRICTION_MISSING_LINEAGE), 'C.60 — restriction lineage code');

// Rights consistency helper
assert(rightsAreInternallyConsistent(goodRestr), 'C.61 — good restriction is self-consistent');

// ═══════════════════════════════════════════════════════════════
// BAND D — Registry and audit behavior
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Registry and audit behavior ═══');
resetObjectAuditLog();

// Contradiction family registry
const famReg = getDefaultContradictionFamilyRegistry();
assert(famReg.list().length === 10, 'D.1 — 10 contradiction families');
for (const fam of ALL_CONTRADICTION_FAMILIES) {
  assert(famReg.isRegistered(fam), `D.2.${fam} — registered`);
  assert(!!famReg.defaultSeverity(fam), `D.3.${fam} — default severity`);
}
assert(!famReg.isRegistered('FAKE'), 'D.4 — unregistered family rejected');
assert(CONTRADICTION_FAMILY_DESCRIPTORS.length === 10, 'D.5 — descriptor count');

assert(famReg.blockingAllowed(L7ContradictionFamily.SIGNAL_STALENESS), 'D.6 — staleness blocking allowed');
assert(!famReg.blockingAllowed(L7ContradictionFamily.PRICE_FLOW_DIVERGENCE), 'D.7 — price/flow not blocking');

// Restriction right registry
const rrReg = getDefaultRestrictionRightRegistry();
assert(rrReg.list().length === 8, 'D.8 — 8 restriction rights');
for (const r of ALL_RESTRICTION_RIGHTS) {
  assert(rrReg.isRegistered(r), `D.9.${r} — registered`);
}
assert(!rrReg.isRegistered('FAKE_RIGHT'), 'D.10 — unregistered right rejected');
assert(RESTRICTION_RIGHT_DESCRIPTORS.length === 8, 'D.11 — descriptor count');

assert(rrReg.grantsPositiveUse(L7RestrictionRight.USABLE_FOR_FINAL_JUDGMENT), 'D.12 — final judgment is positive use');
assert(!rrReg.grantsPositiveUse(L7RestrictionRight.NOT_USABLE), 'D.13 — NOT_USABLE is not positive');
assert(rrReg.conflictsWith(L7RestrictionRight.NOT_USABLE).length >= 5, 'D.14 — NOT_USABLE conflicts with many');
assert(rrReg.conflictsWith(L7RestrictionRight.EVIDENCE_ONLY).includes(L7RestrictionRight.USABLE_FOR_FINAL_JUDGMENT), 'D.15 — EVIDENCE_ONLY vs FINAL_JUDGMENT');
assert(rrReg.allowedReasonCodesFor(L7RestrictionRight.NOT_USABLE).length >= 1, 'D.16 — NOT_USABLE reasons present');

// Output class registry instance isolation
const customOutReg = new ValidationOutputClassRegistry();
assert(customOutReg.list().length === 4, 'D.17 — custom output registry works');

// Custom subject class registry
const customClassReg = new ValidationSubjectClassRegistry();
assert(customClassReg.list().length === 9, 'D.18 — custom class registry works');
assert(customClassReg.forbiddenShortcuts(L7ValidationSubjectClass.SUBSTANCE_CLAIM).length >= 1, 'D.19 — substance has forbidden shortcut list');

// Audit — invalid subject emission
emitInvalidSubjectViolation('test-source-A', L7ObjectViolationCode.SUBJECT_MISSING_IDENTITY, null, 'missing id');
emitInvalidOutputViolation('test-source-B', L7ObjectViolationCode.ASSESSMENT_ILLEGAL_CLASS, 'VALIDATION_ASSESSMENT', 'bad class');
emitContradictionLeakViolation('test-source-C', 'vsub_x', 'contradiction laundered');
emitConfidenceFactorViolation('test-source-D', 'vsub_x', 'factors missing');
emitRestrictionClarityViolation('test-source-E', 'vsub_x', 'reasons missing');
emitSubjectJudgmentLeakViolation('test-source-F', 'vsub_x', 'judgment leak');
emitObjectAuditRecord({
  violationCode: L7ObjectViolationCode.SUBJECT_LOOSE_TEXT_OPINION,
  source: 'test-source-G',
  subjectId: null,
  outputClass: null,
  detail: 'loose',
  context: {},
  severity: 'MEDIUM',
});

assert(hasAnyObjectViolations(), 'D.20 — audit has violations');
assert(getObjectViolationCount() === 7, 'D.21 — 7 audit records');
assert(getObjectAuditLog().length === 7, 'D.22 — audit log length');
assert(getObjectCriticalViolations().length === 2, 'D.23 — critical = contradiction-leak + judgment-leak');
assert(getObjectViolationsByCode(L7ObjectViolationCode.SUBJECT_MISSING_IDENTITY).length === 1, 'D.24 — by code subject missing id');
assert(getObjectViolationsByCode(L7ObjectViolationCode.ASSESSMENT_CONTRADICTION_MISSING).length === 1, 'D.25 — by code contradiction leak');
assert(getObjectViolationsByCode(L7ObjectViolationCode.CONFIDENCE_MISSING_FACTORS).length === 1, 'D.26 — by code factors');
assert(getObjectViolationsByCode(L7ObjectViolationCode.RESTRICTION_MISSING_REASONS).length === 1, 'D.27 — by code reasons');
assert(getObjectViolationsByCode(L7ObjectViolationCode.SUBJECT_JUDGMENT_LEAK).length === 1, 'D.28 — by code judgment leak');
assert(getObjectViolationsByCode(L7ObjectViolationCode.SUBJECT_LOOSE_TEXT_OPINION).length === 1, 'D.29 — by code loose text');

// Audit reset
resetObjectAuditLog();
assert(getObjectViolationCount() === 0, 'D.30 — audit reset works');
assert(!hasAnyObjectViolations(), 'D.31 — audit has no violations after reset');

// L7ObjectError is constructible
const err = new L7ObjectError(L7ObjectViolationCode.SUBJECT_MISSING_IDENTITY, 'test', { a: 1 });
assert(err.code === L7ObjectViolationCode.SUBJECT_MISSING_IDENTITY, 'D.32 — error code');
assert(err.message.includes('SUBJECT_MISSING_IDENTITY'), 'D.33 — error message includes code');
assert(err.details.a === 1, 'D.34 — error details');
assert(err instanceof Error, 'D.35 — error is Error');

// Required-field catalogue integrity
for (const cls of ALL_VALIDATION_OUTPUT_CLASSES) {
  assert(REQUIRED_FIELDS_BY_OUTPUT[cls].length >= 5, `D.36.${cls} — has ≥5 required fields`);
  assert(REQUIRED_FIELDS_BY_OUTPUT[cls].includes('replay_hash') || cls === L7ValidationOutputClass.CONFIDENCE_ASSESSMENT || cls === L7ValidationOutputClass.CLAIM_RESTRICTION_PROFILE || cls === L7ValidationOutputClass.CONTRADICTION_BUNDLE || cls === L7ValidationOutputClass.VALIDATION_ASSESSMENT, `D.37.${cls} — includes replay_hash`);
}

// ═══════════════════════════════════════════════════════════════
// BAND E — Invariants and L7.1 integration
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Invariants and L7.1 integration ═══');
resetObjectAuditLog();

const okSubjectForInv = makeSubject();
const okAssessWithBundle = makeAssessment(okSubjectForInv.validation_subject_id, {
  validation_class: L7ValidationClass.CONFLICTING,
  validation_modifiers: [L7ValidationModifier.UNRESOLVED_CONTRADICTION_PRESENT],
  contradiction_bundle_ref: makeBundle(okSubjectForInv.validation_subject_id).contradiction_bundle_id,
  confidence_assessment_ref: 'conf-ref-1',
  restriction_profile_ref: 'restr-ref-1',
});
const okBundle = makeBundle(okSubjectForInv.validation_subject_id, {
  contradiction_bundle_id: okAssessWithBundle.contradiction_bundle_ref ?? '',
});
const okConf = makeConfidence(okSubjectForInv.validation_subject_id);
const okRestr = makeRestriction(okSubjectForInv.validation_subject_id);

const invInput = {
  subjects: [okSubjectForInv],
  assessments: [okAssessWithBundle],
  bundles: [okBundle],
  confidences: [okConf],
  restrictions: [okRestr],
  looseTextSubjects: [
    { claim_name: 'hey this looks good', supporting_primitive_refs: [], scope_type: '' },
    {},
  ],
};

const invs = runAllL7_2Invariants(invInput);
assert(invs.length === 7, 'E.1 — 7 invariants defined');
for (const inv of invs) {
  assert(inv.holds, `E.2 — ${inv.id} holds (${inv.evidence})`);
}
assert(checkINV_72_A(invInput).holds, 'E.3 — INV-7.2-A holds');
assert(checkINV_72_B(invInput).holds, 'E.4 — INV-7.2-B holds');
assert(checkINV_72_C(invInput).holds, 'E.5 — INV-7.2-C holds');
assert(checkINV_72_D(invInput).holds, 'E.6 — INV-7.2-D holds');
assert(checkINV_72_E(invInput).holds, 'E.7 — INV-7.2-E holds');
assert(checkINV_72_F(invInput).holds, 'E.8 — INV-7.2-F holds');
assert(checkINV_72_G(invInput).holds, 'E.9 — INV-7.2-G holds');

// Invariant counter-examples
const badInvInputA = {
  ...invInput,
  subjects: [makeSubject({ validation_subject_id: '', scope_type: '' as L7ValidationSubject['scope_type'], scope_id: '' })],
};
assert(!checkINV_72_B(badInvInputA).holds, 'E.10 — INV-7.2-B fails on missing identity/scope');

const badInvInputC = {
  ...invInput,
  subjects: [makeSubject({ subject_class: 'FAKE_CLASS' as L7ValidationSubjectClass })],
};
assert(!checkINV_72_C(badInvInputC).holds, 'E.11 — INV-7.2-C fails on unregistered class');

const badInvInputD = {
  ...invInput,
  assessments: [makeAssessment(okSubjectForInv.validation_subject_id, { validation_class: 'BAD' as L7ValidationClass })],
};
assert(!checkINV_72_D(badInvInputD).holds, 'E.12 — INV-7.2-D fails on illegal output class');

const badInvInputE = {
  ...invInput,
  assessments: [
    makeAssessment(okSubjectForInv.validation_subject_id, {
      validation_class: L7ValidationClass.CONFLICTING,
      validation_modifiers: [L7ValidationModifier.UNRESOLVED_CONTRADICTION_PRESENT],
      contradiction_bundle_ref: null, // missing required bundle
    }),
  ],
};
assert(!checkINV_72_E(badInvInputE).holds, 'E.13 — INV-7.2-E fails on missing contradiction bundle');

const badInvInputG = {
  ...invInput,
  restrictions: [makeRestriction(okSubjectForInv.validation_subject_id, {
    downstream_use_rights: [],
    allowed_for_regime_input: false,
    allowed_for_scenario_weighting: false,
  })],
};
assert(!checkINV_72_G(badInvInputG).holds, 'E.14 — INV-7.2-G fails on empty rights');

// Integration with L7.1 — forbidden naming still blocks subjects
const forbiddenNames = [
  'buy_ready_validation',
  'final_bullish_truth',
  'best_trade_confirmed',
  'scenario_winner',
  'trade_recommendation_ok',
];
for (let i = 0; i < forbiddenNames.length; i++) {
  const s = makeSubject({ claim_name: forbiddenNames[i], validation_subject_id: `leak_${i}` });
  const r = validateSubjectKind(s);
  assert(!r.valid, `E.15.${i} — "${forbiddenNames[i]}" rejected by kind validator`);
  assert(r.issues.some(is => is.code === L7ObjectViolationCode.SUBJECT_JUDGMENT_LEAK), `E.16.${i} — judgment leak code`);
}

// Canonical replay hash is deterministic and collision-free on trivial variations
const h1 = canonicalReplayHash({ a: 1, b: [2, 3] });
const h2 = canonicalReplayHash({ b: [2, 3], a: 1 });
const h3 = canonicalReplayHash({ a: 1, b: [2, 4] });
assert(h1 === h2, 'E.17 — replay hash stable across key order');
assert(h1 !== h3, 'E.18 — replay hash changes with content');
assert(h1.startsWith('rh_'), 'E.19 — replay hash prefixed');

// Downstream consumer discovery
for (const cls of ALL_VALIDATION_OUTPUT_CLASSES) {
  assert(outReg.downstreamConsumers(cls).includes('L8'), `E.20.${cls} — L8 is downstream consumer`);
}

// Full runAllL7_2Invariants with empty inputs still holds
const emptyInvs = runAllL7_2Invariants({
  subjects: [], assessments: [], bundles: [], confidences: [], restrictions: [],
});
for (const inv of emptyInvs) {
  assert(inv.holds, `E.21 — ${inv.id} vacuously holds on empty input`);
}

// ═══════════════════════════════════════════════════════════════
// Final report
// ═══════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(64)}`);
console.log(`L7.2 Certification: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(64));

if (failed > 0) {
  process.exit(1);
}
