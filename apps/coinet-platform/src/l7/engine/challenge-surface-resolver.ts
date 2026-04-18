/**
 * L7.4 — ChallengeSurfaceResolver
 *
 * §7.4.4.5–§7.4.4.9 — Determines which primitives count as challenges or
 * contradiction candidates. Crucially distinguishes HARD_CONTRADICTION,
 * SOFT_TENSION, RISK_OVERHANG, MISSING_CONFIRMATION, and
 * STALE_SUPPORT_CHALLENGE so these states never collapse (§7.4.4.7
 * missingness-distinction law).
 */

import type { L7ValidationSubjectContract } from '../contracts/validation-subject.contract';
import type { L7ValidationSubjectInstance } from './claim-assembly-engine';
import type { L7ChallengeRecord } from '../runtime/l7-execution-context';
import type { L7PrimitiveSurface } from './support-surface-resolver';
import { L7RuntimeViolation, L7RuntimeViolationCode } from '../validation/l7-runtime-violation-codes';
import { L7EngineResult, fail, ok } from './engine-types';

export interface ChallengeResolutionInput {
  readonly subject: L7ValidationSubjectContract;
  readonly instance: L7ValidationSubjectInstance;
  readonly primitives: readonly L7PrimitiveSurface[];
}

export function resolveChallenge(
  input: ChallengeResolutionInput,
): L7EngineResult<readonly L7ChallengeRecord[]> {
  const violations: L7RuntimeViolation[] = [];
  const s = input.subject;
  const declared = new Map(s.required_challenge_inputs.map(r => [r.ref, r]));
  const primBy = new Map(input.primitives.map(p => [p.ref, p]));
  const records: L7ChallengeRecord[] = [];

  for (const inp of s.required_challenge_inputs) {
    const prim = primBy.get(inp.ref);
    if (!prim) {
      // §7.4.4.7 — missing confirmation must not be labelled contradiction.
      records.push({
        challenge_ref: inp.ref,
        family: inp.family,
        challenge_class: 'MISSING_CONFIRMATION',
        severity_candidate: 'MATERIAL',
        temporal_posture: 'MISSING',
        confidence_posture: 'LOW',
        blocks_confirmation: inp.required,
        caps_confidence_only: !inp.required,
        lineage_refs: [inp.ref],
      });
      continue;
    }
    const freshness = classifyFreshness(prim.freshness_age_seconds, s.freshness_budget_seconds);
    const cls = classifyChallenge(prim, inp.staleness_critical, freshness);
    if (cls === 'ILLEGAL') {
      violations.push(v(L7RuntimeViolationCode.CHALLENGE_ILLEGAL_CLASS, s, `challenge surface ${inp.ref} could not be classified`));
      continue;
    }
    if (prim.scope_type !== s.scope_type || prim.scope_id !== s.scope_id) {
      violations.push(v(L7RuntimeViolationCode.CHALLENGE_UNDECLARED_SURFACE, s, `challenge surface ${inp.ref} scope mismatch`));
      continue;
    }
    records.push({
      challenge_ref: inp.ref,
      family: prim.family,
      challenge_class: cls,
      severity_candidate: severityForChallenge(cls, prim),
      temporal_posture: freshness === 'CURRENT' || freshness === 'RECENT' ? 'CURRENT' : 'STALE',
      confidence_posture: prim.confidence >= 0.7 ? 'HIGH' : prim.confidence >= 0.4 ? 'MEDIUM' : 'LOW',
      blocks_confirmation: cls === 'HARD_CONTRADICTION',
      caps_confidence_only: cls === 'SOFT_TENSION' || cls === 'RISK_OVERHANG' || cls === 'STALE_SUPPORT_CHALLENGE',
      lineage_refs: [inp.ref],
    });
  }

  // §7.4.4.7 — also promote bound-support surfaces that actually point the wrong way.
  for (const prim of input.primitives) {
    if (
      prim.direction_signal === 'CHALLENGE' &&
      !declared.has(prim.ref) &&
      input.instance.bound_support_refs.includes(prim.ref)
    ) {
      violations.push(v(
        L7RuntimeViolationCode.CHALLENGE_CONTRADICTION_AS_MISSINGNESS,
        s,
        `surface ${prim.ref} is a contradiction but was not declared as challenge (would be mislabelled as missing)`,
      ));
    }
  }

  if (violations.length > 0) return fail(violations);
  records.sort((a, b) => (a.challenge_ref < b.challenge_ref ? -1 : a.challenge_ref > b.challenge_ref ? 1 : 0));
  return ok(records);
}

type ChallengeClass = L7ChallengeRecord['challenge_class'] | 'ILLEGAL';

function classifyChallenge(
  prim: L7PrimitiveSurface,
  stalenessCritical: boolean,
  freshness: 'CURRENT' | 'RECENT' | 'STALE' | 'EXPIRED',
): ChallengeClass {
  if (prim.direction_signal === 'CHALLENGE') {
    if (prim.confidence >= 0.7 && (freshness === 'CURRENT' || freshness === 'RECENT')) {
      return 'HARD_CONTRADICTION';
    }
    if (prim.confidence >= 0.4) return 'SOFT_TENSION';
    return 'SOFT_TENSION';
  }
  if (prim.direction_signal === 'NEUTRAL') {
    // Risk-overhang detection: challenge pattern but signal neutral → overhang indicator.
    if (freshness === 'CURRENT' || freshness === 'RECENT') return 'RISK_OVERHANG';
    return stalenessCritical ? 'STALE_SUPPORT_CHALLENGE' : 'MISSING_CONFIRMATION';
  }
  // direction=SUPPORT but presented on the challenge side → stale support challenge.
  if (freshness === 'STALE' || freshness === 'EXPIRED') {
    return 'STALE_SUPPORT_CHALLENGE';
  }
  return 'SOFT_TENSION';
}

function severityForChallenge(
  cls: L7ChallengeRecord['challenge_class'],
  prim: L7PrimitiveSurface,
): L7ChallengeRecord['severity_candidate'] {
  switch (cls) {
    case 'HARD_CONTRADICTION':
      return prim.confidence >= 0.85 ? 'BLOCKING' : 'SEVERE';
    case 'RISK_OVERHANG':
      return 'MATERIAL';
    case 'SOFT_TENSION':
      return 'MINOR';
    case 'STALE_SUPPORT_CHALLENGE':
      return 'MATERIAL';
    case 'MISSING_CONFIRMATION':
      return 'MATERIAL';
  }
}

function classifyFreshness(
  age: number,
  budget: number,
): 'CURRENT' | 'RECENT' | 'STALE' | 'EXPIRED' {
  if (budget <= 0) return 'CURRENT';
  if (age <= budget * 0.5) return 'CURRENT';
  if (age <= budget) return 'RECENT';
  if (age <= budget * 2) return 'STALE';
  return 'EXPIRED';
}

function v(code: L7RuntimeViolationCode, s: L7ValidationSubjectContract, detail: string): L7RuntimeViolation {
  return {
    code,
    source: 'challenge-surface-resolver',
    nodeId: null,
    validation_run_id: null,
    validation_subject_id: s.validation_subject_id,
    detail,
    context: {},
  };
}
