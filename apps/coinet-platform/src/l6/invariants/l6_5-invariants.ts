/**
 * L6.5 — Temporal and Missingness Invariants
 *
 * §6.5.9.1 — INV-6.5-A through INV-6.5-G, executable and test-covered.
 * Each check builds a targeted legal or illegal case and asserts the
 * appropriate temporal validator accepts or rejects it.
 */

import {
  L6TemporalIdentity,
  L6TemporalMode,
  L6TemporalSurfaces,
} from '../contracts/temporal-surfaces';
import {
  L6TemporalWindowSpec,
  L6WindowClass,
  L6StandardWindowDuration,
  STANDARD_WINDOW_DURATION_MS,
  L6WindowAnchorPolicy,
  L6WindowAlignmentPolicy,
  L6LateDataInclusionPolicy,
} from '../contracts/window-spec';
import {
  L6TemporalWindowInstance,
} from '../contracts/window-instance';
import {
  L6TemporalBaselineSpec,
  L6BaselineNormalizationMode,
} from '../contracts/baseline-spec';
import {
  L6TemporalBaselineInstance,
  L6BaselineQualityState,
} from '../contracts/baseline-instance';
import {
  L6WarmupSpec,
  L6WarmupOverrideMode,
  L6WarmupState,
} from '../contracts/warmup-spec';
import { L6ReadinessState } from '../contracts/warmup-status';
import {
  L6NullStateClass,
  L6NullPolicyDecision,
  L6NullPolicyMode,
  L6MissingnessReasonCode,
} from '../contracts/null-state';
import {
  L6LateDataClass,
  L6LateDataContext,
} from '../contracts/late-data-classification';
import {
  L6TemporalHonestyClass,
} from '../contracts/temporal-honesty';
import { L6ScopeType } from '../contracts/primitive-contract';
import { L6FeatureValidityState } from '../contracts/feature-validity-state';
import { L6CoverageRequirementClass } from '../contracts/materialization-policy';
import { L6BaselineMethod } from '../engine/baseline-engine';

import { TemporalSurfaceValidator } from '../temporal/temporal-surface.validator';
import { WindowLegalityValidator, canonicalWindowId } from '../temporal/window-legality.validator';
import { BaselineValidityValidator, canonicalBaselineInstanceId } from '../temporal/baseline-validity.validator';
import { WarmupLegalityValidator } from '../temporal/warmup-legality.validator';
import { NullPolicyValidator } from '../temporal/null-policy.validator';
import { LateDataPolicyValidator } from '../temporal/late-data-policy.validator';
import { TemporalHonestyClassifier } from '../temporal/temporal-honesty.classifier';

export interface L6_5InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ---------- fixtures ----------

export function buildLegalSurfaces(): L6TemporalSurfaces {
  return {
    observed_at: '2026-01-01T00:00:00.000Z',
    ingested_at: '2026-01-01T00:00:01.000Z',
    as_of: '2026-01-01T00:00:02.000Z',
    effective_at: '2026-01-01T00:00:03.000Z',
    window_start: '2025-12-31T23:00:00.000Z',
    window_end: '2026-01-01T00:00:00.000Z',
    detected_at: null,
    resolved_at: null,
  };
}

export function buildLegalTemporalIdentity(): L6TemporalIdentity {
  return {
    temporal_mode: L6TemporalMode.WINDOWED,
    surfaces: buildLegalSurfaces(),
    historical_mode: false,
    late_data_flag: false,
    window_id: 'win_test',
    baseline_id: null,
  };
}

export function buildLegalWindowSpec(): L6TemporalWindowSpec {
  return {
    spec_id: 'ws_1h_rolling',
    window_class: L6WindowClass.ROLLING,
    duration: L6StandardWindowDuration.ONE_HOUR,
    duration_ms: STANDARD_WINDOW_DURATION_MS[L6StandardWindowDuration.ONE_HOUR]!,
    anchor_policy: L6WindowAnchorPolicy.AS_OF,
    alignment_policy: L6WindowAlignmentPolicy.NONE,
    late_data_inclusion_policy: L6LateDataInclusionPolicy.EXCLUDE,
    coverage_requirement: L6CoverageRequirementClass.MAJORITY,
    min_coverage_ratio: 0.8,
    policy_version: 'v1',
  };
}

