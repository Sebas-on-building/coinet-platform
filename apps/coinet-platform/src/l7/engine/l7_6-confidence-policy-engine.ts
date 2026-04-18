/**
 * L7.6 — Confidence Policy Engine
 *
 * §7.6.4 — Production confidence engine that takes governed inputs
 * (factor values, contradiction posture, evaluation state, materiality)
 * and a registered policy version, then produces a complete
 * `L7ValidationConfidenceDecision`.
 *
 * Two-stage scoring (§7.6.4.1):
 *
 *   1. raw  = Σ w_i · v_i (positive)  −  w_G · max(applied penalties)
 *   2. capped = min(raw, ⌊cap-precedence ceiling⌋)
 *
 * Both stages are recorded in the assessment so reviewers can audit
 * exactly why reliance was assigned.
 */

import {
  L7ConfidenceFactorGroup,
  L7ConfidenceFactorValues,
  L7_CONFIDENCE_FACTOR_DESCRIPTORS,
} from '../contracts/confidence-factor';
import {
  L7ConfidenceCapClass,
  L7ConfidenceCapEvaluation,
  L7ConfidenceCapTrigger,
  resolveCapCeiling,
} from '../contracts/confidence-cap';
import {
  L7ContradictionPenaltyClass,
  L7ContradictionPenaltyEvaluation,
  L7_CONTRADICTION_PENALTY_MAGNITUDE,
  penaltyClassForSeverity,
  resolvePenaltyMagnitude,
} from '../contracts/contradiction-penalty';
import {
  L7ContradictionSeverity,
  compareSeverity,
} from '../contracts/contradiction-bundle';
import {
  L7ValidationConfidenceDecision,
  L7ConfidencePolicyResolution,
  L7ConfidenceCapChain,
  L7ContradictionPenaltyChain,
  L7ConfidenceFactorBreakdown,
  clamp01,
  clamp100,
} from '../contracts/validation-confidence.policy';
import {
  L7ReliabilityBand,
  reliabilityBandForScore100,
} from '../contracts/confidence-band';
import {
  L7ConfidenceCapRegistry,
  getDefaultConfidenceCapRegistry,
} from '../registry/confidence-cap.registry';
import {
  L7ConfidencePolicyRegistry,
  getDefaultConfidencePolicyRegistry,
} from '../registry/confidence-policy.registry';
import {
  L7ConfidenceViolation,
  L7ConfidenceViolationCode,
} from '../validation/l7-confidence-violation-codes';

/** Engine inputs after L7.4 has produced classification + bundle + evaluations. */
export interface L7ConfidencePolicyEngineInput {
  readonly subject_id: string;
  readonly validation_result_id: string;
  readonly compute_run_id: string;
  readonly trace_id: string;
  readonly manifest_id: string;

  readonly policy_id: string;
  readonly policy_version: string;
  readonly family_id: string | null;

  readonly factor_values: L7ConfidenceFactorValues;
  readonly contradiction_severity: L7ContradictionSeverity;
  readonly contradiction_count: number;
  readonly repeated_contradiction: boolean;
  readonly unresolved_contradiction: boolean;
  readonly unresolved_risk_overhang: boolean;

  readonly staleness_material: boolean;
  readonly staleness_blocking: boolean;
  readonly incompleteness_material: boolean;
  readonly incompleteness_blocking: boolean;
  readonly ambiguity_material: boolean;
  readonly degradation_material: boolean;
  readonly historical_reliability_weak: boolean;
  readonly challenge_coverage_insufficient: boolean;

  /** Optional override caps (e.g. tightened by family policy). */
  readonly extra_cap_evaluations?: readonly L7ConfidenceCapEvaluation[];
  readonly restriction_profile_ref?: string | null;
}

export type L7ConfidencePolicyEngineResult =
  | { readonly ok: true; readonly decision: L7ValidationConfidenceDecision }
  | { readonly ok: false; readonly violations: readonly L7ConfidenceViolation[] };

export class L7ConfidencePolicyEngine {
  constructor(
    private readonly capRegistry: L7ConfidenceCapRegistry = getDefaultConfidenceCapRegistry(),
    private readonly policyRegistry: L7ConfidencePolicyRegistry = getDefaultConfidencePolicyRegistry(),
  ) {}

