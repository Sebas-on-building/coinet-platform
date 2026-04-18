/**
 * L6.9 — Freeze Policy
 *
 * §6.9.5 — What is frozen once L6 is ratified, what may still evolve,
 * and what may not evolve casually.
 */

export enum L6FreezeStatus {
  OPEN = 'OPEN',
  RECERTIFICATION_PENDING = 'RECERTIFICATION_PENDING',
  FROZEN = 'FROZEN',
}

export const ALL_FREEZE_STATUSES: readonly L6FreezeStatus[] =
  Object.values(L6FreezeStatus);

/**
 * §6.9.5.3 — What becomes frozen after ratification. These surfaces must
 * not be reopened without migration + re-certification.
 */
export const L6_FROZEN_SURFACES: readonly string[] = Object.freeze([
  'L6 mission and boundary',
  'primitive doctrine',
  'contract schemas',
  'runtime DAG law',
  'temporal and null law',
  'legal input surface classes',
  'feature/event family registries',
  'persistence/read-surface law',
  'certification bands',
  'rollout and rollback law',
  'completion standard',
]);

/**
 * §6.9.5.4 — Surfaces that may still evolve through governed extension.
 */
export const L6_EVOLVABLE_SURFACES: readonly string[] = Object.freeze([
  'new feature families',
  'new event families',
  'new family members inside approved families',
  'new observability metrics',
  'new fixture corpora',
  'non-breaking contract additions',
  'new read-surface optimizations that do not alter authority or meaning',
]);

/**
 * §6.9.5.5 — Surfaces that may not evolve casually. Any change here forces
 * full migration + re-certification.
 */
export const L6_HARD_PROTECTED_SURFACES: readonly string[] = Object.freeze([
  'primitive meaning',
  'contract-critical required fields',
  'event lifecycle semantics',
  'current-state authority rules',
  'late-data rematerialization law',
  'replay identity law',
  'dependency class doctrine',
  'evidence-pack identity rules',
]);

export interface L6FreezePolicy {
  readonly version: string;
  readonly frozen_surfaces: readonly string[];
  readonly evolvable_surfaces: readonly string[];
  readonly hard_protected_surfaces: readonly string[];
  readonly description: string;
}

export const L6_FREEZE_POLICY_V1: L6FreezePolicy = Object.freeze({
  version: '1.0.0',
  frozen_surfaces: L6_FROZEN_SURFACES,
  evolvable_surfaces: L6_EVOLVABLE_SURFACES,
  hard_protected_surfaces: L6_HARD_PROTECTED_SURFACES,
  description:
    'L6.9 freeze policy v1: frozen constitutional stack of Layer 6. ' +
    'Frozen surfaces may not be redesigned without ratified migration + ' +
    're-certification. Hard-protected surfaces force full re-certification ' +
    'on any change.',
});
