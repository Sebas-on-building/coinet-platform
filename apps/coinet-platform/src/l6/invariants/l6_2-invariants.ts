/**
 * L6.2 — Primitive Law Invariants
 *
 * §6.2.9.1 — INV-6.2-A through INV-6.2-G, all executable and test-covered.
 */

import { L6PrimitiveClass } from '../contracts/primitive-class';
import {
  ALL_FEATURE_KINDS,
  L6FeatureKind,
} from '../contracts/feature-kind';
import {
  ALL_EVENT_KINDS,
  L6EventKind,
} from '../contracts/event-kind';
import { L6TransformationClass } from '../contracts/primitive-transformation-class';
import { L6NullPolicy } from '../contracts/primitive-null-policy';
import { L6LineageScope } from '../contracts/primitive-lineage-policy';
import { L6ContradictionArtifactType } from '../contracts/primitive-contradiction';
import {
  L6LateDataPolicy,
  L6MaterializationPolicy,
  L6EvidencePackPolicy,
  L6ScopeGranularity,
  L6ScopeType,
  L6Directionality,
} from '../contracts/primitive-contract';
import {
  FeatureContract,
  L6FeatureValueKind,
} from '../contracts/feature-contract';
import {
  EventContract,
  L6EventLifecycleState,
  L6EventSeverityLevel,
} from '../contracts/event-contract';
import {
  allEventKindDescriptors,
  isRegisteredEventKind,
} from '../registry/event-kind.registry';
import {
  allFeatureKindDescriptors,
  isRegisteredFeatureKind,
} from '../registry/feature-kind.registry';
import { validateFeatureContract } from '../validation/feature-contract.validator';
import { validateEventContract } from '../validation/event-contract.validator';
import { validatePrimitiveSeparation } from '../validation/primitive-separation.validator';
import { validateJudgmentLeakage } from '../validation/primitive-judgment-leakage.validator';
import { L6PrimitiveViolationCode } from '../validation/validation-result';

export interface L6InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ─────────────────────────────────────────────────────────────────────
// Fixtures (minimal legal feature and event for green-path proofs).
// ─────────────────────────────────────────────────────────────────────

function buildLegalFeature(): FeatureContract {
  return {
    primitive_class: L6PrimitiveClass.FEATURE,
    primitive_id: 'funding.funding_z_score.v1',
    family: 'funding',
    name: 'funding_z_score',
    version: 'v1',
    scope: { scope_type: L6ScopeType.ASSET, scope_granularity: L6ScopeGranularity.WINDOW },
    required_inputs: [{ surfaceId: 'l3:canonical_metric.funding_rate', fromLayer: 'L3', required: true }],
    optional_inputs: [],
    required_context: [],
    required_history_windows: [{ windowId: 'funding_30d', durationSeconds: 2592000, requiredPointCount: 720 }],
    transformation_class: L6TransformationClass.Z_SCORE_NORMALIZATION,
    quality_gate_spec: { minInputQuality: 0.8, minFreshnessScore: 0.9, minConfidence: 0.7, blocksOnFailure: true },
    confidence_derivation_spec: { method: 'BASELINE_DERIVED', downgradesOnPartialInputs: true },
    null_policy: { policy: L6NullPolicy.REJECT_IF_MISSING, rationale: 'missingness must be explicit', fieldsCovered: ['funding_rate'] },
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
  };
}

function buildLegalEvent(): EventContract {
  return {
    primitive_class: L6PrimitiveClass.EVENT,
    primitive_id: 'funding.funding_spike.v1',
    family: 'funding',
    name: 'funding_spike',
    version: 'v1',
    scope: { scope_type: L6ScopeType.ASSET, scope_granularity: L6ScopeGranularity.POINT },
    required_inputs: [{ surfaceId: 'l6:feature.funding_z_score', fromLayer: 'L5', required: true }],
    optional_inputs: [],
    required_context: [],
    required_history_windows: [],
    transformation_class: L6TransformationClass.THRESHOLD_CROSS_DETECTION,
    quality_gate_spec: { minInputQuality: 0.8, minFreshnessScore: 0.9, minConfidence: 0.7, blocksOnFailure: true },
    confidence_derivation_spec: { method: 'INPUT_CONFIDENCE_MIN', downgradesOnPartialInputs: true },
    null_policy: { policy: L6NullPolicy.BLOCKED_UNTIL_RECOVERED, rationale: 'missingness blocks emission', fieldsCovered: ['funding_z_score'] },
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
        L6EventLifecycleState.CANDIDATE,
        L6EventLifecycleState.CONFIRMED,
        L6EventLifecycleState.ACTIVE,
        L6EventLifecycleState.COOLING,
        L6EventLifecycleState.RESOLVED,
        L6EventLifecycleState.EXPIRED,
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
  };
}