  evaluate(input: L7ConfidencePolicyEngineInput): L7ConfidencePolicyEngineResult {
    const violations: L7ConfidenceViolation[] = [];

    if (!input.policy_id || !input.policy_version) {
      violations.push(
        v(
          L7ConfidenceViolationCode.CONFIDENCE_POLICY_VERSION_MISSING,
          input.subject_id,
          'policy_id and policy_version are required',
        ),
      );
      return { ok: false, violations };
    }
    const resolution = this.policyRegistry.resolve(
      input.policy_id,
      input.policy_version,
      input.family_id,
    );
    if (!resolution) {
      violations.push(
        v(
          L7ConfidenceViolationCode.CONFIDENCE_POLICY_VERSION_NOT_REGISTERED,
          input.subject_id,
          `policy ${input.policy_id}@${input.policy_version} not registered`,
        ),
      );
      return { ok: false, violations };
    }

    // Validate factor value ranges.
    for (const d of L7_CONFIDENCE_FACTOR_DESCRIPTORS) {
      const v01 = input.factor_values[d.group];
      if (typeof v01 !== 'number' || !isFinite(v01)) {
        violations.push(
          v(
            L7ConfidenceViolationCode.FACTOR_COMPONENT_MISSING,
            input.subject_id,
            `factor ${d.group} value missing`,
            { group: d.group },
          ),
        );
        continue;
      }
      if (v01 < d.valueRange.min || v01 > d.valueRange.max) {
        violations.push(
          v(
            L7ConfidenceViolationCode.FACTOR_COMPONENT_OUT_OF_RANGE,
            input.subject_id,
            `factor ${d.group}=${v01} outside [${d.valueRange.min},${d.valueRange.max}]`,
            { group: d.group },
          ),
        );
      }
    }

    if (violations.length > 0) return { ok: false, violations };

    // §7.6.4.2 — raw score in [0,1].
    const breakdown = computeBreakdown(input.factor_values, resolution);
    const rawScore01 = clamp01(
      breakdown.positive_sum_01 - breakdown.penalty_subtracted_01,
    );
    const rawScore100 = clamp100(rawScore01 * 100);

    // Contradiction penalty chain (separate from cap chain).
    const penaltyChain = computePenaltyChain(input);

    // Cap chain (§7.6.4.4–§7.6.4.5).
    const capChain = computeCapChain(this.capRegistry, input);
    const cappedScore100 =
      capChain.resolved_ceiling_score100 === null
        ? rawScore100
        : Math.min(rawScore100, capChain.resolved_ceiling_score100);

    if (cappedScore100 > rawScore100 + 1e-6) {
      violations.push(
        v(
          L7ConfidenceViolationCode.CAPPED_SCORE_EXCEEDS_RAW,
          input.subject_id,
          `capped ${cappedScore100} > raw ${rawScore100}`,
        ),
      );
    }
    if (cappedScore100 < 0 || cappedScore100 > 100) {
      violations.push(
        v(
          L7ConfidenceViolationCode.CAPPED_SCORE_OUT_OF_RANGE,
          input.subject_id,
          `capped ${cappedScore100} out of [0,100]`,
        ),
      );
    }
    if (rawScore100 < 0 || rawScore100 > 100) {
      violations.push(
        v(
          L7ConfidenceViolationCode.RAW_SCORE_OUT_OF_RANGE,
          input.subject_id,
          `raw ${rawScore100} out of [0,100]`,
        ),
      );
    }
    if (
      input.contradiction_count > 0 &&
      penaltyChain.applied_magnitude === 0
    ) {
      violations.push(
        v(
          L7ConfidenceViolationCode.CONTRADICTION_PRESENT_NO_PENALTY,
          input.subject_id,
          `contradiction count=${input.contradiction_count} but penalty=0`,
        ),
      );
    }

    if (violations.length > 0) return { ok: false, violations };

    const reliability_band = reliabilityBandForScore100(
      cappedScore100,
      resolution.band_thresholds,
    );

    const rationale_codes = buildRationaleCodes(
      reliability_band,
      capChain,
      penaltyChain,
    );

    const decision: L7ValidationConfidenceDecision = {
      confidence_assessment_id: `cna:${input.subject_id}:${input.compute_run_id}`,
      validation_subject_id: input.subject_id,
      validation_result_id: input.validation_result_id,
      policy_version: resolution,
      raw_score_100: round3(rawScore100),
      capped_score_100: round3(cappedScore100),
      reliability_band,
      factor_breakdown: breakdown,
      cap_chain: capChain,
      contradiction_penalty_chain: penaltyChain,
      restriction_profile_ref: input.restriction_profile_ref ?? null,
      rationale_codes,
      compute_run_id: input.compute_run_id,
      replay_hash: deterministicReplayHash(input, breakdown, capChain, penaltyChain),
      lineage_refs: { trace_id: input.trace_id, manifest_id: input.manifest_id },
    };
    return { ok: true, decision };
  }
}

