/**
 * L8.4 — RegimeStalenessEngine
 *
 * §8.4.5.7 — Emits `L8QualityOutput` tagged domain='STALENESS'. Never
 * emits ambiguity or degradation signals (§8.4.5.9 separation law).
 */

import type { L8RegimeSubjectContract } from '../contracts/regime-subject.contract';
import type { L8ResolvedRegimeInputSet } from '../runtime/regime-execution-context';
import type { L8QualityOutput } from '../runtime/regime-execution-context';
import {
  L8RuntimeViolation,
  L8RuntimeViolationCode,
} from '../validation/l8-runtime-violation-codes';
import { L8EngineResult, fail, ok } from './engine-types';

export interface L8StalenessEngineInput {
  readonly subject: L8RegimeSubjectContract;
  readonly resolved_input_set: L8ResolvedRegimeInputSet;
  /**
   * Per-surface age in seconds. The engine uses the subject's
   * `freshness_budget_seconds` as the reference.
   */
  readonly surface_age_seconds: Readonly<Record<string, number>>;
}

export function evaluateStaleness(
  input: L8StalenessEngineInput,
): L8EngineResult<L8QualityOutput> {
  const violations: L8RuntimeViolation[] = [];
  const s = input.subject;
  const budget = s.freshness_budget_seconds;

  if (!budget || budget <= 0) {
    violations.push(v(
      L8RuntimeViolationCode.QUALITY_OUT_OF_ORDER, s,
      `freshness_budget_seconds invalid: ${budget}`, { budget },
    ));
    return fail(violations);
  }

  let numerator = 0;
  let denominator = 0;
  const affected: string[] = [];
  const reasons: string[] = [];

  for (const [ref, age] of Object.entries(input.surface_age_seconds)) {
    if (!Number.isFinite(age) || age < 0) continue;
    denominator++;
    const ratio = Math.min(1, age / Math.max(1, budget));
    numerator += ratio;
    if (ratio > 0.5) affected.push(ref);
  }

  // Include the resolved set's stale_refs as prior-stage evidence
  for (const r of input.resolved_input_set.stale_refs) {
    if (!affected.includes(r)) affected.push(r);
  }

  const avg = denominator > 0 ? numerator / denominator : 0;
  const score = Math.max(0, Math.min(1, avg));

  if (score >= 0.3) reasons.push('FRESHNESS_BUDGET_APPROACHED');
  if (score >= 0.6) reasons.push('FRESHNESS_BUDGET_EXCEEDED');
  if (s.staleness_policy === 'STRICT' && score > 0.2) {
    reasons.push('STRICT_POLICY_STALE_SURFACES_PRESENT');
  }

  if (score < 0 || score > 1) {
    violations.push(v(
      L8RuntimeViolationCode.QUALITY_SCORE_OUT_OF_RANGE, s,
      `staleness score OOR: ${score}`, { score },
    ));
    return fail(violations);
  }

  // Guard against staleness-as-degradation drift (§8.4.5.9)
  for (const r of affected) {
    if (r.startsWith('degraded:') || r.includes(':degraded_')) {
      violations.push(v(
        L8RuntimeViolationCode.QUALITY_STALENESS_AS_DEGRADATION, s,
        `staleness engine consumed degradation-tagged surface ${r}`,
        { ref: r },
      ));
    }
  }
  if (violations.length > 0) return fail(violations);

  const out: L8QualityOutput = {
    domain: 'STALENESS',
    regime_subject_id: s.regime_subject_id,
    score,
    reasons: reasons.sort(),
    affected_surface_refs: affected.sort(),
    blocks_classification:
      s.staleness_policy === 'STRICT' && score >= 0.7,
  };
  return ok(out);
}

function v(
  code: L8RuntimeViolationCode,
  s: L8RegimeSubjectContract,
  detail: string,
  context: Record<string, unknown>,
): L8RuntimeViolation {
  return {
    code,
    source: 'regime-staleness-engine',
    nodeId: null,
    regime_run_id: null,
    regime_subject_id: s.regime_subject_id,
    detail,
    context,
  };
}
