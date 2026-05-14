/**
 * L12.1 — Output Surface Contract
 *
 * §12.1.8 / §12.1.10 — First-class Layer 12 output surfaces. Every
 * output is conditional, evidence-bound, lineage-bound, replay-safe,
 * L5-routed, restriction-aware, contradiction-aware, invalidation-
 * aware, non-recommendational, and non-judgmental.
 */

import {
  L12DownstreamConsumer,
  L12ForbiddenAction,
  L12OutputSurfaceClass,
} from './l12-constitutional-types';

export interface L12OutputSurfaceDescriptor {
  readonly surfaceId: string;
  readonly outputClass: L12OutputSurfaceClass;
  readonly authorityMode:
    | 'SCENARIO_SET'
    | 'SCENARIO_INSTANCE'
    | 'TRIGGER_PROFILE'
    | 'INVALIDATION_PROFILE'
    | 'PATH_CONFIDENCE_PROFILE'
    | 'SHIFT_CONDITION_SET'
    | 'RESTRICTION_PROFILE'
    | 'EVIDENCE_READ_SURFACE'
    | 'LINEAGE_READ_SURFACE';
  readonly requiresConditions: boolean;
  readonly requiresTriggers: boolean;
  readonly requiresInvalidations: boolean;
  readonly requiresPathConfidence: boolean;
  readonly requiresEvidenceRefs: boolean;
  readonly requiresLineageRefs: boolean;
  readonly requiresReplayHash: boolean;
  readonly requiresL5Route: boolean;
  readonly restrictionAware: boolean;
  readonly contradictionAware: boolean;
  readonly invalidationAware: boolean;
  readonly nonFinalJudgment: boolean;
  readonly nonRecommendation: boolean;
  readonly nonTradeAction: boolean;
  readonly allowedDownstreamConsumers: readonly L12DownstreamConsumer[];
  readonly forbiddenSemantics: readonly L12ForbiddenAction[];
  readonly requiredLineageFields: readonly string[];
  readonly l5StorageRoute: string;
  readonly policyVersion: string;
  readonly description: string;
}

const POLICY_V = 'l12.constitution.v1';
const SCENARIO_LINEAGE_FIELDS: readonly string[] = [
  'scenario_subject_id',
  'scenario_set_id',
  'scenario_id',
  'scenario_version',
  'computed_at',
  'trace_id',
  'manifest_id',
  'replay_hash',
];
const SUPPORT_LINEAGE_FIELDS: readonly string[] = [
  'scenario_subject_id',
  'scenario_set_id',
  'scenario_version',
  'derived_at',
  'trace_id',
  'manifest_id',
  'replay_hash',
];
const READ_LINEAGE_FIELDS: readonly string[] = [
  'scenario_subject_id',
  'scenario_set_id',
  'scenario_version',
  'read_surface_id',
  'trace_id',
  'manifest_id',
];

const STD_DOWNSTREAM: readonly L12DownstreamConsumer[] = [
  L12DownstreamConsumer.L13_JUDGMENT_LAYER,
  L12DownstreamConsumer.L14_DELIVERY_LAYER,
  L12DownstreamConsumer.L15_FEEDBACK_LAYER,
  L12DownstreamConsumer.L16_GOVERNANCE_LAYER,
  L12DownstreamConsumer.L17_PLUS_LAYER,
];

const FORBIDDEN_FOR_SCENARIO: readonly L12ForbiddenAction[] = [
  L12ForbiddenAction.PREDICTION_THEATER,
  L12ForbiddenAction.CERTAINTY_CLAIM,
  L12ForbiddenAction.FINAL_JUDGMENT_EMISSION,
  L12ForbiddenAction.RECOMMENDATION_EMISSION,
  L12ForbiddenAction.TRADE_ACTION_EMISSION,
  L12ForbiddenAction.SCENARIO_AS_GUARANTEE,
  L12ForbiddenAction.SINGLE_PATH_FAKE_CERTAINTY,
];

