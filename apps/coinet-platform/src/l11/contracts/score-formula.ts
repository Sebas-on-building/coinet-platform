/**
 * L11.3 — Score Formula Definition (§11.3.3 / §11.3.20)
 *
 * The universal formula contract every L11.3 production formula
 * must conform to. Includes a deterministic FNV-1a replay-hash over
 * the canonical formula material (§11.3.20.1).
 */

import { L11ScoreFamily } from './score-family';
import { L11ScoreFamilyDirectionClass } from './score-direction';
import { L11FormulaInputSurface } from './formula-input-surface';
import { L11ScoreComponentDefinition } from './score-component';
import { L11FormulaWeightProfile } from './formula-weight-profile';
import { L11FormulaCapRule } from './formula-cap-rule';
import { L11FormulaPenaltyRule } from './formula-penalty-rule';
import { L11FormulaModifierRule } from './formula-modifier-rule';
import { L11FormulaMissingDataRule } from './formula-missing-data-rule';
import { L11FormulaStatus } from './formula-status';

/**
 * §11.3.20.1 — Material declaration. All fields named here are part
 * of the canonical replay-hash; changing any of them invalidates
 * historic replay.
 */
export interface L11FormulaReplayMaterialSpec {
  readonly include_components: boolean;
  readonly include_weights: boolean;
  readonly include_cap_rules: boolean;
  readonly include_penalty_rules: boolean;
  readonly include_modifier_rules: boolean;
  readonly include_missing_data_rules: boolean;
  readonly include_input_surfaces: boolean;
  readonly include_calibration_target_ref: boolean;
  readonly include_band_policy_ref: boolean;
  readonly include_policy_version: boolean;
}

export const L11_FULL_FORMULA_REPLAY_MATERIAL: L11FormulaReplayMaterialSpec = {
  include_components: true,
  include_weights: true,
  include_cap_rules: true,
  include_penalty_rules: true,
  include_modifier_rules: true,
  include_missing_data_rules: true,
  include_input_surfaces: true,
  include_calibration_target_ref: true,
  include_band_policy_ref: true,
  include_policy_version: true,
};

export interface L11ScoreFormulaDefinition {
  readonly formula_id: string;
  readonly score_family: L11ScoreFamily;
  readonly formula_version: string;

  readonly meaning_claim_ref: string;
  readonly score_direction: L11ScoreFamilyDirectionClass;

  readonly applicable_scope_types: readonly string[];

  readonly required_input_surfaces: readonly L11FormulaInputSurface[];
  readonly optional_input_surfaces: readonly L11FormulaInputSurface[];
  readonly evidence_only_input_surfaces: readonly L11FormulaInputSurface[];

  readonly component_definitions: readonly L11ScoreComponentDefinition[];

  readonly weight_profile: L11FormulaWeightProfile;

  readonly cap_rules: readonly L11FormulaCapRule[];
  readonly penalty_rules: readonly L11FormulaPenaltyRule[];
  readonly modifier_rules: readonly L11FormulaModifierRule[];
  readonly missing_data_rules: readonly L11FormulaMissingDataRule[];

  readonly calibration_target_ref: string;
  readonly output_band_policy_ref: string;

  readonly replay_hash_material: L11FormulaReplayMaterialSpec;

  readonly formula_status: L11FormulaStatus;
  readonly policy_version: string;
}

// ── Canonical replay-hash ──

export function canonicalScoreFormulaReplayHash(
  f: L11ScoreFormulaDefinition,
): string {
  const m = f.replay_hash_material;
  const parts: string[] = [];
  parts.push(`fid:${f.formula_id}`);
  parts.push(`fam:${f.score_family}`);
  parts.push(`fv:${f.formula_version}`);
  parts.push(`mc:${f.meaning_claim_ref}`);
  parts.push(`dir:${f.score_direction}`);
  parts.push(`status:${f.formula_status}`);
  parts.push(`scopes:${[...f.applicable_scope_types].sort().join('|')}`);

  if (m.include_input_surfaces) {
    parts.push(`req_in:${encodeSurfaceList(f.required_input_surfaces)}`);
    parts.push(`opt_in:${encodeSurfaceList(f.optional_input_surfaces)}`);
    parts.push(`ev_in:${encodeSurfaceList(f.evidence_only_input_surfaces)}`);
  }

  if (m.include_components) {
    const compsCanonical = [...f.component_definitions]
      .map(c => `${c.component_id}=${c.component_role}/${c.component_direction}/w=${c.weight.toFixed(6)}/n=${c.normalizer_id}@${c.normalizer_version}/[${c.min_value},${c.max_value}]/req=${c.required_for_formula}/attr=${c.attribution_required}/mdb=${c.missing_data_behavior}`)
      .sort()
      .join('||');
    parts.push(`comps:${compsCanonical}`);
  }

  if (m.include_weights) {
    const wp = f.weight_profile;
    const ws = Object.entries(wp.component_weights)
      .map(([k, v]) => `${k}=${v.toFixed(6)}`)
      .sort()
      .join('|');
    parts.push(`w:${wp.weight_profile_id}/${wp.formula_version}/p=${wp.weight_sum_policy}/sums=${wp.positive_weight_sum.toFixed(6)},${wp.penalty_weight_sum.toFixed(6)},${wp.total_absolute_weight_sum.toFixed(6)}/${ws}`);
  }

  if (m.include_cap_rules) {
    parts.push(`caps:${[...f.cap_rules].map(c => `${c.cap_rule_id}/${c.cap_type}/${c.cap_direction}/${c.cap_value}/${c.cap_band ?? ''}/${c.trigger_condition.trigger_code}/${c.reason_code}`).sort().join('|')}`);
  }
  if (m.include_penalty_rules) {
    parts.push(`pens:${[...f.penalty_rules].map(p => `${p.penalty_rule_id}/${p.application_mode}/${p.magnitude.toFixed(6)}/${p.triggers_cap}/${p.reason_code}`).sort().join('|')}`);
  }
  if (m.include_modifier_rules) {
    parts.push(`mods:${[...f.modifier_rules].map(x => `${x.modifier_rule_id}/${x.source_layer}/${x.effect}/${x.magnitude.toFixed(6)}/${x.trigger_code}`).sort().join('|')}`);
  }
  if (m.include_missing_data_rules) {
    parts.push(`mdr:${[...f.missing_data_rules].map(r => `${r.missing_data_rule_id}/${r.input_condition}/${r.behavior}/${r.reason_code}`).sort().join('|')}`);
  }
  if (m.include_calibration_target_ref) {
    parts.push(`ct:${f.calibration_target_ref}`);
  }
  if (m.include_band_policy_ref) {
    parts.push(`bp:${f.output_band_policy_ref}`);
  }
  if (m.include_policy_version) {
    parts.push(`pv:${f.policy_version}`);
  }

  return fnv1a32('l11f.formula::' + parts.join('::'));
}

function encodeSurfaceList(list: readonly L11FormulaInputSurface[]): string {
  return [...list]
    .map(s => `${s.surface_class}/${s.required_posture ?? '_'}/${s.evidence_only ? 'evo' : 'std'}`)
    .sort()
    .join('|');
}

function fnv1a32(s: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `l11f.h.${hash.toString(16).padStart(8, '0')}`;
}
