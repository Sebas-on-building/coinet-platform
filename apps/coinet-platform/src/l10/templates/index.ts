/**
 * L10.6 §10.6.3.4 / §10.6.11.1 — Template registry seed.
 *
 * This barrel exports every production template definition and
 * exposes the canonical `ALL_L10_PRODUCTION_TEMPLATES` list in
 * rollout-ordered form. Consumers must not construct their own
 * template list: any candidate template lookup must resolve through
 * this barrel (INV-10.6-A/B).
 */

import type { L10HypothesisTemplateDefinition } from '../contracts/hypothesis-template-definition';

// Family A — Genuine accumulation / demand
import { GENUINE_EARLY_ACCUMULATION_TEMPLATE } from './genuine-early-accumulation.template';
import { REAL_DEMAND_LED_EXPANSION_TEMPLATE } from './real-demand-led-expansion.template';
import { STRUCTURALLY_IMPROVING_ACCUMULATION_TEMPLATE } from './structurally-improving-accumulation.template';

// Family B — Leverage / squeeze
import { LEVERAGE_DRIVEN_SQUEEZE_TEMPLATE } from './leverage-driven-squeeze.template';
import { CROWDING_LED_CONTINUATION_TEMPLATE } from './crowding-led-continuation.template';
import { REFLEXIVE_LATE_STAGE_SQUEEZE_TEMPLATE } from './reflexive-late-stage-squeeze.template';

// Family C — Narrative / reflexive
import { NARRATIVE_ONLY_REFLEXIVE_PUMP_TEMPLATE } from './narrative-only-reflexive-pump.template';
import { HYPE_LED_CONTINUATION_TEMPLATE } from './hype-led-continuation.template';
import { ATTENTION_DRIVEN_REPRICING_TEMPLATE } from './attention-driven-repricing.template';

// Family D — Fundamental rerating
import { FUNDAMENTALLY_IMPROVING_RERATING_TEMPLATE } from './fundamentally-improving-rerating.template';
import { PROTOCOL_QUALITY_REPRICING_TEMPLATE } from './protocol-quality-repricing.template';
import { SUBSTANCE_BACKED_CONTINUATION_TEMPLATE } from './substance-backed-continuation.template';

// Family E — Supply-overhang / distribution
import { POST_UNLOCK_REDISTRIBUTION_TEMPLATE } from './post-unlock-redistribution.template';
import { TREASURY_LED_DISTRIBUTION_TEMPLATE } from './treasury-led-distribution.template';
import { DISTRIBUTION_UNDER_HYPE_TEMPLATE } from './distribution-under-hype.template';

// Family F — Manipulation / low-quality
import { LOW_QUALITY_MANIPULATED_LAUNCH_TEMPLATE } from './low-quality-manipulated-launch.template';
import { STRUCTURALLY_WEAK_PUMP_TEMPLATE } from './structurally-weak-pump.template';
import { FABRICATED_PARTICIPATION_PATTERN_TEMPLATE } from './fabricated-participation-pattern.template';

// Family G — Ecosystem spillover / rotation
import { SECTOR_SPILLOVER_REPRICING_TEMPLATE } from './sector-spillover-repricing.template';
import { CHAIN_ATTENTION_TRANSFER_TEMPLATE } from './chain-attention-transfer.template';
import { ECOSYSTEM_BETA_RERATING_TEMPLATE } from './ecosystem-beta-rerating.template';

export {
  GENUINE_EARLY_ACCUMULATION_TEMPLATE,
  REAL_DEMAND_LED_EXPANSION_TEMPLATE,
  STRUCTURALLY_IMPROVING_ACCUMULATION_TEMPLATE,
  LEVERAGE_DRIVEN_SQUEEZE_TEMPLATE,
  CROWDING_LED_CONTINUATION_TEMPLATE,
  REFLEXIVE_LATE_STAGE_SQUEEZE_TEMPLATE,
  NARRATIVE_ONLY_REFLEXIVE_PUMP_TEMPLATE,
  HYPE_LED_CONTINUATION_TEMPLATE,
  ATTENTION_DRIVEN_REPRICING_TEMPLATE,
  FUNDAMENTALLY_IMPROVING_RERATING_TEMPLATE,
  PROTOCOL_QUALITY_REPRICING_TEMPLATE,
  SUBSTANCE_BACKED_CONTINUATION_TEMPLATE,
  POST_UNLOCK_REDISTRIBUTION_TEMPLATE,
  TREASURY_LED_DISTRIBUTION_TEMPLATE,
  DISTRIBUTION_UNDER_HYPE_TEMPLATE,
  LOW_QUALITY_MANIPULATED_LAUNCH_TEMPLATE,
  STRUCTURALLY_WEAK_PUMP_TEMPLATE,
  FABRICATED_PARTICIPATION_PATTERN_TEMPLATE,
  SECTOR_SPILLOVER_REPRICING_TEMPLATE,
  CHAIN_ATTENTION_TRANSFER_TEMPLATE,
  ECOSYSTEM_BETA_RERATING_TEMPLATE,
};

export {
  DEFAULT_L10_BLOCKER_LAW,
  DEFAULT_L10_CLEAN_EMISSION,
  DEFAULT_L10_SHIFT_CONDITION_REQUIREMENT,
  makeRestrictionDefaults,
  isTemplateStructurallyComplete,
} from './template-defaults';

/**
 * §10.6.3.4 — Canonical production template roster. Order is
 * rollout-grouped (P1 → P5) so downstream registry seeding and
 * certification can iterate deterministically (INV-10.6-F).
 */
export const ALL_L10_PRODUCTION_TEMPLATES:
  readonly L10HypothesisTemplateDefinition[] = [
    GENUINE_EARLY_ACCUMULATION_TEMPLATE,
    REAL_DEMAND_LED_EXPANSION_TEMPLATE,
    STRUCTURALLY_IMPROVING_ACCUMULATION_TEMPLATE,
    LEVERAGE_DRIVEN_SQUEEZE_TEMPLATE,
    CROWDING_LED_CONTINUATION_TEMPLATE,
    REFLEXIVE_LATE_STAGE_SQUEEZE_TEMPLATE,
    NARRATIVE_ONLY_REFLEXIVE_PUMP_TEMPLATE,
    HYPE_LED_CONTINUATION_TEMPLATE,
    ATTENTION_DRIVEN_REPRICING_TEMPLATE,
    FUNDAMENTALLY_IMPROVING_RERATING_TEMPLATE,
    PROTOCOL_QUALITY_REPRICING_TEMPLATE,
    SUBSTANCE_BACKED_CONTINUATION_TEMPLATE,
    POST_UNLOCK_REDISTRIBUTION_TEMPLATE,
    TREASURY_LED_DISTRIBUTION_TEMPLATE,
    DISTRIBUTION_UNDER_HYPE_TEMPLATE,
    LOW_QUALITY_MANIPULATED_LAUNCH_TEMPLATE,
    STRUCTURALLY_WEAK_PUMP_TEMPLATE,
    FABRICATED_PARTICIPATION_PATTERN_TEMPLATE,
    SECTOR_SPILLOVER_REPRICING_TEMPLATE,
    CHAIN_ATTENTION_TRANSFER_TEMPLATE,
    ECOSYSTEM_BETA_RERATING_TEMPLATE,
  ] as const;