export const L12_OUTPUT_SURFACES: readonly L12OutputSurfaceDescriptor[] = [
  {
    surfaceId: 'l12:scenario_set',
    outputClass: L12OutputSurfaceClass.SCENARIO_SET,
    authorityMode: 'SCENARIO_SET',
    requiresConditions: true,
    requiresTriggers: true,
    requiresInvalidations: true,
    requiresPathConfidence: true,
    requiresEvidenceRefs: true,
    requiresLineageRefs: true,
    requiresReplayHash: true,
    requiresL5Route: true,
    restrictionAware: true,
    contradictionAware: true,
    invalidationAware: true,
    nonFinalJudgment: true,
    nonRecommendation: true,
    nonTradeAction: true,
    allowedDownstreamConsumers: STD_DOWNSTREAM,
    forbiddenSemantics: FORBIDDEN_FOR_SCENARIO,
    requiredLineageFields: SCENARIO_LINEAGE_FIELDS,
    l5StorageRoute: 'l5:materialization_route -> l12.scenario_set',
    policyVersion: POLICY_V,
    description: 'Scenario set — base case + alternative paths with explicit spread',
  },
  {
    surfaceId: 'l12:base_case_scenario',
    outputClass: L12OutputSurfaceClass.BASE_CASE_SCENARIO,
    authorityMode: 'SCENARIO_INSTANCE',
    requiresConditions: true,
    requiresTriggers: true,
    requiresInvalidations: true,
    requiresPathConfidence: true,
    requiresEvidenceRefs: true,
    requiresLineageRefs: true,
    requiresReplayHash: true,
    requiresL5Route: true,
    restrictionAware: true,
    contradictionAware: true,
    invalidationAware: true,
    nonFinalJudgment: true,
    nonRecommendation: true,
    nonTradeAction: true,
    allowedDownstreamConsumers: STD_DOWNSTREAM,
    forbiddenSemantics: FORBIDDEN_FOR_SCENARIO,
    requiredLineageFields: SCENARIO_LINEAGE_FIELDS,
    l5StorageRoute: 'l5:materialization_route -> l12.base_case_scenario',
    policyVersion: POLICY_V,
    description: 'Base case scenario — most plausible governed conditional path',
  },
  {
    surfaceId: 'l12:bullish_continuation_scenario',
    outputClass: L12OutputSurfaceClass.BULLISH_CONTINUATION_SCENARIO,
    authorityMode: 'SCENARIO_INSTANCE',
    requiresConditions: true,
    requiresTriggers: true,
    requiresInvalidations: true,
    requiresPathConfidence: true,
    requiresEvidenceRefs: true,
    requiresLineageRefs: true,
    requiresReplayHash: true,
    requiresL5Route: true,
    restrictionAware: true,
    contradictionAware: true,
    invalidationAware: true,
    nonFinalJudgment: true,
    nonRecommendation: true,
    nonTradeAction: true,
    allowedDownstreamConsumers: STD_DOWNSTREAM,
    forbiddenSemantics: FORBIDDEN_FOR_SCENARIO,
    requiredLineageFields: SCENARIO_LINEAGE_FIELDS,
    l5StorageRoute: 'l5:materialization_route -> l12.bullish_continuation_scenario',
    policyVersion: POLICY_V,
    description: 'Bullish continuation scenario — conditional continuation path',
  },
  {
    surfaceId: 'l12:bearish_failure_scenario',
    outputClass: L12OutputSurfaceClass.BEARISH_FAILURE_SCENARIO,
    authorityMode: 'SCENARIO_INSTANCE',
    requiresConditions: true,
    requiresTriggers: true,
    requiresInvalidations: true,
    requiresPathConfidence: true,
    requiresEvidenceRefs: true,
    requiresLineageRefs: true,
    requiresReplayHash: true,
    requiresL5Route: true,
    restrictionAware: true,
    contradictionAware: true,
    invalidationAware: true,
    nonFinalJudgment: true,
    nonRecommendation: true,
    nonTradeAction: true,
    allowedDownstreamConsumers: STD_DOWNSTREAM,
    forbiddenSemantics: FORBIDDEN_FOR_SCENARIO,
    requiredLineageFields: SCENARIO_LINEAGE_FIELDS,
    l5StorageRoute: 'l5:materialization_route -> l12.bearish_failure_scenario',
    policyVersion: POLICY_V,
    description: 'Bearish failure scenario — conditional failure path',
  },
  {
    surfaceId: 'l12:trigger_profile',
    outputClass: L12OutputSurfaceClass.TRIGGER_PROFILE,
    authorityMode: 'TRIGGER_PROFILE',
    requiresConditions: true,
    requiresTriggers: true,
    requiresInvalidations: false,
    requiresPathConfidence: false,
    requiresEvidenceRefs: true,
    requiresLineageRefs: true,
    requiresReplayHash: true,
    requiresL5Route: true,
    restrictionAware: true,
    contradictionAware: true,
    invalidationAware: false,
    nonFinalJudgment: true,
    nonRecommendation: true,
    nonTradeAction: true,
    allowedDownstreamConsumers: STD_DOWNSTREAM,
    forbiddenSemantics: FORBIDDEN_FOR_SCENARIO,
    requiredLineageFields: SUPPORT_LINEAGE_FIELDS,
    l5StorageRoute: 'l5:materialization_route -> l12.trigger_profile',
    policyVersion: POLICY_V,
    description: 'Trigger profile — what would strengthen a conditional path',
  },
  {
    surfaceId: 'l12:invalidation_profile',
    outputClass: L12OutputSurfaceClass.INVALIDATION_PROFILE,
    authorityMode: 'INVALIDATION_PROFILE',
    requiresConditions: true,
    requiresTriggers: false,
    requiresInvalidations: true,
    requiresPathConfidence: false,
    requiresEvidenceRefs: true,
    requiresLineageRefs: true,
    requiresReplayHash: true,
    requiresL5Route: true,
    restrictionAware: true,
    contradictionAware: true,
    invalidationAware: true,
    nonFinalJudgment: true,
    nonRecommendation: true,
    nonTradeAction: true,
    allowedDownstreamConsumers: STD_DOWNSTREAM,
    forbiddenSemantics: FORBIDDEN_FOR_SCENARIO,
    requiredLineageFields: SUPPORT_LINEAGE_FIELDS,
    l5StorageRoute: 'l5:materialization_route -> l12.invalidation_profile',
    policyVersion: POLICY_V,
    description: 'Invalidation profile — what would weaken or collapse a path',
  },
  {
    surfaceId: 'l12:path_confidence_profile',
    outputClass: L12OutputSurfaceClass.PATH_CONFIDENCE_PROFILE,
    authorityMode: 'PATH_CONFIDENCE_PROFILE',
    requiresConditions: false,
    requiresTriggers: false,
    requiresInvalidations: false,
    requiresPathConfidence: true,
    requiresEvidenceRefs: true,
    requiresLineageRefs: true,
    requiresReplayHash: true,
    requiresL5Route: true,
    restrictionAware: true,
    contradictionAware: true,
    invalidationAware: true,
    nonFinalJudgment: true,
    nonRecommendation: true,
    nonTradeAction: true,
    allowedDownstreamConsumers: STD_DOWNSTREAM,
    forbiddenSemantics: FORBIDDEN_FOR_SCENARIO,
    requiredLineageFields: SUPPORT_LINEAGE_FIELDS,
    l5StorageRoute: 'l5:materialization_route -> l12.path_confidence_profile',
    policyVersion: POLICY_V,
    description: 'Path confidence profile — bounded by missingness/contradiction/drift',
  },
  {
    surfaceId: 'l12:scenario_shift_condition_set',
    outputClass: L12OutputSurfaceClass.SCENARIO_SHIFT_CONDITION_SET,
    authorityMode: 'SHIFT_CONDITION_SET',
    requiresConditions: true,
    requiresTriggers: false,
    requiresInvalidations: false,
    requiresPathConfidence: false,
    requiresEvidenceRefs: true,
    requiresLineageRefs: true,
    requiresReplayHash: true,
    requiresL5Route: true,
    restrictionAware: true,
    contradictionAware: false,
    invalidationAware: false,
    nonFinalJudgment: true,
    nonRecommendation: true,
    nonTradeAction: true,
    allowedDownstreamConsumers: STD_DOWNSTREAM,
    forbiddenSemantics: FORBIDDEN_FOR_SCENARIO,
    requiredLineageFields: SUPPORT_LINEAGE_FIELDS,
    l5StorageRoute: 'l5:materialization_route -> l12.scenario_shift_condition_set',
    policyVersion: POLICY_V,
    description: 'Scenario shift condition set — what would change scenario ranking',
  },
  {
    surfaceId: 'l12:scenario_restriction_profile',
    outputClass: L12OutputSurfaceClass.SCENARIO_RESTRICTION_PROFILE,
    authorityMode: 'RESTRICTION_PROFILE',
    requiresConditions: false,
    requiresTriggers: false,
    requiresInvalidations: false,
    requiresPathConfidence: false,
    requiresEvidenceRefs: false,
    requiresLineageRefs: true,
    requiresReplayHash: true,
    requiresL5Route: true,
    restrictionAware: true,
    contradictionAware: false,
    invalidationAware: false,
    nonFinalJudgment: true,
    nonRecommendation: true,
    nonTradeAction: true,
    allowedDownstreamConsumers: STD_DOWNSTREAM,
    forbiddenSemantics: FORBIDDEN_FOR_SCENARIO,
    requiredLineageFields: SUPPORT_LINEAGE_FIELDS,
    l5StorageRoute: 'l5:materialization_route -> l12.scenario_restriction_profile',
    policyVersion: POLICY_V,
    description: 'Scenario restriction profile — downstream usage rights',
  },
  {
    surfaceId: 'l12:scenario_evidence_read_surface',
    outputClass: L12OutputSurfaceClass.SCENARIO_EVIDENCE_READ_SURFACE,
    authorityMode: 'EVIDENCE_READ_SURFACE',
    requiresConditions: false,
    requiresTriggers: false,
    requiresInvalidations: false,
    requiresPathConfidence: false,
    requiresEvidenceRefs: true,
    requiresLineageRefs: true,
    requiresReplayHash: true,
    requiresL5Route: true,
    restrictionAware: true,
    contradictionAware: true,
    invalidationAware: true,
    nonFinalJudgment: true,
    nonRecommendation: true,
    nonTradeAction: true,
    allowedDownstreamConsumers: STD_DOWNSTREAM,
    forbiddenSemantics: FORBIDDEN_FOR_SCENARIO,
    requiredLineageFields: READ_LINEAGE_FIELDS,
    l5StorageRoute: 'l5:current_state_read -> l12.scenario_evidence',
    policyVersion: POLICY_V,
    description: 'Scenario evidence read surface — lineage-bound evidence packs',
  },
  {
    surfaceId: 'l12:scenario_lineage_read_surface',
    outputClass: L12OutputSurfaceClass.SCENARIO_LINEAGE_READ_SURFACE,
    authorityMode: 'LINEAGE_READ_SURFACE',
    requiresConditions: false,
    requiresTriggers: false,
    requiresInvalidations: false,
    requiresPathConfidence: false,
    requiresEvidenceRefs: false,
    requiresLineageRefs: true,
    requiresReplayHash: true,
    requiresL5Route: true,
    restrictionAware: true,
    contradictionAware: false,
    invalidationAware: false,
    nonFinalJudgment: true,
    nonRecommendation: true,
    nonTradeAction: true,
    allowedDownstreamConsumers: STD_DOWNSTREAM,
    forbiddenSemantics: FORBIDDEN_FOR_SCENARIO,
    requiredLineageFields: READ_LINEAGE_FIELDS,
    l5StorageRoute: 'l5:lineage_read -> l12.scenario_lineage',
    policyVersion: POLICY_V,
    description: 'Scenario lineage read surface — replay/repair anchor',
  },
];

