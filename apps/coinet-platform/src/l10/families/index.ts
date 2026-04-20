/**
 * L10.6 — Hypothesis Families Barrel
 *
 * §10.6.2.1 / §10.6.11.1 — Canonical seven production families and
 * their rollout-ordered list.
 */

import { L10HypothesisFamilyDefinition } from '../contracts/hypothesis-family-definition';

export { GENUINE_ACCUMULATION_DEMAND_FAMILY }
  from './genuine-accumulation-demand.family';
export { LEVERAGE_SQUEEZE_FAMILY } from './leverage-squeeze.family';
export { NARRATIVE_REFLEXIVE_FAMILY } from './narrative-reflexive.family';
export { FUNDAMENTAL_RERATING_FAMILY } from './fundamental-rerating.family';
export { SUPPLY_OVERHANG_DISTRIBUTION_FAMILY }
  from './supply-overhang-distribution.family';
export { MANIPULATION_LOW_QUALITY_FAMILY }
  from './manipulation-low-quality.family';
export { ECOSYSTEM_SPILLOVER_ROTATION_FAMILY }
  from './ecosystem-spillover-rotation.family';

import { GENUINE_ACCUMULATION_DEMAND_FAMILY }
  from './genuine-accumulation-demand.family';
import { LEVERAGE_SQUEEZE_FAMILY } from './leverage-squeeze.family';
import { NARRATIVE_REFLEXIVE_FAMILY } from './narrative-reflexive.family';
import { FUNDAMENTAL_RERATING_FAMILY } from './fundamental-rerating.family';
import { SUPPLY_OVERHANG_DISTRIBUTION_FAMILY }
  from './supply-overhang-distribution.family';
import { MANIPULATION_LOW_QUALITY_FAMILY }
  from './manipulation-low-quality.family';
import { ECOSYSTEM_SPILLOVER_ROTATION_FAMILY }
  from './ecosystem-spillover-rotation.family';

/**
 * §10.6.11.1 — Rollout-ordered family list. Must match
 * `L10_HYPOTHESIS_ROLLOUT_ORDER` from `hypothesis-template-policy`.
 */
export const L10_PRODUCTION_FAMILY_DEFINITIONS:
  readonly L10HypothesisFamilyDefinition[] = [
    GENUINE_ACCUMULATION_DEMAND_FAMILY,
    LEVERAGE_SQUEEZE_FAMILY,
    NARRATIVE_REFLEXIVE_FAMILY,
    FUNDAMENTAL_RERATING_FAMILY,
    SUPPLY_OVERHANG_DISTRIBUTION_FAMILY,
    MANIPULATION_LOW_QUALITY_FAMILY,
    ECOSYSTEM_SPILLOVER_ROTATION_FAMILY,
  ];
