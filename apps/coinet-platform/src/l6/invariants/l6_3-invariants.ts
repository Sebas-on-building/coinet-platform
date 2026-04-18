/**
 * L6.3 — Universal Contract Invariants
 *
 * §6.3.9.1 — INV-6.3-A through INV-6.3-I, executable and test-covered.
 */

import { L6PrimitiveClass } from '../contracts/primitive-class';
import { L6FeatureKind } from '../contracts/feature-kind';
import { L6EventKind } from '../contracts/event-kind';
import { L6TransformationClass } from '../contracts/primitive-transformation-class';
import { L6NullPolicy } from '../contracts/primitive-null-policy';
import { L6LineageScope } from '../contracts/primitive-lineage-policy';
import {
  L6LateDataPolicy,
  L6MaterializationPolicy,
  L6EvidencePackPolicy,
  L6ScopeGranularity,
  L6ScopeType,
  L6Directionality,
} from '../contracts/primitive-contract';
import { L6FeatureValueKind } from '../contracts/feature-contract';
import {
  L6EventLifecycleState,
  isRegisteredLifecycleState,
} from '../contracts/event-lifecycle-state';
import {
  ALL_EVENT_LIFECYCLE_STATES,
  L6EventSeverityLevel,
} from '../contracts/event-contract';
import {
  FeatureDefinitionContract,
  L6FeatureInputRole,
} from '../contracts/feature-definition.contract';
import {
  EventDefinitionContract,
  L6EventEvidenceSourceRole,
} from '../contracts/event-definition.contract';
import { FeatureOutput } from '../contracts/feature-output.contract';
import { EventOutput } from '../contracts/event-output.contract';
import {
  L6FeatureValidityState,
  L6QualityState,
  L6ConfidenceBand,
  L6FreshnessState,
  L6NullState,
} from '../contracts/feature-validity-state';
import {
  L6CoverageRequirementClass,
  L6FreshnessBudgetClass,
} from '../contracts/materialization-policy';

import { validateFeatureDefinitionContract } from '../validation/feature-definition-contract.validator';
import { validateEventDefinitionContract } from '../validation/event-definition-contract.validator';
import { validateFeatureOutput } from '../validation/feature-output-contract.validator';
import { validateEventOutput } from '../validation/event-output-contract.validator';
import {
  checkFeatureDefinitionCompatibility,
} from '../validation/feature-definition-compatibility';
import {
  checkEventDefinitionCompatibility,
} from '../validation/event-definition-compatibility';
import {
  L6ContractCompatibilityClass,
} from '../contracts/contract-versioning';
import { computeReplayHash } from '../validation/replay-hash';
import { L6ContractViolationCode } from '../validation/contract-violation-codes';

export interface L6_3InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ─── Fixtures ─────────────────────────────────────────────────────────

