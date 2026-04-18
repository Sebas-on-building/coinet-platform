/**
 * L6.3 — Universal Contracts (Feature Definitions / Outputs, Event Definitions / Outputs)
 * Certification Test Suite
 *
 * 6 Bands:
 *   A — Feature definition contract
 *   B — Feature runtime output contract
 *   C — Event definition contract
 *   D — Event runtime output contract
 *   E — Compatibility and versioning
 *   F — Audit and invariants
 */

import {
  L6FeatureValidityState,
  L6QualityState,
  L6ConfidenceBand,
  L6FreshnessState,
  L6NullState,
  ALL_FEATURE_VALIDITY_STATES,
  isValidEmissionLegal,
  requiredValidityStateFor,
  L6EventLifecycleState,
  isRegisteredLifecycleState,
  isClosureState,
  LIFECYCLE_CLOSURE_STATES,
  LIFECYCLE_ORDINAL_MAP,
  L6ContractCompatibilityClass,
  parseContractVersion,
  compareContractVersions,
  classifyVersionDelta,
  resolveLatestVersion,
  isSameMajor,
  L6CoverageRequirementClass,
  L6FreshnessBudgetClass,
  L6MaterializationPolicy,
  L6MaterializationSink,
  MATERIALIZATION_POLICY_DESCRIPTORS,
  getMaterializationDescriptor,
  isValidMaterializationPolicy,
  materializationRequiresCurrentState,
  materializationRequiresHistory,
  materializationRequiresInstance,
  L6FeatureInputRole,
  L6EventEvidenceSourceRole,
  REQUIRED_FEATURE_DEFINITION_FIELDS,
  REQUIRED_EVENT_DEFINITION_FIELDS,
  REQUIRED_FEATURE_OUTPUT_TOP_FIELDS,
  REQUIRED_FEATURE_OUTPUT_LINEAGE_FIELDS,
  REQUIRED_EVENT_OUTPUT_TOP_FIELDS,
  REQUIRED_EVENT_OUTPUT_LINEAGE_FIELDS,
  FeatureDefinitionContract,
  EventDefinitionContract,
  FeatureOutput,
  EventOutput,
  L6FeatureValueKind,
  L6EventKind,
  L6FeatureKind,
} from '../l6/contracts';

import {
  L6ContractViolationCode,
  ALL_CONTRACT_VIOLATION_CODES,
  validateFeatureDefinitionContract,
  validateFeatureOutput,
  validateEventDefinitionContract,
  validateEventOutput,
  checkFeatureDefinitionCompatibility,
  checkEventDefinitionCompatibility,
  ContractVersionResolver,
  createContractVersionResolver,
  computeReplayHash,
  canonicalJson,
  isValidReplayHash,
  contractOk,
  contractFail,
  contractViolation,
  contractMerge,
} from '../l6/validation';

import {
  emitContractAudit,
  emitContractAuditResult,
  getContractAuditLog,
  findContractAuditsByPrimitive,
  findContractAuditsByCode,
  findContractAuditsByTrace,
  clearContractAuditLog,
  L6ContractAuditSeverity,
} from '../l6/constitution';

import {
  buildLegalFeatureDefinition,
  buildLegalEventDefinition,
  buildLegalFeatureOutput,
  buildLegalEventOutput,
  checkAllL6_3Invariants,
  checkINV_63_A, checkINV_63_B, checkINV_63_C,
  checkINV_63_D, checkINV_63_E, checkINV_63_F,
  checkINV_63_G, checkINV_63_H, checkINV_63_I,
} from '../l6/invariants';

let passed = 0;
let failed = 0;

function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; console.error(`  ✗ FAIL: ${label}`); }
}

function resetAll(): void {
  clearContractAuditLog();
}

// ═══════════════════════════════════════════════════════════════════════
// BAND A — Feature Definition Contract
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Feature Definition Contract ═══');
resetAll();

{
  const legal = buildLegalFeatureDefinition();
  const res = validateFeatureDefinitionContract(legal);
  assert(res.valid, 'A.1 — Legal feature definition accepted');
  assert(res.violations.length === 0, 'A.2 — Legal feature definition has no violations');
  assert(legal.definition_schema_version === 'v1.0.0', 'A.3 — definition_schema_version declared');
  assert(legal.required_truth_inputs.length > 0, 'A.4 — required_truth_inputs present');
  assert(legal.required_truth_inputs.every(r => r.role === L6FeatureInputRole.TRUTH),
    'A.5 — required_truth_inputs carry TRUTH role');
  assert(legal.baseline_inputs.every(r => r.role === L6FeatureInputRole.BASELINE),
    'A.6 — baseline_inputs carry BASELINE role');
}

{
  const d = buildLegalFeatureDefinition() as unknown as Record<string, unknown>;
  delete d.required_truth_inputs;
  const res = validateFeatureDefinitionContract(d as unknown as FeatureDefinitionContract);
  assert(!res.valid, 'A.7 — Missing required_truth_inputs rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.DEF_MISSING_TRUTH_INPUT),
    'A.8 — DEF_MISSING_TRUTH_INPUT emitted');
}

{
  const d = buildLegalFeatureDefinition() as unknown as Record<string, unknown>;
  delete d.bounds;
  const res = validateFeatureDefinitionContract(d as unknown as FeatureDefinitionContract);
  assert(!res.valid, 'A.9 — Missing bounds rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.DEF_MISSING_BOUNDS),
    'A.10 — DEF_MISSING_BOUNDS emitted');
}

{
  const d = buildLegalFeatureDefinition() as unknown as Record<string, unknown>;
  delete d.coverage_requirement;
  const res = validateFeatureDefinitionContract(d as unknown as FeatureDefinitionContract);
  assert(!res.valid, 'A.11 — Missing coverage_requirement rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.DEF_MISSING_COVERAGE_REQUIREMENT),
    'A.12 — DEF_MISSING_COVERAGE_REQUIREMENT emitted');
}

