/**
 * L7.9 — Freeze Policy
 *
 * §7.9.5 — What becomes frozen once L7 is ratified, what may still
 * evolve, and what is hard-protected (any change forces full
 * re-certification or classifies as PROHIBITED).
 */

export enum L7FreezeStatus {
  OPEN = 'OPEN',
  FROZEN = 'FROZEN',
  HARD_PROTECTED = 'HARD_PROTECTED',
}

export const ALL_L7_FREEZE_STATUSES: readonly L7FreezeStatus[] =
  Object.values(L7FreezeStatus);

/**
 * §7.9.5.2 — Frozen surfaces after ratification.
 */
export const L7_FROZEN_SURFACES: readonly string[] = Object.freeze([
  'Layer 7 canonical definition',
  'validation class vocabulary',
  'validation modifier vocabulary',
  'contradiction family ontology',
  'contradiction template identity semantics',
  'validation family ids',
  'confidence-band law',
  'cap-chain law structure',
  'restriction-right vocabulary',
  'current/historical/evidence serving contract',
  'stable handoff surface set',
  'Layer 7 completion standard',
]);

/**
 * §7.9.5.3 — Evolvable surfaces after ratification.
 */
export const L7_EVOLVABLE_SURFACES: readonly string[] = Object.freeze([
  'contradiction template thresholds',
  'family rollout readiness flags',
  'confidence weight sets',
  'historical reliability calibration tables',
  'observability thresholds',
  'alert tuning',
  'fixture corpus growth',
  'family-specific tuning with compatibility review',
]);

/**
 * §7.9.5.4 — Hard-protected surfaces. Changes here classify at least
 * as BREAKING_SEMANTIC, often PROHIBITED.
 */
export const L7_HARD_PROTECTED_SURFACES: readonly string[] = Object.freeze([
  'primary validation classes',
  'contradiction preservation law',
  'no-L5-bypass law',
  'confidence cannot outrun contradiction law',
  'later-layer must not rebuild validation live from L6',
  'evidence/read surface dependency contract',
]);

export interface L7FreezePolicy {
  readonly version: string;
  readonly frozen_surfaces: readonly string[];
  readonly evolvable_surfaces: readonly string[];
  readonly hard_protected_surfaces: readonly string[];
  readonly description: string;
}

export const L7_FREEZE_POLICY_V1: L7FreezePolicy = Object.freeze({
  version: '1.0.0',
  frozen_surfaces: L7_FROZEN_SURFACES,
  evolvable_surfaces: L7_EVOLVABLE_SURFACES,
  hard_protected_surfaces: L7_HARD_PROTECTED_SURFACES,
  description:
    'L7.9 freeze policy v1: frozen constitutional stack of Layer 7. ' +
    'Frozen surfaces may not be redesigned without ratified migration + ' +
    're-certification. Hard-protected surfaces force full re-certification ' +
    'and often classify as PROHIBITED on any change.',
});