export function buildLegalFeatureDefinition(): FeatureDefinitionContract {
  return {
    primitive_class: L6PrimitiveClass.FEATURE,
    primitive_id: 'funding.funding_z_score.v1',
    family: 'funding',
    name: 'funding_z_score',
    version: 'v1.0.0',
    scope: { scope_type: L6ScopeType.ASSET, scope_granularity: L6ScopeGranularity.WINDOW },
    required_inputs: [{ surfaceId: 'l3:canonical_metric.funding_rate', fromLayer: 'L3', required: true }],
    optional_inputs: [],
    required_context: [],
    required_history_windows: [{ windowId: 'funding_30d', durationSeconds: 2592000, requiredPointCount: 720 }],
    transformation_class: L6TransformationClass.Z_SCORE_NORMALIZATION,
    quality_gate_spec: { minInputQuality: 0.8, minFreshnessScore: 0.9, minConfidence: 0.7, blocksOnFailure: true },
    confidence_derivation_spec: { method: 'BASELINE_DERIVED', downgradesOnPartialInputs: true },
    null_policy: { policy: L6NullPolicy.REJECT_IF_MISSING, rationale: 'missingness explicit', fieldsCovered: ['funding_rate'] },
    freshness_budget: { maxAgeSeconds: 3600, warmupSeconds: 86400, blockOnStale: true },
    late_data_policy: L6LateDataPolicy.HISTORICAL_RECOMPUTE_ONLY,
    materialization_policy: L6MaterializationPolicy.CURRENT_STATE_AND_HISTORY,
    evidence_pack_policy: L6EvidencePackPolicy.REQUIRED_ON_MATERIAL,
    lineage_policy: {
      scope: L6LineageScope.INPUTS_AND_BASELINE,
      requiredInputSurfaces: ['l3:canonical_metric.funding_rate'],
      requiredContextSurfaces: [],
      carriesSourceVersion: true,
      carriesSchemaVersion: true,
      replayCompatible: true,
    },
    contradiction_support: { supports: false, artifactType: null, preservesSourceSeparation: false, rationale: '' },
    description: 'Z-score normalized funding rate state against rolling 30-day baseline.',
    feature_kind: L6FeatureKind.Z_SCORE_NORMALIZED,
    value_kind: L6FeatureValueKind.NUMBER,
    unit: 'z',
    directionality: L6Directionality.SIGNED,
    baseline_spec: { baselineKind: 'ROLLING_WINDOW', parameters: { durationSeconds: 2592000 }, carriesVersion: 'v1' },
    normalization_spec: { method: 'Z_SCORE', parameters: {} },
    warmup_requirement: { minObservations: 100, minDurationSeconds: 86400, blocksEmissionUntilSatisfied: true },
    event_link_policy: { emitsStateOnly: true, eventsMayReferenceThisFeature: true, forbidsLifecycleFields: true },

    // L6.3 additions
    required_truth_inputs: [{
      surfaceId: 'l3:canonical_metric.funding_rate', fromLayer: 'L3', required: true,
      role: L6FeatureInputRole.TRUTH,
    }],
    required_context_inputs: [],
    optional_context_inputs: [],
    baseline_inputs: [{
      surfaceId: 'l6:feature.funding_z_score_baseline', fromLayer: 'L5', required: true,
      role: L6FeatureInputRole.BASELINE,
    }],
    evidence_only_inputs: [],
    bounds: { min: null, max: null, isBounded: false, wraps: false },
    normalization_method: 'Z_SCORE',
    coverage_requirement: L6CoverageRequirementClass.MAJORITY,
    freshness_budget_class: L6FreshnessBudgetClass.NEAR_REALTIME,
    definition_schema_version: 'v1.0.0',
  };
}