{
  const d = buildLegalFeatureDefinition() as unknown as Record<string, unknown>;
  delete d.freshness_budget_class;
  const res = validateFeatureDefinitionContract(d as unknown as FeatureDefinitionContract);
  assert(!res.valid, 'A.13 — Missing freshness_budget_class rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.DEF_MISSING_FRESHNESS_CLASS),
    'A.14 — DEF_MISSING_FRESHNESS_CLASS emitted');
}

{
  const d = buildLegalFeatureDefinition() as unknown as Record<string, unknown>;
  delete d.normalization_method;
  const res = validateFeatureDefinitionContract(d as unknown as FeatureDefinitionContract);
  assert(!res.valid, 'A.15 — Missing normalization_method rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.DEF_MISSING_NORMALIZATION_METHOD),
    'A.16 — DEF_MISSING_NORMALIZATION_METHOD emitted');
}

{
  const d = buildLegalFeatureDefinition() as unknown as Record<string, unknown>;
  d.version = 'not-a-version';
  const res = validateFeatureDefinitionContract(d as unknown as FeatureDefinitionContract);
  assert(!res.valid, 'A.17 — Invalid version string rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.DEF_INVALID_VERSION),
    'A.18 — DEF_INVALID_VERSION emitted');
}

{
  const d = buildLegalFeatureDefinition() as unknown as Record<string, unknown>;
  d.bounds = { min: 10, max: 0, isBounded: true, wraps: false };
  const res = validateFeatureDefinitionContract(d as unknown as FeatureDefinitionContract);
  assert(!res.valid, 'A.19 — Inverted bounds rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.DEF_MISSING_BOUNDS),
    'A.20 — Inverted bounds flagged as bounds violation');
}

{
  const d = buildLegalFeatureDefinition() as unknown as Record<string, unknown>;
  delete d.materialization_policy;
  const res = validateFeatureDefinitionContract(d as unknown as FeatureDefinitionContract);
  assert(!res.valid, 'A.21 — Missing materialization_policy rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.DEF_MISSING_MATERIALIZATION_POLICY),
    'A.22 — DEF_MISSING_MATERIALIZATION_POLICY emitted');
}

{
  const d = buildLegalFeatureDefinition() as unknown as Record<string, unknown>;
  d.required_inputs = [];
  d.required_truth_inputs = [];
  const res = validateFeatureDefinitionContract(d as unknown as FeatureDefinitionContract);
  assert(!res.valid, 'A.23 — Empty inputs rejected via multiple paths');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.DEF_MISSING_TRUTH_INPUT
      || v.code === L6ContractViolationCode.DEF_UNDERLYING_PRIMITIVE_INVALID),
    'A.24 — Empty inputs reported by validator chain');
}

assert(REQUIRED_FEATURE_DEFINITION_FIELDS.length >= 20, 'A.25 — ≥20 required feature definition fields');
assert(REQUIRED_FEATURE_DEFINITION_FIELDS.includes('feature_kind'), 'A.26 — feature_kind in required list');
assert(REQUIRED_FEATURE_DEFINITION_FIELDS.includes('required_truth_inputs'), 'A.27 — truth inputs required');
assert(REQUIRED_FEATURE_DEFINITION_FIELDS.includes('coverage_requirement'), 'A.28 — coverage_requirement required');
assert(REQUIRED_FEATURE_DEFINITION_FIELDS.includes('freshness_budget_class'), 'A.29 — freshness_budget_class required');
assert(REQUIRED_FEATURE_DEFINITION_FIELDS.includes('definition_schema_version'), 'A.30 — definition_schema_version required');

// ═══════════════════════════════════════════════════════════════════════
// BAND B — Feature Runtime Output Contract
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Feature Runtime Output Contract ═══');
resetAll();

{
  const def = buildLegalFeatureDefinition();
  const out = buildLegalFeatureOutput();
  const res = validateFeatureOutput(out, def);
  assert(res.valid, 'B.1 — Legal feature output accepted');
  assert(out.lineage.replay_hash.length === 64, 'B.2 — replay_hash is 64-char sha256');
  assert(isValidReplayHash(out.lineage.replay_hash), 'B.3 — replay_hash passes hex check');
  assert(out.validity_state === L6FeatureValidityState.VALID, 'B.4 — VALID emission when legal');
  assert(out.warmup_satisfied === true, 'B.5 — warmup_satisfied true for legal VALID output');
}

{
  const def = buildLegalFeatureDefinition();
  const o = buildLegalFeatureOutput() as unknown as Record<string, unknown>;
  (o.lineage as Record<string, unknown>).replay_hash = 'short-and-wrong';
  const res = validateFeatureOutput(o as unknown as FeatureOutput, def);
  assert(!res.valid, 'B.6 — Malformed replay_hash rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.OUT_MISSING_REPLAY_HASH),
    'B.7 — OUT_MISSING_REPLAY_HASH emitted');
}

{
  const def = buildLegalFeatureDefinition();
  const o = buildLegalFeatureOutput() as unknown as Record<string, unknown>;
  delete (o.lineage as Record<string, unknown>).manifest_id;
  const res = validateFeatureOutput(o as unknown as FeatureOutput, def);
  assert(!res.valid, 'B.8 — Missing manifest_id rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.OUT_MISSING_LINEAGE_FIELD),
    'B.9 — OUT_MISSING_LINEAGE_FIELD emitted');
}

{
  const def = buildLegalFeatureDefinition();
  const o = buildLegalFeatureOutput() as unknown as Record<string, unknown>;
  (o as unknown as { quality_state: L6QualityState }).quality_state = L6QualityState.FAIL;
  const res = validateFeatureOutput(o as unknown as FeatureOutput, def);
  assert(!res.valid, 'B.10 — VALID + quality FAIL rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.OUT_ILLEGAL_VALID_EMISSION),
    'B.11 — OUT_ILLEGAL_VALID_EMISSION emitted');
}

