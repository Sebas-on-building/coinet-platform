/**
 * L3.1 — Canonical Entity Ontology: Lifecycle System
 *
 * Governs the legal state transitions for all canonical objects.
 * Not every object may move freely between states; lifecycle changes
 * must be governed, evidenced, and auditable.
 */

import type { CanonicalObjectType, LifecycleState } from './canonical-entity-types';

// ═══════════════════════════════════════════════════════════════════════════════
// LIFECYCLE TRANSITION METADATA
// ═══════════════════════════════════════════════════════════════════════════════

export type LifecycleTransitionRecord = {
  transitionId: string;
  objectType: CanonicalObjectType;
  canonicalId: string;
  priorState: LifecycleState;
  nextState: LifecycleState;
  reasonCode: string;
  evidenceRefs: string[];
  mutationId: string;
  timestamp: string;
};

// ═══════════════════════════════════════════════════════════════════════════════
// LEGAL TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The legal directed edges in the lifecycle graph.
 * Any transition not in this set is structurally forbidden.
 */
const LEGAL_TRANSITIONS: ReadonlyArray<[LifecycleState, LifecycleState]> = [
  ['ACTIVE', 'DEPRECATED'],
  ['ACTIVE', 'MERGED'],
  ['ACTIVE', 'SPLIT'],
  ['ACTIVE', 'CONTESTED'],
  ['ACTIVE', 'ARCHIVED'],
  ['CONTESTED', 'ACTIVE'],
  ['CONTESTED', 'DEPRECATED'],
  ['CONTESTED', 'MERGED'],
  ['CONTESTED', 'SPLIT'],
  ['CONTESTED', 'ARCHIVED'],
  ['DEPRECATED', 'ARCHIVED'],
  ['DEPRECATED', 'ACTIVE'],      // versioned restoration only
  ['UNKNOWN', 'ACTIVE'],          // identity event + confidence upgrade
  ['UNKNOWN', 'CONTESTED'],
  ['UNKNOWN', 'DEPRECATED'],
  ['UNKNOWN', 'ARCHIVED'],
  ['SPLIT', 'ARCHIVED'],
  ['MERGED', 'ARCHIVED'],
];

const _transitionSet = new Set(LEGAL_TRANSITIONS.map(([f, t]) => `${f}->${t}`));

/**
 * Transitions that require special evidence beyond normal reason codes.
 * These are "gated" — they need explicit evidence refs proving the
 * restoration, identity event, or version rollback.
 */
const GATED_TRANSITIONS: ReadonlyArray<[LifecycleState, LifecycleState, string]> = [
  ['DEPRECATED', 'ACTIVE', 'REQUIRES_VERSIONED_RESTORATION'],
  ['UNKNOWN', 'ACTIVE', 'REQUIRES_IDENTITY_EVENT_AND_CONFIDENCE_UPGRADE'],
];

const _gatedSet = new Map(
  GATED_TRANSITIONS.map(([f, t, gate]) => [`${f}->${t}`, gate])
);

// ═══════════════════════════════════════════════════════════════════════════════
// EXPLICITLY FORBIDDEN TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Named forbidden transitions with doctrinal reason.
 * Anything not in LEGAL_TRANSITIONS is also forbidden, but these
 * are the ones that are doctrinally dangerous and must be called out.
 */
export const FORBIDDEN_TRANSITIONS: ReadonlyArray<{
  from: LifecycleState;
  to: LifecycleState;
  reason: string;
}> = [
  {
    from: 'ARCHIVED',
    to: 'ACTIVE',
    reason: 'ARCHIVED objects cannot return to ACTIVE without versioned restoration through DEPRECATED first',
  },
  {
    from: 'MERGED',
    to: 'ACTIVE',
    reason: 'MERGED objects cannot become ACTIVE without explicit split/rollback event',
  },
  {
    from: 'SPLIT',
    to: 'ACTIVE',
    reason: 'SPLIT objects cannot become ACTIVE — successor objects are the new canonical references',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════════

export type LifecycleValidationResult = {
  legal: boolean;
  gated: boolean;
  gateRequirement?: string;
  rejectionReason?: string;
};

export function validateTransition(
  from: LifecycleState,
  to: LifecycleState,
): LifecycleValidationResult {
  if (from === to) {
    return { legal: false, gated: false, rejectionReason: 'SELF_TRANSITION_NOT_ALLOWED' };
  }

  const key = `${from}->${to}`;

  if (!_transitionSet.has(key)) {
    const named = FORBIDDEN_TRANSITIONS.find(f => f.from === from && f.to === to);
    return {
      legal: false,
      gated: false,
      rejectionReason: named?.reason ?? `TRANSITION_${from}_TO_${to}_NOT_LEGAL`,
    };
  }

  const gate = _gatedSet.get(key);
  if (gate) {
    return { legal: true, gated: true, gateRequirement: gate };
  }

  return { legal: true, gated: false };
}

export function isLegalTransition(from: LifecycleState, to: LifecycleState): boolean {
  return validateTransition(from, to).legal;
}

export function getAllLegalTransitionsFrom(state: LifecycleState): LifecycleState[] {
  return LEGAL_TRANSITIONS
    .filter(([f]) => f === state)
    .map(([, t]) => t);
}

export function getAllLegalTransitionsTo(state: LifecycleState): LifecycleState[] {
  return LEGAL_TRANSITIONS
    .filter(([, t]) => t === state)
    .map(([f]) => f);
}

export const LIFECYCLE_STATES: readonly LifecycleState[] = [
  'ACTIVE', 'DEPRECATED', 'MERGED', 'SPLIT', 'ARCHIVED', 'CONTESTED', 'UNKNOWN',
];

export { LEGAL_TRANSITIONS };
