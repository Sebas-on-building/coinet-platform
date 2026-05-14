/**
 * L12.4 — Engine 2: ScenarioInputResolver (§12.4.14).
 *
 * Determines which lower-layer inputs are legally usable for scenario
 * construction. Also defines `L12ResolvedInputSurfaces` — the L11 score
 * context bundle and L7..L10 surfaces the assembly engine must hand into
 * the runtime as the stage-0 artifact.
 */

import { buildL12ScenarioReplayHash } from '../contracts/scenario-ids';

/**
 * §12.4.13 — INPUT_SURFACES stage artifact.
 *
 * Governed L3..L11 surfaces *with* explicit posture flags. The DAG does
 * not consume raw lower-layer inputs; only governed refs and posture flags
 * cross stage boundaries.
 */
export interface L12ResolvedInputSurfaces {
  readonly input_surfaces_id: string;

  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;

  readonly l3_scope_law_ref: string;
  readonly l4_graph_context_ref: string;

  readonly l7_validation_refs: readonly string[];
  readonly l7_contradiction_refs: readonly string[];
  readonly l7_restriction_profile_ref: string;

  readonly l8_regime_refs: readonly string[];
  readonly l9_sequence_refs: readonly string[];
  readonly l10_hypothesis_refs: readonly string[];

  /** L11 score-context *bundle* refs (full bundle — not naked scores). */
  readonly l11_score_context_bundle_refs: readonly string[];
  readonly l11_component_breakdown_refs: readonly string[];
  readonly l11_attribution_refs: readonly string[];
  readonly l11_missing_data_refs: readonly string[];
  readonly l11_modifier_refs: readonly string[];
  readonly l11_calibration_hook_refs: readonly string[];
  readonly l11_drift_refs: readonly string[];
  readonly l11_restriction_profile_refs: readonly string[];

  /** Posture flags read from lower layers. */
  readonly contradictionUnresolved: boolean;
  readonly transitionRiskHigh: boolean;
  readonly decayDominant: boolean;
  readonly hypothesisSpreadNarrow: boolean;
  readonly missingVisibilityMaterial: boolean;
  readonly driftMaterialOrCritical: boolean;

  /** Raw lower-layer refs strictly forbidden (never legal as decisive). */
  readonly raw_lower_layer_refs_attempted: readonly string[];

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export enum L12ResolvedInputReadinessClass {
  READY = 'READY',
  READY_WITH_DISCLOSURE = 'READY_WITH_DISCLOSURE',
  PARTIAL = 'PARTIAL',
  DEGRADED = 'DEGRADED',
  RESTRICTED = 'RESTRICTED',
  BLOCKED = 'BLOCKED',
}

export const ALL_L12_RESOLVED_INPUT_READINESS_CLASSES: readonly L12ResolvedInputReadinessClass[] =
  Object.values(L12ResolvedInputReadinessClass);

export interface L12ScenarioInputResolution {
  readonly input_resolution_id: string;
  readonly scenario_subject_id: string;

  readonly usable_validation_refs: readonly string[];
  readonly usable_regime_refs: readonly string[];
  readonly usable_sequence_refs: readonly string[];
  readonly usable_hypothesis_refs: readonly string[];
  readonly usable_score_context_refs: readonly string[];

  readonly narrowed_refs: readonly string[];
  readonly blocked_refs: readonly string[];
  readonly evidence_only_refs: readonly string[];
  readonly historical_refs: readonly string[];

  readonly readiness_class: L12ResolvedInputReadinessClass;

  readonly restriction_reason_codes: readonly string[];
  readonly contradiction_reason_codes: readonly string[];
  readonly drift_reason_codes: readonly string[];
  readonly missing_visibility_reason_codes: readonly string[];

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

/* ────────────────────────────────────────────────────────────── */
/* Builder for INPUT_SURFACES                                     */
/* ────────────────────────────────────────────────────────────── */

export function buildL12ResolvedInputSurfaces(
  input: Omit<L12ResolvedInputSurfaces, 'input_surfaces_id' | 'replay_hash'>,
): L12ResolvedInputSurfaces {
  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.input_surfaces',
    policy_version: input.policy_version,
    material: {
      scope_type: input.scope_type,
      scope_id: input.scope_id,
      as_of: input.as_of,
      l11: [...input.l11_score_context_bundle_refs].sort(),
    },
  });
  return {
    input_surfaces_id: `l12.surfaces.${replay_hash}`,
    replay_hash,
    ...input,
  };
}

/* ────────────────────────────────────────────────────────────── */
/* Engine                                                         */
/* ────────────────────────────────────────────────────────────── */

