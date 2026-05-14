/**
 * L11.3 — Score Component Doctrine (§11.3.4)
 *
 * Defines the universal component-definition contract used by every
 * formula in L11.3. Components are strongly typed, bounded,
 * normalised, weighted, and direction-aware.
 */

import { L11ScoreFamily } from './score-family';
import { L11FormulaInputSurface } from './formula-input-surface';

/**
 * §11.3.4.2 — The role a component plays inside a formula.
 */
export enum L11ScoreComponentRole {
  PRIMARY_POSITIVE_COMPONENT = 'PRIMARY_POSITIVE_COMPONENT',
  SECONDARY_POSITIVE_COMPONENT = 'SECONDARY_POSITIVE_COMPONENT',
  PRIMARY_RISK_COMPONENT = 'PRIMARY_RISK_COMPONENT',
  SECONDARY_RISK_COMPONENT = 'SECONDARY_RISK_COMPONENT',
  CONFIDENCE_COMPONENT = 'CONFIDENCE_COMPONENT',
  STRUCTURE_COMPONENT = 'STRUCTURE_COMPONENT',
  TIMING_COMPONENT = 'TIMING_COMPONENT',
  PENALTY_COMPONENT = 'PENALTY_COMPONENT',
  CAP_COMPONENT = 'CAP_COMPONENT',
  MODIFIER_COMPONENT = 'MODIFIER_COMPONENT',
}

export const ALL_L11_SCORE_COMPONENT_ROLES:
  readonly L11ScoreComponentRole[] =
  Object.values(L11ScoreComponentRole);

/**
 * §11.3.4.3 — Component direction class. Higher means improves /
 * reduces / increases-risk depending on family direction. Penalty
 * components must be FAMILY_DIRECTION_INVERTED for constructive
 * families and FAMILY_DIRECTION_ALIGNED for risk families.
 */
export enum L11ComponentDirectionClass {
  HIGHER_IMPROVES_SCORE = 'HIGHER_IMPROVES_SCORE',
  HIGHER_REDUCES_SCORE = 'HIGHER_REDUCES_SCORE',
  HIGHER_INCREASES_RISK_SCORE = 'HIGHER_INCREASES_RISK_SCORE',
  HIGHER_INCREASES_CONFIDENCE = 'HIGHER_INCREASES_CONFIDENCE',
  FAMILY_DIRECTION_ALIGNED = 'FAMILY_DIRECTION_ALIGNED',
  FAMILY_DIRECTION_INVERTED = 'FAMILY_DIRECTION_INVERTED',
}

export const ALL_L11_COMPONENT_DIRECTION_CLASSES:
  readonly L11ComponentDirectionClass[] =
  Object.values(L11ComponentDirectionClass);

/**
 * §11.3.7.1 — How a missing input affects the component output.
 */
export enum L11MissingDataBehaviorClass {
  BLOCK_SCORE = 'BLOCK_SCORE',
  CAP_SCORE = 'CAP_SCORE',
  PENALIZE_SCORE = 'PENALIZE_SCORE',
  LOWER_CONFIDENCE = 'LOWER_CONFIDENCE',
  OMIT_OPTIONAL_COMPONENT = 'OMIT_OPTIONAL_COMPONENT',
  REQUIRE_DISCLOSURE = 'REQUIRE_DISCLOSURE',
  EVIDENCE_ONLY = 'EVIDENCE_ONLY',
}

export const ALL_L11_MISSING_DATA_BEHAVIOR_CLASSES:
  readonly L11MissingDataBehaviorClass[] =
  Object.values(L11MissingDataBehaviorClass);

export interface L11ScoreComponentDefinition {
  readonly component_id: string;
  readonly score_family: L11ScoreFamily;
  readonly component_name: string;

  readonly component_role: L11ScoreComponentRole;
  readonly component_direction: L11ComponentDirectionClass;

  readonly required_input_surfaces: readonly L11FormulaInputSurface[];
  readonly optional_input_surfaces: readonly L11FormulaInputSurface[];

  readonly normalizer_id: string;
  readonly normalizer_version: string;

  readonly min_value: number;
  readonly max_value: number;

  readonly weight: number;

  readonly missing_data_behavior: L11MissingDataBehaviorClass;

  readonly required_for_formula: boolean;
  readonly attribution_required: boolean;

  readonly policy_version: string;
}

export function isL11ComponentPenalty(
  c: L11ScoreComponentDefinition,
): boolean {
  return c.component_role === L11ScoreComponentRole.PENALTY_COMPONENT;
}

export function isL11ComponentBoundedZeroToHundred(
  c: L11ScoreComponentDefinition,
): boolean {
  return c.min_value === 0 && c.max_value === 100;
}
