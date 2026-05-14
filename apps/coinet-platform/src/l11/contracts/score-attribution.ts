/**
 * L11.4 — Score Attribution Object (§11.4.3 / §11.4.16)
 *
 * Canonical attribution object plus the deterministic FNV-1a 32-bit
 * replay hash defined in §11.4.16.1.
 */

import { L11ScoreFamily } from './score-family';
import { L11ScoreBand } from './score-band-policy';
import { L11AttributionSummaryCode } from './attribution-summary-code';
import { L11AttributionCompletenessClass } from './attribution-completeness';
import {
  L11ComponentContribution,
  L11CapContribution,
  L11PenaltyContribution,
  L11ModifierContribution,
  L11MissingDataContribution,
} from './attribution-contribution';

export const L11_ATTRIBUTION_POLICY_VERSION = 'l11.4.attribution.v1';

export interface L11ScoreAttribution {
  readonly attribution_id: string;

  readonly score_id: string;
  readonly score_family: L11ScoreFamily;
  readonly formula_id: string;
  readonly formula_version: string;

  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;

  readonly final_score: number;
  readonly score_band: L11ScoreBand;

  /** Driver ids of every positive driver candidate (unordered). */
  readonly positive_driver_refs: readonly string[];
  /** Driver ids of every negative driver candidate (unordered). */
  readonly negative_driver_refs: readonly string[];

  readonly component_contributions: readonly L11ComponentContribution[];
  readonly cap_contributions: readonly L11CapContribution[];
  readonly penalty_contributions: readonly L11PenaltyContribution[];
  readonly modifier_contributions: readonly L11ModifierContribution[];
  readonly missing_data_contributions: readonly L11MissingDataContribution[];

  /** Top-N positive drivers in *ranked* order. */
  readonly top_positive_driver_refs: readonly string[];
  /** Top-N negative drivers in *ranked* order. */
  readonly top_negative_driver_refs: readonly string[];

  readonly explanatory_summary_codes: readonly L11AttributionSummaryCode[];
  readonly attribution_completeness_class: L11AttributionCompletenessClass;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly input_snapshot_ref: string;
  readonly formula_evaluation_ref: string;

  readonly policy_version: string;
  readonly replay_hash: string;
}

// ─────────────────────────────────────────────────────────────────────
// Canonical replay material (§11.4.16.1)
// ─────────────────────────────────────────────────────────────────────

export interface L11AttributionReplayMaterial {
  readonly attribution_id: string;
  readonly score_id: string;
  readonly score_family: L11ScoreFamily;
  readonly formula_id: string;
  readonly formula_version: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly final_score: number;
  readonly score_band: L11ScoreBand;
  readonly positive_driver_refs: readonly string[];
  readonly negative_driver_refs: readonly string[];
  readonly top_positive_driver_refs: readonly string[];
  readonly top_negative_driver_refs: readonly string[];
  readonly component_contribution_keys: readonly string[];
  readonly cap_contribution_keys: readonly string[];
  readonly penalty_contribution_keys: readonly string[];
  readonly modifier_contribution_keys: readonly string[];
  readonly missing_data_contribution_keys: readonly string[];
  readonly summary_codes: readonly L11AttributionSummaryCode[];
  readonly completeness_class: L11AttributionCompletenessClass;
  readonly formula_evaluation_ref: string;
  readonly input_snapshot_ref: string;
  readonly policy_version: string;
}