function computeBreakdown(
  values: L7ConfidenceFactorValues,
  resolution: L7ConfidencePolicyResolution,
): L7ConfidenceFactorBreakdown {
  const weights = resolution.effective_weights;
  const weighted: Record<L7ConfidenceFactorGroup, number> = {} as Record<
    L7ConfidenceFactorGroup,
    number
  >;
  let pos = 0;
  let pen = 0;
  for (const d of L7_CONFIDENCE_FACTOR_DESCRIPTORS) {
    const v01 = values[d.group];
    const w = weights[d.group];
    const c = w * v01;
    weighted[d.group] = c;
    if (d.polarity === 'PENALTY') pen += c;
    else pos += c;
  }
  return {
    values,
    weights,
    weighted_contributions: weighted,
    positive_sum_01: pos,
    penalty_subtracted_01: pen,
  };
}

function computePenaltyChain(
  input: L7ConfidencePolicyEngineInput,
): L7ContradictionPenaltyChain {
  const evals: L7ContradictionPenaltyEvaluation[] = [];

  const sevClass = penaltyClassForSeverity(input.contradiction_severity);
  const sevApplies = input.contradiction_count > 0;
  evals.push({
    penaltyClass: sevClass,
    applied: sevApplies,
    magnitude: sevApplies ? L7_CONTRADICTION_PENALTY_MAGNITUDE[sevClass] : 0,
    reason: `severity=${input.contradiction_severity} count=${input.contradiction_count}`,
  });

  if (input.repeated_contradiction) {
    evals.push({
      penaltyClass: L7ContradictionPenaltyClass.REPEATED_CONTRADICTION_PENALTY,
      applied: true,
      magnitude:
        L7_CONTRADICTION_PENALTY_MAGNITUDE[
          L7ContradictionPenaltyClass.REPEATED_CONTRADICTION_PENALTY
        ],
      reason: 'repeated contradiction observed',
    });
  }
  if (input.unresolved_contradiction) {
    evals.push({
      penaltyClass: L7ContradictionPenaltyClass.UNRESOLVED_CONTRADICTION_PENALTY,
      applied: true,
      magnitude:
        L7_CONTRADICTION_PENALTY_MAGNITUDE[
          L7ContradictionPenaltyClass.UNRESOLVED_CONTRADICTION_PENALTY
        ],
      reason: 'contradiction marked unresolved',
    });
  }
  if (input.unresolved_risk_overhang) {
    evals.push({
      penaltyClass: L7ContradictionPenaltyClass.CRITICAL_OVERHANG_PENALTY,
      applied: true,
      magnitude:
        L7_CONTRADICTION_PENALTY_MAGNITUDE[
          L7ContradictionPenaltyClass.CRITICAL_OVERHANG_PENALTY
        ],
      reason: 'unresolved risk overhang',
    });
  }
  return {
    evaluations: evals,
    applied_magnitude: resolvePenaltyMagnitude(evals),
  };
}