export function buildLegalEventDefinition(): EventDefinitionContract {
  return {
    primitive_class: L6PrimitiveClass.EVENT,
    primitive_id: 'funding.funding_spike.v1',
    family: 'funding',
    name: 'funding_spike',
    version: 'v1.0.0',
    scope: { scope_type: L6ScopeType.ASSET, scope_granularity: L6ScopeGranularity.POINT },
    required_inputs: [{ surfaceId: 'l6:feature.funding_z_score', fromLayer: 'L5', required: true }],
    optional_inputs: [],
    required_context: [],
    required_history_windows: [],
    transformation_class: L6TransformationClass.THRESHOLD_CROSS_DETECTION,
    quality_gate_spec: { minInputQuality: 0.8, minFreshnessScore: 0.9, minConfidence: 0.7, blocksOnFailure: true },
    confidence_derivation_spec: { method: 'INPUT_CONFIDENCE_MIN', downgradesOnPartialInputs: true },
    null_policy: { policy: L6NullPolicy.BLOCKED_UNTIL_RECOVERED, rationale: 'blocks emission', fieldsCovered: ['funding_z_score'] },
    freshness_budget: { maxAgeSeconds: 600, warmupSeconds: 0, blockOnStale: true },
    late_data_policy: L6LateDataPolicy.GOVERNED_REMATERIALIZATION,
    materialization_policy: L6MaterializationPolicy.INSTANCE_ONLY,
    evidence_pack_policy: L6EvidencePackPolicy.ALWAYS_REQUIRED,
    lineage_policy: {
      scope: L6LineageScope.INPUTS_AND_CONTEXT,
      requiredInputSurfaces: ['l6:feature.funding_z_score'],
      requiredContextSurfaces: [],
      carriesSourceVersion: true,
      carriesSchemaVersion: true,
      replayCompatible: true,
    },
    contradiction_support: { supports: false, artifactType: null, preservesSourceSeparation: false, rationale: '' },
    description: 'Threshold-cross change detector on funding z-score above governed level.',
    event_kind: L6EventKind.THRESHOLD_CROSS,
    trigger_spec: { triggerId: 'z_gt_2', kind: 'THRESHOLD', parameters: { threshold: 2.0 }, direction: 'UP' },
    confirmation_spec: { confirmationId: 'persist_15m', method: 'PERSISTENCE', minDurationSeconds: 900, minCorroboratingInputs: 1 },
    resolution_spec: { method: 'THRESHOLD_REVERSAL', parameters: { threshold: 1.0 } },
    expiry_spec: { maxActiveSeconds: 86400, forceExpireOnStaleInputs: true },
    lifecycle_policy: {
      shape: 'CANDIDATE_CONFIRMATION_RESOLUTION',
      allowedStates: [
        L6EventLifecycleState.CANDIDATE, L6EventLifecycleState.CONFIRMED,
        L6EventLifecycleState.ACTIVE, L6EventLifecycleState.COOLING,
        L6EventLifecycleState.RESOLVED, L6EventLifecycleState.EXPIRED,
      ],
      allowedTransitions: [
        [L6EventLifecycleState.CANDIDATE, L6EventLifecycleState.CONFIRMED],
        [L6EventLifecycleState.CONFIRMED, L6EventLifecycleState.ACTIVE],
        [L6EventLifecycleState.ACTIVE, L6EventLifecycleState.COOLING],
        [L6EventLifecycleState.COOLING, L6EventLifecycleState.RESOLVED],
        [L6EventLifecycleState.ACTIVE, L6EventLifecycleState.EXPIRED],
      ],
    },
    severity_spec: {
      method: 'DERIVED_FROM_MAGNITUDE',
      allowedLevels: [L6EventSeverityLevel.LOW, L6EventSeverityLevel.MEDIUM, L6EventSeverityLevel.HIGH],
      carriesNumericMagnitude: true,
    },
    dedupe_spec: { dedupeKeyFields: ['scope_id', 'triggerId'], dedupeWindowSeconds: 300, collapseBehavior: 'MERGE_INSTANCE' },
    suppression_spec: { suppresses: false, suppressionRuleIds: [], rationale: '' },
    cooldown_policy: { cooldownSeconds: 1800, resetOnResolution: true },
    evidence_requirements: { minEvidenceSources: 1, requiredInputReferences: ['l6:feature.funding_z_score'], requiresTimestampedSnapshots: true },

    // L6.3 additions
    evidence_source_declarations: [
      { sourceId: 'l6:feature.funding_z_score', role: L6EventEvidenceSourceRole.TRIGGER, required: true },
      { sourceId: 'l3:canonical_metric.funding_rate', role: L6EventEvidenceSourceRole.CORROBORATION, required: false },
    ],
    suppression_taxonomy_binding: {
      taxonomyId: 'funding-suppression-v1',
      suppressionGroupId: 'funding-spike-group',
      interactionNotes: 'Suppresses co-occurring funding_drift events within cooldown window.',
    },
    lifecycle_completeness: {
      requiresCandidate: true,
      requiresConfirmation: true,
      requiresActive: true,
      requiresResolution: true,
      allowsExpiry: true,
      allowsSuppression: true,
      allowsQuarantine: true,
    },
    freshness_budget_class: L6FreshnessBudgetClass.NEAR_REALTIME,
    definition_schema_version: 'v1.0.0',
  };
}

export function buildLegalFeatureOutput(): FeatureOutput {
  const replayHash = computeReplayHash({
    primitive_id: 'funding.funding_z_score.v1',
    primitive_version: 'v1.0.0',
    scope_type: L6ScopeType.ASSET,
    scope_id: 'BTC',
    temporal_anchor: '2026-04-03T00:00:00.000Z',
    material_inputs: { funding_rate_snapshot: 'snap-001' },
  });
  return {
    feature_id: 'funding.funding_z_score.v1',
    feature_version: 'v1.0.0',
    scope_type: L6ScopeType.ASSET,
    scope_id: 'BTC',
    as_of: '2026-04-03T00:00:00.000Z',
    observed_window_start: '2026-03-04T00:00:00.000Z',
    observed_window_end: '2026-04-03T00:00:00.000Z',
    value_payload: {
      value_kind: L6FeatureValueKind.NUMBER,
      value: 1.72,
      baseline_value: 0.0,
      normalized_value: 1.72,
    },
    validity_state: L6FeatureValidityState.VALID,
    quality_state: L6QualityState.PASS,
    confidence_band: L6ConfidenceBand.HIGH,
    freshness_state: L6FreshnessState.FRESH,
    null_state: L6NullState.PRESENT,
    late_arrival_flag: false,
    warmup_satisfied: true,
    lineage: {
      manifest_id: 'mf-00001',
      trace_id: 'tr-00001',
      envelope_id: 'env-00001',
      evidence_pack_ref: 'evp-00001',
      input_snapshot_ref: 'snap-001',
      replay_hash: replayHash,
    },
  };
}

