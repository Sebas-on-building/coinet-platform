/**
 * L13.6 — Read-Surface Selection Engine
 *
 * §13.6.7 — Selects the L13.1-registered dependency surface
 * classes required for the resolved intent + scope. Raw lower-
 * layer reads are illegal; the engine emits a deterministic
 * `L13RuntimeReadPlan`.
 */

import { L13DependencySurfaceClass } from '../contracts/l13-constitutional-types';
import {
  L13ReadPlanStatus,
  type L13RuntimeReadPlan,
} from '../contracts/read-surface-plan';
import type { L13ScopeResolutionResult } from '../contracts/scope-resolution';
import { L13ScopeResolutionStatus } from '../contracts/scope-resolution';
import type { L13UserIntentClassification } from '../contracts/user-intent';
import { L13UserIntentClass } from '../contracts/user-intent-binding';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.runtime.v1';

/**
 * §13.6.7.4 — Intent → required dependency surface classes.
 */
const INTENT_REQUIRED_SURFACES:
  Readonly<Record<L13UserIntentClass, readonly L13DependencySurfaceClass[]>> = {
  [L13UserIntentClass.WHATS_HAPPENING]: [
    L13DependencySurfaceClass.CANONICAL_ENTITY_SUMMARY,
    L13DependencySurfaceClass.VALIDATION_ASSESSMENT,
    L13DependencySurfaceClass.CONTRADICTION_BUNDLE,
    L13DependencySurfaceClass.REGIME_STATE,
    L13DependencySurfaceClass.SEQUENCE_STATE,
    L13DependencySurfaceClass.HYPOTHESIS_RANKING,
  ],
  [L13UserIntentClass.WHATS_NEXT]: [
    L13DependencySurfaceClass.CANONICAL_ENTITY_SUMMARY,
    L13DependencySurfaceClass.CONTRADICTION_BUNDLE,
    L13DependencySurfaceClass.REGIME_STATE,
    L13DependencySurfaceClass.SEQUENCE_STATE,
    L13DependencySurfaceClass.HYPOTHESIS_RANKING,
  ],
  [L13UserIntentClass.WHY_IS_THIS_MOVING]: [
    L13DependencySurfaceClass.CANONICAL_ENTITY_SUMMARY,
    L13DependencySurfaceClass.VALIDATION_ASSESSMENT,
    L13DependencySurfaceClass.CONTRADICTION_BUNDLE,
    L13DependencySurfaceClass.REGIME_STATE,
    L13DependencySurfaceClass.SEQUENCE_STATE,
    L13DependencySurfaceClass.HYPOTHESIS_RANKING,
  ],
  [L13UserIntentClass.EXPLAIN_SCORE]: [
    L13DependencySurfaceClass.CANONICAL_ENTITY_SUMMARY,
  ],
  [L13UserIntentClass.EXPLAIN_SCENARIO]: [
    L13DependencySurfaceClass.CANONICAL_ENTITY_SUMMARY,
    L13DependencySurfaceClass.CONTRADICTION_BUNDLE,
  ],
  [L13UserIntentClass.EXPLAIN_HYPOTHESIS]: [
    L13DependencySurfaceClass.CANONICAL_ENTITY_SUMMARY,
    L13DependencySurfaceClass.HYPOTHESIS_RANKING,
    L13DependencySurfaceClass.HYPOTHESIS_SPREAD,
    L13DependencySurfaceClass.CONTRADICTION_BUNDLE,
  ],
  [L13UserIntentClass.EXPLAIN_REGIME]: [
    L13DependencySurfaceClass.REGIME_STATE,
    L13DependencySurfaceClass.REGIME_CONFIDENCE,
    L13DependencySurfaceClass.REGIME_TRANSITION_RISK,
  ],
  [L13UserIntentClass.EXPLAIN_SEQUENCE]: [
    L13DependencySurfaceClass.SEQUENCE_STATE,
    L13DependencySurfaceClass.SEQUENCE_PHASE,
    L13DependencySurfaceClass.SEQUENCE_DECAY,
  ],
  [L13UserIntentClass.COMPARE_ASSETS]: [
    L13DependencySurfaceClass.CANONICAL_ENTITY_SUMMARY,
    L13DependencySurfaceClass.VALIDATION_ASSESSMENT,
    L13DependencySurfaceClass.CONTRADICTION_BUNDLE,
    L13DependencySurfaceClass.REGIME_STATE,
    L13DependencySurfaceClass.HYPOTHESIS_RANKING,
  ],
  [L13UserIntentClass.COMPARE_THESES]: [
    L13DependencySurfaceClass.CANONICAL_ENTITY_SUMMARY,
    L13DependencySurfaceClass.HYPOTHESIS_RANKING,
    L13DependencySurfaceClass.HYPOTHESIS_SPREAD,
    L13DependencySurfaceClass.CONTRADICTION_BUNDLE,
  ],
  [L13UserIntentClass.WRITE_ALERT]: [
    L13DependencySurfaceClass.CANONICAL_ENTITY_SUMMARY,
    L13DependencySurfaceClass.CONTRADICTION_BUNDLE,
  ],
  [L13UserIntentClass.WRITE_REPORT]: [
    L13DependencySurfaceClass.CANONICAL_ENTITY_SUMMARY,
    L13DependencySurfaceClass.VALIDATION_ASSESSMENT,
    L13DependencySurfaceClass.CONTRADICTION_BUNDLE,
    L13DependencySurfaceClass.REGIME_STATE,
    L13DependencySurfaceClass.SEQUENCE_STATE,
    L13DependencySurfaceClass.HYPOTHESIS_RANKING,
  ],
  [L13UserIntentClass.CONTRADICTION_INSIGHT]: [
    L13DependencySurfaceClass.CANONICAL_ENTITY_SUMMARY,
    L13DependencySurfaceClass.CONTRADICTION_BUNDLE,
  ],
  [L13UserIntentClass.REQUESTS_TRADE_ADVICE]: [],
  [L13UserIntentClass.REQUESTS_CERTAINTY]: [],
  [L13UserIntentClass.REQUESTS_BULLISH_BEARISH_ONLY]: [],
};

