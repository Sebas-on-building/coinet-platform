/**
 * L6.2 — Intelligence Primitive Doctrine and Primitive Law
 * Certification Test Suite
 *
 * 6 Bands:
 *   A — Feature doctrine legality
 *   B — Event doctrine legality
 *   C — Primitive kind law
 *   D — No hidden interpretation law
 *   E — Judgment leakage and contradiction law
 *   F — Audit surface and invariants
 */

import {
  L6PrimitiveClass,
  ALL_FEATURE_KINDS, L6FeatureKind,
  ALL_EVENT_KINDS, L6EventKind,
  ALL_TRANSFORMATION_CLASSES, L6TransformationClass,
  FEATURE_ONLY_TRANSFORMATIONS, EVENT_ONLY_TRANSFORMATIONS,
  isFeatureTransformation, isEventTransformation,
  ALL_NULL_POLICIES, L6NullPolicy, FORBIDDEN_NULL_POLICY_TOKENS, isForbiddenNullPolicyToken,
  ALL_LINEAGE_SCOPES, L6LineageScope, isCompleteLineagePolicy,
  ALL_CONTRADICTION_ARTIFACT_TYPES, L6ContradictionArtifactType,
  FORBIDDEN_COLLAPSE_TOKENS, isForbiddenCollapseToken, describesContradictionLegally,
  isValidPrimitiveId, isValidVersionTag, isValidFamilyName,
  L6ScopeType, L6ScopeGranularity, L6Directionality,
  L6LateDataPolicy, L6MaterializationPolicy, L6EvidencePackPolicy,
  L6FeatureValueKind, FEATURE_VALUE_SHAPE_BY_KIND,
  L6EventLifecycleState, L6EventSeverityLevel,
  FeatureContract, EventContract,
} from '../l6/contracts';

import {
  getFeatureKindDescriptor, isRegisteredFeatureKind, allFeatureKindDescriptors,
  featureKindAllowsValueShape, featureKindRequiredFields, featureKindForbiddenFields,
  getEventKindDescriptor, isRegisteredEventKind, allEventKindDescriptors,
  eventKindAllowsLifecycleShape, eventKindRequiredFields, eventKindForbiddenFields,
} from '../l6/registry';

import {
  L6PrimitiveViolationCode, ALL_PRIMITIVE_VIOLATION_CODES,
  validateFeatureContract, validateEventContract,
  validatePrimitiveSeparation, validateFeatureKind, validateEventKind,
  validateJudgmentLeakage, validateCommonPrimitiveContract,
  transformationClassMatchesPrimitiveClass,
  getForbiddenDescriptionPatterns, getForbiddenSeverityLabelPatterns,
  getForbiddenTransformationTokens,
  featureForbiddenLifecycleFields, eventRequiredChangeFields,
} from '../l6/validation';

import {
  resetPrimitiveAuditLog, emitPrimitiveAudit, emitValidationResult,
  getPrimitiveAuditLog, getCriticalPrimitiveViolations,
  getPrimitiveViolationsByCode, getPrimitiveAuditCount,
} from '../l6/constitution';

import {
  checkAllL62Invariants,
  checkINV_62_A, checkINV_62_B, checkINV_62_C, checkINV_62_D,
  checkINV_62_E, checkINV_62_F, checkINV_62_G,
  buildLegalFeature, buildLegalEvent,
} from '../l6/invariants';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; }
  else { failed++; console.error(`  ✗ FAIL: ${label}`); }
}

function resetAll(): void {
  resetPrimitiveAuditLog();
}

// ═══════════════════════════════════════════════════════════════
// BAND A — Feature Doctrine Legality
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Feature Doctrine Legality ═══');
resetAll();

{
  const legal = buildLegalFeature();
  const res = validateFeatureContract(legal);
  assert(res.valid, 'A.1 — Legal feature contract accepted');
  assert(legal.primitive_class === L6PrimitiveClass.FEATURE, 'A.2 — Feature class is FEATURE');
  assert(legal.feature_kind === L6FeatureKind.Z_SCORE_NORMALIZED, 'A.3 — Feature kind registered');
  assert(legal.event_link_policy.emitsStateOnly === true, 'A.4 — emitsStateOnly');
  assert(legal.event_link_policy.forbidsLifecycleFields === true, 'A.5 — forbidsLifecycleFields');
}