{
  const def = buildLegalFeatureDefinition();
  const o = buildLegalFeatureOutput() as unknown as Record<string, unknown>;
  (o as unknown as { freshness_state: L6FreshnessState }).freshness_state = L6FreshnessState.EXPIRED;
  const res = validateFeatureOutput(o as unknown as FeatureOutput, def);
  assert(!res.valid, 'B.12 — VALID + freshness EXPIRED rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.OUT_ILLEGAL_VALID_EMISSION),
    'B.13 — OUT_ILLEGAL_VALID_EMISSION emitted for expired freshness');
}

{
  const def = buildLegalFeatureDefinition();
  const o = buildLegalFeatureOutput() as unknown as Record<string, unknown>;
  (o as unknown as { null_state: L6NullState }).null_state = L6NullState.ABSENT_REQUIRED;
  const res = validateFeatureOutput(o as unknown as FeatureOutput, def);
  assert(!res.valid, 'B.14 — VALID + ABSENT_REQUIRED rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.OUT_ILLEGAL_VALID_EMISSION),
    'B.15 — OUT_ILLEGAL_VALID_EMISSION emitted for absent-required null state');
}

{
  const def = buildLegalFeatureDefinition();
  const o = buildLegalFeatureOutput() as unknown as Record<string, unknown>;
  (o as unknown as { warmup_satisfied: boolean }).warmup_satisfied = false;
  const res = validateFeatureOutput(o as unknown as FeatureOutput, def);
  assert(!res.valid, 'B.16 — VALID + unwarmed rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.OUT_ILLEGAL_VALID_EMISSION),
    'B.17 — OUT_ILLEGAL_VALID_EMISSION emitted for unwarmed VALID');
}

{
  const def = buildLegalFeatureDefinition();
  const o = buildLegalFeatureOutput() as unknown as Record<string, unknown>;
  (o.value_payload as Record<string, unknown>).value_kind = L6FeatureValueKind.BOOLEAN;
  const res = validateFeatureOutput(o as unknown as FeatureOutput, def);
  assert(!res.valid, 'B.18 — Value kind mismatch with definition rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.OUT_VALUE_KIND_MISMATCH),
    'B.19 — OUT_VALUE_KIND_MISMATCH emitted');
}

{
  const def = buildLegalFeatureDefinition();
  const o = buildLegalFeatureOutput() as unknown as Record<string, unknown>;
  o.feature_version = 'v9.9.9';
  const res = validateFeatureOutput(o as unknown as FeatureOutput, def);
  assert(!res.valid, 'B.20 — Feature version mismatch rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.OUT_CONTRACT_VERSION_MISMATCH),
    'B.21 — OUT_CONTRACT_VERSION_MISMATCH emitted');
}

{
  const valid = requiredValidityStateFor(L6QualityState.PASS, L6FreshnessState.FRESH, L6NullState.PRESENT, true);
  assert(valid === L6FeatureValidityState.VALID, 'B.22 — requiredValidityStateFor returns VALID');
}
{
  const v = requiredValidityStateFor(L6QualityState.FAIL, L6FreshnessState.FRESH, L6NullState.PRESENT, true);
  assert(v === L6FeatureValidityState.BLOCKED, 'B.23 — Quality FAIL => BLOCKED');
}
{
  const v = requiredValidityStateFor(L6QualityState.PASS, L6FreshnessState.STALE, L6NullState.PRESENT, true);
  assert(v === L6FeatureValidityState.PROVISIONAL, 'B.24 — Stale => PROVISIONAL');
}
{
  const v = requiredValidityStateFor(L6QualityState.PASS, L6FreshnessState.FRESH, L6NullState.ABSENT_REQUIRED, true);
  assert(v === L6FeatureValidityState.ABSENT, 'B.25 — ABSENT_REQUIRED => ABSENT');
}
{
  const v = requiredValidityStateFor(L6QualityState.PASS, L6FreshnessState.WARMING_UP, L6NullState.PRESENT, false);
  assert(v === L6FeatureValidityState.BLOCKED, 'B.26 — Warmup unmet => BLOCKED');
}
{
  const v = requiredValidityStateFor(L6QualityState.MARGINAL, L6FreshnessState.FRESH, L6NullState.PRESENT, true);
  assert(v === L6FeatureValidityState.DEGRADED, 'B.27 — Marginal quality => DEGRADED');
}
assert(!isValidEmissionLegal(L6FeatureValidityState.VALID, L6QualityState.FAIL,
  L6FreshnessState.FRESH, L6NullState.PRESENT), 'B.28 — VALID emission illegal under FAIL');
assert(isValidEmissionLegal(L6FeatureValidityState.VALID, L6QualityState.PASS,
  L6FreshnessState.FRESH, L6NullState.PRESENT), 'B.29 — VALID emission legal under PASS');
assert(isValidEmissionLegal(L6FeatureValidityState.BLOCKED, L6QualityState.FAIL,
  L6FreshnessState.EXPIRED, L6NullState.ABSENT_REQUIRED), 'B.30 — Non-VALID emissions unrestricted');
assert(ALL_FEATURE_VALIDITY_STATES.length === 5, 'B.31 — 5 feature validity states');
assert(REQUIRED_FEATURE_OUTPUT_TOP_FIELDS.length >= 15, 'B.32 — ≥15 feature output top fields');
assert(REQUIRED_FEATURE_OUTPUT_LINEAGE_FIELDS.length === 5, 'B.33 — 5 feature output lineage fields');

// ═══════════════════════════════════════════════════════════════════════
// BAND C — Event Definition Contract
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Event Definition Contract ═══');
resetAll();

