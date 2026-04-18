/**
 * L6.5 — Temporal and Missingness Constitution Certification Test Suite
 *
 * 6 Bands:
 *   A — Time surfaces and ordering
 *   B — Window library (legality + deterministic identity)
 *   C — Baselines and warmup
 *   D — Null and missingness
 *   E — Late data
 *   F — Temporal honesty, audit, and invariants
 */

import {
  // temporal surfaces
  L6TemporalMode,
  L6TemporalSurfaces,
  L6TemporalIdentity,
  REQUIRED_SURFACES_BY_MODE,
  ALL_TEMPORAL_MODES,
  // windows
  L6WindowClass,
  L6StandardWindowDuration,
  STANDARD_WINDOW_DURATION_MS,
  L6WindowAnchorPolicy,
  L6WindowAlignmentPolicy,
  L6LateDataInclusionPolicy,
  L6TemporalWindowSpec,
  L6TemporalWindowInstance,
  ALL_STANDARD_WINDOW_DURATIONS,
  // baselines
  L6TemporalBaselineSpec,
  L6TemporalBaselineInstance,
  L6BaselineNormalizationMode,
  L6BaselineFailureCode,
  L6BaselineQualityState,
  // warmup
  L6WarmupSpec,
  L6WarmupState,
  L6WarmupOverrideMode,
  defaultRequiredWarmupMs,
  // null
  L6NullStateClass,
  L6NullPolicyMode,
  L6MissingnessReasonCode,
  L6NullPolicyDecision,
  // late data
  L6LateDataClass,
  L6LateDataDecisionCode,
  L6LateDataContext,
  mutatesCurrentAuthoritativeTruth,
  // honesty
  L6TemporalHonestyClass,
  L6TemporalViolationCode,
  isCleanHonestyClass,
  // shared
  L6ScopeType,
  L6FeatureValidityState,
  L6EventLifecycleState,
  L6CoverageRequirementClass,
  L6NullPolicy,
  NullPolicySpec,
} from '../l6/contracts';

import {
  TemporalSurfaceValidator,
  WindowLegalityValidator,
  canonicalWindowId,
  BaselineValidityValidator,
  canonicalBaselineInstanceId,
  WarmupLegalityValidator,
  NullPolicyValidator,
  policyToMode,
  LateDataPolicyValidator,
  TemporalHonestyClassifier,
} from '../l6/temporal';

import { L6BaselineMethod } from '../l6/engine';

import {
  emitTemporalAudit,
  emitTemporalAudits,
  getTemporalAuditLog,
  findTemporalAuditsByCode,
  findTemporalAuditsByTrace,
  findTemporalAuditsByComputeRun,
  clearTemporalAuditLog,
  L6TemporalAuditSeverity,
} from '../l6/constitution';

import {
  checkAllL6_5Invariants,
  checkINV_65_A, checkINV_65_B, checkINV_65_C, checkINV_65_D,
  checkINV_65_E, checkINV_65_F, checkINV_65_G,
  buildLegalSurfaces,
  buildLegalTemporalIdentity,
  buildLegalWindowSpec,
  buildLegalWindowInstance,
  buildLegalBaselineSpec,
  buildLegalBaselineInstance,
  buildLegalWarmupSpec,
} from '../l6/invariants';

let passed = 0;
let failed = 0;
const t0 = Date.now();

function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; console.error(`  ✗ FAIL: ${label}`); }
}

// ═══════════════════════════════════════════════════════════════════════
// BAND A — Time Surfaces and Ordering
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Time Surfaces and Ordering ═══');

{
  assert(ALL_TEMPORAL_MODES.length === 6, 'A.1 — 6 temporal modes registered');
  assert(REQUIRED_SURFACES_BY_MODE[L6TemporalMode.WINDOWED].includes('window_start'),
    'A.2 — WINDOWED requires window_start');
  assert(REQUIRED_SURFACES_BY_MODE[L6TemporalMode.EVENT_BOUND].includes('detected_at'),
    'A.3 — EVENT_BOUND requires detected_at');
  assert(!REQUIRED_SURFACES_BY_MODE[L6TemporalMode.POINT_IN_TIME].includes('window_start'),
    'A.4 — POINT_IN_TIME does not require window_start');
}

{
  const v = new TemporalSurfaceValidator();
  const legal = v.validate(buildLegalTemporalIdentity());
  assert(legal.ok, 'A.5 — Legal temporal identity passes');
  assert(legal.violations.length === 0, 'A.6 — No violations on legal identity');
}

{
  const v = new TemporalSurfaceValidator();
  const missing: L6TemporalIdentity = {
    ...buildLegalTemporalIdentity(),
    surfaces: { ...buildLegalSurfaces(), window_start: null },
  };
  const r = v.validate(missing);
  assert(!r.ok, 'A.7 — Missing window_start rejected for WINDOWED');
  assert(
    r.violations.some(x => x.code === L6TemporalViolationCode.TIME_SURFACE_MISSING),
    'A.8 — TIME_SURFACE_MISSING code emitted',
  );
}