{
  const f = buildLegalFeature() as unknown as Record<string, unknown>;
  f.trigger_spec = { triggerId: 'x', kind: 'THRESHOLD', parameters: {} };
  f.lifecycle_policy = { shape: 'SIMPLE_ONSET_RESOLUTION', allowedStates: [], allowedTransitions: [] };
  const res = validateFeatureContract(f as unknown as FeatureContract);
  assert(!res.valid, 'A.6 — Feature with lifecycle fields rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.FEATURE_HAS_EVENT_LIFECYCLE),
    'A.7 — FEATURE_HAS_EVENT_LIFECYCLE emitted');
}

{
  const f = buildLegalFeature() as unknown as Record<string, unknown>;
  f.name = 'funding_onset';
  f.primitive_id = 'funding.funding_onset.v1';
  const res = validateFeatureContract(f as unknown as FeatureContract);
  assert(!res.valid, 'A.8 — Feature name with onset suffix rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.MIXED_STATE_AND_CHANGE),
    'A.9 — MIXED_STATE_AND_CHANGE emitted');
}

{
  const f = buildLegalFeature() as unknown as Record<string, unknown>;
  f.value_kind = L6FeatureValueKind.NUMBER_VECTOR;
  f.vector_aggregation = undefined;
  const res = validateFeatureContract(f as unknown as FeatureContract);
  assert(!res.valid, 'A.10 — Vector feature missing aggregation rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.VECTOR_AGGREGATION_INCOMPLETE),
    'A.11 — VECTOR_AGGREGATION_INCOMPLETE emitted');
}

{
  const f = buildLegalFeature() as unknown as Record<string, unknown>;
  f.value_kind = L6FeatureValueKind.COMPOSITE;
  f.composite_spec = undefined;
  const res = validateFeatureContract(f as unknown as FeatureContract);
  assert(!res.valid, 'A.12 — Composite feature missing spec rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.COMPOSITE_SPEC_INCOMPLETE),
    'A.13 — COMPOSITE_SPEC_INCOMPLETE emitted');
}

{
  const f = buildLegalFeature() as unknown as Record<string, unknown>;
  f.transformation_class = L6TransformationClass.THRESHOLD_CROSS_DETECTION;
  const res = validateFeatureContract(f as unknown as FeatureContract);
  assert(!res.valid, 'A.14 — Feature w/ event-only transformation rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.INCOMPATIBLE_TRANSFORMATION_CLASS),
    'A.15 — INCOMPATIBLE_TRANSFORMATION_CLASS emitted');
}

assert(ALL_FEATURE_KINDS.length === 10, 'A.16 — 10 feature kinds defined');
assert(allFeatureKindDescriptors().length === 10, 'A.17 — 10 feature kind descriptors');
assert(isRegisteredFeatureKind(L6FeatureKind.SCALAR_NUMERIC), 'A.18 — scalar numeric registered');
assert(isRegisteredFeatureKind(L6FeatureKind.DIVERGENCE_FEATURE), 'A.19 — divergence feature registered');
assert(isRegisteredFeatureKind(L6FeatureKind.DETERMINISTIC_COMPOSITE), 'A.20 — composite registered');
assert(!isRegisteredFeatureKind('FAKE_KIND'), 'A.21 — fake kind rejected');
assert(featureKindAllowsValueShape(L6FeatureKind.SCALAR_BOOLEAN, 'BOOLEAN'), 'A.22 — boolean shape for boolean kind');
assert(!featureKindAllowsValueShape(L6FeatureKind.SCALAR_NUMERIC, 'BOOLEAN'), 'A.23 — scalar numeric rejects BOOLEAN');
assert(featureKindRequiredFields(L6FeatureKind.SCALAR_NUMERIC).includes('unit'), 'A.24 — scalar numeric requires unit');
assert(featureKindForbiddenFields(L6FeatureKind.SCALAR_NUMERIC).includes('trigger_spec'), 'A.25 — scalar numeric forbids trigger_spec');
assert(featureForbiddenLifecycleFields().length >= 6, 'A.26 — ≥6 forbidden lifecycle fields');
assert(getFeatureKindDescriptor(L6FeatureKind.Z_SCORE_NORMALIZED)?.minEvidenceExpectation === 'INPUT_REFERENCES_AND_BASELINE',
  'A.27 — z-score evidence expectation');
