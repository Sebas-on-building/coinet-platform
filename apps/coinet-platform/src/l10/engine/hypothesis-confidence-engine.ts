/**
 * L10.4 — HypothesisConfidenceEngine
 *
 * §10.4.11 — Derives per-candidate confidence from the four evidence
 * postures (support, contradiction, confirmation, invalidation) plus
 * governed lower-layer posture (L7 confidence / restriction, L8
 * regime, L9 sequence). This engine *never* assigns primary/secondary
 * (that belongs to `HypothesisRankingEngine`) and *never* computes
 * spread (that belongs to `SpreadAnalysisEngine`) — exclusive-ownership
 * law (§10.4.16.2).
 */

import {
  L10HypothesisConfidenceBand,
} from '../contracts/hypothesis-assessment';
import {
  L10RuntimeViolation,
  L10RuntimeViolationCode,
} from '../validation/l10-runtime-violation-codes';
import { L10EngineResult, fail, ok } from './engine-types';
import type {
  L10HypothesisCandidateConfidence,
  L10HypothesisCandidateInstance,
  L10HypothesisConfirmationSet,
  L10HypothesisContradictionSet,
  L10HypothesisInvalidationSet,
  L10HypothesisSupportSet,
} from '../runtime/hypothesis-execution-context';

export interface L10LowerLayerPostureSnapshot {
  readonly l7_confidence_score: number;
  readonly l7_restriction_band:
    | 'FULL' | 'NORMAL' | 'NARROWED' | 'RESTRICTED';
  readonly l8_regime_stable: boolean;
  readonly l9_sequence_intact: boolean;
}

export interface L10ConfidenceInput {
  readonly candidate: L10HypothesisCandidateInstance;
  readonly support: L10HypothesisSupportSet;
  readonly contradiction: L10HypothesisContradictionSet;
  readonly confirmation: L10HypothesisConfirmationSet;
  readonly invalidation: L10HypothesisInvalidationSet;
  readonly lower_layer: L10LowerLayerPostureSnapshot;
  readonly trace_id: string;
  readonly manifest_id: string;
}

export function computeHypothesisConfidence(
  input: L10ConfidenceInput,
): L10EngineResult<L10HypothesisCandidateConfidence> {
  const violations: L10RuntimeViolation[] = [];
  const c = input.candidate;
  const v = (
    code: L10RuntimeViolationCode, detail: string,
  ): L10RuntimeViolation => ({
    code,
    source: 'HypothesisConfidenceEngine',
    nodeId: null,
    hypothesis_run_id: null,
    hypothesis_subject_id: c.hypothesis_subject_id,
    hypothesis_candidate_id: c.hypothesis_candidate_id,
    detail,
    context: { candidate: c.hypothesis_candidate_id },
  });

  // §10.4.11.4 — refuse to ignore input surfaces
  if (input.contradiction.contradiction_pressure_score > 0 &&
      input.support.support_strength_score >= 0.95) {
    violations.push(v(
      L10RuntimeViolationCode.CONFIDENCE_IGNORES_CONTRADICTION,
      'claimed near-perfect support while contradiction pressure is nonzero',
    ));
  }

  const supp = clamp01(input.support.support_strength_score);
  const cov = clamp01(input.support.support_coverage_score);
  const press = clamp01(input.contradiction.contradiction_pressure_score);
  const gap = clamp01(input.confirmation.confirmation_gap_score);
  const risk = clamp01(input.invalidation.invalidation_risk_score);
  const l7 = clamp01(input.lower_layer.l7_confidence_score);
  const regimeMult = input.lower_layer.l8_regime_stable ? 1 : 0.8;
  const seqMult = input.lower_layer.l9_sequence_intact ? 1 : 0.8;

  const base = 0.4 * supp + 0.2 * cov;
  const penalty = 0.3 * press + 0.2 * gap + 0.3 * risk;
  let score = clamp01((base - penalty) * l7 * regimeMult * seqMult);

  const caps: string[] = [];
  if (input.invalidation.invalidation_risk_class === 'HIGH') {
    score = Math.min(score, 0.4);
    caps.push('CAP:HIGH_INVALIDATION');
  }
  if (input.contradiction.blocking_contradiction_refs.length > 0) {
    score = Math.min(score, 0.5);
    caps.push('CAP:BLOCKING_CONTRADICTION');
  }
  if (input.lower_layer.l7_restriction_band === 'RESTRICTED') {
    score = Math.min(score, 0.3);
    caps.push('CAP:RESTRICTED_BAND');
  }
  if (input.lower_layer.l7_restriction_band === 'NARROWED') {
    score = Math.min(score, 0.6);
    caps.push('CAP:NARROWED_BAND');
  }

  if (score < 0 || score > 1) {
    violations.push(v(
      L10RuntimeViolationCode.CONFIDENCE_SCORE_OUT_OF_RANGE,
      `hypothesis_confidence_score out of [0,1]: ${score}`,
    ));
  }

  const band: L10HypothesisConfidenceBand =
    score >= 0.85 ? L10HypothesisConfidenceBand.FULL :
    score >= 0.65 ? L10HypothesisConfidenceBand.HIGH :
    score >= 0.35 ? L10HypothesisConfidenceBand.MODERATE :
    L10HypothesisConfidenceBand.LOW;

  if ((band === L10HypothesisConfidenceBand.HIGH ||
       band === L10HypothesisConfidenceBand.FULL) && gap > 0.4) {
    violations.push(v(
      L10RuntimeViolationCode.CONFIRMATION_HIGH_CONVICTION_DESPITE_GAP,
      'high-conviction band with material confirmation gap',
    ));
  }

  if (violations.length > 0) return fail(violations);

  const readiness: L10HypothesisCandidateConfidence['readiness_hint'] =
    input.invalidation.invalidation_risk_class === 'HIGH' ? 'BLOCKED' :
    caps.length > 0 ? 'CAPPED' :
    gap > 0.5 ? 'MODIFIER_REQUIRED' :
    (press > 0.4 || risk > 0.4) ? 'DEGRADED' :
    'READY';

  const conf: L10HypothesisCandidateConfidence = {
    confidence_id: `lhcconf:${c.hypothesis_candidate_id}`,
    hypothesis_subject_id: c.hypothesis_subject_id,
    hypothesis_candidate_id: c.hypothesis_candidate_id,
    hypothesis_confidence_score: round6(score),
    hypothesis_confidence_band: band,
    factor_breakdown: {
      support_strength: round6(supp),
      support_coverage: round6(cov),
      contradiction_pressure: round6(press),
      confirmation_gap: round6(gap),
      invalidation_risk: round6(risk),
      l7_confidence: round6(l7),
      l8_regime_multiplier: regimeMult,
      l9_sequence_multiplier: seqMult,
    },
    cap_chain: caps.sort(),
    readiness_hint: readiness,
    lineage_refs: {
      trace_id: input.trace_id,
      manifest_id: input.manifest_id,
      upstream_refs: [
        input.support.support_set_id,
        input.contradiction.contradiction_set_id,
        input.confirmation.confirmation_set_id,
        input.invalidation.invalidation_set_id,
      ].sort(),
    },
  };
  return ok(conf);
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}
function round6(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}