// ── INV-6.2-A ──
// Every feature is a state descriptor and may not contain event lifecycle semantics.
export function checkINV_62_A(): L6InvariantResult {
  const legal = validateFeatureContract(buildLegalFeature());
  const legalPasses = legal.valid;

  const illegal = buildLegalFeature() as unknown as Record<string, unknown>;
  illegal.trigger_spec = { triggerId: 'x', kind: 'THRESHOLD', parameters: {} };
  const sepResult = validatePrimitiveSeparation({
    primitive_class: L6PrimitiveClass.FEATURE,
    name: 'funding_z_score',
    fields: illegal,
  });
  const illegalBlocked = !sepResult.valid && sepResult.violations.some(
    v => v.code === L6PrimitiveViolationCode.FEATURE_HAS_EVENT_LIFECYCLE,
  );
  return {
    id: 'INV-6.2-A', name: 'Feature = state; event lifecycle semantics forbidden on features',
    holds: legalPasses && illegalBlocked,
    evidence: `legalPasses=${legalPasses}, illegalBlocked=${illegalBlocked}`,
  };
}

// ── INV-6.2-B ──
// Every event is a change descriptor and may not masquerade as persistent state.
export function checkINV_62_B(): L6InvariantResult {
  const legal = validateEventContract(buildLegalEvent());
  const legalPasses = legal.valid;

  const steady = buildLegalEvent() as unknown as Record<string, unknown>;
  delete steady.trigger_spec;
  delete steady.lifecycle_policy;
  const sepResult = validatePrimitiveSeparation({
    primitive_class: L6PrimitiveClass.EVENT,
    name: 'funding_z_score',
    fields: steady,
  });
  const steadyBlocked = !sepResult.valid && sepResult.violations.some(
    v => v.code === L6PrimitiveViolationCode.EVENT_LACKS_TRIGGER
      || v.code === L6PrimitiveViolationCode.EVENT_LACKS_LIFECYCLE
      || v.code === L6PrimitiveViolationCode.EVENT_IS_STEADY_STATE,
  );
  return {
    id: 'INV-6.2-B', name: 'Event = change; steady-state disguise forbidden',
    holds: legalPasses && steadyBlocked,
    evidence: `legalPasses=${legalPasses}, steadyBlocked=${steadyBlocked}`,
  };
}

// ── INV-6.2-C ──
// Only registered feature kinds and event kinds are legal.
export function checkINV_62_C(): L6InvariantResult {
  const allFeaturesRegistered = ALL_FEATURE_KINDS.every(k => isRegisteredFeatureKind(k));
  const allEventsRegistered = ALL_EVENT_KINDS.every(k => isRegisteredEventKind(k));
  const featureDescriptors = allFeatureKindDescriptors().length === ALL_FEATURE_KINDS.length;
  const eventDescriptors = allEventKindDescriptors().length === ALL_EVENT_KINDS.length;
  const fakeFeatureBlocked = !isRegisteredFeatureKind('FAKE_KIND');
  const fakeEventBlocked = !isRegisteredEventKind('FAKE_KIND');
  return {
    id: 'INV-6.2-C', name: 'Only registered feature and event kinds are legal',
    holds: allFeaturesRegistered && allEventsRegistered && featureDescriptors
      && eventDescriptors && fakeFeatureBlocked && fakeEventBlocked,
    evidence: `feats=${ALL_FEATURE_KINDS.length}, events=${ALL_EVENT_KINDS.length}, unregistered_blocked=${fakeFeatureBlocked && fakeEventBlocked}`,
  };
}

// ── INV-6.2-D ──
// Every primitive must declare exact inputs, transformation class, output kind,
// freshness rules, null policy, and lineage rules.
export function checkINV_62_D(): L6InvariantResult {
  const stripped = buildLegalFeature() as unknown as Record<string, unknown>;
  delete stripped.null_policy;
  delete stripped.lineage_policy;
  delete stripped.freshness_budget;
  delete stripped.transformation_class;
  const result = validateFeatureContract(stripped as unknown as FeatureContract);
  const codes = new Set(result.violations.map(v => v.code));
  const allMissingDetected =
    codes.has(L6PrimitiveViolationCode.MISSING_NULL_POLICY) &&
    codes.has(L6PrimitiveViolationCode.MISSING_LINEAGE_POLICY) &&
    codes.has(L6PrimitiveViolationCode.MISSING_FRESHNESS_BUDGET) &&
    codes.has(L6PrimitiveViolationCode.MISSING_TRANSFORMATION_CLASS);
  return {
    id: 'INV-6.2-D', name: 'No hidden interpretation: all declarations required',
    holds: !result.valid && allMissingDetected,
    evidence: `missing_detected=${allMissingDetected}, totalViolations=${result.violations.length}`,
  };
}