{
  const legal = buildLegalEventDefinition();
  const res = validateEventDefinitionContract(legal);
  assert(res.valid, 'C.1 — Legal event definition accepted');
  assert(res.violations.length === 0, 'C.2 — Legal event definition has no violations');
  assert(legal.evidence_source_declarations.length > 0, 'C.3 — evidence_source_declarations present');
  assert(legal.evidence_source_declarations.some(
    e => e.role === L6EventEvidenceSourceRole.TRIGGER && e.required),
    'C.4 — Required TRIGGER evidence source present');
  assert(legal.suppression_taxonomy_binding.taxonomyId.length > 0, 'C.5 — taxonomy binding present');
  assert(legal.lifecycle_completeness.requiresCandidate, 'C.6 — lifecycle_completeness.requiresCandidate');
}

{
  const d = buildLegalEventDefinition() as unknown as Record<string, unknown>;
  d.evidence_source_declarations = [];
  const res = validateEventDefinitionContract(d as unknown as EventDefinitionContract);
  assert(!res.valid, 'C.7 — Missing evidence source declarations rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.DEF_MISSING_EVIDENCE_SOURCES),
    'C.8 — DEF_MISSING_EVIDENCE_SOURCES emitted');
}

{
  const d = buildLegalEventDefinition() as unknown as Record<string, unknown>;
  d.evidence_source_declarations = [
    { sourceId: 'x', role: L6EventEvidenceSourceRole.CONTEXT, required: false },
  ];
  const res = validateEventDefinitionContract(d as unknown as EventDefinitionContract);
  assert(!res.valid, 'C.9 — Event without required TRIGGER evidence rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.DEF_MISSING_EVIDENCE_SOURCES),
    'C.10 — Missing TRIGGER evidence flagged');
}

{
  const d = buildLegalEventDefinition() as unknown as Record<string, unknown>;
  delete d.suppression_taxonomy_binding;
  const res = validateEventDefinitionContract(d as unknown as EventDefinitionContract);
  assert(!res.valid, 'C.11 — Missing suppression taxonomy binding rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.DEF_MISSING_SUPPRESSION_TAXONOMY),
    'C.12 — DEF_MISSING_SUPPRESSION_TAXONOMY emitted');
}

{
  const d = buildLegalEventDefinition() as unknown as Record<string, unknown>;
  delete d.lifecycle_completeness;
  const res = validateEventDefinitionContract(d as unknown as EventDefinitionContract);
  assert(!res.valid, 'C.13 — Missing lifecycle_completeness rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.DEF_MISSING_LIFECYCLE_COMPLETENESS),
    'C.14 — DEF_MISSING_LIFECYCLE_COMPLETENESS emitted');
}

{
  const d = buildLegalEventDefinition() as unknown as Record<string, unknown>;
  (d.lifecycle_completeness as Record<string, unknown>).requiresCandidate = false;
  const res = validateEventDefinitionContract(d as unknown as EventDefinitionContract);
  assert(!res.valid, 'C.15 — lifecycle_completeness without CANDIDATE rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.DEF_MISSING_LIFECYCLE_COMPLETENESS),
    'C.16 — lifecycle requiresCandidate violation emitted');
}

{
  const d = buildLegalEventDefinition() as unknown as Record<string, unknown>;
  (d.lifecycle_completeness as Record<string, unknown>).requiresResolution = false;
  (d.lifecycle_completeness as Record<string, unknown>).allowsExpiry = false;
  const res = validateEventDefinitionContract(d as unknown as EventDefinitionContract);
  assert(!res.valid, 'C.17 — lifecycle w/o resolution or expiry rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.DEF_MISSING_LIFECYCLE_COMPLETENESS),
    'C.18 — No-termination lifecycle flagged');
}

{
  const d = buildLegalEventDefinition() as unknown as Record<string, unknown>;
  delete d.freshness_budget_class;
  const res = validateEventDefinitionContract(d as unknown as EventDefinitionContract);
  assert(!res.valid, 'C.19 — Event missing freshness_budget_class rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.DEF_MISSING_FRESHNESS_CLASS),
    'C.20 — DEF_MISSING_FRESHNESS_CLASS emitted');
}

{
  const d = buildLegalEventDefinition() as unknown as Record<string, unknown>;
  d.materialization_policy = L6MaterializationPolicy.HISTORY_ONLY;
  const res = validateEventDefinitionContract(d as unknown as EventDefinitionContract);
  assert(!res.valid, 'C.21 — Event using HISTORY_ONLY materialization rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.DEF_MISSING_MATERIALIZATION_POLICY),
    'C.22 — Instance materialization violation emitted');
}

{
  const d = buildLegalEventDefinition() as unknown as Record<string, unknown>;
  d.version = 'not-a-version';
  const res = validateEventDefinitionContract(d as unknown as EventDefinitionContract);
  assert(!res.valid, 'C.23 — Event with invalid version rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.DEF_INVALID_VERSION),
    'C.24 — DEF_INVALID_VERSION emitted');
}

assert(REQUIRED_EVENT_DEFINITION_FIELDS.length >= 20, 'C.25 — ≥20 required event definition fields');
assert(REQUIRED_EVENT_DEFINITION_FIELDS.includes('evidence_source_declarations'), 'C.26 — evidence sources required');
assert(REQUIRED_EVENT_DEFINITION_FIELDS.includes('suppression_taxonomy_binding'), 'C.27 — suppression binding required');
assert(REQUIRED_EVENT_DEFINITION_FIELDS.includes('lifecycle_completeness'), 'C.28 — lifecycle completeness required');
assert(REQUIRED_EVENT_DEFINITION_FIELDS.includes('freshness_budget_class'), 'C.29 — freshness class required');
assert(REQUIRED_EVENT_DEFINITION_FIELDS.includes('definition_schema_version'), 'C.30 — schema version required');

// ═══════════════════════════════════════════════════════════════════════
// BAND D — Event Runtime Output Contract
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Event Runtime Output Contract ═══');
resetAll();

