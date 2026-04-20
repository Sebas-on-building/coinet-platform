/**
 * L10.4 — InvalidationEngine
 *
 * §10.4.10 — For each candidate, compute invalidation posture:
 * active vs potential, and the resulting risk class. Active and
 * potential must never be silently merged; a material active signal
 * blocks clean emission.
 */

import type {
  L10HypothesisCandidateContract,
} from '../contracts/hypothesis-candidate.contract';
import {
  L10RuntimeViolation,
  L10RuntimeViolationCode,
} from '../validation/l10-runtime-violation-codes';
import { L10EngineResult, fail, ok } from './engine-types';
import type {
  L10HypothesisInvalidationSet,
} from '../runtime/hypothesis-execution-context';

export interface L10InvalidationObservation {
  readonly ref: string;
  readonly class: 'ACTIVE' | 'POTENTIAL';
}

export interface L10InvalidationInput {
  readonly candidate: L10HypothesisCandidateContract;
  readonly observations: readonly L10InvalidationObservation[];
  readonly trace_id: string;
  readonly manifest_id: string;
}

export function resolveInvalidationPosture(
  input: L10InvalidationInput,
): L10EngineResult<L10HypothesisInvalidationSet> {
  const violations: L10RuntimeViolation[] = [];
  const c = input.candidate;

  const v = (
    code: L10RuntimeViolationCode, detail: string,
  ): L10RuntimeViolation => ({
    code,
    source: 'InvalidationEngine',
    nodeId: null,
    hypothesis_run_id: null,
    hypothesis_subject_id: c.hypothesis_subject_id,
    hypothesis_candidate_id: c.hypothesis_candidate_id,
    detail,
    context: { candidate: c.hypothesis_candidate_id },
  });

  const all: string[] = [];
  const active: string[] = [];
  const potential: string[] = [];
  const seen = new Set<string>();

  for (const o of input.observations) {
    if (seen.has(o.ref)) continue;
    seen.add(o.ref);
    all.push(o.ref);
    if (o.class === 'ACTIVE') active.push(o.ref);
    else if (o.class === 'POTENTIAL') potential.push(o.ref);
  }
  all.sort(); active.sort(); potential.sort();

  const risk = computeRiskScore(active, potential);
  if (risk < 0 || risk > 1) {
    violations.push(v(
      L10RuntimeViolationCode.INVALIDATION_RISK_OUT_OF_RANGE,
      `invalidation_risk_score out of [0,1]: ${risk}`,
    ));
  }
  if (risk > 0 && all.length === 0) {
    violations.push(v(
      L10RuntimeViolationCode.INVALIDATION_RISK_CLAIMED_WITHOUT_REFS,
      'risk > 0 with no invalidation refs',
    ));
  }

  const riskClass: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNRESOLVED' =
    active.length > 0 ? 'HIGH' :
    potential.length > 2 ? 'MEDIUM' :
    potential.length > 0 ? 'LOW' : 'LOW';

  if (violations.length > 0) return fail(violations);

  const set: L10HypothesisInvalidationSet = {
    invalidation_set_id:
      `lhis:${c.hypothesis_candidate_id}:${c.candidate_contract_version}`,
    hypothesis_subject_id: c.hypothesis_subject_id,
    hypothesis_candidate_id: c.hypothesis_candidate_id,
    invalidation_signal_refs: all,
    active_invalidation_refs: active,
    potential_invalidation_refs: potential,
    invalidation_risk_score: risk,
    invalidation_risk_class: riskClass,
    lineage_refs: {
      trace_id: input.trace_id,
      manifest_id: input.manifest_id,
      upstream_refs: [...all].sort(),
    },
  };
  return ok(set);
}

function computeRiskScore(
  active: readonly string[],
  potential: readonly string[],
): number {
  const a = active.length;
  const p = potential.length;
  if (a === 0 && p === 0) return 0;
  return Math.max(0, Math.min(1, (a + 0.3 * p) / (a + p + 1)));
}
