/**
 * L8.4 — RegimeDegradationEngine
 *
 * §8.4.5.8 — Emits `L8QualityOutput` tagged domain='DEGRADATION'. Never
 * emits ambiguity or staleness (§8.4.5.9 separation law).
 */

import type { L8RegimeSubjectContract } from '../contracts/regime-subject.contract';
import type { L8ResolvedRegimeInputSet } from '../runtime/regime-execution-context';
import type { L8QualityOutput } from '../runtime/regime-execution-context';
import {
  L8RuntimeViolation,
  L8RuntimeViolationCode,
} from '../validation/l8-runtime-violation-codes';
import { L8EngineResult, fail, ok } from './engine-types';

export interface L8DegradationEngineInput {
  readonly subject: L8RegimeSubjectContract;
  readonly resolved_input_set: L8ResolvedRegimeInputSet;
  readonly total_required_refs: number;
}

export function evaluateDegradation(
  input: L8DegradationEngineInput,
): L8EngineResult<L8QualityOutput> {
  const violations: L8RuntimeViolation[] = [];
  const s = input.subject;
  const r = input.resolved_input_set;

  if (input.total_required_refs < 0) {
    violations.push(v(
      L8RuntimeViolationCode.QUALITY_OUT_OF_ORDER, s,
      `total_required_refs invalid: ${input.total_required_refs}`,
      { total_required_refs: input.total_required_refs },
    ));
    return fail(violations);
  }

  // Degradation score: fraction of required refs that are missing or
  // degraded at runtime.
  const missing = r.missing_required_refs.length;
  const degraded = r.degraded_refs.length;
  const total = Math.max(1, input.total_required_refs);

  const score = Math.max(0, Math.min(1, (missing + degraded) / total));
  const reasons: string[] = [];
  if (missing > 0) reasons.push('REQUIRED_SURFACES_MISSING');
  if (degraded > 0) reasons.push('DEGRADED_SURFACES_PRESENT');
  if (r.readiness_class === 'DEGRADED') reasons.push('INPUT_READINESS_DEGRADED');

  const affected = [...r.missing_required_refs, ...r.degraded_refs]
    .filter((ref, idx, self) => self.indexOf(ref) === idx);

  // Guard against degradation-as-ambiguity drift (§8.4.5.9)
  for (const ref of affected) {
    if (ref.startsWith('ambiguity:') || ref.includes(':ambiguous_')) {
      violations.push(v(
        L8RuntimeViolationCode.QUALITY_STALENESS_AS_DEGRADATION, s,
        `degradation engine consumed ambiguity-tagged surface ${ref}`,
        { ref },
      ));
    }
  }
  if (score < 0 || score > 1) {
    violations.push(v(
      L8RuntimeViolationCode.QUALITY_SCORE_OUT_OF_RANGE, s,
      `degradation score OOR: ${score}`, { score },
    ));
    return fail(violations);
  }
  if (violations.length > 0) return fail(violations);

  const out: L8QualityOutput = {
    domain: 'DEGRADATION',
    regime_subject_id: s.regime_subject_id,
    score,
    reasons: reasons.sort(),
    affected_surface_refs: affected.sort(),
    blocks_classification: score >= 0.7,
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
    source: 'regime-degradation-engine',
    nodeId: null,
    regime_run_id: null,
    regime_subject_id: s.regime_subject_id,
    detail,
    context,
  };
}