{
  const v = new TemporalSurfaceValidator();
  const collapsed: L6TemporalSurfaces = {
    observed_at: '2026-01-01T00:00:00.000Z',
    ingested_at: '2026-01-01T00:00:00.000Z',
    as_of: '2026-01-01T00:00:00.000Z',
    effective_at: '2026-01-01T00:00:00.000Z',
    window_start: '2025-12-31T23:00:00.000Z',
    window_end: '2026-01-01T00:00:00.000Z',
    detected_at: null,
    resolved_at: null,
  };
  const r = v.validate({ ...buildLegalTemporalIdentity(), surfaces: collapsed });
  assert(!r.ok, 'A.9 — Collapsed timestamps rejected');
  assert(
    r.violations.some(x => x.code === L6TemporalViolationCode.TIME_SURFACE_COLLAPSED),
    'A.10 — TIME_SURFACE_COLLAPSED code emitted',
  );
}

{
  const v = new TemporalSurfaceValidator();
  const reversed: L6TemporalSurfaces = {
    ...buildLegalSurfaces(),
    window_start: '2026-02-01T00:00:00.000Z',
    window_end: '2026-01-01T00:00:00.000Z',
  };
  const r = v.validate({ ...buildLegalTemporalIdentity(), surfaces: reversed });
  assert(!r.ok, 'A.11 — window_start > window_end rejected');
  assert(
    r.violations.some(x => x.code === L6TemporalViolationCode.TIME_ORDERING_VIOLATED),
    'A.12 — TIME_ORDERING_VIOLATED code emitted',
  );
}

{
  const v = new TemporalSurfaceValidator();
  const replayNotMarked: L6TemporalIdentity = {
    ...buildLegalTemporalIdentity(),
    temporal_mode: L6TemporalMode.HISTORICAL_REPLAY,
    historical_mode: false,
  };
  const r = v.validate(replayNotMarked);
  assert(
    !r.ok && r.violations.some(x => x.code === L6TemporalViolationCode.HISTORICAL_OUTPUT_MISSING_MARKERS),
    'A.13 — HISTORICAL_REPLAY without historical_mode=true rejected',
  );
}

{
  const v = new TemporalSurfaceValidator();
  const eventBound: L6TemporalIdentity = {
    ...buildLegalTemporalIdentity(),
    temporal_mode: L6TemporalMode.EVENT_BOUND,
    surfaces: {
      ...buildLegalSurfaces(),
      detected_at: '2025-12-31T23:00:00.000Z',
      resolved_at: '2025-12-31T22:00:00.000Z',
    },
  };
  const r = v.validate(eventBound);
  assert(!r.ok, 'A.14 — resolved_at before detected_at rejected');
}

// ═══════════════════════════════════════════════════════════════════════
// BAND B — Window Library and Deterministic Identity
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Window Library and Deterministic Identity ═══');

{
  assert(ALL_STANDARD_WINDOW_DURATIONS.length === 11,
    'B.1 — 10 governed durations + CUSTOM = 11');
  assert(STANDARD_WINDOW_DURATION_MS[L6StandardWindowDuration.ONE_HOUR] === 3600_000,
    'B.2 — 1h duration = 3600000 ms');
  assert(STANDARD_WINDOW_DURATION_MS[L6StandardWindowDuration.NINETY_DAY] === 90 * 86400_000,
    'B.3 — 90d duration = 90 * 86400000 ms');
  assert(STANDARD_WINDOW_DURATION_MS[L6StandardWindowDuration.CUSTOM] === null,
    'B.4 — CUSTOM has no standard duration');
}

{
  const v = new WindowLegalityValidator();
  const spec = buildLegalWindowSpec();
  const inst = buildLegalWindowInstance(spec);
  const r = v.validateInstance(spec, inst);
  assert(r.ok, 'B.5 — Legal window instance passes');
  assert(r.expected_window_id === inst.window_id,
    'B.6 — Canonical window_id matches legal instance');
}

{
  const v = new WindowLegalityValidator();
  const spec: L6TemporalWindowSpec = { ...buildLegalWindowSpec(), duration_ms: 99 };
  const r = v.validateSpec(spec);
  assert(!r.ok, 'B.7 — duration_ms mismatching standard rejected');
  assert(
    r.violations.some(x => x.code === L6TemporalViolationCode.WINDOW_NOT_FROM_GOVERNED_LIBRARY),
    'B.8 — WINDOW_NOT_FROM_GOVERNED_LIBRARY code emitted',
  );
}

{
  const v = new WindowLegalityValidator();
  const spec = buildLegalWindowSpec();
  const base = buildLegalWindowInstance(spec);
  const forged: L6TemporalWindowInstance = { ...base, window_id: 'win_forged' };
  const r = v.validateInstance(spec, forged);
  assert(!r.ok, 'B.9 — Forged window_id rejected');
  assert(
    r.violations.some(x => x.code === L6TemporalViolationCode.WINDOW_IDENTITY_NON_DETERMINISTIC),
    'B.10 — WINDOW_IDENTITY_NON_DETERMINISTIC emitted',
  );
}

