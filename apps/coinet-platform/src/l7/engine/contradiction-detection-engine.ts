/**
 * L7.4 — ContradictionDetectionEngine
 *
 * §7.4.5.1–§7.4.5.3 — Detects *contradiction candidates* only. Never
 * emits final validation class, never mutates confidence score, never
 * flattens multiple tensions into one generic note.
 *
 * The output is `L7ContradictionCandidate[]`; clustering into a formal
 * bundle is the job of the downstream ContradictionClusterEngine.
 */

import type { L7ValidationSubjectContract } from '../contracts/validation-subject.contract';
import type {
  L7SupportRecord,
  L7ChallengeRecord,
  L7ContradictionCandidate,
} from '../runtime/l7-execution-context';
import { L7ContradictionFamily, ALL_CONTRADICTION_FAMILIES } from '../contracts/contradiction-bundle';
import { L7RuntimeViolation, L7RuntimeViolationCode } from '../validation/l7-runtime-violation-codes';
import { L7EngineResult, fail, ok } from './engine-types';

export interface ContradictionDetectionInput {
  readonly subject: L7ValidationSubjectContract;
  readonly support: readonly L7SupportRecord[];
  readonly challenge: readonly L7ChallengeRecord[];
}

export function detectContradictionCandidates(
  input: ContradictionDetectionInput,
): L7EngineResult<readonly L7ContradictionCandidate[]> {
  const violations: L7RuntimeViolation[] = [];
  const candidates: L7ContradictionCandidate[] = [];
  const s = input.subject;

  for (const ch of input.challenge) {
    if (ch.challenge_class === 'MISSING_CONFIRMATION') {
      // Not a contradiction candidate — that is a missingness fact
      // handled by the incompleteness engine (§7.4.4.7).
      continue;
    }
    const family = familyForChallenge(ch);
    if (!ALL_CONTRADICTION_FAMILIES.includes(family)) {
      violations.push(v(L7RuntimeViolationCode.CONTRADICTION_DETECTION_UNTYPED_FAMILY, s, `unknown family for challenge ${ch.challenge_ref}`));
      continue;
    }

    // Pair each challenge with the strongest same-family or STRUCTURAL support
    // surface (deterministic: sorted lexicographically).
    const matches = [...input.support]
      .filter(sup => supportOpposesChallenge(sup, ch))
      .sort((a, b) =>
        a.support_ref < b.support_ref ? -1 : a.support_ref > b.support_ref ? 1 : 0,
      );
    const supportRef = matches.length > 0 ? matches[0].support_ref : '__no_support__';

    const cand: L7ContradictionCandidate = {
      candidate_id: `cc:${s.validation_subject_id}:${family}:${ch.challenge_ref}`,
      contradiction_family: family,
      support_ref: supportRef,
      challenge_ref: ch.challenge_ref,
      contradiction_class: ch.challenge_class,
      severity_candidate: ch.severity_candidate,
      temporal_posture: ch.temporal_posture,
      blocks_confirmation: ch.blocks_confirmation,
      caps_confidence_only: ch.caps_confidence_only,
      rationale: `challenge ${ch.challenge_ref} (${ch.challenge_class}) contradicts support ${supportRef} in family ${family}`,
      lineage_refs: [ch.challenge_ref, supportRef],
    };

    // §7.4.5.3 — detection laundering: must not silently re-classify a HARD
    // contradiction with high support as SOFT_TENSION.
    if (
      ch.challenge_class === 'HARD_CONTRADICTION' &&
      cand.contradiction_class !== 'HARD_CONTRADICTION'
    ) {
      violations.push(v(L7RuntimeViolationCode.CONTRADICTION_DETECTION_LAUNDERING, s, `HARD contradiction on ${ch.challenge_ref} emitted as ${cand.contradiction_class}`));
    }
    candidates.push(cand);
  }

  // §7.4.5.3 — detection must not assign validation class.
  // (Enforced structurally: we never produce a validation_class field.)

  if (violations.length > 0) return fail(violations);

  candidates.sort((a, b) =>
    a.candidate_id < b.candidate_id ? -1 : a.candidate_id > b.candidate_id ? 1 : 0,
  );
  return ok(candidates);
}

function familyForChallenge(ch: L7ChallengeRecord): L7ContradictionFamily {
  switch (ch.challenge_class) {
    case 'HARD_CONTRADICTION':
      return L7ContradictionFamily.SUPPORT_CHALLENGE_DISAGREEMENT;
    case 'RISK_OVERHANG':
      return L7ContradictionFamily.MATERIAL_RISK_OVERHANG;
    case 'STALE_SUPPORT_CHALLENGE':
      return L7ContradictionFamily.SIGNAL_STALENESS;
    case 'SOFT_TENSION':
      return familyForFamilyName(ch.family);
    case 'MISSING_CONFIRMATION':
      return L7ContradictionFamily.PRIMITIVE_INCONSISTENCY;
  }
}

function familyForFamilyName(family: string): L7ContradictionFamily {
  switch (family) {
    case 'PRICE_FAMILY':
    case 'FLOW_FAMILY':
      return L7ContradictionFamily.PRICE_FLOW_DIVERGENCE;
    case 'SENTIMENT_FAMILY':
      return L7ContradictionFamily.SENTIMENT_FUNDAMENTAL_DIVERGENCE;
    case 'REVENUE_FAMILY':
    case 'TVL_FAMILY':
    case 'PARTICIPATION_FAMILY':
      return L7ContradictionFamily.REVENUE_ACTIVITY_DIVERGENCE;
    case 'STRUCTURAL_FAMILY':
      return L7ContradictionFamily.STRUCTURAL_WEAKNESS;
    default:
      return L7ContradictionFamily.CROSS_SOURCE_DISAGREEMENT;
  }
}

function supportOpposesChallenge(sup: L7SupportRecord, ch: L7ChallengeRecord): boolean {
  if (sup.family === ch.family) return true;
  // Cross-family: support still opposes a same-scope challenge.
  return sup.relevance_class === 'PRIMARY';
}

function v(code: L7RuntimeViolationCode, s: L7ValidationSubjectContract, detail: string): L7RuntimeViolation {
  return {
    code,
    source: 'contradiction-detection-engine',
    nodeId: null,
    validation_run_id: null,
    validation_subject_id: s.validation_subject_id,
    detail,
    context: {},
  };
}
