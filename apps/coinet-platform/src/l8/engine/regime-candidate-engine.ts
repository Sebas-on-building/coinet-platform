/**
 * L8.4 — RegimeCandidateEngine
 *
 * §8.4.5.1-3 — Emits candidate regime classes only. It may not assign
 * `primary_regime` or `secondary_regime`; that is the exclusive duty of
 * the classification engine.
 */

import type { L8RegimeSubjectContract } from '../contracts/regime-subject.contract';
import type { L8RegimeClass } from '../contracts/regime-class';
import type { L8ResolvedRegimeInputSet } from '../runtime/regime-execution-context';
import type {
  L8RegimeCandidate,
  L8CandidateStrengthBand,
} from '../runtime/regime-execution-context';
import {
  getDefaultL8RegimeClassRegistry,
} from '../registry/regime-class.registry';
import {
  L8RuntimeViolation,
  L8RuntimeViolationCode,
} from '../validation/l8-runtime-violation-codes';
import { L8EngineResult, fail, ok } from './engine-types';

/**
 * Proposed candidate. Mirrors the runtime candidate object but omits
 * fields the engine itself derives (candidate_id, strength band,
 * lineage refs).
 */
export interface L8CandidateProposal {
  readonly regime_class: L8RegimeClass;
  readonly raw_strength_score: number;
  readonly supporting_surface_refs: readonly string[];
  readonly contradicting_surface_refs: readonly string[];
  readonly candidate_reason_codes: readonly string[];
  readonly template_ref: string;
}

export interface L8CandidateEngineInput {
  readonly subject: L8RegimeSubjectContract;
  readonly resolved_input_set: L8ResolvedRegimeInputSet;
  readonly proposals: readonly L8CandidateProposal[];
}

export function resolveCandidateStrengthBand(
  score: number,
): L8CandidateStrengthBand {
  if (!Number.isFinite(score) || score < 0) return 'LOW';
  if (score < 0.3) return 'LOW';
  if (score < 0.55) return 'MEDIUM';
  if (score < 0.85) return 'HIGH';
  return 'DOMINANT';
}

export function detectCandidates(
  input: L8CandidateEngineInput,
): L8EngineResult<readonly L8RegimeCandidate[]> {
  const violations: L8RuntimeViolation[] = [];
  const classRegistry = getDefaultL8RegimeClassRegistry();
  const subject = input.subject;
  const out: L8RegimeCandidate[] = [];

  const seen = new Set<L8RegimeClass>();
  for (const p of input.proposals) {
    if (!classRegistry.isRegistered(p.regime_class)) {
      violations.push(v(
        L8RuntimeViolationCode.CANDIDATE_UNREGISTERED_CLASS, subject,
        `unregistered candidate class ${p.regime_class}`,
        { regime_class: p.regime_class },
      ));
      continue;
    }
    if (!classRegistry.belongsToFamily(p.regime_class, subject.regime_family)) {
      violations.push(v(
        L8RuntimeViolationCode.CANDIDATE_CLASS_NOT_IN_FAMILY, subject,
        `candidate ${p.regime_class} not in family ${subject.regime_family}`,
        { regime_class: p.regime_class, family: subject.regime_family },
      ));
      continue;
    }
    if (!Number.isFinite(p.raw_strength_score) ||
        p.raw_strength_score < 0 || p.raw_strength_score > 1) {
      violations.push(v(
        L8RuntimeViolationCode.CANDIDATE_STRENGTH_OUT_OF_RANGE, subject,
        `candidate ${p.regime_class} strength OOR: ${p.raw_strength_score}`,
        { regime_class: p.regime_class, score: p.raw_strength_score },
      ));
      continue;
    }
    if (!p.candidate_reason_codes || p.candidate_reason_codes.length === 0) {
      violations.push(v(
        L8RuntimeViolationCode.CANDIDATE_MISSING_REASON, subject,
        `candidate ${p.regime_class} missing reason codes`,
        { regime_class: p.regime_class },
      ));
      continue;
    }
    if (seen.has(p.regime_class)) {
      violations.push(v(
        L8RuntimeViolationCode.CANDIDATE_NON_DETERMINISTIC, subject,
        `candidate class ${p.regime_class} emitted twice`,
        { regime_class: p.regime_class },
      ));
      continue;
    }
    seen.add(p.regime_class);

    const candidate: L8RegimeCandidate = {
      candidate_id:
        `cand:${subject.regime_subject_id}:${p.regime_class}`,
      regime_subject_id: subject.regime_subject_id,
      regime_family: subject.regime_family,
      regime_class: p.regime_class,
      candidate_strength_score: p.raw_strength_score,
      candidate_strength_band:
        resolveCandidateStrengthBand(p.raw_strength_score),
      supporting_surface_refs:
        [...p.supporting_surface_refs].sort(),
      contradicting_surface_refs:
        [...p.contradicting_surface_refs].sort(),
      candidate_reason_codes:
        [...p.candidate_reason_codes].sort(),
      template_ref: p.template_ref || subject.regime_template_id,
      lineage_refs: input.resolved_input_set.legal_support_refs.slice(0, 8),
    };
    out.push(candidate);
  }

  if (violations.length > 0) return fail(violations);

  // Deterministic ordering: by strength desc, then by class
  out.sort((a, b) => {
    if (a.candidate_strength_score !== b.candidate_strength_score) {
      return b.candidate_strength_score - a.candidate_strength_score;
    }
    return a.regime_class < b.regime_class ? -1 : 1;
  });

  return ok(out);
}

function v(
  code: L8RuntimeViolationCode,
  s: L8RegimeSubjectContract,
  detail: string,
  context: Record<string, unknown>,
): L8RuntimeViolation {
  return {
    code,
    source: 'regime-candidate-engine',
    nodeId: null,
    regime_run_id: null,
    regime_subject_id: s.regime_subject_id,
    detail,
    context,
  };
}