export function buildLegalWindowInstance(spec: L6TemporalWindowSpec): L6TemporalWindowInstance {
  const anchor = '2026-01-01T00:00:00.000Z';
  const base = {
    spec_id: spec.spec_id,
    scope_type: L6ScopeType.ASSET,
    scope_id: 'BTC',
    window_start: '2025-12-31T23:00:00.000Z',
    window_end: anchor,
    anchor_time: anchor,
    coverage_ratio: 0.95,
    late_data_flag: false,
    historical_mode: false,
    policy_version: spec.policy_version,
  };
  const window_id = canonicalWindowId(
    spec,
    base.scope_type,
    base.scope_id,
    base.anchor_time,
    base.historical_mode,
    base.late_data_flag,
  );
  return { window_id, ...base };
}

export function buildLegalBaselineSpec(): L6TemporalBaselineSpec {
  return {
    baseline_id: 'bl_rolling_mean_1h',
    baseline_type: L6BaselineMethod.ROLLING_MEAN,
    input_surface_ids: ['l6.feature.btc_price_1m.v1'],
    required_window_spec_ids: ['ws_1h_rolling'],
    normalization_mode: L6BaselineNormalizationMode.ABSOLUTE,
    coverage_requirement: L6CoverageRequirementClass.MAJORITY,
    min_coverage_ratio: 0.8,
    min_observation_count: 30,
    warmup_duration_ms: 3 * STANDARD_WINDOW_DURATION_MS[L6StandardWindowDuration.ONE_HOUR]!,
    peer_relative_allowed: false,
    regime_relative_allowed: false,
    policy_version: 'v1',
  };
}

export function buildLegalBaselineInstance(spec: L6TemporalBaselineSpec): L6TemporalBaselineInstance {
  const base = {
    baseline_id: spec.baseline_id,
    baseline_type: spec.baseline_type,
    scope_type: L6ScopeType.ASSET,
    scope_id: 'BTC',
    window_id: 'win_test',
    observed_range: {
      start: '2025-12-31T20:00:00.000Z',
      end: '2026-01-01T00:00:00.000Z',
      observation_count: 60,
    },
    coverage_ratio: 0.95,
    baseline_value: 42.0,
    dispersion_value: 1.5,
    baseline_quality_state: L6BaselineQualityState.CLEAN,
    historical_mode: false,
    policy_version: spec.policy_version,
  };
  const baseline_instance_id = canonicalBaselineInstanceId(
    spec,
    base.scope_type,
    base.scope_id,
    base.window_id,
    base.historical_mode,
  );
  return { baseline_instance_id, ...base };
}

export function buildLegalWarmupSpec(): L6WarmupSpec {
  return {
    spec_id: 'warm_default',
    required_history_duration_ms: 3 * STANDARD_WINDOW_DURATION_MS[L6StandardWindowDuration.ONE_HOUR]!,
    min_observation_count: 30,
    min_coverage_ratio: 0.8,
    override_mode: L6WarmupOverrideMode.NONE,
    event_readiness_required: true,
    blocks_emission_until_satisfied: true,
    policy_version: 'v1',
  };
}

// ---------- invariants ----------

// INV-6.5-A: every primitive output carries all required time surfaces
export function checkINV_65_A(): L6_5InvariantResult {
  const v = new TemporalSurfaceValidator();
  const legal = v.validate(buildLegalTemporalIdentity()).ok;

  const badSurfaces = buildLegalSurfaces();
  const missingStart: L6TemporalSurfaces = { ...badSurfaces, window_start: null };
  const bad = v.validate({
    ...buildLegalTemporalIdentity(),
    surfaces: missingStart,
  }).ok;

  const ok = legal && !bad;
  return {
    id: 'INV-6.5-A',
    name: 'required time surfaces present per temporal mode',
    holds: ok,
    evidence: `legal=${legal} missingStartRejected=${!bad}`,
  };
}

