/**
 * L12.5 — Scenario template evaluation engine (§12.5.17).
 *
 * Evaluates which production templates match a resolved-input + candidate
 * state. Enforces:
 *   - templates declare triggers + invalidations
 *   - L11 score context bundle required for any production match
 *   - clean match impossible under active invalidation or material drift
 *   - base-case eligibility requires alternative path
 *   - non-prediction language only
 */

import { L12PathConfidenceCapReason } from '../contracts/path-confidence-cap-chain';
import {
  buildL12ScenarioReplayHash,
} from '../contracts/scenario-ids';
import {
  isL12ProductionEnabledTemplate,
  L12ScenarioTemplateDefinition,
  L12ScenarioTemplateId,
} from '../contracts/scenario-template';
import {
  L12ScenarioTemplateEvaluation,
  L12ScenarioTemplateMatchResult,
  L12TemplateMatchBand,
  L12TemplatePatternEvaluation,
} from '../contracts/scenario-template-evaluation';
import {
  L12TemplatePatternMateriality,
  L12TemplatePatternVerdict,
} from '../contracts/scenario-template-patterns';
import {
  L12ScenarioTemplateReadinessClass,
} from '../contracts/scenario-template-readiness';
import { L12ScenarioFamily } from '../contracts/scenario-family';
import { L12ScenarioType } from '../contracts/scenario-type';

import {
  listL12ProductionEnabledTemplates,
} from '../registry/scenario-template.registry';

const FORBIDDEN_LANGUAGE_RE =
  /(guaranteed|certain|sure thing|will definitely|cannot fail|recommend|trade now|buy now|sell now|target price|exit price|stop loss|winner|final judgment)/i;

/**
 * Inputs the evaluator consults. Pure data — no I/O.
 */
export interface L12TemplateEvaluationInputs {
  readonly scenario_subject_id: string;
  readonly scenario_set_id: string;

  /** L8 regime states present in the resolved input. */
  readonly regime_states: readonly string[];
  /** L9 sequence states present in the resolved input. */
  readonly sequence_states: readonly string[];
  /** L9 decay dominant. */
  readonly sequence_decay_dominant: boolean;
  /** L10 primary + secondary hypotheses. */
  readonly primary_hypothesis?: string;
  readonly secondary_hypothesis?: string;
  readonly hypothesis_spread_narrow: boolean;

  /** Score band by family (e.g., `OPPORTUNITY_SCORE` → `CONSTRUCTIVE`). */
  readonly score_bands_by_family: Readonly<Record<string, string>>;
  /** Whether the L11 score context bundle is complete. */
  readonly l11_score_context_complete: boolean;

  /** L7 contradiction posture. */
  readonly contradiction_manageable: boolean;
  readonly contradiction_severe: boolean;

  /** Readiness posture. */
  readonly active_invalidation_present: boolean;
  readonly material_drift: boolean;
  readonly missing_visibility_material: boolean;

  /** Set-level: are alternative paths available? */
  readonly has_alternative_path: boolean;

  /** For deterministic replay-hash (sorted set-like fields handled inside). */
  readonly policy_version: string;
}

export interface L12TemplateEvaluationResult {
  readonly ok: boolean;
  readonly evaluation?: L12ScenarioTemplateEvaluation;
  readonly issues: readonly string[];
}

function evaluatePattern(
  pattern: { pattern_id: string; pattern_name: string },
  verdict: L12TemplatePatternVerdict,
  notes: readonly string[],
): L12TemplatePatternEvaluation {
  return {
    pattern_id: pattern.pattern_id,
    pattern_name: pattern.pattern_name,
    verdict,
    notes,
  };
}

