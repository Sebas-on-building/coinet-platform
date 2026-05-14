/**
 * L12.2 — PathConfidenceProfile validator (§12.2.13.4).
 */

import {
  L12PathConfidenceBand,
  L12PathConfidenceProfile,
  isL12HighConfidenceBand,
  l12ConfidenceBandFor,
} from '../contracts/path-confidence-profile';
import {
  L12ObjectViolation,
  L12ObjectViolationCode,
} from './l12-object-violation-codes';

export interface L12PathConfidencePostureInputs {
  /** Whether any scenario in the set has an active invalidation. */
  readonly hasActiveInvalidation: boolean;
  /** Whether L7 contradiction is unresolved on the inputs. */
  readonly hasUnresolvedContradiction: boolean;
  /** Whether L11 missing-data profile is material. */
  readonly hasMaterialMissingVisibility: boolean;
  /** Whether L11 drift is critical. */
  readonly hasCriticalDrift: boolean;
}

export function validateL12PathConfidenceProfile(
  p: L12PathConfidenceProfile,
  posture: L12PathConfidencePostureInputs,
): readonly L12ObjectViolation[] {
  const v: L12ObjectViolation[] = [];
  const sid = p.path_confidence_profile_id || '<unknown>';

  if (
    typeof p.primary_path_confidence_score !== 'number' ||
    Number.isNaN(p.primary_path_confidence_score) ||
    p.primary_path_confidence_score < 0 ||
    p.primary_path_confidence_score > 1
  ) {
    v.push({
      code: L12ObjectViolationCode.L12O_CONFIDENCE_SCORE_OUT_OF_RANGE,
      subject_id: sid,
      detail: `primary_path_confidence_score out of range: ${p.primary_path_confidence_score}`,
    });
  }

  if (typeof p.confidence_spread_to_secondary !== 'number') {
    v.push({
      code: L12ObjectViolationCode.L12O_CONFIDENCE_SPREAD_MISSING,
      subject_id: sid,
      detail: 'confidence_spread_to_secondary required',
    });
  }

  if (!p.readiness_class) {
    v.push({
      code: L12ObjectViolationCode.L12O_READINESS_MISSING,
      subject_id: sid,
      detail: 'readiness_class required',
    });
  }

  if (!p.lineage_refs || p.lineage_refs.length === 0) {
    v.push({
      code: L12ObjectViolationCode.L12O_LINEAGE_REFS_MISSING,
      subject_id: sid,
      detail: 'lineage_refs required',
    });
  }

  if (!p.replay_hash) {
    v.push({
      code: L12ObjectViolationCode.L12O_REPLAY_HASH_MISSING,
      subject_id: sid,
      detail: 'replay_hash required',
    });
  }

  // Band/score consistency
  if (
    p.primary_path_confidence_band !== undefined &&
    p.primary_path_confidence_score >= 0 &&
    p.primary_path_confidence_score <= 1
  ) {
    const computed = l12ConfidenceBandFor(p.primary_path_confidence_score);
    if (computed !== p.primary_path_confidence_band) {
      v.push({
        code: L12ObjectViolationCode.L12O_CONFIDENCE_BAND_MISMATCH,
        subject_id: sid,
        detail: `band mismatch: declared=${p.primary_path_confidence_band} computed=${computed} (score=${p.primary_path_confidence_score})`,
      });
    }
  }

  // Per-scenario confidences in [0,1]
  for (const [scenId, score] of Object.entries(p.scenario_confidences ?? {})) {
    if (typeof score !== 'number' || Number.isNaN(score) || score < 0 || score > 1) {
      v.push({
        code: L12ObjectViolationCode.L12O_CONFIDENCE_SCORE_OUT_OF_RANGE,
        subject_id: sid,
        detail: `scenario_confidences[${scenId}] out of range: ${score}`,
      });
    }
  }

  // High confidence under blocking posture
  const isHigh = p.primary_path_confidence_band !== undefined
    ? isL12HighConfidenceBand(p.primary_path_confidence_band)
    : false;

  if (isHigh && posture.hasActiveInvalidation) {
    v.push({
      code: L12ObjectViolationCode.L12O_HIGH_CONFIDENCE_WITH_ACTIVE_INVALIDATION,
      subject_id: sid,
      detail: 'high confidence with active invalidation is illegal',
    });
  }
  if (isHigh && posture.hasUnresolvedContradiction) {
    v.push({
      code: L12ObjectViolationCode.L12O_HIGH_CONFIDENCE_WITH_UNRESOLVED_CONTRADICTION,
      subject_id: sid,
      detail: 'high confidence with unresolved L7 contradiction is illegal',
    });
  }
  if (isHigh && posture.hasMaterialMissingVisibility) {
    v.push({
      code: L12ObjectViolationCode.L12O_HIGH_CONFIDENCE_WITH_MISSING_VISIBILITY,
      subject_id: sid,
      detail: 'high confidence with material missing visibility is illegal',
    });
  }
  if (isHigh && posture.hasCriticalDrift) {
    v.push({
      code: L12ObjectViolationCode.L12O_HIGH_CONFIDENCE_WITH_CRITICAL_DRIFT,
      subject_id: sid,
      detail: 'high confidence with critical drift is illegal',
    });
  }

  return v;
}

/** Helper used by other validators / tests. */
export function l12ResolveBand(score: number): L12PathConfidenceBand {
  return l12ConfidenceBandFor(score);
}
