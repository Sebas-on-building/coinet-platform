/**
 * L8.4 — RegimeEvidencePackBuilder
 *
 * §8.4.7.1 — Assembles a deterministic evidence bundle containing
 * subject identity, candidate set, transition/quality output refs,
 * consumed L7 validation refs, supporting/contradicting surface refs,
 * and confidence/multiplier anchor refs.
 */

import type { L8RegimeSubjectContract } from '../contracts/regime-subject.contract';
import type {
  L8RegimeCandidate,
  L8TransitionOutput,
  L8QualityOutput,
  L8ClassificationOutput,
  L8RegimeEvidencePack,
} from '../runtime/regime-execution-context';
import type { L8RegimeConfidenceContract } from '../contracts/regime-confidence.contract';
import type {
  L8RegimeMultiplierProfileContract,
} from '../contracts/regime-multiplier-profile.contract';
import {
  L8RuntimeViolation,
  L8RuntimeViolationCode,
} from '../validation/l8-runtime-violation-codes';
import { L8EngineResult, fail, ok } from './engine-types';

export interface L8EvidencePackInput {
  readonly subject: L8RegimeSubjectContract;
  readonly regime_result_id: string;
  readonly candidates: readonly L8RegimeCandidate[];
  readonly transition: L8TransitionOutput;
  readonly qualities: readonly L8QualityOutput[];
  readonly classification: L8ClassificationOutput;
  readonly confidence: L8RegimeConfidenceContract;
  readonly multiplier: L8RegimeMultiplierProfileContract;
  readonly consumed_validation_refs: readonly string[];
  readonly input_snapshot_ref: string;
  readonly compute_run_lineage: readonly string[];
}

export function buildRegimeEvidencePack(
  input: L8EvidencePackInput,
): L8EngineResult<L8RegimeEvidencePack> {
  const violations: L8RuntimeViolation[] = [];
  const s = input.subject;

  if (input.candidates.length === 0) {
    violations.push(v(
      L8RuntimeViolationCode.EVIDENCE_PACK_MISSING_CANDIDATES, s,
      'evidence pack missing candidates', {},
    ));
  }

  const qualityDomains = new Set(input.qualities.map(q => q.domain));
  const expectedDomains: readonly L8QualityOutput['domain'][] =
    ['AMBIGUITY', 'STALENESS', 'DEGRADATION'];
  for (const d of expectedDomains) {
    if (!qualityDomains.has(d)) {
      violations.push(v(
        L8RuntimeViolationCode.EVIDENCE_PACK_MISSING_QUALITY, s,
        `evidence pack missing quality domain ${d}`, { domain: d },
      ));
    }
  }

  if (!input.classification || !input.confidence || !input.multiplier) {
    violations.push(v(
      L8RuntimeViolationCode.EVIDENCE_PACK_INCOMPLETE, s,
      'evidence pack missing classification/confidence/multiplier refs', {},
    ));
  }

  if (!input.input_snapshot_ref) {
    violations.push(v(
      L8RuntimeViolationCode.EVIDENCE_PACK_MISSING_LINEAGE, s,
      'input_snapshot_ref missing', {},
    ));
  }

  if (input.compute_run_lineage.length === 0) {
    violations.push(v(
      L8RuntimeViolationCode.EVIDENCE_PACK_MISSING_LINEAGE, s,
      'compute_run_lineage empty', {},
    ));
  }

  if (violations.length > 0) return fail(violations);

  const supporting = Array.from(new Set(
    input.candidates.flatMap(c => c.supporting_surface_refs),
  )).sort();
  const contradicting = Array.from(new Set(
    input.candidates.flatMap(c => c.contradicting_surface_refs),
  )).sort();

  const ambiguity = input.qualities.find(q => q.domain === 'AMBIGUITY')!;
  const staleness = input.qualities.find(q => q.domain === 'STALENESS')!;
  const degradation = input.qualities.find(q => q.domain === 'DEGRADATION')!;

  const pack: L8RegimeEvidencePack = {
    evidence_pack_id: `repack:${input.regime_result_id}`,
    regime_subject_id: s.regime_subject_id,
    candidate_refs: input.candidates.map(c => c.candidate_id).sort(),
    transition_ref: `rtrans:${input.regime_result_id}`,
    ambiguity_ref: `rqual:ambiguity:${input.regime_result_id}`,
    staleness_ref: `rqual:staleness:${input.regime_result_id}`,
    degradation_ref: `rqual:degradation:${input.regime_result_id}`,
    classification_ref: `rclass:${input.regime_result_id}`,
    confidence_ref: input.confidence.confidence_assessment_id,
    multiplier_ref: input.multiplier.multiplier_profile_id,
    consumed_validation_refs: [...input.consumed_validation_refs].sort(),
    supporting_surface_refs: supporting,
    contradicting_surface_refs: contradicting,
    input_snapshot_ref: input.input_snapshot_ref,
    compute_run_lineage: [...input.compute_run_lineage].sort(),
    replay_hash:
      `rhash:pack:${input.regime_result_id}:${ambiguity.score.toFixed(2)}:${staleness.score.toFixed(2)}:${degradation.score.toFixed(2)}`,
  };

  return ok(pack);
}

function v(
  code: L8RuntimeViolationCode,
  s: L8RegimeSubjectContract,
  detail: string,
  context: Record<string, unknown>,
): L8RuntimeViolation {
  return {
    code,
    source: 'regime-evidence-pack-builder',
    nodeId: null,
    regime_run_id: null,
    regime_subject_id: s.regime_subject_id,
    detail,
    context,
  };
}
