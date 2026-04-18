/**
 * L7.4 — AmbiguityEvaluationEngine
 *
 * §7.4.6.4 — Ambiguity is the state where multiple material
 * interpretations remain viable. It is *not* incompleteness and *not*
 * contradiction. The engine declares unresolved interpretation families
 * and returns a score whose threshold is set by the subject contract.
 */

import type { L7ValidationSubjectContract } from '../contracts/validation-subject.contract';
import type {
  L7SupportRecord,
  L7ChallengeRecord,
  L7EvaluationOutput,
} from '../runtime/l7-execution-context';
import { L7EngineResult, ok } from './engine-types';

export interface AmbiguityInput {
  readonly subject: L7ValidationSubjectContract;
  readonly support: readonly L7SupportRecord[];
  readonly challenge: readonly L7ChallengeRecord[];
}

export function evaluateAmbiguity(input: AmbiguityInput): L7EngineResult<L7EvaluationOutput> {
  const s = input.subject;
  const affected: string[] = [];
  const reasons: string[] = [];

  const supportScore = input.support.reduce((acc, r) => acc + r.contribution_score, 0);
  const challengeScore = input.challenge.reduce(
    (acc, r) => acc + challengeWeight(r),
    0,
  );

  // Ambiguity is high when support and challenge are roughly balanced in
  // magnitude and both above a minimum.
  const maxSide = Math.max(supportScore, challengeScore);
  const minSide = Math.min(supportScore, challengeScore);
  let score = 0;
  if (maxSide >= 0.4 && minSide >= 0.3) {
    const ratio = minSide / Math.max(maxSide, 1e-9);
    score = Math.min(1, ratio);
  }

  if (score > 0.4) {
    reasons.push(`support strength ${supportScore.toFixed(3)} vs challenge strength ${challengeScore.toFixed(3)} are balanced`);
    for (const r of input.support) if (r.confidence_posture !== 'LOW') affected.push(r.support_ref);
    for (const c of input.challenge) if (c.confidence_posture !== 'LOW') affected.push(c.challenge_ref);
  }

  // Multiple distinct contradiction classes also indicate unresolved interpretation families.
  const challengeClasses = new Set(
    input.challenge
      .filter(c => c.challenge_class !== 'MISSING_CONFIRMATION')
      .map(c => c.challenge_class),
  );
  if (challengeClasses.size >= 2) {
    score = Math.max(score, 0.5);
    reasons.push(`multiple unresolved interpretation families: ${[...challengeClasses].sort().join(', ')}`);
  }

  const tolerance = s.ambiguity_tolerance_profile;
  const maxAllowed = tolerance.max_ambiguity_score ?? 0.5;
  const blocks = score > maxAllowed;

  return ok({
    domain: 'AMBIGUITY',
    score: Math.min(1, score),
    reasons: reasons.sort(),
    affected_surface_refs: [...new Set(affected)].sort(),
    blocks_classification: blocks,
  });
}

function challengeWeight(c: L7ChallengeRecord): number {
  switch (c.severity_candidate) {
    case 'INFO': return 0.05;
    case 'MINOR': return 0.2;
    case 'MATERIAL': return 0.5;
    case 'SEVERE': return 0.8;
    case 'BLOCKING': return 1.0;
  }
}