{
  const def = buildLegalEventDefinition();
  const out = buildLegalEventOutput();
  const res = validateEventOutput(out, def);
  assert(res.valid, 'D.1 — Legal event output accepted');
  assert(out.state === L6EventLifecycleState.CONFIRMED, 'D.2 — Event state is CONFIRMED');
  assert(out.confirmed_at !== null, 'D.3 — confirmed_at present');
  assert(isValidReplayHash(out.lineage.replay_hash), 'D.4 — Event replay_hash well-formed');
  assert(out.dedupe_key.length > 0, 'D.5 — dedupe_key non-empty');
  assert(out.suppression_group !== null, 'D.6 — suppression_group present');
}

{
  const def = buildLegalEventDefinition();
  const o = buildLegalEventOutput() as unknown as Record<string, unknown>;
  o.state = 'INVENTED_STATE';
  const res = validateEventOutput(o as unknown as EventOutput, def);
  assert(!res.valid, 'D.7 — Non-registered lifecycle state rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.OUT_INVALID_LIFECYCLE_STATE),
    'D.8 — OUT_INVALID_LIFECYCLE_STATE emitted');
}

{
  const def = buildLegalEventDefinition();
  const o = buildLegalEventOutput() as unknown as Record<string, unknown>;
  o.confirmed_at = '2026-04-02T00:00:00.000Z';
  o.candidate_at = '2026-04-03T00:00:00.000Z';
  const res = validateEventOutput(o as unknown as EventOutput, def);
  assert(!res.valid, 'D.9 — confirmed_at before candidate_at rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.OUT_IMPOSSIBLE_TIMESTAMP_ORDER),
    'D.10 — OUT_IMPOSSIBLE_TIMESTAMP_ORDER emitted');
}

{
  const def = buildLegalEventDefinition();
  const o = buildLegalEventOutput() as unknown as Record<string, unknown>;
  o.active_at = '2026-04-02T00:00:00.000Z';
  const res = validateEventOutput(o as unknown as EventOutput, def);
  assert(!res.valid, 'D.11 — active_at before confirmed_at rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.OUT_IMPOSSIBLE_TIMESTAMP_ORDER),
    'D.12 — Impossible ordering flagged');
}

{
  const def = buildLegalEventDefinition();
  const o = buildLegalEventOutput() as unknown as Record<string, unknown>;
  o.confirmed_at = null;
  const res = validateEventOutput(o as unknown as EventOutput, def);
  assert(!res.valid, 'D.13 — CONFIRMED state without confirmed_at rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.OUT_ILLEGAL_CONFIRMATION),
    'D.14 — OUT_ILLEGAL_CONFIRMATION emitted');
}

{
  const def = buildLegalEventDefinition();
  const o = buildLegalEventOutput() as unknown as Record<string, unknown>;
  (o.lineage as Record<string, unknown>).evidence_pack_ref = '';
  const res = validateEventOutput(o as unknown as EventOutput, def);
  assert(!res.valid, 'D.15 — CONFIRMED without evidence_pack_ref rejected');
  assert(res.violations.some(v =>
    v.code === L6ContractViolationCode.OUT_MISSING_LINEAGE_FIELD
    || v.code === L6ContractViolationCode.OUT_ILLEGAL_CONFIRMATION),
    'D.16 — Missing evidence lineage flagged');
}

{
  const def = buildLegalEventDefinition();
  const o = buildLegalEventOutput() as unknown as Record<string, unknown>;
  o.dedupe_key = '';
  const res = validateEventOutput(o as unknown as EventOutput, def);
  assert(!res.valid, 'D.17 — Empty dedupe_key rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.OUT_MISSING_DEDUPE_KEY),
    'D.18 — OUT_MISSING_DEDUPE_KEY emitted');
}

{
  const def = buildLegalEventDefinition();
  const o = buildLegalEventOutput() as unknown as Record<string, unknown>;
  o.state = L6EventLifecycleState.SUPPRESSED;
  o.suppression_group = null;
  const res = validateEventOutput(o as unknown as EventOutput, def);
  assert(!res.valid, 'D.19 — SUPPRESSED without suppression_group rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.OUT_MISSING_SUPPRESSION_GROUP),
    'D.20 — OUT_MISSING_SUPPRESSION_GROUP emitted');
}

{
  const def = buildLegalEventDefinition();
  const o = buildLegalEventOutput() as unknown as Record<string, unknown>;
  o.event_version = 'v2.0.0';
  const res = validateEventOutput(o as unknown as EventOutput, def);
  assert(!res.valid, 'D.21 — Event version mismatch rejected');
  assert(res.violations.some(v => v.code === L6ContractViolationCode.OUT_CONTRACT_VERSION_MISMATCH),
    'D.22 — OUT_CONTRACT_VERSION_MISMATCH emitted for event');
}

assert(REQUIRED_EVENT_OUTPUT_TOP_FIELDS.length >= 12, 'D.23 — ≥12 event output top fields');
assert(REQUIRED_EVENT_OUTPUT_LINEAGE_FIELDS.length === 6, 'D.24 — 6 event output lineage fields');
assert(isRegisteredLifecycleState(L6EventLifecycleState.CONFIRMED), 'D.25 — CONFIRMED registered');
assert(isRegisteredLifecycleState(L6EventLifecycleState.QUARANTINED), 'D.26 — QUARANTINED registered');
assert(!isRegisteredLifecycleState('FAKE'), 'D.27 — fake state not registered');
assert(isClosureState(L6EventLifecycleState.RESOLVED), 'D.28 — RESOLVED is closure state');
assert(isClosureState(L6EventLifecycleState.EXPIRED), 'D.29 — EXPIRED is closure state');
assert(!isClosureState(L6EventLifecycleState.ACTIVE), 'D.30 — ACTIVE is not closure state');
assert(LIFECYCLE_CLOSURE_STATES.length === 4, 'D.31 — 4 closure states');
assert(LIFECYCLE_ORDINAL_MAP[L6EventLifecycleState.CANDIDATE] === 0, 'D.32 — CANDIDATE ordinal is 0');
assert(LIFECYCLE_ORDINAL_MAP[L6EventLifecycleState.CONFIRMED]
  < LIFECYCLE_ORDINAL_MAP[L6EventLifecycleState.ACTIVE], 'D.33 — CONFIRMED precedes ACTIVE ordinally');

