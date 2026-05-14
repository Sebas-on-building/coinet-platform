/**
 * L12.7 — Rollout Gate (§12.7.12)
 *
 * Pure decision: given a candidate rollout phase, the current
 * certification level, the set of satisfied phase flags, and the
 * current critical-breach count, return whether the gate admits the
 * transition.
 */

import {
  L12CertificationLevel,
  L12_CERTIFICATION_LEVEL_RANK,
} from '../certification/l12-certification-level';
import {
  L12RolloutPhase,
  L12RolloutPhaseFlag,
  L12_ROLLOUT_PHASE_REQUIREMENTS,
  L12_ROLLOUT_PHASE_MIN_CERT_LEVEL,
} from './l12-rollout-phase';

export interface L12RolloutGateInput {
  readonly candidate_phase: L12RolloutPhase;
  readonly certification_level: L12CertificationLevel;
  readonly critical_breach_count: number;
  readonly satisfied_flags: readonly L12RolloutPhaseFlag[];
}

export interface L12RolloutGateDecision {
  readonly admitted: boolean;
  readonly reason: string;
  readonly missing_flags: readonly L12RolloutPhaseFlag[];
  readonly required_min_level: L12CertificationLevel;
}

export function evaluateL12RolloutGate(
  input: L12RolloutGateInput,
): L12RolloutGateDecision {
  const minLevel = L12_ROLLOUT_PHASE_MIN_CERT_LEVEL[input.candidate_phase];

  if (input.critical_breach_count > 0) {
    return {
      admitted: false,
      reason: `${input.critical_breach_count} critical breach(es) — gate closed`,
      missing_flags: [],
      required_min_level: minLevel,
    };
  }

  if (L12_CERTIFICATION_LEVEL_RANK[input.certification_level] <
      L12_CERTIFICATION_LEVEL_RANK[minLevel]) {
    return {
      admitted: false,
      reason: `level ${input.certification_level} below required ${minLevel}`,
      missing_flags: [],
      required_min_level: minLevel,
    };
  }

  const reqs = L12_ROLLOUT_PHASE_REQUIREMENTS[input.candidate_phase];
  const present = new Set(input.satisfied_flags);
  const missing = reqs.required_flags.filter(f => !present.has(f));

  if (missing.length > 0) {
    return {
      admitted: false,
      reason: `${missing.length} required flag(s) missing for ${input.candidate_phase}`,
      missing_flags: missing,
      required_min_level: minLevel,
    };
  }

  return {
    admitted: true,
    reason: `gate admits ${input.candidate_phase}`,
    missing_flags: [],
    required_min_level: minLevel,
  };
}
