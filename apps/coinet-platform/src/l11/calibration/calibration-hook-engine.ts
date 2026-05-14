/**
 * L11.6 — Calibration Hook Engine (§11.6.14)
 *
 * Pure deterministic engine that turns a `L11ScoreOutput` plus
 * runtime context into one or more `L11ScoreCalibrationHook`
 * objects. Does not change scores, weights, or thresholds.
 */

import {
  L11ScoreOutput,
} from '../contracts/score-output';
import {
  L11ScoreCalibrationHook,
  L11_CALIBRATION_HOOK_POLICY_VERSION,
  extractL11CalibrationHookReplayMaterial,
  canonicalCalibrationHookReplayHash,
  isL11CalibrationHookStructurallyValid,
} from '../contracts/calibration-hook';
import {
  L11ScoreCalibrationTarget,
} from '../contracts/calibration-target';
import {
  L11CalibrationHorizon,
  computeL11EvaluationWindow,
  isL11HorizonAllowedForFamily,
} from '../contracts/calibration-horizon';
import {
  L11CalibrationReadinessClass,
} from '../contracts/calibration-readiness';
import {
  L11CalibrationCohortDefinition,
  deriveL11CohortKey,
  doesL11CohortAcceptContext,
} from '../contracts/calibration-cohort';
import {
  isL11OutcomeMetricLegalForFamily,
  isL11OutcomeMetricLegalForHorizon,
} from '../contracts/outcome-metric';
import {
  isL11ExpectedDirectionCompatible,
} from '../contracts/expected-direction';
import {
  L11ScoreVisibilityClass,
} from '../contracts/score-visibility-class';
import {
  isL11ProductionScoreFamily,
} from '../contracts/score-family';
import {
  getL11CalibrationTargetsForFamily,
} from '../registry/calibration-target.registry';

export interface L11CalibrationEngineContext {
  /** Formula identity for the emitting formula (L11.3). The hook
   * carries these explicitly so calibration can stratify by
   * formula version even though `L11ScoreOutput` itself does not
   * expose `formula_id`/`formula_version`. */
  readonly formula_id: string;
  readonly formula_version: string;

  /** Cohort context (regime, sequence, hypothesis, visibility, etc.) */
  readonly cohort_context: {
    readonly regime?: string;
    readonly sequence_state?: string;
    readonly hypothesis_family?: string;
    readonly visibility_class?: L11ScoreVisibilityClass;
    readonly liquidity_bucket?: string;
    readonly market_cap_bucket?: string;
    readonly asset_class?: string;
  };

  /** Optional per-context refs — passed through into the hook. */
  readonly context_refs?: {
    readonly regime_context_ref?: string;
    readonly sequence_context_ref?: string;
    readonly hypothesis_context_ref?: string;
    readonly visibility_context_ref?: string;
    readonly attribution_ref?: string;
    readonly missing_data_profile_ref?: string;
  };

  /** Whether the score is currently within the outcome window
   * already (rare; defaults to false → PENDING_OUTCOME_WINDOW
   * unless score is fully ready). */
  readonly outcome_window_already_observed?: boolean;
}

export interface L11CalibrationEngineIssue {
  readonly target_id: string | null;
  readonly reason: string;
}

export interface L11CalibrationEngineResult {
  readonly hooks: readonly L11ScoreCalibrationHook[];
  readonly issues: readonly L11CalibrationEngineIssue[];
}

/**
 * §11.6.14.4 — 12-stage hook generation pipeline.
 */
export function runL11CalibrationHookEngine(
  score: L11ScoreOutput,
  ctx: L11CalibrationEngineContext,
): L11CalibrationEngineResult {
  const issues: L11CalibrationEngineIssue[] = [];
  const hooks: L11ScoreCalibrationHook[] = [];

  // Stage 1 — production-family check
  if (!isL11ProductionScoreFamily(score.score_family)) {
    issues.push({ target_id: null,
      reason: `family ${score.score_family} is not production-emissible` });
    return { hooks, issues };
  }

  // Stage 2 — load calibration targets
  const targets = getL11CalibrationTargetsForFamily(score.score_family);
  if (targets.length === 0) {
    issues.push({ target_id: null,
      reason: `no calibration target registered for family ${score.score_family}` });
    return { hooks, issues };
  }

  for (const target of targets) {
    const hook = buildSingleHook(score, ctx, target, issues);
    if (hook) hooks.push(hook);
  }

  return { hooks, issues };
}

