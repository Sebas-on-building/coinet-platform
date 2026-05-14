/**
 * L11.8 — Historical Score Fact (§11.8.8)
 *
 * Append-only historical score fact rows materialized to ClickHouse
 * via L5. Correction-aware via `correction_of_fact_id` /
 * `correction_reason`.
 */

import { L11ScoreFamily } from './score-family';
import { L11ScoreBand } from './score-band-policy';

export const L11_HISTORICAL_FACT_POLICY_VERSION = 'l11.8.historical.v1';

export enum L11HistoricalFactFamily {
  TS_SCORE_FACT_V1 = 'ts_score_fact_v1',
  TS_SCORE_COMPONENT_V1 = 'ts_score_component_v1',
  TS_SCORE_ATTRIBUTION_V1 = 'ts_score_attribution_v1',
  TS_SCORE_MODIFIER_V1 = 'ts_score_modifier_v1',
  TS_SCORE_MISSING_DATA_V1 = 'ts_score_missing_data_v1',
  TS_SCORE_CALIBRATION_FACT_V1 = 'ts_score_calibration_fact_v1',
  TS_SCORE_DRIFT_FACT_V1 = 'ts_score_drift_fact_v1',
}

export const ALL_L11_HISTORICAL_FACT_FAMILIES:
  readonly L11HistoricalFactFamily[] =
  Object.values(L11HistoricalFactFamily);

export interface L11HistoricalScoreFact {
  readonly historical_fact_id: string;
  readonly fact_family: L11HistoricalFactFamily;

  readonly score_id: string;
  readonly score_family: L11ScoreFamily;
  readonly score_version: string;

  readonly formula_id: string;
  readonly formula_version: string;

  readonly scope_type: string;
  readonly scope_id: string;

  readonly as_of: string;
  readonly observed_at?: string;
  readonly materialized_at: string;

  readonly raw_score: number;
  readonly modified_score: number;
  readonly final_score: number;
  readonly score_band: L11ScoreBand;

  readonly component_fact_refs: readonly string[];
  readonly attribution_fact_ref: string;
  readonly modifier_fact_refs: readonly string[];
  readonly missing_data_fact_ref: string;
  readonly calibration_fact_refs: readonly string[];
  readonly drift_fact_refs: readonly string[];

  readonly run_id: string;
  readonly replay_hash: string;
  readonly lineage_refs: readonly string[];
  readonly evidence_refs: readonly string[];

  readonly correction_of_fact_id?: string;
  readonly correction_reason?: string;

  readonly policy_version: string;
}

export function isL11HistoricalScoreFactStructurallyValid(
  f: L11HistoricalScoreFact,
): { ok: boolean; reason: string } {
  if (!f.historical_fact_id) {
    return { ok: false, reason: 'historical_fact_id missing' };
  }
  if (!f.fact_family) return { ok: false, reason: 'fact_family missing' };
  if (!f.score_id) return { ok: false, reason: 'score_id missing' };
  if (!f.score_family) return { ok: false, reason: 'score_family missing' };
  if (!f.formula_version || !f.formula_id) {
    return { ok: false, reason: 'formula_id / formula_version missing' };
  }
  if (!f.scope_type || !f.scope_id) {
    return { ok: false, reason: 'scope_type / scope_id missing' };
  }
  if (!f.as_of) return { ok: false, reason: 'as_of missing' };
  if (!f.materialized_at) return { ok: false, reason: 'materialized_at missing' };
  if (!f.attribution_fact_ref) {
    return { ok: false, reason: 'attribution_fact_ref missing' };
  }
  if (!Array.isArray(f.component_fact_refs) || f.component_fact_refs.length === 0) {
    return { ok: false, reason: 'component_fact_refs missing or empty' };
  }
  if (!f.missing_data_fact_ref) {
    return { ok: false, reason: 'missing_data_fact_ref missing' };
  }
  if (!f.replay_hash) return { ok: false, reason: 'replay_hash missing' };
  if (!Array.isArray(f.lineage_refs) || f.lineage_refs.length === 0) {
    return { ok: false, reason: 'lineage_refs missing or empty' };
  }
  if (!f.run_id) return { ok: false, reason: 'run_id missing' };
  if (!f.policy_version) return { ok: false, reason: 'policy_version missing' };
  if (!!f.correction_of_fact_id !== !!f.correction_reason) {
    return { ok: false,
      reason: 'correction_of_fact_id and correction_reason must both be present or both absent' };
  }
  return { ok: true, reason: 'ok' };
}