const OPTIONAL_SURFACES_BY_INTENT:
  Readonly<Record<L13UserIntentClass, readonly L13DependencySurfaceClass[]>> = {
  [L13UserIntentClass.WHATS_HAPPENING]: [
    L13DependencySurfaceClass.HYPOTHESIS_SPREAD,
    L13DependencySurfaceClass.SEQUENCE_PHASE,
  ],
  [L13UserIntentClass.WHATS_NEXT]: [
    L13DependencySurfaceClass.HYPOTHESIS_SPREAD,
  ],
  [L13UserIntentClass.WHY_IS_THIS_MOVING]: [
    L13DependencySurfaceClass.HYPOTHESIS_SPREAD,
    L13DependencySurfaceClass.HYPOTHESIS_SUPPORT_CONTRADICTION,
  ],
  [L13UserIntentClass.EXPLAIN_SCORE]: [],
  [L13UserIntentClass.EXPLAIN_SCENARIO]: [],
  [L13UserIntentClass.EXPLAIN_HYPOTHESIS]: [
    L13DependencySurfaceClass.HYPOTHESIS_SUPPORT_CONTRADICTION,
  ],
  [L13UserIntentClass.EXPLAIN_REGIME]: [],
  [L13UserIntentClass.EXPLAIN_SEQUENCE]: [
    L13DependencySurfaceClass.SEQUENCE_RESTRICTION_PROFILE,
  ],
  [L13UserIntentClass.COMPARE_ASSETS]: [
    L13DependencySurfaceClass.HYPOTHESIS_SPREAD,
  ],
  [L13UserIntentClass.COMPARE_THESES]: [
    L13DependencySurfaceClass.HYPOTHESIS_SUPPORT_CONTRADICTION,
  ],
  [L13UserIntentClass.WRITE_ALERT]: [],
  [L13UserIntentClass.WRITE_REPORT]: [
    L13DependencySurfaceClass.HYPOTHESIS_SPREAD,
    L13DependencySurfaceClass.SEQUENCE_PHASE,
  ],
  [L13UserIntentClass.CONTRADICTION_INSIGHT]: [],
  [L13UserIntentClass.REQUESTS_TRADE_ADVICE]: [],
  [L13UserIntentClass.REQUESTS_CERTAINTY]: [],
  [L13UserIntentClass.REQUESTS_BULLISH_BEARISH_ONLY]: [],
};