// INV-6.5-B: windows are governed-library + deterministic identity
export function checkINV_65_B(): L6_5InvariantResult {
  const v = new WindowLegalityValidator();
  const spec = buildLegalWindowSpec();
  const inst = buildLegalWindowInstance(spec);
  const r1 = v.validateInstance(spec, inst);

  // Ad hoc duration_ms not matching standard
  const tampered: L6TemporalWindowSpec = { ...spec, duration_ms: 99 };
  const r2 = v.validateSpec(tampered);

  // Different window_id for same inputs must fail
  const wrongId: L6TemporalWindowInstance = { ...inst, window_id: 'win_forged' };
  const r3 = v.validateInstance(spec, wrongId);

  const ok = r1.ok && !r2.ok && !r3.ok;
  return {
    id: 'INV-6.5-B',
    name: 'governed window library + deterministic window_id',
    holds: ok,
    evidence: `legal=${r1.ok} badDuration=${!r2.ok} forgedIdRejected=${!r3.ok}`,
  };
}

// INV-6.5-C: baseline legality required before attachment
export function checkINV_65_C(): L6_5InvariantResult {
  const v = new BaselineValidityValidator();
  const spec = buildLegalBaselineSpec();
  const inst = buildLegalBaselineInstance(spec);
  const ctxOk = {
    peer_relative_in_use: false,
    regime_relative_in_use: false,
    observed_sample_count: 60,
    observed_history_duration_ms: spec.warmup_duration_ms,
    window_legal: true,
    inputs_legal: true,
  };
  const r1 = v.validateInstance(spec, inst, ctxOk);

  const ctxShort = { ...ctxOk, observed_sample_count: 5 };
  const r2 = v.validateInstance(spec, inst, ctxShort);

  const ctxPeer = { ...ctxOk, peer_relative_in_use: true };
  const r3 = v.validateInstance(spec, inst, ctxPeer);

  const ok = r1.ok && !r2.ok && !r3.ok;
  return {
    id: 'INV-6.5-C',
    name: 'baseline not attached unless legality satisfied',
    holds: ok,
    evidence: `legal=${r1.ok} insufficientRejected=${!r2.ok} peerForbiddenRejected=${!r3.ok}`,
  };
}

// INV-6.5-D: no primitive VALID without warmup satisfied
export function checkINV_65_D(): L6_5InvariantResult {
  const w = new WarmupLegalityValidator();
  const spec = buildLegalWarmupSpec();

  const satisfied = w.deriveStatus(
    spec,
    {
      observed_history_duration_ms: spec.required_history_duration_ms,
      observed_sample_count: spec.min_observation_count,
      coverage_ratio: 1,
    },
    { baseline_window_durations_ms: [spec.required_history_duration_ms / 3], dependency_blocked: false, baseline_blocked: false },
  );
  const warming = w.deriveStatus(
    spec,
    { observed_history_duration_ms: 0, observed_sample_count: 0, coverage_ratio: 0 },
    { baseline_window_durations_ms: [spec.required_history_duration_ms / 3], dependency_blocked: false, baseline_blocked: false },
  );

  const legal = w.isFeatureEmissionLegal(L6FeatureValidityState.VALID, satisfied, spec).ok;
  const illegal = w.isFeatureEmissionLegal(L6FeatureValidityState.VALID, warming, spec).ok;

  const ok = legal && !illegal && satisfied.warmup_satisfied && !warming.warmup_satisfied;
  return {
    id: 'INV-6.5-D',
    name: 'VALID emission blocked while warmup unsatisfied',
    holds: ok,
    evidence: `satisfied=${satisfied.warmup_satisfied} warming_state=${warming.state}`,
  };
}

// INV-6.5-E: null/missingness always explicitly classified; never silently neutralized
export function checkINV_65_E(): L6_5InvariantResult {
  const v = new NullPolicyValidator();

  const legalDecision: L6NullPolicyDecision = {
    policy_mode: L6NullPolicyMode.DEGRADE,
    null_state_class: L6NullStateClass.MISSING_REQUIRED_INPUT,
    reason_code: L6MissingnessReasonCode.INPUT_NOT_FRESH,
    rationale: 'upstream input arrived stale',
  };
  const r1 = v.validateDecision(legalDecision, L6FeatureValidityState.DEGRADED);

  const missingReason: L6NullPolicyDecision = { ...legalDecision, reason_code: null };
  const r2 = v.validateDecision(missingReason, L6FeatureValidityState.DEGRADED);

  const illegalValid: L6NullPolicyDecision = {
    policy_mode: L6NullPolicyMode.DEGRADE,
    null_state_class: L6NullStateClass.MISSING_REQUIRED_INPUT,
    reason_code: L6MissingnessReasonCode.INPUT_NEVER_OBSERVED,
    rationale: '',
  };
  const r3 = v.validateDecision(illegalValid, L6FeatureValidityState.VALID);

  const ok = r1.ok && !r2.ok && !r3.ok;
  return {
    id: 'INV-6.5-E',
    name: 'missingness always classified; never silently neutral',
    holds: ok,
    evidence: `legal=${r1.ok} missingReasonRejected=${!r2.ok} validWithMissingRejected=${!r3.ok}`,
  };
}