{
  const v = new WindowLegalityValidator();
  const spec = buildLegalWindowSpec();
  const base = buildLegalWindowInstance(spec);
  const underCovered: L6TemporalWindowInstance = { ...base, coverage_ratio: 0.1 };
  const r = v.validateInstance(spec, underCovered);
  assert(!r.ok, 'B.11 — Under-covered window rejected');
  assert(
    r.violations.some(x => x.code === L6TemporalViolationCode.WINDOW_COVERAGE_INSUFFICIENT),
    'B.12 — WINDOW_COVERAGE_INSUFFICIENT emitted',
  );
}

{
  // Canonical id stability: same inputs → same id; different late_data_flag → different id.
  const spec = buildLegalWindowSpec();
  const a = canonicalWindowId(spec, 'ASSET', 'BTC', '2026-01-01T00:00:00.000Z', false, false);
  const b = canonicalWindowId(spec, 'ASSET', 'BTC', '2026-01-01T00:00:00.000Z', false, false);
  const c = canonicalWindowId(spec, 'ASSET', 'BTC', '2026-01-01T00:00:00.000Z', false, true);
  const d = canonicalWindowId(spec, 'ASSET', 'BTC', '2026-01-01T00:00:00.000Z', true, false);
  assert(a === b, 'B.13 — Canonical window_id deterministic');
  assert(a !== c, 'B.14 — late_data_flag differentiates window_id');
  assert(a !== d, 'B.15 — historical_mode differentiates window_id');
}

{
  // Window class taxonomy
  const classes = Object.values(L6WindowClass);
  assert(classes.length === 7, 'B.16 — 7 window classes (rolling/aligned/evt/sched/base/peer/replay)');
  assert(classes.includes(L6WindowClass.EVENT_CONFIRMATION), 'B.17 — EVENT_CONFIRMATION class registered');
  assert(classes.includes(L6WindowClass.PEER_COMPARISON), 'B.18 — PEER_COMPARISON class registered');
}

// ═══════════════════════════════════════════════════════════════════════
// BAND C — Baselines and Warmup
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Baselines and Warmup ═══');

{
  const v = new BaselineValidityValidator();
  const spec = buildLegalBaselineSpec();
  const inst = buildLegalBaselineInstance(spec);
  const ok_ctx = {
    peer_relative_in_use: false,
    regime_relative_in_use: false,
    observed_sample_count: 60,
    observed_history_duration_ms: spec.warmup_duration_ms,
    window_legal: true,
    inputs_legal: true,
  };
  const r = v.validateInstance(spec, inst, ok_ctx);
  assert(r.ok, 'C.1 — Legal baseline instance passes');
  assert(r.expected_instance_id === inst.baseline_instance_id, 'C.2 — Canonical baseline_instance_id stable');
}

{
  const v = new BaselineValidityValidator();
  const spec = buildLegalBaselineSpec();
  const inst = buildLegalBaselineInstance(spec);
  const r = v.validateInstance(spec, inst, {
    peer_relative_in_use: false, regime_relative_in_use: false,
    observed_sample_count: 3, observed_history_duration_ms: spec.warmup_duration_ms,
    window_legal: true, inputs_legal: true,
  });
  assert(!r.ok, 'C.3 — Insufficient observations rejected');
  assert(
    r.violations.some(x => x.failure_code === L6BaselineFailureCode.INSUFFICIENT_OBSERVATIONS),
    'C.4 — INSUFFICIENT_OBSERVATIONS failure code emitted',
  );
}

{
  const v = new BaselineValidityValidator();
  const spec = buildLegalBaselineSpec();
  const inst = buildLegalBaselineInstance(spec);
  const r = v.validateInstance(spec, inst, {
    peer_relative_in_use: true, regime_relative_in_use: false,
    observed_sample_count: 60, observed_history_duration_ms: spec.warmup_duration_ms,
    window_legal: true, inputs_legal: true,
  });
  assert(!r.ok, 'C.5 — Peer-relative use rejected when spec forbids');
  assert(
    r.violations.some(x => x.failure_code === L6BaselineFailureCode.PEER_RELATIVE_NOT_ALLOWED),
    'C.6 — PEER_RELATIVE_NOT_ALLOWED failure code emitted',
  );
}

{
  const v = new BaselineValidityValidator();
  const spec = buildLegalBaselineSpec();
  const inst = buildLegalBaselineInstance(spec);
  const r = v.validateInstance(spec, inst, {
    peer_relative_in_use: false, regime_relative_in_use: false,
    observed_sample_count: 60, observed_history_duration_ms: 0,
    window_legal: true, inputs_legal: true,
  });
  assert(!r.ok && r.violations.some(x => x.failure_code === L6BaselineFailureCode.WARMUP_NOT_SATISFIED),
    'C.7 — Warmup failure reported as BASELINE_ILLEGAL/WARMUP_NOT_SATISFIED');
}