function buildSingleHook(
  score: L11ScoreOutput,
  ctx: L11CalibrationEngineContext,
  target: L11ScoreCalibrationTarget,
  issues: L11CalibrationEngineIssue[],
): L11ScoreCalibrationHook | null {
  const targetId = target.calibration_target_id;

  // Stage 3 — version compatibility
  let readiness: L11CalibrationReadinessClass = L11CalibrationReadinessClass.CALIBRATION_READY;
  if (!target.allowed_score_versions.includes(score.score_version) ||
      !target.allowed_formula_versions.includes(ctx.formula_version)) {
    readiness = L11CalibrationReadinessClass.BLOCKED_VERSION_MISMATCH;
  }

  // Stage 4 — outcome metric legality
  if (!isL11OutcomeMetricLegalForFamily(target.outcome_metric, score.score_family) ||
      !isL11OutcomeMetricLegalForHorizon(target.outcome_metric, target.horizon)) {
    readiness = L11CalibrationReadinessClass.BLOCKED_OUTCOME_METRIC_UNSUPPORTED;
  }

  // Stage 5 — horizon legality
  if (!isL11HorizonAllowedForFamily(score.score_family, target.horizon)) {
    readiness = L11CalibrationReadinessClass.BLOCKED_OUTCOME_METRIC_UNSUPPORTED;
  }

  // Stage 5b — direction compatibility
  const dirCheck = isL11ExpectedDirectionCompatible(
    score.score_family, target.outcome_metric, target.expected_direction);
  if (!dirCheck.ok) {
    issues.push({ target_id: targetId,
      reason: `expected_direction incompatibility: ${dirCheck.reason}` });
    readiness = L11CalibrationReadinessClass.BLOCKED_TARGET_INCOMPLETE;
  }

  // Stage 6 — evaluation window
  const horizon: L11CalibrationHorizon = target.horizon;
  let windowStart: string;
  let windowEnd: string;
  let evaluationDueAt: string;
  try {
    const win = computeL11EvaluationWindow(score.as_of, horizon, {
      window_offset_ms: target.evaluation_window.window_offset_ms,
      window_length_ms: target.evaluation_window.window_length_ms,
    });
    windowStart = win.window_start;
    windowEnd = win.window_end;
    evaluationDueAt = win.window_end;
  } catch (e) {
    issues.push({ target_id: targetId,
      reason: `evaluation window error: ${(e as Error).message}` });
    return null;
  }

  // Stage 7 — cohort key
  const cohortCtx = {
    score_family: score.score_family,
    score_band: score.score_band,
    formula_version: ctx.formula_version,
    regime: ctx.cohort_context.regime,
    sequence_state: ctx.cohort_context.sequence_state,
    hypothesis_family: ctx.cohort_context.hypothesis_family,
    visibility_class: ctx.cohort_context.visibility_class,
    liquidity_bucket: ctx.cohort_context.liquidity_bucket,
    market_cap_bucket: ctx.cohort_context.market_cap_bucket,
    scope_type: score.scope_type,
    asset_class: ctx.cohort_context.asset_class,
  };
  const cohortKey = deriveL11CohortKey(cohortCtx);
  const cohortAccept = doesL11CohortAcceptContext(target.cohort_definition, cohortCtx);
  if (!cohortAccept.ok &&
      readiness === L11CalibrationReadinessClass.CALIBRATION_READY) {
    readiness = L11CalibrationReadinessClass.BLOCKED_COHORT_INCOMPLETE;
  }

  // Stage 8 — exclusions
  const exclusionRefs: string[] = target.exclusion_rules.map(r => r.exclusion_rule_id);

  // Stage 9 — context attachment + Stage 10 — readiness refinement
  const baseReady = readiness === L11CalibrationReadinessClass.CALIBRATION_READY;
  if (baseReady) {
    const stratReady = computeStratificationReadiness(target, ctx);
    readiness = stratReady;
    if (readiness === L11CalibrationReadinessClass.CALIBRATION_READY &&
        !ctx.outcome_window_already_observed) {
      readiness = L11CalibrationReadinessClass.PENDING_OUTCOME_WINDOW;
    }
  }

  // Stage 11 — replay hash
  const hookId = `hk.${score.score_id}.${targetId}`;
  const baseHook: Omit<L11ScoreCalibrationHook, 'replay_hash'> = {
    calibration_hook_id: hookId,
    score_id: score.score_id,
    score_family: score.score_family,
    score_version: score.score_version,
    formula_id: ctx.formula_id,
    formula_version: ctx.formula_version,
    scope_type: score.scope_type,
    scope_id: score.scope_id,
    as_of: score.as_of,
    final_score: score.final_score,
    score_band: score.score_band,
    calibration_target_ref: targetId,
    horizon: target.horizon,
    outcome_metric: target.outcome_metric,
    expected_direction: target.expected_direction,
    cohort_key: cohortKey,
    cohort_definition_ref: target.cohort_definition.cohort_id,
    exclusion_rule_refs: exclusionRefs,
    regime_context_ref: ctx.context_refs?.regime_context_ref,
    sequence_context_ref: ctx.context_refs?.sequence_context_ref,
    hypothesis_context_ref: ctx.context_refs?.hypothesis_context_ref,
    visibility_context_ref: ctx.context_refs?.visibility_context_ref,
    attribution_ref: ctx.context_refs?.attribution_ref,
    missing_data_profile_ref: ctx.context_refs?.missing_data_profile_ref ??
      score.missing_data_profile_ref,
    evaluation_due_at: evaluationDueAt,
    evaluation_window_start: windowStart,
    evaluation_window_end: windowEnd,
    calibration_readiness_class: readiness,
    lineage_refs: [`l11.6.hook.${hookId}`, `l11.6.target.${targetId}`,
      ...score.evidence_pack_ref ? [`l11.evidence.${score.evidence_pack_ref}`] : []],
    input_snapshot_ref: score.input_snapshot_ref,
    policy_version: L11_CALIBRATION_HOOK_POLICY_VERSION,
  };
  const replay_hash = canonicalCalibrationHookReplayHash(
    extractL11CalibrationHookReplayMaterial(baseHook));
  const hook: L11ScoreCalibrationHook = { ...baseHook, replay_hash };

  // Stage 12 — final structural sanity
  const sv = isL11CalibrationHookStructurallyValid(hook);
  if (!sv.ok) {
    issues.push({ target_id: targetId, reason: `engine produced invalid hook: ${sv.reason}` });
    return null;
  }
  return hook;
}

