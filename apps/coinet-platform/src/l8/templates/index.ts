/**
 * L8 Templates — Barrel Export
 *
 * §8.6.4 — First production regime templates, one file per family.
 * The template registry consumes these as its default seed.
 */

export * from './macro-regime.templates';
export * from './crypto-structure.templates';
export * from './token-specific.templates';
export * from './ecosystem.templates';

import { L8RegimeTemplate } from '../contracts/regime-template';
import { L8_MACRO_REGIME_TEMPLATES } from './macro-regime.templates';
import {
  L8_CRYPTO_STRUCTURE_REGIME_TEMPLATES,
} from './crypto-structure.templates';
import { L8_TOKEN_REGIME_TEMPLATES } from './token-specific.templates';
import { L8_ECOSYSTEM_REGIME_TEMPLATES } from './ecosystem.templates';

/**
 * §8.6.4 — All 21 first-production regime templates, ordered by family
 * then family-local rollout priority.
 */
export const L8_ALL_REGIME_TEMPLATES: readonly L8RegimeTemplate[] = [
  ...L8_MACRO_REGIME_TEMPLATES,
  ...L8_CRYPTO_STRUCTURE_REGIME_TEMPLATES,
  ...L8_TOKEN_REGIME_TEMPLATES,
  ...L8_ECOSYSTEM_REGIME_TEMPLATES,
];