function evaluateTemplate(
  def: L12ScenarioTemplateDefinition,
  inp: L12TemplateEvaluationInputs,
): L12ScenarioTemplateMatchResult {
  const issues: string[] = [];
  const evals: L12TemplatePatternEvaluation[] = [];
  const satisfied: string[] = [];
  const partial: string[] = [];
  const narrowed: string[] = [];
  const missing: string[] = [];
  const blocked: string[] = [];

  const checkSet = (
    pattern: {
      pattern_id: string;
      pattern_name: string;
      pattern_materiality: L12TemplatePatternMateriality;
      narrows_readiness_when_unsatisfied: boolean;
      blocks_template_when_unsatisfied: boolean;
    },
    verdict: L12TemplatePatternVerdict,
    notes: string[],
  ): void => {
    evals.push(evaluatePattern(pattern, verdict, notes));
    switch (verdict) {
      case L12TemplatePatternVerdict.SATISFIED:
        satisfied.push(pattern.pattern_id);
        break;
      case L12TemplatePatternVerdict.PARTIAL:
        partial.push(pattern.pattern_id);
        if (pattern.narrows_readiness_when_unsatisfied) narrowed.push(pattern.pattern_id);
        break;
      case L12TemplatePatternVerdict.NARROWED:
        narrowed.push(pattern.pattern_id);
        break;
      case L12TemplatePatternVerdict.MISSING:
        missing.push(pattern.pattern_id);
        if (pattern.blocks_template_when_unsatisfied) blocked.push(pattern.pattern_id);
        break;
      case L12TemplatePatternVerdict.BLOCKED:
        blocked.push(pattern.pattern_id);
        break;
    }
  };

  // 1. Regime patterns
  for (const p of def.required_regime_patterns) {
    const has = p.required_regime_states.length === 0
      ? true
      : p.required_regime_states.some(r => inp.regime_states.includes(r));
    const forbidden = p.forbidden_regime_states.some(r => inp.regime_states.includes(r));
    const narrowing = p.narrowing_regime_states.some(r => inp.regime_states.includes(r));
    if (forbidden) checkSet(p, L12TemplatePatternVerdict.BLOCKED, ['regime forbidden state present']);
    else if (!has) checkSet(p, L12TemplatePatternVerdict.MISSING, ['no required regime state present']);
    else if (narrowing) checkSet(p, L12TemplatePatternVerdict.NARROWED, ['narrowing regime state present']);
    else checkSet(p, L12TemplatePatternVerdict.SATISFIED, []);
  }

  // 2. Sequence patterns
  for (const p of def.required_sequence_patterns) {
    const has = p.required_sequence_states.length === 0
      ? true
      : p.required_sequence_states.some(s => inp.sequence_states.includes(s));
    const forbidden = p.forbidden_sequence_states.some(s => inp.sequence_states.includes(s));
    const narrowing = p.narrowing_sequence_states.some(s => inp.sequence_states.includes(s));
    if (forbidden) checkSet(p, L12TemplatePatternVerdict.BLOCKED, ['sequence forbidden state']);
    else if (!has) checkSet(p, L12TemplatePatternVerdict.MISSING, ['no required sequence state']);
    else if (p.decay_must_not_be_dominant && inp.sequence_decay_dominant) {
      checkSet(p, L12TemplatePatternVerdict.NARROWED, ['decay dominant under template that forbids it']);
    } else if (narrowing) checkSet(p, L12TemplatePatternVerdict.NARROWED, ['narrowing sequence state']);
    else checkSet(p, L12TemplatePatternVerdict.SATISFIED, []);
  }

  // 3. Hypothesis patterns
  for (const p of def.required_hypothesis_patterns) {
    const reqOk = p.required_primary_hypotheses.length === 0
      ? true
      : !!inp.primary_hypothesis && p.required_primary_hypotheses.includes(inp.primary_hypothesis);
    const forbiddenHit = !!inp.primary_hypothesis &&
      p.forbidden_primary_hypotheses.includes(inp.primary_hypothesis);
    if (forbiddenHit) checkSet(p, L12TemplatePatternVerdict.BLOCKED, ['primary hypothesis forbidden by template']);
    else if (!reqOk) checkSet(p, L12TemplatePatternVerdict.MISSING, ['primary hypothesis not in required set']);
    else if (p.require_non_narrow_spread && inp.hypothesis_spread_narrow) {
      checkSet(p, L12TemplatePatternVerdict.NARROWED, ['hypothesis spread narrow']);
    } else checkSet(p, L12TemplatePatternVerdict.SATISFIED, []);
  }

  // 4. Score patterns
  for (const p of def.required_score_patterns) {
    if (p.requires_full_score_context_bundle && !inp.l11_score_context_complete) {
      checkSet(p, L12TemplatePatternVerdict.BLOCKED, ['L11 score context bundle incomplete']);
      continue;
    }
    const band = inp.score_bands_by_family[p.score_family_ref];
    if (band === undefined) {
      checkSet(p, L12TemplatePatternVerdict.MISSING, ['score band missing']);
      continue;
    }
    if (p.forbidden_band_refs.includes(band)) {
      checkSet(p, L12TemplatePatternVerdict.BLOCKED, [`band ${band} forbidden`]);
      continue;
    }
    if (p.required_band_refs.length > 0 && !p.required_band_refs.includes(band)) {
      checkSet(p, L12TemplatePatternVerdict.NARROWED, [`band ${band} not in required set`]);
      continue;
    }
    checkSet(p, L12TemplatePatternVerdict.SATISFIED, []);
  }

  // 5. Validation patterns (L7)
  for (const p of def.required_validation_patterns) {
    if (p.contradiction_must_not_be_severe && inp.contradiction_severe) {
      checkSet(p, L12TemplatePatternVerdict.BLOCKED, ['L7 contradiction severe']);
      continue;
    }
    if (p.contradiction_must_be_manageable && !inp.contradiction_manageable) {
      checkSet(p, L12TemplatePatternVerdict.NARROWED, ['L7 contradiction not manageable']);
      continue;
    }
    checkSet(p, L12TemplatePatternVerdict.SATISFIED, []);
  }

  // 6. Condition patterns — structural presence is asserted by definition;
  //    the runtime resolver/validator does state-specific checks.
  for (const p of def.required_condition_patterns) {
    checkSet(p, L12TemplatePatternVerdict.SATISFIED, []);
  }

  // 7. Trigger / invalidation pattern presence
  if (def.trigger_patterns.length === 0) {
    issues.push('template has no trigger patterns');
  }
  if (def.invalidation_patterns.length === 0) {
    issues.push('template has no invalidation patterns');
  }

  // Forbidden-language sniff
  const text =
    `${def.template_name} :: ${def.template_doctrine_summary}`;
  if (FORBIDDEN_LANGUAGE_RE.test(text)) {
    issues.push('template doctrine contains forbidden prediction/recommendation language');
  }

  // Determine cap reasons
  const cap_reasons: L12PathConfidenceCapReason[] = [];
  if (inp.active_invalidation_present) cap_reasons.push(L12PathConfidenceCapReason.ACTIVE_INVALIDATION);
  if (inp.material_drift) cap_reasons.push(L12PathConfidenceCapReason.MATERIAL_DRIFT);
  if (inp.missing_visibility_material) cap_reasons.push(L12PathConfidenceCapReason.MISSING_VISIBILITY);
  if (!inp.contradiction_manageable) cap_reasons.push(L12PathConfidenceCapReason.UNRESOLVED_CONTRADICTION);
  if (!inp.l11_score_context_complete) cap_reasons.push(L12PathConfidenceCapReason.INCOMPLETE_L11_SCORE_CONTEXT);
  if (inp.hypothesis_spread_narrow) cap_reasons.push(L12PathConfidenceCapReason.NARROW_HYPOTHESIS_SPREAD);

  // Aggregate match band
  const total = evals.length;
  const blocked_count = blocked.length;
  const missing_count = missing.length;
  const narrowed_count = narrowed.length;
  const partial_count = partial.length;
  const satisfied_count = satisfied.length;

  let match_band: L12TemplateMatchBand;
  let readiness: L12ScenarioTemplateReadinessClass;
  if (!inp.l11_score_context_complete) {
    match_band = L12TemplateMatchBand.BLOCKED_MATCH;
    readiness = L12ScenarioTemplateReadinessClass.BLOCKED_INCOMPLETE_SCORE_CONTEXT;
  } else if (blocked_count > 0) {
    match_band = L12TemplateMatchBand.BLOCKED_MATCH;
    readiness = L12ScenarioTemplateReadinessClass.BLOCKED_INSUFFICIENT_EVIDENCE;
  } else if (inp.active_invalidation_present) {
    match_band = L12TemplateMatchBand.NARROWED_MATCH;
    readiness = L12ScenarioTemplateReadinessClass.NARROWED_BY_ACTIVE_INVALIDATION;
  } else if (inp.material_drift) {
    match_band = L12TemplateMatchBand.NARROWED_MATCH;
    readiness = L12ScenarioTemplateReadinessClass.NARROWED_BY_DRIFT;
  } else if (inp.missing_visibility_material) {
    match_band = L12TemplateMatchBand.NARROWED_MATCH;
    readiness = L12ScenarioTemplateReadinessClass.NARROWED_BY_MISSING_VISIBILITY;
  } else if (!inp.contradiction_manageable) {
    match_band = L12TemplateMatchBand.NARROWED_MATCH;
    readiness = L12ScenarioTemplateReadinessClass.NARROWED_BY_CONTRADICTION;
  } else if (missing_count > 0) {
    match_band = L12TemplateMatchBand.NO_MATCH;
    readiness = L12ScenarioTemplateReadinessClass.BLOCKED_INSUFFICIENT_EVIDENCE;
  } else if (narrowed_count + partial_count > 0) {
    match_band = L12TemplateMatchBand.PARTIAL_MATCH;
    readiness = L12ScenarioTemplateReadinessClass.READY_WITH_DISCLOSURE;
  } else {
    match_band = L12TemplateMatchBand.STRONG_MATCH;
    readiness = L12ScenarioTemplateReadinessClass.READY_CLEAN;
  }

  // Match score: pure proportional satisfaction.
  const match_score = total === 0 ? 0 : Math.max(0, Math.min(1,
    (satisfied_count + 0.5 * partial_count + 0.25 * narrowed_count) / total));

  // Eligibility: base case requires alternative path.
  const family: L12ScenarioFamily = def.scenario_family;
  const type: L12ScenarioType = def.legal_scenario_types[0]!;
  const eligible_for_base_case =
    match_band === L12TemplateMatchBand.STRONG_MATCH &&
    inp.has_alternative_path &&
    def.legal_scenario_types.includes(L12ScenarioType.BASE_CASE);
  const eligible_for_primary =
    match_band === L12TemplateMatchBand.STRONG_MATCH ||
    match_band === L12TemplateMatchBand.PARTIAL_MATCH;
  const eligible_for_secondary = match_band !== L12TemplateMatchBand.BLOCKED_MATCH;

  const trigger_pattern_refs = def.trigger_patterns.map(p => p.pattern_id);
  const invalidation_pattern_refs = def.invalidation_patterns.map(p => p.pattern_id);

  const lineage_refs = [
    `template:${def.template_id}`,
    `subject:${inp.scenario_subject_id}`,
    `set:${inp.scenario_set_id}`,
  ].sort();

  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.5.template_match',
    policy_version: inp.policy_version,
    material: {
      template_id: def.template_id,
      template_version: def.template_version,
      family,
      type,
      satisfied: [...satisfied].sort(),
      partial: [...partial].sort(),
      narrowed: [...narrowed].sort(),
      missing: [...missing].sort(),
      blocked: [...blocked].sort(),
      cap_reasons: [...cap_reasons].sort(),
      match_band,
      readiness,
      match_score,
    },
  });

  return {
    template_id: def.template_id,
    scenario_family: family,
    scenario_type: type,
    match_score,
    match_band,
    satisfied_pattern_refs: satisfied,
    partial_pattern_refs: partial,
    narrowed_pattern_refs: narrowed,
    missing_pattern_refs: missing,
    blocked_pattern_refs: blocked,
    pattern_evaluations: evals,
    trigger_pattern_refs,
    invalidation_pattern_refs,
    confidence_cap_reasons: cap_reasons,
    eligible_for_base_case,
    eligible_for_primary,
    eligible_for_secondary,
    readiness_class: readiness,
    lineage_refs,
    replay_hash,
    policy_version: inp.policy_version,
  };
}