// ═══════════════════════════════════════════════════════════════════════
// BAND E — Compatibility and Versioning
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Compatibility and Versioning ═══');
resetAll();

{
  assert(parseContractVersion('v1') !== null, 'E.1 — v1 parses');
  assert(parseContractVersion('v1.2') !== null, 'E.2 — v1.2 parses');
  assert(parseContractVersion('v1.2.3') !== null, 'E.3 — v1.2.3 parses');
  assert(parseContractVersion('v1.2.3-alpha.1') !== null, 'E.4 — prerelease parses');
  assert(parseContractVersion('not-a-version') === null, 'E.5 — garbage rejected');
  assert(parseContractVersion('1.2.3') === null, 'E.6 — requires v prefix');
}

{
  const a = parseContractVersion('v1.2.3')!;
  const b = parseContractVersion('v1.2.4')!;
  assert(compareContractVersions(a, b) < 0, 'E.7 — v1.2.3 < v1.2.4');
  assert(compareContractVersions(b, a) > 0, 'E.8 — v1.2.4 > v1.2.3');
  assert(compareContractVersions(a, a) === 0, 'E.9 — equal versions are equal');
}

{
  assert(classifyVersionDelta('v1.0.0', 'v1.0.0').classification
    === L6ContractCompatibilityClass.COMPATIBLE, 'E.10 — Identical = COMPATIBLE');
  assert(classifyVersionDelta('v1.0.0', 'v1.1.0').classification
    === L6ContractCompatibilityClass.MINOR_CHANGE, 'E.11 — Minor bump = MINOR_CHANGE');
  assert(classifyVersionDelta('v1.0.0', 'v2.0.0').classification
    === L6ContractCompatibilityClass.BREAKING, 'E.12 — Major bump = BREAKING');
  assert(classifyVersionDelta('v2.0.0', 'v1.0.0').classification
    === L6ContractCompatibilityClass.BREAKING, 'E.13 — Major downgrade = BREAKING');
  assert(classifyVersionDelta('bad', 'v1.0.0').classification
    === L6ContractCompatibilityClass.INVALID_VERSION, 'E.14 — Invalid version');
}

{
  assert(resolveLatestVersion(['v1.0.0', 'v1.2.0', 'v1.1.5']) === 'v1.2.0', 'E.15 — resolveLatest picks highest');
  assert(resolveLatestVersion([]) === null, 'E.16 — empty version set returns null');
  assert(isSameMajor('v1.0.0', 'v1.9.9'), 'E.17 — same-major detection');
  assert(!isSameMajor('v1.0.0', 'v2.0.0'), 'E.18 — different-major detection');
}

{
  const prev = buildLegalFeatureDefinition();
  const minor: FeatureDefinitionContract = { ...prev, version: 'v1.1.0', definition_schema_version: 'v1.1.0' };
  const rep = checkFeatureDefinitionCompatibility(prev, minor);
  assert(rep.valid, 'E.19 — Minor feature bump has no violations');
  assert(rep.classification === L6ContractCompatibilityClass.MINOR_CHANGE, 'E.20 — minor bump classified MINOR_CHANGE');
}

{
  const prev = buildLegalFeatureDefinition();
  const breakingUnit: FeatureDefinitionContract = { ...prev, version: 'v2.0.0', unit: 'percent', definition_schema_version: 'v2.0.0' };
  const rep = checkFeatureDefinitionCompatibility(prev, breakingUnit);
  assert(!rep.valid, 'E.21 — Unit change has violations');
  assert(rep.violations.some(v => v.code === L6ContractViolationCode.COMPAT_BREAKING_UNIT_CHANGE),
    'E.22 — COMPAT_BREAKING_UNIT_CHANGE emitted');
  assert(rep.classification === L6ContractCompatibilityClass.BREAKING, 'E.23 — Unit change = BREAKING');
}

{
  const prev = buildLegalFeatureDefinition();
  const breakingValueKind: FeatureDefinitionContract = {
    ...prev, version: 'v2.0.0', value_kind: L6FeatureValueKind.BOOLEAN, definition_schema_version: 'v2.0.0',
  };
  const rep = checkFeatureDefinitionCompatibility(prev, breakingValueKind);
  assert(!rep.valid, 'E.24 — Value kind change has violations');
  assert(rep.violations.some(v => v.code === L6ContractViolationCode.COMPAT_BREAKING_VALUE_KIND_CHANGE),
    'E.25 — COMPAT_BREAKING_VALUE_KIND_CHANGE emitted');
}

{
  const prev = buildLegalFeatureDefinition();
  const breakingNormalization: FeatureDefinitionContract = {
    ...prev, version: 'v2.0.0', normalization_method: 'PERCENTILE', definition_schema_version: 'v2.0.0',
  };
  const rep = checkFeatureDefinitionCompatibility(prev, breakingNormalization);
  assert(rep.violations.some(v => v.code === L6ContractViolationCode.COMPAT_BREAKING_NORMALIZATION_CHANGE),
    'E.26 — COMPAT_BREAKING_NORMALIZATION_CHANGE emitted');
}

{
  const prev = buildLegalFeatureDefinition();
  const breakingMaterialization: FeatureDefinitionContract = {
    ...prev, version: 'v2.0.0',
    materialization_policy: L6MaterializationPolicy.HISTORY_ONLY,
    definition_schema_version: 'v2.0.0',
  };
  const rep = checkFeatureDefinitionCompatibility(prev, breakingMaterialization);
  assert(rep.violations.some(v => v.code === L6ContractViolationCode.COMPAT_BREAKING_MATERIALIZATION_CHANGE),
    'E.27 — COMPAT_BREAKING_MATERIALIZATION_CHANGE emitted');
}