assert(isFeatureTransformation(L6TransformationClass.Z_SCORE_NORMALIZATION), 'A.28 — z-score is feature transformation');

// ═══════════════════════════════════════════════════════════════
// BAND B — Event Doctrine Legality
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Event Doctrine Legality ═══');
resetAll();

{
  const legal = buildLegalEvent();
  const res = validateEventContract(legal);
  assert(res.valid, 'B.1 — Legal event contract accepted');
  assert(legal.primitive_class === L6PrimitiveClass.EVENT, 'B.2 — Event class is EVENT');
  assert(legal.event_kind === L6EventKind.THRESHOLD_CROSS, 'B.3 — Event kind registered');
  assert(legal.lifecycle_policy.allowedStates.length > 0, 'B.4 — Lifecycle allowed states present');
  assert(legal.dedupe_spec.dedupeKeyFields.length > 0, 'B.5 — Dedupe key fields present');
}

{
  const e = buildLegalEvent() as unknown as Record<string, unknown>;
  delete e.trigger_spec;
  const res = validateEventContract(e as unknown as EventContract);
  assert(!res.valid, 'B.6 — Event without trigger rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.EVENT_LACKS_TRIGGER),
    'B.7 — EVENT_LACKS_TRIGGER emitted');
}

{
  const e = buildLegalEvent() as unknown as Record<string, unknown>;
  delete e.lifecycle_policy;
  const res = validateEventContract(e as unknown as EventContract);
  assert(!res.valid, 'B.8 — Event without lifecycle rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.EVENT_LACKS_LIFECYCLE),
    'B.9 — EVENT_LACKS_LIFECYCLE emitted');
}

{
  const e = buildLegalEvent() as unknown as Record<string, unknown>;
  e.name = 'funding_score';
  e.primitive_id = 'funding.funding_score.v1';
  const res = validateEventContract(e as unknown as EventContract);
  assert(!res.valid, 'B.10 — Event with steady-state name rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.EVENT_IS_STEADY_STATE),
    'B.11 — EVENT_IS_STEADY_STATE emitted');
}

{
  const e = buildLegalEvent();
  const mutated = e as unknown as Record<string, unknown>;
  mutated.event_kind = L6EventKind.SCHEDULED;
  const res = validateEventContract(mutated as unknown as EventContract);
  assert(!res.valid, 'B.12 — Scheduled kind w/ candidate/confirmation shape rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.EVENT_LIFECYCLE_SHAPE_ILLEGAL),
    'B.13 — EVENT_LIFECYCLE_SHAPE_ILLEGAL emitted');
}

{
  const e = buildLegalEvent() as unknown as Record<string, unknown>;
  e.dedupe_spec = { dedupeKeyFields: [], dedupeWindowSeconds: 0, collapseBehavior: 'MERGE_INSTANCE' };
  const res = validateEventContract(e as unknown as EventContract);
  assert(!res.valid, 'B.14 — Event w/ empty dedupe key rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.INVALID_DEDUPE_SPEC),
    'B.15 — INVALID_DEDUPE_SPEC emitted');
}

{
  const e = buildLegalEvent() as unknown as Record<string, unknown>;
  e.evidence_requirements = { minEvidenceSources: 0, requiredInputReferences: [], requiresTimestampedSnapshots: false };
  const res = validateEventContract(e as unknown as EventContract);
  assert(!res.valid, 'B.16 — Event w/ zero evidence rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.INVALID_EVIDENCE_REQUIREMENTS),
    'B.17 — INVALID_EVIDENCE_REQUIREMENTS emitted');
}