{
  const v = new BaselineValidityValidator();
  const spec = buildLegalBaselineSpec();
  const blocked: L6TemporalBaselineInstance = {
    ...buildLegalBaselineInstance(spec),
    baseline_quality_state: L6BaselineQualityState.BLOCKED,
    // retains baseline_value intentionally (illegal)
  };
  const r = v.validateInstance(spec, blocked, {
    peer_relative_in_use: false, regime_relative_in_use: false,
    observed_sample_count: 60, observed_history_duration_ms: spec.warmup_duration_ms,
    window_legal: true, inputs_legal: true,
  });
  assert(!r.ok, 'C.8 — BLOCKED baseline with numeric value rejected');
}

{
  // Canonical id determinism
  const spec = buildLegalBaselineSpec();
  const a = canonicalBaselineInstanceId(spec, 'ASSET', 'BTC', 'win_test', false);
  const b = canonicalBaselineInstanceId(spec, 'ASSET', 'BTC', 'win_test', false);
  const c = canonicalBaselineInstanceId(spec, 'ASSET', 'BTC', 'win_test', true);
  assert(a === b, 'C.9 — canonical baseline id deterministic');
  assert(a !== c, 'C.10 — historical_mode differentiates baseline id');
}

{
  const w = new WarmupLegalityValidator();
  const spec = buildLegalWarmupSpec();
  const sat = w.deriveStatus(
    spec,
    { observed_history_duration_ms: spec.required_history_duration_ms, observed_sample_count: spec.min_observation_count, coverage_ratio: 1 },
    { baseline_window_durations_ms: [spec.required_history_duration_ms / 3], dependency_blocked: false, baseline_blocked: false },
  );
  assert(sat.warmup_satisfied && sat.state === L6WarmupState.READY, 'C.11 — Satisfied warmup → READY');

  const warming = w.deriveStatus(
    spec,
    { observed_history_duration_ms: 1, observed_sample_count: 0, coverage_ratio: 0 },
    { baseline_window_durations_ms: [spec.required_history_duration_ms / 3], dependency_blocked: false, baseline_blocked: false },
  );
  assert(!warming.warmup_satisfied && warming.state === L6WarmupState.WARMING_UP, 'C.12 — Short history → WARMING_UP');

  const blocked = w.deriveStatus(
    spec,
    { observed_history_duration_ms: spec.required_history_duration_ms, observed_sample_count: spec.min_observation_count, coverage_ratio: 1 },
    { baseline_window_durations_ms: [], dependency_blocked: false, baseline_blocked: true },
  );
  assert(blocked.state === L6WarmupState.BLOCKED_BY_BASELINE, 'C.13 — Baseline blocked propagates to warmup');
}

{
  const w = new WarmupLegalityValidator();
  const spec = buildLegalWarmupSpec();
  const warming = w.deriveStatus(
    spec,
    { observed_history_duration_ms: 1, observed_sample_count: 0, coverage_ratio: 0 },
    { baseline_window_durations_ms: [spec.required_history_duration_ms / 3], dependency_blocked: false, baseline_blocked: false },
  );
  const ready = w.deriveStatus(
    spec,
    { observed_history_duration_ms: spec.required_history_duration_ms, observed_sample_count: spec.min_observation_count, coverage_ratio: 1 },
    { baseline_window_durations_ms: [spec.required_history_duration_ms / 3], dependency_blocked: false, baseline_blocked: false },
  );

  assert(!w.isFeatureEmissionLegal(L6FeatureValidityState.VALID, warming, spec).ok,
    'C.14 — VALID emission forbidden while warming up');
  assert(w.isFeatureEmissionLegal(L6FeatureValidityState.VALID, ready, spec).ok,
    'C.15 — VALID emission allowed when READY');
  assert(!w.isEventConfirmationLegal(L6EventLifecycleState.CONFIRMED, warming, spec).ok,
    'C.16 — CONFIRMED transition forbidden while warming up');
  assert(w.isEventConfirmationLegal(L6EventLifecycleState.CONFIRMED, ready, spec).ok,
    'C.17 — CONFIRMED transition allowed when READY');
}

{
  // Default 3× longest baseline window rule
  const longest = STANDARD_WINDOW_DURATION_MS[L6StandardWindowDuration.ONE_DAY]!;
  assert(defaultRequiredWarmupMs([longest, 3600_000]) === 3 * longest, 'C.18 — default warmup = 3× longest');
  assert(defaultRequiredWarmupMs([]) === 0, 'C.19 — empty baseline set → 0 warmup default');
}

// ═══════════════════════════════════════════════════════════════════════
// BAND D — Null and Missingness
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Null and Missingness ═══');

