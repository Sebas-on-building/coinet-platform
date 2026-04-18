/**
 * L7.5 — Validation Families barrel export.
 */

export * from './market-strength.validation';
export * from './derivatives-contradiction.validation';
export * from './protocol-substance.validation';
export * from './narrative.validation';
export * from './accumulation.validation';
export * from './risk-overhang.validation';
export * from './cross-domain-alignment.validation';

import { MARKET_STRENGTH_VALIDATION } from './market-strength.validation';
import { DERIVATIVES_CONTRADICTION_VALIDATION } from './derivatives-contradiction.validation';
import { PROTOCOL_SUBSTANCE_VALIDATION } from './protocol-substance.validation';
import { NARRATIVE_VALIDATION } from './narrative.validation';
import { ACCUMULATION_VALIDATION } from './accumulation.validation';
import { RISK_OVERHANG_VALIDATION } from './risk-overhang.validation';
import { CROSS_DOMAIN_ALIGNMENT_VALIDATION } from './cross-domain-alignment.validation';
import { L7ValidationFamilyDefinition } from '../contracts/validation-family-definition';

/**
 * §7.5.7.1 — First production validation families, in recommended
 * rollout order. This ordering is also encoded by each family's
 * `rollout_priority` field so the rollout validator can verify it.
 */
export const L7_FIRST_PRODUCTION_VALIDATION_FAMILIES: readonly L7ValidationFamilyDefinition[] = [
  MARKET_STRENGTH_VALIDATION,
  DERIVATIVES_CONTRADICTION_VALIDATION,
  PROTOCOL_SUBSTANCE_VALIDATION,
  NARRATIVE_VALIDATION,
  ACCUMULATION_VALIDATION,
  RISK_OVERHANG_VALIDATION,
  CROSS_DOMAIN_ALIGNMENT_VALIDATION,
];