// INV-6.5-F: late data cannot silently mutate current authoritative truth
export function checkINV_65_F(): L6_5InvariantResult {
  const v = new LateDataPolicyValidator();
  const ctxSilent: L6LateDataContext = {
    observed_at: '2025-12-01T00:00:00.000Z',
    ingested_at: '2026-01-01T00:00:00.000Z',
    current_as_of: '2026-01-01T00:00:00.000Z',
    lateness_ms: 30 * 24 * 60 * 60 * 1000,
    lateness_horizon_ms: 90 * 24 * 60 * 60 * 1000,
    impacted_window_coverage_ratio: 1,
    current_state_materially_affected: true,
    event_state_may_change: true,
    contract_allows_rematerialization: false,
    l5_rematerialization_path_legal: false,
  };
  const derived = v.classify(ctxSilent);

  // Anyone declaring LATE_HISTORICAL_ONLY here must be rejected.
  const declaration = {
    classification: L6LateDataClass.LATE_HISTORICAL_ONLY,
    decision_code: derived.decision_code,
    rationale: 'attempted silent',
  };
  const res = v.validate(ctxSilent, declaration);

  const ok =
    derived.classification === L6LateDataClass.LATE_REJECTED &&
    !res.ok;
  return {
    id: 'INV-6.5-F',
    name: 'late data cannot silently mutate current truth',
    holds: ok,
    evidence: `derived=${derived.classification} silentAttemptRejected=${!res.ok}`,
  };
}

// INV-6.5-G: temporal degradation remains visible in primitive legality
export function checkINV_65_G(): L6_5InvariantResult {
  const classifier = new TemporalHonestyClassifier();

  const clean = classifier.classify({
    temporal_mode: L6TemporalMode.WINDOWED,
    validity_state: L6FeatureValidityState.VALID,
    warmup_state: L6WarmupState.READY,
    freshness_ok: true,
    coverage_ok: true,
    late_data_class: L6LateDataClass.ON_TIME,
  });

  const warm = classifier.classify({
    temporal_mode: L6TemporalMode.WINDOWED,
    validity_state: L6FeatureValidityState.PROVISIONAL,
    warmup_state: L6WarmupState.WARMING_UP,
    freshness_ok: true,
    coverage_ok: true,
    late_data_class: L6LateDataClass.ON_TIME,
  });

  const silent = classifier.classify({
    temporal_mode: L6TemporalMode.WINDOWED,
    validity_state: L6FeatureValidityState.VALID,
    warmup_state: L6WarmupState.READY,
    freshness_ok: true,
    coverage_ok: true,
    late_data_class: L6LateDataClass.LATE_GOVERNED_REMATERIALIZATION_CANDIDATE,
  });

  const ok =
    clean.class === L6TemporalHonestyClass.CURRENT_CLEAN &&
    warm.class === L6TemporalHonestyClass.PROVISIONAL_WARMUP &&
    !silent.ok;
  return {
    id: 'INV-6.5-G',
    name: 'temporal degradation visible; silent current mutation flagged',
    holds: ok,
    evidence: `clean=${clean.class} warm=${warm.class} silent_ok=${silent.ok}`,
  };
}

export function checkAllL6_5Invariants(): readonly L6_5InvariantResult[] {
  return [
    checkINV_65_A(),
    checkINV_65_B(),
    checkINV_65_C(),
    checkINV_65_D(),
    checkINV_65_E(),
    checkINV_65_F(),
    checkINV_65_G(),
  ];
}

// Also export L6ReadinessState so downstream code compiles cleanly against it.
export { L6ReadinessState };
