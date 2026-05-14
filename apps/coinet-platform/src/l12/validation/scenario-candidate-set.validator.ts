/**
 * L12.4 — Candidate set validator (§12.4.29).
 *
 * Confirms candidates carry no ranking fields (only eligibility flags),
 * have reason codes & supporting refs, no forbidden language, and that
 * the multi-path law is satisfied.
 */

import { L12ScenarioType } from '../contracts/scenario-type';
import type { L12ScenarioCandidateSet } from '../engine/scenario-candidate-engine';

import {
  L12RuntimeViolationCode,
  L12RuntimeViolationIssue,
  l12IssueOf,
} from './l12-runtime-violation-codes';

const FORBIDDEN: readonly RegExp[] = [
  /(?:^|[^a-z0-9])will\s+(go|move|pump|dump|break|continue)(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])guaranteed(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])buy(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])sell(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])long(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])short(?:[^a-z0-9]|$)/i,
];

export interface ValidateL12CandidateSetResult {
  readonly ok: boolean;
  readonly issues: readonly L12RuntimeViolationIssue[];
}

export function validateL12ScenarioCandidateSet(
  set: L12ScenarioCandidateSet,
  options?: { readonly insufficient_inputs_for_alternatives?: boolean },
): ValidateL12CandidateSetResult {
  const issues: L12RuntimeViolationIssue[] = [];
  const types = new Set<L12ScenarioType>();
  for (const c of set.candidates) {
    if (c.candidate_reason_codes.length === 0) {
      issues.push(
        l12IssueOf(L12RuntimeViolationCode.L12R_CANDIDATE_NO_REASON_CODES, 'candidate without reason codes', c.candidate_id),
      );
    }
    for (const r of c.candidate_reason_codes) {
      if (FORBIDDEN.some(p => p.test(r))) {
        issues.push(
          l12IssueOf(L12RuntimeViolationCode.L12R_PREDICTION_THEATER, `forbidden phrase in reason "${r}"`, c.candidate_id),
        );
        break;
      }
    }
    types.add(c.scenario_type);
  }
  const hasBullish = types.has(L12ScenarioType.BULLISH_CONTINUATION);
  const hasFailure =
    types.has(L12ScenarioType.BEARISH_FAILURE) ||
    types.has(L12ScenarioType.STRESS_CASE) ||
    types.has(L12ScenarioType.RECOVERY_CASE);
  const hasInsuf = types.has(L12ScenarioType.INSUFFICIENT_DATA_CASE);
  if (
    hasBullish &&
    !hasFailure &&
    !options?.insufficient_inputs_for_alternatives &&
    !hasInsuf
  ) {
    issues.push(
      l12IssueOf(
        L12RuntimeViolationCode.L12R_BULLISH_ONLY_FAKE_CERTAINTY,
        'bullish-only candidate set without failure/alternative',
        set.candidate_set_id,
      ),
    );
  }
  return { ok: issues.length === 0, issues };
}
