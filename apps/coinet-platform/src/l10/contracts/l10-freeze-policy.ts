/**
 * L10.9 — Freeze Policy
 *
 * §10.9.5 / §10.9.13 INV-10.9-B — What becomes frozen once L10 is
 * ratified, what may still evolve, and what is hard-protected (any
 * change forces full re-certification or classifies as PROHIBITED).
 */

export enum L10FreezeStatus {
  OPEN = 'OPEN',
  FROZEN = 'FROZEN',
  HARD_PROTECTED = 'HARD_PROTECTED',
}

export const ALL_L10_FREEZE_STATUSES: readonly L10FreezeStatus[] =
  Object.values(L10FreezeStatus);

/**
 * §10.9.5.4 — Frozen surfaces after ratification. Enumerated
 * explicitly per INV-10.9-B (no implicit freeze scope).
 */
export const L10_FROZEN_SURFACES: readonly string[] = Object.freeze([
  'Layer 10 canonical definition',
  'L10 constitutional boundary',
  'L10 output classes (assessment/ranking/spread/shift-condition/' +
    'restriction)',
  'hypothesis subject contract',
  'hypothesis candidate contract',
  'hypothesis output contract',
  'hypothesis ranking contract',
  'hypothesis spread contract',
  'hypothesis shift-condition contract',
  'hypothesis restriction contract',
  'hypothesis runtime DAG stage order',
  'evidence-semantics taxonomies (support/contradiction/' +
    'confirmation/invalidation/shift-condition)',
  'production hypothesis families',
  'production hypothesis templates',
  'reliance cap reasons and dominance ranks',
  'hypothesis readiness classes',
  'durable surfaces (current authority + historical fact + ' +
    'evidence + lineage)',
  'read surfaces (current/historical/evidence/lineage)',
  'no-rebuild law (later layers may not rebuild from L6/L7/L8/L9)',
  'L10 stable downstream handoff surface set',
  'L10 completion standard',
]);

/**
 * §10.9.5.5 — Evolvable surfaces after ratification.
 */
export const L10_EVOLVABLE_SURFACES: readonly string[] = Object.freeze([
  'additive new hypothesis templates (gated rollout)',
  'additive new hypothesis families (gated rollout)',
  'additional evidence domains (legally classified)',
  'new non-authoritative read projections',
  'observability thresholds',
  'alert rule tuning',
  'dashboard additions over already-ratified surfaces',
  'additional replay/repair tooling',
  'failure playbook additions',
  'historical reliability calibration tables',
  'additional certification bands',
  'non-semantic performance improvements',
]);

/**
 * §10.9.5.6 — Hard-protected surfaces. Changes here classify at
 * least as BREAKING_SEMANTIC, often PROHIBITED.
 */
export const L10_HARD_PROTECTED_SURFACES: readonly string[] = Object.freeze([
  'replay-hash semantics for hypothesis outputs',
  'ranking semantics (primary/secondary assignment law)',
  'spread semantics (WIDE/MODERATE/NARROW/FRAGILE/UNRESOLVED)',
  'shift-condition semantics',
  'readiness class meaning (STRONG/NARROWED/DEGRADED/UNRESOLVED/' +
    'BLOCKED)',
  'restriction-right meaning',
  'cap-chain dominance ordering',
  'no-rebuild law',
  'L5-only persistence routing',
  'anti-judgment / anti-recommendation boundary',
  'no-single-story-collapse law',
  'no causal certainty without later-layer authorization',
]);

export interface L10FreezePolicy {
  readonly version: string;
  readonly frozen_surfaces: readonly string[];
  readonly evolvable_surfaces: readonly string[];
  readonly hard_protected_surfaces: readonly string[];
  readonly description: string;
}

export const L10_FREEZE_POLICY_V1: L10FreezePolicy = Object.freeze({
  version: '1.0.0',
  frozen_surfaces: L10_FROZEN_SURFACES,
  evolvable_surfaces: L10_EVOLVABLE_SURFACES,
  hard_protected_surfaces: L10_HARD_PROTECTED_SURFACES,
  description:
    'L10.9 freeze policy v1: frozen constitutional stack of Layer 10. ' +
    'Frozen surfaces may not be redesigned without ratified migration ' +
    '+ re-certification. Hard-protected surfaces force full ' +
    're-certification and often classify as PROHIBITED on any change.',
});
