/**
 * L12.5 — Invalidation strength engine (§12.5.12).
 *
 * Derives a deterministic `L12InvalidationStrengthProfile`. Invalidation
 * strength dominates trigger strength: active strong invalidation must
 * force a confidence cap; blocking invalidation forces VERY_LOW band.
 */

import {
  L12InvalidationStrengthBand,
  L12InvalidationStrengthProfile,
  l12InvalidationStrengthBandFor,
  l12MaxConfidenceForActiveInvalidation,
} from '../contracts/invalidation-strength-profile';
import { buildL12ScenarioReplayHash } from '../contracts/scenario-ids';
import {
  L12InvalidationEffect,
  L12InvalidationStatus,
  isL12ActiveInvalidationStatus,
} from '../contracts/scenario-invalidation';

export interface L12InvalidationStrengthInput {
  readonly invalidation_id: string;
  readonly scenario_id: string;
  readonly scenario_set_id: string;

  readonly invalidation_status: L12InvalidationStatus;
  readonly expected_effect: L12InvalidationEffect;

  readonly invalidation_evidence_quality: number;
  readonly invalidation_freshness_score: number;
  readonly invalidation_monitorability_score: number;
  readonly invalidation_materiality_score: number;
  readonly contradiction_pressure_score: number;

  readonly lineage_refs?: readonly string[];

  readonly policy_version: string;
}

export interface L12InvalidationStrengthEngineResult {
  readonly ok: boolean;
  readonly profile?: L12InvalidationStrengthProfile;
  readonly issues: readonly string[];
}

const INV_FACTOR_WEIGHTS = {
  evidence: 0.30,
  materiality: 0.25,
  monitorability: 0.20,
  freshness: 0.15,
  contradiction: 0.10,
} as const;

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

export function computeL12InvalidationStrengthProfile(
  inp: L12InvalidationStrengthInput,
): L12InvalidationStrengthEngineResult {
  const issues: string[] = [];
  if (!inp.invalidation_id) issues.push('invalidation_id missing');
  if (!inp.scenario_id) issues.push('scenario_id missing');

  const evidence = clamp01(inp.invalidation_evidence_quality);
  const materiality = clamp01(inp.invalidation_materiality_score);
  const monitor = clamp01(inp.invalidation_monitorability_score);
  const freshness = clamp01(inp.invalidation_freshness_score);
  const contradiction = clamp01(inp.contradiction_pressure_score);

  const score = clamp01(
    INV_FACTOR_WEIGHTS.evidence * evidence +
      INV_FACTOR_WEIGHTS.materiality * materiality +
      INV_FACTOR_WEIGHTS.monitorability * monitor +
      INV_FACTOR_WEIGHTS.freshness * freshness +
      INV_FACTOR_WEIGHTS.contradiction * contradiction,
  );

  const band = l12InvalidationStrengthBandFor(score);
  const isActive = isL12ActiveInvalidationStatus(inp.invalidation_status);
  const isBlocking =
    inp.invalidation_status === L12InvalidationStatus.BLOCKING ||
    band === L12InvalidationStrengthBand.BLOCKING;

  // Active invalidation w/o evidence or unmonitorable → record issue
  if (isActive && evidence < 0.3) {
    issues.push('active invalidation lacks evidence');
  }
  if (isActive && monitor < 0.3) {
    issues.push('active invalidation unmonitorable');
  }

  const cap_required =
    isActive ||
    band === L12InvalidationStrengthBand.MATERIAL ||
    band === L12InvalidationStrengthBand.STRONG ||
    band === L12InvalidationStrengthBand.BLOCKING;
  const max_band_if_active = l12MaxConfidenceForActiveInvalidation(band);

  const lineage = [...(inp.lineage_refs ?? []), `invalidation:${inp.invalidation_id}`].sort();
  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.5.invalidation_strength',
    policy_version: inp.policy_version,
    material: {
      invalidation_id: inp.invalidation_id,
      scenario_id: inp.scenario_id,
      score,
      band,
      isActive,
      isBlocking,
      cap_required,
      max_band_if_active,
      effect: inp.expected_effect,
      status: inp.invalidation_status,
    },
  });

  const profile: L12InvalidationStrengthProfile = {
    invalidation_strength_profile_id: `l12.invalidation_strength.${inp.invalidation_id}`,
    invalidation_id: inp.invalidation_id,
    scenario_id: inp.scenario_id,
    scenario_set_id: inp.scenario_set_id,
    invalidation_strength_score: score,
    invalidation_strength_band: band,
    invalidation_evidence_quality: evidence,
    invalidation_freshness_score: freshness,
    invalidation_monitorability_score: monitor,
    invalidation_materiality_score: materiality,
    contradiction_pressure_score: contradiction,
    expected_effect: inp.expected_effect,
    is_active: isActive,
    is_blocking: isBlocking,
    confidence_cap_required: cap_required,
    max_confidence_band_if_active: max_band_if_active,
    lineage_refs: lineage,
    replay_hash,
    policy_version: inp.policy_version,
  };

  return { ok: issues.length === 0, profile, issues };
}
