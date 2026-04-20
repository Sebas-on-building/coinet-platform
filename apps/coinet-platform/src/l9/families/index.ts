/**
 * L9.6 — First Production Sequence Families (Barrel)
 *
 * §9.6.3.1 — Five launch production families. `L9_PRODUCTION_FAMILIES`
 * is the canonical set passed to `L9SequenceFamilyDefinitionRegistry`.
 */

import { L9SequenceFamilyDefinition } from '../contracts/sequence-family-definition';
import { ACCUMULATION_TO_EXPANSION_FAMILY } from './accumulation-to-expansion.family';
import { NARRATIVE_VALIDATION_FAMILY } from './narrative-validation.family';
import { REFLEXIVITY_FAMILY } from './reflexivity.family';
import { SHOCK_DIGESTION_FAMILY } from './shock-digestion.family';
import { DISTRIBUTION_UNDER_HYPE_FAMILY } from './distribution-under-hype.family';

export { ACCUMULATION_TO_EXPANSION_FAMILY } from './accumulation-to-expansion.family';
export { NARRATIVE_VALIDATION_FAMILY } from './narrative-validation.family';
export { REFLEXIVITY_FAMILY } from './reflexivity.family';
export { SHOCK_DIGESTION_FAMILY } from './shock-digestion.family';
export { DISTRIBUTION_UNDER_HYPE_FAMILY } from './distribution-under-hype.family';

export const L9_PRODUCTION_FAMILIES: readonly L9SequenceFamilyDefinition[] = [
  ACCUMULATION_TO_EXPANSION_FAMILY,
  NARRATIVE_VALIDATION_FAMILY,
  REFLEXIVITY_FAMILY,
  SHOCK_DIGESTION_FAMILY,
  DISTRIBUTION_UNDER_HYPE_FAMILY,
];