{
  const e = buildLegalEvent() as unknown as Record<string, unknown>;
  e.transformation_class = L6TransformationClass.Z_SCORE_NORMALIZATION;
  const res = validateEventContract(e as unknown as EventContract);
  assert(!res.valid, 'B.18 — Event w/ feature-only transformation rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.INCOMPATIBLE_TRANSFORMATION_CLASS),
    'B.19 — INCOMPATIBLE_TRANSFORMATION_CLASS emitted');
}

assert(ALL_EVENT_KINDS.length === 8, 'B.20 — 8 event kinds defined');
assert(allEventKindDescriptors().length === 8, 'B.21 — 8 event kind descriptors');
assert(isRegisteredEventKind(L6EventKind.THRESHOLD_CROSS), 'B.22 — threshold cross registered');
assert(isRegisteredEventKind(L6EventKind.SCHEDULED), 'B.23 — scheduled registered');
assert(!isRegisteredEventKind('FAKE'), 'B.24 — fake event kind rejected');
assert(eventKindAllowsLifecycleShape(L6EventKind.THRESHOLD_CROSS, 'CANDIDATE_CONFIRMATION_RESOLUTION'),
  'B.25 — threshold_cross accepts candidate/confirm/resolve');
assert(!eventKindAllowsLifecycleShape(L6EventKind.SCHEDULED, 'PERSISTENT_STATEFUL'),
  'B.26 — scheduled rejects persistent stateful');
assert(eventKindRequiredFields(L6EventKind.THRESHOLD_CROSS).includes('trigger_spec'), 'B.27 — threshold requires trigger_spec');
assert(eventKindForbiddenFields(L6EventKind.THRESHOLD_CROSS).includes('baseline_spec'), 'B.28 — threshold forbids baseline_spec');
assert(eventRequiredChangeFields().includes('lifecycle_policy'), 'B.29 — event required change fields include lifecycle');
assert(isEventTransformation(L6TransformationClass.THRESHOLD_CROSS_DETECTION), 'B.30 — threshold_cross_detection is event transformation');
assert(L6EventLifecycleState.CANDIDATE === 'CANDIDATE', 'B.31 — Candidate lifecycle state exists');
assert(L6EventSeverityLevel.HIGH === 'HIGH', 'B.32 — HIGH severity exists');

// ═══════════════════════════════════════════════════════════════
// BAND C — Primitive Kind Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Primitive Kind Law ═══');
resetAll();

{
  const res = validateFeatureKind('NOT_A_REAL_KIND', {});
  assert(!res.valid, 'C.1 — Unregistered feature kind rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.UNREGISTERED_FEATURE_KIND),
    'C.2 — UNREGISTERED_FEATURE_KIND emitted');
}

{
  const res = validateEventKind('NOT_A_REAL_EVENT_KIND', {});
  assert(!res.valid, 'C.3 — Unregistered event kind rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.UNREGISTERED_EVENT_KIND),
    'C.4 — UNREGISTERED_EVENT_KIND emitted');
}

{
  const res = validateFeatureKind(L6FeatureKind.SCALAR_NUMERIC, {});
  assert(!res.valid, 'C.5 — Scalar numeric w/o required fields rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.MISSING_REQUIRED_KIND_FIELD),
    'C.6 — MISSING_REQUIRED_KIND_FIELD emitted');
}

{
  const res = validateFeatureKind(L6FeatureKind.SCALAR_NUMERIC, {
    unit: 'bps', value_kind: 'NUMBER', directionality: 'SIGNED',
    null_policy: { policy: 'REJECT_IF_MISSING' }, freshness_budget: { maxAgeSeconds: 60 },
    trigger_spec: { triggerId: 'bad' },
  });
  assert(!res.valid, 'C.7 — Scalar numeric w/ trigger_spec rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.FORBIDDEN_KIND_FIELD_PRESENT),
    'C.8 — FORBIDDEN_KIND_FIELD_PRESENT emitted');
}

