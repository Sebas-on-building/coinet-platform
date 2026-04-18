/**
 * L7.4 — IncompletenessEngine
 *
 * §7.4.6.2 — Determines whether required support/challenge surfaces are
 * absent, whether required evidence is missing, and whether subject
 * completeness requirements failed. Incompleteness must NOT be
 * collapsed into contradiction or ambiguity (§7.4.6.1).
 */

import type { L7ValidationSubjectContract } from '../contracts/validation-subject.contract';
import type {
  L7SupportRecord,
  L7ChallengeRecord,
  L7EvaluationOutput,
} from '../runtime/l7-execution-context';
import { L7EngineResult, ok } from './engine-types';

export interface IncompletenessInput {
  readonly subject: L7ValidationSubjectContract;
  readonly support: readonly L7SupportRecord[];
  readonly challenge: readonly L7ChallengeRecord[];
}

export function evaluateIncompleteness(input: IncompletenessInput): L7EngineResult<L7EvaluationOutput> {
  const s = input.subject;
  const affected: string[] = [];
  const reasons: string[] = [];
  let missingRequired = 0;
  let totalRequired = 0;

  const boundSupport = new Set(input.support.map(r => r.support_ref));
  for (const inp of s.required_support_inputs) {
    if (!inp.required) continue;
    totalRequired++;
    if (!boundSupport.has(inp.ref)) {
      missingRequired++;
      affected.push(inp.ref);
      reasons.push(`missing required support ${inp.ref}`);
    }
  }
  for (const ch of input.challenge) {
    if (ch.challenge_class === 'MISSING_CONFIRMATION') {
      affected.push(ch.challenge_ref);
      reasons.push(`challenge ${ch.challenge_ref} is missing confirmation surface`);
    }
  }
  const partial = input.support.filter(r => r.completeness_class === 'PARTIAL' || r.completeness_class === 'MISSING').length;
  if (partial > 0) reasons.push(`${partial} support surface(s) partial or missing`);

  const denom = Math.max(1, totalRequired + input.challenge.filter(c => c.challenge_class === 'MISSING_CONFIRMATION').length);
  const score = Math.min(
    1,
    (missingRequired + input.challenge.filter(c => c.challenge_class === 'MISSING_CONFIRMATION').length + partial * 0.25) / denom,
  );

  const tolerance = s.incompleteness_tolerance_profile;
  const blocks =
    (s.materiality_class === 'CRITICAL' && missingRequired > 0) ||
    missingRequired > tolerance.max_missing_required_surfaces;

  return ok({
    domain: 'INCOMPLETENESS',
    score,
    reasons: reasons.sort(),
    affected_surface_refs: [...new Set(affected)].sort(),
    blocks_classification: blocks,
  });
}
