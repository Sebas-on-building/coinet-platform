/**
 * L8.6 — Regime Signatures
 *
 * §8.6.3.8 / §8.6.3.9 — Transition and ambiguity signatures are
 * family-local evidence constellations that move regime classification
 * from clean into transitional / ambiguous / blocked.
 *
 * These are not decorative metadata (§8.6.5.3 / §8.6.5.4). They are
 * first-class semantic objects that drive the runtime's transition and
 * ambiguity engines.
 */

import type { L8RegimeInputDomain } from './regime-input-domain';

/**
 * §8.6.8.2 — Signature class. Kept narrow so validators reason uniformly.
 */
export enum L8RegimeSignatureClass {
  TRANSITION = 'TRANSITION',
  AMBIGUITY = 'AMBIGUITY',
}

export const ALL_L8_REGIME_SIGNATURE_CLASSES:
  readonly L8RegimeSignatureClass[] =
    Object.values(L8RegimeSignatureClass);

/**
 * §8.6.3.8 — Transition signature. Supports transition-risk lifting,
 * coexistence reclassification, and candidate-ordering instability.
 */
export interface L8RegimeTransitionSignature {
  readonly signature_id: string;
  readonly description: string;
  /** Input domains whose movement feeds this signature. */
  readonly triggered_by_domains: readonly L8RegimeInputDomain[];
  /** Weight on [0,1]; how strongly this signature lifts transition risk. */
  readonly transition_weight: number;
  /** Whether this signature forces coexistence into TRANSITIONAL_OVERLAP. */
  readonly forces_transitional_overlap: boolean;
}

/**
 * §8.6.3.9 — Ambiguity signature. Supports coexistence reclassification
 * into AMBIGUOUS_MULTI_CANDIDATE and caps clean-single emission.
 */
export interface L8RegimeAmbiguitySignature {
  readonly signature_id: string;
  readonly description: string;
  readonly triggered_by_domains: readonly L8RegimeInputDomain[];
  /** Weight on [0,1]; how strongly this signature lifts ambiguity score. */
  readonly ambiguity_weight: number;
  /** Whether this signature blocks CLEAN_SINGLE emission outright. */
  readonly blocks_clean_single: boolean;
}

/**
 * Deterministic signature-id builder so templates always mint the same
 * id from the same semantic.
 */
export function buildL8RegimeSignatureId(
  kind: L8RegimeSignatureClass,
  familyPrefix: string,
  slug: string,
): string {
  return `${kind === 'TRANSITION' ? 'sig.transition' : 'sig.ambiguity'}.${familyPrefix}.${slug}`;
}