{
  const res = validateEventKind(L6EventKind.THRESHOLD_CROSS, {
    trigger_spec: { triggerId: 'x' }, confirmation_spec: {}, resolution_spec: {},
    severity_spec: {}, lifecycle_policy: {}, evidence_requirements: {},
  });
  assert(res.valid, 'C.9 — Event kind w/ all required fields accepted');
}

for (const kind of ALL_FEATURE_KINDS) {
  assert(getFeatureKindDescriptor(kind) !== null, `C.10.${kind} — descriptor exists`);
}
for (const kind of ALL_EVENT_KINDS) {
  assert(getEventKindDescriptor(kind) !== null, `C.11.${kind} — descriptor exists`);
}

assert(ALL_TRANSFORMATION_CLASSES.length === 15, 'C.12 — 15 transformation classes');
assert(FEATURE_ONLY_TRANSFORMATIONS.length === 8, 'C.13 — 8 feature transformations');
assert(EVENT_ONLY_TRANSFORMATIONS.length === 7, 'C.14 — 7 event transformations');
assert(transformationClassMatchesPrimitiveClass(L6TransformationClass.DIVERGENCE, L6PrimitiveClass.FEATURE),
  'C.15 — divergence matches feature');
assert(!transformationClassMatchesPrimitiveClass(L6TransformationClass.DIVERGENCE, L6PrimitiveClass.EVENT),
  'C.16 — divergence does not match event');

// ═══════════════════════════════════════════════════════════════
// BAND D — No Hidden Interpretation Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: No Hidden Interpretation Law ═══');
resetAll();

{
  const f = buildLegalFeature() as unknown as Record<string, unknown>;
  delete f.null_policy;
  const res = validateFeatureContract(f as unknown as FeatureContract);
  assert(!res.valid, 'D.1 — Missing null policy rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.MISSING_NULL_POLICY),
    'D.2 — MISSING_NULL_POLICY emitted');
}

{
  const f = buildLegalFeature() as unknown as Record<string, unknown>;
  delete f.lineage_policy;
  const res = validateFeatureContract(f as unknown as FeatureContract);
  assert(!res.valid, 'D.3 — Missing lineage policy rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.MISSING_LINEAGE_POLICY),
    'D.4 — MISSING_LINEAGE_POLICY emitted');
}

{
  const f = buildLegalFeature() as unknown as Record<string, unknown>;
  f.lineage_policy = {
    scope: L6LineageScope.INPUTS_ONLY, requiredInputSurfaces: [],
    requiredContextSurfaces: [], carriesSourceVersion: false,
    carriesSchemaVersion: true, replayCompatible: true,
  };
  const res = validateFeatureContract(f as unknown as FeatureContract);
  assert(!res.valid, 'D.5 — Incomplete lineage rejected (no source version)');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.INCOMPLETE_LINEAGE_POLICY),
    'D.6 — INCOMPLETE_LINEAGE_POLICY emitted');
}

{
  const f = buildLegalFeature() as unknown as Record<string, unknown>;
  delete f.freshness_budget;
  const res = validateFeatureContract(f as unknown as FeatureContract);
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.MISSING_FRESHNESS_BUDGET),
    'D.7 — MISSING_FRESHNESS_BUDGET emitted');
}

{
  const f = buildLegalFeature() as unknown as Record<string, unknown>;
  delete f.transformation_class;
  const res = validateFeatureContract(f as unknown as FeatureContract);
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.MISSING_TRANSFORMATION_CLASS),
    'D.8 — MISSING_TRANSFORMATION_CLASS emitted');
}

{
  const f = buildLegalFeature() as unknown as Record<string, unknown>;
  (f.null_policy as Record<string, unknown>).rationale = 'ZERO_FILL when missing';
  const res = validateFeatureContract(f as unknown as FeatureContract);
  assert(!res.valid, 'D.9 — Forbidden neutral-fill token rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.FORBIDDEN_NEUTRAL_FILL),
    'D.10 — FORBIDDEN_NEUTRAL_FILL emitted');
}