{
  const classes = Object.values(L6NullStateClass);
  assert(classes.length === 7, 'D.1 — 7 null-state classes registered');
  assert(classes.includes(L6NullStateClass.FRESHNESS_FAILURE), 'D.2 — FRESHNESS_FAILURE included');
  assert(classes.includes(L6NullStateClass.WARMUP_FAILURE), 'D.3 — WARMUP_FAILURE included');
}

{
  assert(Object.values(L6NullPolicyMode).length === 4, 'D.4 — 4 null policy modes');
  assert(policyToMode(L6NullPolicy.REJECT_IF_MISSING) === L6NullPolicyMode.BLOCK,
    'D.5 — REJECT_IF_MISSING maps to BLOCK');
  assert(policyToMode(L6NullPolicy.DEGRADE_EXPLICITLY) === L6NullPolicyMode.DEGRADE,
    'D.6 — DEGRADE_EXPLICITLY maps to DEGRADE');
  assert(policyToMode(L6NullPolicy.PROVISIONAL_IF_PARTIAL) === L6NullPolicyMode.PROVISIONAL,
    'D.7 — PROVISIONAL_IF_PARTIAL maps to PROVISIONAL');
  assert(policyToMode(L6NullPolicy.EXPLICIT_ABSENT_STATE) === L6NullPolicyMode.SPARSE_EMIT,
    'D.8 — EXPLICIT_ABSENT_STATE maps to SPARSE_EMIT');
}

{
  const v = new NullPolicyValidator();
  const legalSpec: NullPolicySpec = {
    policy: L6NullPolicy.DEGRADE_EXPLICITLY,
    rationale: 'input may be late but never silently substituted',
    fieldsCovered: ['value'],
  };
  const r = v.validateSpec(legalSpec);
  assert(r.ok && r.policy_mode === L6NullPolicyMode.DEGRADE, 'D.9 — Legal null policy spec passes');
}

{
  const v = new NullPolicyValidator();
  const forbidden: NullPolicySpec = {
    policy: L6NullPolicy.DEGRADE_EXPLICITLY,
    rationale: 'we zero_fill when missing',
    fieldsCovered: ['value'],
  };
  const r = v.validateSpec(forbidden);
  assert(!r.ok, 'D.10 — Forbidden fallback token in rationale rejected');
  assert(
    r.violations.some(x => x.code === L6TemporalViolationCode.NULL_POLICY_FORBIDDEN_FALLBACK),
    'D.11 — NULL_POLICY_FORBIDDEN_FALLBACK emitted',
  );
}

{
  const v = new NullPolicyValidator();
  const empty: NullPolicySpec = {
    policy: L6NullPolicy.DEGRADE_EXPLICITLY,
    rationale: 'ok',
    fieldsCovered: [],
  };
  const r = v.validateSpec(empty);
  assert(!r.ok && r.violations.some(x => x.code === L6TemporalViolationCode.NULL_POLICY_MISSING),
    'D.12 — Empty fieldsCovered rejected');
}

{
  const v = new NullPolicyValidator();
  const decision: L6NullPolicyDecision = {
    policy_mode: L6NullPolicyMode.DEGRADE,
    null_state_class: L6NullStateClass.MISSING_REQUIRED_INPUT,
    reason_code: L6MissingnessReasonCode.INPUT_NOT_FRESH,
    rationale: 'upstream stale',
  };
  assert(v.validateDecision(decision, L6FeatureValidityState.DEGRADED).ok,
    'D.13 — Legal missingness decision passes');

  const asValid = v.validateDecision(decision, L6FeatureValidityState.VALID);
  assert(!asValid.ok && asValid.violations.some(x => x.code === L6TemporalViolationCode.NULL_STATE_INCONSISTENT_WITH_VALIDITY),
    'D.14 — VALID + missingness class rejected');
}

{
  const v = new NullPolicyValidator();
  const missingReason: L6NullPolicyDecision = {
    policy_mode: L6NullPolicyMode.DEGRADE,
    null_state_class: L6NullStateClass.MISSING_REQUIRED_INPUT,
    reason_code: null,
    rationale: 'oops',
  };
  assert(!v.validateDecision(missingReason, L6FeatureValidityState.DEGRADED).ok,
    'D.15 — Missingness class without reason_code rejected');

  const noneWithReason: L6NullPolicyDecision = {
    policy_mode: L6NullPolicyMode.DEGRADE,
    null_state_class: L6NullStateClass.NONE,
    reason_code: L6MissingnessReasonCode.INPUT_NEVER_OBSERVED,
    rationale: 'extra reason',
  };
  assert(!v.validateDecision(noneWithReason, L6FeatureValidityState.VALID).ok,
    'D.16 — NONE class with reason_code rejected');
}

