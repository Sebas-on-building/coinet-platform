/**
 * L10.4 — ConfirmationRequirementEngine
 *
 * §10.4.9 — For each candidate, compute which confirmation patterns are
 * still required but not yet present. Confirmation *gap* is first-class:
 * high-conviction emission with a material gap is forbidden.
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
  L10HypothesisConfirmationSet,
} from '../runtime/hypothesis-execution-context';

export interface L10ConfirmationObservation {
  readonly required_pattern_id: string;
  readonly present_ref: string | null;
}

export interface L10ConfirmationInput {
  readonly candidate: L10HypothesisCandidateContract;
  readonly observations: readonly L10ConfirmationObservation[];
  readonly trace_id: string;
  readonly manifest_id: string;
}

export function resolveConfirmationRequirements(
  input: L10ConfirmationInput,
): L10EngineResult<L10HypothesisConfirmationSet> {
  const violations: L10RuntimeViolation[] = [];
  const c = input.candidate;

  const v = (
    code: L10RuntimeViolationCode, detail: string,
  ): L10RuntimeViolation => ({
    code,
    source: 'ConfirmationRequirementEngine',
    nodeId: null,
    hypothesis_run_id: null,
    hypothesis_subject_id: c.hypothesis_subject_id,
    hypothesis_candidate_id: c.hypothesis_candidate_id,
    detail,
    context: { candidate: c.hypothesis_candidate_id },
  });

  const required: string[] = [];
  const present: string[] = [];
  const missing: string[] = [];
  const seen = new Set<string>();

  for (const o of input.observations) {
    if (seen.has(o.required_pattern_id)) continue;
    seen.add(o.required_pattern_id);
    required.push(o.required_pattern_id);
    if (o.present_ref) present.push(o.present_ref);
    else missing.push(o.required_pattern_id);
  }
  required.sort(); present.sort(); missing.sort();

  const totalExpected = c.required_confirmation_patterns?.length ?? 0;
  if (required.length < totalExpected) {
    violations.push(v(
      L10RuntimeViolationCode.CONFIRMATION_REQUIRED_VS_PRESENT_COLLAPSED,
      `expected ${totalExpected} confirmation patterns, observed ${required.length}`,
    ));
  }

  const gap = required.length === 0
    ? 0
    : Math.max(0, Math.min(1, missing.length / required.length));
  if (gap < 0 || gap > 1) {
    violations.push(v(
      L10RuntimeViolationCode.CONFIRMATION_GAP_OUT_OF_RANGE,
      `confirmation_gap_score out of [0,1]: ${gap}`,
    ));
  }

  if (violations.length > 0) return fail(violations);

  const set: L10HypothesisConfirmationSet = {
    confirmation_set_id:
      `lhcfs:${c.hypothesis_candidate_id}:${c.candidate_contract_version}`,
    hypothesis_subject_id: c.hypothesis_subject_id,
    hypothesis_candidate_id: c.hypothesis_candidate_id,
    required_confirmation_refs: required,
    present_confirmation_refs: present,
    missing_confirmation_refs: missing,
    confirmation_gap_score: gap,
    lineage_refs: {
      trace_id: input.trace_id,
      manifest_id: input.manifest_id,
      upstream_refs: [...required, ...present].sort(),
    },
  };
  return ok(set);
}