export function buildLegalEventOutput(): EventOutput {
  const replayHash = computeReplayHash({
    primitive_id: 'funding.funding_spike.v1',
    primitive_version: 'v1.0.0',
    scope_type: L6ScopeType.ASSET,
    scope_id: 'BTC',
    temporal_anchor: '2026-04-03T00:15:00.000Z',
    material_inputs: { trigger: { id: 'z_gt_2', threshold: 2.0, observed: 2.31 } },
  });
  return {
    event_instance_id: 'evi-00001',
    event_id: 'funding.funding_spike.v1',
    event_version: 'v1.0.0',
    scope_type: L6ScopeType.ASSET,
    scope_id: 'BTC',
    state: L6EventLifecycleState.CONFIRMED,
    candidate_at: '2026-04-03T00:00:00.000Z',
    confirmed_at: '2026-04-03T00:15:00.000Z',
    active_at: '2026-04-03T00:15:00.000Z',
    peak_at: null,
    resolved_at: null,
    expired_at: null,
    severity_band: L6EventSeverityLevel.HIGH,
    confidence_band: L6ConfidenceBand.HIGH,
    dedupe_key: 'BTC:z_gt_2:2026-04-03',
    suppression_group: 'funding-spike-group',
    late_arrival_flag: false,
    trigger_values: {
      trigger_id: 'z_gt_2',
      values: { threshold: 2.0, observed: 2.31 },
      observed_at: '2026-04-03T00:00:00.000Z',
    },
    resolution_values: null,
    lineage: {
      manifest_id: 'mf-00002',
      trace_id: 'tr-00002',
      envelope_id: 'env-00002',
      evidence_pack_ref: 'evp-00002',
      input_snapshot_ref: 'snap-002',
      replay_hash: replayHash,
    },
  };
}

// ─── Invariants ───────────────────────────────────────────────────────

// INV-6.3-A: every feature definition contains all minimum declaration blocks.
export function checkINV_63_A(): L6_3InvariantResult {
  const legal = validateFeatureDefinitionContract(buildLegalFeatureDefinition());
  const illegal = buildLegalFeatureDefinition() as unknown as Record<string, unknown>;
  delete illegal.required_truth_inputs;
  delete illegal.coverage_requirement;
  delete illegal.bounds;
  const illegalResult = validateFeatureDefinitionContract(illegal as unknown as FeatureDefinitionContract);
  const holds = legal.valid && !illegalResult.valid
    && illegalResult.violations.some(v =>
      v.code === L6ContractViolationCode.DEF_MISSING_FIELD
      || v.code === L6ContractViolationCode.DEF_MISSING_BOUNDS
      || v.code === L6ContractViolationCode.DEF_MISSING_COVERAGE_REQUIREMENT
      || v.code === L6ContractViolationCode.DEF_MISSING_TRUTH_INPUT,
    );
  return {
    id: 'INV-6.3-A', name: 'Feature definition carries all minimum declaration blocks',
    holds, evidence: `legal=${legal.valid}, illegal_rejected=${!illegalResult.valid}`,
  };
}

// INV-6.3-B: every feature output contains all required lineage, validity, and replay fields.
export function checkINV_63_B(): L6_3InvariantResult {
  const def = buildLegalFeatureDefinition();
  const legal = validateFeatureOutput(buildLegalFeatureOutput(), def);
  const stripped = buildLegalFeatureOutput() as unknown as Record<string, unknown>;
  delete (stripped.lineage as Record<string, unknown>).replay_hash;
  const illegalResult = validateFeatureOutput(stripped as unknown as FeatureOutput, def);
  const holds = legal.valid && !illegalResult.valid
    && illegalResult.violations.some(v => v.code === L6ContractViolationCode.OUT_MISSING_LINEAGE_FIELD);
  return {
    id: 'INV-6.3-B', name: 'Feature output carries complete runtime lineage and replay fields',
    holds, evidence: `legal=${legal.valid}, illegal_rejected=${!illegalResult.valid}`,
  };
}