export function evaluateL12ScenarioTemplates(
  inp: L12TemplateEvaluationInputs,
): L12TemplateEvaluationResult {
  const issues: string[] = [];
  const templates = listL12ProductionEnabledTemplates().filter(
    isL12ProductionEnabledTemplate,
  );
  if (templates.length === 0) {
    return { ok: false, issues: ['no production-enabled templates registered'] };
  }

  const results: L12ScenarioTemplateMatchResult[] = templates.map(t =>
    evaluateTemplate(t, inp),
  );

  const matched: L12ScenarioTemplateId[] = [];
  const narrowed_t: L12ScenarioTemplateId[] = [];
  const blocked_t: L12ScenarioTemplateId[] = [];
  for (const r of results) {
    if (r.match_band === L12TemplateMatchBand.STRONG_MATCH || r.match_band === L12TemplateMatchBand.PARTIAL_MATCH) {
      matched.push(r.template_id);
    } else if (r.match_band === L12TemplateMatchBand.NARROWED_MATCH) {
      narrowed_t.push(r.template_id);
    } else if (r.match_band === L12TemplateMatchBand.BLOCKED_MATCH) {
      blocked_t.push(r.template_id);
    }
  }

  let readiness: L12ScenarioTemplateReadinessClass;
  if (!inp.l11_score_context_complete) {
    readiness = L12ScenarioTemplateReadinessClass.BLOCKED_INCOMPLETE_SCORE_CONTEXT;
  } else if (matched.length === 0 && narrowed_t.length === 0) {
    readiness = L12ScenarioTemplateReadinessClass.BLOCKED_INSUFFICIENT_EVIDENCE;
  } else if (matched.length === 0 && narrowed_t.length > 0) {
    readiness = results
      .filter(r => narrowed_t.includes(r.template_id))[0]!.readiness_class;
  } else if (matched.length > 1 && !inp.has_alternative_path) {
    readiness = L12ScenarioTemplateReadinessClass.UNRESOLVED_MULTI_PATH;
  } else if (inp.active_invalidation_present) {
    readiness = L12ScenarioTemplateReadinessClass.NARROWED_BY_ACTIVE_INVALIDATION;
  } else if (inp.material_drift) {
    readiness = L12ScenarioTemplateReadinessClass.NARROWED_BY_DRIFT;
  } else if (inp.missing_visibility_material) {
    readiness = L12ScenarioTemplateReadinessClass.NARROWED_BY_MISSING_VISIBILITY;
  } else if (!inp.contradiction_manageable) {
    readiness = L12ScenarioTemplateReadinessClass.NARROWED_BY_CONTRADICTION;
  } else {
    readiness = L12ScenarioTemplateReadinessClass.READY_CLEAN;
  }

  const lineage_refs = [
    `subject:${inp.scenario_subject_id}`,
    `set:${inp.scenario_set_id}`,
  ].sort();

  const eval_id = `l12.template_evaluation.${inp.scenario_set_id}`;

  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.5.template_evaluation',
    policy_version: inp.policy_version,
    material: {
      matched: [...matched].sort(),
      narrowed: [...narrowed_t].sort(),
      blocked: [...blocked_t].sort(),
      readiness,
      result_hashes: results.map(r => r.replay_hash).sort(),
    },
  });

  const evaluation: L12ScenarioTemplateEvaluation = {
    template_evaluation_id: eval_id,
    scenario_subject_id: inp.scenario_subject_id,
    scenario_set_id: inp.scenario_set_id,
    matched_template_refs: matched,
    narrowed_template_refs: narrowed_t,
    blocked_template_refs: blocked_t,
    template_match_results: results,
    readiness_class: readiness,
    lineage_refs,
    replay_hash,
    policy_version: inp.policy_version,
  };

  return { ok: issues.length === 0, evaluation, issues };
}