{
  const v = new NullPolicyValidator();
  const blockDecision: L6NullPolicyDecision = {
    policy_mode: L6NullPolicyMode.BLOCK,
    null_state_class: L6NullStateClass.GATED_BLOCK,
    reason_code: L6MissingnessReasonCode.GATED_BY_POLICY,
    rationale: 'blocked',
  };
  assert(v.validateDecision(blockDecision, L6FeatureValidityState.BLOCKED).ok,
    'D.17 — BLOCK mode + BLOCKED validity passes');
  assert(!v.validateDecision(blockDecision, L6FeatureValidityState.DEGRADED).ok,
    'D.18 — BLOCK mode + DEGRADED validity rejected');
}

// ═══════════════════════════════════════════════════════════════════════
// BAND E — Late Data
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Late Data ═══');

{
  const classes = Object.values(L6LateDataClass);
  assert(classes.length === 6, 'E.1 — 6 late-data classes registered');
  assert(mutatesCurrentAuthoritativeTruth(L6LateDataClass.LATE_GOVERNED_REMATERIALIZATION_CANDIDATE),
    'E.2 — rematerialization candidate recognized as current-mutating');
  assert(!mutatesCurrentAuthoritativeTruth(L6LateDataClass.LATE_HISTORICAL_ONLY),
    'E.3 — historical-only does not mutate current');
}

{
  const v = new LateDataPolicyValidator();
  const onTime: L6LateDataContext = {
    observed_at: '2026-01-01T00:00:00.000Z',
    ingested_at: '2026-01-01T00:00:00.000Z',
    current_as_of: '2026-01-01T00:00:00.000Z',
    lateness_ms: 0, lateness_horizon_ms: 60000,
    impacted_window_coverage_ratio: 0,
    current_state_materially_affected: false,
    event_state_may_change: false,
    contract_allows_rematerialization: false,
    l5_rematerialization_path_legal: false,
  };
  const r = v.classify(onTime);
  assert(r.classification === L6LateDataClass.ON_TIME, 'E.4 — on-time classified');
  assert(r.decision_code === L6LateDataDecisionCode.ACCEPTED_ON_TIME, 'E.5 — ACCEPTED_ON_TIME emitted');
}

{
  const v = new LateDataPolicyValidator();
  const beyond: L6LateDataContext = {
    observed_at: 'x', ingested_at: 'y', current_as_of: 'z',
    lateness_ms: 1000, lateness_horizon_ms: 100,
    impacted_window_coverage_ratio: 0,
    current_state_materially_affected: false,
    event_state_may_change: false,
    contract_allows_rematerialization: false,
    l5_rematerialization_path_legal: false,
  };
  const r = v.classify(beyond);
  assert(r.classification === L6LateDataClass.LATE_REJECTED, 'E.6 — beyond horizon rejected');
  assert(r.decision_code === L6LateDataDecisionCode.REJECTED_STALE_BEYOND_HORIZON, 'E.7 — REJECTED_STALE_BEYOND_HORIZON emitted');
}

{
  const v = new LateDataPolicyValidator();
  const histOnly: L6LateDataContext = {
    observed_at: 'x', ingested_at: 'y', current_as_of: 'z',
    lateness_ms: 500, lateness_horizon_ms: 10_000,
    impacted_window_coverage_ratio: 0.2,
    current_state_materially_affected: false,
    event_state_may_change: false,
    contract_allows_rematerialization: true,
    l5_rematerialization_path_legal: true,
  };
  const r = v.classify(histOnly);
  assert(r.classification === L6LateDataClass.LATE_HISTORICAL_ONLY, 'E.8 — historical-only classified');
  assert(r.decision_code === L6LateDataDecisionCode.ROUTED_HISTORICAL_REBUILD, 'E.9 — ROUTED_HISTORICAL_REBUILD emitted');
}

{
  const v = new LateDataPolicyValidator();
  const evt: L6LateDataContext = {
    observed_at: 'x', ingested_at: 'y', current_as_of: 'z',
    lateness_ms: 500, lateness_horizon_ms: 10_000,
    impacted_window_coverage_ratio: 0,
    current_state_materially_affected: false,
    event_state_may_change: true,
    contract_allows_rematerialization: false,
    l5_rematerialization_path_legal: false,
  };
  const r = v.classify(evt);
  assert(r.classification === L6LateDataClass.LATE_EVENT_RECOMPUTE, 'E.10 — event recompute classified');
  assert(r.decision_code === L6LateDataDecisionCode.ROUTED_EVENT_RECOMPUTE, 'E.11 — ROUTED_EVENT_RECOMPUTE emitted');
}

{
  const v = new LateDataPolicyValidator();
  const remat: L6LateDataContext = {
    observed_at: 'x', ingested_at: 'y', current_as_of: 'z',
    lateness_ms: 500, lateness_horizon_ms: 10_000,
    impacted_window_coverage_ratio: 1,
    current_state_materially_affected: true,
    event_state_may_change: true,
    contract_allows_rematerialization: true,
    l5_rematerialization_path_legal: true,
  };
  const r = v.classify(remat);
  assert(r.classification === L6LateDataClass.LATE_GOVERNED_REMATERIALIZATION_CANDIDATE,
    'E.12 — rematerialization candidate classified');
  assert(r.decision_code === L6LateDataDecisionCode.ROUTED_REMATERIALIZATION_REVIEW,
    'E.13 — ROUTED_REMATERIALIZATION_REVIEW emitted');
}

