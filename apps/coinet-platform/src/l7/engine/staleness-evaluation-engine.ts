/**
 * L7.4 — StalenessEvaluationEngine
 *
 * §7.4.6.3 — Evaluates temporal weakness of support and challenge.
 * Staleness is *never* promoted to contradiction here (§7.4.6.7).
 * The subject contract's `staleness_policy` decides whether stale
 * support blocks, downgrades, or merely modifies.
 */

import type { L7ValidationSubjectContract } from '../contracts/validation-subject.contract';
import { L7StalenessPolicyClass } from '../contracts/validation-runtime-status';
import type {
  L7SupportRecord,
  L7ChallengeRecord,
  L7EvaluationOutput,
} from '../runtime/l7-execution-context';
import { L7EngineResult, ok } from './engine-types';

export interface StalenessInput {
  readonly subject: L7ValidationSubjectContract;
  readonly support: readonly L7SupportRecord[];
  readonly challenge: readonly L7ChallengeRecord[];
}

export function evaluateStaleness(input: StalenessInput): L7EngineResult<L7EvaluationOutput> {
  const s = input.subject;
  const affected: string[] = [];
  const reasons: string[] = [];
  let staleCount = 0;
  let expiredCount = 0;

  for (const r of input.support) {
    if (r.freshness_class === 'STALE') {
      staleCount++;
      affected.push(r.support_ref);
      reasons.push(`support ${r.support_ref} is STALE`);
    } else if (r.freshness_class === 'EXPIRED') {
      expiredCount++;
      affected.push(r.support_ref);
      reasons.push(`support ${r.support_ref} is EXPIRED`);
    }
  }
  for (const ch of input.challenge) {
    if (ch.challenge_class === 'STALE_SUPPORT_CHALLENGE') {
      affected.push(ch.challenge_ref);
      reasons.push(`challenge ${ch.challenge_ref} flagged STALE_SUPPORT_CHALLENGE`);
    }
  }

  const denom = Math.max(1, input.support.length + input.challenge.length);
  const score = Math.min(1, (staleCount * 0.5 + expiredCount * 1.0) / denom);

  const blocks =
    s.staleness_policy === L7StalenessPolicyClass.BLOCK &&
    (staleCount > 0 || expiredCount > 0);

  return ok({
    domain: 'STALENESS',
    score,
    reasons: reasons.sort(),
    affected_surface_refs: [...new Set(affected)].sort(),
    blocks_classification: blocks,
  });
}