{
  const f = buildLegalFeature() as unknown as Record<string, unknown>;
  f.required_inputs = [];
  const res = validateFeatureContract(f as unknown as FeatureContract);
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.MISSING_INPUTS),
    'D.11 — MISSING_INPUTS emitted');
}

{
  const f = buildLegalFeature() as unknown as Record<string, unknown>;
  f.version = 'bogus';
  const res = validateFeatureContract(f as unknown as FeatureContract);
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.INVALID_VERSION_TAG),
    'D.12 — INVALID_VERSION_TAG emitted');
}

{
  const f = buildLegalFeature() as unknown as Record<string, unknown>;
  f.primitive_id = 'not-a-valid-id';
  const res = validateFeatureContract(f as unknown as FeatureContract);
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.INVALID_PRIMITIVE_ID),
    'D.13 — INVALID_PRIMITIVE_ID emitted');
}

assert(ALL_NULL_POLICIES.length === 5, 'D.14 — 5 null policies');
assert(ALL_NULL_POLICIES.includes(L6NullPolicy.REJECT_IF_MISSING), 'D.15 — REJECT_IF_MISSING exists');
assert(FORBIDDEN_NULL_POLICY_TOKENS.includes('ZERO_FILL'), 'D.16 — ZERO_FILL is forbidden token');
assert(isForbiddenNullPolicyToken('neutral_fill'), 'D.17 — neutral_fill detected (case-insensitive)');
assert(ALL_LINEAGE_SCOPES.length === 5, 'D.18 — 5 lineage scopes');
assert(!isCompleteLineagePolicy(null as any), 'D.19 — null lineage rejected');
assert(!isCompleteLineagePolicy({
  scope: L6LineageScope.INPUTS_ONLY, requiredInputSurfaces: [], requiredContextSurfaces: [],
  carriesSourceVersion: true, carriesSchemaVersion: false, replayCompatible: true,
}), 'D.20 — lineage missing schema version rejected');
assert(isValidPrimitiveId('funding.funding_z_score.v1'), 'D.21 — valid primitive id accepted');
assert(!isValidPrimitiveId('funding_z_score'), 'D.22 — invalid primitive id rejected');
assert(isValidVersionTag('v1'), 'D.23 — v1 valid');
assert(isValidVersionTag('v1.2.3'), 'D.24 — v1.2.3 valid');
assert(!isValidVersionTag('1.0.0'), 'D.25 — 1.0.0 (no v) invalid');
assert(isValidFamilyName('funding'), 'D.26 — valid family name accepted');
assert(!isValidFamilyName('Funding'), 'D.27 — uppercase family rejected');

// ═══════════════════════════════════════════════════════════════
// BAND E — Judgment Leakage and Contradiction Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Judgment Leakage and Contradiction Law ═══');
resetAll();

{
  const res = validateJudgmentLeakage({ name: 'buy_signal' });
  assert(!res.valid, 'E.1 — buy_signal name rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.JUDGMENT_LEAKAGE_IN_NAME),
    'E.2 — JUDGMENT_LEAKAGE_IN_NAME emitted');
}

{
  const res = validateJudgmentLeakage({
    name: 'funding_z_score',
    description: 'strong thesis validated for high conviction trade.',
  });
  assert(!res.valid, 'E.3 — judgment description rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.JUDGMENT_LEAKAGE_IN_DESCRIPTION),
    'E.4 — JUDGMENT_LEAKAGE_IN_DESCRIPTION emitted');
}

{
  const res = validateJudgmentLeakage({
    name: 'funding_spike',
    transformationToken: 'THESIS_RESOLUTION_FORMULA',
  });
  assert(!res.valid, 'E.5 — judgment transformation rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.JUDGMENT_LEAKAGE_IN_TRANSFORM),
    'E.6 — JUDGMENT_LEAKAGE_IN_TRANSFORM emitted');
}