{
  const prev = buildLegalFeatureDefinition();
  const idChange: FeatureDefinitionContract = { ...prev, primitive_id: 'funding.different_id.v1' };
  const rep = checkFeatureDefinitionCompatibility(prev, idChange);
  assert(rep.violations.some(v => v.code === L6ContractViolationCode.COMPAT_PRIMITIVE_ID_CHANGED),
    'E.28 — COMPAT_PRIMITIVE_ID_CHANGED emitted');
}

{
  const prev = buildLegalFeatureDefinition();
  const backwards: FeatureDefinitionContract = { ...prev, version: 'v0.9.0', definition_schema_version: 'v0.9.0' };
  const rep = checkFeatureDefinitionCompatibility(prev, backwards);
  assert(rep.violations.some(v => v.code === L6ContractViolationCode.COMPAT_VERSION_NOT_MONOTONIC),
    'E.29 — COMPAT_VERSION_NOT_MONOTONIC emitted');
}

{
  const prev = buildLegalEventDefinition();
  const breakingKind: EventDefinitionContract = { ...prev, version: 'v2.0.0', event_kind: L6EventKind.CHANGE_POINT, definition_schema_version: 'v2.0.0' };
  const rep = checkEventDefinitionCompatibility(prev, breakingKind);
  assert(rep.violations.some(v => v.code === L6ContractViolationCode.COMPAT_BREAKING_TRIGGER_CHANGE),
    'E.30 — Event kind change flagged as trigger breaking');
  assert(rep.classification === L6ContractCompatibilityClass.BREAKING, 'E.31 — Event kind change = BREAKING');
}

{
  const prev = buildLegalEventDefinition();
  const breakingLifecycle: EventDefinitionContract = {
    ...prev, version: 'v2.0.0', definition_schema_version: 'v2.0.0',
    lifecycle_completeness: { ...prev.lifecycle_completeness, requiresConfirmation: false },
  };
  const rep = checkEventDefinitionCompatibility(prev, breakingLifecycle);
  assert(rep.violations.some(v => v.code === L6ContractViolationCode.COMPAT_BREAKING_LIFECYCLE_CHANGE),
    'E.32 — Lifecycle shape change flagged as breaking');
}

{
  const prev = buildLegalEventDefinition();
  const breakingSuppression: EventDefinitionContract = {
    ...prev, version: 'v2.0.0', definition_schema_version: 'v2.0.0',
    suppression_taxonomy_binding: {
      ...prev.suppression_taxonomy_binding,
      suppressionGroupId: 'different-group',
    },
  };
  const rep = checkEventDefinitionCompatibility(prev, breakingSuppression);
  assert(rep.violations.some(v => v.code === L6ContractViolationCode.COMPAT_BREAKING_SUPPRESSION_CHANGE),
    'E.33 — Suppression binding change flagged as breaking');
}

{
  const resolver: ContractVersionResolver = createContractVersionResolver();
  resolver.register({ primitive_id: 'f.a', version: 'v1.0.0', registeredAt: '2026-04-01T00:00:00Z' });
  resolver.register({ primitive_id: 'f.a', version: 'v1.2.0', registeredAt: '2026-04-02T00:00:00Z' });
  resolver.register({ primitive_id: 'f.a', version: 'v1.1.0', registeredAt: '2026-04-03T00:00:00Z' });
  assert(resolver.list('f.a').length === 3, 'E.34 — Resolver lists all registered versions');
  assert(resolver.latest('f.a') === 'v1.2.0', 'E.35 — Resolver latest is highest');
  assert(resolver.isCompatible('f.a', 'v1.0.0', 'v1.1.0'), 'E.36 — Same major compatible');
  assert(!resolver.isCompatible('f.a', 'v1.0.0', 'v2.0.0'), 'E.37 — Different major incompatible');
  assert(resolver.classify('f.a', 'v1.0.0', 'v1.1.0').classification
    === L6ContractCompatibilityClass.MINOR_CHANGE, 'E.38 — Resolver classify matches');
}

// ═══════════════════════════════════════════════════════════════════════
// BAND F — Audit and Invariants
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND F: Audit and Invariants ═══');
resetAll();

{
  const d = buildLegalFeatureDefinition() as unknown as Record<string, unknown>;
  delete d.bounds;
  const res = validateFeatureDefinitionContract(d as unknown as FeatureDefinitionContract);
  const records = emitContractAuditResult(res, {
    primitive_id: 'funding.funding_z_score.v1',
    primitive_version: 'v1.0.0',
    trace_id: 'tr-F-001',
  });
  assert(records.length > 0, 'F.1 — Audit records emitted on violations');
  assert(records.every(r => r.primitive_id === 'funding.funding_z_score.v1'),
    'F.2 — Audit records carry primitive_id');
  assert(records.every(r => r.trace_id === 'tr-F-001'), 'F.3 — Audit records carry trace_id');
  assert(findContractAuditsByPrimitive('funding.funding_z_score.v1').length > 0,
    'F.4 — Audit lookup by primitive works');
  assert(findContractAuditsByTrace('tr-F-001').length > 0, 'F.5 — Audit lookup by trace works');
  assert(findContractAuditsByCode(L6ContractViolationCode.DEF_MISSING_BOUNDS).length > 0,
    'F.6 — Audit lookup by code works');
}

{
  resetAll();
  const def = buildLegalFeatureDefinition();
  const o = buildLegalFeatureOutput() as unknown as Record<string, unknown>;
  (o as unknown as { quality_state: L6QualityState }).quality_state = L6QualityState.FAIL;
  const res = validateFeatureOutput(o as unknown as FeatureOutput, def);
  const records = emitContractAuditResult(res, { primitive_id: def.primitive_id });
  const fatal = records.some(r => r.severity === L6ContractAuditSeverity.FATAL);
  assert(fatal, 'F.7 — Illegal VALID emission audited as FATAL');
}

{
  resetAll();
  const res = contractOk();
  const records = emitContractAuditResult(res);
  assert(records.length === 0, 'F.8 — Ok result emits no audit records');
  assert(getContractAuditLog().length === 0, 'F.9 — Audit log empty after ok result');
}