{
  const v = new LateDataPolicyValidator();
  const wouldMutate: L6LateDataContext = {
    observed_at: 'x', ingested_at: 'y', current_as_of: 'z',
    lateness_ms: 500, lateness_horizon_ms: 10_000,
    impacted_window_coverage_ratio: 1,
    current_state_materially_affected: true,
    event_state_may_change: true,
    contract_allows_rematerialization: true,
    l5_rematerialization_path_legal: false,
  };
  const r = v.classify(wouldMutate);
  assert(r.classification === L6LateDataClass.LATE_REJECTED, 'E.14 — blocked when L5 path not legal');
  assert(r.decision_code === L6LateDataDecisionCode.REJECTED_WOULD_MUTATE_CURRENT_SILENTLY,
    'E.15 — REJECTED_WOULD_MUTATE_CURRENT_SILENTLY emitted');

  const forbidden: L6LateDataContext = { ...wouldMutate, contract_allows_rematerialization: false, l5_rematerialization_path_legal: true };
  const r2 = v.classify(forbidden);
  assert(r2.decision_code === L6LateDataDecisionCode.REJECTED_CONTRACT_FORBIDS_REMATERIALIZATION,
    'E.16 — REJECTED_CONTRACT_FORBIDS_REMATERIALIZATION emitted');
}

{
  const v = new LateDataPolicyValidator();
  // Caller tries to silently downgrade to LATE_HISTORICAL_ONLY
  const ctx: L6LateDataContext = {
    observed_at: 'x', ingested_at: 'y', current_as_of: 'z',
    lateness_ms: 500, lateness_horizon_ms: 10_000,
    impacted_window_coverage_ratio: 1,
    current_state_materially_affected: true,
    event_state_may_change: true,
    contract_allows_rematerialization: true,
    l5_rematerialization_path_legal: true,
  };
  const derived = v.classify(ctx);
  const declared = {
    classification: L6LateDataClass.LATE_HISTORICAL_ONLY,
    decision_code: derived.decision_code,
    rationale: 'silent downgrade',
  };
  const r = v.validate(ctx, declared);
  assert(!r.ok, 'E.17 — Silent current-mutation attempt rejected');
  assert(
    r.violations.some(x => x.code === L6TemporalViolationCode.LATE_DATA_SILENT_CURRENT_MUTATION),
    'E.18 — LATE_DATA_SILENT_CURRENT_MUTATION emitted',
  );
}

// ═══════════════════════════════════════════════════════════════════════
// BAND F — Temporal Honesty, Audit, Invariants
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND F: Temporal Honesty, Audit, Invariants ═══');

{
  const classes = Object.values(L6TemporalHonestyClass);
  assert(classes.length === 7, 'F.1 — 7 temporal honesty classes');
  assert(isCleanHonestyClass(L6TemporalHonestyClass.CURRENT_CLEAN), 'F.2 — CURRENT_CLEAN is clean');
  assert(!isCleanHonestyClass(L6TemporalHonestyClass.CURRENT_DEGRADED), 'F.3 — CURRENT_DEGRADED is not clean');
}