const SCORE_BUNDLE_INTENTS: ReadonlySet<L13UserIntentClass> = new Set([
  L13UserIntentClass.WHATS_HAPPENING,
  L13UserIntentClass.WHY_IS_THIS_MOVING,
  L13UserIntentClass.EXPLAIN_SCORE,
  L13UserIntentClass.WRITE_REPORT,
  L13UserIntentClass.WRITE_ALERT,
]);

const SCENARIO_BUNDLE_INTENTS: ReadonlySet<L13UserIntentClass> = new Set([
  L13UserIntentClass.WHATS_NEXT,
  L13UserIntentClass.EXPLAIN_SCENARIO,
  L13UserIntentClass.WRITE_REPORT,
  L13UserIntentClass.WRITE_ALERT,
]);

export interface L13ReadSurfaceSelectionInput {
  readonly intent: L13UserIntentClassification;
  readonly scope: L13ScopeResolutionResult;
  /**
   * Surfaces actually available from the upstream read services.
   * The selection engine compares this set against required and
   * marks missing classes.
   */
  readonly available_surface_classes:
    readonly L13DependencySurfaceClass[];
  readonly available_bundle_refs?: readonly string[];
}

/**
 * §13.6.7 — Build the runtime read plan.
 */
export function selectL13ReadSurfaces(
  input: L13ReadSurfaceSelectionInput,
): L13RuntimeReadPlan {
  const { intent, scope, available_surface_classes } = input;
  const intentClass = intent.selected_intent;
  const required =
    INTENT_REQUIRED_SURFACES[intentClass] ?? [];
  const optional =
    OPTIONAL_SURFACES_BY_INTENT[intentClass] ?? [];
  const availSet = new Set(available_surface_classes);
  const missing = required.filter(c => !availSet.has(c));

  const l11Required = SCORE_BUNDLE_INTENTS.has(intentClass);
  const l12Required = SCENARIO_BUNDLE_INTENTS.has(intentClass);

  let status: L13ReadPlanStatus;
  if (
    scope.scope_resolution_status ===
      L13ScopeResolutionStatus.BLOCKED_ILLEGAL_SCOPE_REQUEST ||
    intent.out_of_scope_reason_codes.length > 0
  ) {
    status = L13ReadPlanStatus.BLOCKED_RAW_SURFACE_REQUEST;
  } else if (missing.length > 0) {
    status = L13ReadPlanStatus.BLOCKED_MISSING_REQUIRED_SURFACE;
  } else if (
    optional.some(c => !availSet.has(c))
  ) {
    status = L13ReadPlanStatus.READY_WITH_OPTIONAL_GAPS;
  } else {
    status = L13ReadPlanStatus.READY;
  }

  const requiredBundleRefs: string[] = [];
  const optionalBundleRefs: string[] = [];
  if (l11Required) requiredBundleRefs.push('l11.score.context.bundle');
  if (l12Required) requiredBundleRefs.push('l12.scenario.context.bundle');
  for (const ref of input.available_bundle_refs ?? []) {
    if (!requiredBundleRefs.includes(ref)) {
      optionalBundleRefs.push(ref);
    }
  }

  const replayHash = fnv1a(
    [
      input.intent.request_id,
      input.intent.intent_classification_id,
      input.scope.scope_resolution_id,
      required.slice().sort().join(','),
      optional.slice().sort().join(','),
      Array.from(availSet).sort().join(','),
      missing.slice().sort().join(','),
      String(l11Required),
      String(l12Required),
      requiredBundleRefs.sort().join(','),
      optionalBundleRefs.sort().join(','),
      status,
      POLICY_V,
    ].join('|'),
  );

  return {
    read_plan_id: `l13.readplan.${replayHash}`,
    request_id: input.intent.request_id,
    intent_classification_ref: intent.intent_classification_id,
    scope_resolution_ref: scope.scope_resolution_id,
    required_surface_classes: required,
    optional_surface_classes: optional,
    required_bundle_refs: requiredBundleRefs,
    optional_bundle_refs: optionalBundleRefs,
    l11_score_context_required: l11Required,
    l12_scenario_context_required: l12Required,
    missing_required_surface_classes: missing,
    read_plan_status: status,
    lineage_refs: ['l13.runtime.lineage'],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
