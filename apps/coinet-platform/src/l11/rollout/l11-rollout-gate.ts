/**
 * L11.9 — Rollout Gate (§11.9.15.2)
 *
 * Pure decision: given a candidate rollout phase, the current
 * certification level, and the set of satisfied phase flags,
 * return whether the gate admits transition.
 */

import {
  L11CertificationLevel,
  L11_CERTIFICATION_LEVEL_RANK,
} from '../contracts/l11-ratification-artifact';
import {
  L11RolloutPhase,
  L11RolloutPhaseFlag,
  L11_ROLLOUT_PHASE_REQUIREMENTS,
  L11_ROLLOUT_PHASE_MIN_CERT_LEVEL,
} from './l11-rollout-phase';

export interface L11RolloutGateInput {
  readonly candidate_phase: L11RolloutPhase;
  readonly certification_level: L11CertificationLevel;
  readonly critical_breach_count: number;
  readonly satisfied_flags: readonly L11RolloutPhaseFlag[];
}

export interface L11RolloutGateDecision {
  readonly admitted: boolean;
  readonly reason: string;
  readonly missing_flags: readonly L11RolloutPhaseFlag[];
}

export function evaluateL11RolloutGate(
  input: L11RolloutGateInput,
): L11RolloutGateDecision {
  if (input.critical_breach_count > 0) {
    return {
      admitted: false,
      reason: `${input.critical_breach_count} critical breach(es) — gate closed`,
      missing_flags: [],
    };
  }

  const minLevel = L11_ROLLOUT_PHASE_MIN_CERT_LEVEL[input.candidate_phase];
  if (L11_CERTIFICATION_LEVEL_RANK[input.certification_level] <
      L11_CERTIFICATION_LEVEL_RANK[minLevel]) {
    return {
      admitted: false,
      reason: `certification level ${input.certification_level} below required ${minLevel}`,
      missing_flags: [],
    };
  }

  const reqs = L11_ROLLOUT_PHASE_REQUIREMENTS[input.candidate_phase];
  const present = new Set(input.satisfied_flags);
  const missing = reqs.required_flags.filter(f => !present.has(f));
  if (missing.length > 0) {
    return {
      admitted: false,
      reason: `${missing.length} required rollout flag(s) missing for ${input.candidate_phase}`,
      missing_flags: missing,
    };
  }

  return {
    admitted: true,
    reason: `gate admits ${input.candidate_phase}`,
    missing_flags: [],
  };
}