// INV-6.3-C: no feature may emit as VALID when validity law is not satisfied.
export function checkINV_63_C(): L6_3InvariantResult {
  const def = buildLegalFeatureDefinition();
  const faulty = buildLegalFeatureOutput() as unknown as FeatureOutput & {
    quality_state: L6QualityState;
    freshness_state: L6FreshnessState;
  };
  (faulty as unknown as Record<string, unknown>).quality_state = L6QualityState.FAIL;
  const result = validateFeatureOutput(faulty, def);
  const holds = !result.valid && result.violations.some(
    v => v.code === L6ContractViolationCode.OUT_ILLEGAL_VALID_EMISSION,
  );
  return {
    id: 'INV-6.3-C', name: 'Feature VALID emission blocked when quality/freshness law fails',
    holds, evidence: `rejected=${!result.valid}`,
  };
}

// INV-6.3-D: every event definition contains all minimum trigger / lifecycle / suppression / evidence blocks.
export function checkINV_63_D(): L6_3InvariantResult {
  const legal = validateEventDefinitionContract(buildLegalEventDefinition());
  const illegal = buildLegalEventDefinition() as unknown as Record<string, unknown>;
  delete illegal.suppression_taxonomy_binding;
  delete illegal.evidence_source_declarations;
  delete illegal.lifecycle_completeness;
  const illegalResult = validateEventDefinitionContract(illegal as unknown as EventDefinitionContract);
  const holds = legal.valid && !illegalResult.valid
    && illegalResult.violations.some(v =>
      v.code === L6ContractViolationCode.DEF_MISSING_SUPPRESSION_TAXONOMY
      || v.code === L6ContractViolationCode.DEF_MISSING_EVIDENCE_SOURCES
      || v.code === L6ContractViolationCode.DEF_MISSING_LIFECYCLE_COMPLETENESS,
    );
  return {
    id: 'INV-6.3-D', name: 'Event definition carries all minimum declaration blocks',
    holds, evidence: `legal=${legal.valid}, illegal_rejected=${!illegalResult.valid}`,
  };
}

// INV-6.3-E: every event output contains all required lifecycle, severity, lineage, and replay fields.
export function checkINV_63_E(): L6_3InvariantResult {
  const def = buildLegalEventDefinition();
  const legal = validateEventOutput(buildLegalEventOutput(), def);
  const stripped = buildLegalEventOutput() as unknown as Record<string, unknown>;
  delete (stripped.lineage as Record<string, unknown>).evidence_pack_ref;
  delete (stripped.lineage as Record<string, unknown>).replay_hash;
  const illegalResult = validateEventOutput(stripped as unknown as EventOutput, def);
  const holds = legal.valid && !illegalResult.valid
    && illegalResult.violations.some(v => v.code === L6ContractViolationCode.OUT_MISSING_LINEAGE_FIELD);
  return {
    id: 'INV-6.3-E', name: 'Event output carries complete runtime lineage and replay fields',
    holds, evidence: `legal=${legal.valid}, illegal_rejected=${!illegalResult.valid}`,
  };
}

// INV-6.3-F: no event may be CONFIRMED unless confirmation law is satisfied.
export function checkINV_63_F(): L6_3InvariantResult {
  const def = buildLegalEventDefinition();
  const broken = buildLegalEventOutput() as unknown as Record<string, unknown>;
  broken.confirmed_at = null;
  const result = validateEventOutput(broken as unknown as EventOutput, def);
  const holds = !result.valid && result.violations.some(
    v => v.code === L6ContractViolationCode.OUT_ILLEGAL_CONFIRMATION,
  );
  return {
    id: 'INV-6.3-F', name: 'Event CONFIRMED state blocked without confirmed_at and trigger snapshot',
    holds, evidence: `rejected=${!result.valid}`,
  };
}