export function getL12OutputSurface(
  surfaceId: string,
): L12OutputSurfaceDescriptor | undefined {
  return L12_OUTPUT_SURFACES.find(s => s.surfaceId === surfaceId);
}

export function isL12RegisteredOutput(surfaceId: string): boolean {
  return L12_OUTPUT_SURFACES.some(s => s.surfaceId === surfaceId);
}

export function isL12RegisteredOutputClass(cls: L12OutputSurfaceClass): boolean {
  return L12_OUTPUT_SURFACES.some(s => s.outputClass === cls);
}

export function getL12OutputsByClass(
  cls: L12OutputSurfaceClass,
): readonly L12OutputSurfaceDescriptor[] {
  return L12_OUTPUT_SURFACES.filter(s => s.outputClass === cls);
}

export function getL12OutputsRequiringInvalidations():
  readonly L12OutputSurfaceDescriptor[] {
  return L12_OUTPUT_SURFACES.filter(s => s.requiresInvalidations);
}

export function getL12OutputsRequiringTriggers():
  readonly L12OutputSurfaceDescriptor[] {
  return L12_OUTPUT_SURFACES.filter(s => s.requiresTriggers);
}

export function getL12OutputsRequiringPathConfidence():
  readonly L12OutputSurfaceDescriptor[] {
  return L12_OUTPUT_SURFACES.filter(s => s.requiresPathConfidence);
}

export function getL12OutputsRequiringReplayHash():
  readonly L12OutputSurfaceDescriptor[] {
  return L12_OUTPUT_SURFACES.filter(s => s.requiresReplayHash);
}

export function getL12OutputsRequiringL5Route():
  readonly L12OutputSurfaceDescriptor[] {
  return L12_OUTPUT_SURFACES.filter(s => s.requiresL5Route);
}

export function getAllL12RequiredLineageFields(): readonly string[] {
  const fields = new Set<string>();
  for (const s of L12_OUTPUT_SURFACES) {
    for (const f of s.requiredLineageFields) fields.add(f);
  }
  return [...fields];
}

export function isL12AllowedDownstreamConsumer(
  surfaceId: string,
  consumer: L12DownstreamConsumer,
): boolean {
  const s = getL12OutputSurface(surfaceId);
  if (!s) return false;
  return s.allowedDownstreamConsumers.includes(consumer);
}