export interface ResolveL12ScenarioInputsArgs {
  readonly scenario_subject_id: string;
  readonly surfaces: L12ResolvedInputSurfaces;
  readonly policy_version: string;
}

export interface ResolveL12ScenarioInputsResult {
  readonly ok: boolean;
  readonly resolution: L12ScenarioInputResolution;
  readonly issues: readonly string[];
}

/**
 * Pure resolver: classifies usable / narrowed / blocked refs and derives
 * the readiness class from posture flags. Reject any raw lower-layer ref.
 */
export function resolveL12ScenarioInputs(
  args: ResolveL12ScenarioInputsArgs,
): ResolveL12ScenarioInputsResult {
  const issues: string[] = [];
  const s = args.surfaces;

  if (s.raw_lower_layer_refs_attempted.length > 0) {
    issues.push(
      `raw lower-layer refs attempted (${s.raw_lower_layer_refs_attempted.length})`,
    );
  }
  const RAW_REF = /^(l[12]|raw|primitive|ohlcv|tick|orderbook)[:.]/i;
  for (const ref of s.l11_score_context_bundle_refs) {
    if (RAW_REF.test(ref)) issues.push(`naked/raw L11 score ref: ${ref}`);
  }
  if (s.l11_score_context_bundle_refs.length === 0) {
    issues.push('L11 score context bundle missing');
  }
  if (s.l11_drift_refs.length === 0) {
    issues.push('L11 drift refs missing');
  }
  if (!s.l7_restriction_profile_ref) {
    issues.push('L7 restriction profile missing');
  }

  const narrowed: string[] = [];
  const blocked: string[] = [];
  const restriction_reason_codes: string[] = [];
  const contradiction_reason_codes: string[] = [];
  const drift_reason_codes: string[] = [];
  const missing_visibility_reason_codes: string[] = [];

  if (s.contradictionUnresolved) contradiction_reason_codes.push('L7_CONTRADICTION_UNRESOLVED');
  if (s.transitionRiskHigh) narrowed.push('L8_TRANSITION_RISK_HIGH');
  if (s.decayDominant) narrowed.push('L9_DECAY_DOMINANT');
  if (s.hypothesisSpreadNarrow) narrowed.push('L10_HYPOTHESIS_SPREAD_NARROW');
  if (s.missingVisibilityMaterial) missing_visibility_reason_codes.push('L11_MISSING_VISIBILITY_MATERIAL');
  if (s.driftMaterialOrCritical) drift_reason_codes.push('L11_DRIFT_MATERIAL_OR_CRITICAL');

  let readiness: L12ResolvedInputReadinessClass = L12ResolvedInputReadinessClass.READY;
  if (issues.length > 0) {
    readiness = L12ResolvedInputReadinessClass.BLOCKED;
  } else if (s.driftMaterialOrCritical || s.contradictionUnresolved) {
    readiness = L12ResolvedInputReadinessClass.DEGRADED;
  } else if (s.missingVisibilityMaterial) {
    readiness = L12ResolvedInputReadinessClass.PARTIAL;
  } else if (s.transitionRiskHigh || s.decayDominant || s.hypothesisSpreadNarrow) {
    readiness = L12ResolvedInputReadinessClass.READY_WITH_DISCLOSURE;
  }

  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.input_resolution',
    policy_version: args.policy_version,
    material: {
      scenario_subject_id: args.scenario_subject_id,
      surfaces_hash: s.replay_hash,
      readiness,
    },
  });
  const resolution: L12ScenarioInputResolution = {
    input_resolution_id: `l12.resolution.${replay_hash}`,
    scenario_subject_id: args.scenario_subject_id,
    usable_validation_refs: [...s.l7_validation_refs].sort(),
    usable_regime_refs: [...s.l8_regime_refs].sort(),
    usable_sequence_refs: [...s.l9_sequence_refs].sort(),
    usable_hypothesis_refs: [...s.l10_hypothesis_refs].sort(),
    usable_score_context_refs: [...s.l11_score_context_bundle_refs].sort(),
    narrowed_refs: narrowed.sort(),
    blocked_refs: [...blocked].sort(),
    evidence_only_refs: [],
    historical_refs: [],
    readiness_class: readiness,
    restriction_reason_codes: restriction_reason_codes.sort(),
    contradiction_reason_codes: contradiction_reason_codes.sort(),
    drift_reason_codes: drift_reason_codes.sort(),
    missing_visibility_reason_codes: missing_visibility_reason_codes.sort(),
    lineage_refs: s.lineage_refs,
    replay_hash,
    policy_version: args.policy_version,
  };
  return { ok: issues.length === 0, resolution, issues };
}
