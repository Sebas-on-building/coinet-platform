/**
 * L10.4 — SupportEvidenceResolver
 *
 * §10.4.7 — Resolves, for each candidate, the governed lower-layer refs
 * that *support* the candidate's explanation. Never cross-contaminates
 * candidates; each candidate receives its own deterministically-ordered
 * support set.
 *
 * §10.4.7.3 — Stale/degraded surfaces must be routed to the dedicated
 * lists; they never get silently promoted into `supporting_refs`.
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
  L10HypothesisSupportSet,
} from '../runtime/hypothesis-execution-context';

export interface L10SupportObservation {
  readonly ref: string;
  readonly domain: string;
  readonly is_stale: boolean;
  readonly is_degraded: boolean;
}

export interface L10SupportResolutionInput {
  readonly candidate: L10HypothesisCandidateContract;
  readonly observations: readonly L10SupportObservation[];
  readonly required_refs: readonly string[];
  readonly trace_id: string;
  readonly manifest_id: string;
}

export function resolveSupportEvidence(
  input: L10SupportResolutionInput,
): L10EngineResult<L10HypothesisSupportSet> {
  const violations: L10RuntimeViolation[] = [];
  const c = input.candidate;

  const v = (
    code: L10RuntimeViolationCode,
    detail: string,
  ): L10RuntimeViolation => ({
    code,
    source: 'SupportEvidenceResolver',
    nodeId: null,
    hypothesis_run_id: null,
    hypothesis_subject_id: c.hypothesis_subject_id,
    hypothesis_candidate_id: c.hypothesis_candidate_id,
    detail,
    context: { candidate: c.hypothesis_candidate_id },
  });

  const supporting: string[] = [];
  const stale: string[] = [];
  const degraded: string[] = [];
  const domains = new Set<string>();
  const seen = new Set<string>();

  for (const o of input.observations) {
    if (seen.has(o.ref)) continue;
    seen.add(o.ref);
    if (o.is_stale) {
      stale.push(o.ref);
    } else if (o.is_degraded) {
      degraded.push(o.ref);
    } else {
      supporting.push(o.ref);
      domains.add(o.domain);
    }
  }
  supporting.sort();
  stale.sort();
  degraded.sort();

  const reqSet = new Set(input.required_refs);
  const missing: string[] = [];
  for (const r of reqSet) {
    if (!supporting.includes(r) && !stale.includes(r) &&
        !degraded.includes(r)) {
      missing.push(r);
    }
  }
  missing.sort();

  if (supporting.length === 0 && (stale.length + degraded.length) > 0) {
    // §10.4.7.5 — having stale/degraded-only must surface as MISSING_REQUIRED
    // when a support-strength score is later claimed nonzero.
    violations.push(v(
      L10RuntimeViolationCode.SUPPORT_MISSING_REQUIRED,
      'no clean supporting refs; only stale/degraded observations',
    ));
  }
  if (missing.length > 0) {
    violations.push(v(
      L10RuntimeViolationCode.SUPPORT_MISSING_REQUIRED,
      `missing required refs: ${missing.join(',')}`,
    ));
  }

  const strength = computeSupportStrength(supporting, stale, degraded);
  const coverage = computeSupportCoverage(supporting, reqSet);

  if (strength < 0 || strength > 1) {
    violations.push(v(
      L10RuntimeViolationCode.SUPPORT_SCORE_OUT_OF_RANGE,
      `support_strength_score out of [0,1]: ${strength}`,
    ));
  }
  if (coverage < 0 || coverage > 1) {
    violations.push(v(
      L10RuntimeViolationCode.SUPPORT_COVERAGE_OUT_OF_RANGE,
      `support_coverage_score out of [0,1]: ${coverage}`,
    ));
  }

  if (violations.length > 0) return fail(violations);

  const supportSet: L10HypothesisSupportSet = {
    support_set_id:
      `lhss:${c.hypothesis_candidate_id}:${c.candidate_contract_version}`,
    hypothesis_subject_id: c.hypothesis_subject_id,
    hypothesis_candidate_id: c.hypothesis_candidate_id,
    supporting_refs: supporting,
    support_domains: Array.from(domains).sort(),
    support_strength_score: strength,
    support_coverage_score: coverage,
    stale_support_refs: stale,
    degraded_support_refs: degraded,
    missing_expected_refs: missing,
    lineage_refs: {
      trace_id: input.trace_id,
      manifest_id: input.manifest_id,
      upstream_refs: [...supporting, ...stale, ...degraded].sort(),
    },
  };
  return ok(supportSet);
}

function computeSupportStrength(
  clean: readonly string[],
  stale: readonly string[],
  degraded: readonly string[],
): number {
  const total = clean.length + stale.length + degraded.length;
  if (total === 0) return 0;
  return Math.max(0, Math.min(1, clean.length / total));
}
function computeSupportCoverage(
  clean: readonly string[],
  required: ReadonlySet<string>,
): number {
  if (required.size === 0) return clean.length > 0 ? 1 : 0;
  let hits = 0;
  for (const r of required) if (clean.includes(r)) hits++;
  return Math.max(0, Math.min(1, hits / required.size));
}
