/**
 * L11.5 — Missing-Data Profile Engine (§11.5.13.1)
 *
 * Deterministic engine that converts an L11.3 evaluation result +
 * available input metadata into a runtime `L11ScoreMissingDataProfile`
 * with applied behaviours, score/confidence effects, visibility
 * class, readiness effect, and a deterministic replay hash.
 *
 * Pipeline (§11.5.13.1):
 *   1. load formula input manifest
 *   2. compare required and optional input surfaces
 *   3. classify absent / stale / degraded / restricted / evidence-only
 *      / conflicting / insufficient states
 *   4. resolve runtime behaviour per condition (most-restrictive wins)
 *   5. derive penalties / caps / confidence effects
 *   6. derive visibility class
 *   7. derive readiness effect
 *   8. build replay hash
 */

import {
  L11FormulaEvaluationResult,
  L11ScoreFormulaDefinition,
  L11ScoreOutput,
  L11ScoreMissingDataProfile,
  L11AppliedMissingDataBehavior,
  L11_MISSING_DATA_POLICY_VERSION,
  L11MissingInputRef,
  L11InsufficientInputSetRef,
  L11FormulaInputDependencyClass,
  L11MissingInputSourceLayer,
  L11MissingDataConditionClass,
  isL11CriticalMissingCondition,
  mapL11InputConditionToMissingDataCondition,
  L11RuntimeMissingDataBehaviorClass,
  mapL11FormulaBehaviorToRuntimeBehavior,
  resolveMostRestrictiveBehavior,
  L11ScoreVisibilityClass,
  L11MissingDataReadinessEffect,
  worstL11VisibilityClass,
  mostRestrictiveL11ReadinessEffect,
  extractL11MissingDataProfileReplayMaterial,
  canonicalMissingDataProfileReplayHash,
  L11InputConditionClass,
  L11MissingDataBehaviorClass,
  L11DependencySurfaceClass,
} from '../contracts';

// ─────────────────────────────────────────────────────────────────────
// Engine input types
// ─────────────────────────────────────────────────────────────────────

/**
 * Per-input availability metadata supplied by the host. The engine
 * does NOT detect missingness from raw data; it consumes metadata
 * surfaced by lower-layer freshness/quality registries.
 */
export interface L11InputAvailabilityMetadata {
  readonly input_surface_ref: string;
  readonly source_layer: L11MissingInputSourceLayer;
  readonly dependency_class: L11FormulaInputDependencyClass;
  readonly required_for_component_refs: readonly string[];
  readonly surface_class?: L11DependencySurfaceClass;
  readonly observed_age_ms?: number;
  readonly freshness_budget_ms?: number;
  readonly degradation_reason_codes?: readonly string[];
  readonly restriction_refs?: readonly string[];
  readonly contradiction_refs?: readonly string[];
  readonly default_policy_ref?: string;
  readonly fallback_policy_ref?: string;
  readonly lineage_refs: readonly string[];
}

export interface L11InsufficientSetCandidate {
  readonly insufficient_set_id: string;
  readonly required_input_surface_refs: readonly string[];
  readonly observed_input_surface_refs: readonly string[];
  readonly required_for_component_refs: readonly string[];
  readonly reason_code: string;
  readonly lineage_refs: readonly string[];
}

export interface RunL11MissingDataProfileEngineArgs {
  readonly score: L11ScoreOutput;
  readonly evaluation: L11FormulaEvaluationResult;
  readonly formula: L11ScoreFormulaDefinition;
  /** Per-input availability metadata keyed by input_surface_ref. */
  readonly availability: readonly L11InputAvailabilityMetadata[];
  readonly insufficient_set_candidates?: readonly L11InsufficientSetCandidate[];
  readonly lineage_refs?: readonly string[];
  readonly evidence_refs?: readonly string[];
}

export interface L11MissingDataProfileEngineError {
  readonly code: string;
  readonly reason: string;
}

