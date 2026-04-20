/**
 * L9.4 — SequenceConfidenceEngine
 *
 * §9.4.14 — Builds the confidence handoff bundle from the
 * classification output. Confidence does not *compute* the final
 * confidence score here — L7 does that. This engine's job is to carry
 * the handoff payload and flag bundle-shape violations.
 */

import type {
  L9ClassificationOutput,
  L9ConfidenceHandoffBundle,
  L9LeadLagProfile,
} from '../runtime/sequence-execution-context';
import type { L9SequenceSubjectContract } from '../contracts/sequence-subject.contract';
import { L9LagContradictionPosture } from '../contracts/lead-lag-relation';
import {
  L9RuntimeViolation,
  L9RuntimeViolationCode,
} from '../validation/l9-runtime-violation-codes';
import { L9EngineResult, fail, ok } from './engine-types';

export interface L9ConfidenceEngineInput {
  readonly subject: L9SequenceSubjectContract;
  readonly classification: L9ClassificationOutput;
  readonly lead_lag: L9LeadLagProfile;
  readonly regime_refs: readonly string[];
  readonly evidence_refs: readonly string[];
  readonly chain_completeness: number;
}

export function buildConfidenceHandoff(
  input: L9ConfidenceEngineInput,
): L9EngineResult<L9ConfidenceHandoffBundle> {
  const violations: L9RuntimeViolation[] = [];
  const subjectId = input.subject.sequence_subject_id;
  const c = input.classification;

  if (!c) {
    violations.push(v(
      L9RuntimeViolationCode.CONFIDENCE_BEFORE_CLASSIFICATION,
      subjectId,
      'confidence bundle without classification',
    ));
  }

  if (c && c.ambiguity_score >= 0.3 &&
      c.coexistence_class === 'CLEAN_SINGLE') {
    violations.push(v(
      L9RuntimeViolationCode.CONFIDENCE_IGNORES_AMBIGUITY,
      subjectId,
      'confidence bundle propagates CLEAN_SINGLE with material ambiguity',
    ));
  }

  if (c && c.sequence_decay_score >= 0.6 &&
      c.coexistence_class === 'CLEAN_SINGLE') {
    violations.push(v(
      L9RuntimeViolationCode.CONFIDENCE_IGNORES_DECAY,
      subjectId,
      'confidence bundle propagates CLEAN_SINGLE with material decay',
    ));
  }

  const contradictionRefs = input.lead_lag.relations
    .filter(r => r.contradiction_posture !== L9LagContradictionPosture.NONE)
    .map(r => r.lead_lag_id)
    .sort();

  if (violations.length > 0) return fail(violations);

  return ok({
    sequence_subject_id: subjectId,
    classification_ref: `cls:${subjectId}:${c.primary_sequence_state}`,
    coexistence_class: c.coexistence_class,
    ambiguity_score: c.ambiguity_score,
    decay_class: c.sequence_decay_class,
    chain_completeness: clamp01(input.chain_completeness),
    contradiction_refs: contradictionRefs,
    regime_refs: [...input.regime_refs].sort(),
    evidence_refs: [...input.evidence_refs].sort(),
  });
}

function clamp01(x: number): number {
  if (!Number.isFinite(x) || x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function v(
  code: L9RuntimeViolationCode,
  subjectId: string,
  detail: string,
): L9RuntimeViolation {
  return {
    code,
    source: 'sequence-confidence-engine',
    nodeId: null,
    sequence_run_id: null,
    sequence_subject_id: subjectId,
    detail,
    context: {},
  };
}