{
  resetAll();
  const v = contractViolation(L6ContractViolationCode.OUT_UNSTABLE_REPLAY_HASH, 'lineage.replay_hash', 'test');
  const record = emitContractAudit(v, { trace_id: 'tr-F-test' });
  assert(record.code === L6ContractViolationCode.OUT_UNSTABLE_REPLAY_HASH, 'F.10 — emitContractAudit returns record');
  assert(record.severity === L6ContractAuditSeverity.FATAL,
    'F.11 — OUT_UNSTABLE_REPLAY_HASH classified FATAL');
}

{
  const a = { a: 1, b: [3, 2, 1], c: { x: 1, y: 2 } };
  const b = { c: { y: 2, x: 1 }, b: [3, 2, 1], a: 1 };
  assert(canonicalJson(a) === canonicalJson(b), 'F.12 — canonicalJson is key-order invariant');
}
{
  const hash = computeReplayHash({
    primitive_id: 'p', primitive_version: 'v1.0.0',
    scope_type: 'ASSET', scope_id: 'BTC',
    temporal_anchor: '2026-04-03T00:00:00Z',
    material_inputs: { a: 1 },
  });
  assert(isValidReplayHash(hash), 'F.13 — computeReplayHash emits valid sha256');
  const hash2 = computeReplayHash({
    primitive_id: 'p', primitive_version: 'v1.0.0',
    scope_type: 'ASSET', scope_id: 'BTC',
    temporal_anchor: '2026-04-03T00:00:00Z',
    material_inputs: { a: 1 },
  });
  assert(hash === hash2, 'F.14 — replay hash deterministic');
  const hash3 = computeReplayHash({
    primitive_id: 'p', primitive_version: 'v1.0.0',
    scope_type: 'ASSET', scope_id: 'ETH',
    temporal_anchor: '2026-04-03T00:00:00Z',
    material_inputs: { a: 1 },
  });
  assert(hash !== hash3, 'F.15 — replay hash changes with scope');
}

{
  assert(ALL_CONTRACT_VIOLATION_CODES.length >= 35, 'F.16 — ≥35 contract violation codes');
  assert(ALL_CONTRACT_VIOLATION_CODES.includes(L6ContractViolationCode.DEF_MISSING_BLOCK),
    'F.17 — DEF_MISSING_BLOCK present');
  assert(ALL_CONTRACT_VIOLATION_CODES.includes(L6ContractViolationCode.OUT_IMPOSSIBLE_TIMESTAMP_ORDER),
    'F.18 — OUT_IMPOSSIBLE_TIMESTAMP_ORDER present');
  assert(ALL_CONTRACT_VIOLATION_CODES.includes(L6ContractViolationCode.COMPAT_BREAKING_SCOPE_CHANGE),
    'F.19 — COMPAT_BREAKING_SCOPE_CHANGE present');
}

{
  const r = contractMerge(contractOk(), contractFail([contractViolation(
    L6ContractViolationCode.OUT_MISSING_FIELD, 'x', 'y',
  )]));
  assert(!r.valid, 'F.20 — contractMerge aggregates violations');
  assert(r.violations.length === 1, 'F.21 — merged violations count correct');
}

{
  assert(isValidMaterializationPolicy(L6MaterializationPolicy.CURRENT_STATE_AND_HISTORY),
    'F.22 — CURRENT_STATE_AND_HISTORY valid');
  assert(!isValidMaterializationPolicy('FAKE'), 'F.23 — FAKE policy rejected');
  assert(materializationRequiresCurrentState(L6MaterializationPolicy.CURRENT_STATE_AND_HISTORY),
    'F.24 — current-state required for current+history');
  assert(materializationRequiresHistory(L6MaterializationPolicy.HISTORY_ONLY),
    'F.25 — history required for history-only');
  assert(materializationRequiresInstance(L6MaterializationPolicy.INSTANCE_ONLY),
    'F.26 — instance required for instance-only');
  const desc = getMaterializationDescriptor(L6MaterializationPolicy.CURRENT_STATE_AND_INSTANCE)!;
  assert(desc.replayRequired === true, 'F.27 — replay required on all policies');
  assert(desc.requiredSinks.includes(L6MaterializationSink.CLICKHOUSE_EVENT_INSTANCE),
    'F.28 — current+instance sinks include event instance');
  assert(Object.keys(MATERIALIZATION_POLICY_DESCRIPTORS).length === 4,
    'F.29 — 4 materialization policies registered');
}

{
  const invariants = checkAllL6_3Invariants();
  assert(invariants.length === 9, 'F.30 — 9 invariants present');
  for (const inv of invariants) {
    assert(inv.holds, `F.invariant — ${inv.id} holds: ${inv.evidence}`);
  }
  assert(checkINV_63_A().holds, 'F.31 — INV-6.3-A holds');
  assert(checkINV_63_B().holds, 'F.32 — INV-6.3-B holds');
  assert(checkINV_63_C().holds, 'F.33 — INV-6.3-C holds');
  assert(checkINV_63_D().holds, 'F.34 — INV-6.3-D holds');
  assert(checkINV_63_E().holds, 'F.35 — INV-6.3-E holds');
  assert(checkINV_63_F().holds, 'F.36 — INV-6.3-F holds');
  assert(checkINV_63_G().holds, 'F.37 — INV-6.3-G holds');
  assert(checkINV_63_H().holds, 'F.38 — INV-6.3-H holds');
  assert(checkINV_63_I().holds, 'F.39 — INV-6.3-I holds');
}

// ═══════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('L6.3 Contract Certification Summary');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Total:  ${passed + failed}`);

if (failed === 0) {
  console.log('\n✓ L6.3 — Universal Contracts: CERTIFIED');
  process.exit(0);
} else {
  console.error(`\n✗ L6.3 — ${failed} assertion(s) failed`);
  process.exit(1);
}