export interface L11MissingDataProfileEngineResult {
  readonly ok: boolean;
  readonly profile: L11ScoreMissingDataProfile | null;
  readonly errors: readonly L11MissingDataProfileEngineError[];
}

// ─────────────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────────────

export function runL11MissingDataProfileEngine(
  args: RunL11MissingDataProfileEngineArgs,
): L11MissingDataProfileEngineResult {
  const errors: L11MissingDataProfileEngineError[] = [];

  if (args.score.score_family !== args.evaluation.score_family) {
    errors.push({ code: 'FAMILY_MISMATCH', reason: 'score family != evaluation family' });
  }
  if (args.formula.formula_id !== args.evaluation.formula_id) {
    errors.push({ code: 'FORMULA_MISMATCH', reason: 'formula id != evaluation formula id' });
  }
  if (errors.length > 0) {
    return { ok: false, profile: null, errors };
  }

  // ── Stage 1–2: index required inputs from formula
  const requiredInputs = collectRequiredInputs(args.formula);

  // ── Stage 3: classify per missing-data effect from L11.3 evaluation,
  //   joined with availability metadata to recover dependency class
  const missing_required_inputs: L11MissingInputRef[] = [];
  const missing_optional_inputs: L11MissingInputRef[] = [];
  const stale_inputs: L11MissingInputRef[] = [];
  const degraded_inputs: L11MissingInputRef[] = [];
  const evidence_only_inputs: L11MissingInputRef[] = [];
  const restricted_inputs: L11MissingInputRef[] = [];
  const conflicting_inputs: L11MissingInputRef[] = [];

  const ruleById = new Map(args.formula.missing_data_rules.map(r => [r.missing_data_rule_id, r]));

  // Build availability lookup with stable canonicalization
  const availabilityBySurface = new Map<string, L11InputAvailabilityMetadata>();
  for (const a of args.availability) {
    availabilityBySurface.set(a.input_surface_ref, a);
  }

  // Behaviour candidates per input_ref_id (most-restrictive resolution)
  const candidateBehaviorsByInputRef = new Map<string, L11RuntimeMissingDataBehaviorClass[]>();
  const inputRefById = new Map<string, L11MissingInputRef>();
  const ruleIdsByInputRef = new Map<string, string[]>();

  let inputRefCounter = 0;
  for (const ef of args.evaluation.missing_data_effects) {
    const rule = ruleById.get(ef.missing_data_rule_id);
    const formulaCondition = (ef.input_condition as L11InputConditionClass) ?? rule?.input_condition;
    const formulaBehavior = (ef.behavior as L11MissingDataBehaviorClass) ?? rule?.behavior;
    if (!formulaCondition || !formulaBehavior) {
      errors.push({
        code: 'EFFECT_MISSING_CONDITION_OR_BEHAVIOR',
        reason: `effect ${ef.missing_data_rule_id} lacks condition or behavior`,
      });
      continue;
    }

    // Resolve which input surface this effect targets. Effects reference
    // an `affected_component_id`; we collapse to the input surfaces of
    // that component (or pick the first required surface if global).
    const affectedSurfaces = resolveAffectedSurfaces(rule, ef.affected_component_id, args.formula);
    if (affectedSurfaces.length === 0) {
      errors.push({
        code: 'EFFECT_NO_AFFECTED_SURFACE',
        reason: `effect ${ef.missing_data_rule_id} has no resolvable input surface`,
      });
      continue;
    }

    for (const surface of affectedSurfaces) {
      const meta = availabilityBySurface.get(surface);
      const dependency = meta?.dependency_class ??
        (requiredInputs.has(surface)
          ? L11FormulaInputDependencyClass.REQUIRED
          : L11FormulaInputDependencyClass.OPTIONAL);
      const required = dependency === L11FormulaInputDependencyClass.REQUIRED;
      const condition = mapL11InputConditionToMissingDataCondition(formulaCondition, required);

      const ref: L11MissingInputRef = {
        input_ref_id: `l11m.input.${args.score.score_id}.${++inputRefCounter}`,
        input_surface_ref: surface,
        source_layer: meta?.source_layer ?? 'L7',
        dependency_class: dependency,
        condition_class: condition,
        required_for_component_refs:
          meta?.required_for_component_refs ??
          (ef.affected_component_id ? [ef.affected_component_id] : []),
        freshness_budget_ms: meta?.freshness_budget_ms,
        observed_age_ms: meta?.observed_age_ms,
        degradation_reason_codes: meta?.degradation_reason_codes,
        restriction_refs: meta?.restriction_refs,
        contradiction_refs: meta?.contradiction_refs,
        default_policy_ref: meta?.default_policy_ref,
        fallback_policy_ref: meta?.fallback_policy_ref,
        lineage_refs: meta?.lineage_refs ?? args.lineage_refs ?? [`l11m.lineage.${args.score.score_id}`],
      };
      inputRefById.set(ref.input_ref_id, ref);

      pushIntoConditionBucket(ref, {
        missing_required_inputs, missing_optional_inputs,
        stale_inputs, degraded_inputs, evidence_only_inputs,
        restricted_inputs, conflicting_inputs,
      });

      const runtimeBehavior = mapL11FormulaBehaviorToRuntimeBehavior(formulaBehavior);
      const arr = candidateBehaviorsByInputRef.get(ref.input_ref_id) ?? [];
      arr.push(runtimeBehavior);
      candidateBehaviorsByInputRef.set(ref.input_ref_id, arr);

      const ruleArr = ruleIdsByInputRef.get(ref.input_ref_id) ?? [];
      ruleArr.push(ef.missing_data_rule_id);
      ruleIdsByInputRef.set(ref.input_ref_id, ruleArr);
    }
  }

  // ── Insufficient-input sets (§11.5.3.3)
  const insufficient_input_sets: L11InsufficientInputSetRef[] = [];
  for (const c of args.insufficient_set_candidates ?? []) {
    const observed = new Set(c.observed_input_surface_refs);
    const missing = c.required_input_surface_refs.filter(s => !observed.has(s));
    if (missing.length === 0) continue;
    insufficient_input_sets.push({
      insufficient_set_id: c.insufficient_set_id,
      required_input_surface_refs: c.required_input_surface_refs,
      observed_input_surface_refs: c.observed_input_surface_refs,
      missing_input_surface_refs: missing,
      required_for_component_refs: c.required_for_component_refs,
      reason_code: c.reason_code,
      lineage_refs: c.lineage_refs,
    });
  }

  // ── Stage 4: resolve most-restrictive behaviour per input ref
  const applied_behaviors: L11AppliedMissingDataBehavior[] = [];
  const applied_caps: string[] = [];
  const applied_penalties: string[] = [];
  const confidence_reduction_refs: string[] = [];
  const attribution_warning_refs: string[] = [];
  const omitted_component_refs: string[] = [];
  const evidence_only_component_refs: string[] = [];

  let aggregateScoreEffect = 0;
  let aggregateConfidenceEffect = 0;

  let appliedBehaviorCounter = 0;
  for (const [inputRefId, candidates] of candidateBehaviorsByInputRef.entries()) {
    const ref = inputRefById.get(inputRefId)!;
    const behavior = resolveMostRestrictiveBehavior(candidates);
    const ruleIds = ruleIdsByInputRef.get(inputRefId) ?? [];

    const { score_effect, confidence_effect, disclosure_required, refs } =
      effectsForBehavior(behavior, ref, args.score.score_id, ++appliedBehaviorCounter);

    if (refs.cap_rule_ref) applied_caps.push(refs.cap_rule_ref);
    if (refs.penalty_rule_ref) applied_penalties.push(refs.penalty_rule_ref);
    if (refs.confidence_reduction_ref) confidence_reduction_refs.push(refs.confidence_reduction_ref);
    if (refs.attribution_warning_ref) attribution_warning_refs.push(refs.attribution_warning_ref);
    if (refs.omitted_component_ref) omitted_component_refs.push(refs.omitted_component_ref);
    if (refs.evidence_only_component_ref) evidence_only_component_refs.push(refs.evidence_only_component_ref);

    aggregateScoreEffect += score_effect;
    aggregateConfidenceEffect += confidence_effect;

    applied_behaviors.push({
      applied_behavior_id: refs.applied_behavior_id,
      missing_input_ref_id: inputRefId,
      condition_class: ref.condition_class,
      behavior,
      score_effect,
      confidence_effect,
      cap_rule_ref: refs.cap_rule_ref,
      penalty_rule_ref: refs.penalty_rule_ref,
      attribution_warning_ref: refs.attribution_warning_ref,
      omitted_component_ref: refs.omitted_component_ref,
      evidence_only_component_ref: refs.evidence_only_component_ref,
      disclosure_required,
      reason_codes: ruleIds.map(rid => `l11m.reason.${rid}`),
      lineage_refs: ref.lineage_refs,
      policy_version: L11_MISSING_DATA_POLICY_VERSION,
    });
  }

  // Insufficient-set behaviour: always CAP_SCORE
  for (const set of insufficient_input_sets) {
    appliedBehaviorCounter += 1;
    const behaviorId = `l11m.applied.${args.score.score_id}.${appliedBehaviorCounter}`;
    const capRef = `l11m.cap.${set.insufficient_set_id}`;
    applied_caps.push(capRef);
    aggregateScoreEffect += 15;
    applied_behaviors.push({
      applied_behavior_id: behaviorId,
      missing_input_ref_id: set.insufficient_set_id,
      condition_class: L11MissingDataConditionClass.INSUFFICIENT_INPUT_SET,
      behavior: L11RuntimeMissingDataBehaviorClass.CAP_SCORE,
      score_effect: 15,
      confidence_effect: 5,
      cap_rule_ref: capRef,
      disclosure_required: true,
      reason_codes: [set.reason_code],
      lineage_refs: set.lineage_refs,
      policy_version: L11_MISSING_DATA_POLICY_VERSION,
    });
  }

  // ── Stage 6: visibility class — worst observed across condition buckets
  const visibility_class = deriveVisibilityClass({
    missing_required_inputs,
    stale_inputs,
    degraded_inputs,
    evidence_only_inputs,
    restricted_inputs,
    conflicting_inputs,
    insufficient_input_sets,
    behaviors: applied_behaviors,
  });

  // ── Stage 7: readiness effect — most restrictive across applied behaviours
  const readiness_effect = deriveReadinessEffect(applied_behaviors);

  // ── Stage 8: assemble + replay hash
  const draft: Omit<L11ScoreMissingDataProfile, 'replay_hash'> = {
    missing_profile_id: `l11m.profile.${args.score.score_id}`,
    score_id: args.score.score_id,
    score_family: args.score.score_family,
    formula_id: args.formula.formula_id,
    formula_version: args.formula.formula_version,
    scope_type: args.score.scope_type,
    scope_id: args.score.scope_id,
    as_of: args.score.as_of,
    missing_required_inputs,
    missing_optional_inputs,
    stale_inputs,
    degraded_inputs,
    evidence_only_inputs,
    restricted_inputs,
    conflicting_inputs,
    insufficient_input_sets,
    applied_behaviors,
    applied_penalties,
    applied_caps,
    confidence_reduction_refs,
    attribution_warning_refs,
    omitted_component_refs,
    evidence_only_component_refs,
    score_effect: aggregateScoreEffect,
    confidence_effect: aggregateConfidenceEffect,
    visibility_class,
    readiness_effect,
    lineage_refs: args.lineage_refs ?? [`l11m.lineage.${args.score.score_id}`],
    evidence_refs: args.evidence_refs ?? [args.score.evidence_pack_ref],
    input_snapshot_ref: args.score.input_snapshot_ref,
    policy_version: L11_MISSING_DATA_POLICY_VERSION,
  };

  const replay_hash = canonicalMissingDataProfileReplayHash(
    extractL11MissingDataProfileReplayMaterial(draft),
  );
  return { ok: true, profile: { ...draft, replay_hash }, errors: [] };
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function collectRequiredInputs(formula: L11ScoreFormulaDefinition): Set<string> {
  const set = new Set<string>();
  for (const c of formula.component_definitions) {
    if (!c.required_for_formula) continue;
    for (const s of c.required_input_surfaces) set.add(s.surface_class);
  }
  return set;
}

function resolveAffectedSurfaces(
  rule: { applies_to_input?: { surface_class: L11DependencySurfaceClass } } | undefined,
  affected_component_id: string | undefined,
  formula: L11ScoreFormulaDefinition,
): readonly string[] {
  if (rule?.applies_to_input?.surface_class) {
    return [rule.applies_to_input.surface_class];
  }
  if (affected_component_id) {
    const c = formula.component_definitions.find(c => c.component_id === affected_component_id);
    if (c) {
      const all: string[] = [];
      for (const s of c.required_input_surfaces) all.push(s.surface_class);
      for (const s of c.optional_input_surfaces) all.push(s.surface_class);
      return all;
    }
  }
  // Fallback — first required surface across the formula
  for (const c of formula.component_definitions) {
    if (c.required_for_formula && c.required_input_surfaces.length > 0) {
      return [c.required_input_surfaces[0].surface_class];
    }
  }
  return [];
}

function pushIntoConditionBucket(
  ref: L11MissingInputRef,
  buckets: {
    missing_required_inputs: L11MissingInputRef[];
    missing_optional_inputs: L11MissingInputRef[];
    stale_inputs: L11MissingInputRef[];
    degraded_inputs: L11MissingInputRef[];
    evidence_only_inputs: L11MissingInputRef[];
    restricted_inputs: L11MissingInputRef[];
    conflicting_inputs: L11MissingInputRef[];
  },
): void {
  switch (ref.condition_class) {
    case L11MissingDataConditionClass.ABSENT_REQUIRED_INPUT:
      buckets.missing_required_inputs.push(ref); break;
    case L11MissingDataConditionClass.ABSENT_OPTIONAL_INPUT:
      buckets.missing_optional_inputs.push(ref); break;
    case L11MissingDataConditionClass.STALE_REQUIRED_INPUT:
    case L11MissingDataConditionClass.STALE_OPTIONAL_INPUT:
      buckets.stale_inputs.push(ref); break;
    case L11MissingDataConditionClass.DEGRADED_REQUIRED_INPUT:
    case L11MissingDataConditionClass.DEGRADED_OPTIONAL_INPUT:
      buckets.degraded_inputs.push(ref); break;
    case L11MissingDataConditionClass.EVIDENCE_ONLY_INPUT:
      buckets.evidence_only_inputs.push(ref); break;
    case L11MissingDataConditionClass.RESTRICTED_INPUT:
      buckets.restricted_inputs.push(ref); break;
    case L11MissingDataConditionClass.CONFLICTING_INPUT:
      buckets.conflicting_inputs.push(ref); break;
    default:
      break;
  }
}

interface BehaviorRefs {
  readonly applied_behavior_id: string;
  readonly cap_rule_ref?: string;
  readonly penalty_rule_ref?: string;
  readonly attribution_warning_ref?: string;
  readonly omitted_component_ref?: string;
  readonly evidence_only_component_ref?: string;
  readonly confidence_reduction_ref?: string;
}

function effectsForBehavior(
  behavior: L11RuntimeMissingDataBehaviorClass,
  ref: L11MissingInputRef,
  score_id: string,
  index: number,
): {
  score_effect: number;
  confidence_effect: number;
  disclosure_required: boolean;
  refs: BehaviorRefs;
} {
  const id = `l11m.applied.${score_id}.${index}`;
  const componentRef = ref.required_for_component_refs[0];
  switch (behavior) {
    case L11RuntimeMissingDataBehaviorClass.BLOCK_SCORE:
      return {
        score_effect: 100,
        confidence_effect: 50,
        disclosure_required: true,
        refs: {
          applied_behavior_id: id,
          attribution_warning_ref: `l11m.warn.${ref.input_ref_id}`,
        },
      };
    case L11RuntimeMissingDataBehaviorClass.EVIDENCE_ONLY_CLASSIFICATION:
      return {
        score_effect: 0,
        confidence_effect: 30,
        disclosure_required: true,
        refs: {
          applied_behavior_id: id,
          evidence_only_component_ref: componentRef,
          attribution_warning_ref: `l11m.warn.${ref.input_ref_id}`,
        },
      };
    case L11RuntimeMissingDataBehaviorClass.CAP_SCORE:
      return {
        score_effect: 20,
        confidence_effect: 10,
        disclosure_required: true,
        refs: {
          applied_behavior_id: id,
          cap_rule_ref: `l11m.cap.${ref.input_ref_id}`,
          attribution_warning_ref: `l11m.warn.${ref.input_ref_id}`,
        },
      };
    case L11RuntimeMissingDataBehaviorClass.PENALIZE_SCORE:
      return {
        score_effect: 10,
        confidence_effect: 5,
        disclosure_required: true,
        refs: {
          applied_behavior_id: id,
          penalty_rule_ref: `l11m.penalty.${ref.input_ref_id}`,
          attribution_warning_ref: `l11m.warn.${ref.input_ref_id}`,
        },
      };
    case L11RuntimeMissingDataBehaviorClass.REDUCE_CONFIDENCE:
      return {
        score_effect: 0,
        confidence_effect: 15,
        disclosure_required: true,
        refs: {
          applied_behavior_id: id,
          confidence_reduction_ref: `l11m.conf.${ref.input_ref_id}`,
          attribution_warning_ref: `l11m.warn.${ref.input_ref_id}`,
        },
      };
    case L11RuntimeMissingDataBehaviorClass.OMIT_OPTIONAL_COMPONENT:
      return {
        score_effect: 0,
        confidence_effect: 2,
        disclosure_required: true,
        refs: {
          applied_behavior_id: id,
          omitted_component_ref: componentRef,
          attribution_warning_ref: `l11m.warn.${ref.input_ref_id}`,
        },
      };
    case L11RuntimeMissingDataBehaviorClass.REQUIRE_ATTRIBUTION_WARNING:
      return {
        score_effect: 0,
        confidence_effect: 1,
        disclosure_required: true,
        refs: {
          applied_behavior_id: id,
          attribution_warning_ref: `l11m.warn.${ref.input_ref_id}`,
        },
      };
    case L11RuntimeMissingDataBehaviorClass.NO_EFFECT_WITH_DISCLOSURE:
    default:
      return {
        score_effect: 0,
        confidence_effect: 0,
        disclosure_required: true,
        refs: {
          applied_behavior_id: id,
          attribution_warning_ref: `l11m.warn.${ref.input_ref_id}`,
        },
      };
  }
}

interface VisibilityArgs {
  readonly missing_required_inputs: readonly L11MissingInputRef[];
  readonly stale_inputs: readonly L11MissingInputRef[];
  readonly degraded_inputs: readonly L11MissingInputRef[];
  readonly evidence_only_inputs: readonly L11MissingInputRef[];
  readonly restricted_inputs: readonly L11MissingInputRef[];
  readonly conflicting_inputs: readonly L11MissingInputRef[];
  readonly insufficient_input_sets: readonly L11InsufficientInputSetRef[];
  readonly behaviors: readonly L11AppliedMissingDataBehavior[];
}

function deriveVisibilityClass(args: VisibilityArgs): L11ScoreVisibilityClass {
  const observed: L11ScoreVisibilityClass[] = [];

  if (args.behaviors.some(b => b.behavior === L11RuntimeMissingDataBehaviorClass.BLOCK_SCORE)) {
    observed.push(L11ScoreVisibilityClass.BLOCKED_VISIBILITY);
  }
  if (args.insufficient_input_sets.length > 0) {
    observed.push(L11ScoreVisibilityClass.INSUFFICIENT_VISIBILITY);
  }
  if (args.evidence_only_inputs.length > 0 ||
      args.behaviors.some(b => b.behavior === L11RuntimeMissingDataBehaviorClass.EVIDENCE_ONLY_CLASSIFICATION)) {
    observed.push(L11ScoreVisibilityClass.EVIDENCE_ONLY_VISIBILITY);
  }
  if (args.conflicting_inputs.length > 0) {
    observed.push(L11ScoreVisibilityClass.CONFLICTING_VISIBILITY);
  }
  if (args.restricted_inputs.length > 0) {
    observed.push(L11ScoreVisibilityClass.RESTRICTED_VISIBILITY);
  }
  if (args.degraded_inputs.length > 0) {
    observed.push(L11ScoreVisibilityClass.DEGRADED_VISIBILITY);
  }
  // STALE / missing-required / missing-optional collapse to PARTIAL_VISIBILITY
  if (args.stale_inputs.length > 0 || args.missing_required_inputs.length > 0) {
    observed.push(L11ScoreVisibilityClass.PARTIAL_VISIBILITY);
  }

  // Critical conditions in an input ref must elevate from FULL even if
  // no behaviour fires (defensive)
  if (args.behaviors.some(b => isL11CriticalMissingCondition(b.condition_class))) {
    if (observed.length === 0) observed.push(L11ScoreVisibilityClass.PARTIAL_VISIBILITY);
  }

  return worstL11VisibilityClass(observed);
}

function deriveReadinessEffect(
  behaviors: readonly L11AppliedMissingDataBehavior[],
): L11MissingDataReadinessEffect {
  const effects: L11MissingDataReadinessEffect[] = [];
  for (const b of behaviors) {
    switch (b.behavior) {
      case L11RuntimeMissingDataBehaviorClass.BLOCK_SCORE:
        effects.push(L11MissingDataReadinessEffect.SCORE_BLOCKED); break;
      case L11RuntimeMissingDataBehaviorClass.EVIDENCE_ONLY_CLASSIFICATION:
        effects.push(L11MissingDataReadinessEffect.EVIDENCE_ONLY); break;
      case L11RuntimeMissingDataBehaviorClass.CAP_SCORE:
        effects.push(L11MissingDataReadinessEffect.SCORE_CAPPED); break;
      case L11RuntimeMissingDataBehaviorClass.PENALIZE_SCORE:
        effects.push(L11MissingDataReadinessEffect.SCORE_PENALIZED); break;
      case L11RuntimeMissingDataBehaviorClass.REDUCE_CONFIDENCE:
        effects.push(L11MissingDataReadinessEffect.CONFIDENCE_REDUCED); break;
      case L11RuntimeMissingDataBehaviorClass.OMIT_OPTIONAL_COMPONENT:
      case L11RuntimeMissingDataBehaviorClass.REQUIRE_ATTRIBUTION_WARNING:
      case L11RuntimeMissingDataBehaviorClass.NO_EFFECT_WITH_DISCLOSURE:
      default:
        effects.push(L11MissingDataReadinessEffect.DISCLOSURE_REQUIRED); break;
    }
  }
  return mostRestrictiveL11ReadinessEffect(effects);
}