export function extractL11AttributionReplayMaterial(
  a: Omit<L11ScoreAttribution, 'replay_hash'> | L11ScoreAttribution,
): L11AttributionReplayMaterial {
  return {
    attribution_id: a.attribution_id,
    score_id: a.score_id,
    score_family: a.score_family,
    formula_id: a.formula_id,
    formula_version: a.formula_version,
    scope_type: a.scope_type,
    scope_id: a.scope_id,
    as_of: a.as_of,
    final_score: a.final_score,
    score_band: a.score_band,
    positive_driver_refs: a.positive_driver_refs,
    negative_driver_refs: a.negative_driver_refs,
    top_positive_driver_refs: a.top_positive_driver_refs,
    top_negative_driver_refs: a.top_negative_driver_refs,
    component_contribution_keys: a.component_contributions.map(c =>
      `${c.contribution_id}|${c.component_id}|${normalizeNum(c.weighted_contribution)}|${c.contribution_direction}|${c.contribution_rank}|${c.materiality_class}`),
    cap_contribution_keys: a.cap_contributions.map(c =>
      `${c.cap_contribution_id}|${c.cap_rule_id}|${normalizeNum(c.cap_effect_magnitude)}|${c.cap_direction}|${c.materiality_class}`),
    penalty_contribution_keys: a.penalty_contributions.map(p =>
      `${p.penalty_contribution_id}|${p.penalty_rule_id}|${normalizeNum(p.score_effect)}|${p.penalty_type}|${p.materiality_class}`),
    modifier_contribution_keys: a.modifier_contributions.map(m =>
      `${m.modifier_contribution_id}|${m.modifier_rule_id}|${m.modifier_source_layer}|${m.modifier_type}|${normalizeNum(m.score_effect)}|${m.materiality_class}`),
    missing_data_contribution_keys: a.missing_data_contributions.map(d =>
      `${d.missing_data_contribution_id}|${d.missing_input_ref}|${d.missing_input_class}|${d.missing_data_behavior}|${normalizeNum(d.score_effect)}|${normalizeNum(d.confidence_effect)}|${d.materiality_class}`),
    summary_codes: a.explanatory_summary_codes,
    completeness_class: a.attribution_completeness_class,
    formula_evaluation_ref: a.formula_evaluation_ref,
    input_snapshot_ref: a.input_snapshot_ref,
    policy_version: a.policy_version,
  };
}

export function canonicalScoreAttributionReplayHash(
  m: L11AttributionReplayMaterial,
): string {
  const parts: string[] = [];
  parts.push(`aid:${m.attribution_id}`);
  parts.push(`sid:${m.score_id}`);
  parts.push(`fam:${m.score_family}`);
  parts.push(`fid:${m.formula_id}`);
  parts.push(`fv:${m.formula_version}`);
  parts.push(`stp:${m.scope_type}`);
  parts.push(`sco:${m.scope_id}`);
  parts.push(`as:${m.as_of}`);
  parts.push(`fs:${normalizeNum(m.final_score)}`);
  parts.push(`bd:${m.score_band}`);

  // Sets — sort to ignore declared ordering
  parts.push(`pdr:${[...m.positive_driver_refs].sort().join('|')}`);
  parts.push(`ndr:${[...m.negative_driver_refs].sort().join('|')}`);

  // Ranked lists — preserve order
  parts.push(`tpd:${m.top_positive_driver_refs.join('|')}`);
  parts.push(`tnd:${m.top_negative_driver_refs.join('|')}`);

  // Contributions — sort each list (set semantics)
  parts.push(`cc:${[...m.component_contribution_keys].sort().join('||')}`);
  parts.push(`cap:${[...m.cap_contribution_keys].sort().join('||')}`);
  parts.push(`pen:${[...m.penalty_contribution_keys].sort().join('||')}`);
  parts.push(`mod:${[...m.modifier_contribution_keys].sort().join('||')}`);
  parts.push(`mdc:${[...m.missing_data_contribution_keys].sort().join('||')}`);

  // Summary codes — sorted
  parts.push(`sc:${[...m.summary_codes].sort().join('|')}`);
  parts.push(`cmp:${m.completeness_class}`);

  parts.push(`fer:${m.formula_evaluation_ref}`);
  parts.push(`isr:${m.input_snapshot_ref}`);
  parts.push(`pv:${m.policy_version}`);

  return fnv1a32('l11a.attr::' + parts.join('::'));
}

function normalizeNum(n: number): string {
  if (!Number.isFinite(n)) return 'NaN';
  if (Number.isInteger(n)) return `${n}.000000`;
  return n.toFixed(6);
}

function fnv1a32(s: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `l11a.h.${hash.toString(16).padStart(8, '0')}`;
}