{
  const res = validateJudgmentLeakage({
    name: 'funding_spike',
    severityLabels: ['STRONG_BUY', 'HIGH'],
  });
  assert(!res.valid, 'E.7 — STRONG_BUY severity rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.JUDGMENT_LEAKAGE_IN_SEVERITY),
    'E.8 — JUDGMENT_LEAKAGE_IN_SEVERITY emitted');
}

{
  const res = validateJudgmentLeakage({ name: 'funding_z_score', description: 'z-score of funding rate against baseline' });
  assert(res.valid, 'E.9 — Clean primitive name+description passes');
}

assert(getForbiddenDescriptionPatterns().length >= 10, 'E.10 — ≥10 forbidden description patterns');
assert(getForbiddenSeverityLabelPatterns().length >= 5, 'E.11 — ≥5 forbidden severity patterns');
assert(getForbiddenTransformationTokens().length >= 3, 'E.12 — ≥3 forbidden transformation tokens');

{
  const f = buildLegalFeature() as unknown as Record<string, unknown>;
  f.feature_kind = L6FeatureKind.DIVERGENCE_FEATURE;
  f.value_kind = L6FeatureValueKind.DIVERGENCE_PAIR;
  f.name = 'funding_price_divergence';
  f.primitive_id = 'funding.funding_price_divergence.v1';
  f.transformation_class = L6TransformationClass.DIVERGENCE;
  f.contradiction_support = {
    supports: true,
    artifactType: L6ContradictionArtifactType.DIVERGENCE_FEATURE,
    preservesSourceSeparation: true,
    rationale: 'Divergence preserved; sources kept separate.',
  };
  f.description = 'Divergence feature preserving source separation between funding and price.';
  const res = validateFeatureContract(f as unknown as FeatureContract);
  assert(res.valid, 'E.13 — Divergence feature w/ contradiction support accepted');
}

{
  const f = buildLegalFeature() as unknown as Record<string, unknown>;
  f.contradiction_support = {
    supports: true,
    artifactType: L6ContradictionArtifactType.DIVERGENCE_FEATURE,
    preservesSourceSeparation: true,
    rationale: 'final_combined_truth produced by averaging conflicting sources',
  };
  const res = validateFeatureContract(f as unknown as FeatureContract);
  assert(!res.valid, 'E.14 — Collapse token rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.CONTRADICTION_COLLAPSE_ATTEMPT),
    'E.15 — CONTRADICTION_COLLAPSE_ATTEMPT emitted');
}

{
  const f = buildLegalFeature() as unknown as Record<string, unknown>;
  f.contradiction_support = {
    supports: true, artifactType: null as any,
    preservesSourceSeparation: false, rationale: 'claim without artifact',
  };
  const res = validateFeatureContract(f as unknown as FeatureContract);
  assert(!res.valid, 'E.16 — Contradiction claim w/o artifact rejected');
  assert(res.violations.some(v => v.code === L6PrimitiveViolationCode.CONTRADICTION_SUPPORT_MISSING),
    'E.17 — CONTRADICTION_SUPPORT_MISSING emitted');
}

assert(ALL_CONTRADICTION_ARTIFACT_TYPES.length === 3, 'E.18 — 3 contradiction artifact types');
assert(ALL_CONTRADICTION_ARTIFACT_TYPES.includes(L6ContradictionArtifactType.DIVERGENCE_FEATURE),
  'E.19 — DIVERGENCE_FEATURE registered');
assert(FORBIDDEN_COLLAPSE_TOKENS.length >= 5, 'E.20 — ≥5 forbidden collapse tokens');
assert(isForbiddenCollapseToken('final_combined_truth'), 'E.21 — collapse token detected');
assert(describesContradictionLegally({
  supports: false, artifactType: null, preservesSourceSeparation: false, rationale: '',
}), 'E.22 — unsupported contradiction is legal');

// ═══════════════════════════════════════════════════════════════
// BAND F — Audit Surface and Invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND F: Audit Surface and Invariants ═══');
resetAll();