// ── INV-6.2-E ──
// No primitive may contain later-layer judgment semantics.
export function checkINV_62_E(): L6InvariantResult {
  const name = validateJudgmentLeakage({ name: 'buy_signal' });
  const desc = validateJudgmentLeakage({
    name: 'funding_z_score',
    description: 'High conviction thesis confirmed on strong trade decision.',
  });
  const severity = validateJudgmentLeakage({
    name: 'funding_spike',
    severityLabels: ['STRONG_BUY'],
  });
  const clean = validateJudgmentLeakage({ name: 'funding_z_score', description: 'z-score of funding rate' });
  const nameBlocked = !name.valid && name.violations.some(v => v.code === L6PrimitiveViolationCode.JUDGMENT_LEAKAGE_IN_NAME);
  const descBlocked = !desc.valid && desc.violations.some(v => v.code === L6PrimitiveViolationCode.JUDGMENT_LEAKAGE_IN_DESCRIPTION);
  const sevBlocked = !severity.valid && severity.violations.some(v => v.code === L6PrimitiveViolationCode.JUDGMENT_LEAKAGE_IN_SEVERITY);
  const cleanPasses = clean.valid;
  return {
    id: 'INV-6.2-E', name: 'No later-layer judgment semantics inside primitives',
    holds: nameBlocked && descBlocked && sevBlocked && cleanPasses,
    evidence: `name=${nameBlocked}, desc=${descBlocked}, sev=${sevBlocked}, clean=${cleanPasses}`,
  };
}

// ── INV-6.2-F ──
// Primitive contracts must be versioned and validator-complete.
export function checkINV_62_F(): L6InvariantResult {
  const featureOk = validateFeatureContract(buildLegalFeature()).valid;
  const eventOk = validateEventContract(buildLegalEvent()).valid;

  const noVersion = buildLegalFeature() as unknown as Record<string, unknown>;
  noVersion.version = '';
  const badVer = validateFeatureContract(noVersion as unknown as FeatureContract);
  const versionEnforced = !badVer.valid && badVer.violations.some(
    v => v.code === L6PrimitiveViolationCode.INVALID_VERSION_TAG,
  );
  return {
    id: 'INV-6.2-F', name: 'Primitive contracts must be versioned and validator-complete',
    holds: featureOk && eventOk && versionEnforced,
    evidence: `featureOk=${featureOk}, eventOk=${eventOk}, versionEnforced=${versionEnforced}`,
  };
}

// ── INV-6.2-G ──
// Contradictions between primitives must be representable without collapse into fake single truth.
export function checkINV_62_G(): L6InvariantResult {
  const divergence = buildLegalFeature();
  const mutable = divergence as unknown as Record<string, unknown>;
  mutable.feature_kind = L6FeatureKind.DIVERGENCE_FEATURE;
  mutable.value_kind = L6FeatureValueKind.DIVERGENCE_PAIR;
  mutable.primitive_id = 'funding.funding_price_divergence.v1';
  mutable.name = 'funding_price_divergence';
  mutable.transformation_class = L6TransformationClass.DIVERGENCE;
  mutable.contradiction_support = {
    supports: true,
    artifactType: L6ContradictionArtifactType.DIVERGENCE_FEATURE,
    preservesSourceSeparation: true,
    rationale: 'Divergence preserved; sources not collapsed.',
  };
  mutable.description = 'Divergence feature preserving source separation between funding and price.';
  const ok = validateFeatureContract(mutable as unknown as FeatureContract);
  const divergenceAccepted = ok.valid;

  const collapse = buildLegalFeature() as unknown as Record<string, unknown>;
  collapse.contradiction_support = {
    supports: true,
    artifactType: L6ContradictionArtifactType.DIVERGENCE_FEATURE,
    preservesSourceSeparation: true,
    rationale: 'final_combined_truth of sources averaged away',
  };
  const bad = validateFeatureContract(collapse as unknown as FeatureContract);
  const collapseBlocked = !bad.valid && bad.violations.some(
    v => v.code === L6PrimitiveViolationCode.CONTRADICTION_COLLAPSE_ATTEMPT,
  );
  return {
    id: 'INV-6.2-G', name: 'Contradictions representable without fake collapse',
    holds: divergenceAccepted && collapseBlocked,
    evidence: `divergenceAccepted=${divergenceAccepted}, collapseBlocked=${collapseBlocked}`,
  };
}

export function checkAllL62Invariants(): readonly L6InvariantResult[] {
  return [
    checkINV_62_A(),
    checkINV_62_B(),
    checkINV_62_C(),
    checkINV_62_D(),
    checkINV_62_E(),
    checkINV_62_F(),
    checkINV_62_G(),
  ];
}

export { buildLegalFeature, buildLegalEvent };
