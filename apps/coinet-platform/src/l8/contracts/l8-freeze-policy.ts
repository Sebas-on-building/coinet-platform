/**
 * L8.9 — Freeze Policy
 *
 * §8.9.7 — What becomes frozen once L8 is ratified, what may still
 * evolve, and what is hard-protected (any change forces full
 * re-certification or classifies as PROHIBITED).
 */

export enum L8FreezeStatus {
  OPEN = 'OPEN',
  FROZEN = 'FROZEN',
  HARD_PROTECTED = 'HARD_PROTECTED',
}

export const ALL_L8_FREEZE_STATUSES: readonly L8FreezeStatus[] =
  Object.values(L8FreezeStatus);

/**
 * §8.9.7.2 — Frozen surfaces after ratification. Enumerated explicitly
 * per INV-8.9-C (no implicit freeze scope).
 */
export const L8_FROZEN_SURFACES: readonly string[] = Object.freeze([
  'Layer 8 canonical definition',
  'regime family set',
  'regime class vocabulary',
  'regime coexistence law',
  'regime subject contract',
  'regime output contract',
  'regime confidence contract',
  'regime transition contract',
  'regime multiplier contract',
  'regime readiness-class semantics',
  'regime input family + domain law',
  'first production template semantics',
  'reliance-governance cap-chain law',
  'persistence authority separation (current/historical/evidence)',
  'stable handoff surface set',
  'Layer 8 completion standard',
]);

/**
 * §8.9.7.3 — Evolvable surfaces after ratification.
 */
export const L8_EVOLVABLE_SURFACES: readonly string[] = Object.freeze([
  'additive new regime templates (gated rollout)',
  'additional evidence classes (legally classified)',
  'observability thresholds',
  'alert rule tuning',
  'dashboard additions over already-ratified surfaces',
  'additional replay tooling',
  'non-semantic performance improvements',
  'historical reliability calibration tables',
]);

/**
 * §8.9.7 — Hard-protected surfaces. Changes here classify at least as
 * BREAKING_SEMANTIC, often PROHIBITED.
 */
export const L8_HARD_PROTECTED_SURFACES: readonly string[] = Object.freeze([
  'regime family ontology',
  'regime class meaning',
  'regime coexistence law',
  'multiplier-as-interpretive law',
  'confidence cannot outrun contradiction/restriction law',
  'Postgres-only current authority',
  'L5-only persistence law',
  'later-layer must not rebuild regime from L6/L7 live',
  'evidence/read surface dependency contract',
]);

export interface L8FreezePolicy {
  readonly version: string;
  readonly frozen_surfaces: readonly string[];
  readonly evolvable_surfaces: readonly string[];
  readonly hard_protected_surfaces: readonly string[];
  readonly description: string;
}

export const L8_FREEZE_POLICY_V1: L8FreezePolicy = Object.freeze({
  version: '1.0.0',
  frozen_surfaces: L8_FROZEN_SURFACES,
  evolvable_surfaces: L8_EVOLVABLE_SURFACES,
  hard_protected_surfaces: L8_HARD_PROTECTED_SURFACES,
  description:
    'L8.9 freeze policy v1: frozen constitutional stack of Layer 8. ' +
    'Frozen surfaces may not be redesigned without ratified migration ' +
    '+ re-certification. Hard-protected surfaces force full ' +
    're-certification and often classify as PROHIBITED on any change.',
});
