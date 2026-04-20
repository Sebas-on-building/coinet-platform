/**
 * L9.9 — Freeze Policy
 *
 * §9.9.1.4 / §9.9.4.1 INV-9.9-B — What becomes frozen once L9 is
 * ratified, what may still evolve, and what is hard-protected (any
 * change forces full re-certification or classifies as PROHIBITED).
 */

export enum L9FreezeStatus {
  OPEN = 'OPEN',
  FROZEN = 'FROZEN',
  HARD_PROTECTED = 'HARD_PROTECTED',
}

export const ALL_L9_FREEZE_STATUSES: readonly L9FreezeStatus[] =
  Object.values(L9FreezeStatus);

/**
 * §9.9.1.4 — Frozen surfaces after ratification. Enumerated explicitly
 * per INV-9.9-B (no implicit freeze scope).
 */
export const L9_FROZEN_SURFACES: readonly string[] = Object.freeze([
  'Layer 9 canonical definition',
  'sequence family set',
  'sequence state vocabulary',
  'sequence coexistence law',
  'sequence subject contract',
  'sequence output contract',
  'lead-lag relation contract',
  'sequence chain contract',
  'phase state contract',
  'decay profile contract',
  'post-event window contract',
  'sequence confidence contract',
  'sequence restriction contract',
  'causal-restraint contract',
  'temporal semantics lawbook (lead-lag/phase/change-point/decay/' +
    'post-event)',
  'first production template semantics',
  'reliance-governance cap-chain law',
  'persistence authority separation (current/historical/evidence)',
  'stable handoff surface set',
  'Layer 9 completion standard',
]);

/**
 * §9.9.1.4 — Evolvable surfaces after ratification.
 */
export const L9_EVOLVABLE_SURFACES: readonly string[] = Object.freeze([
  'additive new sequence templates (gated rollout)',
  'additional evidence classes (legally classified)',
  'observability thresholds',
  'alert rule tuning',
  'dashboard additions over already-ratified surfaces',
  'additional replay tooling',
  'non-semantic performance improvements',
  'historical reliability calibration tables',
  'lead-lag horizon calibration (within ratified bounds)',
  'decay half-life calibration (within ratified bounds)',
]);

/**
 * §9.9.1.4 — Hard-protected surfaces. Changes here classify at least
 * as BREAKING_SEMANTIC, often PROHIBITED.
 */
export const L9_HARD_PROTECTED_SURFACES: readonly string[] = Object.freeze([
  'sequence family ontology',
  'sequence state meaning',
  'sequence coexistence law',
  'lead-lag semantics (temporal, not causal)',
  'phase progression meaning',
  'change-point meaning',
  'decay posture law',
  'causal-restraint law (no causality from temporal adjacency)',
  'confidence cannot outrun contradiction/restriction/regime posture',
  'Postgres-only current authority',
  'L5-only persistence law',
  'later-layer must not rebuild sequence from L6/L7/L8 live',
  'evidence/read surface dependency contract',
]);

export interface L9FreezePolicy {
  readonly version: string;
  readonly frozen_surfaces: readonly string[];
  readonly evolvable_surfaces: readonly string[];
  readonly hard_protected_surfaces: readonly string[];
  readonly description: string;
}

export const L9_FREEZE_POLICY_V1: L9FreezePolicy = Object.freeze({
  version: '1.0.0',
  frozen_surfaces: L9_FROZEN_SURFACES,
  evolvable_surfaces: L9_EVOLVABLE_SURFACES,
  hard_protected_surfaces: L9_HARD_PROTECTED_SURFACES,
  description:
    'L9.9 freeze policy v1: frozen constitutional stack of Layer 9. ' +
    'Frozen surfaces may not be redesigned without ratified migration ' +
    '+ re-certification. Hard-protected surfaces force full ' +
    're-certification and often classify as PROHIBITED on any change.',
});