{
  const f = buildLegalFeature() as unknown as Record<string, unknown>;
  f.trigger_spec = { triggerId: 'x', kind: 'THRESHOLD', parameters: {} };
  const res = validateFeatureContract(f as unknown as FeatureContract);
  const recs = emitValidationResult('feature-contract.validator', 'funding.funding_z_score.v1', res);
  assert(recs.length > 0, 'F.1 — Validation emits audit records');
  assert(getPrimitiveAuditCount() >= recs.length, 'F.2 — Audit log grew');
  assert(getCriticalPrimitiveViolations().length > 0, 'F.3 — Critical violations recorded');
  assert(getPrimitiveViolationsByCode(L6PrimitiveViolationCode.FEATURE_HAS_EVENT_LIFECYCLE).length > 0,
    'F.4 — Violations queryable by code');
}

resetAll();
assert(getPrimitiveAuditCount() === 0, 'F.5 — Audit log resets cleanly');

emitPrimitiveAudit('test', 'primitive.x.v1', {
  code: L6PrimitiveViolationCode.JUDGMENT_LEAKAGE_IN_NAME,
  path: 'name', detail: 'test', context: {},
});
assert(getPrimitiveAuditLog().length === 1, 'F.6 — Direct emit records audit');
assert(getCriticalPrimitiveViolations().length === 1, 'F.7 — Judgment leakage audit is CRITICAL');

assert(ALL_PRIMITIVE_VIOLATION_CODES.length >= 30, 'F.8 — ≥30 primitive violation codes');

// Invariants
const invariants = checkAllL62Invariants();
assert(invariants.length === 7, 'F.9 — 7 L6.2 invariants');
for (const inv of invariants) {
  assert(inv.holds, `F.10.${inv.id} — ${inv.name}`);
}
assert(checkINV_62_A().holds, 'F.11 — INV-6.2-A');
assert(checkINV_62_B().holds, 'F.12 — INV-6.2-B');
assert(checkINV_62_C().holds, 'F.13 — INV-6.2-C');
assert(checkINV_62_D().holds, 'F.14 — INV-6.2-D');
assert(checkINV_62_E().holds, 'F.15 — INV-6.2-E');
assert(checkINV_62_F().holds, 'F.16 — INV-6.2-F');
assert(checkINV_62_G().holds, 'F.17 — INV-6.2-G');

// Universal contract validator reachable
{
  const res = validateCommonPrimitiveContract(buildLegalFeature());
  assert(res.valid, 'F.18 — Common contract validator accepts legal feature');
}

// Scope enums present
assert(Object.values(L6ScopeType).length >= 5, 'F.19 — scope types present');
assert(Object.values(L6ScopeGranularity).length >= 5, 'F.20 — scope granularities present');
assert(Object.values(L6Directionality).length >= 4, 'F.21 — directionality enum present');
assert(Object.values(L6LateDataPolicy).length === 3, 'F.22 — 3 late-data policies');
assert(Object.values(L6MaterializationPolicy).length === 4, 'F.23 — 4 materialization policies');
assert(Object.values(L6EvidencePackPolicy).length === 4, 'F.24 — 4 evidence-pack policies');
assert(Object.values(L6FeatureValueKind).length === 6, 'F.25 — 6 feature value kinds');
assert(Object.keys(FEATURE_VALUE_SHAPE_BY_KIND).length === 6, 'F.26 — value kind→shape map complete');
assert(Object.values(L6EventLifecycleState).length === 8, 'F.27 — 8 lifecycle states');
assert(Object.values(L6EventSeverityLevel).length === 5, 'F.28 — 5 severity levels');

// ═══════════════════════════════════════════════════════════════
// Report
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════');
console.log('L6.2 — Intelligence Primitive Doctrine and Primitive Law');
console.log('Certification Test Suite Results');
console.log('═══════════════════════════════════════════════════════');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);
console.log('═══════════════════════════════════════════════════════');

if (failed > 0) {
  console.error(`\n✗ ${failed} assertion(s) failed.`);
  process.exit(1);
}
console.log('\n✓ All L6.2 assertions passed.');