function computeStratificationReadiness(
  target: L11ScoreCalibrationTarget,
  ctx: L11CalibrationEngineContext,
): L11CalibrationReadinessClass {
  const c = ctx.cohort_context;
  const missing: string[] = [];
  if (target.regime_stratification_required && !c.regime) missing.push('regime');
  if (target.sequence_stratification_required && !c.sequence_state) missing.push('sequence');
  if (target.hypothesis_stratification_required && !c.hypothesis_family) missing.push('hypothesis');
  if (target.visibility_stratification_required && !c.visibility_class) missing.push('visibility');
  return missing.length > 0
    ? L11CalibrationReadinessClass.READY_WITH_STRATIFICATION
    : L11CalibrationReadinessClass.CALIBRATION_READY;
}

export interface L11CalibrationEngineBatchResult {
  readonly results: readonly L11CalibrationEngineResult[];
  readonly hooks: readonly L11ScoreCalibrationHook[];
  readonly issues: readonly L11CalibrationEngineIssue[];
}

export function runL11CalibrationHookEngineBatch(
  scores: readonly L11ScoreOutput[],
  ctx: L11CalibrationEngineContext,
): L11CalibrationEngineBatchResult {
  const results: L11CalibrationEngineResult[] = [];
  const allHooks: L11ScoreCalibrationHook[] = [];
  const allIssues: L11CalibrationEngineIssue[] = [];
  for (const s of scores) {
    const r = runL11CalibrationHookEngine(s, ctx);
    results.push(r);
    allHooks.push(...r.hooks);
    allIssues.push(...r.issues);
  }
  return { results, hooks: allHooks, issues: allIssues };
}

// Keep type-only imports retained as types-only (no value usage).
export type { L11CalibrationCohortDefinition };
