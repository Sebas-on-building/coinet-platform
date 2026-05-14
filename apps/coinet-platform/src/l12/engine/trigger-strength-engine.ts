/**
 * L12.5 — Trigger strength engine (§12.5.11).
 *
 * Derives a deterministic `L12TriggerStrengthProfile` from a trigger plus
 * governed factor inputs. Pure function — no I/O. Caller supplies factor
 * scores (evidence quality, freshness, monitorability, materiality,
 * contradiction pressure, score-context support). The engine combines them
 * via a fixed weighted-mean and bands the result.
 */

import {
  buildL12ScenarioReplayHash,
} from '../contracts/scenario-ids';
import { L12TriggerEffect, L12TriggerStatus } from '../contracts/scenario-trigger';
import {
  L12TriggerConfidenceEffect,
  L12TriggerStrengthBand,
  L12TriggerStrengthProfile,
  l12TriggerStrengthBandFor,
} from '../contracts/trigger-strength-profile';

export interface L12TriggerStrengthInput {
  readonly trigger_id: string;
  readonly scenario_id: string;
  readonly scenario_set_id: string;

  readonly trigger_status: L12TriggerStatus;
  readonly expected_effect: L12TriggerEffect;

  readonly trigger_evidence_quality: number;
  readonly trigger_freshness_score: number;
  readonly trigger_monitorability_score: number;
  readonly trigger_materiality_score: number;
  readonly contradiction_pressure_score: number;
  readonly score_context_support_score: number;

  readonly lineage_refs?: readonly string[];

  readonly policy_version: string;
}

export interface L12TriggerStrengthEngineResult {
  readonly ok: boolean;
  readonly profile?: L12TriggerStrengthProfile;
  readonly issues: readonly string[];
}

/** Fixed v1 weights for the 6 trigger factors. Sum = 1.0. */
const TRIGGER_FACTOR_WEIGHTS = {
  evidence: 0.30,
  monitorability: 0.20,
  materiality: 0.18,
  freshness: 0.12,
  score_context_support: 0.12,
  // contradiction pressure subtracts:
  contradiction_pressure: 0.08,
} as const;

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function effectToConfidenceEffect(e: L12TriggerEffect): L12TriggerConfidenceEffect {
  switch (e) {
    case L12TriggerEffect.STRENGTHENS_PRIMARY:
    case L12TriggerEffect.CONFIRMS_RECOVERY:
      return L12TriggerConfidenceEffect.RAISES_PRIMARY_CONFIDENCE;
    case L12TriggerEffect.WEAKENS_PRIMARY:
    case L12TriggerEffect.ESCALATES_FAILURE:
    case L12TriggerEffect.COLLAPSES_BASE_CASE:
      return L12TriggerConfidenceEffect.LOWERS_PRIMARY_CONFIDENCE;
    case L12TriggerEffect.PROMOTES_SECONDARY:
      return L12TriggerConfidenceEffect.PROMOTES_SECONDARY_CONFIDENCE;
    case L12TriggerEffect.WATCH_ONLY:
      return L12TriggerConfidenceEffect.CONFIDENCE_WATCH_ONLY;
    default:
      return L12TriggerConfidenceEffect.CONFIDENCE_NEUTRAL;
  }
}

export function computeL12TriggerStrengthProfile(
  inp: L12TriggerStrengthInput,
): L12TriggerStrengthEngineResult {
  const issues: string[] = [];
  if (!inp.trigger_id) issues.push('trigger_id missing');
  if (!inp.scenario_id) issues.push('scenario_id missing');
  if (!inp.scenario_set_id) issues.push('scenario_set_id missing');

  const evidence = clamp01(inp.trigger_evidence_quality);
  const monitor = clamp01(inp.trigger_monitorability_score);
  const materiality = clamp01(inp.trigger_materiality_score);
  const freshness = clamp01(inp.trigger_freshness_score);
  const scoreSupport = clamp01(inp.score_context_support_score);
  const contradiction = clamp01(inp.contradiction_pressure_score);

  // Weighted sum minus contradiction pressure; clamp to [0, 1].
  const positive =
    TRIGGER_FACTOR_WEIGHTS.evidence * evidence +
    TRIGGER_FACTOR_WEIGHTS.monitorability * monitor +
    TRIGGER_FACTOR_WEIGHTS.materiality * materiality +
    TRIGGER_FACTOR_WEIGHTS.freshness * freshness +
    TRIGGER_FACTOR_WEIGHTS.score_context_support * scoreSupport;
  const score = clamp01(positive - TRIGGER_FACTOR_WEIGHTS.contradiction_pressure * contradiction);

  let band = l12TriggerStrengthBandFor(score);

  // Decisive trigger illegal when evidence weak or unmonitorable
  if (band === L12TriggerStrengthBand.DECISIVE && evidence < 0.7) {
    issues.push('decisive trigger with weak evidence');
    band = L12TriggerStrengthBand.STRONG;
  }
  if (band === L12TriggerStrengthBand.DECISIVE && monitor < 0.5) {
    issues.push('decisive trigger while unmonitorable');
    band = L12TriggerStrengthBand.STRONG;
  }
  if (band === L12TriggerStrengthBand.STRONG && monitor < 0.3 &&
      (inp.trigger_status === L12TriggerStatus.ACTIVE ||
       inp.trigger_status === L12TriggerStatus.PARTIALLY_ACTIVE)) {
    issues.push('strong trigger while unmonitorable and active');
  }

  const lineage = [...(inp.lineage_refs ?? []), `trigger:${inp.trigger_id}`].sort();
  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.5.trigger_strength',
    policy_version: inp.policy_version,
    material: {
      trigger_id: inp.trigger_id,
      scenario_id: inp.scenario_id,
      scenario_set_id: inp.scenario_set_id,
      score,
      band,
      evidence,
      monitor,
      materiality,
      freshness,
      scoreSupport,
      contradiction,
      effect: inp.expected_effect,
      status: inp.trigger_status,
    },
  });

  const profile: L12TriggerStrengthProfile = {
    trigger_strength_profile_id: `l12.trigger_strength.${inp.trigger_id}`,
    trigger_id: inp.trigger_id,
    scenario_id: inp.scenario_id,
    scenario_set_id: inp.scenario_set_id,
    trigger_strength_score: score,
    trigger_strength_band: band,
    trigger_evidence_quality: evidence,
    trigger_freshness_score: freshness,
    trigger_monitorability_score: monitor,
    trigger_materiality_score: materiality,
    contradiction_pressure_score: contradiction,
    score_context_support_score: scoreSupport,
    expected_effect: inp.expected_effect,
    confidence_effect: effectToConfidenceEffect(inp.expected_effect),
    lineage_refs: lineage,
    replay_hash,
    policy_version: inp.policy_version,
  };

  return { ok: issues.length === 0, profile, issues };
}