function computeCapChain(
  registry: L7ConfidenceCapRegistry,
  input: L7ConfidencePolicyEngineInput,
): L7ConfidenceCapChain {
  const triggers: L7ConfidenceCapTrigger[] = [];
  if (input.staleness_material) triggers.push('STALENESS_MATERIAL');
  if (input.staleness_blocking) triggers.push('STALENESS_BLOCKING');
  if (input.incompleteness_material) triggers.push('INCOMPLETENESS_MATERIAL');
  if (input.incompleteness_blocking) triggers.push('INCOMPLETENESS_BLOCKING');
  if (compareSeverity(input.contradiction_severity, L7ContradictionSeverity.SEVERE) >= 0)
    triggers.push('CRITICAL_CONTRADICTION_PRESENT');
  if (input.contradiction_severity === L7ContradictionSeverity.BLOCKING)
    triggers.push('BLOCKING_CONTRADICTION_PRESENT');
  if (input.ambiguity_material) triggers.push('AMBIGUITY_HIGH');
  if (input.historical_reliability_weak) triggers.push('HISTORICAL_RELIABILITY_WEAK');
  if (input.unresolved_risk_overhang) triggers.push('UNRESOLVED_RISK_OVERHANG');
  if (input.degradation_material) triggers.push('DEGRADED_SOURCE');
  if (input.challenge_coverage_insufficient)
    triggers.push('CHALLENGE_COVERAGE_INSUFFICIENT');

  const evaluations: L7ConfidenceCapEvaluation[] = [];
  for (const cap of registry.list()) {
    const matches = cap.mandatoryWhen.some(t => triggers.includes(t));
    evaluations.push({
      capClass: cap.capClass,
      applied: matches,
      ceilingScore100: cap.ceilingScore100,
      reason: matches
        ? `triggered by [${cap.mandatoryWhen.filter(t => triggers.includes(t)).join(',')}]`
        : 'no triggers',
    });
  }
  for (const extra of input.extra_cap_evaluations ?? []) {
    evaluations.push(extra);
  }
  const applied_cap_classes = evaluations
    .filter(e => e.applied)
    .map(e => e.capClass);
  return {
    evaluations,
    applied_cap_classes,
    resolved_ceiling_score100: resolveCapCeiling(evaluations),
  };
}

function buildRationaleCodes(
  band: L7ReliabilityBand,
  caps: L7ConfidenceCapChain,
  penalties: L7ContradictionPenaltyChain,
): readonly string[] {
  const out = [`band=${band}`];
  for (const c of caps.evaluations) {
    if (c.applied) out.push(`cap=${c.capClass}`);
  }
  for (const p of penalties.evaluations) {
    if (p.applied) out.push(`penalty=${p.penaltyClass}`);
  }
  return out.sort();
}

function deterministicReplayHash(
  input: L7ConfidencePolicyEngineInput,
  breakdown: L7ConfidenceFactorBreakdown,
  caps: L7ConfidenceCapChain,
  penalties: L7ContradictionPenaltyChain,
): string {
  const canonical = JSON.stringify({
    s: input.subject_id,
    r: input.validation_result_id,
    c: input.compute_run_id,
    pid: input.policy_id,
    pv: input.policy_version,
    fid: input.family_id,
    v: orderedRecord(breakdown.values),
    w: orderedRecord(breakdown.weights),
    cap: caps.applied_cap_classes.slice().sort(),
    pen: penalties.evaluations
      .filter(e => e.applied)
      .map(e => e.penaltyClass)
      .sort(),
  });
  return `crh:${fnv1aHex(canonical)}`;
}

function orderedRecord<T extends string>(rec: Readonly<Record<T, number>>): Record<T, number> {
  const out: Record<T, number> = {} as Record<T, number>;
  for (const k of Object.keys(rec).sort() as T[]) out[k] = rec[k];
  return out;
}

function fnv1aHex(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function v(
  code: L7ConfidenceViolationCode,
  subjectId: string,
  detail: string,
  context: Record<string, unknown> = {},
): L7ConfidenceViolation {
  return {
    code,
    source: 'l7_6-confidence-policy-engine',
    subject_id: subjectId,
    factor_group: typeof context.group === 'string' ? context.group : null,
    cap_class: typeof context.cap === 'string' ? context.cap : null,
    right: typeof context.right === 'string' ? context.right : null,
    detail,
    context,
  };
}