// INV-6.3-G: all event lifecycle states must be drawn from the registered lifecycle set only.
export function checkINV_63_G(): L6_3InvariantResult {
  const allRegistered = ALL_EVENT_LIFECYCLE_STATES.every(s => isRegisteredLifecycleState(s));
  const fakeBlocked = !isRegisteredLifecycleState('GHOSTED');
  const def = buildLegalEventDefinition();
  const bogus = buildLegalEventOutput() as unknown as Record<string, unknown>;
  bogus.state = 'NEW_STATE';
  const result = validateEventOutput(bogus as unknown as EventOutput, def);
  const rejected = !result.valid && result.violations.some(
    v => v.code === L6ContractViolationCode.OUT_INVALID_LIFECYCLE_STATE,
  );
  return {
    id: 'INV-6.3-G', name: 'Only registered lifecycle states are emittable',
    holds: allRegistered && fakeBlocked && rejected,
    evidence: `all_registered=${allRegistered}, fake_blocked=${fakeBlocked}, bogus_rejected=${rejected}`,
  };
}

// INV-6.3-H: all primitive contracts must be versioned and compatibility-checkable.
export function checkINV_63_H(): L6_3InvariantResult {
  const prev = buildLegalFeatureDefinition();
  const nextMinor: FeatureDefinitionContract = { ...prev, version: 'v1.1.0', definition_schema_version: 'v1.1.0' };
  const nextBreakingUnit: FeatureDefinitionContract = { ...prev, version: 'v2.0.0', unit: 'percent', definition_schema_version: 'v2.0.0' };
  const minorReport = checkFeatureDefinitionCompatibility(prev, nextMinor);
  const breakingReport = checkFeatureDefinitionCompatibility(prev, nextBreakingUnit);

  const prevEv = buildLegalEventDefinition();
  const nextEvBreaking: EventDefinitionContract = { ...prevEv, version: 'v2.0.0', event_kind: L6EventKind.CHANGE_POINT, definition_schema_version: 'v2.0.0' };
  const evBreakingReport = checkEventDefinitionCompatibility(prevEv, nextEvBreaking);

  const holds = minorReport.classification === L6ContractCompatibilityClass.MINOR_CHANGE
    && breakingReport.classification === L6ContractCompatibilityClass.BREAKING
    && evBreakingReport.classification === L6ContractCompatibilityClass.BREAKING;
  return {
    id: 'INV-6.3-H', name: 'Contracts are versioned and compatibility-checkable',
    holds,
    evidence: `minor=${minorReport.classification}, feature_breaking=${breakingReport.classification}, event_breaking=${evBreakingReport.classification}`,
  };
}

// INV-6.3-I: all primitive runtime outputs must be persistable through L5 without missing mandatory
//            lineage / materialization metadata.
export function checkINV_63_I(): L6_3InvariantResult {
  const def = buildLegalFeatureDefinition();
  const featureResult = validateFeatureOutput(buildLegalFeatureOutput(), def);

  const evDef = buildLegalEventDefinition();
  const eventResult = validateEventOutput(buildLegalEventOutput(), evDef);

  const featureMissing = buildLegalFeatureOutput() as unknown as Record<string, unknown>;
  delete (featureMissing.lineage as Record<string, unknown>).manifest_id;
  delete (featureMissing.lineage as Record<string, unknown>).trace_id;
  const featureBlocked = validateFeatureOutput(featureMissing as unknown as FeatureOutput, def);

  const eventMissing = buildLegalEventOutput() as unknown as Record<string, unknown>;
  delete (eventMissing.lineage as Record<string, unknown>).manifest_id;
  delete (eventMissing.lineage as Record<string, unknown>).input_snapshot_ref;
  const eventBlocked = validateEventOutput(eventMissing as unknown as EventOutput, evDef);

  const holds = featureResult.valid && eventResult.valid
    && !featureBlocked.valid && !eventBlocked.valid;
  return {
    id: 'INV-6.3-I', name: 'Runtime outputs carry all fields required for L5 persistence',
    holds,
    evidence: `feature_ok=${featureResult.valid}, event_ok=${eventResult.valid}, feature_blocked=${!featureBlocked.valid}, event_blocked=${!eventBlocked.valid}`,
  };
}

export function checkAllL6_3Invariants(): readonly L6_3InvariantResult[] {
  return [
    checkINV_63_A(), checkINV_63_B(), checkINV_63_C(),
    checkINV_63_D(), checkINV_63_E(), checkINV_63_F(),
    checkINV_63_G(), checkINV_63_H(), checkINV_63_I(),
  ];
}
