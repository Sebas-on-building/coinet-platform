/**
 * L11.3 — Formula Evaluation Result (§11.3.8 / §11.3.20.2)
 *
 * Output of a single formula evaluation. Carries component results,
 * applied penalties / caps / modifiers, missing-data effects,
 * readiness class, and a deterministic replay hash that L11.4+
 * persistence/serving sublayers will rely on.
 */

import { L11ScoreFamily } from './score-family';

/**
 * §11.3.8.2 — Readiness of a formula evaluation result.
 */
export enum L11FormulaReadinessClass {
  FORMULA_READY = 'FORMULA_READY',
  READY_WITH_DISCLOSURE = 'READY_WITH_DISCLOSURE',
  CAPPED_BY_MISSING_DATA = 'CAPPED_BY_MISSING_DATA',
  DEGRADED_INPUTS = 'DEGRADED_INPUTS',
  BLOCKED_BY_REQUIRED_INPUT = 'BLOCKED_BY_REQUIRED_INPUT',
  BLOCKED_BY_SEMANTIC_VIOLATION = 'BLOCKED_BY_SEMANTIC_VIOLATION',
}

export const ALL_L11_FORMULA_READINESS_CLASSES:
  readonly L11FormulaReadinessClass[] =
  Object.values(L11FormulaReadinessClass);

export interface L11ComponentEvaluationResult {
  readonly component_id: string;
  readonly component_name: string;
  /** Normalized component value in [min,max] of its definition. */
  readonly value: number;
  readonly weight: number;
  /** Weighted contribution to raw_score. */
  readonly weighted_contribution: number;
  /** True when this component was omitted because its OPTIONAL input
   * was missing under OMIT_OPTIONAL_COMPONENT behaviour. */
  readonly omitted: boolean;
  readonly attribution_ref?: string;
}

export interface L11AppliedPenalty {
  readonly penalty_rule_id: string;
  readonly magnitude_applied: number;
  readonly mode: string;
  readonly attribution_ref?: string;
  readonly reason_code: string;
}

export interface L11AppliedCap {
  readonly cap_rule_id: string;
  readonly cap_type: string;
  readonly cap_direction: string;
  readonly cap_value: number;
  readonly band_capped?: string;
  readonly attribution_ref?: string;
  readonly reason_code: string;
}

export interface L11AppliedModifier {
  readonly modifier_rule_id: string;
  readonly source_layer: string;
  readonly effect: string;
  readonly magnitude_applied: number;
  readonly attribution_ref?: string;
  readonly trigger_code: string;
}

export interface L11FormulaMissingDataEffect {
  readonly missing_data_rule_id: string;
  readonly input_condition: string;
  readonly behavior: string;
  readonly affected_component_id?: string;
  readonly disclosure_ref: string;
}

export interface L11FormulaEvaluationResult {
  readonly formula_id: string;
  readonly score_family: L11ScoreFamily;
  readonly formula_version: string;

  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;

  readonly component_results: readonly L11ComponentEvaluationResult[];

  readonly raw_score: number;

  readonly applied_penalties: readonly L11AppliedPenalty[];
  readonly applied_caps: readonly L11AppliedCap[];
  readonly applied_modifiers: readonly L11AppliedModifier[];
  readonly missing_data_effects: readonly L11FormulaMissingDataEffect[];

  readonly formula_readiness: L11FormulaReadinessClass;
  readonly replay_hash: string;
  readonly policy_version: string;
}

/**
 * §11.3.20.2 — Canonical replay hash over evaluation material.
 * Includes formula identity, scope, component results, raw score,
 * penalties, caps, modifiers, missing-data effects, readiness, and
 * policy version.
 */
export function canonicalFormulaEvaluationReplayHash(
  e: Omit<L11FormulaEvaluationResult, 'replay_hash'>,
): string {
  const parts: string[] = [];
  parts.push(`fid:${e.formula_id}`);
  parts.push(`fam:${e.score_family}`);
  parts.push(`fv:${e.formula_version}`);
  parts.push(`stp:${e.scope_type}`);
  parts.push(`sid:${e.scope_id}`);
  parts.push(`as:${e.as_of}`);
  parts.push(`raw:${normalizeNum(e.raw_score)}`);
  parts.push(`ready:${e.formula_readiness}`);
  parts.push(`pv:${e.policy_version}`);

  const comps = [...e.component_results]
    .map(c => `${c.component_id}=v=${normalizeNum(c.value)}/w=${normalizeNum(c.weight)}/wc=${normalizeNum(c.weighted_contribution)}/omit=${c.omitted}`)
    .sort()
    .join('|');
  parts.push(`comps:${comps}`);

  parts.push(`pens:${[...e.applied_penalties].map(p => `${p.penalty_rule_id}/${p.mode}/${normalizeNum(p.magnitude_applied)}/${p.reason_code}`).sort().join('|')}`);
  parts.push(`caps:${[...e.applied_caps].map(c => `${c.cap_rule_id}/${c.cap_type}/${c.cap_direction}/${normalizeNum(c.cap_value)}/${c.band_capped ?? ''}/${c.reason_code}`).sort().join('|')}`);
  parts.push(`mods:${[...e.applied_modifiers].map(x => `${x.modifier_rule_id}/${x.source_layer}/${x.effect}/${normalizeNum(x.magnitude_applied)}/${x.trigger_code}`).sort().join('|')}`);
  parts.push(`mde:${[...e.missing_data_effects].map(r => `${r.missing_data_rule_id}/${r.input_condition}/${r.behavior}/${r.affected_component_id ?? ''}/${r.disclosure_ref}`).sort().join('|')}`);

  return fnv1a32('l11f.eval::' + parts.join('::'));
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
  return `l11f.h.${hash.toString(16).padStart(8, '0')}`;
}
