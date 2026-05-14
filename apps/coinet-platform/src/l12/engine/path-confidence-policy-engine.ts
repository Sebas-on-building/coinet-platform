/**
 * L12.5 — Path-confidence policy engine (§12.5.13, §12.5.14).
 *
 * Computes per-scenario path confidence:
 *   1. weighted-aggregate from policy weights × directions × factor scores
 *   2. cap chain: priority-ordered downward caps under adverse posture
 *
 * The engine is pure: callers supply factor scores and posture flags and
 * receive the deterministic cap-chain.
 */

import {
  L12_PATH_CONFIDENCE_CAP_CEILINGS,
  L12PathConfidenceCapChain,
  L12PathConfidenceCapReason,
  l12CapBandToNumericCeiling,
  l12DominantCapReason,
} from '../contracts/path-confidence-cap-chain';
import {
  L12PathConfidenceFactorDirection,
  L12PathConfidenceFactorGroup,
  L12PathConfidencePolicy,
} from '../contracts/path-confidence-policy';
import {
  L12PathConfidenceBand,
  l12ConfidenceBandFor,
} from '../contracts/path-confidence-profile';
import { buildL12ScenarioReplayHash } from '../contracts/scenario-ids';

export interface L12PathConfidencePolicyEngineInput {
  readonly scenario_set_id: string;
  readonly scenario_id: string;

  readonly policy: L12PathConfidencePolicy;

  /**
   * Per-factor *positive* score in [0, 1]. The engine handles direction:
   * INVERTED factors contribute (1 − score) to confidence.
   */
  readonly factor_scores: Readonly<Record<L12PathConfidenceFactorGroup, number>>;

  /** Posture flags that raise cap reasons. */
  readonly active_invalidation_present: boolean;
  readonly blocking_invalidation_present: boolean;
  readonly contradiction_unresolved: boolean;
  readonly transition_risk_high: boolean;
  readonly sequence_decay_dominant: boolean;
  readonly hypothesis_spread_narrow: boolean;
  readonly missing_visibility_material: boolean;
  readonly drift_material: boolean;
  readonly unresolved_trigger: boolean;
  readonly thin_liquidity_fragility: boolean;
  readonly l11_score_context_incomplete: boolean;
  readonly insufficient_scenario_competition: boolean;

  readonly lineage_refs?: readonly string[];
  readonly policy_version: string;
}

export interface L12PathConfidencePolicyEngineResult {
  readonly ok: boolean;
  readonly cap_chain?: L12PathConfidenceCapChain;
  readonly issues: readonly string[];
}

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function deriveCapReasons(
  inp: L12PathConfidencePolicyEngineInput,
): L12PathConfidenceCapReason[] {
  const r: L12PathConfidenceCapReason[] = [];
  if (inp.l11_score_context_incomplete) r.push(L12PathConfidenceCapReason.INCOMPLETE_L11_SCORE_CONTEXT);
  if (inp.blocking_invalidation_present) r.push(L12PathConfidenceCapReason.BLOCKING_INVALIDATION);
  if (inp.active_invalidation_present) r.push(L12PathConfidenceCapReason.ACTIVE_INVALIDATION);
  if (inp.drift_material) r.push(L12PathConfidenceCapReason.MATERIAL_DRIFT);
  if (inp.insufficient_scenario_competition) r.push(L12PathConfidenceCapReason.INSUFFICIENT_SCENARIO_COMPETITION);
  if (inp.contradiction_unresolved) r.push(L12PathConfidenceCapReason.UNRESOLVED_CONTRADICTION);
  if (inp.missing_visibility_material) r.push(L12PathConfidenceCapReason.MISSING_VISIBILITY);
  if (inp.transition_risk_high) r.push(L12PathConfidenceCapReason.HIGH_TRANSITION_RISK);
  if (inp.sequence_decay_dominant) r.push(L12PathConfidenceCapReason.DOMINANT_SEQUENCE_DECAY);
  if (inp.hypothesis_spread_narrow) r.push(L12PathConfidenceCapReason.NARROW_HYPOTHESIS_SPREAD);
  if (inp.unresolved_trigger) r.push(L12PathConfidenceCapReason.UNRESOLVED_TRIGGER);
  if (inp.thin_liquidity_fragility) r.push(L12PathConfidenceCapReason.THIN_LIQUIDITY_FRAGILITY);
  return r;
}

export function computeL12PathConfidenceCapChain(
  inp: L12PathConfidencePolicyEngineInput,
): L12PathConfidencePolicyEngineResult {
  const issues: string[] = [];

  // 1. Weighted aggregate
  let pre_cap_score = 0;
  for (const f of Object.keys(inp.policy.weights) as L12PathConfidenceFactorGroup[]) {
    const w = inp.policy.weights[f];
    const raw = clamp01(inp.factor_scores[f] ?? 0);
    const dir = inp.policy.directions[f];
    const contribution = dir === L12PathConfidenceFactorDirection.POSITIVE ? raw : 1 - raw;
    pre_cap_score += w * contribution;
  }
  pre_cap_score = clamp01(pre_cap_score);
  const pre_cap_band = l12ConfidenceBandFor(pre_cap_score);

  // 2. Cap chain
  const cap_reasons = deriveCapReasons(inp);
  const dominant = l12DominantCapReason(cap_reasons);
  let capped_score = pre_cap_score;
  let capped_band: L12PathConfidenceBand = pre_cap_band;
  let is_blocked = false;

  if (dominant !== undefined) {
    const ceiling = L12_PATH_CONFIDENCE_CAP_CEILINGS[dominant];
    if (ceiling === null) {
      capped_score = 0;
      capped_band = L12PathConfidenceBand.VERY_LOW;
      is_blocked = true;
    } else {
      const ceilingValue = l12CapBandToNumericCeiling(ceiling);
      if (capped_score > ceilingValue) {
        capped_score = ceilingValue;
        capped_band = l12ConfidenceBandFor(capped_score);
      } else {
        capped_band = l12ConfidenceBandFor(capped_score);
      }
    }
  }

  if (capped_score > pre_cap_score + 1e-9) {
    issues.push('capped score exceeds pre-cap score');
  }

  const explanation_codes = [
    ...cap_reasons.map(r => `CAP_${r}`),
    ...(dominant ? [`DOMINANT:${dominant}`] : []),
    ...(is_blocked ? ['BLOCKED'] : []),
  ].sort();

  const lineage = [
    ...(inp.lineage_refs ?? []),
    `scenario:${inp.scenario_id}`,
    `set:${inp.scenario_set_id}`,
  ].sort();

  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.5.path_confidence_cap_chain',
    policy_version: inp.policy_version,
    material: {
      scenario_id: inp.scenario_id,
      scenario_set_id: inp.scenario_set_id,
      pre_cap_score,
      pre_cap_band,
      cap_reasons: [...cap_reasons].sort(),
      dominant_cap_reason: dominant ?? null,
      capped_score,
      capped_band,
      is_blocked,
    },
  });

  const cap_chain: L12PathConfidenceCapChain = {
    cap_chain_id: `l12.cap_chain.${inp.scenario_id}`,
    scenario_set_id: inp.scenario_set_id,
    scenario_id: inp.scenario_id,
    pre_cap_score,
    pre_cap_band,
    cap_reasons,
    dominant_cap_reason: dominant,
    capped_score,
    capped_band,
    is_blocked,
    cap_explanation_codes: explanation_codes,
    lineage_refs: lineage,
    replay_hash,
    policy_version: inp.policy_version,
  };

  return { ok: issues.length === 0, cap_chain, issues };
}
