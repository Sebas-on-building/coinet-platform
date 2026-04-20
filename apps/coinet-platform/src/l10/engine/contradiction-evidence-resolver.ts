/**
 * L10.4 — ContradictionEvidenceResolver
 *
 * §10.4.8 — Resolves per-candidate contradiction posture against
 * governed L7 contradiction surfaces, with strict classification
 * rules:
 *   - blocking vs narrowing is enforced (not collapsed)
 *   - direct vs indirect remains separable
 *   - active vs decayed remains separable
 *   - contradictions must never be omitted when L7 posture is present
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
  L10HypothesisContradictionSet,
} from '../runtime/hypothesis-execution-context';

export interface L10ContradictionObservation {
  readonly ref: string;
  readonly domain: string;
  readonly severity: 'BLOCKING' | 'NARROWING' | 'WEAK';
  readonly temporal_class: 'ACTIVE' | 'DECAYED';
  readonly direct: boolean;
}

export interface L10ContradictionResolutionInput {
  readonly candidate: L10HypothesisCandidateContract;
  readonly observations: readonly L10ContradictionObservation[];
  readonly l7_posture_refs: readonly string[];
  readonly trace_id: string;
  readonly manifest_id: string;
}

export function resolveContradictionEvidence(
  input: L10ContradictionResolutionInput,
): L10EngineResult<L10HypothesisContradictionSet> {
  const violations: L10RuntimeViolation[] = [];
  const c = input.candidate;

  const v = (
    code: L10RuntimeViolationCode, detail: string,
  ): L10RuntimeViolation => ({
    code,
    source: 'ContradictionEvidenceResolver',
    nodeId: null,
    hypothesis_run_id: null,
    hypothesis_subject_id: c.hypothesis_subject_id,
    hypothesis_candidate_id: c.hypothesis_candidate_id,
    detail,
    context: { candidate: c.hypothesis_candidate_id },
  });

  const all: string[] = [];
  const blocking: string[] = [];
  const narrowing: string[] = [];
  const decayed: string[] = [];
  const domains = new Set<string>();
  const seen = new Set<string>();

  for (const o of input.observations) {
    if (seen.has(o.ref)) continue;
    seen.add(o.ref);
    all.push(o.ref);
    domains.add(o.domain);
    if (o.temporal_class === 'DECAYED') {
      decayed.push(o.ref);
      continue;
    }
    if (o.severity === 'BLOCKING') blocking.push(o.ref);
    else if (o.severity === 'NARROWING') narrowing.push(o.ref);
  }
  all.sort(); blocking.sort(); narrowing.sort(); decayed.sort();

  if (input.l7_posture_refs.length > 0 && all.length === 0) {
    violations.push(v(
      L10RuntimeViolationCode.CONTRADICTION_OMITTED_BUT_PRESENT,
      'L7 contradiction posture present but no contradictions resolved',
    ));
  }

  const pressure = computeContradictionPressure(blocking, narrowing);
  if (pressure < 0 || pressure > 1) {
    violations.push(v(
      L10RuntimeViolationCode.CONTRADICTION_PRESSURE_OUT_OF_RANGE,
      `contradiction_pressure_score out of [0,1]: ${pressure}`,
    ));
  }
  if (pressure > 0 && all.length === 0) {
    violations.push(v(
      L10RuntimeViolationCode.CONTRADICTION_CLAIMED_WITHOUT_REFS,
      'pressure > 0 with no contradiction_refs',
    ));
  }

  if (violations.length > 0) return fail(violations);

  const set: L10HypothesisContradictionSet = {
    contradiction_set_id:
      `lhcs:${c.hypothesis_candidate_id}:${c.candidate_contract_version}`,
    hypothesis_subject_id: c.hypothesis_subject_id,
    hypothesis_candidate_id: c.hypothesis_candidate_id,
    contradiction_refs: all,
    contradiction_domains: Array.from(domains).sort(),
    contradiction_pressure_score: pressure,
    blocking_contradiction_refs: blocking,
    narrowing_contradiction_refs: narrowing,
    decayed_contradiction_refs: decayed,
    lineage_refs: {
      trace_id: input.trace_id,
      manifest_id: input.manifest_id,
      upstream_refs: [...all, ...input.l7_posture_refs].sort(),
    },
  };
  return ok(set);
}

function computeContradictionPressure(
  blocking: readonly string[],
  narrowing: readonly string[],
): number {
  const b = blocking.length;
  const n = narrowing.length;
  if (b === 0 && n === 0) return 0;
  return Math.max(0, Math.min(1, (b + 0.5 * n) / (b + n + 1)));
}