{
  const c = new TemporalHonestyClassifier();

  const clean = c.classify({
    temporal_mode: L6TemporalMode.WINDOWED,
    validity_state: L6FeatureValidityState.VALID,
    warmup_state: L6WarmupState.READY,
    freshness_ok: true, coverage_ok: true,
    late_data_class: L6LateDataClass.ON_TIME,
  });
  assert(clean.class === L6TemporalHonestyClass.CURRENT_CLEAN, 'F.4 — Clean classified CURRENT_CLEAN');

  const degraded = c.classify({
    temporal_mode: L6TemporalMode.WINDOWED,
    validity_state: L6FeatureValidityState.DEGRADED,
    warmup_state: L6WarmupState.READY,
    freshness_ok: false, coverage_ok: true,
    late_data_class: L6LateDataClass.ON_TIME,
  });
  assert(degraded.class === L6TemporalHonestyClass.CURRENT_DEGRADED, 'F.5 — Stale freshness → CURRENT_DEGRADED');

  const blocked = c.classify({
    temporal_mode: L6TemporalMode.WINDOWED,
    validity_state: L6FeatureValidityState.BLOCKED,
    warmup_state: L6WarmupState.READY,
    freshness_ok: true, coverage_ok: true,
    late_data_class: L6LateDataClass.ON_TIME,
  });
  assert(blocked.class === L6TemporalHonestyClass.BLOCKED_TEMPORAL, 'F.6 — BLOCKED validity → BLOCKED_TEMPORAL');

  const histClean = c.classify({
    temporal_mode: L6TemporalMode.HISTORICAL_REPLAY,
    validity_state: L6FeatureValidityState.VALID,
    warmup_state: L6WarmupState.READY,
    freshness_ok: true, coverage_ok: true,
    late_data_class: L6LateDataClass.ON_TIME,
  });
  assert(histClean.class === L6TemporalHonestyClass.HISTORICAL_CLEAN, 'F.7 — Historical clean replay');

  const lateRecomputed = c.classify({
    temporal_mode: L6TemporalMode.HISTORICAL_REPLAY,
    validity_state: L6FeatureValidityState.VALID,
    warmup_state: L6WarmupState.READY,
    freshness_ok: true, coverage_ok: true,
    late_data_class: L6LateDataClass.LATE_HISTORICAL_ONLY,
  });
  assert(lateRecomputed.class === L6TemporalHonestyClass.LATE_RECOMPUTED, 'F.8 — Late historical → LATE_RECOMPUTED');

  const warmup = c.classify({
    temporal_mode: L6TemporalMode.WINDOWED,
    validity_state: L6FeatureValidityState.PROVISIONAL,
    warmup_state: L6WarmupState.WARMING_UP,
    freshness_ok: true, coverage_ok: true,
    late_data_class: L6LateDataClass.ON_TIME,
  });
  assert(warmup.class === L6TemporalHonestyClass.PROVISIONAL_WARMUP, 'F.9 — Warming-up → PROVISIONAL_WARMUP');

  const warmupWithValid = c.classify({
    temporal_mode: L6TemporalMode.WINDOWED,
    validity_state: L6FeatureValidityState.VALID,
    warmup_state: L6WarmupState.WARMING_UP,
    freshness_ok: true, coverage_ok: true,
    late_data_class: L6LateDataClass.ON_TIME,
  });
  assert(!warmupWithValid.ok, 'F.10 — VALID while WARMING_UP flagged as misclassified');

  const silent = c.classify({
    temporal_mode: L6TemporalMode.WINDOWED,
    validity_state: L6FeatureValidityState.VALID,
    warmup_state: L6WarmupState.READY,
    freshness_ok: true, coverage_ok: true,
    late_data_class: L6LateDataClass.LATE_GOVERNED_REMATERIALIZATION_CANDIDATE,
  });
  assert(!silent.ok, 'F.11 — Rematerialization candidate as CURRENT_CLEAN flagged');
}

{
  clearTemporalAuditLog();
  emitTemporalAudit(
    { code: L6TemporalViolationCode.WARMUP_NOT_SATISFIED, field: 'validity_state', detail: 'warming' },
    { primitive_id: 'p1', trace_id: 'tr-1', compute_run_id: 'cr-1' },
  );
  emitTemporalAudits(
    [
      { code: L6TemporalViolationCode.LATE_DATA_SILENT_CURRENT_MUTATION, field: 'late_class', detail: 'x' },
      { code: L6TemporalViolationCode.WINDOW_COVERAGE_INSUFFICIENT, field: 'coverage', detail: 'y' },
    ],
    { primitive_id: 'p1', trace_id: 'tr-1', compute_run_id: 'cr-1' },
  );
  const log = getTemporalAuditLog();
  assert(log.length === 3, 'F.12 — 3 audit records emitted');
  assert(findTemporalAuditsByTrace('tr-1').length === 3, 'F.13 — query by trace returns 3');
  assert(findTemporalAuditsByComputeRun('cr-1').length === 3, 'F.14 — query by compute_run returns 3');
  assert(findTemporalAuditsByCode(L6TemporalViolationCode.LATE_DATA_SILENT_CURRENT_MUTATION).length === 1,
    'F.15 — query by code returns 1');

  const silentRec = findTemporalAuditsByCode(L6TemporalViolationCode.LATE_DATA_SILENT_CURRENT_MUTATION)[0];
  assert(silentRec.severity === L6TemporalAuditSeverity.FATAL, 'F.16 — silent mutation is FATAL severity');

  clearTemporalAuditLog();
  assert(getTemporalAuditLog().length === 0, 'F.17 — audit log cleared');
}

{
  // All 7 L6.5 invariants must hold
  const results = checkAllL6_5Invariants();
  assert(results.length === 7, 'F.18 — 7 L6.5 invariants registered');
  for (const r of results) {
    assert(r.holds, `F — ${r.id} ${r.name} [${r.evidence}]`);
  }
}

// ═══════════════════════════════════════════════════════════════════════
console.log('\n════════════════════════════════════════');
const elapsed = Date.now() - t0;
if (failed === 0) {
  console.log(`✓ L6.5 CERTIFIED — ${passed} assertions passed in ${elapsed}ms`);
  console.log('  Temporal surfaces, windows, baselines, warmup, null, late-data, honesty all locked.');
  process.exit(0);
} else {
  console.error(`✗ L6.5 FAILED — ${failed} of ${passed + failed} assertions failed (${elapsed}ms)`);
  process.exit(1);
}
