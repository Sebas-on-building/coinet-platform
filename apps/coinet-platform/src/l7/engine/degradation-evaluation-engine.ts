/**
 * L7.4 — DegradationEvaluationEngine
 *
 * §7.4.6.5 — Source loss / primitive-quality degradation / missing
 * governed surfaces. Distinct from incompleteness (which is about
 * absent surfaces) and from contradiction (which is about conflicting
 * surfaces).
 */

import type { L7ValidationSubjectContract } from '../contracts/validation-subject.contract';
import type {
  L7SupportRecord,
  L7ChallengeRecord,
  L7EvaluationOutput,
} from '../runtime/l7-execution-context';
import { L7EngineResult, ok } from './engine-types';

export interface DegradationInput {
  readonly subject: L7ValidationSubjectContract;
  readonly support: readonly L7SupportRecord[];
  readonly challenge: readonly L7ChallengeRecord[];
}

export function evaluateDegradation(input: DegradationInput): L7EngineResult<L7EvaluationOutput> {
  const s = input.subject;
  const affected: string[] = [];
  const reasons: string[] = [];
  let degradedCount = 0;

  for (const r of input.support) {
    if (r.confidence_posture === 'LOW' || r.completeness_class === 'PARTIAL' || r.completeness_class === 'MISSING') {
      degradedCount++;
      affected.push(r.support_ref);
      reasons.push(`support ${r.support_ref} degraded (confidence=${r.confidence_posture}, completeness=${r.completeness_class})`);
    }
  }
  for (const c of input.challenge) {
    if (c.confidence_posture === 'LOW') {
      affected.push(c.challenge_ref);
      reasons.push(`challenge ${c.challenge_ref} degraded (LOW confidence)`);
    }
  }

  const denom = Math.max(1, input.support.length);
  const score = Math.min(1, degradedCount / denom);

  const tolerance = s.degradation_tolerance_profile;
  const maxAllowed = tolerance.max_degradation_score ?? 0.4;
  const blocks = score > maxAllowed;

  return ok({
    domain: 'DEGRADATION',
    score,
    reasons: reasons.sort(),
    affected_surface_refs: [...new Set(affected)].sort(),
    blocks_classification: blocks,
  });
}
