/**
 * L9.6 — First Production Sequence Templates (Barrel)
 *
 * §9.6.13.1 — Seven launch templates. `L9_PRODUCTION_TEMPLATES` is the
 * canonical set consumed by `L9SequenceTemplateRegistry`.
 */

import { L9SequenceTemplateDefinition } from '../contracts/sequence-template-definition';
import { PRE_NARRATIVE_ACCUMULATION_TEMPLATE } from './pre-narrative-accumulation.template';
import { EARLY_NARRATIVE_IGNITION_TEMPLATE } from './early-narrative-ignition.template';
import { VALIDATED_EXPANSION_TEMPLATE } from './validated-expansion.template';
import { LEVERAGE_CROWDING_PHASE_TEMPLATE } from './leverage-crowding-phase.template';
import { LATE_STAGE_REFLEXIVITY_TEMPLATE } from './late-stage-reflexivity.template';
import { POST_SHOCK_DIGESTION_TEMPLATE } from './post-shock-digestion.template';
import { DISTRIBUTION_UNDER_HYPE_TEMPLATE } from './distribution-under-hype.template';

export { PRE_NARRATIVE_ACCUMULATION_TEMPLATE } from './pre-narrative-accumulation.template';
export { EARLY_NARRATIVE_IGNITION_TEMPLATE } from './early-narrative-ignition.template';
export { VALIDATED_EXPANSION_TEMPLATE } from './validated-expansion.template';
export { LEVERAGE_CROWDING_PHASE_TEMPLATE } from './leverage-crowding-phase.template';
export { LATE_STAGE_REFLEXIVITY_TEMPLATE } from './late-stage-reflexivity.template';
export { POST_SHOCK_DIGESTION_TEMPLATE } from './post-shock-digestion.template';
export { DISTRIBUTION_UNDER_HYPE_TEMPLATE } from './distribution-under-hype.template';

export const L9_PRODUCTION_TEMPLATES: readonly L9SequenceTemplateDefinition[] = [
  PRE_NARRATIVE_ACCUMULATION_TEMPLATE,
  EARLY_NARRATIVE_IGNITION_TEMPLATE,
  VALIDATED_EXPANSION_TEMPLATE,
  LEVERAGE_CROWDING_PHASE_TEMPLATE,
  LATE_STAGE_REFLEXIVITY_TEMPLATE,
  POST_SHOCK_DIGESTION_TEMPLATE,
  DISTRIBUTION_UNDER_HYPE_TEMPLATE,
];
